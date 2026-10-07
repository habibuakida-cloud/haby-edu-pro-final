import { CharacterTrait, ReportCardPeriodSetting, Student, StudentReportCardData, EducationLevel } from '../types';

/**
 * Helper to test if a level or className belongs to Primary School
 */
export function isPrimaryLevel(level?: string, className?: string): boolean {
  if (level === 'PRIMARY') return true;
  if (className && (
    className.startsWith('Standard') || 
    className.startsWith('Std') || 
    className.startsWith('Darasa')
  )) {
    return true;
  }
  return false;
}

/**
 * Helper to test if a level or className belongs to Pre-Primary / Nursery
 */
export function isPrePrimaryLevel(level?: string, className?: string): boolean {
  if (level === 'PRE_PRIMARY') return true;
  if (className && (
    className.startsWith('Nursery') || 
    className.startsWith('Baby') || 
    className.startsWith('Pre-Unit') || 
    className.includes('Awali')
  )) {
    return true;
  }
  return false;
}

/**
 * Checks if a class or student is either Primary or Pre-Primary
 */
export function isPrimaryOrNursery(level?: string, className?: string): boolean {
  return isPrimaryLevel(level, className) || isPrePrimaryLevel(level, className);
}

/**
 * Automatically determine EducationLevel from className
 */
export function getEducationLevelFromClass(className: string): EducationLevel {
  if (isPrePrimaryLevel(undefined, className)) return 'PRE_PRIMARY';
  if (isPrimaryLevel(undefined, className)) return 'PRIMARY';
  if (className === 'Form 5' || className === 'Form 6') return 'ACSEE';
  return 'CSEE';
}

/**
 * Tanzanian NECTA Primary School Subject Grading Scale (Standard 1 - 7 / PSLE / SFNA):
 * - A: 81 - 100% (Bora Sana / Distinction / Very Good)
 * - B: 61 - 80% (Nzuri Sana / Good / Above Average)
 * - C: 41 - 60% (Wastani / Average / Pass)
 * - D: 21 - 40% (Hafifu / Weak / Below Average)
 * - E: 0 - 20% (Hafifu Sana / Fail / Poor)
 */
export interface PrimaryGradeInfo {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  points: number;
  remark: string;
  swahiliRemark: string;
  color: string;
  bg: string;
  border: string;
}

export function getPrimarySubjectGradeInfo(score: number): PrimaryGradeInfo {
  const num = Math.min(100, Math.max(0, Math.round(score)));
  if (num >= 81) {
    return {
      score: num,
      grade: 'A',
      points: 1,
      remark: 'Distinction',
      swahiliRemark: 'Bora Sana (Ufaulu wa Juu)',
      color: '#15803d', // emerald-700
      bg: '#dcfce7',
      border: '#86efac'
    };
  }
  if (num >= 61) {
    return {
      score: num,
      grade: 'B',
      points: 2,
      remark: 'Very Good',
      swahiliRemark: 'Vizuri Sana',
      color: '#1d4ed8', // blue-700
      bg: '#dbeafe',
      border: '#93c5fd'
    };
  }
  if (num >= 41) {
    return {
      score: num,
      grade: 'C',
      points: 3,
      remark: 'Average / Pass',
      swahiliRemark: 'Average (Pass)',
      color: '#0369a1', // sky-700
      bg: '#e0f2fe',
      border: '#7dd3fc'
    };
  }
  if (num >= 21) {
    return {
      score: num,
      grade: 'D',
      points: 4,
      remark: 'Weak / Below Average',
      swahiliRemark: 'Below Average',
      color: '#b45309', // amber-700
      bg: '#fef3c7',
      border: '#fcd34d'
    };
  }
  return {
    score: num,
    grade: 'E',
    points: 5,
    remark: 'Fail',
    swahiliRemark: 'Fail',
    color: '#b91c1c', // red-700
    bg: '#fee2e2',
    border: '#fca5a5'
  };
}

export interface PrimaryScoreResult {
  total: number;
  maxPossibleTotal: number;
  average: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  gradeLabel: string;
  passStatus: 'AMEFAULU' | 'HAJAFAULU';
  passStatusLabel: string;
  gpa: number;
  scoredSubjectsCount: number;
  description: string;
}

export function calculatePrimaryScoreResult(marks: Record<string, number | undefined | null>): PrimaryScoreResult {
  const validEntries: { subject: string; score: number }[] = [];
  Object.entries(marks || {}).forEach(([subject, score]) => {
    if (typeof score === 'number' && !isNaN(score) && score >= 0) {
      validEntries.push({ subject, score });
    }
  });

  const count = validEntries.length;
  if (count === 0) {
    return {
      total: 0,
      maxPossibleTotal: 0,
      average: 0,
      overallGrade: 'E',
      gradeLabel: 'GRADE -',
      passStatus: 'HAJAFAULU',
      passStatusLabel: 'NO RESULTS',
      gpa: 0,
      scoredSubjectsCount: 0,
      description: 'No scores recorded'
    };
  }

  const total = validEntries.reduce((sum, item) => sum + item.score, 0);
  const average = Number((total / count).toFixed(1));
  const maxPossibleTotal = count * 100;

  let overallGrade: 'A' | 'B' | 'C' | 'D' | 'E' = 'E';
  let passStatus: 'AMEFAULU' | 'HAJAFAULU' = 'HAJAFAULU';
  let passStatusLabel = 'FAILED';

  if (average >= 81) {
    overallGrade = 'A';
    passStatus = 'AMEFAULU';
    passStatusLabel = 'PASSED (DISTINCTION)';
  } else if (average >= 61) {
    overallGrade = 'B';
    passStatus = 'AMEFAULU';
    passStatusLabel = 'PASSED (VERY GOOD)';
  } else if (average >= 41) {
    overallGrade = 'C';
    passStatus = 'AMEFAULU';
    passStatusLabel = 'PASSED';
  } else if (average >= 21) {
    overallGrade = 'D';
    passStatus = 'HAJAFAULU';
    passStatusLabel = 'FAILED (WEAK)';
  } else {
    overallGrade = 'E';
    passStatus = 'HAJAFAULU';
    passStatusLabel = 'FAILED';
  }

  const totalPoints = validEntries.reduce((sum, item) => sum + getPrimarySubjectGradeInfo(item.score).points, 0);
  const gpa = Number((totalPoints / count).toFixed(2));

  return {
    total,
    maxPossibleTotal,
    average,
    overallGrade,
    gradeLabel: `GRADE ${overallGrade}`,
    passStatus,
    passStatusLabel,
    gpa,
    scoredSubjectsCount: count,
    description: `Total: ${total}/${maxPossibleTotal} • Average: ${average}% (${overallGrade}) • ${passStatus === 'AMEFAULU' ? 'PASS' : 'FAIL'}`
  };
}

export interface SubjectGradeInfo {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  points: number;
  remark: string;
  swahiliRemark: string;
  color: string;
  bg: string;
  border: string;
}

export function getSubjectGradeInfo(score: number): SubjectGradeInfo {
  const num = Math.min(100, Math.max(0, Math.round(score)));
  // Official O-Level Grading: A=75-100, B=65-74, C=45-64, D=30-44, F=0-29
  if (num >= 75) {
    return {
      score: num,
      grade: 'A',
      points: 1,
      remark: 'Distinction',
      swahiliRemark: 'Bora Sana',
      color: '#15803d', // emerald-700
      bg: '#dcfce7',
      border: '#86efac'
    };
  }
  if (num >= 65) {
    return {
      score: num,
      grade: 'B',
      points: 2,
      remark: 'Very Good',
      swahiliRemark: 'Nzuri Sana',
      color: '#1d4ed8', // blue-700
      bg: '#dbeafe',
      border: '#93c5fd'
    };
  }
  if (num >= 45) {
    return {
      score: num,
      grade: 'C',
      points: 3,
      remark: 'Good',
      swahiliRemark: 'Nzuri',
      color: '#0369a1', // sky-700
      bg: '#e0f2fe',
      border: '#7dd3fc'
    };
  }
  if (num >= 30) {
    return {
      score: num,
      grade: 'D',
      points: 4,
      remark: 'Satisfactory',
      swahiliRemark: 'Inaridhisha',
      color: '#b45309', // amber-700
      bg: '#fef3c7',
      border: '#fcd34d'
    };
  }
  return {
    score: num,
    grade: 'F',
    points: 5,
    remark: 'Fail',
    swahiliRemark: 'Hajafaulu',
    color: '#b91c1c', // red-700
    bg: '#fee2e2',
    border: '#fca5a5'
  };
}

export interface OLevelDivisionResult {
  division: 'I' | 'II' | 'III' | 'IV' | '0' | 'INCOMPLETE';
  divisionLabel: string;
  points: number | null;
  scoredSubjectsCount: number;
  description: string;
}

/**
 * NECTA Official O-Level (CSEE) Division Calculator:
 * - Minimum 7 subjects with entered scores required.
 * - If fewer than 7 subjects scored: Result is 'INCOMPLETE'.
 * - If >= 7 subjects scored: Best of 7 subjects (lowest points sum: A=1, B=2, C=3, D=4, F=5)
 *   DIV I: 7-17 points
 *   DIV II: 18-21 points
 *   DIV III: 22-25 points
 *   DIV IV: 26-33 points
 *   DIV 0: 34-35 points (or > 35)
 */
/**
 * Sanitizes, deduplicates, and filters marks for a student based on their class level.
 * Prevents duplicates (e.g. 'Basic Mathematics' vs 'Mathematics', 'English Language' vs 'English Language (Primary)')
 * and strictly separates Secondary subjects from Primary/Nursery subjects.
 */
export function cleanAndFilterMarksForClass(
  rawMarks: Record<string, any> | undefined | null,
  className?: string,
  level?: EducationLevel
): Record<string, number> {
  if (!rawMarks || typeof rawMarks !== 'object') return {};

  const isNursery = isPrePrimaryLevel(level, className);
  const isPrimary = !isNursery && isPrimaryLevel(level, className);
  const isSecondary = !isNursery && !isPrimary;

  const result: Record<string, number> = {};

  const extractNum = (val: any): number | null => {
    if (typeof val === 'number' && !isNaN(val)) return Math.min(100, Math.max(0, Math.round(val)));
    if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
      return Math.min(100, Math.max(0, Math.round(Number(val))));
    }
    if (typeof val === 'object' && val !== null && typeof val.marks === 'number' && !isNaN(val.marks)) {
      return Math.min(100, Math.max(0, Math.round(val.marks)));
    }
    return null;
  };

  for (const [rawKey, rawVal] of Object.entries(rawMarks)) {
    const num = extractNum(rawVal);
    if (num === null) continue;

    const lower = rawKey.trim().toLowerCase();

    if (isSecondary) {
      // Primary-only & Nursery subjects must NOT be present in secondary results
      const primaryOnly = [
        'sayansi na teknolojia', 'science and technology', 'science & technology',
        'maarifa ya jamii', 'social studies', 'uraia na maadili', 'civic and moral',
        'stadi za kazi', 'vocational skills', 'kusoma', 'kuandika', 'kuhesabu',
        'afya na mazingira', 'sanaa na michezo', 'kuhesabu na namba', 'kusoma na kuwasiliana',
        'lugha ya kiingereza ya awali', 'afya na mazingira ya mtoto',
        'sanaa, muziki na michezo ya awali', 'maadili na malezi bora',
        'awali.num', 'awali.lit', 'awali.eng', 'awali.env', 'awali.art', 'awali.soc',
        'eng.pri', 'english language (primary)'
      ];
      if (primaryOnly.some(p => lower === p || lower.startsWith(p))) {
        continue;
      }

      // Canonicalize Secondary subjects (merge Mathematics and Basic Mathematics into Basic Mathematics)
      let canonical = rawKey.trim();

      if (lower === 'basic mathematics' || lower === 'mathematics' || lower === 'b.math' || lower === 'basic maths' || lower === 'maths' || lower === 'hisabati') {
        canonical = 'Basic Mathematics';
      } else if (lower === 'english language' || lower === 'english' || lower === 'eng') {
        canonical = 'English Language';
      } else if (lower === 'kiswahili' || lower === 'kis' || lower === 'kisw') {
        canonical = 'Kiswahili';
      } else if (lower === 'biology' || lower === 'bio') {
        canonical = 'Biology';
      } else if (lower === 'chemistry' || lower === 'che' || lower === 'chem') {
        canonical = 'Chemistry';
      } else if (lower === 'physics' || lower === 'phy' || lower === 'phys') {
        canonical = 'Physics';
      } else if (lower === 'geography' || lower === 'geo' || lower === 'geog') {
        canonical = 'Geography';
      } else if (lower === 'history' || lower === 'his' || lower === 'hist') {
        canonical = 'History';
      } else if (lower === 'civics' || lower === 'civ') {
        canonical = 'Civics';
      } else if (lower === 'commerce' || lower === 'comm' || lower === 'com') {
        canonical = 'Commerce';
      } else if (lower === 'book keeping' || lower === 'bookkeeping' || lower === 'b.keep' || lower === 'bk') {
        canonical = 'Book Keeping';
      } else if (lower === 'literature in english' || lower === 'literature' || lower === 'lit') {
        canonical = 'Literature in English';
      } else if (lower === 'agriculture' || lower === 'agri') {
        canonical = 'Agriculture';
      } else if (lower === 'computer studies' || lower === 'comp' || lower === 'computer' || lower === 'ict / tehama' || lower === 'tehama') {
        canonical = 'Computer Studies';
      } else if (lower === 'fine art' || lower === 'f.art' || lower === 'art') {
        canonical = 'Fine Art';
      } else if (lower === 'historia ya tanzania na maadili' || lower === 'h.tz') {
        canonical = 'Historia Ya Tanzania Na Maadili';
      } else if (lower === 'elimu ya dini ya kiislamu' || lower === 'islamic knowledge' || lower === 'islamic religious education' || lower === 'e.dini' || lower === 'edk') {
        canonical = 'Elimu ya Dini ya Kiislamu';
      } else if (lower === 'christian religious education' || lower === 'bible knowledge' || lower === 'cre' || lower === 'elimu ya dini ya kikristo' || lower === 'edkri') {
        canonical = 'Christian Religious Education';
      } else if (lower === 'french' || lower === 'fre' || lower === 'french (kifaransa)' || lower === 'kifaransa') {
        canonical = 'French';
      } else if (lower === 'arabic' || lower === 'ara') {
        canonical = 'Arabic';
      } else if (lower === 'physical education' || lower === 'pe') {
        canonical = 'Physical Education';
      } else if (lower === 'mikondo' || lower === 'mik') {
        canonical = 'Mikondo';
      }

      // Deduplicate: If key exists, take maximum or non-empty score
      if (result[canonical] === undefined) {
        result[canonical] = num;
      } else {
        result[canonical] = Math.max(result[canonical], num);
      }
    } else if (isPrimary) {
      // Secondary-only subjects must NOT be present in primary results
      const secondaryOnly = [
        'physics', 'chemistry', 'biology', 'civics', 'commerce', 'book keeping',
        'literature in english', 'agriculture', 'basic applied mathematics',
        'advanced mathematics', 'economics', 'accountancy', 'general studies', 'divinity'
      ];
      if (secondaryOnly.some(s => lower === s || lower.startsWith(s))) {
        continue;
      }

      let canonical = rawKey.trim();

      if (lower === 'hisabati' || lower === 'hisabati (mathematics)' || lower === 'mathematics (hisabati)' || lower === 'mathematics' || lower === 'basic mathematics' || lower === 'b.math' || lower === 'his') {
        canonical = 'Hisabati (Mathematics)';
      } else if (lower === 'english language' || lower === 'english language (primary)' || lower === 'english' || lower === 'eng.pri' || lower === 'eng') {
        canonical = 'English Language';
      } else if (lower === 'kiswahili' || lower === 'kisw' || lower === 'kis') {
        canonical = 'Kiswahili';
      } else if (lower.includes('sayansi') || lower.includes('science')) {
        canonical = 'Sayansi na Teknolojia';
      } else if (lower.includes('maarifa ya jamii') || lower.includes('social studies')) {
        canonical = 'Maarifa ya Jamii';
      } else if (lower.includes('uraia na maadili') || lower.includes('civic and moral')) {
        canonical = 'Uraia na Maadili';
      } else if (lower.includes('stadi za kazi') || lower.includes('vocational skills')) {
        canonical = 'Stadi za Kazi';
      } else if (lower.includes('kusoma') || lower === 'reading') {
        canonical = 'Kusoma';
      } else if (lower.includes('kuandika') || lower === 'writing') {
        canonical = 'Kuandika';
      } else if (lower.includes('kuhesabu') || lower === 'arithmetic') {
        canonical = 'Kuhesabu';
      } else if (lower.includes('afya na mazingira')) {
        canonical = 'Afya na Mazingira';
      } else if (lower.includes('sanaa na michezo')) {
        canonical = 'Sanaa na Michezo';
      } else if (lower.includes('dini ya kiislamu') || lower === 'edk') {
        canonical = 'Elimu ya Dini ya Kiislamu';
      } else if (lower.includes('dini ya kikristo') || lower === 'edkri') {
        canonical = 'Elimu ya Dini ya Kikristo';
      } else if (lower.includes('tehama') || lower.includes('ict')) {
        canonical = 'TEHAMA (ICT)';
      } else if (lower === 'mikondo' || lower === 'mik') {
        canonical = 'Mikondo';
      }

      if (result[canonical] === undefined) {
        result[canonical] = num;
      } else {
        result[canonical] = Math.max(result[canonical], num);
      }
    } else {
      // Nursery
      result[rawKey.trim()] = num;
    }
  }

  return result;
}

export function calculateOLevelDivision(marks: Record<string, number | undefined | null>, className?: string): OLevelDivisionResult {
  const cleanMarks = cleanAndFilterMarksForClass(marks, className || 'Form 1');
  const validScores: number[] = Object.values(cleanMarks);

  const scoredSubjectsCount = validScores.length;

  if (scoredSubjectsCount === 0) {
    return {
      division: 'INCOMPLETE',
      divisionLabel: '-',
      points: null,
      scoredSubjectsCount: 0,
      description: 'No scores recorded'
    };
  }

  // Convert each score to its grade points (A=1, B=2, C=3, D=4, F=5)
  const pointsList = validScores.map(score => getSubjectGradeInfo(score).points);
  // Sort ascending: lowest points first = best performance
  pointsList.sort((a, b) => a - b);

  // If fewer than 7 subjects scored, fill missing subjects up to 7 with Grade F (5 points) per standard NECTA regulations
  const paddedList = [...pointsList];
  while (paddedList.length < 7) {
    paddedList.push(5);
  }

  // Take the Best 7 subjects
  const best7 = paddedList.slice(0, 7);
  const best7Points = best7.reduce((sum, p) => sum + p, 0);

  let division: 'I' | 'II' | 'III' | 'IV' | '0' = '0';
  let description = '';

  if (best7Points >= 7 && best7Points <= 17) {
    division = 'I';
    description = `Division I (Points: ${best7Points})`;
  } else if (best7Points >= 18 && best7Points <= 21) {
    division = 'II';
    description = `Division II (Points: ${best7Points})`;
  } else if (best7Points >= 22 && best7Points <= 25) {
    division = 'III';
    description = `Division III (Points: ${best7Points})`;
  } else if (best7Points >= 26 && best7Points <= 33) {
    division = 'IV';
    description = `Division IV (Points: ${best7Points})`;
  } else {
    division = '0';
    description = `Division 0 (Points: ${best7Points})`;
  }

  return {
    division,
    divisionLabel: `DIV ${division}`,
    points: best7Points,
    scoredSubjectsCount,
    description
  };
}

export function getDivisionFromAverage(avg: number): string {
  if (avg >= 75) return 'I';
  if (avg >= 65) return 'II';
  if (avg >= 45) return 'III';
  if (avg >= 30) return 'IV';
  return '0';
}

export function getDivisionDescription(div: string): string {
  switch (div) {
    case 'I':
      return 'Division One (Distinction)';
    case 'II':
      return 'Division Two (Credit)';
    case 'III':
      return 'Division Three (Pass)';
    case 'IV':
      return 'Division Four (Subsidiary Pass)';
    case 'INCOMPLETE':
    case 'INC':
      return 'Incomplete Result (Fewer than 7 subjects scored)';
    default:
      return 'Division Zero (Unclassified / Fail)';
  }
}

export interface PerformanceSummary {
  total: number;
  average: number;
  division: string;
  divisionDesc: string;
  pointsTotal: number;
  best7Points: number | null;
  gpa: number;
  subjectCount: number;
  gradeCounts: { A: number; B: number; C: number; D: number; F: number };
  status: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'PASS' | 'WARNING';
}

export function calculatePerformanceSummary(
  marks: Record<string, number>,
  level?: EducationLevel,
  className?: string
): PerformanceSummary {
  const cleanedMarks = cleanAndFilterMarksForClass(marks, className, level);
  const entries = Object.entries(cleanedMarks);
  const subjectCount = entries.length;
  
  if (subjectCount === 0) {
    return {
      total: 0,
      average: 0,
      division: 'INCOMPLETE',
      divisionDesc: 'No Marks Recorded',
      pointsTotal: 0,
      best7Points: null,
      gpa: 0,
      subjectCount: 0,
      gradeCounts: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      status: 'WARNING'
    };
  }

  // Check if Primary or Pre-Primary (Tanzanian NECTA Primary Scale: A=81-100, B=61-80, C=41-60, D=21-40, E=0-20)
  if (isPrimaryOrNursery(level, className)) {
    const primaryRes = calculatePrimaryScoreResult(cleanedMarks);
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    entries.forEach(([, score]) => {
      const pInfo = getPrimarySubjectGradeInfo(score);
      if (pInfo.grade === 'E') {
        gradeCounts['F']++;
      } else {
        gradeCounts[pInfo.grade]++;
      }
    });

    let status: PerformanceSummary['status'] = 'PASS';
    if (primaryRes.overallGrade === 'A') status = 'EXCELLENT';
    else if (primaryRes.overallGrade === 'B') status = 'VERY_GOOD';
    else if (primaryRes.overallGrade === 'C') status = 'GOOD';
    else if (primaryRes.overallGrade === 'D') status = 'PASS';
    else status = 'WARNING';

    return {
      total: primaryRes.total,
      average: primaryRes.average,
      division: primaryRes.overallGrade,
      divisionDesc: `${primaryRes.passStatus} (${primaryRes.passStatusLabel})`,
      pointsTotal: Math.round(primaryRes.gpa * subjectCount),
      best7Points: null,
      gpa: primaryRes.gpa,
      subjectCount,
      gradeCounts,
      status
    };
  }

  let total = 0;
  let pointsTotal = 0;
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  entries.forEach(([, score]) => {
    const info = getSubjectGradeInfo(score);
    total += info.score;
    pointsTotal += info.points;
    gradeCounts[info.grade]++;
  });

  const average = Number((total / subjectCount).toFixed(1));
  const divResult = calculateOLevelDivision(marks);
  const division = divResult.division;
  const divisionDesc = divResult.description;
  const gpa = Number((pointsTotal / subjectCount).toFixed(2));

  let status: PerformanceSummary['status'] = 'PASS';
  if (division === 'I' || average >= 75) status = 'EXCELLENT';
  else if (division === 'II' || average >= 65) status = 'VERY_GOOD';
  else if (division === 'III' || average >= 45) status = 'GOOD';
  else if (division === 'IV' || average >= 30) status = 'PASS';
  else status = 'WARNING';

  return {
    total,
    average,
    division,
    divisionDesc,
    pointsTotal: divResult.points ?? pointsTotal,
    best7Points: divResult.points,
    gpa,
    subjectCount,
    gradeCounts,
    status
  };
}

export const DEFAULT_CHARACTER_TRAITS: CharacterTrait[] = [
  {
    id: 'discipline',
    name: 'Discipline & General Conduct',
    swahiliName: 'Nidhamu na Tabia Njema',
    grade: 'A',
    remark: 'Demonstrates exemplary self-discipline and adherence to school regulations.'
  },
  {
    id: 'punctuality',
    name: 'Punctuality & Period Attendance',
    swahiliName: 'Kuwahi na Kuhudhuria Vipindi',
    grade: 'A',
    remark: 'Consistently punctual to morning assembly and all scheduled lesson periods.'
  },
  {
    id: 'diligence',
    name: 'Diligence & Academic Effort',
    swahiliName: 'Bidii ya Kujisomea na Masomo',
    grade: 'A',
    remark: 'Exhibits high concentration, completes assignments on time, and reads widely.'
  },
  {
    id: 'leadership',
    name: 'Leadership & Responsibility',
    swahiliName: 'Uongozi na Uwajibikaji',
    grade: 'B',
    remark: 'Takes positive initiative and fulfills assigned class and school duties diligently.'
  },
  {
    id: 'teamwork',
    name: 'Cooperation & Teamwork',
    swahiliName: 'Ushirikiano na Wenzake',
    grade: 'A',
    remark: 'Maintains harmonious relationships with peers and participates actively in group discussions.'
  },
  {
    id: 'respect',
    name: 'Respect & Courtesy',
    swahiliName: 'Heshima na Utii kwa Walimu na Wenzake',
    grade: 'A',
    remark: 'Polite and respectful to teaching staff, support personnel, and fellow students.'
  },
  {
    id: 'property_care',
    name: 'Care of Environment & School Property',
    swahiliName: 'Kutunza Mazingira na Mali ya Shule',
    grade: 'A',
    remark: 'Responsible caretaker of classroom furniture, textbooks, and surrounding compound.'
  },
  {
    id: 'extra_curricular',
    name: 'Sports & Extra-Curricular Participation',
    swahiliName: 'Michezo na Vilabu vya Shule',
    grade: 'B',
    remark: 'Participates positively in Wednesday games, debates, and club activities.'
  }
];

/**
 * Automatically synthesizes the student character & behavioral assessment
 * aligned to their academic performance, attendance, and evaluation cycle.
 */
export function generateCharacterFromPerformance(
  average: number,
  division: string,
  attendancePercentage: number = 96
): {
  overallConductGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallConductRemark: string;
  traits: CharacterTrait[];
} {
  let condGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  let overallRemark = '';

  if (average >= 75 || division === 'I') {
    condGrade = 'A';
    overallRemark = 'Exemplary conduct and outstanding intellectual curiosity. Serves as a role model to peers.';
  } else if (average >= 62 || division === 'II') {
    condGrade = 'B';
    overallRemark = 'Very good behavior, respectful conduct, and focused dedication to scheduled periods.';
  } else if (average >= 45 || division === 'III') {
    condGrade = 'B';
    overallRemark = 'Good and polite conduct; encouraged to show more proactive academic curiosity in lesson periods.';
  } else if (average >= 35 || division === 'IV') {
    condGrade = 'C';
    overallRemark = 'Satisfactory behavior; requires stricter supervision during self-study and remedial periods.';
  } else {
    condGrade = 'C';
    overallRemark = 'Needs closer guidance and academic counseling to avoid losing focus during teaching periods.';
  }

  const puncGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 
    attendancePercentage >= 95 ? 'A' : attendancePercentage >= 85 ? 'B' : attendancePercentage >= 75 ? 'C' : 'D';

  const traits: CharacterTrait[] = [
    {
      id: 'discipline',
      name: 'Discipline & General Conduct',
      swahiliName: 'Nidhamu na Tabia Njema',
      grade: condGrade,
      remark: condGrade === 'A'
        ? 'Exemplary obedience, integrity, and strict adherence to school regulations.'
        : condGrade === 'B'
        ? 'Well-behaved, cooperative, and respectful to school authority.'
        : 'Satisfactory conduct; needs to maintain steady focus throughout all periods.'
    },
    {
      id: 'punctuality',
      name: 'Punctuality & Period Attendance',
      swahiliName: 'Kuwahi na Kuhudhuria Vipindi',
      grade: puncGrade,
      remark: puncGrade === 'A'
        ? `Consistently on time for all morning roll-calls and lesson periods (${attendancePercentage}% attendance).`
        : `Regular attendance with minor occasional delays (${attendancePercentage}% attendance).`
    },
    {
      id: 'diligence',
      name: 'Diligence & Academic Effort',
      swahiliName: 'Bidii ya Kujisomea na Masomo',
      grade: average >= 75 ? 'A' : average >= 60 ? 'B' : average >= 45 ? 'C' : 'D',
      remark: average >= 75
        ? 'Outstanding personal drive, completes all academic exercises thoroughly.'
        : average >= 60
        ? 'Shows good effort in classwork; capable of reaching distinction with extra practice.'
        : 'Effort is satisfactory but irregular; must devote more evening periods to revision.'
    },
    {
      id: 'leadership',
      name: 'Leadership & Responsibility',
      swahiliName: 'Uongozi na Uwajibikaji',
      grade: average >= 70 ? 'A' : 'B',
      remark: average >= 70
        ? 'Natural class leader who inspires classmates and leads study groups effectively.'
        : 'Willingly accepts class assignments and assists teachers with responsibility.'
    },
    {
      id: 'teamwork',
      name: 'Cooperation & Teamwork',
      swahiliName: 'Ushirikiano na Wenzake',
      grade: 'A',
      remark: 'Works productively in laboratory experiments and peer study circles.'
    },
    {
      id: 'respect',
      name: 'Respect & Courtesy',
      swahiliName: 'Heshima na Utii kwa Walimu na Wenzake',
      grade: 'A',
      remark: 'Polite, humble, and exhibits courteous communication towards teachers and staff.'
    },
    {
      id: 'property_care',
      name: 'Care of Environment & School Property',
      swahiliName: 'Kutunza Mazingira na Mali ya Shule',
      grade: 'A',
      remark: 'Active participant in Friday environmental cleaning and cares for laboratory equipment.'
    },
    {
      id: 'extra_curricular',
      name: 'Sports & Extra-Curricular Participation',
      swahiliName: 'Michezo na Vilabu vya Shule',
      grade: 'B',
      remark: 'Enthusiastically engages in sports, debates, and club activities.'
    }
  ];

  return {
    overallConductGrade: condGrade,
    overallConductRemark: overallRemark,
    traits
  };
}

export function getDefaultPeriodSetting(): ReportCardPeriodSetting {
  return {
    termName: 'Term II - Terminal Examination',
    academicYear: '2025/2026',
    evaluationPeriod: 'July - November 2026',
    totalPeriods: 240,
    attendedPeriods: 234,
    nextTermBegins: '12 January 2027'
  };
}

/**
 * Check if two class names refer to the same class level (e.g. "Class 4", "Standard 4", "Std 4" vs "Form 4")
 * Strictly segregates Secondary (Form 1-6) from Primary (Class 1-7) to prevent cross-class data mixing.
 */
export function isSameClass(c1?: string, c2?: string): boolean {
  if (!c1 || !c2) return false;
  const n1 = c1.trim().toLowerCase().replace(/\s+/g, ' ');
  const n2 = c2.trim().toLowerCase().replace(/\s+/g, ' ');
  if (n1 === n2) return true;

  // Distinguish Secondary (Form 1-6) vs Primary (Standard / Class 1-7) vs Nursery
  const isForm1 = /(?:form|kidato|f)\s*(\d+|iv|iii|ii|i|vi|v)/i.test(n1);
  const isForm2 = /(?:form|kidato|f)\s*(\d+|iv|iii|ii|i|vi|v)/i.test(n2);
  if (isForm1 !== isForm2) {
    // One is secondary Form and the other is Primary Class -> NEVER MATCH!
    return false;
  }

  if (isForm1 && isForm2) {
    const getFormNum = (s: string) => {
      const m = s.match(/(?:form|kidato|f)\s*(\d+|iv|iii|ii|i|vi|v)/i);
      if (!m) return null;
      const val = m[1].toLowerCase();
      if (val === 'iv') return '4';
      if (val === 'iii') return '3';
      if (val === 'ii') return '2';
      if (val === 'i') return '1';
      if (val === 'vi') return '6';
      if (val === 'v') return '5';
      return val;
    };
    const f1 = getFormNum(n1);
    const f2 = getFormNum(n2);
    return !!f1 && !!f2 && f1 === f2;
  }

  // Primary: Class / Standard / Std / Darasa
  const isPri1 = /(?:standard|std|class|darasa(?: la)?)\s*(\d+)/i.test(n1);
  const isPri2 = /(?:standard|std|class|darasa(?: la)?)\s*(\d+)/i.test(n2);
  if (isPri1 && isPri2) {
    const getStdNum = (s: string) => {
      const m = s.match(/(?:standard|std|class|darasa(?: la)?)\s*(\d+)/i);
      return m ? m[1] : null;
    };
    const std1 = getStdNum(n1);
    const std2 = getStdNum(n2);
    return !!std1 && !!std2 && std1 === std2;
  }

  // Nursery / Pre-primary
  const isNur1 = /(?:nursery|baby|middle|pre-unit|awali)/i.test(n1);
  const isNur2 = /(?:nursery|baby|middle|pre-unit|awali)/i.test(n2);
  if (isNur1 || isNur2) {
    const cleanNur = (s: string) => s.toLowerCase().replace(/\s*(class|darasa|mkondo)\s*/gi, '').replace(/[-\s]/g, '').trim();
    return cleanNur(n1) === cleanNur(n2);
  }

  return false;
}

/**
 * Calculate student rank / position within their class and stream with tie handling (1, 2, 2, 4)
 * Formats clearly as e.g. "1/45".
 */
export function calculateStudentRank(
  student: Student,
  allStudents: Student[]
): { position: number; totalStudents: number; rankText: string } {
  const classmates = allStudents.filter(
    s => isSameClass(s.className, student.className) && (!student.stream || !s.stream || s.stream === student.stream)
  );
  
  const pool = classmates.length > 0 ? classmates : (allStudents.length > 0 ? allStudents : [student]);

  const getScore = (st: Student) => {
    if (typeof st.total === 'number' && !isNaN(st.total)) return st.total;
    if (st.marks && typeof st.marks === 'object') {
      const nums = Object.values(st.marks).map(Number).filter(n => !isNaN(n));
      if (nums.length > 0) return nums.reduce((acc, v) => acc + v, 0);
    }
    return 0;
  };

  // Sort descending by total score
  const sorted = [...pool].sort((a, b) => getScore(b) - getScore(a));

  // Calculate ranks with standard tie handling (1, 2, 2, 4)
  let currentRank = 1;
  let targetRank = 1;
  let prevScore: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const score = getScore(s);
    
    if (prevScore === null) {
      currentRank = 1;
    } else if (score < prevScore) {
      currentRank = i + 1; // standard competition rank: skip if ties preceded (e.g. 1, 2, 2, 4)
    }

    prevScore = score;

    if (String(s.id) === String(student.id) || (s.regNo && s.regNo === student.regNo)) {
      targetRank = currentRank;
      break;
    }
  }

  const totalStudents = sorted.length;
  const rankText = `${targetRank}/${totalStudents}`;

  return { position: targetRank, totalStudents, rankText };
}
