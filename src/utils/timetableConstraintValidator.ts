import { TimetableAssignment, Teacher, PeriodSetting, StreamSetting } from '../types';

export interface TeacherAvailabilityWindow {
  teacherId: number;
  teacherName: string;
  unavailableDays: string[]; // e.g. ['Wednesday', 'Friday']
  unavailablePeriods: string[]; // e.g. ['Period 1', 'Period 8']
  maxLessonsPerDay?: number;
}

export interface TimetableConstraintsConfig {
  maxLessonsPerDayPerTeacher: {
    enabled: boolean;
    limit: number; // e.g. 4
  };
  doublePeriodConstraints: {
    enabled: boolean;
    requiredSubjects: string[]; // e.g. ['Physics', 'Chemistry', 'Biology', 'Basic Applied Mathematics']
    maxDoublePeriodsPerWeek: number; // e.g. 2
  };
  teacherAvailabilityWindows: {
    enabled: boolean;
    windows: Record<number, TeacherAvailabilityWindow>;
  };
  consecutiveLessonsLimit: {
    enabled: boolean;
    maxConsecutive: number; // e.g. 2 or 3
  };
  reservedActivitySlots: {
    enabled: boolean;
    slots: Array<{
      day: string;
      periodName: string;
      activityName: string; // e.g. "Sports and Games", "Assembly"
    }>;
  };
  morningSciencePriority: {
    enabled: boolean;
    scienceSubjects: string[]; // e.g. ['Mathematics', 'Physics', 'Chemistry', 'Biology']
    cutoffPeriodIndex: number; // e.g. 4 (Periods 1 to 4)
  };
}

export interface ConstraintValidationIssue {
  id: string;
  type: 'MAX_LESSONS_EXCEEDED' | 'DOUBLE_PERIOD_UNMET' | 'AVAILABILITY_BREACH' | 'CONSECUTIVE_OVERLOAD' | 'RESERVED_SLOT_CLASH' | 'AFTERNOON_HEAVY_SUBJECT';
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  title: string;
  description: string;
  affectedTeacherName?: string;
  affectedTeacherId?: number;
  affectedClassName?: string;
  affectedStream?: string;
  affectedSubject?: string;
  day?: string;
  period?: string;
  assignmentId?: number;
  suggestedFix?: string;
}

export interface ConstraintValidationReport {
  overallComplianceScore: number; // 0 to 100%
  totalRulesChecked: number;
  rulesPassedCount: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  issues: ConstraintValidationIssue[];
  teacherDailyLoadSummary: Record<string, { teacherName: string; dayLoads: Record<string, number>; maxDayLoad: number }>;
  doublePeriodComplianceSummary: Record<string, { subject: string; classStream: string; doublePeriodsCount: number; isCompliant: boolean }>;
  // Fast lookup maps for UI highlighting in red
  violatingSlotsMap: Record<string, ConstraintValidationIssue[]>; // key: `${className}_${stream}_${day}_${period}`
  violatingAssignmentIds: Record<number, ConstraintValidationIssue[]>; // key: assignmentId
  violatingTeacherSlotsMap: Record<string, ConstraintValidationIssue[]>; // key: `${teacherId}_${day}_${period}`
}

export const DEFAULT_CONSTRAINTS_CONFIG: TimetableConstraintsConfig = {
  maxLessonsPerDayPerTeacher: {
    enabled: true,
    limit: 4
  },
  doublePeriodConstraints: {
    enabled: true,
    requiredSubjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Geography'],
    maxDoublePeriodsPerWeek: 2
  },
  teacherAvailabilityWindows: {
    enabled: true,
    windows: {}
  },
  consecutiveLessonsLimit: {
    enabled: true,
    maxConsecutive: 2
  },
  reservedActivitySlots: {
    enabled: true,
    slots: [
      { day: 'Wednesday', periodName: 'Period 7', activityName: 'Sports & Games' },
      { day: 'Friday', periodName: 'Period 6', activityName: 'Religion / Devotion' }
    ]
  },
  morningSciencePriority: {
    enabled: true,
    scienceSubjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
    cutoffPeriodIndex: 4
  }
};

/**
 * Heuristic Timetable Constraint Validator
 * Analyzes scheduled assignments against user-defined constraint rules (Max lessons/day, Double periods, Teacher availability)
 * and generates structured conflict reports with exact slot coordinates for live red highlighting.
 */
export function validateTimetableAgainstConstraints(
  assignments: TimetableAssignment[],
  teachers: Teacher[],
  periodSettings: PeriodSetting[],
  streamSettings: StreamSetting[],
  config: TimetableConstraintsConfig = DEFAULT_CONSTRAINTS_CONFIG
): ConstraintValidationReport {
  const issues: ConstraintValidationIssue[] = [];
  const teacherMap = new Map<number, Teacher>(teachers.map(t => [t.id, t]));

  const violatingSlotsMap: Record<string, ConstraintValidationIssue[]> = {};
  const violatingAssignmentIds: Record<number, ConstraintValidationIssue[]> = {};
  const violatingTeacherSlotsMap: Record<string, ConstraintValidationIssue[]> = {};

  const registerViolation = (issue: ConstraintValidationIssue, asg?: TimetableAssignment) => {
    issues.push(issue);

    if (asg) {
      if (asg.id) {
        if (!violatingAssignmentIds[asg.id]) violatingAssignmentIds[asg.id] = [];
        violatingAssignmentIds[asg.id].push(issue);
      }
      if (asg.className && asg.day && asg.period) {
        const slotKey = `${asg.className}_${asg.stream || 'A'}_${asg.day}_${asg.period}`;
        if (!violatingSlotsMap[slotKey]) violatingSlotsMap[slotKey] = [];
        violatingSlotsMap[slotKey].push(issue);
      }
      if (asg.teacherId && asg.day && asg.period) {
        const tSlotKey = `${asg.teacherId}_${asg.day}_${asg.period}`;
        if (!violatingTeacherSlotsMap[tSlotKey]) violatingTeacherSlotsMap[tSlotKey] = [];
        violatingTeacherSlotsMap[tSlotKey].push(issue);
      }
    } else if (issue.affectedClassName && issue.day && issue.period) {
      const slotKey = `${issue.affectedClassName}_${issue.affectedStream || 'A'}_${issue.day}_${issue.period}`;
      if (!violatingSlotsMap[slotKey]) violatingSlotsMap[slotKey] = [];
      violatingSlotsMap[slotKey].push(issue);
    }
  };

  // Build teacher daily load ledger and tracking structures
  // key: teacherId -> { day -> TimetableAssignment[] }
  const teacherDayAssignments: Record<number, Record<string, TimetableAssignment[]>> = {};

  teachers.forEach(t => {
    teacherDayAssignments[t.id] = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
  });

  // Track double periods per class stream and subject
  // key: `${className}_${stream}_${subject}` -> { day -> TimetableAssignment[] }
  const classSubjectDayAllocations: Record<string, Record<string, TimetableAssignment[]>> = {};

  assignments.forEach(asg => {
    if (!asg.day || !asg.period) return;

    // A. Teacher Loads
    if (asg.teacherId) {
      if (!teacherDayAssignments[asg.teacherId]) {
        teacherDayAssignments[asg.teacherId] = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
      }
      if (!teacherDayAssignments[asg.teacherId][asg.day]) {
        teacherDayAssignments[asg.teacherId][asg.day] = [];
      }
      teacherDayAssignments[asg.teacherId][asg.day].push(asg);

      // Rule 3: Teacher Availability Windows & Off-Days Check
      if (config.teacherAvailabilityWindows.enabled) {
        const tWindow = config.teacherAvailabilityWindows.windows[asg.teacherId];
        if (tWindow) {
          // Check blocked day
          if (tWindow.unavailableDays && tWindow.unavailableDays.includes(asg.day)) {
            const tName = teacherMap.get(asg.teacherId)?.name || `Teacher #${asg.teacherId}`;
            const issue: ConstraintValidationIssue = {
              id: `avail_day_${asg.id}_${asg.teacherId}`,
              type: 'AVAILABILITY_BREACH',
              severity: 'CRITICAL',
              title: `Teacher Availability Breach: ${tName} on ${asg.day}`,
              description: `${tName} is scheduled for ${asg.subject} (${asg.className} ${asg.stream}) on ${asg.day} ${asg.period}, but is marked as UNAVAILABLE on this day.`,
              affectedTeacherName: tName,
              affectedTeacherId: asg.teacherId,
              affectedClassName: asg.className,
              affectedStream: asg.stream,
              affectedSubject: asg.subject,
              day: asg.day,
              period: asg.period,
              assignmentId: asg.id,
              suggestedFix: `Reassign ${asg.subject} to another faculty member or move lesson to another day.`
            };
            registerViolation(issue, asg);
          }

          // Check blocked period
          if (tWindow.unavailablePeriods && tWindow.unavailablePeriods.some(p => asg.period.includes(p) || (asg.periodName && asg.periodName.includes(p)))) {
            const tName = teacherMap.get(asg.teacherId)?.name || `Teacher #${asg.teacherId}`;
            const issue: ConstraintValidationIssue = {
              id: `avail_period_${asg.id}_${asg.teacherId}`,
              type: 'AVAILABILITY_BREACH',
              severity: 'CRITICAL',
              title: `Teacher Off-Duty Window Breach: ${tName} at ${asg.period}`,
              description: `${tName} is scheduled during their off-duty window (${asg.period}) on ${asg.day}.`,
              affectedTeacherName: tName,
              affectedTeacherId: asg.teacherId,
              affectedClassName: asg.className,
              affectedStream: asg.stream,
              affectedSubject: asg.subject,
              day: asg.day,
              period: asg.period,
              assignmentId: asg.id,
              suggestedFix: `Shift this lesson to an available period slot.`
            };
            registerViolation(issue, asg);
          }
        }
      }
    }

    // B. Class Subject Daily Tracker
    if (asg.className && asg.subject) {
      const classSubjectKey = `${asg.className}_${asg.stream || 'A'}_${asg.subject}`;
      if (!classSubjectDayAllocations[classSubjectKey]) {
        classSubjectDayAllocations[classSubjectKey] = {};
      }
      if (!classSubjectDayAllocations[classSubjectKey][asg.day]) {
        classSubjectDayAllocations[classSubjectKey][asg.day] = [];
      }
      classSubjectDayAllocations[classSubjectKey][asg.day].push(asg);
    }

    // Rule 5: Reserved Activity Slot Clash Check
    if (config.reservedActivitySlots.enabled) {
      config.reservedActivitySlots.slots.forEach(resSlot => {
        if (asg.day === resSlot.day && (asg.period.includes(resSlot.periodName) || (asg.periodName && asg.periodName.includes(resSlot.periodName)))) {
          if (asg.activityType !== 'clubs' && asg.activityType !== 'lunch' && asg.activityType !== 'breakfast' && asg.subject.toLowerCase() !== resSlot.activityName.toLowerCase()) {
            const issue: ConstraintValidationIssue = {
              id: `reserved_slot_${asg.id}`,
              type: 'RESERVED_SLOT_CLASH',
              severity: 'WARNING',
              title: `Academic Class on Reserved Slot: ${resSlot.activityName}`,
              description: `${asg.className} ${asg.stream} has academic subject "${asg.subject}" during school-wide ${resSlot.activityName} on ${asg.day} (${resSlot.periodName}).`,
              affectedClassName: asg.className,
              affectedStream: asg.stream,
              affectedSubject: asg.subject,
              day: asg.day,
              period: asg.period,
              assignmentId: asg.id,
              suggestedFix: `Clear academic subject from ${resSlot.day} ${resSlot.periodName} and reserve for ${resSlot.activityName}.`
            };
            registerViolation(issue, asg);
          }
        }
      });
    }

    // Rule 6: Morning Science & Cognitive Priority Check
    if (config.morningSciencePriority.enabled) {
      const isScience = config.morningSciencePriority.scienceSubjects.some(
        s => asg.subject && asg.subject.toLowerCase().includes(s.toLowerCase())
      );
      if (isScience) {
        const match = asg.period.match(/Period\s*(\d+)/i) || (asg.periodName ? asg.periodName.match(/Period\s*(\d+)/i) : null);
        if (match && parseInt(match[1], 10) > config.morningSciencePriority.cutoffPeriodIndex) {
          const pNum = parseInt(match[1], 10);
          const issue: ConstraintValidationIssue = {
            id: `science_afternoon_${asg.id}`,
            type: 'AFTERNOON_HEAVY_SUBJECT',
            severity: 'SUGGESTION',
            title: `Heavy Subject in Afternoon: ${asg.subject}`,
            description: `${asg.subject} is scheduled at Period ${pNum} in the afternoon. For optimal student retention and alertness, heavy STEM subjects are recommended for Periods 1 to 4.`,
            affectedClassName: asg.className,
            affectedStream: asg.stream,
            affectedSubject: asg.subject,
            day: asg.day,
            period: asg.period,
            assignmentId: asg.id,
            suggestedFix: `Swap with a lighter or vocational subject from morning periods.`
          };
          registerViolation(issue, asg);
        }
      }
    }
  });

  // Rule 1: Max Lessons Per Day Per Teacher Check (highlights all overload slots in red)
  const teacherDailyLoadSummary: Record<string, { teacherName: string; dayLoads: Record<string, number>; maxDayLoad: number }> = {};

  if (config.maxLessonsPerDayPerTeacher.enabled) {
    Object.entries(teacherDayAssignments).forEach(([tIdStr, daysMap]) => {
      const tId = Number(tIdStr);
      const tName = teacherMap.get(tId)?.name || `Teacher #${tId}`;
      const loads: Record<string, number> = {};

      Object.entries(daysMap).forEach(([day, asgs]) => {
        loads[day] = asgs.length;
        if (asgs.length > config.maxLessonsPerDayPerTeacher.limit) {
          const count = asgs.length;
          // Flag each individual lesson on this overloaded day so it glows red
          asgs.forEach(asg => {
            const issue: ConstraintValidationIssue = {
              id: `max_lessons_${tId}_${day}_${asg.id}`,
              type: 'MAX_LESSONS_EXCEEDED',
              severity: 'CRITICAL',
              title: `Teacher Daily Max Overload: ${tName} on ${day}`,
              description: `${tName} has ${count} lessons on ${day} (${asg.subject} in ${asg.className} ${asg.stream}), which exceeds the policy limit of ${config.maxLessonsPerDayPerTeacher.limit} lessons/day.`,
              affectedTeacherName: tName,
              affectedTeacherId: tId,
              affectedClassName: asg.className,
              affectedStream: asg.stream,
              affectedSubject: asg.subject,
              day,
              period: asg.period,
              assignmentId: asg.id,
              suggestedFix: `Move ${count - config.maxLessonsPerDayPerTeacher.limit} lesson(s) to another day with lighter teaching workload.`
            };
            registerViolation(issue, asg);
          });
        }
      });

      const maxDaily = Math.max(...Object.values(loads), 0);
      teacherDailyLoadSummary[tIdStr] = {
        teacherName: tName,
        dayLoads: loads,
        maxDayLoad: maxDaily
      };
    });
  }

  // Rule 2: Double Period Constraints Check (highlights isolated single periods of STEM subjects in red)
  const doublePeriodComplianceSummary: Record<string, { subject: string; classStream: string; doublePeriodsCount: number; isCompliant: boolean }> = {};

  if (config.doublePeriodConstraints.enabled) {
    Object.entries(classSubjectDayAllocations).forEach(([csKey, dayMap]) => {
      const parts = csKey.split('_');
      const cName = parts[0];
      const stream = parts[1];
      const subject = parts.slice(2).join('_');

      const isRequiredDouble = config.doublePeriodConstraints.requiredSubjects.some(
        reqSub => subject.toLowerCase().includes(reqSub.toLowerCase())
      );

      if (isRequiredDouble) {
        let doublePeriodsFound = 0;
        const allSubjectLessons: TimetableAssignment[] = [];

        Object.entries(dayMap).forEach(([day, asgs]) => {
          allSubjectLessons.push(...asgs);
          if (asgs.length >= 2) {
            // Check if periods are adjacent (e.g. Period 1 & Period 2)
            const pNums = asgs
              .map(a => {
                const m = a.period.match(/Period\s*(\d+)/i);
                return m ? parseInt(m[1], 10) : null;
              })
              .filter((n): n is number => n !== null)
              .sort((a, b) => a - b);

            let hasAdjacent = false;
            for (let i = 1; i < pNums.length; i++) {
              if (pNums[i] === pNums[i - 1] + 1) {
                hasAdjacent = true;
                break;
              }
            }

            if (hasAdjacent) {
              doublePeriodsFound++;
            }
          }
        });

        const isCompliant = doublePeriodsFound >= 1;
        doublePeriodComplianceSummary[csKey] = {
          subject,
          classStream: `${cName} ${stream}`,
          doublePeriodsCount: doublePeriodsFound,
          isCompliant
        };

        if (!isCompliant && allSubjectLessons.length > 0) {
          // Flag all scattered single lessons of this subject so they highlight in red/warning
          allSubjectLessons.forEach(asg => {
            const issue: ConstraintValidationIssue = {
              id: `double_unmet_${asg.id}`,
              type: 'DOUBLE_PERIOD_UNMET',
              severity: 'WARNING',
              title: `Missing Double Period: ${subject} (${cName} ${stream})`,
              description: `${subject} is scheduled as an isolated single period on ${asg.day} (${asg.period}). Practical/STEM curriculum mandates at least one continuous double period per week.`,
              affectedClassName: cName,
              affectedStream: stream,
              affectedSubject: subject,
              day: asg.day,
              period: asg.period,
              assignmentId: asg.id,
              suggestedFix: `Group this lesson with another ${subject} period into consecutive slots on the same day.`
            };
            registerViolation(issue, asg);
          });
        }
      }
    });
  }

  // Rule 4: Consecutive Lessons Limit Check (Fatigue Protection)
  if (config.consecutiveLessonsLimit.enabled) {
    Object.entries(teacherDayAssignments).forEach(([tIdStr, daysMap]) => {
      const tId = Number(tIdStr);
      const tName = teacherMap.get(tId)?.name || `Teacher #${tId}`;

      Object.entries(daysMap).forEach(([day, asgs]) => {
        if (asgs.length > config.consecutiveLessonsLimit.maxConsecutive) {
          // Sort by period number
          const sorted = [...asgs].sort((a, b) => {
            const numA = parseInt((a.period.match(/Period\s*(\d+)/i) || ['', '0'])[1], 10);
            const numB = parseInt((b.period.match(/Period\s*(\d+)/i) || ['', '0'])[1], 10);
            return numA - numB;
          });

          let consecutiveChain: TimetableAssignment[] = [sorted[0]];
          for (let i = 1; i < sorted.length; i++) {
            const prevNum = parseInt((sorted[i - 1].period.match(/Period\s*(\d+)/i) || ['', '0'])[1], 10);
            const currNum = parseInt((sorted[i].period.match(/Period\s*(\d+)/i) || ['', '0'])[1], 10);

            if (currNum === prevNum + 1) {
              consecutiveChain.push(sorted[i]);
              if (consecutiveChain.length > config.consecutiveLessonsLimit.maxConsecutive) {
                consecutiveChain.forEach(cAsg => {
                  const issue: ConstraintValidationIssue = {
                    id: `consecutive_${cAsg.id}`,
                    type: 'CONSECUTIVE_OVERLOAD',
                    severity: 'WARNING',
                    title: `Continuous Teaching Overload: ${tName} on ${day}`,
                    description: `${tName} has ${consecutiveChain.length} continuous periods on ${day} (${cAsg.period}: ${cAsg.subject} in ${cAsg.className}) without a resting gap.`,
                    affectedTeacherName: tName,
                    affectedTeacherId: tId,
                    affectedClassName: cAsg.className,
                    affectedStream: cAsg.stream,
                    affectedSubject: cAsg.subject,
                    day,
                    period: cAsg.period,
                    assignmentId: cAsg.id,
                    suggestedFix: `Insert a free period or break after ${config.consecutiveLessonsLimit.maxConsecutive} continuous teaching sessions.`
                  };
                  registerViolation(issue, cAsg);
                });
              }
            } else {
              consecutiveChain = [sorted[i]];
            }
          }
        }
      });
    });
  }

  // Calculate Overall Compliance Score
  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const suggestionCount = issues.filter(i => i.severity === 'SUGGESTION').length;

  const penalty = criticalCount * 10 + warningCount * 3 + suggestionCount * 1;
  const overallComplianceScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    overallComplianceScore,
    totalRulesChecked: 6,
    rulesPassedCount: 6 - (criticalCount > 0 ? 2 : 0) - (warningCount > 0 ? 1 : 0),
    criticalIssuesCount: criticalCount,
    warningIssuesCount: warningCount,
    issues,
    teacherDailyLoadSummary,
    doublePeriodComplianceSummary,
    violatingSlotsMap,
    violatingAssignmentIds,
    violatingTeacherSlotsMap
  };
}

/**
 * Fast helper to query constraint violations for a specific timetable slot
 */
export function getSlotConstraintViolation(
  className: string,
  stream: string,
  day: string,
  period: string,
  report?: ConstraintValidationReport | null,
  assignmentId?: number
): {
  hasViolation: boolean;
  isCritical: boolean;
  isWarning: boolean;
  issues: ConstraintValidationIssue[];
  topMessage: string;
} {
  if (!report) {
    return { hasViolation: false, isCritical: false, isWarning: false, issues: [], topMessage: '' };
  }

  const slotKey = `${className}_${stream || 'A'}_${day}_${period}`;
  const slotIssues = report.violatingSlotsMap[slotKey] || [];
  const idIssues = assignmentId ? (report.violatingAssignmentIds[assignmentId] || []) : [];

  const combined = [...slotIssues, ...idIssues];
  // Deduplicate by issue ID
  const uniqueIssues = Array.from(new Map(combined.map(i => [i.id, i])).values());

  if (uniqueIssues.length === 0) {
    return { hasViolation: false, isCritical: false, isWarning: false, issues: [], topMessage: '' };
  }

  const isCritical = uniqueIssues.some(i => i.severity === 'CRITICAL');
  const isWarning = uniqueIssues.some(i => i.severity === 'WARNING');

  return {
    hasViolation: true,
    isCritical,
    isWarning,
    issues: uniqueIssues,
    topMessage: uniqueIssues[0]?.title || 'Constraint Violation'
  };
}
