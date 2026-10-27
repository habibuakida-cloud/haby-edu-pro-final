import { JointExam, JointResult, JointSchool, isPrimaryEducationLevel } from './JointExamModuleView';

export interface SchoolGpaRankingRow extends JointSchool {
  studentCount: number;
  satCount: number;
  meanAvg: number;
  highestAvg: number;
  passRate: number;
  schoolGpa: number;
  schoolGpaFormatted: string;
  schoolGpaGrade: string;
  schoolGpaRemark: string;
  schoolGpaColorClass: string;
  divCounts: {
    I: number;
    II: number;
    III: number;
    IV: number;
    '0': number;
  };
  gradeCounts: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
  };
  bestStudent: JointResult | null;
  schoolPosition: number;
  totalSchools: number;
}

export function computeNectaGradeAndPoints(
  score: number,
  isPrimary = false
): { grade: string; points: number } {
  const r = Math.round(score);
  if (isPrimary) {
    if (r >= 81) return { grade: 'A', points: 1 };
    if (r >= 61) return { grade: 'B', points: 2 };
    if (r >= 41) return { grade: 'C', points: 3 };
    if (r >= 21) return { grade: 'D', points: 4 };
    return { grade: 'E', points: 5 };
  }
  if (r >= 75) return { grade: 'A', points: 1 };
  if (r >= 65) return { grade: 'B', points: 2 };
  if (r >= 45) return { grade: 'C', points: 3 };
  if (r >= 30) return { grade: 'D', points: 4 };
  return { grade: 'F', points: 5 };
}

export function getNectaGpaClassification(
  gpa: number,
  hasSatCandidates = true,
  isPrimary = false
): {
  grade: string;
  remark: string;
  badgeClass: string;
} {
  if (!hasSatCandidates || Number.isNaN(gpa)) {
    return {
      grade: '-',
      remark: 'Bado Alama',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    };
  }
  if (gpa <= 1.4999) {
    return {
      grade: 'A',
      remark: 'Bora Sana (Excellent)',
      badgeClass: 'bg-emerald-700 text-white border-emerald-800',
    };
  }
  if (gpa <= 2.4999) {
    return {
      grade: 'B',
      remark: 'Vizuri Sana (Very Good)',
      badgeClass: 'bg-blue-700 text-white border-blue-800',
    };
  }
  if (gpa <= 3.4999) {
    return {
      grade: 'C',
      remark: 'Vizuri (Good)',
      badgeClass: 'bg-amber-500 text-slate-950 border-amber-600',
    };
  }
  if (gpa <= 4.4999) {
    return {
      grade: 'D',
      remark: 'Inaridhisha (Satisfactory)',
      badgeClass: 'bg-orange-600 text-white border-orange-700',
    };
  }
  return {
    grade: isPrimary ? 'E' : 'F',
    remark: 'Dhaifu (Fail)',
    badgeClass: 'bg-rose-700 text-white border-rose-800',
  };
}

export function getStudentRegisteredSubjects(
  row: {
    registeredSubjects?: string[];
    subjectGrades?: Record<string, any>;
    subjectMarks?: Record<string, any>;
  },
  examSubjects: string[]
): string[] {
  if (Array.isArray(row.registeredSubjects) && row.registeredSubjects.length > 0) {
    return row.registeredSubjects;
  }
  const fromGrades = (row.subjectGrades as any)?.__registeredSubjects;
  if (Array.isArray(fromGrades) && fromGrades.length > 0) {
    return fromGrades;
  }
  return examSubjects;
}

export function computeStudentGpaFromResult(
  row: JointResult,
  examSubjects: string[],
  isPrimary = false
): number {
  if (typeof (row as any).gpa === 'number' && !Number.isNaN((row as any).gpa) && row.subjectsSat > 0) {
    return (row as any).gpa;
  }
  const fromGrades = (row.subjectGrades as any)?.__gpa;
  if (typeof fromGrades === 'number' && !Number.isNaN(fromGrades) && row.subjectsSat > 0) {
    return fromGrades;
  }

  const regSubjs = getStudentRegisteredSubjects(row, examSubjects);
  const regSet = new Set(regSubjs.map((s) => s.toUpperCase()));
  const subjsToCheck = examSubjects.length > 0 ? examSubjects : Object.keys(row.subjectMarks || {});

  const points: number[] = [];
  for (const subj of subjsToCheck) {
    if (regSet.size > 0 && !regSet.has(subj.toUpperCase())) continue;
    const raw = row.subjectMarks?.[subj];
    if (raw !== undefined && raw !== null && String(raw) !== '') {
      const num = Number(raw);
      if (!Number.isNaN(num) && num >= 0 && num <= 100) {
        points.push(computeNectaGradeAndPoints(num, isPrimary).points);
      }
    }
  }

  if (points.length === 0) return 5.0;
  // When exam has >= 7 subjects and student sat >= 7 subjects, use best 7 points / 7; below 7 subjects use mean of sat points
  if (examSubjects.length >= 7 && points.length >= 7) {
    const best7Sum = [...points].sort((a, b) => a - b).slice(0, 7).reduce((a, b) => a + b, 0);
    return Number((best7Sum / 7).toFixed(4));
  }

  const sum = points.reduce((a, b) => a + b, 0);
  return Number((sum / points.length).toFixed(4));
}

/**
 * Computes the School-Level GPA Ranking Leaderboard across all participating schools.
 * In NECTA standard, a lower GPA (closer to 1.0000) is higher performance.
 * Schools with sat students are ranked #1 to #N by lowest School GPA first, then highest Mean Average (%).
 */
export function computeSchoolGpaLeaderboard(
  schools: JointSchool[],
  results: JointResult[],
  examSubjects: string[],
  isPrimary = false
): SchoolGpaRankingRow[] {
  const passThreshold = isPrimary ? 41 : 30;
  const totalSchools = schools.length;

  const rawStats = schools.map((sch) => {
    const schResults = results.filter((r) => r.jointSchoolId === sch.id);
    const studentCount = schResults.length;
    const satResults = schResults.filter((r) => (r.subjectsSat ?? 0) > 0 || Object.keys(r.subjectMarks || {}).length > 0);
    const satCount = satResults.length;

    const meanAvg =
      satCount > 0
        ? Number(
            (satResults.reduce((s, r) => s + Number(r.averageScore || 0), 0) / satCount).toFixed(2)
          )
        : 0;

    const highestAvg =
      satCount > 0
        ? Number(Math.max(...satResults.map((r) => Number(r.averageScore || 0))).toFixed(1))
        : 0;

    const passCount = satResults.filter((r) => Number(r.averageScore || 0) >= passThreshold).length;
    const passRate = satCount > 0 ? Number(((passCount / satCount) * 100).toFixed(1)) : 0;

    // Compute School GPA from all students who sat the examination in this school
    const studentGpas = satResults.map((r) => computeStudentGpaFromResult(r, examSubjects, isPrimary));
    const schoolGpa =
      satCount > 0
        ? Number((studentGpas.reduce((a, b) => a + b, 0) / satCount).toFixed(4))
        : 5.0;

    const gpaClass = getNectaGpaClassification(schoolGpa, satCount > 0, isPrimary);

    const canCalcDiv = examSubjects.length >= 7;
    const divCounts = {
      I: canCalcDiv ? satResults.filter((r) => (r.subjectsSat ?? 0) >= 7 && r.division === 'I').length : 0,
      II: canCalcDiv ? satResults.filter((r) => (r.subjectsSat ?? 0) >= 7 && r.division === 'II').length : 0,
      III: canCalcDiv ? satResults.filter((r) => (r.subjectsSat ?? 0) >= 7 && r.division === 'III').length : 0,
      IV: canCalcDiv ? satResults.filter((r) => (r.subjectsSat ?? 0) >= 7 && r.division === 'IV').length : 0,
      '0': canCalcDiv ? satResults.filter((r) => (r.subjectsSat ?? 0) >= 7 && r.division === '0').length : 0,
    };

    const gradeCounts = {
      A: satResults.filter((r) => r.overallGrade === 'A').length,
      B: satResults.filter((r) => r.overallGrade === 'B').length,
      C: satResults.filter((r) => r.overallGrade === 'C').length,
      D: satResults.filter((r) => r.overallGrade === 'D').length,
      E: satResults.filter((r) => r.overallGrade === 'E').length,
      F: satResults.filter((r) => r.overallGrade === 'F').length,
    };

    const bestStudent = [...satResults].sort((a, b) => a.overallRank - b.overallRank)[0] || null;

    return {
      ...sch,
      studentCount,
      satCount,
      meanAvg,
      highestAvg,
      passRate,
      schoolGpa,
      schoolGpaFormatted: satCount > 0 ? schoolGpa.toFixed(4) : '-',
      schoolGpaGrade: gpaClass.grade,
      schoolGpaRemark: gpaClass.remark,
      schoolGpaColorClass: gpaClass.badgeClass,
      divCounts,
      gradeCounts,
      bestStudent,
      schoolPosition: 1,
      totalSchools,
    };
  });

  // Sort schools:
  // 1. Schools with satCount > 0 come before schools with satCount === 0
  // 2. Lower School GPA wins (1.0000 is best, 5.0000 is lowest)
  // 3. Higher Mean Average (%) breaks ties
  rawStats.sort((a, b) => {
    if (a.satCount > 0 && b.satCount === 0) return -1;
    if (a.satCount === 0 && b.satCount > 0) return 1;
    if (a.satCount > 0 && b.satCount > 0) {
      if (Math.abs(a.schoolGpa - b.schoolGpa) > 0.00001) {
        return a.schoolGpa - b.schoolGpa;
      }
      if (b.meanAvg !== a.meanAvg) {
        return b.meanAvg - a.meanAvg;
      }
    }
    return a.schoolCode.localeCompare(b.schoolCode);
  });

  return rawStats.map((st, idx) => ({
    ...st,
    schoolPosition: idx + 1,
    totalSchools,
  }));
}

export const SAMPLE_TANZANIAN_FIRST_NAMES_M = [
  'JUMA', 'BARAKA', 'EMMANUEL', 'KELVIN', 'IBRAHIM', 'GODFREY', 'HASSAN', 'DANIEL', 'SAMWEL', 'FRANK',
  'ALLY', 'MOHAMED', 'JOSEPH', 'ERICK', 'DAVID', 'PETER', 'RAMADHANI', 'SALUM', 'DENIS', 'MICHAEL',
];

export const SAMPLE_TANZANIAN_FIRST_NAMES_F = [
  'NEEMA', 'ASHA', 'FATUMA', 'GRACE', 'REHEMA', 'UPENDO', 'ZAINABU', 'GLORY', 'MARIAM', 'IRENE',
  'HALIMA', 'JOYCE', 'HAPPY', 'ESTER', 'SALMA', 'DIANA', 'MWANAIDI', 'ANNA', 'LIGHTNESS', 'VERONICA',
];

export const SAMPLE_TANZANIAN_SURNAMES = [
  'MWAKASEGE', 'KILEO', 'MSUYA', 'NGONYANI', 'MBWANA', 'SHOO', 'KOMBA', 'MASSAWE', ' ABDALLAH', 'BAKARI',
  'LYIMO', 'MTUI', 'URASSA', 'MMARI', 'NDELWA', 'KASSIM', 'SULEIMAN', 'MOLLEL', 'TARIMO', 'MDEE',
];

export function generateRealisticStudentName(index: number, gender: 'M' | 'F'): string {
  const firstList = gender === 'F' ? SAMPLE_TANZANIAN_FIRST_NAMES_F : SAMPLE_TANZANIAN_FIRST_NAMES_M;
  const first = firstList[index % firstList.length];
  const middle = SAMPLE_TANZANIAN_SURNAMES[(index * 3 + 5) % SAMPLE_TANZANIAN_SURNAMES.length].trim();
  const last = SAMPLE_TANZANIAN_SURNAMES[(index * 7 + 2) % SAMPLE_TANZANIAN_SURNAMES.length].trim();
  return `${first} ${middle} ${last}`;
}

export interface GradeGenderCount {
  M: number;
  F: number;
  T: number;
}

export interface SubjectGradeSummaryRow {
  subject: string;
  registeredCount: number;
  satCount: number;
  absentCount: number;
  grades: {
    A: GradeGenderCount;
    B: GradeGenderCount;
    C: GradeGenderCount;
    D: GradeGenderCount;
    E: GradeGenderCount;
    F: GradeGenderCount;
  };
  passCount: number;
  failCount: number;
  passRate: number;
  meanScore: number;
  highestScore: number;
  subjectGpa: number;
  subjectGpaFormatted: string;
  subjectGrade: string;
  subjectRemark: string;
  subjectBadgeClass: string;
  subjectPosition: number;
  totalSubjects: number;
}

export interface DivisionGenderBreakdown {
  M: number;
  F: number;
  T: number;
  pct: number;
}

export interface OverallDivisionSummary {
  totalRegistered: { M: number; F: number; T: number };
  totalSat: { M: number; F: number; T: number };
  totalAbsent: { M: number; F: number; T: number };
  divisions: {
    I: DivisionGenderBreakdown;
    II: DivisionGenderBreakdown;
    III: DivisionGenderBreakdown;
    IV: DivisionGenderBreakdown;
    '0': DivisionGenderBreakdown;
  };
  grades: {
    A: DivisionGenderBreakdown;
    B: DivisionGenderBreakdown;
    C: DivisionGenderBreakdown;
    D: DivisionGenderBreakdown;
    E: DivisionGenderBreakdown;
    F: DivisionGenderBreakdown;
  };
  totalPassed: { M: number; F: number; T: number; pct: number };
  overallMean: number;
  overallGpa: number;
  overallGpaFormatted: string;
  overallGpaGrade: string;
  overallGpaRemark: string;
  overallGpaBadgeClass: string;
}

/**
 * Computes Subject-by-Subject Grade Distribution Summary (how many A, B, C, D, E/F per subject,
 * broken down by M, F, Total, plus Pass Rate %, Mean Score %, Subject GPA, and Subject Rank).
 * Can be computed across all schools ('ALL') or filtered to a single participating school.
 */
export function computeSubjectGradeSummary(
  results: JointResult[],
  examSubjects: string[],
  isPrimary = false,
  filterSchoolId = 'ALL'
): SubjectGradeSummaryRow[] {
  const scopedResults =
    filterSchoolId && filterSchoolId !== 'ALL'
      ? results.filter((r) => r.jointSchoolId === filterSchoolId)
      : results;

  const totalSubjects = examSubjects.length;

  const rawRows: SubjectGradeSummaryRow[] = examSubjects.map((subj) => {
    const subjUpper = subj.toUpperCase();
    let registeredCount = 0;
    let satCount = 0;
    let sumScore = 0;
    let sumPoints = 0;
    let highestScore = 0;

    const grades: SubjectGradeSummaryRow['grades'] = {
      A: { M: 0, F: 0, T: 0 },
      B: { M: 0, F: 0, T: 0 },
      C: { M: 0, F: 0, T: 0 },
      D: { M: 0, F: 0, T: 0 },
      E: { M: 0, F: 0, T: 0 },
      F: { M: 0, F: 0, T: 0 },
    };

    scopedResults.forEach((r) => {
      const regSubjs = getStudentRegisteredSubjects(r, examSubjects);
      const isReg = regSubjs.some((s) => s.toUpperCase() === subjUpper);
      const rawScore = r.subjectMarks?.[subj];
      const hasScore =
        rawScore !== undefined &&
        rawScore !== null &&
        String(rawScore) !== '' &&
        !Number.isNaN(Number(rawScore));

      if (isReg || hasScore) {
        registeredCount += 1;
      }

      if (hasScore) {
        const num = Number(rawScore);
        if (num >= 0 && num <= 100) {
          satCount += 1;
          sumScore += num;
          if (num > highestScore) highestScore = num;
          const { grade, points } = computeNectaGradeAndPoints(num, isPrimary);
          sumPoints += points;
          const gKey = (['A', 'B', 'C', 'D', 'E', 'F'].includes(grade) ? grade : isPrimary ? 'E' : 'F') as keyof SubjectGradeSummaryRow['grades'];
          const genderKey: 'M' | 'F' = String(r.gender || 'M').toUpperCase().startsWith('F') ? 'F' : 'M';
          grades[gKey][genderKey] += 1;
          grades[gKey].T += 1;
        }
      }
    });

    const passCount = grades.A.T + grades.B.T + grades.C.T + grades.D.T;
    const failCount = isPrimary ? grades.E.T : grades.E.T + grades.F.T;
    const passRate = satCount > 0 ? Number(((passCount / satCount) * 100).toFixed(1)) : 0;
    const meanScore = satCount > 0 ? Number((sumScore / satCount).toFixed(2)) : 0;
    const subjectGpa = satCount > 0 ? Number((sumPoints / satCount).toFixed(4)) : 5.0;
    const gpaClass = getNectaGpaClassification(subjectGpa, satCount > 0, isPrimary);

    return {
      subject: subj,
      registeredCount,
      satCount,
      absentCount: Math.max(0, registeredCount - satCount),
      grades,
      passCount,
      failCount,
      passRate,
      meanScore,
      highestScore: Number(highestScore.toFixed(1)),
      subjectGpa,
      subjectGpaFormatted: satCount > 0 ? subjectGpa.toFixed(4) : '-',
      subjectGrade: gpaClass.grade,
      subjectRemark: gpaClass.remark,
      subjectBadgeClass: gpaClass.badgeClass,
      subjectPosition: 1,
      totalSubjects,
    };
  });

  // Sort subjects by lowest Subject GPA first (1.0000 is best), then highest Mean Score
  const sortedForRank = [...rawRows].sort((a, b) => {
    if (a.satCount > 0 && b.satCount === 0) return -1;
    if (a.satCount === 0 && b.satCount > 0) return 1;
    if (a.satCount > 0 && b.satCount > 0) {
      if (Math.abs(a.subjectGpa - b.subjectGpa) > 0.00001) {
        return a.subjectGpa - b.subjectGpa;
      }
      if (b.meanScore !== a.meanScore) {
        return b.meanScore - a.meanScore;
      }
    }
    return a.subject.localeCompare(b.subject);
  });

  const rankMap = new Map<string, number>();
  sortedForRank.forEach((row, idx) => {
    rankMap.set(row.subject, idx + 1);
  });

  return rawRows.map((row) => ({
    ...row,
    subjectPosition: rankMap.get(row.subject) || 1,
    totalSubjects,
  }));
}

/**
 * Computes Overall Division & Grade Summary across all participating schools
 * (or a subset of results) with full Gender (M, F, Total, %) breakdown.
 */
export function computeOverallDivisionSummary(
  results: JointResult[],
  examSubjects: string[],
  isPrimary = false,
  isSevenOrMoreSubjects = false
): OverallDivisionSummary {
  const totalRegistered = { M: 0, F: 0, T: 0 };
  const totalSat = { M: 0, F: 0, T: 0 };

  const divisions: OverallDivisionSummary['divisions'] = {
    I: { M: 0, F: 0, T: 0, pct: 0 },
    II: { M: 0, F: 0, T: 0, pct: 0 },
    III: { M: 0, F: 0, T: 0, pct: 0 },
    IV: { M: 0, F: 0, T: 0, pct: 0 },
    '0': { M: 0, F: 0, T: 0, pct: 0 },
  };

  const grades: OverallDivisionSummary['grades'] = {
    A: { M: 0, F: 0, T: 0, pct: 0 },
    B: { M: 0, F: 0, T: 0, pct: 0 },
    C: { M: 0, F: 0, T: 0, pct: 0 },
    D: { M: 0, F: 0, T: 0, pct: 0 },
    E: { M: 0, F: 0, T: 0, pct: 0 },
    F: { M: 0, F: 0, T: 0, pct: 0 },
  };

  let sumAvg = 0;
  let sumGpa = 0;

  results.forEach((r) => {
    const gKey: 'M' | 'F' = String(r.gender || 'M').toUpperCase().startsWith('F') ? 'F' : 'M';
    totalRegistered[gKey] += 1;
    totalRegistered.T += 1;

    const didSit = (r.subjectsSat ?? 0) > 0 || Object.keys(r.subjectMarks || {}).length > 0;
    if (!didSit) return;

    totalSat[gKey] += 1;
    totalSat.T += 1;
    sumAvg += Number(r.averageScore || 0);
    sumGpa += computeStudentGpaFromResult(r, examSubjects, isPrimary);

    // Only count Division if the exam has >= 7 subjects AND the student sat >= 7 subjects.
    // Below 7 subjects (< 7), the system MUST NOT calculate or assign a Division!
    if (
      examSubjects.length >= 7 &&
      (r.subjectsSat ?? 0) >= 7 &&
      ['I', 'II', 'III', 'IV', '0'].includes(r.division)
    ) {
      const divKey = r.division as keyof OverallDivisionSummary['divisions'];
      divisions[divKey][gKey] += 1;
      divisions[divKey].T += 1;
    }

    const grdKey = (['A', 'B', 'C', 'D', 'E', 'F'].includes(r.overallGrade)
      ? r.overallGrade
      : isPrimary
      ? 'E'
      : 'F') as keyof OverallDivisionSummary['grades'];
    grades[grdKey][gKey] += 1;
    grades[grdKey].T += 1;
  });

  const satTotal = totalSat.T;
  const divSatTotal =
    divisions.I.T + divisions.II.T + divisions.III.T + divisions.IV.T + divisions['0'].T;
  (['I', 'II', 'III', 'IV', '0'] as const).forEach((d) => {
    const denom = divSatTotal > 0 ? divSatTotal : satTotal;
    divisions[d].pct = denom > 0 ? Number(((divisions[d].T / denom) * 100).toFixed(1)) : 0;
  });
  (['A', 'B', 'C', 'D', 'E', 'F'] as const).forEach((g) => {
    grades[g].pct = satTotal > 0 ? Number(((grades[g].T / satTotal) * 100).toFixed(1)) : 0;
  });

  const useDivisionPassCount = isSevenOrMoreSubjects && divSatTotal > 0;
  const passedM = useDivisionPassCount
    ? divisions.I.M + divisions.II.M + divisions.III.M + divisions.IV.M
    : grades.A.M + grades.B.M + grades.C.M + grades.D.M;
  const passedF = useDivisionPassCount
    ? divisions.I.F + divisions.II.F + divisions.III.F + divisions.IV.F
    : grades.A.F + grades.B.F + grades.C.F + grades.D.F;
  const passedT = passedM + passedF;

  const overallMean = satTotal > 0 ? Number((sumAvg / satTotal).toFixed(2)) : 0;
  const overallGpa = satTotal > 0 ? Number((sumGpa / satTotal).toFixed(4)) : 5.0;
  const gpaClass = getNectaGpaClassification(overallGpa, satTotal > 0, isPrimary);

  return {
    totalRegistered,
    totalSat,
    totalAbsent: {
      M: Math.max(0, totalRegistered.M - totalSat.M),
      F: Math.max(0, totalRegistered.F - totalSat.F),
      T: Math.max(0, totalRegistered.T - totalSat.T),
    },
    divisions,
    grades,
    totalPassed: {
      M: passedM,
      F: passedF,
      T: passedT,
      pct: satTotal > 0 ? Number(((passedT / satTotal) * 100).toFixed(1)) : 0,
    },
    overallMean,
    overallGpa,
    overallGpaFormatted: satTotal > 0 ? overallGpa.toFixed(4) : '-',
    overallGpaGrade: gpaClass.grade,
    overallGpaRemark: gpaClass.remark,
    overallGpaBadgeClass: gpaClass.badgeClass,
  };
}

