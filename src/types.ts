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
  id: number;
  firestoreDocId?: string;
  regNo: string;
  name: string;
  fullName?: string;
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
  examMarks?: Record<string, Record<string, number>>; // examKey -> (subject -> score)
  total?: number;
  average?: string;
  division?: string;
  grade?: string;
  points?: number | string;
  remark?: string;
  position?: number | string;
  primaryGrade?: 'A' | 'B' | 'C' | 'D' | 'E';
  passStatus?: 'AMEFAULU' | 'HAJAFAULU' | string;
  gpa?: number;
  classRank?: number | string;
  streamRank?: number | string;
  overallRank?: number | string;
  percentile?: number;
  meanScore?: number;
  reportCardData?: StudentReportCardData;
  passportPhoto?: string; // base64 / URL for passport size photo
  registeredAt?: string;
  phone?: string;
  parentPhone?: string;
  parentName?: string;
  parentPin?: string; // Custom PIN / password for Parent Portal access
  feeStatus?: 'PAID' | 'UNPAID' | string;
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
  id: number;
  firestoreDocId?: string;
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
  id: number | string;
  name: string;
  type?: string;
  level: EducationLevel;
  className: string;
  date: string;
  status?: 'Active' | 'Inactive' | 'Locked';
  isActive?: boolean;
  academicYear?: string;
  term?: string;
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
  dateIncident?: string;
}

export interface DailyRollCallRecord {
  studentId?: number;
  status?: string;
  remarks?: string;
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
  className?: string; // e.g. "Darasa la 1", "Form 1", or "All Classes"
  streamName?: string; // e.g. "Mkondo A", "All Streams"
  isLocked?: boolean;
  activityType?: string;
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
  nectaStartNumber?: string;
  nectaEndNumber?: string;
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

export type UserRole = 'HEADMASTER' | 'ACADEMIC' | 'TEACHER' | 'ENVIRONMENT_TEACHER' | 'SUPER_ADMIN';

export type EquipmentCondition = 'Nzuri' | 'Mbovu' | 'Inahitaji Matengenezo';
export type EquipmentCategory = 'Kilimo' | 'Usafi' | 'Upimaji Hali ya Hewa' | 'Maji' | 'Bustani' | 'Miti na Misitu' | 'Vinginevyo';
export type UsageStatus = 'Imetumika' | 'Imerudishwa' | 'Imepotea';

export interface EnvironmentEquipment {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: EquipmentCondition;
  location: string;
  purchase_date?: string;
  purchaseDate?: string;
  added_by?: string;
  addedBy?: string;
  school_id?: string;
  schoolId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentUsageLog {
  id: string;
  equipment_id: string;
  equipmentId?: string;
  equipment_name?: string;
  equipmentName?: string;
  used_by: string;
  usedBy?: string;
  quantity_used: number;
  quantityUsed?: number;
  purpose: string;
  date_used: string;
  dateUsed?: string;
  returned_date?: string | null;
  returnedDate?: string | null;
  status: UsageStatus;
  notes?: string;
  school_id?: string;
  schoolId?: string;
  created_at?: string;
}

export type OrderStatus = 'Imeagizwa' | 'Imekuja' | 'Haijaja';

export interface EnvironmentOrder {
  id: string;
  student_id?: string;
  studentId?: string;
  student_name: string;
  studentName?: string;
  class: string;
  stream: string;
  equipment_name: string;
  equipmentName?: string;
  quantity_ordered: number;
  quantityOrdered?: number;
  order_date: string;
  orderDate?: string;
  status: OrderStatus;
  notes?: string;
  ordered_by?: string;
  orderedBy?: string;
  school_id?: string;
  schoolId?: string;
  created_at?: string;
}

export interface SchoolPurchasedEquipment {
  id: string;
  equipment_name: string;
  equipmentName?: string;
  category: string;
  quantity_bought: number;
  quantityBought?: number;
  unit_price: number;
  unitPrice?: number;
  total_cost: number;
  totalCost?: number;
  supplier?: string;
  purchase_date: string;
  purchaseDate?: string;
  receipt_number?: string;
  receiptNumber?: string;
  condition: EquipmentCondition;
  storage_location?: string;
  storageLocation?: string;
  school_id?: string;
  schoolId?: string;
  added_by?: string;
  addedBy?: string;
  created_at?: string;
}

export interface ReamPaperRecord {
  id: string;
  student_id?: string;
  studentId?: string;
  student_name: string;
  studentName?: string;
  class: string;
  stream: string;
  reams_brought: number;
  reamsBrought?: number;
  date_brought: string;
  dateBrought?: string;
  term: string;
  academic_year: string;
  academicYear?: string;
  received_by?: string;
  receivedBy?: string;
  notes?: string;
  school_id?: string;
  schoolId?: string;
  created_at?: string;
}

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
export type ExamTerm = 'Term 1' | 'Term 2';
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
  assignments?: Record<string, number>;
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
  dutyRosterData?: DutyRosterData;
  bubbleSettings?: {
    enabled: boolean;
    theme: string;
    density: 'low' | 'medium' | 'high';
  };
  academicTermDates?: AcademicTermDates;
  communicationTemplates?: CommunicationTemplate[];
  calendarEvents?: CalendarEvent[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'Holiday' | 'Term' | 'Exam' | 'Other';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  color: string; // Tailwind color class or hex
  description?: string;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'SMS' | 'WhatsApp';
  content: string; // e.g. "Habari {parentName}, matokeo ya {studentName} kwa mtihani wa {examName} ni {marks}."
  category: 'Results' | 'Announcement' | 'Attendance' | 'Fees';
  isDefault?: boolean;
}

export interface AcademicTermDates {
  yearOpeningDate?: string;
  midTerm1BreakStart?: string;
  midTerm1BreakEnd?: string;
  terminalBreakStart?: string;
  terminalBreakEnd?: string;
  midTerm2BreakStart?: string;
  midTerm2BreakEnd?: string;
  annualBreakStart?: string;
  annualBreakEnd?: string;
}

export interface DutyStream {
  id: string;
  name: string; // e.g. "Form 1A", "Form 1B", "Form 2A", "Form 3 Science", "Form 4 Arts"
  registeredBoys?: number;  // Wavulana Waliosajiliwa (B)
  registeredGirls?: number; // Wasichana Waliosajiliwa (G)
  totalStudents: number;    // Jumla Waliosajiliwa (T = B + G)
  classTeacher?: string;
}

export interface DutyTeacher {
  id: number | string;
  name: string;
  phone: string;
  subject: string;
}

export interface DutyWeeklyAssignment {
  id: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;   // YYYY-MM-DD (Sunday)
  weekLabel: string; // e.g. "21 Oct - 27 Oct 2024"
  teacherIds: (number | string)[];
  teacherNames: string[];
  notes?: string;
  assignedBy?: string;
  createdAt: string;
}

export interface DutyStreamAttendanceRow {
  streamId: string;
  streamName: string;
  registeredBoys?: number;  // B - Waliosajiliwa
  registeredGirls?: number; // G - Waliosajiliwa
  totalStudents: number;    // T - Jumla Waliosajiliwa
  presentBoys?: number;     // B - Waliofika (Present)
  presentGirls?: number;    // G - Waliofika (Present)
  present: number;          // T - Jumla Waliofika (Present)
  absentBoys?: number;      // B - Absent
  absentGirls?: number;     // G - Absent
  absent: number;           // T - Jumla Absent
  permittedBoys?: number;   // B - Walioruhusiwa
  permittedGirls?: number;  // G - Walioruhusiwa
  permitted: number;        // T - Jumla Walioruhusiwa
  sickBoys?: number;        // B - Wagonjwa / PUA
  sickGirls?: number;       // G - Wagonjwa / PUA
  sickPua: number;          // T - Jumla Wagonjwa / PUA
  unexcused: number;        // Wasio na sababu
  remarks: string;          // Maelezo
}

export interface DutyDailyReport {
  id: string;
  weekAssignmentId: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  date: string; // YYYY-MM-DD
  dayName: string; // Jumatatu, Jumanne, etc.
  teacherId: number | string;
  teacherName: string;
  allWeekTeachers: string[];
  streams: DutyStreamAttendanceRow[];
  totals: {
    registeredBoys?: number;
    registeredGirls?: number;
    totalStudents: number;
    presentBoys?: number;
    presentGirls?: number;
    present: number;
    absentBoys?: number;
    absentGirls?: number;
    absent: number;
    permittedBoys?: number;
    permittedGirls?: number;
    permitted: number;
    sickBoys?: number;
    sickGirls?: number;
    sickPua: number;
    unexcused: number;
  };
  environmentRating: number; // 1-10
  environmentNotes?: string;
  generalDiscipline: string; // Nidhamu Jumla (Maelezo ya matukio ya utoro, fujo)
  teachersPresent: number;
  teachersAbsent: number;
  teacherAttendanceNotes: string; // Mahudhurio ya Walimu (Waalimu waliofika / hawakufika)
  keyEvents: string; // Matukio Muhimu ya Siku (kama ugonjwa wa ghafla, mgeni, mvua)
  bellSchedule: string; // Kengele / Ratiba (Ilikuwaje?)
  recommendations: string; // Mapendekezo kwa Discipline Master
  createdAt: string;
  updatedAt: string;
}

export interface DutyRosterData {
  streams: DutyStream[];
  teachers: DutyTeacher[];
  weeklyAssignments: DutyWeeklyAssignment[];
  dailyReports: DutyDailyReport[];
  updatedAt?: string;
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

