import { db, supabase, getCurrentSchoolId } from '../lib/dbClient';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate, 
  ElectionVote, 
  ElectionResultsSummary, 
  DEFAULT_ELECTION_POSITIONS 
} from '../types/election';

const STORAGE_KEY_PREFIX = 'haby_elections_';

export class ElectionService {
  // 1. Fetch all election events for a school (Tri-Sync: Cloud SQL + Firestore + LocalCache)
  static async getElectionEvents(schoolId = getCurrentSchoolId()): Promise<ElectionEvent[]> {
    try {
      const response = await supabase.from('election_events').select('*');
      
      let events: ElectionEvent[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        events = response.data
          .filter((e: any) => !schoolId || e.school_id === schoolId || e.schoolId === schoolId)
          .map((e: any) => ({
            id: e.id,
            schoolId: e.school_id || e.schoolId || schoolId,
            title: e.title,
            academicYear: e.academic_year || e.academicYear || '2026',
            nominationStart: e.nomination_start || e.nominationStart,
            nominationEnd: e.nomination_end || e.nominationEnd,
            votingStart: e.voting_start || e.votingStart,
            votingEnd: e.voting_end || e.votingEnd,
            status: e.status || 'DRAFT',
            createdByDisciplineHead: e.created_by_discipline_head || e.createdByDisciplineHead,
            resultsPublishedAt: e.results_published_at || e.resultsPublishedAt,
            createdAt: e.created_at || e.createdAt,
            updatedAt: e.updated_at || e.updatedAt,
          }));
      }

      // Also check Firestore if Cloud SQL returned empty
      if (events.length === 0) {
        try {
          const snap = await getDocs(collection(db, 'election_events'));
          snap.forEach(d => {
            const e = d.data() as any;
            if (!schoolId || e.school_id === schoolId || e.schoolId === schoolId) {
              events.push({
                id: d.id,
                schoolId: e.school_id || e.schoolId || schoolId,
                title: e.title || 'Uchaguzi Mkuu wa Serikali ya Wanafunzi 2026',
                academicYear: e.academic_year || e.academicYear || '2026',
                nominationStart: e.nomination_start || e.nominationStart,
                nominationEnd: e.nomination_end || e.nominationEnd,
                votingStart: e.voting_start || e.votingStart,
                votingEnd: e.voting_end || e.votingEnd,
                status: e.status || 'DRAFT',
                createdByDisciplineHead: e.created_by_discipline_head || e.createdByDisciplineHead,
                resultsPublishedAt: e.results_published_at || e.resultsPublishedAt,
                createdAt: e.created_at || e.createdAt,
                updatedAt: e.updated_at || e.updatedAt,
              });
            }
          });
        } catch (_fsErr) {}
      }

      // Check localStorage for offline/demo persistence
      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`);
      if (local) {
        try {
          const localEvents: ElectionEvent[] = JSON.parse(local);
          const map = new Map<string, ElectionEvent>();
          events.forEach(e => map.set(e.id, e));
          localEvents.forEach(e => {
            if (!map.has(e.id)) map.set(e.id, e);
          });
          events = Array.from(map.values());
        } catch (e) {}
      }

      if (events.length > 0) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`, JSON.stringify(events));
      }

      return events.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.warn('ElectionService.getElectionEvents fallback to localStorage:', err);
      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`);
      return local ? JSON.parse(local) : [];
    }
  }

  // 2. Create or Update Election Event
  static async saveElectionEvent(event: Partial<ElectionEvent>, schoolId = getCurrentSchoolId()): Promise<ElectionEvent> {
    const isNew = !event.id;
    const eventId = event.id || crypto.randomUUID();
    const payload: ElectionEvent = {
      id: eventId,
      schoolId: event.schoolId || schoolId,
      title: event.title || 'Uchaguzi Mkuu wa Serikali ya Wanafunzi 2026',
      academicYear: event.academicYear || '2026',
      nominationStart: event.nominationStart || new Date().toISOString(),
      nominationEnd: event.nominationEnd || new Date(Date.now() + 5 * 86400000).toISOString(),
      votingStart: event.votingStart || new Date(Date.now() + 7 * 86400000).toISOString(),
      votingEnd: event.votingEnd || new Date(Date.now() + 8 * 86400000).toISOString(),
      status: event.status || 'DRAFT',
      createdByDisciplineHead: event.createdByDisciplineHead || 'Mkuu wa Nidhamu',
      resultsPublishedAt: event.resultsPublishedAt || null,
      createdAt: event.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dbRow = {
      id: payload.id,
      school_id: payload.schoolId,
      schoolId: payload.schoolId,
      title: payload.title,
      academic_year: payload.academicYear,
      nomination_start: payload.nominationStart,
      nomination_end: payload.nominationEnd,
      voting_start: payload.votingStart,
      voting_end: payload.votingEnd,
      status: payload.status,
      created_by_discipline_head: payload.createdByDisciplineHead,
      results_published_at: payload.resultsPublishedAt,
      updated_at: new Date().toISOString()
    };

    // Save to Cloud SQL
    try {
      await supabase.from('election_events').upsert(dbRow);
    } catch (err) {
      console.warn('Could not save election event to Cloud SQL, saving locally:', err);
    }

    // Mirror to Firebase Firestore
    try {
      await setDoc(doc(db, 'election_events', payload.id), dbRow, { merge: true });
    } catch (_fsErr) {}

    // Save to localStorage
    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`);
    const events: ElectionEvent[] = local ? JSON.parse(local) : [];
    const idx = events.findIndex(e => e.id === payload.id);
    if (idx >= 0) events[idx] = payload;
    else events.unshift(payload);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`, JSON.stringify(events));

    // If new event, seed default 15 Tanzanian Student Government positions
    if (isNew) {
      await this.seedDefaultPositions(eventId);
    }

    return payload;
  }

  // 3. Seed 15 Default Tanzanian Secondary Leadership Positions
  static async seedDefaultPositions(electionId: string): Promise<ElectionPosition[]> {
    const positions: ElectionPosition[] = DEFAULT_ELECTION_POSITIONS.map(def => ({
      ...def,
      id: crypto.randomUUID(),
      electionId,
      createdAt: new Date().toISOString()
    }));

    const records = positions.map(p => ({
      id: p.id,
      election_id: p.electionId,
      electionId: p.electionId,
      title: p.title,
      description: p.description,
      gender_rule: p.genderRule,
      class_rule: p.classRule,
      order_number: p.orderNumber,
      is_custom: p.isCustom,
      photo_required: p.photoRequired,
      manifesto_required: p.manifestoRequired,
    }));

    try {
      await supabase.from('election_positions').upsert(records);
    } catch (err) {
      console.warn('Seed positions remote insert warning:', err);
    }

    try {
      await Promise.all(
        records.map(r => setDoc(doc(db, 'election_positions', r.id), r, { merge: true }).catch(() => {}))
      );
    } catch (_fsErr) {}

    localStorage.setItem(`${STORAGE_KEY_PREFIX}positions_${electionId}`, JSON.stringify(positions));
    return positions;
  }

  // 4. Fetch Positions for an Election
  static async getPositions(electionId: string): Promise<ElectionPosition[]> {
    try {
      const response = await supabase.from('election_positions').select('*');

      let positions: ElectionPosition[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        positions = response.data
          .filter((p: any) => p.election_id === electionId || p.electionId === electionId)
          .map((p: any) => ({
            id: p.id,
            electionId: p.election_id || p.electionId || electionId,
            title: p.title,
            description: p.description,
            genderRule: p.gender_rule || p.genderRule || 'ALL',
            classRule: p.class_rule || p.classRule || 'ALL',
            orderNumber: p.order_number || p.orderNumber || 1,
            isCustom: Boolean(p.is_custom ?? p.isCustom),
            photoRequired: Boolean(p.photo_required ?? p.photoRequired ?? true),
            manifestoRequired: Boolean(p.manifesto_required ?? p.manifestoRequired ?? true),
            createdAt: p.created_at || p.createdAt
          }));
      }

      if (positions.length === 0) {
        try {
          const q = query(collection(db, 'election_positions'), where('election_id', '==', electionId));
          const snap = await getDocs(q);
          snap.forEach(d => {
            const p = d.data() as any;
            positions.push({
              id: d.id,
              electionId: p.election_id || p.electionId || electionId,
              title: p.title,
              description: p.description || '',
              genderRule: p.gender_rule || p.genderRule || 'ALL',
              classRule: p.class_rule || p.classRule || 'ALL',
              orderNumber: p.order_number || p.orderNumber || 1,
              isCustom: Boolean(p.is_custom ?? p.isCustom),
              photoRequired: Boolean(p.photo_required ?? p.photoRequired ?? true),
              manifestoRequired: Boolean(p.manifesto_required ?? p.manifestoRequired ?? true),
              createdAt: p.created_at || p.createdAt
            });
          });
        } catch (_fsErr) {}
      }

      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}positions_${electionId}`);
      if (local) {
        try {
          const localPositions: ElectionPosition[] = JSON.parse(local);
          const map = new Map<string, ElectionPosition>();
          positions.forEach(p => map.set(p.id, p));
          localPositions.forEach(p => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          positions = Array.from(map.values());
        } catch (e) {}
      }

      if (positions.length === 0) {
        positions = await this.seedDefaultPositions(electionId);
      } else {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}positions_${electionId}`, JSON.stringify(positions));
      }

      return positions.sort((a, b) => a.orderNumber - b.orderNumber);
    } catch (err) {
      console.warn('ElectionService.getPositions fallback to localStorage:', err);
      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}positions_${electionId}`);
      if (local) return JSON.parse(local);
      return this.seedDefaultPositions(electionId);
    }
  }

  // 5. Add or Update a Custom Position
  static async savePosition(pos: Partial<ElectionPosition>): Promise<ElectionPosition> {
    const positionId = pos.id || crypto.randomUUID();
    const position: ElectionPosition = {
      id: positionId,
      electionId: pos.electionId!,
      title: pos.title || 'Cheo Kipya',
      description: pos.description || '',
      genderRule: pos.genderRule || 'ALL',
      classRule: pos.classRule || 'ALL',
      orderNumber: pos.orderNumber || 99,
      isCustom: pos.isCustom !== undefined ? pos.isCustom : true,
      photoRequired: pos.photoRequired !== undefined ? pos.photoRequired : true,
      manifestoRequired: pos.manifestoRequired !== undefined ? pos.manifestoRequired : true,
      createdAt: pos.createdAt || new Date().toISOString()
    };

    const dbRow = {
      id: position.id,
      election_id: position.electionId,
      electionId: position.electionId,
      title: position.title,
      description: position.description,
      gender_rule: position.genderRule,
      class_rule: position.classRule,
      order_number: position.orderNumber,
      is_custom: position.isCustom,
      photo_required: position.photoRequired,
      manifesto_required: position.manifestoRequired
    };

    try {
      await supabase.from('election_positions').upsert(dbRow);
    } catch (err) {
      console.warn('Save position remote error:', err);
    }

    try {
      await setDoc(doc(db, 'election_positions', position.id), dbRow, { merge: true });
    } catch (_fsErr) {}

    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}positions_${position.electionId}`);
    const list: ElectionPosition[] = local ? JSON.parse(local) : [];
    const idx = list.findIndex(p => p.id === position.id);
    if (idx >= 0) list[idx] = position;
    else list.push(position);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}positions_${position.electionId}`, JSON.stringify(list));

    return position;
  }

  // 6. Delete a Position
  static async deletePosition(electionId: string, positionId: string): Promise<void> {
    try {
      await supabase.from('election_positions').delete().eq('id', positionId);
    } catch (err) {}

    try {
      await deleteDoc(doc(db, 'election_positions', positionId));
    } catch (_fsErr) {}

    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}positions_${electionId}`);
    if (local) {
      const list: ElectionPosition[] = JSON.parse(local);
      const filtered = list.filter(p => p.id !== positionId);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}positions_${electionId}`, JSON.stringify(filtered));
    }
  }

  // 7. Get Candidates for an Election
  static async getCandidates(electionId: string, positionId?: string): Promise<ElectionCandidate[]> {
    try {
      const response = await supabase.from('election_candidates').select('*');

      let candidates: ElectionCandidate[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        candidates = response.data
          .filter((c: any) => (c.election_id === electionId || c.electionId === electionId) && (!positionId || c.position_id === positionId || c.positionId === positionId))
          .map((c: any) => ({
            id: c.id,
            electionId: c.election_id || c.electionId || electionId,
            positionId: c.position_id || c.positionId,
            studentId: c.student_id || c.studentId,
            studentName: c.student_name || c.studentName,
            studentClass: c.student_class || c.studentClass,
            studentGender: c.student_gender || c.studentGender || 'Male',
            manifestoText: c.manifesto_text || c.manifestoText,
            manifestoVideoUrl: c.manifesto_video_url || c.manifestoVideoUrl,
            photoUrl: c.photo_url || c.photoUrl,
            status: c.status || 'PENDING',
            rejectionReason: c.rejection_reason || c.rejectionReason,
            reviewedBy: c.reviewed_by || c.reviewedBy,
            votesCount: Number(c.votes_count || c.votesCount || 0),
            createdAt: c.created_at || c.createdAt,
            updatedAt: c.updated_at || c.updatedAt
          }));
      }

      if (candidates.length === 0) {
        try {
          const q = query(collection(db, 'election_candidates'), where('election_id', '==', electionId));
          const snap = await getDocs(q);
          snap.forEach(d => {
            const c = d.data() as any;
            if (!positionId || c.position_id === positionId || c.positionId === positionId) {
              candidates.push({
                id: d.id,
                electionId: c.election_id || c.electionId || electionId,
                positionId: c.position_id || c.positionId,
                studentId: c.student_id || c.studentId,
                studentName: c.student_name || c.studentName,
                studentClass: c.student_class || c.studentClass,
                studentGender: c.student_gender || c.studentGender || 'Male',
                manifestoText: c.manifesto_text || c.manifestoText,
                manifestoVideoUrl: c.manifesto_video_url || c.manifestoVideoUrl,
                photoUrl: c.photo_url || c.photoUrl,
                status: c.status || 'PENDING',
                rejectionReason: c.rejection_reason || c.rejectionReason,
                reviewedBy: c.reviewed_by || c.reviewedBy,
                votesCount: Number(c.votes_count || c.votesCount || 0),
                createdAt: c.created_at || c.createdAt,
                updatedAt: c.updated_at || c.updatedAt
              });
            }
          });
        } catch (_fsErr) {}
      }

      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}candidates_${electionId}`);
      if (local) {
        try {
          const localCandidates: ElectionCandidate[] = JSON.parse(local);
          const map = new Map<string, ElectionCandidate>();
          candidates.forEach(c => map.set(c.id, c));
          localCandidates.forEach(c => {
            if (!positionId || c.positionId === positionId) {
              if (!map.has(c.id)) map.set(c.id, c);
            }
          });
          candidates = Array.from(map.values());
        } catch (e) {}
      }

      return candidates;
    } catch (err) {
      console.warn('ElectionService.getCandidates fallback to localStorage:', err);
      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}candidates_${electionId}`);
      if (!local) return [];
      const list: ElectionCandidate[] = JSON.parse(local);
      return positionId ? list.filter(c => c.positionId === positionId) : list;
    }
  }

  // 8. Submit Nomination Application
  static async submitNomination(cand: Omit<ElectionCandidate, 'id' | 'status' | 'votesCount' | 'createdAt' | 'updatedAt'>): Promise<ElectionCandidate> {
    const candidateId = crypto.randomUUID();
    const candidate: ElectionCandidate = {
      ...cand,
      id: candidateId,
      status: 'PENDING',
      votesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dbRow = {
      id: candidate.id,
      election_id: candidate.electionId,
      electionId: candidate.electionId,
      position_id: candidate.positionId,
      positionId: candidate.positionId,
      student_id: candidate.studentId,
      studentId: candidate.studentId,
      student_name: candidate.studentName,
      studentName: candidate.studentName,
      student_class: candidate.studentClass,
      studentClass: candidate.studentClass,
      student_gender: candidate.studentGender,
      studentGender: candidate.studentGender,
      manifesto_text: candidate.manifestoText,
      manifesto_video_url: candidate.manifestoVideoUrl,
      photo_url: candidate.photoUrl,
      status: candidate.status,
      votes_count: candidate.votesCount,
      created_at: candidate.createdAt,
      updated_at: candidate.updatedAt
    };

    try {
      await supabase.from('election_candidates').upsert(dbRow);
    } catch (err) {
      console.warn('Submit nomination remote error:', err);
    }

    try {
      await setDoc(doc(db, 'election_candidates', candidate.id), dbRow, { merge: true });
    } catch (_fsErr) {}

    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}candidates_${candidate.electionId}`);
    const list: ElectionCandidate[] = local ? JSON.parse(local) : [];
    list.push(candidate);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}candidates_${candidate.electionId}`, JSON.stringify(list));

    return candidate;
  }

  // 9. Discipline Head Review (Approve / Reject Nomination)
  static async reviewCandidate(
    electionId: string, 
    candidateId: string, 
    status: 'APPROVED' | 'REJECTED', 
    reason?: string, 
    reviewedBy = 'Mkuu wa Nidhamu'
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    try {
      await supabase.from('election_candidates').update({
        status,
        rejection_reason: reason || null,
        reviewed_by: reviewedBy,
        updated_at: new Date()
      }).eq('id', candidateId);
    } catch (err) {}

    try {
      await setDoc(doc(db, 'election_candidates', candidateId), {
        status,
        rejection_reason: reason || null,
        reviewed_by: reviewedBy,
        updated_at: nowIso
      }, { merge: true });
    } catch (_fsErr) {}

    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}candidates_${electionId}`);
    if (local) {
      const list: ElectionCandidate[] = JSON.parse(local);
      const target = list.find(c => c.id === candidateId);
      if (target) {
        target.status = status;
        target.rejectionReason = reason;
        target.reviewedBy = reviewedBy;
        target.updatedAt = nowIso;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}candidates_${electionId}`, JSON.stringify(list));
      }
    }
  }

  // 10. Fetch Voted Position IDs for a Student (Prevent Double Voting)
  static async getVotedPositionIds(electionId: string, voterStudentId: string): Promise<string[]> {
    try {
      const response = await supabase.from('election_votes').select('*');
      
      const votedPositionIds = new Set<string>();
      if (response && response.data && Array.isArray(response.data)) {
        response.data.forEach((v: any) => {
          if ((v.election_id === electionId || v.electionId === electionId) &&
              (v.voter_student_id === voterStudentId || v.voterStudentId === voterStudentId)) {
            votedPositionIds.add(v.position_id || v.positionId);
          }
        });
      }

      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}votes_${electionId}_${voterStudentId}`);
      if (local) {
        try {
          const ids: string[] = JSON.parse(local);
          ids.forEach(id => votedPositionIds.add(id));
        } catch (e) {}
      }

      return Array.from(votedPositionIds);
    } catch (err) {
      const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}votes_${electionId}_${voterStudentId}`);
      return local ? JSON.parse(local) : [];
    }
  }

  // 11. Cast a Ballot Vote (Single Vote per Position, Double-Voting Protected)
  static async castVote(params: {
    electionId: string;
    voterStudentId: string;
    positionId: string;
    candidateId: string;
    verificationMethod?: 'PIN' | 'FINGERPRINT' | 'PORTAL_AUTH';
    ipAddress?: string;
    deviceId?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { electionId, voterStudentId, positionId, candidateId } = params;

    // Check double voting
    const existing = await this.getVotedPositionIds(electionId, voterStudentId);
    if (existing.includes(positionId)) {
      return { success: false, message: 'Umesha piga kura kwenye nafasi hii! Kura mbili haziruhusiwi.' };
    }

    const voteRecord: ElectionVote = {
      id: crypto.randomUUID(),
      electionId,
      voterStudentId,
      positionId,
      candidateId,
      votedAt: new Date().toISOString(),
      verificationMethod: params.verificationMethod || 'PORTAL_AUTH',
      ipAddress: params.ipAddress || '127.0.0.1',
      deviceId: params.deviceId || 'DEVICE_WEB'
    };

    const voteRow = {
      id: voteRecord.id,
      election_id: voteRecord.electionId,
      electionId: voteRecord.electionId,
      voter_student_id: voteRecord.voterStudentId,
      voterStudentId: voteRecord.voterStudentId,
      position_id: voteRecord.positionId,
      positionId: voteRecord.positionId,
      candidate_id: voteRecord.candidateId,
      candidateId: voteRecord.candidateId,
      verification_method: voteRecord.verificationMethod,
      ip_address: voteRecord.ipAddress,
      device_id: voteRecord.deviceId,
      voted_at: new Date().toISOString()
    };

    // 1. Insert vote into Cloud SQL & Firestore
    try {
      await supabase.from('election_votes').insert(voteRow);

      // 2. Increment candidate votes_count in Cloud SQL
      const allCands = await supabase.from('election_candidates').select('*');
      const currentCand = (allCands?.data || []).find((c: any) => c.id === candidateId);
      const newCount = Number(currentCand?.votes_count || currentCand?.votesCount || 0) + 1;
      await supabase.from('election_candidates').update({
        votes_count: newCount,
        updated_at: new Date()
      }).eq('id', candidateId);

      // Mirror vote & count to Firestore
      await setDoc(doc(db, 'election_votes', voteRecord.id), voteRow, { merge: true }).catch(() => {});
      await setDoc(doc(db, 'election_candidates', candidateId), {
        votes_count: newCount,
        votesCount: newCount,
        updated_at: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('Cast vote remote insert error, using local queue:', err);
    }

    // 3. Update localStorage state
    const currentVoted = [...existing, positionId];
    localStorage.setItem(`${STORAGE_KEY_PREFIX}votes_${electionId}_${voterStudentId}`, JSON.stringify(currentVoted));

    const localCands = localStorage.getItem(`${STORAGE_KEY_PREFIX}candidates_${electionId}`);
    if (localCands) {
      try {
        const cands: ElectionCandidate[] = JSON.parse(localCands);
        const cand = cands.find(c => c.id === candidateId);
        if (cand) {
          cand.votesCount = (cand.votesCount || 0) + 1;
          cand.updatedAt = new Date().toISOString();
          localStorage.setItem(`${STORAGE_KEY_PREFIX}candidates_${electionId}`, JSON.stringify(cands));
        }
      } catch (e) {}
    }

    return { success: true, message: 'Hongera! Kura yako imehesabiwa kwa ufanisi.' };
  }

  // 12. Calculate Live Results & Statistics
  static async getElectionResults(electionId: string): Promise<ElectionResultsSummary | null> {
    const events = await this.getElectionEvents();
    const election = events.find(e => e.id === electionId);
    if (!election) return null;

    const [positions, allCandidates] = await Promise.all([
      this.getPositions(electionId),
      this.getCandidates(electionId)
    ]);

    let totalVotesCast = 0;
    const positionResults = positions.map(pos => {
      const candidatesInPos = allCandidates.filter(c => c.positionId === pos.id && c.status === 'APPROVED');
      const posTotalVotes = candidatesInPos.reduce((sum, c) => sum + (c.votesCount || 0), 0);
      totalVotesCast += posTotalVotes;

      const candidateResults = candidatesInPos.map(c => {
        const votes = c.votesCount || 0;
        const percentage = posTotalVotes > 0 ? Number(((votes / posTotalVotes) * 100).toFixed(1)) : 0;
        return {
          candidateId: c.id,
          candidateName: c.studentName,
          candidateClass: c.studentClass,
          candidateGender: c.studentGender,
          photoUrl: c.photoUrl,
          votesCount: votes,
          percentage,
          isWinner: false
        };
      }).sort((a, b) => b.votesCount - a.votesCount);

      // Determine winner (highest votes and at least 1 vote)
      let winner = null;
      if (candidateResults.length > 0 && candidateResults[0].votesCount > 0) {
        candidateResults[0].isWinner = true;
        winner = candidateResults[0];
      }

      return {
        positionId: pos.id,
        positionTitle: pos.title,
        genderRule: pos.genderRule,
        classRule: pos.classRule,
        totalVotes: posTotalVotes,
        winner,
        candidates: candidateResults
      };
    });

    const winners = positionResults
      .filter(p => p.winner)
      .map(p => ({
        positionTitle: p.positionTitle,
        candidate: p.winner!
      }));

    return {
      election,
      totalVoters: Math.max(totalVotesCast, 1),
      totalVotesCast,
      turnoutPercentage: Math.min(100, Number(((totalVotesCast / (positions.length * 100)) * 100).toFixed(1))),
      positions: positionResults,
      winners
    };
  }

  // 13. Publish Results to Students
  static async publishResults(electionId: string): Promise<ElectionEvent | null> {
    const nowIso = new Date().toISOString();
    try {
      await supabase.from('election_events').update({
        status: 'RESULTS_PUBLISHED',
        results_published_at: new Date(),
        updated_at: new Date()
      }).eq('id', electionId);
    } catch (err) {}

    try {
      await setDoc(doc(db, 'election_events', electionId), {
        status: 'RESULTS_PUBLISHED',
        results_published_at: nowIso,
        updated_at: nowIso
      }, { merge: true });
    } catch (_fsErr) {}

    const schoolId = getCurrentSchoolId();
    const local = localStorage.getItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`);
    let updatedEv: ElectionEvent | null = null;
    if (local) {
      const events: ElectionEvent[] = JSON.parse(local);
      const ev = events.find(e => e.id === electionId);
      if (ev) {
        ev.status = 'RESULTS_PUBLISHED';
        ev.resultsPublishedAt = nowIso;
        ev.updatedAt = nowIso;
        localStorage.setItem(`${STORAGE_KEY_PREFIX}events_${schoolId}`, JSON.stringify(events));
        updatedEv = ev;
      }
    }
    return updatedEv;
  }

  // 14. Get Active or Latest Event for quick switching
  static async getActiveOrLatestEvent(schoolId = getCurrentSchoolId()): Promise<ElectionEvent | null> {
    const events = await this.getElectionEvents(schoolId);
    if (events.length === 0) return null;
    const active = events.find(e => 
      e.status === 'VOTING_OPEN' || 
      e.status === 'Voting Open' || 
      e.status === 'NOMINATION_OPEN' || 
      e.status === 'Nomination Open'
    );
    return active || events[0];
  }
}

