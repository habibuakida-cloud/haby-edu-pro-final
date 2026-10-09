import { supabase } from './supabaseClient';

export const saveSchoolData = async (schoolId: string, data: any) => {
  if (!schoolId) return;
  try {
    const { error } = await supabase.from('school_data').upsert({
      id: schoolId,
      school_id: schoolId,
      ...data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'school_id' });
    if (error) {
      console.warn("school_data upsert warning (table may not exist or 404):", error.message);
    }
  } catch (err: any) {
    console.warn("school_data upsert exception:", err?.message || err);
  }
};

export const getSchoolData = async (schoolId: string) => {
  if (!schoolId) return null;
  try {
    const { data, error } = await supabase.from('school_data').select('*').eq('school_id', schoolId).limit(1);
    if (error) {
      console.warn("school_data fetch warning (table may not exist or 404):", error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data[0];
  } catch (err: any) {
    console.warn("school_data fetch exception:", err?.message || err);
    return null;
  }
};

export const measureFirestoreLatency = async (schoolId: string): Promise<{ latencyMs: number; ok: boolean; error?: string }> => {
  const start = performance.now();
  try {
    const { error } = await supabase.from('schools').select('id').limit(1);
    const end = performance.now();
    return { latencyMs: Math.round(end - start), ok: !error };
  } catch (err: any) {
    return { latencyMs: -1, ok: false, error: err?.message || 'Supabase connection error' };
  }
};

// Subscription isn't directly supported by Supabase client in the same way as onSnapshot without setting up real-time in Supabase.
// For now, I'll return a no-op function and console.warn
export const subscribeSchoolData = (schoolId: string, callback: (data: any) => void) => {
  console.warn("Real-time subscription not yet fully implemented for Supabase migration.");
  return () => {};
};

export const markPeriodAttendance = async (schoolId: string, record: any) => {
  const recordId = `${schoolId}_${record.date}_${record.class_name}_${record.stream}_${record.period_number}`;
  await supabase.from('period_attendance').upsert({
    id: recordId,
    ...record,
    school_id: schoolId,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
};

export const getPeriodAttendance = async (schoolId: string, date: string, className: string) => {
  const { data, error } = await supabase.from('period_attendance')
    .select('*')
    .eq('school_id', schoolId)
    .eq('date', date)
    .eq('class_name', className);
  return error ? [] : data;
};

export const getWeeklyAttendance = async (schoolId: string, startDate: string, endDate: string, className: string) => {
  const { data, error } = await supabase.from('period_attendance')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .gte('date', startDate)
    .lte('date', endDate);
  return error ? [] : data;
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
    // Save to Supabase
    await supabase.from('gate_pass_logs').insert({
      ...log,
      school_id: log.schoolId,
      created_at: log.timestamp || new Date().toISOString()
    });
  } catch (err) {
    console.warn("Error saving gate pass log to Supabase:", err);
  }
};

export const getGatePassLogs = async (schoolId: string, limitCount = 50): Promise<GatePassLogEntry[]> => {
  try {
    const { data, error } = await supabase.from('gate_pass_logs')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(limitCount);
    return error ? [] : (data as GatePassLogEntry[]);
  } catch (e) {
    return [];
  }
};
