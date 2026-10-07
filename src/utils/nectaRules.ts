/**
 * Official Tanzanian NECTA (National Examinations Council of Tanzania)
 * Examination & Grading Regulations Engine
 *
 * Covers:
 * 1. SFNA (Standard IV National Assessment)
 * 2. PSLE (Standard VII Primary School Leaving Examination)
 * 3. FTNA (Form Two National Assessment)
 * 4. CSEE (Form Four Certificate of Secondary Education Examination)
 * 5. ACSEE (Form Six Advanced Certificate of Secondary Education Examination)
 */

import { cleanAndFilterMarksForClass } from './reportCardUtils';

export type NectaClassLevel = 'STD_IV' | 'STD_VII' | 'FORM_II' | 'FORM_IV' | 'FORM_VI' | 'PRIMARY_GENERAL' | 'SECONDARY_OLEVEL' | 'SECONDARY_ALEVEL';

export interface NectaGradeThreshold {
  grade: string;
  min: number;
  max: number;
  points: number;
  remark: string;
  color: string;
  badgeBg: string;
}

export interface NectaLevelPolicy {
  levelCategory: NectaClassLevel;
  title: string;
  examCode: string; // SFNA, PSLE, FTNA, CSEE, ACSEE
  description: string;
  grades: NectaGradeThreshold[];
  divisionCriteria?: {
    divI: { minPoints: number; maxPoints: number; label: string };
    divII: { minPoints: number; maxPoints: number; label: string };
    divIII: { minPoints: number; maxPoints: number; label: string };
    divIV: { minPoints: number; maxPoints: number; label: string };
    div0: { minPoints: number; maxPoints: number; label: string };
  };
  passThresholdPercentage: number;
  subjectCountForDivision: number;
}

// 1. Standard IV - SFNA (Standard Four National Assessment)
export const NECTA_SFNA_POLICY: NectaLevelPolicy = {
  levelCategory: 'STD_IV',
  title: 'Standard IV (SFNA - Standard Four National Assessment)',
  examCode: 'SFNA',
  description: 'NECTA National Assessment for Standard 4. Five-tier grading (A, B, C, D, E) with 41% pass mark.',
  grades: [
    { grade: 'A', min: 81, max: 100, points: 1, remark: 'Distinction (Bora Sana)', color: '#15803d', badgeBg: '#dcfce7' },
    { grade: 'B', min: 61, max: 80, points: 2, remark: 'Very Good (Vizuri Sana)', color: '#1d4ed8', badgeBg: '#dbeafe' },
    { grade: 'C', min: 41, max: 60, points: 3, remark: 'Average / Pass (Wastani)', color: '#0284c7', badgeBg: '#e0f2fe' },
    { grade: 'D', min: 21, max: 40, points: 4, remark: 'Below Average / Weak (Hafifu)', color: '#d97706', badgeBg: '#fef3c7' },
    { grade: 'E', min: 0, max: 20, points: 5, remark: 'Fail (Hafifu Sana)', color: '#dc2626', badgeBg: '#fee2e2' }
  ],
  passThresholdPercentage: 41,
  subjectCountForDivision: 0
};

// 2. Standard VII - PSLE (Primary School Leaving Examination)
export const NECTA_PSLE_POLICY: NectaLevelPolicy = {
  levelCategory: 'STD_VII',
  title: 'Standard VII (PSLE - Primary School Leaving Examination)',
  examCode: 'PSLE',
  description: 'Official NECTA Primary School Leaving Examination. A: 81-100, B: 61-80, C: 41-60 (Pass mark), D: 21-40, E: 0-20.',
  grades: [
    { grade: 'A', min: 81, max: 100, points: 5, remark: 'Distinction (Bora Sana)', color: '#15803d', badgeBg: '#dcfce7' },
    { grade: 'B', min: 61, max: 80, points: 4, remark: 'Very Good (Vizuri Sana)', color: '#1d4ed8', badgeBg: '#dbeafe' },
    { grade: 'C', min: 41, max: 60, points: 3, remark: 'Good / Pass (Wastani)', color: '#0284c7', badgeBg: '#e0f2fe' },
    { grade: 'D', min: 21, max: 40, points: 2, remark: 'Weak / Fail (Hafifu)', color: '#d97706', badgeBg: '#fef3c7' },
    { grade: 'E', min: 0, max: 20, points: 1, remark: 'Fail / Very Weak (Hafifu Sana)', color: '#dc2626', badgeBg: '#fee2e2' }
  ],
  passThresholdPercentage: 41,
  subjectCountForDivision: 0
};

// 3. Form II - FTNA (Form Two National Assessment)
export const NECTA_FTNA_POLICY: NectaLevelPolicy = {
  levelCategory: 'FORM_II',
  title: 'Form II (FTNA - Form Two National Assessment)',
  examCode: 'FTNA',
  description: 'NECTA National Assessment determining Form 3 progression. Best 7 subjects: Div I (7-17), Div II (18-21), Div III (22-25), Div IV (26-33), Div 0 (34-35).',
  grades: [
    { grade: 'A', min: 75, max: 100, points: 1, remark: 'Distinction (Bora Sana)', color: '#15803d', badgeBg: '#dcfce7' },
    { grade: 'B', min: 65, max: 74, points: 2, remark: 'Very Good (Nzuri Sana)', color: '#1d4ed8', badgeBg: '#dbeafe' },
    { grade: 'C', min: 45, max: 64, points: 3, remark: 'Good (Nzuri)', color: '#0284c7', badgeBg: '#e0f2fe' },
    { grade: 'D', min: 30, max: 44, points: 4, remark: 'Satisfactory (Inaridhisha)', color: '#d97706', badgeBg: '#fef3c7' },
    { grade: 'F', min: 0, max: 29, points: 5, remark: 'Fail (Hajafaulu)', color: '#dc2626', badgeBg: '#fee2e2' }
  ],
  divisionCriteria: {
    divI: { minPoints: 7, maxPoints: 17, label: 'Division I' },
    divII: { minPoints: 18, maxPoints: 21, label: 'Division II' },
    divIII: { minPoints: 22, maxPoints: 25, label: 'Division III' },
    divIV: { minPoints: 26, maxPoints: 33, label: 'Division IV' },
    div0: { minPoints: 34, maxPoints: 35, label: 'Division 0' }
  },
  passThresholdPercentage: 30,
  subjectCountForDivision: 7
};

// 4. Form IV - CSEE (Certificate of Secondary Education Examination)
export const NECTA_CSEE_POLICY: NectaLevelPolicy = {
  levelCategory: 'FORM_IV',
  title: 'Form IV (CSEE - Certificate of Secondary Education Examination)',
  examCode: 'CSEE',
  description: 'National O-Level examination. Best 7 subjects determine NECTA Division: Div I (7-17), Div II (18-21), Div III (22-25), Div IV (26-33), Div 0 (34-35).',
  grades: [
    { grade: 'A', min: 75, max: 100, points: 1, remark: 'Distinction (Bora Sana)', color: '#15803d', badgeBg: '#dcfce7' },
    { grade: 'B', min: 65, max: 74, points: 2, remark: 'Very Good (Nzuri Sana)', color: '#1d4ed8', badgeBg: '#dbeafe' },
    { grade: 'C', min: 45, max: 64, points: 3, remark: 'Good (Nzuri)', color: '#0284c7', badgeBg: '#e0f2fe' },
    { grade: 'D', min: 30, max: 44, points: 4, remark: 'Satisfactory (Inaridhisha)', color: '#d97706', badgeBg: '#fef3c7' },
    { grade: 'F', min: 0, max: 29, points: 5, remark: 'Fail (Hajafaulu)', color: '#dc2626', badgeBg: '#fee2e2' }
  ],
  divisionCriteria: {
    divI: { minPoints: 7, maxPoints: 17, label: 'Division I' },
    divII: { minPoints: 18, maxPoints: 21, label: 'Division II' },
    divIII: { minPoints: 22, maxPoints: 25, label: 'Division III' },
    divIV: { minPoints: 26, maxPoints: 33, label: 'Division IV' },
    div0: { minPoints: 34, maxPoints: 35, label: 'Division 0' }
  },
  passThresholdPercentage: 30,
  subjectCountForDivision: 7
};

// 5. Form VI - ACSEE (Advanced Certificate of Secondary Education Examination)
export const NECTA_ACSEE_POLICY: NectaLevelPolicy = {
  levelCategory: 'FORM_VI',
  title: 'Form VI (ACSEE - Advanced Certificate of Secondary Education Examination)',
  examCode: 'ACSEE',
  description: 'Official NECTA A-Level examination based on 3 Principal combination subjects: Div I (3-9 pts), Div II (10-12 pts), Div III (13-17 pts), Div IV (18-19 pts), Div 0 (20-21 pts).',
  grades: [
    { grade: 'A', min: 80, max: 100, points: 1, remark: 'Excellent', color: '#15803d', badgeBg: '#dcfce7' },
    { grade: 'B', min: 70, max: 79, points: 2, remark: 'Very Good', color: '#1d4ed8', badgeBg: '#dbeafe' },
    { grade: 'C', min: 60, max: 69, points: 3, remark: 'Good', color: '#0284c7', badgeBg: '#e0f2fe' },
    { grade: 'D', min: 50, max: 59, points: 4, remark: 'Satisfactory', color: '#d97706', badgeBg: '#fef3c7' },
    { grade: 'E', min: 40, max: 49, points: 5, remark: 'Pass', color: '#ea580c', badgeBg: '#ffedd5' },
    { grade: 'S', min: 35, max: 39, points: 6, remark: 'Subsidiary Pass', color: '#7c3aed', badgeBg: '#f3e8ff' },
    { grade: 'F', min: 0, max: 34, points: 7, remark: 'Fail', color: '#dc2626', badgeBg: '#fee2e2' }
  ],
  divisionCriteria: {
    divI: { minPoints: 3, maxPoints: 9, label: 'Division I' },
    divII: { minPoints: 10, maxPoints: 12, label: 'Division II' },
    divIII: { minPoints: 13, maxPoints: 17, label: 'Division III' },
    divIV: { minPoints: 18, maxPoints: 19, label: 'Division IV' },
    div0: { minPoints: 20, maxPoints: 21, label: 'Division 0' }
  },
  passThresholdPercentage: 35,
  subjectCountForDivision: 3
};

/**
 * Determine NECTA Policy according to class name or exam name
 */
export function getNectaPolicyForClass(className: string): NectaLevelPolicy {
  const norm = (className || '').toLowerCase().trim();

  if (norm.includes('standard 4') || norm.includes('std 4') || norm.includes('darasa la 4') || norm.includes('sfna')) {
    return NECTA_SFNA_POLICY;
  }
  if (norm.includes('standard 7') || norm.includes('std 7') || norm.includes('darasa la 7') || norm.includes('psle')) {
    return NECTA_PSLE_POLICY;
  }
  if (norm.includes('standard') || norm.includes('std') || norm.includes('darasa') || norm.includes('nursery') || norm.includes('baby') || norm.includes('pre-unit')) {
    return NECTA_SFNA_POLICY; // standard primary grading applies
  }
  if (norm.includes('form 2') || norm.includes('form ii') || norm.includes('ftna')) {
    return NECTA_FTNA_POLICY;
  }
  if (norm.includes('form 5') || norm.includes('form 6') || norm.includes('form v') || norm.includes('form vi') || norm.includes('acsee')) {
    return NECTA_ACSEE_POLICY;
  }
  // Default to Form 1 - 4 (CSEE)
  return NECTA_CSEE_POLICY;
}

/**
 * Calculate Grade for a single score using the appropriate NECTA policy
 */
export function getGradeForScore(score: number, policy: NectaLevelPolicy): NectaGradeThreshold {
  const rounded = Math.min(100, Math.max(0, Math.round(score)));
  for (const g of policy.grades) {
    if (rounded >= g.min && rounded <= g.max) {
      return g;
    }
  }
  return policy.grades[policy.grades.length - 1];
}

/**
 * Calculate NECTA Division, Points, Grade, and Position for any class level
 */
export function calculateNectaLevelResults(
  marks: Record<string, number | undefined | null>,
  className: string
): {
  division: string;
  points: number | null;
  overallGrade: string;
  total: number;
  average: number;
  remarks: string;
  policy: NectaLevelPolicy;
  isPrimary: boolean;
} {
  const policy = getNectaPolicyForClass(className);
  const isPrimary = policy.levelCategory === 'STD_IV' || policy.levelCategory === 'STD_VII' || policy.levelCategory === 'PRIMARY_GENERAL';

  const cleanedMarks = cleanAndFilterMarksForClass(marks, className);
  const validEntries: { subject: string; score: number }[] = [];
  Object.entries(cleanedMarks || {}).forEach(([sub, score]) => {
    if (typeof score === 'number' && !isNaN(score) && score >= 0) {
      validEntries.push({ subject: sub, score: Math.round(score) });
    }
  });

  const count = validEntries.length;
  if (count === 0) {
    return {
      division: '-',
      points: null,
      overallGrade: 'F',
      total: 0,
      average: 0,
      remarks: 'No scores recorded',
      policy,
      isPrimary
    };
  }

  const total = validEntries.reduce((sum, item) => sum + item.score, 0);
  const average = Number((total / count).toFixed(1));

  if (isPrimary) {
    // Primary / SFNA / PSLE: Overall Grade A, B, C, D, E
    const gradeInfo = getGradeForScore(average, policy);
    const passStatus = average >= policy.passThresholdPercentage ? 'PASSED' : 'FAILED';
    return {
      division: `Grade ${gradeInfo.grade}`,
      points: Math.round(gradeInfo.points),
      overallGrade: gradeInfo.grade,
      total,
      average,
      remarks: `${passStatus} - ${gradeInfo.remark}`,
      policy,
      isPrimary
    };
  }

  // Secondary: Form 1 - 4 (CSEE/FTNA) or Form 5 - 6 (ACSEE)
  if (policy.levelCategory === 'FORM_VI') {
    // ACSEE: 3 Principal subjects
    const pointValues = validEntries.map(e => getGradeForScore(e.score, policy).points);
    pointValues.sort((a, b) => a - b); // ascending = best (1=A, 2=B)

    while (pointValues.length < 3) {
      pointValues.push(7); // Pad missing with F (7 points)
    }

    const principal3 = pointValues.slice(0, 3);
    const principalPoints = principal3.reduce((sum, p) => sum + p, 0);

    let div = '0';
    if (principalPoints >= 3 && principalPoints <= 9) div = 'I';
    else if (principalPoints >= 10 && principalPoints <= 12) div = 'II';
    else if (principalPoints >= 13 && principalPoints <= 17) div = 'III';
    else if (principalPoints >= 18 && principalPoints <= 19) div = 'IV';
    else div = '0';

    const gradeInfo = getGradeForScore(average, policy);
    return {
      division: `DIV ${div}`,
      points: principalPoints,
      overallGrade: gradeInfo.grade,
      total,
      average,
      remarks: `Division ${div} (${principalPoints} Points)`,
      policy,
      isPrimary: false
    };
  }

  // Form 1 - 4 (FTNA & CSEE): Best 7 subjects
  const pointValues = validEntries.map(e => getGradeForScore(e.score, policy).points);
  pointValues.sort((a, b) => a - b);

  while (pointValues.length < 7) {
    pointValues.push(5); // Pad missing with F (5 points)
  }

  const best7 = pointValues.slice(0, 7);
  const best7Points = best7.reduce((sum, p) => sum + p, 0);

  let div = '0';
  if (best7Points >= 7 && best7Points <= 17) div = 'I';
  else if (best7Points >= 18 && best7Points <= 21) div = 'II';
  else if (best7Points >= 22 && best7Points <= 25) div = 'III';
  else if (best7Points >= 26 && best7Points <= 33) div = 'IV';
  else div = '0';

  const gradeInfo = getGradeForScore(average, policy);
  return {
    division: `DIV ${div}`,
    points: best7Points,
    overallGrade: gradeInfo.grade,
    total,
    average,
    remarks: `Division ${div} (${best7Points} Points)`,
    policy,
    isPrimary: false
  };
}
