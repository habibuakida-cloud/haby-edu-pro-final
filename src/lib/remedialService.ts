import { db, supabase } from './dbClient';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { Teacher, PeriodSetting, TimetableAssignment, TeacherAssignment } from '../types';
import { isSameClass } from '../utils/reportCardUtils';

export interface RemedialTimetableEntry {
  id?: string;
  class_name: string;
  stream: string;
  subject: string;
  teacher_name: string;
  teacher_id?: number | string;
  date: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  period_time?: string;
  duration_minutes?: number;
  room?: string;
  session_type?: 'Morning' | 'Evening' | 'Weekend' | 'All Sessions';
  target_type?: 'ALL_CLASS' | 'TARGETED_STUDENTS';
  target_student_ids?: string[];
  notes?: string;
  term?: string;
  academic_year?: string;
  created_at?: string;
  school_id?: string;
  notify_students?: boolean;
}

export function timeToMinutes(t?: string): number {
  if (!t) return 0;
  const parts = t.trim().split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export interface RemedialClashDetail {
  id: string;
  source: 'REMEDIAL' | 'REGULAR_TIMETABLE';
  type: 'TEACHER' | 'CLASS' | 'ROOM' | 'INVALID_TIME';
  title: string;
  message: string;
  conflictingItemName: string;
  timeSlot: string;
  dayOrDate: string;
  severity: 'CRITICAL' | 'WARNING';
}

export interface ComprehensiveClashResult {
  hasConflict: boolean;
  clashes: RemedialClashDetail[];
  teacherClash: RemedialClashDetail | null;
  classClash: RemedialClashDetail | null;
  roomClash: RemedialClashDetail | null;
  invalidTimeClash: RemedialClashDetail | null;
  primaryMessage?: string;
}

/**
 * Extracts and calculates start/end minutes for a regular school TimetableAssignment.
 */
export function parseAssignmentTimes(
  assignment: TimetableAssignment,
  periodSettings?: PeriodSetting[]
): { start: string; end: string; startMin: number; endMin: number } | null {
  if (!assignment) return null;

  // 1. Try parsing direct time format from assignment.period (e.g. "Period 1 (08:00-08:40)" or "16:00 - 17:00")
  if (assignment.period) {
    const match = assignment.period.match(/(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})/i);
    if (match) {
      const s = match[1];
      const e = match[2];
      const sMin = timeToMinutes(s);
      const eMin = timeToMinutes(e);
      if (eMin > sMin) {
        return { start: s, end: e, startMin: sMin, endMin: eMin };
      }
    }
  }

  // 2. Lookup corresponding PeriodSetting
  if (Array.isArray(periodSettings) && periodSettings.length > 0) {
    const periodName = (assignment.periodName || assignment.period || '').trim().toLowerCase();
    const day = (assignment.day || '').trim().toLowerCase();

    // Match both day and name
    const match = periodSettings.find(ps => 
      ps.start && ps.end &&
      (ps.day?.toLowerCase() === day || ps.day?.toLowerCase() === 'all' || !ps.day) &&
      (ps.name?.toLowerCase() === periodName || periodName.includes(ps.name?.toLowerCase()))
    );

    if (match && match.start && match.end) {
      const sMin = timeToMinutes(match.start);
      const eMin = timeToMinutes(match.end);
      if (eMin > sMin) {
        return { start: match.start, end: match.end, startMin: sMin, endMin: eMin };
      }
    }

    // Match name only
    const nameMatch = periodSettings.find(ps => 
      ps.start && ps.end &&
      (ps.name?.toLowerCase() === periodName || periodName.includes(ps.name?.toLowerCase()))
    );

    if (nameMatch && nameMatch.start && nameMatch.end) {
      const sMin = timeToMinutes(nameMatch.start);
      const eMin = timeToMinutes(nameMatch.end);
      if (eMin > sMin) {
        return { start: nameMatch.start, end: nameMatch.end, startMin: sMin, endMin: eMin };
      }
    }
  }

  return null;
}

/**
 * Cross-references new or modified remedial slot against:
 * 1. Existing Remedial Timetable entries
 * 2. Regular Timetable Assignments (`timetableAssignments`)
 * 3. Teacher Allocations (`teacherAssignments`)
 */
export function checkComprehensiveRemedialClashes(
  newEntry: RemedialTimetableEntry,
  remedialEntries: RemedialTimetableEntry[] = [],
  timetableAssignments: TimetableAssignment[] = [],
  teacherAssignments: TeacherAssignment[] = [],
  teachers: Teacher[] = [],
  periodSettings: PeriodSetting[] = [],
  ignoreId?: string
): ComprehensiveClashResult {
  const clashes: RemedialClashDetail[] = [];
  const newStartMin = timeToMinutes(newEntry.start_time);
  const newEndMin = timeToMinutes(newEntry.end_time);

  // Validate start vs end time
  if (newEndMin <= newStartMin && newEntry.start_time && newEntry.end_time) {
    const invalid: RemedialClashDetail = {
      id: 'invalid_time',
      source: 'REMEDIAL',
      type: 'INVALID_TIME',
      title: 'Muda Batili (Invalid Time)',
      message: 'Muda wa kuisha (End Time) lazima uwe baada ya muda wa kuanza (Start Time).',
      conflictingItemName: `${newEntry.start_time} - ${newEntry.end_time}`,
      timeSlot: `${newEntry.start_time} - ${newEntry.end_time}`,
      dayOrDate: newEntry.date || newEntry.day_of_week || '',
      severity: 'CRITICAL'
    };
    return {
      hasConflict: true,
      clashes: [invalid],
      teacherClash: null,
      classClash: null,
      roomClash: null,
      invalidTimeClash: invalid,
      primaryMessage: invalid.message
    };
  }

  const targetDay = (newEntry.day_of_week || '').trim().toLowerCase();
  const targetDate = (newEntry.date || '').trim();

  // 1. CROSS-REFERENCE AGAINST OTHER REMEDIAL SESSIONS
  for (const existing of remedialEntries) {
    if (ignoreId && existing.id === ignoreId) continue;
    if (existing.id && newEntry.id && existing.id === newEntry.id) continue;

    const isSameDateOrDay = 
      (targetDate && existing.date && targetDate === existing.date) ||
      (targetDay && existing.day_of_week && targetDay === existing.day_of_week.trim().toLowerCase());

    if (!isSameDateOrDay) continue;

    const existStart = timeToMinutes(existing.start_time);
    const existEnd = timeToMinutes(existing.end_time);

    // Overlap: start < otherEnd && end > otherStart
    const hasOverlap = newStartMin < existEnd && newEndMin > existStart;
    if (!hasOverlap) continue;

    // A. Teacher Clash (Simultaneous sessions in different venues)
    if (
      newEntry.teacher_name && 
      existing.teacher_name && 
      newEntry.teacher_name.trim().toLowerCase() === existing.teacher_name.trim().toLowerCase()
    ) {
      clashes.push({
        id: `rem_teacher_${existing.id || Math.random()}`,
        source: 'REMEDIAL',
        type: 'TEACHER',
        title: 'Mgongano wa Mwalimu (Simultaneous Sessions)',
        message: `Mwl. ${existing.teacher_name} tayari amepangiwa somo la ziada la ${existing.subject} darasa la ${existing.class_name} kwenye ukumbi mwingine (${existing.room || 'Venue'}) muda huu (${existing.start_time} - ${existing.end_time}). Mwalimu hawezi kupewa vipindi viwili kwa wakati mmoja kwenye kumbi tofauti.`,
        conflictingItemName: `Remedial: ${existing.subject} (${existing.class_name} - ${existing.room || 'Venue'})`,
        timeSlot: `${existing.start_time} - ${existing.end_time}`,
        dayOrDate: existing.date || existing.day_of_week || '',
        severity: 'CRITICAL'
      });
    }

    // B. Class & Stream Clash
    const matchClass = isSameClass(existing.class_name, newEntry.class_name);
    const matchStream = 
      !existing.stream ||
      !newEntry.stream ||
      existing.stream.trim().toLowerCase() === newEntry.stream?.trim().toLowerCase() ||
      existing.stream === 'All Streams' ||
      newEntry.stream === 'All Streams';

    if (matchClass && matchStream) {
      clashes.push({
        id: `rem_class_${existing.id || Math.random()}`,
        source: 'REMEDIAL',
        type: 'CLASS',
        title: 'Mgongano wa Darasa (Remedial)',
        message: `Darasa la ${existing.class_name} (${existing.stream || 'Mikondo Yote'}) tayari limepangiwa somo la ${existing.subject} na Mwl. ${existing.teacher_name} muda huu (${existing.start_time} - ${existing.end_time}).`,
        conflictingItemName: `Remedial: ${existing.class_name} ${existing.stream || ''} (${existing.subject})`,
        timeSlot: `${existing.start_time} - ${existing.end_time}`,
        dayOrDate: existing.date || existing.day_of_week || '',
        severity: 'CRITICAL'
      });
    }

    // C. Room / Venue Clash
    if (
      newEntry.room && 
      existing.room && 
      newEntry.room.trim().toLowerCase() === existing.room.trim().toLowerCase()
    ) {
      clashes.push({
        id: `rem_room_${existing.id || Math.random()}`,
        source: 'REMEDIAL',
        type: 'ROOM',
        title: 'Mgongano wa Chumba (Remedial)',
        message: `Chumba "${existing.room}" tayari kinatumiwa na ${existing.class_name} kwa somo la ${existing.subject} muda huo huo (${existing.start_time} - ${existing.end_time}).`,
        conflictingItemName: `Chumba: ${existing.room}`,
        timeSlot: `${existing.start_time} - ${existing.end_time}`,
        dayOrDate: existing.date || existing.day_of_week || '',
        severity: 'WARNING'
      });
    }
  }

  // 2. CROSS-REFERENCE AGAINST REGULAR TIMETABLE ASSIGNMENTS
  if (Array.isArray(timetableAssignments) && timetableAssignments.length > 0) {
    for (const assignment of timetableAssignments) {
      if (!assignment || !assignment.day) continue;
      if (assignment.day.trim().toLowerCase() !== targetDay) continue;

      const aTimes = parseAssignmentTimes(assignment, periodSettings);
      if (!aTimes) continue;

      const hasOverlap = newStartMin < aTimes.endMin && newEndMin > aTimes.startMin;
      if (!hasOverlap) continue;

      // Identify teacher of the regular assignment
      let regTeacherName = '';
      if (assignment.teacherId && Array.isArray(teachers)) {
        const found = teachers.find(t => t.id === assignment.teacherId);
        if (found) regTeacherName = found.name;
      }
      if (!regTeacherName && Array.isArray(teacherAssignments)) {
        const foundTA = teacherAssignments.find(ta => ta.teacherId === assignment.teacherId);
        if (foundTA) regTeacherName = foundTA.teacherName;
      }

      // A. Regular Timetable Teacher Clash
      if (
        newEntry.teacher_name &&
        regTeacherName &&
        newEntry.teacher_name.trim().toLowerCase() === regTeacherName.trim().toLowerCase()
      ) {
        clashes.push({
          id: `reg_teacher_${assignment.id || Math.random()}`,
          source: 'REGULAR_TIMETABLE',
          type: 'TEACHER',
          title: 'Mgongano na Ratiba ya Kawaida (Mwalimu)',
          message: `Mwl. ${newEntry.teacher_name} tayari anafundisha kipindi cha kawaida cha ${assignment.subject} (Darasa: ${assignment.className} ${assignment.stream}) muda wa ${aTimes.start} - ${aTimes.end}.`,
          conflictingItemName: `Ratiba ya Kawaida: ${assignment.subject} (${assignment.className} ${assignment.stream})`,
          timeSlot: `${aTimes.start} - ${aTimes.end}`,
          dayOrDate: assignment.day,
          severity: 'CRITICAL'
        });
      }

      // B. Regular Timetable Class & Stream Clash
      const isRegSameClass = isSameClass(newEntry.class_name, assignment.className);
      const isRegSameStream = 
        !assignment.stream ||
        !newEntry.stream ||
        assignment.stream.trim().toLowerCase() === newEntry.stream?.trim().toLowerCase() ||
        assignment.stream === 'All Streams' ||
        newEntry.stream === 'All Streams';

      if (isRegSameClass && isRegSameStream) {
        clashes.push({
          id: `reg_class_${assignment.id || Math.random()}`,
          source: 'REGULAR_TIMETABLE',
          type: 'CLASS',
          title: 'Mgongano na Ratiba ya Kawaida (Darasa)',
          message: `Darasa la ${assignment.className} (${assignment.stream}) lina kipindi cha kawaida cha ${assignment.subject}${regTeacherName ? ` na Mwl. ${regTeacherName}` : ''} muda huo huo (${aTimes.start} - ${aTimes.end}).`,
          conflictingItemName: `Ratiba ya Kawaida: ${assignment.className} ${assignment.stream} - ${assignment.subject}`,
          timeSlot: `${aTimes.start} - ${aTimes.end}`,
          dayOrDate: assignment.day,
          severity: 'CRITICAL'
        });
      }

      // C. Regular Timetable Room Clash
      if (
        newEntry.room &&
        assignment.room &&
        newEntry.room.trim().toLowerCase() === assignment.room.trim().toLowerCase()
      ) {
        clashes.push({
          id: `reg_room_${assignment.id || Math.random()}`,
          source: 'REGULAR_TIMETABLE',
          type: 'ROOM',
          title: 'Mgongano na Ratiba ya Kawaida (Chumba)',
          message: `Chumba "${assignment.room}" kinatumika kwa kipindi cha kawaida cha ${assignment.subject} (${assignment.className}) muda wa ${aTimes.start} - ${aTimes.end}.`,
          conflictingItemName: `Chumba: ${assignment.room} (${assignment.className})`,
          timeSlot: `${aTimes.start} - ${aTimes.end}`,
          dayOrDate: assignment.day,
          severity: 'WARNING'
        });
      }
    }
  }

  const teacherClash = clashes.find(c => c.type === 'TEACHER') || null;
  const classClash = clashes.find(c => c.type === 'CLASS') || null;
  const roomClash = clashes.find(c => c.type === 'ROOM') || null;

  return {
    hasConflict: clashes.length > 0,
    clashes,
    teacherClash,
    classClash,
    roomClash,
    invalidTimeClash: null,
    primaryMessage: clashes.length > 0 ? clashes[0].message : undefined
  };
}

/**
 * Scans all existing remedial entries and checks them against each other AND against regular timetable.
 * Returns a map of entryId -> clashes for real-time red highlighting across all timetable views.
 */
export function detectAllRemedialClashes(
  remedialEntries: RemedialTimetableEntry[] = [],
  timetableAssignments: TimetableAssignment[] = [],
  teacherAssignments: TeacherAssignment[] = [],
  teachers: Teacher[] = [],
  periodSettings: PeriodSetting[] = []
): Map<string, RemedialClashDetail[]> {
  const clashMap = new Map<string, RemedialClashDetail[]>();

  remedialEntries.forEach(entry => {
    if (!entry.id) return;
    const result = checkComprehensiveRemedialClashes(
      entry,
      remedialEntries,
      timetableAssignments,
      teacherAssignments,
      teachers,
      periodSettings,
      entry.id
    );
    if (result.hasConflict && result.clashes.length > 0) {
      clashMap.set(entry.id, result.clashes);
    }
  });

  return clashMap;
}

export function checkRemedialConflict(
  existingEntries: RemedialTimetableEntry[],
  newEntry: RemedialTimetableEntry,
  ignoreId?: string,
  timetableAssignments?: TimetableAssignment[],
  teacherAssignments?: TeacherAssignment[],
  teachers?: Teacher[],
  periodSettings?: PeriodSetting[]
): { 
  hasConflict: boolean; 
  conflictingEntry?: RemedialTimetableEntry; 
  conflictType?: 'TEACHER' | 'CLASS' | 'ROOM' | 'INVALID_TIME';
  message?: string;
  clashes?: RemedialClashDetail[];
  teacherClash?: RemedialClashDetail | null;
  classClash?: RemedialClashDetail | null;
  roomClash?: RemedialClashDetail | null;
} {
  const comp = checkComprehensiveRemedialClashes(
    newEntry,
    existingEntries,
    timetableAssignments || [],
    teacherAssignments || [],
    teachers || [],
    periodSettings || [],
    ignoreId
  );

  return {
    hasConflict: comp.hasConflict,
    conflictingEntry: undefined,
    conflictType: comp.teacherClash ? 'TEACHER' : comp.classClash ? 'CLASS' : comp.roomClash ? 'ROOM' : comp.invalidTimeClash ? 'INVALID_TIME' : undefined,
    message: comp.primaryMessage,
    clashes: comp.clashes,
    teacherClash: comp.teacherClash,
    classClash: comp.classClash,
    roomClash: comp.roomClash
  };
}

const getLocalRemedial = (schoolId: string): RemedialTimetableEntry[] => {
  try {
    const raw = localStorage.getItem(`haby_remedial_timetable_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalRemedial = (schoolId: string, entries: RemedialTimetableEntry[]): void => {
  try {
    localStorage.setItem(`haby_remedial_timetable_${schoolId}`, JSON.stringify(entries));
  } catch {}
};

export const saveRemedialTimetableEntry = async (schoolId: string, entry: RemedialTimetableEntry) => {
  const entries = getLocalRemedial(schoolId);
  const entryId = entry.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const periodTime = entry.start_time && entry.end_time ? `${entry.start_time}-${entry.end_time}` : (entry.period_time || '16:00-17:00');
  
  const fullEntry: RemedialTimetableEntry = {
    ...entry,
    id: entryId,
    period_time: periodTime,
    school_id: schoolId,
    created_at: entry.created_at || new Date().toISOString()
  };

  const idx = entries.findIndex(e => e.id === entryId);
  if (idx >= 0) {
    entries[idx] = fullEntry;
  } else {
    entries.unshift(fullEntry);
  }
  setLocalRemedial(schoolId, entries);

  try {
    await supabase.from('remedial_timetable').upsert(fullEntry);
  } catch (e) {
    console.warn('Error saving remedial_timetable to DB:', e);
  }

  try {
    await setDoc(doc(db, 'remedial_timetable', entryId), {
      ...fullEntry,
      schoolId
    }, { merge: true });
  } catch (_fsErr) {}

  return { data: fullEntry, error: null };
};

export const saveRemedialTimetableBatch = async (schoolId: string, entries: RemedialTimetableEntry[]) => {
  const current = getLocalRemedial(schoolId);
  const preparedEntries = entries.map(entry => {
    const entryId = entry.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const periodTime = entry.start_time && entry.end_time ? `${entry.start_time}-${entry.end_time}` : (entry.period_time || '16:00-17:00');
    return {
      ...entry,
      id: entryId,
      period_time: periodTime,
      school_id: schoolId,
      created_at: entry.created_at || new Date().toISOString()
    };
  });

  setLocalRemedial(schoolId, [...preparedEntries, ...current]);

  try {
    await supabase.from('remedial_timetable').upsert(preparedEntries);
  } catch (e) {
    console.warn('Error saving remedial_timetable batch to DB:', e);
  }

  try {
    await Promise.all(
      preparedEntries.map(item =>
        setDoc(doc(db, 'remedial_timetable', item.id!), { ...item, schoolId }, { merge: true }).catch(() => {})
      )
    );
  } catch (_fsErr) {}

  return { data: preparedEntries, error: null };
};

export const clearRemedialTimetable = async (schoolId: string, className?: string, _streamName?: string) => {
  let entries = getLocalRemedial(schoolId);
  const removedIds = entries
    .filter(e => !className || className === 'ALL' || e.class_name.toLowerCase() === className.toLowerCase())
    .map(e => e.id)
    .filter(Boolean) as string[];

  if (className && className !== 'ALL') {
    entries = entries.filter(e => e.class_name.toLowerCase() !== className.toLowerCase());
  } else if (!className) {
    entries = [];
  }
  setLocalRemedial(schoolId, entries);

  try {
    const delQuery = supabase.from('remedial_timetable').delete().eq('school_id', schoolId);
    if (className && className !== 'ALL') {
      await delQuery.eq('class_name', className);
    } else {
      await delQuery;
    }
  } catch (e) {}

  try {
    await Promise.all(removedIds.map(id => deleteDoc(doc(db, 'remedial_timetable', id)).catch(() => {})));
  } catch (_fsErr) {}

  return { success: true };
};

export const getRemedialTimetable = async (schoolId: string, className?: string) => {
  const localEntries = getLocalRemedial(schoolId);
  const localById = new Map<string, RemedialTimetableEntry>();
  localEntries.forEach(item => {
    if (item?.id) localById.set(String(item.id), item);
  });

  let entries = [...localEntries];
  try {
    const { data, error } = await supabase
      .from('remedial_timetable')
      .select('*')
      .eq('school_id', schoolId);
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: RemedialTimetableEntry[] = data.map((d: any) => {
        const pt = d.period_time || d.periodTime || '16:00-17:00';
        const [st, et] = pt.includes('-') ? pt.split('-') : ['16:00', '17:00'];
        const startM = timeToMinutes(st);
        const endM = timeToMinutes(et);
        const duration = endM > startM ? endM - startM : (d.duration_minutes || 60);
        const localMatch = localById.get(String(d.id));

        return {
          id: String(d.id),
          class_name: d.class_name || d.className || localMatch?.class_name || 'Form 1',
          stream: d.stream || localMatch?.stream || 'A',
          subject: d.subject || localMatch?.subject || '',
          teacher_name: d.teacher_name || d.teacherName || localMatch?.teacher_name || '',
          teacher_id: d.teacher_id || d.teacherId || localMatch?.teacher_id,
          date: d.date || localMatch?.date || '',
          day_of_week: d.day_of_week || d.dayOfWeek || localMatch?.day_of_week || 'Monday',
          start_time: st,
          end_time: et,
          period_time: pt,
          duration_minutes: duration,
          room: d.room || localMatch?.room || '',
          target_type: d.target_type || d.targetType || localMatch?.target_type || 'ALL_CLASS',
          target_student_ids: Array.isArray(d.target_student_ids)
            ? d.target_student_ids
            : (localMatch?.target_student_ids || []),
          notes: d.notes || localMatch?.notes || '',
          notify_students: Boolean(d.notify_students ?? d.notifyStudents ?? localMatch?.notify_students),
          term: d.term || localMatch?.term || 'Term 1',
          school_id: d.school_id || d.schoolId || schoolId,
          created_at: d.created_at || d.createdAt || localMatch?.created_at || ''
        };
      });

      const mergedMap = new Map<string, RemedialTimetableEntry>();
      mapped.forEach(m => { if (m.id) mergedMap.set(m.id, m); });
      localEntries.forEach(l => {
        if (l.id && !mergedMap.has(l.id)) mergedMap.set(l.id, l);
      });
      entries = Array.from(mergedMap.values());
      setLocalRemedial(schoolId, entries);
    }
  } catch (e) {}

  if (entries.length === 0) {
    try {
      const q = query(collection(db, 'remedial_timetable'), where('school_id', '==', schoolId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const fsEntries: RemedialTimetableEntry[] = [];
        snap.forEach(docSnap => {
          const d = docSnap.data() as any;
          const pt = d.period_time || d.periodTime || '16:00-17:00';
          const [st, et] = pt.includes('-') ? pt.split('-') : ['16:00', '17:00'];
          fsEntries.push({
            id: docSnap.id,
            class_name: d.class_name || d.className || 'Form 1',
            stream: d.stream || 'A',
            subject: d.subject || '',
            teacher_name: d.teacher_name || d.teacherName || '',
            teacher_id: d.teacher_id || d.teacherId,
            date: d.date || '',
            day_of_week: d.day_of_week || d.dayOfWeek || 'Monday',
            start_time: d.start_time || st,
            end_time: d.end_time || et,
            period_time: pt,
            duration_minutes: d.duration_minutes || 60,
            room: d.room || '',
            target_type: d.target_type || 'ALL_CLASS',
            target_student_ids: Array.isArray(d.target_student_ids) ? d.target_student_ids : [],
            notes: d.notes || '',
            notify_students: Boolean(d.notify_students),
            term: d.term || 'Term 1',
            school_id: schoolId,
            created_at: d.created_at || ''
          });
        });
        setLocalRemedial(schoolId, fsEntries);
        entries = fsEntries;
      }
    } catch (_fsErr) {}
  }

  if (className && className !== 'All' && className !== 'ALL') {
    return { data: entries.filter((d: any) => d.class_name.toLowerCase() === className.toLowerCase()), error: null };
  }
  return { data: entries, error: null };
};

export const deleteRemedialTimetableEntry = async (schoolId: string, id: string) => {
  let entries = getLocalRemedial(schoolId);
  entries = entries.filter(e => e.id !== id);
  setLocalRemedial(schoolId, entries);

  try {
    await supabase.from('remedial_timetable').delete().eq('id', id);
  } catch (e) {}

  try {
    await deleteDoc(doc(db, 'remedial_timetable', id));
  } catch (_fsErr) {}

  return { success: true };
};

const getLocalAttendance = (schoolId: string): any[] => {
  try {
    const raw = localStorage.getItem(`haby_remedial_attendance_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalAttendance = (schoolId: string, records: any[]): void => {
  try {
    localStorage.setItem(`haby_remedial_attendance_${schoolId}`, JSON.stringify(records));
  } catch {}
};

export const markRemedialAttendance = async (schoolId: string, record: any) => {
  const payload = {
    ...record,
    id: record.id || `${schoolId}_${record.date || new Date().toISOString().split('T')[0]}_${record.period_time || '16:00'}_${record.class_name || 'Form1'}`,
    school_id: schoolId,
    schoolId,
    marked_at: new Date().toISOString()
  };

  // Local storage persistence
  const localList = getLocalAttendance(schoolId);
  const idx = localList.findIndex(r => r.id === payload.id);
  if (idx >= 0) {
    localList[idx] = payload;
  } else {
    localList.unshift(payload);
  }
  setLocalAttendance(schoolId, localList);

  try {
    await supabase.from('remedial_attendance').upsert(payload);
  } catch (e) {
    console.warn('Error saving remedial_attendance:', e);
  }

  try {
    await setDoc(doc(db, 'remedial_attendance', String(payload.id)), payload, { merge: true });
  } catch (_fsErr) {}

  return { success: true, data: payload };
};

export const getRemedialAttendance = async (schoolId: string, date?: string) => {
  const localList = getLocalAttendance(schoolId);

  try {
    let q = supabase.from('remedial_attendance').select('*').eq('school_id', schoolId);
    if (date) q = q.eq('date', date);
    const { data } = await q;
    if (data && data.length > 0) {
      // Merge with local
      const map = new Map<string, any>();
      localList.forEach(item => { if (item?.id) map.set(item.id, item); });
      data.forEach(item => { if (item?.id) map.set(item.id, item); });
      const merged = Array.from(map.values());
      setLocalAttendance(schoolId, merged);
      const filtered = date ? merged.filter(r => r.date === date) : merged;
      return { data: filtered, error: null };
    }
  } catch (e) {
    console.warn('Error fetching supabase attendance, using local cache:', e);
  }

  const result = date ? localList.filter(r => r.date === date) : localList;
  return { data: result, error: null };
};

export const getRemedialPaymentSettings = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from('remedial_payment_settings')
      .select('*')
      .eq('school_id', schoolId);
    return { data: data || [], error };
  } catch (e) {
    return { data: [], error: e };
  }
};

export const saveRemedialPaymentSetting = async (schoolId: string, setting: any) => {
  const payload = {
    ...setting,
    id: setting.id || `rps_${schoolId}_${setting.class_name || setting.className || 'ALL'}`,
    school_id: schoolId,
    schoolId
  };
  try {
    await supabase.from('remedial_payment_settings').upsert(payload);
  } catch (e) {}

  try {
    await setDoc(doc(db, 'remedial_payment_settings', String(payload.id)), payload, { merge: true });
  } catch (_fsErr) {}

  return { data: payload, error: null };
};

export const getRemedialAnalysis = async (schoolId: string, _startDate: string, _endDate: string, className?: string) => {
  try {
    let q = supabase.from('remedial_attendance').select('*').eq('school_id', schoolId);
    if (className && className !== 'All' && className !== 'ALL') {
      q = q.eq('class_name', className);
    }
    const { data, error } = await q;
    return { data: data || [], error };
  } catch (e) {
    return { data: [], error: e };
  }
};

const getLocalPaymentHistory = (schoolId: string): any[] => {
  try {
    const raw = localStorage.getItem(`haby_remedial_payment_history_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalPaymentHistory = (schoolId: string, history: any[]): void => {
  try {
    localStorage.setItem(`haby_remedial_payment_history_${schoolId}`, JSON.stringify(history));
  } catch {}
};

export const getRemedialPaymentHistory = async (schoolId: string) => {
  const localList = getLocalPaymentHistory(schoolId);
  try {
    const { data } = await supabase
      .from('remedial_payment_history')
      .select('*')
      .eq('school_id', schoolId);
    if (data && data.length > 0) {
      const map = new Map<string, any>();
      localList.forEach(item => { if (item?.id) map.set(item.id, item); });
      data.forEach(item => { if (item?.id) map.set(item.id, item); });
      const merged = Array.from(map.values());
      setLocalPaymentHistory(schoolId, merged);
      return { data: merged, error: null };
    }
  } catch (e) {}
  return { data: localList, error: null };
};

export const saveRemedialPaymentHistoryBatch = async (schoolId: string, records: any[]) => {
  const localList = getLocalPaymentHistory(schoolId);
  const newRecords = records.map(r => ({
    ...r,
    id: r.id || `rph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    school_id: schoolId,
    schoolId,
    paid_at: r.paid_at || new Date().toISOString()
  }));

  const updated = [...newRecords, ...localList];
  setLocalPaymentHistory(schoolId, updated);

  try {
    await supabase.from('remedial_payment_history').upsert(newRecords);
  } catch (e) {
    console.warn('Error saving payment history to DB:', e);
  }

  try {
    await Promise.all(
      newRecords.map(r => setDoc(doc(db, 'remedial_payment_history', String(r.id)), r, { merge: true }).catch(() => {}))
    );
  } catch (_fsErr) {}

  return { data: newRecords, error: null };
};

export const saveRemedialTimetable = saveRemedialTimetableEntry;

export interface RemedialTimeSlot {
  id: string;
  class_name: string;
  start_time: string;
  end_time: string;
  days: string[]; // ["Monday", "Tuesday", ...]
  session_type: 'Morning' | 'Evening' | 'Weekend';
  school_id: string;
  updated_at: string;
}

const getLocalTimeSlots = (schoolId: string): RemedialTimeSlot[] => {
  try {
    const raw = localStorage.getItem(`haby_remedial_time_slots_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setLocalTimeSlots = (schoolId: string, slots: RemedialTimeSlot[]): void => {
  try {
    localStorage.setItem(`haby_remedial_time_slots_${schoolId}`, JSON.stringify(slots));
  } catch {}
};

export const getRemedialTimeSlots = async (schoolId: string) => {
  const local = getLocalTimeSlots(schoolId);
  try {
    const { data } = await supabase.from('remedial_time_slots').select('*').eq('school_id', schoolId);
    if (data && data.length > 0) {
      setLocalTimeSlots(schoolId, data);
      return { data, error: null };
    }
  } catch (e) {}
  
  try {
    const q = query(collection(db, 'remedial_time_slots'), where('school_id', '==', schoolId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const fsData: RemedialTimeSlot[] = [];
      snap.forEach(d => fsData.push({ ...d.data(), id: d.id } as RemedialTimeSlot));
      setLocalTimeSlots(schoolId, fsData);
      return { data: fsData, error: null };
    }
  } catch (e) {}

  return { data: local, error: null };
};

export const saveRemedialTimeSlot = async (schoolId: string, slot: Partial<RemedialTimeSlot>) => {
  const id = slot.id || `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullSlot: RemedialTimeSlot = {
    ...slot,
    id,
    school_id: schoolId,
    updated_at: new Date().toISOString()
  } as RemedialTimeSlot;

  const local = getLocalTimeSlots(schoolId);
  const idx = local.findIndex(s => s.id === id);
  if (idx >= 0) local[idx] = fullSlot;
  else local.unshift(fullSlot);
  setLocalTimeSlots(schoolId, local);

  try {
    await supabase.from('remedial_time_slots').upsert(fullSlot, { onConflict: 'school_id,class_name,session_type' });
  } catch (e) {}

  try {
    await setDoc(doc(db, 'remedial_time_slots', id), { ...fullSlot, schoolId }, { merge: true });
  } catch (e) {}

  return { data: fullSlot, error: null };
};

export const saveRemedialTimeSlotBatch = async (schoolId: string, slots: Partial<RemedialTimeSlot>[]) => {
  const preparedSlots = slots.map(slot => {
    const id = slot.id || `ts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${Math.random().toString(36).substring(2, 5)}`;
    return {
      ...slot,
      id,
      school_id: schoolId,
      updated_at: new Date().toISOString()
    } as RemedialTimeSlot;
  });

  const local = getLocalTimeSlots(schoolId);
  setLocalTimeSlots(schoolId, [...preparedSlots, ...local]);

  try {
    await supabase.from('remedial_time_slots').upsert(preparedSlots, { onConflict: 'school_id,class_name,session_type' });
  } catch (e) {
    console.warn('Error saving remedial time slots batch:', e);
  }

  try {
    await Promise.all(
      preparedSlots.map(slot => 
        setDoc(doc(db, 'remedial_time_slots', slot.id), { ...slot, schoolId }, { merge: true }).catch(() => {})
      )
    );
  } catch (e) {}

  return { data: preparedSlots, error: null };
};

export const deleteRemedialTimeSlot = async (schoolId: string, id: string) => {
  const local = getLocalTimeSlots(schoolId).filter(s => s.id !== id);
  setLocalTimeSlots(schoolId, local);

  try {
    await supabase.from('remedial_time_slots').delete().eq('id', id);
  } catch (e) {}

  try {
    await deleteDoc(doc(db, 'remedial_time_slots', id));
  } catch (e) {}

  return { success: true };
};

export interface RemedialGlobalSettings {
  schoolId: string;
  startDate: string;
  endDate: string;
  defaultStartTime: string; // Used for Evening by default
  defaultEndTime: string;   // Used for Evening by default
  morningStartTime?: string;
  morningEndTime?: string;
  eveningPeriodCount?: number; // 1, 2, 3, etc.
  eveningPeriods?: { periodNumber: number; startTime: string; endTime: string }[];
  activeDaysPreset?: 'MON_FRI' | 'MON_THU' | 'MON_SAT' | 'CUSTOM';
  customDays?: string[];
  updatedAt: string;
}

export const getRemedialGlobalSettings = async (schoolId: string): Promise<RemedialGlobalSettings | null> => {
  try {
    const local = localStorage.getItem(`haby_remedial_global_settings_${schoolId}`);
    if (local) return JSON.parse(local);

    const { data } = await supabase.from('remedial_global_settings').select('*').eq('school_id', schoolId).single();
    if (data) {
      const settings: RemedialGlobalSettings = {
        schoolId: data.school_id,
        startDate: data.start_date,
        endDate: data.end_date,
        defaultStartTime: data.default_start_time,
        defaultEndTime: data.default_end_time,
        morningStartTime: data.morning_start_time,
        morningEndTime: data.morning_end_time,
        eveningPeriodCount: data.evening_period_count || 1,
        eveningPeriods: data.evening_periods || [],
        activeDaysPreset: data.active_days_preset || 'MON_FRI',
        customDays: data.custom_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        updatedAt: data.updated_at
      };
      localStorage.setItem(`haby_remedial_global_settings_${schoolId}`, JSON.stringify(settings));
      return settings;
    }

    const docSnap = await getDocs(query(collection(db, 'remedial_global_settings'), where('schoolId', '==', schoolId)));
    if (!docSnap.empty) {
      const data = docSnap.docs[0].data() as RemedialGlobalSettings;
      localStorage.setItem(`haby_remedial_global_settings_${schoolId}`, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.error('Error fetching global remedial settings:', e);
  }
  return null;
};

export const saveRemedialGlobalSettings = async (schoolId: string, settings: Partial<RemedialGlobalSettings>) => {
  const fullSettings: RemedialGlobalSettings = {
    schoolId,
    startDate: settings.startDate || '',
    endDate: settings.endDate || '',
    defaultStartTime: settings.defaultStartTime || '16:00',
    defaultEndTime: settings.defaultEndTime || '17:30',
    morningStartTime: settings.morningStartTime || '06:30',
    morningEndTime: settings.morningEndTime || '07:30',
    eveningPeriodCount: settings.eveningPeriodCount || 1,
    eveningPeriods: settings.eveningPeriods || [
      { periodNumber: 1, startTime: settings.defaultStartTime || '16:00', endTime: settings.defaultEndTime || '17:30' }
    ],
    activeDaysPreset: settings.activeDaysPreset || 'MON_FRI',
    customDays: settings.customDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    updatedAt: new Date().toISOString(),
    ...settings
  } as RemedialGlobalSettings;

  localStorage.setItem(`haby_remedial_global_settings_${schoolId}`, JSON.stringify(fullSettings));

  try {
    await supabase.from('remedial_global_settings').upsert({
      school_id: schoolId,
      start_date: fullSettings.startDate,
      end_date: fullSettings.endDate,
      default_start_time: fullSettings.defaultStartTime,
      default_end_time: fullSettings.defaultEndTime,
      morning_start_time: fullSettings.morningStartTime,
      morning_end_time: fullSettings.morningEndTime,
      evening_period_count: fullSettings.eveningPeriodCount,
      evening_periods: fullSettings.eveningPeriods,
      active_days_preset: fullSettings.activeDaysPreset,
      custom_days: fullSettings.customDays,
      updated_at: fullSettings.updatedAt
    });
  } catch (e) {}

  try {
    await setDoc(doc(db, 'remedial_global_settings', schoolId), fullSettings, { merge: true });
  } catch (e) {}

  return { data: fullSettings, error: null };
};




