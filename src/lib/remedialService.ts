import { supabase } from './supabaseClient';
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export const saveRemedialTimetable = async (schoolId: string, entry: any) => {
  // Sync to Firestore as fallback/durability
  const fsId = `${schoolId}_${entry.day_of_week}_${entry.period_time}_${entry.class_name}`;
  try {
    await setDoc(doc(db, 'remedial_timetable', fsId), { ...entry, school_id: schoolId, updatedAt: Timestamp.now() });
  } catch (e) {}

  return await supabase.from('remedial_timetable').upsert({
    ...entry,
    school_id: schoolId
  });
};

export const getRemedialTimetable = async (schoolId: string, className?: string) => {
  try {
    const { data, error } = await supabase.from('remedial_timetable').select('*').eq('school_id', schoolId);
    if (!error && data) return { data, error };
  } catch (e) {}

  // Fallback to Firestore
  const q = query(collection(db, 'remedial_timetable'), where('school_id', '==', schoolId));
  const snap = await getDocs(q);
  return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null };
};

export const markRemedialAttendance = async (schoolId: string, record: any) => {
  const id = `${schoolId}_${record.date}_${record.day_of_week}_${record.period_time}_${record.class_name}`;
  
  // Sync to Firestore
  try {
    await setDoc(doc(db, 'remedial_attendance', id), { ...record, school_id: schoolId, updatedAt: Timestamp.now() });
  } catch (e) {}

  return await supabase.from('remedial_attendance').upsert({
    id,
    ...record,
    school_id: schoolId,
    marked_at: new Date().toISOString()
  });
};

export const getRemedialAttendance = async (schoolId: string, date: string) => {
  try {
    const { data, error } = await supabase.from('remedial_attendance').select('*').eq('school_id', schoolId).eq('date', date);
    if (!error && data) return { data, error };
  } catch (e) {}

  // Fallback to Firestore
  const q = query(collection(db, 'remedial_attendance'), where('school_id', '==', schoolId), where('date', '==', date));
  const snap = await getDocs(q);
  return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null };
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
};
