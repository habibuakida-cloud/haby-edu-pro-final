import { 
  AcademicCalendarType, 
  ExaminationRecord, 
  ExaminationRecordSubjectInfo, 
  ExamTerm, 
  RecordExamType, 
  Student 
} from '../types';
import { calculateOLevelDivision, calculatePrimaryScoreResult, isPrimaryOrNursery, cleanAndFilterMarksForClass } from './reportCardUtils';
import { calculateNectaLevelResults } from './nectaRules';

/**
 * Standard Grading scale:
 * A: 80 - 100
 * B: 60 - 79
 * C: 45 - 59
 * D: 30 - 44
 * F: 0 - 29
 */
export function calculateExamGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function getGradeRemark(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Very Good';
    case 'C': return 'Average';
    case 'D': return 'Pass';
    case 'F': return 'Fail';
    default: return 'Satisfactory';
  }
}

export function getGradeColor(grade: string): { bg: string; text: string; border: string } {
  switch (grade) {
    case 'A':
      return { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-300' };
    case 'B':
      return { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-300' };
    case 'C':
      return { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-300' };
    case 'D':
      return { bg: 'bg-orange-50 text-orange-700', text: 'text-orange-700', border: 'border-orange-300' };
    case 'F':
      return { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-300' };
    default:
      return { bg: 'bg-slate-50 text-slate-700', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

/**
 * Detect Calendar Type:
 * Nursery - Form 4: JAN-DEC
 * Form 5 - Form 6: JULY-JUNE
 */
export function detectCalendarType(className: string): AcademicCalendarType {
  const norm = (className || '').toLowerCase().trim();
  if (norm.includes('form 5') || norm.includes('form 6') || norm.includes('form five') || norm.includes('form six')) {
    return 'JULY-JUNE';
  }
  return 'JAN-DEC';
}

/**
 * Academic progression chain:
 * JAN-DEC: Nursery -> Baby Class -> Middle Class -> Pre-Unit -> Standard 1 -> Standard 2 -> Standard 3 -> Standard 4 -> Standard 5 -> Standard 6 -> Standard 7 -> Form 1 -> Form 2 -> Form 3 -> Form 4 -> Graduated
 * JULY-JUNE: Form 5 -> Form 6 -> Graduated
 */
export const JAN_DEC_PROGRESSION: string[] = [
  'Nursery',
  'Baby Class',
  'Middle Class',
  'Pre-Unit',
  'Standard 1',
  'Standard 2',
  'Standard 3',
  'Standard 4',
  'Standard 5',
  'Standard 6',
  'Standard 7',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Graduated (O-Level)'
];

export const JULY_JUNE_PROGRESSION: string[] = [
  'Form 5',
  'Form 6',
  'Graduated (A-Level)'
];

export function getNextProgressionClass(currentClass: string): { nextClass: string; isGraduated: boolean } {
  const cleanClass = currentClass.trim();
  const calendar = detectCalendarType(cleanClass);

  if (calendar === 'JULY-JUNE') {
    const idx = JULY_JUNE_PROGRESSION.findIndex(c => c.toLowerCase() === cleanClass.toLowerCase());
    if (idx !== -1 && idx < JULY_JUNE_PROGRESSION.length - 1) {
      const next = JULY_JUNE_PROGRESSION[idx + 1];
      return { nextClass: next, isGraduated: next.includes('Graduated') };
    }
    return { nextClass: 'Graduated (A-Level)', isGraduated: true };
  } else {
    const idx = JAN_DEC_PROGRESSION.findIndex(c => c.toLowerCase() === cleanClass.toLowerCase());
    if (idx !== -1 && idx < JAN_DEC_PROGRESSION.length - 1) {
      const next = JAN_DEC_PROGRESSION[idx + 1];
      return { nextClass: next, isGraduated: next.includes('Graduated') };
    }
    return { nextClass: 'Graduated (O-Level)', isGraduated: true };
  }
}

/**
 * Upsert examination record from student results
 */
export function buildExaminationRecord(
  student: Student,
  academicYear: string,
  term: ExamTerm,
  examType: RecordExamType,
  totalStudentsInClass: number
): ExaminationRecord {
  const calendarType = detectCalendarType(student.className);
  const rawMarks = student.marks || {};
  const cleanedMarks = cleanAndFilterMarksForClass(rawMarks, student.className, student.level);
  const subjectsRecord: Record<string, ExaminationRecordSubjectInfo> = {};

  let totalMarks = 0;
  let subjectCount = 0;

  Object.entries(cleanedMarks).forEach(([subjName, score]) => {
    if (typeof score === 'number' && !isNaN(score)) {
      const grade = calculateExamGrade(score);
      subjectsRecord[subjName] = {
        marks: score,
        grade,
        remark: getGradeRemark(grade)
      };
      totalMarks += score;
      subjectCount++;
    }
  });

  const averageMarks = subjectCount > 0 ? Number((totalMarks / subjectCount).toFixed(1)) : 0;
  
  // Calculate NECTA level-specific evaluation (Std IV, Std VII, Form II, Form IV, Form VI)
  const nectaRes = calculateNectaLevelResults(cleanedMarks, student.className);
  const overallGrade = (nectaRes.overallGrade || calculateExamGrade(averageMarks)) as any;
  const division = nectaRes.division || student.division || overallGrade;
  const points = nectaRes.points;

  const compositeId = `${student.id}_${academicYear}_${term}_${examType}`.replace(/\s+/g, '_');

  return {
    id: compositeId,
    studentId: student.id,
    studentName: student.name,
    className: student.className,
    stream: student.stream || 'A',
    gender: student.gender || 'Unknown',
    parentPhone: student.parentPhone || student.phone || '',
    academicYear,
    academicCalendarType: calendarType,
    term,
    examType,
    subjects: subjectsRecord,
    totalMarks,
    averageMarks,
    overallGrade,
    division: division || overallGrade,
    points,
    positionInClass: student.reportCardData?.positionInClass || 1,
    totalStudents: totalStudentsInClass || 1,
    createdAt: new Date().toISOString()
  };
}
