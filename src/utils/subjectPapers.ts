export interface PaperDetail {
  paperNumber: 1 | 2 | 3;
  paperName: string; // e.g. "Paper 1 (Theory)", "Paper 2 (Practical)"
  codeSuffix: string; // e.g. "131/1"
  durationMinutes: number; // e.g. 180 (3 hours)
  description?: string;
}

export interface SubjectPaperDefinition {
  code: string; // Base code e.g. "131"
  name: string; // e.g. "Physics"
  level: 'A-Level' | 'O-Level' | 'Primary';
  paperCount: 1 | 2 | 3;
  papers: PaperDetail[];
}

export const A_LEVEL_SUBJECT_PAPERS: SubjectPaperDefinition[] = [
  // 3-Paper Science Subjects (A-Level / ACSEE)
  {
    code: '131',
    name: 'Physics',
    level: 'A-Level',
    paperCount: 3,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Theory & Mechanics)', codeSuffix: '131/1', durationMinutes: 180, description: 'General Physics, Mechanics, Heat & Thermodynamics' },
      { paperNumber: 2, paperName: 'Paper 2 (Electromagnetism & Waves)', codeSuffix: '131/2', durationMinutes: 180, description: 'Electricity, Magnetism, Optics & Modern Physics' },
      { paperNumber: 3, paperName: 'Paper 3 (Practical Examination)', codeSuffix: '131/3', durationMinutes: 195, description: 'Laboratory Experimental & Measurement Practical' }
    ]
  },
  {
    code: '132',
    name: 'Chemistry',
    level: 'A-Level',
    paperCount: 3,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Physical & Inorganic Chemistry)', codeSuffix: '132/1', durationMinutes: 180, description: 'Chemical Energetics, Bonding & Periodic Trends' },
      { paperNumber: 2, paperName: 'Paper 2 (Organic & Analytical Chemistry)', codeSuffix: '132/2', durationMinutes: 180, description: 'Reaction Mechanisms, Polymers & Organic Analysis' },
      { paperNumber: 3, paperName: 'Paper 3 (Practical Quantitative Analysis)', codeSuffix: '132/3', durationMinutes: 195, description: 'Volumetric & Qualitative Chemical Experiments' }
    ]
  },
  {
    code: '133',
    name: 'Biology',
    level: 'A-Level',
    paperCount: 3,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Cytology, Physiology & Genetics)', codeSuffix: '133/1', durationMinutes: 180, description: 'Cell Biology, Metabolism, Genetics & Evolution' },
      { paperNumber: 2, paperName: 'Paper 2 (Ecology, Taxonomy & Anatomy)', codeSuffix: '133/2', durationMinutes: 180, description: 'Ecology, Plant/Animal Taxonomy & Systematics' },
      { paperNumber: 3, paperName: 'Paper 3 (Practical Dissection & Microscopy)', codeSuffix: '133/3', durationMinutes: 195, description: 'Specimen Identification, Dissection & Experiments' }
    ]
  },
  {
    code: '134',
    name: 'Agriculture',
    level: 'A-Level',
    paperCount: 3,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Crop Science & Soil Science)', codeSuffix: '134/1', durationMinutes: 180, description: 'Agronomy, Soil Fertility & Crop Protection' },
      { paperNumber: 2, paperName: 'Paper 2 (Animal Science & Farm Mechanics)', codeSuffix: '134/2', durationMinutes: 180, description: 'Livestock Husbandry, Animal Health & Structures' },
      { paperNumber: 3, paperName: 'Paper 3 (Practical Agricultural Experiments)', codeSuffix: '134/3', durationMinutes: 195, description: 'Soil Testing, Specimen ID & Farm Implements' }
    ]
  },
  {
    code: '136',
    name: 'Computer Science / ICT',
    level: 'A-Level',
    paperCount: 3,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Computer Architecture & Networks)', codeSuffix: '136/1', durationMinutes: 180, description: 'Hardware, OS, Data Communication & Systems' },
      { paperNumber: 2, paperName: 'Paper 2 (Algorithms & Database Design)', codeSuffix: '136/2', durationMinutes: 180, description: 'Programming Logic, SQL Databases & SDLC' },
      { paperNumber: 3, paperName: 'Paper 3 (Practical Programming & SQL Lab)', codeSuffix: '136/3', durationMinutes: 180, description: 'Hands-on Software Development & Database Lab' }
    ]
  },

  // 2-Paper Humanities / Commerce / Math Subjects (A-Level / ACSEE)
  {
    code: '112',
    name: 'Geography',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Physical Geography & Map Reading)', codeSuffix: '112/1', durationMinutes: 180, description: 'Geomorphology, Climatology, Oceanography & Mapwork' },
      { paperNumber: 2, paperName: 'Paper 2 (Human, Economic & Regional Geography)', codeSuffix: '112/2', durationMinutes: 180, description: 'Population, Agriculture, Forestry, Mining & Energy' }
    ]
  },
  {
    code: '113',
    name: 'History',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (African History & Development)', codeSuffix: '113/1', durationMinutes: 180, description: 'Pre-Colonial, Colonial & Post-Independence Africa' },
      { paperNumber: 2, paperName: 'Paper 2 (World History & International Relations)', codeSuffix: '113/2', durationMinutes: 180, description: 'European History, World Wars, Cold War & Globalization' }
    ]
  },
  {
    code: '121',
    name: 'Kiswahili',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Lugha, Sarufi na Insha)', codeSuffix: '121/1', durationMinutes: 180, description: 'Ufahamu, Sarufi ya Kiswahili na Insha za Kitasalii' },
      { paperNumber: 2, paperName: 'Paper 2 (Fasihi ya Kiswahili - Riwaya & Tamthilia)', codeSuffix: '121/2', durationMinutes: 180, description: 'Uchambuzi wa Fasihi Simulizi na Fasihi Andishi' }
    ]
  },
  {
    code: '122',
    name: 'English Language',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Language & Structural Linguistics)', codeSuffix: '122/1', durationMinutes: 180, description: 'Phonology, Morphology, Syntax & Essay Writing' },
      { paperNumber: 2, paperName: 'Paper 2 (Literature in English - Novels & Plays)', codeSuffix: '122/2', durationMinutes: 180, description: 'Literary Appreciation, Poetry, Novels & Drama' }
    ]
  },
  {
    code: '141',
    name: 'Advanced Mathematics',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Pure Mathematics & Calculus)', codeSuffix: '141/1', durationMinutes: 180, description: 'Algebra, Trigonometry, Calculus & Coordinate Geometry' },
      { paperNumber: 2, paperName: 'Paper 2 (Statistics, Probability & Vectors)', codeSuffix: '141/2', durationMinutes: 180, description: 'Probability, Vectors, Differential Equations & Numerical Methods' }
    ]
  },
  {
    code: '151',
    name: 'Economics',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Microeconomics & Price Theory)', codeSuffix: '151/1', durationMinutes: 180, description: 'Consumer Behavior, Production, Costs & Market Structures' },
      { paperNumber: 2, paperName: 'Paper 2 (Macroeconomics & Tanzanian Economy)', codeSuffix: '151/2', durationMinutes: 180, description: 'National Income, Fiscal Policy, Inflation & Economic Planning' }
    ]
  },
  {
    code: '152',
    name: 'Accountancy',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Financial Accounting & Control)', codeSuffix: '152/1', durationMinutes: 180, description: 'Partnerships, Companies, Cash Flow & Financial Reporting' },
      { paperNumber: 2, paperName: 'Paper 2 (Cost & Management Accounting)', codeSuffix: '152/2', durationMinutes: 180, description: 'Costing Systems, Budgeting & Variance Analysis' }
    ]
  },
  {
    code: '153',
    name: 'Commerce',
    level: 'A-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Trade, Business & Marketing)', codeSuffix: '153/1', durationMinutes: 180, description: 'Retail/Wholesale Trade, International Commerce & Marketing' },
      { paperNumber: 2, paperName: 'Paper 2 (Commercial Finance & Management)', codeSuffix: '153/2', durationMinutes: 180, description: 'Banking, Insurance, Transport & Business Management' }
    ]
  },

  // 1-Paper Subsidiary Subjects (A-Level / ACSEE)
  {
    code: '111',
    name: 'General Studies',
    level: 'A-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (General Studies)', codeSuffix: '111/1', durationMinutes: 180, description: 'Philosophy, Constitution, Democratic Governance & Contemporary Issues' }
    ]
  },
  {
    code: '142',
    name: 'Basic Applied Mathematics (BAM)',
    level: 'A-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Basic Applied Mathematics)', codeSuffix: '142/1', durationMinutes: 180, description: 'Functions, Differentiation, Integration, Statistics & Matrices' }
    ]
  }
];

export const O_LEVEL_SUBJECT_PAPERS: SubjectPaperDefinition[] = [
  // 2-Paper Science & Language Subjects (O-Level / CSEE)
  {
    code: '031',
    name: 'Physics',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Theory Examination)', codeSuffix: '031/1', durationMinutes: 180, description: 'Multiple Choice, Short Answers & Calculation Questions' },
      { paperNumber: 2, paperName: 'Paper 2 (Practical Examination)', codeSuffix: '031/2', durationMinutes: 150, description: 'Hands-on Experimental Practical or Alternative to Practical' }
    ]
  },
  {
    code: '032',
    name: 'Chemistry',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Theory Examination)', codeSuffix: '032/1', durationMinutes: 180, description: 'Inorganic, Organic & Physical Chemistry Theory' },
      { paperNumber: 2, paperName: 'Paper 2 (Practical Titration & Qualitative)', codeSuffix: '032/2', durationMinutes: 150, description: 'Volumetric Titration & Qualitative Salt Analysis' }
    ]
  },
  {
    code: '033',
    name: 'Biology',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Theory Examination)', codeSuffix: '033/1', durationMinutes: 180, description: 'Cell Biology, Physiology, Ecology & Genetics Theory' },
      { paperNumber: 2, paperName: 'Paper 2 (Practical Specimen Identification)', codeSuffix: '033/2', durationMinutes: 150, description: 'Specimen Identification, Food Test & Biological Drawings' }
    ]
  },
  {
    code: '041',
    name: 'Basic Mathematics',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Basic Algebra & Geometry)', codeSuffix: '041/1', durationMinutes: 180, description: 'Numbers, Algebra, Sets, Functions & Basic Geometry' },
      { paperNumber: 2, paperName: 'Paper 2 (Trigonometry, Statistics & Matrices)', codeSuffix: '041/2', durationMinutes: 180, description: 'Coordinate Geometry, Vectors, Statistics & Probability' }
    ]
  },
  {
    code: '021',
    name: 'Kiswahili',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Lugha na Ufahamu)', codeSuffix: '021/1', durationMinutes: 180, description: 'Ufahamu, Sarufi, Utumizi wa Lugha na Mwandiko' },
      { paperNumber: 2, paperName: 'Paper 2 (Fasihi na Insha)', codeSuffix: '021/2', durationMinutes: 180, description: 'Insha, Uchambuzi wa Vitabu Teule vya Fasihi Simulizi na Andishi' }
    ]
  },
  {
    code: '022',
    name: 'English Language',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Grammar & Comprehension)', codeSuffix: '022/1', durationMinutes: 180, description: 'Comprehension, Summary, Structure & Vocabulary' },
      { paperNumber: 2, paperName: 'Paper 2 (Composition & Literature Appreciation)', codeSuffix: '022/2', durationMinutes: 180, description: 'Essay Writing, Selected Novels, Poetry & Plays Analysis' }
    ]
  },
  {
    code: '036',
    name: 'Information & Computer Studies (ICS)',
    level: 'O-Level',
    paperCount: 2,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Theory Examination)', codeSuffix: '036/1', durationMinutes: 180, description: 'Computer Fundamentals, ICT Applications & Concepts' },
      { paperNumber: 2, paperName: 'Paper 2 (Practical Computer Lab)', codeSuffix: '036/2', durationMinutes: 150, description: 'Practical Lab in Word Processing, Spreadsheets & Database' }
    ]
  },

  // 1-Paper O-Level Subjects
  {
    code: '011',
    name: 'Civics',
    level: 'O-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Civics & Citizenship)', codeSuffix: '011/1', durationMinutes: 180, description: 'Our Nation, Human Rights, Government & Global Issues' }
    ]
  },
  {
    code: '013',
    name: 'Geography',
    level: 'O-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Geography)', codeSuffix: '013/1', durationMinutes: 180, description: 'Physical Geography, Map Reading, Photograph Interpretation & Human Geography' }
    ]
  },
  {
    code: '012',
    name: 'History',
    level: 'O-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (History)', codeSuffix: '012/1', durationMinutes: 180, description: 'Sources of History, African Development, Colonialism & Independence' }
    ]
  },
  {
    code: '061',
    name: 'Commerce',
    level: 'O-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Commerce)', codeSuffix: '016/1', durationMinutes: 180, description: 'Trade, Warehousing, Advertising, Transportation & Finance' }
    ]
  },
  {
    code: '062',
    name: 'Book Keeping',
    level: 'O-Level',
    paperCount: 1,
    papers: [
      { paperNumber: 1, paperName: 'Paper 1 (Book Keeping)', codeSuffix: '062/1', durationMinutes: 180, description: 'Double Entry System, Financial Statements, Control Accounts & Reconciliation' }
    ]
  }
];

export const ALL_SUBJECT_PAPER_DEFINITIONS = [
  ...A_LEVEL_SUBJECT_PAPERS,
  ...O_LEVEL_SUBJECT_PAPERS
];

export function getSubjectPaperDefinition(subjectName: string, isALevel?: boolean): SubjectPaperDefinition | undefined {
  const norm = subjectName.toLowerCase().trim();
  const list = isALevel ? A_LEVEL_SUBJECT_PAPERS : O_LEVEL_SUBJECT_PAPERS;
  
  // Direct match in level
  let found = list.find(s => s.name.toLowerCase() === norm || norm.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(norm));
  if (!found) {
    // Fallback to all
    found = ALL_SUBJECT_PAPER_DEFINITIONS.find(s => s.name.toLowerCase() === norm || norm.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(norm));
  }
  return found;
}

export function getPapersForSubject(subjectName: string, isALevel?: boolean): PaperDetail[] {
  const def = getSubjectPaperDefinition(subjectName, isALevel);
  if (def && def.papers.length > 0) {
    return def.papers;
  }
  // Default single paper fallback
  return [
    { paperNumber: 1, paperName: `${subjectName} Paper 1`, codeSuffix: '1', durationMinutes: 180, description: 'Standard Written Examination' }
  ];
}
