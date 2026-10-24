import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Download, 
  Share2, 
  Users, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Filter, 
  Layers, 
  Search, 
  X, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2,
  FileSpreadsheet,
  Building
} from 'lucide-react';
import { InvigilationSession, Teacher, Supervisor, SchoolInfo, UserAccount } from '../../types';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';
import { exportInvigilationTimetableExcel } from '../../utils/timetableExcelExport';

interface InvigilationCalendarViewProps {
  sessions: InvigilationSession[];
  teachers: Teacher[];
  supervisors?: Supervisor[];
  invigilationAssignments: Record<string, number>;
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  onNavigateToInvigilation?: () => void;
  onBackToDashboard?: () => void;
}

const MONTH_NAMES_SW = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK_SW = [
  { short: 'Jpili', full: 'Jumapili', en: 'Sun' },
  { short: 'Jtatu', full: 'Jumatatu', en: 'Mon' },
  { short: 'Jnne', full: 'Jumanne', en: 'Tue' },
  { short: 'Jtano', full: 'Jumatano', en: 'Wed' },
  { short: 'Alh', full: 'Alhamisi', en: 'Thu' },
  { short: 'Ijm', full: 'Ijumaa', en: 'Fri' },
  { short: 'Jmosi', full: 'Jumamosi', en: 'Sat' }
];

export const InvigilationCalendarView: React.FC<InvigilationCalendarViewProps> = ({
  sessions = [],
  teachers = [],
  supervisors = [],
  invigilationAssignments = {},
  schoolInfo,
  currentUser,
  onNavigateToInvigilation,
  onBackToDashboard
}) => {
  // Current view date (year & month)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // If sessions exist, find the first session's date to focus on that month
    if (sessions && sessions.length > 0) {
      for (const s of sessions) {
        const raw = s.rawDate || s.date;
        if (raw) {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            return new Date(d.getFullYear(), d.getMonth(), 1);
          }
        }
      }
    }
    return new Date();
  });

  // Filter state
  const isTeacherRole = currentUser?.role === 'TEACHER' && !currentUser?.isSuperAdmin;
  const initialTeacherId = useMemo(() => {
    if (currentUser?.fullName) {
      const match = teachers.find(t => 
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()) || 
        currentUser.fullName.toLowerCase().includes(t.name.toLowerCase())
      );
      if (match) return match.id;
    }
    return 0; // 0 = all teachers
  }, [currentUser, teachers]);

  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<number>(initialTeacherId);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('ALL');

  // Selected Day Details Modal
  const [inspectedDay, setInspectedDay] = useState<{
    dateStr: string;
    dayNumber: number;
    sessions: InvigilationSession[];
  } | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to normalize session date to YYYY-MM-DD
  const parseSessionDateKey = (s: InvigilationSession): string | null => {
    const raw = s.rawDate || s.date;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Map sessions by date key YYYY-MM-DD
  const sessionsByDateKey = useMemo(() => {
    const map = new Map<string, InvigilationSession[]>();
    sessions.forEach(sess => {
      const key = parseSessionDateKey(sess);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(sess);
    });
    return map;
  }, [sessions]);

  // Calendar Grid Days Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Padding days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from({ length: startingDayOfWeek }, (_, i) => {
    const dayNum = prevMonthLastDay - startingDayOfWeek + i + 1;
    const prevDate = new Date(year, month - 1, dayNum);
    const key = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return {
      dayNumber: dayNum,
      isCurrentMonth: false,
      dateKey: key,
      date: prevDate
    };
  });

  // Current month days
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const d = new Date(year, month, dayNum);
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return {
      dayNumber: dayNum,
      isCurrentMonth: true,
      dateKey: key,
      date: d
    };
  });

  // Suffix padding days from next month to complete the grid (total multiple of 7)
  const totalSoFar = prevMonthDays.length + currentMonthDays.length;
  const remainingCells = totalSoFar % 7 === 0 ? 0 : 7 - (totalSoFar % 7);
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => {
    const dayNum = i + 1;
    const nextDate = new Date(year, month + 1, dayNum);
    const key = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return {
      dayNumber: dayNum,
      isCurrentMonth: false,
      dateKey: key,
      date: nextDate
    };
  });

  const allCalendarCells = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Unique classes across all sessions for filter
  const allClasses = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Check if session matches active filters
  const sessionMatchesFilters = (sess: InvigilationSession): boolean => {
    if (selectedClassFilter !== 'ALL' && sess.className.toLowerCase() !== selectedClassFilter.toLowerCase()) {
      return false;
    }
    if (selectedSessionFilter !== 'ALL' && sess.session !== selectedSessionFilter) {
      return false;
    }
    if (selectedTeacherFilter !== 0) {
      // Check if this teacher is assigned to any room in this session
      let assigned = false;
      for (let r = 0; r < (sess.rooms || 1); r++) {
        if (Number(invigilationAssignments[`${sess.id}_room${r}`]) === Number(selectedTeacherFilter)) {
          assigned = true;
          break;
        }
      }
      if (!assigned) return false;
    }
    return true;
  };

  // Monthly summary metrics for current viewed month
  const monthlyMetrics = useMemo(() => {
    let totalSessions = 0;
    let totalRoomDuties = 0;
    const examDates = new Set<string>();
    const participatingTeachers = new Set<number>();
    let selectedTeacherDuties = 0;

    currentMonthDays.forEach(cell => {
      const cellSessions = sessionsByDateKey.get(cell.dateKey) || [];
      cellSessions.forEach(sess => {
        totalSessions++;
        examDates.add(cell.dateKey);
        const roomCount = sess.rooms || 1;
        totalRoomDuties += roomCount;

        for (let r = 0; r < roomCount; r++) {
          const tid = invigilationAssignments[`${sess.id}_room${r}`];
          if (tid) {
            participatingTeachers.add(tid);
            if (selectedTeacherFilter !== 0 && Number(tid) === Number(selectedTeacherFilter)) {
              selectedTeacherDuties++;
            }
          }
        }
      });
    });

    return {
      totalSessions,
      totalRoomDuties,
      examDaysCount: examDates.size,
      activeTeachersCount: participatingTeachers.size,
      selectedTeacherDuties
    };
  }, [currentMonthDays, sessionsByDateKey, invigilationAssignments, selectedTeacherFilter]);

  // Teacher Map
  const teacherMap = useMemo(() => {
    const map = new Map<number, Teacher>();
    teachers.forEach(t => map.set(t.id, t));
    return map;
  }, [teachers]);

  const selectedTeacherObj = useMemo(() => {
    if (selectedTeacherFilter === 0) return null;
    return teacherMap.get(selectedTeacherFilter) || null;
  }, [selectedTeacherFilter, teacherMap]);

  // Today string for comparison
  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  // WhatsApp share of monthly schedule
  const handleShareWhatsApp = () => {
    const school = schoolInfo?.name || 'HABY EDUPRO ACADEMY';
    const monthLabel = `${MONTH_NAMES_SW[month]} ${year}`;
    let msg = `*${school.toUpperCase()}*\n`;
    msg += `*KALENDA YA USIMAMIZI WA MITIHANI - ${monthLabel.toUpperCase()}*\n`;
    if (selectedTeacherObj) {
      msg += `*Mwalimu:* ${selectedTeacherObj.name} (${selectedTeacherObj.initial})\n`;
      msg += `*Jumla ya Vikao Mwezi Huu:* ${monthlyMetrics.selectedTeacherDuties}\n`;
    } else {
      msg += `*Jumla ya Vikao vya Mitihani:* ${monthlyMetrics.totalSessions}\n`;
      msg += `*Siku za Mitihani:* ${monthlyMetrics.examDaysCount}\n`;
    }
    msg += `------------------------------------\n`;

    currentMonthDays.forEach(cell => {
      const cellSessions = (sessionsByDateKey.get(cell.dateKey) || []).filter(sessionMatchesFilters);
      if (cellSessions.length > 0) {
        msg += `📅 *${cell.date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}*\n`;
        cellSessions.forEach((s, idx) => {
          msg += `  ${idx + 1}. [${s.session}] ${s.subject} (${s.className} ${s.stream || ''})\n`;
          if (selectedTeacherObj) {
            // find which room
            for (let r = 0; r < (s.rooms || 1); r++) {
              if (Number(invigilationAssignments[`${s.id}_room${r}`]) === Number(selectedTeacherObj.id)) {
                msg += `     • Chumba: Room ${r + 1} (${s.time || `${s.start}-${s.end}`})\n`;
              }
            }
          }
        });
        msg += `\n`;
      }
    });

    msg += `Tafadhali zingatia muda na maelekezo ya usimamizi. Kazi njema!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportInvigilationTimetableExcel({
      schoolName: schoolInfo?.name || 'HABY EDUPRO ACADEMY',
      sessions,
      teachers,
      invigilationAssignments,
      schoolInfo
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f2948] via-[#1a3d6d] to-[#0f2948] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider flex items-center gap-1.5 shadow-sm">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-950" />
                KALENDA YA USIMAMIZI • INVIGILATION CALENDAR
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-blue-200 border border-white/15 rounded-full text-[10px] font-bold">
                {schoolInfo?.name || 'HABY EDU PRO ACADEMY'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Kalenda ya Kila Mwezi ya Usimamizi wa Mitihani
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 font-medium max-w-2xl">
              Tazama ratiba ya mitihani ya kila siku kwa mwezi mzima, vyumba vilivyopangwa, na walimu walio zamu kwa kila kikao.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}

            {onNavigateToInvigilation && (
              <button
                type="button"
                onClick={onNavigateToInvigilation}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Moduli ya Usimamizi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Tuma Kalenda ya Mwezi kwenye WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Pakua Excel ya Usimamizi"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Chapa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-xl shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{monthlyMetrics.totalSessions}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vikao Mwezi Huu</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{monthlyMetrics.totalRoomDuties}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vyumba vya Mitihani</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{monthlyMetrics.examDaysCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Siku Zenye Mitihani</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-purple-100 text-purple-800 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {selectedTeacherFilter !== 0 
                ? monthlyMetrics.selectedTeacherDuties
                : monthlyMetrics.activeTeachersCount}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedTeacherFilter !== 0 
                ? `Zamu za ${selectedTeacherObj?.initial || 'Mwalimu'}`
                : 'Wasimamizi Kazini'}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Navigation & Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Month / Year Jump Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-white rounded-lg transition text-slate-700 cursor-pointer"
                title="Mwezi Uliopita (Previous Month)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-4 py-1 font-black text-sm text-slate-900 text-center min-w-[170px]">
                {MONTH_NAMES_SW[month]} {year}
                <span className="block text-[10px] font-semibold text-slate-400">
                  {MONTH_NAMES_EN[month]} {year}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 hover:bg-white rounded-lg transition text-slate-700 cursor-pointer"
                title="Mwezi Ujao (Next Month)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200"
            >
              Leo (Today)
            </button>
          </div>

          {/* Filters Bar: Teacher, Class & Session */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Teacher */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Mwalimu:</label>
              <select
                value={selectedTeacherFilter}
                onChange={e => setSelectedTeacherFilter(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={0}>-- Walimu Wote (All) --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.initial || '--'})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Class */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Darasa:</label>
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Madarasa Yote</option>
                {allClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Session */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Kikao:</label>
              <select
                value={selectedSessionFilter}
                onChange={e => setSelectedSessionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">Vikao Vyote</option>
                <option value="SESSION I">Session I (Asubuhi)</option>
                <option value="SESSION II">Session II (Mchana)</option>
                <option value="SESSION III">Session III (Jioni)</option>
              </select>
            </div>

            {(selectedTeacherFilter !== 0 || selectedClassFilter !== 'ALL' || selectedSessionFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTeacherFilter(0);
                  setSelectedClassFilter('ALL');
                  setSelectedSessionFilter('ALL');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
              >
                Ondoa Vichungi
              </button>
            )}
          </div>
        </div>

        {/* Selected Teacher Focus Alert */}
        {selectedTeacherObj && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Inaangazia ratiba ya: <strong className="text-slate-900">{selectedTeacherObj.name} ({selectedTeacherObj.initial})</strong> • 
                Vipindi vya mwezi huu: <strong>{monthlyMetrics.selectedTeacherDuties} Vikao</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
              Zamu Zilizoangaziwa
            </span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MONTHLY CALENDAR GRID                                    */}
      {/* ======================================================== */}
      <div id="calendar-printable-view" className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {/* Printable Letterhead Header */}
        <div className="hidden print:block p-6 border-b-2 border-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black uppercase text-slate-900">
                {schoolInfo?.name || 'HABY EDUPRO ACADEMY'}
              </h1>
              <p className="text-xs font-bold text-slate-700">
                KALENDA YA USIMAMIZI WA MITIHANI - {MONTH_NAMES_SW[month].toUpperCase()} {year}
              </p>
            </div>
            <div className="text-right text-xs font-mono font-bold text-slate-600">
              Printed: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center font-black text-xs text-slate-700">
          {DAYS_OF_WEEK_SW.map((day, idx) => (
            <div
              key={day.en}
              className={`p-3 border-r border-slate-200 last:border-r-0 ${
                idx === 0 || idx === 6 ? 'bg-slate-200/50 text-slate-600' : ''
              }`}
            >
              <span className="hidden sm:inline">{day.full}</span>
              <span className="sm:hidden">{day.short}</span>
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-[1px]">
          {allCalendarCells.map((cell, idx) => {
            const rawSessions = sessionsByDateKey.get(cell.dateKey) || [];
            const filteredSessions = rawSessions.filter(sessionMatchesFilters);
            const isToday = cell.dateKey === todayKey;

            // Check if selected teacher has duties on this day
            const teacherDutiesOnThisDay = selectedTeacherFilter !== 0
              ? filteredSessions.filter(s => {
                  for (let r = 0; r < (s.rooms || 1); r++) {
                    if (Number(invigilationAssignments[`${s.id}_room${r}`]) === Number(selectedTeacherFilter)) {
                      return true;
                    }
                  }
                  return false;
                })
              : [];

            const hasTeacherDuty = teacherDutiesOnThisDay.length > 0;

            return (
              <div
                key={cell.dateKey || idx}
                onClick={() => {
                  if (rawSessions.length > 0) {
                    setInspectedDay({
                      dateStr: cell.dateKey,
                      dayNumber: cell.dayNumber,
                      sessions: rawSessions
                    });
                  }
                }}
                className={`min-h-[120px] sm:min-h-[140px] p-2 flex flex-col justify-between transition-all relative ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/50 text-slate-400 opacity-60'
                    : isToday
                    ? 'bg-amber-50/30'
                    : hasTeacherDuty
                    ? 'bg-amber-50/50'
                    : 'bg-white'
                } ${
                  rawSessions.length > 0
                    ? 'cursor-pointer hover:bg-blue-50/40'
                    : 'cursor-default'
                }`}
              >
                {/* Cell Header: Day Number & Session Count Badge */}
                <div className="flex items-center justify-between pb-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isToday
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : hasTeacherDuty
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {filteredSessions.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-100 text-blue-900">
                      {filteredSessions.length} {filteredSessions.length === 1 ? 'Exam' : 'Exams'}
                    </span>
                  )}
                </div>

                {/* Sessions in this day */}
                <div className="space-y-1 my-1 flex-1 overflow-hidden">
                  {filteredSessions.slice(0, 3).map((s, sIdx) => {
                    const subCol = getSubjectColor(s.subject);
                    // Check if selected teacher is assigned
                    let assignedRoom = null;
                    if (selectedTeacherFilter !== 0) {
                      for (let r = 0; r < (s.rooms || 1); r++) {
                        if (Number(invigilationAssignments[`${s.id}_room${r}`]) === Number(selectedTeacherFilter)) {
                          assignedRoom = r + 1;
                          break;
                        }
                      }
                    }

                    return (
                      <div
                        key={s.id || sIdx}
                        className={`px-1.5 py-1 rounded-md text-[10px] border leading-tight transition ${
                          assignedRoom
                            ? 'bg-amber-100 border-amber-300 text-amber-950 font-black shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                        title={`${s.session}: ${s.subject} (${s.className} ${s.stream || ''})`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span 
                            style={{ color: subCol.text }} 
                            className="font-bold truncate"
                          >
                            {s.subject}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 shrink-0">
                            {s.className?.replace(/Form\s*/i, 'F').trim()}
                          </span>
                        </div>

                        {assignedRoom ? (
                          <div className="text-[9px] text-amber-800 font-black mt-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5 text-amber-700" />
                            <span>Rm {assignedRoom}</span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-400 truncate mt-0.5">
                            {s.rooms || 1} Rooms
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredSessions.length > 3 && (
                    <div className="text-[10px] font-bold text-blue-700 text-center py-0.5">
                      +{filteredSessions.length - 3} zaidi...
                    </div>
                  )}
                </div>

                {/* Cell Footer note */}
                {hasTeacherDuty && (
                  <div className="pt-1 text-[9px] font-black text-amber-800 flex items-center justify-center gap-1 bg-amber-100/60 rounded py-0.5">
                    <ShieldCheck className="w-3 h-3 text-amber-700" />
                    <span>Zamu Yako ({teacherDutiesOnThisDay.length})</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DAY DETAILS INSPECTOR MODAL                              */}
      {/* ======================================================== */}
      {inspectedDay && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                  {inspectedDay.dayNumber}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Vipindi vya Mtihani - {inspectedDay.dateStr}
                  </h3>
                  <p className="text-xs text-blue-200">
                    Orodha kamili ya vyumba na wasimamizi wa zamu kwa siku hii.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of Sessions */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {inspectedDay.sessions.map((sess, idx) => {
                const subCol = getSubjectColor(sess.subject);
                return (
                  <div
                    key={sess.id || idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                        sess.session === 'SESSION I'
                          ? 'bg-sky-100 text-sky-900'
                          : sess.session === 'SESSION II'
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'bg-purple-100 text-purple-900'
                      }`}>
                        {sess.session}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {sess.time || `${sess.start || ''} - ${sess.end || ''}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          style={{
                            backgroundColor: subCol.bg,
                            color: subCol.text,
                            borderColor: subCol.border
                          }}
                          className="px-2.5 py-1 rounded-lg border text-xs font-black inline-block"
                        >
                          {sess.subject}
                        </span>
                        <div className="text-xs font-bold text-slate-800 mt-1">
                          {sess.className} {sess.stream && sess.stream !== 'ALL' ? `• ${sess.stream}` : ''}
                        </div>
                      </div>

                      <div className="text-right text-xs font-semibold text-slate-500">
                        {sess.rooms || 1} Exam Rooms
                      </div>
                    </div>

                    {/* Rooms & Invigilators Breakdown */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Wasimamizi wa Vyumba (Room Invigilators)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.from({ length: sess.rooms || 1 }).map((_, r) => {
                          const key = `${sess.id}_room${r}`;
                          const tid = invigilationAssignments[key];
                          const teacher = tid ? teacherMap.get(tid) : null;
                          const isHighlighted = selectedTeacherFilter !== 0 && Number(tid) === Number(selectedTeacherFilter);

                          return (
                            <div
                              key={r}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                                isHighlighted
                                  ? 'bg-amber-100 border-amber-300 text-amber-950 font-black'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-bold">Room {r + 1}:</span>
                              <span className={teacher ? 'font-bold text-blue-900' : 'text-slate-400 italic'}>
                                {teacher ? `${teacher.name} (${teacher.initial})` : 'Hajapangiwa'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Jumla ya Vikao: {inspectedDay.sessions.length}
              </span>
              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
