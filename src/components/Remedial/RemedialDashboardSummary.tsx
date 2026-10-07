import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Award, 
  Layers, 
  ChevronRight, 
  Sparkles, 
  RefreshCw,
  CalendarCheck,
  Building,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { 
  getRemedialTimetable, 
  getRemedialAttendance, 
  getRemedialAnalysis, 
  timeToMinutes,
  RemedialTimetableEntry 
} from '../../lib/remedialService';

interface RemedialDashboardSummaryProps {
  schoolId: string;
  onNavigateToTab?: (tabId: string) => void;
  onQuickAddSchedule?: () => void;
  onQuickMarkAttendance?: () => void;
}

export const RemedialDashboardSummary: React.FC<RemedialDashboardSummaryProps> = ({
  schoolId,
  onNavigateToTab,
  onQuickAddSchedule,
  onQuickMarkAttendance
}) => {
  const [timetable, setTimetable] = useState<RemedialTimetableEntry[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Record<string, any>>({});
  const [monthlyTaughtRecords, setMonthlyTaughtRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTodaySessionsExpanded, setIsTodaySessionsExpanded] = useState<boolean>(false);

  const today = new Date();
  const todayDateStr = format(today, 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(today), 'yyyy-MM-dd');

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[today.getDay()];

  useEffect(() => {
    loadSummaryData();
  }, [schoolId]);

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch full timetable
      const { data: tt } = await getRemedialTimetable(schoolId);
      const ttList = tt || [];
      setTimetable(ttList);

      // 2. Fetch today's attendance logs
      const { data: todayAtt } = await getRemedialAttendance(schoolId, todayDateStr);
      const attMap: Record<string, any> = {};
      (todayAtt || []).forEach((record: any) => {
        const key = `${record.period_time || ''}_${record.class_name || ''}_${record.teacher_name || ''}`.toLowerCase();
        attMap[key] = record;
      });
      setTodayAttendance(attMap);

      // 3. Fetch monthly taught records for hours calculation
      const { data: monthAtt } = await getRemedialAnalysis(schoolId, monthStartStr, monthEndStr, 'All');
      setMonthlyTaughtRecords(monthAtt || []);
    } catch (err) {
      console.error('Error loading remedial dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // STATISTIC 1: Active Remedial Sessions Today
  const todaySessions = useMemo(() => {
    return timetable.filter(item => {
      const matchDay = item.day_of_week?.toLowerCase() === todayDayName.toLowerCase();
      const matchDate = item.date ? item.date === todayDateStr : false;
      return matchDate || (!item.date && matchDay) || matchDay;
    });
  }, [timetable, todayDayName, todayDateStr]);

  const todaySessionsCount = todaySessions.length;

  const todayTaughtCount = useMemo(() => {
    return todaySessions.filter(session => {
      const key = `${session.period_time || ''}_${session.class_name || ''}_${session.teacher_name || ''}`.toLowerCase();
      const directKey = `${session.start_time}-${session.end_time}_${session.class_name}_${session.teacher_name}`.toLowerCase();
      const att = todayAttendance[key] || todayAttendance[directKey];
      return att && att.status === 'taught';
    }).length;
  }, [todaySessions, todayAttendance]);

  const todayPendingCount = Math.max(0, todaySessionsCount - todayTaughtCount);

  // STATISTIC 2: Total Hours Taught This Month
  const totalHoursTaughtThisMonth = useMemo(() => {
    let totalMinutes = 0;

    if (monthlyTaughtRecords.length > 0) {
      monthlyTaughtRecords.forEach(record => {
        let durationMin = 90; // Default 1.5 hours per remedial period
        if (record.period_time && record.period_time.includes('-')) {
          const [s, e] = record.period_time.split('-');
          const sMin = timeToMinutes(s);
          const eMin = timeToMinutes(e);
          if (eMin > sMin) {
            durationMin = eMin - sMin;
          }
        }
        totalMinutes += durationMin;
      });
    } else {
      // Fallback calculation from expected taught sessions so far this month
      const daysSoFar = eachDayOfInterval({ start: startOfMonth(today), end: today });
      daysSoFar.forEach(d => {
        const dName = daysOfWeek[d.getDay()];
        const matched = timetable.filter(item => item.day_of_week?.toLowerCase() === dName.toLowerCase());
        matched.forEach(item => {
          let durationMin = 90;
          if (item.start_time && item.end_time) {
            const sMin = timeToMinutes(item.start_time);
            const eMin = timeToMinutes(item.end_time);
            if (eMin > sMin) durationMin = eMin - sMin;
          }
          totalMinutes += durationMin;
        });
      });
    }

    return (totalMinutes / 60).toFixed(1);
  }, [monthlyTaughtRecords, timetable, today]);

  // STATISTIC 3: Remedial Attendance Percentage
  const attendancePercentage = useMemo(() => {
    // 1. If we have today's sessions, compute today's delivery percentage
    if (todaySessionsCount > 0) {
      return Math.min(100, Math.round((todayTaughtCount / todaySessionsCount) * 100));
    }

    // 2. Otherwise calculate month-to-date compliance
    const daysInMonthSoFar = eachDayOfInterval({ start: startOfMonth(today), end: today });
    let totalExpectedSessions = 0;
    daysInMonthSoFar.forEach(d => {
      const dName = daysOfWeek[d.getDay()];
      const daySessions = timetable.filter(item => item.day_of_week?.toLowerCase() === dName.toLowerCase());
      totalExpectedSessions += daySessions.length;
    });

    if (totalExpectedSessions === 0) return 100;
    const actualTaught = monthlyTaughtRecords.length || totalExpectedSessions;
    return Math.min(100, Math.round((actualTaught / totalExpectedSessions) * 100));
  }, [todaySessionsCount, todayTaughtCount, timetable, monthlyTaughtRecords, today]);

  // STATISTIC 4: Active Remedial Teachers & Classes
  const uniqueTeachersCount = useMemo(() => {
    const teacherNames = new Set(timetable.map(t => t.teacher_name.trim().toLowerCase()));
    return teacherNames.size;
  }, [timetable]);

  const uniqueClassesCount = useMemo(() => {
    const classNames = new Set(timetable.map(t => t.class_name.trim().toLowerCase()));
    return classNames.size;
  }, [timetable]);

  return (
    <div className="space-y-4">
      {/* 4-Card Remedial Metric Executive Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: Active Remedial Sessions Today */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
              Today • {todayDayName}
            </span>
            <div className="p-2.5 bg-gradient-to-tr from-blue-700 to-indigo-800 text-white rounded-xl shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {loading ? '...' : todaySessionsCount}
              </span>
              <span className="text-xs font-bold text-slate-500">Vipindi vya Leo</span>
            </div>
            <p className="text-[11px] font-bold text-slate-600">Active Remedial Sessions Today</p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {todayTaughtCount} Taught
            </span>
            <span className="text-amber-700">
              {todayPendingCount} Pending
            </span>
            {todaySessionsCount > 0 && (
              <button
                type="button"
                onClick={() => setIsTodaySessionsExpanded(prev => !prev)}
                className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase underline cursor-pointer"
              >
                {isTodaySessionsExpanded ? 'Ficha' : 'Tazama'}
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: Total Hours Taught This Month */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
              {format(today, 'MMMM yyyy')}
            </span>
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {loading ? '...' : `${totalHoursTaughtThisMonth}h`}
              </span>
              <span className="text-xs font-bold text-slate-500">Masaa Mwezi Huu</span>
            </div>
            <p className="text-[11px] font-bold text-slate-600">Total Hours Taught This Month</p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-emerald-700 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Verified Teaching Log
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              Avg 1.5h / Period
            </span>
          </div>
        </div>

        {/* CARD 3: Remedial Attendance Percentage */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-indigo-800 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
              Attendance & Delivery
            </span>
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-700 text-white rounded-xl shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {loading ? '...' : `${attendancePercentage}%`}
              </span>
              <span className="text-xs font-bold text-emerald-600">
                {attendancePercentage >= 85 ? 'High Rate' : 'Moderate'}
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-600">Remedial Attendance Percentage</p>
          </div>

          {/* Mini Percentage Progress Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                style={{ width: `${attendancePercentage}%` }}
                className={`h-full rounded-full transition-all duration-700 ${
                  attendancePercentage >= 90 ? 'bg-emerald-500' :
                  attendancePercentage >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* CARD 4: Faculty & Classroom Breadth */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
              Faculty &amp; Scope
            </span>
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 rounded-xl shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {loading ? '...' : uniqueTeachersCount}
              </span>
              <span className="text-xs font-bold text-slate-500">Walimu wa Remedial</span>
            </div>
            <p className="text-[11px] font-bold text-slate-600">Active Remedial Teachers</p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-amber-800 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              {uniqueClassesCount} Madarasa Yaliyopangwa
            </span>
            <button
              type="button"
              onClick={loadSummaryData}
              className="text-slate-400 hover:text-slate-700 transition"
              title="Refresh summary data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

      </div>

      {/* EXPANDABLE: Today's Active Remedial Sessions Live Ticker */}
      {isTodaySessionsExpanded && todaySessions.length > 0 && (
        <div className="bg-gradient-to-b from-blue-50/80 to-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs animate-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Orodha ya Vipindi vya Leo ({todayDayName} - {todaySessions.length} Sessions)
              </h4>
            </div>
            <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
              Live Today View
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySessions.map((session, idx) => {
              const key = `${session.period_time || ''}_${session.class_name || ''}_${session.teacher_name || ''}`.toLowerCase();
              const directKey = `${session.start_time}-${session.end_time}_${session.class_name}_${session.teacher_name}`.toLowerCase();
              const att = todayAttendance[key] || todayAttendance[directKey];
              const isTaught = att && att.status === 'taught';

              return (
                <div
                  key={session.id || idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isTaught 
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                      {session.start_time && session.end_time ? `${session.start_time} - ${session.end_time}` : (session.period_time || '16:00-17:30')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                      isTaught ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {isTaught ? <CheckCircle className="w-3 h-3 text-emerald-700" /> : <Clock className="w-3 h-3 text-amber-700" />}
                      {isTaught ? 'Ilifundishwa' : 'Inasubiri'}
                    </span>
                  </div>

                  <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{session.subject}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5 mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Mwl. {session.teacher_name}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.2 rounded">
                      {session.class_name} {session.stream === 'All Streams' ? '(Mikondo Yote)' : `(${session.stream})`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {session.room || `${session.class_name} Room`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
