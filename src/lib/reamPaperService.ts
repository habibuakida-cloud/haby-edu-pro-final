import { ReamPaperRecord } from '../types';

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
  return getLocalReams(schoolId);
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
  return { error: null };
}

export async function deleteReamPaperRecord(schoolId: string, recordId: string): Promise<boolean> {
  if (!schoolId || !recordId) return false;
  const list = getLocalReams(schoolId);
  const filtered = list.filter(r => r.id !== recordId);
  setLocalReams(schoolId, filtered);
  return true;
}
