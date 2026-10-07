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

// Connected to user's Healthy Supabase project (rdrmptcdxtdjblaqsxjy.supabase.co)
export const DEFAULT_SUPABASE_URL = 'https://rdrmptcdxtdjblaqsxjy.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_u8kbZfJHlduaZENoXyPahA_jmCtViwb';
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
  global: { fetch: customFetch }
});
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

// Student Serializers (maps between React App model and Supabase table schema)
export const toSupabaseStudent = (s: any, schoolId: string) => {
  const row: Record<string, any> = {
    name: s.name,
    class: s.className || s.class || 'Form 1',
    stream: s.stream || 'STREAM A',
    gender: s.gender || 'Male',
    school_id: schoolId
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
    school_id: schoolId
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
    school_id: schoolId
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

// Helper CRUD Functions with automatic school_id multi-tenancy
export async function getAll(table: string, schoolId?: string, isSuperAdmin: boolean = false) {
  const effectiveSchoolId = isSuperAdmin ? undefined : (schoolId || getCurrentSchoolId());
  let query = supabase.from(table).select('*');
  if (effectiveSchoolId) {
    query = query.eq('school_id', effectiveSchoolId);
  }
  return await query;
}

export async function insertRecord(table: string, data: any) {
  const schoolId = getCurrentSchoolId();
  const payload = (schoolId && !Array.isArray(data) && !data.school_id)
    ? { ...data, school_id: schoolId }
    : data;
  return await supabase.from(table).insert(payload);
}

export async function updateRecord(table: string, id: string | number, data: any) {
  return await supabase.from(table).update(data).eq('id', id);
}

export async function deleteRecord(table: string, id: string | number) {
  return await supabase.from(table).delete().eq('id', id);
}
