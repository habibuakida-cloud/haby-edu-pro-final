export interface Subject {
  code: string;
  name: string;
}

export const SUBJECT_LIST: Subject[] = [
  // Primary & Pre-Primary
  { code: '01', name: 'Kiswahili' },
  { code: '02', name: 'English Language' },
  { code: '03', name: 'Social Studies & Vocational Skills' },
  { code: '04', name: 'Mathematics' },
  { code: '05', name: 'Science and Technology' },
  { code: '06', name: 'Civic and Moral Education' },
  { code: '07', name: 'Sanaa na Michezo (Arts & Sports)' },
  { code: '08', name: 'Afya na Mazingira (Health & Environment)' },
  { code: '09', name: 'Kusoma (Reading)' },
  { code: '10', name: 'Kuandika (Writing)' },
  { code: '10B', name: 'Kuhesabu (Arithmetic)' },

  // Secondary O-Level Core & Humanities
  { code: '011', name: 'Civics' },
  { code: '012', name: 'History' },
  { code: '013', name: 'Geography' },
  { code: '019', name: 'Historia ya Tanzania na Maadili' },

  // Religious Education (Masomo ya Dini)
  { code: '014', name: 'Bible Knowledge' },
  { code: '014S', name: 'Elimu ya Dini ya Kikristo' },
  { code: '015', name: 'Elimu ya Dini ya Kiislamu' },
  { code: '015E', name: 'Islamic Knowledge' },
  { code: '114', name: 'Divinity' },

  // Arts, Music & Sports (Sanaa na Michezo)
  { code: '016', name: 'Fine Art' },
  { code: '017', name: 'Music' },
  { code: '018', name: 'Physical Education' },
  { code: '020', name: 'Theatre Arts' },
  { code: '020S', name: 'Sports and Games' },

  // Languages (Lugha)
  { code: '021', name: 'Kiswahili' },
  { code: '022', name: 'English Language' },
  { code: '023', name: 'French Language' },
  { code: '024', name: 'Literature in English' },
  { code: '025', name: 'Arabic Language' },
  { code: '025S', name: 'Lugha ya Kiarabu (Arabic)' },
  { code: '026', name: 'Chinese Language' },

  // Sciences, Mathematics, Agriculture & ICT
  { code: '031', name: 'Physics' },
  { code: '032', name: 'Chemistry' },
  { code: '033', name: 'Biology' },
  { code: '034', name: 'Agriculture' },
  { code: '035', name: 'Engineering Science' },
  { code: '036', name: 'Information & Computer Studies' },
  { code: '036B', name: 'Computer Studies' },
  { code: '036C', name: 'Computer Science' },
  { code: '041', name: 'Basic Mathematics' },
  { code: '042', name: 'Additional Mathematics' },
  { code: '051', name: 'Food and Human Nutrition' },
  { code: '052', name: 'Home Economics' },
  { code: '053', name: 'Textiles and Garment Construction' },

  // Business & Commercial Studies
  { code: '061', name: 'Commerce' },
  { code: '062', name: 'Book Keeping' },
  { code: '063', name: 'Business Studies' },

  // Technical & Engineering Subjects
  { code: '071', name: 'Building Construction' },
  { code: '072', name: 'Architectural Draughting' },
  { code: '073', name: 'Surveying' },
  { code: '074', name: 'Woodwork and Painting' },
  { code: '080', name: 'Electrical Engineering' },
  { code: '081', name: 'Electronics and Radio Repair' },
  { code: '082', name: 'Mechanical Engineering' },
  { code: '083', name: 'Motor Vehicle Mechanics' },
  { code: '084', name: 'Welding and Metal Fabrication' },
  { code: '091', name: 'Engineering Drawing' },

  // Secondary A-Level
  { code: '111', name: 'General Studies' },
  { code: '112', name: 'History' },
  { code: '113', name: 'Geography' },
  { code: '118', name: 'Physical Education' },
  { code: '121', name: 'Kiswahili' },
  { code: '122', name: 'English Language' },
  { code: '123', name: 'French Language' },
  { code: '125', name: 'Arabic Language' },
  { code: '126', name: 'Chinese Language' },
  { code: '131', name: 'Physics' },
  { code: '132', name: 'Chemistry' },
  { code: '133', name: 'Biology' },
  { code: '134', name: 'Agriculture' },
  { code: '136', name: 'Computer Science' },
  { code: '141', name: 'Basic Applied Mathematics' },
  { code: '142', name: 'Advanced Mathematics' },
  { code: '151', name: 'Economics' },
  { code: '152', name: 'Commerce' },
  { code: '153', name: 'Accountancy' },
  { code: '155', name: 'Food and Human Nutrition' },
  { code: '161', name: 'Education' },
  { code: '162', name: 'Academic Communication' },
  { code: '999', name: 'Mikondo' }
];

export const getSubjectByCode = (code: string): Subject | undefined => {
  return SUBJECT_LIST.find(s => s.code === code);
};

export const getSubjectByName = (name: string): Subject | undefined => {
  return SUBJECT_LIST.find(s => s.name.toLowerCase() === name.toLowerCase());
};

