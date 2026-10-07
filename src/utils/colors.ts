import { DEFAULT_DAY_THEMES, FORM_STREAM_THEMES, INVIGILATOR_COLORS } from '../constants/defaults';

// Pre-defined rich color palette for subjects
const SUBJECT_COLOR_PALETTE: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'Mathematics': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', bar: '#3b82f6' },
  'Advanced Mathematics': { bg: '#bfdbfe', text: '#1e3a8a', border: '#60a5fa', bar: '#2563eb' },
  'Basic Applied Mathematics': { bg: '#c7d2fe', text: '#3730a3', border: '#818cf8', bar: '#4f46e5' },
  
  'English Language': { bg: '#dcfce7', text: '#166534', border: '#86efac', bar: '#22c55e' },
  'Literature in English': { bg: '#bbf7d0', text: '#14532d', border: '#4ade80', bar: '#16a34a' },
  'Academic Communications': { bg: '#ccfbf1', text: '#115e59', border: '#5eead4', bar: '#0d9488' },
  
  'Kiswahili': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', bar: '#f59e0b' },
  'Historia Ya Tanzania Na Maadili': { bg: '#fde68a', text: '#78350f', border: '#fbbf24', bar: '#d97706' },
  
  'Physics': { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd', bar: '#8b5cf6' },
  'Chemistry': { bg: '#fae8ff', text: '#86198f', border: '#f0abfc', bar: '#d946ef' },
  'Biology': { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', bar: '#10b981' },
  
  'Geography': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74', bar: '#f97316' },
  'History': { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', bar: '#ef4444' },
  'Civics': { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', bar: '#64748b' },
  
  'Computer Studies': { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc', bar: '#0284c7' },
  'Computer Science': { bg: '#bae6fd', text: '#0369a1', border: '#38bdf8', bar: '#0ea5e9' },
  'Commerce': { bg: '#fef9c3', text: '#854d0e', border: '#fde047', bar: '#eab308' },
  'Book Keeping': { bg: '#fef08a', text: '#713f12', border: '#facc15', bar: '#ca8a04' },
  'Economics': { bg: '#ecfdf5', text: '#047857', border: '#34d399', bar: '#059669' },
  'Agriculture': { bg: '#ecfccb', text: '#3f6212', border: '#bef264', bar: '#84cc16' },
  
  'Islamic Religious Education': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', bar: '#6366f1' },
  'Elimu ya Dini ya Kiislamu': { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', bar: '#6366f1' },
  'Christian Religious Education': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe', bar: '#a855f7' },
  'Divinity': { bg: '#e9d5ff', text: '#581c87', border: '#c084fc', bar: '#9333ea' },
  'General Studies': { bg: '#f1f5f9', text: '#1e293b', border: '#94a3b8', bar: '#475569' },

  // Extra-curricular & special meal/activity periods with distinct colors
  'Religion': { bg: '#e0e7ff', text: '#312e81', border: '#818cf8', bar: '#4f46e5' },
  'Religious Activities': { bg: '#e0e7ff', text: '#312e81', border: '#818cf8', bar: '#4f46e5' },
  'Praying': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', bar: '#0284c7' },
  'Prayer & Devotion': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', bar: '#0284c7' },
  'Prayers': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', bar: '#0284c7' },
  'Swala': { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', bar: '#0284c7' },
  'Breakfast': { bg: '#fef3c7', text: '#78350f', border: '#f59e0b', bar: '#d97706' },
  'Breakfast Break': { bg: '#fef3c7', text: '#78350f', border: '#f59e0b', bar: '#d97706' },
  'Lunch': { bg: '#ffedd5', text: '#7c2d12', border: '#ea580c', bar: '#c2410c' },
  'Lunch Break': { bg: '#ffedd5', text: '#7c2d12', border: '#ea580c', bar: '#c2410c' },
  'Environmental Day': { bg: '#dcfce7', text: '#065f46', border: '#34d399', bar: '#059669' },
  'Sports and Games': { bg: '#ffedd5', text: '#9a3412', border: '#fb923c', bar: '#ea580c' },
  'Debates': { bg: '#f5f3ff', text: '#5b21b6', border: '#a78bfa', bar: '#7c3aed' },
  'Remedial Classes': { bg: '#eff6ff', text: '#1d4ed8', border: '#60a5fa', bar: '#2563eb' },
  'General Assembly': { bg: '#f3f4f6', text: '#1f2937', border: '#9ca3af', bar: '#4b5563' },
  'Clubs & Societies': { bg: '#fdf2f8', text: '#9d174d', border: '#f472b6', bar: '#db2777' },
  'Library & Private Study': { bg: '#f0fdfa', text: '#115e59', border: '#2dd4bf', bar: '#0d9488' },
  'Weekly Test': { bg: '#fee2e2', text: '#991b1b', border: '#f87171', bar: '#dc2626' },
  'Weekly Tests': { bg: '#fee2e2', text: '#991b1b', border: '#f87171', bar: '#dc2626' }
};

export interface ExtraCurricularInfo {
  isExtra: boolean;
  type: string;
  name: string;
  badgeText: string;
  cellBg: string;       // Distinct full-cell background for general timetable
  cellHoverBg: string;
  cellBorder: string;   // Distinct cell border / left accent
  cardBg: string;
  text: string;
  accent: string;
  iconName: string;
}

/**
 * Returns distinct styling for extra-curricular activities (Religion, Breakfast, Lunch, etc.)
 * that distinguishes them from regular academic periods in the General Timetable.
 */
export function getExtraCurricularInfo(subject?: string, activityType?: string): ExtraCurricularInfo | null {
  if (!subject && !activityType) return null;
  
  const s = (subject || '').toLowerCase();
  const a = (activityType || '').toLowerCase();

  // 1. Breakfast
  if (a === 'breakfast' || s.includes('breakfast')) {
    return {
      isExtra: true,
      type: 'breakfast',
      name: subject || 'Breakfast',
      badgeText: 'BREAKFAST',
      cellBg: '#fef9c3',      // Warm golden honey tint (noticeably different from period white)
      cellHoverBg: '#fef08a',
      cellBorder: '#f59e0b',  // Vibrant amber accent
      cardBg: '#fffbeb',
      text: '#78350f',
      accent: '#d97706',
      iconName: 'Coffee'
    };
  }

  // 2. Lunch
  if (a === 'lunch' || s.includes('lunch')) {
    return {
      isExtra: true,
      type: 'lunch',
      name: subject || 'Lunch',
      badgeText: 'LUNCH',
      cellBg: '#fff1e6',      // Warm appetizing terracotta / peach tint
      cellHoverBg: '#fed7aa',
      cellBorder: '#ea580c',  // Warm orange accent
      cardBg: '#fff7ed',
      text: '#7c2d12',
      accent: '#c2410c',
      iconName: 'Utensils'
    };
  }

  // 3. Religion
  if (a === 'religion' || s === 'religion' || s.includes('religious') || s === 'elimu ya dini ya kiislamu' || s === 'islamic religious education' || s === 'christian religious education' || s === 'divinity') {
    return {
      isExtra: true,
      type: 'religion',
      name: subject || 'Religion',
      badgeText: 'RELIGION',
      cellBg: '#eef2ff',      // Reverent soft indigo tint
      cellHoverBg: '#e0e7ff',
      cellBorder: '#6366f1',  // Spiritual indigo accent
      cardBg: '#e0e7ff',
      text: '#312e81',
      accent: '#4f46e5',
      iconName: 'BookMarked'
    };
  }

  // 3b. Praying / Devotion
  if (a === 'praying' || s === 'praying' || s.includes('pray') || s.includes('devotion') || s.includes('swala') || s.includes('salaah') || s.includes('maombi')) {
    return {
      isExtra: true,
      type: 'praying',
      name: subject || 'Praying',
      badgeText: 'PRAYING',
      cellBg: '#f0f9ff',      // Serene celestial sky blue tint
      cellHoverBg: '#e0f2fe',
      cellBorder: '#0284c7',  // Clean azure accent
      cardBg: '#e0f2fe',
      text: '#0369a1',
      accent: '#0284c7',
      iconName: 'Sparkles'
    };
  }

  // 4. Environmental Day
  if (a === 'environmental' || s.includes('environment')) {
    return {
      isExtra: true,
      type: 'environmental',
      name: subject || 'Environmental Day',
      badgeText: 'ENVIRONMENT',
      cellBg: '#ecfdf5',
      cellHoverBg: '#d1fae5',
      cellBorder: '#059669',
      cardBg: '#dcfce7',
      text: '#065f46',
      accent: '#059669',
      iconName: 'Trees'
    };
  }

  // 5. Sports and Games
  if (a === 'sports' || s.includes('sport') || s.includes('game') || s === 'physical education') {
    return {
      isExtra: true,
      type: 'sports',
      name: subject || 'Sports and Games',
      badgeText: 'SPORTS',
      cellBg: '#fff7ed',
      cellHoverBg: '#ffedd5',
      cellBorder: '#ea580c',
      cardBg: '#ffedd5',
      text: '#9a3412',
      accent: '#ea580c',
      iconName: 'Trophy'
    };
  }

  // 6. Debates
  if (a === 'debates' || s.includes('debate')) {
    return {
      isExtra: true,
      type: 'debates',
      name: subject || 'Debates',
      badgeText: 'DEBATES',
      cellBg: '#f5f3ff',
      cellHoverBg: '#ede9fe',
      cellBorder: '#7c3aed',
      cardBg: '#ede9fe',
      text: '#5b21b6',
      accent: '#7c3aed',
      iconName: 'MessageSquare'
    };
  }

  // 7. Remedial Classes
  if (a === 'remedial' || s.includes('remedial')) {
    return {
      isExtra: true,
      type: 'remedial',
      name: subject || 'Remedial Classes',
      badgeText: 'REMEDIAL',
      cellBg: '#eff6ff',
      cellHoverBg: '#dbeafe',
      cellBorder: '#2563eb',
      cardBg: '#dbeafe',
      text: '#1e40af',
      accent: '#2563eb',
      iconName: 'BookOpen'
    };
  }

  // 8. General Assembly
  if (a === 'assembly' || s.includes('assembly')) {
    return {
      isExtra: true,
      type: 'assembly',
      name: subject || 'General Assembly',
      badgeText: 'ASSEMBLY',
      cellBg: '#f3f4f6',
      cellHoverBg: '#e5e7eb',
      cellBorder: '#4b5563',
      cardBg: '#e5e7eb',
      text: '#1f2937',
      accent: '#4b5563',
      iconName: 'Users'
    };
  }

  // 9. Clubs & Societies
  if (a === 'clubs' || s.includes('club')) {
    return {
      isExtra: true,
      type: 'clubs',
      name: subject || 'Clubs & Societies',
      badgeText: 'CLUBS',
      cellBg: '#fdf2f8',
      cellHoverBg: '#fce7f3',
      cellBorder: '#db2777',
      cardBg: '#fce7f3',
      text: '#9d174d',
      accent: '#db2777',
      iconName: 'Sparkles'
    };
  }

  // 10. Library & Private Study
  if (a === 'library' || s.includes('library')) {
    return {
      isExtra: true,
      type: 'library',
      name: subject || 'Library Study',
      badgeText: 'LIBRARY',
      cellBg: '#f0fdfa',
      cellHoverBg: '#ccfbf1',
      cellBorder: '#0d9488',
      cardBg: '#ccfbf1',
      text: '#115e59',
      accent: '#0d9488',
      iconName: 'Library'
    };
  }

  // 11. Weekly Test
  if (a === 'weekly_test' || s.includes('weekly test') || s === 'weekly test' || s === 'weekly tests') {
    return {
      isExtra: true,
      type: 'weekly_test',
      name: subject || 'Weekly Test',
      badgeText: 'WEEKLY TEST',
      cellBg: '#fff1f2',
      cellHoverBg: '#ffe4e6',
      cellBorder: '#e11d48',
      cardBg: '#ffe4e6',
      text: '#9f1239',
      accent: '#e11d48',
      iconName: 'FileCheck'
    };
  }

  return null;
}

// Fallback generator for unmapped subjects
export function getSubjectColor(subjectName: string) {
  if (SUBJECT_COLOR_PALETTE[subjectName]) {
    return SUBJECT_COLOR_PALETTE[subjectName];
  }
  
  // Deterministic color generation based on string hash
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % INVIGILATOR_COLORS.length;
  const col = INVIGILATOR_COLORS[colorIndex];
  return {
    bg: col.bg,
    text: col.text,
    border: col.hex,
    bar: col.hex
  };
}

// Teacher / Invigilator color mapper
export function getTeacherColor(teacherId?: number, initial?: string) {
  if (!teacherId) {
    return { hex: '#64748b', bg: '#f1f5f9', text: '#475569' };
  }
  const index = Math.abs(teacherId) % INVIGILATOR_COLORS.length;
  return INVIGILATOR_COLORS[index];
}

// Day color theme mapper
export function getDayTheme(day: string, customThemes?: Record<string, string>) {
  const base = DEFAULT_DAY_THEMES[day] || {
    name: 'Neutral',
    bg: '#f8fafc',
    border: '#e2e8f0',
    headerBg: '#475569',
    text: '#334155'
  };

  if (customThemes && customThemes[day]) {
    // If user provided custom hex code, adapt background
    const hex = customThemes[day];
    return {
      ...base,
      headerBg: hex,
      text: hex,
      bg: `${hex}15`, // 8-10% opacity tint
      border: `${hex}40`
    };
  }

  return base;
}

// Form Stream color mapper
export function getFormStreamTheme(className: string) {
  return FORM_STREAM_THEMES[className] || {
    badgeBg: '#4b5563',
    badgeText: '#ffffff',
    border: '#9ca3af',
    lightBg: '#f3f4f6',
    accent: '#374151'
  };
}
