import type { 
  AppData, 
  UserAccount, 
  Student, 
  InstitutionalPolicy, 
  SubjectPeriodAllocation, 
  TeacherAssignment, 
  ExaminationRecord, 
  PromotionHistory, 
  TransferHistory 
} from '../types.ts';

export const DEFAULT_SCHOOL_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e3a8a"/><stop offset="100%" stop-color="%230f172a"/></linearGradient><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><circle cx="100" cy="100" r="94" fill="none" stroke="%23d97706" stroke-width="4"/><circle cx="100" cy="100" r="88" fill="%23ffffff" stroke="%231e3a8a" stroke-width="2"/><path d="M 100 24 C 135 24 165 42 165 78 C 165 125 125 158 100 174 C 75 158 35 125 35 78 C 35 42 65 24 100 24 Z" fill="url(%23shieldGrad)" stroke="%23fbbf24" stroke-width="3"/><path d="M 100 42 L 100 115 M 100 48 Q 120 40 142 46 L 142 104 Q 120 98 100 108 Q 80 98 58 104 L 58 46 Q 80 40 100 48 Z" fill="%23ffffff" stroke="%23fbbf24" stroke-width="2"/><circle cx="100" cy="115" r="7" fill="%23ef4444"/><polygon points="100,126 102,132 108,132 103,136 105,142 100,138 95,142 97,136 92,132 98,132" fill="%23fbbf24"/><text x="100" y="160" font-family="Arial, sans-serif" font-weight="900" font-size="10" fill="%23fbbf24" text-anchor="middle" letter-spacing="1">EXCELLENCE</text></svg>`;

export const PRESET_SCHOOL_LOGOS = [
  {
    id: 'navy_academic',
    name: 'Academic Shield (Navy & Gold)',
    dataUrl: DEFAULT_SCHOOL_LOGO
  },
  {
    id: 'emerald_crest',
    name: 'National Crest (Emerald & Gold)',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23047857"/><stop offset="100%" stop-color="%23064e3b"/></linearGradient></defs><circle cx="100" cy="100" r="92" fill="%23ffffff" stroke="%23047857" stroke-width="5"/><circle cx="100" cy="100" r="82" fill="url(%23greenGrad)" stroke="%23f59e0b" stroke-width="3"/><polygon points="100,32 105,48 122,48 108,58 113,74 100,64 87,74 92,58 78,48 95,48" fill="%23fbbf24"/><path d="M 60 90 Q 100 80 140 90 L 135 130 Q 100 145 65 130 Z" fill="%23ffffff" stroke="%23fbbf24" stroke-width="2"/><text x="100" y="112" font-family="Arial, sans-serif" font-weight="900" font-size="14" fill="%23064e3b" text-anchor="middle">EDUCATION</text><text x="100" y="162" font-family="Arial, sans-serif" font-weight="800" font-size="10" fill="%23fbbf24" text-anchor="middle" letter-spacing="1">SELF RELIANCE</text></svg>`
  },
  {
    id: 'royal_torch',
    name: 'Torch of Wisdom (Royal Blue)',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231d4ed8"/><stop offset="100%" stop-color="%231e3a8a"/></linearGradient></defs><path d="M 100 20 L 175 55 L 175 125 Q 100 185 100 185 Q 25 125 25 125 L 25 55 Z" fill="url(%23blueGrad)" stroke="%23f59e0b" stroke-width="4"/><circle cx="100" cy="70" r="22" fill="%23ffffff"/><polygon points="100,52 102,62 107,63 103,67 104,73 100,69 96,73 97,67 93,63 98,62" fill="%23f59e0b"/><path d="M 85 100 L 115 100 L 108 140 L 92 140 Z" fill="%23f59e0b"/><polygon points="100,82 108,98 92,98" fill="%23ef4444"/><text x="100" y="165" font-family="Arial, sans-serif" font-weight="900" font-size="10" fill="%23ffffff" text-anchor="middle" letter-spacing="1">INTEGRITY</text></svg>`
  },
  {
    id: 'gold_star',
    name: 'Circular Seal (Gold & Onyx)',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="92" fill="%230f172a" stroke="%23d97706" stroke-width="5"/><circle cx="100" cy="100" r="78" fill="%23ffffff" stroke="%230f172a" stroke-width="2"/><circle cx="100" cy="100" r="68" fill="%230f172a"/><polygon points="100,50 108,68 128,68 112,80 118,98 100,86 82,98 88,80 72,68 92,68" fill="%23f59e0b"/><text x="100" y="128" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="%23ffffff" text-anchor="middle">LEADERSHIP</text><text x="100" y="145" font-family="Arial, sans-serif" font-weight="800" font-size="9" fill="%23f59e0b" text-anchor="middle">DISCIPLINE</text></svg>`
  }
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr_head',
    email: 'headmaster@school.edu',
    fullName: 'Mwl. Habibu Akida',
    role: 'HEADMASTER',
    schoolId: 'DEMO_SCHOOL'
  },
  {
    id: 'usr_academic',
    email: 'academic@school.edu',
    fullName: 'David Mwakipesile',
    role: 'ACADEMIC',
    schoolId: 'DEMO_SCHOOL'
  },
  {
    id: 'usr_teacher',
    email: 'teacher@school.edu',
    fullName: 'Grace Mchome',
    role: 'TEACHER',
    schoolId: 'DEMO_SCHOOL'
  }
];

// Tanzanian Nursery / Pre-Primary Subjects (Elimu ya Awali)
export const NURSERY_SUBJECTS_LIST = [
  'Kuhesabu na Namba (Numeracy)',
  'Kusoma na Kuwasiliana (Literacy)',
  'Lugha ya Kiingereza ya Awali (Early English)',
  'Afya na Mazingira ya Mtoto',
  'Sanaa, Muziki na Michezo ya Awali',
  'Maadili na Malezi Bora'
];

// Tanzanian Lower Primary Subjects (Standard 1 & 2 - KKK / 3Rs)
export const LOWER_PRIMARY_SUBJECTS_LIST = [
  'Kusoma (Reading)',
  'Kuandika (Writing)',
  'Kuhesabu (Arithmetic)',
  'Afya na Mazingira (Health & Environment)',
  'Sanaa na Michezo (Arts & Sports)',
  'English Language',
  'Elimu ya Dini (Religious Education)'
];

// Tanzanian Upper & Middle Primary Subjects (Standard 3 to 7 - NECTA PSLE & SFNA)
export const UPPER_PRIMARY_SUBJECTS_LIST = [
  'Kiswahili',
  'English Language',
  'Mathematics (Hisabati)',
  'Science and Technology (Sayansi na Teknolojia)',
  'Social Studies (Maarifa ya Jamii)',
  'Civic and Moral Education (Uraia na Maadili)',
  'Vocational Skills (Stadi za Kazi)',
  'Religious Studies (Elimu ya Dini ya Kiislamu / Kikristo)',
  'ICT / TEHAMA',
  'French (Kifaransa)'
];

// All Tanzanian Primary Subjects Combined
export const PRIMARY_SUBJECTS_LIST = [
  ...UPPER_PRIMARY_SUBJECTS_LIST,
  'Kusoma (Reading)',
  'Kuandika (Writing)',
  'Kuhesabu (Arithmetic)',
  'Afya na Mazingira (Health & Environment)',
  'Sanaa na Michezo (Arts & Sports)'
];

// Aliases for consistent naming across components
export const NURSERY_SUBJECTS = NURSERY_SUBJECTS_LIST;
export const LOWER_PRIMARY_SUBJECTS = LOWER_PRIMARY_SUBJECTS_LIST;
export const UPPER_PRIMARY_SUBJECTS = UPPER_PRIMARY_SUBJECTS_LIST;
export const PRIMARY_SUBJECTS = PRIMARY_SUBJECTS_LIST;
import { SubjectRegistry } from './SubjectRegistry.ts';

export const SECONDARY_SUBJECTS = SubjectRegistry.getAllNames();

import { SUBJECT_LIST } from './nectaSubjects.ts';
export { SUBJECT_LIST };
export const SUBJECT_NAMES_LIST = SUBJECT_LIST.map(s => s.name);

export const POPULAR_SUBJECTS = SUBJECT_LIST;

export const EXTRA_CURRICULAR_ACTIVITIES = [
  { id: 'weekly_test', name: 'Weekly Test', icon: 'FileCheck', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', cellBg: '#fff1f2' },
  { id: 'praying', name: 'Praying / Devotion', icon: 'Sparkles', color: '#0284c7', bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1', cellBg: '#f0f9ff' },
  { id: 'religion', name: 'Religion', icon: 'BookMarked', color: '#4f46e5', bg: '#e0e7ff', border: '#a5b4fc', text: '#312e81', cellBg: '#eef2ff' },
  { id: 'breakfast', name: 'Breakfast', icon: 'Coffee', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', text: '#78350f', cellBg: '#fef9c3' },
  { id: 'lunch', name: 'Lunch', icon: 'Utensils', color: '#ea580c', bg: '#ffedd5', border: '#fed7aa', text: '#7c2d12', cellBg: '#fff1e6' },
  { id: 'environmental', name: 'Environmental Day', icon: 'Trees', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', cellBg: '#ecfdf5' },
  { id: 'sports', name: 'Sports and Games', icon: 'Trophy', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', cellBg: '#fff7ed' },
  { id: 'debates', name: 'Debates & Public Speaking', icon: 'MessageSquare', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', cellBg: '#f5f3ff' },
  { id: 'assembly', name: 'General Assembly', icon: 'Users', color: '#4b5563', bg: '#f3f4f6', border: '#e5e7eb', text: '#1f2937', cellBg: '#f3f4f6' },
  { id: 'clubs', name: 'Clubs & Societies', icon: 'Sparkles', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', text: '#9d174d', cellBg: '#fdf2f8' },
  { id: 'library', name: 'Library & Private Study', icon: 'Library', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', cellBg: '#f0fdfa' },
  { id: 'remedial', name: 'Remedial Period', icon: 'BookOpen', color: '#16a34a', bg: '#dcfce7', border: '#86efac', text: '#166534', cellBg: '#f0fdf4' },
  { id: 'options', name: 'Options Period', icon: 'FileCheck', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', cellBg: '#f5f3ff' }
];

export const NURSERY_CLASSES = [
  'Baby Class',
  'Nursery 1',
  'Nursery 2',
  'Pre-Unit'
];

export const PRIMARY_CLASSES = [
  'Standard 1',
  'Standard 2',
  'Standard 3',
  'Standard 4',
  'Standard 5',
  'Standard 6',
  'Standard 7'
];

export const SECONDARY_CLASSES = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6'
];

export const ALL_SCHOOL_CLASSES = [
  ...NURSERY_CLASSES,
  ...PRIMARY_CLASSES,
  ...SECONDARY_CLASSES
];

export const DEFAULT_CLASSES = ALL_SCHOOL_CLASSES;

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export const DEFAULT_DAY_THEMES: Record<string, { name: string; bg: string; border: string; headerBg: string; text: string }> = {
  Monday: {
    name: 'Sky Blue',
    bg: '#f0f7ff',
    border: '#bae6fd',
    headerBg: '#0284c7',
    text: '#0369a1'
  },
  Tuesday: {
    name: 'Emerald Mint',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    headerBg: '#059669',
    text: '#047857'
  },
  Wednesday: {
    name: 'Warm Amber',
    bg: '#fffbeb',
    border: '#fde68a',
    headerBg: '#d97706',
    text: '#b45309'
  },
  Thursday: {
    name: 'Royal Purple',
    bg: '#faf5ff',
    border: '#e9d5ff',
    headerBg: '#7c3aed',
    text: '#6d28d9'
  },
  Friday: {
    name: 'Coral Rose',
    bg: '#fff1f2',
    border: '#fecdd3',
    headerBg: '#e11d48',
    text: '#be123c'
  },
  Saturday: {
    name: 'Slate Teal',
    bg: '#f0fdfa',
    border: '#99f6e4',
    headerBg: '#0d9488',
    text: '#0f766e'
  }
};

export const FORM_STREAM_THEMES: Record<string, { badgeBg: string; badgeText: string; border: string; lightBg: string; accent: string }> = {
  // Pre-Primary & Nursery
  'Baby Class': { badgeBg: '#f43f5e', badgeText: '#ffffff', border: '#fda4af', lightBg: '#fff1f2', accent: '#e11d48' },
  'Nursery 1': { badgeBg: '#ec4899', badgeText: '#ffffff', border: '#f472b6', lightBg: '#fdf2f8', accent: '#db2777' },
  'Nursery 2': { badgeBg: '#d946ef', badgeText: '#ffffff', border: '#e879f9', lightBg: '#fdf4ff', accent: '#c026d3' },
  'Pre-Unit': { badgeBg: '#a855f7', badgeText: '#ffffff', border: '#c084fc', lightBg: '#faf5ff', accent: '#9333ea' },
  // Primary (Standard 1 to Standard 7)
  'Standard 1': { badgeBg: '#0ea5e9', badgeText: '#ffffff', border: '#38bdf8', lightBg: '#f0f9ff', accent: '#0284c7' },
  'Standard 2': { badgeBg: '#06b6d4', badgeText: '#ffffff', border: '#22d3ee', lightBg: '#ecfeff', accent: '#0891b2' },
  'Standard 3': { badgeBg: '#14b8a6', badgeText: '#ffffff', border: '#2dd4bf', lightBg: '#f0fdfa', accent: '#0d9488' },
  'Standard 4': { badgeBg: '#10b981', badgeText: '#ffffff', border: '#34d399', lightBg: '#ecfdf5', accent: '#059669' },
  'Standard 5': { badgeBg: '#84cc16', badgeText: '#ffffff', border: '#a3e635', lightBg: '#f7fee7', accent: '#65a30d' },
  'Standard 6': { badgeBg: '#eab308', badgeText: '#ffffff', border: '#fde047', lightBg: '#fefce8', accent: '#ca8a04' },
  'Standard 7': { badgeBg: '#f97316', badgeText: '#ffffff', border: '#fb923c', lightBg: '#fff7ed', accent: '#ea580c' },
  // Secondary (Form 1 to Form 6)
  'Form 1': {
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    border: '#34d399',
    lightBg: '#ecfdf5',
    accent: '#059669'
  },
  'Form 2': {
    badgeBg: '#3b82f6',
    badgeText: '#ffffff',
    border: '#60a5fa',
    lightBg: '#eff6ff',
    accent: '#2563eb'
  },
  'Form 3': {
    badgeBg: '#8b5cf6',
    badgeText: '#ffffff',
    border: '#a78bfa',
    lightBg: '#f5f3ff',
    accent: '#7c3aed'
  },
  'Form 4': {
    badgeBg: '#f97316',
    badgeText: '#ffffff',
    border: '#fb923c',
    lightBg: '#fff7ed',
    accent: '#ea580c'
  },
  'Form 5': {
    badgeBg: '#ec4899',
    badgeText: '#ffffff',
    border: '#f472b6',
    lightBg: '#fdf2f8',
    accent: '#db2777'
  },
  'Form 6': {
    badgeBg: '#06b6d4',
    badgeText: '#ffffff',
    border: '#22d3ee',
    lightBg: '#ecfeff',
    accent: '#0891b2'
  }
};

export const INVIGILATOR_COLORS = [
  { name: 'Sky', hex: '#0284c7', bg: '#e0f2fe', text: '#0369a1' },
  { name: 'Emerald', hex: '#059669', bg: '#d1fae5', text: '#065f46' },
  { name: 'Amber', hex: '#d97706', bg: '#fef3c7', text: '#92400e' },
  { name: 'Purple', hex: '#7c3aed', bg: '#ede9fe', text: '#5b21b6' },
  { name: 'Rose', hex: '#e11d48', bg: '#ffe4e6', text: '#9f1239' },
  { name: 'Teal', hex: '#0d9488', bg: '#ccfbf1', text: '#115e59' },
  { name: 'Indigo', hex: '#4f46e5', bg: '#e0e7ff', text: '#3730a3' },
  { name: 'Orange', hex: '#ea580c', bg: '#ffedd5', text: '#9a3412' },
  { name: 'Pink', hex: '#db2777', bg: '#fce7f3', text: '#9d174d' },
  { name: 'Cyan', hex: '#0891b2', bg: '#cffafe', text: '#155e75' }
];

export const STAFF_ROLES_LIST = [
  'Academic Master',
  'Academic Mistress',
  'Discipline Master',
  'Discipline Mistress',
  'Headmaster',
  'Headmistress',
  'Second Master',
  'Deputy Headmaster',
  'Examination Officer',
  'Head of Department (HOD) - Science',
  'Head of Department (HOD) - Mathematics',
  'Head of Department (HOD) - Languages',
  'Head of Department (HOD) - Arts & Social Studies',
  'Head of Department (HOD) - Business & ICT',
  'Class Teacher / Master',
  'Sports & Games Master',
  'Health, Sanitation & Environment Master',
  'Guidance & Counseling Master',
  'Patron / Matron (Boarding)',
  'Spiritual Patron (Chaplain / Imam)',
  'Library Master',
  'Subject Teacher'
];

export const INITIAL_TEACHERS = [
  { id: 101, name: 'Adelmarcy Mallya', initial: 'AM', subjects: ['Mathematics', 'Physics'], excludeInvigilation: false, color: '#0284c7', schoolRole: 'Academic Master', phone: '+255 754 112 233', email: 'a.mallya@school.ac.tz' },
  { id: 102, name: 'Baraka Mgimwa', initial: 'BM', subjects: ['English Language', 'Literature in English'], excludeInvigilation: false, color: '#059669', schoolRole: 'Discipline Master', phone: '+255 713 223 344', email: 'b.mgimwa@school.ac.tz' },
  { id: 103, name: 'Catherine Shirima', initial: 'CS', subjects: ['Biology', 'Chemistry'], excludeInvigilation: false, color: '#d97706', schoolRole: 'Head of Department (HOD) - Science', phone: '+255 784 334 455', email: 'c.shirima@school.ac.tz' },
  { id: 104, name: 'David Mwakipesile', initial: 'DM', subjects: ['Geography', 'History'], excludeInvigilation: false, color: '#7c3aed', schoolRole: 'Second Master', phone: '+255 762 445 566', email: 'd.mwakipesile@school.ac.tz' },
  { id: 105, name: 'Emmanuel Tarimo', initial: 'ET', subjects: ['Kiswahili', 'Civics'], excludeInvigilation: false, color: '#e11d48', schoolRole: 'Examination Officer', phone: '+255 655 556 677', email: 'e.tarimo@school.ac.tz' },
  { id: 106, name: 'Faraja Lyimo', initial: 'FL', subjects: ['Computer Studies', 'Mathematics'], excludeInvigilation: false, color: '#0d9488', schoolRole: 'Head of Department (HOD) - Business & ICT', phone: '+255 712 667 788', email: 'f.lyimo@school.ac.tz' },
  { id: 107, name: 'Grace Muro', initial: 'GM', subjects: ['Commerce', 'Book Keeping'], excludeInvigilation: false, color: '#4f46e5', schoolRole: 'Head of Department (HOD) - Arts & Social Studies', phone: '+255 789 778 899', email: 'g.muro@school.ac.tz' },
  { id: 108, name: 'Hamisi Juma', initial: 'HJ', subjects: ['Physical Education', 'Sports and Games'], excludeInvigilation: false, color: '#ea580c', schoolRole: 'Sports & Games Master', phone: '+255 765 889 900', email: 'h.juma@school.ac.tz' }
];

// Optional Tanzanian standard template references for quick setup
export const TANZANIAN_TEMPLATE_PERIOD_SETTINGS = [
  // Monday
  { id: 1, day: 'Monday', name: 'Period 1', start: '08:00', end: '08:40' },
  { id: 2, day: 'Monday', name: 'Period 2', start: '08:40', end: '09:20' },
  { id: 3, day: 'Monday', name: 'Period 3', start: '09:40', end: '10:20' },
  { id: 4, day: 'Monday', name: 'Period 4', start: '10:20', end: '11:00' },
  { id: 5, day: 'Monday', name: 'Period 5', start: '11:20', end: '12:00' },
  { id: 6, day: 'Monday', name: 'Period 6', start: '12:00', end: '12:40' },
  { id: 7, day: 'Monday', name: 'Period 7', start: '14:00', end: '14:40' },
  // Tuesday
  { id: 8, day: 'Tuesday', name: 'Period 1', start: '08:00', end: '08:40' },
  { id: 9, day: 'Tuesday', name: 'Period 2', start: '08:40', end: '09:20' },
  { id: 10, day: 'Tuesday', name: 'Period 3', start: '09:40', end: '10:20' },
  { id: 11, day: 'Tuesday', name: 'Period 4', start: '10:20', end: '11:00' },
  { id: 12, day: 'Tuesday', name: 'Period 5', start: '11:20', end: '12:00' },
  { id: 13, day: 'Tuesday', name: 'Period 6', start: '12:00', end: '12:40' },
  { id: 14, day: 'Tuesday', name: 'Period 7', start: '14:00', end: '14:40' },
  // Wednesday
  { id: 15, day: 'Wednesday', name: 'Period 1', start: '08:00', end: '08:40' },
  { id: 16, day: 'Wednesday', name: 'Period 2', start: '08:40', end: '09:20' },
  { id: 17, day: 'Wednesday', name: 'Period 3', start: '09:40', end: '10:20' },
  { id: 18, day: 'Wednesday', name: 'Period 4', start: '10:20', end: '11:00' },
  { id: 19, day: 'Wednesday', name: 'Period 5', start: '11:20', end: '12:00' },
  { id: 20, day: 'Wednesday', name: 'Period 6', start: '12:00', end: '12:40' },
  { id: 21, day: 'Wednesday', name: 'Period 7', start: '14:00', end: '15:30' },
  // Thursday
  { id: 22, day: 'Thursday', name: 'Period 1', start: '08:00', end: '08:40' },
  { id: 23, day: 'Thursday', name: 'Period 2', start: '08:40', end: '09:20' },
  { id: 24, day: 'Thursday', name: 'Period 3', start: '09:40', end: '10:20' },
  { id: 25, day: 'Thursday', name: 'Period 4', start: '10:20', end: '11:00' },
  { id: 26, day: 'Thursday', name: 'Period 5', start: '11:20', end: '12:00' },
  { id: 27, day: 'Thursday', name: 'Period 6', start: '12:00', end: '12:40' },
  { id: 28, day: 'Thursday', name: 'Period 7', start: '14:00', end: '14:40' },
  // Friday
  { id: 29, day: 'Friday', name: 'Period 1', start: '08:00', end: '08:40' },
  { id: 30, day: 'Friday', name: 'Period 2', start: '08:40', end: '09:20' },
  { id: 31, day: 'Friday', name: 'Period 3', start: '09:40', end: '10:20' },
  { id: 32, day: 'Friday', name: 'Period 4', start: '10:20', end: '11:00' },
  { id: 33, day: 'Friday', name: 'Period 5', start: '11:20', end: '12:00' },
  { id: 34, day: 'Friday', name: 'Period 6', start: '12:00', end: '12:40' },
  { id: 35, day: 'Friday', name: 'Period 7', start: '14:00', end: '15:00' }
];

export const INITIAL_PERIOD_SETTINGS: any[] = TANZANIAN_TEMPLATE_PERIOD_SETTINGS;

export const TANZANIAN_TEMPLATE_STREAM_SETTINGS = [
  { id: 101, className: 'Nursery', level: 'PRE_PRIMARY' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 102, className: 'Baby Class', level: 'PRE_PRIMARY' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 103, className: 'Middle Class', level: 'PRE_PRIMARY' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 104, className: 'Pre-Unit', level: 'PRE_PRIMARY' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 105, className: 'Standard 1', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 106, className: 'Standard 2', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 107, className: 'Standard 3', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 108, className: 'Standard 4', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 109, className: 'Standard 5', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 110, className: 'Standard 6', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 111, className: 'Standard 7', level: 'PRIMARY' as const, streams: ['STREAM A', 'STREAM B', 'STREAM C'] },
  { id: 1, className: 'Form 1', level: 'CSEE' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 2, className: 'Form 2', level: 'CSEE' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 3, className: 'Form 3', level: 'CSEE' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 4, className: 'Form 4', level: 'CSEE' as const, streams: ['STREAM A', 'STREAM B'] },
  { id: 5, className: 'Form 5', level: 'ACSEE' as const, streams: ['PCM', 'PCB', 'HGE'] },
  { id: 6, className: 'Form 6', level: 'ACSEE' as const, streams: ['PCM', 'PCB', 'HKL'] }
];

export const INITIAL_STREAM_SETTINGS: any[] = TANZANIAN_TEMPLATE_STREAM_SETTINGS;

export const TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS: any[] = [
  // ================= Form 1 STREAM A =================
  // Monday
  { id: 201, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 202, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 203, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 204, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 205, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 206, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 207, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Library & Private Study', activityType: 'library' as const },
  // Tuesday
  { id: 230, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 231, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 232, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 233, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 234, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 235, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 236, className: 'Form 1', stream: 'STREAM A', day: 'Tuesday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Wednesday
  { id: 237, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 238, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 239, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 240, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 241, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 242, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 211, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', periodName: 'Period 7', teacherId: 108, teacherName: 'Hamisi Juma', subject: 'Sports and Games', activityType: 'sports' as const },
  // Thursday
  { id: 243, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 244, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 245, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 246, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 247, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 248, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 249, className: 'Form 1', stream: 'STREAM A', day: 'Thursday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  // Friday
  { id: 250, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 251, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 252, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 253, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 213, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Religion', activityType: 'religion' as const, room: 'Chapel / Mosque / Hall' },
  { id: 222, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Weekly Test', activityType: 'weekly_test' as const, room: 'Exam Hall / Class 1A', customNote: 'Weekly evaluation test' },
  { id: 219, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 7 (14:00-15:00)', periodName: 'Period 7', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Environmental Day', activityType: 'environmental' as const, room: 'School Grounds' },

  // ================= Form 1 STREAM B =================
  // Monday
  { id: 208, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 209, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 210, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 254, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 255, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 256, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 257, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  // Tuesday
  { id: 258, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 259, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 260, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 261, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 262, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 263, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 264, className: 'Form 1', stream: 'STREAM B', day: 'Tuesday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Library & Private Study', activityType: 'library' as const },
  // Wednesday
  { id: 265, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 266, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 267, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 268, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 269, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 270, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 212, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', periodName: 'Period 7', teacherId: 108, teacherName: 'Hamisi Juma', subject: 'Sports and Games', activityType: 'sports' as const },
  // Thursday
  { id: 271, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 272, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 273, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 274, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 275, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 276, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 277, className: 'Form 1', stream: 'STREAM B', day: 'Thursday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Friday
  { id: 278, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 279, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Mathematics' },
  { id: 280, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 281, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 214, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Religion', activityType: 'religion' as const, room: 'Chapel / Mosque / Hall' },
  { id: 282, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Weekly Test', activityType: 'weekly_test' as const, room: 'Class 1B' },
  { id: 220, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 7 (14:00-15:00)', periodName: 'Period 7', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'Debates', activityType: 'debates' as const, room: 'Main Hall' },

  // ================= Form 2 STREAM A =================
  // Monday
  { id: 215, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 216, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 283, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 284, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 285, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 286, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 287, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  // Tuesday
  { id: 288, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 289, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 290, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 291, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 292, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 293, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 294, className: 'Form 2', stream: 'STREAM A', day: 'Tuesday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Wednesday
  { id: 295, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 296, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 297, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 298, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 299, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 300, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 217, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', periodName: 'Period 7', teacherId: 108, teacherName: 'Hamisi Juma', subject: 'Sports and Games', activityType: 'sports' as const },
  // Thursday
  { id: 301, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 302, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 303, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 304, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 305, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 306, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 307, className: 'Form 2', stream: 'STREAM A', day: 'Thursday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Friday
  { id: 308, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 309, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 310, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 311, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 221, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Religion', activityType: 'religion' as const, room: 'School Hall' },
  { id: 312, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Weekly Test', activityType: 'weekly_test' as const, room: 'Class 2A' },
  { id: 218, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 7 (14:00-15:00)', periodName: 'Period 7', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Environmental Day', activityType: 'environmental' as const },

  // ================= Form 2 STREAM B =================
  // Monday
  { id: 313, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 314, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 315, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 316, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 317, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 318, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 319, className: 'Form 2', stream: 'STREAM B', day: 'Monday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  // Tuesday
  { id: 320, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 321, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 322, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 323, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 324, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 325, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 326, className: 'Form 2', stream: 'STREAM B', day: 'Tuesday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  // Wednesday
  { id: 327, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 328, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 329, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 330, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 331, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 332, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 333, className: 'Form 2', stream: 'STREAM B', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', periodName: 'Period 7', teacherId: 108, teacherName: 'Hamisi Juma', subject: 'Sports and Games', activityType: 'sports' as const },
  // Thursday
  { id: 334, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 335, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 336, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 337, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 338, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 339, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 340, className: 'Form 2', stream: 'STREAM B', day: 'Thursday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Library & Private Study', activityType: 'library' as const },
  // Friday
  { id: 341, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 342, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 343, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 344, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 345, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Religion', activityType: 'religion' as const, room: 'School Hall' },
  { id: 346, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Weekly Test', activityType: 'weekly_test' as const, room: 'Class 2B' },
  { id: 347, className: 'Form 2', stream: 'STREAM B', day: 'Friday', period: 'Period 7 (14:00-15:00)', periodName: 'Period 7', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'Debates', activityType: 'debates' as const, room: 'Main Hall' },

  // ================= Form 3 STREAM A =================
  // Monday
  { id: 350, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 351, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 352, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 353, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 354, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 355, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 356, className: 'Form 3', stream: 'STREAM A', day: 'Monday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  // Tuesday
  { id: 357, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 358, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 359, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 360, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 361, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 362, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 363, className: 'Form 3', stream: 'STREAM A', day: 'Tuesday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Wednesday
  { id: 364, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 365, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 366, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 367, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 368, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 369, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 370, className: 'Form 3', stream: 'STREAM A', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', periodName: 'Period 7', teacherId: 108, teacherName: 'Hamisi Juma', subject: 'Sports and Games', activityType: 'sports' as const },
  // Thursday
  { id: 371, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 372, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 373, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 374, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 375, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 376, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 377, className: 'Form 3', stream: 'STREAM A', day: 'Thursday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Friday
  { id: 378, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 379, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 380, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 381, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 382, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Religion', activityType: 'religion' as const, room: 'School Hall' },
  { id: 383, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Weekly Test', activityType: 'weekly_test' as const, room: 'Class 3A' },
  { id: 384, className: 'Form 3', stream: 'STREAM A', day: 'Friday', period: 'Period 7 (14:00-15:00)', periodName: 'Period 7', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Environmental Day', activityType: 'environmental' as const },

  // ================= Form 4 STREAM A =================
  // Monday
  { id: 401, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 402, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 403, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 404, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 405, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 406, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 407, className: 'Form 4', stream: 'STREAM A', day: 'Monday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  // Tuesday
  { id: 408, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 409, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 410, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 411, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 412, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 413, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 414, className: 'Form 4', stream: 'STREAM A', day: 'Tuesday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  // Wednesday
  { id: 415, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 416, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 417, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 418, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Geography' },
  { id: 419, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 420, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 106, teacherName: 'Faraja Lyimo', subject: 'Computer Studies' },
  { id: 421, className: 'Form 4', stream: 'STREAM A', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', periodName: 'Period 7', teacherId: 108, teacherName: 'Hamisi Juma', subject: 'Sports and Games', activityType: 'sports' as const },
  // Thursday
  { id: 422, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Physics' },
  { id: 423, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Biology' },
  { id: 424, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 425, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 426, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'History' },
  { id: 427, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Civics' },
  { id: 428, className: 'Form 4', stream: 'STREAM A', day: 'Thursday', period: 'Period 7 (14:00-14:40)', periodName: 'Period 7', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  // Friday
  { id: 429, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 1 (08:00-08:40)', periodName: 'Period 1', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Basic Mathematics' },
  { id: 430, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 2 (08:40-09:20)', periodName: 'Period 2', teacherId: 102, teacherName: 'Baraka Mgimwa', subject: 'English Language' },
  { id: 431, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 3 (09:40-10:20)', periodName: 'Period 3', teacherId: 103, teacherName: 'Catherine Shirima', subject: 'Chemistry' },
  { id: 432, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 4 (10:20-11:00)', periodName: 'Period 4', teacherId: 105, teacherName: 'Emmanuel Tarimo', subject: 'Kiswahili' },
  { id: 433, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 5 (11:20-12:00)', periodName: 'Period 5', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'Religion', activityType: 'religion' as const, room: 'School Hall' },
  { id: 434, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 6 (12:00-12:40)', periodName: 'Period 6', teacherId: 101, teacherName: 'Adelmarcy Mallya', subject: 'National Mock Prep / Test', activityType: 'weekly_test' as const, room: 'Class 4A' },
  { id: 435, className: 'Form 4', stream: 'STREAM A', day: 'Friday', period: 'Period 7 (14:00-15:00)', periodName: 'Period 7', teacherId: 104, teacherName: 'David Mwakipesile', subject: 'Environmental Day', activityType: 'environmental' as const }
];

export const INITIAL_TIMETABLE_ASSIGNMENTS: any[] = TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS;

export const INITIAL_STUDENTS: Student[] = [
  { id: 1, name: 'Amina Juma Mohamed', regNo: 'S0123/0001/2026', sex: 'F', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-05-15', status: 'ACTIVE', parentPhone: '0712345678' },
  { id: 2, name: 'Baraka Saidi Ally', regNo: 'S0123/0002/2026', sex: 'M', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-08-22', status: 'ACTIVE', parentPhone: '0754112233' },
  { id: 3, name: 'Catherine Joseph Shirima', regNo: 'S0123/0003/2026', sex: 'F', className: 'Form 1', stream: 'STREAM B', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2011-01-10', status: 'ACTIVE', parentPhone: '0784334455' },
  { id: 11, name: 'Neema Emmanuel Mushi', regNo: 'S0123/0011/2026', sex: 'F', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-03-12', status: 'ACTIVE', parentPhone: '0765998877' },
  { id: 12, name: 'Kelvin David Temu', regNo: 'S0123/0012/2026', sex: 'M', className: 'Form 1', stream: 'STREAM B', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-09-04', status: 'ACTIVE', parentPhone: '0717223344' },
  { id: 13, name: 'Zainab Bakari Salum', regNo: 'S0123/0013/2026', sex: 'F', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-11-20', status: 'ACTIVE', parentPhone: '0789445566' },
  { id: 14, name: 'Juma Hassan Omari', regNo: 'S0123/0014/2026', sex: 'M', className: 'Form 1', stream: 'STREAM B', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-02-18', status: 'ACTIVE', parentPhone: '0756778899' },
  { id: 15, name: 'Faraja Godfrey Lyimo', regNo: 'S0123/0015/2026', sex: 'M', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History', 'Kiswahili', 'Physics', 'Chemistry'], dob: '2010-07-29', status: 'ACTIVE', parentPhone: '0762334455' },
  { id: 4, name: 'Daudi Hamisi Mvungi', regNo: 'S0123/0004/2026', sex: 'M', className: 'Form 2', stream: 'STREAM A', subjects: ['Physics', 'Chemistry', 'Biology', 'Civics'], dob: '2009-11-30', status: 'ACTIVE', parentPhone: '0718990011' },
  { id: 5, name: 'Ester Richard Mushi', regNo: 'S0123/0005/2026', sex: 'F', className: 'Form 2', stream: 'STREAM A', subjects: ['Physics', 'Chemistry', 'Biology', 'Civics'], dob: '2009-04-05', status: 'ACTIVE', parentPhone: '0755667788' },
  { id: 6, name: 'Faraja Emmanuel Masawe', regNo: 'S0123/0006/2026', sex: 'M', className: 'Form 3', stream: 'STREAM A', subjects: ['History', 'Geography', 'English Language', 'Kiswahili'], dob: '2008-07-18', status: 'ACTIVE', parentPhone: '0787112233' },
  { id: 7, name: 'Grace Peter Mmbaga', regNo: 'S0123/0007/2026', sex: 'F', className: 'Form 3', stream: 'STREAM A', subjects: ['History', 'Geography', 'English Language', 'Kiswahili'], dob: '2008-12-12', status: 'ACTIVE', parentPhone: '0714556677' },
  { id: 8, name: 'Hamisi Omari Kipande', regNo: 'S0123/0008/2026', sex: 'M', className: 'Form 4', stream: 'STREAM B', subjects: ['Book Keeping', 'Commerce', 'Basic Mathematics', 'Civics'], dob: '2007-09-09', status: 'ACTIVE', parentPhone: '0768223344' },
  { id: 9, name: 'Irene John Lyimo', regNo: 'S0123/0009/2026', sex: 'F', className: 'Standard 7', stream: 'STREAM A', subjects: ['Sayansi na Teknolojia', 'Hisabati (Mathematics)', 'Maarifa ya Jamii', 'Kiswahili', 'English Language'], dob: '2012-03-25', status: 'ACTIVE', parentPhone: '0754889900' },
  { id: 10, name: 'John Peter Temu', regNo: 'S0123/0010/2026', sex: 'M', className: 'Standard 4', stream: 'STREAM C', subjects: ['Kusoma', 'Kuandika', 'Kuhesabu', 'Afya na Mazingira', 'Sanaa na Michezo'], dob: '2015-06-14', status: 'ACTIVE', parentPhone: '0719001122' }
];

export const INITIAL_EXAMS = [
  { id: 1, name: 'Midterm I Examination', type: 'Midterm I', level: 'CSEE' as const, className: 'All', date: '2026-03-15', status: 'Active' as const },
  { id: 2, name: 'Terminal Examination', type: 'Terminal', level: 'CSEE' as const, className: 'All', date: '2026-06-20', status: 'Active' as const },
  { id: 3, name: 'Annual Examination', type: 'Annual', level: 'CSEE' as const, className: 'All', date: '2026-11-15', status: 'Active' as const },
  { id: 4, name: 'PSLE Mock Examination (Std 7)', type: 'National Mock', level: 'PRIMARY' as const, className: 'Standard 7', date: '2026-07-25', status: 'Active' as const },
  { id: 5, name: 'SFNA National Assessment (Std 4)', type: 'National Assessment', level: 'PRIMARY' as const, className: 'Standard 4', date: '2026-10-20', status: 'Active' as const },
  { id: 6, name: 'Primary Terminal Exam (Std 1-7)', type: 'Terminal', level: 'PRIMARY' as const, className: 'All', date: '2026-06-18', status: 'Active' as const },
  { id: 7, name: 'Nursery Term II Evaluation', type: 'Assessment', level: 'PRE_PRIMARY' as const, className: 'All', date: '2026-06-15', status: 'Active' as const }
];

export const INITIAL_SESSIONS = [
  {
    id: 1,
    rawDate: '2026-10-15',
    date: '15 Oct 2026',
    day: 'Thursday',
    session: 'SESSION I',
    start: '08:00',
    end: '10:30',
    time: '08:00-10:30',
    subject: 'Mathematics',
    level: 'CSEE' as const,
    className: 'FORM ONE',
    stream: 'STREAM A',
    rooms: 3
  },
  {
    id: 2,
    rawDate: '2026-10-15',
    date: '15 Oct 2026',
    day: 'Thursday',
    session: 'SESSION II',
    start: '13:00',
    end: '15:30',
    time: '13:00-15:30',
    subject: 'English Language',
    level: 'CSEE' as const,
    className: 'FORM ONE',
    stream: 'STREAM B',
    rooms: 3
  },
  {
    id: 3,
    rawDate: '2026-10-16',
    date: '16 Oct 2026',
    day: 'Friday',
    session: 'SESSION I',
    start: '08:00',
    end: '11:00',
    time: '08:00-11:00',
    subject: 'Physics',
    level: 'CSEE' as const,
    className: 'FORM TWO',
    stream: 'STREAM A',
    rooms: 4
  }
];

export const INITIAL_SUPERVISORS = [
  { id: 1, teacherId: 101, name: 'Adelmarcy Mallya', initial: 'AM' },
  { id: 2, teacherId: 104, name: 'David Mwakipesile', initial: 'DM' }
];

export const DEFAULT_INSTITUTIONAL_POLICY: InstitutionalPolicy = {
  totalPeriodsPerDay: 8,
  periodDurationMinutes: 40,
  breakAfterPeriod: 2,
  lunchAfterPeriod: 5,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  maxPeriodsPerTeacherPerDay: 5,
  rules: {
    noTeacherTwoClassesSameTime: true,
    noClassTwoTeachersSameTime: true,
    noSameSubjectTwiceSameDay: true,
    allowParallelElectiveSubjects: true
  }
};

export const DEFAULT_SUBJECT_PERIOD_ALLOCATIONS: SubjectPeriodAllocation[] = [
  // Nursery Level
  { id: 'spa_nur_1', level: 'NURSERY', className: 'Baby Class', stream: 'STREAM A', subject: 'Kuhesabu na Namba (Numeracy)', periodsPerWeek: 5 },
  { id: 'spa_nur_2', level: 'NURSERY', className: 'Baby Class', stream: 'STREAM A', subject: 'Kusoma na Kuwasiliana (Literacy)', periodsPerWeek: 5 },
  { id: 'spa_nur_3', level: 'NURSERY', className: 'Baby Class', stream: 'STREAM A', subject: 'Lugha ya Kiingereza ya Awali (Early English)', periodsPerWeek: 4 },
  { id: 'spa_nur_4', level: 'NURSERY', className: 'Baby Class', stream: 'STREAM A', subject: 'Afya na Mazingira ya Mtoto', periodsPerWeek: 4 },
  { id: 'spa_nur_5', level: 'NURSERY', className: 'Baby Class', stream: 'STREAM A', subject: 'Sanaa, Muziki na Michezo ya Awali', periodsPerWeek: 4 },
  { id: 'spa_nur_6', level: 'NURSERY', className: 'Baby Class', stream: 'STREAM A', subject: 'Maadili na Malezi Bora', periodsPerWeek: 3 },
  // Primary Level
  { id: 'spa_pri_1', level: 'PRIMARY', className: 'Standard 1', stream: 'STREAM A', subject: 'Mathematics (Hisabati)', periodsPerWeek: 6 },
  { id: 'spa_pri_2', level: 'PRIMARY', className: 'Standard 1', stream: 'STREAM A', subject: 'English Language', periodsPerWeek: 6 },
  { id: 'spa_pri_3', level: 'PRIMARY', className: 'Standard 1', stream: 'STREAM A', subject: 'Kiswahili', periodsPerWeek: 6 },
  { id: 'spa_pri_4', level: 'PRIMARY', className: 'Standard 1', stream: 'STREAM A', subject: 'Science and Technology (Sayansi na Teknolojia)', periodsPerWeek: 5 },
  { id: 'spa_pri_5', level: 'PRIMARY', className: 'Standard 1', stream: 'STREAM A', subject: 'Social Studies (Maarifa ya Jamii)', periodsPerWeek: 4 },
  { id: 'spa_pri_6', level: 'PRIMARY', className: 'Standard 1', stream: 'STREAM A', subject: 'Civic and Moral Education (Uraia na Maadili)', periodsPerWeek: 3 },
  // Secondary Level
  { id: 'spa_sec_1', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Mathematics', periodsPerWeek: 6 },
  { id: 'spa_sec_2', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'English Language', periodsPerWeek: 5 },
  { id: 'spa_sec_3', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Kiswahili', periodsPerWeek: 4 },
  { id: 'spa_sec_4', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Biology', periodsPerWeek: 4 },
  { id: 'spa_sec_5', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Chemistry', periodsPerWeek: 4 },
  { id: 'spa_sec_6', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Physics', periodsPerWeek: 4 },
  { id: 'spa_sec_7', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Geography', periodsPerWeek: 3 },
  { id: 'spa_sec_8', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'History', periodsPerWeek: 3 },
  { id: 'spa_sec_9', level: 'SECONDARY', className: 'Form 1', stream: 'STREAM A', subject: 'Civics', periodsPerWeek: 3 }
];

export const DEFAULT_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  { id: 'ta_1', teacherId: 101, teacherName: 'Adelmarcy Mallya', level: 'SECONDARY', subjects: ['Mathematics', 'Physics'], streams: ['Form 1 - STREAM A', 'Form 1 - STREAM B', 'Form 2 - STREAM A'] },
  { id: 'ta_2', teacherId: 102, teacherName: 'Baraka Mgimwa', level: 'SECONDARY', subjects: ['English Language', 'Literature in English'], streams: ['Form 1 - STREAM A', 'Form 1 - STREAM B', 'Form 3 - STREAM A'] },
  { id: 'ta_3', teacherId: 103, teacherName: 'Catherine Shirima', level: 'SECONDARY', subjects: ['Biology', 'Chemistry'], streams: ['Form 1 - STREAM A', 'Form 2 - STREAM A', 'Form 4 - STREAM A'] },
  { id: 'ta_4', teacherId: 104, teacherName: 'David Mwakipesile', level: 'SECONDARY', subjects: ['Geography', 'History'], streams: ['Form 1 - STREAM A', 'Form 1 - STREAM B', 'Form 2 - STREAM B'] },
  { id: 'ta_5', teacherId: 105, teacherName: 'Emmanuel Tarimo', level: 'SECONDARY', subjects: ['Kiswahili', 'Civics'], streams: ['Form 1 - STREAM A', 'Form 2 - STREAM A', 'Form 3 - STREAM B'] },
  { id: 'ta_6', teacherId: 106, teacherName: 'Faraja Lyimo', level: 'SECONDARY', subjects: ['Computer Studies', 'Mathematics'], streams: ['Form 1 - STREAM A', 'Form 3 - STREAM A'] },
  { id: 'ta_7', teacherId: 107, teacherName: 'Grace Muro', level: 'SECONDARY', subjects: ['Commerce', 'Book Keeping'], streams: ['Form 1 - STREAM A', 'Form 2 - STREAM A', 'Form 3 - STREAM A'] },
  { id: 'ta_8', teacherId: 108, teacherName: 'Hamisi Juma', level: 'SECONDARY', subjects: ['Physical Education', 'Sports and Games'], streams: ['Form 1 - STREAM A', 'Form 1 - STREAM B', 'Form 2 - STREAM A'] }
];

export const INITIAL_EXAMINATION_RECORDS: ExaminationRecord[] = [
  { 
    id: 'rec_1', 
    studentId: 1, 
    studentName: 'Amina Juma Mohamed', 
    regNo: 'S0123/0001/2026', 
    className: 'Form 1', 
    stream: 'STREAM A',
    gender: 'Female',
    parentPhone: '0712345678',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 95, grade: 'A' }, 
      'English Language': { marks: 88, grade: 'A' }, 
      'Biology': { marks: 92, grade: 'A' }, 
      'History': { marks: 84, grade: 'A' },
      'Kiswahili': { marks: 90, grade: 'A' },
      'Physics': { marks: 85, grade: 'A' }
    }, 
    totalMarks: 534, 
    averageMarks: 89.0, 
    overallGrade: 'A', 
    division: 'I', 
    points: 7, 
    positionInClass: 1, 
    totalStudents: 8, 
    teacherRemarks: 'Excellent performance. Keep it up!',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_11', 
    studentId: 11, 
    studentName: 'Neema Emmanuel Mushi', 
    regNo: 'S0123/0011/2026', 
    className: 'Form 1', 
    stream: 'STREAM A',
    gender: 'Female',
    parentPhone: '0765998877',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 88, grade: 'A' }, 
      'English Language': { marks: 92, grade: 'A' }, 
      'Biology': { marks: 86, grade: 'A' }, 
      'History': { marks: 82, grade: 'A' },
      'Kiswahili': { marks: 85, grade: 'A' },
      'Physics': { marks: 79, grade: 'B' }
    }, 
    totalMarks: 512, 
    averageMarks: 85.3, 
    overallGrade: 'A', 
    division: 'I', 
    points: 8, 
    positionInClass: 2, 
    totalStudents: 8, 
    teacherRemarks: 'Outstanding intellectual achievement.',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_12', 
    studentId: 12, 
    studentName: 'Kelvin David Temu', 
    regNo: 'S0123/0012/2026', 
    className: 'Form 1', 
    stream: 'STREAM B',
    gender: 'Male',
    parentPhone: '0717223344',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 91, grade: 'A' }, 
      'English Language': { marks: 78, grade: 'A' }, 
      'Biology': { marks: 82, grade: 'A' }, 
      'History': { marks: 76, grade: 'B' },
      'Kiswahili': { marks: 80, grade: 'A' },
      'Physics': { marks: 82, grade: 'A' }
    }, 
    totalMarks: 489, 
    averageMarks: 81.5, 
    overallGrade: 'A', 
    division: 'I', 
    points: 9, 
    positionInClass: 3, 
    totalStudents: 8, 
    teacherRemarks: 'Very good grasp of scientific concepts.',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_13', 
    studentId: 13, 
    studentName: 'Zainab Bakari Salum', 
    regNo: 'S0123/0013/2026', 
    className: 'Form 1', 
    stream: 'STREAM A',
    gender: 'Female',
    parentPhone: '0789445566',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 75, grade: 'B' }, 
      'English Language': { marks: 84, grade: 'A' }, 
      'Biology': { marks: 80, grade: 'A' }, 
      'History': { marks: 78, grade: 'A' },
      'Kiswahili': { marks: 82, grade: 'A' },
      'Physics': { marks: 68, grade: 'B' }
    }, 
    totalMarks: 467, 
    averageMarks: 77.8, 
    overallGrade: 'B', 
    division: 'I', 
    points: 11, 
    positionInClass: 4, 
    totalStudents: 8, 
    teacherRemarks: 'Great performance in languages and biology.',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_2', 
    studentId: 2, 
    studentName: 'Baraka Saidi Ally', 
    regNo: 'S0123/0002/2026', 
    className: 'Form 1', 
    stream: 'STREAM A',
    gender: 'Male',
    parentPhone: '0754112233',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 72, grade: 'B' }, 
      'English Language': { marks: 70, grade: 'B' }, 
      'Biology': { marks: 75, grade: 'B' }, 
      'History': { marks: 74, grade: 'B' },
      'Kiswahili': { marks: 76, grade: 'B' },
      'Physics': { marks: 67, grade: 'B' }
    }, 
    totalMarks: 434, 
    averageMarks: 72.3, 
    overallGrade: 'B', 
    division: 'I', 
    points: 14, 
    positionInClass: 5, 
    totalStudents: 8, 
    teacherRemarks: 'Consistently solid effort.',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_14', 
    studentId: 14, 
    studentName: 'Juma Hassan Omari', 
    regNo: 'S0123/0014/2026', 
    className: 'Form 1', 
    stream: 'STREAM B',
    gender: 'Male',
    parentPhone: '0756778899',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 64, grade: 'B' }, 
      'English Language': { marks: 68, grade: 'B' }, 
      'Biology': { marks: 70, grade: 'B' }, 
      'History': { marks: 66, grade: 'B' },
      'Kiswahili': { marks: 71, grade: 'B' },
      'Physics': { marks: 57, grade: 'C' }
    }, 
    totalMarks: 396, 
    averageMarks: 66.0, 
    overallGrade: 'B', 
    division: 'II', 
    points: 16, 
    positionInClass: 6, 
    totalStudents: 8, 
    teacherRemarks: 'Good progress. Put more effort into physics.',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_3', 
    studentId: 3, 
    studentName: 'Catherine Joseph Shirima', 
    regNo: 'S0123/0003/2026', 
    className: 'Form 1', 
    stream: 'STREAM B',
    gender: 'Female',
    parentPhone: '0784334455',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 55, grade: 'C' }, 
      'English Language': { marks: 64, grade: 'B' }, 
      'Biology': { marks: 62, grade: 'B' }, 
      'History': { marks: 60, grade: 'B' },
      'Kiswahili': { marks: 65, grade: 'B' },
      'Physics': { marks: 51, grade: 'C' }
    }, 
    totalMarks: 357, 
    averageMarks: 59.5, 
    overallGrade: 'C', 
    division: 'II', 
    points: 19, 
    positionInClass: 7, 
    totalStudents: 8, 
    teacherRemarks: 'Capable of reaching Division I with focus.',
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_15', 
    studentId: 15, 
    studentName: 'Faraja Godfrey Lyimo', 
    regNo: 'S0123/0015/2026', 
    className: 'Form 1', 
    stream: 'STREAM A',
    gender: 'Male',
    parentPhone: '0762334455',
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 48, grade: 'C' }, 
      'English Language': { marks: 58, grade: 'C' }, 
      'Biology': { marks: 54, grade: 'C' }, 
      'History': { marks: 56, grade: 'C' },
      'Kiswahili': { marks: 55, grade: 'C' },
      'Physics': { marks: 46, grade: 'C' }
    }, 
    totalMarks: 317, 
    averageMarks: 52.8, 
    overallGrade: 'C', 
    division: 'III', 
    points: 22, 
    positionInClass: 8, 
    totalStudents: 8, 
    teacherRemarks: 'Steady progress. Needs remedial assistance in math.',
    createdAt: '2026-03-01T00:00:00Z' 
  }
];

export const INITIAL_PROMOTION_HISTORY: PromotionHistory[] = [];

export const INITIAL_TRANSFER_HISTORY: TransferHistory[] = [];

export const DEFAULT_APP_DATA: AppData = {
  users: INITIAL_USERS,
  students: INITIAL_STUDENTS,
  teachers: INITIAL_TEACHERS,
  exams: INITIAL_EXAMS,
  periodSettings: INITIAL_PERIOD_SETTINGS,
  streamSettings: INITIAL_STREAM_SETTINGS,
  timetableAssignments: INITIAL_TIMETABLE_ASSIGNMENTS,
  sessions: INITIAL_SESSIONS,
  supervisors: INITIAL_SUPERVISORS,
  resultsStatus: 'active',
  selectedInvigilators: [101, 102, 103, 104, 105, 106, 107, 108],
  invigilationAssignments: {},
  timetableReleased: true,
  classTimetableReleased: {
    'Form 1': true,
    'Form 2': true,
    'Form 3': true,
    'Form 4': true,
    'Form 5': true,
    'Form 6': true
  },
  schoolInfo: {
    name: 'HabyEduPro3A',
    schoolNumber: 'S.0123',
    address: 'P.O. Box 1234, Tanga, Tanzania',
    phone: '0717616343',
    email: 'info@habyedupro3a.ac.tz',
    motto: 'Education for Development & Integrity',
    principal: 'Mwl. H. Akida',
    logo: DEFAULT_SCHOOL_LOGO,
    institutionalLevels: ['NURSERY', 'PRIMARY', 'SECONDARY']
  },
  institutionalPolicy: DEFAULT_INSTITUTIONAL_POLICY,
  subjectPeriodAllocations: DEFAULT_SUBJECT_PERIOD_ALLOCATIONS,
  teacherAssignments: DEFAULT_TEACHER_ASSIGNMENTS,
  examinationRecords: INITIAL_EXAMINATION_RECORDS,
  usalRecords: [],
  promotionHistory: INITIAL_PROMOTION_HISTORY,
  transferHistory: INITIAL_TRANSFER_HISTORY,
  activityLogs: [
    {
      id: 'log_init_1',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      userId: 'usr_head',
      userName: 'Mwl. Habibu Akida',
      userEmail: 'habibuakida@gmail.com',
      userRole: 'HEADMASTER',
      action: 'SYSTEM_RESET',
      category: 'settings',
      title: 'Academic Database Initialized',
      description: 'Initialized standard curriculum, official Tanzanian subject structures, and term timetable settings.'
    },
    {
      id: 'log_init_2',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      userId: 'usr_academic',
      userName: 'David Mwakipesile',
      userEmail: 'academic@school.edu',
      userRole: 'ACADEMIC',
      action: 'TIMETABLE_UPDATE',
      category: 'timetable',
      title: 'Form 1-4 Schedules Published',
      description: 'Completed teaching schedule allocations and assigned staff invigilation periods for term.'
    }
  ],
  disciplineRecords: [
    {
      id: 'disc_1',
      studentId: 1,
      studentName: 'Amina Juma Mohamed',
      regNo: 'S0001',
      className: 'Form 1',
      date: '2026-02-10',
      category: 'Merit',
      title: 'Academic Excellence & Leadership',
      description: 'Demonstrated outstanding peer tutoring and exemplary conduct in science club.',
      actionTaken: 'Commendation Certificate awarded by Academic Master',
      reportedBy: 'David Mwakipesile',
      status: 'Resolved'
    },
    {
      id: 'disc_2',
      studentId: 3,
      studentName: 'Kelvin Jackson Shirima',
      regNo: 'S0003',
      className: 'Form 1',
      date: '2026-02-14',
      category: 'Attendance',
      title: 'Late arrival to morning assembly',
      description: 'Arrived 25 minutes late after bell with no parent note.',
      actionTaken: 'Verbal warning and counseling with class teacher',
      reportedBy: 'Grace Mchome',
      status: 'Resolved'
    }
  ],
  dailyAttendance: {},
  schemesOfWork: [],
  lessonPlans: [],
  savedTimetableRecords: [],
  savedInvigilationRecords: [],
  subjectPaperConfigs: {},
  academicTermDates: {
    yearOpeningDate: '2026-01-13',
    midTerm1BreakStart: '2026-03-27',
    midTerm1BreakEnd: '2026-04-08',
    terminalBreakStart: '2026-06-05',
    terminalBreakEnd: '2026-07-06',
    midTerm2BreakStart: '2026-09-04',
    midTerm2BreakEnd: '2026-09-14',
    annualBreakStart: '2026-12-04',
    annualBreakEnd: '2027-01-11'
  },
  communicationTemplates: [
    {
      id: 'default-results-sms',
      name: 'Matokeo ya Mtihani (SMS)',
      type: 'SMS',
      category: 'Results',
      content: 'Ndugu Mzazi, matokeo ya {studentName} {examName} {year}: DIV {division}, AGGT {marks}. Masomo: {subjects}. - {schoolName}',
      isDefault: true
    },
    {
      id: 'default-results-whatsapp',
      name: 'Matokeo ya Mtihani (WhatsApp)',
      type: 'WhatsApp',
      category: 'Results',
      content: '*MATOKEO YA MTIHANI*\n\nNdugu Mzazi, haya ni matokeo ya mwanao *{studentName}* kwa mtihani wa *{examName}* mwaka *{year}*:\n\n*Division:* {division}\n*Points:* {marks}\n\n*Masomo:*\n{subjects}\n\nAsante,\n*{schoolName}*',
      isDefault: true
    }
  ]
};

