import { 
  AppData, 
  UserAccount, 
  Student, 
  InstitutionalPolicy, 
  SubjectPeriodAllocation, 
  TeacherAssignment, 
  ExaminationRecord, 
  PromotionHistory, 
  TransferHistory 
} from '../types';

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
export const SECONDARY_SUBJECTS = [
  'English Language',
  'Kiswahili',
  'Basic Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Civics',
  'Geography',
  'History',
  'Commerce',
  'Book Keeping',
  'Literature in English',
  'Agriculture',
  'Computer Studies',
  'Fine Art',
  'Physical Education',
  'French',
  'Arabic',
  'Bible Knowledge',
  'Islamic Knowledge',
  'Mikondo'
];

export const SUBJECT_LIST = [
  // Primary & Pre-Primary Subjects (Tanzanian Curriculum)
  'Kiswahili',
  'English Language',
  'Mathematics (Hisabati)',
  'Science and Technology (Sayansi na Teknolojia)',
  'Social Studies (Maarifa ya Jamii)',
  'Civic and Moral Education (Uraia na Maadili)',
  'Vocational Skills (Stadi za Kazi)',
  'Kusoma (Reading)',
  'Kuandika (Writing)',
  'Kuhesabu (Arithmetic)',
  'Afya na Mazingira (Health & Environment)',
  'Sanaa na Michezo (Arts & Sports)',
  'Kuhesabu na Namba (Numeracy)',
  'Kusoma na Kuwasiliana (Literacy)',
  'Lugha ya Kiingereza ya Awali (Early English)',
  'Afya na Mazingira ya Mtoto',
  'Sanaa, Muziki na Michezo ya Awali',
  'Maadili na Malezi Bora',
  // Secondary O-Level & A-Level Subjects
  'Mathematics',
  'Basic Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'History',
  'Civics',
  'Computer Studies',
  'ICT / TEHAMA',
  'Commerce',
  'Book Keeping',
  'Economics',
  'Agriculture',
  'Business Studies',
  'Islamic Religious Education',
  'Christian Religious Education',
  'Elimu ya Dini ya Kiislamu',
  'Elimu ya Dini ya Kikristo',
  'Religious Studies (Elimu ya Dini ya Kiislamu / Kikristo)',
  'Fine Art',
  'Home Economics',
  'Physical Education',
  'French',
  'French (Kifaransa)',
  'Arabic',
  'German',
  'General Studies',
  'Advanced Mathematics',
  'Basic Applied Mathematics',
  'Accountancy',
  'Computer Science',
  'Divinity',
  'Historia Ya Tanzania Na Maadili',
  'Literature in English',
  'Academic Communications',
  'Mikondo',
  // Extra-curricular / special meal & activity periods
  'Religion',
  'Praying',
  'Prayer & Devotion',
  'Breakfast',
  'Lunch',
  'Environmental Day',
  'Sports and Games',
  'Debates',
  'General Assembly',
  'Clubs & Societies',
  'Library & Private Study',
  'Weekly Test'
];

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
  { id: 'library', name: 'Library & Private Study', icon: 'Library', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', cellBg: '#f0fdfa' }
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

export const INITIAL_PERIOD_SETTINGS: any[] = [];

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

export const INITIAL_STREAM_SETTINGS: any[] = [];

export const TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS = [
  // Form 1 STREAM A
  { id: 201, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 1 (08:00-08:40)', teacherId: 101, subject: 'Mathematics' },
  { id: 202, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 2 (08:40-09:20)', teacherId: 102, subject: 'English Language' },
  { id: 203, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 3 (09:40-10:20)', teacherId: 103, subject: 'Biology' },
  { id: 204, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 4 (10:20-11:00)', teacherId: 104, subject: 'Geography' },
  { id: 205, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 5 (11:20-12:00)', teacherId: 105, subject: 'Kiswahili' },
  { id: 206, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 6 (12:00-12:40)', teacherId: 106, subject: 'Computer Studies' },
  { id: 207, className: 'Form 1', stream: 'STREAM A', day: 'Monday', period: 'Period 7 (14:00-14:40)', teacherId: 101, subject: 'Library & Private Study', activityType: 'library' as const },

  // Form 1 STREAM B
  { id: 208, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 1 (08:00-08:40)', teacherId: 102, subject: 'English Language' },
  { id: 209, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 2 (08:40-09:20)', teacherId: 101, subject: 'Mathematics' },
  { id: 210, className: 'Form 1', stream: 'STREAM B', day: 'Monday', period: 'Period 3 (09:40-10:20)', teacherId: 105, subject: 'Kiswahili' },
  
  // Wednesday Extra-curricular (Sports & Games)
  { id: 211, className: 'Form 1', stream: 'STREAM A', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', teacherId: 108, subject: 'Sports and Games', activityType: 'sports' as const },
  { id: 212, className: 'Form 1', stream: 'STREAM B', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', teacherId: 108, subject: 'Sports and Games', activityType: 'sports' as const },

  // Friday Extra-curricular (Religion, Environmental Day & Debates)
  { id: 213, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 5 (11:20-12:00)', subject: 'Religion', activityType: 'religion' as const, room: 'Chapel / Mosque / Hall' },
  { id: 214, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 5 (11:20-12:00)', subject: 'Religion', activityType: 'religion' as const, room: 'Chapel / Mosque / Hall' },
  { id: 219, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 7 (14:00-15:00)', teacherId: 104, subject: 'Environmental Day', activityType: 'environmental' as const, room: 'School Grounds' },
  { id: 220, className: 'Form 1', stream: 'STREAM B', day: 'Friday', period: 'Period 7 (14:00-15:00)', teacherId: 102, subject: 'Debates', activityType: 'debates' as const, room: 'Main Hall' },

  // Form 2 STREAM A
  { id: 215, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 1 (08:00-08:40)', teacherId: 103, subject: 'Chemistry' },
  { id: 216, className: 'Form 2', stream: 'STREAM A', day: 'Monday', period: 'Period 2 (08:40-09:20)', teacherId: 104, subject: 'History' },
  { id: 217, className: 'Form 2', stream: 'STREAM A', day: 'Wednesday', period: 'Period 7 (14:00-15:30)', teacherId: 108, subject: 'Sports and Games', activityType: 'sports' as const },
  { id: 218, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 7 (14:00-15:00)', teacherId: 104, subject: 'Environmental Day', activityType: 'environmental' as const },
  { id: 221, className: 'Form 2', stream: 'STREAM A', day: 'Friday', period: 'Period 5 (11:20-12:00)', subject: 'Religion', activityType: 'religion' as const, room: 'School Hall' },
  { id: 222, className: 'Form 1', stream: 'STREAM A', day: 'Friday', period: 'Period 6 (12:00-12:40)', teacherId: 101, subject: 'Weekly Test', activityType: 'weekly_test' as const, room: 'Exam Hall / Class 1A', customNote: 'Weekly evaluation test' }
];

export const INITIAL_TIMETABLE_ASSIGNMENTS: any[] = [];

export const INITIAL_STUDENTS: Student[] = [
  { id: 1, name: 'Amina Juma Mohamed', regNo: 'S0123/0001/2026', sex: 'F', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History'], dob: '2010-05-15', status: 'ACTIVE' },
  { id: 2, name: 'Baraka Saidi Ally', regNo: 'S0123/0002/2026', sex: 'M', className: 'Form 1', stream: 'STREAM A', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History'], dob: '2010-08-22', status: 'ACTIVE' },
  { id: 3, name: 'Catherine Joseph Shirima', regNo: 'S0123/0003/2026', sex: 'F', className: 'Form 1', stream: 'STREAM B', subjects: ['Basic Mathematics', 'English Language', 'Biology', 'History'], dob: '2011-01-10', status: 'ACTIVE' },
  { id: 4, name: 'Daudi Hamisi Mvungi', regNo: 'S0123/0004/2026', sex: 'M', className: 'Form 2', stream: 'STREAM A', subjects: ['Physics', 'Chemistry', 'Biology', 'Civics'], dob: '2009-11-30', status: 'ACTIVE' },
  { id: 5, name: 'Ester Richard Mushi', regNo: 'S0123/0005/2026', sex: 'F', className: 'Form 2', stream: 'STREAM A', subjects: ['Physics', 'Chemistry', 'Biology', 'Civics'], dob: '2009-04-05', status: 'ACTIVE' },
  { id: 6, name: 'Faraja Emmanuel Masawe', regNo: 'S0123/0006/2026', sex: 'M', className: 'Form 3', stream: 'STREAM A', subjects: ['History', 'Geography', 'English Language', 'Kiswahili'], dob: '2008-07-18', status: 'ACTIVE' },
  { id: 7, name: 'Grace Peter Mmbaga', regNo: 'S0123/0007/2026', sex: 'F', className: 'Form 3', stream: 'STREAM A', subjects: ['History', 'Geography', 'English Language', 'Kiswahili'], dob: '2008-12-12', status: 'ACTIVE' },
  { id: 8, name: 'Hamisi Omari Kipande', regNo: 'S0123/0008/2026', sex: 'M', className: 'Form 4', stream: 'STREAM B', subjects: ['Book Keeping', 'Commerce', 'Basic Mathematics', 'Civics'], dob: '2007-09-09', status: 'ACTIVE' },
  { id: 9, name: 'Irene John Lyimo', regNo: 'S0123/0009/2026', sex: 'F', className: 'Standard 7', stream: 'STREAM A', subjects: ['Sayansi na Teknolojia', 'Hisabati (Mathematics)', 'Maarifa ya Jamii', 'Kiswahili', 'English Language'], dob: '2012-03-25', status: 'ACTIVE' },
  { id: 10, name: 'John Peter Temu', regNo: 'S0123/0010/2026', sex: 'M', className: 'Standard 4', stream: 'STREAM C', subjects: ['Kusoma', 'Kuandika', 'Kuhesabu', 'Afya na Mazingira', 'Sanaa na Michezo'], dob: '2015-06-14', status: 'ACTIVE' }
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
    noSameSubjectTwiceSameDay: true
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
  { id: 'ta_7', teacherId: 107, teacherName: 'Grace Muro', level: 'PRIMARY', subjects: ['English Language', 'Social Studies (Maarifa ya Jamii)'], streams: ['Standard 1 - STREAM A', 'Standard 1 - STREAM B', 'Standard 2 - STREAM A'] },
  { id: 'ta_8', teacherId: 108, teacherName: 'Hamisi Juma', level: 'NURSERY', subjects: ['Sanaa, Muziki na Michezo ya Awali', 'Afya na Mazingira ya Mtoto'], streams: ['Baby Class - STREAM A', 'Nursery - STREAM A'] }
];

export const INITIAL_EXAMINATION_RECORDS: ExaminationRecord[] = [
  { 
    id: 'rec_1', 
    studentId: 1, 
    studentName: 'Amina Juma Mohamed', 
    regNo: 'S0123/0001/2026', 
    className: 'Form 1', 
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 85, grade: 'A' }, 
      'English Language': { marks: 78, grade: 'A' }, 
      'Biology': { marks: 92, grade: 'A' }, 
      'History': { marks: 80, grade: 'A' } 
    }, 
    totalMarks: 335, 
    averageMarks: 83.8, 
    overallGrade: 'A', 
    division: 'I', 
    points: 7, 
    positionInClass: 1, 
    totalStudents: 10, 
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_2', 
    studentId: 2, 
    studentName: 'Baraka Saidi Ally', 
    regNo: 'S0123/0002/2026', 
    className: 'Form 1', 
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 65, grade: 'B' }, 
      'English Language': { marks: 60, grade: 'B' }, 
      'Biology': { marks: 70, grade: 'B' }, 
      'History': { marks: 68, grade: 'B' } 
    }, 
    totalMarks: 263, 
    averageMarks: 65.75, 
    overallGrade: 'B', 
    division: 'I', 
    points: 15, 
    positionInClass: 2, 
    totalStudents: 10, 
    createdAt: '2026-03-01T00:00:00Z' 
  },
  { 
    id: 'rec_3', 
    studentId: 3, 
    studentName: 'Catherine Joseph Shirima', 
    regNo: 'S0123/0003/2026', 
    className: 'Form 1', 
    academicYear: '2026', 
    academicCalendarType: 'JAN-DEC', 
    term: 'Term 1', 
    examType: 'Midterm', 
    subjects: { 
      'Basic Mathematics': { marks: 45, grade: 'C' }, 
      'English Language': { marks: 55, grade: 'C' }, 
      'Biology': { marks: 48, grade: 'C' }, 
      'History': { marks: 52, grade: 'C' } 
    }, 
    totalMarks: 200, 
    averageMarks: 50, 
    overallGrade: 'C', 
    division: 'II', 
    points: 21, 
    positionInClass: 3, 
    totalStudents: 10, 
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
  subjectPaperConfigs: {}
};

