/**
 * Utility functions for Student Registration Token / Number formatting
 * Tanzanian NECTA / Standardized Stream & Academic Year Format:
 * S.<SCHOOL_NUMBER>/<STREAM>/<0001>/<YEAR> (e.g. S.0123/A/0001/2026)
 * or S.<SCHOOL_NUMBER>/<0001>/<YEAR> when stream is omitted
 */

export interface StudentRegistrationIdOptions {
  existingStudents?: {
    regNo?: string;
    className?: string;
    level?: string;
    stream?: string;
    combination?: string;
  }[];
  schoolNumber?: string;
  academicYear?: string | number;
  stream?: string;
  isPrimary?: boolean;
  sequenceNumber?: number;
}

export function sanitizeSchoolNumber(rawNumber?: string): string {
  if (!rawNumber || !rawNumber.trim()) {
    return '0123';
  }
  // Remove leading S/P or S./P. if already present
  const cleaned = rawNumber.trim().replace(/^[SP]\.?/i, '').replace(/[^a-zA-Z0-9]/g, '');
  return cleaned || '0123';
}

export function sanitizeStreamCode(rawStream?: string): string {
  if (!rawStream || !rawStream.trim()) {
    return 'A';
  }
  const cleaned = rawStream
    .trim()
    .replace(/^(STREAM|MKONDO|COMB|COMBINATION)\s*/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return cleaned || 'A';
}

/**
 * Generates a standardized, unique student registration ID based on the
 * current academic year, stream, school number, and existing student records.
 * Format: <P|S>.<SCHOOL>/<STREAM>/<0001>/<YEAR> (e.g., S.0123/A/0001/2026)
 */
export function generateStudentRegistrationId(options: StudentRegistrationIdOptions = {}): string {
  const {
    existingStudents = [],
    schoolNumber,
    academicYear,
    stream,
    isPrimary = false,
    sequenceNumber
  } = options;

  const cleanSchool = sanitizeSchoolNumber(schoolNumber);
  const regYear = academicYear ? String(academicYear).trim() : String(new Date().getFullYear());
  const streamCode = sanitizeStreamCode(stream);
  const prefix = isPrimary ? 'P' : 'S';

  const existingSet = new Set(
    existingStudents
      .map(s => (s.regNo || '').trim().toUpperCase())
      .filter(Boolean)
  );

  if (typeof sequenceNumber === 'number' && sequenceNumber > 0) {
    let candidateIndex = sequenceNumber;
    let candidate = `${prefix}.${cleanSchool}/${streamCode}/${String(candidateIndex).padStart(4, '0')}/${regYear}`;
    while (existingSet.has(candidate.toUpperCase())) {
      candidateIndex += 1;
      candidate = `${prefix}.${cleanSchool}/${streamCode}/${String(candidateIndex).padStart(4, '0')}/${regYear}`;
    }
    return candidate;
  }

  let maxIndex = 0;

  existingStudents.forEach(s => {
    if (!s.regNo) return;
    const rawReg = s.regNo.trim().toUpperCase();
    const isP = rawReg.startsWith('P');
    if ((isPrimary && !isP) || (!isPrimary && isP)) {
      return;
    }

    // Match standardized format with stream & year: S.0123/A/0045/2026
    const streamYearMatch = rawReg.match(/\/([A-Z0-9]+)\/(\d{1,5})\/(\d{4})$/);
    if (streamYearMatch) {
      const [, matchedStream, seqStr, yearStr] = streamYearMatch;
      if (matchedStream === streamCode && yearStr === regYear) {
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed > maxIndex) {
          maxIndex = parsed;
        }
      }
      return;
    }

    // Also inspect legacy format S.0123/0045/2026 if student belongs to same stream & year
    const legacyMatch = rawReg.match(/\/(\d{1,5})\/(\d{4})$/);
    if (legacyMatch) {
      const [, seqStr, yearStr] = legacyMatch;
      const studentStreamCode = sanitizeStreamCode(s.combination || s.stream);
      if (studentStreamCode === streamCode && yearStr === regYear) {
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed > maxIndex) {
          maxIndex = parsed;
        }
      }
    }
  });

  if (maxIndex === 0) {
    // Count existing students in the same level & stream as baseline if no sequence matched
    const matchingStreamCount = existingStudents.filter(s => {
      const isP =
        s.regNo?.trim().toUpperCase().startsWith('P') ||
        s.level === 'PRIMARY' ||
        s.level === 'PRE_PRIMARY' ||
        (s.className &&
          (s.className.startsWith('Std') ||
            s.className.startsWith('Standard') ||
            s.className.startsWith('Baby') ||
            s.className.startsWith('KG')));
      if ((isPrimary && !isP) || (!isPrimary && isP)) return false;
      const studentStreamCode = sanitizeStreamCode(s.combination || s.stream);
      return studentStreamCode === streamCode;
    }).length;
    maxIndex = matchingStreamCount;
  }

  let nextIndex = maxIndex + 1;
  let candidateId = `${prefix}.${cleanSchool}/${streamCode}/${String(nextIndex).padStart(4, '0')}/${regYear}`;

  // Guarantee uniqueness across all existing student registration numbers
  while (existingSet.has(candidateId.toUpperCase())) {
    nextIndex += 1;
    candidateId = `${prefix}.${cleanSchool}/${streamCode}/${String(nextIndex).padStart(4, '0')}/${regYear}`;
  }

  return candidateId;
}

export function formatStudentRegNo(
  schoolNumber?: string,
  index: number = 1,
  year?: string | number,
  isPrimary: boolean = false,
  stream?: string
): string {
  const cleanSchool = sanitizeSchoolNumber(schoolNumber);
  const paddedIndex = String(Math.max(1, index)).padStart(4, '0');
  const regYear = year ? String(year) : String(new Date().getFullYear());
  const prefix = isPrimary ? 'P' : 'S';
  if (stream && stream.trim()) {
    const streamCode = sanitizeStreamCode(stream);
    return `${prefix}.${cleanSchool}/${streamCode}/${paddedIndex}/${regYear}`;
  }
  return `${prefix}.${cleanSchool}/${paddedIndex}/${regYear}`;
}

export function getNextStudentRegNo(
  existingStudents: { regNo?: string; className?: string; level?: string; stream?: string; combination?: string }[],
  schoolNumber?: string,
  year?: string | number,
  isPrimary: boolean = false,
  stream?: string
): string {
  if (stream && stream.trim()) {
    return generateStudentRegistrationId({
      existingStudents,
      schoolNumber,
      academicYear: year,
      stream,
      isPrimary
    });
  }

  const cleanSchool = sanitizeSchoolNumber(schoolNumber);
  const regYear = year ? String(year) : String(new Date().getFullYear());
  const prefix = isPrimary ? 'P' : 'S';

  let maxIndex = 0;
  existingStudents.forEach(s => {
    if (!s.regNo) return;
    const isP = s.regNo.trim().toUpperCase().startsWith('P');
    if ((isPrimary && !isP) || (!isPrimary && isP)) {
      return;
    }

    const slashMatch = s.regNo.match(/\/(\d{1,5})\//);
    if (slashMatch && slashMatch[1]) {
      const parsed = parseInt(slashMatch[1], 10);
      if (!isNaN(parsed) && parsed > maxIndex) {
        maxIndex = parsed;
      }
    } else {
      const fallbackMatch = s.regNo.match(/[PS]\.?[A-Z0-9]*[/\-]?(\d{1,5})/i);
      if (fallbackMatch && fallbackMatch[1]) {
        const parsed = parseInt(fallbackMatch[1], 10);
        if (!isNaN(parsed) && parsed > maxIndex) {
          maxIndex = parsed;
        }
      }
    }
  });

  if (maxIndex === 0) {
    const count = existingStudents.filter(s => {
      const isP = s.regNo?.trim().toUpperCase().startsWith('P') || 
                  s.level === 'PRIMARY' || 
                  s.level === 'PRE_PRIMARY' ||
                  (s.className && (s.className.startsWith('Std') || s.className.startsWith('Baby') || s.className.startsWith('KG')));
      return isPrimary ? isP : !isP;
    }).length;
    maxIndex = count;
  }

  return `${prefix}.${cleanSchool}/${String(maxIndex + 1).padStart(4, '0')}/${regYear}`;
}

