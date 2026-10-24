import { TimetableAssignment, PeriodSetting, SubjectPeriodAllocation, Teacher, StreamSetting, TeacherAssignment } from '../types';
import { DAYS_OF_WEEK, DEFAULT_CLASSES } from '../constants/defaults';
import { isSameClass } from '../utils/reportCardUtils';
import { supabase } from './dbClient';

function timeToMinutesHelper(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  const hrs = isNaN(parts[0]) ? 0 : parts[0];
  const mins = isNaN(parts[1]) ? 0 : parts[1];
  return hrs * 60 + mins;
}

/**
 * Returns the periods configured specifically for a given day in periodSettings.
 * Does NOT fall back to copying another day's periods if the given day has no periods set.
 */
export function getPeriodsForDayFromSettings(
  day: string,
  periodSettings?: PeriodSetting[]
): PeriodSetting[] {
  if (!day || !Array.isArray(periodSettings) || periodSettings.length === 0) {
    return [];
  }
  const normDay = day.trim().toLowerCase();
  const explicitForDay = periodSettings.filter(
    p => p && (p.day || '').trim().toLowerCase() === normDay
  );
  if (explicitForDay.length > 0) {
    return [...explicitForDay].sort(
      (a, b) => timeToMinutesHelper(a.start) - timeToMinutesHelper(b.start)
    );
  }
  // Only consider 'All' day settings for standard weekdays (Monday-Friday) if no day-specific settings exist
  if (normDay !== 'saturday' && normDay !== 'sunday') {
    const allDayPeriods = periodSettings.filter(
      p => p && (p.day || '').trim().toLowerCase() === 'all'
    );
    if (allDayPeriods.length > 0) {
      return [...allDayPeriods].sort(
        (a, b) => timeToMinutesHelper(a.start) - timeToMinutesHelper(b.start)
      );
    }
  }
  return [];
}

/**
 * Returns only the days of the week that have periods configured in periodSettings.
 * Explicitly excludes days not defined in periodSettings (such as Saturday).
 * If periodSettings is completely empty, defaults to Monday-Friday (excluding Saturday).
 */
export function getConfiguredDays(periodSettings?: PeriodSetting[]): string[] {
  if (!Array.isArray(periodSettings) || periodSettings.length === 0) {
    return DAYS_OF_WEEK.filter(d => {
      const lower = d.toLowerCase();
      return lower !== 'saturday' && lower !== 'sunday';
    });
  }
  const configured = DAYS_OF_WEEK.filter(
    day => getPeriodsForDayFromSettings(day, periodSettings).length > 0
  );
  return configured.length > 0
    ? configured
    : DAYS_OF_WEEK.filter(d => {
        const lower = d.toLowerCase();
        return lower !== 'saturday' && lower !== 'sunday';
      });
}

/**
 * Explicitly filters out any timetable assignments that fall on days not defined
 * in periodSettings (such as Saturday when Saturday has no periods configured).
 */
export function excludeUnconfiguredDaysFromAssignments(
  assignments: TimetableAssignment[],
  periodSettings?: PeriodSetting[]
): TimetableAssignment[] {
  if (!Array.isArray(assignments) || assignments.length === 0) return [];
  const configuredDays = getConfiguredDays(periodSettings);
  const configuredLowerSet = new Set(configuredDays.map(d => d.trim().toLowerCase()));

  return assignments.filter(a => {
    if (!a || !a.day) return false;
    const normDay = a.day.trim().toLowerCase();
    if (!configuredLowerSet.has(normDay)) {
      return false;
    }
    if (Array.isArray(periodSettings) && periodSettings.length > 0) {
      const dayPeriods = getPeriodsForDayFromSettings(a.day, periodSettings);
      if (dayPeriods.length === 0) return false;
    }
    return true;
  });
}

const NON_ACADEMIC_PERIOD_KEYWORDS = [
  'break',
  'lunch',
  'breakfast',
  'tea',
  'mapumziko',
  'chakula',
  'chai',
  'remedial',
  'assembly',
  'baraza',
  'sport',
  'michezo',
  'debate',
  'environmental',
  'mazingira',
  'weekly test',
  'praising',
  'praying',
  'ibada',
  'clubs',
  'library'
];

/**
 * Identifies academic religious subjects (such as Elimu ya Dini ya Kiislamu, Islamic Knowledge,
 * Elimu ya Dini ya Kikristo, Bible Knowledge, Divinity) that are taught in specific classes/streams
 * and must NEVER lock periods for other classes or teachers.
 */
export function isAcademicReligiousSubject(name?: string): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return (
    lower.includes('elimu ya dini') ||
    lower.includes('kiislamu') ||
    lower.includes('islamic') ||
    lower === 'edk' ||
    lower.includes('kikristo') ||
    lower.includes('bible knowledge') ||
    lower.includes('christian religious') ||
    lower.includes('divinity') ||
    lower.includes('religious studies') ||
    lower.includes('religious education') ||
    lower === 'dini' ||
    lower === 'religion' ||
    lower === 'religion period'
  );
}

export function isNonAcademicPeriodName(name?: string): boolean {
  if (!name) return false;
  if (isAcademicReligiousSubject(name)) return false;
  const lower = name.trim().toLowerCase();
  return NON_ACADEMIC_PERIOD_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Checks whether a specific day + period slot is locked (either globally in periodSettings,
 * by a non-academic/extra-curricular activity, or by a locked assignment in the timetable).
 * Entering "Elimu ya Dini ya Kiislamu" (or any class-specific religious subject) in one class
 * NEVER locks periods for other classes or teachers.
 */
export function isPeriodLocked(
  day: string,
  periodNameOrLabel: string,
  periodSettings?: PeriodSetting[],
  assignments?: TimetableAssignment[],
  options?: {
    className?: string;
    stream?: string;
    teacherId?: number | string;
    allowedStreams?: string[];
  }
): { isLocked: boolean; isGlobalLock: boolean; reason: string } {
  const normDay = (day || '').trim().toLowerCase();
  const targetPeriodNorm = normalizePeriodName(periodNameOrLabel);

  if (!normDay || !targetPeriodNorm) {
    return { isLocked: false, isGlobalLock: false, reason: '' };
  }

  // Never treat "Elimu ya Dini ya Kiislamu" or academic religious subjects as period locks
  if (isAcademicReligiousSubject(periodNameOrLabel)) {
    return { isLocked: false, isGlobalLock: false, reason: '' };
  }

  // 1. Check periodSettings for this day (or 'All' on weekdays)
  const daySettings = getPeriodsForDayFromSettings(day, periodSettings);
  const matchingSetting = daySettings.find(p => {
    if (!isSamePeriod(p.name, p.name, periodNameOrLabel)) return false;
    if (isAcademicReligiousSubject(p.name)) return false;

    const pClass = (p.className || '').trim();
    const isAllClassesSetting = !pClass || pClass.toLowerCase() === 'all classes' || pClass.toLowerCase() === 'all';
    if (!isAllClassesSetting) {
      // A class-specific period setting must ONLY affect that specific class, never other classes
      if (!options?.className || !isSameClass(pClass, options.className)) {
        return false;
      }
    }

    const pStream = (p.streamName || '').trim();
    const isAllStreamsSetting = !pStream || pStream.toLowerCase() === 'all streams' || normalizeStreamName(pStream) === 'all';
    if (!isAllStreamsSetting) {
      if (!options?.stream || !isSameStream(pStream, options.stream)) {
        return false;
      }
    }

    return true;
  });

  if (matchingSetting) {
    const pClass = (matchingSetting.className || '').trim();
    const isGlobalScope = !pClass || pClass.toLowerCase() === 'all classes' || pClass.toLowerCase() === 'all';

    if (matchingSetting.isBreak) {
      return {
        isLocked: true,
        isGlobalLock: isGlobalScope,
        reason: `${matchingSetting.name} (Break)`
      };
    }
    if (
      matchingSetting.activityType &&
      matchingSetting.activityType !== 'academic' &&
      matchingSetting.activityType !== 'religion'
    ) {
      return {
        isLocked: true,
        isGlobalLock: isGlobalScope,
        reason: `${matchingSetting.name} (${matchingSetting.activityType})`
      };
    }
    if (isNonAcademicPeriodName(matchingSetting.name)) {
      return {
        isLocked: true,
        isGlobalLock: isGlobalScope,
        reason: matchingSetting.name
      };
    }
    if (matchingSetting.isLocked || matchingSetting.locked) {
      return {
        isLocked: true,
        isGlobalLock: isGlobalScope,
        reason: `${matchingSetting.name} (Locked)`
      };
    }
  }

  // Also check raw periodNameOrLabel for non-academic keywords
  if (isNonAcademicPeriodName(targetPeriodNorm)) {
    return {
      isLocked: true,
      isGlobalLock: true,
      reason: periodNameOrLabel.split('(')[0].trim()
    };
  }

  // 2. Check existing assignments on this day & period
  if (Array.isArray(assignments) && assignments.length > 0) {
    const slotAssignments = assignments.filter(
      a =>
        a &&
        (a.day || '').trim().toLowerCase() === normDay &&
        isSamePeriod(a.period, a.periodName, periodNameOrLabel) &&
        !isAcademicReligiousSubject(a.subject)
    );

    // Check if there is an explicit school-wide (All Classes) non-academic / special activity or school-wide locked slot
    const schoolWideLocked = slotAssignments.find(a => {
      const aClassLower = (a.className || '').trim().toLowerCase();
      const isAllClassesAsg = aClassLower === 'all' || aClassLower === 'all classes';
      const isNonAcad =
        Boolean(a.activityType && a.activityType !== 'academic' && a.activityType !== 'religion') ||
        isNonAcademicPeriodName(a.subject);

      if (isAllClassesAsg && (isNonAcad || a.isLocked)) {
        return true;
      }
      return false;
    });

    if (schoolWideLocked) {
      return {
        isLocked: true,
        isGlobalLock: true,
        reason: schoolWideLocked.subject || 'Shughuli Maalum (Locked)'
      };
    }

    // Check if this specific teacher's assignment in this slot is locked (and not a religious subject)
    if (options?.teacherId !== undefined && options?.teacherId !== '') {
      const teacherLockedAsg = slotAssignments.find(
        a =>
          String(a.teacherId) === String(options.teacherId) &&
          (a.isLocked || (a.activityType && a.activityType !== 'academic' && a.activityType !== 'religion'))
      );
      if (teacherLockedAsg) {
        return {
          isLocked: true,
          isGlobalLock: false,
          reason: `${teacherLockedAsg.subject || 'Kipindi'} (${teacherLockedAsg.className} ${teacherLockedAsg.stream}) — Locked`
        };
      }
    }

    // Check if a specific class + stream is locked in this slot (only affects that exact class & stream, never other classes)
    if (options?.className) {
      const classStreamLockedAsg = slotAssignments.find(
        a =>
          isSameClass(a.className, options.className!) &&
          (options.stream ? isSameStream(a.stream, options.stream) : normalizeStreamName(a.stream) === 'all') &&
          (a.isLocked || (a.activityType && a.activityType !== 'academic' && a.activityType !== 'religion'))
      );
      if (classStreamLockedAsg) {
        return {
          isLocked: true,
          isGlobalLock: false,
          reason: `${classStreamLockedAsg.className} ${classStreamLockedAsg.stream} (${classStreamLockedAsg.subject || 'Locked'})`
        };
      }
    }

    // Check if ALL allowedStreams for a teacher are locked on this day + period
    if (Array.isArray(options?.allowedStreams) && options.allowedStreams.length > 0) {
      const allStreamsLocked = options.allowedStreams.every(stStr => {
        const parsed = parseClassAndStream(stStr);
        if (!parsed.className) return false;
        return slotAssignments.some(
          a =>
            isSameClass(a.className, parsed.className) &&
            isSameStream(a.stream, parsed.stream) &&
            (a.isLocked || (a.activityType && a.activityType !== 'academic' && a.activityType !== 'religion'))
        );
      });
      if (allStreamsLocked) {
        return {
          isLocked: true,
          isGlobalLock: true,
          reason: 'Mikondo yote imefungwa (Locked)'
        };
      }
    }
  }

  return { isLocked: false, isGlobalLock: false, reason: '' };
}

/**
 * Generates the timetable structure for a specific teacher, explicitly excluding any days
 * not defined in periodSettings (such as Saturday).
 */
export function generateTeacherTimetableData(
  teacherId: number | string,
  assignments: TimetableAssignment[],
  periodSettings?: PeriodSetting[],
  teacherName?: string,
  teacherInitial?: string
): {
  configuredDays: string[];
  periodsByDay: Record<string, PeriodSetting[]>;
  assignments: TimetableAssignment[];
} {
  const configuredDays = getConfiguredDays(periodSettings);
  const validAssignments = excludeUnconfiguredDaysFromAssignments(assignments, periodSettings);
  const tNameLower = (teacherName || '').trim().toLowerCase();
  const tInitLower = (teacherInitial || '').trim().toLowerCase();

  const teacherAssignments = validAssignments.filter(a => {
    if (!a || !a.subject) return false;
    if (a.teacherId !== undefined && String(a.teacherId) === String(teacherId)) return true;
    const aTeacherName = ((a as any).teacherName || (a as any).teacher || '').trim().toLowerCase();
    if (aTeacherName && tNameLower && aTeacherName === tNameLower) return true;
    if (aTeacherName && tInitLower && aTeacherName === tInitLower) return true;
    return false;
  });

  const periodsByDay: Record<string, PeriodSetting[]> = {};
  configuredDays.forEach(day => {
    periodsByDay[day] = getPeriodsForDayFromSettings(day, periodSettings);
  });

  return {
    configuredDays,
    periodsByDay,
    assignments: teacherAssignments
  };
}

/**
 * Generates the timetable structure for a specific class & stream, explicitly excluding any days
 * not defined in periodSettings (such as Saturday).
 */
export function generateClassTimetableData(
  className: string,
  stream: string,
  assignments: TimetableAssignment[],
  periodSettings?: PeriodSetting[]
): {
  configuredDays: string[];
  periodsByDay: Record<string, PeriodSetting[]>;
  assignments: TimetableAssignment[];
} {
  const configuredDays = getConfiguredDays(periodSettings);
  const validAssignments = excludeUnconfiguredDaysFromAssignments(assignments, periodSettings);

  const classAssignments = validAssignments.filter(a => {
    if (!a || !a.subject || !a.className) return false;
    if (!isSameClass(a.className, className)) return false;
    if (stream && stream !== 'All' && stream !== 'ALL' && !isSameStream(a.stream, stream)) return false;
    return true;
  });

  const periodsByDay: Record<string, PeriodSetting[]> = {};
  configuredDays.forEach(day => {
    periodsByDay[day] = getPeriodsForDayFromSettings(day, periodSettings);
  });

  return {
    configuredDays,
    periodsByDay,
    assignments: classAssignments
  };
}

export function normalizeStreamName(s?: string): string {
  if (!s) return '';
  let clean = s.trim().toLowerCase();
  if (clean.includes(' - ')) {
    clean = clean.split(' - ').pop()!.trim();
  }
  clean = clean
    .replace(/^(form|kidato|standard|std|darasa)\s*(\d+|iv|iii|ii|i|vi|v)\s*[-:]?\s*/i, '')
    .replace(/^(mkondo|stream)\s+/i, '')
    .trim();

  // Strip leading Roman numeral when followed by a single stream letter (e.g., "iiia" -> "a", "iiid" -> "d")
  const romanStreamMatch = clean.match(/^(?:iv|iii|ii|i|vi|v)\s*([a-z])$/i);
  if (romanStreamMatch) {
    clean = romanStreamMatch[1].toLowerCase();
  }

  // Strip leading single digit when followed by a single stream letter (e.g., "3a" -> "a")
  const numStreamMatch = clean.match(/^[1-7]\s*([a-z])$/i);
  if (numStreamMatch) {
    clean = numStreamMatch[1].toLowerCase();
  }

  if (clean === 'all' || clean === 'all streams' || clean === 'all_streams') {
    return 'all';
  }
  return clean;
}

export function isSameStream(s1?: string, s2?: string): boolean {
  if (!s1 || !s2) return false;
  const n1 = normalizeStreamName(s1);
  const n2 = normalizeStreamName(s2);
  if (!n1 || !n2) return false;
  if (n1 === 'all' || n2 === 'all') return true;
  return n1 === n2;
}

export function normalizePeriodName(p?: string): string {
  if (!p) return '';
  return p.split('(')[0].trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isSamePeriod(
  aPeriod?: string,
  aPeriodName?: string,
  targetPeriodOrName?: string
): boolean {
  const targetNorm = normalizePeriodName(targetPeriodOrName);
  if (!targetNorm) return false;

  const aNameNorm = normalizePeriodName(aPeriodName);
  const aRawNorm = normalizePeriodName(aPeriod);

  if (aNameNorm && aNameNorm === targetNorm) return true;
  if (aRawNorm && aRawNorm === targetNorm) return true;

  return false;
}

export function parseClassAndStream(
  rawInput: string,
  fallbackClass = 'Form 1'
): { className: string; stream: string } {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { className: '', stream: '' };
  }

  const romanToFormNum = (r: string): string => {
    const lower = r.toLowerCase();
    if (lower === 'i') return '1';
    if (lower === 'ii') return '2';
    if (lower === 'iii') return '3';
    if (lower === 'iv') return '4';
    if (lower === 'v') return '5';
    if (lower === 'vi') return '6';
    return r;
  };

  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    let cls = (parts[0] || '').trim();
    const st = parts.slice(1).join(' - ').trim();
    const formRomanMatch = cls.match(/^(?:form|kidato)\s+(iv|iii|ii|i|vi|v)$/i);
    if (formRomanMatch) {
      cls = `Form ${romanToFormNum(formRomanMatch[1])}`;
    }
    return {
      className: cls || fallbackClass,
      stream: st || 'A'
    };
  }

  // Handle compact formats like "Form 3 A", "Form IIIA", "IIIA", "IIID", "3A"
  const compactMatch = trimmed.match(/^(?:(?:form|kidato|f)\s*)?(iv|iii|ii|i|vi|v|[1-6])\s*[-:]?\s*(?:(?:stream|mkondo)\s*)?([a-z]+)$/i);
  if (compactMatch) {
    const formNum = romanToFormNum(compactMatch[1]);
    const streamPart = compactMatch[2].toUpperCase();
    return {
      className: `Form ${formNum}`,
      stream: streamPart
    };
  }

  return {
    className: trimmed,
    stream: 'A'
  };
}

export interface FetchTimetableOptions {
  schoolId?: string;
  className?: string;
  stream?: string;
  teacherId?: number | string;
  day?: string;
  periodSettings?: PeriodSetting[];
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
    let storedPeriodSettings: PeriodSetting[] = options.periodSettings || [];
    if (raw) {
      const parsed = JSON.parse(raw);
      allAssignments = parsed.timetableAssignments || [];
      if (storedPeriodSettings.length === 0 && Array.isArray(parsed.periodSettings)) {
        storedPeriodSettings = parsed.periodSettings;
      }
    }

    if (allAssignments.length === 0) {
      try {
        const { data: dbAssigns } = await supabase
          .from('timetable_assignments')
          .select('*')
          .eq('school_id', schoolId);
        if (Array.isArray(dbAssigns) && dbAssigns.length > 0) {
          allAssignments = dbAssigns.map((a: any) => ({
            id: a.id,
            className: a.className || a.class_name || '',
            stream: a.stream || 'A',
            day: a.day || 'Monday',
            period: a.period || '',
            periodName: a.periodName || a.period_name || '',
            teacherId: a.teacherId ?? a.teacher_id ?? 0,
            teacherName: a.teacherName || a.teacher_name || '',
            subject: a.subject || '',
            room: a.room || 'Classroom',
            activityType: a.activityType || a.activity_type || 'academic',
            customNote: a.customNote || a.custom_note || '',
            isLocked: Boolean(a.isLocked ?? a.is_locked),
            allocationMode: a.allocationMode || a.allocation_mode || 'manual'
          }));
        }
      } catch (e) {}
    }

    // Explicitly exclude days not defined in periodSettings (such as Saturday)
    const validAssignments = excludeUnconfiguredDaysFromAssignments(allAssignments, storedPeriodSettings);

    const filtered = validAssignments.filter(a => {
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
  options?: { replace?: boolean; className?: string; stream?: string; periodSettings?: PeriodSetting[] }
): Promise<{ success: boolean; data: TimetableAssignment[] }> {
  const sid = schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

  try {
    let existing: TimetableAssignment[] = [];
    let storedPeriodSettings: PeriodSetting[] = options?.periodSettings || [];
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`haby_school_data_${sid}`) || localStorage.getItem(`haby_school_data_snapshot_${sid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        existing = parsed.timetableAssignments || [];
        if (storedPeriodSettings.length === 0 && Array.isArray(parsed.periodSettings)) {
          storedPeriodSettings = parsed.periodSettings;
        }
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

    // Explicitly exclude days not defined in periodSettings (such as Saturday)
    nextAssignments = excludeUnconfiguredDaysFromAssignments(nextAssignments, storedPeriodSettings);

    if (typeof window !== 'undefined') {
      const key = `haby_school_data_${sid}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.timetableAssignments = nextAssignments;
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }

    try {
      const rows = nextAssignments.map((a, idx) => ({
        ...a,
        id: a.id ? String(a.id) : `ta_${sid}_${idx}`,
        school_id: sid,
        schoolId: sid
      }));
      if (rows.length > 0) {
        await supabase.from('timetable_assignments').upsert(rows);
      }
    } catch (e) {
      console.warn('Error syncing timetable_assignments to DB:', e);
    }

    return { success: true, data: nextAssignments };
  } catch (err: any) {
    return { success: false, data: assignments };
  }
}

/**
 * Normalizes a subject name for comparison across registrations and timetable entries.
 */
export function normalizeSubjectKey(sub?: string): string {
  if (!sub) return '';
  const raw = sub.trim().toLowerCase().replace(/\s+/g, ' ');
  if (raw === 'mathematics' || raw === 'basic mathematics' || raw === 'math' || raw === 'maths') {
    return 'basic mathematics';
  }
  if (raw === 'english' || raw === 'english language') {
    return 'english language';
  }
  if (raw === 'edk' || raw === 'islamic knowledge' || raw === 'elimu ya dini ya kiislamu') {
    return 'elimu ya dini ya kiislamu';
  }
  if (raw === 'bible knowledge' || raw === 'divinity' || raw === 'elimu ya dini ya kikristo') {
    return 'elimu ya dini ya kikristo';
  }
  if (
    raw === 'ics' ||
    raw === 'computer studies' ||
    raw === 'information & computer studies' ||
    raw === 'information & computer studies (ics)' ||
    raw === 'information and computer studies'
  ) {
    return 'information & computer studies';
  }
  return raw;
}

export function isSameSubjectName(sub1?: string, sub2?: string): boolean {
  if (!sub1 || !sub2) return false;
  return normalizeSubjectKey(sub1) === normalizeSubjectKey(sub2);
}

export type SubjectProgressionStatus = 'COMPLETE' | 'INCOMPLETE' | 'MISSING' | 'EXCESS';

export interface SubjectProgressionItem {
  allocationId: string;
  subject: string;
  requiredPeriods: number;
  enteredPeriods: number;
  remainingPeriods: number;
  excessPeriods: number;
  percentage: number;
  status: SubjectProgressionStatus;
  assignedTeachers: string[];
  assignedTeacherIds?: number[];
  primaryTeacherName?: string;
  primaryTeacherId?: number;
  isStreamSpecific: boolean;
}

export interface UnregisteredSubjectEntry {
  subject: string;
  enteredPeriods: number;
  assignedTeachers: string[];
}

export interface StreamProgressionReport {
  className: string;
  stream: string;
  level: 'NURSERY' | 'PRIMARY' | 'SECONDARY';
  subjects: SubjectProgressionItem[];
  unregisteredSubjects: UnregisteredSubjectEntry[];
  totalRequiredSubjects: number;
  completedSubjectsCount: number;
  exactMatchSubjectsCount: number;
  missingSubjects: SubjectProgressionItem[];
  incompleteSubjects: SubjectProgressionItem[];
  excessSubjects: SubjectProgressionItem[];
  totalRequiredPeriods: number;
  totalEnteredRegisteredPeriods: number;
  rawTotalEnteredPeriods: number;
  overallPercentage: number;
  isFullyComplete: boolean;
}

export function inferLevelFromClassName(className: string): 'NURSERY' | 'PRIMARY' | 'SECONDARY' {
  const lower = (className || '').toLowerCase();
  if (lower.includes('baby') || lower.includes('nursery') || lower.includes('pre') || lower.includes('kg') || lower.includes('awali')) {
    return 'NURSERY';
  }
  if (lower.includes('standard') || lower.includes('std') || lower.includes('grade') || lower.includes('darasa')) {
    return 'PRIMARY';
  }
  return 'SECONDARY';
}

export function getAllStreamsForClassHelper(
  className: string,
  streamSettings?: StreamSetting[],
  assignments?: TimetableAssignment[],
  allocations?: SubjectPeriodAllocation[]
): string[] {
  const setting = (streamSettings || []).find(s => s && isSameClass(s.className, className));
  const configured = setting && Array.isArray(setting.streams) ? [...setting.streams] : [];
  const seenNorm = new Set(configured.map(st => normalizeStreamName(st)));

  (assignments || []).forEach(a => {
    if (a && isSameClass(a.className, className) && a.stream) {
      const norm = normalizeStreamName(a.stream);
      if (norm && norm !== 'all' && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        configured.push(a.stream.toUpperCase().startsWith('STREAM') || a.stream.length > 2 ? a.stream.toUpperCase() : `STREAM ${norm.toUpperCase()}`);
      }
    }
  });

  (allocations || []).forEach(al => {
    if (al && isSameClass(al.className, className) && al.stream && al.stream !== 'ALL_STREAMS') {
      const norm = normalizeStreamName(al.stream);
      if (norm && norm !== 'all' && !seenNorm.has(norm)) {
        seenNorm.add(norm);
        configured.push(al.stream.toUpperCase().startsWith('STREAM') || al.stream.length > 2 ? al.stream.toUpperCase() : `STREAM ${norm.toUpperCase()}`);
      }
    }
  });

  return configured.length > 0 ? configured : ['STREAM A'];
}

/**
 * Computes the complete Subject & Period Progression Report for a specific Class and Stream.
 */
export function computeStreamSubjectProgression(
  className: string,
  stream: string,
  allocations: SubjectPeriodAllocation[] = [],
  assignments: TimetableAssignment[] = [],
  periodSettings?: PeriodSetting[],
  teachers: Teacher[] = [],
  teacherAssignments: TeacherAssignment[] = []
): StreamProgressionReport {
  const validAssignments = excludeUnconfiguredDaysFromAssignments(assignments, periodSettings);
  const teacherMap = new Map<string, string>();
  (teachers || []).forEach(t => {
    if (t && t.id !== undefined) {
      teacherMap.set(String(t.id), t.name || t.initial || `Teacher #${t.id}`);
    }
  });

  // Filter academic assignments for this class & stream
  const streamAcademicAssignments = validAssignments.filter(a => {
    if (!a || !a.subject || !a.className) return false;
    if (!isSameClass(a.className, className)) return false;
    if (!isSameStream(a.stream, stream)) return false;
    if (a.activityType && a.activityType !== 'academic' && !isAcademicReligiousSubject(a.subject)) return false;
    if (isNonAcademicPeriodName(a.subject)) return false;
    return true;
  });

  // Collect registered subject allocations for this class & stream
  // Stream-specific allocations take precedence over ALL_STREAMS allocations for the same subject
  const classAllocs = (allocations || []).filter(al => al && isSameClass(al.className, className));
  const resolvedAllocMap = new Map<string, { alloc: SubjectPeriodAllocation; isStreamSpecific: boolean }>();

  // 1. Add ALL_STREAMS allocations first
  classAllocs.forEach(al => {
    const normSt = normalizeStreamName(al.stream);
    if (!al.stream || al.stream === 'ALL_STREAMS' || normSt === 'all') {
      const subName = (al.subjectName || al.subject || '').trim();
      if (!subName) return;
      const key = normalizeSubjectKey(subName);
      resolvedAllocMap.set(key, { alloc: al, isStreamSpecific: false });
    }
  });

  // 2. Override with stream-specific allocations
  classAllocs.forEach(al => {
    const normSt = normalizeStreamName(al.stream);
    if (al.stream && al.stream !== 'ALL_STREAMS' && normSt !== 'all' && isSameStream(al.stream, stream)) {
      const subName = (al.subjectName || al.subject || '').trim();
      if (!subName) return;
      const key = normalizeSubjectKey(subName);
      resolvedAllocMap.set(key, { alloc: al, isStreamSpecific: true });
    }
  });

  const subjects: SubjectProgressionItem[] = [];
  const matchedSubjectKeys = new Set<string>();

  resolvedAllocMap.forEach(({ alloc, isStreamSpecific }, subKey) => {
    const displaySubName = (alloc.subjectName || alloc.subject || '').trim();
    const matchingEntries = streamAcademicAssignments.filter(a =>
      isSameSubjectName(a.subject, displaySubName)
    );
    matchedSubjectKeys.add(subKey);

    const enteredPeriods = matchingEntries.length;
    const requiredPeriods = Math.max(1, Number(alloc.periodsPerWeek) || 0);
    const remainingPeriods = Math.max(0, requiredPeriods - enteredPeriods);
    const excessPeriods = Math.max(0, enteredPeriods - requiredPeriods);
    const percentage = requiredPeriods > 0
      ? Math.min(100, Math.round((enteredPeriods / requiredPeriods) * 100))
      : 100;

    let status: SubjectProgressionStatus = 'COMPLETE';
    if (enteredPeriods === 0) {
      status = 'MISSING';
    } else if (enteredPeriods < requiredPeriods) {
      status = 'INCOMPLETE';
    } else if (enteredPeriods > requiredPeriods) {
      status = 'EXCESS';
    } else {
      status = 'COMPLETE';
    }

    const teacherNamesSet = new Set<string>();
    const teacherIdsSet = new Set<number>();

    // 1. Live teachers from timetable entries
    matchingEntries.forEach(a => {
      const tName = (a as any).teacherName || (a.teacherId !== undefined ? teacherMap.get(String(a.teacherId)) : '');
      if (tName) teacherNamesSet.add(tName);
      if (a.teacherId !== undefined && a.teacherId !== null) teacherIdsSet.add(Number(a.teacherId));
    });

    // 2. Teachers explicitly assigned to this subject & stream via Teacher Assignments
    if (Array.isArray(teacherAssignments) && teacherAssignments.length > 0) {
      teacherAssignments.forEach(ta => {
        if (!ta) return;
        const teachesSubject = (ta.subjects || []).some(s => isSameSubjectName(s, displaySubName));
        if (!teachesSubject) return;

        const teachesStream = (ta.streams || []).some(st => {
          if (!st) return false;
          const normSt = normalizeStreamName(st);
          if (normSt === 'all' || st === 'ALL_STREAMS') return true;
          if (isSameStream(st, stream)) return true;
          if (st.includes(className) && isSameStream(st, `${className} ${stream}`)) return true;
          return false;
        });

        if (teachesStream) {
          const tName = ta.teacherName || (ta.teacherId !== undefined ? teacherMap.get(String(ta.teacherId)) : '');
          if (tName) teacherNamesSet.add(tName);
          if (ta.teacherId !== undefined && ta.teacherId !== null) teacherIdsSet.add(Number(ta.teacherId));
        }
      });
    }

    const assignedTeachers = Array.from(teacherNamesSet);
    const assignedTeacherIds = Array.from(teacherIdsSet);
    const primaryTeacherName = assignedTeachers[0] || undefined;
    const primaryTeacherId = assignedTeacherIds[0] !== undefined ? assignedTeacherIds[0] : undefined;

    subjects.push({
      allocationId: alloc.id,
      subject: displaySubName,
      requiredPeriods,
      enteredPeriods,
      remainingPeriods,
      excessPeriods,
      percentage,
      status,
      assignedTeachers,
      assignedTeacherIds,
      primaryTeacherName,
      primaryTeacherId,
      isStreamSpecific
    });
  });

  // Sort subjects: MISSING first, then INCOMPLETE, then EXCESS, then COMPLETE
  const statusOrder: Record<SubjectProgressionStatus, number> = {
    MISSING: 0,
    INCOMPLETE: 1,
    EXCESS: 2,
    COMPLETE: 3
  };
  subjects.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.subject.localeCompare(b.subject);
  });

  // Detect any subjects entered in the timetable for this stream that were NOT registered in allocations
  const unregMap = new Map<string, { subject: string; count: number; teachers: Set<string> }>();
  streamAcademicAssignments.forEach(a => {
    const key = normalizeSubjectKey(a.subject);
    if (!key || matchedSubjectKeys.has(key)) return;
    if (!unregMap.has(key)) {
      unregMap.set(key, { subject: a.subject.trim(), count: 0, teachers: new Set() });
    }
    const entry = unregMap.get(key)!;
    entry.count += 1;
    const tName = (a as any).teacherName || (a.teacherId !== undefined ? teacherMap.get(String(a.teacherId)) : '');
    if (tName) entry.teachers.add(tName);
  });

  const unregisteredSubjects: UnregisteredSubjectEntry[] = Array.from(unregMap.values()).map(u => ({
    subject: u.subject,
    enteredPeriods: u.count,
    assignedTeachers: Array.from(u.teachers)
  }));

  const totalRequiredSubjects = subjects.length;
  const exactMatchSubjectsCount = subjects.filter(s => s.status === 'COMPLETE').length;
  const completedSubjectsCount = subjects.filter(s => s.status === 'COMPLETE' || s.status === 'EXCESS').length;
  const missingSubjects = subjects.filter(s => s.status === 'MISSING');
  const incompleteSubjects = subjects.filter(s => s.status === 'INCOMPLETE');
  const excessSubjects = subjects.filter(s => s.status === 'EXCESS');

  const totalRequiredPeriods = subjects.reduce((sum, s) => sum + s.requiredPeriods, 0);
  const totalEnteredRegisteredPeriods = subjects.reduce(
    (sum, s) => sum + Math.min(s.enteredPeriods, s.requiredPeriods),
    0
  );
  const rawTotalEnteredPeriods = streamAcademicAssignments.length;
  const overallPercentage = totalRequiredPeriods > 0
    ? Math.round((totalEnteredRegisteredPeriods / totalRequiredPeriods) * 100)
    : 0;

  const isFullyComplete =
    totalRequiredSubjects > 0 &&
    missingSubjects.length === 0 &&
    incompleteSubjects.length === 0 &&
    excessSubjects.length === 0;

  return {
    className,
    stream,
    level: inferLevelFromClassName(className),
    subjects,
    unregisteredSubjects,
    totalRequiredSubjects,
    completedSubjectsCount,
    exactMatchSubjectsCount,
    missingSubjects,
    incompleteSubjects,
    excessSubjects,
    totalRequiredPeriods,
    totalEnteredRegisteredPeriods,
    rawTotalEnteredPeriods,
    overallPercentage,
    isFullyComplete
  };
}

/**
 * Returns ONLY the subjects that a teacher is officially registered to teach.
 * Primary source of truth is `teacher.subjects` (from Faculty/Teacher Registration).
 * Does NOT include subjects from stale/mismatched `teacherAssignments` records that are not in `teacher.subjects`.
 */
export function getRegisteredSubjectsForTeacher(
  teacher?: Teacher | null,
  teacherAssignments?: { teacherId: number; teacherName?: string; subjects?: string[] }[]
): string[] {
  if (!teacher) return [];

  const result: string[] = [];
  const seenKeys = new Set<string>();

  const cleanSub = (raw: string): string => {
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .replace(/\s+(Form|Standard|Class|Std|F|Forms|Standards)\s*[0-9]+[A-Z]*/gi, '')
      .replace(/\s+[0-9]+[A-Z]$/i, '')
      .trim();
  };

  if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) {
    teacher.subjects.forEach(s => {
      const cleaned = cleanSub(s);
      const key = normalizeSubjectKey(cleaned);
      if (cleaned && key && !seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(cleaned);
      }
    });
    return result;
  }

  // Fallback ONLY if teacher.subjects is empty AND teacherAssignments explicitly matches both teacherId and teacherName
  if (Array.isArray(teacherAssignments) && teacherAssignments.length > 0) {
    const tNameLower = (teacher.name || '').trim().toLowerCase();
    teacherAssignments
      .filter(ta => {
        if (!ta || Number(ta.teacherId) !== Number(teacher.id)) return false;
        if (ta.teacherName && tNameLower && ta.teacherName.trim().toLowerCase() !== tNameLower) {
          return false;
        }
        return true;
      })
      .forEach(ta => {
        (ta.subjects || []).forEach(s => {
          const cleaned = cleanSub(s);
          const key = normalizeSubjectKey(cleaned);
          if (cleaned && key && !seenKeys.has(key)) {
            seenKeys.add(key);
            result.push(cleaned);
          }
        });
      });
  }

  return result;
}

/**
 * Checks if a subject is in the teacher's registered subjects list.
 */
export function isSubjectRegisteredForTeacher(
  subject: string,
  teacher?: Teacher | null,
  teacherAssignments?: { teacherId: number; teacherName?: string; subjects?: string[] }[]
): boolean {
  if (!subject || !subject.trim() || !teacher) return false;
  const registered = getRegisteredSubjectsForTeacher(teacher, teacherAssignments);
  return registered.some(regSub => isSameSubjectName(regSub, subject));
}

export interface TeacherClassProgressionItem {
  className: string;
  stream: string;
  subject: string;
  requiredPeriods: number;
  enteredPeriods: number;
  remainingPeriods: number;
  excessPeriods: number;
  percentage: number;
  status: SubjectProgressionStatus;
}

export interface TeacherProgressionReport {
  teacherId: number;
  teacherName: string;
  teacherInitial: string;
  subjects: string[];
  assignedClasses: { className: string; stream: string }[];
  classProgressionItems: TeacherClassProgressionItem[];
  totalRequiredPeriods: number;
  totalEnteredPeriods: number;
  totalRemainingPeriods: number;
  totalExcessPeriods: number;
  overallPercentage: number;
  isFullyComplete: boolean;
  missingCount: number;
  incompleteCount: number;
  completedCount: number;
  workloadStatus: 'NORMAL' | 'UNDERLOAD' | 'OVERLOAD';
  activeDaysCount: number;
}

const DEFAULT_SUBJECT_PERIODS_FALLBACK: Record<string, number> = {
  'Basic Mathematics': 6,
  'Mathematics': 6,
  'English Language': 5,
  'Kiswahili': 4,
  'Biology': 4,
  'Chemistry': 4,
  'Physics': 4,
  'Geography': 3,
  'History': 3,
  'Civics': 3,
  'General Studies': 3,
  'Advanced Mathematics': 8,
  'Economics': 6,
  'Commerce': 3,
  'Book Keeping': 3
};

/**
 * Computes the complete Progression & Workload Report for an individual Teacher.
 */
export function computeTeacherProgressionReport(
  teacher: Teacher,
  assignments: TimetableAssignment[] = [],
  allocations: SubjectPeriodAllocation[] = [],
  periodSettings?: PeriodSetting[],
  teacherAssignments: TeacherAssignment[] = []
): TeacherProgressionReport {
  const validAssignments = excludeUnconfiguredDaysFromAssignments(assignments, periodSettings);

  // Timetable assignments specifically for this teacher
  const teacherAssignmentsList = validAssignments.filter(a => {
    if (!a || Number(a.teacherId) !== Number(teacher.id)) return false;
    if (a.activityType && a.activityType !== 'academic' && !isAcademicReligiousSubject(a.subject)) return false;
    if (isNonAcademicPeriodName(a.subject)) return false;
    return true;
  });

  const registeredSubs = getRegisteredSubjectsForTeacher(teacher, teacherAssignments);

  // Discover all distinct (className, stream, subject) combinations associated with this teacher
  const targetTupleMap = new Map<string, { className: string; stream: string; subject: string }>();

  // 1. From Teacher Assignments register
  const myTAs = (teacherAssignments || []).filter(ta => ta && Number(ta.teacherId) === Number(teacher.id));
  myTAs.forEach(ta => {
    const subjects = (ta.subjects && ta.subjects.length > 0) ? ta.subjects : registeredSubs;
    const streams = ta.streams || [];

    streams.forEach(stItem => {
      if (!stItem) return;
      let targetClass = '';
      let targetStream = stItem;

      // Extract class if stream contains class name e.g. "Form 1 STREAM A"
      DEFAULT_CLASSES.forEach(cName => {
        if (stItem.toLowerCase().startsWith(cName.toLowerCase())) {
          targetClass = cName;
          targetStream = stItem.substring(cName.length).trim() || 'STREAM A';
        }
      });

      if (!targetClass) {
        targetClass = 'Form 1';
      }

      subjects.forEach(sub => {
        if (!sub) return;
        const key = `${targetClass.trim().toLowerCase()}_${targetStream.trim().toLowerCase()}_${normalizeSubjectKey(sub)}`;
        if (!targetTupleMap.has(key)) {
          targetTupleMap.set(key, { className: targetClass, stream: targetStream, subject: sub });
        }
      });
    });
  });

  // 2. From actual Timetable entries already scheduled for this teacher
  teacherAssignmentsList.forEach(a => {
    if (!a.className || !a.subject) return;
    const targetClass = a.className.trim();
    const targetStream = (a.stream || 'STREAM A').trim();
    const targetSubject = a.subject.trim();
    const key = `${targetClass.toLowerCase()}_${targetStream.toLowerCase()}_${normalizeSubjectKey(targetSubject)}`;

    if (!targetTupleMap.has(key)) {
      targetTupleMap.set(key, { className: targetClass, stream: targetStream, subject: targetSubject });
    }
  });

  // If teacher has registered subjects but no assignments/streams yet, add a baseline placeholder
  if (targetTupleMap.size === 0 && registeredSubs.length > 0) {
    registeredSubs.forEach(sub => {
      const defaultCls = 'Form 1';
      const defaultSt = 'STREAM A';
      const key = `${defaultCls.toLowerCase()}_${defaultSt.toLowerCase()}_${normalizeSubjectKey(sub)}`;
      targetTupleMap.set(key, { className: defaultCls, stream: defaultSt, subject: sub });
    });
  }

  // Calculate progression for each class/stream/subject tuple
  const classProgressionItems: TeacherClassProgressionItem[] = [];

  targetTupleMap.forEach(({ className, stream, subject }) => {
    // Count actual periods scheduled in timetable for this teacher, class, stream & subject
    const matchingEntries = teacherAssignmentsList.filter(a =>
      isSameClass(a.className, className) &&
      isSameStream(a.stream, stream) &&
      isSameSubjectName(a.subject, subject)
    );

    const enteredPeriods = matchingEntries.length;

    // Determine expected / required periods from allocations
    let requiredPeriods = 4; // safe fallback
    const matchingAlloc = (allocations || []).find(al =>
      isSameClass(al.className, className) &&
      isSameStream(al.stream, stream) &&
      isSameSubjectName(al.subjectName || al.subject, subject)
    );

    if (matchingAlloc && Number(matchingAlloc.periodsPerWeek) > 0) {
      requiredPeriods = Number(matchingAlloc.periodsPerWeek);
    } else {
      const allStreamsAlloc = (allocations || []).find(al =>
        isSameClass(al.className, className) &&
        (al.stream === 'ALL_STREAMS' || normalizeStreamName(al.stream) === 'all') &&
        isSameSubjectName(al.subjectName || al.subject, subject)
      );
      if (allStreamsAlloc && Number(allStreamsAlloc.periodsPerWeek) > 0) {
        requiredPeriods = Number(allStreamsAlloc.periodsPerWeek);
      } else if (DEFAULT_SUBJECT_PERIODS_FALLBACK[subject]) {
        requiredPeriods = DEFAULT_SUBJECT_PERIODS_FALLBACK[subject];
      }
    }

    const remainingPeriods = Math.max(0, requiredPeriods - enteredPeriods);
    const excessPeriods = Math.max(0, enteredPeriods - requiredPeriods);
    const percentage = requiredPeriods > 0
      ? Math.min(100, Math.round((enteredPeriods / requiredPeriods) * 100))
      : 100;

    let status: SubjectProgressionStatus = 'COMPLETE';
    if (enteredPeriods === 0) {
      status = 'MISSING';
    } else if (enteredPeriods < requiredPeriods) {
      status = 'INCOMPLETE';
    } else if (enteredPeriods > requiredPeriods) {
      status = 'EXCESS';
    } else {
      status = 'COMPLETE';
    }

    classProgressionItems.push({
      className,
      stream,
      subject,
      requiredPeriods,
      enteredPeriods,
      remainingPeriods,
      excessPeriods,
      percentage,
      status
    });
  });

  // Sort items: MISSING first, then INCOMPLETE, then EXCESS, then COMPLETE
  const statusWeight: Record<SubjectProgressionStatus, number> = {
    MISSING: 0,
    INCOMPLETE: 1,
    EXCESS: 2,
    COMPLETE: 3
  };
  classProgressionItems.sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return `${a.className} ${a.stream}`.localeCompare(`${b.className} ${b.stream}`);
  });

  const totalRequiredPeriods = classProgressionItems.reduce((sum, item) => sum + item.requiredPeriods, 0);
  const totalEnteredPeriods = teacherAssignmentsList.length;
  const totalRemainingPeriods = classProgressionItems.reduce((sum, item) => sum + item.remainingPeriods, 0);
  const totalExcessPeriods = classProgressionItems.reduce((sum, item) => sum + item.excessPeriods, 0);

  const overallPercentage = totalRequiredPeriods > 0
    ? Math.min(100, Math.round((totalEnteredPeriods / totalRequiredPeriods) * 100))
    : (totalEnteredPeriods > 0 ? 100 : 0);

  const missingCount = classProgressionItems.filter(i => i.status === 'MISSING').length;
  const incompleteCount = classProgressionItems.filter(i => i.status === 'INCOMPLETE').length;
  const completedCount = classProgressionItems.filter(i => i.status === 'COMPLETE' || i.status === 'EXCESS').length;

  const isFullyComplete =
    classProgressionItems.length > 0 &&
    missingCount === 0 &&
    incompleteCount === 0;

  // Active days count
  const activeDaysSet = new Set<string>();
  teacherAssignmentsList.forEach(a => {
    if (a.day) activeDaysSet.add(a.day.trim().toLowerCase());
  });

  let workloadStatus: 'NORMAL' | 'UNDERLOAD' | 'OVERLOAD' = 'NORMAL';
  if (totalEnteredPeriods > 26) {
    workloadStatus = 'OVERLOAD';
  } else if (totalEnteredPeriods < 14) {
    workloadStatus = 'UNDERLOAD';
  }

  const assignedClassesMap = new Map<string, { className: string; stream: string }>();
  classProgressionItems.forEach(i => {
    const k = `${i.className}_${i.stream}`;
    if (!assignedClassesMap.has(k)) {
      assignedClassesMap.set(k, { className: i.className, stream: i.stream });
    }
  });

  return {
    teacherId: teacher.id,
    teacherName: teacher.name || `Teacher #${teacher.id}`,
    teacherInitial: teacher.initial || (teacher.name ? teacher.name.slice(0, 2).toUpperCase() : 'TR'),
    subjects: registeredSubs,
    assignedClasses: Array.from(assignedClassesMap.values()),
    classProgressionItems,
    totalRequiredPeriods,
    totalEnteredPeriods,
    totalRemainingPeriods,
    totalExcessPeriods,
    overallPercentage,
    isFullyComplete,
    missingCount,
    incompleteCount,
    completedCount,
    workloadStatus,
    activeDaysCount: activeDaysSet.size
  };
}

/**
 * Computes Progression Reports for ALL teachers in the school.
 */
export function computeAllTeachersProgressionReports(
  teachers: Teacher[] = [],
  assignments: TimetableAssignment[] = [],
  allocations: SubjectPeriodAllocation[] = [],
  periodSettings?: PeriodSetting[],
  teacherAssignments: TeacherAssignment[] = []
): TeacherProgressionReport[] {
  return (teachers || []).map(t =>
    computeTeacherProgressionReport(t, assignments, allocations, periodSettings, teacherAssignments)
  );
}

