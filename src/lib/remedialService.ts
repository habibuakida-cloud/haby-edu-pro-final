import { supabase } from './dbClient';

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

  try {
    await supabase.from('remedial_timetable').upsert(fullEntry);
  } catch (e) {
    console.warn('Error saving remedial_timetable to DB:', e);
  }

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

  try {
    await supabase.from('remedial_timetable').upsert(preparedEntries);
  } catch (e) {
    console.warn('Error saving remedial_timetable batch to DB:', e);
  }

  return { data: preparedEntries, error: null };
};

export const clearRemedialTimetable = async (schoolId: string, className?: string, _streamName?: string) => {
  let entries = getLocalRemedial(schoolId);
  if (className && className !== 'ALL') {
    entries = entries.filter(e => e.class_name.toLowerCase() !== className.toLowerCase());
  } else if (!className) {
    entries = [];
  }
  setLocalRemedial(schoolId, entries);

  try {
    const delQuery = supabase.from('remedial_timetable').delete().eq('school_id', schoolId);
    if (className && className !== 'ALL') {
      await delQuery.eq('class_name', className);
    } else {
      await delQuery;
    }
  } catch (e) {}

  return { success: true };
};

export const getRemedialTimetable = async (schoolId: string, className?: string) => {
  let entries = getLocalRemedial(schoolId);
  try {
    const { data, error } = await supabase
      .from('remedial_timetable')
      .select('*')
      .eq('school_id', schoolId);
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: RemedialTimetableEntry[] = data.map((d: any) => {
        const pt = d.period_time || d.periodTime || '16:00-17:00';
        const [st, et] = pt.includes('-') ? pt.split('-') : ['16:00', '17:00'];
        return {
          id: String(d.id),
          class_name: d.class_name || d.className || 'Form 1',
          stream: d.stream || 'A',
          subject: d.subject || '',
          teacher_name: d.teacher_name || d.teacherName || '',
          date: d.date || '',
          day_of_week: d.day_of_week || d.dayOfWeek || 'Monday',
          start_time: st,
          end_time: et,
          period_time: pt,
          term: d.term || 'Term 1',
          school_id: d.school_id || d.schoolId || schoolId,
          created_at: d.created_at || d.createdAt || ''
        };
      });
      setLocalRemedial(schoolId, mapped);
      entries = mapped;
    }
  } catch (e) {}

  if (className && className !== 'All' && className !== 'ALL') {
    return { data: entries.filter((d: any) => d.class_name.toLowerCase() === className.toLowerCase()), error: null };
  }
  return { data: entries, error: null };
};

export const deleteRemedialTimetableEntry = async (schoolId: string, id: string) => {
  let entries = getLocalRemedial(schoolId);
  entries = entries.filter(e => e.id !== id);
  setLocalRemedial(schoolId, entries);

  try {
    await supabase.from('remedial_timetable').delete().eq('id', id);
  } catch (e) {}

  return { success: true };
};

export const markRemedialAttendance = async (schoolId: string, record: any) => {
  const payload = {
    ...record,
    id: record.id || `${schoolId}_${record.date || new Date().toISOString().split('T')[0]}_${record.period_time || '16:00'}_${record.class_name || 'Form1'}`,
    school_id: schoolId,
    marked_at: new Date().toISOString()
  };
  try {
    await supabase.from('remedial_attendance').upsert(payload);
  } catch (e) {
    console.warn('Error saving remedial_attendance:', e);
  }
  return { success: true, data: payload };
};

export const getRemedialAttendance = async (schoolId: string, date: string) => {
  try {
    let q = supabase.from('remedial_attendance').select('*').eq('school_id', schoolId);
    if (date) q = q.eq('date', date);
    const { data, error } = await q;
    return { data: data || [], error };
  } catch (e) {
    return { data: [], error: e };
  }
};

export const getRemedialPaymentSettings = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from('remedial_payment_settings')
      .select('*')
      .eq('school_id', schoolId);
    return { data: data || [], error };
  } catch (e) {
    return { data: [], error: e };
  }
};

export const saveRemedialPaymentSetting = async (schoolId: string, setting: any) => {
  const payload = {
    ...setting,
    id: setting.id || `rps_${schoolId}_${setting.class_name || setting.className || 'ALL'}`,
    school_id: schoolId
  };
  try {
    await supabase.from('remedial_payment_settings').upsert(payload);
  } catch (e) {}
  return { data: payload, error: null };
};

export const getRemedialAnalysis = async (schoolId: string, _startDate: string, _endDate: string, className?: string) => {
  try {
    let q = supabase.from('remedial_attendance').select('*').eq('school_id', schoolId);
    if (className && className !== 'All' && className !== 'ALL') {
      q = q.eq('class_name', className);
    }
    const { data, error } = await q;
    return { data: data || [], error };
  } catch (e) {
    return { data: [], error: e };
  }
};

export const saveRemedialTimetable = saveRemedialTimetableEntry;


