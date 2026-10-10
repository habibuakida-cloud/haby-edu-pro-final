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
export const DEFAULT_SUPABASE_URL = 'https://rdrmptcdxtdjblaqsxjy.supabase.co';
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const signal = init.signal || controller.signal;

  try {
    const res = await fetch(input, { ...init, signal });
    clearTimeout(timeoutId);
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
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
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
export const toSupabaseStudent = (s: any, schoolId?: string, classId?: string) => {
  const genderClean = (s.gender && String(s.gender).toLowerCase() === 'female') ? 'Female' : 'Male';
  const row: Record<string, any> = {
    full_name: s.name || s.fullName || s.full_name || 'Mwanafunzi',
    gender: genderClean,
    class_name: s.className || s.class || 'Form 1',
    stream_name: s.stream || s.streamName || 'STREAM A',
    parent_phone: s.parentPhone || s.phone || '',
    parent_full_name: s.parentName || s.parent_name || 'Mzazi',
    passport_photo_url: s.passportPhoto || s.photo || null,
    level_name: s.level || 'CSEE (Ordinary Level Form 1-4)'
  };
  if (s.regNo || s.reg_token) {
    row.reg_token = s.regNo || s.reg_token;
  }
  if (classId || s.classId || s.class_id) {
    row.class_id = classId || s.classId || s.class_id;
  }
  if (s.dob) {
    row.dob = s.dob;
  }
  if (s.id && typeof s.id === 'string' && s.id.includes('-')) {
    row.id = s.id;
  }
  return row;
};

export const fromSupabaseStudent = (row: any, idx = 0) => {
  return {
    id: Number(row.id) || (idx + 1),
    uuid: row.id,
    regNo: row.reg_token || row.reg_no || undefined,
    name: row.full_name || row.name || 'Mwanafunzi',
    gender: (row.gender as any) || 'Male',
    dob: row.dob || '2010-01-01',
    className: row.class_name || row.class || 'Form 1',
    classId: row.class_id || undefined,
    level: (row.level_name?.includes('ACSEE') ? 'ACSEE' : (row.level || 'CSEE')) as any,
    stream: row.stream_name || row.stream || 'STREAM A',
    parentPhone: row.parent_phone || row.phone || '',
    phone: row.parent_phone || row.phone || '',
    parentName: row.parent_full_name || '',
    passportPhoto: row.passport_photo_url || row.passport_photo || '',
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    marks: row.marks || {},
    total: row.total || 0,
    average: row.average || '0.0',
    division: row.division || '-'
  };
};

// Teacher Serializers
export const toSupabaseTeacher = (t: any, schoolId?: string) => {
  const genderClean = (t.gender && String(t.gender).toLowerCase() === 'female') ? 'Female' : 'Male';
  const row: Record<string, any> = {
    full_name: t.name || t.fullName || t.full_name || 'Mwalimu',
    gender: genderClean,
    staff_role_name: t.schoolRole || t.role || 'Subject Teacher (Standard)',
    weekly_period_quota: Number(t.maxPeriodsPerWeek) || 20,
    phone: t.phone || '',
    email: t.email || '',
    initial_preview: t.initial || (t.name ? t.name.split(' ').map((n: string) => n[0]).join('').slice(0, 3).toUpperCase() : 'MWL'),
    color_identity: t.color || '#1E88E5',
    invigilation_availability: (t.excludeInvigilation || t.exclude_invigilation) ? 'Unavailable' : 'Available for Invigilation',
    passport_photo_url: t.photo || t.passportPhoto || null
  };
  if (t.id && typeof t.id === 'string' && t.id.includes('-')) {
    row.id = t.id;
  }
  return row;
};

export const fromSupabaseTeacher = (row: any, idx = 0) => {
  return {
    id: Number(row.id) || (idx + 101),
    uuid: row.id,
    name: row.full_name || row.name || 'Mwalimu',
    gender: (row.gender as any) || 'Male',
    schoolRole: row.staff_role_name || row.school_role || 'Subject Teacher',
    initial: row.initial_preview || row.initial || (row.full_name ? row.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 3).toUpperCase() : 'MWL'),
    phone: row.phone || undefined,
    email: row.email || undefined,
    subjects: Array.isArray(row.subjects) ? row.subjects : [row.subject || 'Basic Mathematics'],
    teachingStreams: Array.isArray(row.teaching_streams) ? row.teaching_streams : [],
    color: row.color_identity || row.color || '#1d4ed8',
    excludeInvigilation: Boolean(row.invigilation_availability === 'Unavailable' || row.exclude_invigilation || row.excludeInvigilation),
    maxPeriodsPerWeek: row.weekly_period_quota || row.max_periods_per_week || 20
  };
};

// Exam Serializers
export const toSupabaseExam = (e: any, schoolId?: string) => {
  const row: Record<string, any> = {
    name: e.name || 'Examination',
    exam_type: e.type || e.term || 'Terminal',
    status: (e.status || 'Active').toLowerCase() === 'active' ? 'active' : 'upcoming'
  };
  if (e.date) {
    row.start_date = e.date.slice(0, 10);
  }
  if (e.id && typeof e.id === 'string' && e.id.includes('-')) {
    row.id = e.id;
  }
  return row;
};

export const fromSupabaseExam = (row: any, idx = 0) => {
  return {
    id: Number(row.id) || (idx + 1),
    name: row.name,
    type: row.exam_type || row.term || 'Terminal',
    level: (row.level || 'CSEE') as any,
    className: row.className || 'All',
    date: row.start_date || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    status: (row.status?.toLowerCase() === 'active' ? 'Active' : 'Upcoming') as any
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
    created_at: row.created_at,
    student_cno: row.student_cno || ''
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

// Set of core school tables that do not have a school_id column in this PostgreSQL schema
export const TABLES_WITHOUT_SCHOOL_ID = new Set([
  'schools', 'students', 'teachers', 'classes', 'subjects', 'periods', 'timetable', 'attendance', 'exams', 'exam_results', 'profiles', 'settings'
]);

// Helper CRUD Functions with automatic multi-tenancy and offline queue
export async function getAll(table: string, schoolId?: string, isSuperAdmin: boolean = false) {
  let query = supabase.from(table).select('*');
  if (!TABLES_WITHOUT_SCHOOL_ID.has(table)) {
    const effectiveSchoolId = isSuperAdmin ? undefined : (schoolId || getCurrentSchoolId());
    if (effectiveSchoolId) {
      query = query.eq('school_id', effectiveSchoolId);
    }
  }
  return await query;
}

export async function insertRecord(table: string, data: any) {
  if (!navigator.onLine) {
    addToSyncQueue({ table, action: 'INSERT', data });
    return { data: null, error: null, offline: true };
  }
  const schoolId = getCurrentSchoolId();
  const shouldAttachSchoolId = !TABLES_WITHOUT_SCHOOL_ID.has(table);
  const payload = (schoolId && shouldAttachSchoolId && !Array.isArray(data) && !data.school_id)
    ? { ...data, school_id: schoolId }
    : data;
  
  const result = await supabase.from(table).insert(payload).select();
  if (result.error) {
    console.error(`Error inserting into ${table}:`, result.error);
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

/**
 * Schema-resilient upsert helper that automatically handles schema cache mismatches.
 * If Supabase reports "Could not find the '<column>' column of '<table>' in the schema cache",
 * it strips that missing column from the payload and retries up to 8 times until success.
 */
export async function resilientUpsert(table: string, rawData: any, options: { onConflict?: string } = {}) {
  let payload = Array.isArray(rawData) ? rawData.map(item => ({ ...item })) : { ...rawData };
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;
    const query = supabase.from(table).upsert(payload, options.onConflict ? { onConflict: options.onConflict } : undefined);
    const res = await query.select();
    
    if (!res.error) {
      return res;
    }

    const errorMsg = res.error.message || '';
    
    // Check if the error is due to a missing column in Supabase's PostgREST schema cache
    const match = errorMsg.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const missingCol = match[1];
      console.warn(`[Supabase Resilience] Table '${table}' lacks column '${missingCol}'. Stripping and retrying (${attempts}/${maxAttempts})...`);
      
      if (Array.isArray(payload)) {
        payload = payload.map(item => {
          const clone = { ...item };
          delete clone[missingCol];
          return clone;
        });
      } else {
        delete (payload as any)[missingCol];
      }
      continue;
    }

    // Check for on_conflict target error
    if (errorMsg.includes('ON CONFLICT') || errorMsg.includes('conflict target')) {
      console.warn(`[Supabase Resilience] Retrying ${table} upsert without onConflict option due to constraint mismatch...`);
      const fallbackRes = await supabase.from(table).upsert(payload).select();
      if (!fallbackRes.error) return fallbackRes;
    }

    console.warn(`[Supabase Upsert Notice] Table '${table}' upsert notice:`, errorMsg);
    return res;
  }

  return { data: null, error: new Error(`Failed to upsert to ${table} after ${maxAttempts} schema cache retry attempts.`) };
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
  const shouldAttachSchoolId = !TABLES_WITHOUT_SCHOOL_ID.has(table);
  const payload = (schoolId && shouldAttachSchoolId && !Array.isArray(data) && !data.school_id)
    ? { ...data, school_id: schoolId }
    : data;

  const result = await resilientUpsert(table, payload, { onConflict });
  return result;
}

/**
 * Attempts to execute SQL migration directly via Supabase RPC if available.
 */
export async function executeSupabaseSql(sqlQuery: string): Promise<{ success: boolean; message: string }> {
  try {
    // Attempt standard Supabase RPC methods if user configured them
    const rpcNames = ['exec_sql', 'exec', 'execute_sql', 'run_sql'];
    for (const rpc of rpcNames) {
      try {
        const { data, error } = await supabase.rpc(rpc, { sql: sqlQuery });
        if (!error) {
          console.log(`[Supabase Migration] Executed successfully via RPC '${rpc}'!`, data);
          return { success: true, message: `Successfully executed via RPC ${rpc}` };
        }
      } catch (e) {
        // Continue trying
      }
    }
    return { 
      success: false, 
      message: "Direct SQL execution requires running the script in Supabase SQL Editor." 
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'SQL execution failed' };
  }
}

export async function deleteRecord(table: string, id: string | number) {
  if (!navigator.onLine) {
    addToSyncQueue({ table, action: 'DELETE', data: { id } });
    return { data: null, error: null, offline: true };
  }
  return await supabase.from(table).delete().eq('id', id);
}
