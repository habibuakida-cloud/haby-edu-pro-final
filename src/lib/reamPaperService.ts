import { ReamPaperRecord } from '../types';
import { supabase } from './dbClient';

const LOCAL_STORAGE_REAMS_KEY = 'haby_ream_paper_records_';

function getLocalReams(schoolId: string): ReamPaperRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_REAMS_KEY}${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function setLocalReams(schoolId: string, records: ReamPaperRecord[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_REAMS_KEY}${schoolId}`, JSON.stringify(records));
  } catch (e) {}
}

export async function fetchReamPaperRecords(schoolId: string): Promise<ReamPaperRecord[]> {
  if (!schoolId) return [];
  const local = getLocalReams(schoolId);
  try {
    const { data, error } = await supabase
      .from('ream_paper_records')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: ReamPaperRecord[] = data.map((r: any) => ({
        id: String(r.id),
        student_id: r.student_id || r.studentId || '',
        student_name: r.student_name || r.studentName || '',
        class: r.class || '',
        stream: r.stream || '',
        reams_brought: Number(r.reams_brought ?? r.reamsBrought ?? 1),
        date_brought: r.date_brought || r.dateBrought || '',
        term: r.term || 'Muhula 1',
        academic_year: r.academic_year || r.academicYear || '2026',
        received_by: r.received_by || r.receivedBy || '',
        notes: r.notes || '',
        school_id: r.school_id || r.schoolId || schoolId,
        created_at: r.created_at || r.createdAt || new Date().toISOString()
      }));
      setLocalReams(schoolId, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('Error fetching ream_paper_records from DB:', e);
  }
  return local;
}

export async function saveReamPaperRecord(schoolId: string, record: Partial<ReamPaperRecord>): Promise<{ error: any }> {
  if (!schoolId) return { error: 'No schoolId' };
  const list = getLocalReams(schoolId);
  const index = list.findIndex(r => r.id === record.id);
  const entry = {
    ...record,
    id: record.id || `ream_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    school_id: schoolId,
    created_at: (record as any).created_at || new Date().toISOString()
  };

  if (index >= 0) {
    list[index] = entry as any;
  } else {
    list.unshift(entry as any);
  }
  setLocalReams(schoolId, list);

  try {
    await supabase.from('ream_paper_records').upsert(entry);
  } catch (e) {
    console.warn('Error saving ream_paper_record to DB:', e);
  }

  return { error: null };
}

export async function deleteReamPaperRecord(schoolId: string, recordId: string): Promise<boolean> {
  if (!schoolId || !recordId) return false;
  const list = getLocalReams(schoolId);
  const filtered = list.filter(r => r.id !== recordId);
  setLocalReams(schoolId, filtered);

  try {
    await supabase.from('ream_paper_records').delete().eq('id', recordId);
  } catch (e) {
    console.warn('Error deleting ream_paper_record from DB:', e);
  }

  return true;
}

