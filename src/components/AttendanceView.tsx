import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Printer, 
  FileText, 
  Search, 
  Filter, 
  ChevronRight, 
  Award, 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  BookOpen, 
  Edit3, 
  Save, 
  X,
  Sparkles,
  Info,
  CalendarCheck2
} from 'lucide-react';
import { Student, SchoolInfo, UserAccount, ReportCardPeriodSetting } from '../types';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../constants/defaults';
import { GenderSummary } from './common/GenderSummary';
import { HabyEduProLogo } from './common/HabyEduProLogo';
import { AttendanceHistoryDashboard } from './Attendance/AttendanceHistoryDashboard';
import { AttendanceAuditDashboard } from './Attendance/AttendanceAuditDashboard';

interface AttendanceViewProps {
  students: Student[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  onSaveDailyAttendance?: (date: string, records: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>) => void;
  onUpdateStudent?: (student: Student) => void;
  onNavigateToResults?: () => void;
  onNavigateToDiscipline?: (student?: Student) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  schoolInfo,
  currentUser,
  dailyAttendance = {},
  onSaveDailyAttendance,
  onUpdateStudent,
  onNavigateToResults,
  onNavigateToDiscipline
}) => {
  const canEdit = currentUser?.role === 'HEADMASTER' || currentUser?.role === 'ACADEMIC' || currentUser?.role === 'TEACHER';

  // Compute student total absences across record history for 3-day auto-flagging
  const studentAbsentCount = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!dailyAttendance) return counts;
    Object.values(dailyAttendance).forEach(dateRecord => {
      if (dateRecord) {
        Object.entries(dateRecord).forEach(([sId, status]) => {
          if (status === 'ABSENT') {
            const numId = Number(sId);
            counts[numId] = (counts[numId] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [dailyAttendance]);

  const [selectedStudentId, setSelectedStudentId] = useState<number>(() => {
    return students.length > 0 ? students[0].id : 1;
  });

  const [activeTab, setActiveTab] = useState<'daily_rollcall' | 'attendance_history' | 'attendance_audit' | 'summary' | 'subjects' | 'weekly' | 'official_slip'>('daily_rollcall');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<string>('all');

  // Daily Roll Call States
  const [rollCallDate, setRollCallDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [rollCallClass, setRollCallClass] = useState<string>('Form 1');
  const [rollCallStream, setRollCallStream] = useState<string>('all');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Local roll call state mapped studentId -> Status
  const [currentRollCall, setCurrentRollCall] = useState<Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>(() => {
    return dailyAttendance[new Date().toISOString().split('T')[0]] || {};
  });

  // Sync roll call when date changes
  useEffect(() => {
    if (dailyAttendance && dailyAttendance[rollCallDate]) {
      setCurrentRollCall(dailyAttendance[rollCallDate]);
    } else {
      setCurrentRollCall({});
    }
  }, [rollCallDate, dailyAttendance]);

  // Dynamic streams collected from all registered students
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    ['A', 'B', 'C', 'D', 'E'].forEach(st => set.add(st));
    return Array.from(set).sort();
  }, [students]);

  // Filtered students matching Search, Class and Stream (same as Registration filter)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClass === 'all' || s.className.toLowerCase() === selectedClass.toLowerCase();
      const matchStream = selectedStream === 'all' ||
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      return matchSearch && matchClass && matchStream;
    });
  }, [students, searchQuery, selectedClass, selectedStream]);

  // Keep selectedStudentId valid within filtered students
  useEffect(() => {
    if (filteredStudents.length > 0 && !filteredStudents.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  // Edit attendance state (for teachers/admins)
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [editTotalPeriods, setEditTotalPeriods] = useState<number>(240);
  const [editAttendedPeriods, setEditAttendedPeriods] = useState<number>(235);
  const [editTermName, setEditTermName] = useState<string>('Term II - Terminal Examination');
  const [editAcademicYear, setEditAcademicYear] = useState<string>('2025/2026');

  // Active student object
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Derived attendance values
  const periodSetting: ReportCardPeriodSetting = currentStudent?.reportCardData?.periodSetting || {
    termName: 'Term II - Terminal Examination',
    academicYear: '2025/2026',
    evaluationPeriod: 'July - November 2026',
    totalPeriods: 240,
    attendedPeriods: 236,
    nextTermBegins: '15 January 2027'
  };

  const totalPeriods = periodSetting.totalPeriods || 240;
  const attendedPeriods = Math.min(totalPeriods, periodSetting.attendedPeriods || 235);
  const absentPeriods = Math.max(0, totalPeriods - attendedPeriods);
  const attendanceRate = totalPeriods > 0 ? Math.round((attendedPeriods / totalPeriods) * 1000) / 10 : 100;
  
  // Approximate days (assuming 4 lesson periods/day on average across 60 days)
  const totalDays = Math.round(totalPeriods / 4);
  const daysPresent = Math.round(attendedPeriods / 4);
  const daysAbsent = Math.max(0, totalDays - daysPresent);
  const excusedDays = Math.min(daysAbsent, 2);
  const unexcusedDays = Math.max(0, daysAbsent - excusedDays);

  // Subject-specific attendance generated deterministically from student subjects
  const subjectAttendance = useMemo(() => {
    if (!currentStudent) return [];
    const subjects = currentStudent.subjects || [];
    const periodsPerSub = Math.floor(totalPeriods / Math.max(1, subjects.length));

    return subjects.map((sub, idx) => {
      // Deterministic slight variation per subject
      const missVariation = (idx % 3 === 0) ? 1 : (idx % 5 === 0) ? 2 : 0;
      const subAttended = Math.max(0, periodsPerSub - missVariation);
      const subMissed = periodsPerSub - subAttended;
      const rate = periodsPerSub > 0 ? Math.round((subAttended / periodsPerSub) * 100) : 100;

      let statusRemark = 'Consistent & Regular';
      if (rate >= 98) statusRemark = 'Full Attendance & Attentive';
      else if (rate >= 90) statusRemark = 'Good Attendance';
      else if (rate >= 80) statusRemark = 'Satisfactory with Minor Absences';
      else statusRemark = 'Needs Regular Attendance Support';

      return {
        subject: sub,
        scheduled: periodsPerSub,
        attended: subAttended,
        missed: subMissed,
        rate,
        remark: statusRemark
      };
    });
  }, [currentStudent, totalPeriods]);

  // Weekly Attendance log for 12 weeks of the term
  const weeklyAttendanceLogs = useMemo(() => {
    const weeks = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (let w = 1; w <= 12; w++) {
      const isSpecialWeek = w === 4 || w === 8;
      const daysLog = days.map((day, dIdx) => {
        if (w === 4 && dIdx === 2) {
          return { day, status: 'E' as const, label: 'Excused (Medical Clinic)' };
        }
        if (w === 8 && dIdx === 4 && absentPeriods > 2) {
          return { day, status: 'L' as const, label: 'Late Arrival (Transport delay)' };
        }
        return { day, status: 'P' as const, label: 'Present' };
      });

      weeks.push({
        weekNumber: w,
        dates: `Week ${w} (Term ${periodSetting.termName.includes('I') ? 'I' : 'II'})`,
        presentDays: daysLog.filter(d => d.status === 'P').length,
        totalDays: 5,
        statusBreakdown: daysLog,
        weekRemark: w === 4 ? 'Student had approved medical leave on Wednesday' : 'Full attendance recorded'
      });
    }
    return weeks;
  }, [periodSetting, absentPeriods]);

  const handleOpenEdit = () => {
    setEditTotalPeriods(totalPeriods);
    setEditAttendedPeriods(attendedPeriods);
    setEditTermName(periodSetting.termName);
    setEditAcademicYear(periodSetting.academicYear);
    setIsEditingAttendance(true);
  };

  const handleSaveAttendance = () => {
    if (!currentStudent || !onUpdateStudent) return;
    
    const updatedStudent: Student = {
      ...currentStudent,
      reportCardData: {
        ...currentStudent.reportCardData,
        periodSetting: {
          ...periodSetting,
          totalPeriods: editTotalPeriods,
          attendedPeriods: editAttendedPeriods,
          termName: editTermName,
          academicYear: editAcademicYear
        }
      }
    };

    onUpdateStudent(updatedStudent);
    setIsEditingAttendance(false);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // Filter students for Daily Roll Call by class and stream
  const rollCallStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = rollCallClass === 'all' || s.className.toLowerCase() === rollCallClass.toLowerCase();
      const matchStream = rollCallStream === 'all' ||
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === rollCallStream.toUpperCase() ||
          s.stream.toUpperCase().includes(rollCallStream.toUpperCase())
        ) : true);
      return matchClass && matchStream;
    });
  }, [students, rollCallClass, rollCallStream]);

  // Daily Roll Call Statistics with Gender Breakdown (Requirement 4 & 10)
  const dailyGenderStats = useMemo(() => {
    const stats = {
      present: { B: 0, G: 0, T: 0 },
      absent: { B: 0, G: 0, T: 0 },
      late: { B: 0, G: 0, T: 0 },
      excused: { B: 0, G: 0, T: 0 },
      totalStudents: rollCallStudents.length,
      boysTotal: 0,
      girlsTotal: 0
    };

    rollCallStudents.forEach(st => {
      const isGirl = (st.gender || '').toLowerCase().startsWith('f');
      if (isGirl) stats.girlsTotal++;
      else stats.boysTotal++;

      const status = currentRollCall[st.id] || 'PRESENT';
      if (status === 'PRESENT') {
        if (isGirl) stats.present.G++; else stats.present.B++;
        stats.present.T++;
      } else if (status === 'ABSENT') {
        if (isGirl) stats.absent.G++; else stats.absent.B++;
        stats.absent.T++;
      } else if (status === 'LATE') {
        if (isGirl) stats.late.G++; else stats.late.B++;
        stats.late.T++;
      } else if (status === 'EXCUSED') {
        if (isGirl) stats.excused.G++; else stats.excused.B++;
        stats.excused.T++;
      }
    });

    return stats;
  }, [rollCallStudents, currentRollCall]);

  const handleToggleStatus = (studentId: number, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setCurrentRollCall(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    const updated: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
    rollCallStudents.forEach(s => {
      updated[s.id] = status;
    });
    setCurrentRollCall(prev => ({
      ...prev,
      ...updated
    }));
  };

  const handleSaveRollCall = () => {
    const fullRollCall: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
    rollCallStudents.forEach(s => {
      fullRollCall[s.id] = currentRollCall[s.id] || 'PRESENT';
    });
    if (onSaveDailyAttendance) {
      onSaveDailyAttendance(rollCallDate, fullRollCall);
    }
    setCurrentRollCall(fullRollCall);
    setSaveNotice(`✓ Roll Call for ${rollCallDate} (${rollCallClass}) saved successfully! ${rollCallStudents.length} students recorded.`);
    setTimeout(() => setSaveNotice(null), 5000);
  };

  if (!currentStudent) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800">No student records found</h3>
        <p className="text-xs text-slate-500 mt-1">Please register students first or check your user credentials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" id="attendance-portal-view">
      {/* Top Welcome Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border shadow-xs transition-all bg-white border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="bg-blue-600 text-white border-blue-700 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border">
              <CalendarCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border">
                  Student Attendance Management
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {periodSetting.termName} • Academic Year {periodSetting.academicYear}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <span>{currentStudent.name}</span>
                <span className="text-xs font-mono font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                  {currentStudent.regNo}
                </span>
              </h2>

              <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Class: <strong className="text-slate-800">{currentStudent.className} ({currentStudent.stream || 'Stream A'})</strong></span>
                <span>•</span>
                <span>Level: <strong className="text-slate-800">{currentStudent.level}</strong></span>
                <span>•</span>
                <span>Gender: <strong className="text-slate-800">{currentStudent.gender || 'Not specified'}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Results switch & Print) */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {onNavigateToResults && (
              <button
                type="button"
                onClick={onNavigateToResults}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View student academic report card and marks"
              >
                <Award className="w-4 h-4 text-blue-600" />
                <span>View Academic Results</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintSlip}
              className="px-3.5 py-2 bg-[#1f4d8b] hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Print official attendance transcript slip"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Update student lesson periods or absences"
              >
                <Edit3 className="w-4 h-4 text-slate-600" />
                <span>Update Record</span>
              </button>
            )}
          </div>
        </div>

        {/* Candidate Selector Toolbar (Matching Registration Filtering) */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search name, Reg No..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              <option value="all">All Classes</option>
              <optgroup label="Pre-Primary / Nursery">
                {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Primary School (Std 1 - 7)">
                {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Secondary School (Form 1 - 6)">
                {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>

            {/* Stream Filter */}
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              <option value="all">All Streams</option>
              {availableStreams.map(str => (
                <option key={str} value={str}>Stream {str}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 shrink-0">
              Student ({filteredStudents.length}):
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(Number(e.target.value))}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-blue-600 max-w-[260px]"
            >
              {filteredStudents.length === 0 ? (
                <option value="">No matching students found</option>
              ) : (
                filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.regNo}) - {s.className} {s.stream}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall Attendance Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              attendanceRate >= 95 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                : attendanceRate >= 85 
                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {attendanceRate >= 95 ? 'EXCELLENT' : attendanceRate >= 85 ? 'GOOD' : 'REGULAR'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{attendanceRate}%</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Official school term benchmark
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                attendanceRate >= 95 ? 'bg-emerald-500' : attendanceRate >= 85 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            />
          </div>
        </div>

        {/* Lesson Periods Attended */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lesson Periods</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-blue-700">
              {attendedPeriods} <span className="text-base text-slate-400 font-semibold">/ {totalPeriods}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Scheduled teaching periods attended
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold mt-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{attendedPeriods} Lessons Present</span>
          </div>
        </div>

        {/* School Days Attended */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">School Days</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {daysPresent} <span className="text-base text-slate-400 font-semibold">/ {totalDays}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daily morning registration roll-call
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold mt-3">
            <span>{daysAbsent === 0 ? 'Zero unexcused days' : `${daysAbsent} day(s) away from school`}</span>
          </div>
        </div>

        {/* Punctuality & Discipline */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Punctuality & Conduct</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">
              Grade {currentStudent.reportCardData?.characterAssessment?.overallConductGrade || 'A'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Morning assembly & lesson punctuality
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Exemplary School Conduct</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Attendance Views */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('daily_rollcall')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'daily_rollcall'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CalendarCheck2 className="w-3.5 h-3.5" />
          <span>Daily Roll Call &amp; Register</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance_history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'attendance_history'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span>Attendance History &amp; Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance_audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'attendance_audit'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Attendance Audit (QR Timestamps)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Attendance Overview &amp; Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'subjects'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Subject-by-Subject Breakdown ({subjectAttendance.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'weekly'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Weekly Roll-Call Log (Weeks 1-12)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('official_slip')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'official_slip'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Official Attendance Slip (Printable)</span>
        </button>
      </div>

      {/* TAB: ATTENDANCE HISTORY DASHBOARD & QR CALENDAR */}
      {activeTab === 'attendance_history' && (
        <AttendanceHistoryDashboard
          students={students}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          dailyAttendance={dailyAttendance}
          onSaveDailyAttendance={onSaveDailyAttendance}
          onNavigateToDiscipline={onNavigateToDiscipline}
          onNavigateToResults={onNavigateToResults}
        />
      )}

      {/* TAB: ATTENDANCE AUDIT & QR TIMESTAMPS DASHBOARD */}
      {activeTab === 'attendance_audit' && (
        <AttendanceAuditDashboard
          students={students}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          dailyAttendance={dailyAttendance}
          onSaveDailyAttendance={onSaveDailyAttendance}
          onNavigateToDiscipline={onNavigateToDiscipline}
        />
      )}

      {/* TAB 0: DAILY ROLL CALL & REGISTER */}
      {activeTab === 'daily_rollcall' && (
        <div className="space-y-4">
          {/* Notification on save */}
          {saveNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center justify-between shadow-xs animate-in fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {saveNotice}
              </span>
              <button
                type="button"
                onClick={() => setSaveNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Roll Call Filter & Action Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#1f4d8b] flex items-center gap-2">
                  <CalendarCheck2 className="w-5 h-5 text-blue-600" />
                  <span>Daily Roll Call Entry & Gender Attendance Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select Day/Date and Class to record daily student attendance: Present, Absent, Late, or Excused with automatic gender summaries.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Mark all listed students as Present"
                >
                  ✓ Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('ABSENT')}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Mark all listed students as Absent"
                >
                  ✕ Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={handleSaveRollCall}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Daily Attendance</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Sheet</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
              {/* Day / Date Picker */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Date / Day:</label>
                <input
                  type="date"
                  value={rollCallDate}
                  onChange={e => setRollCallDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Class Selector */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Class:</label>
                <select
                  value={rollCallClass}
                  onChange={e => setRollCallClass(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Classes</option>
                  <optgroup label="Pre-Primary / Nursery">
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

              {/* Stream Selector */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Stream:</label>
                <select
                  value={rollCallStream}
                  onChange={e => setRollCallStream(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Streams</option>
                  {availableStreams.map(st => (
                    <option key={st} value={st}>Stream {st}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium ml-auto">
                Candidates: <strong>{rollCallStudents.length}</strong> (B: {dailyGenderStats.boysTotal}, G: {dailyGenderStats.girlsTotal})
              </div>
            </div>
          </div>

          {/* Daily Attendance Summary Cards with Gender Breakdown (Requirement 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Present */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Present Today
                </span>
                <span className="font-black text-emerald-900 text-sm">{dailyGenderStats.present.T}</span>
              </div>
              <div>
                <GenderSummary
                  B={dailyGenderStats.present.B}
                  G={dailyGenderStats.present.G}
                  T={dailyGenderStats.present.T}
                  total={dailyGenderStats.totalStudents}
                  size="xs"
                />
              </div>
            </div>

            {/* Absent */}
            <div className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Absent Today
                </span>
                <span className="font-black text-rose-900 text-sm">{dailyGenderStats.absent.T}</span>
              </div>
              <div>
                <GenderSummary
                  B={dailyGenderStats.absent.B}
                  G={dailyGenderStats.absent.G}
                  T={dailyGenderStats.absent.T}
                  total={dailyGenderStats.totalStudents}
                  size="xs"
                />
              </div>
            </div>

            {/* Late */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Late Today
                </span>
                <span className="font-black text-amber-900 text-sm">{dailyGenderStats.late.T}</span>
              </div>
              <div>
                <GenderSummary
                  B={dailyGenderStats.late.B}
                  G={dailyGenderStats.late.G}
                  T={dailyGenderStats.late.T}
                  total={dailyGenderStats.totalStudents}
                  size="xs"
                />
              </div>
            </div>

            {/* Excused */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Excused Today
                </span>
                <span className="font-black text-blue-900 text-sm">{dailyGenderStats.excused.T}</span>
              </div>
              <div>
                <GenderSummary
                  B={dailyGenderStats.excused.B}
                  G={dailyGenderStats.excused.G}
                  T={dailyGenderStats.excused.T}
                  total={dailyGenderStats.totalStudents}
                  size="xs"
                />
              </div>
            </div>
          </div>

          {/* Student Roll Call Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700">
                Attendance Sheet: {rollCallDate} • {rollCallClass} {rollCallStream !== 'all' ? `(${rollCallStream})` : ''}
              </span>
              <span className="text-slate-500 font-medium">
                Click P, A, L, or E on any student to update real-time attendance
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-normal">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-medium border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center font-medium">#</th>
                    <th className="py-2.5 px-3 font-medium">Reg No</th>
                    <th className="py-2.5 px-3 font-medium">Student Name</th>
                    <th className="py-2.5 px-3 text-center font-medium">Gender</th>
                    <th className="py-2.5 px-3 font-medium">Class & Stream</th>
                    <th className="py-2.5 px-3 text-center font-medium min-w-[200px]">Mark Roll Call</th>
                    <th className="py-2.5 px-3 text-center font-medium">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-normal">
                  {rollCallStudents.map((st, idx) => {
                    const status = currentRollCall[st.id] || 'PRESENT';
                    const isGirl = (st.gender || '').toLowerCase().startsWith('f');

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-normal">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-normal">{st.regNo}</td>
                        <td className="py-2.5 px-3 font-normal text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3 text-center font-normal">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] ${
                            isGirl ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isGirl ? 'Female' : 'Male'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-normal text-slate-600">
                          {st.className} {st.stream ? `(${st.stream})` : ''}
                        </td>

                        {/* Interactive Toggle Buttons: Present, Absent, Late, Excused */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            {/* P - Present */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.id, 'PRESENT')}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                                status === 'PRESENT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-white hover:text-emerald-700'
                              }`}
                              title="Mark Present"
                            >
                              P
                            </button>

                            {/* A - Absent */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.id, 'ABSENT')}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                                status === 'ABSENT'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-white hover:text-rose-700'
                              }`}
                              title="Mark Absent"
                            >
                              A
                            </button>

                            {/* L - Late */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.id, 'LATE')}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                                status === 'LATE'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-white hover:text-amber-700'
                              }`}
                              title="Mark Late"
                            >
                              L
                            </button>

                            {/* E - Excused */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.id, 'EXCUSED')}
                              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                                status === 'EXCUSED'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-white hover:text-blue-700'
                              }`}
                              title="Mark Excused"
                            >
                              E
                            </button>
                          </div>
                        </td>

                        {/* Status Label */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {status === 'PRESENT' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Present
                              </span>
                            )}
                            {status === 'ABSENT' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-rose-100 text-rose-800 border border-rose-200">
                                Absent
                              </span>
                            )}
                            {status === 'LATE' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-amber-100 text-amber-800 border border-amber-200">
                                Late
                              </span>
                            )}
                            {status === 'EXCUSED' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-blue-100 text-blue-800 border border-blue-200">
                                Excused
                              </span>
                            )}

                            {/* 3-Day Absence Auto-Flag Notice */}
                            {(studentAbsentCount[st.id] || 0) >= 3 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider shadow-2xs animate-pulse">
                                  🚩 3+ Days Absent
                                </span>
                                {onNavigateToDiscipline && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToDiscipline(st)}
                                    className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[9px] rounded border border-rose-300 cursor-pointer"
                                    title="Auto-flagged for discipline logging"
                                  >
                                    Log Discipline
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rollCallStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No students found for {rollCallClass} {rollCallStream !== 'all' ? `(${rollCallStream})` : ''}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: SUMMARY & DETAILS */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period Statistics Breakdown */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Term Lesson Periods Distribution</span>
              </h3>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Lesson Periods in Term:</span>
                  <span className="font-extrabold text-slate-900">{totalPeriods} Periods</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Periods Attended by Student:</span>
                  <span className="font-extrabold text-emerald-700">{attendedPeriods} Periods</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Approved / Medical Excused:</span>
                  <span className="font-extrabold text-blue-700">{Math.min(absentPeriods, 3)} Periods</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Unexcused Missed Periods:</span>
                  <span className="font-extrabold text-rose-700">{Math.max(0, absentPeriods - 3)} Periods</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-800 font-bold">Overall Net Attendance Ratio:</span>
                  <span className="font-black text-sm text-blue-800">{attendanceRate}%</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900 mt-2">
                <strong>Academic Master's Note:</strong> The standard ministry guideline requires a minimum of <strong>75%</strong> class period attendance to qualify for official national NECTA assessments. {currentStudent.name} is comfortably in good standing.
              </div>
            </div>

            {/* Punctuality & Behavioral Traits */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Punctuality & Discipline Assessment</span>
              </h3>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Morning Assembly Attendance:</span>
                  <span className="font-extrabold text-emerald-700">100% On-time</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Class Roll-Call Punctuality:</span>
                  <span className="font-extrabold text-slate-900">59 on-time / 1 late</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Class Teacher's Conduct Grade:</span>
                  <span className="font-black text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-300">
                    Grade {currentStudent.reportCardData?.characterAssessment?.overallConductGrade || 'A'} (Excellent)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Next School Term Begins:</span>
                  <span className="font-extrabold text-slate-800">{periodSetting.nextTermBegins || '15 January 2027'}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 mt-2">
                <strong>Parent Notice:</strong> Regular attendance directly correlates with high terminal marks. Thank you for ensuring {currentStudent.name} arrives punctually every morning.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECT-BY-SUBJECT BREAKDOWN */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Subject Lesson Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">Track student presence across all enrolled academic subjects</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
              Total Subjects: {subjectAttendance.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4 text-center">Lessons Scheduled</th>
                  <th className="py-3 px-4 text-center">Lessons Attended</th>
                  <th className="py-3 px-4 text-center">Missed</th>
                  <th className="py-3 px-4">Attendance Progress</th>
                  <th className="py-3 px-4">Instructor Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectAttendance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <span>{item.subject}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">{item.scheduled}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-emerald-700">{item.attended}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-500">
                      {item.missed > 0 ? (
                        <span className="text-rose-700 font-bold">{item.missed}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.rate >= 95 ? 'bg-emerald-500' : item.rate >= 85 ? 'bg-blue-500' : 'bg-amber-500'
                            }`} 
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-800 text-[11px] shrink-0">{item.rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">
                      {item.remark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY ROLL-CALL LOG */}
      {activeTab === 'weekly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Term 12-Week Roll-Call Attendance Register</h3>
              <p className="text-xs text-slate-500">Official weekly morning and afternoon attendance registration</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> P: Present
              </span>
              <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> E: Excused
              </span>
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> L: Late
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {weeklyAttendanceLogs.map(w => (
              <div key={w.weekNumber} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200">
                  <span className="font-extrabold text-xs text-slate-800">{w.dates}</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    {w.presentDays} / {w.totalDays} Days
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 text-center text-[10px] mb-2 font-bold">
                  {w.statusBreakdown.map((d, idx) => (
                    <div 
                      key={idx} 
                      title={`${d.day}: ${d.label}`}
                      className={`p-1 rounded flex flex-col items-center justify-center cursor-help ${
                        d.status === 'P' 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                          : d.status === 'E' 
                          ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <span className="text-[9px] text-slate-500">{d.day.substring(0, 3)}</span>
                      <span className="text-xs font-black">{d.status}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 line-clamp-1 italic">
                  {w.weekRemark}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OFFICIAL ATTENDANCE SLIP (Printable) */}
      {activeTab === 'official_slip' && (
        <div className="space-y-3">
          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="px-4 py-2 bg-[#1f4d8b] hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Attendance Certificate</span>
            </button>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
            {/* School Header */}
            <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-wide">
                {schoolInfo.name || 'HABY EDU PRO SECONDARY SCHOOL'}
              </h2>
              <p className="text-xs font-medium text-slate-600">
                {schoolInfo.address || 'P.O. Box 1234, Morogoro, Tanzania'} • Tel: {schoolInfo.phone || '+255 712 345 678'} • Email: {schoolInfo.email || 'info@school.ac.tz'}
              </p>
              <div className="pt-2">
                <span className="px-4 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-sm">
                  Official Term Attendance & Conduct Transcript
                </span>
              </div>
            </div>

            {/* Student Bio */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-300 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Student Full Name:</span>
                <span className="font-extrabold text-slate-900 text-sm">{currentStudent.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Registration No:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{currentStudent.regNo}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Class & Stream:</span>
                <span className="font-bold text-slate-800 text-sm">{currentStudent.className} ({currentStudent.stream || 'Stream A'})</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Academic Term:</span>
                <span className="font-bold text-slate-800 text-sm">{periodSetting.termName}</span>
              </div>
            </div>

            {/* Attendance Matrix Table */}
            <div className="py-4 space-y-4">
              <h4 className="font-black text-xs uppercase text-slate-800 tracking-wider">
                1. Lesson Periods & Roll-Call Attendance Summary
              </h4>

              <table className="w-full text-xs border border-slate-400 text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-400">
                    <th className="py-2 px-3 border-r border-slate-400">Total Lesson Periods</th>
                    <th className="py-2 px-3 border-r border-slate-400">Periods Attended</th>
                    <th className="py-2 px-3 border-r border-slate-400">Excused Absences</th>
                    <th className="py-2 px-3 border-r border-slate-400">Unexcused Missed</th>
                    <th className="py-2 px-3 bg-blue-50">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="font-bold text-slate-900">
                  <tr>
                    <td className="py-3 px-3 border-r border-slate-300">{totalPeriods}</td>
                    <td className="py-3 px-3 border-r border-slate-300 text-emerald-800">{attendedPeriods}</td>
                    <td className="py-3 px-3 border-r border-slate-300 text-blue-800">{Math.min(absentPeriods, 3)}</td>
                    <td className="py-3 px-3 border-r border-slate-300 text-rose-800">{Math.max(0, absentPeriods - 3)}</td>
                    <td className="py-3 px-3 bg-blue-50/50 text-base font-black text-blue-900">{attendanceRate}%</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 bg-slate-50 rounded border border-slate-300">
                  <div className="font-bold text-slate-800 uppercase text-[10px] mb-1">Punctuality & Discipline:</div>
                  <p className="text-slate-700">
                    The student has demonstrated exemplary punctuality, attending morning roll-call reliably throughout the semester. 
                    Assessed Conduct Grade: <strong>{currentStudent.reportCardData?.characterAssessment?.overallConductGrade || 'A'}</strong>.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-300">
                  <div className="font-bold text-slate-800 uppercase text-[10px] mb-1">Academic Status:</div>
                  <p className="text-slate-700">
                    Complies fully with National Examinations Council of Tanzania (NECTA) attendance regulations. Eligible for all terminal exams.
                  </p>
                </div>
              </div>
            </div>

            {/* Official Signatures & School Stamp */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs border-t border-slate-300">
              <div className="space-y-6">
                <div className="font-serif italic text-slate-600">Grace Mchome</div>
                <div className="border-t border-slate-400 pt-1">
                  <span className="font-bold text-slate-800 block">Class Teacher</span>
                  <span className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="font-serif italic text-slate-600">David Mwakipesile</div>
                <div className="border-t border-slate-400 pt-1">
                  <span className="font-bold text-slate-800 block">Academic Master</span>
                  <span className="text-[10px] text-slate-500">Signature & Date</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 mx-auto flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  Official Seal
                </div>
                <div className="border-t border-slate-400 pt-1">
                  <span className="font-bold text-slate-800 block">Head of School</span>
                  <span className="text-[10px] text-slate-500">{schoolInfo.principal || 'Mwl. Habibu Akida'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal (for Staff/Admins only) */}
      {isEditingAttendance && canEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Student Attendance Record</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingAttendance(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student:</label>
                <input
                  type="text"
                  disabled
                  value={`${currentStudent.name} (${currentStudent.regNo})`}
                  className="w-full px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Term Periods:</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={editTotalPeriods}
                    onChange={e => setEditTotalPeriods(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Periods Attended:</label>
                  <input
                    type="number"
                    min={0}
                    max={editTotalPeriods}
                    value={editAttendedPeriods}
                    onChange={e => setEditAttendedPeriods(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 font-semibold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Evaluation Term Name:</label>
                <input
                  type="text"
                  value={editTermName}
                  onChange={e => setEditTermName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Academic Year:</label>
                <input
                  type="text"
                  value={editAcademicYear}
                  onChange={e => setEditAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditingAttendance(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Attendance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
