import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  QrCode, 
  User, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Users, 
  Sparkles, 
  Check, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Student, SchoolInfo, UserAccount } from '../../types';
import { StudentQrScannerModal } from '../Students/StudentQrScannerModal';

interface AttendanceHistoryDashboardProps {
  students: Student[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  onSaveDailyAttendance?: (date: string, records: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>) => void;
  onNavigateToDiscipline?: (student?: Student) => void;
  onNavigateToResults?: () => void;
}

export const AttendanceHistoryDashboard: React.FC<AttendanceHistoryDashboardProps> = ({
  students,
  schoolInfo,
  currentUser,
  dailyAttendance = {},
  onSaveDailyAttendance,
  onNavigateToDiscipline,
  onNavigateToResults
}) => {
  // Calendar navigation state (Year and Month)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<string>('all');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'individual' | 'class_overview'>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(() => {
    return students.length > 0 ? students[0].id : 1;
  });
  const [selectedDayDetailDate, setSelectedDayDetailDate] = useState<string | null>(null);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Get days in current month
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  // Filter students by class & stream
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === 'all' || s.className.toLowerCase() === selectedClass.toLowerCase();
      const matchStream = selectedStream === 'all' || 
        (s.stream ? s.stream.toUpperCase().includes(selectedStream.toUpperCase()) : true);
      const matchSearch = !searchStudentQuery || 
        s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchStudentQuery.toLowerCase());
      return matchClass && matchStream && matchSearch;
    });
  }, [students, selectedClass, selectedStream, searchStudentQuery]);

  // Active selected student
  const activeStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || filteredStudents[0] || students[0] || null;
  }, [students, selectedStudentId, filteredStudents]);

  // Available unique classes and streams
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.className) set.add(s.className); });
    return Array.from(set).sort();
  }, [students]);

  const streamList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    ['A', 'B', 'C', 'D'].forEach(st => set.add(st));
    return Array.from(set).sort();
  }, [students]);

  // Calculate monthly stats for the active student
  const studentMonthlyStats = useMemo(() => {
    if (!activeStudent) return { present: 0, absent: 0, late: 0, excused: 0, totalLogged: 0, rate: 0 };

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const dayLog = dailyAttendance[dateKey];
      if (dayLog && dayLog[activeStudent.id]) {
        const status = dayLog[activeStudent.id];
        if (status === 'PRESENT') present++;
        else if (status === 'ABSENT') absent++;
        else if (status === 'LATE') late++;
        else if (status === 'EXCUSED') excused++;
      }
    }

    const totalLogged = present + absent + late + excused;
    const rate = totalLogged > 0 ? Math.round(((present + late * 0.8) / totalLogged) * 100) : 100;

    return { present, absent, late, excused, totalLogged, rate };
  }, [activeStudent, dailyAttendance, daysInMonth, month, year]);

  // Calculate overall student absence across all time for 3-day absence auto-flagging
  const totalAllTimeAbsences = useMemo(() => {
    if (!activeStudent) return 0;
    let count = 0;
    Object.values(dailyAttendance).forEach(dayLog => {
      if (dayLog && dayLog[activeStudent.id] === 'ABSENT') {
        count++;
      }
    });
    return count;
  }, [activeStudent, dailyAttendance]);

  // Calculate class-wide summary per date in this month
  const classDailySummary = useMemo(() => {
    const summaryMap: Record<string, { present: number; absent: number; late: number; excused: number; total: number; rate: number }> = {};

    const targetStudents = selectedClass === 'all' 
      ? students 
      : students.filter(s => s.className.toLowerCase() === selectedClass.toLowerCase());

    const totalStudentsInCohort = targetStudents.length;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const dayLog = dailyAttendance[dateKey];
      let p = 0, a = 0, l = 0, e = 0;

      if (dayLog) {
        targetStudents.forEach(st => {
          const stStatus = dayLog[st.id];
          if (stStatus === 'PRESENT') p++;
          else if (stStatus === 'ABSENT') a++;
          else if (stStatus === 'LATE') l++;
          else if (stStatus === 'EXCUSED') e++;
        });
      }

      const totalRecorded = p + a + l + e;
      const rate = totalRecorded > 0 ? Math.round((p / totalRecorded) * 100) : 0;

      summaryMap[dateKey] = {
        present: p,
        absent: a,
        late: l,
        excused: e,
        total: totalRecorded,
        rate
      };
    }

    return summaryMap;
  }, [dailyAttendance, daysInMonth, month, year, selectedClass, students]);

  // Generate calendar days grid (including padding cells)
  const calendarCells = useMemo(() => {
    const cells: Array<{
      dayNumber: number | null;
      dateKey: string | null;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    // Pre-month empty padding
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dayNumber: null, dateKey: null, isWeekend: false, isToday: false });
    }

    const todayDate = new Date();
    const todayDateKey = todayDate.toISOString().split('T')[0];

    // Actual month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      
      const dayOfWeek = new Date(year, month, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateKey === todayDateKey;

      cells.push({
        dayNumber: day,
        dateKey,
        isWeekend,
        isToday
      });
    }

    return cells;
  }, [firstDayOfWeek, daysInMonth, year, month]);

  // Handle printing the attendance calendar register
  const handlePrintCalendar = () => {
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!activeStudent) return;
    let csv = `Date,Student Name,Reg No,Class,Stream,Attendance Status,Day of Week\n`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const dayName = new Date(year, month, day).toLocaleDateString('default', { weekday: 'long' });

      const status = dailyAttendance[dateKey]?.[activeStudent.id] || 'NOT_LOGGED';
      csv += `${dateKey},"${activeStudent.name}",${activeStudent.regNo},"${activeStudent.className}","${activeStudent.stream || 'A'}",${status},${dayName}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_History_${activeStudent.name.replace(/\s+/g, '_')}_${monthName}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast QR Scanner Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
              Attendance History &amp; QR Activity Hub
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">
              Live Real-time Log
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Calendar History &amp; Attendance Analytics
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            View day-by-day attendance trends with color-coded markers for Present, Absent, and Late check-ins derived from instant QR code scans and daily roll-calls.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <QrCode className="w-4 h-4 text-emerald-200" />
            <span>Scan QR Code Badges</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintCalendar}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Print Calendar"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* 3-Day Absent Auto-Flagging Banner (If Active Student >= 3 absences) */}
      {activeStudent && totalAllTimeAbsences >= 3 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shrink-0">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded border border-rose-300">
                  Critical Attendance Flag
                </span>
                <span className="text-xs font-bold text-slate-600">
                  {activeStudent.name} ({activeStudent.className} - {activeStudent.regNo})
                </span>
              </div>
              <p className="text-xs font-extrabold text-rose-950 mt-1">
                ⚠️ Student has accumulated {totalAllTimeAbsences} unexcused absences. Recommended for Discipline Review or Parent Notification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onNavigateToDiscipline && (
              <button
                type="button"
                onClick={() => onNavigateToDiscipline(activeStudent)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Log Discipline Case</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and View Mode Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('individual')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'individual'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Student Calendar View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('class_overview')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'class_overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Class Heatmap / Overview</span>
          </button>
        </div>

        {/* Center: Month & Year Navigator */}
        <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center px-3 min-w-[140px]">
            <span className="text-xs font-black text-slate-900 uppercase">
              {monthName} {year}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-blue-600 ml-1 cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Right: Cohort Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="all">All Classes</option>
            {classList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedStream}
            onChange={e => setSelectedStream(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="all">All Streams</option>
            {streamList.map(st => (
              <option key={st} value={st}>Stream {st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (When in Individual mode): Student Selector & Quick Profile */}
        {viewMode === 'individual' && (
          <div className="lg:col-span-1 space-y-4">
            {/* Student Search & List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Select Student
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  {filteredStudents.length} Found
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name / Reg No..."
                  value={searchStudentQuery}
                  onChange={e => setSearchStudentQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Student Scrollable List */}
              <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
                {filteredStudents.map(st => {
                  const isSelected = activeStudent?.id === st.id;
                  let stAbsentCount = 0;
                  Object.values(dailyAttendance).forEach(dayLog => {
                    if (dayLog && dayLog[st.id] === 'ABSENT') stAbsentCount++;
                  });

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-extrabold'
                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold truncate">{st.name}</span>
                        {stAbsentCount >= 3 && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-black shrink-0">
                            {stAbsentCount} Abs
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{st.className} {st.stream || ''}</span>
                        <span className="font-mono">{st.regNo}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Student Monthly Summary Card */}
            {activeStudent && (
              <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white/20 flex items-center justify-center font-black text-sm text-white shrink-0">
                    {activeStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{activeStudent.name}</h4>
                    <p className="text-[10px] text-blue-300">{activeStudent.className} • {activeStudent.regNo}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <p className="text-[10px] text-emerald-300 font-bold uppercase">Present</p>
                    <p className="text-base font-black text-emerald-400">{studentMonthlyStats.present}</p>
                  </div>
                  <div className="p-2 bg-white/10 rounded-xl">
                    <p className="text-[10px] text-rose-300 font-bold uppercase">Absent</p>
                    <p className="text-base font-black text-rose-400">{studentMonthlyStats.absent}</p>
                  </div>
                  <div className="p-2 bg-white/10 rounded-xl">
                    <p className="text-[10px] text-amber-300 font-bold uppercase">Late</p>
                    <p className="text-base font-black text-amber-400">{studentMonthlyStats.late}</p>
                  </div>
                  <div className="p-2 bg-white/10 rounded-xl">
                    <p className="text-[10px] text-sky-300 font-bold uppercase">Rate</p>
                    <p className="text-base font-black text-white">{studentMonthlyStats.rate}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right / Main Column: Calendar Grid & Legend */}
        <div className={viewMode === 'individual' ? 'lg:col-span-3 space-y-4' : 'lg:col-span-4 space-y-4'}>
          {/* Calendar Container Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            {/* Calendar Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 uppercase tracking-wide">
                  {viewMode === 'individual' ? `${activeStudent?.name}'s Attendance` : `All Students Attendance - ${selectedClass === 'all' ? 'All Classes' : selectedClass}`}
                </span>
                <span className="text-slate-400 text-xs font-medium">({monthName} {year})</span>
              </div>

              {/* Legend Badges */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Present (🟢)
                </span>
                <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Absent (🔴)
                </span>
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Late (🟡)
                </span>
                <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Excused (🔵)
                </span>
                <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  No Entry / Weekend
                </span>
              </div>
            </div>

            {/* Calendar Day Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500 uppercase tracking-wider py-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                if (!cell.dayNumber || !cell.dateKey) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[85px] sm:min-h-[100px] bg-slate-50/50 rounded-2xl border border-transparent p-2 opacity-30"
                    />
                  );
                }

                // Individual Student Mode
                if (viewMode === 'individual' && activeStudent) {
                  const studentStatus = dailyAttendance[cell.dateKey]?.[activeStudent.id];

                  let cellBg = 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-blue-300';
                  let statusBadge = null;

                  if (studentStatus === 'PRESENT') {
                    cellBg = 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs hover:bg-emerald-100';
                    statusBadge = (
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>PRESENT</span>
                      </div>
                    );
                  } else if (studentStatus === 'ABSENT') {
                    cellBg = 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs hover:bg-rose-100';
                    statusBadge = (
                      <div className="flex items-center gap-1 text-[10px] font-black text-rose-800 bg-rose-200/80 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                        <XCircle className="w-3 h-3 text-rose-700" />
                        <span>ABSENT</span>
                      </div>
                    );
                  } else if (studentStatus === 'LATE') {
                    cellBg = 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs hover:bg-amber-100';
                    statusBadge = (
                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>LATE</span>
                      </div>
                    );
                  } else if (studentStatus === 'EXCUSED') {
                    cellBg = 'bg-sky-50/90 border-sky-300 text-sky-950 shadow-2xs hover:bg-sky-100';
                    statusBadge = (
                      <div className="flex items-center gap-1 text-[10px] font-black text-sky-800 bg-sky-200/80 px-1.5 py-0.5 rounded-md mt-1 w-fit">
                        <Award className="w-3 h-3 text-sky-700" />
                        <span>EXCUSED</span>
                      </div>
                    );
                  } else if (cell.isWeekend) {
                    cellBg = 'bg-slate-100/60 border-slate-200 text-slate-400';
                  }

                  return (
                    <div
                      key={cell.dateKey}
                      onClick={() => setSelectedDayDetailDate(cell.dateKey)}
                      className={`min-h-[85px] sm:min-h-[100px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${cellBg} ${
                        cell.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${cell.isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : ''}`}>
                          {cell.dayNumber}
                        </span>
                        {cell.isToday && (
                          <span className="text-[9px] font-extrabold text-blue-600 uppercase">Today</span>
                        )}
                        {cell.isWeekend && !studentStatus && (
                          <span className="text-[9px] font-bold text-slate-400">Weekend</span>
                        )}
                      </div>

                      <div>
                        {statusBadge}
                      </div>

                      <div className="text-[9px] text-slate-400 text-right">
                        {studentStatus ? 'QR / Logged' : '-'}
                      </div>
                    </div>
                  );
                }

                // Class Heatmap / Overview Mode
                const daySummary = classDailySummary[cell.dateKey] || { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
                const hasEntries = daySummary.total > 0;

                let cellBg = 'bg-slate-50 border-slate-200 text-slate-700';
                if (hasEntries) {
                  if (daySummary.rate >= 90) cellBg = 'bg-emerald-50/80 border-emerald-300 text-emerald-950 hover:bg-emerald-100';
                  else if (daySummary.rate >= 75) cellBg = 'bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100';
                  else cellBg = 'bg-rose-50/80 border-rose-300 text-rose-950 hover:bg-rose-100';
                }

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDayDetailDate(cell.dateKey)}
                    className={`min-h-[85px] sm:min-h-[100px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${cellBg} ${
                      cell.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${cell.isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : ''}`}>
                        {cell.dayNumber}
                      </span>
                      {hasEntries && (
                        <span className="text-[10px] font-black text-slate-900 bg-white/80 px-1.5 rounded border border-slate-200">
                          {daySummary.rate}%
                        </span>
                      )}
                    </div>

                    {hasEntries ? (
                      <div className="space-y-1 my-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-emerald-700 font-extrabold">{daySummary.present} P</span>
                          <span className="text-rose-700 font-extrabold">{daySummary.absent} A</span>
                          <span className="text-amber-700 font-extrabold">{daySummary.late} L</span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                          <div style={{ width: `${daySummary.rate}%` }} className="bg-emerald-500 h-full" />
                          <div style={{ width: `${100 - daySummary.rate}%` }} className="bg-rose-500 h-full" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">
                        {cell.isWeekend ? 'Weekend' : 'No entries'}
                      </div>
                    )}

                    <div className="text-[9px] text-slate-400 text-right">
                      {hasEntries ? `${daySummary.total} logged` : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date Detail Drawer / Table when clicked */}
          {selectedDayDetailDate && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-black">
                    Attendance Log for {selectedDayDetailDate}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayDetailDate(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* List students for this date */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {students
                  .filter(st => {
                    const matchClass = selectedClass === 'all' || st.className.toLowerCase() === selectedClass.toLowerCase();
                    return matchClass;
                  })
                  .map(st => {
                    const status = dailyAttendance[selectedDayDetailDate]?.[st.id] || 'NOT_LOGGED';
                    let badge = <span className="text-slate-400 font-medium">No Record</span>;

                    if (status === 'PRESENT') {
                      badge = <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-black border border-emerald-500/30">✓ PRESENT</span>;
                    } else if (status === 'ABSENT') {
                      badge = <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-black border border-rose-500/30">✗ ABSENT</span>;
                    } else if (status === 'LATE') {
                      badge = <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-black border border-amber-500/30">🕒 LATE</span>;
                    } else if (status === 'EXCUSED') {
                      badge = <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded font-black border border-sky-500/30">⭐ EXCUSED</span>;
                    }

                    return (
                      <div key={st.id} className="flex items-center justify-between p-2 bg-slate-800/80 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{st.name}</span>
                          <span className="text-[10px] text-slate-400">({st.className} - {st.regNo})</span>
                        </div>
                        <div>{badge}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Scanner Live Modal */}
      <StudentQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        students={students}
        schoolInfo={schoolInfo}
        onLogAttendance={(studentId, status) => {
          const today = new Date().toISOString().split('T')[0];
          const todayRecords = { ...(dailyAttendance[today] || {}), [studentId]: status };
          if (onSaveDailyAttendance) {
            onSaveDailyAttendance(today, todayRecords);
          }
        }}
        onLogDiscipline={st => {
          setIsQrScannerOpen(false);
          if (onNavigateToDiscipline) onNavigateToDiscipline(st);
        }}
      />
    </div>
  );
};
