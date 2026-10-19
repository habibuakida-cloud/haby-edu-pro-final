export const cleanSubjectName = (subName: string): string => {
  if (!subName || typeof subName !== 'string') return '';
  // Remove patterns like "Form 1A", "Form 3", "2A", "3B", "Standard 1", "Class 2A" from subject names
  let cleaned = subName
    .replace(/\s+(Form|Standard|Class|Std|F|Forms|Standards)\s*[0-9]+[A-Z]*/gi, '')
    .replace(/\s+[0-9]+[A-Z]$/i, '')
    .trim();
  return cleaned || subName;
};
