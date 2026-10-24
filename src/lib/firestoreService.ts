import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
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
const SCHOOL_DATA_COL = 'school_data';

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

// ==========================================
// 4. SCHOOL DATA SNAPSHOT FIRESTORE SYNC (CROSS-DEVICE REAL-TIME)
// ==========================================

function normalizeSchoolDocId(schoolId: string): string {
  const s = String(schoolId || '').trim();
  if (!s || s === 'DEMO_SCHOOL' || s === 'DEFAULT_PRIMARY_SCHOOL_ID') {
    return DEFAULT_PRIMARY_SCHOOL.id;
  }
  return sanitizeDocId(s, 'sch');
}

function stripUndefinedDeep(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(item => stripUndefinedDeep(item));
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      out[k] = stripUndefinedDeep(v);
    }
  }
  return out;
}

const DEMO_STUDENT_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const DEMO_TEACHER_IDS = new Set([101, 102, 103, 104, 105, 106, 107, 108]);

function mergeFirestoreArrayNonDestructive(
  existingArr: any[],
  incomingArr: any[],
  keyFn: (item: any, idx: number) => string,
  filterDemoType?: 'students' | 'teachers'
): any[] {
  let cleanExisting = Array.isArray(existingArr) ? existingArr : [];
  let cleanIncoming = Array.isArray(incomingArr) ? incomingArr : [];

  if (filterDemoType === 'students') {
    const existingHasReal = cleanExisting.some(s => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    const incomingHasReal = cleanIncoming.some(s => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    const incomingIsAllDemo = cleanIncoming.length > 0 && cleanIncoming.length <= 15 && cleanIncoming.every(s => DEMO_STUDENT_IDS.has(Number(s?.id)));
    if (existingHasReal && incomingIsAllDemo) {
      cleanIncoming = [];
    }
    if ((existingHasReal || incomingHasReal) && cleanExisting.length > 15) {
      cleanExisting = cleanExisting.filter(s => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    }
    if ((existingHasReal || incomingHasReal) && cleanIncoming.length > 15) {
      cleanIncoming = cleanIncoming.filter(s => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    }
  } else if (filterDemoType === 'teachers') {
    const existingHasReal = cleanExisting.some(t => !DEMO_TEACHER_IDS.has(Number(t?.id)));
    const incomingHasReal = cleanIncoming.some(t => !DEMO_TEACHER_IDS.has(Number(t?.id)));
    const incomingIsAllDemo = cleanIncoming.length > 0 && cleanIncoming.length <= 8 && cleanIncoming.every(t => DEMO_TEACHER_IDS.has(Number(t?.id)));
    if (existingHasReal && incomingIsAllDemo) {
      cleanIncoming = [];
    }
    if (existingHasReal || incomingHasReal) {
      cleanExisting = cleanExisting.filter(t => !DEMO_TEACHER_IDS.has(Number(t?.id)));
      cleanIncoming = cleanIncoming.filter(t => !DEMO_TEACHER_IDS.has(Number(t?.id)));
    }
  }

  const map = new Map<string, any>();
  cleanExisting.forEach((item, idx) => {
    if (item === null || item === undefined) return;
    const k = keyFn(item, idx);
    if (k) map.set(k, item);
  });
  cleanIncoming.forEach((item, idx) => {
    if (item === null || item === undefined) return;
    const k = keyFn(item, idx);
    if (k) {
      const prev = map.get(k);
      if (prev && typeof prev === 'object' && typeof item === 'object' && !Array.isArray(item)) {
        map.set(k, { ...prev, ...item });
      } else {
        map.set(k, item);
      }
    }
  });
  return Array.from(map.values());
}

function compactStudentForFirestore(s: any): any {
  if (!s || typeof s !== 'object') return s;
  const {
    passportPhoto: _omitPhoto,
    reg_no: _omitRegNo,
    class_name: _omitClassName,
    admission_date: _omitAdmDate,
    fee_status: _omitFeeStatus,
    parent_phone: _omitParentPhone,
    ...rest
  } = s;
  return {
    ...rest,
    regNo: s.regNo || s.reg_no || '',
    className: s.className || s.class_name || 'Form 1',
    feeStatus: s.feeStatus || s.fee_status || 'UNPAID',
    parentPhone: s.parentPhone || s.parent_phone || ''
  };
}

export async function saveSchoolDataToFirestore(
  schoolId: string,
  payload: Record<string, any>
): Promise<void> {
  if (!schoolId || !payload) return;
  const cleanId = normalizeSchoolDocId(schoolId);
  const docRef = doc(db, SCHOOL_DATA_COL, cleanId);
  const nowIso = new Date().toISOString();
  const nowMs = typeof payload.updatedAtMs === 'number' ? payload.updatedAtMs : Date.now();
  const isAuthoritative = Boolean(payload._explicitDelete || payload._fullSnapshot);

  try {
    const incomingStudentsRaw = Array.isArray(payload.students) ? payload.students : [];
    const incomingTeachersRaw = Array.isArray(payload.teachers) ? payload.teachers : [];

    // Fast path for authoritative updates from hydrated client: write directly without round-trip getDoc or resurrecting deleted items
    if (isAuthoritative) {
      const cleanStudents = (incomingStudentsRaw.length > 15
        ? incomingStudentsRaw.filter((s: any) => !DEMO_STUDENT_IDS.has(Number(s?.id)))
        : incomingStudentsRaw
      ).slice(0, 650).map(compactStudentForFirestore);

      const cleanTeachers = (incomingTeachersRaw.length > 8
        ? incomingTeachersRaw.filter((t: any) => !DEMO_TEACHER_IDS.has(Number(t?.id)))
        : incomingTeachersRaw
      ).map((t: any) => {
        if (!t || typeof t !== 'object') return t;
        const { passportPhoto: _omitPhoto, school_role: _omitRole, exclude_invigilation: _omitEx, assigned_classes: _omitAc, ...restT } = t;
        return restT;
      });

      const directSnapshot = stripUndefinedDeep({
        id: cleanId,
        schoolId: cleanId,
        school_id: cleanId,
        schoolInfo: payload.schoolInfo || payload.school_info || {},
        timetableAssignments: payload.timetableAssignments || payload.timetable_assignments || [],
        periodSettings: payload.periodSettings || payload.period_settings || [],
        streamSettings: payload.streamSettings || payload.stream_settings || [],
        subjectPeriodAllocations: payload.subjectPeriodAllocations || payload.subject_period_allocations || [],
        teacherAssignments: payload.teacherAssignments || payload.teacher_assignments || [],
        savedTimetableRecords: payload.savedTimetableRecords || payload.saved_timetable_records || [],
        savedInvigilationRecords: payload.savedInvigilationRecords || payload.saved_invigilation_records || [],
        institutionalPolicy: payload.institutionalPolicy || payload.institutional_policy || {},
        sessions: payload.sessions || [],
        supervisors: payload.supervisors || [],
        selectedInvigilators: payload.selectedInvigilators || payload.selected_invigilators || [],
        invigilationAssignments: payload.invigilationAssignments || payload.invigilation_assignments || {},
        dailyAttendance: payload.dailyAttendance || payload.daily_attendance || {},
        journalRecords: payload.journalRecords || payload.journal_records || {},
        schemesOfWork: payload.schemesOfWork || payload.schemes_of_work || [],
        lessonPlans: payload.lessonPlans || payload.lesson_plans || [],
        teacherEvaluations: payload.teacherEvaluations || payload.teacher_evaluations || [],
        gradeCutoffs: payload.gradeCutoffs || payload.grade_cutoffs || {},
        ledgerSubjectKeys: payload.ledgerSubjectKeys || payload.ledger_subject_keys || {},
        subjectPaperConfigs: payload.subjectPaperConfigs || payload.subject_paper_configs || {},
        bubbleSettings: payload.bubbleSettings || payload.bubble_settings || {},
        exams: payload.exams || [],
        examinationRecords: payload.examinationRecords || payload.examination_records || [],
        disciplineRecords: payload.disciplineRecords || payload.discipline_records || [],
        dutyRosterData: payload.dutyRosterData || payload.duty_roster_data || {},
        academicTermDates: payload.academicTermDates || payload.academic_term_dates || {},
        teachers: cleanTeachers,
        students: cleanStudents,
        updatedAt: nowIso,
        updated_at: nowIso,
        updatedAtMs: nowMs
      });

      await setDoc(docRef, directSnapshot);
      return;
    }

    let existingDoc: Record<string, any> = {};
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existingDoc = snap.data() as Record<string, any>;
      }
    } catch (readErr) {
      // Proceed with payload if offline or first write
    }

    const existingStudentsRaw = Array.isArray(existingDoc.students) ? existingDoc.students : [];
    const mergedStudents = mergeFirestoreArrayNonDestructive(
      existingStudentsRaw,
      incomingStudentsRaw,
      (s, i) => String(s?.regNo || s?.reg_no || s?.id || s?.name || i).trim().toLowerCase(),
      'students'
    ).slice(0, 650).map(compactStudentForFirestore);

    const existingTeachersRaw = Array.isArray(existingDoc.teachers) ? existingDoc.teachers : [];
    const mergedTeachers = mergeFirestoreArrayNonDestructive(
      existingTeachersRaw,
      incomingTeachersRaw,
      (t, i) => String(t?.id || t?.email || t?.name || i).trim().toLowerCase(),
      'teachers'
    ).map((t: any) => {
      if (!t || typeof t !== 'object') return t;
      const { passportPhoto: _omitPhoto, school_role: _omitRole, exclude_invigilation: _omitEx, assigned_classes: _omitAc, ...restT } = t;
      return restT;
    });

    const incomingTimetable = Array.isArray(payload.timetableAssignments)
      ? payload.timetableAssignments
      : (Array.isArray(payload.timetable_assignments) ? payload.timetable_assignments : []);
    const existingTimetable = Array.isArray(existingDoc.timetableAssignments)
      ? existingDoc.timetableAssignments
      : [];
    const mergedTimetable = payload._replaceTimetable || payload._explicitDelete
      ? incomingTimetable
      : mergeFirestoreArrayNonDestructive(
          existingTimetable,
          incomingTimetable,
          (a, i) => {
            const cls = String(a?.className || a?.class_name || '').trim().toLowerCase();
            const str = String(a?.stream || '').trim().toLowerCase();
            const day = String(a?.day || '').trim().toLowerCase();
            const prd = String(a?.period || a?.periodName || a?.period_name || '').trim().toLowerCase();
            return cls && day && prd ? `${cls}_${str}_${day}_${prd}` : String(a?.id || i);
          }
        );

    const mergedExams = mergeFirestoreArrayNonDestructive(
      Array.isArray(existingDoc.exams) ? existingDoc.exams : [],
      Array.isArray(payload.exams) ? payload.exams : [],
      (e, i) => String(e?.id || e?.name || i).trim().toLowerCase()
    );

    const mergedExamRecords = mergeFirestoreArrayNonDestructive(
      Array.isArray(existingDoc.examinationRecords) ? existingDoc.examinationRecords : [],
      Array.isArray(payload.examinationRecords)
        ? payload.examinationRecords
        : (Array.isArray(payload.examination_records) ? payload.examination_records : []),
      (r, i) => String(r?.id || `${r?.regNo}_${r?.examType}_${i}`).trim().toLowerCase()
    );

    const firestoreSnapshot = stripUndefinedDeep({
      id: cleanId,
      schoolId: cleanId,
      school_id: cleanId,
      schoolInfo: {
        ...(existingDoc.schoolInfo || {}),
        ...(payload.schoolInfo || payload.school_info || {}),
      },
      timetableAssignments: mergedTimetable,
      periodSettings: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.periodSettings) ? existingDoc.periodSettings : [],
        Array.isArray(payload.periodSettings)
          ? payload.periodSettings
          : (Array.isArray(payload.period_settings) ? payload.period_settings : []),
        (p, i) => `${String(p?.day || '').trim().toLowerCase()}_${String(p?.name || p?.id || i).trim().toLowerCase()}`
      ),
      streamSettings: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.streamSettings) ? existingDoc.streamSettings : [],
        Array.isArray(payload.streamSettings)
          ? payload.streamSettings
          : (Array.isArray(payload.stream_settings) ? payload.stream_settings : []),
        (st, i) => String(st?.className || st?.id || i).trim().toLowerCase()
      ),
      subjectPeriodAllocations: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.subjectPeriodAllocations) ? existingDoc.subjectPeriodAllocations : [],
        Array.isArray(payload.subjectPeriodAllocations)
          ? payload.subjectPeriodAllocations
          : (Array.isArray(payload.subject_period_allocations) ? payload.subject_period_allocations : []),
        (spa, i) => `${String(spa?.className || '').trim().toLowerCase()}_${String(spa?.stream || '').trim().toLowerCase()}_${String(spa?.subject || spa?.subjectName || i).trim().toLowerCase()}`
      ),
      teacherAssignments: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.teacherAssignments) ? existingDoc.teacherAssignments : [],
        Array.isArray(payload.teacherAssignments)
          ? payload.teacherAssignments
          : (Array.isArray(payload.teacher_assignments) ? payload.teacher_assignments : []),
        (ta, i) => String(ta?.id || `${ta?.teacherId}_${i}`).trim().toLowerCase()
      ),
      savedTimetableRecords: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.savedTimetableRecords) ? existingDoc.savedTimetableRecords : [],
        Array.isArray(payload.savedTimetableRecords)
          ? payload.savedTimetableRecords
          : (Array.isArray(payload.saved_timetable_records) ? payload.saved_timetable_records : []),
        (item, i) => String(item?.id || i)
      ),
      savedInvigilationRecords: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.savedInvigilationRecords) ? existingDoc.savedInvigilationRecords : [],
        Array.isArray(payload.savedInvigilationRecords)
          ? payload.savedInvigilationRecords
          : (Array.isArray(payload.saved_invigilation_records) ? payload.saved_invigilation_records : []),
        (item, i) => String(item?.id || i)
      ),
      institutionalPolicy: {
        ...(existingDoc.institutionalPolicy || {}),
        ...(payload.institutionalPolicy || payload.institutional_policy || {}),
      },
      sessions: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.sessions) ? existingDoc.sessions : [],
        Array.isArray(payload.sessions) ? payload.sessions : [],
        (s, i) => String(s?.id || i)
      ),
      supervisors: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.supervisors) ? existingDoc.supervisors : [],
        Array.isArray(payload.supervisors) ? payload.supervisors : [],
        (s, i) => String(s?.id || s?.teacherId || i)
      ),
      selectedInvigilators: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.selectedInvigilators) ? existingDoc.selectedInvigilators : [],
        Array.isArray(payload.selectedInvigilators)
          ? payload.selectedInvigilators
          : (Array.isArray(payload.selected_invigilators) ? payload.selected_invigilators : []),
        (item, i) => String(typeof item === 'object' ? (item?.teacherId ?? item?.id ?? i) : item)
      ),
      invigilationAssignments: {
        ...(existingDoc.invigilationAssignments || {}),
        ...(payload.invigilationAssignments || payload.invigilation_assignments || {}),
      },
      dailyAttendance: {
        ...(existingDoc.dailyAttendance || {}),
        ...(payload.dailyAttendance || payload.daily_attendance || {}),
      },
      journalRecords: {
        ...(existingDoc.journalRecords || {}),
        ...(payload.journalRecords || payload.journal_records || {}),
      },
      schemesOfWork: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.schemesOfWork) ? existingDoc.schemesOfWork : [],
        Array.isArray(payload.schemesOfWork)
          ? payload.schemesOfWork
          : (Array.isArray(payload.schemes_of_work) ? payload.schemes_of_work : []),
        (item, i) => String(item?.id || i)
      ),
      lessonPlans: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.lessonPlans) ? existingDoc.lessonPlans : [],
        Array.isArray(payload.lessonPlans)
          ? payload.lessonPlans
          : (Array.isArray(payload.lesson_plans) ? payload.lesson_plans : []),
        (item, i) => String(item?.id || i)
      ),
      teacherEvaluations: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.teacherEvaluations) ? existingDoc.teacherEvaluations : [],
        Array.isArray(payload.teacherEvaluations)
          ? payload.teacherEvaluations
          : (Array.isArray(payload.teacher_evaluations) ? payload.teacher_evaluations : []),
        (item, i) => String(item?.id || i)
      ),
      gradeCutoffs: {
        ...(existingDoc.gradeCutoffs || {}),
        ...(payload.gradeCutoffs || payload.grade_cutoffs || {}),
      },
      ledgerSubjectKeys: {
        ...(existingDoc.ledgerSubjectKeys || {}),
        ...(payload.ledgerSubjectKeys || payload.ledger_subject_keys || {}),
      },
      subjectPaperConfigs: {
        ...(existingDoc.subjectPaperConfigs || {}),
        ...(payload.subjectPaperConfigs || payload.subject_paper_configs || {}),
      },
      bubbleSettings: {
        ...(existingDoc.bubbleSettings || {}),
        ...(payload.bubbleSettings || payload.bubble_settings || {}),
      },
      exams: mergedExams,
      examinationRecords: mergedExamRecords,
      disciplineRecords: mergeFirestoreArrayNonDestructive(
        Array.isArray(existingDoc.disciplineRecords) ? existingDoc.disciplineRecords : [],
        Array.isArray(payload.disciplineRecords)
          ? payload.disciplineRecords
          : (Array.isArray(payload.discipline_records) ? payload.discipline_records : []),
        (d, i) => String(d?.id || i)
      ),
      dutyRosterData: {
        ...(existingDoc.dutyRosterData || {}),
        ...(payload.dutyRosterData || payload.duty_roster_data || {}),
      },
      academicTermDates: {
        ...(existingDoc.academicTermDates || {}),
        ...(payload.academicTermDates || payload.academic_term_dates || {}),
      },
      teachers: mergedTeachers,
      students: mergedStudents,
      updatedAt: nowIso,
      updated_at: nowIso,
      updatedAtMs: nowMs
    });

    await setDoc(docRef, firestoreSnapshot, { merge: true });
  } catch (error) {
    console.warn("Firestore saveSchoolDataToFirestore warning:", error);
  }
}

export async function getSchoolDataFromFirestore(
  schoolId: string
): Promise<Record<string, any> | null> {
  if (!schoolId) return null;
  const cleanId = normalizeSchoolDocId(schoolId);
  const docRef = doc(db, SCHOOL_DATA_COL, cleanId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Record<string, any>) };
    }
    return null;
  } catch (error) {
    console.warn("Firestore getSchoolDataFromFirestore warning:", error);
    return null;
  }
}

export function subscribeToSchoolDataFirestore(
  schoolId: string,
  onUpdate: (data: Record<string, any>) => void,
  onError?: (err: any) => void
) {
  if (!schoolId) return () => {};
  const cleanId = normalizeSchoolDocId(schoolId);
  try {
    const docRef = doc(db, SCHOOL_DATA_COL, cleanId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate({ id: snap.id, ...(snap.data() as Record<string, any>) });
        }
      },
      (error) => {
        console.warn("Firestore school_data snapshot error:", error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.warn("Firestore subscribeToSchoolDataFirestore error:", error);
    return () => {};
  }
}

