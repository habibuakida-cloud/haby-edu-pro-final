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
import { TimetableContainer } from './components/Timetable/TimetableContainer';
import { InvigilationContainer } from './components/InvigilationContainer';
import { SettingsView } from './components/SettingsView';
import { AttendanceView } from './components/AttendanceView';
import { MarkEntryView } from './components/MarkEntryView';
import { StudentIDView } from './components/StudentIDView';
import { SubscriptionData, getSchoolSubscription, initializeTrial, isSubscriptionValid } from './utils/SubscriptionService';
import { SubscriptionModal } from './components/common/SubscriptionModal';
import { DisciplineView } from './components/DisciplineView';
import { LessonPlanView } from './components/LessonPlan/LessonPlanView';
import { SchemeOfWorkView } from './components/SchemeOfWork/SchemeOfWorkView';
import { TeacherPortalView } from './components/Teachers/TeacherPortalView';
import { FloatingBubbles } from './components/FloatingBubbles';
import { AuthScreen } from './components/auth/AuthScreen';
import { ParentPortalView } from './components/ParentPortalView';
import { DailyTeachingTrackerView } from './components/DailyTeachingTrackerView';
import { EvaluationAnalysisView } from './components/EvaluationAnalysisView';
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
  supabase, 
  DEFAULT_PRIMARY_SCHOOL_ID, 
  toSupabaseStudent, 
  fromSupabaseStudent, 
  toSupabaseTeacher, 
  fromSupabaseTeacher, 
  toSupabaseExam, 
  fromSupabaseExam,
  toSupabaseParent,
  fromSupabaseParent,
  toSupabaseActivityLog,
  fromSupabaseActivityLog,
  toSupabaseDiscipline,
  fromSupabaseDiscipline,
  toSupabaseGatePass,
  fromSupabaseGatePass,
  addToSyncQueue,
  processSyncQueue,
  checkSupabaseHealth,
  insertRecord,
  upsertRecord,
  getCurrentSchoolId
} from './lib/supabaseClient';
import { getSchoolData, saveSchoolData, subscribeSchoolData } from './lib/supabaseService';
import { saveTimetableAssignments } from './lib/timetableService';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { Loader2, Shield, Menu, RotateCw, Check, Building2, ShieldCheck } from 'lucide-react';

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

  const { user, userAccount, loading: authLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA);

  useEffect(() => {
    if (userAccount?.role === 'TEACHER' && activeView !== 'teacherportal') {
      setActiveView('teacherportal');
    } else if ((userAccount?.isSuperAdmin || userAccount?.role === 'SUPER_ADMIN') && !sessionStorage.getItem('haby_superadmin_viewed')) {
      sessionStorage.setItem('haby_superadmin_viewed', 'true');
      setActiveView('multischool');
    }
  }, [userAccount, activeView]);

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyReg = urlParams.get('verifyStudent');
    if (verifyReg) {
      return (
        <VerifiedStudentProfileView 
          regNo={verifyReg} 
          students={data.students} 
          schoolInfo={data.schoolInfo}
          examinationRecords={data.examinationRecords}
          exams={data.exams}
          onBackToMain={() => {
            window.location.href = window.location.pathname;
          }} 
        />
      );
    }
  }
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

  // Helper function to persist school state snapshot to Firestore & Supabase
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
        updated_at: new Date().toISOString()
      };
      
      // 1. Save to Firestore
      await saveSchoolData(schId, payload);

      // 2. Save to Supabase school_data table (Dual Cloud Persistence)
      try {
        await supabase.from('school_data').upsert({
          id: schId,
          school_id: schId,
          ...payload
        }, { onConflict: 'school_id' });
      } catch (supaErr) {
        console.warn("Supabase school_data sync notice:", supaErr);
      }
    } catch (err) {
      console.warn("Error saving school snapshot:", err);
    }
  };

  // Sync with Firestore & Real-Time Single Source of Truth
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

    // Pre-populate state from IndexedDB cache immediately to respect user's deleted/configured state
    getCachedData(schoolKey).then(cached => {
      if (cached && typeof cached === 'object') {
        // If cached periodSettings contains the old default 35 template periods, reset them to empty array so user starts fresh!
        const isOldDefault35Periods = Array.isArray(cached.periodSettings) &&
          cached.periodSettings.length === 35 &&
          cached.periodSettings[0]?.name === 'Period 1' &&
          cached.periodSettings[0]?.start === '08:00';

        const isOldDefault17Streams = Array.isArray(cached.streamSettings) &&
          cached.streamSettings.length === 17 &&
          cached.streamSettings[0]?.className === 'Nursery';

        const cleanPeriods = isOldDefault35Periods ? [] : (cached.periodSettings || []);
        const cleanStreams = isOldDefault17Streams ? [] : (cached.streamSettings || []);
        const cleanAssignments = isOldDefault35Periods ? [] : (cached.timetableAssignments || []);

        setData(prev => ({
          ...prev,
          ...cached,
          streamSettings: cleanStreams,
          periodSettings: cleanPeriods,
          timetableAssignments: cleanAssignments
        }));
      }
    }).catch(e => console.warn("Initial IDB cache load error:", e));

    // 0. Primary Database Load: Seamless Hybrid Sync (Supabase Relational + Firestore Realtime)
    const loadFromDatabase = async (isInitialBoot = false) => {
      console.log("Loading unified single source of truth for school:", schoolId);

      try {
        // Fetch in parallel from Firestore and Supabase
        const [firestoreData, studRes, teachRes, examRes, classRes, perRes, subjRes] = await Promise.all([
          getSchoolData(schoolId).catch(() => null),
          supabase.from('students').select('*').catch(() => ({ data: null })),
          supabase.from('teachers').select('*').catch(() => ({ data: null })),
          supabase.from('exams').select('*').catch(() => ({ data: null })),
          supabase.from('classes').select('*').catch(() => ({ data: null })),
          supabase.from('periods').select('*').order('start_time', { ascending: true }).catch(() => ({ data: null })),
          supabase.from('subjects').select('*').catch(() => ({ data: null })),
        ]);

        // Process Supabase core tables
        const supaStudents = (studRes?.data || []).map((s: any, idx: number) => fromSupabaseStudent(s, idx));
        const supaTeachers = (teachRes?.data || []).map((t: any, idx: number) => fromSupabaseTeacher(t, idx));
        const supaExams = (examRes?.data || []).map((e: any, idx: number) => fromSupabaseExam(e, idx));
        const supaClasses = classRes?.data || [];
        const supaPeriods = (perRes?.data || []).map((p: any, idx: number) => ({
          id: p.id || `period-${idx + 1}`,
          name: p.name || `Period ${idx + 1}`,
          start: p.start_time || '07:30',
          end: p.end_time || '08:10',
          isBreak: Boolean(p.is_break),
          isAssembly: false,
          isSports: false,
          isReligion: false
        }));

        // Fetch users from Firestore users collection & authorizedStaff & Supabase profiles
        try {
          const userMap = new Map<string, any>();

          // a) Firestore users query 1 (schoolId)
          try {
            const uQuery1 = query(collection(db, 'users'), where('schoolId', '==', schoolId));
            const uSnap1 = await getDocs(uQuery1);
            uSnap1.docs.forEach(d => userMap.set(d.id, { id: d.id, ...d.data() }));
          } catch (e1) {
            console.warn("Could not query users by schoolId:", e1);
          }

          // b) Firestore users query 2 (school_id)
          try {
            const uQuery2 = query(collection(db, 'users'), where('school_id', '==', schoolId));
            const uSnap2 = await getDocs(uQuery2);
            uSnap2.docs.forEach(d => userMap.set(d.id, { id: d.id, ...d.data() }));
          } catch (e2) {
            console.warn("Could not query users by school_id:", e2);
          }

          // c) Firestore authorizedStaff
          try {
            const staffSnap = await getDocs(collection(db, `schools/${schoolId}/authorizedStaff`));
            staffSnap.docs.forEach(d => {
              const sd = d.data();
              if (!userMap.has(d.id)) {
                userMap.set(d.id, {
                  id: d.id,
                  uid: d.id,
                  email: sd.authEmail || sd.email,
                  fullName: sd.staffIdentity || sd.fullName,
                  displayName: sd.staffIdentity || sd.fullName,
                  role: sd.role || 'HEADMASTER',
                  schoolId,
                  school_id: schoolId,
                  password: sd.assignedPassword,
                  assignedSubjects: sd.assignedSubjects || [],
                  isActive: true
                });
              }
            });
          } catch (e3) {
            console.warn("Could not query authorizedStaff:", e3);
          }

          if (userMap.size > 0) {
            setUsers(Array.from(userMap.values()) as UserAccount[]);
          }
        } catch (uErr) {
          console.warn("Could not load users from database:", uErr);
        }

        const rawSchoolData = (firestoreData || {}) as Record<string, any>;
        const remoteData = { ...rawSchoolData } as Partial<AppData>;
        
        setData(prev => {
          // Resolve students: prioritize Supabase relational rows if present, else snapshot
          const resolvedStudents = supaStudents.length > 0 ? supaStudents : (remoteData.students || prev.students);
          const resolvedTeachers = supaTeachers.length > 0 ? supaTeachers : (remoteData.teachers || prev.teachers);
          const resolvedExams = supaExams.length > 0 ? supaExams : (remoteData.exams || prev.exams);

          // Build or merge streamSettings from Supabase classes if available
          let resolvedStreamSettings = remoteData.streamSettings || prev.streamSettings || [];
          if (supaClasses.length > 0) {
            const existingClassNames = new Set(resolvedStreamSettings.map((s: any) => s.className));
            const newStreamEntries = supaClasses
              .filter((c: any) => !existingClassNames.has(c.name))
              .map((c: any) => ({
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
            : (remoteData.periodSettings || prev.periodSettings || []);

          const updatedState: AppData = {
            ...prev,
            ...remoteData,
            students: resolvedStudents,
            teachers: resolvedTeachers,
            exams: resolvedExams,
            streamSettings: resolvedStreamSettings,
            periodSettings: resolvedPeriods,
            parents: remoteData.parents || prev.parents,
            examinationRecords: remoteData.examinationRecords || prev.examinationRecords,
          };

          setCachedData(schoolKey, updatedState).catch(e => console.warn("IDB cache error:", e));
          return updatedState;
        });

        setIsCloudSynced(true);
        setDataLoading(false);
      } catch (err) {
        console.warn("Error in loadFromDatabase:", err);
        setDataLoading(false);
      }
    };

    // Initial load
    loadFromDatabase(true);

    // 1. Supabase Real-Time Subscriptions (The Real Single Source of Truth)
    const studentsSub = supabase
      .channel('public:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => loadFromDatabase())
      .subscribe();

    const teachersSub = supabase
      .channel('public:teachers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => loadFromDatabase())
      .subscribe();

    const classesSub = supabase
      .channel('public:classes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => loadFromDatabase())
      .subscribe();

    const examsSub = supabase
      .channel('public:exams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => loadFromDatabase())
      .subscribe();

    // Check school status from schools table
    Promise.resolve(supabase.from('schools').select('*').limit(1).maybeSingle())
      .then(({ data: sData }) => {
        if (sData) {
          setSchoolStatus(sData.status || 'ACTIVE');
        }
      })
      .catch((err: any) => console.warn("School status error:", err));

    return () => {
      supabase.removeChannel(studentsSub);
      supabase.removeChannel(teachersSub);
      supabase.removeChannel(classesSub);
      supabase.removeChannel(examsSub);
    };
  }, [userAccount]);

  // Force Refresh & Sync button implementation via Supabase: PUSH local data to cloud & pull updates
  const handleForceRefreshSync = async () => {
    if (!userAccount?.schoolId) return;
    setIsSyncing(true);

    // 1. Process Offline Queue first if online
    if (navigator.onLine) {
      await processSyncQueue();
    }

    const schoolId = userAccount.schoolId;
    const schoolKey = `haby_school_data_${schoolId}`;
    try {
      // 1. Unconditionally PUSH local students, teachers, and exams to Supabase to prevent loss
      console.log(`Pushing local data to Supabase cloud sync... Local students: ${data.students.length}`);
      
      if (data.students && data.students.length > 0) {
        const studentsToPush = data.students.map(s => toSupabaseStudent(s, schoolId));
        const chunkSize = 100;
        for (let i = 0; i < studentsToPush.length; i += chunkSize) {
          const chunk = studentsToPush.slice(i, i + chunkSize);
          await upsertRecord('students', chunk, 'id');
        }
      }

      if (data.teachers && data.teachers.length > 0) {
        const teachersToPush = data.teachers.map(t => toSupabaseTeacher(t, schoolId));
        await upsertRecord('teachers', teachersToPush, 'id');
      }

      if (data.exams && data.exams.length > 0) {
        const examsToPush = data.exams.map(e => toSupabaseExam(e, schoolId));
        await upsertRecord('exams', examsToPush, 'id');
      }

      if (data.parents && data.parents.length > 0) {
        const parentsToPush = data.parents.map(p => toSupabaseParent(p, schoolId));
        await upsertRecord('parents', parentsToPush, 'phone');
      }

      // Also save the entire school data state in Supabase school_data snapshot
      await saveSchoolDataToSupabase(schoolId, data);

      // 2. Now PULL latest remote data from Supabase to verify sync
      const [studRes, recRes, teachRes, examRes, parentRes, psRes, schoolDataRes] = await Promise.all([
        supabase.from('students').select('*').eq('school_id', schoolId),
        supabase.from('exam_records').select('*').eq('school_id', schoolId),
        supabase.from('teachers').select('*').eq('school_id', schoolId),
        supabase.from('exams').select('*').eq('school_id', schoolId),
        supabase.from('parents').select('*').eq('school_id', schoolId),
        supabase.from('parent_students').select('*'),
        supabase.from('school_data').select('*').eq('school_id', schoolId).limit(1)
      ]);

      const remoteStudents = studRes.data || [];
      const remoteTeachers = teachRes.data || [];
      const remoteExams = examRes.data || [];
      const remoteParentsData = parentRes.data || [];
      const remotePsData = psRes.data || [];
      const remoteRecords = recRes.data || [];
      const schoolDataArr = schoolDataRes.data || [];
      const remoteData = (schoolDataArr.length > 0 ? schoolDataArr[0] : {}) as Partial<AppData>;

      setData(prev => {
        const serializedStudents = remoteStudents.map((s: any, idx: number) => fromSupabaseStudent(s, idx));
        const serializedTeachers = remoteTeachers.map((t: any, idx: number) => fromSupabaseTeacher(t, idx));
        const serializedExams = remoteExams.map((e: any, idx: number) => fromSupabaseExam(e, idx));
        const serializedParents = remoteParentsData.map((p: any) => fromSupabaseParent(p));

        const next: AppData = {
          ...prev,
          ...remoteData,
          students: serializedStudents.length > 0 ? serializedStudents : prev.students,
          teachers: serializedTeachers.length > 0 ? serializedTeachers : prev.teachers,
          exams: serializedExams.length > 0 ? serializedExams : prev.exams,
          parents: serializedParents.length > 0 ? serializedParents : prev.parents,
          parentStudents: remotePsData.length > 0 ? remotePsData : prev.parentStudents,
          examinationRecords: remoteRecords.length > 0 ? remoteRecords : prev.examinationRecords
        };

        setSyncToast(`Cloud Sync Active: Pushed and synchronized ${next.students.length} Students, ${next.teachers.length} Staff, and ${next.exams.length} Exams.`);
        setTimeout(() => setSyncToast(null), 5000);

        return next;
      });

      setIsCloudSynced(true);
      alert(`Orodha imesawazishwa na Wingu kikamilifu! Wanafunzi ${data.students.length} wamerushwa kwenye Supabase.`);
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
      nextData = { ...prev, ...updates };
      return nextData;
    });

    // Immediately persist to IndexedDB so any fast navigation or reload retains changes
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

  // Auto-ensure USAL records exist for all registered exams
  useEffect(() => {
    if (data.exams && data.exams.length > 0 && data.students && data.students.length > 0) {
      const ensured = ensureUsalRecordsForAllExams(data.exams, data.students, data.teachers, data.usalRecords || []);
      if (ensured.length > (data.usalRecords || []).length) {
        setData(prev => ({ ...prev, usalRecords: ensured }));
        if (userAccount?.schoolId) {
          updateRemoteData({ usalRecords: ensured });
        }
      }
    }
  }, [data.exams, data.students.length, data.teachers.length]);

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
      userId: userAccount?.id || user?.uid || 'user',
      userName: userAccount?.fullName || user?.displayName || 'Authorized User',
      userEmail: userAccount?.email || user?.email || '',
      userRole: userAccount?.role || 'ACADEMIC',
      action,
      category,
      title,
      description,
      details
    };

    const currentLogs = data.activityLogs || [];
    return [newEntry, ...currentLogs].slice(0, 300);
  }, [userAccount, user, data.activityLogs]);

  // Auth Guard
  // Parent Portal Bypass for login
  const isParentPortalHash = window.location.hash === '#parentportal' || window.location.pathname === '/parent/login';
  const hasParentSession = !!sessionStorage.getItem('haby_parent_session');

  if (isParentPortalHash || (hasParentSession && activeView === 'parentportal')) {
    return (
      <ConfirmDeleteProvider>
        <ParentPortalView onBackToMain={() => {
           window.location.hash = '';
           window.location.reload();
        }} />
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

  if (dataLoading && (!data || !data.students || data.students.length === 0) && (!supabaseStudentCount || supabaseStudentCount === 0)) {
    return (
      <div className="min-h-screen bg-[#0f2948] text-white flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-white/20 border-t-sky-400 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black tracking-wider">HABY EDU PRO</h2>
        <p className="text-xs text-blue-200 mt-1">Inapakia kanzidata ya shule...</p>
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
    console.log("Current school_id (handleAddStudent):", schoolId);

    // Ensure we assign a valid UUID
    const isUuid = typeof student.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(student.id);
    const validId = isUuid ? student.id : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    const studentWithId = {
      ...student,
      id: validId,
      school_id: schoolId
    };

    let matchedClassId: string | undefined = undefined;
    try {
      const { data: cls } = await supabase.from('classes').select('id').eq('name', studentWithId.className).maybeSingle();
      if (cls?.id) matchedClassId = cls.id;
    } catch (e) {}

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

    const processedStudents = newStudents.map(s => {
      const isUuid = typeof s.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.id);
      const validId = isUuid ? s.id : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      return {
        ...s,
        id: validId,
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
      students: data.students.map(s => (s.id === student.id ? student : s)),
      activityLogs
    });
  };

  const handleDeleteStudent = async (id: number | string) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleDeleteStudent):", schoolId);
    const targetStrId = String(id);
    const numericId = Number(id);

    const newStudents = data.students.filter(s => String(s.id) !== targetStrId);

    try {
      await deleteRecord('students', id);
      if (!isNaN(numericId)) {
        await deleteRecord('students', numericId);
      }
      await deleteRecord('students', targetStrId);
    } catch (e) {
      console.warn("Error deleting student doc in Supabase:", e);
    }

    const target = data.students.find(s => String(s.id) === targetStrId);
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
    const count = ids.length;

    const newStudents = data.students.filter(s => !idSet.has(String(s.id)));

    try {
      await supabase.from('students').delete().in('id', ids);
    } catch (e) {
      console.warn("Error bulk deleting students in Supabase:", e);
    }

    const activityLogs = logActivity(
      'STUDENT_DELETED',
      'students',
      'Multiple Students Removed',
      `Bulk deleted ${count} student(s) from school records`
    );
    updateRemoteData({
      students: newStudents,
      activityLogs
    });
  };

  const handleAddTeacher = async (teacher: Teacher) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleAddTeacher):", schoolId);
    try {
      const dbRow = toSupabaseTeacher(teacher, schoolId);
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
      teachers: [...data.teachers, teacher],
      selectedInvigilators: teacher.excludeInvigilation ? data.selectedInvigilators : [...data.selectedInvigilators, teacher.id],
      activityLogs
    });
  };

  const handleBulkAddTeachers = async (newTeachers: Teacher[]) => {
    if (!newTeachers || newTeachers.length === 0) return;
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleBulkAddTeachers):", schoolId);
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
      teachers: data.teachers.map(t => (t.id === teacher.id ? teacher : t)),
      activityLogs
    });
  };

  const handleDeleteTeacher = async (id: number | string) => {
    const schoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
    console.log("Current school_id (handleDeleteTeacher):", schoolId);
    const targetStrId = String(id);
    const numericId = Number(id);

    const newTeachers = data.teachers.filter(t => String(t.id) !== targetStrId);

    try {
      await deleteRecord('teachers', id);
      if (!isNaN(numericId)) {
        await deleteRecord('teachers', numericId);
      }
      await deleteRecord('teachers', targetStrId);
    } catch (e) {
      console.warn("Error deleting teacher doc in Supabase:", e);
    }

    const target = data.teachers.find(t => String(t.id) === targetStrId);
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

  if (schoolStatus !== 'ACTIVE' && !userAccount.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Access Restricted</h1>
          <p className="text-slate-600">
            The school profile for <strong>{data.schoolInfo.name}</strong> is currently <strong>{schoolStatus.toLowerCase()}</strong>. 
            Access to this system has been temporarily suspended by the global administrator.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Contact Support</p>
            <p className="text-sm font-bold text-blue-600">habibuakida@gmail.com</p>
          </div>
          <button onClick={() => logout()} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm cursor-pointer hover:bg-slate-900 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConfirmDeleteProvider>
      <div className="min-h-screen bg-[#edf2f7] text-slate-800 font-sans relative overflow-x-hidden flex flex-col">
        {/* Floating Ambient Bubbles with Beautiful Iridescent Colors */}
        <FloatingBubbles 
          settings={data.bubbleSettings}
          onUpdateSettings={(settings) => updateRemoteData({ bubbleSettings: settings })}
        />

      {/* Top Header & Collapsible Sidebar Navigation */}
      {subscription && !checkingSub && !isSubscriptionValid(subscription) && (
        <SubscriptionModal 
          subscription={subscription} 
          onVerify={async (ref) => {
            try {
              await setDoc(doc(db, 'payment_verification_requests', subscription.schoolId), {
                schoolId: subscription.schoolId,
                reference: ref,
                timestamp: new Date().toISOString(),
                status: 'PENDING'
              });
              alert('Ombi lako la malipo limetumwa kwa ajili ya uhakiki.');
            } catch (e) {
              console.error(e);
              alert('Hitilafu wakati wa kutuma ombi.');
            }
          }} 
        />
      )}
      <Navigation
        activeView={activeView}
        schoolInfo={data.schoolInfo}
        saveStatus={saveStatus}
        onSelectView={view => setActiveView(view)}
        currentUser={userAccount}
        onLogout={() => {
          if (window.confirm("Are you sure you want to logout?")) {
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
                if (userAccount) {
                  setUserAccount({
                    ...userAccount,
                    schoolId: selectedSchoolId,
                    school_id: selectedSchoolId
                  });
                }
                setActiveView('dashboard');
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
              ledgerSubjectKeys={data.ledgerSubjectKeys?.[data.schoolInfo.name || 'default'] || []}
              onUpdateLedgerSubjectKeys={keys => {
                const updated = { ...(data.ledgerSubjectKeys || {}) };
                updated[data.schoolInfo.name || 'default'] = keys;
                updateRemoteData({ ledgerSubjectKeys: updated });
              }}
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
            />
          )}

          {activeView === 'schemes' && (
            <SchemeOfWorkView
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              teachers={data.teachers}
              schemesOfWork={data.schemesOfWork || []}
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
            />
          )}

          {activeView === 'discipline' && (
            <DisciplineView
              records={data.disciplineRecords || []}
              students={data.students}
              currentUser={userAccount}
              onAddRecord={handleAddDisciplineRecord}
              onUpdateRecord={handleUpdateDisciplineRecord}
              onDeleteRecord={handleDeleteDisciplineRecord}
            />
          )}

          {activeView === 'studentid' && (
            <StudentIDView
              students={data.students}
              schoolInfo={data.schoolInfo}
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
              onDeleteExam={handleDeleteExam}
              students={data.students}
              schoolInfo={data.schoolInfo}
            />
          )}

          {activeView === 'classjournal' && (
            <TimetableContainer
              assignments={data.timetableAssignments}
              teachers={data.teachers}
              periodSettings={data.periodSettings}
              streamSettings={data.streamSettings}
              classTimetableReleased={data.classTimetableReleased}
              schoolName={data.schoolInfo.name}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              students={data.students}
              dayThemes={data.dayThemes}
              institutionalPolicy={data.institutionalPolicy}
              subjectPeriodAllocations={data.subjectPeriodAllocations || []}
              teacherAssignments={data.teacherAssignments || []}
              journalRecords={data.journalRecords || {}}
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
              assignments={data.timetableAssignments}
              teachers={data.teachers}
              periodSettings={data.periodSettings}
              streamSettings={data.streamSettings}
              classTimetableReleased={data.classTimetableReleased}
              schoolName={data.schoolInfo.name}
              schoolInfo={data.schoolInfo}
              currentUser={userAccount}
              students={data.students}
              dayThemes={data.dayThemes}
              institutionalPolicy={data.institutionalPolicy}
              subjectPeriodAllocations={data.subjectPeriodAllocations || []}
              teacherAssignments={data.teacherAssignments || []}
              journalRecords={data.journalRecords || {}}
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
            <ParentPortalView onBackToMain={() => setActiveView('dashboard')} />
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
            />
          )}
        </main>
        </RoleGuard>
      </div>
    </div>
  </ConfirmDeleteProvider>
);
}
