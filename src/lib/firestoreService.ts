import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, Timestamp, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Deep sanitization for Firestore:
 * Firestore throws a runtime error if ANY property contains `undefined`.
 * This recursive function eliminates `undefined` values, converting them to `null` or stripping them.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) return null as any;
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Timestamp) return val;
  if (val instanceof Date) return Timestamp.fromDate(val) as any;

  if (Array.isArray(val)) {
    return val
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }

  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      result[k] = sanitizeForFirestore(v);
    }
  }
  return result as T;
}

export const saveSchoolData = async (schoolId: string, data: any) => {
  if (!schoolId) return;
  const docRef = doc(db, 'schools', schoolId);
  const cleanData = sanitizeForFirestore(data);
  await setDoc(docRef, {
    ...cleanData,
    updatedAt: Timestamp.now()
  }, { merge: true });
};

export const getSchoolData = async (schoolId: string) => {
  if (!schoolId) return null;
  const docRef = doc(db, 'schools', schoolId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const measureFirestoreLatency = async (schoolId: string): Promise<{ latencyMs: number; ok: boolean; error?: string }> => {
  const start = performance.now();
  try {
    const docRef = doc(db, 'schools', schoolId || 'health_check');
    await getDoc(docRef);
    const end = performance.now();
    return { latencyMs: Math.round(end - start), ok: true };
  } catch (err: any) {
    return { latencyMs: -1, ok: false, error: err?.message || 'Firestore connection error' };
  }
};

export const subscribeSchoolData = (schoolId: string, callback: (data: any) => void) => {
  if (!schoolId) return () => {};
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
  const cleanRecord = sanitizeForFirestore(record);
  await setDoc(docRef, {
    ...cleanRecord,
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

export interface GatePassLogEntry {
  id?: string;
  studentId?: string | number;
  studentName: string;
  regNo: string;
  className: string;
  stream?: string;
  photo?: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  reason: string;
  officerName: string;
  timestamp: string;
  schoolId: string;
  status: 'VALID' | 'INACTIVE';
  feeStatus: 'PAID' | 'WARNING';
}

export const saveGatePassLog = async (log: GatePassLogEntry) => {
  try {
    const cleanLog = sanitizeForFirestore({
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
      createdAt: Timestamp.now()
    });
    // Save locally
    const existingLogsRaw = localStorage.getItem('haby_gate_pass_logs');
    const existingLogs: GatePassLogEntry[] = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
    existingLogs.unshift(cleanLog);
    localStorage.setItem('haby_gate_pass_logs', JSON.stringify(existingLogs.slice(0, 500)));

    // Save to Firestore
    await addDoc(collection(db, 'gate_pass_logs'), cleanLog);
  } catch (err) {
    console.warn("Error saving gate pass log to Firestore:", err);
  }
};

export const getGatePassLogs = async (schoolId: string, limitCount = 50): Promise<GatePassLogEntry[]> => {
  try {
    const q = query(
      collection(db, 'gate_pass_logs'),
      where('schoolId', '==', schoolId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GatePassLogEntry));
  } catch (e) {
    // Fallback to local
    try {
      const existingLogsRaw = localStorage.getItem('haby_gate_pass_logs');
      return existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
    } catch {
      return [];
    }
  }
};
