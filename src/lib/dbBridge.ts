import { Student, Teacher, Exam } from '../types';
import { computeTeacherInitial } from '../utils/teacherInitials';

export const DEFAULT_PRIMARY_SCHOOL_ID = '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

export const getCurrentSchoolId = (): string => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('currentSchoolId') ||
      localStorage.getItem('schoolId') ||
      localStorage.getItem('haby_last_school_id') ||
      sessionStorage.getItem('haby_school_id') ||
      DEFAULT_PRIMARY_SCHOOL_ID
    );
  }
  return DEFAULT_PRIMARY_SCHOOL_ID;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeDeterministicUuid(seed: string): string {
  const clean = String(seed || '').trim();
  if (UUID_REGEX.test(clean)) return clean.toLowerCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x9e3779b9 ^ clean.length;
  let h4 = 0x85ebca6b ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Transformers for Students
export function toSupabaseStudent(s: any, schoolId: string, matchedClassId?: string) {
  const validSchoolId = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
    ? DEFAULT_PRIMARY_SCHOOL_ID
    : schoolId;
  const existingUuid =
    typeof s.firestoreDocId === 'string' && UUID_REGEX.test(s.firestoreDocId)
      ? s.firestoreDocId
      : typeof s.id === 'string' && UUID_REGEX.test(s.id)
      ? s.id
      : null;
  const regKey = String(s.regNo || s.reg_no || '').trim().toUpperCase();
  const seed = `std_${validSchoolId}_${s.id || regKey || s.name}`;
  const stableId = existingUuid || makeDeterministicUuid(seed);
  return {
    id: stableId,
    school_id: validSchoolId,
    schoolId: validSchoolId,
    name: s.name || '',
    class_name: s.className || s.class_name || 'Form 1',
    className: s.className || s.class_name || 'Form 1',
    stream: s.stream || 'A',
    combination: s.combination || null,
    gender: s.gender || 'Male',
    parent_name: s.parentName || s.parent_name || '',
    parentName: s.parentName || s.parent_name || '',
    parent_phone: s.parentPhone || s.phone || '',
    parentPhone: s.parentPhone || s.phone || '',
    phone: s.phone || s.parentPhone || '',
    reg_no: s.regNo || s.reg_no || '',
    regNo: s.regNo || s.reg_no || '',
    level: s.level || 'CSEE',
    dob: s.dob || null,
    passport_photo: s.passportPhoto || null,
    passportPhoto: s.passportPhoto || null,
    subjects: Array.isArray(s.subjects) ? s.subjects : [],
    marks: s.marks || {},
    total: String(s.total ?? 0),
    average: String(s.average ?? '0.0'),
    division: s.division || '-',
    fee_status: s.feeStatus || s.fee_status || 'UNPAID',
    feeStatus: s.feeStatus || s.fee_status || 'UNPAID',
    class_id: matchedClassId
  };
}

export function fromSupabaseStudent(s: any, idx: number): Student {
  const regStr = String(s.reg_no || s.regNo || '');
  const regMatch = regStr.match(/\/(\d{3,4})\//);
  const parsedFromReg = regMatch ? 2000 + parseInt(regMatch[1], 10) : null;
  const numId =
    typeof s.id === 'number'
      ? s.id
      : typeof s.numericId === 'number'
      ? s.numericId
      : typeof s.numeric_id === 'number'
      ? s.numeric_id
      : parsedFromReg || 2001 + idx;
  return {
    id: numId,
    firestoreDocId: typeof s.id === 'string' ? s.id : s.firestoreDocId,
    name: s.name || '',
    className: s.class_name || s.className || '',
    stream: s.stream || '',
    combination: s.combination || undefined,
    gender: (s.gender as any) || 'Male',
    parentName: s.parent_name || s.parentName || undefined,
    parentPhone: s.parent_phone || s.parentPhone || '',
    phone: s.phone || s.parent_phone || '',
    regNo: s.reg_no || s.regNo || '',
    level: (s.level as any) || 'CSEE',
    dob: s.dob || '2010-01-01',
    passportPhoto: s.passport_photo || s.passportPhoto || undefined,
    subjects: Array.isArray(s.subjects) ? s.subjects : [],
    marks: s.marks || {},
    total: Number(s.total || 0),
    average: String(s.average || '0.0'),
    division: s.division || '-',
    feeStatus: (s.fee_status || s.feeStatus || 'UNPAID') as any
  };
}

// Transformers for Teachers
export function toSupabaseTeacher(t: any, schoolId: string) {
  const validSchoolId = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
    ? DEFAULT_PRIMARY_SCHOOL_ID
    : schoolId;
  const existingUuid =
    typeof t.firestoreDocId === 'string' && UUID_REGEX.test(t.firestoreDocId)
      ? t.firestoreDocId
      : typeof t.id === 'string' && UUID_REGEX.test(t.id)
      ? t.id
      : null;
  const numericId = typeof t.id === 'number' ? t.id : (typeof t.numericId === 'number' ? t.numericId : undefined);
  const tchKey = String(numericId || t.id || t.email || t.name || '').trim().toLowerCase();
  const seed = `tch_${validSchoolId}_${tchKey}`;
  const stableId = existingUuid || makeDeterministicUuid(seed);
  const calculatedInitial = (t.name ? computeTeacherInitial(t.name) : '') || t.initial || 'TR';
  const hasBio = Boolean(t.hasBiometric ?? t.has_biometric ?? t.fingerprintEnrolled ?? t.fingerprint_enrolled);
  return {
    id: stableId,
    numericId,
    numeric_id: numericId,
    school_id: validSchoolId,
    schoolId: validSchoolId,
    name: t.name || '',
    gender: t.gender || 'Male',
    school_role: t.schoolRole || t.school_role || 'Subject Teacher',
    schoolRole: t.schoolRole || t.school_role || 'Subject Teacher',
    initial: calculatedInitial,
    phone: t.phone || '',
    email: t.email || '',
    passport_photo: t.passportPhoto || t.passport_photo || null,
    passportPhoto: t.passportPhoto || t.passport_photo || null,
    subjects: Array.isArray(t.subjects) ? t.subjects : [],
    teaching_streams: Array.isArray(t.teachingStreams) ? t.teachingStreams : (Array.isArray(t.teaching_streams) ? t.teaching_streams : []),
    teachingStreams: Array.isArray(t.teachingStreams) ? t.teachingStreams : (Array.isArray(t.teaching_streams) ? t.teaching_streams : []),
    color: t.color || '#1d4ed8',
    max_periods_per_week: t.maxPeriodsPerWeek || 20,
    maxPeriodsPerWeek: t.maxPeriodsPerWeek || 20,
    exclude_invigilation: Boolean(t.excludeInvigilation),
    excludeInvigilation: Boolean(t.excludeInvigilation),
    has_biometric: hasBio,
    hasBiometric: hasBio,
    pin_code: t.pinCode || t.pin_code || null,
    pinCode: t.pinCode || t.pin_code || null,
    fingerprint_template: t.fingerprintTemplate || t.fingerprint_template || null,
    fingerprintTemplate: t.fingerprintTemplate || t.fingerprint_template || null,
  };
}

export function fromSupabaseTeacher(t: any, idx: number): Teacher {
  const numId =
    typeof t.id === 'number'
      ? t.id
      : typeof t.numericId === 'number'
      ? t.numericId
      : typeof t.numeric_id === 'number'
      ? t.numeric_id
      : 101 + idx;
  const calculatedInitial = (t.name ? computeTeacherInitial(t.name) : '') || t.initial || 'TR';
  const hasBio = Boolean(t.has_biometric ?? t.hasBiometric ?? t.fingerprint_enrolled ?? t.fingerprintEnrolled);
  return {
    id: numId,
    firestoreDocId: typeof t.id === 'string' ? t.id : t.firestoreDocId,
    name: t.name || '',
    gender: (t.gender as any) || 'Male',
    schoolRole: t.school_role || t.schoolRole || 'Subject Teacher',
    initial: calculatedInitial,
    phone: t.phone || '',
    email: t.email || '',
    passportPhoto: t.passport_photo || t.passportPhoto || undefined,
    subjects: Array.isArray(t.subjects) ? t.subjects : [],
    teachingStreams: Array.isArray(t.teaching_streams) ? t.teaching_streams : (Array.isArray(t.teachingStreams) ? t.teachingStreams : []),
    color: t.color || '#1d4ed8',
    maxPeriodsPerWeek: t.max_periods_per_week || t.maxPeriodsPerWeek || 20,
    excludeInvigilation: Boolean(t.exclude_invigilation ?? t.excludeInvigilation),
    hasBiometric: hasBio,
    fingerprintEnrolled: hasBio,
    pinCode: t.pin_code || t.pinCode || undefined,
    fingerprintTemplate: t.fingerprint_template || t.fingerprintTemplate || undefined,
  };
}

// Transformers for Exams
export function toSupabaseExam(e: any, schoolId: string) {
  const validSchoolId = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
    ? DEFAULT_PRIMARY_SCHOOL_ID
    : schoolId;
  const isAct = e.isActive !== undefined 
    ? Boolean(e.isActive) 
    : (e.status !== 'Inactive' && e.status !== 'Locked');
  const stableId = makeDeterministicUuid(`exm_${validSchoolId}_${e.id || e.name}`);
  return {
    id: stableId,
    school_id: validSchoolId,
    schoolId: validSchoolId,
    name: e.name || '',
    term: e.term || 'Term 1',
    year: String(e.year || new Date().getFullYear()),
    class_name: e.className || e.class_name || 'All',
    className: e.className || e.class_name || 'All',
    level: e.level || 'CSEE',
    date: e.date || new Date().toISOString().split('T')[0],
    status: isAct ? 'Active' : 'Inactive'
  };
}

export function fromSupabaseExam(e: any, idx: number): Exam {
  const isAct = e.status !== 'Inactive' && e.status !== 'Locked';
  return {
    id: typeof e.id === 'number' ? e.id : (idx + 1),
    name: e.name || '',
    level: (e.level as any) || 'CSEE',
    className: e.class_name || e.className || 'All',
    date: e.date || '',
    status: isAct ? 'Active' : 'Inactive',
    isActive: isAct
  };
}


export function toSupabaseDiscipline(d: any, schoolId: string) {
  return {
    school_id: schoolId,
    student_id: d.studentId || d.student_id,
    student_name: d.studentName || d.student_name || '',
    class_name: d.className || d.class_name || '',
    incident_type: d.incidentType || d.incident_type || 'General',
    description: d.description || '',
    action_taken: d.actionTaken || d.action_taken || '',
    date: d.date || new Date().toISOString().split('T')[0],
    reported_by: d.reportedBy || d.reported_by || 'Staff'
  };
}

export function toSupabaseParent(p: any, schoolId: string) {
  return {
    school_id: schoolId,
    name: p.name || '',
    phone: p.phone || '',
    email: p.email || null,
    relationship: p.relationship || 'Parent',
    student_reg_no: p.studentRegNo || p.student_reg_no || ''
  };
}

export function toSupabaseActivityLog(l: any, schoolId: string) {
  return {
    school_id: schoolId,
    user_name: l.userName || l.user_name || 'User',
    user_role: l.userRole || l.user_role || 'Staff',
    category: l.category || 'General',
    action: l.action || 'view',
    description: l.description || '',
    timestamp: l.timestamp || new Date().toISOString()
  };
}

export async function processSyncQueue() {
  return true;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const token = sessionStorage.getItem('haby_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // ignore storage errors
    }
  }
  return headers;
}

// Low-level record operations
export async function upsertRecord(table: string, records: any | any[], _primaryKey = 'id') {
  try {
    const payload = Array.isArray(records) ? records : [records];
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        table,
        action: 'upsert',
        data: payload
      })
    });
    if (!res.ok) return { error: await res.text() };
    const json = await res.json();
    return { data: json.data || json, error: null };
  } catch (err: any) {
    console.warn(`Error in upsertRecord for ${table}:`, err);
    return { data: null, error: err };
  }
}

export async function insertRecord(table: string, records: any | any[]) {
  try {
    const payload = Array.isArray(records) ? records : [records];
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        table,
        action: 'insert',
        data: payload
      })
    });
    if (!res.ok) return { error: await res.text() };
    const json = await res.json();
    return { data: json.data || json, error: null };
  } catch (err: any) {
    console.warn(`Error in insertRecord for ${table}:`, err);
    return { data: null, error: err };
  }
}

export async function deleteRecord(table: string, id: any) {
  try {
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        table,
        action: 'delete',
        filters: { id }
      })
    });
    if (!res.ok) return { error: await res.text() };
    return { error: null };
  } catch (err: any) {
    console.warn(`Error in deleteRecord for ${table}:`, err);
    return { error: err };
  }
}

export async function getAll(tableName: string): Promise<{ data: any[] | null; error: any }> {
  try {
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        table: tableName,
        action: 'select'
      })
    });
    if (!res.ok) return { data: null, error: await res.text() };
    const json = await res.json();
    return { data: json.data || [], error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// Fluent query builder client to maintain compatibility with existing codebase
class MutationResult {
  private promise: Promise<any>;

  constructor(promise: Promise<any>) {
    this.promise = promise;
  }

  select(_cols?: string) {
    return this;
  }

  async single() {
    const res = await this.promise;
    const data = Array.isArray(res.data) ? (res.data[0] || null) : (res.data || null);
    return { data, error: res.error || null };
  }

  async maybeSingle() {
    const res = await this.promise;
    const data = Array.isArray(res.data) ? (res.data[0] || null) : (res.data || null);
    return { data, error: res.error || null };
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.promise.then(resolve, reject);
  }
}

class UpdateBuilder {
  private tableName: string;
  private updateData: any;
  private filters: Record<string, any> = {};

  constructor(tableName: string, data: any) {
    this.tableName = tableName;
    this.updateData = data;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  select(_cols?: string) {
    return this;
  }

  private async execute() {
    const activeFilters = Object.keys(this.filters).length > 0 ? this.filters : { id: this.updateData?.id };
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          table: this.tableName,
          action: 'update',
          filters: activeFilters,
          data: this.updateData
        })
      });
      if (!res.ok) return { data: null, error: await res.text() };
      const json = await res.json();
      return { data: json.data || json, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.execute().then(resolve, reject);
  }
}


class DeleteBuilder {
  private tableName: string;
  private filters: Record<string, any> = {};

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters[column] = values;
    return this;
  }

  async execute() {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          table: this.tableName,
          action: 'delete',
          filters: this.filters
        })
      });
      if (!res.ok) return { error: await res.text() };
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.execute().then(resolve, reject);
  }
}

class QueryBuilder {
  private tableName: string;
  private filters: Record<string, any> = {};
  private orders: { column: string; ascending: boolean }[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  async single() {
    const res = await this.execute();
    const data = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    return { data, error: res.error || null };
  }

  async maybeSingle() {
    const res = await this.execute();
    const data = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
    return { data, error: res.error || null };
  }

  async execute() {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          table: this.tableName,
          action: 'select',
          filters: this.filters,
          orders: this.orders
        })
      });
      if (!res.ok) {
        const errPayload = { data: null, error: await res.text(), count: 0 };
        return { ...errPayload, execute: async () => errPayload };
      }
      const json = await res.json();
      const okPayload = { data: json.data || [], error: null, count: (json.data || []).length };
      return { ...okPayload, execute: async () => okPayload };
    } catch (err) {
      const catchPayload = { data: null, error: err, count: 0 };
      return { ...catchPayload, execute: async () => catchPayload };
    }
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.execute().then(resolve, reject);
  }

  insert(data: any | any[]) {
    return new MutationResult(insertRecord(this.tableName, data));
  }

  upsert(data: any | any[], _opts?: any) {
    return new MutationResult(upsertRecord(this.tableName, data));
  }

  update(data: any) {
    return new UpdateBuilder(this.tableName, data);
  }

  delete() {
    return new DeleteBuilder(this.tableName);
  }
}

export const supabase = {
  from: (tableName: string) => new QueryBuilder(tableName),
  storage: {
    from: (bucketName: string) => ({
      upload: async (path: string, body: any, options?: { contentType?: string; upsert?: boolean; metadata?: any }) => {
        try {
          const schoolId = options?.metadata?.schoolId || path.split('/')[0] || getCurrentSchoolId();
          const triggerType = options?.metadata?.triggerType || 'manual';
          const res = await fetch('/api/backups/snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: bucketName,
              path,
              schoolId,
              triggerType,
              payload: typeof body === 'string' ? JSON.parse(body) : body,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            return { data: null, error: new Error(json.error || 'Storage upload failed') };
          }
          return { data: json.snapshot, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      list: async (prefix?: string) => {
        try {
          const schoolId = prefix || getCurrentSchoolId();
          const res = await fetch(`/api/backups/list?schoolId=${encodeURIComponent(schoolId)}`);
          const json = await res.json();
          return { data: json.snapshots || [], error: null };
        } catch (err: any) {
          return { data: [], error: err };
        }
      },
      download: async (path: string) => {
        try {
          const parts = path.split('/');
          const snapshotId = parts[parts.length - 1].replace(/\.json$/i, '');
          const schoolId = parts.length > 1 ? parts[0] : getCurrentSchoolId();
          const res = await fetch(`/api/backups/download/${encodeURIComponent(snapshotId)}?schoolId=${encodeURIComponent(schoolId)}`);
          if (!res.ok) return { data: null, error: new Error('Failed to download snapshot') };
          const data = await res.json();
          return { data, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      remove: async (paths: string[]) => {
        try {
          const schoolId = getCurrentSchoolId();
          for (const p of paths) {
            const parts = p.split('/');
            const snapshotId = parts[parts.length - 1].replace(/\.json$/i, '');
            await fetch(`/api/backups/${encodeURIComponent(snapshotId)}?schoolId=${encodeURIComponent(schoolId)}`, {
              method: 'DELETE',
            });
          }
          return { data: paths, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
    }),
  },
  channel: (_name: string) => ({
    on: (..._args: any[]) => ({
      subscribe: () => ({
        unsubscribe: () => {}
      })
    })
  }),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('Use standard auth') }),
    signUp: async (_opts: any) => ({ data: { user: null }, error: null })
  }
};
