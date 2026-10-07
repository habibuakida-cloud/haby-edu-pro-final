import { CurriculumType } from './lessonPlan';

export interface SchemeOfWorkItem {
  id: string;
  weekNumber: number;
  datesOrMonth: string; // e.g. "Week 1 (12 Jan - 16 Jan)"
  mainTopicOrCompetence: string; // Mada Kuu (Old) / Umahiri Mkuu (New CBC)
  subTopicOrSpecificCompetence: string; // Mada Ndogo (Old) / Umahiri Mahususi (New CBC)
  learningActivitiesOrObjectives: string; // Shughuli za Ujifunzaji (CBC) / Malengo Mahususi (Old)
  teachingActivities: string; // Shughuli za Mwalimu (Teacher's facilitation)
  teachingMaterials: string; // Zana za Kufundishia / Zana za Ujifunzaji
  assessmentMethods: string; // Mbinu za Upimaji / Vigezo vya Utendaji
  references: string; // Vitabu vya Marejeleo (TIE, Oxford, Longhorn)
  periodsCount: number; // Idadi ya Vipindi kwa wiki (e.g. 4, 5, 6)
  remarks: string; // Maoni / Tathmini ya Utekelezaji
}

export interface TeachingLogBookEntry {
  id: string;
  schemeItemId?: string; // Link to specific week item in Scheme
  date: string; // e.g. "2026-02-16"
  className: string; // e.g. "Form 3"
  stream?: string; // e.g. "Stream A"
  periodTime: string; // e.g. "Period 2 (08:40 - 09:20)"
  subTopicTaught: string;
  workCoveredSummary: string; // Maendeleo ya Somo / Shughuli zilizofanyika
  studentsPresent: number;
  studentsTotal: number;
  comprehensionEvaluation: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_REMEDIAL';
  remedialOrUncoveredReason?: string; // Sababu za Kutokamilika / Mpango wa Kurekebisha
  teacherSignature: string;
}

export interface SchemeOfWork {
  id: string;
  schoolId: string;
  teacherId?: number | string;
  teacherName: string;
  className: string;
  stream?: string;
  subject: string;
  curriculumType: CurriculumType;
  academicYear: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  periodsPerWeek: number;
  totalWeeks: number;
  department?: string;
  competenceSummary?: string;
  items: SchemeOfWorkItem[];
  logBookEntries?: TeachingLogBookEntry[];
  academicMasterApproval?: {
    approved: boolean;
    name?: string;
    date?: string;
    remarks?: string;
  };
  headmasterApproval?: {
    approved: boolean;
    name?: string;
    date?: string;
    remarks?: string;
  };
  createdAt: string;
  updatedAt: string;
}
