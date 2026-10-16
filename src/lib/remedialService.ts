export interface RemedialTimetableEntry {
  id?: string;
  class_name: string;
  stream: string;
  subject: string;
  teacher_name: string;
  teacher_id?: number | string;
  date: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  period_time?: string;
  room?: string;
  term?: string;
  academic_year?: string;
  created_at?: string;
  school_id?: string;
  notify_students?: boolean;
}

export function timeToMinutes(t?: string): number {
  if (!t) return 0;
  const parts = t.trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function checkRemedialConflict(
  existingEntries: RemedialTimetableEntry[],
  newEntry: RemedialTimetableEntry,
  ignoreId?: string
): { hasConflict: boolean; conflictingEntry?: RemedialTimetableEntry; message?: string } {
  const newStartMin = timeToMinutes(newEntry.start_time);
  const newEndMin = timeToMinutes(newEntry.end_time);

  if (newEndMin <= newStartMin) {
    return {
      hasConflict: true,
      message: 'Muda wa kuisha lazima uwe baada ya muda wa kuanza.'
    };
  }

  return { hasConflict: false };
}

const getLocalRemedial = (schoolId: string): RemedialTimetableEntry[] => {
  try {
    const raw = localStorage.getItem(`haby_remedial_timetable_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalRemedial = (schoolId: string, entries: RemedialTimetableEntry[]): void => {
  try {
    localStorage.setItem(`haby_remedial_timetable_${schoolId}`, JSON.stringify(entries));
  } catch {}
};

export const saveRemedialTimetableEntry = async (schoolId: string, entry: RemedialTimetableEntry) => {
  const entries = getLocalRemedial(schoolId);
  const entryId = entry.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const periodTime = entry.start_time && entry.end_time ? `${entry.start_time}-${entry.end_time}` : (entry.period_time || '16:00-17:00');
  
  const fullEntry = {
    ...entry,
    id: entryId,
    period_time: periodTime,
    school_id: schoolId,
    created_at: entry.created_at || new Date().toISOString()
  };

  const idx = entries.findIndex(e => e.id === entryId);
  if (idx >= 0) {
    entries[idx] = fullEntry;
  } else {
    entries.unshift(fullEntry);
  }
  setLocalRemedial(schoolId, entries);

  return { data: fullEntry, error: null };
};

export const saveRemedialTimetableBatch = async (schoolId: string, entries: RemedialTimetableEntry[]) => {
  const current = getLocalRemedial(schoolId);
  const preparedEntries = entries.map(entry => {
    const entryId = entry.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const periodTime = entry.start_time && entry.end_time ? `${entry.start_time}-${entry.end_time}` : (entry.period_time || '16:00-17:00');
    return {
      ...entry,
      id: entryId,
      period_time: periodTime,
      school_id: schoolId,
      created_at: entry.created_at || new Date().toISOString()
    };
  });

  setLocalRemedial(schoolId, [...preparedEntries, ...current]);
  return { data: preparedEntries, error: null };
};

export const clearRemedialTimetable = async (schoolId: string, className?: string, streamName?: string) => {
  let entries = getLocalRemedial(schoolId);
  if (className && className !== 'ALL') {
    entries = entries.filter(e => e.class_name.toLowerCase() !== className.toLowerCase());
  } else if (!className) {
    entries = [];
  }
  setLocalRemedial(schoolId, entries);
  return { success: true };
};

export const getRemedialTimetable = async (schoolId: string, className?: string) => {
  const entries = getLocalRemedial(schoolId);
  if (className && className !== 'All') {
    return { data: entries.filter((d: any) => d.class_name.toLowerCase() === className.toLowerCase()), error: null };
  }
  return { data: entries, error: null };
};

export const deleteRemedialTimetableEntry = async (schoolId: string, id: string) => {
  let entries = getLocalRemedial(schoolId);
  entries = entries.filter(e => e.id !== id);
  setLocalRemedial(schoolId, entries);
  return { success: true };
};

export const markRemedialAttendance = async (schoolId: string, record: any) => {
  return { success: true };
};

export const getRemedialAttendance = async (schoolId: string, date: string) => {
  return { data: [], error: null };
};

export const getRemedialPaymentSettings = async (schoolId: string) => {
  return { data: [], error: null };
};

export const saveRemedialPaymentSetting = async (schoolId: string, setting: any) => {
  return { data: setting, error: null };
};

export const getRemedialAnalysis = async (schoolId: string, startDate: string, endDate: string, className?: string) => {
  return { data: [], error: null };
};

export const saveRemedialTimetable = saveRemedialTimetableEntry;

