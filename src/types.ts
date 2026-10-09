import { LessonPlan } from './types/lessonPlan';
import { SchemeOfWork } from './types/schemeOfWork';

export interface CharacterTrait {
  id: string;
  name: string;
  swahiliName?: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  remark: string;
}

export interface ReportCardPeriodSetting {
  termName: string; // e.g. "Term II - Terminal Examination"
  academicYear: string; // e.g. "2025/2026"
  evaluationPeriod: string; // e.g. "July - November 2026"
  totalPeriods: number; // e.g. 240 lesson periods in term
  attendedPeriods: number; // e.g. 235 periods attended
  nextTermBegins?: string; // e.g. "15 January 2027"
}

export interface StudentReportCardData {
  periodSetting?: ReportCardPeriodSetting;
  characterAssessment?: {
    overallConductGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    overallConductRemark: string;
    traits: CharacterTrait[];
  };
  classTeacherRemarks?: string;
  classTeacherName?: string;
  headTeacherRemarks?: string;
  positionInClass?: number;
  totalStudentsInClass?: number;
  dateIssued?: string;
}

export type EducationLevel = 'PRE_PRIMARY' | 'PRIMARY' | 'CSEE' | 'ACSEE';

export interface Student {
  id: number | string;
  regNo: string;
  name: string;
  gender?: 'Male' | 'Female' | '';
  sex?: string;
  status?: string;
  className: string; // "Baby Class", "Standard 1" to "Standard 7", "Form 1" to "Form 6"
  level?: EducationLevel;
  dob: string;
  stream?: string;
  combination?: string;
  subjects: string[];
  marks?: Record<string, number>;
  total?: number;
  average?: string;
  division?: string;
  primaryGrade?: 'A' | 'B' | 'C' | 'D' | 'E';
  passStatus?: 'AMEFAULU' | 'HAJAFAULU' | string;
  gpa?: number;
  reportCardData?: StudentReportCardData;
  passportPhoto?: string; // base64 / URL for passport size photo
  registeredAt?: string;
  phone?: string;
  parentPhone?: string;
  parentName?: string;
}

export type SchoolStaffRole =
  | 'Academic Master'
  | 'Academic Mistress'
  | 'Discipline Master'
  | 'Discipline Mistress'
  | 'Headmaster'
  | 'Headmistress'
  | 'Second Master'
  | 'Deputy Headmaster'
  | 'Examination Officer'
  | 'Head of Department (HOD) - Science'
  | 'Head of Department (HOD) - Mathematics'
  | 'Head of Department (HOD) - Languages'
  | 'Head of Department (HOD) - Arts & Social Studies'
  | 'Class Teacher / Master'
  | 'Sports & Games Master'
  | 'Health & Environmental Master'
  | 'Guidance & Counseling Master'
  | 'Patron / Matron / Spiritual Patron'
  | 'Subject Teacher'
  | string;

export interface Teacher {
  id: number | string;
  name: string;
  initial: string;
  gender?: 'Male' | 'Female' | '';
  subjects: string[];
  excludeInvigilation: boolean;
  color?: string; // Custom or auto-assigned color for the teacher/invigilator
  schoolRole?: SchoolStaffRole; // e.g. Academic Master, Discipline Master, etc.
  phone?: string;
  email?: string;
  passportPhoto?: string; // base64 / URL for teacher passport size photo
  teachingStreams?: string[]; // e.g. ["Form 1 - STREAM A", "Form 2 - STREAM B"]
  maxPeriodsPerWeek?: number; // target periods per week (each period = 40 mins)
}

export interface Exam {
  id: number;
  name: string;
  type?: string;
  level: EducationLevel;
  className: string;
  date: string;
  status?: 'Active' | 'Inactive';
}

export interface DisciplineRecord {
  id: string;
  studentId: number;
  studentName: string;
  regNo: string;
  className: string;
  date: string;
  category: 'Merit' | 'Infraction' | 'Attendance' | 'Academic' | 'Other';
  title: string;
  description: string;
  actionTaken: string;
  reportedBy: string;
  status: 'Open' | 'Under Review' | 'Resolved';
}

export interface PeriodSetting {
  id: number;
  day: string; // "Monday", "Tuesday", etc.
  name: string; // "Period 1", "Period 2", etc.
  start: string; // "08:00"
  end: string;   // "08:40"
  assignedTeacherId?: number; // assigned teacher / duty master for this period
  defaultSubject?: string;
  isBreak?: boolean;
}

export interface StreamSetting {
  id: number;
  className: string;
  level: EducationLevel;
  streams: string[];
}

export type ActivityType = 
  | 'academic'
  | 'environmental'
  | 'sports'
  | 'debates'
  | 'remedial'
  | 'assembly'
  | 'clubs'
  | 'religion'
  | 'praying'
  | 'breakfast'
  | 'lunch'
  | 'library'
  | 'weekly_test'
  | 'other';

export interface TimetableAssignment {
  id: number | string;
  className: string;
  stream: string;
  day: string;
  period: string; // formatted as "Period 1 (08:00-08:40)"
  periodName?: string;
  teacherId?: number;
  subject: string;
  room?: string;
  activityType?: ActivityType;
  customNote?: string;
  isManual?: boolean;
  isLocked?: boolean;
  allocationMode?: 'manual' | 'auto';
}

export interface InvigilationSession {
  id: number;
  rawDate: string;
  date: string;
  day: string;
  session: string; // "SESSION I", "SESSION II", "SESSION III"
  start: string;
  end: string;
  time: string;
  subject: string;
  level: EducationLevel;
  className: string;
  stream: string;
  rooms: number;
}

export interface Supervisor {
  id: number;
  teacherId: number;
  name: string;
  initial: string;
}

export type InstitutionalLevel = 'NURSERY' | 'PRIMARY' | 'SECONDARY';

export interface SchoolInfo {
  name: string;
  schoolNumber?: string; // Tanzanian NECTA center / school registration number e.g. "0123" or "S.0123"
  address: string;
  phone: string;
  email: string;
  motto: string;
  principal: string;
  logo?: string; // base64 or URL for official school emblem / crest
  badge?: string;
  website?: string;
  institutionalLevels?: InstitutionalLevel[]; // e.g. ['NURSERY', 'PRIMARY', 'SECONDARY'] or any combination
}

export type ExamDocumentType = 'PHOTO_ENTRY' | 'ISAL' | 'CAL';

export interface DayTheme {
  day: string;
  bg: string;         // light tint background for table/day header
  border: string;     // border color
  accent: string;     // header accent text
  badgeBg: string;
}

export interface FormStreamTheme {
  form: string;
  primary: string;    // Main badge / border
  bg: string;
  text: string;
}

export type UserRole = 'HEADMASTER' | 'ACADEMIC' | 'TEACHER' | 'SUPER_ADMIN';

export interface SchoolAdminRecord {
  id: string;
  school_id: string | null;
  full_name: string;
  email: string;
  password?: string;
  role: 'super_admin' | 'school_admin';
  created_at?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId: string;
  school_id?: string;
  password?: string;
  assignedSubjects?: string[];
  lastLogin?: string;
  isSuperAdmin?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
}

export type SchoolStatus = 'ACTIVE' | 'INACTIVE' | 'DORMANT';

export interface School {
  id: string;
  name: string;
  schoolNumber?: string;
  createdAt: any;
  status: SchoolStatus;
  adminUid?: string;
  adminEmail?: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  principal?: string;
  studentCount?: number;
  teacherCount?: number;
}

export interface TeacherEvaluation {
  id: string;
  teacherId: number;
  teacherName: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string; // e.g. 'Academic Master', 'Headmaster', 'Second Master'
  date: string;
  className: string;
  stream: string;
  subject: string;
  topicTaught: string;
  periodName: string;
  // Criteria scores (1 to 5: 5=Excellent, 4=Very Good, 3=Good/Satisfactory, 2=Needs Improvement, 1=Unsatisfactory)
  lessonPlanningScore: number;       // Andaa Somo & Schemes of work
  subjectMasteryScore: number;       // Content knowledge & accuracy
  teachingMethodologyScore: number;  // Learner-centered methods & engagement
  timeManagementScore: number;       // 40-minute period adherence & punctuality
  teachingAidsScore: number;          // Use of teaching aids / apparatus
  studentAssessmentScore: number;    // Exercises, questions & feedback
  classroomManagementScore: number;  // Discipline, participation & environment
  totalScore: number;                // out of 35
  percentage: number;                // out of 100%
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string;
  areasForImprovement: string;
  academicMasterRemarks: string;
}

export interface UsalCandidateRecord {
  studentId: number | string;
  regNo: string;
  studentName: string;
  gender: string;
  stream?: string;
  caMarks: number;    // Continuous Assessment (0-30)
  examMarks: number;  // Final Examination (0-70)
  totalMarks: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'E';
  points: number;
  remarks: string;
}

export interface UsalRecord {
  id: string; // e.g. `usal_${examId}_${subject}_${className}_${stream}`
  examId: number | string;
  examName: string;
  academicYear: string;
  term: string;
  className: string;
  stream: string;
  subject: string;
  assignedTeacherId?: number;
  assignedTeacherName?: string;
  isSealed: boolean;
  sealedAt?: string;
  sealedBy?: string;
  candidates: UsalCandidateRecord[];
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction = 
  | 'TIMETABLE_UPDATE'
  | 'PERIOD_SETTINGS_UPDATE'
  | 'STREAM_SETTINGS_UPDATE'
  | 'TEACHER_ADDED'
  | 'TEACHER_BULK_ADDED'
  | 'TEACHER_UPDATED'
  | 'TEACHER_DELETED'
  | 'STUDENT_ADDED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'STUDENTS_BULK_UPDATE'
  | 'EXAM_ADDED'
  | 'EXAM_UPDATED'
  | 'EXAM_DELETED'
  | 'USAL_CREATED'
  | 'USAL_SEALED'
  | 'USAL_UPDATED'
  | 'CUTOFF_UPDATED'
  | 'INVIGILATION_UPDATE'
  | 'SCHOOL_INFO_UPDATE'
  | 'DISCIPLINE_RECORD_ADDED'
  | 'DISCIPLINE_RECORD_UPDATED'
  | 'DISCIPLINE_RECORD_DELETED'
  | 'USER_ROLE_UPDATE'
  | 'SYSTEM_RESET'
  | 'BACKUP_RESTORE';

export type ActivityCategory = 'timetable' | 'teachers' | 'students' | 'exams' | 'invigilation' | 'settings' | 'discipline' | 'results' | 'security';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO 8601 string
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  action: ActivityAction;
  category: ActivityCategory;
  title: string;
  description: string;
  details?: Record<string, any>;
}

export type AcademicCalendarType = 'JAN-DEC' | 'JULY-JUNE';
export type ExamTerm = 'Term 1' | 'Term 2' | 'Term 3';
export type RecordExamType = 'Monthly' | 'Midterm' | 'Terminal' | 'Annual';

export interface ExaminationRecordSubjectInfo {
  marks: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  remark?: string;
}

export interface ExaminationRecord {
  id: string; // unique key `${studentId}_${academicYear}_${term}_${examType}`
  studentId: number;
  studentName: string;
  regNo?: string;
  className: string;
  stream?: string;
  gender?: string;
  parentPhone?: string;
  academicYear: string; // e.g. "2026"
  academicCalendarType: AcademicCalendarType;
  term: ExamTerm;
  examType: RecordExamType;
  subjects: Record<string, ExaminationRecordSubjectInfo>;
  totalMarks: number;
  averageMarks: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  division?: string;
  points?: number | null;
  positionInClass: number;
  totalStudents: number;
  teacherRemarks?: string;
  createdAt: string;
}

export interface PromotionHistory {
  id: string;
  studentId: number;
  studentName: string;
  fromClass: string;
  toClass: string;
  academicYear: string;
  calendarType: AcademicCalendarType;
  promotedAt: string;
  promotedBy: string;
  status: 'PROMOTED' | 'GRADUATED' | 'RETAINED';
}

export interface TransferHistory {
  id: string;
  studentId: number;
  studentName: string;
  fromClass: string;
  toClass: string;
  reason: string;
  date: string;
  transferredBy: string;
}

export interface InstitutionalPolicy {
  totalPeriodsPerDay: number;
  periodDurationMinutes: number;
  breakAfterPeriod: number;
  lunchAfterPeriod: number;
  workingDays: string[];
  maxPeriodsPerTeacherPerDay: number;
  rules: {
    noTeacherTwoClassesSameTime: boolean;
    noClassTwoTeachersSameTime: boolean;
    noSameSubjectTwiceSameDay: boolean;
  };
}

export interface SubjectPeriodAllocation {
  id: string;
  level: 'NURSERY' | 'PRIMARY' | 'SECONDARY';
  className: string;
  stream: string;
  subject: string;
  subjectName?: string;
  periodsPerWeek: number;
}

export interface TeacherAssignment {
  id: string;
  teacherId: number;
  teacherName: string;
  level: 'NURSERY' | 'PRIMARY' | 'SECONDARY';
  subjects: string[];
  streams: string[];
}

export interface SavedTimetableRecord {
  id: string;
  title: string;
  createdAt: string;
  scope: 'General' | 'Class' | 'Teacher';
  targetName?: string;
  assignmentsCount: number;
  assignments: TimetableAssignment[];
}

export interface SavedInvigilationRecord {
  id: string;
  title: string;
  createdAt: string;
  examTitle: string;
  sessionsCount: number;
  sessions: InvigilationSession[];
  supervisorsCount: number;
  supervisors: Supervisor[];
}

export interface AppData {
  users?: UserAccount[];
  students: Student[];
  teachers: Teacher[];
  exams: Exam[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  timetableAssignments: TimetableAssignment[];
  sessions: InvigilationSession[];
  supervisors: Supervisor[];
  resultsStatus: 'active' | 'inactive';
  selectedInvigilators: number[];
  invigilationAssignments: Record<string, number>; // key: `${sessionId}_room${roomIndex}` -> teacherId
  timetableReleased: boolean;
  classTimetableReleased: Record<string, boolean>;
  schoolInfo: SchoolInfo;
  dayThemes?: Record<string, string>; // day -> hex color or theme
  subjectColors?: Record<string, string>; // subject -> hex color
  teacherColors?: Record<number, string>; // teacherId -> hex color
  activityLogs?: ActivityLog[];
  disciplineRecords?: DisciplineRecord[];
  teacherEvaluations?: TeacherEvaluation[];
  examinationRecords?: ExaminationRecord[];
  promotionHistory?: PromotionHistory[];
  transferHistory?: TransferHistory[];
  institutionalPolicy?: InstitutionalPolicy;
  subjectPeriodAllocations?: SubjectPeriodAllocation[];
  teacherAssignments?: TeacherAssignment[];
  usalRecords?: UsalRecord[];
  lessonPlans?: LessonPlan[];
  schemesOfWork?: SchemeOfWork[];
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  gradeCutoffs?: Record<string, any>;
  journalRecords?: Record<string, any>;
  ledgerSubjectKeys?: Record<string, string[]>;
  parents?: ParentContact[];
  parentStudents?: { parent_id: string; student_id: string }[];
  smsWallet?: SmsWallet;
  smsLogs?: SmsLog[];
  savedTimetableRecords?: SavedTimetableRecord[];
  savedInvigilationRecords?: SavedInvigilationRecord[];
  subjectPaperConfigs?: Record<string, 1 | 2 | 3>;
  qrScanLogs?: QrScanAttendanceRecord[];
  bubbleSettings?: {
    enabled: boolean;
    theme: string;
    density: 'low' | 'medium' | 'high';
  };
}

export interface QrScanAttendanceRecord {
  id: string;
  studentId: number;
  studentName: string;
  regNo: string;
  className: string;
  stream?: string;
  scanTimestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  status: 'EARLY' | 'ON_TIME' | 'LATE' | 'VERY_LATE' | 'EXCUSED';
  minutesDelta: number;
  gateOrScanner: string;
  deviceScannedBy?: string;
  photoUrl?: string;
}

export interface ExamRecordRow {
  id: string;
  school_id: string;
  student_cno: string;
  student_name: string;
  sex?: string;
  class_level: string;
  exam_type: 'STNA' | 'SFNA' | 'PSLE' | 'FTNA' | 'CSEE' | 'ACSEE' | 'MIDTERM' | 'ANNUAL' | string;
  term: string;
  AGGT: number | string;
  DIV: string;
  subjects_json: Record<string, string>;
  year: string | number;
  created_at?: string;
}

export interface ParentContact {
  id: string;
  school_id: string;
  student_cno: string;
  phone_255: string;
  student_name?: string;
  class_level?: string;
  created_at?: string;
}

export interface SmsWallet {
  id?: string;
  school_id: string;
  balance: number;
  updated_at?: string;
}

export interface SmsLog {
  id: string;
  school_id: string;
  student_cno: string;
  phone: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  created_at?: string;
  error?: string;
}

