import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'timetable_store.json');

export interface ServerTimetableAssignment {
  id: number | string;
  className: string;
  stream: string;
  day: string;
  period: string;
  periodName?: string;
  teacherId?: number;
  teacherName?: string;
  subject: string;
  room?: string;
  activityType?: string;
  customNote?: string;
  schoolId?: string;
  updatedAt?: string;
}

// In-memory cache
let timetableStore: Record<string, ServerTimetableAssignment[]> = {};

// Ensure data directory exists
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      if (raw.trim()) {
        timetableStore = JSON.parse(raw);
      }
    } else {
      fs.writeFileSync(STORE_PATH, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Timetable Store] Storage init warning:', err);
  }
}

// Initialize on module load
ensureStorage();

function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(timetableStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Timetable Store] Persist error:', err);
  }
}

/**
 * Normalizes class name for comparison
 * e.g. "Class 5", "Standard 5", "Std 5", "Darasa la 5", "5" -> "5"
 * "Form 1", "Kidato cha 1", "F1" -> "f1"
 */
export function normalizeClass(c?: string): string {
  if (!c) return '';
  const s = c.trim().toLowerCase().replace(/\s+/g, ' ');

  // Form / Secondary
  const formMatch = s.match(/(?:form|kidato|f)\s*(\d+|iv|iii|ii|i|vi|v)/i);
  if (formMatch) {
    const romanMap: Record<string, string> = { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6' };
    const num = romanMap[formMatch[1].toLowerCase()] || formMatch[1];
    return `form_${num}`;
  }

  // Primary / Standard / Class
  const priMatch = s.match(/(?:standard|std|class|darasa(?: la)?|grade)\s*(\d+)/i);
  if (priMatch) {
    return `pri_${priMatch[1]}`;
  }

  // Standalone digits
  if (/^\d+$/.test(s)) {
    return `pri_${s}`;
  }

  // Nursery / Pre-primary
  if (s.includes('baby')) return 'nur_baby';
  if (s.includes('middle')) return 'nur_middle';
  if (s.includes('pre-unit') || s.includes('pre unit') || s.includes('awali')) return 'nur_preunit';

  return s;
}

export function isClassMatch(c1?: string, c2?: string): boolean {
  if (!c1 || !c2) return false;
  const n1 = normalizeClass(c1);
  const n2 = normalizeClass(c2);
  if (n1 && n2 && n1 === n2) return true;
  return c1.trim().toLowerCase() === c2.trim().toLowerCase();
}

/**
 * Normalizes stream name for comparison
 * e.g. "Mkondo Lebona", "STREAM Lebona", "Lebona" -> "lebona"
 * "Stream A", "Mkondo A", "A" -> "a"
 * "All Streams", "All" -> "all"
 */
export function normalizeStream(s?: string): string {
  if (!s) return '';
  const clean = s.trim().toLowerCase()
    .replace(/^(mkondo|stream)\s+/i, '')
    .trim();
  if (clean === 'all' || clean === 'all streams' || clean === 'all_streams') {
    return 'all';
  }
  return clean;
}

export function isStreamMatch(s1?: string, s2?: string): boolean {
  if (!s1 || !s2) return false;
  const n1 = normalizeStream(s1);
  const n2 = normalizeStream(s2);
  if (n1 === 'all' || n2 === 'all') return true;
  return n1 === n2;
}

/**
 * Query timetable assignments with strict filtering
 * WHERE class = 'selected' AND stream = 'selected'
 */
export function queryTimetable(options: {
  schoolId?: string;
  className?: string;
  stream?: string;
  teacherId?: number | string;
  day?: string;
}): ServerTimetableAssignment[] {
  ensureStorage();

  const schoolId = options.schoolId || 'DEFAULT_PRIMARY_SCHOOL_ID';
  const allSchoolAssignments = timetableStore[schoolId] || [];

  return allSchoolAssignments.filter(a => {
    // Filter by class if specified
    if (options.className && options.className !== 'ALL' && options.className !== 'All') {
      if (!isClassMatch(a.className, options.className)) {
        return false;
      }
    }

    // Filter by stream if specified
    if (options.stream && options.stream !== 'ALL' && options.stream !== 'All' && options.stream !== 'All Streams') {
      if (!isStreamMatch(a.stream, options.stream)) {
        return false;
      }
    }

    // Filter by teacherId if specified
    if (options.teacherId) {
      if (String(a.teacherId) !== String(options.teacherId)) {
        return false;
      }
    }

    // Filter by day if specified
    if (options.day && options.day !== 'ALL' && options.day !== 'All') {
      if (a.day?.toLowerCase() !== options.day.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Save / Update timetable assignments
 */
export function saveTimetable(
  schoolId: string,
  assignments: ServerTimetableAssignment[],
  options?: { replace?: boolean; className?: string; stream?: string }
): ServerTimetableAssignment[] {
  ensureStorage();
  const sid = schoolId || 'DEFAULT_PRIMARY_SCHOOL_ID';

  if (!timetableStore[sid]) {
    timetableStore[sid] = [];
  }

  if (options?.replace) {
    // If replacing for a specific class & stream
    if (options.className && options.stream) {
      timetableStore[sid] = timetableStore[sid].filter(
        a => !(isClassMatch(a.className, options.className) && isStreamMatch(a.stream, options.stream))
      );
      timetableStore[sid].push(...assignments);
    } else if (options.className) {
      timetableStore[sid] = timetableStore[sid].filter(
        a => !isClassMatch(a.className, options.className)
      );
      timetableStore[sid].push(...assignments);
    } else {
      // Complete replace
      timetableStore[sid] = assignments;
    }
  } else {
    // Merge or upsert
    const current = [...timetableStore[sid]];
    for (const item of assignments) {
      const existingIdx = current.findIndex(a => {
        if (a.id && item.id && String(a.id) === String(item.id)) return true;
        return (
          isClassMatch(a.className, item.className) &&
          isStreamMatch(a.stream, item.stream) &&
          a.day === item.day &&
          (a.period === item.period || (Boolean(a.periodName) && Boolean(item.periodName) && a.periodName === item.periodName))
        );
      });

      const entryWithId: ServerTimetableAssignment = {
        ...item,
        id: item.id || Date.now() + Math.floor(Math.random() * 10000),
        schoolId: sid,
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        current[existingIdx] = entryWithId;
      } else {
        current.push(entryWithId);
      }
    }
    timetableStore[sid] = current;
  }

  persistStore();
  return timetableStore[sid];
}

/**
 * Delete a timetable assignment by id or composite key
 */
export function deleteTimetableAssignment(
  schoolId: string,
  filter: { id?: number | string; className?: string; stream?: string; day?: string; period?: string }
): boolean {
  ensureStorage();
  const sid = schoolId || 'DEFAULT_PRIMARY_SCHOOL_ID';
  if (!timetableStore[sid]) return false;

  const initialLen = timetableStore[sid].length;
  timetableStore[sid] = timetableStore[sid].filter(a => {
    if (filter.id && String(a.id) === String(filter.id)) return false;
    if (
      filter.className &&
      filter.stream &&
      filter.day &&
      filter.period &&
      isClassMatch(a.className, filter.className) &&
      isStreamMatch(a.stream, filter.stream) &&
      a.day === filter.day &&
      a.period === filter.period
    ) {
      return false;
    }
    return true;
  });

  if (timetableStore[sid].length !== initialLen) {
    persistStore();
    return true;
  }
  return false;
}
