import { Exam, Student, Teacher, UsalRecord, UsalCandidateRecord } from '../types';
import { getNectaPolicyForClass, getGradeForScore } from './nectaRules';
import { 
  NURSERY_SUBJECTS, 
  LOWER_PRIMARY_SUBJECTS, 
  UPPER_PRIMARY_SUBJECTS,
  PRIMARY_CLASSES,
  NURSERY_CLASSES
} from '../constants/defaults';

/**
 * Determine curriculum subjects for a class name
 */
export function getCurriculumSubjectsForClass(className: string = '', students: Student[] = []): string[] {
  const safeClassName = typeof className === 'string' ? className.trim() : '';
  const norm = safeClassName.toLowerCase();

  // 1. Gather subjects actually enrolled by students in this class
  const classStudents = (Array.isArray(students) ? students : []).filter(
    s => s && typeof s.className === 'string' && s.className.trim().toLowerCase() === norm
  );

  const enrolledSubjectSet = new Set<string>();
  classStudents.forEach(s => {
    (s?.subjects || []).forEach(sub => {
      if (typeof sub === 'string' && sub.trim()) enrolledSubjectSet.add(sub.trim());
    });
  });

  if (enrolledSubjectSet.size > 0) {
    return Array.from(enrolledSubjectSet);
  }

  // 2. Default curriculum subjects based on class level
  if (NURSERY_CLASSES.some(c => typeof c === 'string' && c.toLowerCase() === norm)) {
    return NURSERY_SUBJECTS;
  }
  if (norm.includes('standard 1') || norm.includes('standard 2') || norm.includes('std 1') || norm.includes('std 2')) {
    return LOWER_PRIMARY_SUBJECTS;
  }
  if (PRIMARY_CLASSES.some(c => typeof c === 'string' && c.toLowerCase() === norm) || norm.includes('standard') || norm.includes('std')) {
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
  students: Student[] = [],
  teachers: Teacher[] = [],
  existingUsals: UsalRecord[] = []
): UsalRecord[] {
  if (!exam || !exam.id) return [];

  const safeStudents = Array.isArray(students) ? students : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const safeExistingUsals = Array.isArray(existingUsals) ? existingUsals : [];

  const existingMap = new Map<string, UsalRecord>();
  safeExistingUsals.forEach(r => {
    if (r && r.id) existingMap.set(r.id, r);
  });

  const targetClasses = (exam.className === 'All' || !exam.className)
    ? Array.from(new Set(
        safeStudents
          .map(s => s?.className)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      ))
    : [exam.className].filter((c): c is string => typeof c === 'string' && c.trim().length > 0);

  if (targetClasses.length === 0) {
    return [];
  }

  const newRecords: UsalRecord[] = [];

  targetClasses.forEach(cName => {
    if (!cName || typeof cName !== 'string') return;
    const cNameClean = cName.trim();
    const cNameLower = cNameClean.toLowerCase();

    const classStudents = safeStudents.filter(
      s => s && typeof s.className === 'string' && s.className.trim().toLowerCase() === cNameLower
    );
    const subjects = getCurriculumSubjectsForClass(cNameClean, safeStudents);
    const policy = getNectaPolicyForClass(cNameClean);

    // Identify streams in this class
    const streamSet = new Set<string>();
    classStudents.forEach(s => {
      const st = (s?.stream && typeof s.stream === 'string')
        ? s.stream.replace(/^STREAM\s+/i, '').trim().toUpperCase()
        : 'A';
      streamSet.add(st || 'A');
    });
    if (streamSet.size === 0) streamSet.add('A');

    const streams = Array.from(streamSet);

    subjects.forEach(subject => {
      if (!subject || typeof subject !== 'string') return;
      const subClean = subject.trim();
      const subLower = subClean.toLowerCase();

      streams.forEach(stream => {
        const streamClean = (stream || 'A').replace(/^STREAM\s+/i, '').trim().toUpperCase();
        const recordId = `usal_${exam.id}_${cNameClean.replace(/\s+/g, '_')}_${streamClean}_${subClean.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // If record already exists, preserve its current data (especially sealed state and entered marks)
        if (existingMap.has(recordId)) {
          return;
        }

        // Find assigned teacher
        const assignedTeacher = safeTeachers.find(t => {
          if (!t) return false;
          const teachesSubject = (t.subjects || []).some(s => {
            if (!s || typeof s !== 'string') return false;
            const sLower = s.toLowerCase();
            return (
              sLower === subLower ||
              subLower.includes(sLower) ||
              sLower.includes(subLower)
            );
          });
          if (!teachesSubject) return false;

          // Check stream if configured
          if (t.teachingStreams && Array.isArray(t.teachingStreams) && t.teachingStreams.length > 0) {
            return t.teachingStreams.some(ts => {
              if (!ts || typeof ts !== 'string') return false;
              const tsLower = ts.toLowerCase();
              return (
                tsLower.includes(cNameLower) && 
                (ts.toUpperCase().includes(streamClean) || ts.includes(stream))
              );
            });
          }
          return true;
        });

        // Filter candidates in this class & stream enrolled in this subject
        const candidatesInStream = classStudents.filter(s => {
          if (!s) return false;
          const sStream = (s.stream && typeof s.stream === 'string')
            ? s.stream.replace(/^STREAM\s+/i, '').trim().toUpperCase()
            : 'A';
          const matchStream = sStream === streamClean || streamClean === 'ALL';
          const enrolledInSubject = !s.subjects || !Array.isArray(s.subjects) || s.subjects.length === 0 || 
            s.subjects.some(sub => {
              if (!sub || typeof sub !== 'string') return false;
              const curSubLower = sub.toLowerCase();
              return curSubLower === subLower || curSubLower.includes(subLower) || subLower.includes(curSubLower);
            });
          return matchStream && enrolledInSubject;
        });

        // Build candidate records
        const candidates: UsalCandidateRecord[] = candidatesInStream.map(st => {
          const existingScore = st?.marks?.[subClean] ?? st?.marks?.[subject];
          const hasScore = typeof existingScore === 'number' && !isNaN(existingScore);
          const totalMarks = hasScore ? Math.min(100, Math.round(existingScore)) : 0;
          // Split into CA (30%) and Exam (70%) if total exists
          const caMarks = hasScore ? Math.round(totalMarks * 0.3) : 0;
          const examMarks = hasScore ? (totalMarks - caMarks) : 0;
          const gradeInfo = getGradeForScore(totalMarks, policy);

          return {
            studentId: st?.id || Date.now(),
            regNo: st?.regNo || '',
            studentName: st?.name || 'Mwanafunzi',
            gender: st?.gender || 'Unknown',
            stream: st?.stream || streamClean,
            caMarks,
            examMarks,
            totalMarks,
            grade: (gradeInfo?.grade || 'F') as any,
            points: gradeInfo?.points ?? 5,
            remarks: gradeInfo?.remark || 'Poor'
          };
        });

        const newUsal: UsalRecord = {
          id: recordId,
          examId: exam.id,
          examName: exam.name || 'Mtihani',
          academicYear: '2026',
          term: 'Term 1',
          className: cNameClean,
          stream: streamClean,
          subject: subClean,
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
  exams: Exam[] = [],
  students: Student[] = [],
  teachers: Teacher[] = [],
  existingUsals: UsalRecord[] = []
): UsalRecord[] {
  if (!Array.isArray(exams) || exams.length === 0) return existingUsals || [];

  const safeStudents = Array.isArray(students) ? students : [];
  const safeTeachers = Array.isArray(teachers) ? teachers : [];
  const safeExistingUsals = Array.isArray(existingUsals) ? existingUsals : [];

  let combined = [...safeExistingUsals];
  const existingIds = new Set(safeExistingUsals.map(u => u?.id).filter(Boolean));

  exams.forEach(exam => {
    if (!exam || !exam.id) return;
    try {
      const generated = generateUsalRecordsForExam(exam, safeStudents, safeTeachers, combined);
      generated.forEach(rec => {
        if (rec && rec.id && !existingIds.has(rec.id)) {
          existingIds.add(rec.id);
          combined.push(rec);
        }
      });
    } catch (err) {
      console.warn(`[USAL] Could not generate records for exam ${exam.id}:`, err);
    }
  });

  return combined;
}
