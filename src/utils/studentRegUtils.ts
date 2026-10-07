/**
 * Utility functions for Student Registration Token / Number formatting
 * Tanzanian NECTA / Official Standard Format:
 * S.<SCHOOL_NUMBER>/<0001>/<YEAR> (e.g. S.0123/0001/2026)
 */

export function sanitizeSchoolNumber(rawNumber?: string): string {
  if (!rawNumber || !rawNumber.trim()) {
    return '0123';
  }
  // Remove leading S or S. if already present
  const cleaned = rawNumber.trim().replace(/^S\.?/i, '').replace(/[^a-zA-Z0-9]/g, '');
  return cleaned || '0123';
}

export function formatStudentRegNo(
  schoolNumber?: string,
  index: number = 1,
  year?: string | number,
  isPrimary: boolean = false
): string {
  const cleanSchool = sanitizeSchoolNumber(schoolNumber);
  const paddedIndex = String(Math.max(1, index)).padStart(4, '0');
  const regYear = year ? String(year) : String(new Date().getFullYear());
  const prefix = isPrimary ? 'P' : 'S';
  return `${prefix}.${cleanSchool}/${paddedIndex}/${regYear}`;
}

export function getNextStudentRegNo(
  existingStudents: { regNo?: string; className?: string; level?: string }[],
  schoolNumber?: string,
  year?: string | number,
  isPrimary: boolean = false
): string {
  const cleanSchool = sanitizeSchoolNumber(schoolNumber);
  const regYear = year ? String(year) : String(new Date().getFullYear());
  const prefix = isPrimary ? 'P' : 'S';

  // Try to find the highest 4-digit sequence number from existing students matching this level
  let maxIndex = 0;
  existingStudents.forEach(s => {
    if (!s.regNo) return;
    const isP = s.regNo.trim().toUpperCase().startsWith('P');
    if ((isPrimary && !isP) || (!isPrimary && isP)) {
      // Don't mix P and S index sequences
      return;
    }

    // Match patterns like P.0123/0045/2026 or S.0123/0045/2026
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
    // If no matching pattern, count students of that level
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
