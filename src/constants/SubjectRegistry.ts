import { SUBJECT_LIST, Subject } from './nectaSubjects';

/**
 * SubjectRegistry
 * Centralized utility for managing NECTA-compliant subjects across the Haby Edu Pro system.
 * Ensures consistent subject lists for Student Registration, Teacher Assignment, and Result Analysis.
 */

export interface RegistrySubject extends Subject {
  level: 'PRE_PRIMARY' | 'PRIMARY' | 'CSEE' | 'ACSEE' | 'OTHER';
  isCompulsory?: boolean;
}

// Map the flat SUBJECT_LIST to a categorized registry
const REGISTRY: RegistrySubject[] = SUBJECT_LIST.map(s => {
  const codeNum = parseInt(s.code, 10);
  let level: RegistrySubject['level'] = 'CSEE';
  
  if (codeNum < 10) {
    level = 'PRIMARY';
  } else if (codeNum >= 100 && codeNum < 200) {
    level = 'ACSEE';
  } else if (codeNum >= 200) {
    level = 'OTHER';
  }

  // Define some core compulsory subjects based on NECTA standards
  const compulsoryNames = [
    'Basic Mathematics', 'English Language', 'Kiswahili', 'Civics', 'History', 'Geography', 'Biology',
    'General Studies', 'Academic Communication', 'Historia ya Tanzania na Maadili',
    'Mathematics', 'Science and Technology', 'Social Studies & Vocational Skills'
  ];

  return {
    ...s,
    level,
    isCompulsory: compulsoryNames.some(name => s.name.toLowerCase().includes(name.toLowerCase()))
  };
});

export const SubjectRegistry = {
  /**
   * Get all registered subjects
   */
  getAll: () => REGISTRY,

  /**
   * Get subjects filtered by educational level
   */
  getByLevel: (level: RegistrySubject['level']) => 
    REGISTRY.filter(s => s.level === level),

  /**
   * Get a subject by its NECTA code
   */
  getByCode: (code: string) => 
    REGISTRY.find(s => s.code === code),

  /**
   * Get a subject by its exact name (case-insensitive)
   */
  getByName: (name: string) => 
    REGISTRY.find(s => s.name.toLowerCase() === name.toLowerCase()),

  /**
   * Get names of all subjects in the registry (deduplicated)
   */
  getAllNames: () => Array.from(new Set(REGISTRY.map(s => s.name).filter(n => n !== 'Mikondo'))),

  /**
   * Get core & elective subjects for O-Level (CSEE)
   */
  getCoreOlevel: () => [
    'English Language',
    'Kiswahili',
    'Basic Mathematics',
    'Biology',
    'Civics',
    'History',
    'Geography',
    'Physics',
    'Chemistry',
    'Historia ya Tanzania na Maadili',
    'Elimu ya Dini ya Kiislamu',
    'Islamic Knowledge',
    'Bible Knowledge',
    'Elimu ya Dini ya Kikristo',
    'Fine Art',
    'Music',
    'Physical Education',
    'Theatre Arts',
    'Sports and Games',
    'Literature in English',
    'Arabic Language',
    'Lugha ya Kiarabu (Arabic)',
    'French Language',
    'Chinese Language',
    'Agriculture',
    'Additional Mathematics',
    'Business Studies',
    'Commerce',
    'Book Keeping',
    'Information & Computer Studies',
    'Computer Studies',
    'Computer Science',
    'Food and Human Nutrition',
    'Home Economics',
    'Textiles and Garment Construction',
    'Engineering Science',
    'Building Construction',
    'Architectural Draughting',
    'Woodwork and Painting',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Engineering Drawing'
  ],

  /**
   * Get compulsory subjects for A-Level (ACSEE)
   */
  getCompulsoryAlevel: () => [
    'General Studies',
    'Academic Communication',
    'Historia ya Tanzania na Maadili'
  ],

  /**
   * Get all subjects for selection in Teacher Registration & UI dropdowns
   */
  getPopular: () => Array.from(new Set([
    'Basic Mathematics',
    'Mathematics',
    'English Language',
    'Kiswahili',
    'Biology',
    'Chemistry',
    'Physics',
    'Geography',
    'History',
    'Civics',
    'Historia ya Tanzania na Maadili',
    'Elimu ya Dini ya Kiislamu',
    'Islamic Knowledge',
    'Bible Knowledge',
    'Elimu ya Dini ya Kikristo',
    'Divinity',
    'Fine Art',
    'Music',
    'Physical Education',
    'Theatre Arts',
    'Sports and Games',
    'Literature in English',
    'Arabic Language',
    'Lugha ya Kiarabu (Arabic)',
    'French Language',
    'Chinese Language',
    'Agriculture',
    'Additional Mathematics',
    'Business Studies',
    'Commerce',
    'Book Keeping',
    'Accountancy',
    'Economics',
    'Information & Computer Studies',
    'Information & Computer Studies (ICS)',
    'Computer Studies',
    'Computer Science',
    'ICT / TEHAMA',
    'Food and Human Nutrition',
    'Home Economics',
    'Textiles and Garment Construction',
    'Engineering Science',
    'Building Construction',
    'Architectural Draughting',
    'Surveying',
    'Woodwork and Painting',
    'Electrical Engineering',
    'Electronics and Radio Repair',
    'Mechanical Engineering',
    'Motor Vehicle Mechanics',
    'Welding and Metal Fabrication',
    'Engineering Drawing',
    'General Studies',
    'Basic Applied Mathematics',
    'Advanced Mathematics',
    'Academic Communication',
    'Education',
    'Science and Technology',
    'Social Studies & Vocational Skills',
    'Civic and Moral Education',
    'Sanaa na Michezo (Arts & Sports)',
    'Afya na Mazingira (Health & Environment)',
    'Kusoma (Reading)',
    'Kuandika (Writing)',
    'Kuhesabu (Arithmetic)',
    ...REGISTRY.map(s => s.name).filter(n => n !== 'Mikondo')
  ]))
};

