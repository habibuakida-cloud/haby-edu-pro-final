import { Student, Teacher, Exam } from '../types';

export const DEFAULT_PRIMARY_SCHOOL_ID = '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

export const getCurrentSchoolId = (): string => {
  if (typeof window !== 'undefined') {
    return (
      localStorage.getItem('currentSchoolId') ||
      localStorage.getItem('schoolId') ||
      sessionStorage.getItem('haby_school_id') ||
      DEFAULT_PRIMARY_SCHOOL_ID
    );
  }
  return DEFAULT_PRIMARY_SCHOOL_ID;
};

// Transformers for Students
export function toSupabaseStudent(s: any, schoolId: string, matchedClassId?: string) {
  return {
    id: s.id && typeof s.id === 'string' && s.id.length > 10 ? s.id : undefined,
    school_id: schoolId,
    name: s.name || '',
    class_name: s.className || s.class_name || 'Form 1',
    stream: s.stream || 'A',
    gender: s.gender || 'Male',
    parent_phone: s.parentPhone || s.phone || '',
    phone: s.phone || s.parentPhone || '',
    reg_no: s.regNo || s.reg_no || '',
    level: s.level || 'CSEE',
    dob: s.dob || null,
    passport_photo: s.passportPhoto || null,
    subjects: Array.isArray(s.subjects) ? s.subjects : [],
    marks: s.marks || {},
    total: String(s.total ?? 0),
    average: String(s.average ?? '0.0'),
    division: s.division || '-',
    class_id: matchedClassId
  };
}

export function fromSupabaseStudent(s: any, idx: number): Student {
  return {
    id: typeof s.id === 'number' ? s.id : (Number(String(s.id).replace(/\D/g, '')) || (idx + 1)),
    name: s.name || '',
    className: s.class_name || s.className || '',
    stream: s.stream || '',
    gender: (s.gender as any) || 'Male',
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
  return {
    id: t.id && typeof t.id === 'string' && t.id.length > 10 ? t.id : undefined,
    school_id: schoolId,
    name: t.name || '',
    gender: t.gender || 'Male',
    school_role: t.schoolRole || t.school_role || 'Subject Teacher',
    initial: t.initial || (t.name ? t.name.slice(0, 2).toUpperCase() : ''),
    phone: t.phone || '',
    email: t.email || '',
    subjects: Array.isArray(t.subjects) ? t.subjects : [],
    teaching_streams: Array.isArray(t.teachingStreams) ? t.teachingStreams : (Array.isArray(t.teaching_streams) ? t.teaching_streams : []),
    color: t.color || '#1d4ed8',
    max_periods_per_week: t.maxPeriodsPerWeek || 20,
    exclude_invigilation: Boolean(t.excludeInvigilation)
  };
}

export function fromSupabaseTeacher(t: any, idx: number): Teacher {
  return {
    id: typeof t.id === 'number' ? t.id : (Number(String(t.id).replace(/\D/g, '')) || (idx + 101)),
    name: t.name || '',
    gender: (t.gender as any) || 'Male',
    schoolRole: t.school_role || t.schoolRole || 'Subject Teacher',
    initial: t.initial || (t.name ? t.name.slice(0, 2).toUpperCase() : ''),
    phone: t.phone || '',
    email: t.email || '',
    subjects: Array.isArray(t.subjects) ? t.subjects : [],
    teachingStreams: Array.isArray(t.teaching_streams) ? t.teaching_streams : (Array.isArray(t.teachingStreams) ? t.teachingStreams : []),
    color: t.color || '#1d4ed8',
    maxPeriodsPerWeek: t.max_periods_per_week || t.maxPeriodsPerWeek || 20,
    excludeInvigilation: Boolean(t.exclude_invigilation ?? t.excludeInvigilation)
  };
}

// Transformers for Exams
export function toSupabaseExam(e: any, schoolId: string) {
  const isAct = e.isActive !== undefined 
    ? Boolean(e.isActive) 
    : (e.status !== 'Inactive' && e.status !== 'Locked');
  return {
    id: e.id && typeof e.id === 'string' && e.id.length > 10 ? e.id : undefined,
    school_id: schoolId,
    name: e.name || '',
    term: e.term || 'Term 1',
    year: String(e.year || new Date().getFullYear()),
    class_name: e.className || e.class_name || 'All',
    level: e.level || 'CSEE',
    date: e.date || new Date().toISOString().split('T')[0],
    status: isAct ? 'Active' : 'Inactive'
  };
}

export function fromSupabaseExam(e: any, idx: number): Exam {
  const isAct = e.status !== 'Inactive' && e.status !== 'Locked';
  return {
    id: e.id || (idx + 1),
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

// Low-level record operations
export async function upsertRecord(table: string, records: any | any[], _primaryKey = 'id') {
  try {
    const payload = Array.isArray(records) ? records : [records];
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

  constructor(tableName: string, data: any) {
    this.tableName = tableName;
    this.updateData = data;
  }

  async eq(column: string, value: any) {
    const filters: Record<string, any> = { [column]: value };
    const res = await fetch('/api/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: this.tableName,
        action: 'update',
        filters,
        data: this.updateData
      })
    });
    if (!res.ok) return { data: null, error: await res.text() };
    return { data: await res.json(), error: null };
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    return this.eq('id', this.updateData.id).then(resolve, reject);
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
        headers: { 'Content-Type': 'application/json' },
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

  private async execute() {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.tableName,
          action: 'select',
          filters: this.filters,
          orders: this.orders
        })
      });
      if (!res.ok) {
        return { data: null, error: await res.text(), count: 0 };
      }
      const json = await res.json();
      return { data: json.data || [], error: null, count: (json.data || []).length };
    } catch (err) {
      return { data: null, error: err, count: 0 };
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
