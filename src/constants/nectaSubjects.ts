export interface Subject {
  code: string;
  name: string;
}

export const SUBJECT_LIST: Subject[] = [
  // Primary
  { code: '01', name: 'Kiswahili' },
  { code: '02', name: 'English Language' },
  { code: '03', name: 'Social Studies & Vocational Skills' },
  { code: '04', name: 'Mathematics' },
  { code: '05', name: 'Science and Technology' },
  { code: '06', name: 'Civic and Moral Education' },

  // Secondary O-Level
  { code: '011', name: 'Civics' },
  { code: '012', name: 'History' },
  { code: '013', name: 'Geography' },
  { code: '016', name: 'Fine Art' },
  { code: '017', name: 'Music' },
  { code: '021', name: 'Kiswahili' },
  { code: '022', name: 'English Language' },
  { code: '024', name: 'Literature in English' },
  { code: '026', name: 'Chinese Language' },
  { code: '031', name: 'Physics' },
  { code: '032', name: 'Chemistry' },
  { code: '033', name: 'Biology' },
  { code: '034', name: 'Agriculture' },
  { code: '035', name: 'Engineering Science' },
  { code: '036', name: 'Information & Computer Studies' },
  { code: '041', name: 'Basic Mathematics' },
  { code: '042', name: 'Additional Mathematics' },
  { code: '061', name: 'Commerce' },
  { code: '062', name: 'Book Keeping' },
  { code: '080', name: 'Electrical Engineering' },
  { code: '091', name: 'Engineering Drawing' },

  // Secondary A-Level
  { code: '111', name: 'General Studies' },
  { code: '112', name: 'History' },
  { code: '113', name: 'Geography' },
  { code: '118', name: 'Physical Education' },
  { code: '121', name: 'Kiswahili' },
  { code: '122', name: 'English Language' },
  { code: '123', name: 'French Language' },
  { code: '126', name: 'Chinese Language' },
  { code: '131', name: 'Physics' },
  { code: '132', name: 'Chemistry' },
  { code: '133', name: 'Biology' },
  { code: '134', name: 'Agriculture' },
  { code: '141', name: 'Basic Applied Mathematics' },
  { code: '142', name: 'Advanced Mathematics' },
  { code: '151', name: 'Economics' },
  { code: '152', name: 'Commerce' },
  { code: '153', name: 'Accountancy' },
  { code: '161', name: 'Education' }
];

export const getSubjectByCode = (code: string): Subject | undefined => {
  return SUBJECT_LIST.find(s => s.code === code);
};

export const getSubjectByName = (name: string): Subject | undefined => {
  return SUBJECT_LIST.find(s => s.name.toLowerCase() === name.toLowerCase());
};
