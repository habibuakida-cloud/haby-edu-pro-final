import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Student, Teacher, Exam, InvigilationSession, PeriodSetting, StreamSetting, TimetableAssignment, Supervisor, SchoolInfo, UserAccount, SchoolStatus, ActivityLog, ActivityAction, ActivityCategory, DisciplineRecord, TeacherEvaluation, UsalRecord, ExaminationRecord } from './types';
import { setCachedData, getCachedData } from './lib/idbService';
import { DEFAULT_APP_DATA } from './constants/defaults';
import { generateUsalRecordsForExam, ensureUsalRecordsForAllExams } from './utils/usalUtils';
import { Navigation, ActiveView } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { TeachersView } from './components/TeachersView';
import { ResultsView } from './components/ResultsView';
import { ExaminationRecordsView } from './components/ExaminationRecords/ExaminationRecordsView';
import NectaAnalyzer from './components/NectaAnalyzer.jsx';
import { SmsModule } from './components/SmsModule';
import { ExamsView } from './components/ExamsView';
import { ExamSettingsView } from './components/Exams/ExamSettingsView';
import { TimetableContainer } from './components/Timetable/TimetableContainer';
import { InvigilationContainer } from './components/InvigilationContainer';
import { SettingsView } from './components/SettingsView';
import { AttendanceView } from './components/AttendanceView';
import { AttendanceScanView } from './components/Attendance/AttendanceScanView';
import { MarkEntryView } from './components/MarkEntryView';
import { StudentIDView } from './components/StudentIDView';
import { SubscriptionData, getSchoolSubscription, initializeTrial, isSubscriptionValid } from './utils/SubscriptionService';
import { SubscriptionModal } from './components/common/SubscriptionModal';
import { DisciplineView } from './components/DisciplineView';
import { EnvironmentModule } from './components/Environment/EnvironmentModule';
import { LaboratoryInventoryView } from './components/Laboratory/LaboratoryInventoryView';
import { LessonPlanView } from './components/LessonPlan/LessonPlanView';
import { SchemeOfWorkView } from './components/SchemeOfWork/SchemeOfWorkView';
import { TeacherPortalView } from './components/Teachers/TeacherPortalView';
import { FloatingBubbles } from './components/FloatingBubbles';
import { AuthScreen } from './components/auth/AuthScreen';
import { ParentPortalView } from './components/ParentPortalView';
import { DailyTeachingTrackerView } from './components/DailyTeachingTrackerView';
import { EvaluationAnalysisView } from './components/EvaluationAnalysisView';
import { ReamPaperModule } from './components/Academic/ReamPaperModule';
import { NectaRegistrationView } from './components/Academic/NectaRegistrationView';
import { RemedialTimetableSetup } from './components/Remedial/RemedialTimetableSetup';
import { RemedialDailyTracker } from './components/Remedial/RemedialDailyTracker';
import { RemedialPaymentAnalyzer } from './components/Remedial/RemedialPaymentAnalyzer';
import { OnboardingTour } from './components/common/OnboardingTour';
import { VerifiedStudentProfileView } from './components/common/VerifiedStudentProfileView';
import { RoleGuard } from './components/common/RoleGuard';
import { useAuth } from './context/AuthContext';
import { ConfirmDeleteProvider } from './context/ConfirmDeleteContext';
import SittingPlan from './components/SittingPlan.jsx';
import SaasFinance from './components/SaasFinance.jsx';
import { 
  db,
  DEFAULT_PRIMARY_SCHOOL_ID,
  getCurrentSchoolId,
  processSyncQueue,
  supabase,
  toSupabaseStudent,
  fromSupabaseStudent,
  toSupabaseTeacher,
  fromSupabaseTeacher,
  toSupabaseExam,
  fromSupabaseExam,
  toSupabaseActivityLog,
  toSupabaseDiscipline,
  toSupabaseParent,
  upsertRecord,
  insertRecord,
  deleteRecord
} from './lib/dbClient';
import { computeTeacherInitial } from './utils/teacherInitials';
import { 
  getSchoolData, 
  saveSchoolData, 
  subscribeSchoolData, 
  getStudents, 
  getTeachers, 
  getExams,
  getUsers
} from './lib/dataService';
import { testFirestoreConnection } from './lib/firebaseClient';
import { 
  subscribeToStudents, 
  subscribeToTeachers, 
  saveStudentToFirestore, 
  deleteStudentFromFirestore,
  saveTeacherToFirestore,
  deleteTeacherFromFirestore,
  updateStudentFeeStatus
} from './lib/firestoreService';
import { QuickAddStudentModal } from './components/Students/QuickAddStudentModal';
import { saveTimetableAssignments } from './lib/timetableService';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { Loader2, Shield, Menu, RotateCw, Check, Building2, ShieldCheck, UserPlus } from 'lucide-react';

const mergeById = (arr1: any[], arr2: any[]) => {
  const map = new Map();
  (arr1 || []).forEach(item => {
    if (item && item.id != null) {
      map.set(String(item.id), item);
    }
  });
  (arr2 || []).forEach(item => {
    if (item && item.id != null) {
      const existing = map.get(String(item.id)) || {};
      map.set(String(item.id), { ...existing, ...item });
    }
  });
  return Array.from(map.values());
};

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/parent')) {
    return <ParentPortalView onBackToMain={() => { window.location.pathname = '/'; }} />;
  }

  const { userAccount, loading: authLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [data, setData] = useState<AppData>(() => {
    const schoolId = typeof window !== 'undefined' 
      ? (localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID)
      : DEFAULT_PRIMARY_SCHOOL_ID;

    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(`haby_school_data_snapshot_${schoolId}`) || localStorage.getItem(`haby_school_data_${schoolId}`);
        console.log("App init: Loading from localStorage for school:", schoolId, "Data found:", !!local);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            return { 
              ...DEFAULT_APP_DATA, 
              ...parsed,
              schoolInfo: { ...DEFAULT_APP_DATA.schoolInfo, ...(parsed.schoolInfo || {}) },
              communicationTemplates: parsed.communicationTemplates || DEFAULT_APP_DATA.communicationTemplates || []
            };
          }
        }
      } catch (e) { console.error("App init: Error loading from localStorage:", e); }
    }
    
    console.log("App init: Using default app data base. isDemo:", schoolId === DEFAULT_PRIMARY_SCHOOL_ID);
    if (schoolId !== DEFAULT_PRIMARY_SCHOOL_ID) {
      return {
        ...DEFAULT_APP_DATA,
        students: [],
        teachers: [],
        exams: [],
        timetableAssignments: [],
        examinationRecords: [],
        disciplineRecords: [],
        activityLogs: [],
      };
    }
    return DEFAULT_APP_DATA;
  });

  const [verifyStudentRegNo, setVerifyStudentRegNo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('verifyStudent');
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get('view');
      if (view) {
        setActiveView(view as ActiveView);
        return;
      }
    }

    if (userAccount?.role === 'TEACHER' && !sessionStorage.getItem('haby_teacher_viewed')) {
      sessionStorage.setItem('haby_teacher_viewed', 'true');
      setActiveView('teacherportal');
    } else if ((userAccount?.isSuperAdmin || userAccount?.role === 'SUPER_ADMIN') && !sessionStorage.getItem('haby_superadmin_viewed')) {
      sessionStorage.setItem('haby_superadmin_viewed', 'true');
      setActiveView('multischool');
    }
  }, [userAccount]);

  const [dataLoading, setDataLoading] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [schoolStatus, setSchoolStatus] = useState<SchoolStatus>('ACTIVE');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved');
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [smsTargetExam, setSmsTargetExam] = useState<{ examType?: string; year?: string }>({});
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [checkingSub, setCheckingSub] = useState<boolean>(true);
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const [supabaseStudentCount, setSupabaseStudentCount] = useState<number | null>(null);

  // Helper function to persist school state snapshot to Supabase
  const saveSchoolDataToSupabase = async (schId: string, snapData: any) => {
    if (!schId) return;
    try {
      const payload = {
        id: schId,
        school_id: schId,
        school_info: snapData.schoolInfo || {},
        timetable_assignments: snapData.timetableAssignments || [],
        timetableAssignments: snapData.timetableAssignments || [],
        period_settings: snapData.periodSettings || [],
        periodSettings: snapData.periodSettings || [],
        stream_settings: snapData.streamSettings || [],
        streamSettings: snapData.streamSettings || [],
        institutional_policy: snapData.institutionalPolicy || {},
        sessions: snapData.sessions || [],
        supervisors: snapData.supervisors || [],
        selected_invigilators: snapData.selectedInvigilators || [],
        invigilation_assignments: snapData.invigilationAssignments || {},
        daily_attendance: snapData.dailyAttendance || {},
        journal_records: snapData.journalRecords || {},
        schemesOfWork: snapData.schemesOfWork || [],
        schemes_of_work: snapData.schemesOfWork || [],
        lessonPlans: snapData.lessonPlans || [],
        lesson_plans: snapData.lessonPlans || [],
        teacherEvaluations: snapData.teacherEvaluations || [],
        teacher_evaluations: snapData.teacherEvaluations || [],
        savedTimetableRecords: snapData.savedTimetableRecords || [],
        saved_timetable_records: snapData.savedTimetableRecords || [],
        savedInvigilationRecords: snapData.savedInvigilationRecords || [],
        saved_invigilation_records: snapData.savedInvigilationRecords || [],
        gradeCutoffs: snapData.gradeCutoffs || {},
        grade_cutoffs: snapData.gradeCutoffs || {},
        ledgerSubjectKeys: snapData.ledgerSubjectKeys || {},
        ledger_subject_keys: snapData.ledgerSubjectKeys || {},
        subjectPeriodAllocations: snapData.subjectPeriodAllocations || [],
        subject_period_allocations: snapData.subjectPeriodAllocations || [],
        teacherAssignments: snapData.teacherAssignments || [],
        teacher_assignments: snapData.teacherAssignments || [],
        subjectPaperConfigs: snapData.subjectPaperConfigs || {},
        subject_paper_configs: snapData.subjectPaperConfigs || {},
        bubbleSettings: snapData.bubbleSettings || {},
        bubble_settings: snapData.bubbleSettings || {},
        students: snapData.students || [],
        teachers: snapData.teachers || [],
        exams: snapData.exams || [],
        examinationRecords: snapData.examinationRecords || [],
        examination_records: snapData.examinationRecords || [],
        parents: snapData.parents || [],
        academic_term_dates: snapData.academicTermDates || {},
        communicationTemplates: snapData.communicationTemplates || [],
        communication_templates: snapData.communicationTemplates || [],
        calendarEvents: snapData.calendarEvents || [],
        calendar_events: snapData.calendarEvents || [],
        updated_at: new Date().toISOString()
      };
      
      // Persist snapshot to Supabase school_data table with resilience
      await saveSchoolData(schId, payload);
    } catch (err) {
      console.warn("Error saving school snapshot:", err);
    }
  };

  // Sync with Supabase & Real-Time Single Source of Truth
  useEffect(() => {
    if (!userAccount?.schoolId || userAccount.schoolId === 'PENDING') {
      setDataLoading(false);
      return;
    }

    const schoolId = userAccount.schoolId;
    console.log("Current school_id:", schoolId);
    const schoolKey = `haby_school_data_${schoolId}`;

    // Check subscription
    if (userAccount?.schoolId) {
      getSchoolSubscription(userAccount.schoolId).then(async (sub) => {
        if (!sub) {
          const newSub = await initializeTrial(userAccount.schoolId);
          setSubscription(newSub);
        } else {
          setSubscription(sub);
        }
        setCheckingSub(false);
      });
    }

    // Pre-populate state from localStorage immediately on boot to guarantee persistence across refreshes
    try {
      const localSnap = localStorage.getItem(`haby_school_data_${schoolId}`) || localStorage.getItem(`haby_school_data_snapshot_${schoolId}`);
      const localTimetable = localStorage.getItem(`haby_timetable_assignments_${schoolId}`);
      const localPeriods = localStorage.getItem(`haby_period_settings_${schoolId}`);
      const localStreams = localStorage.getItem(`haby_stream_settings_${schoolId}`);
      const localTeacherAssignments = localStorage.getItem(`haby_teacher_assignments_${schoolId}`);

      if (localSnap || localTimetable || localPeriods || localStreams || localTeacherAssignments) {
        const parsed = localSnap ? JSON.parse(localSnap) : {};
        setData(prev => {
          const parsedStudents = Array.isArray(parsed.students) ? parsed.students : [];
          const parsedTeachers = Array.isArray(parsed.teachers) ? parsed.teachers : [];
          return {
            ...prev,
            ...parsed,
            students: parsedStudents.length > (prev.students?.length || 0) ? parsedStudents : prev.students,
            teachers: parsedTeachers.length > (prev.teachers?.length || 0) ? parsedTeachers : prev.teachers,
            timetableAssignments: localTimetable ? JSON.parse(localTimetable) : (parsed.timetableAssignments || prev.timetableAssignments || []),
            periodSettings: localPeriods ? JSON.parse(localPeriods) : (parsed.periodSettings || prev.periodSettings || []),
            streamSettings: localStreams ? JSON.parse(localStreams) : (parsed.streamSettings || prev.streamSettings || []),
            teacherAssignments: localTeacherAssignments ? JSON.parse(localTeacherAssignments) : (parsed.teacherAssignments || prev.teacherAssignments || [])
          };
        });
      }
    } catch (e) {
      console.warn("Immediate localStorage boot load error:", e);
    }

    getCachedData(schoolKey).then(cached => {
      if (cached && typeof cached === 'object') {
        setData(prev => {
          const cachedStudents = Array.isArray(cached.students) ? cached.students : [];
          const cachedTeachers = Array.isArray(cached.teachers) ? cached.teachers : [];
          return {
            ...prev,
            ...cached,
            students: cachedStudents.length > (prev.students?.length || 0) ? cachedStudents : prev.students,
            teachers: cachedTeachers.length > (prev.teachers?.length || 0) ? cachedTeachers : prev.teachers,
            timetableAssignments: cached.timetableAssignments && cached.timetableAssignments.length > 0 ? cached.timetableAssignments : prev.timetableAssignments,
            periodSettings: cached.periodSettings && cached.periodSettings.length > 0 ? cached.periodSettings : prev.periodSettings,
            streamSettings: cached.streamSettings && cached.streamSettings.length > 0 ? cached.streamSettings : prev.streamSettings,
            teacherAssignments: cached.teacherAssignments && cached.teacherAssignments.length > 0 ? cached.teacherAssignments : prev.teacherAssignments
          };
        });
      }
    }).catch(e => console.warn("Initial IDB cache load error:", e));

    // 0. Primary Database Load: Pure Supabase Sync (Relational + Snapshot Engine)
    const loadFromDatabase = async (isInitialBoot = false) => {
      console.log("Loading unified single source of truth for school:", schoolId);
      const safetyTimer = setTimeout(() => {
        setDataLoading(false);
      }, 3000);

      try {
        // Fetch in parallel from DB core tables and school_data snapshot
        const [supabaseDataSnapshot, studRes, teachRes, examRes] = await Promise.all([
          getSchoolData(schoolId).catch(() => null),
          (async () => {
            try {
              const data = await getStudents(schoolId);
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          })(),
          (async () => {
            try {
              const data = await getTeachers(schoolId);
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          })(),
          (async () => {
            try {
              const data = await getExams(schoolId);
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          })(),
        ]);

        // Process Supabase core tables
        const supaStudents = (studRes?.data || []).map((s: any, idx: number) => fromSupabaseStudent(s, idx));
        const supaTeachers = (teachRes?.data || []).map((t: any, idx: number) => fromSupabaseTeacher(t, idx));
        const supaExams = (examRes?.data || []).map((e: any, idx: number) => fromSupabaseExam(e, idx));
        const supaClasses = [];
        const supaPeriods = [];

        // Fetch users from Supabase users table
        try {
          const userMap = new Map<string, any>();

          try {
            const supaUsers = await getUsers(schoolId);
            if (supaUsers) {
              supaUsers.forEach((u: any) => userMap.set(u.id, u));
            }
          } catch (e1) {}

          if (userMap.size > 0) {
            setUsers(Array.from(userMap.values()) as UserAccount[]);
          }
        } catch (uErr) {
          console.warn("Could not load users from DB:", uErr);
        }

        const rawSchoolData = (supabaseDataSnapshot || {}) as Record<string, any>;
        const remoteData = { ...rawSchoolData } as Partial<AppData>;
        
        setData(prev => {
          // Resolve students: prioritize rich school_data snapshot when it has >= relational rows, then relational rows
          const snapStudents = Array.isArray(rawSchoolData.students)
            ? rawSchoolData.students
            : Array.isArray(remoteData.students)
            ? remoteData.students
            : [];
          let resolvedStudents = prev.students;
          if (snapStudents.length >= supaStudents.length && snapStudents.length > 0) {
            resolvedStudents = snapStudents;
          } else if (supaStudents.length > 0) {
            resolvedStudents = supaStudents;
          } else if (prev.students && prev.students.length > 0) {
            resolvedStudents = prev.students;
          }

          const snapTeachers = Array.isArray(rawSchoolData.teachers)
            ? rawSchoolData.teachers
            : Array.isArray(remoteData.teachers)
            ? remoteData.teachers
            : [];
          let resolvedTeachers = prev.teachers;
          if (snapTeachers.length >= supaTeachers.length && snapTeachers.length > 0) {
            resolvedTeachers = snapTeachers;
          } else if (supaTeachers.length > 0) {
            resolvedTeachers = supaTeachers;
          } else if (prev.teachers && prev.teachers.length > 0) {
            resolvedTeachers = prev.teachers;
          }

          let resolvedExams = prev.exams;
          if (supaExams.length > 0) {
            resolvedExams = supaExams;
          } else if (Array.isArray(rawSchoolData.exams) && rawSchoolData.exams.length > 0) {
            resolvedExams = rawSchoolData.exams;
          } else if (Array.isArray(remoteData.exams) && remoteData.exams.length > 0) {
            resolvedExams = remoteData.exams;
          } else if (prev.exams && prev.exams.length > 0) {
            resolvedExams = prev.exams;
          }

          const resolvedSchoolInfo = 
            (rawSchoolData.schoolInfo && Object.keys(rawSchoolData.schoolInfo).length > 0)
              ? rawSchoolData.schoolInfo
              : (rawSchoolData.school_info && Object.keys(rawSchoolData.school_info).length > 0)
                ? rawSchoolData.school_info
                : prev.schoolInfo;

          // Build or merge streamSettings from Supabase classes if available
          let resolvedStreamSettings = remoteData.streamSettings || prev.streamSettings || [];
          if (supaClasses.length > 0) {
            const existingClassNames = new Set(resolvedStreamSettings.map((s: any) => s.className));
            const newStreamEntries = supaClasses
              .filter((c: any) => !existingClassNames.has(c.name))
              .map((c: any) => ({
                id: Date.now() + Math.floor(Math.random() * 1000),
                className: c.name,
                level: c.level || 'CSEE',
                streams: c.stream ? [c.stream] : ['STREAM A', 'STREAM B']
              }));
            if (newStreamEntries.length > 0) {
              resolvedStreamSettings = [...resolvedStreamSettings, ...newStreamEntries];
            }
          }

          // Use Supabase periods if present and periodSettings is empty
          const resolvedPeriods = (supaPeriods.length > 0 && (!remoteData.periodSettings || remoteData.periodSettings.length === 0))
            ? supaPeriods
            : (rawSchoolData.periodSettings || rawSchoolData.period_settings || prev.periodSettings || []);

          // Safe resolution for Timetable & Invigilation (handles both camelCase and snake_case from Supabase)
          const resolvedTimetableAssignments = 
            (rawSchoolData.timetableAssignments && Array.isArray(rawSchoolData.timetableAssignments) && rawSchoolData.timetableAssignments.length > 0)
              ? rawSchoolData.timetableAssignments
              : (rawSchoolData.timetable_assignments && Array.isArray(rawSchoolData.timetable_assignments) && rawSchoolData.timetable_assignments.length > 0)
                ? rawSchoolData.timetable_assignments
                : (prev.timetableAssignments && prev.timetableAssignments.length > 0)
                  ? prev.timetableAssignments
                  : [];

          const resolvedSessions = 
            (rawSchoolData.sessions && Array.isArray(rawSchoolData.sessions) && rawSchoolData.sessions.length > 0)
              ? rawSchoolData.sessions
              : (prev.sessions && prev.sessions.length > 0 ? prev.sessions : []);

          const resolvedSupervisors = 
            (rawSchoolData.supervisors && Array.isArray(rawSchoolData.supervisors) && rawSchoolData.supervisors.length > 0)
              ? rawSchoolData.supervisors
              : (prev.supervisors && prev.supervisors.length > 0 ? prev.supervisors : []);

          const resolvedSelectedInvigilators = 
            (rawSchoolData.selectedInvigilators && Array.isArray(rawSchoolData.selectedInvigilators) && rawSchoolData.selectedInvigilators.length > 0)
              ? rawSchoolData.selectedInvigilators
              : (rawSchoolData.selected_invigilators && Array.isArray(rawSchoolData.selected_invigilators) && rawSchoolData.selected_invigilators.length > 0)
                ? rawSchoolData.selected_invigilators
                : (prev.selectedInvigilators || []);

          const resolvedInvigilationAssignments = 
            (rawSchoolData.invigilationAssignments && typeof rawSchoolData.invigilationAssignments === 'object' && Object.keys(rawSchoolData.invigilationAssignments).length > 0)
              ? rawSchoolData.invigilationAssignments
              : (rawSchoolData.invigilation_assignments && typeof rawSchoolData.invigilation_assignments === 'object' && Object.keys(rawSchoolData.invigilation_assignments).length > 0)
                ? rawSchoolData.invigilation_assignments
                : (prev.invigilationAssignments || {});

          const resolvedSavedTimetableRecords = 
            (rawSchoolData.savedTimetableRecords && Array.isArray(rawSchoolData.savedTimetableRecords) && rawSchoolData.savedTimetableRecords.length > 0)
              ? rawSchoolData.savedTimetableRecords
              : (rawSchoolData.saved_timetable_records && Array.isArray(rawSchoolData.saved_timetable_records) && rawSchoolData.saved_timetable_records.length > 0)
                ? rawSchoolData.saved_timetable_records
                : (prev.savedTimetableRecords || []);

          const resolvedSavedInvigilationRecords = 
            (rawSchoolData.savedInvigilationRecords && Array.isArray(rawSchoolData.savedInvigilationRecords) && rawSchoolData.savedInvigilationRecords.length > 0)
              ? rawSchoolData.savedInvigilationRecords
              : (rawSchoolData.saved_invigilation_records && Array.isArray(rawSchoolData.saved_invigilation_records) && rawSchoolData.saved_invigilation_records.length > 0)
                ? rawSchoolData.saved_invigilation_records
                : (prev.savedInvigilationRecords || []);

          const resolvedSubjectPeriodAllocations = 
            (rawSchoolData.subjectPeriodAllocations && Array.isArray(rawSchoolData.subjectPeriodAllocations) && rawSchoolData.subjectPeriodAllocations.length > 0)
              ? rawSchoolData.subjectPeriodAllocations
              : (rawSchoolData.subject_period_allocations && Array.isArray(rawSchoolData.subject_period_allocations) && rawSchoolData.subject_period_allocations.length > 0)
                ? rawSchoolData.subject_period_allocations
                : (prev.subjectPeriodAllocations || []);

          const resolvedTeacherAssignments = 
            (rawSchoolData.teacherAssignments && Array.isArray(rawSchoolData.teacherAssignments) && rawSchoolData.teacherAssignments.length > 0)
              ? rawSchoolData.teacherAssignments
              : (rawSchoolData.teacher_assignments && Array.isArray(rawSchoolData.teacher_assignments) && rawSchoolData.teacher_assignments.length > 0)
                ? rawSchoolData.teacher_assignments
                : (prev.teacherAssignments || []);

          const resolvedInstitutionalPolicy = 
            rawSchoolData.institutionalPolicy || rawSchoolData.institutional_policy || prev.institutionalPolicy || {};

          const resolvedJournalRecords = 
            rawSchoolData.journalRecords || rawSchoolData.journal_records || prev.journalRecords || {};

          const resolvedDailyAttendance = 
            rawSchoolData.dailyAttendance || rawSchoolData.daily_attendance || prev.dailyAttendance || {};

          const resolvedDisciplineRecords =
            (Array.isArray(rawSchoolData.disciplineRecords) && rawSchoolData.disciplineRecords.length > 0)
              ? rawSchoolData.disciplineRecords
              : (Array.isArray(rawSchoolData.discipline_records) && rawSchoolData.discipline_records.length > 0)
                ? rawSchoolData.discipline_records
                : (prev.disciplineRecords || []);

          const resolvedDutyRosterData =
            (rawSchoolData.dutyRosterData && typeof rawSchoolData.dutyRosterData === 'object' && Object.keys(rawSchoolData.dutyRosterData).length > 0)
              ? rawSchoolData.dutyRosterData
              : (rawSchoolData.duty_roster_data && typeof rawSchoolData.duty_roster_data === 'object' && Object.keys(rawSchoolData.duty_roster_data).length > 0)
                ? rawSchoolData.duty_roster_data
                : prev.dutyRosterData;

          const updatedState: AppData = {
            ...prev,
            ...remoteData,
            schoolInfo: resolvedSchoolInfo,
            students: resolvedStudents,
            teachers: resolvedTeachers,
            exams: resolvedExams,
            streamSettings: resolvedStreamSettings,
            periodSettings: resolvedPeriods,
            timetableAssignments: resolvedTimetableAssignments,
            sessions: resolvedSessions,
            supervisors: resolvedSupervisors,
            selectedInvigilators: resolvedSelectedInvigilators,
            invigilationAssignments: resolvedInvigilationAssignments,
            savedTimetableRecords: resolvedSavedTimetableRecords,
            savedInvigilationRecords: resolvedSavedInvigilationRecords,
            subjectPeriodAllocations: resolvedSubjectPeriodAllocations,
            teacherAssignments: resolvedTeacherAssignments,
            institutionalPolicy: resolvedInstitutionalPolicy,
            journalRecords: resolvedJournalRecords,
            dailyAttendance: resolvedDailyAttendance,
            disciplineRecords: resolvedDisciplineRecords,
            dutyRosterData: resolvedDutyRosterData,
            parents: remoteData.parents || prev.parents,
            examinationRecords: remoteData.examinationRecords || prev.examinationRecords,
          };

          try {
            localStorage.setItem(`haby_school_data_snapshot_${schoolId}`, JSON.stringify(updatedState));
            localStorage.setItem(`haby_school_data_${schoolId}`, JSON.stringify(updatedState));
          } catch (e) {}

          setCachedData(schoolKey, updatedState).catch(e => console.warn("IDB cache error:", e));
          return {
            ...prev,
            ...updatedState
          };
        });

        setIsCloudSynced(true);
      } catch (err) {
        console.warn("Error in loadFromDatabase:", err);
      } finally {
        clearTimeout(safetyTimer);
        setDataLoading(false);
      }
    };

    // Initial load
    console.log("App init loadFromDatabase...");
    loadFromDatabase(true);

    // Ensure relational tables are synchronized with school_data snapshot in Cloud SQL only when needed
    // Removed automatic sync-all on every refresh to prevent duplication issues

    // Real-time Firestore sync with the specific database instance
    testFirestoreConnection();
    const unsubStudents = subscribeToStudents(schoolId, (firestoreStudents) => {
      if (!firestoreStudents) return;
      console.log(`[Firestore Live Sync] Received ${firestoreStudents.length} students from database`);
      
      setData(prev => {
        // Build a fresh list from Firestore to avoid duplication
        const mapped: Student[] = firestoreStudents.map((fs, idx) => {
          const fsAny = fs as any;
          const tailNum = Number(String(fs.id).split('_').pop());
          const safeNumId = typeof fsAny.numericId === 'number' ? fsAny.numericId : (!isNaN(tailNum) && tailNum > 0 ? tailNum : 2001 + idx);
          
          return {
            id: safeNumId,
            firestoreDocId: fs.id,
            name: fs.name || 'Student',
            className: fs.className || 'Form 1',
            gender: (fs.gender as any) || 'Male',
            parentPhone: fs.parentPhone || '',
            phone: fs.parentPhone || '',
            feeStatus: (fs.feeStatus as any) || 'PAID',
            school_id: fs.schoolId || schoolId,
            stream: fs.stream || 'STREAM A',
            dob: fs.dob || '2010-01-01',
            subjects: fsAny.subjects || ['Basic Mathematics', 'English Language', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Civics'],
            regNo: fsAny.regNo || `S.0123/${String(idx + 1).padStart(4, '0')}/2026`
          };
        });

        const nextState = { ...prev, students: mapped };
        try {
          localStorage.setItem(`haby_school_data_snapshot_${schoolId}`, JSON.stringify(nextState));
          localStorage.setItem(`haby_school_data_${schoolId}`, JSON.stringify(nextState));
        } catch (e) {}
        return nextState;
      });
    });

    const unsubTeachers = subscribeToTeachers(schoolId, (firestoreTeachers) => {
      if (!firestoreTeachers) return;
      console.log(`[Firestore Live Sync] Received ${firestoreTeachers.length} teachers from database`);
      
      setData(prev => {
        const mapped: Teacher[] = firestoreTeachers.map((ft, idx) => {
          const ftAny = ft as any;
          const tailNum = Number(String(ft.id).split('_').pop());
          const safeNumId = typeof ftAny.numericId === 'number' ? ftAny.numericId : (!isNaN(tailNum) && tailNum > 0 ? tailNum : 1001 + idx);
          
          return {
            id: safeNumId,
            firestoreDocId: ft.id,
            name: ft.name || 'Teacher',
            gender: ftAny.gender || 'Male',
            schoolRole: ftAny.schoolRole || 'Subject Teacher',
            phone: ft.phone || '',
            email: ft.email || '',
            subjects: Array.isArray(ftAny.subjects) ? ftAny.subjects : (ft.subject ? [ft.subject] : ['Basic Mathematics']),
            initial: (ft.name ? computeTeacherInitial(ft.name) : '') || ftAny.initial || 'TR',
            excludeInvigilation: ftAny.excludeInvigilation ?? false
          };
        });

        const nextState = { ...prev, teachers: mapped };
        try {
          localStorage.setItem(`haby_school_data_snapshot_${schoolId}`, JSON.stringify(nextState));
          localStorage.setItem(`haby_school_data_${schoolId}`, JSON.stringify(nextState));
        } catch (e) {}
        return nextState;
      });
    });

    return () => {
      unsubStudents();
      unsubTeachers();
    };
  }, [userAccount]);

  const handleForceRefreshSync = async () => {
    if (!userAccount?.schoolId) return;
    setIsSyncing(true);

    const schoolId = userAccount.schoolId;
    try {
      console.log(`Syncing school data for school: ${schoolId}`);
      const schoolDataSnap = await getSchoolData(schoolId).catch(() => null);
      const remoteData = (schoolDataSnap || {}) as Partial<AppData>;
      setData(prev => ({
        ...prev,
        ...remoteData
      }));
      setSyncToast(`Cloud Sync Active: Successfully synchronized data from Firestore.`);
      setTimeout(() => setSyncToast(null), 5000);

      setIsCloudSynced(true);
      alert(`Orodha imesawazishwa na Firestore kikamilifu! Shule imesasishwa kutoka wingu.`);
    } catch (err: any) {
      console.error("Force sync error:", err);
      alert("Hitilafu wakati wa kusawazisha na Wingu: " + (err.message || err));
    } finally {
      setIsSyncing(false);
    }
  };

  const updateRemoteData = useCallback(async (updates: Partial<AppData>) => {
    setSaveStatus('saving');
    const schoolId = userAccount?.schoolId || getCurrentSchoolId();
    const schoolKey = `haby_school_data_${schoolId}`;

    let nextData: AppData = {} as AppData;
    setData(prev => {
      nextData = { 
        ...prev, 
        ...updates
      };
      return nextData;
    });

    // Persist lightweight snapshot to localStorage and full data to IndexedDB
    try {
      const { usalRecords: _omitUsal, ...lightSnapshot } = nextData as any;
      const serialized = JSON.stringify(lightSnapshot);
      localStorage.setItem(`haby_school_data_snapshot_${schoolId}`, serialized);
      if (nextData.timetableAssignments) {
        localStorage.setItem(`haby_timetable_assignments_${schoolId}`, JSON.stringify(nextData.timetableAssignments));
      }
      if (nextData.periodSettings) {
        localStorage.setItem(`haby_period_settings_${schoolId}`, JSON.stringify(nextData.periodSettings));
      }
      if (nextData.streamSettings) {
        localStorage.setItem(`haby_stream_settings_${schoolId}`, JSON.stringify(nextData.streamSettings));
      }
      if (nextData.teacherAssignments) {
        localStorage.setItem(`haby_teacher_assignments_${schoolId}`, JSON.stringify(nextData.teacherAssignments));
      }
    } catch (e) {}
    setCachedData(schoolKey, nextData).catch(e => console.warn("Could not save to IndexedDB:", e));

    // If periodSettings or streamSettings are directly modified, push snapshot immediately
    if (updates.periodSettings !== undefined || updates.streamSettings !== undefined || updates.timetableAssignments !== undefined) {
      saveSchoolDataToSupabase(schoolId, nextData).catch(e => console.warn("Direct snapshot sync error:", e));
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      
      // 1. Relational Table Updates (Targeted mutations) with Offline Support
      if (updates.students && Array.isArray(updates.students)) {
        // Guard: Never overwrite cloud data with 0 if it had data before
        if (updates.students.length > 0) {
          const chunk = updates.students.map(s => toSupabaseStudent(s, schoolId));
          await upsertRecord('students', chunk, 'id');
        }
      }

      if (updates.teachers && Array.isArray(updates.teachers)) {
        if (updates.teachers.length > 0) {
          const chunk = updates.teachers.map(t => toSupabaseTeacher(t, schoolId));
          await upsertRecord('teachers', chunk, 'id');
        }
      }

      if (updates.exams && Array.isArray(updates.exams)) {
        const chunk = updates.exams.map(e => toSupabaseExam(e, schoolId));
        await upsertRecord('exams', chunk, 'id');
      }

      if (updates.streamSettings && Array.isArray(updates.streamSettings)) {
        for (const s of updates.streamSettings) {
          if (s.className?.trim()) {
            try {
              await supabase.from('classes').upsert({
                name: s.className.trim(),
                level: s.level || 'CSEE',
                capacity: 45
              }, { onConflict: 'name' });
            } catch (e) {
              console.warn("Class upsert notice:", e);
            }
          }
        }
      }

        if (updates.periodSettings && Array.isArray(updates.periodSettings)) {
          for (const p of updates.periodSettings) {
            if (p.name && p.start && p.end) {
              try {
                await supabase.from('periods').upsert({
                  name: p.name,
                  start_time: p.start,
                  end_time: p.end,
                  is_break: Boolean(p.isBreak)
                }, { onConflict: 'name' });
              } catch (e) {}
            }
          }
        }

        if (updates.examinationRecords && Array.isArray(updates.examinationRecords)) {
          const chunk = updates.examinationRecords.map(r => ({ ...r, school_id: schoolId }));
          await upsertRecord('exam_records', chunk, 'id');
        }

        if (updates.activityLogs && Array.isArray(updates.activityLogs)) {
          const chunk = updates.activityLogs.map(l => toSupabaseActivityLog(l, schoolId));
          await insertRecord('activity_logs', chunk);
        }

        if (updates.disciplineRecords && Array.isArray(updates.disciplineRecords)) {
          const chunk = updates.disciplineRecords.map(d => toSupabaseDiscipline(d, schoolId));
          await upsertRecord('discipline_records', chunk, 'id');
        }

        if (updates.parents && Array.isArray(updates.parents)) {
          const chunk = updates.parents.map(p => toSupabaseParent(p, schoolId));
          await upsertRecord('parents', chunk, 'id');
        }

        if (updates.timetableAssignments && Array.isArray(updates.timetableAssignments)) {
          saveTimetableAssignments(schoolId, updates.timetableAssignments, { replace: true }).catch(e => console.warn("Timetable sync error:", e));
        }

        // 2. Snapshot Update (Metadata & Settings - Reduced payload)
        saveSchoolDataToSupabase(schoolId, nextData).catch(e => console.warn("Supabase school_data sync error:", e));
        
        setSaveStatus('saved');
        setIsCloudSynced(true);
      }, 500);
  }, [userAccount]);

  // Auto-ensure USAL records exist in memory for all registered exams without blocking initial load
  useEffect(() => {
    try {
      if (Array.isArray(data.exams) && data.exams.length > 0 && Array.isArray(data.students) && data.students.length > 0) {
        const ensured = ensureUsalRecordsForAllExams(data.exams, data.students, data.teachers || [], data.usalRecords || []);
        if (ensured.length > (data.usalRecords || []).length) {
          setData(prev => ({ ...prev, usalRecords: ensured }));
        }
      }
    } catch (err) {
      console.warn("[App] Error in auto-ensuring USAL records:", err);
    }
  }, [data.exams, data.students?.length, data.teachers?.length]);

  // Auto-upgrade school name for Super Admin to 'HabyEduPro3A'
  useEffect(() => {
    if (userAccount?.email === 'habibuakida@gmail.com' || userAccount?.isSuperAdmin) {
      if (data.schoolInfo && (
        data.schoolInfo.name === 'KIOMONI SECONDARY SCHOOL' ||
        data.schoolInfo.name?.toUpperCase().includes('KIOMONI') ||
        !data.schoolInfo.name
      )) {
        console.log("Auto-updating school name for super admin to 'HabyEduPro3A'...");
        const updatedSchoolInfo = {
          ...data.schoolInfo,
          name: 'HabyEduPro3A',
          email: 'info@habyedupro3a.ac.tz'
        };
        setData(prev => ({ ...prev, schoolInfo: updatedSchoolInfo }));
        updateRemoteData({ schoolInfo: updatedSchoolInfo });
      }
    }
  }, [userAccount, data.schoolInfo?.name]);

  // Release calculated results to Examination Records
  const handleReleaseResultsToExaminationRecords = useCallback(async (
    records: ExaminationRecord[],
    className: string,
    examName: string
  ) => {
    if (!userAccount?.schoolId || records.length === 0) return;
    const schoolId = userAccount.schoolId;

    const existing = data.examinationRecords || [];
    const map = new Map<string, ExaminationRecord>();
    existing.forEach(r => map.set(r.id, r));
    records.forEach(r => map.set(r.id, r));
    const merged = Array.from(map.values());

    const activityLogs = logActivity(
      'EXAM_UPDATED',
      'results',
      'Results Released to Examination Records',
      `Officially released ${records.length} examination records for ${className} (${examName}) to master ledger`
    );

    updateRemoteData({ examinationRecords: merged, activityLogs });

    // Push each record to Supabase exam_records table
    try {
      if (records && records.length > 0) {
        await supabase.from('exam_records').insert(records.map(rec => ({
          ...rec,
          school_id: schoolId
        })));
      }
    } catch (err) {
      console.warn("Could not push records to Supabase:", err);
    }
  }, [userAccount, data.examinationRecords, updateRemoteData]);

  const logActivity = useCallback((
    action: ActivityAction,
    category: ActivityCategory,
    title: string,
    description: string,
    details?: Record<string, any>
  ): ActivityLog[] => {
    const newEntry: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: userAccount?.id || 'user',
      userName: userAccount?.fullName || 'Authorized User',
      userEmail: userAccount?.email || '',
      userRole: userAccount?.role || 'ACADEMIC',
      action,
      category,
      title,
      description,
      details
    };

    const currentLogs = data.activityLogs || [];
    return [newEntry, ...currentLogs].slice(0, 300);
  }, [userAccount, data.activityLogs]);

  // Public & QR Scan Verification Views (accessible with or without login)
  if (verifyStudentRegNo) {
    return (
      <VerifiedStudentProfileView
        regNo={verifyStudentRegNo}
        students={data.students}
        schoolInfo={data.schoolInfo}
        dailyAttendance={data.dailyAttendance || {}}
        examinationRecords={data.examinationRecords}
        exams={data.exams}
        onMarkAttendance={(studentId, status) => {
          const today = new Date().toISOString().split('T')[0];
          const currentDaily = data.dailyAttendance || {};
          const updatedDaily = {
            ...currentDaily,
            [today]: {
              ...(currentDaily[today] || {}),
              [studentId]: status
            }
          };
          updateRemoteData({ dailyAttendance: updatedDaily });
        }}
        onBackToMain={() => {
          setVerifyStudentRegNo(null);
          if (typeof window !== 'undefined' && window.location.search.includes('verifyStudent')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  const isPublicScanUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'attendance-scan';
  if (isPublicScanUrl && !userAccount) {
    return (
      <div className="min-h-screen bg-[#edf2f7] p-4 sm:p-6">
        <AttendanceScanView
          students={data.students}
          schoolInfo={data.schoolInfo}
          dailyAttendance={data.dailyAttendance || {}}
          examinationRecords={data.examinationRecords || []}
          onMarkAttendance={(date, studentId, status) => {
            const currentDaily = data.dailyAttendance || {};
            const updatedDaily = {
              ...currentDaily,
              [date]: {
                ...(currentDaily[date] || {}),
                [studentId]: status
              }
            };
            updateRemoteData({ dailyAttendance: updatedDaily });
          }}
          onBack={() => {
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
            setActiveView('attendance');
          }}
        />
      </div>
    );
  }

  // Auth Guard
  // Parent Portal Bypass for login
  const isParentPortalHash = window.location.hash === '#parentportal' || window.location.pathname === '/parent/login';
  const hasParentSession = !!sessionStorage.getItem('haby_parent_session');

  if (isParentPortalHash || (hasParentSession && activeView === 'parentportal')) {
    return (
      <ConfirmDeleteProvider>
        <ParentPortalView
          students={data.students}
          examinationRecords={data.examinationRecords}
          schoolInfo={data.schoolInfo}
          onBackToMain={() => {
            window.location.hash = '';
            window.location.reload();
          }}
        />
      </ConfirmDeleteProvider>
    );
  }

  if (authLoading && !userAccount) {
    return (
      <div className="min-h-screen bg-[#0f2948] text-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-white/20 border-t-sky-400 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black tracking-wider">HABY EDU PRO</h2>
        <p className="text-xs text-blue-200 mt-1">Inapakia mfumo wa shule...</p>
      </div>
    );
  }

  if (!userAccount) {
    return <AuthScreen />;
  }

  if (userAccount.schoolId === 'PENDING') {
    return (
      <div className="min-h-screen bg-[#0f2948] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
          <h1 className="text-xl font-bold mb-2 text-slate-900">Akaunti Inasubiri Uidhinishaji</h1>
          <p className="text-slate-600 mb-4 text-sm">Akaunti yako ({userAccount.email}) inasubiri kuunganishwa na shule. Tafadhali wasiliana na msimamizi wa shule yako.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-[#1f4d8b] text-white rounded-xl font-bold cursor-pointer">Angalia Hali Tena</button>
        </div>
      </div>
    );
  }

  // Non-blocking background sync indicator instead of blocking screen
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#0f2948] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-sky-400 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Inapakia Data za Shule...</h2>
      </div>
    );
  }

  const handleUpdateStudents = (students: Student[]) => {
    const activityLogs = logActivity(
      'STUDENTS_BULK_UPDATE',
      'students',
      'Student Records Modified',
      `Synchronized student roster (${students.length} students enrolled)`
    );
    updateRemoteData({ students, activityLogs });
  };

  const handleAddStudent = async (student: Student) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    const docId = student.firestoreDocId || (typeof student.id === 'string' && (student.id as string).startsWith('std_') ? (student.id as string) : `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const validId = typeof student.id === 'number' && !isNaN(student.id) ? student.id : (Number(docId.replace(/\D/g, '')) || Date.now());

    const studentWithId: Student = {
      ...student,
      id: validId,
      firestoreDocId: docId,
      school_id: schoolId
    } as any;

    let matchedClassId: string | undefined = undefined;
    try {
      const { data: cls } = await supabase.from('classes').select('id').eq('name', studentWithId.className).maybeSingle();
      if (cls?.id) matchedClassId = cls.id;
    } catch (e) {}

    try {
      await saveStudentToFirestore({
        id: docId,
        name: studentWithId.name,
        className: studentWithId.className,
        gender: studentWithId.gender || '',
        parentPhone: studentWithId.parentPhone || studentWithId.phone || '',
        feeStatus: ((studentWithId as any).feeStatus === 'PAID' ? 'PAID' : 'UNPAID'),
        schoolId: schoolId,
        stream: studentWithId.stream || ''
      });
    } catch (fsErr) {
      console.warn("Firestore save student error:", fsErr);
    }

    try {
      const dbRow = toSupabaseStudent(studentWithId, schoolId, matchedClassId);
      await supabase.from('students').upsert(dbRow, { onConflict: 'id' });
    } catch (e) {
      console.warn("Error upserting student in Supabase:", e);
    }
    const activityLogs = logActivity(
      'STUDENT_ADDED',
      'students',
      'Student Enrolled',
      `Enrolled ${studentWithId.name} (${studentWithId.regNo || 'No Reg'}) in Form ${studentWithId.className}`
    );
    updateRemoteData({ students: [...data.students, studentWithId], activityLogs });
  };

  const handleBulkAddStudents = async (newStudents: Student[]) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleBulkAddStudents):", schoolId);

    // Fetch classes map to associate class_id foreign key
    const classIdMap: Record<string, string> = {};
    try {
      const { data: classesData } = await supabase.from('classes').select('id, name');
      if (classesData) {
        classesData.forEach((c: any) => {
          if (c.name) classIdMap[c.name.trim()] = c.id;
        });
      }
    } catch (e) {}

    const baseId = Date.now();
    const processedStudents = newStudents.map((s, idx) => {
      const numId = typeof s.id === 'number' && s.id > 0 ? s.id : (baseId + idx);
      const fsId = (s as any).firestoreDocId || `std_${schoolId}_${numId}`;
      return {
        ...s,
        id: numId,
        firestoreDocId: fsId,
        school_id: schoolId
      };
    });

    try {
      const rowsToPush = processedStudents.map(s => {
        const cId = s.className ? classIdMap[s.className.trim()] : undefined;
        return toSupabaseStudent(s, schoolId, cId);
      });
      const chunkSize = 100;
      for (let i = 0; i < rowsToPush.length; i += chunkSize) {
        const chunk = rowsToPush.slice(i, i + chunkSize);
        await supabase.from('students').upsert(chunk, { onConflict: 'id' });
      }
      // Also sync to Firestore in background
      Promise.all(
        processedStudents.map(s =>
          saveStudentToFirestore({
            id: (s as any).firestoreDocId,
            name: s.name,
            className: s.className || 'Form 1',
            gender: s.gender || 'Male',
            parentPhone: s.parentPhone || s.phone || '',
            feeStatus: (s.feeStatus as any) || 'PAID',
            schoolId,
            stream: s.stream || 'STREAM A',
            dob: s.dob || '2010-01-01'
          })
        )
      ).catch(() => {});
    } catch (e) {
      console.warn("Error bulk upserting students in Supabase:", e);
    }
    const activityLogs = logActivity(
      'STUDENTS_BULK_UPDATE',
      'students',
      'Students Bulk Enrolled',
      `Imported ${newStudents.length} students via CSV`
    );
    updateRemoteData({
      students: [...data.students, ...processedStudents],
      activityLogs
    });
  };

  const handleUpdateUsers = async (newUsers: UserAccount[]) => {
    setUsers(newUsers);
    if (!userAccount?.schoolId) return;
    try {
      const activityLogs = logActivity(
        'USER_ROLE_UPDATE',
        'security',
        'Staff Accounts Synchronized',
        `User accounts roster updated (${newUsers.length} active users)`
      );
      updateRemoteData({ activityLogs });
    } catch (e) {
      console.error("Error updating users:", e);
    }
  };

  const handleUpdateStudent = async (student: Student) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleUpdateStudent):", schoolId);
    
    const fsDocId = (student as any).firestoreDocId || String(student.id);

    // Update directly in Firestore
    try {
      await saveStudentToFirestore({
        id: fsDocId,
        name: student.name,
        className: student.className,
        gender: student.gender || '',
        parentPhone: student.parentPhone || student.phone || '',
        feeStatus: ((student as any).feeStatus === 'PAID' ? 'PAID' : 'UNPAID'),
        schoolId: schoolId,
        stream: student.stream || ''
      });
    } catch (fsErr) {
      console.warn("Firestore update student error:", fsErr);
    }

    try {
      const dbRow = toSupabaseStudent(student, schoolId);
      await supabase.from('students').upsert(dbRow, { onConflict: 'id' });
    } catch (e) {
      console.warn("Error updating student doc in Supabase:", e);
    }
    const activityLogs = logActivity(
      'STUDENT_UPDATED',
      'students',
      'Student Record Edited',
      `Updated academic record/marks for ${student.name} (${student.regNo})`
    );
    updateRemoteData({
      students: data.students.map(s => (s.id === student.id || (s as any).firestoreDocId === fsDocId ? { ...s, ...student, firestoreDocId: fsDocId } : s)),
      activityLogs
    });
  };

  const handleDeleteStudent = async (id: number | string) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleDeleteStudent):", schoolId);
    const targetStrId = String(id);
    const numericId = Number(id);

    const target = data.students.find(s => String(s.id) === targetStrId || (s as any).firestoreDocId === targetStrId);
    const fsDocId = (target as any)?.firestoreDocId || targetStrId;

    const newStudents = data.students.filter(s => String(s.id) !== targetStrId && (s as any).firestoreDocId !== targetStrId && (s as any).firestoreDocId !== fsDocId);

    // Delete directly from Firestore
    try {
      await deleteStudentFromFirestore(fsDocId);
    } catch (fsErr) {
      console.warn("Firestore delete student error:", fsErr);
    }

    try {
      await deleteRecord('students', id);
      if (!isNaN(numericId)) {
        await deleteRecord('students', numericId);
      }
      await deleteRecord('students', targetStrId);
      if (fsDocId !== targetStrId) {
        await deleteRecord('students', fsDocId);
      }
    } catch (e) {
      console.warn("Error deleting student doc in Supabase:", e);
    }

    const activityLogs = logActivity(
      'STUDENT_DELETED',
      'students',
      'Student Removed',
      `Removed student ${target?.name || `ID #${id}`} from school records`
    );
    updateRemoteData({
      students: newStudents,
      activityLogs
    });
  };

  const handleBulkDeleteStudents = async (ids: (number | string)[]) => {
    if (!ids || ids.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleBulkDeleteStudents):", schoolId);
    const idStrings = ids.map(id => String(id));
    const idSet = new Set(idStrings);

    // Delete from Firestore
    ids.forEach(id => {
      const target = data.students.find(s => String(s.id) === String(id) || (s as any).firestoreDocId === String(id));
      const fsDocId = (target as any)?.firestoreDocId || String(id);
      deleteStudentFromFirestore(fsDocId).catch(e => console.warn("Firestore bulk delete error:", e));
    });

    const newStudents = data.students.filter(s => !idSet.has(String(s.id)) && !idSet.has((s as any).firestoreDocId || ''));

    try {
      await supabase.from('students').delete().in('id', ids);
    } catch (e) {
      console.warn("Error bulk deleting students in Supabase:", e);
    }

    const activityLogs = logActivity(
      'STUDENT_DELETED',
      'students',
      'Multiple Students Removed',
      `Bulk deleted ${ids.length} student(s) from school records`
    );
    updateRemoteData({
      students: newStudents,
      activityLogs
    });
  };

  const handleAddTeacher = async (teacher: Teacher) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleAddTeacher):", schoolId);
    
    const docId = teacher.firestoreDocId || (typeof teacher.id === 'string' && (teacher.id as string).startsWith('tch_') ? (teacher.id as string) : `tch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const validId = typeof teacher.id === 'number' && !isNaN(teacher.id) ? teacher.id : (Number(docId.replace(/\D/g, '')) || Date.now());
    const teacherWithId: Teacher = {
      ...teacher,
      id: validId,
      firestoreDocId: docId
    } as any;

    try {
      await saveTeacherToFirestore({
        id: docId,
        name: teacherWithId.name,
        phone: teacherWithId.phone || '',
        email: teacherWithId.email || '',
        subject: teacherWithId.subjects?.[0] || '',
        schoolId: schoolId
      });
    } catch (fsErr) {
      console.warn("Firestore save teacher error:", fsErr);
    }

    try {
      const dbRow = toSupabaseTeacher(teacherWithId, schoolId);
      await supabase.from('teachers').upsert(dbRow, { onConflict: 'id' });
    } catch (e) {
      console.warn("Error inserting teacher doc in Supabase:", e);
    }
    const activityLogs = logActivity(
      'TEACHER_ADDED',
      'teachers',
      'Staff Member Added',
      `Registered teacher ${teacher.name} (${teacher.subjects.join(', ')})`
    );
    updateRemoteData({
      teachers: [...data.teachers, teacherWithId],
      selectedInvigilators: teacher.excludeInvigilation ? data.selectedInvigilators : [...data.selectedInvigilators, teacher.id],
      activityLogs
    });
  };

  const handleBulkAddTeachers = async (newTeachers: Teacher[]) => {
    if (!newTeachers || newTeachers.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleBulkAddTeachers):", schoolId);
    
    for (const t of newTeachers) {
      const docId = t.firestoreDocId || `tch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      saveTeacherToFirestore({
        id: docId,
        name: t.name,
        phone: t.phone || '',
        email: t.email || '',
        subject: t.subjects?.[0] || '',
        schoolId: schoolId
      }).catch(e => console.warn("Firestore bulk teacher save error:", e));
    }

    try {
      const rows = newTeachers.map(t => toSupabaseTeacher(t, schoolId));
      await supabase.from('teachers').upsert(rows, { onConflict: 'id' });
    } catch (e) {
      console.warn("Error inserting bulk teachers in Supabase:", e);
    }
    const activityLogs = logActivity(
      'TEACHER_BULK_ADDED',
      'teachers',
      'Multiple Teachers Registered',
      `Registered ${newTeachers.length} staff members in bulk`
    );
    const newInvigIds = newTeachers.filter(t => !t.excludeInvigilation).map(t => t.id);
    updateRemoteData({
      teachers: [...data.teachers, ...newTeachers],
      selectedInvigilators: [...data.selectedInvigilators, ...newInvigIds],
      activityLogs
    });
  };

  const handleUpdateTeacher = async (teacher: Teacher) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleUpdateTeacher):", schoolId);
    const fsDocId = (teacher as any).firestoreDocId || String(teacher.id);

    try {
      await saveTeacherToFirestore({
        id: fsDocId,
        name: teacher.name,
        phone: teacher.phone || '',
        email: teacher.email || '',
        subject: teacher.subjects?.[0] || '',
        schoolId: schoolId
      });
    } catch (fsErr) {
      console.warn("Firestore update teacher error:", fsErr);
    }

    try {
      const dbRow = toSupabaseTeacher(teacher, schoolId);
      await supabase.from('teachers').upsert(dbRow, { onConflict: 'id' });
    } catch (e) {
      console.warn("Error updating teacher doc in Supabase:", e);
    }
    const activityLogs = logActivity(
      'TEACHER_UPDATED',
      'teachers',
      'Staff Profile Modified',
      `Updated details for teacher ${teacher.name}`
    );
    updateRemoteData({
      teachers: data.teachers.map(t => (t.id === teacher.id || (t as any).firestoreDocId === fsDocId ? { ...t, ...teacher, firestoreDocId: fsDocId } : t)),
      activityLogs
    });
  };

  const handleDeleteTeacher = async (id: number | string) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleDeleteTeacher):", schoolId);
    const targetStrId = String(id);
    const numericId = Number(id);

    const target = data.teachers.find(t => String(t.id) === targetStrId || (t as any).firestoreDocId === targetStrId);
    const fsDocId = (target as any)?.firestoreDocId || targetStrId;

    const newTeachers = data.teachers.filter(t => String(t.id) !== targetStrId && (t as any).firestoreDocId !== targetStrId && (t as any).firestoreDocId !== fsDocId);

    try {
      await deleteTeacherFromFirestore(fsDocId);
    } catch (fsErr) {
      console.warn("Firestore delete teacher error:", fsErr);
    }

    try {
      await deleteRecord('teachers', id);
      if (!isNaN(numericId)) {
        await deleteRecord('teachers', numericId);
      }
      await deleteRecord('teachers', targetStrId);
      if (fsDocId !== targetStrId) {
        await deleteRecord('teachers', fsDocId);
      }
    } catch (e) {
      console.warn("Error deleting teacher doc in Supabase:", e);
    }

    const newInvigAssignments = { ...data.invigilationAssignments };
    Object.keys(newInvigAssignments).forEach(key => {
      if (newInvigAssignments[key] === id || String(newInvigAssignments[key]) === targetStrId) {
        delete newInvigAssignments[key];
      }
    });

    const activityLogs = logActivity(
      'TEACHER_DELETED',
      'teachers',
      'Staff Member Removed',
      `Removed ${target?.name || `ID #${id}`} from faculty list`
    );

    updateRemoteData({
      teachers: newTeachers,
      selectedInvigilators: data.selectedInvigilators.filter(tid => String(tid) !== targetStrId),
      timetableAssignments: data.timetableAssignments.map(a => (String(a.teacherId) === targetStrId ? { ...a, teacherId: undefined } : a)),
      invigilationAssignments: newInvigAssignments,
      activityLogs
    });
  };

  const handleBulkDeleteTeachers = async (ids: (number | string)[]) => {
    if (!ids || ids.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleBulkDeleteTeachers):", schoolId);
    const idStrings = ids.map(id => String(id));
    const idSet = new Set(idStrings);
    const count = ids.length;

    const newTeachers = data.teachers.filter(t => !idSet.has(String(t.id)));

    try {
      await supabase.from('teachers').delete().in('id', ids).eq('school_id', schoolId);
    } catch (e) {
      console.warn("Error bulk deleting teachers in Supabase:", e);
    }

    const newInvigAssignments = { ...data.invigilationAssignments };
    Object.keys(newInvigAssignments).forEach(key => {
      if (idSet.has(String(newInvigAssignments[key]))) {
        delete newInvigAssignments[key];
      }
    });

    const activityLogs = logActivity(
      'TEACHER_DELETED',
      'teachers',
      'Multiple Staff Members Removed',
      `Bulk deleted ${count} staff members from faculty list`
    );

    updateRemoteData({
      teachers: newTeachers,
      selectedInvigilators: data.selectedInvigilators.filter(tid => !idSet.has(String(tid))),
      timetableAssignments: data.timetableAssignments.map(a => (a.teacherId && idSet.has(String(a.teacherId)) ? { ...a, teacherId: undefined } : a)),
      invigilationAssignments: newInvigAssignments,
      activityLogs
    });
  };

  const handleSaveEvaluation = (evaluation: TeacherEvaluation) => {
    const current = data.teacherEvaluations || [];
    const updated = [evaluation, ...current.filter(e => e.id !== evaluation.id)];
    const activityLogs = logActivity(
      'TEACHER_UPDATED',
      'teachers',
      'Teacher Evaluation Recorded',
      `Academic lesson evaluation completed for ${evaluation.teacherName}`
    );
    updateRemoteData({ teacherEvaluations: updated, activityLogs });
  };

  const handleDeleteEvaluation = (id: string) => {
    const current = data.teacherEvaluations || [];
    const updated = current.filter(e => e.id !== id);
    const activityLogs = logActivity(
      'TEACHER_UPDATED',
      'teachers',
      'Teacher Evaluation Removed',
      `Removed evaluation record #${id}`
    );
    updateRemoteData({ teacherEvaluations: updated, activityLogs });
  };

  const handleAddExam = (exam: Exam, session: InvigilationSession) => {
    const activityLogs = logActivity(
      'EXAM_ADDED',
      'exams',
      'Examination Scheduled',
      `Scheduled ${exam.name} for ${exam.className} on ${exam.date}`
    );
    // Auto-create USAL for each subject of registered exam
    const newUsals = generateUsalRecordsForExam(exam, data.students, data.teachers, data.usalRecords || []);
    const updatedUsals = [...(data.usalRecords || []), ...newUsals];

    updateRemoteData({
      exams: [...data.exams, exam],
      sessions: [...data.sessions, session],
      usalRecords: updatedUsals,
      activityLogs
    });
  };

  const handleSaveUsalRecord = (record: UsalRecord) => {
    const current = data.usalRecords || [];
    const exists = current.some(r => r.id === record.id);
    const updated = exists ? current.map(r => r.id === record.id ? record : r) : [...current, record];
    const activityLogs = logActivity(
      'EXAM_UPDATED',
      'results',
      'USAL Record Saved',
      `Saved USAL marksheet for ${record.subject} (${record.className} ${record.stream})`
    );
    updateRemoteData({ usalRecords: updated, activityLogs });
  };

  const handleDeleteExam = (id: number) => {
    const target = data.exams.find(e => e.id === id);
    const activityLogs = logActivity(
      'EXAM_DELETED',
      'exams',
      'Examination Cancelled',
      `Removed exam ${target?.name || `ID #${id}`}`
    );
    updateRemoteData({
      exams: data.exams.filter(e => e.id !== id),
      activityLogs
    });
  };

  const handleUpdateExam = (exam: Exam) => {
    const activityLogs = logActivity(
      'EXAM_UPDATED',
      'exams',
      'Examination Updated',
      `Updated examination ${exam.name} status to ${exam.status || 'Active'}`
    );
    updateRemoteData({
      exams: data.exams.map(e => e.id === exam.id ? exam : e),
      activityLogs
    });
  };

  const handleUpdateExams = (updatedExams: Exam[]) => {
    const activityLogs = logActivity(
      'EXAM_UPDATED',
      'exams',
      'Examinations Settings Updated',
      `Synchronized status for ${updatedExams.length} examinations`
    );
    updateRemoteData({
      exams: updatedExams,
      activityLogs
    });
  };

  const handleAddDisciplineRecord = (record: DisciplineRecord) => {
    const current = data.disciplineRecords || [];
    const activityLogs = logActivity(
      'DISCIPLINE_RECORD_ADDED',
      'discipline',
      'Discipline Record Logged',
      `Recorded ${record.category} for ${record.studentName} (${record.regNo}): ${record.title}`
    );
    updateRemoteData({
      disciplineRecords: [record, ...current],
      activityLogs
    });
  };

  const handleUpdateDisciplineRecord = (record: DisciplineRecord) => {
    const current = data.disciplineRecords || [];
    const activityLogs = logActivity(
      'DISCIPLINE_RECORD_UPDATED',
      'discipline',
      'Discipline Record Modified',
      `Updated ${record.studentName} (${record.regNo}) conduct status to ${record.status}`
    );
    updateRemoteData({
      disciplineRecords: current.map(r => r.id === record.id ? record : r),
      activityLogs
    });
  };

  const handleDeleteDisciplineRecord = (id: string) => {
    const current = data.disciplineRecords || [];
    const target = current.find(r => r.id === id);
    const activityLogs = logActivity(
      'DISCIPLINE_RECORD_DELETED',
      'discipline',
      'Discipline Record Removed',
      `Deleted record for ${target?.studentName || id}`
    );
    updateRemoteData({
      disciplineRecords: current.filter(r => r.id !== id),
      activityLogs
    });
  };

  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure? This will overwrite your school database with defaults.")) {
      const activityLogs = logActivity(
        'SYSTEM_RESET',
        'settings',
        'Database Reset to Defaults',
        'Restored school data back to factory curriculum defaults'
      );
      updateRemoteData({
        ...DEFAULT_APP_DATA,
        activityLogs
      });
    }
  };

  const handleClearActivityLogs = () => {
    if (window.confirm("Are you sure you want to clear the audit activity log history?")) {
      const clearedLog: ActivityLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: userAccount?.id || 'admin',
        userName: userAccount?.fullName || 'Administrator',
        userEmail: userAccount?.email || '',
        userRole: userAccount?.role || 'HEADMASTER',
        action: 'SYSTEM_RESET',
        category: 'settings',
        title: 'Audit Trail Purged',
        description: `Audit log was cleared and reset by ${userAccount?.fullName || 'Administrator'}`
      };
      updateRemoteData({ activityLogs: [clearedLog] });
    }
  };

  const handleExportJsonBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `haby_edu_pro_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const activityLogs = logActivity(
            'BACKUP_RESTORE',
            'settings',
            'Database Restored from File',
            'Imported full school database from external JSON backup'
          );
          const restored = { ...parsed, activityLogs };
          setData(restored);
          updateRemoteData(restored);
          alert('School database restored successfully from JSON backup!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to read JSON backup file: ' + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <ConfirmDeleteProvider>
      <div className="min-h-screen bg-[#edf2f7] text-slate-800 font-sans relative overflow-x-hidden flex flex-col">
        {/* Floating Ambient Bubbles with Beautiful Iridescent Colors */}
        <FloatingBubbles 
          settings={data.bubbleSettings}
          onUpdateSettings={(settings) => updateRemoteData({ bubbleSettings: settings })}
        />

      {/* Top Header & Collapsible Sidebar Navigation */}
      <Navigation
        activeView={activeView}
        schoolInfo={data.schoolInfo}
        saveStatus={saveStatus}
        onSelectView={view => setActiveView(view)}
        currentUser={userAccount}
        onLogout={async () => {
          if (window.confirm("Are you sure you want to logout?")) {
            try {
              const schoolId = userAccount?.schoolId || getCurrentSchoolId();
              if (schoolId) {
                await saveSchoolDataToSupabase(schoolId, data);
              }
            } catch (err) {
              console.warn("Pre-logout save error:", err);
            }
            logout();
          }
        }}
        onStartTour={() => setIsOnboardingOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Interactive Onboarding Tour */}
      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigate={view => setActiveView(view as any)}
      />

      {/* Main Content Workspace with Sidebar Indentation */}
      <div className={`flex-1 transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
      } p-3 sm:p-4 md:p-6 relative overflow-y-auto`}>
        {/* View Switcher */}
        <RoleGuard currentUser={userAccount} currentView={activeView} onRedirect={view => setActiveView(view as any)}>
          <main>
          {/* Super Admin Active School Banner */}
          {(userAccount?.isSuperAdmin || userAccount?.role === 'SUPER_ADMIN') && activeView !== 'multischool' && (
            <div className="mb-5 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 border border-purple-500/40 text-white rounded-2xl p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-300 tracking-widest block">Super Admin Master Mode</span>
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Unasimamia Shule ya: <strong className="text-amber-300 font-extrabold uppercase underline decoration-amber-400">{data.schoolInfo.name || 'HABY EDU SCHOOL'}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveView('multischool')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Building2 className="w-4 h-4 text-purple-200" />
                <span>← Rudi Super Admin Dashboard (Multi-School Hub)</span>
              </button>
            </div>
          )}

          {activeView === 'multischool' && (
            <SuperAdminDashboard
              currentUser={userAccount}
              currentSchoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              currentSchoolData={data}
              onSelectSchool={(selectedSchoolId, selectedSchoolName) => {
                sessionStorage.setItem('haby_school_id', selectedSchoolId);
                localStorage.setItem('currentSchoolId', selectedSchoolId);
                setData(prev => ({
                  ...prev,
                  schoolInfo: {
                    ...prev.schoolInfo,
                    name: selectedSchoolName
                  }
                }));
                setActiveView('dashboard');
                window.location.reload();
              }}
              onNavigateToView={view => setActiveView(view)}
            />
          )}

          {activeView === 'dashboard' && (
            <DashboardView
              students={data.students}
              teachers={data.teachers}
              exams={data.exams}
              sessions={data.sessions}
              timetableAssignments={data.timetableAssignments || []}
              periodSettings={data.periodSettings || []}
              streamSettings={data.streamSettings || []}
              isCloudSynced={isCloudSynced}
              isSyncing={isSyncing}
              isLoading={dataLoading}
              onForceRefreshSync={handleForceRefreshSync}
              syncToast={syncToast}
              schoolInfo={data.schoolInfo}
              onSelectView={view => setActiveView(view as any)}
              activityLogs={data.activityLogs || []}
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              currentUser={userAccount}
              supabaseStudentCount={supabaseStudentCount}
              disciplineRecords={data.disciplineRecords || []}
              teacherAssignments={data.teacherAssignments || []}
              examinationRecords={data.examinationRecords || []}
              dutyRosterData={data.dutyRosterData}
              dailyAttendance={data.dailyAttendance || {}}
            />
          )}

          {activeView === 'students' && (
            <StudentsView
              students={data.students}
              schoolInfo={data.schoolInfo}
              streamSettings={data.streamSettings || []}
              onUpdateStreamSettings={streamSettings => {
                const activityLogs = logActivity(
                  'STREAM_SETTINGS_UPDATE',
                  'settings',
                  'Classes & Streams Structure Updated',
                  'Registered / modified academic classes and streams'
                );
                updateRemoteData({ streamSettings, activityLogs });
              }}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onUpdateStudents={handleUpdateStudents}
              onDeleteStudent={handleDeleteStudent}
              onBulkDeleteStudents={handleBulkDeleteStudents}
              onBulkAddStudents={handleBulkAddStudents}
              dailyAttendance={data.dailyAttendance || {}}
              onSaveDailyAttendance={(date, rollCallRecords) => {
                const currentDaily = data.dailyAttendance || {};
                const updatedDaily = {
                  ...currentDaily,
                  [date]: rollCallRecords
                };
                updateRemoteData({ dailyAttendance: updatedDaily });
              }}
              disciplineRecords={data.disciplineRecords || []}
              onExecutePromotion={(promotedStudents, historyLogs) => {
                const existingHistory = data.promotionHistory || [];
                const updatedHistory = [...historyLogs, ...existingHistory];
                const activityLogs = logActivity(
                  'STUDENTS_BULK_UPDATE',
                  'students',
                  'Bulk Student Academic Promotion Executed',
                  `Promoted ${historyLogs.length} students to next grade levels`
                );
                updateRemoteData({
                  students: promotedStudents,
                  promotionHistory: updatedHistory,
                  activityLogs
                });
              }}
              onNavigateToDiscipline={student => setActiveView('discipline')}
              examinationRecords={data.examinationRecords || []}
            />
          )}

          {activeView === 'teachers' && (
            <TeachersView
              teachers={data.teachers}
              onAddTeacher={handleAddTeacher}
              onBulkAddTeachers={handleBulkAddTeachers}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onBulkDeleteTeachers={handleBulkDeleteTeachers}
              teacherEvaluations={data.teacherEvaluations || []}
              onSaveEvaluation={handleSaveEvaluation}
              onDeleteEvaluation={handleDeleteEvaluation}
              streamSettings={data.streamSettings || []}
              timetableAssignments={data.timetableAssignments || []}
              onUpdateTimetableAssignments={assignments => updateRemoteData({ timetableAssignments: assignments })}
              periodSettings={data.periodSettings || []}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
            />
          )}

          {activeView === 'teacherportal' && (
            <TeacherPortalView
              teachers={data.teachers}
              students={data.students}
              schoolInfo={data.schoolInfo}
              streamSettings={data.streamSettings || []}
              currentUser={userAccount}
              dailyAttendance={data.dailyAttendance || {}}
              onSaveDailyAttendance={(date, rollCallRecords) => {
                const currentDaily = data.dailyAttendance || {};
                const updatedDaily = {
                  ...currentDaily,
                  [date]: rollCallRecords
                };
                updateRemoteData({ dailyAttendance: updatedDaily as any });
              }}
              onUpdateStudent={handleUpdateStudent}
              onUpdateStudents={handleUpdateStudents}
              exams={data.exams}
              examinationRecords={data.examinationRecords || []}
              onAutoSaveExaminationRecords={examinationRecords => {
                const activityLogs = logActivity(
                  'EXAM_UPDATED',
                  'results',
                  'Auto-Saved Examination Records from Teacher Portal',
                  `Auto-saved ${examinationRecords.length} records`
                );
                updateRemoteData({ examinationRecords, activityLogs });
              }}
              onNavigateToView={view => setActiveView(view as any)}
              academicTermDates={data.academicTermDates}
            />
          )}

          {activeView === 'results' && (
            <ResultsView
              students={data.students}
              resultsStatus={data.resultsStatus}
              schoolInfo={data.schoolInfo}
              onUpdateStudent={handleUpdateStudent}
              onUpdateStudents={handleUpdateStudents}
              onToggleResultsStatus={status => updateRemoteData({ resultsStatus: status })}
              currentUser={userAccount}
              onNavigateToAttendance={() => setActiveView('attendance')}
              exams={data.exams}
              examinationRecords={data.examinationRecords || []}
              onReleaseResultsToRecords={handleReleaseResultsToExaminationRecords}
              onAutoSaveExaminationRecords={examinationRecords => {
                const activityLogs = logActivity(
                  'EXAM_UPDATED',
                  'results',
                  'Auto-Saved Examination Records',
                  `Auto-saved ${examinationRecords.length} records after result calculation`
                );
                updateRemoteData({ examinationRecords, activityLogs });
              }}
              onNavigateToExamRecords={() => setActiveView('examrecords')}
              onNavigateToSms={() => setActiveView('sms')}
              usalRecords={data.usalRecords || []}
              onSaveUsalRecord={handleSaveUsalRecord}
              onNavigateToMarkEntry={(examName, className) => {
                setActiveView('markentry');
              }}
              teachers={data.teachers}
              onUpdateExam={handleUpdateExam}
              onUpdateExams={handleUpdateExams}
              ledgerSubjectKeys={data.ledgerSubjectKeys?.[data.schoolInfo.name || 'default'] || []}
              onUpdateLedgerSubjectKeys={keys => {
                const updated = { ...(data.ledgerSubjectKeys || {}) };
                updated[data.schoolInfo.name || 'default'] = keys;
                updateRemoteData({ ledgerSubjectKeys: updated });
              }}
              communicationTemplates={data.communicationTemplates || []}
              academicTermDates={data.academicTermDates}
            />
          )}

          {activeView === 'examrecords' && (
            <ExaminationRecordsView
              students={data.students}
              examinationRecords={data.examinationRecords || []}
              promotionHistory={data.promotionHistory || []}
              transferHistory={data.transferHistory || []}
              schoolInfo={data.schoolInfo}
              onUpdateStudents={handleUpdateStudents}
              onUpdateExaminationRecords={examinationRecords => {
                const activityLogs = logActivity(
                  'EXAM_UPDATED',
                  'results',
                  'Examination Records Updated',
                  `Updated ${examinationRecords.length} student examination records`
                );
                updateRemoteData({ examinationRecords, activityLogs });
              }}
              onUpdatePromotionHistory={promotionHistory => {
                const activityLogs = logActivity(
                  'STUDENTS_BULK_UPDATE',
                  'students',
                  'Student Promotion History Updated',
                  `Logged promotion/graduation for students`
                );
                updateRemoteData({ promotionHistory, activityLogs });
              }}
              onUpdateTransferHistory={transferHistory => {
                const activityLogs = logActivity(
                  'STUDENT_UPDATED',
                  'students',
                  'Student Class/Stream Transfer Logged',
                  `Updated student transfer ledger`
                );
                updateRemoteData({ transferHistory, activityLogs });
              }}
              currentUserName={userAccount?.fullName || 'Academic Master'}
              onNavigateToSms={(examType, year) => {
                setSmsTargetExam({ examType, year });
                setActiveView('sms');
              }}
              onNavigateToNectaAnalyzer={() => setActiveView('nectaanalyzer')}
            />
          )}

          {activeView === 'nectaanalyzer' && (
            <NectaAnalyzer
              schoolId={userAccount?.schoolId || 'DEMO_SCHOOL'}
            />
          )}

          {activeView === 'sms' && (
            <SmsModule
              schoolId={userAccount?.schoolId || 'DEMO_SCHOOL'}
              schoolInfo={data.schoolInfo}
              students={data.students}
              parents={data.parents || []}
              parentStudents={data.parentStudents || []}
              initialExamType={smsTargetExam.examType || 'CSEE'}
              initialYear={smsTargetExam.year || '2026'}
              onNavigateToAnalyzer={() => setActiveView('nectaanalyzer')}
              communicationTemplates={data.communicationTemplates || []}
              academicTermDates={data.academicTermDates}
            />
          )}

          {activeView === 'schemes' && (
            <SchemeOfWorkView
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              teachers={data.teachers}
              schemesOfWork={data.schemesOfWork || []}
              academicTermDates={data.academicTermDates}
              onSaveSchemeOfWork={(scheme) => {
                const existing = data.schemesOfWork || [];
                const updated = existing.some(s => s.id === scheme.id)
                  ? existing.map(s => s.id === scheme.id ? scheme : s)
                  : [scheme, ...existing];
                updateRemoteData({ schemesOfWork: updated });
              }}
              onNavigateToLessonPlan={(_subject, _className, _topic) => {
                setActiveView('lessonplans');
              }}
            />
          )}

          {activeView === 'lessonplans' && (
            <LessonPlanView
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              teachers={data.teachers}
              savedPlans={data.lessonPlans || []}
              onSaveLessonPlan={(plan) => {
                const existing = data.lessonPlans || [];
                const updated = existing.some(p => p.id === plan.id)
                  ? existing.map(p => p.id === plan.id ? plan : p)
                  : [plan, ...existing];
                updateRemoteData({ lessonPlans: updated });
              }}
              onDeleteLessonPlan={(planId) => {
                const existing = data.lessonPlans || [];
                const updated = existing.filter(p => p.id !== planId);
                updateRemoteData({ lessonPlans: updated });
              }}
            />
          )}

          {activeView === 'attendance' && (
            <AttendanceView
              students={data.students}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              dailyAttendance={data.dailyAttendance || {}}
              examinationRecords={data.examinationRecords || []}
              onSaveDailyAttendance={(date, rollCallRecords) => {
                const currentDaily = data.dailyAttendance || {};
                const updatedDaily = {
                  ...currentDaily,
                  [date]: rollCallRecords
                };
                updateRemoteData({ dailyAttendance: updatedDaily });
              }}
              onUpdateStudent={handleUpdateStudent}
              onNavigateToResults={() => setActiveView('results')}
              onNavigateToDiscipline={student => setActiveView('discipline')}
              onNavigateToScanView={() => setActiveView('attendance-scan')}
            />
          )}

          {activeView === 'attendance-scan' && (
            <AttendanceScanView
              students={data.students}
              schoolInfo={data.schoolInfo}
              dailyAttendance={data.dailyAttendance || {}}
              examinationRecords={data.examinationRecords || []}
              onMarkAttendance={(date, studentId, status) => {
                const currentDaily = data.dailyAttendance || {};
                const updatedDaily = {
                  ...currentDaily,
                  [date]: {
                    ...(currentDaily[date] || {}),
                    [studentId]: status
                  }
                };
                updateRemoteData({ dailyAttendance: updatedDaily });
              }}
              onBack={() => {
                if (typeof window !== 'undefined' && window.location.search.includes('view=attendance-scan')) {
                  window.history.replaceState({}, '', window.location.pathname);
                }
                setActiveView('attendance');
              }}
            />
          )}

          {activeView === 'discipline' && (
            <DisciplineView
              records={data.disciplineRecords || []}
              students={data.students}
              teachers={data.teachers}
              schoolInfo={data.schoolInfo}
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              dutyRosterData={data.dutyRosterData}
              currentUser={userAccount}
              onAddRecord={handleAddDisciplineRecord}
              onUpdateRecord={handleUpdateDisciplineRecord}
              onDeleteRecord={handleDeleteDisciplineRecord}
              onUpdateDutyRoster={dutyRosterData => {
                const activityLogs = logActivity(
                  'DISCIPLINE_RECORD_UPDATED',
                  'discipline',
                  'Mfumo wa Zamu ya Walimu Umeboreshwa',
                  'Taarifa za Zamu ya Walimu zimehifadhiwa kwenye database'
                );
                updateRemoteData({ dutyRosterData, activityLogs });
              }}
              onAddMainTeacher={handleAddTeacher}
            />
          )}

          {activeView === 'environment' && (
            <EnvironmentModule
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
              students={data.students}
              streamSettings={data.streamSettings}
            />
          )}

          {activeView === 'laboratory' && (
            <LaboratoryInventoryView
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
            />
          )}

          {activeView === 'studentid' && (
            <StudentIDView
              students={data.students}
              schoolInfo={data.schoolInfo}
              dailyAttendance={data.dailyAttendance || {}}
              examinationRecords={data.examinationRecords || []}
              onOpenVerifyPortal={(regNo) => setVerifyStudentRegNo(regNo)}
            />
          )}

          {activeView === 'markentry' && (
            <MarkEntryView
              students={data.students}
              teachers={data.teachers}
              exams={data.exams}
              timetableAssignments={data.timetableAssignments || []}
              invigilationSessions={data.sessions || []}
              invigilationAssignments={data.invigilationAssignments || {}}
              periodSettings={data.periodSettings || []}
              streamSettings={data.streamSettings || []}
              usalRecords={data.usalRecords || []}
              onSaveUsalRecord={handleSaveUsalRecord}
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
              onUpdateStudents={handleUpdateStudents}
              onNavigateToExamSettings={() => setActiveView('examsettings')}
            />
          )}

          {activeView === 'dailytracker' && (
            <DailyTeachingTrackerView
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
              timetableAssignments={data.timetableAssignments || []}
              periodSettings={data.periodSettings || []}
            />
          )}

          {activeView === 'evaluationanalysis' && (
            <EvaluationAnalysisView
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
              timetableAssignments={data.timetableAssignments || []}
              teachers={data.teachers}
            />
          )}

          {activeView === 'reampapers' && (
            <ReamPaperModule
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
              students={data.students}
              streamSettings={data.streamSettings}
            />
          )}

          {activeView === 'nectaregs' && (
            <NectaRegistrationView
              schoolInfo={data.schoolInfo}
              students={data.students}
              currentUser={userAccount}
            />
          )}

          {activeView === 'remedialtimetable' && (
            <RemedialTimetableSetup
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              teachers={data.teachers}
              schoolInfo={data.schoolInfo}
              students={data.students}
              onAddActivityLog={log => {
                const activityLogs = logActivity(
                  log.action,
                  log.category,
                  log.title,
                  log.description
                );
                updateRemoteData({ activityLogs });
              }}
            />
          )}

          {activeView === 'remedialdaily' && (
            <RemedialDailyTracker
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              currentUser={userAccount}
              students={data.students}
            />
          )}

          {activeView === 'remedialanalyzer' && (
            <RemedialPaymentAnalyzer
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              schoolInfo={data.schoolInfo}
            />
          )}

          {activeView === 'exams' && (
            <ExamsView
              exams={data.exams}
              onAddExam={handleAddExam}
              onUpdateExam={handleUpdateExam}
              onUpdateExams={handleUpdateExams}
              onDeleteExam={handleDeleteExam}
              students={data.students}
              schoolInfo={data.schoolInfo}
              onNavigateToMarkEntry={(examName, className) => {
                setActiveView('markentry');
              }}
            />
          )}

          {activeView === 'examsettings' && (
            <ExamSettingsView
              exams={data.exams}
              onUpdateExam={handleUpdateExam}
              onUpdateExams={handleUpdateExams}
              onNavigateToMarkEntry={(examName, className) => {
                setActiveView('markentry');
              }}
              onNavigateToExams={() => setActiveView('exams')}
              currentUser={userAccount}
              schoolInfo={data.schoolInfo}
            />
          )}

          {activeView === 'classjournal' && (
            <TimetableContainer
              assignments={data.timetableAssignments || []}
              teachers={data.teachers || []}
              periodSettings={data.periodSettings || []}
              streamSettings={data.streamSettings || []}
              classTimetableReleased={data.classTimetableReleased || {}}
              schoolName={data.schoolInfo?.name || 'HABY EDUPRO'}
              schoolInfo={data.schoolInfo || DEFAULT_APP_DATA.schoolInfo}
              currentUser={userAccount}
              students={data.students || []}
              dayThemes={data.dayThemes || {}}
              institutionalPolicy={data.institutionalPolicy}
              subjectPeriodAllocations={data.subjectPeriodAllocations || []}
              teacherAssignments={data.teacherAssignments || []}
              journalRecords={data.journalRecords || {}}
              savedTimetableRecords={data.savedTimetableRecords || []}
              onUpdateSavedTimetableRecords={records => updateRemoteData({ savedTimetableRecords: records })}
              initialTab="journal"
              onUpdateAssignments={assignments => {
                updateRemoteData({ timetableAssignments: assignments });
              }}
              onUpdatePeriodSettings={periodSettings => {
                updateRemoteData({ periodSettings });
              }}
              onUpdateStreamSettings={streamSettings => {
                updateRemoteData({ streamSettings });
              }}
              onToggleClassRelease={cName => {
                updateRemoteData({
                  classTimetableReleased: {
                    ...data.classTimetableReleased,
                    [cName]: !data.classTimetableReleased[cName]
                  }
                });
              }}
              onUpdateDayThemes={dayThemes => updateRemoteData({ dayThemes })}
              onUpdateInstitutionalPolicy={institutionalPolicy => {
                updateRemoteData({ institutionalPolicy });
              }}
              onUpdateSubjectPeriodAllocations={subjectPeriodAllocations => {
                updateRemoteData({ subjectPeriodAllocations });
              }}
              onUpdateTeacherAssignments={teacherAssignments => {
                updateRemoteData({ teacherAssignments });
              }}
              onUpdateJournal={journalRecords => {
                updateRemoteData({ journalRecords });
              }}
            />
          )}

          {activeView === 'timetable' && (
            <TimetableContainer
              assignments={data.timetableAssignments || []}
              teachers={data.teachers || []}
              periodSettings={data.periodSettings || []}
              streamSettings={data.streamSettings || []}
              classTimetableReleased={data.classTimetableReleased || {}}
              schoolName={data.schoolInfo?.name || 'HABY EDUPRO'}
              schoolInfo={data.schoolInfo || DEFAULT_APP_DATA.schoolInfo}
              currentUser={userAccount}
              students={data.students || []}
              dayThemes={data.dayThemes || {}}
              institutionalPolicy={data.institutionalPolicy}
              subjectPeriodAllocations={data.subjectPeriodAllocations || []}
              teacherAssignments={data.teacherAssignments || []}
              journalRecords={data.journalRecords || {}}
              savedTimetableRecords={data.savedTimetableRecords || []}
              onUpdateSavedTimetableRecords={records => updateRemoteData({ savedTimetableRecords: records })}
              onUpdateAssignments={assignments => {
                const activityLogs = logActivity(
                  'TIMETABLE_UPDATE',
                  'timetable',
                  'Timetable Lesson Allocations Updated',
                  `Modified schedule assignments (${assignments.length} total lessons)`
                );
                updateRemoteData({ timetableAssignments: assignments, activityLogs });
              }}
              onUpdatePeriodSettings={periodSettings => {
                const activityLogs = logActivity(
                  'PERIOD_SETTINGS_UPDATE',
                  'timetable',
                  'Period Bell Schedule Updated',
                  `Updated school periods (${periodSettings.length} periods defined)`
                );
                updateRemoteData({ periodSettings, activityLogs });
              }}
              onUpdateStreamSettings={streamSettings => {
                const activityLogs = logActivity(
                  'STREAM_SETTINGS_UPDATE',
                  'timetable',
                  'Class Streams Structure Updated',
                  `Reconfigured academic streams and classrooms`
                );
                updateRemoteData({ streamSettings, activityLogs });
              }}
              onToggleClassRelease={cName => {
                updateRemoteData({
                  classTimetableReleased: {
                    ...data.classTimetableReleased,
                    [cName]: !data.classTimetableReleased[cName]
                  }
                });
              }}
              onUpdateDayThemes={dayThemes => updateRemoteData({ dayThemes })}
              onUpdateInstitutionalPolicy={institutionalPolicy => {
                const activityLogs = logActivity(
                  'TIMETABLE_UPDATE',
                  'timetable',
                  'Institutional Timetable Policies Updated',
                  `Saved periods per day, duration and conflict rules`
                );
                updateRemoteData({ institutionalPolicy, activityLogs });
              }}
              onUpdateSubjectPeriodAllocations={subjectPeriodAllocations => {
                const activityLogs = logActivity(
                  'TIMETABLE_UPDATE',
                  'timetable',
                  'Subject Period Allocations Updated',
                  `Configured periods per week across levels and streams`
                );
                updateRemoteData({ subjectPeriodAllocations, activityLogs });
              }}
              onUpdateTeacherAssignments={teacherAssignments => {
                const activityLogs = logActivity(
                  'TIMETABLE_UPDATE',
                  'timetable',
                  'Teacher Teaching Allocations Updated',
                  `Assigned faculty to levels, subjects, and streams`
                );
                updateRemoteData({ teacherAssignments, activityLogs });
              }}
              onUpdateJournal={journalRecords => {
                updateRemoteData({ journalRecords });
              }}
            />
          )}

          {activeView === 'invigilation' && (
            <InvigilationContainer
              sessions={data.sessions}
              teachers={data.teachers}
              supervisors={data.supervisors}
              selectedInvigilators={data.selectedInvigilators}
              invigilationAssignments={data.invigilationAssignments}
              savedInvigilationRecords={data.savedInvigilationRecords || []}
              timetableReleased={data.timetableReleased}
              schoolInfo={data.schoolInfo}
              dayThemes={data.dayThemes}
              onUpdateSessions={sessions => updateRemoteData({ sessions })}
              onUpdateSupervisors={supervisors => updateRemoteData({ supervisors })}
              onUpdateSelectedInvigilators={selectedInvigilators => updateRemoteData({ selectedInvigilators })}
              onUpdateInvigilationAssignments={invigilationAssignments => {
                const activityLogs = logActivity(
                  'INVIGILATION_UPDATE',
                  'invigilation',
                  'Invigilation Duties Updated',
                  'Assigned exam room invigilators'
                );
                updateRemoteData({ invigilationAssignments, activityLogs });
              }}
              onUpdateSavedInvigilationRecords={savedInvigilationRecords => updateRemoteData({ savedInvigilationRecords })}
              onToggleRelease={() => updateRemoteData({ timetableReleased: !data.timetableReleased })}
              onNavigateToSittingPlan={() => setActiveView('sittingplan')}
            />
          )}

          {activeView === 'sittingplan' && (
            <SittingPlan
              schoolId={userAccount?.schoolId || 'DEMO_SCHOOL'}
              schoolInfo={data.schoolInfo}
              onBack={() => setActiveView('invigilation')}
            />
          )}

          {activeView === 'finance' && (
            <SaasFinance
              schoolId={userAccount?.schoolId || 'DEMO_SCHOOL'}
              currentUser={userAccount as any}
              students={data.students}
            />
          )}

          {activeView === 'parentportal' && (
            <ParentPortalView 
              students={data.students}
              examinationRecords={data.examinationRecords}
              schoolInfo={data.schoolInfo}
              onBackToMain={() => setActiveView('dashboard')} 
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              schoolInfo={data.schoolInfo}
              onSaveSchoolInfo={schoolInfo => {
                const activityLogs = logActivity(
                  'SCHOOL_INFO_UPDATE',
                  'settings',
                  'School Identity Updated',
                  `Saved school metadata for ${schoolInfo.name}`
                );
                updateRemoteData({ schoolInfo, activityLogs });
              }}
              onResetToDefaults={handleResetToDefaults}
              periodSettings={data.periodSettings}
              onUpdatePeriodSettings={periodSettings => {
                const activityLogs = logActivity(
                  'PERIOD_SETTINGS_UPDATE',
                  'timetable',
                  'Period Settings Saved',
                  `Updated period duration and timings (${periodSettings.length} periods)`
                );
                updateRemoteData({ periodSettings, activityLogs });
              }}
              streamSettings={data.streamSettings || []}
              onUpdateStreamSettings={streamSettings => {
                const activityLogs = logActivity(
                  'STREAM_SETTINGS_UPDATE',
                  'settings',
                  'Classes & Streams Structure Updated',
                  'Reconfigured school classes and stream settings'
                );
                updateRemoteData({ streamSettings, activityLogs });
              }}
              assignments={data.timetableAssignments}
              onUpdateAssignments={assignments => {
                const activityLogs = logActivity(
                  'TIMETABLE_UPDATE',
                  'timetable',
                  'Timetable Assignments Modified',
                  `Saved timetable configuration with ${assignments.length} assigned periods`
                );
                updateRemoteData({ timetableAssignments: assignments, activityLogs });
              }}
              dayThemes={data.dayThemes}
              teachers={data.teachers}
              onExportJson={handleExportJsonBackup}
              onImportJson={handleImportJsonBackup}
              users={users}
              onUpdateUsers={handleUpdateUsers}
              currentUser={userAccount}
              students={data.students}
              activityLogs={data.activityLogs || []}
              onClearActivityLogs={handleClearActivityLogs}
              academicTermDates={data.academicTermDates}
              onUpdateAcademicTermDates={academicTermDates => {
                const activityLogs = logActivity(
                  'SCHOOL_INFO_UPDATE',
                  'settings',
                  'Academic Calendar Updated',
                  'Modified school term opening and closing dates'
                );
                updateRemoteData({ academicTermDates, activityLogs });
              }}
              communicationTemplates={data.communicationTemplates || []}
              onUpdateCommunicationTemplates={templates => {
                const activityLogs = logActivity(
                  'SCHOOL_INFO_UPDATE',
                  'settings',
                  'Communication Templates Updated',
                  'Modified SMS and WhatsApp message templates'
                );
                updateRemoteData({ communicationTemplates: templates, activityLogs });
              }}
              calendarEvents={data.calendarEvents || []}
              onUpdateCalendarEvents={events => {
                updateRemoteData({ calendarEvents: events });
              }}
            />
          )}
        </main>
        </RoleGuard>
      </div>
    </div>
  </ConfirmDeleteProvider>
);
}
