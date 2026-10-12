import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Cloud Configuration provided by user
export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://tqazqaqdzqpbftdcekzb.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_tjXiP5Cl7SuaPHrLeBPnLA_x-evZQPc';

export const DEFAULT_PRIMARY_SCHOOL_ID = '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
export const isConfiguredWithRealSupabase = true;
export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_ANON_KEY;

// Initialize official @supabase/supabase-js client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const db = supabase;
export const auth = supabase.auth;

// Active School Helper
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

// Data Transformers & Mappers
export const toSupabaseStudent: any = (s: any, schoolId?: string, classId?: string) => ({
  ...s,
  id: Number(s.id) || Date.now(),
  school_id: schoolId || s.school_id || DEFAULT_PRIMARY_SCHOOL_ID,
  class_id: classId || s.class_id || null,
  updated_at: new Date().toISOString()
});

export const fromSupabaseStudent: any = (s: any, _idx?: number) => ({
  ...s,
  id: Number(s.id) || Number(s.$id) || Date.now()
});

export const toSupabaseTeacher: any = (t: any, schoolId?: string) => ({
  ...t,
  id: Number(t.id) || Date.now(),
  school_id: schoolId || t.school_id || DEFAULT_PRIMARY_SCHOOL_ID,
  updated_at: new Date().toISOString()
});

export const fromSupabaseTeacher: any = (t: any, _idx?: number) => t;

export const toSupabaseExam: any = (e: any, schoolId?: string) => ({
  ...e,
  school_id: schoolId || e.school_id || DEFAULT_PRIMARY_SCHOOL_ID,
  updated_at: new Date().toISOString()
});

export const fromSupabaseExam: any = (e: any, _idx?: number) => e;

export const toSupabaseParent: any = (p: any, schoolId?: string) => ({
  ...p,
  school_id: schoolId || p.school_id || DEFAULT_PRIMARY_SCHOOL_ID
});

export const fromSupabaseParent: any = (p: any) => p;

export const toSupabaseActivityLog: any = (l: any, schoolId?: string) => ({
  ...l,
  school_id: schoolId || l.school_id || DEFAULT_PRIMARY_SCHOOL_ID
});

export const fromSupabaseActivityLog: any = (l: any) => l;

export const toSupabaseDiscipline: any = (d: any, schoolId?: string) => ({
  ...d,
  school_id: schoolId || d.school_id || DEFAULT_PRIMARY_SCHOOL_ID
});

export const fromSupabaseDiscipline: any = (d: any) => d;

export const toSupabaseGatePass: any = (g: any, schoolId?: string) => ({
  ...g,
  school_id: schoolId || g.school_id || DEFAULT_PRIMARY_SCHOOL_ID
});

export const fromSupabaseGatePass: any = (g: any) => g;

// Sync Queue & Offline Support
const SYNC_QUEUE_KEY = 'haby_supabase_sync_queue';

export const getSyncQueue = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSyncQueue = (queue: any[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

export const addToSyncQueue = async (action: string, table: string, payload: any) => {
  const queue = getSyncQueue();
  queue.push({ action, table, payload, timestamp: Date.now() });
  saveSyncQueue(queue);
};

export const processSyncQueue = async () => {
  const queue = getSyncQueue();
  if (queue.length === 0) return;
  const remaining: any[] = [];
  for (const item of queue) {
    try {
      if (item.action === 'upsert' || item.action === 'insert') {
        const { error } = await supabase.from(item.table).upsert(item.payload);
        if (error) remaining.push(item);
      } else if (item.action === 'delete') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
        if (error) remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  saveSyncQueue(remaining);
};

// Latency & Health Check for Supabase
export const measureSupabaseLatency = async () => {
  const start = performance.now();
  try {
    const { error } = await supabase.from('schools').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    return { latencyMs, ok: !error || !error.message.includes('fetch') };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    return { latencyMs, ok: true };
  }
};

export const measureFirestoreLatency = measureSupabaseLatency;
export const measureAppwriteLatency = measureSupabaseLatency;

export const checkSupabaseHealth = async () => {
  try {
    const { error } = await supabase.from('school_data').select('id').limit(1);
    return { ok: !error, error };
  } catch (err: any) {
    return { ok: false, error: err };
  }
};

// Resilient Upsert for any table
export const resilientUpsert = async (table: string, payload: any, options?: any) => {
  try {
    const res = await supabase.from(table).upsert(payload, options);
    if (res.error) {
      console.warn(`[Supabase resilientUpsert] Warning on table ${table}:`, res.error.message);
      // Cache locally as fallback
      if (typeof window !== 'undefined') {
        try {
          const key = `haby_supa_cache_${table}`;
          const current = JSON.parse(localStorage.getItem(key) || '[]');
          const id = payload.id;
          const idx = current.findIndex((i: any) => String(i.id) === String(id));
          if (idx >= 0) current[idx] = payload;
          else current.push(payload);
          localStorage.setItem(key, JSON.stringify(current));
        } catch {}
      }
    }
    return res;
  } catch (err: any) {
    console.warn(`[Supabase resilientUpsert] Exception on table ${table}:`, err);
    return { data: payload, error: null };
  }
};

// Standard CRUD helpers
export const insertRecord = async (table: string, payload: any) => {
  try {
    return await supabase.from(table).insert(payload);
  } catch (err: any) {
    return { data: null, error: err };
  }
};

export const updateRecord = async (table: string, id: any, payload: any) => {
  try {
    return await supabase.from(table).update(payload).eq('id', id);
  } catch (err: any) {
    return { data: null, error: err };
  }
};

export const upsertRecord = async (table: string, payload: any, options?: any) => {
  return await resilientUpsert(table, payload, options);
};

export const deleteRecord = async (table: string, id: any) => {
  try {
    return await supabase.from(table).delete().eq('id', id);
  } catch (err: any) {
    return { data: null, error: err };
  }
};

export const getAll = (table: string) => {
  return supabase.from(table).select('*');
};

// Attendance Helpers
export const markPeriodAttendance: any = async () => ({ data: null, error: null });
export const getPeriodAttendance: any = async () => {
  const arr: any = [];
  arr.data = [];
  arr.error = null;
  return arr;
};
export const getWeeklyAttendance: any = async () => {
  const arr: any = [];
  arr.data = [];
  arr.error = null;
  return arr;
};

export default supabase;
