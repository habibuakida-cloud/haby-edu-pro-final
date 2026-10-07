import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, 
  User, 
  Award, 
  CalendarCheck, 
  ShieldAlert, 
  TrendingUp, 
  BookOpen, 
  Phone, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  GraduationCap, 
  BarChart2, 
  PieChart as PieIcon, 
  ShieldCheck,
  Download,
  Check,
  FileText,
  Calendar,
  Building,
  RefreshCw,
  Layers,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { Student, SchoolInfo, DisciplineRecord, ExaminationRecord, TimetableAssignment } from '../../types';
import { HabyEduProLogo } from '../common/HabyEduProLogo';
import { printFormattedSection } from '../../utils/export';
import { getRemedialTimetable, RemedialTimetableEntry } from '../../lib/remedialService';
import { exportRemedialTimetablePDF } from '../../utils/remedialPdfExport';
import { fetchTimetable, isSameStream } from '../../lib/timetableService';
import { isSameClass } from '../../utils/reportCardUtils';
import { getSubjectColor } from '../../utils/colors';

export interface StudentDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  schoolInfo?: SchoolInfo;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  disciplineRecords?: DisciplineRecord[];
  allStudentsInClass?: Student[];
  onNavigateToDiscipline?: (student: Student) => void;
  examinationRecords?: ExaminationRecord[];
  schoolId?: string;
}

export const StudentDashboardModal: React.FC<StudentDashboardModalProps> = ({
  isOpen,
  onClose,
  student,
  schoolInfo,
  dailyAttendance = {},
  disciplineRecords = [],
  allStudentsInClass = [],
  onNavigateToDiscipline,
  examinationRecords = [],
  schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06'
}) => {
  if (!isOpen || !student) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'timetable' | 'remedial' | 'attendance' | 'behavior'>('overview');
  const [classTimetable, setClassTimetable] = useState<TimetableAssignment[]>([]);
  const [remedialTimetable, setRemedialTimetable] = useState<RemedialTimetableEntry[]>([]);
  const [isLoadingClassTimetable, setIsLoadingClassTimetable] = useState<boolean>(true);
  const [isLoadingRemedial, setIsLoadingRemedial] = useState<boolean>(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  const loadTimetables = useCallback(async () => {
    if (!student) return;
    setIsLoadingClassTimetable(true);
    setIsLoadingRemedial(true);

    console.log(`[Student View] Fetching timetable for student: ${student.name} | Class: "${student.className}" | Stream: "${student.stream || ''}" | School: ${schoolId}`);

    try {
      const [ttRes, remRes] = await Promise.all([
        fetchTimetable({
          schoolId,
          className: student.className,
          stream: student.stream
        }),
        getRemedialTimetable(schoolId, student.className)
      ]);

      if (ttRes.success && ttRes.data) {
        console.log(`[Student View] Timetable API returned ${ttRes.data.length} periods for class="${student.className}" stream="${student.stream}"`);
        setClassTimetable(ttRes.data);
      }
      if (remRes && remRes.data) {
        setRemedialTimetable(remRes.data);
      }
    } catch (e) {
      console.error('[Student View] Error fetching timetables:', e);
    } finally {
      setIsLoadingClassTimetable(false);
      setIsLoadingRemedial(false);
    }
  }, [schoolId, student]);

  useEffect(() => {
    loadTimetables();
  }, [loadTimetables]);

  // Student specific regular timetable periods (WHERE class = selected AND stream = selected)
  const studentClassPeriods = useMemo(() => {
    return classTimetable.filter(item => {
      const matchClass = isSameClass(item.className, student.className);
      const matchStream = isSameStream(item.stream, student.stream);
      return matchClass && matchStream;
    });
  }, [classTimetable, student]);

  // Student specific remedial sessions (WHERE class = selected AND stream = selected)
  const studentRemedialSessions = useMemo(() => {
    return remedialTimetable.filter(item => {
      const matchClass = isSameClass(item.class_name, student.className);
      const matchStream = isSameStream(item.stream, student.stream);
      return matchClass && matchStream;
    });
  }, [remedialTimetable, student]);

  // Group regular periods by day of week
  const groupedClassPeriods = useMemo(() => {
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const groups: Record<string, TimetableAssignment[]> = {};
    
    daysOrder.forEach(d => { groups[d] = []; });
    
    studentClassPeriods.forEach(p => {
      const dayKey = p.day ? (p.day.charAt(0).toUpperCase() + p.day.slice(1).toLowerCase()) : 'Monday';
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(p);
    });

    // Sort periods inside each day
    Object.keys(groups).forEach(d => {
      groups[d].sort((a, b) => (a.period || '').localeCompare(b.period || '', undefined, { numeric: true }));
    });

    return groups;
  }, [studentClassPeriods]);

  // 1. Academic Performance Data for Recharts
  const subjectMarksData = useMemo(() => {
    const marks = student.marks || {};
    return Object.entries(marks).map(([subject, mark]) => {
      const numMark = typeof mark === 'number' ? mark : parseFloat(String(mark)) || 0;
      let grade = 'F';
      let color = '#ef4444'; // Red

      if (numMark >= 75) {
        grade = 'A';
        color = '#10b981'; // Emerald
      } else if (numMark >= 65) {
        grade = 'B';
        color = '#3b82f6'; // Blue
      } else if (numMark >= 45) {
        grade = 'C';
        color = '#f59e0b'; // Amber
      } else if (numMark >= 30) {
        grade = 'D';
        color = '#ea580c'; // Orange
      }

      return {
        subject: subject.length > 12 ? subject.substring(0, 10) + '..' : subject,
        fullSubject: subject,
        mark: numMark,
        grade,
        color
      };
    });
  }, [student]);

  // 1b. Academic Trendline Data
  const academicTrendData = useMemo(() => {
    const studentRecords = examinationRecords.filter(r => r.studentId === student.id);
    if (studentRecords.length === 0) return [];

    const examOrder = ['Monthly', 'Midterm', 'Terminal', 'Annual'];
    return [...studentRecords]
      .sort((a, b) => {
        const yearComp = a.academicYear.localeCompare(b.academicYear);
        if (yearComp !== 0) return yearComp;
        const termComp = a.term.localeCompare(b.term);
        if (termComp !== 0) return termComp;
        return examOrder.indexOf(a.examType) - examOrder.indexOf(b.examType);
      })
      .map(r => ({
        label: `${r.term.replace('Term ', 'T')}-${r.examType.substring(0, 3)}`,
        fullLabel: `${r.term} ${r.examType} (${r.academicYear})`,
        average: r.averageMarks,
        position: r.positionInClass,
        totalStudents: r.totalStudents
      }));
  }, [examinationRecords, student]);

  // 2. Class Rank Computation
  const classRank = useMemo(() => {
    if (!allStudentsInClass || allStudentsInClass.length === 0) return null;
    const sameClassStudents = allStudentsInClass.filter(
      s => isSameClass(s.className, student.className)
    );
    if (sameClassStudents.length === 0) return null;

    const sorted = [...sameClassStudents].sort((a, b) => (Number(b.average) || 0) - (Number(a.average) || 0));
    const rankIndex = sorted.findIndex(s => s.id === student.id);
    return {
      position: rankIndex !== -1 ? rankIndex + 1 : 1,
      total: sorted.length
    };
  }, [allStudentsInClass, student]);

  // 3. Attendance Statistics
  const attendanceStats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    Object.values(dailyAttendance).forEach(dateRecords => {
      if (dateRecords && dateRecords[student.id]) {
        const status = dateRecords[student.id];
        if (status === 'PRESENT') presentCount++;
        else if (status === 'ABSENT') absentCount++;
        else if (status === 'LATE') lateCount++;
        else if (status === 'EXCUSED') excusedCount++;
      }
    });

    const totalDaysRecorded = presentCount + absentCount + lateCount + excusedCount;
    const rate = totalDaysRecorded > 0 ? Math.round(((presentCount + lateCount) / totalDaysRecorded) * 100) : 100;

    const pieData = [
      { name: 'Present', value: presentCount || (totalDaysRecorded === 0 ? 20 : 0), color: '#10b981' },
      { name: 'Late', value: lateCount, color: '#f59e0b' },
      { name: 'Absent', value: absentCount, color: '#ef4444' },
      { name: 'Excused', value: excusedCount, color: '#3b82f6' }
    ].filter(item => item.value > 0);

    return {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      excused: excusedCount,
      total: totalDaysRecorded,
      rate,
      pieData,
      isRisk: absentCount >= 3
    };
  }, [dailyAttendance, student]);

  // 4. Behavioral Logs
  const studentDisciplineLogs = useMemo(() => {
    return disciplineRecords.filter(d => 
      d.studentId === student.id || 
      (d.studentName && d.studentName.toLowerCase() === student.name.toLowerCase()) ||
      (d.regNo && student.regNo && d.regNo.toLowerCase() === student.regNo.toLowerCase())
    );
  }, [disciplineRecords, student]);

  const handlePrintDashboard = () => {
    printFormattedSection(
      'student-dashboard-print-content',
      `Student Academic & Behavioral Profile - ${student.name}`,
      schoolInfo?.name || 'HABY EDU PRO'
    );
  };

  const handlePrintClassTimetable = () => {
    printFormattedSection(
      'student-class-timetable-content',
      `Ratiba ya Vipindi - ${student.name} (${student.className} Mkondo ${student.stream || 'A'})`,
      schoolInfo?.name || 'HABY EDU PRO'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Student 360° Profile &amp; Dashboard
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Official Academic Grades, Timetable Schedules &amp; Attendance Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDashboard}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
              title="Print Student Profile"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Profile</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Overview &amp; KPIs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'timetable'
                ? 'bg-blue-700 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Ratiba ya Vipindi ({studentClassPeriods.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remedial')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'remedial'
                ? 'bg-amber-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Remedial Timetable ({studentRemedialSessions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academics')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'academics'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Academic Grades ({subjectMarksData.length} Subjects)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Attendance ({attendanceStats.rate}%)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('behavior')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'behavior'
                ? 'bg-rose-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Discipline ({studentDisciplineLogs.length})</span>
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div id="student-dashboard-print-content" className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50">
          
          {/* Student Biographical Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 sm:w-20 sm:h-24 bg-slate-100 border border-slate-300 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                {student.passportPhoto ? (
                  <img
                    src={student.passportPhoto}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400 stroke-1" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{student.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-black bg-blue-100 text-blue-900 border border-blue-200">
                    {student.regNo || `ID-${student.id}`}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    student.level === 'ACSEE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {student.level || 'CSEE'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-bold">
                  {student.className} {student.stream ? `• Mkondo / Stream ${student.stream}` : ''} • Gender: {student.gender || 'N/A'}
                </p>

                {student.parentPhone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Parent: <span className="font-mono font-semibold">{student.parentPhone}</span> ({student.parentName || 'Primary Contact'})</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <div className="text-center bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Class Rank</span>
                <span className="text-base font-black text-blue-950">
                  {classRank ? `#${classRank.position} / ${classRank.total}` : 'N/A'}
                </span>
              </div>

              <div className="text-center bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Vipindi vya Ratiba</span>
                <span className="text-base font-black text-emerald-950">
                  {isLoadingClassTimetable ? '...' : studentClassPeriods.length}
                </span>
              </div>

              <div className="text-center bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Remedial Sessions</span>
                <span className="text-base font-black text-amber-950">
                  {isLoadingRemedial ? '...' : studentRemedialSessions.length}
                </span>
              </div>
            </div>
          </div>

          {/* TAB: MY CLASS TIMETABLE (RATIBA YA VIPINDI) */}
          {(activeTab === 'overview' || activeTab === 'timetable') && (
            <div id="student-class-timetable-content" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <span>Ratiba ya Vipindi (Class Timetable)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                        {student.className} {student.stream ? `• Mkondo ${student.stream}` : ''}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Ratiba kamili ya vipindi vya kila wiki kulingana na darasa na mkondo wako
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    type="button"
                    onClick={loadTimetables}
                    disabled={isLoadingClassTimetable}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Refresh Timetable"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingClassTimetable ? 'animate-spin text-blue-600' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintClassTimetable}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Ratiba</span>
                  </button>
                </div>
              </div>

              {/* Day Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedDayFilter === day
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day === 'ALL' ? 'Siku Zote (All Days)' : day}
                  </button>
                ))}
              </div>

              {/* Loading State: Inapakia ratiba... */}
              {isLoadingClassTimetable ? (
                <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-800 animate-pulse">Inapakia ratiba...</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inachakata vipindi vya {student.className} Mkondo {student.stream || 'A'} kutoka kwenye seva
                    </p>
                  </div>
                </div>
              ) : studentClassPeriods.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    Hakuna vipindi vya ratiba vilivyopangwa kwa {student.className} ({student.stream ? `Mkondo ${student.stream}` : 'Mkondo wote'}) kwa sasa.
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Mwalimu mkuu au mratibu wa ratiba akitenga vipindi kwenye mfumo kwa darasa na mkondo huu, vitaonekana hapa papo hapo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const)
                    .filter(d => selectedDayFilter === 'ALL' || selectedDayFilter === d)
                    .map(day => {
                      const dayPeriods = groupedClassPeriods[day] || [];
                      if (dayPeriods.length === 0 && selectedDayFilter !== 'ALL') {
                        return (
                          <div key={day} className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                            Hakuna vipindi vilivyopangwa siku ya {day}.
                          </div>
                        );
                      }
                      if (dayPeriods.length === 0) return null;

                      return (
                        <div key={day} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                            <span className="font-black text-xs uppercase tracking-wider">{day}</span>
                            <span className="text-[11px] font-bold text-blue-200">
                              {dayPeriods.length} {dayPeriods.length === 1 ? 'Kipindi' : 'Vipindi'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 bg-slate-50/50">
                            {dayPeriods.map((p, pIdx) => {
                              const subColor = getSubjectColor(p.subject);
                              return (
                                <div
                                  key={p.id || pIdx}
                                  style={{ backgroundColor: subColor.bg, borderColor: subColor.border }}
                                  className="p-3 rounded-xl border text-xs shadow-2xs space-y-1.5 flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold text-slate-600 mb-1">
                                      <span className="bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                                        {p.period || `Kipindi ${pIdx + 1}`}
                                      </span>
                                      <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                        {p.stream === 'All Streams' ? 'Mikondo Yote' : p.stream}
                                      </span>
                                    </div>
                                    <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span className="truncate">{p.subject}</span>
                                    </div>
                                  </div>

                                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                                    <span className="font-semibold flex items-center gap-1 truncate">
                                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{('teacher' in p ? (p as any).teacher : '') || (p.teacherId ? `Mwl. #${p.teacherId}` : 'Mwalimu')}</span>
                                    </span>
                                    {p.room && (
                                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5 shrink-0 bg-white/60 px-1.5 py-0.5 rounded">
                                        <MapPin className="w-2.5 h-2.5" />
                                        {p.room}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB: MY REMEDIAL TIMETABLE */}
          {(activeTab === 'overview' || activeTab === 'remedial') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      My Remedial Timetable ({student.className} {student.stream ? `Stream ${student.stream}` : ''})
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Ratiba ya vipindi vya masomo ya ziada na maandalizi ya mitihani
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    exportRemedialTimetablePDF({
                      entries: studentRemedialSessions,
                      schoolInfo,
                      className: student.className,
                      streamName: student.stream || 'A',
                      academicYear: new Date().getFullYear().toString()
                    });
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-700" />
                  <span>Print Timetable PDF</span>
                </button>
              </div>

              {isLoadingRemedial ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="w-6 h-6 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-700 animate-pulse">Inapakia ratiba...</p>
                </div>
              ) : studentRemedialSessions.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  <Calendar className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-700">Hakuna ratiba ya remedial iliyopangwa kwa darasa hili kwa sasa.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ratiba mpya ikipangwa na Uongozi wa Shule itaonekana hapa moja kwa moja.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {studentRemedialSessions.map((session, idx) => (
                    <div
                      key={session.id || idx}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-amber-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-black uppercase">
                          {session.day_of_week} {session.date ? `• ${session.date}` : ''}
                        </span>
                        <span className="text-xs font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {session.start_time && session.end_time ? `${session.start_time} - ${session.end_time}` : session.period_time}
                        </span>
                      </div>

                      <div>
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>{session.subject}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5 mt-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mwl. {session.teacher_name}</span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.2 rounded">
                          {session.stream === 'All Streams' ? 'Mikondo Yote' : `Stream ${session.stream}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {session.room || `${student.className} Room`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ACADEMICS PERFORMANCE WITH RECHARTS */}
          {(activeTab === 'overview' || activeTab === 'academics') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    Subject Performance Breakdown (Marks out of 100)
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Continuous Assessment &amp; Final Exam Subject Comparison
                  </p>
                </div>
                <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  {subjectMarksData.length} Subjects Evaluated
                </span>
              </div>

              {subjectMarksData.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  <BarChart2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No subject marks registered for this student yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectMarksData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} angle={-25} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-1">
                                <p className="font-bold">{data.fullSubject}</p>
                                <p className="text-blue-300">Score: <span className="font-black text-white">{data.mark} / 100</span></p>
                                <p className="text-amber-300 font-bold">Grade: {data.grade}</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" />
                        <Bar dataKey="mark" radius={[6, 6, 0, 0]}>
                          {subjectMarksData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Grid of Subject Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                    {subjectMarksData.map((subj, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 truncate" title={subj.fullSubject}>{subj.fullSubject}</span>
                        <span 
                          style={{ backgroundColor: `${subj.color}15`, color: subj.color, borderColor: `${subj.color}30` }}
                          className="px-2 py-0.5 rounded-md text-xs font-black border"
                        >
                          {subj.mark}% ({subj.grade})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ATTENDANCE ANALYSIS WITH RECHARTS */}
          {(activeTab === 'overview' || activeTab === 'attendance') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Attendance Analysis &amp; Status</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Daily register metrics and consistency tracking</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                  attendanceStats.rate >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {attendanceStats.rate}% Overall Presence
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceStats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {attendanceStats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Present</span>
                    <span className="text-xl font-black text-emerald-900 block mt-0.5">{attendanceStats.present}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Days in class</span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Late</span>
                    <span className="text-xl font-black text-amber-900 block mt-0.5">{attendanceStats.late}</span>
                    <span className="text-[10px] text-amber-600 font-semibold">Tardiness</span>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Absent</span>
                    <span className="text-xl font-black text-rose-900 block mt-0.5">{attendanceStats.absent}</span>
                    <span className="text-[10px] text-rose-600 font-semibold">Unexcused</span>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Excused</span>
                    <span className="text-xl font-black text-blue-900 block mt-0.5">{attendanceStats.excused}</span>
                    <span className="text-[10px] text-blue-600 font-semibold">Authorized</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BEHAVIOR & CONDUCT */}
          {(activeTab === 'overview' || activeTab === 'behavior') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Discipline &amp; Character Conduct History</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Recorded merits, warnings, and behavioral actions</p>
                </div>
                {onNavigateToDiscipline && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToDiscipline(student);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Add Incident</span>
                  </button>
                )}
              </div>

              {studentDisciplineLogs.length === 0 ? (
                <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs">Exemplary Character Conduct</p>
                    <p className="text-[11px] text-emerald-700">No active disciplinary infractions or incidents logged on record.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentDisciplineLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{log.category || 'Incident'}</span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                            {log.status || 'RECORDED'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{log.description || log.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Date: {log.date || 'N/A'} • Action: {log.actionTaken || 'Counseling'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Haby Edu Pro • Student Profile &amp; Timetable Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer transition shadow-xs"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
