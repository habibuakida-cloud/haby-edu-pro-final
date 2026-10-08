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

  // 1. Sync to Supabase (Priority - Single Source of Truth)
  try {
    const { error: supError } = await supabase.from('remedial_timetable').upsert(fullEntry, { onConflict: 'id' });
    if (supError) console.warn("Supabase remedial save error:", supError);
  } catch (e) {
    console.error("Supabase remedial exception:", e);
  }

  // 2. Sync to Firestore (Backup)
  try {
    const cleanDoc = sanitizeForFirestore({
      ...fullEntry,
      updatedAt: Timestamp.now()
    });
    await setDoc(doc(db, 'remedial_timetable', entryId), cleanDoc, { merge: true });
  } catch (e) {
    console.warn("Firestore remedial save error:", e);
  }

  return { data: fullEntry, error: null };
};

export const saveRemedialTimetableBatch = async (schoolId: string, entries: RemedialTimetableEntry[]) => {
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

  // 1. Supabase upsert
  try {
    const { error } = await supabase.from('remedial_timetable').upsert(preparedEntries, { onConflict: 'id' });
    if (error) console.warn('Supabase batch remedial save error:', error);
  } catch (e) {
    console.warn('Supabase batch exception:', e);
  }

  // 2. Firestore backup
  try {
    for (const item of preparedEntries) {
      const cleanDoc = sanitizeForFirestore({
        ...item,
        updatedAt: Timestamp.now()
      });
      await setDoc(doc(db, 'remedial_timetable', item.id!), cleanDoc, { merge: true });
    }
  } catch (e) {
    console.warn('Firestore batch error:', e);
  }

  return { data: preparedEntries, error: null };
};

export const clearRemedialTimetable = async (schoolId: string, className?: string, streamName?: string) => {
  // 1. Supabase delete
  try {
    let q = supabase.from('remedial_timetable').delete().eq('school_id', schoolId);
    if (className && className !== 'ALL') {
      q = q.eq('class_name', className);
    }
    if (streamName && streamName !== 'ALL' && streamName !== 'All Streams') {
      q = q.eq('stream', streamName);
    }
    await q;
  } catch (e) {
    console.warn('Supabase clear error:', e);
  }

  // 2. Firestore delete matching
  try {
    const qFs = query(collection(db, 'remedial_timetable'), where('school_id', '==', schoolId));
    const snap = await getDocs(qFs);
    for (const d of snap.docs) {
      const data = d.data();
      const matchClass = !className || className === 'ALL' || data.class_name?.toLowerCase() === className.toLowerCase();
      const matchStream = !streamName || streamName === 'ALL' || streamName === 'All Streams' || data.stream?.toLowerCase() === streamName.toLowerCase();
      if (matchClass && matchStream) {
        await deleteDoc(d.ref);
      }
    }
  } catch (e) {
    console.warn('Firestore clear error:', e);
  }

  return { success: true };
};

export const getRemedialTimetable = async (schoolId: string, className?: string) => {
  // 1. Prioritize Supabase (The real SAAS database)
  try {
    const { data, error } = await supabase.from('remedial_timetable').select('*').eq('school_id', schoolId);
    if (!error && data && data.length > 0) {
      if (className && className !== 'All') {
        return { data: data.filter((d: any) => d.class_name.toLowerCase() === className.toLowerCase()), error: null };
      }
      return { data, error: null };
    }
  } catch (e) {
    console.warn("Supabase remedial fetch error:", e);
  }

  // 2. Fallback to Firestore
  try {
    const q = query(collection(db, 'remedial_timetable'), where('school_id', '==', schoolId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const fsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as RemedialTimetableEntry));
      if (className && className !== 'All') {
        return { data: fsData.filter(d => d.class_name.toLowerCase() === className.toLowerCase()), error: null };
      }
      return { data: fsData, error: null };
    }
  } catch (e) {}

  return { data: [], error: null };
};

export const deleteRemedialTimetableEntry = async (schoolId: string, id: string) => {
  // 1. Delete from Supabase
  try {
    const { error } = await supabase.from('remedial_timetable').delete().eq('id', id);
    if (error) console.warn("Supabase remedial delete error:", error);
  } catch (e) {}

  // 2. Delete from Firestore
  try {
    await deleteDoc(doc(db, 'remedial_timetable', id));
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
