import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  ShieldAlert, 
  BookMarked, 
  Users, 
  DollarSign,
  Wallet, 
  MessageSquare,
  Smartphone, 
  Settings, 
  Phone,
  FileText,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Award,
  Grid,
  ShieldCheck,
  CreditCard,
  CalendarCheck,
  UserPlus,
  PenTool,
  Send,
  UserCheck,
  Leaf
} from 'lucide-react';

export type ActiveView = 
  | 'multischool'
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'teacherportal'
  | 'classjournal'
  | 'lessonplans'
  | 'schemes'
  | 'results'
  | 'markentry'
  | 'exams'
  | 'examrecords'
  | 'nectaanalyzer'
  | 'sittingplan'
  | 'evaluationanalysis'
  | 'dailytracker'
  | 'timetable'
  | 'invigilation'
  | 'invigilation-calendar'
  | 'attendance'
  | 'discipline'
  | 'environment'
  | 'studentid'
  | 'finance'
  | 'sms'
  | 'parentportal'
  | 'remedialdaily'
  | 'remedialtimetable'
  | 'remedialanalyzer'
  | 'reampapers'
  | 'pastpapers'
  | 'nectaregs'
  | 'laboratory'
  | 'examsettings'
  | 'attendance-scan'
  | 'teacher-attendance'
  | 'staff-payroll'
  | 'biometric-report'
  | 'student-progress'
  | 'officialletters'
  | 'settings';

export interface SubModuleRoute {
  id: ActiveView;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface MainModuleGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  badgeBg: string;
  subModules: SubModuleRoute[];
}

export const MAIN_MODULE_GROUPS: MainModuleGroup[] = [
  // 1. PEOPLE MANAGEMENT
  {
    id: 'people_management',
    title: 'PEOPLE MANAGEMENT',
    icon: <Users className="w-4 h-4" />,
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    subModules: [
      { id: 'students', label: 'Student Registration', description: 'Admission, profile, enrollment, nominal rolls & CSV import' },
      { id: 'teachers', label: 'Teacher Management', description: 'Teacher registration, profiles, subjects & class assignments' },
      { id: 'teacher-attendance', label: 'Teacher Attendance (Mahudhurio ya Walimu)', description: 'Daily staff presence tracking, check-in times, absence logs & Supabase sync', badge: 'NEW' },
      { id: 'biometric-report', label: 'Biometric Report (Ripoti ya Vidole)', description: 'Aggregates daily arrival & departure times, highlighting late arrivals & early departures', badge: 'BIOMETRIC' },
      { id: 'staff-payroll', label: 'Staff Payroll Management (Mishahara)', description: 'Monthly salary calculation from attendance, tax deductions, bonuses & PDF payslips', badge: 'PAYROLL' }
    ]
  },

  // 2. TEACHING MANAGEMENT
  {
    id: 'teaching',
    title: 'TEACHING MANAGEMENT',
    icon: <BookOpen className="w-4 h-4" />,
    iconColor: 'text-amber-400',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    subModules: [
      { id: 'teacherportal', label: 'Sehemu ya Mwalimu (Teacher Hub)', description: 'Kuita majina, kuingiza marks, lesson plan, scheme of work & ripoti za darasa', badge: 'MWALIMU' },
      { id: 'classjournal', label: 'Class Journal', description: 'Classroom period log & daily monitoring book' },
      { id: 'lessonplans', label: 'Lesson Plan', description: 'Prepare, generate & track daily teaching lesson plans' },
      { id: 'schemes', label: 'Scheme of Work', description: 'Curriculum schemes & weekly topic completion' },
      { id: 'laboratory', label: 'Laboratory Inventory', description: 'Physics, Chemistry & Biology lab apparatus, chemicals and equipment tracking', badge: 'LAB' }
    ]
  },

  // 3. ACADEMIC & EXAMINATIONS
  {
    id: 'academic_exams',
    title: 'ACADEMIC & EXAMINATIONS',
    icon: <GraduationCap className="w-4 h-4" />,
    iconColor: 'text-purple-400',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    subModules: [
      { id: 'results', label: 'Academic / Results Dashboard', description: 'Performance reports, report cards & student analysis' },
      { id: 'markentry', label: 'Mark Entry', description: 'Subject mark entry, teacher grading & USAL scores', badge: 'RESTORED' },
      { id: 'exams', label: 'Exams & Scheduling', description: 'Examination sessions, paper configs & grading thresholds' },
      { id: 'examsettings', label: 'Exam Settings (Lock Control)', description: 'Lock or unlock exams to control teacher mark entry (Active / Locked)', badge: 'LOCK' },
      { id: 'examrecords', label: 'Exam Records & Top Performers', description: 'Master marksheets, Top Performers leaderboard, yearly profiles & promotion', badge: 'Leaderboard' },
      { id: 'nectaanalyzer', label: 'NECTA Analyzer', description: 'National exam statistics, divisions & GPA analysis' },
      { id: 'sittingplan', label: 'Sitting Plan', description: 'Automated exam hall seating arrangement & desk labels' },
      { id: 'evaluationanalysis', label: 'Evaluation Analysis', description: 'Subject teacher evaluation & class performance audit' },
      { id: 'dailytracker', label: 'Daily Ticker', description: 'Real-time academic activity ticker & lesson log' },
      { id: 'reampapers', label: 'Ream Paper Records', description: 'Usimamizi wa ream papers zilizoletwa na wanafunzi', badge: 'REAMS' },
      { id: 'pastpapers', label: 'Past Paper Center', description: 'Download past papers, marking schemes & exam resources', badge: 'NEW' },
      { id: 'nectaregs', label: 'NECTA Reg. Numbers Studio', description: 'Jenereta ya namba za usajili za NECTA zenye boda na mitindo maridadi', badge: 'NECTA' },
      { id: 'student-progress', label: 'Student Progress & Improvement Tracker', description: 'Track student score progression from lowest marks up to big improvement (Form 1 to 4)', badge: 'PROGRESS' }
    ]
  },

  // 4. TIMETABLE & SUPERVISION
  {
    id: 'timetable_invigilation',
    title: 'TIMETABLE & SUPERVISION',
    icon: <Clock className="w-4 h-4" />,
    iconColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    subModules: [
      { id: 'timetable', label: 'Master Timetable', description: 'Conflict-free master class & teacher timetable' },
      { id: 'invigilation', label: 'Invigilation Schedule', description: 'Exam supervision & invigilator duty roster' },
      { id: 'invigilation-calendar', label: 'Invigilation Calendar (Kalenda ya Usimamizi)', description: 'Monthly calendar view of exam duties, halls & invigilators', badge: 'KALENDA' }
    ]
  },

  // 5. STUDENT AFFAIRS
  {
    id: 'student_affairs',
    title: 'STUDENT AFFAIRS',
    icon: <ShieldAlert className="w-4 h-4" />,
    iconColor: 'text-rose-400',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    subModules: [
      { id: 'attendance', label: 'Smart Attendance', description: 'Daily class rollcall & automatic monthly parent reports', badge: 'Smart' },
      { id: 'discipline', label: 'Discipline Management', description: 'Student conduct, warnings, suspensions & offenses' },
      { id: 'officialletters', label: 'Barua za Wito & Wazazi (Bulk Letters)', description: 'Andika barua moja, mfumo uweke jina la kila mwanafunzi wa darasa moja kwa moja', badge: 'MPYA' },
      { id: 'studentid', label: 'Student ID Generator', description: 'Generate & print student ID cards with QR codes' }
    ]
  },

  // 6. ENVIRONMENT MANAGEMENT (IDARA YA MAZINGIRA)
  {
    id: 'environment_management',
    title: 'ENVIRONMENT & ESTATE',
    icon: <Leaf className="w-4 h-4" />,
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    subModules: [
      { 
        id: 'environment', 
        label: 'Vifaa vya Mazingira (Environment)', 
        description: 'Usimamizi wa vifaa vya mazingira, ukaguzi wa hali, kukopesha na ripoti', 
        badge: 'NEW' 
      }
    ]
  },

  // 6. FINANCE MANAGEMENT
  {
    id: 'finance_management',
    title: 'FINANCE MANAGEMENT',
    icon: <DollarSign className="w-4 h-4" />,
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    subModules: [
      { id: 'finance', label: 'Fees Finance / School Finance', description: 'Fee collection, invoices, payments, student balances & receipts', badge: 'RESTORED' },
      { id: 'staff-payroll', label: 'Staff Payroll Management (Mishahara)', description: 'Monthly staff salaries based on attendance, tax deductions, bonuses & PDF payslips', badge: 'PAYROLL' },
      { id: 'remedialanalyzer', label: 'Remedial Pay', description: 'Teacher remedial allowances, payment audits & rate calculations' }
    ]
  },

  // 7. COMMUNICATION
  {
    id: 'communication',
    title: 'COMMUNICATION',
    icon: <MessageSquare className="w-4 h-4" />,
    iconColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    subModules: [
      { id: 'officialletters', label: 'Barua za Wito & Wazazi (Bulk Letters)', description: 'Andika barua moja na mfumo uzae barua yenye jina la kila mwanafunzi darasani', badge: 'BARUA' },
      { id: 'sms', label: 'SMS & Ujumbe wa Wazazi (Inbox)', description: 'Soma ujumbe wa wazazi (Inbox), tuma majibu, na matangazo ya SMS', badge: 'INBOX' },
      { id: 'parentportal', label: 'Parent Portal', description: 'Parent login to view live results, attendance & fee balances', badge: 'RESTORED' }
    ]
  },

  // 8. REMEDIAL PROGRAM
  {
    id: 'remedial_program',
    title: 'REMEDIAL PROGRAM',
    icon: <BookMarked className="w-4 h-4" />,
    iconColor: 'text-teal-400',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    subModules: [
      { id: 'remedialdaily', label: 'Remedial Classes', description: 'Daily tuition attendance & student registration' },
      { id: 'remedialtimetable', label: 'Remedial Timetable', description: 'Schedule extra tuition & weekend teaching sessions' },
      { id: 'remedialanalyzer', label: 'Remedial Progress & Pay', description: 'Remedial fee collection & teacher payout summaries' }
    ]
  },

  // 9. SYSTEM SETTINGS
  {
    id: 'system_settings',
    title: 'SYSTEM SETTINGS',
    icon: <Settings className="w-4 h-4" />,
    iconColor: 'text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    subModules: [
      { id: 'settings', label: 'System Settings', description: 'School profile, academic year, periods, backup & roles' }
    ]
  }
];

export const TOP_STANDALONE_VIEWS: SubModuleRoute[] = [
  { id: 'dashboard', label: 'Home / Overview', description: 'Main school dashboard & quick statistics' }
];
