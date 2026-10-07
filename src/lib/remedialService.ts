import { supabase } from './supabaseClient';
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { sanitizeForFirestore } from './firestoreService';

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

/**
 * Converts "HH:MM" string to minutes from midnight
 */
export function timeToMinutes(t?: string): number {
  if (!t) return 0;
  const parts = t.trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Checks if two time intervals overlap on the same date/day for the same teacher.
 * Prevents double-booking a teacher for two classes at the same time.
 */
export function checkRemedialConflict(
  existingEntries: RemedialTimetableEntry[],
  newEntry: RemedialTimetableEntry,
  ignoreId?: string
): { hasConflict: boolean; conflictingEntry?: RemedialTimetableEntry; message?: string } {
  const newTeacher = (newEntry.teacher_name || '').trim().toLowerCase();
  const newDate = newEntry.date?.trim();
  const newDay = (newEntry.day_of_week || '').trim().toLowerCase();
  
  const newStartMin = timeToMinutes(newEntry.start_time);
  const newEndMin = timeToMinutes(newEntry.end_time);

  if (newEndMin <= newStartMin) {
    return {
      hasConflict: true,
      message: 'Muda wa kuisha lazima uwe baada ya muda wa kuanza (End time must be after start time).'
    };
  }

  for (const item of existingEntries) {
    if (ignoreId && item.id === ignoreId) continue;

    const itemTeacher = (item.teacher_name || '').trim().toLowerCase();
    if (itemTeacher !== newTeacher) continue;

    // Check if same date or same day of week
    const isSameDate = newDate && item.date && newDate === item.date.trim();
    const isSameDay = newDay && item.day_of_week && newDay === item.day_of_week.trim().toLowerCase();

    if (isSameDate || (!newDate && isSameDay)) {
      const itemStartMin = timeToMinutes(item.start_time || item.period_time?.split('-')[0]);
      const itemEndMin = timeToMinutes(item.end_time || item.period_time?.split('-')[1]);

      // Overlap condition: startA < endB and endA > startB
      if (newStartMin < itemEndMin && newEndMin > itemStartMin) {
        return {
          hasConflict: true,
          conflictingEntry: item,
          message: `Mgongano wa Ratiba! Mwalimu ${item.teacher_name} tayari ana kipindi cha ${item.subject} (${item.class_name} ${item.stream || ''}) kuanzia ${item.start_time || item.period_time} siku hii.`
        };
      }
    }
  }

  return { hasConflict: false };
}

export const saveRemedialTimetable = async (schoolId: string, entry: RemedialTimetableEntry) => {
  const entryId = entry.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const periodTime = entry.start_time && entry.end_time ? `${entry.start_time}-${entry.end_time}` : (entry.period_time || '16:00-17:00');

  const fullEntry: RemedialTimetableEntry = {
    ...entry,
    id: entryId,
    period_time: periodTime,
    school_id: schoolId,
    created_at: entry.created_at || new Date().toISOString()
  };

  // 1. Save to LocalStorage cache
  try {
    const localKey = `haby_remedial_timetable_${schoolId}`;
    const raw = localStorage.getItem(localKey);
    let list: RemedialTimetableEntry[] = raw ? JSON.parse(raw) : [];
    const existingIdx = list.findIndex(e => e.id === entryId);
    if (existingIdx >= 0) {
      list[existingIdx] = fullEntry;
    } else {
      list.unshift(fullEntry);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {}

  // 2. Sync to Firestore
  try {
    const cleanDoc = sanitizeForFirestore({
      ...fullEntry,
      updatedAt: Timestamp.now()
    });
    await setDoc(doc(db, 'remedial_timetable', entryId), cleanDoc, { merge: true });
  } catch (e) {
    console.warn("Firestore remedial save error:", e);
  }

  // 3. Sync to Supabase
  try {
    await supabase.from('remedial_timetable').upsert(fullEntry, { onConflict: 'id' });
  } catch (e) {}

  return { data: fullEntry, error: null };
};

export const getRemedialTimetable = async (schoolId: string, className?: string) => {
  // 1. Try LocalStorage for instant hydration
  let localData: RemedialTimetableEntry[] = [];
  try {
    const localKey = `haby_remedial_timetable_${schoolId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  // 2. Try Firestore
  try {
    const q = query(collection(db, 'remedial_timetable'), where('school_id', '==', schoolId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const fsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as RemedialTimetableEntry));
      try {
        localStorage.setItem(`haby_remedial_timetable_${schoolId}`, JSON.stringify(fsData));
      } catch (e) {}
      
      if (className && className !== 'All') {
        return { data: fsData.filter(d => d.class_name.toLowerCase() === className.toLowerCase()), error: null };
      }
      return { data: fsData, error: null };
    }
  } catch (e) {}

  // 3. Fallback to Supabase
  try {
    const { data, error } = await supabase.from('remedial_timetable').select('*').eq('school_id', schoolId);
    if (!error && data && data.length > 0) {
      return { data, error: null };
    }
  } catch (e) {}

  return { data: localData, error: null };
};

export const deleteRemedialTimetableEntry = async (schoolId: string, id: string) => {
  // 1. Remove from local storage
  try {
    const localKey = `haby_remedial_timetable_${schoolId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: RemedialTimetableEntry[] = JSON.parse(raw);
      const filtered = list.filter(e => e.id !== id);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {}

  // 2. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'remedial_timetable', id));
  } catch (e) {}

  // 3. Delete from Supabase
  try {
    await supabase.from('remedial_timetable').delete().eq('id', id);
  } catch (e) {}

  return { success: true };
};

export const markRemedialAttendance = async (schoolId: string, record: any) => {
  const id = `${schoolId}_${record.date}_${record.day_of_week}_${record.period_time}_${record.class_name}`;
  
  try {
    const cleanDoc = sanitizeForFirestore({
      ...record,
      id,
      school_id: schoolId,
      updatedAt: Timestamp.now()
    });
    await setDoc(doc(db, 'remedial_attendance', id), cleanDoc, { merge: true });
  } catch (e) {}

  try {
    await supabase.from('remedial_attendance').upsert({
      id,
      ...record,
      school_id: schoolId,
      marked_at: new Date().toISOString()
    });
  } catch (e) {}

  return { success: true };
};

export const getRemedialAttendance = async (schoolId: string, date: string) => {
  try {
    const { data, error } = await supabase.from('remedial_attendance').select('*').eq('school_id', schoolId).eq('date', date);
    if (!error && data && data.length > 0) return { data, error };
  } catch (e) {}

  // Fallback to Firestore
  try {
    const q = query(collection(db, 'remedial_attendance'), where('school_id', '==', schoolId), where('date', '==', date));
    const snap = await getDocs(q);
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null };
  } catch (e) {
    return { data: [], error: null };
  }
};

export const getRemedialPaymentSettings = async (schoolId: string) => {
  try {
    const { data, error } = await supabase.from('remedial_payment_settings').select('*').eq('school_id', schoolId);
    if (!error && data) return { data, error };
  } catch (e) {}
  
  return { data: [], error: null };
};

export const saveRemedialPaymentSetting = async (schoolId: string, setting: any) => {
  return await supabase.from('remedial_payment_settings').upsert({
    ...setting,
    school_id: schoolId
  });
};

export const getRemedialAnalysis = async (schoolId: string, startDate: string, endDate: string, className?: string) => {
  try {
    let qSup = supabase.from('remedial_attendance')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'taught')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (className && className !== 'All') {
      qSup = qSup.eq('class_name', className);
    }
    const { data, error } = await qSup;
    if (!error && data) return { data, error };
  } catch (e) {}

  // Fallback to Firestore
  try {
    const q = query(
      collection(db, 'remedial_attendance'), 
      where('school_id', '==', schoolId), 
      where('status', '==', 'taught'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    let results = snap.docs.map(d => d.data());
    if (className && className !== 'All') {
      results = results.filter((r: any) => r.class_name === className);
    }
    return { data: results, error: null };
  } catch (e) {
    return { data: [], error: null };
  }
};
