import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseClient';

export interface FirestoreStudent {
  id: string;
  numericId?: number;
  regNo?: string;
  name: string;
  className: string;
  gender?: string;
  parentPhone?: string;
  phone?: string;
  feeStatus: 'PAID' | 'UNPAID';
  schoolId: string;
  createdAt?: string;
  updatedAt?: string;
  dob?: string;
  stream?: string;
  subjects?: string[];
  marks?: Record<string, any>;
  total?: number;
  average?: number | string;
  grade?: string;
  division?: string;
  points?: number | string;
  remark?: string;
  position?: number | string;
}

export interface FirestoreTeacher {
  id: string;
  numericId?: number;
  name: string;
  gender?: string;
  schoolRole?: string;
  phone?: string;
  email?: string;
  subject?: string;
  subjects?: string[];
  initial?: string;
  excludeInvigilation?: boolean;
  assignedClasses?: any[];
  schoolId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirestoreSchool {
  id: string;
  name: string;
  code?: string;
  district?: string;
  region?: string;
  address?: string;
  email?: string;
  adminEmail?: string;
  phone?: string;
  principal?: string;
  motto?: string;
  package?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STUDENTS_COL = 'students';
const TEACHERS_COL = 'teachers';
const SCHOOLS_COL = 'schools';

export const DEFAULT_PRIMARY_SCHOOL: FirestoreSchool = {
  id: '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
  name: 'HABY EDU SCHOOL',
  code: 'CTR-001',
  status: 'ACTIVE',
  address: 'Tanzania',
  package: 'Pro Enterprise'
};

function sanitizeDocId(rawId: string, prefix: string): string {
  const cleaned = String(rawId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned || `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// ==========================================
// 1. STUDENTS FIRESTORE METHODS
// ==========================================

export function subscribeToStudents(
  schoolId: string, 
  onUpdate: (students: FirestoreStudent[]) => void,
  onError?: (err: any) => void
) {
  try {
    const q = query(collection(db, STUDENTS_COL), where('schoolId', '==', schoolId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FirestoreStudent[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        onUpdate(list);
      },
      (error) => {
        console.error("Firestore students snapshot error:", error);
        handleFirestoreError(error, OperationType.LIST, STUDENTS_COL);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STUDENTS_COL);
    return () => {};
  }
}

export async function saveStudentToFirestore(student: FirestoreStudent): Promise<void> {
  const studentId = sanitizeDocId(student.id, 'std');
  const studentRef = doc(db, STUDENTS_COL, studentId);
  const now = new Date().toISOString();
  
  const rawPayload: Record<string, any> = {
    ...student,
    id: studentId,
    name: String(student.name || 'Student').trim(),
    className: String(student.className || 'Form 1').trim(),
    schoolId: String(student.schoolId || DEFAULT_PRIMARY_SCHOOL.id).trim(),
    feeStatus: student.feeStatus || 'UNPAID',
    createdAt: student.createdAt || now,
    updatedAt: now
  };
  const payload = Object.fromEntries(Object.entries(rawPayload).filter(([, v]) => v !== undefined));

  try {
    await setDoc(studentRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STUDENTS_COL}/${studentId}`);
  }
}

export async function updateStudentFeeStatus(
  studentId: string, 
  feeStatus: 'PAID' | 'UNPAID'
): Promise<void> {
  const cleanId = sanitizeDocId(studentId, 'std');
  const studentRef = doc(db, STUDENTS_COL, cleanId);
  try {
    await updateDoc(studentRef, {
      feeStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STUDENTS_COL}/${cleanId}`);
  }
}

export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const cleanId = sanitizeDocId(studentId, 'std');
  const studentRef = doc(db, STUDENTS_COL, cleanId);
  try {
    await deleteDoc(studentRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${STUDENTS_COL}/${cleanId}`);
  }
}

// ==========================================
// 2. TEACHERS FIRESTORE METHODS
// ==========================================

export function subscribeToTeachers(
  schoolId: string, 
  onUpdate: (teachers: FirestoreTeacher[]) => void,
  onError?: (err: any) => void
) {
  try {
    const q = query(collection(db, TEACHERS_COL), where('schoolId', '==', schoolId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FirestoreTeacher[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        onUpdate(list);
      },
      (error) => {
        console.error("Firestore teachers snapshot error:", error);
        handleFirestoreError(error, OperationType.LIST, TEACHERS_COL);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, TEACHERS_COL);
    return () => {};
  }
}

export async function saveTeacherToFirestore(teacher: FirestoreTeacher): Promise<void> {
  const teacherId = sanitizeDocId(teacher.id, 'tch');
  const teacherRef = doc(db, TEACHERS_COL, teacherId);
  const now = new Date().toISOString();
  const rawPayload: Record<string, any> = {
    ...teacher,
    id: teacherId,
    name: String(teacher.name || 'Teacher').trim(),
    schoolId: String(teacher.schoolId || DEFAULT_PRIMARY_SCHOOL.id).trim(),
    createdAt: teacher.createdAt || now,
    updatedAt: now
  };
  const payload = Object.fromEntries(Object.entries(rawPayload).filter(([, v]) => v !== undefined));

  try {
    await setDoc(teacherRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${TEACHERS_COL}/${teacherId}`);
  }
}

export async function deleteTeacherFromFirestore(teacherId: string): Promise<void> {
  const cleanId = sanitizeDocId(teacherId, 'tch');
  const teacherRef = doc(db, TEACHERS_COL, cleanId);
  try {
    await deleteDoc(teacherRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${TEACHERS_COL}/${cleanId}`);
  }
}

// ==========================================
// 3. SCHOOLS FIRESTORE METHODS
// ==========================================

export async function fetchSchoolsFromFirestore(): Promise<FirestoreSchool[]> {
  try {
    const colRef = collection(db, SCHOOLS_COL);
    const snap = await getDocs(colRef);
    const list: FirestoreSchool[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });

    if (list.length === 0) {
      try {
        await saveSchoolToFirestore(DEFAULT_PRIMARY_SCHOOL);
        list.push(DEFAULT_PRIMARY_SCHOOL);
      } catch (seedErr) {
        console.warn("Could not seed default school:", seedErr);
        list.push(DEFAULT_PRIMARY_SCHOOL);
      }
    }
    return list;
  } catch (error) {
    console.error("fetchSchoolsFromFirestore error:", error);
    try {
      const stored = localStorage.getItem('haby_registered_schools');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_PRIMARY_SCHOOL];
  }
}

export function subscribeToSchools(
  onUpdate: (schools: FirestoreSchool[]) => void,
  onError?: (err: any) => void
) {
  try {
    const colRef = collection(db, SCHOOLS_COL);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: FirestoreSchool[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        if (list.length === 0) {
          list.push(DEFAULT_PRIMARY_SCHOOL);
        }
        try {
          localStorage.setItem('haby_registered_schools', JSON.stringify(list));
        } catch (e) {}
        onUpdate(list);
      },
      (error) => {
        console.error("Firestore schools snapshot error:", error);
        handleFirestoreError(error, OperationType.LIST, SCHOOLS_COL);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SCHOOLS_COL);
    return () => {};
  }
}

export async function saveSchoolToFirestore(
  school: Partial<FirestoreSchool> & { name: string }
): Promise<FirestoreSchool> {
  const schoolId = school.id && school.id.trim() 
    ? sanitizeDocId(school.id.trim(), 'sch')
    : `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
  const schoolRef = doc(db, SCHOOLS_COL, schoolId);
  const now = new Date().toISOString();
  
  const payload: FirestoreSchool = {
    ...school,
    id: schoolId,
    name: school.name.trim(),
    code: school.code || `CTR-${Date.now().toString().slice(-4)}`,
    status: school.status || 'ACTIVE',
    createdAt: school.createdAt || now,
    updatedAt: now
  };

  try {
    await setDoc(schoolRef, payload, { merge: true });
    
    // Also cache locally
    try {
      const stored = localStorage.getItem('haby_registered_schools');
      const list: FirestoreSchool[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex(s => s.id === schoolId);
      if (index >= 0) {
        list[index] = payload;
      } else {
        list.push(payload);
      }
      localStorage.setItem('haby_registered_schools', JSON.stringify(list));
    } catch (e) {}

    return payload;
  } catch (error) {
    console.error("Firestore saveSchool error:", error);
    handleFirestoreError(error, OperationType.WRITE, `${SCHOOLS_COL}/${schoolId}`);
    throw error;
  }
}

export async function deleteSchoolFromFirestore(schoolId: string): Promise<void> {
  const cleanId = sanitizeDocId(schoolId, 'sch');
  const schoolRef = doc(db, SCHOOLS_COL, cleanId);
  try {
    await deleteDoc(schoolRef);
    try {
      const stored = localStorage.getItem('haby_registered_schools');
      if (stored) {
        const list: FirestoreSchool[] = JSON.parse(stored);
        const filtered = list.filter(s => s.id !== cleanId);
        localStorage.setItem('haby_registered_schools', JSON.stringify(filtered));
      }
    } catch (e) {}
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SCHOOLS_COL}/${cleanId}`);
    throw error;
  }
}
