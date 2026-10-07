export type CurriculumType = 'NEW_CBC_2023' | 'OLD_CONTENT_BASED';

export interface LessonPlanStep {
  stage: string; // e.g. "Introduction / Utangulizi", "Competence Development / Kujenga Umahiri", "Application / Kutumia Umahiri", "Conclusion / Hitimisho"
  timeMinutes: number;
  teacherActivities: string;
  learnerActivities: string;
  assessmentCriteria?: string;
  teachingMedia?: string;
}

export interface LessonPlan {
  id: string;
  schoolId: string;
  teacherId?: number | string;
  teacherName: string;
  className: string;
  stream?: string;
  subject: string;
  curriculumType: CurriculumType;
  date: string;
  timeSlot?: string;
  periodNumber?: string;
  durationMinutes: number;
  registeredStudentsCount?: number;
  presentStudentsCount?: number;
  
  // Curriculum specific fields
  mainTopic: string;
  subTopic: string;
  mainCompetence?: string;      // Umahiri Mkuu (New Curriculum)
  specificCompetence?: string;  // Umahiri Mahususi (New Curriculum)
  generalObjective?: string;    // Lengo Kuu (Old Curriculum)
  specificObjectives: string[]; // Malengo Mahususi
  
  // Resources & References
  teachingMaterials: string[];
  references: string[];
  
  // Delivery Steps
  steps: LessonPlanStep[];
  
  // Evaluation & Teacher's Remarks
  evaluationStrategy: string;
  teacherRemarks: string;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}
