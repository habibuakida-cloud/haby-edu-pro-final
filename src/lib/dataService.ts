import { DEFAULT_PRIMARY_SCHOOL_ID } from './dbClient';
import {
  saveSchoolDataToFirestore,
  getSchoolDataFromFirestore,
  subscribeToSchoolDataFirestore
} from './firestoreService';

function parseTimestampMs(record: any): number {
  if (!record || typeof record !== 'object') return 0;
  if (typeof record.updatedAtMs === 'number' && record.updatedAtMs > 0) {
    return record.updatedAtMs;
  }
  const rawDate = record.updatedAt || record.updated_at;
  if (rawDate) {
    const t = new Date(rawDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

/**
 * Fetch school data record from Cloud SQL immediately (with Firestore fallback if offline/empty)
 */
export async function getSchoolData(schoolId: string) {
  try {
    const res = await fetch(`/api/db/school-data?schoolId=${encodeURIComponent(schoolId)}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const apiData = await res.json();
      if (apiData && typeof apiData === 'object' && Object.keys(apiData).length > 0) {
        return apiData;
      }
    }
  } catch (_err) {
    // Fallback to Firestore if backend API is temporarily unreachable
  }

  try {
    const fsData = await getSchoolDataFromFirestore(schoolId);
    if (fsData && typeof fsData === 'object' && Object.keys(fsData).length > 0) {
      return fsData;
    }
  } catch (_fsErr) {}

  return {};
}

/**
 * Subscribe to real-time school data changes via Firestore
 */
export function subscribeSchoolData(schoolId: string, callback: (data: any) => void) {
  return subscribeToSchoolDataFirestore(schoolId, callback);
}

/**
 * Save school data record to Cloud SQL immediately and mirror to Firestore in background
 */
export async function saveSchoolData(schoolId: string, payload: any) {
  const stampedPayload = {
    ...(payload || {}),
    _explicitDelete: true,
    _fullSnapshot: true,
    updatedAtMs: typeof payload?.updatedAtMs === 'number' ? payload.updatedAtMs : Date.now(),
    updated_at: new Date().toISOString()
  };

  // Mirror asynchronously to Firestore for real-time cross-device sync without blocking UI/Cloud SQL
  saveSchoolDataToFirestore(schoolId, stampedPayload).catch(err => {
    console.warn('Firestore school_data mirror warning:', err);
  });

  const bodyStr = JSON.stringify({ schoolId, payload: stampedPayload });
  const useKeepAlive = Boolean(payload?._isUnload) && bodyStr.length < 50000;
  const response = await fetch('/api/db/school-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
    ...(useKeepAlive ? { keepalive: true } : {})
  });
  if (!response.ok) throw new Error('Failed to save school data');
  return await response.json();
}

/**
 * Fetch school subscriptions
 */
export async function getSchoolSubscriptions(schoolId: string) {
  const response = await fetch(`/api/db/school-subscriptions?schoolId=${schoolId}`);
  if (!response.ok) throw new Error('Failed to fetch subscriptions');
  return await response.json();
}

/**
 * Save school subscription
 */
export async function getStudents(schoolId: string) {
  const response = await fetch(`/api/db/students?schoolId=${schoolId}`);
  return await response.json();
}

export async function getTeachers(schoolId: string) {
  const response = await fetch(`/api/db/teachers?schoolId=${schoolId}`);
  return await response.json();
}

export async function getExams(schoolId: string) {
  const response = await fetch(`/api/db/exams?schoolId=${schoolId}`);
  return await response.json();
}

export async function getUsers(schoolId: string) {
  const response = await fetch(`/api/db/users?schoolId=${schoolId}`);
  return await response.json();
}

export async function upsertStudents(schoolId: string, payload: any[]) {
  const response = await fetch('/api/db/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, payload }),
  });
  return await response.json();
}

export async function markPeriodAttendance(...args: any[]) {
  try {
    const schoolId = args[0];
    const payload = args[1];
    const response = await fetch('/api/db/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, payload }),
    });
    return await response.json();
  } catch {
    return { success: false };
  }
}

export async function getPeriodAttendance(...args: any[]): Promise<any[]> {
  try {
    const schoolId = args[0];
    const date = typeof args[1] === 'string' ? args[1] : '';
    const className = typeof args[2] === 'string' ? args[2] : '';
    const params = new URLSearchParams({ schoolId, date, className });
    const response = await fetch(`/api/db/attendance?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getWeeklyAttendance(...args: any[]): Promise<any[]> {
  try {
    const schoolId = args[0];
    const params = new URLSearchParams({ schoolId });
    const response = await fetch(`/api/db/attendance/weekly?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch past papers
 */
export async function getPastPapers(schoolId: string) {
  const response = await fetch(`/api/db/past-papers?schoolId=${schoolId}`);
  if (!response.ok) return [];
  return await response.json();
}
/**
 * Fetch class assigned to a monitor
 */
export async function getMonitorClass(schoolId: string, monitorId: string) {
  const response = await fetch(`/api/classes/monitor?schoolId=${encodeURIComponent(schoolId)}&monitorId=${encodeURIComponent(monitorId)}`);
  if (!response.ok) return null;
  return await response.json();
}
