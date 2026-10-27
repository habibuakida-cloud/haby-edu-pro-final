import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Upload, 
  Video, 
  User, 
  ShieldAlert, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  Award,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate, 
  CandidateStatus 
} from '../../../types/election';
import { ElectionService } from '../../../services/electionService';
import { DisciplineRecord, Student, UserAccount } from '../../../types';

interface NominationModuleProps {
  election: ElectionEvent;
  students: Student[];
  disciplineRecords?: DisciplineRecord[];
  currentUser?: UserAccount | null;
  onCandidateUpdated?: () => void;
}

export const NominationModule: React.FC<NominationModuleProps> = ({
  election,
  students,
  disciplineRecords = [],
  currentUser,
  onCandidateUpdated
}) => {
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CandidateStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [reviewingCandidate, setReviewingCandidate] = useState<ElectionCandidate | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'REVIEW_LIST' | 'APPLY_FORM'>('REVIEW_LIST');

  // Application form state
  const [selectedStudentReg, setSelectedStudentReg] = useState(students[0]?.regNo || '');
  const [applyPositionId, setApplyPositionId] = useState('');
  const [manifestoText, setManifestoText] = useState('');
  const [manifestoVideoUrl, setManifestoVideoUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [posList, candList] = await Promise.all([
        ElectionService.getPositions(election.id),
        ElectionService.getCandidates(election.id)
      ]);
      setPositions(posList);
      setCandidates(candList);
      if (posList.length > 0 && !applyPositionId) {
        setApplyPositionId(posList[0].id);
      }
    } catch (err) {
      console.error('Failed to load nomination data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [election.id]);

  // Selected student details for nomination
  const selectedStudent = useMemo(() => {
    return students.find(s => s.regNo === selectedStudentReg) || students[0];
  }, [students, selectedStudentReg]);

  // Check disciplinary background of selected student
  const studentDisciplineCases = useMemo(() => {
    if (!selectedStudent) return [];
    return disciplineRecords.filter(r => 
      r.studentId === selectedStudent.id || 
      r.regNo === selectedStudent.regNo ||
      r.studentName.toLowerCase() === selectedStudent.name.toLowerCase()
    );
  }, [selectedStudent, disciplineRecords]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchPos = selectedPositionId === 'ALL' || c.positionId === selectedPositionId;
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchSearch = !searchQuery || 
        c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchPos && matchStatus && matchSearch;
    });
  }, [candidates, selectedPositionId, statusFilter, searchQuery]);

  // Submit nomination handler
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('error', 'Tafadhali chagua mwanafunzi anayeomba uteuzi');
      return;
    }
    const targetPos = positions.find(p => p.id === applyPositionId);
    if (!targetPos) {
      showToast('error', 'Tafadhali chagua cheo anachoomba');
      return;
    }

    // Gender Rule Check
    if (targetPos.genderRule === 'BOYS_ONLY' && selectedStudent.gender === 'Female') {
      showToast('error', `Cheo hiki ("${targetPos.title}") kinahitaji mwanafunzi mvulana pekee.`);
      return;
    }
    if (targetPos.genderRule === 'GIRLS_ONLY' && selectedStudent.gender === 'Male') {
      showToast('error', `Cheo hiki ("${targetPos.title}") kinahitaji mwanafunzi msichana pekee.`);
      return;
    }

    // Class Rule Check (e.g. Form 3 & 4)
    if (targetPos.classRule === 'FORM_3_4') {
      const cls = selectedStudent.className.toUpperCase();
      if (!cls.includes('FORM 3') && !cls.includes('FORM 4') && !cls.includes('F3') && !cls.includes('F4')) {
        showToast('error', `Cheo hiki ("${targetPos.title}") kinatengwa kwa wanafunzi wa Kidato cha 3 na 4 pekee.`);
        return;
      }
    }

    // Double nomination check in same election
    const alreadyApplied = candidates.find(c => c.studentId === selectedStudent.regNo || c.studentId === String(selectedStudent.id));
    if (alreadyApplied) {
      showToast('error', `Mwanafunzi huyu (${selectedStudent.name}) tayari ana maombi ya uteuzi kwenye uchaguzi huu.`);
      return;
    }

    try {
      const newCand = await ElectionService.submitNomination({
        electionId: election.id,
        positionId: targetPos.id,
        studentId: selectedStudent.regNo || String(selectedStudent.id),
        studentName: selectedStudent.name,
        studentClass: selectedStudent.className + (selectedStudent.stream ? ` (${selectedStudent.stream})` : ''),
        studentGender: (selectedStudent.gender as 'Male' | 'Female') || 'Male',
        manifestoText: manifestoText.trim(),
        manifestoVideoUrl: manifestoVideoUrl.trim() || undefined,
        photoUrl: photoUrl || selectedStudent.passportPhoto || undefined,
      });

      setCandidates(prev => [...prev, newCand]);
      showToast('success', `Maombi ya uteuzi ya ${selectedStudent.name} yamewasilishwa kwa Idara ya Nidhamu!`);
      setIsApplyModalOpen(false);
      setManifestoText('');
      setManifestoVideoUrl('');
      setPhotoUrl('');
      setActiveSubTab('REVIEW_LIST');
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err: any) {
      showToast('error', 'Hitilafu wakati wa kuwasilisha maombi: ' + err.message);
    }
  };

  // Open review modal
  const handleOpenReview = (cand: ElectionCandidate, action: 'APPROVE' | 'REJECT') => {
    setReviewingCandidate(cand);
    setReviewAction(action);
    setRejectionReason('');
    setIsReviewModalOpen(true);
  };

  // Execute review
  const handleExecuteReview = async () => {
    if (!reviewingCandidate) return;
    try {
      await ElectionService.reviewCandidate(
        election.id,
        reviewingCandidate.id,
        reviewAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewAction === 'REJECT' ? rejectionReason : undefined,
        currentUser?.fullName || 'Mkuu wa Nidhamu'
      );

      setCandidates(prev => prev.map(c => {
        if (c.id === reviewingCandidate.id) {
          return {
            ...c,
            status: reviewAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            rejectionReason: reviewAction === 'REJECT' ? rejectionReason : undefined,
            reviewedBy: currentUser?.fullName || 'Mkuu wa Nidhamu'
          };
        }
        return c;
      }));

      showToast('success', `Mgombea ${reviewingCandidate.studentName} ${reviewAction === 'APPROVE' ? 'Ameidhinishwa (Approved)' : 'Amekataliwa (Rejected)'}!`);
      setIsReviewModalOpen(false);
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      showToast('error', 'Hitilafu wakati wa kuhakiki mgombea');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar with Status and Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900">
              Uteuzi wa Wagombea (Candidate Nominations & Screening)
            </h3>
            <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
              election.status === 'NOMINATION_OPEN' 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {election.status === 'NOMINATION_OPEN' ? 'Uteuzi Upo Wazi' : `Hali: ${election.status}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Wanafunzi wanawasilisha ilani na kuomba nafasi za uongozi. Mkuu wa Nidhamu anahakiki mwenendo kabla ya kuingizwa kwenye karatasi ya kura.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsApplyModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Wasilisha Fomu ya Uteuzi (Apply for Post)</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Jumla ya Maombi</span>
          <span className="text-2xl font-black text-slate-900">{candidates.length}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Wanafunzi walioomba</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 block mb-1">Inasubiri Uhakiki</span>
          <span className="text-2xl font-black text-amber-900">
            {candidates.filter(c => c.status === 'PENDING').length}
          </span>
          <span className="text-[10px] text-amber-700 block mt-0.5">Zinahitaji uamuzi</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">Waliopitishwa (Ballot)</span>
          <span className="text-2xl font-black text-emerald-900">
            {candidates.filter(c => c.status === 'APPROVED').length}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5">Watakao pigiwa kura</span>
        </div>

        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block mb-1">Waliokataliwa</span>
          <span className="text-2xl font-black text-rose-900">
            {candidates.filter(c => c.status === 'REJECTED').length}
          </span>
          <span className="text-[10px] text-rose-700 block mt-0.5">Kukosa vigezo vya nidhamu</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tafuta jina la mgombea, darasa au reg no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedPositionId}
            onChange={e => setSelectedPositionId(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Vyeo Vyote ({positions.length})</option>
            {positions.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Hali Zote (All Status)</option>
            <option value="PENDING">Inasubiri (Pending)</option>
            <option value="APPROVED">Waliopitishwa (Approved)</option>
            <option value="REJECTED">Waliokataliwa (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Candidates List / Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredCandidates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3 border-r border-slate-700">Mgombea (Candidate)</th>
                  <th className="px-3 py-3 border-r border-slate-700">Cheo Anachoomba</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Darasa & Jinsia</th>
                  <th className="px-3 py-3 border-r border-slate-700">Ilani & Video</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Nidhamu (Record)</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Hali (Status)</th>
                  <th className="px-4 py-3 text-center">Hatua ya Mkuu wa Nidhamu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map(c => {
                  const pos = positions.find(p => p.id === c.positionId);
                  const disciplinaryRecord = disciplineRecords.filter(r => 
                    r.studentName.toLowerCase() === c.studentName.toLowerCase() ||
                    r.regNo === c.studentId
                  );
                  const hasDisciplineIssues = disciplinaryRecord.length > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      {/* Candidate Name & Photo */}
                      <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {c.photoUrl ? (
                            <img 
                              src={c.photoUrl} 
                              alt={c.studentName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {c.studentName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="block text-slate-900 font-black">{c.studentName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{c.studentId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Position Title */}
                      <td className="px-3 py-3 border-r border-slate-200 font-black text-blue-900">
                        {pos?.title || 'Cheo Kilichofutwa'}
                      </td>

                      {/* Class & Gender */}
                      <td className="px-3 py-3 text-center border-r border-slate-200 font-semibold text-slate-700">
                        <div>{c.studentClass}</div>
                        <span className={`text-[10px] font-bold ${c.studentGender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>
                          {c.studentGender === 'Female' ? 'Mwanamke' : 'Mwanamme'}
                        </span>
                      </td>

                      {/* Manifesto & Video Link */}
                      <td className="px-3 py-3 border-r border-slate-200 text-slate-600 max-w-xs">
                        {c.manifestoText ? (
                          <p className="line-clamp-2 text-[11px] italic text-slate-700">
                            "{c.manifestoText}"
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Bila ilani iliyoandikwa</span>
                        )}
                        {c.manifestoVideoUrl && (
                          <a 
                            href={c.manifestoVideoUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold mt-1 hover:underline"
                          >
                            <Video className="w-3 h-3" />
                            <span>Tazama Video ya Ilani</span>
                          </a>
                        )}
                      </td>

                      {/* Discipline Department Status Check */}
                      <td className="px-3 py-3 text-center border-r border-slate-200">
                        {hasDisciplineIssues ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Kesi {disciplinaryRecord.length}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <ShieldAlert className="w-3 h-3 text-emerald-600" />
                            <span>Safi (0 Kesi)</span>
                          </span>
                        )}
                      </td>

                      {/* Candidate Status */}
                      <td className="px-3 py-3 text-center border-r border-slate-200">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                          c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          c.status === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                          'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {c.status === 'APPROVED' ? 'Ameidhinishwa' :
                           c.status === 'REJECTED' ? 'Amekataliwa' : 'Inasubiri'}
                        </span>

                        {/* Dynamic Campaign Status Badge based on Election Dates */}
                        {c.status === 'APPROVED' && (
                          <div className="mt-1">
                            {(() => {
                              const nowTime = Date.now();
                              const nEnd = new Date(election.nominationEnd).getTime();
                              const vStart = new Date(election.votingStart).getTime();
                              const vEnd = new Date(election.votingEnd).getTime();

                              if (nowTime >= nEnd && nowTime < vStart) {
                                return (
                                  <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                                    <span>📢 Kwenye Kampeni</span>
                                  </span>
                                );
                              } else if (nowTime >= vStart && nowTime <= vEnd) {
                                return (
                                  <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <span>🗳️ Kura Zinaendelea</span>
                                  </span>
                                );
                              } else if (nowTime < nEnd) {
                                return (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block">
                                    <span>✅ Tayari Kupokea Ilani</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {c.rejectionReason && (
                          <div className="text-[9px] text-rose-600 mt-1 max-w-[120px] mx-auto truncate" title={c.rejectionReason}>
                            Sababu: {c.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(c, 'APPROVE')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Pitisha Mgombea (Approve)"
                            >
                              <Check className="w-3 h-3" />
                              <span>Idhinisha</span>
                            </button>
                          )}
                          {c.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReview(c, 'REJECT')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Kataa Mgombea (Reject)"
                            >
                              <X className="w-3 h-3" />
                              <span>Kataa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Hakuna Maombi Yaliyopatikana</h4>
            <p className="text-xs text-slate-400">
              Hakuna mgombea anayelingana na vigezo vya utafutaji au hakuna aliyetuma maombi bado.
            </p>
          </div>
        )}
      </div>

      {/* NOMINATION APPLICATION MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span>Wasilisha Fomu ya Uteuzi wa Uongozi</span>
              </h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-3.5 text-xs">
              {/* Select Student */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Chagua Mwanafunzi (Student)</label>
                <select
                  value={selectedStudentReg}
                  onChange={e => setSelectedStudentReg(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                >
                  {students.map(s => (
                    <option key={s.id || s.regNo} value={s.regNo}>
                      {s.name} ({s.className} {s.stream || ''}) - {s.gender} [{s.regNo}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Disciplinary Alert if student has disciplinary infractions */}
              {studentDisciplineCases.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Tahadhari ya Nidhamu:</strong> Mwanafunzi huyu ana rekodi ya matukio {studentDisciplineCases.length} kwenye Idara ya Nidhamu. Hakikisha maombi yake yanapitiwa kwa umakini na Mkuu wa Nidhamu.
                  </div>
                </div>
              )}

              {/* Select Position */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nafasi / Cheo Anachoomba (Target Position)</label>
                <select
                  value={applyPositionId}
                  onChange={e => setApplyPositionId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.orderNumber}. {p.title} ({p.genderRule === 'BOYS_ONLY' ? 'Wavulana Tu' : p.genderRule === 'GIRLS_ONLY' ? 'Wasichana Tu' : 'Wote'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Manifesto Text */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ilani ya Mgombea (Candidate Manifesto / Ahadi)</label>
                <textarea
                  rows={3}
                  required
                  value={manifestoText}
                  onChange={e => setManifestoText(e.target.value)}
                  placeholder="Eleza kwanini wanafunzi wakuchague na mabadiliko utakayoyaleta shuleni..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Video Manifesto Link */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Link ya Video ya Kampeni (Campaign Video URL)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Hiari (Optional)</span>
                </label>
                <div className="relative">
                  <Video className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="url"
                    value={manifestoVideoUrl}
                    onChange={e => setManifestoVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... au Google Drive link"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Candidate Photo URL */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Picha ya Mgombea (Photo URL au Base64)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Hiari (Ikitumika picha ya kitambulisho)</span>
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="Weka link ya picha au acha wazi itachukua picha ya mwanafunzi"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Wasilisha Maombi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCIPLINE HEAD REVIEW MODAL */}
      {isReviewModalOpen && reviewingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                {reviewAction === 'APPROVE' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {reviewAction === 'APPROVE' ? 'Idhinisha Mgombea Kwenye Kura' : 'Kataa Maombi ya Mgombea'}
                </span>
              </h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-black text-slate-900 text-sm">{reviewingCandidate.studentName}</div>
                <div className="text-slate-500 font-mono text-[11px]">{reviewingCandidate.studentClass} • {reviewingCandidate.studentId}</div>
              </div>

              {reviewAction === 'APPROVE' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                  Mgombea huyu atapitishwa na kuingizwa rasmi kwenye karatasi ya kura (Ballot Card) ili wanafunzi wote waweze kumpigia kura wakati upigaji kura ukifunguliwa.
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Sababu ya Kukataa Maombi (Reason for Rejection):</label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="e.g. Rekodi za utovu wa nidhamu, kutokidhi vigezo vya darasa au kutokuwa na ilani thabiti..."
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReview}
                  className={`px-5 py-2 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    reviewAction === 'APPROVE' 
                      ? 'bg-emerald-600 hover:bg-emerald-500' 
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {reviewAction === 'APPROVE' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{reviewAction === 'APPROVE' ? 'Thibitisha Kuidhinisha' : 'Thibitisha Kukataa'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
