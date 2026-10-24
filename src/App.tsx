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
import { TeacherAttendanceView } from './components/Attendance/TeacherAttendanceView';
import { BiometricReportView } from './components/Attendance/BiometricReportView';
import { StaffPayrollManagement } from './components/Payroll/StaffPayrollManagement';
import { MarkEntryView } from './components/MarkEntryView';
import { StudentIDView } from './components/StudentIDView';
import { SubscriptionData, getSchoolSubscription, initializeTrial, isSubscriptionValid } from './utils/SubscriptionService';
import { SubscriptionModal } from './components/common/SubscriptionModal';
import { DisciplineView } from './components/DisciplineView';
import { OfficialLettersView } from './components/OfficialLettersView';
import { EnvironmentModule } from './components/Environment/EnvironmentModule';
import { LaboratoryInventoryView } from './components/Laboratory/LaboratoryInventoryView';
import { LessonPlanView } from './components/LessonPlan/LessonPlanView';
import { SchemeOfWorkView } from './components/SchemeOfWork/SchemeOfWorkView';
import { TeacherPortalView } from './components/Teachers/TeacherPortalView';
import { InvigilationCalendarView } from './components/Invigilation/InvigilationCalendarView';
import { FloatingBubbles } from './components/FloatingBubbles';
import { AuthScreen } from './components/auth/AuthScreen';
import { ParentPortalView } from './components/ParentPortalView';
import { DailyTeachingTrackerView } from './components/DailyTeachingTrackerView';
import { EvaluationAnalysisView } from './components/EvaluationAnalysisView';
import { ReamPaperModule } from './components/Academic/ReamPaperModule';
import { NectaRegistrationView } from './components/Academic/NectaRegistrationView';
import { PastPaperCenter } from './components/Academic/PastPaperCenter';
import { StudentProgressTrackerView } from './components/Academic/StudentProgressTrackerView';
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
  getUsers,
  getPastPapers
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
import {
  loadAutoBackupConfig,
  saveAutoBackupConfig,
  triggerJsonDownloadBackup,
  triggerSupabaseStorageSnapshot,
  getLocalDateKey,
  getLocalTimeHHMM,
} from './utils/backupService';

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
  const { userAccount, loading: authLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [data, setData] = useState<AppData>(() => {
    const schoolId = typeof window !== 'undefined' 
      ? (localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID)
      : DEFAULT_PRIMARY_SCHOOL_ID;

    if (typeof window !== 'undefined') {
      try {
        const local =
          localStorage.getItem(`haby_school_data_snapshot_${schoolId}`) ||
          localStorage.getItem(`haby_school_data_${schoolId}`) ||
          localStorage.getItem(`haby_school_data_snapshot_${DEFAULT_PRIMARY_SCHOOL_ID}`) ||
          localStorage.getItem(`haby_school_data_${DEFAULT_PRIMARY_SCHOOL_ID}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return { 
              ...DEFAULT_APP_DATA, 
              ...parsed,
              schoolInfo: { ...DEFAULT_APP_DATA.schoolInfo, ...(parsed.schoolInfo || {}) },
              communicationTemplates: parsed.communicationTemplates || DEFAULT_APP_DATA.communicationTemplates || []
            };
          }
        }
      } catch (e) { console.error("App init: Error loading localStorage:", e); }
    }
    
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

  const dataRef = useRef<AppData>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

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
  const snapshotTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const localCacheTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasLoadedRemoteRef = useRef<boolean>(false);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const lastLocalMutationRef = useRef<number>(0);
  const [supabaseStudentCount, setSupabaseStudentCount] = useState<number | null>(null);

  const syncLocalStorageKeys = useCallback((schId: string, stateObj: AppData) => {
    if (!schId || !stateObj) return;
    try {
      const { usalRecords: _omitUsal, ...lightState } = stateObj as any;
      // Strip oversized base64 photos from localStorage copy to prevent QuotaExceededError from blocking saves
      if (Array.isArray(lightState.students)) {
        lightState.students = lightState.students.map((s: any) => {
          if (s && typeof s.passportPhoto === 'string' && s.passportPhoto.length > 5000) {
            const { passportPhoto: _p, ...rest } = s;
            return rest;
          }
          return s;
        });
      }
      const serialized = JSON.stringify(lightState);
      localStorage.setItem(`haby_school_data_${schId}`, serialized);
    } catch (e) {}
    try {
      if (Array.isArray(stateObj.timetableAssignments)) {
        localStorage.setItem(`haby_timetable_assignments_${schId}`, JSON.stringify(stateObj.timetableAssignments));
      }
      if (Array.isArray(stateObj.periodSettings)) {
        localStorage.setItem(`haby_period_settings_${schId}`, JSON.stringify(stateObj.periodSettings));
      }
      if (Array.isArray(stateObj.streamSettings)) {
        localStorage.setItem(`haby_stream_settings_${schId}`, JSON.stringify(stateObj.streamSettings));
      }
      if (Array.isArray(stateObj.teacherAssignments)) {
        localStorage.setItem(`haby_teacher_assignments_${schId}`, JSON.stringify(stateObj.teacherAssignments));
      }
    } catch (e) {}
  }, []);

  // Helper function to persist school state snapshot to Cloud SQL & Firestore
  const saveSchoolDataToSupabase = async (schId: string, snapData: any, isUnload = false) => {
    if (!schId || !snapData) return;
    try {
      const { usalRecords: _omitUsal, ...restSnap } = snapData;
      const nowIso = new Date().toISOString();
      const payload = {
        ...restSnap,
        _explicitDelete: true,
        _fullSnapshot: true,
        _isUnload: isUnload,
        id: schId,
        school_id: schId,
        schoolInfo: snapData.schoolInfo || {},
        timetableAssignments: snapData.timetableAssignments || [],
        periodSettings: snapData.periodSettings || [],
        streamSettings: snapData.streamSettings || [],
        institutionalPolicy: snapData.institutionalPolicy || {},
        sessions: snapData.sessions || [],
        supervisors: snapData.supervisors || [],
        selectedInvigilators: snapData.selectedInvigilators || [],
        invigilationAssignments: snapData.invigilationAssignments || {},
        dailyAttendance: snapData.dailyAttendance || {},
        periodAttendance: snapData.periodAttendance || [],
        teachingLogs: snapData.teachingLogs || [],
        journalRecords: snapData.journalRecords || {},
        schemesOfWork: snapData.schemesOfWork || [],
        lessonPlans: snapData.lessonPlans || [],
        teacherEvaluations: snapData.teacherEvaluations || [],
        savedTimetableRecords: snapData.savedTimetableRecords || [],
        savedInvigilationRecords: snapData.savedInvigilationRecords || [],
        gradeCutoffs: snapData.gradeCutoffs || {},
        ledgerSubjectKeys: snapData.ledgerSubjectKeys || {},
        subjectPeriodAllocations: snapData.subjectPeriodAllocations || [],
        teacherAssignments: snapData.teacherAssignments || [],
        subjectPaperConfigs: snapData.subjectPaperConfigs || {},
        bubbleSettings: snapData.bubbleSettings || {},
        students: snapData.students || [],
        teachers: snapData.teachers || [],
        exams: snapData.exams || [],
        examinationRecords: snapData.examinationRecords || [],
        disciplineRecords: snapData.disciplineRecords || [],
        dutyRosterData: snapData.dutyRosterData || {},
        parents: snapData.parents || [],
        academicTermDates: snapData.academicTermDates || {},
        communicationTemplates: snapData.communicationTemplates || [],
        calendarEvents: snapData.calendarEvents || [],
        teacherAttendance: snapData.teacherAttendance || {},
        staffPayroll: snapData.staffPayroll || {},
        updatedAtMs: Date.now(),
        updated_at: nowIso
      };

      // Persist snapshot to Cloud SQL school_data table and Firestore real-time document
      await saveSchoolData(schId, payload);
      hasUnsavedChangesRef.current = false;
    } catch (err) {
      console.warn("Error saving school snapshot:", err);
    }
  };

  // Flush any pending snapshot save ONLY if remote data has loaded AND user actually made local changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasLoadedRemoteRef.current || !hasUnsavedChangesRef.current) return;
      const schId = userAccount?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID;
      if (schId && dataRef.current) {
        saveSchoolDataToSupabase(schId, dataRef.current, true);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userAccount?.schoolId]);

  // Sync with Cloud SQL & Real-Time Single Source of Truth
  useEffect(() => {
    if (!userAccount?.schoolId || userAccount.schoolId === 'PENDING') {
      setDataLoading(false);
      return;
    }

    const schoolId = userAccount.schoolId;
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
          const nextBoot: AppData = {
            ...prev,
            ...parsed,
            students: parsedStudents.length > 0 ? parsedStudents : prev.students,
            teachers: parsedTeachers.length > 0 ? parsedTeachers : prev.teachers,
            timetableAssignments: localTimetable ? JSON.parse(localTimetable) : (parsed.timetableAssignments || prev.timetableAssignments || []),
            periodSettings: localPeriods ? JSON.parse(localPeriods) : (parsed.periodSettings || prev.periodSettings || []),
            streamSettings: localStreams ? JSON.parse(localStreams) : (parsed.streamSettings || prev.streamSettings || []),
            teacherAssignments: localTeacherAssignments ? JSON.parse(localTeacherAssignments) : (parsed.teacherAssignments || prev.teacherAssignments || [])
          };
          dataRef.current = nextBoot;
          return nextBoot;
        });
      }
    } catch (e) {
      console.warn("Immediate localStorage boot load error:", e);
    }

    getCachedData(schoolKey).then(cached => {
      if (hasLoadedRemoteRef.current || Date.now() - lastLocalMutationRef.current < 10000) return;
      if (cached && typeof cached === 'object') {
        setData(prev => {
          const cachedStudents = Array.isArray(cached.students) ? cached.students : [];
          const cachedTeachers = Array.isArray(cached.teachers) ? cached.teachers : [];
          const nextCached: AppData = {
            ...prev,
            ...cached,
            students: cachedStudents.length > 0 ? cachedStudents : prev.students,
            teachers: cachedTeachers.length > 0 ? cachedTeachers : prev.teachers,
            timetableAssignments: Array.isArray(cached.timetableAssignments) ? cached.timetableAssignments : prev.timetableAssignments,
            periodSettings: cached.periodSettings && cached.periodSettings.length > 0 ? cached.periodSettings : prev.periodSettings,
            streamSettings: cached.streamSettings && cached.streamSettings.length > 0 ? cached.streamSettings : prev.streamSettings,
            teacherAssignments: Array.isArray(cached.teacherAssignments) ? cached.teacherAssignments : prev.teacherAssignments
          };
          dataRef.current = nextCached;
          return nextCached;
        });
      }
    }).catch(e => console.warn("Initial IDB cache load error:", e));

    // 0. Primary Database Load: Fast Unified Snapshot Load (with Relational Fallback only if needed)
    const loadFromDatabase = async (_isInitialBoot = false) => {
      const safetyTimer = setTimeout(() => {
        setDataLoading(false);
      }, 2500);

      try {
        // Fetch unified school_data snapshot first (fast ~20ms from Cloud SQL)
        const supabaseDataSnapshot = await getSchoolData(schoolId).catch(() => null);
        const rawSchoolData = (supabaseDataSnapshot || {}) as Record<string, any>;
        const hasValidSnapshot = Boolean(rawSchoolData && (rawSchoolData.schoolId || rawSchoolData.school_id || rawSchoolData.id));

        const hasSnapStudents = Array.isArray(rawSchoolData.students) && rawSchoolData.students.length > 0;
        const hasSnapTeachers = Array.isArray(rawSchoolData.teachers) && rawSchoolData.teachers.length > 0;
        const hasSnapExams = Array.isArray(rawSchoolData.exams);

        // Only query relational tables if school_data snapshot doesn't already contain them
        const [studRes, teachRes, examRes] = await Promise.all([
          !hasSnapStudents ? getStudents(schoolId).then(data => ({ data })).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
          !hasSnapTeachers ? getTeachers(schoolId).then(data => ({ data })).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
          !hasSnapExams ? getExams(schoolId).then(data => ({ data })).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        ]);

        const supaStudents = (studRes?.data || []).map((s: any, idx: number) => fromSupabaseStudent(s, idx));
        const supaTeachers = (teachRes?.data || []).map((t: any, idx: number) => fromSupabaseTeacher(t, idx));
        const supaExams = (examRes?.data || []).map((e: any, idx: number) => fromSupabaseExam(e, idx));

        // Fetch users asynchronously without blocking main data render
        getUsers(schoolId).then(supaUsers => {
          if (Array.isArray(supaUsers) && supaUsers.length > 0) {
            setUsers(supaUsers as UserAccount[]);
          }
        }).catch(() => {});

        // Ignore stale load if user just performed a local edit/deletion while request was in flight
        if (Date.now() - lastLocalMutationRef.current < 4000) {
          return;
        }

        const remoteData = { ...rawSchoolData } as Partial<AppData>;
        hasLoadedRemoteRef.current = true;

        setData(prev => {
          const snapStudents = Array.isArray(rawSchoolData.students) ? rawSchoolData.students : [];
          let resolvedStudents = prev.students;
          if (snapStudents.length > 0) {
            resolvedStudents = snapStudents;
          } else if (supaStudents.length > 0) {
            resolvedStudents = supaStudents;
          }

          const snapTeachers = Array.isArray(rawSchoolData.teachers) ? rawSchoolData.teachers : [];
          let resolvedTeachers = prev.teachers;
          if (snapTeachers.length > 0) {
            resolvedTeachers = snapTeachers;
          } else if (supaTeachers.length > 0) {
            resolvedTeachers = supaTeachers;
          }

          let resolvedExams = prev.exams;
          if (Array.isArray(rawSchoolData.exams) && (rawSchoolData.exams.length > 0 || hasValidSnapshot)) {
            resolvedExams = rawSchoolData.exams;
          } else if (supaExams.length > 0) {
            resolvedExams = supaExams;
          }

          const resolvedSchoolInfo =
            (rawSchoolData.schoolInfo && Object.keys(rawSchoolData.schoolInfo).length > 0)
              ? rawSchoolData.schoolInfo
              : (rawSchoolData.school_info && Object.keys(rawSchoolData.school_info).length > 0)
                ? rawSchoolData.school_info
                : prev.schoolInfo;

          const resolvedStreamSettings =
            Array.isArray(rawSchoolData.streamSettings) && (rawSchoolData.streamSettings.length > 0 || hasValidSnapshot)
              ? rawSchoolData.streamSettings
              : Array.isArray(rawSchoolData.stream_settings) && (rawSchoolData.stream_settings.length > 0 || hasValidSnapshot)
                ? rawSchoolData.stream_settings
                : (prev.streamSettings || []);

          const resolvedPeriods =
            Array.isArray(rawSchoolData.periodSettings) && (rawSchoolData.periodSettings.length > 0 || hasValidSnapshot)
              ? rawSchoolData.periodSettings
              : Array.isArray(rawSchoolData.period_settings) && (rawSchoolData.period_settings.length > 0 || hasValidSnapshot)
                ? rawSchoolData.period_settings
                : (prev.periodSettings || []);

          const resolvedTimetableAssignments =
            Array.isArray(rawSchoolData.timetableAssignments) && (rawSchoolData.timetableAssignments.length > 0 || hasValidSnapshot)
              ? rawSchoolData.timetableAssignments
              : Array.isArray(rawSchoolData.timetable_assignments) && (rawSchoolData.timetable_assignments.length > 0 || hasValidSnapshot)
                ? rawSchoolData.timetable_assignments
                : (prev.timetableAssignments || []);

          const resolvedSessions =
            Array.isArray(rawSchoolData.sessions) && (rawSchoolData.sessions.length > 0 || hasValidSnapshot)
              ? rawSchoolData.sessions
              : (prev.sessions || []);

          const resolvedSupervisors =
            Array.isArray(rawSchoolData.supervisors) && (rawSchoolData.supervisors.length > 0 || hasValidSnapshot)
              ? rawSchoolData.supervisors
              : (prev.supervisors || []);

          const resolvedSelectedInvigilators =
            Array.isArray(rawSchoolData.selectedInvigilators) && (rawSchoolData.selectedInvigilators.length > 0 || hasValidSnapshot)
              ? rawSchoolData.selectedInvigilators
              : Array.isArray(rawSchoolData.selected_invigilators) && (rawSchoolData.selected_invigilators.length > 0 || hasValidSnapshot)
                ? rawSchoolData.selected_invigilators
                : (prev.selectedInvigilators || []);

          const resolvedInvigilationAssignments =
            rawSchoolData.invigilationAssignments && typeof rawSchoolData.invigilationAssignments === 'object'
              ? rawSchoolData.invigilationAssignments
              : rawSchoolData.invigilation_assignments && typeof rawSchoolData.invigilation_assignments === 'object'
                ? rawSchoolData.invigilation_assignments
                : (prev.invigilationAssignments || {});

          const resolvedSavedTimetableRecords =
            Array.isArray(rawSchoolData.savedTimetableRecords)
              ? rawSchoolData.savedTimetableRecords
              : Array.isArray(rawSchoolData.saved_timetable_records)
                ? rawSchoolData.saved_timetable_records
                : (prev.savedTimetableRecords || []);

          const resolvedSavedInvigilationRecords =
            Array.isArray(rawSchoolData.savedInvigilationRecords)
              ? rawSchoolData.savedInvigilationRecords
              : Array.isArray(rawSchoolData.saved_invigilation_records)
                ? rawSchoolData.saved_invigilation_records
                : (prev.savedInvigilationRecords || []);

          const resolvedSubjectPeriodAllocations =
            Array.isArray(rawSchoolData.subjectPeriodAllocations) && (rawSchoolData.subjectPeriodAllocations.length > 0 || hasValidSnapshot)
              ? rawSchoolData.subjectPeriodAllocations
              : Array.isArray(rawSchoolData.subject_period_allocations) && (rawSchoolData.subject_period_allocations.length > 0 || hasValidSnapshot)
                ? rawSchoolData.subject_period_allocations
                : (prev.subjectPeriodAllocations || []);

          const resolvedTeacherAssignments =
            Array.isArray(rawSchoolData.teacherAssignments) && (rawSchoolData.teacherAssignments.length > 0 || hasValidSnapshot)
              ? rawSchoolData.teacherAssignments
              : Array.isArray(rawSchoolData.teacher_assignments) && (rawSchoolData.teacher_assignments.length > 0 || hasValidSnapshot)
                ? rawSchoolData.teacher_assignments
                : (prev.teacherAssignments || []);

          const resolvedInstitutionalPolicy =
            rawSchoolData.institutionalPolicy || rawSchoolData.institutional_policy || prev.institutionalPolicy || {};

          const resolvedJournalRecords =
            rawSchoolData.journalRecords || rawSchoolData.journal_records || prev.journalRecords || {};

          const resolvedDailyAttendance =
            rawSchoolData.dailyAttendance || rawSchoolData.daily_attendance || prev.dailyAttendance || {};

          const resolvedDisciplineRecords =
            Array.isArray(rawSchoolData.disciplineRecords) && (rawSchoolData.disciplineRecords.length > 0 || hasValidSnapshot)
              ? rawSchoolData.disciplineRecords
              : Array.isArray(rawSchoolData.discipline_records) && (rawSchoolData.discipline_records.length > 0 || hasValidSnapshot)
                ? rawSchoolData.discipline_records
                : (prev.disciplineRecords || []);

          const resolvedDutyRosterData =
            (rawSchoolData.dutyRosterData && typeof rawSchoolData.dutyRosterData === 'object' && Object.keys(rawSchoolData.dutyRosterData).length > 0)
              ? rawSchoolData.dutyRosterData
              : (rawSchoolData.duty_roster_data && typeof rawSchoolData.duty_roster_data === 'object' && Object.keys(rawSchoolData.duty_roster_data).length > 0)
                ? rawSchoolData.duty_roster_data
                : prev.dutyRosterData;

          const resolvedSchemesOfWork =
            Array.isArray(rawSchoolData.schemesOfWork)
              ? rawSchoolData.schemesOfWork
              : Array.isArray(rawSchoolData.schemes_of_work)
                ? rawSchoolData.schemes_of_work
                : (prev.schemesOfWork || []);

          const resolvedLessonPlans =
            Array.isArray(rawSchoolData.lessonPlans)
              ? rawSchoolData.lessonPlans
              : Array.isArray(rawSchoolData.lesson_plans)
                ? rawSchoolData.lesson_plans
                : (prev.lessonPlans || []);

          const resolvedTeacherEvaluations =
            Array.isArray(rawSchoolData.teacherEvaluations)
              ? rawSchoolData.teacherEvaluations
              : Array.isArray(rawSchoolData.teacher_evaluations)
                ? rawSchoolData.teacher_evaluations
                : (prev.teacherEvaluations || []);

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
            schemesOfWork: resolvedSchemesOfWork,
            lessonPlans: resolvedLessonPlans,
            teacherEvaluations: resolvedTeacherEvaluations,
            parents: remoteData.parents || prev.parents,
            examinationRecords: Array.isArray(rawSchoolData.examinationRecords)
              ? rawSchoolData.examinationRecords
              : Array.isArray(rawSchoolData.examination_records)
              ? rawSchoolData.examination_records
              : prev.examinationRecords,
          };

          dataRef.current = updatedState;
          if (localCacheTimerRef.current) clearTimeout(localCacheTimerRef.current);
          localCacheTimerRef.current = setTimeout(() => {
            syncLocalStorageKeys(schoolId, updatedState);
            setCachedData(schoolKey, updatedState).catch(() => {});
          }, 100);
          return updatedState;
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
    loadFromDatabase(true);

    // Real-time subscription to school_data in Firestore so Computer & Phone stay 100% in sync live
    // without resurrecting deleted students, teachers, periods, or exams
    const unsubSchoolData = subscribeSchoolData(schoolId, (firestoreSnap) => {
      if (!firestoreSnap || typeof firestoreSnap !== 'object') return;
      // Ignore echo of our own recent save or older snapshots
      if (Date.now() - lastLocalMutationRef.current < 4500) return;
      if (typeof firestoreSnap.updatedAtMs === 'number' && firestoreSnap.updatedAtMs <= lastLocalMutationRef.current) return;
      hasLoadedRemoteRef.current = true;

      setData(prev => {
        // Guard against accidental 3-student demo seed while allowing intentional single/bulk deletions
        let nextStudents = prev.students;
        if (Array.isArray(firestoreSnap.students)) {
          const isDemoWipe = prev.students.length > 15 && firestoreSnap.students.length <= 15 && firestoreSnap.students.length > 0;
          if (!isDemoWipe && firestoreSnap.students.length > 0) {
            nextStudents = firestoreSnap.students;
          }
        }

        let nextTeachers = prev.teachers;
        if (Array.isArray(firestoreSnap.teachers)) {
          const isDemoTeacherWipe = prev.teachers.length > 10 && firestoreSnap.teachers.length <= 5 && firestoreSnap.teachers.length > 0;
          if (!isDemoTeacherWipe && firestoreSnap.teachers.length > 0) {
            nextTeachers = firestoreSnap.teachers;
          }
        }

        const nextTimetable = Array.isArray(firestoreSnap.timetableAssignments)
          ? firestoreSnap.timetableAssignments
          : prev.timetableAssignments;
        const nextPeriods = Array.isArray(firestoreSnap.periodSettings) && firestoreSnap.periodSettings.length > 0
          ? firestoreSnap.periodSettings
          : prev.periodSettings;
        const nextStreams = Array.isArray(firestoreSnap.streamSettings) && firestoreSnap.streamSettings.length > 0
          ? firestoreSnap.streamSettings
          : prev.streamSettings;
        const nextAllocations = Array.isArray(firestoreSnap.subjectPeriodAllocations)
          ? firestoreSnap.subjectPeriodAllocations
          : prev.subjectPeriodAllocations;
        const nextTeacherAssigns = Array.isArray(firestoreSnap.teacherAssignments)
          ? firestoreSnap.teacherAssignments
          : prev.teacherAssignments;
        const nextSavedTimetables = Array.isArray(firestoreSnap.savedTimetableRecords)
          ? firestoreSnap.savedTimetableRecords
          : prev.savedTimetableRecords;
        const nextSavedInvigilation = Array.isArray(firestoreSnap.savedInvigilationRecords)
          ? firestoreSnap.savedInvigilationRecords
          : prev.savedInvigilationRecords;
        const nextExams = Array.isArray(firestoreSnap.exams)
          ? firestoreSnap.exams
          : prev.exams;
        const nextExamRecords = Array.isArray(firestoreSnap.examinationRecords)
          ? firestoreSnap.examinationRecords
          : prev.examinationRecords;
        const nextSchoolInfo = firestoreSnap.schoolInfo && Object.keys(firestoreSnap.schoolInfo).length > 0
          ? firestoreSnap.schoolInfo
          : prev.schoolInfo;

        const nextState: AppData = {
          ...prev,
          schoolInfo: nextSchoolInfo,
          students: nextStudents,
          teachers: nextTeachers,
          timetableAssignments: nextTimetable,
          periodSettings: nextPeriods,
          streamSettings: nextStreams,
          subjectPeriodAllocations: nextAllocations,
          teacherAssignments: nextTeacherAssigns,
          savedTimetableRecords: nextSavedTimetables,
          savedInvigilationRecords: nextSavedInvigilation,
          exams: nextExams,
          examinationRecords: nextExamRecords,
          institutionalPolicy: firestoreSnap.institutionalPolicy || prev.institutionalPolicy,
          journalRecords: firestoreSnap.journalRecords || prev.journalRecords,
          dailyAttendance: firestoreSnap.dailyAttendance || prev.dailyAttendance,
          sessions: Array.isArray(firestoreSnap.sessions) ? firestoreSnap.sessions : prev.sessions,
          supervisors: Array.isArray(firestoreSnap.supervisors) ? firestoreSnap.supervisors : prev.supervisors,
          selectedInvigilators: Array.isArray(firestoreSnap.selectedInvigilators) ? firestoreSnap.selectedInvigilators : prev.selectedInvigilators,
          invigilationAssignments: firestoreSnap.invigilationAssignments || prev.invigilationAssignments,
          schemesOfWork: Array.isArray(firestoreSnap.schemesOfWork) ? firestoreSnap.schemesOfWork : prev.schemesOfWork,
          lessonPlans: Array.isArray(firestoreSnap.lessonPlans) ? firestoreSnap.lessonPlans : prev.lessonPlans,
          teacherEvaluations: Array.isArray(firestoreSnap.teacherEvaluations) ? firestoreSnap.teacherEvaluations : prev.teacherEvaluations,
          disciplineRecords: Array.isArray(firestoreSnap.disciplineRecords) ? firestoreSnap.disciplineRecords : prev.disciplineRecords,
          dutyRosterData: firestoreSnap.dutyRosterData || prev.dutyRosterData,
        };

        dataRef.current = nextState;
        if (localCacheTimerRef.current) clearTimeout(localCacheTimerRef.current);
        localCacheTimerRef.current = setTimeout(() => {
          syncLocalStorageKeys(schoolId, nextState);
          setCachedData(schoolKey, nextState).catch(() => {});
        }, 120);
        return nextState;
      });
      setIsCloudSynced(true);
    });

    // Re-sync when user switches back to tab / unlocks phone
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLocalMutationRef.current > 8000 && !hasUnsavedChangesRef.current) {
        loadFromDatabase(false);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      unsubSchoolData();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [userAccount, syncLocalStorageKeys]);

  const handleForceRefreshSync = async () => {
    if (!userAccount?.schoolId) return;
    setIsSyncing(true);

    const schoolId = userAccount.schoolId;
    try {
      const schoolDataSnap = await getSchoolData(schoolId).catch(() => null);
      const remoteData = (schoolDataSnap || {}) as Partial<AppData>;
      setData(prev => {
        const next = { ...prev, ...remoteData };
        dataRef.current = next;
        return next;
      });
      setSyncToast(`Cloud Sync Active: Successfully synchronized data from Database.`);
      setTimeout(() => setSyncToast(null), 5000);
      setIsCloudSynced(true);
    } catch (err: any) {
      console.error("Force sync error:", err);
      setSyncToast("Hitilafu wakati wa kusawazisha na Database: " + (err.message || err));
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateRemoteData = useCallback(async (updates: Partial<AppData>) => {
    lastLocalMutationRef.current = Date.now();
    hasUnsavedChangesRef.current = true;
    setSaveStatus('saving');
    const schoolId = userAccount?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID;
    const schoolKey = `haby_school_data_${schoolId}`;

    const nextData: AppData = {
      ...dataRef.current,
      ...updates
    };
    dataRef.current = nextData;
    // Update React UI immediately (< 1ms) without blocking main thread
    setData(nextData);

    // 1. Defer heavy JSON.stringify / IndexedDB write off the synchronous click thread (80ms)
    if (localCacheTimerRef.current) clearTimeout(localCacheTimerRef.current);
    localCacheTimerRef.current = setTimeout(() => {
      syncLocalStorageKeys(schoolId, dataRef.current);
      setCachedData(schoolKey, dataRef.current).catch(() => {});
    }, 80);

    // 2. Coalesced Cloud SQL + Firestore Snapshot Sync (150ms)
    // Note: POST /api/db/school-data also schedules background relational table sync + row pruning automatically
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(async () => {
      try {
        await saveSchoolDataToSupabase(schoolId, dataRef.current);
        setSaveStatus('saved');
        setIsCloudSynced(true);
      } catch (e) {
        console.warn("Direct snapshot sync error:", e);
      }
    }, 150);

    // 3. Lightweight targeted background sync for timetable / logs if modified
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const tasks: Promise<any>[] = [];

      if (updates.activityLogs && Array.isArray(updates.activityLogs) && updates.activityLogs.length > 0) {
        const chunk = updates.activityLogs.slice(0, 10).map(l => toSupabaseActivityLog(l, schoolId));
        tasks.push(insertRecord('activity_logs', chunk).catch(() => {}));
      }

      if (updates.timetableAssignments && Array.isArray(updates.timetableAssignments)) {
        tasks.push(
          saveTimetableAssignments(schoolId, updates.timetableAssignments, {
            replace: true,
            periodSettings: nextData.periodSettings
          }).catch(() => {})
        );
      }

      if (tasks.length > 0) {
        await Promise.allSettled(tasks);
      }
      setSaveStatus('saved');
      setIsCloudSynced(true);
    }, 400);
  }, [userAccount, syncLocalStorageKeys]);

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

  // Auto-upgrade school name for Super Admin to 'HabyEduPro3A' ONLY after remote data has finished loading
  useEffect(() => {
    if (!hasLoadedRemoteRef.current) return;
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
  }, [userAccount, data.schoolInfo?.name, updateRemoteData]);

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

  // Automated Daily Backup Background Scheduler (Checks every 15 seconds)
  const autoBackupRunningRef = useRef<boolean>(false);
  useEffect(() => {
    const schoolId = userAccount?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID;
    if (!schoolId || schoolId === 'PENDING') return;

    const checkAndRunDailyBackup = async () => {
      if (autoBackupRunningRef.current) return;
      try {
        const cfg = await loadAutoBackupConfig(schoolId);
        if (!cfg.enabled) return;

        const now = new Date();
        const todayKey = getLocalDateKey(now);
        const currentHHMM = getLocalTimeHHMM(now);
        const targetHHMM = (cfg.scheduledTime || '17:00').slice(0, 5);

        if (currentHHMM < targetHHMM) return;

        const needsJson =
          (cfg.backupMode === 'json_download' || cfg.backupMode === 'both') &&
          cfg.lastJsonDownloadDate !== todayKey;
        const needsSupabase =
          (cfg.backupMode === 'supabase_snapshot' || cfg.backupMode === 'both') &&
          cfg.lastSupabaseSnapshotDate !== todayKey;

        if (!needsJson && !needsSupabase) return;

        autoBackupRunningRef.current = true;
        const executedParts: string[] = [];
        const configUpdates: Record<string, any> = {
          lastBackupDate: todayKey,
          lastBackupTimestamp: now.toISOString(),
          lastBackupStatus: 'success',
        };

        if (needsJson) {
          const jsonRes = triggerJsonDownloadBackup(schoolId, dataRef.current, 'scheduled');
          configUpdates.lastJsonDownloadDate = todayKey;
          executedParts.push(`JSON (${jsonRes.filename})`);
        }

        if (needsSupabase) {
          const snapRes = await triggerSupabaseStorageSnapshot(schoolId, dataRef.current, 'scheduled');
          configUpdates.lastSupabaseSnapshotDate = todayKey;
          executedParts.push(`Supabase Snapshot (${snapRes.filename})`);
        }

        configUpdates.lastBackupMessage = `Auto Daily Backup (${executedParts.join(' & ')})`;
        await saveAutoBackupConfig(schoolId, configUpdates);

        window.dispatchEvent(new CustomEvent('haby-auto-backup-completed', { detail: configUpdates }));
        setSyncToast(`Hifadhi ya Kila Siku (Auto Daily Backup) imekamilika: ${executedParts.join(' + ')}`);
        setTimeout(() => setSyncToast(null), 6000);
      } catch (err) {
        console.warn('[AutoDailyBackup] Check warning:', err);
      } finally {
        autoBackupRunningRef.current = false;
      }
    };

    const initialTimer = setTimeout(checkAndRunDailyBackup, 4000);
    const interval = setInterval(checkAndRunDailyBackup, 15000);
    const handleConfigChange = () => {
      checkAndRunDailyBackup();
    };
    window.addEventListener('haby-auto-backup-config-updated', handleConfigChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('haby-auto-backup-config-updated', handleConfigChange);
    };
  }, [userAccount?.schoolId]);

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
  // Parent Portal Bypass for login and direct /parent path
  const isParentPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/parent');
  const isParentPortalHash = isParentPath || window.location.hash === '#parentportal' || window.location.pathname === '/parent/login';
  const hasParentSession = typeof window !== 'undefined' && !!sessionStorage.getItem('haby_parent_session');

  if (isParentPortalHash || (hasParentSession && activeView === 'parentportal')) {
    return (
      <ConfirmDeleteProvider>
        <ParentPortalView
          students={data.students}
          examinationRecords={data.examinationRecords}
          schoolInfo={data.schoolInfo}
          onBackToMain={() => {
            if (typeof window !== 'undefined') {
              if (window.location.pathname.startsWith('/parent')) {
                window.location.pathname = '/';
              } else {
                window.location.hash = '';
                window.location.reload();
              }
            }
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
        <p className="text-xs text-blue-200 mt-1">Loading school system...</p>
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
          <h1 className="text-xl font-bold mb-2 text-slate-900">Account Pending Approval</h1>
          <p className="text-slate-600 mb-4 text-sm">Your account ({userAccount.email}) is pending connection to a school. Please contact your school administrator.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-[#1f4d8b] text-white rounded-xl font-bold cursor-pointer">Check Status Again</button>
        </div>
      </div>
    );
  }

  // Non-blocking background sync indicator instead of blocking screen
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#0f2948] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-sky-400 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Loading School Data...</h2>
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
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const docId = student.firestoreDocId || (typeof student.id === 'string' && (student.id as string).startsWith('std_') ? (student.id as string) : `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const validId = typeof student.id === 'number' && !isNaN(student.id) ? student.id : (Number(docId.replace(/\D/g, '')) || Date.now());

    const studentWithId: Student = {
      ...student,
      id: validId,
      firestoreDocId: docId,
      school_id: schoolId
    } as any;

    const activityLogs = logActivity(
      'STUDENT_ADDED',
      'students',
      'Student Enrolled',
      `Enrolled ${studentWithId.name} (${studentWithId.regNo || 'No Reg'}) in Form ${studentWithId.className}`
    );
    const currentStudents = Array.isArray(dataRef.current.students) ? dataRef.current.students : [];
    updateRemoteData({ students: [...currentStudents, studentWithId], activityLogs });

    (async () => {
      try {
        const dbRow = toSupabaseStudent(studentWithId, schoolId);
        await supabase.from('students').upsert(dbRow, { onConflict: 'id' });
      } catch (e) {
        console.warn("Error upserting student in Supabase:", e);
      }
      try {
        await saveStudentToFirestore({
          id: docId,
          numericId: validId,
          regNo: studentWithId.regNo,
          name: studentWithId.name,
          className: studentWithId.className,
          gender: studentWithId.gender || '',
          parentPhone: studentWithId.parentPhone || studentWithId.phone || '',
          phone: studentWithId.phone || studentWithId.parentPhone || '',
          feeStatus: ((studentWithId as any).feeStatus === 'PAID' ? 'PAID' : 'UNPAID'),
          schoolId: schoolId,
          stream: studentWithId.stream || '',
          dob: studentWithId.dob || '2010-01-01',
          subjects: studentWithId.subjects || [],
          marks: studentWithId.marks || {},
          total: studentWithId.total,
          average: studentWithId.average,
          grade: studentWithId.grade,
          division: studentWithId.division,
          points: studentWithId.points,
          remark: studentWithId.remark,
          position: studentWithId.position
        });
      } catch (fsErr) {
        console.warn("Firestore save student error:", fsErr);
      }
    })();
  };

  const handleBulkAddStudents = async (newStudents: Student[]) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
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

    const activityLogs = logActivity(
      'STUDENTS_BULK_UPDATE',
      'students',
      'Students Bulk Enrolled',
      `Imported ${newStudents.length} students via CSV`
    );
    const currentStudents = Array.isArray(dataRef.current.students) ? dataRef.current.students : [];
    updateRemoteData({
      students: [...currentStudents, ...processedStudents],
      activityLogs
    });

    (async () => {
      try {
        const rowsToPush = processedStudents.map(s => toSupabaseStudent(s, schoolId));
        const chunkSize = 100;
        for (let i = 0; i < rowsToPush.length; i += chunkSize) {
          const chunk = rowsToPush.slice(i, i + chunkSize);
          await supabase.from('students').upsert(chunk, { onConflict: 'id' });
        }
        Promise.all(
          processedStudents.map(s =>
            saveStudentToFirestore({
              id: (s as any).firestoreDocId,
              numericId: s.id,
              regNo: s.regNo,
              name: s.name,
              className: s.className || 'Form 1',
              gender: s.gender || 'Male',
              parentPhone: s.parentPhone || s.phone || '',
              phone: s.phone || s.parentPhone || '',
              feeStatus: (s.feeStatus as any) || 'PAID',
              schoolId,
              stream: s.stream || 'STREAM A',
              dob: s.dob || '2010-01-01',
              subjects: s.subjects || [],
              marks: s.marks || {},
              total: s.total,
              average: s.average,
              grade: s.grade,
              division: s.division,
              points: s.points,
              remark: s.remark,
              position: s.position
            })
          )
        ).catch(() => {});
      } catch (e) {
        console.warn("Error bulk upserting students in Supabase:", e);
      }
    })();
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
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const dbRow = toSupabaseStudent(student, schoolId);
    const fsDocId = (student as any).firestoreDocId || dbRow.id || String(student.id);

    const activityLogs = logActivity(
      'STUDENT_UPDATED',
      'students',
      'Student Record Edited',
      `Updated academic record/marks for ${student.name} (${student.regNo})`
    );
    const currentStudents = Array.isArray(dataRef.current.students) ? dataRef.current.students : [];
    updateRemoteData({
      students: currentStudents.map(s =>
        s.id === student.id || (s as any).firestoreDocId === fsDocId
          ? {
              ...s,
              ...student,
              passportPhoto: student.passportPhoto,
              subjects: Array.isArray(student.subjects) ? student.subjects : [],
              firestoreDocId: fsDocId
            }
          : s
      ),
      activityLogs
    });

    (async () => {
      try {
        await supabase.from('students').upsert(dbRow, { onConflict: 'id' });
      } catch (e) {
        console.warn("Error updating student doc in Supabase:", e);
      }
      try {
        await saveStudentToFirestore({
          id: fsDocId,
          numericId: student.id,
          regNo: student.regNo,
          name: student.name,
          className: student.className,
          level: student.level || 'CSEE',
          combination: student.combination || '',
          gender: student.gender || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || student.phone || '',
          phone: student.phone || student.parentPhone || '',
          passportPhoto: student.passportPhoto || '',
          feeStatus: ((student as any).feeStatus === 'PAID' ? 'PAID' : 'UNPAID'),
          schoolId: schoolId,
          stream: student.stream || '',
          dob: student.dob || '2010-01-01',
          subjects: student.subjects || [],
          marks: student.marks || {},
          total: student.total,
          average: student.average,
          grade: student.grade,
          division: student.division,
          points: student.points,
          remark: student.remark,
          position: student.position
        } as any);
      } catch (fsErr) {
        console.warn("Firestore update student error:", fsErr);
      }
    })();
  };

  const handleDeleteStudent = async (id: number | string) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const targetStrId = String(id);

    const currentStudents = Array.isArray(dataRef.current.students) ? dataRef.current.students : [];
    const target = currentStudents.find(s => String(s.id) === targetStrId || (s as any).firestoreDocId === targetStrId);
    const fsDocId = (target as any)?.firestoreDocId || targetStrId;

    const newStudents = currentStudents.filter(
      s => String(s.id) !== targetStrId && (s as any).firestoreDocId !== targetStrId && (s as any).firestoreDocId !== fsDocId
    );

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

    (async () => {
      try {
        if (target) {
          const dbRow = toSupabaseStudent(target, schoolId);
          await deleteRecord('students', dbRow.id);
        }
        await deleteRecord('students', targetStrId);
        if (fsDocId !== targetStrId) {
          await deleteRecord('students', fsDocId);
        }
      } catch (e) {
        console.warn("Error deleting student doc in Supabase:", e);
      }
      try {
        await deleteStudentFromFirestore(fsDocId);
      } catch (fsErr) {
        console.warn("Firestore delete student error:", fsErr);
      }
    })();
  };

  const handleBulkDeleteStudents = async (ids: (number | string)[]) => {
    if (!ids || ids.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const idStrings = ids.map(id => String(id));
    const idSet = new Set(idStrings);

    const currentStudents = Array.isArray(dataRef.current.students) ? dataRef.current.students : [];
    const targetsToDelete = currentStudents.filter(s => idSet.has(String(s.id)) || idSet.has((s as any).firestoreDocId || ''));
    const newStudents = currentStudents.filter(s => !idSet.has(String(s.id)) && !idSet.has((s as any).firestoreDocId || ''));

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

    (async () => {
      try {
        const dbUuids = targetsToDelete.map(s => toSupabaseStudent(s, schoolId).id);
        if (dbUuids.length > 0) {
          await supabase.from('students').delete().in('id', dbUuids);
        }
      } catch (e) {
        console.warn("Error bulk deleting students in Supabase:", e);
      }
      targetsToDelete.forEach(target => {
        const fsDocId = (target as any)?.firestoreDocId || String(target.id);
        deleteStudentFromFirestore(fsDocId).catch(() => {});
      });
    })();
  };

  const handleAddTeacher = async (teacher: Teacher) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const docId = teacher.firestoreDocId || (typeof teacher.id === 'string' && (teacher.id as string).startsWith('tch_') ? (teacher.id as string) : `tch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const validId = typeof teacher.id === 'number' && !isNaN(teacher.id) ? teacher.id : (Number(docId.replace(/\D/g, '')) || Date.now());
    const teacherWithId: Teacher = {
      ...teacher,
      id: validId,
      firestoreDocId: docId
    } as any;

    const activityLogs = logActivity(
      'TEACHER_ADDED',
      'teachers',
      'Staff Member Added',
      `Registered teacher ${teacher.name} (${(teacher.subjects || []).join(', ')})`
    );
    const currentTeachers = Array.isArray(dataRef.current.teachers) ? dataRef.current.teachers : [];
    const currentSelInvig = Array.isArray(dataRef.current.selectedInvigilators) ? dataRef.current.selectedInvigilators : [];
    updateRemoteData({
      teachers: [...currentTeachers, teacherWithId],
      selectedInvigilators: teacher.excludeInvigilation ? currentSelInvig : [...currentSelInvig, teacherWithId.id],
      activityLogs
    });

    (async () => {
      try {
        const dbRow = toSupabaseTeacher(teacherWithId, schoolId);
        await supabase.from('teachers').upsert(dbRow, { onConflict: 'id' });
      } catch (e) {
        console.warn("Error inserting teacher doc in Supabase:", e);
      }
      try {
        await saveTeacherToFirestore({
          id: docId,
          numericId: validId,
          name: teacherWithId.name,
          gender: teacherWithId.gender || 'Male',
          schoolRole: teacherWithId.schoolRole || 'Subject Teacher',
          phone: teacherWithId.phone || '',
          email: teacherWithId.email || '',
          subject: teacherWithId.subjects?.[0] || '',
          subjects: teacherWithId.subjects || [],
          teachingStreams: teacherWithId.teachingStreams || [],
          passportPhoto: teacherWithId.passportPhoto || '',
          color: teacherWithId.color || '#1d4ed8',
          maxPeriodsPerWeek: teacherWithId.maxPeriodsPerWeek || 20,
          initial: teacherWithId.initial || '',
          excludeInvigilation: teacherWithId.excludeInvigilation ?? false,
          schoolId: schoolId
        } as any);
      } catch (fsErr) {
        console.warn("Firestore save teacher error:", fsErr);
      }
    })();
  };

  const handleBulkAddTeachers = async (newTeachers: Teacher[]) => {
    if (!newTeachers || newTeachers.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const activityLogs = logActivity(
      'TEACHER_BULK_ADDED',
      'teachers',
      'Multiple Teachers Registered',
      `Registered ${newTeachers.length} staff members in bulk`
    );
    const newInvigIds = newTeachers.filter(t => !t.excludeInvigilation).map(t => t.id);
    const currentTeachers = Array.isArray(dataRef.current.teachers) ? dataRef.current.teachers : [];
    const currentSelInvig = Array.isArray(dataRef.current.selectedInvigilators) ? dataRef.current.selectedInvigilators : [];
    updateRemoteData({
      teachers: [...currentTeachers, ...newTeachers],
      selectedInvigilators: [...currentSelInvig, ...newInvigIds],
      activityLogs
    });

    (async () => {
      try {
        const rows = newTeachers.map(t => toSupabaseTeacher(t, schoolId));
        await supabase.from('teachers').upsert(rows, { onConflict: 'id' });
      } catch (e) {
        console.warn("Error inserting bulk teachers in Supabase:", e);
      }
      for (const t of newTeachers) {
        const docId = t.firestoreDocId || `tch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        saveTeacherToFirestore({
          id: docId,
          numericId: t.id,
          name: t.name,
          gender: t.gender || 'Male',
          schoolRole: t.schoolRole || 'Subject Teacher',
          phone: t.phone || '',
          email: t.email || '',
          subject: t.subjects?.[0] || '',
          subjects: t.subjects || [],
          teachingStreams: t.teachingStreams || [],
          passportPhoto: t.passportPhoto || '',
          color: t.color || '#1d4ed8',
          maxPeriodsPerWeek: t.maxPeriodsPerWeek || 20,
          initial: t.initial || '',
          excludeInvigilation: t.excludeInvigilation ?? false,
          schoolId: schoolId
        } as any).catch(() => {});
      }
    })();
  };

  const handleUpdateTeacher = async (teacher: Teacher) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const dbRow = toSupabaseTeacher(teacher, schoolId);
    const fsDocId = (teacher as any).firestoreDocId || dbRow.id || String(teacher.id);

    const activityLogs = logActivity(
      'TEACHER_UPDATED',
      'teachers',
      'Staff Profile Modified',
      `Updated details for teacher ${teacher.name}`
    );
    const currentTeachers = Array.isArray(dataRef.current.teachers) ? dataRef.current.teachers : [];
    const currentTeacherAssignments = Array.isArray(dataRef.current.teacherAssignments) ? dataRef.current.teacherAssignments : [];
    const updatedTeacherAssignments = currentTeacherAssignments.map(ta => {
      if (ta && Number(ta.teacherId) === Number(teacher.id)) {
        return {
          ...ta,
          teacherName: teacher.name
        };
      }
      return ta;
    });

    updateRemoteData({
      teachers: currentTeachers.map(t =>
        t.id === teacher.id || (t as any).firestoreDocId === fsDocId
          ? {
              ...t,
              ...teacher,
              passportPhoto: teacher.passportPhoto,
              subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
              teachingStreams: Array.isArray(teacher.teachingStreams) ? teacher.teachingStreams : [],
              firestoreDocId: fsDocId
            }
          : t
      ),
      teacherAssignments: updatedTeacherAssignments,
      activityLogs
    });

    (async () => {
      try {
        await supabase.from('teachers').upsert(dbRow, { onConflict: 'id' });
      } catch (e) {
        console.warn("Error updating teacher doc in Supabase:", e);
      }
      try {
        await saveTeacherToFirestore({
          id: fsDocId,
          numericId: teacher.id,
          name: teacher.name,
          gender: teacher.gender || 'Male',
          schoolRole: teacher.schoolRole || 'Subject Teacher',
          phone: teacher.phone || '',
          email: teacher.email || '',
          subject: teacher.subjects?.[0] || '',
          subjects: teacher.subjects || [],
          teachingStreams: teacher.teachingStreams || [],
          passportPhoto: teacher.passportPhoto || '',
          color: teacher.color || '#1d4ed8',
          maxPeriodsPerWeek: teacher.maxPeriodsPerWeek || 20,
          initial: teacher.initial || '',
          excludeInvigilation: teacher.excludeInvigilation ?? false,
          schoolId: schoolId
        } as any);
      } catch (fsErr) {
        console.warn("Firestore update teacher error:", fsErr);
      }
    })();
  };

  const handleDeleteTeacher = async (id: number | string) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const targetStrId = String(id);

    const currentTeachers = Array.isArray(dataRef.current.teachers) ? dataRef.current.teachers : [];
    const target = currentTeachers.find(t => String(t.id) === targetStrId || (t as any).firestoreDocId === targetStrId);
    const fsDocId = (target as any)?.firestoreDocId || targetStrId;

    const newTeachers = currentTeachers.filter(
      t => String(t.id) !== targetStrId && (t as any).firestoreDocId !== targetStrId && (t as any).firestoreDocId !== fsDocId
    );

    const newInvigAssignments = { ...(dataRef.current.invigilationAssignments || {}) };
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
      selectedInvigilators: (dataRef.current.selectedInvigilators || []).filter(tid => String(tid) !== targetStrId),
      timetableAssignments: (dataRef.current.timetableAssignments || []).map(a => (String(a.teacherId) === targetStrId ? { ...a, teacherId: undefined } : a)),
      invigilationAssignments: newInvigAssignments,
      activityLogs
    });

    (async () => {
      try {
        if (target) {
          const dbRow = toSupabaseTeacher(target, schoolId);
          await deleteRecord('teachers', dbRow.id);
        }
        await deleteRecord('teachers', targetStrId);
        if (fsDocId !== targetStrId) {
          await deleteRecord('teachers', fsDocId);
        }
      } catch (e) {
        console.warn("Error deleting teacher doc in Supabase:", e);
      }
      try {
        await deleteTeacherFromFirestore(fsDocId);
      } catch (fsErr) {
        console.warn("Firestore delete teacher error:", fsErr);
      }
    })();
  };

  const handleBulkDeleteTeachers = async (ids: (number | string)[]) => {
    if (!ids || ids.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const idStrings = ids.map(id => String(id));
    const idSet = new Set(idStrings);
    const count = ids.length;

    const currentTeachers = Array.isArray(dataRef.current.teachers) ? dataRef.current.teachers : [];
    const targetsToDelete = currentTeachers.filter(t => idSet.has(String(t.id)) || idSet.has((t as any).firestoreDocId || ''));
    const newTeachers = currentTeachers.filter(t => !idSet.has(String(t.id)) && !idSet.has((t as any).firestoreDocId || ''));

    const newInvigAssignments = { ...(dataRef.current.invigilationAssignments || {}) };
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
      selectedInvigilators: (dataRef.current.selectedInvigilators || []).filter(tid => !idSet.has(String(tid))),
      timetableAssignments: (dataRef.current.timetableAssignments || []).map(a => (a.teacherId && idSet.has(String(a.teacherId)) ? { ...a, teacherId: undefined } : a)),
      invigilationAssignments: newInvigAssignments,
      activityLogs
    });

    (async () => {
      try {
        const dbUuids = targetsToDelete.map(t => toSupabaseTeacher(t, schoolId).id);
        if (dbUuids.length > 0) {
          await supabase.from('teachers').delete().in('id', dbUuids);
        }
      } catch (e) {
        console.warn("Error bulk deleting teachers in Supabase:", e);
      }
      targetsToDelete.forEach(target => {
        const fsDocId = (target as any)?.firestoreDocId || String(target.id);
        deleteTeacherFromFirestore(fsDocId).catch(() => {});
      });
    })();
  };

  const handleSaveEvaluation = (evaluation: TeacherEvaluation) => {
    const current = dataRef.current.teacherEvaluations || [];
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
    const current = dataRef.current.teacherEvaluations || [];
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
    const currentExams = dataRef.current.exams || [];
    const currentSessions = dataRef.current.sessions || [];
    const activityLogs = logActivity(
      'EXAM_ADDED',
      'exams',
      'Examination Scheduled',
      `Scheduled ${exam.name} for ${exam.className} on ${exam.date}`
    );
    // Auto-create USAL for each subject of registered exam
    const newUsals = generateUsalRecordsForExam(exam, dataRef.current.students, dataRef.current.teachers, dataRef.current.usalRecords || []);
    const updatedUsals = [...(dataRef.current.usalRecords || []), ...newUsals];

    updateRemoteData({
      exams: [...currentExams, exam],
      sessions: [...currentSessions, session],
      usalRecords: updatedUsals,
      activityLogs
    });
  };

  const handleSaveUsalRecord = (record: UsalRecord) => {
    const current = dataRef.current.usalRecords || [];
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
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const currentExams = dataRef.current.exams || [];
    const target = currentExams.find(e => e.id === id);
    const activityLogs = logActivity(
      'EXAM_DELETED',
      'exams',
      'Examination Cancelled',
      `Removed exam ${target?.name || `ID #${id}`}`
    );
    updateRemoteData({
      exams: currentExams.filter(e => e.id !== id),
      activityLogs
    });
    if (target) {
      const dbRow = toSupabaseExam(target, schoolId);
      deleteRecord('exams', dbRow.id).catch(() => {});
    }
  };

  const handleUpdateExam = (exam: Exam) => {
    const currentExams = dataRef.current.exams || [];
    const activityLogs = logActivity(
      'EXAM_UPDATED',
      'exams',
      'Examination Updated',
      `Updated examination ${exam.name} status to ${exam.status || 'Active'}`
    );
    updateRemoteData({
      exams: currentExams.map(e => e.id === exam.id ? exam : e),
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
    const schoolId = userAccount?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID;
    const res = triggerJsonDownloadBackup(schoolId, dataRef.current, 'manual');
    const todayKey = getLocalDateKey();
    saveAutoBackupConfig(schoolId, {
      lastBackupDate: todayKey,
      lastJsonDownloadDate: todayKey,
      lastBackupTimestamp: new Date().toISOString(),
      lastBackupStatus: 'success',
      lastBackupMessage: `Manual JSON export (${res.filename})`,
    }).catch(() => {});
  };

  const handleRestoreSchoolSnapshot = (restoredData: any, sourceLabel = 'Snapshot') => {
    if (!restoredData || typeof restoredData !== 'object') return;
    const activityLogs = logActivity(
      'BACKUP_RESTORE',
      'settings',
      'Database Restored from Backup Snapshot',
      `Restored full school database from ${sourceLabel}`
    );
    const restored = {
      ...dataRef.current,
      ...restoredData,
      activityLogs,
    };
    setData(restored);
    dataRef.current = restored;
    updateRemoteData(restored);
    setSyncToast(`Data za shule zimerejeshwa kikamilifu kutoka ${sourceLabel}!`);
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const clean = { ...parsed };
          delete clean._backupMeta;
          delete clean._snapshotMeta;
          handleRestoreSchoolSnapshot(clean, `JSON File (${file.name})`);
        }
      } catch (err) {
        console.error('Failed to read JSON backup file:', err);
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
        isSyncing={isSyncing}
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
              invigilationAssignments={data.invigilationAssignments || {}}
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
              academicTermDates={data.academicTermDates}
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
          {activeView === 'pastpapers' && (
            <PastPaperCenter
              pastPapers={data.pastPapers || []}
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
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
              timetableAssignments={data.timetableAssignments || []}
              periodSettings={data.periodSettings || []}
              sessions={data.sessions || []}
              invigilationAssignments={data.invigilationAssignments || {}}
              supervisors={data.supervisors || []}
              onUpdateTeacher={handleUpdateTeacher}
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

          {activeView === 'teacher-attendance' && (
            <TeacherAttendanceView
              teachers={data.teachers || []}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              teacherAttendance={data.teacherAttendance || {}}
              onSaveTeacherAttendance={(date, _recordsForDate, fullUpdatedMap) => {
                const activityLogs = logActivity(
                  'TEACHER_UPDATED',
                  'teachers',
                  'Teacher Daily Attendance Saved',
                  `Saved daily staff attendance records for ${date} to teacher_attendance`
                );
                updateRemoteData({ teacherAttendance: fullUpdatedMap, activityLogs });
              }}
              onNavigateToPayroll={() => setActiveView('staff-payroll')}
            />
          )}

          {activeView === 'biometric-report' && (
            <BiometricReportView
              teachers={data.teachers || []}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
            />
          )}

          {activeView === 'student-progress' && (
            <StudentProgressTrackerView
              students={data.students || []}
              exams={data.exams || []}
              examinationRecords={data.examinationRecords || []}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
            />
          )}

          {activeView === 'staff-payroll' && (
            <StaffPayrollManagement
              teachers={data.teachers || []}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              teacherAttendance={data.teacherAttendance || {}}
              staffPayroll={data.staffPayroll}
              onSaveStaffPayroll={staffPayroll => {
                const activityLogs = logActivity(
                  'TEACHER_UPDATED',
                  'teachers',
                  'Staff Payroll Updated',
                  'Calculated and saved monthly staff payroll records'
                );
                updateRemoteData({ staffPayroll, activityLogs });
              }}
              onNavigateToTeacherAttendance={() => setActiveView('teacher-attendance')}
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
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              schoolInfo={data.schoolInfo}
              students={data.students}
              currentUser={userAccount}
              onUpdateStudents={handleUpdateStudents}
              onSaveSchoolInfo={schoolInfo => {
                const activityLogs = logActivity(
                  'SCHOOL_INFO_UPDATE',
                  'settings',
                  'NECTA Registration Numbers & Studio Updated',
                  `Saved NECTA index number settings for ${schoolInfo.name}`
                );
                updateRemoteData({ schoolInfo, activityLogs });
              }}
            />
          )}

          {activeView === 'remedialtimetable' && (
            <RemedialTimetableSetup
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
              teachers={data.teachers}
              schoolInfo={data.schoolInfo}
              students={data.students}
              periodSettings={data.periodSettings}
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
              sessions={data.sessions || []}
              invigilationAssignments={data.invigilationAssignments || {}}
              supervisors={data.supervisors || []}
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
              sessions={data.sessions || []}
              invigilationAssignments={data.invigilationAssignments || {}}
              supervisors={data.supervisors || []}
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
              currentUser={userAccount}
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
              onNavigateToCalendar={() => setActiveView('invigilation-calendar')}
            />
          )}

          {activeView === 'invigilation-calendar' && (
            <InvigilationCalendarView
              sessions={data.sessions || []}
              teachers={data.teachers || []}
              supervisors={data.supervisors || []}
              invigilationAssignments={data.invigilationAssignments || {}}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              onNavigateToInvigilation={() => setActiveView('invigilation')}
              onBackToDashboard={() => setActiveView('dashboard')}
            />
          )}

          {activeView === 'sittingplan' && (
            <SittingPlan
              schoolId={userAccount?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID}
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

          {activeView === 'officialletters' && (
            <OfficialLettersView
              students={data.students || []}
              teachers={data.teachers || []}
              schoolInfo={data.schoolInfo}
              streamSettings={data.streamSettings || []}
              communicationTemplates={data.communicationTemplates || []}
              onUpdateCommunicationTemplates={templates => {
                updateRemoteData({ communicationTemplates: templates });
              }}
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
              schoolData={data}
              onRestoreData={handleRestoreSchoolSnapshot}
            />
          )}
        </main>
        </RoleGuard>
      </div>
    </div>
  </ConfirmDeleteProvider>
);
}
