import { TimetableAssignment } from '../types';
import { isSameClass } from '../utils/reportCardUtils';
import { supabase } from './supabaseClient';

/**
 * Normalizes stream name for accurate comparison
 * e.g. "Mkondo Lebona", "STREAM Lebona", "Lebona" -> "lebona"
 * "Stream A", "Mkondo A", "A" -> "a"
 * "All Streams", "All" -> "all"
 */
export function normalizeStreamName(s?: string): string {
  if (!s) return '';
  const clean = s.trim().toLowerCase()
    .replace(/^(mkondo|stream)\s+/i, '')
    .trim();
  if (clean === 'all' || clean === 'all streams' || clean === 'all_streams') {
    return 'all';
  }
  return clean;
}

/**
 * Checks if two stream identifiers are the same stream or if one is 'All'
 */
export function isSameStream(s1?: string, s2?: string): boolean {
  if (!s1 || !s2) return false;
  const n1 = normalizeStreamName(s1);
  const n2 = normalizeStreamName(s2);
  if (n1 === 'all' || n2 === 'all') return true;
  return n1 === n2;
}

export interface FetchTimetableOptions {
  schoolId?: string;
  className?: string;
  stream?: string;
  teacherId?: number | string;
  day?: string;
}

/**
 * Fetches timetable periods (vipindi) with strict filtering by BOTH class AND stream.
 */
export async function fetchTimetable(options: FetchTimetableOptions = {}): Promise<{
  success: boolean;
  data: TimetableAssignment[];
  periods: TimetableAssignment[];
  error?: string;
}> {
  const schoolId = options.schoolId || 'DEFAULT_PRIMARY_SCHOOL_ID';
  const className = options.className || '';
  const stream = options.stream || '';
  const teacherId = options.teacherId ? String(options.teacherId) : '';
  const day = options.day || '';

  console.log(`[Timetable Service] Fetching timetable from Supabase - class: "${className}", stream: "${stream}", teacherId: "${teacherId}", school: "${schoolId}"`);

  try {
    const { data: resData, error } = await supabase
      .from('school_data')
      .select('timetable_assignments')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) throw error;

    const allAssignments: TimetableAssignment[] = (resData?.timetable_assignments) || [];

    const filtered = allAssignments.filter(a => {
      if (className && className !== 'ALL' && className !== 'All') {
        if (!isSameClass(a.className, className)) return false;
      }
      if (stream && stream !== 'ALL' && stream !== 'All' && stream !== 'All Streams') {
        if (!isSameStream(a.stream, stream)) return false;
      }
      if (teacherId && teacherId !== 'ALL') {
        if (String(a.teacherId) !== teacherId) return false;
      }
      if (day && day !== 'ALL' && day !== 'All') {
        if (a.day?.toLowerCase() !== day.toLowerCase()) return false;
      }
      return true;
    });

    console.log(`[Timetable Service] Supabase returned ${filtered.length} matching periods`);
    return {
      success: true,
      data: filtered,
      periods: filtered
    };
  } catch (err: any) {
    console.error('[Timetable Service] Supabase fetch error:', err);
    return { success: false, data: [], periods: [], error: err.message };
  }
}

/**
 * Saves timetable assignments to server and updates local cache.
 */
export async function saveTimetableAssignments(
  schoolId: string,
  assignments: TimetableAssignment[],
  options?: { replace?: boolean; className?: string; stream?: string }
): Promise<{ success: boolean; data: TimetableAssignment[] }> {
  const sid = schoolId || 'DEFAULT_PRIMARY_SCHOOL_ID';

  console.log(`[Timetable Service] Saving ${assignments.length} assignments directly to Supabase for school: ${sid}`);

  try {
    // Fetch current school_data to avoid overwriting other fields
    const { data: currentData } = await supabase
      .from('school_data')
      .select('timetable_assignments')
      .eq('school_id', sid)
      .maybeSingle();

    let nextAssignments = assignments;

    if (!options?.replace) {
      const existing: TimetableAssignment[] = currentData?.timetable_assignments || [];
      const current = [...existing];
      for (const item of assignments) {
        const existingIdx = current.findIndex(a => {
          if (a.id && item.id && String(a.id) === String(item.id)) return true;
          return (
            isSameClass(a.className, item.className) &&
            isSameStream(a.stream, item.stream) &&
            a.day === item.day &&
            (a.period === item.period || a.periodName === item.periodName)
          );
        });

        const entryWithId = {
          ...item,
          id: item.id || 'ta_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
          updatedAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          current[existingIdx] = entryWithId;
        } else {
          current.push(entryWithId);
        }
      }
      nextAssignments = current;
    }

    // Also update server-side timetable assignments if needed, but primary source is school_data JSON snapshot!
    const { error } = await supabase
      .from('school_data')
      .upsert({
        school_id: sid,
        timetable_assignments: nextAssignments,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' });

    if (error) throw error;

    return { success: true, data: nextAssignments };
  } catch (err: any) {
    console.error('[Timetable Service] Supabase save error:', err);
    return { success: false, data: assignments };
  }
}
