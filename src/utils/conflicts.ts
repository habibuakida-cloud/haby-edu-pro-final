import { TimetableAssignment, Teacher } from '../types';

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingWith: {
    className: string;
    stream: string;
    subject: string;
    teacherName?: string;
  }[];
}

/**
 * Identify all teacher double-booking conflicts in the current timetable.
 * A conflict occurs if the same teacherId is assigned to multiple classes at the same (day, period).
 */
export function detectTimetableConflicts(
  assignments: TimetableAssignment[],
  teachers: Teacher[]
): Record<number, ConflictInfo> {
  const conflicts: Record<number, ConflictInfo> = {};

  // Group by day + period + teacherId
  const slotTeacherMap: Record<string, TimetableAssignment[]> = {};

  assignments.forEach(assignment => {
    // Only check if a real teacher is assigned (extra-curricular without a teacher doesn't clash)
    if (!assignment.teacherId) return;

    // Normalize period name by removing time suffix like " (08:00-08:40)" if present
    const normalizedPeriod = assignment.periodName || assignment.period.split(' (')[0];
    const key = `${assignment.day}_${normalizedPeriod}_teacher_${assignment.teacherId}`;
    if (!slotTeacherMap[key]) {
      slotTeacherMap[key] = [];
    }
    slotTeacherMap[key].push(assignment);
  });

  // Check which groups have more than 1 assignment
  Object.values(slotTeacherMap).forEach(group => {
    if (group.length > 1) {
      group.forEach(current => {
        const otherAssignments = group.filter(a => a.id !== current.id);
        const teacher = teachers.find(t => t.id === current.teacherId);
        
        conflicts[current.id] = {
          hasConflict: true,
          conflictingWith: otherAssignments.map(o => ({
            className: o.className,
            stream: o.stream,
            subject: o.subject,
            teacherName: teacher?.name
          }))
        };
      });
    }
  });

  return conflicts;
}
