import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export const saveSchoolData = async (schoolId: string, data: any) => {
  const docRef = doc(db, 'schools', schoolId);
  await setDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  }, { merge: true });
};

export const getSchoolData = async (schoolId: string) => {
  const docRef = doc(db, 'schools', schoolId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const subscribeSchoolData = (schoolId: string, callback: (data: any) => void) => {
  const docRef = doc(db, 'schools', schoolId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  }, (err) => {
    console.warn("Firestore onSnapshot subscription error:", err);
  });
};

export const markPeriodAttendance = async (schoolId: string, record: any) => {
  const recordId = `${schoolId}_${record.date}_${record.class_name}_${record.stream}_${record.period_number}`;
  const docRef = doc(db, 'period_attendance', recordId);
  await setDoc(docRef, {
    ...record,
    school_id: schoolId,
    updatedAt: Timestamp.now()
  });
};

export const getPeriodAttendance = async (schoolId: string, date: string, className: string) => {
  const q = query(
    collection(db, 'period_attendance'),
    where('school_id', '==', schoolId),
    where('date', '==', date),
    where('class_name', '==', className)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};

export const getWeeklyAttendance = async (schoolId: string, startDate: string, endDate: string, className: string) => {
  const q = query(
    collection(db, 'period_attendance'),
    where('school_id', '==', schoolId),
    where('class_name', '==', className),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
};
