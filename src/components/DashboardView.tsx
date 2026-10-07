import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  Activity,
  RefreshCw,
  CloudCheck,
  CheckCircle2,
  BookOpen,
  School,
  Smile,
  UserPlus,
  CreditCard,
  Grid,
  Smartphone,
  Plus,
  ArrowRight,
  ShieldCheck,
  Wallet,
  Sparkles,
  Layers,
  ChevronRight,
  Award,
  CalendarCheck,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Student, Teacher, Exam, InvigilationSession, SchoolInfo, ActivityLog, UserAccount } from '../types';
import { subDays, format, startOfDay } from 'date-fns';
import { NURSERY_CLASSES, PRIMARY_CLASSES, SECONDARY_CLASSES } from '../constants/defaults';
import { HabyEduProLogo } from './common/HabyEduProLogo';
import { getRemedialTimetable, RemedialTimetableEntry } from '../lib/remedialService';
import { exportRemedialTimetablePDF } from '../utils/remedialPdfExport';
import { isSameClass } from '../utils/reportCardUtils';

interface DashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  exams: Exam[];
  sessions: InvigilationSession[];
  isCloudSynced?: boolean;
  isSyncing?: boolean;
  onForceRefreshSync?: () => void;
  syncToast?: string | null;
  schoolInfo?: SchoolInfo;
  onSelectView?: (view: string) => void;
  activityLogs: ActivityLog[];
  schoolId?: string;
  currentUser?: UserAccount | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students = [],
  teachers = [],
  exams = [],
  sessions = [],
  isCloudSynced = false,
  isSyncing = false,
  onForceRefreshSync,
  syncToast = null,
  schoolInfo,
  onSelectView,
  activityLogs = [],
  schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
  currentUser
}) => {
  const [activeLevelFilter, setActiveLevelFilter] = useState<'ALL' | 'PRIMARY' | 'PRE_PRIMARY' | 'SECONDARY'>('ALL');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<'ALL' | 'students' | 'teachers' | 'exams'>('ALL');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');

  // Remedial Timetable Widget State
  const [remedialEntries, setRemedialEntries] = useState<RemedialTimetableEntry[]>([]);
  const [remedialMode, setRemedialMode] = useState<'STUDENT' | 'TEACHER' | 'ALL'>('STUDENT');
  const [selectedRemedialClass, setSelectedRemedialClass] = useState<string>('Class 5');
  const [selectedRemedialStream, setSelectedRemedialStream] = useState<string>('A');
  const [selectedRemedialTeacher, setSelectedRemedialTeacher] = useState<string>('');

  useEffect(() => {
    const fetchRemedial = async () => {
      try {
        const { data } = await getRemedialTimetable(schoolId);
        if (data) setRemedialEntries(data);
      } catch (e) {
        console.warn('Dashboard remedial fetch error:', e);
      }
    };
    fetchRemedial();
  }, [schoolId]);

  useEffect(() => {
    if (teachers.length > 0 && !selectedRemedialTeacher) {
      const match = currentUser?.fullName && teachers.some(t => t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()))
        ? currentUser.fullName
        : teachers[0].name;
      setSelectedRemedialTeacher(match);
    }
  }, [teachers, currentUser, selectedRemedialTeacher]);

  // Filtered remedial sessions for widget
  const displayedRemedialSessions = useMemo(() => {
    return remedialEntries.filter(item => {
      if (remedialMode === 'STUDENT') {
        const matchClass = isSameClass(item.class_name, selectedRemedialClass);
        const matchStream = selectedRemedialStream === 'ALL' || 
          item.stream === 'All Streams' || 
          item.stream.toUpperCase() === selectedRemedialStream.toUpperCase();
        return matchClass && matchStream;
      }
      if (remedialMode === 'TEACHER') {
        return !selectedRemedialTeacher || 
          item.teacher_name.toLowerCase().includes(selectedRemedialTeacher.toLowerCase());
      }
      return true;
    }).slice(0, 6);
  }, [remedialEntries, remedialMode, selectedRemedialClass, selectedRemedialStream, selectedRemedialTeacher]);

  const recentActivity = useMemo(() => {
    let filtered = [...activityLogs];
    if (activityCategoryFilter !== 'ALL') {
      filtered = filtered.filter(log => log.category === activityCategoryFilter);
    }
    if (activitySearchQuery) {
      const q = activitySearchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.title.toLowerCase().includes(q) || 
        log.description.toLowerCase().includes(q) ||
        log.userName.toLowerCase().includes(q)
      );
    }
    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [activityLogs, activityCategoryFilter, activitySearchQuery]);

  const activityTrends = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    const counts = last7Days.map(date => ({
      name: format(date, 'MMM dd'),
      count: activityLogs.filter(log => 
        startOfDay(new Date(log.timestamp)).getTime() === startOfDay(date).getTime()
      ).length
    }));
    return counts;
  }, [activityLogs]);

  const activityHeatmap = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), i)).reverse();
    return days.map(date => {
      const dateStr = startOfDay(date).toDateString();
      const count = activityLogs.filter(log => 
        startOfDay(new Date(log.timestamp)).toDateString() === dateStr
      ).length;
      
      let intensity = 'bg-slate-100';
      if (count > 10) intensity = 'bg-blue-600';
      else if (count > 5) intensity = 'bg-blue-400';
      else if (count > 0) intensity = 'bg-blue-200';
      
      return { date, count, intensity };
    });
  }, [activityLogs]);

  // Compute level breakdowns accurately across Primary, Pre-Primary / Nursery, CSEE & ACSEE
  const primaryStudents = useMemo(() => {
    return students.filter(s => 
      s.level === 'PRIMARY' || 
      PRIMARY_CLASSES.some(c => c.toLowerCase() === (s.className || '').toLowerCase())
    ).length;
  }, [students]);

  const prePrimaryStudents = useMemo(() => {
    return students.filter(s => 
      s.level === 'PRE_PRIMARY' || 
      NURSERY_CLASSES.some(c => c.toLowerCase() === (s.className || '').toLowerCase())
    ).length;
  }, [students]);

  const cseeStudents = useMemo(() => {
    return students.filter(s => s.level === 'CSEE' || (!s.level && s.className?.startsWith('Form'))).length;
  }, [students]);

  const acseeStudents = useMemo(() => {
    return students.filter(s => s.level === 'ACSEE').length;
  }, [students]);

  // Gender Breakdown
  const genderStats = useMemo(() => {
    let boys = 0;
    let girls = 0;
    students.forEach(s => {
      const isGirl = (s.gender || '').toLowerCase().startsWith('f');
      if (isGirl) girls++;
      else boys++;
    });
    const total = students.length || 1;
    return {
      boys,
      girls,
      totalStudents: students.length,
      boysPct: Math.round((boys / total) * 100),
      girlsPct: Math.round((girls / total) * 100)
    };
  }, [students]);

  const availableTeachers = teachers.filter(t => !t.excludeInvigilation).length;
  const excludedTeachers = teachers.filter(t => t.excludeInvigilation).length;

  // Filtered Students according to Level Switcher
  const filteredStudents = useMemo(() => {
    if (activeLevelFilter === 'PRIMARY') {
      return students.filter(s => s.level === 'PRIMARY' || PRIMARY_CLASSES.some(c => c.toLowerCase() === (s.className || '').toLowerCase()));
    }
    if (activeLevelFilter === 'PRE_PRIMARY') {
      return students.filter(s => s.level === 'PRE_PRIMARY' || NURSERY_CLASSES.some(c => c.toLowerCase() === (s.className || '').toLowerCase()));
    }
    if (activeLevelFilter === 'SECONDARY') {
      return students.filter(s => s.level === 'CSEE' || s.level === 'ACSEE' || (s.className || '').startsWith('Form'));
    }
    return students;
  }, [students, activeLevelFilter]);

  // Class distribution for filtered view
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      if (s.className) {
        counts[s.className] = (counts[s.className] || 0) + 1;
      }
    });
    return counts;
  }, [filteredStudents]);

  // Extract and sort all active class names
  const activeClassList = useMemo(() => {
    const presentClasses = Object.keys(classCounts);
    if (presentClasses.length > 0) {
      return presentClasses.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    if (activeLevelFilter === 'PRIMARY') return PRIMARY_CLASSES;
    if (activeLevelFilter === 'PRE_PRIMARY') return NURSERY_CLASSES;
    return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'];
  }, [classCounts, activeLevelFilter]);

  const maxClassCount = Math.max(...Object.values(classCounts), 1);

  // Subject popularity
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      (s.subjects || []).forEach(sub => {
        counts[sub] = (counts[sub] || 0) + 1;
      });
    });
    return counts;
  }, [students]);

  const sortedSubjects = useMemo(() => {
    return Object.entries(subjectCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [subjectCounts]);

  const maxSubCount = Math.max(...sortedSubjects.map(s => s[1]), 1);

  const handleNavigate = (viewId: string) => {
    if (onSelectView) {
      onSelectView(viewId);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Toast Notification */}
      {syncToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{syncToast}</span>
          </div>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="relative bg-gradient-to-r from-[#0f2948] via-[#1a3d68] to-[#1f4d8b] text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-white/15 backdrop-blur-md text-blue-200 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                ACADEMIC YEAR 2026 • TERM 1
              </span>
              {isCloudSynced && (
                <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  REAL-TIME SYNC ACTIVE
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {schoolInfo?.name || 'HABY EDU PRO SCHOOL'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 font-medium max-w-2xl">
              Mfumo Kamili wa Usimamizi wa Taaluma, Usajili wa Wanafunzi, Uwekaji wa Matokeo, Ratiba za Mitihani, Sitting Plans na Michango ya Shule.
            </p>
          </div>

          {/* Sync & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onForceRefreshSync && (
              <button
                type="button"
                onClick={onForceRefreshSync}
                disabled={isSyncing}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-md shadow-sm"
                title="Refresh and sync data from cloud"
              >
                <RefreshCw className={`w-4 h-4 text-amber-300 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Data'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Shortcuts Bar */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleNavigate('students')}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl text-left transition group cursor-pointer flex items-center gap-3"
          >
            <div className="p-2.5 bg-blue-500/30 text-blue-200 rounded-xl group-hover:scale-110 transition">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">+ Usajili Mpya</span>
              <span className="text-[9px] text-blue-200 font-semibold block truncate">Wanafunzi</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('markentry')}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl text-left transition group cursor-pointer flex items-center gap-3"
          >
            <div className="p-2.5 bg-emerald-500/30 text-emerald-200 rounded-xl group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">+ Weka Matokeo</span>
              <span className="text-[9px] text-emerald-200 font-semibold block truncate">Mark Entry</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('finance')}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl text-left transition group cursor-pointer flex items-center gap-3"
          >
            <div className="p-2.5 bg-amber-500/30 text-amber-200 rounded-xl group-hover:scale-110 transition">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">+ Michango / Ada</span>
              <span className="text-[9px] text-amber-200 font-semibold block truncate">SaaS Finance</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('sittingplan')}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl text-left transition group cursor-pointer flex items-center gap-3"
          >
            <div className="p-2.5 bg-sky-500/30 text-sky-200 rounded-xl group-hover:scale-110 transition">
              <Grid className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">+ Sitting Plan</span>
              <span className="text-[9px] text-sky-200 font-semibold block truncate">Exam Desks</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('sms')}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-2xl text-left transition group cursor-pointer flex items-center gap-3 col-span-2 sm:col-span-1"
          >
            <div className="p-2.5 bg-purple-500/30 text-purple-200 rounded-xl group-hover:scale-110 transition">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">+ Tuma SMS</span>
              <span className="text-[9px] text-purple-200 font-semibold block truncate">Parent Notifications</span>
            </div>
          </button>
        </div>
      </div>

      {/* Academic Overview Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Total Students", value: students.length, icon: Users, color: "text-blue-600 bg-blue-50", action: () => handleNavigate('students') },
          { title: "Active Teaching Staff", value: teachers.length, icon: GraduationCap, color: "text-emerald-600 bg-emerald-50", action: () => handleNavigate('teachers') },
          { title: "Pending Exam Records", value: 0, icon: FileText, color: "text-amber-600 bg-amber-50", action: () => handleNavigate('results') }
        ].map((card, idx) => (
          <button key={idx} onClick={card.action} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer text-left">
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
          </button>
        ))}
      </div>

      {/* Main Executive Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Enrolled Students & Gender */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              Enrolment
            </span>
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-slate-900">{students.length}</div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Wanafunzi Wote Waliosajiliwa</div>
          </div>

          {/* Gender Progress Bar */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-blue-700">Wavulana: {genderStats.boys} ({genderStats.boysPct}%)</span>
              <span className="text-rose-600">Wasichana: {genderStats.girls} ({genderStats.girlsPct}%)</span>
            </div>
            <div className="h-2.5 bg-rose-100 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${genderStats.boysPct}%` }} 
                className="h-full bg-blue-600 rounded-l-full transition-all duration-500" 
              />
              <div 
                style={{ width: `${genderStats.girlsPct}%` }} 
                className="h-full bg-rose-500 rounded-r-full transition-all duration-500" 
              />
            </div>
          </div>
        </div>

        {/* Card 2: Faculty & Staff */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              Faculty & Staff
            </span>
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-slate-900">{teachers.length}</div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Jumla ya Walimu na Watumishi</div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {availableTeachers} Active Invigilators
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('teachers')}
              className="text-blue-600 hover:underline text-[10px] font-black uppercase flex items-center"
            >
              Tazama <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Examinations & Assessments */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
              Assessments
            </span>
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-slate-900">{exams.length}</div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Mitihani Iliyowekwa Kwenye Mfumo</div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-amber-700 font-semibold">
              {sessions.length} Exam Rooms Configured
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('results')}
              className="text-blue-600 hover:underline text-[10px] font-black uppercase flex items-center"
            >
              Matokeo <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: SaaS Finance & Michango */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
              Financial Ledger
            </span>
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-slate-900">SaaS Finance</div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">Usimamizi wa Ada na Michango</div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-purple-700">
              Dynamic Contributions
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('finance')}
              className="text-purple-600 hover:underline text-[10px] font-black uppercase flex items-center"
            >
              Ingia Finance <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* MY REMEDIAL TIMETABLE SECTION (Class & Teacher Personalized View) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">My Remedial Timetable (Ratiba ya Masomo ya Ziada)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200">
                  {remedialEntries.length} Sessions
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tazama na uchapishe ratiba ya masomo ya jioni, asubuhi na wikendi kulingana na darasa au mwalimu husika.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRemedialMode('STUDENT')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  remedialMode === 'STUDENT' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mwanafunzi (Class)
              </button>
              <button
                type="button"
                onClick={() => setRemedialMode('TEACHER')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  remedialMode === 'TEACHER' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mwalimu (Teacher)
              </button>
              <button
                type="button"
                onClick={() => setRemedialMode('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  remedialMode === 'ALL' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yote
              </button>
            </div>

            {/* Print / Export Button */}
            <button
              type="button"
              onClick={() => {
                const targetEntries = remedialMode === 'STUDENT' 
                  ? remedialEntries.filter(e => isSameClass(e.class_name, selectedRemedialClass))
                  : displayedRemedialSessions;
                exportRemedialTimetablePDF({
                  entries: targetEntries.length > 0 ? targetEntries : remedialEntries,
                  schoolInfo,
                  className: selectedRemedialClass,
                  streamName: selectedRemedialStream,
                  academicYear: new Date().getFullYear().toString()
                });
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
              <span>Print PDF</span>
            </button>

            {/* Go to Manager Button */}
            <button
              type="button"
              onClick={() => handleNavigate('remedialtimetable')}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Panga Ratiba Mpya</span>
            </button>
          </div>
        </div>

        {/* Dynamic Selector Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
          {remedialMode === 'STUDENT' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Darasa:</span>
                <select
                  value={selectedRemedialClass}
                  onChange={e => setSelectedRemedialClass(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <optgroup label="Pre-Primary">
                    {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Primary School">
                    {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Secondary School">
                    {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Mkondo:</span>
                <select
                  value={selectedRemedialStream}
                  onChange={e => setSelectedRemedialStream(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="ALL">Mikondo Yote (A, B, C, D)</option>
                  <option value="A">Stream A</option>
                  <option value="B">Stream B</option>
                  <option value="C">Stream C</option>
                  <option value="D">Stream D</option>
                </select>
              </div>
            </>
          )}

          {remedialMode === 'TEACHER' && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">Mwalimu:</span>
              <select
                value={selectedRemedialTeacher}
                onChange={e => setSelectedRemedialTeacher(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
              >
                <option value="">-- Walimu Wote --</option>
                {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div className="ml-auto text-slate-500 font-bold text-[11px]">
            Inaonyesha vipindi {displayedRemedialSessions.length} kati ya {remedialEntries.length}
          </div>
        </div>

        {/* Sessions Grid */}
        {displayedRemedialSessions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-xs">Hakuna vipindi vya remedial vilivyopangwa kwa uteuzi huu.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Bonyeza &ldquo;Panga Ratiba Mpya&rdquo; kuweka kipindi cha darasa hili.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedRemedialSessions.map((session, idx) => (
              <div
                key={session.id || idx}
                className="p-4 bg-slate-50/70 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl transition space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-black uppercase rounded-md">
                    {session.day_of_week} {session.date ? `• ${session.date}` : ''}
                  </span>
                  <span className="text-[11px] font-mono font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {session.start_time && session.end_time ? `${session.start_time} - ${session.end_time}` : session.period_time}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-blue-700 transition flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{session.subject}</span>
                  </h4>
                  <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5 mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Mwl. {session.teacher_name}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded">
                    {session.class_name} {session.stream === 'All Streams' ? '(Mikondo Yote)' : `(${session.stream})`}
                  </span>
                  <span>{session.room || `${session.class_name} Room`}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Level Summary Badges Bar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-[#1f4d8b]" />
            <h3 className="text-sm font-black text-slate-900">Mgawanyo wa Wanafunzi Kulingana na Ngazi za Elimu</h3>
          </div>

          {/* Level Switcher Filter */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveLevelFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeLevelFilter === 'ALL'
                  ? 'bg-[#1f4d8b] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Madarasa Yote ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLevelFilter('PRIMARY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeLevelFilter === 'PRIMARY'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Msingi (Std 1 - 7) ({primaryStudents})
            </button>
            <button
              type="button"
              onClick={() => setActiveLevelFilter('PRE_PRIMARY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeLevelFilter === 'PRE_PRIMARY'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awali / Nursery ({prePrimaryStudents})
            </button>
            <button
              type="button"
              onClick={() => setActiveLevelFilter('SECONDARY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeLevelFilter === 'SECONDARY'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sekondari ({cseeStudents + acseeStudents})
            </button>
          </div>
        </div>

        {/* Level Badges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase text-emerald-700 block">Shule ya Msingi (Std 1-7)</span>
            <span className="text-2xl font-black text-emerald-950 mt-1 block">{primaryStudents}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">Wanafunzi Enrolled</span>
          </div>

          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase text-purple-700 block">Elimu ya Awali / Nursery</span>
            <span className="text-2xl font-black text-purple-950 mt-1 block">{prePrimaryStudents}</span>
            <span className="text-[10px] text-purple-600 font-semibold block">Chekechea / Pre-Unit</span>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase text-blue-700 block">O-Level (Form 1 - 4)</span>
            <span className="text-2xl font-black text-blue-950 mt-1 block">{cseeStudents}</span>
            <span className="text-[10px] text-blue-600 font-semibold block">CSEE Candidates</span>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase text-amber-700 block">A-Level (Form 5 - 6)</span>
            <span className="text-2xl font-black text-amber-950 mt-1 block">{acseeStudents}</span>
            <span className="text-[10px] text-amber-600 font-semibold block">ACSEE Candidates</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Heatmap */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 lg:col-span-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <span>Productivity Heatmap (Last 30 Days)</span>
          </h3>
          <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5">
            {activityHeatmap.map((day, i) => (
              <div 
                key={i} 
                className={`w-full aspect-square rounded-md ${day.intensity} transition-all hover:scale-110 cursor-pointer`}
                title={`${format(day.date, 'MMM dd')}: ${day.count} activities`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-2">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-slate-100 rounded-sm" />
              <div className="w-3 h-3 bg-blue-200 rounded-sm" />
              <div className="w-3 h-3 bg-blue-400 rounded-sm" />
              <div className="w-3 h-3 bg-blue-600 rounded-sm" />
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Class Enrollment Bar Chart */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Usajili wa Wanafunzi kwa Kila Darasa</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              {activeClassList.length} Active Classes
            </span>
          </div>

          <div className="h-60 flex items-end justify-around gap-2 pt-8 px-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 overflow-x-auto">
            {activeClassList.map(className => {
              const count = classCounts[className] || 0;
              const heightPct = Math.max((count / maxClassCount) * 100, 10);
              return (
                <div key={className} className="flex-1 min-w-[36px] flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-black text-slate-700 mb-1 group-hover:scale-125 transition">{count}</span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[38px] bg-gradient-to-t from-[#1f4d8b] to-blue-500 rounded-t-xl transition-all duration-300 shadow-xs group-hover:from-blue-600 group-hover:to-indigo-500"
                  />
                  <span className="text-[9px] font-extrabold text-slate-700 mt-2 truncate w-full text-center" title={className}>
                    {className}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Recent Activity</span>
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={activitySearchQuery}
                  onChange={(e) => setActivitySearchQuery(e.target.value)}
                  className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded-lg pl-7 pr-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 w-24"
                />
              </div>
              <select
                value={activityCategoryFilter}
                onChange={(e) => setActivityCategoryFilter(e.target.value as any)}
                className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="exams">Exams</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Hakuna shughuli za hivi karibuni.</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg h-fit">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{log.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{log.description}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Trends Chart */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4 lg:col-span-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Activity Trends (Last 7 Days)</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Quick Hub Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => handleNavigate('attendance')}
          className="p-4 bg-white border border-slate-200/80 hover:border-blue-400 rounded-3xl text-left shadow-2xs hover:shadow-sm transition cursor-pointer group"
        >
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl w-fit group-hover:scale-110 transition">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-black text-slate-900 mt-3">Mahudhurio</h4>
          <p className="text-[10px] text-slate-500">Daily Roll Call & Period Tracking</p>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('timetable')}
          className="p-4 bg-white border border-slate-200/80 hover:border-blue-400 rounded-3xl text-left shadow-2xs hover:shadow-sm transition cursor-pointer group"
        >
          <div className="p-2.5 bg-blue-100 text-blue-800 rounded-2xl w-fit group-hover:scale-110 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-black text-slate-900 mt-3">Ratiba ya Shule</h4>
          <p className="text-[10px] text-slate-500">Master Class & Teacher Timetable</p>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('schemes')}
          className="p-4 bg-white border border-slate-200/80 hover:border-blue-400 rounded-3xl text-left shadow-2xs hover:shadow-sm transition cursor-pointer group"
        >
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl w-fit group-hover:scale-110 transition">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-black text-slate-900 mt-3">Scheme of Work</h4>
          <p className="text-[10px] text-slate-500">Mipango na Maandalio ya Masomo</p>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('studentid')}
          className="p-4 bg-white border border-slate-200/80 hover:border-blue-400 rounded-3xl text-left shadow-2xs hover:shadow-sm transition cursor-pointer group"
        >
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-2xl w-fit group-hover:scale-110 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-black text-slate-900 mt-3">Vitambulisho</h4>
          <p className="text-[10px] text-slate-500">Student ID Card Generator</p>
        </button>
      </div>

      {/* Official Technical Support & Provider Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 -mr-32 -mt-32 bg-blue-600/15 rounded-full blur-3xl group-hover:bg-blue-600/25 transition-all duration-700" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20 shrink-0">
              <HabyEduProLogo variant="icon" size="md" className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800">
                  Official System Developer
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SLA Active
                </span>
              </div>
              <p className="text-xl font-black text-white mt-1">Mwalimu Habibu Akida</p>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 font-mono mt-1">
                <span className="text-slate-400">HABY EDU PRO v3.0</span>
                <span className="text-slate-600">•</span>
                <a href="tel:+255717616343" className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1">
                  <span>📞 +255 717 616 343</span>
                </a>
                <span className="text-slate-600">•</span>
                <a href="mailto:habibuakida@gmail.com" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <span>✉️ habibuakida@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="tel:+255717616343"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>+255 717 616 343</span>
            </a>
            <a 
              href="mailto:habibuakida@gmail.com"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>Msaada wa Moja kwa Moja</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
