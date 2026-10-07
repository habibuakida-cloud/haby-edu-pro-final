import { TimetableAssignment, Teacher, PeriodSetting, StreamSetting } from '../types';

export type ConflictSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY';

export type ConflictCategory = 
  | 'TEACHER_DOUBLE_BOOKING'       // Critical: Same teacher scheduled in 2+ classes simultaneously
  | 'CLASS_DOUBLE_BOOKING'         // Critical: Class stream assigned 2+ lessons at the same time
  | 'ROOM_DOUBLE_BOOKING'          // Warning: 2+ classes booked into the exact same room/lab
  | 'SPECIALIZATION_BREACH'        // Warning: Teacher teaching subject outside declared expertise
  | 'TEACHING_STREAM_UNAUTHORIZED' // Advisory: Teacher assigned to class outside authorized teaching streams
  | 'TEACHER_WEEKLY_OVERLOAD'      // Warning: Total weekly periods exceed max allowed
  | 'TEACHER_DAILY_OVERLOAD'       // Warning: Total periods in one day exceed policy limit
  | 'CONSECUTIVE_PERIOD_FATIGUE'   // Advisory: 4+ consecutive teaching periods with no break
  | 'BREAK_TIME_ENCROACHMENT'      // Advisory: Academic lesson scheduled during designated break/lunch
  | 'UNASSIGNED_TEACHER'           // Advisory: Academic lesson has no teacher assigned
  | 'SAME_SUBJECT_OVERLOAD';       // Advisory: Same subject 3+ times in one day for a class stream

export interface IntegrityPolicySettings {
  maxPeriodsPerTeacherPerDay: number;      // default: 5
  maxPeriodsPerTeacherPerWeek: number;     // default: 24 (or teacher.maxPeriodsPerWeek)
  maxConsecutivePeriods: number;           // default: 3
  maxSameSubjectPerDay: number;            // default: 2
  checkTeacherDoubleBooking: boolean;      // default: true
  checkClassDoubleBooking: boolean;        // default: true
  checkRoomDoubleBooking: boolean;         // default: true
  checkSpecialization: boolean;            // default: true
  checkTeachingStreams: boolean;           // default: true
  checkTeacherWorkload: boolean;           // default: true
  checkBreakEncroachment: boolean;         // default: true
  checkUnassignedLessons: boolean;         // default: true
  checkSameSubjectOverload: boolean;       // default: true
}

export const DEFAULT_INTEGRITY_POLICIES: IntegrityPolicySettings = {
  maxPeriodsPerTeacherPerDay: 5,
  maxPeriodsPerTeacherPerWeek: 24,
  maxConsecutivePeriods: 3,
  maxSameSubjectPerDay: 2,
  checkTeacherDoubleBooking: true,
  checkClassDoubleBooking: true,
  checkRoomDoubleBooking: true,
  checkSpecialization: true,
  checkTeachingStreams: true,
  checkTeacherWorkload: true,
  checkBreakEncroachment: true,
  checkUnassignedLessons: true,
  checkSameSubjectOverload: true
};

export interface InvolvedSlotInfo {
  assignmentId: number;
  className: string;
  stream: string;
  subject: string;
  teacherId?: number;
  teacherName?: string;
  room?: string;
  activityType?: string;
}

export interface TimetableConflictItem {
  id: string;
  severity: ConflictSeverity;
  category: ConflictCategory;
  title: string;
  description: string;
  day: string;
  period: string;
  periodName: string;
  timeRange?: string;
  assignmentIds: number[];
  involvedSlots: InvolvedSlotInfo[];
  involvedTeachers: { teacherId: number; teacherName: string; currentLoad?: number; maxLoad?: number }[];
  involvedRooms: string[];
  policyRule: string;
  recommendation: string;
}

export interface TeacherWorkloadAudit {
  teacherId: number;
  teacherName: string;
  schoolRole: string;
  subjects: string[];
  totalPeriods: number;
  maxWeeklyPeriods: number;
  isOverloaded: boolean;
  dailyDistribution: Record<string, number>;
  maxDailyCount: number;
  exceedsDailyLimit: boolean;
  consecutiveWarnings: number;
  hasSpecializationBreach: boolean;
  breachedSubjects: string[];
}

export interface ClassCoverageAudit {
  className: string;
  stream: string;
  totalLessons: number;
  academicLessons: number;
  extraCurricularLessons: number;
  unassignedLessons: number;
  subjectsTaught: string[];
  hasClash: boolean;
  clashCount: number;
}

export interface TimetableIntegrityReportResult {
  score: number; // 0 to 100
  status: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  totalSlotsAnalyzed: number;
  totalConflicts: number;
  criticalCount: number;
  warningCount: number;
  advisoryCount: number;
  compliantSlotsCount: number;
  conflicts: TimetableConflictItem[];
  conflictsByAssignmentId: Record<number, TimetableConflictItem[]>;
  teacherWorkloads: TeacherWorkloadAudit[];
  classCoverages: ClassCoverageAudit[];
  policiesApplied: IntegrityPolicySettings;
  generatedAt: string;
}

/**
 * Extracts normalized period name and time range.
 * E.g. "Period 1 (08:00-08:40)" -> { periodName: "Period 1", start: "08:00", end: "08:40", startMin: 480, endMin: 520 }
 */
export function parsePeriodTiming(periodStr: string): {
  periodName: string;
  start?: string;
  end?: string;
  startMinutes?: number;
  endMinutes?: number;
} {
  if (!periodStr) return { periodName: 'Unspecified' };

  const match = periodStr.match(/^(.*?)(?:\s*\((.*?)\))?$/);
  const periodName = (match?.[1] || periodStr).trim();
  const timeRange = match?.[2]?.trim();

  if (timeRange && timeRange.includes('-')) {
    const [start, end] = timeRange.split('-').map(s => s.trim());
    const parseMin = (t: string) => {
      const parts = t.split(':').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      }
      return undefined;
    };
    return {
      periodName,
      start,
      end,
      startMinutes: parseMin(start),
      endMinutes: parseMin(end)
    };
  }

  return { periodName };
}

/**
 * Checks if two time windows overlap.
 */
export function doTimesOverlap(
  aStart?: number,
  aEnd?: number,
  bStart?: number,
  bEnd?: number
): boolean {
  if (aStart !== undefined && aEnd !== undefined && bStart !== undefined && bEnd !== undefined) {
    return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
  }
  return false;
}

/**
 * Normalizes subject names for comparison (removes accents/extra whitespace, case-insensitive).
 */
export function normalizeSubject(sub: string): string {
  return sub.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Comprehensive Timetable Integrity Analyzer
 * Cross-references lessons, faculty availability, institutional policies, and rooming.
 */
export function generateTimetableIntegrityReport(
  assignments: TimetableAssignment[],
  teachers: Teacher[],
  periodSettings: PeriodSetting[] = [],
  streamSettings: StreamSetting[] = [],
  customPolicies: Partial<IntegrityPolicySettings> = {}
): TimetableIntegrityReportResult {
  const policies: IntegrityPolicySettings = {
    ...DEFAULT_INTEGRITY_POLICIES,
    ...customPolicies
  };

  const conflicts: TimetableConflictItem[] = [];
  const conflictsByAssignmentId: Record<number, TimetableConflictItem[]> = {};

  const addConflict = (item: TimetableConflictItem) => {
    conflicts.push(item);
    item.assignmentIds.forEach(id => {
      if (!conflictsByAssignmentId[id]) {
        conflictsByAssignmentId[id] = [];
      }
      conflictsByAssignmentId[id].push(item);
    });
  };

  const teacherMap = new Map<number, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  // Build slot timings lookup from periodSettings
  const periodSettingMap = new Map<string, PeriodSetting>();
  periodSettings.forEach(p => {
    const key = `${p.day}_${p.name.trim().toLowerCase()}`;
    periodSettingMap.set(key, p);
  });

  const parsedAssignments = assignments.map(a => {
    const parsed = parsePeriodTiming(a.period);
    // If start/end missing in assignment string, attempt lookup in periodSettings
    if (parsed.startMinutes === undefined) {
      const setting = periodSettingMap.get(`${a.day}_${(a.periodName || parsed.periodName).toLowerCase()}`);
      if (setting && setting.start && setting.end) {
        const partsS = setting.start.split(':').map(Number);
        const partsE = setting.end.split(':').map(Number);
        if (!isNaN(partsS[0]) && !isNaN(partsE[0])) {
          parsed.start = setting.start;
          parsed.end = setting.end;
          parsed.startMinutes = partsS[0] * 60 + partsS[1];
          parsed.endMinutes = partsE[0] * 60 + partsE[1];
        }
      }
    }
    return {
      ...a,
      parsedPeriod: parsed
    };
  });

  // =========================================================================
  // 1. TEACHER DOUBLE-BOOKING & TIME OVERLAP AUDIT (CRITICAL)
  // =========================================================================
  if (policies.checkTeacherDoubleBooking) {
    const teacherSlotsMap: Record<number, Record<string, typeof parsedAssignments>> = {};

    parsedAssignments.forEach(a => {
      if (!a.teacherId) return;
      if (!teacherSlotsMap[a.teacherId]) {
        teacherSlotsMap[a.teacherId] = {};
      }
      if (!teacherSlotsMap[a.teacherId][a.day]) {
        teacherSlotsMap[a.teacherId][a.day] = [];
      }
      teacherSlotsMap[a.teacherId][a.day].push(a);
    });

    // Check overlaps within same teacher on the same day
    Object.entries(teacherSlotsMap).forEach(([teacherIdStr, daysObj]) => {
      const tId = Number(teacherIdStr);
      const teacher = teacherMap.get(tId);
      const teacherName = teacher?.name || `Teacher #${tId}`;

      Object.entries(daysObj).forEach(([day, dayList]) => {
        // Compare every pair
        for (let i = 0; i < dayList.length; i++) {
          for (let j = i + 1; j < dayList.length; j++) {
            const slotA = dayList[i];
            const slotB = dayList[j];

            const nameA = (slotA.periodName || slotA.parsedPeriod.periodName).toLowerCase();
            const nameB = (slotB.periodName || slotB.parsedPeriod.periodName).toLowerCase();

            const isSamePeriod = nameA === nameB;
            const hasTimeOverlap = doTimesOverlap(
              slotA.parsedPeriod.startMinutes,
              slotA.parsedPeriod.endMinutes,
              slotB.parsedPeriod.startMinutes,
              slotB.parsedPeriod.endMinutes
            );

            if (isSamePeriod || hasTimeOverlap) {
              const conflictKey = `t_clash_${slotA.id}_${slotB.id}`;
              // Avoid duplicate reporting if already registered
              if (!conflicts.some(c => c.id === conflictKey)) {
                addConflict({
                  id: conflictKey,
                  severity: 'CRITICAL',
                  category: 'TEACHER_DOUBLE_BOOKING',
                  title: `Teacher Double-Booking: ${teacherName}`,
                  description: `${teacherName} is simultaneously scheduled to teach two parallel classes on ${day}.`,
                  day,
                  period: slotA.period,
                  periodName: slotA.periodName || slotA.parsedPeriod.periodName,
                  timeRange: slotA.parsedPeriod.start && slotA.parsedPeriod.end ? `${slotA.parsedPeriod.start} - ${slotA.parsedPeriod.end}` : undefined,
                  assignmentIds: [slotA.id, slotB.id],
                  involvedSlots: [
                    {
                      assignmentId: slotA.id,
                      className: slotA.className,
                      stream: slotA.stream,
                      subject: slotA.subject,
                      teacherId: tId,
                      teacherName,
                      room: slotA.room,
                      activityType: slotA.activityType
                    },
                    {
                      assignmentId: slotB.id,
                      className: slotB.className,
                      stream: slotB.stream,
                      subject: slotB.subject,
                      teacherId: tId,
                      teacherName,
                      room: slotB.room,
                      activityType: slotB.activityType
                    }
                  ],
                  involvedTeachers: [{ teacherId: tId, teacherName }],
                  involvedRooms: [slotA.room, slotB.room].filter(Boolean) as string[],
                  policyRule: 'Ministry & School Policy: A teacher cannot be scheduled to teach two different class streams in the same period window.',
                  recommendation: `Reassign ${slotB.className} ${slotB.stream} (${slotB.subject}) to another qualified teacher, or reschedule one of the lessons to a free period.`
                });
              }
            }
          }
        }
      });
    });
  }

  // =========================================================================
  // 2. CLASSROOM / STREAM DOUBLE-BOOKING AUDIT (CRITICAL)
  // =========================================================================
  if (policies.checkClassDoubleBooking) {
    const classSlotsMap: Record<string, typeof parsedAssignments> = {};

    parsedAssignments.forEach(a => {
      const classKey = `${a.className}_${a.stream}_${a.day}`;
      if (!classSlotsMap[classKey]) {
        classSlotsMap[classKey] = [];
      }
      classSlotsMap[classKey].push(a);
    });

    Object.entries(classSlotsMap).forEach(([classKey, list]) => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const slotA = list[i];
          const slotB = list[j];

          const nameA = (slotA.periodName || slotA.parsedPeriod.periodName).toLowerCase();
          const nameB = (slotB.periodName || slotB.parsedPeriod.periodName).toLowerCase();

          const isSamePeriod = nameA === nameB;
          const hasTimeOverlap = doTimesOverlap(
            slotA.parsedPeriod.startMinutes,
            slotA.parsedPeriod.endMinutes,
            slotB.parsedPeriod.startMinutes,
            slotB.parsedPeriod.endMinutes
          );

          if (isSamePeriod || hasTimeOverlap) {
            const conflictKey = `c_clash_${slotA.id}_${slotB.id}`;
            const tA = slotA.teacherId ? teacherMap.get(slotA.teacherId) : undefined;
            const tB = slotB.teacherId ? teacherMap.get(slotB.teacherId) : undefined;

            if (!conflicts.some(c => c.id === conflictKey)) {
              addConflict({
                id: conflictKey,
                severity: 'CRITICAL',
                category: 'CLASS_DOUBLE_BOOKING',
                title: `Class Stream Overlap: ${slotA.className} ${slotA.stream}`,
                description: `${slotA.className} ${slotA.stream} has multiple simultaneous lessons assigned on ${slotA.day} (${slotA.subject} vs ${slotB.subject}).`,
                day: slotA.day,
                period: slotA.period,
                periodName: slotA.periodName || slotA.parsedPeriod.periodName,
                timeRange: slotA.parsedPeriod.start && slotA.parsedPeriod.end ? `${slotA.parsedPeriod.start} - ${slotA.parsedPeriod.end}` : undefined,
                assignmentIds: [slotA.id, slotB.id],
                involvedSlots: [
                  {
                    assignmentId: slotA.id,
                    className: slotA.className,
                    stream: slotA.stream,
                    subject: slotA.subject,
                    teacherId: slotA.teacherId,
                    teacherName: tA?.name,
                    room: slotA.room,
                    activityType: slotA.activityType
                  },
                  {
                    assignmentId: slotB.id,
                    className: slotB.className,
                    stream: slotB.stream,
                    subject: slotB.subject,
                    teacherId: slotB.teacherId,
                    teacherName: tB?.name,
                    room: slotB.room,
                    activityType: slotB.activityType
                  }
                ],
                involvedTeachers: [
                  tA ? { teacherId: tA.id, teacherName: tA.name } : undefined,
                  tB ? { teacherId: tB.id, teacherName: tB.name } : undefined
                ].filter(Boolean) as any[],
                involvedRooms: [slotA.room, slotB.room].filter(Boolean) as string[],
                policyRule: 'Class Schedule Integrity: A single class stream cannot have two distinct lessons or teachers assigned at the exact same period.',
                recommendation: `Move either ${slotA.subject} or ${slotB.subject} to an open period on ${slotA.day} or another day of the week.`
              });
            }
          }
        }
      }
    });
  }

  // =========================================================================
  // 3. ROOM / FACILITY DOUBLE-BOOKING AUDIT (WARNING)
  // =========================================================================
  if (policies.checkRoomDoubleBooking) {
    const roomSlotsMap: Record<string, typeof parsedAssignments> = {};
    const genericRooms = ['grounds', 'school grounds', 'field', 'chapel / mosque / hall', 'dining hall', 'dining hall / grounds'];

    parsedAssignments.forEach(a => {
      if (!a.room) return;
      const cleanRoom = a.room.trim().toLowerCase();
      // Skip communal grounds where multiple classes participate together
      if (genericRooms.some(gr => cleanRoom.includes(gr))) return;

      const normPeriod = (a.periodName || a.parsedPeriod.periodName).toLowerCase();
      const roomKey = `${a.day}_${normPeriod}_${cleanRoom}`;

      if (!roomSlotsMap[roomKey]) {
        roomSlotsMap[roomKey] = [];
      }
      roomSlotsMap[roomKey].push(a);
    });

    Object.entries(roomSlotsMap).forEach(([key, list]) => {
      if (list.length > 1) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const slotA = list[i];
            const slotB = list[j];
            // If they are different classes in the same specific room
            if (slotA.className !== slotB.className || slotA.stream !== slotB.stream) {
              const conflictKey = `r_clash_${slotA.id}_${slotB.id}`;
              const tA = slotA.teacherId ? teacherMap.get(slotA.teacherId) : undefined;
              const tB = slotB.teacherId ? teacherMap.get(slotB.teacherId) : undefined;

              if (!conflicts.some(c => c.id === conflictKey)) {
                addConflict({
                  id: conflictKey,
                  severity: 'WARNING',
                  category: 'ROOM_DOUBLE_BOOKING',
                  title: `Room / Venue Conflict: ${slotA.room}`,
                  description: `Both ${slotA.className} ${slotA.stream} and ${slotB.className} ${slotB.stream} are scheduled in "${slotA.room}" at the same time.`,
                  day: slotA.day,
                  period: slotA.period,
                  periodName: slotA.periodName || slotA.parsedPeriod.periodName,
                  assignmentIds: [slotA.id, slotB.id],
                  involvedSlots: [
                    {
                      assignmentId: slotA.id,
                      className: slotA.className,
                      stream: slotA.stream,
                      subject: slotA.subject,
                      teacherId: slotA.teacherId,
                      teacherName: tA?.name,
                      room: slotA.room
                    },
                    {
                      assignmentId: slotB.id,
                      className: slotB.className,
                      stream: slotB.stream,
                      subject: slotB.subject,
                      teacherId: slotB.teacherId,
                      teacherName: tB?.name,
                      room: slotB.room
                    }
                  ],
                  involvedTeachers: [
                    tA ? { teacherId: tA.id, teacherName: tA.name } : undefined,
                    tB ? { teacherId: tB.id, teacherName: tB.name } : undefined
                  ].filter(Boolean) as any[],
                  involvedRooms: [slotA.room!],
                  policyRule: 'Facility Allocation Policy: Specialized laboratories and classrooms cannot accommodate two distinct class streams simultaneously.',
                  recommendation: `Assign an alternative venue or laboratory to either ${slotA.className} ${slotA.stream} or ${slotB.className} ${slotB.stream}.`
                });
              }
            }
          }
        }
      }
    });
  }

  // =========================================================================
  // 4. TEACHER SUBJECT SPECIALIZATION AUDIT (WARNING)
  // =========================================================================
  const nonAcademicActivities = [
    'breakfast', 'lunch', 'sports', 'environmental', 'assembly',
    'religion', 'praying', 'debates', 'clubs', 'library'
  ];

  if (policies.checkSpecialization) {
    parsedAssignments.forEach(a => {
      if (!a.teacherId || !a.subject) return;
      if (a.activityType && nonAcademicActivities.includes(a.activityType)) return;

      const teacher = teacherMap.get(a.teacherId);
      if (!teacher) return;

      const normSubject = normalizeSubject(a.subject);
      const isCoCurricular = normSubject.includes('sports') || normSubject.includes('break') || normSubject.includes('lunch') || normSubject.includes('assembly') || normSubject.includes('religion') || normSubject.includes('remedial') || normSubject.includes('weekly test');

      if (isCoCurricular) return;

      const teacherSubjects = (teacher.subjects || []).map(normalizeSubject);
      const isSpecialized = teacherSubjects.some(ts => 
        ts === normSubject || 
        normSubject.includes(ts) || 
        ts.includes(normSubject)
      );

      if (!isSpecialized) {
        addConflict({
          id: `spec_breach_${a.id}`,
          severity: 'WARNING',
          category: 'SPECIALIZATION_BREACH',
          title: `Specialization Mismatch: ${teacher.name}`,
          description: `${teacher.name} is assigned to teach "${a.subject}" in ${a.className} ${a.stream}, which is outside their declared subject expertise (${teacher.subjects.join(', ')}).`,
          day: a.day,
          period: a.period,
          periodName: a.periodName || a.parsedPeriod.periodName,
          assignmentIds: [a.id],
          involvedSlots: [{
            assignmentId: a.id,
            className: a.className,
            stream: a.stream,
            subject: a.subject,
            teacherId: teacher.id,
            teacherName: teacher.name,
            room: a.room
          }],
          involvedTeachers: [{ teacherId: teacher.id, teacherName: teacher.name }],
          involvedRooms: a.room ? [a.room] : [],
          policyRule: 'Academic Standards Policy: Teachers must only be assigned to subjects verified in their academic specialization and schemes of work.',
          recommendation: `Reassign ${a.className} ${a.stream} ${a.subject} to an accredited faculty member in ${a.subject}, or add ${a.subject} to ${teacher.name}'s declared qualification profile.`
        });
      }
    });
  }

  // =========================================================================
  // 5. TEACHING STREAM AUTHORIZATION AUDIT (ADVISORY)
  // =========================================================================
  if (policies.checkTeachingStreams) {
    parsedAssignments.forEach(a => {
      if (!a.teacherId) return;
      const teacher = teacherMap.get(a.teacherId);
      if (!teacher || !teacher.teachingStreams || teacher.teachingStreams.length === 0) return;

      const targetStreamStr = `${a.className} - ${a.stream}`.toLowerCase();
      const isAuthorized = teacher.teachingStreams.some(ts => 
        ts.toLowerCase() === targetStreamStr ||
        targetStreamStr.includes(ts.toLowerCase()) ||
        ts.toLowerCase().includes(targetStreamStr)
      );

      if (!isAuthorized) {
        addConflict({
          id: `stream_unauth_${a.id}`,
          severity: 'ADVISORY',
          category: 'TEACHING_STREAM_UNAUTHORIZED',
          title: `Unauthorized Stream: ${teacher.name}`,
          description: `${teacher.name} is assigned to ${a.className} ${a.stream}, which is not listed in their designated teaching streams (${teacher.teachingStreams.join(', ')}).`,
          day: a.day,
          period: a.period,
          periodName: a.periodName || a.parsedPeriod.periodName,
          assignmentIds: [a.id],
          involvedSlots: [{
            assignmentId: a.id,
            className: a.className,
            stream: a.stream,
            subject: a.subject,
            teacherId: teacher.id,
            teacherName: teacher.name,
            room: a.room
          }],
          involvedTeachers: [{ teacherId: teacher.id, teacherName: teacher.name }],
          involvedRooms: a.room ? [a.room] : [],
          policyRule: 'Stream Allocation Rule: Teachers should strictly be assigned to streams designated by the Academic Office.',
          recommendation: `Confirm with the Academic Master whether ${teacher.name} is approved to teach ${a.className} ${a.stream}, and update their profile streams.`
        });
      }
    });
  }

  // =========================================================================
  // 6. TEACHER WORKLOAD, CAPACITY & CONSECUTIVE PERIODS AUDIT (WARNING / ADVISORY)
  // =========================================================================
  const teacherWorkloads: TeacherWorkloadAudit[] = [];

  teachers.forEach(t => {
    const teacherAssignments = parsedAssignments.filter(a => a.teacherId === t.id);
    const totalPeriods = teacherAssignments.length;
    const maxWeekly = t.maxPeriodsPerWeek || policies.maxPeriodsPerTeacherPerWeek;
    const isOverloaded = totalPeriods > maxWeekly;

    const dailyDistribution: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0
    };

    const daySlots: Record<string, typeof parsedAssignments> = {};

    teacherAssignments.forEach(a => {
      if (dailyDistribution[a.day] !== undefined) {
        dailyDistribution[a.day]++;
      } else {
        dailyDistribution[a.day] = 1;
      }
      if (!daySlots[a.day]) daySlots[a.day] = [];
      daySlots[a.day].push(a);
    });

    const maxDailyCount = Math.max(0, ...Object.values(dailyDistribution));
    const exceedsDailyLimit = maxDailyCount > policies.maxPeriodsPerTeacherPerDay;

    // Check consecutive periods
    let consecutiveWarnings = 0;
    Object.entries(daySlots).forEach(([day, slots]) => {
      // Sort slots by period start time or period number
      slots.sort((a, b) => (a.parsedPeriod.startMinutes || 0) - (b.parsedPeriod.startMinutes || 0));

      let consecutiveCount = 1;
      for (let s = 1; s < slots.length; s++) {
        const prev = slots[s - 1];
        const curr = slots[s];
        // If curr starts right after prev ends (or within 10 mins)
        if (
          prev.parsedPeriod.endMinutes &&
          curr.parsedPeriod.startMinutes &&
          Math.abs(curr.parsedPeriod.startMinutes - prev.parsedPeriod.endMinutes) <= 10
        ) {
          consecutiveCount++;
          if (consecutiveCount > policies.maxConsecutivePeriods) {
            consecutiveWarnings++;
            addConflict({
              id: `fatigue_${t.id}_${day}_${curr.id}`,
              severity: 'ADVISORY',
              category: 'CONSECUTIVE_PERIOD_FATIGUE',
              title: `Teacher Fatigue Warning: ${t.name}`,
              description: `${t.name} has ${consecutiveCount} consecutive teaching periods scheduled on ${day} without a pedagogical rest interval.`,
              day,
              period: curr.period,
              periodName: curr.periodName || curr.parsedPeriod.periodName,
              assignmentIds: [prev.id, curr.id],
              involvedSlots: [
                { assignmentId: prev.id, className: prev.className, stream: prev.stream, subject: prev.subject, teacherId: t.id, teacherName: t.name },
                { assignmentId: curr.id, className: curr.className, stream: curr.stream, subject: curr.subject, teacherId: t.id, teacherName: t.name }
              ],
              involvedTeachers: [{ teacherId: t.id, teacherName: t.name, currentLoad: consecutiveCount }],
              involvedRooms: [],
              policyRule: 'Teacher Wellness & Pedagogy: Teachers should not teach more than 3 consecutive periods without an interval to sustain high lesson quality.',
              recommendation: `Introduce a break or redistribute one of the middle periods to another day or colleague.`
            });
            break;
          }
        } else {
          consecutiveCount = 1;
        }
      }
    });

    // Check weekly overload
    if (policies.checkTeacherWorkload && isOverloaded) {
      addConflict({
        id: `overload_week_${t.id}`,
        severity: 'WARNING',
        category: 'TEACHER_WEEKLY_OVERLOAD',
        title: `Weekly Workload Exceeded: ${t.name}`,
        description: `${t.name} is allocated ${totalPeriods} weekly periods (Policy maximum is ${maxWeekly} periods).`,
        day: 'All Days',
        period: 'Weekly Total',
        periodName: 'Weekly Allocation',
        assignmentIds: teacherAssignments.slice(0, 5).map(a => a.id),
        involvedSlots: teacherAssignments.slice(0, 3).map(a => ({
          assignmentId: a.id,
          className: a.className,
          stream: a.stream,
          subject: a.subject,
          teacherId: t.id,
          teacherName: t.name
        })),
        involvedTeachers: [{ teacherId: t.id, teacherName: t.name, currentLoad: totalPeriods, maxLoad: maxWeekly }],
        involvedRooms: [],
        policyRule: `Institutional Workload Ceiling: Teaching staff weekly load is capped at ${maxWeekly} periods to allow time for grading, preparation, and student counseling.`,
        recommendation: `Reallocate at least ${totalPeriods - maxWeekly} period(s) to department colleagues with lighter allocations.`
      });
    }

    // Check daily overload
    if (policies.checkTeacherWorkload && exceedsDailyLimit) {
      Object.entries(dailyDistribution).forEach(([day, count]) => {
        if (count > policies.maxPeriodsPerTeacherPerDay) {
          addConflict({
            id: `overload_day_${t.id}_${day}`,
            severity: 'WARNING',
            category: 'TEACHER_DAILY_OVERLOAD',
            title: `Daily Workload Peak: ${t.name} on ${day}`,
            description: `${t.name} is scheduled for ${count} periods on ${day} (Maximum allowable is ${policies.maxPeriodsPerTeacherPerDay} periods per day).`,
            day,
            period: 'Daily Total',
            periodName: `${count} Periods`,
            assignmentIds: (daySlots[day] || []).map(a => a.id),
            involvedSlots: (daySlots[day] || []).slice(0, 3).map(a => ({
              assignmentId: a.id,
              className: a.className,
              stream: a.stream,
              subject: a.subject,
              teacherId: t.id,
              teacherName: t.name
            })),
            involvedTeachers: [{ teacherId: t.id, teacherName: t.name, currentLoad: count, maxLoad: policies.maxPeriodsPerTeacherPerDay }],
            involvedRooms: [],
            policyRule: `Daily Teaching Cap: Maximum ${policies.maxPeriodsPerTeacherPerDay} periods per day per teacher to prevent cognitive burnout.`,
            recommendation: `Move 1 or more of ${t.name}'s lessons on ${day} to a day with lighter load.`
          });
        }
      });
    }

    const teacherSubs = (t.subjects || []).map(normalizeSubject);
    const breachedSubs = Array.from(new Set(
      teacherAssignments
        .filter(a => {
          const norm = normalizeSubject(a.subject || '');
          return !nonAcademicActivities.includes(a.activityType || '') && !teacherSubs.some(ts => norm.includes(ts) || ts.includes(norm));
        })
        .map(a => a.subject)
    ));

    teacherWorkloads.push({
      teacherId: t.id,
      teacherName: t.name,
      schoolRole: t.schoolRole || 'Teacher',
      subjects: t.subjects || [],
      totalPeriods,
      maxWeeklyPeriods: maxWeekly,
      isOverloaded,
      dailyDistribution,
      maxDailyCount,
      exceedsDailyLimit,
      consecutiveWarnings,
      hasSpecializationBreach: breachedSubs.length > 0,
      breachedSubjects: breachedSubs
    });
  });

  // =========================================================================
  // 7. INSTITUTIONAL SCHEDULE STRUCTURE & CURRICULUM AUDIT
  // =========================================================================
  const classCoverages: ClassCoverageAudit[] = [];
  const processedClasses = new Set<string>();

  streamSettings.forEach(ss => {
    const streams = ss.streams && ss.streams.length > 0 ? ss.streams : ['STREAM A'];
    streams.forEach(stream => {
      const classKey = `${ss.className}|${stream}`;
      processedClasses.add(classKey);

      const classSlots = parsedAssignments.filter(a => a.className === ss.className && a.stream === stream);
      const totalLessons = classSlots.length;
      const unassigned = classSlots.filter(a => !a.teacherId && (!a.activityType || a.activityType === 'academic'));
      const academicCount = classSlots.filter(a => !a.activityType || a.activityType === 'academic').length;
      const extraCount = totalLessons - academicCount;

      const subjectsSet = new Set<string>();
      classSlots.forEach(s => {
        if (s.subject) subjectsSet.add(s.subject);
      });

      const classClashes = conflicts.filter(c => 
        c.involvedSlots.some(s => s.className === ss.className && s.stream === stream)
      );

      // Check unassigned lessons
      if (policies.checkUnassignedLessons && unassigned.length > 0) {
        unassigned.slice(0, 3).forEach(unSlot => {
          addConflict({
            id: `unassigned_${unSlot.id}`,
            severity: 'ADVISORY',
            category: 'UNASSIGNED_TEACHER',
            title: `Unassigned Lesson: ${unSlot.subject}`,
            description: `${unSlot.className} ${unSlot.stream} has an active lesson for "${unSlot.subject}" on ${unSlot.day} ${unSlot.period} without an allocated instructor.`,
            day: unSlot.day,
            period: unSlot.period,
            periodName: unSlot.periodName || unSlot.parsedPeriod.periodName,
            assignmentIds: [unSlot.id],
            involvedSlots: [{
              assignmentId: unSlot.id,
              className: unSlot.className,
              stream: unSlot.stream,
              subject: unSlot.subject,
              room: unSlot.room
            }],
            involvedTeachers: [],
            involvedRooms: unSlot.room ? [unSlot.room] : [],
            policyRule: 'Classroom Supervision Policy: Every instructional period must have a designated teacher of record.',
            recommendation: `Assign an available faculty member qualified in ${unSlot.subject} to this slot.`
          });
        });
      }

      // Check same-subject overload in single day
      if (policies.checkSameSubjectOverload) {
        const daySubCount: Record<string, Record<string, number>> = {};
        classSlots.forEach(slot => {
          if (!slot.subject || slot.activityType !== 'academic') return;
          if (!daySubCount[slot.day]) daySubCount[slot.day] = {};
          daySubCount[slot.day][slot.subject] = (daySubCount[slot.day][slot.subject] || 0) + 1;
        });

        Object.entries(daySubCount).forEach(([day, subMap]) => {
          Object.entries(subMap).forEach(([subject, count]) => {
            if (count > policies.maxSameSubjectPerDay) {
              addConflict({
                id: `same_sub_${ss.className}_${stream}_${day}_${subject}`,
                severity: 'ADVISORY',
                category: 'SAME_SUBJECT_OVERLOAD',
                title: `Subject Clustering: ${subject} (${count} periods)`,
                description: `${ss.className} ${stream} has ${count} periods of "${subject}" scheduled on ${day}.`,
                day,
                period: 'Multiple Slots',
                periodName: `${count} Periods`,
                assignmentIds: classSlots.filter(s => s.day === day && s.subject === subject).map(s => s.id),
                involvedSlots: classSlots.filter(s => s.day === day && s.subject === subject).map(s => ({
                  assignmentId: s.id,
                  className: s.className,
                  stream: s.stream,
                  subject: s.subject,
                  teacherId: s.teacherId
                })),
                involvedTeachers: [],
                involvedRooms: [],
                policyRule: 'Pedagogical Balance Policy: Core subjects should be evenly spread across the week to maximize student focus and retention.',
                recommendation: `Spread ${subject} across different days of the week rather than clustering ${count} times in one day.`
              });
            }
          });
        });
      }

      classCoverages.push({
        className: ss.className,
        stream,
        totalLessons,
        academicLessons: academicCount,
        extraCurricularLessons: extraCount,
        unassignedLessons: unassigned.length,
        subjectsTaught: Array.from(subjectsSet),
        hasClash: classClashes.length > 0,
        clashCount: classClashes.length
      });
    });
  });

  // Check break time encroachment
  if (policies.checkBreakEncroachment) {
    parsedAssignments.forEach(a => {
      const pName = (a.periodName || a.parsedPeriod.periodName).toLowerCase();
      const isDesignatedBreak = pName.includes('break') || pName.includes('lunch') || pName.includes('chai') || pName.includes('chakula');
      const isAcademic = !a.activityType || a.activityType === 'academic';

      if (isDesignatedBreak && isAcademic && a.subject && !a.subject.toLowerCase().includes('break') && !a.subject.toLowerCase().includes('lunch')) {
        addConflict({
          id: `break_encroach_${a.id}`,
          severity: 'ADVISORY',
          category: 'BREAK_TIME_ENCROACHMENT',
          title: `Break Time Overlap: ${a.subject}`,
          description: `An academic lesson ("${a.subject}") is scheduled during institutional break period "${a.periodName || a.period}".`,
          day: a.day,
          period: a.period,
          periodName: a.periodName || a.parsedPeriod.periodName,
          assignmentIds: [a.id],
          involvedSlots: [{
            assignmentId: a.id,
            className: a.className,
            stream: a.stream,
            subject: a.subject,
            teacherId: a.teacherId,
            room: a.room
          }],
          involvedTeachers: a.teacherId && teacherMap.has(a.teacherId) ? [{ teacherId: a.teacherId, teacherName: teacherMap.get(a.teacherId)!.name }] : [],
          involvedRooms: a.room ? [a.room] : [],
          policyRule: 'Institutional Timetable Policy: Regular instructional lessons must not encroach into school meal and recreation blocks.',
          recommendation: `Mark this slot as an institutional Break/Lunch activity or move the academic lesson to a standard teaching period.`
        });
      }
    });
  }

  // =========================================================================
  // 8. HEALTH SCORE CALCULATION
  // =========================================================================
  const criticalCount = conflicts.filter(c => c.severity === 'CRITICAL').length;
  const warningCount = conflicts.filter(c => c.severity === 'WARNING').length;
  const advisoryCount = conflicts.filter(c => c.severity === 'ADVISORY').length;
  const totalConflicts = conflicts.length;

  // Deduction formula
  let deductions = criticalCount * 12 + warningCount * 4 + advisoryCount * 1;
  let score = Math.max(0, Math.min(100, Math.round(100 - deductions)));

  if (criticalCount > 0 && score > 65) {
    score = 65; // Critical clashes cap the score at 65%
  }

  let status: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' = 'OPTIMAL';
  if (criticalCount > 0 || score < 60) {
    status = 'CRITICAL';
  } else if (warningCount > 0 || score < 85) {
    status = 'NEEDS_ATTENTION';
  } else if (advisoryCount > 0) {
    status = 'GOOD';
  }

  const conflictingAssignmentIds = new Set<number>();
  conflicts.forEach(c => c.assignmentIds.forEach(id => conflictingAssignmentIds.add(id)));
  const compliantSlotsCount = Math.max(0, assignments.length - conflictingAssignmentIds.size);

  return {
    score,
    status,
    totalSlotsAnalyzed: assignments.length,
    totalConflicts,
    criticalCount,
    warningCount,
    advisoryCount,
    compliantSlotsCount,
    conflicts,
    conflictsByAssignmentId,
    teacherWorkloads,
    classCoverages,
    policiesApplied: policies,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Smart Auto-Resolver:
 * Untangles double-bookings by finding clashing pairs and unassigning the duplicate
 * or reassigning to an available qualified colleague without removing the subject!
 */
export function autoResolveTimetableClashes(
  assignments: TimetableAssignment[],
  teachers: Teacher[]
): {
  updatedAssignments: TimetableAssignment[];
  resolvedCount: number;
  changesLog: { assignmentId: number; description: string }[];
} {
  const resolved = assignments.map(a => ({ ...a }));
  const changesLog: { assignmentId: number; description: string }[] = [];
  let resolvedCount = 0;

  // 1. Group by day + period + teacherId
  const slotTeacherMap: Record<string, TimetableAssignment[]> = {};
  resolved.forEach(a => {
    if (!a.teacherId) return;
    const norm = (a.periodName || a.period.split(' (')[0]).trim().toLowerCase();
    const key = `${a.day}_${norm}_teacher_${a.teacherId}`;
    if (!slotTeacherMap[key]) slotTeacherMap[key] = [];
    slotTeacherMap[key].push(a);
  });

  const teacherMap = new Map<number, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  Object.values(slotTeacherMap).forEach(group => {
    if (group.length > 1) {
      // Keep the first assignment as is, resolve the others
      for (let i = 1; i < group.length; i++) {
        const clashingSlot = group[i];
        const idx = resolved.findIndex(r => r.id === clashingSlot.id);
        if (idx !== -1) {
          const originalTeacher = teacherMap.get(clashingSlot.teacherId!);
          const normSubject = normalizeSubject(clashingSlot.subject);

          // Attempt to find another qualified teacher who is FREE at this day & period
          const dayPeriodKey = `${clashingSlot.day}_${(clashingSlot.periodName || clashingSlot.period.split(' (')[0]).trim().toLowerCase()}`;
          const busyTeacherIds = new Set<number>();
          resolved.forEach(r => {
            if (r.id !== clashingSlot.id && r.teacherId && r.day === clashingSlot.day) {
              const rNorm = (r.periodName || r.period.split(' (')[0]).trim().toLowerCase();
              if (rNorm === (clashingSlot.periodName || clashingSlot.period.split(' (')[0]).trim().toLowerCase()) {
                busyTeacherIds.add(r.teacherId);
              }
            }
          });

          const candidate = teachers.find(t => 
            t.id !== clashingSlot.teacherId &&
            !busyTeacherIds.has(t.id) &&
            t.subjects.some(s => {
              const sNorm = normalizeSubject(s);
              return sNorm === normSubject || normSubject.includes(sNorm) || sNorm.includes(normSubject);
            })
          );

          if (candidate) {
            resolved[idx] = { ...resolved[idx], teacherId: candidate.id };
            changesLog.push({
              assignmentId: clashingSlot.id,
              description: `Reassigned ${clashingSlot.className} ${clashingSlot.stream} (${clashingSlot.subject}) from ${originalTeacher?.name || 'clashing teacher'} to available qualified teacher ${candidate.name}.`
            });
          } else {
            // Unassign teacher so student lesson remains with zero conflict
            resolved[idx] = { ...resolved[idx], teacherId: undefined };
            changesLog.push({
              assignmentId: clashingSlot.id,
              description: `Unassigned ${originalTeacher?.name || 'teacher'} from duplicate slot ${clashingSlot.className} ${clashingSlot.stream} (${clashingSlot.subject}). Subject preserved.`
            });
          }
          resolvedCount++;
        }
      }
    }
  });

  return {
    updatedAssignments: resolved,
    resolvedCount,
    changesLog
  };
}
