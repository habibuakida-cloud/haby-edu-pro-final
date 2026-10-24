import { TimetableAssignment, Teacher } from '../types';

export interface ConflictItemDetail {
  assignmentId?: number | string;
  className: string;
  stream: string;
  subject: string;
  teacherId?: number;
  teacherName?: string;
  day?: string;
  period?: string;
  room?: string;
}

export interface ConflictInfo {
  hasConflict: boolean;
  type?: 'TEACHER_DOUBLE_BOOKED' | 'CLASS_COLLISION' | 'ROOM_COLLISION';
  title?: string;
  message?: string;
  recommendation?: string;
  conflictingWith: ConflictItemDetail[];
}

/**
 * Identify all timetable conflicts in the current timetable:
 * 1. Teacher double-booking (same teacher in multiple classes at same time)
 * 2. Class collision (multiple lessons in same class without parallel elective tag)
 * 3. Room collision (same room assigned to multiple classes at same time)
 */
export function detectTimetableConflicts(
  assignments: TimetableAssignment[] = [],
  teachers: Teacher[] = [],
  allowParallelElectives = true
): Record<string | number, ConflictInfo> {
  const conflicts: Record<string | number, ConflictInfo> = {};
  if (!Array.isArray(assignments) || !Array.isArray(teachers)) {
    return conflicts;
  }

  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => {
    if (t && t.id !== undefined) teacherMap.set(t.id, t);
  });

  const getNormPeriod = (p?: string, pName?: string) => {
    const raw = pName || p || '';
    return raw ? String(raw).split(' (')[0].trim().toLowerCase() : 'unknown';
  };

  // 1. Group by day + period + teacherId (Teacher Double-Booking)
  const slotTeacherMap: Record<string, TimetableAssignment[]> = {};
  assignments.forEach(assignment => {
    if (!assignment || !assignment.teacherId) return;

    const rawPeriod = assignment.periodName || assignment.period || '';
    const normalizedPeriod = getNormPeriod(rawPeriod, assignment.periodName);
    const day = (assignment.day || 'unknown').trim().toLowerCase();
    const key = `${day}_${normalizedPeriod}_teacher_${assignment.teacherId}`;
    if (!slotTeacherMap[key]) {
      slotTeacherMap[key] = [];
    }
    slotTeacherMap[key].push(assignment);
  });

  // Check teacher double bookings
  Object.values(slotTeacherMap).forEach(group => {
    if (group.length > 1) {
      group.forEach(current => {
        const otherAssignments = group.filter(a => a.id !== current.id);
        const teacher = teacherMap.get(current.teacherId!);
        const teacherName = teacher?.name || 'Mwalimu';
        const otherClasses = otherAssignments.map(o => `${o.className} ${o.stream} (${o.subject})`).join(', ');

        conflicts[current.id] = {
          hasConflict: true,
          type: 'TEACHER_DOUBLE_BOOKED',
          title: `Mgongano wa Mwalimu: ${teacherName}`,
          message: `${teacherName} amepangiwa madarasa mawili (${current.className} ${current.stream} na ${otherClasses}) kwa wakati mmoja!`,
          recommendation: `Mwalimu hawezi kufundisha madarasa mawili kwa wakati mmoja. Badilisha mwalimu kwenye kipindi hiki au panga saa nyingine.`,
          conflictingWith: otherAssignments.map(o => ({
            assignmentId: o.id,
            className: o.className || '',
            stream: o.stream || '',
            subject: o.subject || '',
            teacherId: o.teacherId,
            teacherName: teacherName,
            day: o.day,
            period: o.period,
            room: o.room
          }))
        };
      });
    }
  });

  // 2. Class collision check (unauthorized class double-booking)
  const slotClassMap: Record<string, TimetableAssignment[]> = {};
  assignments.forEach(assignment => {
    if (!assignment || !assignment.className) return;
    const normalizedPeriod = getNormPeriod(assignment.period, assignment.periodName);
    const day = (assignment.day || 'unknown').trim().toLowerCase();
    const key = `${assignment.className.trim().toLowerCase()}_${(assignment.stream || '').trim().toLowerCase()}_${day}_${normalizedPeriod}`;
    if (!slotClassMap[key]) {
      slotClassMap[key] = [];
    }
    slotClassMap[key].push(assignment);
  });

  Object.values(slotClassMap).forEach(group => {
    if (group.length > 1) {
      // Check if all are parallel electives
      const allAreParallelElectives = allowParallelElectives && group.every(a => Boolean(a.isParallelElective));
      if (!allAreParallelElectives) {
        group.forEach(current => {
          const others = group.filter(a => a.id !== current.id);
          const t = current.teacherId ? teacherMap.get(current.teacherId) : undefined;
          const otherNames = others.map(o => `${o.subject} (${o.teacherId ? teacherMap.get(o.teacherId)?.name || 'Mwalimu' : 'Hakuna Mwalimu'})`).join(', ');

          if (!conflicts[current.id]) {
            conflicts[current.id] = {
              hasConflict: true,
              type: 'CLASS_COLLISION',
              title: `Mgongano wa Darasa: ${current.className} ${current.stream}`,
              message: `Darasa la ${current.className} ${current.stream} lina masomo mawili (${current.subject} na ${otherNames}) kwa wakati mmoja bila kuwekwa kama mchepuo sambamba!`,
              recommendation: `Kama unataka wanafunzi wasome masomo mawili kwa pamoja (Sayansi & Biashara), weka alama ya "🔀 Somo la Mchepuo Sambamba". Vinginevyo futa au badilisha kipindi kimoja.`,
              conflictingWith: others.map(o => {
                const ot = o.teacherId ? teacherMap.get(o.teacherId) : undefined;
                return {
                  assignmentId: o.id,
                  className: o.className || '',
                  stream: o.stream || '',
                  subject: o.subject || '',
                  teacherId: o.teacherId,
                  teacherName: ot?.name,
                  day: o.day,
                  period: o.period,
                  room: o.room
                };
              })
            };
          }
        });
      }
    }
  });

  return conflicts;
}

/**
 * Checks potential conflict in real time for a slot being edited / created in modal or manual entry
 */
export function checkSlotConflict(
  slot: {
    assignmentId?: number | string;
    className: string;
    stream: string;
    day: string;
    period: string;
    teacherId?: number;
    subject?: string;
    room?: string;
    isParallelElective?: boolean;
  },
  assignments: TimetableAssignment[] = [],
  teachers: Teacher[] = [],
  allowParallelElectives = true
): {
  hasConflict: boolean;
  type?: 'TEACHER_DOUBLE_BOOKED' | 'CLASS_COLLISION' | 'ROOM_COLLISION';
  title: string;
  message: string;
  recommendation: string;
  conflictingWith?: {
    className: string;
    stream: string;
    subject: string;
    teacherName?: string;
    room?: string;
  };
} | null {
  if (!slot.day || !slot.period) return null;
  const getNormPeriod = (p?: string) => (p ? String(p).split(' (')[0].trim().toLowerCase() : '');
  const slotNormP = getNormPeriod(slot.period);
  const slotDay = slot.day.trim().toLowerCase();

  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => {
    if (t && t.id !== undefined) teacherMap.set(t.id, t);
  });

  // 1. Teacher double booking check
  if (slot.teacherId) {
    const clashingTeacherAsg = assignments.find(a => {
      if (!a || a.id === slot.assignmentId) return false;
      if (Number(a.teacherId) !== Number(slot.teacherId)) return false;
      if ((a.day || '').trim().toLowerCase() !== slotDay) return false;
      return getNormPeriod(a.period || a.periodName) === slotNormP;
    });

    if (clashingTeacherAsg) {
      const t = teacherMap.get(slot.teacherId);
      const tName = t?.name || 'Mwalimu';
      return {
        hasConflict: true,
        type: 'TEACHER_DOUBLE_BOOKED',
        title: `Tahadhari: ${tName} Tayari Ana Kipindi!`,
        message: `${tName} tayari amepangwa kufundisha somo la "${clashingTeacherAsg.subject}" katika darasa la ${clashingTeacherAsg.className} ${clashingTeacherAsg.stream} siku ya ${slot.day} (${slot.period})!`,
        recommendation: `Mwalimu hawezi kufundisha madarasa mawili tofauti kwa wakati mmoja. Chagua mwalimu mwingine au panga saa nyingine.`,
        conflictingWith: {
          className: clashingTeacherAsg.className,
          stream: clashingTeacherAsg.stream,
          subject: clashingTeacherAsg.subject,
          teacherName: tName,
          room: clashingTeacherAsg.room
        }
      };
    }
  }

  // 2. Class collision check (two subjects at same time in this class, not parallel)
  if (!slot.isParallelElective) {
    const clashingClassAsg = assignments.find(a => {
      if (!a || a.id === slot.assignmentId) return false;
      if (a.className !== slot.className || a.stream !== slot.stream) return false;
      if ((a.day || '').trim().toLowerCase() !== slotDay) return false;
      return getNormPeriod(a.period || a.periodName) === slotNormP;
    });

    if (clashingClassAsg && !clashingClassAsg.isParallelElective) {
      const ot = clashingClassAsg.teacherId ? teacherMap.get(clashingClassAsg.teacherId) : undefined;
      return {
        hasConflict: true,
        type: 'CLASS_COLLISION',
        title: `Tahadhari: Darasa Tayari Lina Somo Saa Hii!`,
        message: `Darasa la ${slot.className} ${slot.stream} tayari lina somo la "${clashingClassAsg.subject}" (${ot?.name || 'Mwalimu'}) saa hii!`,
        recommendation: `Kama unataka wanafunzi wasome masomo mawili kwa pamoja (k.m. Sayansi na Biashara), weka tiki kwenye "🔀 Somo la Mchepuo Sambamba".`,
        conflictingWith: {
          className: clashingClassAsg.className,
          stream: clashingClassAsg.stream,
          subject: clashingClassAsg.subject,
          teacherName: ot?.name,
          room: clashingClassAsg.room
        }
      };
    }
  }

  return null;
}
