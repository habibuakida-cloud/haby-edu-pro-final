import { DEFAULT_PRIMARY_SCHOOL_ID } from './dbClient';

/**
 * Fetch school data record
 */
export async function getSchoolData(schoolId: string) {
  const response = await fetch(`/api/db/school-data?schoolId=${schoolId}`);
  if (!response.ok) throw new Error('Failed to fetch school data');
  return await response.json();
}

/**
 * Subscribe to school data changes (fallback polling / no-op)
 */
export function subscribeSchoolData(_schoolId: string, _callback: (data: any) => void) {
  return () => {};
}

/**
 * Save school data record
 */
export async function saveSchoolData(schoolId: string, payload: any) {
  const response = await fetch('/api/db/school-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, payload }),
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
