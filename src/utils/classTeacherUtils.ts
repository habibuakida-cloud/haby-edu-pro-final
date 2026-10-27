import { Teacher, Student, TimetableAssignment } from '../types';
import { cleanSubjectName } from './cleanSubject';

export interface ParsedClassTeacher {
  className: string;
  stream: string;
}

/**
 * Normalizes class teacher assignment into structured { className, stream }
 */
export function parseClassTeacherOf(val: any): ParsedClassTeacher | null {
  if (!val) return null;
  if (typeof val === 'object' && val.className) {
    const streamRaw = val.stream || 'STREAM A';
    return {
      className: String(val.className).trim(),
      stream: String(streamRaw).trim().toUpperCase()
    };
  }
  if (typeof val === 'string' && val.trim()) {
    const trimmed = val.trim();
    const parts = trimmed.split(/[-–—/]/);
    if (parts.length >= 2) {
      return {
        className: parts[0].trim(),
        stream: parts[1].trim().toUpperCase()
      };
    }
    return {
      className: trimmed,
      stream: 'STREAM A'
    };
  }
  return null;
}

/**
 * Formats class teacher assignment into a clean display string
 * e.g. "Form 1 - STREAM A"
 */
export function formatClassTeacherString(val: any): string {
  const parsed = parseClassTeacherOf(val);
  if (!parsed) return '';
  const cleanStream = parsed.stream.replace(/^STREAM\s+/i, '').trim();
  return `${parsed.className} - STREAM ${cleanStream}`;
}

/**
 * Checks if a teacher is the designated Class Teacher for a given class and stream
 */
export function isTeacherClassTeacherFor(
  teacher: Teacher | null | undefined,
  targetClass: string,
  targetStream?: string
): boolean {
  if (!teacher) return false;
  const parsed = parseClassTeacherOf(teacher.classTeacherOf);
  if (!parsed) {
    if (teacher.schoolRole === 'Class Teacher / Master' && teacher.isClassTeacher) {
      return true;
    }
    return false;
  }

  const matchClass = parsed.className.toLowerCase().trim() === targetClass.toLowerCase().trim();
  if (!matchClass) return false;

  if (!targetStream || targetStream === 'ALL' || targetStream === 'All') return true;

  const s1 = parsed.stream.replace(/^STREAM\s+/i, '').toLowerCase().trim();
  const s2 = targetStream.replace(/^STREAM\s+/i, '').toLowerCase().trim();
  return s1 === s2 || s1.includes(s2) || s2.includes(s1);
}

/**
 * Computes all teaching streams allocated to a teacher, combing:
 * 1. teacher.teachingStreams
 * 2. timetableAssignments (periods taught by teacher)
 * 3. classTeacherOf (if class teacher)
 */
export function getTeacherAllocatedStreams(
  teacher: Teacher | null | undefined,
  timetableAssignments: TimetableAssignment[] = []
): string[] {
  if (!teacher) return [];
  const set = new Set<string>();

  const tId = teacher.id;
  const tName = (teacher.name || '').toLowerCase().trim();
  const tInitial = (teacher.initial || '').toLowerCase().trim();

  // 1. Timetable assignments matching teacher (Active Schedule FIRST!)
  timetableAssignments.forEach(a => {
    if (!a) return;
    const matchId = a.teacherId !== undefined && Number(a.teacherId) === Number(tId);
    const rawTeacher = String((a as any).teacher || a.teacherName || '').toLowerCase().trim();
    const matchName = rawTeacher && tName && (rawTeacher === tName || rawTeacher.includes(tName) || tName.includes(rawTeacher));
    const matchInit = rawTeacher && tInitial && rawTeacher === tInitial;

    if (matchId || matchName || matchInit) {
      if (a.className && a.stream) {
        const cleanStream = a.stream.replace(/^STREAM\s+/i, '').trim().toUpperCase();
        set.add(`${a.className.trim()} - STREAM ${cleanStream}`);
      }
    }
  });

  // 2. Direct teachingStreams from teacher profile
  if (Array.isArray(teacher.teachingStreams)) {
    teacher.teachingStreams.forEach(st => {
      if (st && st.trim()) set.add(st.trim());
    });
  }

  // 3. Class teacher stream
  const parsed = parseClassTeacherOf(teacher.classTeacherOf);
  if (parsed) {
    const cleanStream = parsed.stream.replace(/^STREAM\s+/i, '').trim().toUpperCase();
    set.add(`${parsed.className} - STREAM ${cleanStream}`);
  }

  return Array.from(set);
}

/**
 * Checks if a student is registered / enrolled to study a given subject.
 * If student has no explicit subjects defined (or empty), standard curriculum applies (returns true).
 * Otherwise, checks if the subject (or its clean equivalent) is in the student's subjects array.
 */
export function isStudentEnrolledInSubject(
  student: Student | null | undefined,
  subjectName: string
): boolean {
  if (!student) return false;
  if (!student.subjects || student.subjects.length === 0) {
    return true; // Default: takes standard registered curriculum
  }

  const targetClean = cleanSubjectName(subjectName).toLowerCase().trim();
  if (!targetClean) return true;

  return student.subjects.some(sub => {
    const sClean = cleanSubjectName(sub).toLowerCase().trim();
    if (sClean === targetClean) return true;
    if (sClean.includes(targetClean) || targetClean.includes(sClean)) return true;
    return false;
  });
}
