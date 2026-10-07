import { TimetableAssignment } from '../types';
import { isSameClass } from '../utils/reportCardUtils';

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

  console.log(`[Timetable Service] Fetching timetable - class: "${className}", stream: "${stream}", teacherId: "${teacherId}", school: "${schoolId}"`);

  // 1. Try server API endpoint
  try {
    const params = new URLSearchParams();
    if (schoolId) params.append('schoolId', schoolId);
    if (className && className !== 'ALL' && className !== 'All') params.append('class', className);
    if (stream && stream !== 'ALL' && stream !== 'All' && stream !== 'All Streams') params.append('stream', stream);
    if (teacherId && teacherId !== 'ALL') params.append('teacherId', teacherId);
    if (day && day !== 'ALL' && day !== 'All') params.append('day', day);

    const response = await fetch(`/api/timetable?${params.toString()}`);
    if (response.ok) {
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        console.log(`[Timetable Service] API returned ${json.data.length} periods for class="${className}" stream="${stream}"`);

        // Update local cache
        try {
          const cacheKey = `haby_timetable_assignments_${schoolId}`;
          const existingRaw = localStorage.getItem(cacheKey);
          let allList: TimetableAssignment[] = existingRaw ? JSON.parse(existingRaw) : [];
          // Merge items into local cache
          json.data.forEach((item: TimetableAssignment) => {
            const idx = allList.findIndex(a => a.id === item.id);
            if (idx >= 0) allList[idx] = item;
            else allList.push(item);
          });
          localStorage.setItem(cacheKey, JSON.stringify(allList));
        } catch (e) {}

        return {
          success: true,
          data: json.data,
          periods: json.data
        };
      }
    }
  } catch (err) {
    console.warn('[Timetable Service] Server fetch error, falling back to local storage cache:', err);
  }

  // 2. Fallback to LocalStorage cache with STRICT class AND stream filter
  try {
    const cacheKey = `haby_timetable_assignments_${schoolId}`;
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const allAssignments: TimetableAssignment[] = JSON.parse(raw);
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

      console.log(`[Timetable Service] Local cache returned ${filtered.length} periods for class="${className}" stream="${stream}"`);
      return {
        success: true,
        data: filtered,
        periods: filtered
      };
    }
  } catch (e) {
    console.error('[Timetable Service] Local cache read error:', e);
  }

  return { success: true, data: [], periods: [] };
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

  console.log(`[Timetable Service] Saving ${assignments.length} assignments for school: ${sid}`);

  // 1. Save to local storage first for immediate optimistic update
  try {
    const cacheKey = `haby_timetable_assignments_${sid}`;
    localStorage.setItem(cacheKey, JSON.stringify(assignments));
  } catch (e) {}

  // 2. Persist to Backend API
  try {
    const response = await fetch('/api/timetable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: sid,
        assignments,
        replace: options?.replace ?? false,
        className: options?.className,
        stream: options?.stream
      })
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        return { success: true, data: json.data };
      }
    }
  } catch (err) {
    console.warn('[Timetable Service] Remote save failed, stored locally:', err);
  }

  return { success: true, data: assignments };
}
