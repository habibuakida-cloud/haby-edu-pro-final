import { TimetableAssignment } from '../types';
import { isSameClass } from '../utils/reportCardUtils';

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

export async function fetchTimetable(options: FetchTimetableOptions = {}): Promise<{
  success: boolean;
  data: TimetableAssignment[];
  periods: TimetableAssignment[];
  error?: string;
}> {
  const schoolId = options.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
  const className = options.className || '';
  const stream = options.stream || '';
  const teacherId = options.teacherId ? String(options.teacherId) : '';
  const day = options.day || '';

  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`haby_school_data_${schoolId}`) || localStorage.getItem(`haby_school_data_snapshot_${schoolId}`) : null;
    let allAssignments: TimetableAssignment[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      allAssignments = parsed.timetableAssignments || [];
    }

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

    return {
      success: true,
      data: filtered,
      periods: filtered
    };
  } catch (err: any) {
    return { success: false, data: [], periods: [], error: err.message };
  }
}

export async function saveTimetableAssignments(
  schoolId: string,
  assignments: TimetableAssignment[],
  options?: { replace?: boolean; className?: string; stream?: string }
): Promise<{ success: boolean; data: TimetableAssignment[] }> {
  const sid = schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

  try {
    let existing: TimetableAssignment[] = [];
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`haby_school_data_${sid}`) || localStorage.getItem(`haby_school_data_snapshot_${sid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        existing = parsed.timetableAssignments || [];
      }
    }

    let nextAssignments = assignments;
    if (!options?.replace) {
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

    if (typeof window !== 'undefined') {
      const key = `haby_school_data_${sid}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.timetableAssignments = nextAssignments;
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }

    return { success: true, data: nextAssignments };
  } catch (err: any) {
    return { success: false, data: assignments };
  }
}
