import { db } from '../lib/dbClient';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export interface DailyAttendance {
  studentId: string;
  teacherId: string;
  schoolId: string;
  status: 'PRESENT' | 'ABSENT';
}

export async function logAttendance(attendance: DailyAttendance) {
  try {
    const attendanceCollection = collection(db, 'daily_attendance');
    await addDoc(attendanceCollection, {
      ...attendance,
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error logging attendance:', error);
    throw error;
  }
}

export async function getStudentAttendance(studentId: string, schoolId: string) {
  try {
    const attendanceCollection = collection(db, 'daily_attendance');
    const q = query(
      attendanceCollection,
      where('studentId', '==', studentId),
      where('schoolId', '==', schoolId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw error;
  }
}
