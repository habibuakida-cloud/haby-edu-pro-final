import { supabase, resilientUpsert } from './supabaseClient';
import { ReamPaperRecord } from '../types';

const LOCAL_STORAGE_REAMS_KEY = 'haby_ream_paper_records_';

const isValidUuid = (id?: string) => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

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

    if (error) return local;

    if (data && data.length > 0) {
      const formatted: ReamPaperRecord[] = data.map((d: any) => ({
        id: String(d.id),
        student_id: d.student_id || '',
        student_name: d.student_name || '',
        class: d.class || '',
        stream: d.stream || '',
        reams_brought: Number(d.reams_brought || 0),
        date_brought: d.date_brought || new Date().toISOString().split('T')[0],
        term: d.term || 'Muhula 1',
        academic_year: d.academic_year || '2026',
        received_by: d.received_by || '',
        notes: d.notes || '',
        school_id: d.school_id || schoolId,
        created_at: d.created_at || new Date().toISOString()
      }));
      setLocalReams(schoolId, formatted);
      return formatted;
    }
    return local;
  } catch (err) {
    return local;
  }
}

export async function saveReamPaperRecord(
  schoolId: string,
  record: Partial<ReamPaperRecord>
): Promise<{ data: ReamPaperRecord | null; error: any }> {
  const current = getLocalReams(schoolId);
  const now = new Date().toISOString();
  const id = record.id || crypto.randomUUID();

  const fullRecord: ReamPaperRecord = {
    id,
    student_id: record.student_id || '',
    student_name: record.student_name || 'Mwanafunzi',
    class: record.class || 'Darasa la 1',
    stream: record.stream || 'Stream A',
    reams_brought: Number(record.reams_brought !== undefined ? record.reams_brought : 1),
    date_brought: record.date_brought || now.split('T')[0],
    term: record.term || 'Muhula 1',
    academic_year: record.academic_year || '2026',
    received_by: record.received_by || '',
    notes: record.notes || '',
    school_id: schoolId,
    created_at: record.created_at || now
  };

  const idx = current.findIndex(r => String(r.id) === String(id));
  let updated: ReamPaperRecord[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = fullRecord;
  } else {
    updated = [fullRecord, ...current];
  }
  setLocalReams(schoolId, updated);

  try {
    const payload: Record<string, any> = {
      id,
      student_id: fullRecord.student_id,
      student_name: fullRecord.student_name,
      class: fullRecord.class,
      stream: fullRecord.stream,
      reams_brought: fullRecord.reams_brought,
      date_brought: fullRecord.date_brought,
      term: fullRecord.term,
      academic_year: fullRecord.academic_year,
      received_by: fullRecord.received_by,
      notes: fullRecord.notes,
      school_id: schoolId
    };

    const res = await resilientUpsert('ream_paper_records', payload, { onConflict: 'id' });
    return { data: fullRecord, error: res.error };
  } catch (err) {
    return { data: fullRecord, error: err };
  }
}

export async function deleteReamPaperRecord(schoolId: string, recordId: string): Promise<boolean> {
  const current = getLocalReams(schoolId);
  const updated = current.filter(r => String(r.id) !== String(recordId));
  setLocalReams(schoolId, updated);

  try {
    await supabase.from('ream_paper_records').delete().eq('id', recordId);
  } catch (e) {}

  return true;
}
