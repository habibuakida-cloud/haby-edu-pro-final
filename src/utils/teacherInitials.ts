/**
 * Standard utility to compute teacher initials based on First Name + Last Name
 * Rule: First letter of First Name + First letter of Last Name (e.g., Juma Hassan = JH)
 */
export function computeTeacherInitial(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return 'TR';
  
  // Remove common academic/honorific prefixes (Mwl, Mwalimu, Tr, Teacher, Mr, Mrs, Ms, Dr, Prof)
  const cleaned = fullName
    .replace(/^(mwl|mwalimu|tr|teacher|mr|mrs|ms|dr|prof)\.?\s+/i, '')
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TR';

  if (parts.length === 1) {
    const single = parts[0];
    if (single.length >= 2) {
      return single.slice(0, 2).toUpperCase();
    }
    return (single[0] + 'T').toUpperCase();
  }

  // First letter of First Name + First letter of Last Name
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const firstLetter = firstName.charAt(0).toUpperCase();
  const lastLetter = lastName.charAt(0).toUpperCase();

  return `${firstLetter}${lastLetter}`;
}

/**
 * Ensures unique initial if duplicate exists among teachers
 */
export function generateUniqueTeacherInitial(
  fullName: string, 
  existingInitials: Set<string>, 
  currentInitial?: string
): string {
  const base = computeTeacherInitial(fullName);
  if (currentInitial && currentInitial.toUpperCase().startsWith(base) && !existingInitials.has(currentInitial)) {
    return currentInitial.toUpperCase();
  }
  if (!existingInitials.has(base)) {
    existingInitials.add(base);
    return base;
  }
  let counter = 2;
  let candidate = `${base}${counter}`;
  while (existingInitials.has(candidate)) {
    counter++;
    candidate = `${base}${counter}`;
  }
  existingInitials.add(candidate);
  return candidate;
}
