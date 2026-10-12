export * from './supabaseClient';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID, getCurrentSchoolId } from './supabaseClient';

const LOCAL_STORAGE_KEY_PREFIX = 'haby_school_data_';

const getCachedSchoolData = (schoolId: string): any => {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${schoolId}`) ||
      localStorage.getItem(`haby_school_data_snapshot_${schoolId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setCachedSchoolData = (schoolId: string, data: any): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(data));
    localStorage.setItem(`haby_school_data_snapshot_${schoolId}`, JSON.stringify(data));
  } catch {}
};

/**
 * Fetch school data record from Supabase 'school_data' table
 */
export const getSchoolData = async (schoolId: string = DEFAULT_PRIMARY_SCHOOL_ID): Promise<any> => {
  const cached = getCachedSchoolData(schoolId);
  try {
    const { data, error } = await supabase
      .from('school_data')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase getSchoolData] query warning:', error.message);
      return cached || {};
    }

    if (data) {
      setCachedSchoolData(schoolId, data);
      return data;
    }
  } catch (err) {
    console.warn('[Supabase getSchoolData] exception:', err);
  }
  return cached || {};
};

/**
 * Save school data into Supabase 'school_data' table
 */
export const saveSchoolData = async (schoolId: string, payload: any): Promise<{ data: any; error: any }> => {
  const cleanPayload = {
    ...payload,
    school_id: schoolId || getCurrentSchoolId(),
    id: schoolId || getCurrentSchoolId(),
    updated_at: new Date().toISOString()
  };

  // Always update local cache immediately for zero latency
  setCachedSchoolData(schoolId, cleanPayload);

  try {
    const { data, error } = await supabase
      .from('school_data')
      .upsert(cleanPayload, { onConflict: 'school_id' });

    if (error) {
      console.warn('[Supabase saveSchoolData] error:', error.message);
      return { data: cleanPayload, error };
    }

    return { data, error: null };
  } catch (err: any) {
    console.warn('[Supabase saveSchoolData] exception:', err);
    return { data: cleanPayload, error: err };
  }
};

/**
 * Real-time subscription to Supabase 'school_data' changes
 */
export const subscribeSchoolData = (schoolId: string, onUpdate?: (data: any) => void) => {
  try {
    const channel = supabase
      .channel(`school_data_${schoolId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'school_data',
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          if (payload.new && onUpdate) {
            setCachedSchoolData(schoolId, payload.new);
            onUpdate(payload.new);
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    return {
      unsubscribe: () => {}
    };
  }
};

export default {
  getSchoolData,
  saveSchoolData,
  subscribeSchoolData,
};
