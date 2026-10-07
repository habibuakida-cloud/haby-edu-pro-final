import { Exam, Student, Teacher, UsalRecord, UsalCandidateRecord } from '../types';
import { getNectaPolicyForClass, getGradeForScore } from './nectaRules';
import { 
  NURSERY_SUBJECTS, 
  LOWER_PRIMARY_SUBJECTS, 
  UPPER_PRIMARY_SUBJECTS,
  SUBJECT_LIST,
  PRIMARY_CLASSES,
  NURSERY_CLASSES
} from '../constants/defaults';

/**
 * Determine curriculum subjects for a class name
 */
export function getCurriculumSubjectsForClass(className: string, students: Student[] = []): string[] {
  // 1. Gather subjects actually enrolled by students in this class
  const classStudents = students.filter(s => s.className.toLowerCase() === className.toLowerCase());
  const enrolledSubjectSet = new Set<string>();
  classStudents.forEach(s => {
    (s.subjects || []).forEach(sub => {
      if (sub && sub.trim()) enrolledSubjectSet.add(sub.trim());
    });
  });

  if (enrolledSubjectSet.size > 0) {
    return Array.from(enrolledSubjectSet);
  }

  // 2. Default curriculum subjects based on class level
  const norm = className.toLowerCase();
  if (NURSERY_CLASSES.some(c => c.toLowerCase() === norm)) {
    return NURSERY_SUBJECTS;
  }
  if (norm.includes('standard 1') || norm.includes('standard 2') || norm.includes('std 1') || norm.includes('std 2')) {
    return LOWER_PRIMARY_SUBJECTS;
  }
  if (PRIMARY_CLASSES.some(c => c.toLowerCase() === norm) || norm.includes('standard') || norm.includes('std')) {
    return UPPER_PRIMARY_SUBJECTS;
  }

  // Secondary standard subjects
  return [
    'Basic Mathematics',
    'English Language',
    'Kiswahili',
    'Biology',
    'Chemistry',
    'Physics',
    'Geography',
    'History',
    'Civics',
    'Commerce',
    'Book Keeping',
    'ICT / TEHAMA'
  ];
}

/**
 * Auto-creates USAL records for each subject of a registered exam
 */
export function generateUsalRecordsForExam(
  exam: Exam,
  students: Student[],
  teachers: Teacher[],
  existingUsals: UsalRecord[] = []
): UsalRecord[] {
  const existingMap = new Map<string, UsalRecord>();
  existingUsals.forEach(r => existingMap.set(r.id, r));

  const targetClasses = (exam.className === 'All' || !exam.className)
    ? Array.from(new Set(students.map(s => s.className).filter(Boolean)))
    : [exam.className];

  const newRecords: UsalRecord[] = [];

  targetClasses.forEach(cName => {
    const classStudents = students.filter(s => s.className.toLowerCase() === cName.toLowerCase());
    const subjects = getCurriculumSubjectsForClass(cName, students);
    const policy = getNectaPolicyForClass(cName);

    // Identify streams in this class
    const streamSet = new Set<string>();
    classStudents.forEach(s => {
      const st = s.stream ? s.stream.replace(/^STREAM\s+/i, '').trim().toUpperCase() : 'A';
      streamSet.add(st || 'A');
    });
    if (streamSet.size === 0) streamSet.add('A');

    const streams = Array.from(streamSet);

    subjects.forEach(subject => {
      streams.forEach(stream => {
        const streamClean = stream.replace(/^STREAM\s+/i, '').trim().toUpperCase();
        const recordId = `usal_${exam.id}_${cName.replace(/\s+/g, '_')}_${streamClean}_${subject.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // If record already exists, preserve its current data (especially sealed state and entered marks)
        if (existingMap.has(recordId)) {
          return;
        }

        // Find assigned teacher
        const assignedTeacher = teachers.find(t => {
          const teachesSubject = (t.subjects || []).some(s => 
            s.toLowerCase() === subject.toLowerCase() ||
            subject.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(subject.toLowerCase())
          );
          if (!teachesSubject) return false;

          // Check stream if configured
          if (t.teachingStreams && t.teachingStreams.length > 0) {
            return t.teachingStreams.some(ts => 
              ts.toLowerCase().includes(cName.toLowerCase()) && 
              (ts.toUpperCase().includes(streamClean) || ts.includes(stream))
            );
          }
          return true;
        });

        // Filter candidates in this class & stream enrolled in this subject
        const candidatesInStream = classStudents.filter(s => {
          const sStream = s.stream ? s.stream.replace(/^STREAM\s+/i, '').trim().toUpperCase() : 'A';
          const matchStream = sStream === streamClean || streamClean === 'ALL';
          const enrolledInSubject = !s.subjects || s.subjects.length === 0 || 
            s.subjects.some(sub => sub.toLowerCase() === subject.toLowerCase() || sub.includes(subject) || subject.includes(sub));
          return matchStream && enrolledInSubject;
        });

        // Build candidate records
        const candidates: UsalCandidateRecord[] = candidatesInStream.map(st => {
          const existingScore = st.marks?.[subject];
          const hasScore = typeof existingScore === 'number' && !isNaN(existingScore);
          const totalMarks = hasScore ? Math.min(100, Math.round(existingScore)) : 0;
          // Split into CA (30%) and Exam (70%) if total exists
          const caMarks = hasScore ? Math.round(totalMarks * 0.3) : 0;
          const examMarks = hasScore ? (totalMarks - caMarks) : 0;
          const gradeInfo = getGradeForScore(totalMarks, policy);

          return {
            studentId: st.id,
            regNo: st.regNo,
            studentName: st.name,
            gender: st.gender || 'Unknown',
            stream: st.stream || streamClean,
            caMarks,
            examMarks,
            totalMarks,
            grade: gradeInfo.grade as any,
            points: gradeInfo.points,
            remarks: gradeInfo.remark
          };
        });

        const newUsal: UsalRecord = {
          id: recordId,
          examId: exam.id,
          examName: exam.name,
          academicYear: '2026',
          term: 'Term 1',
          className: cName,
          stream: streamClean,
          subject,
          assignedTeacherId: assignedTeacher?.id,
          assignedTeacherName: assignedTeacher?.name,
          isSealed: false,
          candidates,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        newRecords.push(newUsal);
      });
    });
  });

  return newRecords;
}

/**
 * Ensures all registered exams have USAL records for all subjects
 */
export function ensureUsalRecordsForAllExams(
  exams: Exam[],
  students: Student[],
  teachers: Teacher[],
  existingUsals: UsalRecord[] = []
): UsalRecord[] {
  let combined = [...existingUsals];
  const existingIds = new Set(existingUsals.map(u => u.id));

  exams.forEach(exam => {
    const generated = generateUsalRecordsForExam(exam, students, teachers, combined);
    generated.forEach(rec => {
      if (!existingIds.has(rec.id)) {
        existingIds.add(rec.id);
        combined.push(rec);
      }
    });
  });

  return combined;
}
