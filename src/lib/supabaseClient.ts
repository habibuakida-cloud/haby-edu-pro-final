import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase (compatible with Vite, Next.js, and Node.js)
const rawUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  '';

const rawKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  '';

// Connected to user's Supabase project (tqazqaqdzqpbftdcekzb.supabase.co)
export const DEFAULT_SUPABASE_URL = 'https://tqazqaqdzqpbftdcekzb.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tjXiP5Cl7SuaPHrLeBPnLA_x-evZQPc';
export const DEFAULT_PRIMARY_SCHOOL_ID = '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

export const supabaseUrl = (rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('placeholder')) 
  ? rawUrl 
  : DEFAULT_SUPABASE_URL;

export const supabaseKey = (rawKey && !rawKey.includes('placeholder') && rawKey.trim().length > 10) 
  ? rawKey 
  : DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const isConfiguredWithRealSupabase = true;

const customFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const res = await fetch(input, init);
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase.auth.token'))) {
            localStorage.removeItem(k);
          }
        }
      } catch (e) {}
    }
    const headers = new Headers(init.headers || {});
    headers.set('apikey', supabaseKey);
    headers.set('Authorization', `Bearer ${supabaseKey}`);
    return fetch(input, { ...init, headers });
  }
  return res;
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: customFetch },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Offline Sync Queue
export interface SyncTask {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  data: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'haby_sync_queue';

export const getSyncQueue = (): SyncTask[] => {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSyncQueue = (queue: SyncTask[]) => {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const addToSyncQueue = (task: Omit<SyncTask, 'id' | 'timestamp'>) => {
  const queue = getSyncQueue();
  const newTask: SyncTask = {
    ...task,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now()
  };
  queue.push(newTask);
  saveSyncQueue(queue);
  console.log("Added to offline sync queue:", newTask);
};

export const processSyncQueue = async () => {
  if (!navigator.onLine) return;
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} items from offline sync queue...`);
  const remaining: SyncTask[] = [];

  for (const task of queue) {
    try {
      let result;
      if (task.action === 'INSERT') result = await supabase.from(task.table).insert(task.data);
      else if (task.action === 'UPDATE') result = await supabase.from(task.table).update(task.data).eq('id', task.data.id);
      else if (task.action === 'DELETE') result = await supabase.from(task.table).delete().eq('id', task.data.id);
      else if (task.action === 'UPSERT') result = await supabase.from(task.table).upsert(task.data);

      if (result?.error) throw result.error;
    } catch (err) {
      console.warn("Failed to process sync task, keeping in queue:", err);
      remaining.push(task);
    }
  }

  saveSyncQueue(remaining);
  if (remaining.length === 0) {
    console.log("Offline sync queue cleared successfully.");
  }
};

// Initial process attempt
if (typeof window !== 'undefined') {
  window.addEventListener('online', processSyncQueue);
}

export default supabase;
export { createClient };

// Helper ya school_id - Default kwa Kiomoni Secondary School id kama haijasetiwa
export const getCurrentSchoolId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_PRIMARY_SCHOOL_ID;
  try {
    const role = localStorage.getItem('user_role') || sessionStorage.getItem('user_role');
    if (role === 'super_admin' || role === 'superadmin') {
      return localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    }
    return (
      localStorage.getItem('currentSchoolId') ||
      localStorage.getItem('schoolId') ||
      sessionStorage.getItem('schoolId') ||
      sessionStorage.getItem('haby_school_id') ||
      DEFAULT_PRIMARY_SCHOOL_ID
    );
  } catch (e) {
    return DEFAULT_PRIMARY_SCHOOL_ID;
  }
};

// Health check function to verify live connection to Supabase
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  schoolName: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    if (error) {
      return { connected: false, schoolName: '', error: error.message };
    }
    const schoolName = data && data.length > 0 ? data[0].name : 'Connected Project';
    return { connected: true, schoolName };
  } catch (err: any) {
    return { connected: false, schoolName: '', error: err.message };
  }
}

export async function measureSupabaseLatency(): Promise<{ latencyMs: number; ok: boolean; error?: string }> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('schools').select('id').limit(1);
    if (error) {
      return { latencyMs: -1, ok: false, error: error.message };
    }
    const end = performance.now();
    return { latencyMs: Math.round(end - start), ok: true };
  } catch (err: any) {
    return { latencyMs: -1, ok: false, error: err?.message || 'Supabase request failed' };
  }
}

// Student Serializers (maps between React App model and Supabase table schema)
export const toSupabaseStudent = (s: any, schoolId: string) => {
  const row: Record<string, any> = {
    name: s.name,
    class: s.className || s.class || 'Form 1',
    stream: s.stream || 'STREAM A',
    gender: s.gender || 'Male',
    school_id: schoolId,
    parent_phone: s.parentPhone || s.phone || '',
    phone: s.phone || s.parentPhone || '',
    reg_no: s.regNo || '',
    level: s.level || 'CSEE',
    dob: s.dob || '2010-01-01',
    passport_photo: s.passportPhoto || s.photo || '',
    subjects: Array.isArray(s.subjects) ? s.subjects : [],
    marks: s.marks || {},
    total: Number(s.total) || 0,
    average: String(s.average || '0.0'),
    division: s.division || '-'
  };
  if (s.id && typeof s.id === 'string' && s.id.includes('-')) {
    row.id = s.id;
  }
  return row;
};

export const fromSupabaseStudent = (row: any, idx = 0) => {
  return {
    id: row.id ?? (idx + 1),
    regNo: row.reg_no || row.regNo || undefined,
    name: row.name,
    gender: (row.gender as any) || 'Male',
    dob: row.dob || '2010-01-01',
    className: row.class || row.className || 'Form 1',
    level: (row.level as any) || 'CSEE',
    stream: row.stream || 'STREAM A',
    parentPhone: row.parent_phone || row.parentPhone || row.phone,
    phone: row.phone || row.parent_phone || row.parentPhone,
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    marks: row.marks || {},
    total: row.total || 0,
    average: row.average || '0.0',
    division: row.division || '-'
  };
};

// Teacher Serializers
export const toSupabaseTeacher = (t: any, schoolId: string) => {
  const row: Record<string, any> = {
    name: t.name,
    subject: (t.subjects && t.subjects[0]) || t.subject || 'Basic Mathematics',
    school_id: schoolId,
    gender: t.gender || 'Male',
    school_role: t.schoolRole || t.role || 'Subject Teacher',
    initial: t.initial || (t.name ? t.name.split(' ').map((n: string) => n[0]).join('').slice(0, 3).toUpperCase() : 'MWL'),
    phone: t.phone || '',
    email: t.email || '',
    subjects: Array.isArray(t.subjects) ? t.subjects : [t.subject || 'Basic Mathematics'],
    teaching_streams: Array.isArray(t.teachingStreams) ? t.teachingStreams : [],
    color: t.color || '#1d4ed8',
    max_periods_per_week: Number(t.maxPeriodsPerWeek) || 20,
    exclude_invigilation: Boolean(t.excludeInvigilation || t.exclude_invigilation)
  };
  if (t.id && typeof t.id === 'string' && t.id.includes('-')) {
    row.id = t.id;
  }
  return row;
};

export const fromSupabaseTeacher = (row: any, idx = 0) => {
  return {
    id: row.id ?? (idx + 101),
    name: row.name,
    gender: (row.gender as any) || 'Male',
    schoolRole: row.school_role || row.schoolRole || row.role || 'Subject Teacher',
    initial: row.initial || (row.name ? row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 3).toUpperCase() : 'MWL'),
    phone: row.phone || undefined,
    email: row.email || undefined,
    subjects: Array.isArray(row.subjects) ? row.subjects : [row.subject || 'Basic Mathematics'],
    teachingStreams: Array.isArray(row.teaching_streams) ? row.teaching_streams : [],
    color: row.color || '#1d4ed8',
    excludeInvigilation: Boolean(row.exclude_invigilation || row.excludeInvigilation),
    maxPeriodsPerWeek: row.max_periods_per_week || row.maxPeriodsPerWeek || 20
  };
};

// Exam Serializers
export const toSupabaseExam = (e: any, schoolId: string) => {
  const row: Record<string, any> = {
    name: e.name,
    term: e.term || e.type || 'Term 1',
    year: String(e.year || new Date().getFullYear()),
    class: e.className || e.class || 'All',
    school_id: schoolId,
    level: e.level || 'CSEE',
    date: e.date || new Date().toISOString().slice(0, 10),
    status: e.status || 'Active'
  };
  if (e.id && typeof e.id === 'string' && e.id.includes('-')) {
    row.id = e.id;
  }
  return row;
};

export const fromSupabaseExam = (row: any, idx = 0) => {
  return {
    id: row.id ?? (idx + 1),
    name: row.name,
    type: row.term || row.type || 'Terminal',
    level: (row.level as any) || 'CSEE',
    className: row.class || row.className || 'All',
    date: row.date || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    status: (row.status as any) || 'Active'
  };
};

// Parent Serializers
export const toSupabaseParent = (p: any, schoolId: string) => {
  const row: Record<string, any> = {
    school_id: schoolId,
    phone: p.phone_255 || p.phone || '',
    full_name: p.parent_name || p.full_name || 'Mzazi',
    password_hash: p.password || p.password_hash || '123456'
  };
  if (p.id && typeof p.id === 'string' && p.id.includes('-')) {
    row.id = p.id;
  }
  return row;
};

export const fromSupabaseParent = (row: any) => {
  return {
    id: row.id,
    school_id: row.school_id,
    phone_255: row.phone,
    phone: row.phone,
    parent_name: row.full_name,
    full_name: row.full_name,
    password: row.password_hash,
    created_at: row.created_at
  };
};

// Activity Log Serializers
export const toSupabaseActivityLog = (l: any, schoolId: string) => {
  return {
    school_id: schoolId,
    user_email: l.userEmail || l.email || '',
    action: l.action || '',
    category: l.category || '',
    target_name: l.targetName || '',
    details: l.details || '',
    timestamp: l.timestamp || new Date().toISOString()
  };
};

export const fromSupabaseActivityLog = (row: any) => {
  return {
    id: row.id,
    userEmail: row.user_email,
    action: row.action,
    category: row.category,
    targetName: row.target_name,
    details: row.details,
    timestamp: row.timestamp
  };
};

// Discipline Record Serializers
export const toSupabaseDiscipline = (d: any, schoolId: string) => {
  return {
    school_id: schoolId,
    student_id: d.studentId,
    student_name: d.studentName,
    incident_type: d.incidentType || d.type,
    description: d.description,
    action_taken: d.actionTaken,
    severity: d.severity,
    date: d.date || new Date().toISOString().slice(0, 10),
    reported_by: d.reportedBy
  };
};

export const fromSupabaseDiscipline = (row: any) => {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    incidentType: row.incident_type,
    description: row.description,
    actionTaken: row.action_taken,
    severity: row.severity,
    date: row.date,
    reportedBy: row.reported_by
  };
};

// Gate Pass Log Serializers
export const toSupabaseGatePass = (l: any, schoolId: string) => {
  return {
    school_id: schoolId,
    student_id: l.studentId,
    student_name: l.studentName,
    reg_no: l.regNo,
    class_name: l.className,
    stream: l.stream,
    type: l.type,
    reason: l.reason,
    officer_name: l.officerName,
    timestamp: l.timestamp || new Date().toISOString(),
    status: l.status || 'VALID',
    fee_status: l.feeStatus
  };
};

export const fromSupabaseGatePass = (row: any) => {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    regNo: row.reg_no,
    className: row.class_name,
    stream: row.stream,
    type: row.type,
    reason: row.reason,
    officerName: row.officer_name,
    timestamp: row.timestamp,
    status: row.status,
    feeStatus: row.fee_status
  };
};

// Helper CRUD Functions with automatic school_id multi-tenancy and offline queue
export async function getAll(table: string, schoolId?: string, isSuperAdmin: boolean = false) {
  const effectiveSchoolId = isSuperAdmin ? undefined : (schoolId || getCurrentSchoolId());
  let query = supabase.from(table).select('*');
  if (effectiveSchoolId) {
    query = query.eq('school_id', effectiveSchoolId);
  }
  return await query;
}

export async function insertRecord(table: string, data: any) {
  if (!navigator.onLine) {
    addToSyncQueue({ table, action: 'INSERT', data });
    return { data: null, error: null, offline: true };
  }
  const schoolId = getCurrentSchoolId();
  const payload = (schoolId && !Array.isArray(data) && !data.school_id)
    ? { ...data, school_id: schoolId }
    : data;
  
  const result = await supabase.from(table).insert(payload).select();
  if (result.error) {
    console.error(`Error inserting into ${table}:`, result.error);
    // Optionally add to queue if it's a transient error, but for now just return
  }
  return result;
}

export async function updateRecord(table: string, id: string | number, data: any) {
  if (!navigator.onLine) {
    addToSyncQueue({ table, action: 'UPDATE', data: { ...data, id } });
    return { data: null, error: null, offline: true };
  }
  
  // Guard against overwriting with empty data if it's a critical count/list
  if (Array.isArray(data) && data.length === 0 && (table === 'students' || table === 'teachers')) {
    console.warn(`Prevented overwriting ${table} with 0 records.`);
    return { data: null, error: new Error("Empty data guard triggered") };
  }

  const result = await supabase.from(table).update(data).eq('id', id).select();
  return result;
}

export async function upsertRecord(table: string, data: any, onConflict: string = 'id') {
  if (!navigator.onLine) {
    addToSyncQueue({ table, action: 'UPSERT', data });
    return { data: null, error: null, offline: true };
  }

  // Guard against overwriting with empty data if it's a critical count/list
  if (Array.isArray(data) && data.length === 0 && (table === 'students' || table === 'teachers')) {
    console.warn(`Prevented overwriting ${table} with 0 records.`);
    return { data: null, error: new Error("Empty data guard triggered") };
  }

  const schoolId = getCurrentSchoolId();
  const payload = (schoolId && !Array.isArray(data) && !data.school_id)
    ? { ...data, school_id: schoolId }
    : data;

  const result = await supabase.from(table).upsert(payload, { onConflict }).select();
  return result;
}

export async function deleteRecord(table: string, id: string | number) {
  if (!navigator.onLine) {
    addToSyncQueue({ table, action: 'DELETE', data: { id } });
    return { data: null, error: null, offline: true };
  }
  return await supabase.from(table).delete().eq('id', id);
}
