import React, { useState, useMemo, useEffect } from 'react';
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
  Building
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
import { Student, SchoolInfo, DisciplineRecord, ExaminationRecord } from '../../types';
import { HabyEduProLogo } from '../common/HabyEduProLogo';
import { printFormattedSection } from '../../utils/export';
import { getRemedialTimetable, RemedialTimetableEntry } from '../../lib/remedialService';
import { exportRemedialTimetablePDF } from '../../utils/remedialPdfExport';
import { isSameClass } from '../../utils/reportCardUtils';

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

  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance' | 'behavior' | 'remedial'>('overview');
  const [remedialTimetable, setRemedialTimetable] = useState<RemedialTimetableEntry[]>([]);

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const { data } = await getRemedialTimetable(schoolId);
        if (data) setRemedialTimetable(data);
      } catch (e) {
        console.warn('Error loading remedial in student modal:', e);
      }
    };
    fetchTimetable();
  }, [schoolId]);

  // Student specific remedial sessions
  const studentRemedialSessions = useMemo(() => {
    return remedialTimetable.filter(item => {
      const matchClass = isSameClass(item.class_name, student.className);
      const matchStream = !item.stream || 
        item.stream === 'All Streams' || 
        !student.stream || 
        item.stream.toUpperCase() === student.stream.toUpperCase();
      return matchClass && matchStream;
    });
  }, [remedialTimetable, student]);

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

  // 1b. Academic Trendline Data (Improvement across terms)
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
      s => s.className?.toLowerCase() === student.className?.toLowerCase()
    );
    if (sameClassStudents.length === 0) return null;

    const sorted = [...sameClassStudents].sort((a, b) => (Number(b.average) || 0) - (Number(a.average) || 0));
    const rankIndex = sorted.findIndex(s => s.id === student.id);
    return {
      position: rankIndex !== -1 ? rankIndex + 1 : 1,
      total: sorted.length
    };
  }, [allStudentsInClass, student]);

  // 3. Attendance Statistics & Pie Data for Recharts
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

  // 4. Behavioral & Discipline History
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
                Official Academic Grades, Attendance Records &amp; Behavioral History Summary
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
            <span>Attendance Status ({attendanceStats.rate}%)</span>
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
            <span>Behavior &amp; Conduct ({studentDisciplineLogs.length})</span>
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
                  Class: <span className="text-blue-700">{student.className}</span> {student.stream ? `• Stream ${student.stream.replace(/^STREAM\s+/i, '')}` : ''}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium pt-1">
                  <span>Gender: <strong>{student.gender || 'N/A'}</strong></span>
                  {(student.parentPhone || student.phone) && (
                    <span className="flex items-center gap-1 text-emerald-800 font-bold">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {student.parentPhone || student.phone}
                    </span>
                  )}
                  {student.parentName && (
                    <span>Parent: <strong>{student.parentName}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Performance Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Overall Academic Grade</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-black text-[#1f4d8b]">
                  {student.division ? student.division : (student.average ? `${student.average}%` : 'N/A')}
                </span>
                {classRank && (
                  <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-black">
                    Rank #{classRank.position}/{classRank.total}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & KPIS */}
          {(activeTab === 'overview' || activeTab === 'academics') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Total Marks</span>
                    <Award className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{student.total || 0}</div>
                  <p className="text-[10px] text-slate-500 font-medium">Across all enrolled subjects</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Average Score</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-emerald-700">{student.average || 0}%</div>
                  <p className="text-[10px] text-slate-500 font-medium">Class pass mark: 45%</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Attendance Rate</span>
                    <CalendarCheck className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-xl font-black text-indigo-700">{attendanceStats.rate}%</div>
                  <p className="text-[10px] text-slate-500 font-medium">{attendanceStats.present} days present</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Discipline Status</span>
                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {studentDisciplineLogs.length === 0 ? 'Exemplary' : `${studentDisciplineLogs.length} Log(s)`}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Conduct Grade: <strong>A</strong></p>
                </div>
              </div>

              {/* Subject Marks Recharts Visualizer */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-purple-600" />
                    <h4 className="font-black text-slate-900 text-sm">Subject Marks &amp; Grades Distribution</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{subjectMarksData.length} Subjects Graded</span>
                </div>

                {subjectMarksData.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 italic text-xs">
                    No academic exam marks recorded yet for this student.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectMarksData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                  <p className="font-black">{data.fullSubject}</p>
                                  <p className="text-emerald-400 font-bold">Mark: {data.mark} / 100</p>
                                  <p className="text-amber-300 font-mono text-[10px]">Grade: {data.grade}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Pass (45)', fill: '#ef4444', fontSize: 9 }} />
                        <Bar dataKey="mark" radius={[6, 6, 0, 0]}>
                          {subjectMarksData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECHARTS & SUMMARY */}
          {(activeTab === 'overview' || activeTab === 'attendance') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-black text-slate-900 text-sm">Attendance Summary &amp; Reliability</h4>
                </div>
                {attendanceStats.isRisk && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase animate-pulse">
                    🚩 Auto-Flagged: 3+ Absences
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceStats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {attendanceStats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Days Present</span>
                    <span className="font-mono font-black text-emerald-600">{attendanceStats.present} Day(s)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Days Late</span>
                    <span className="font-mono font-black text-amber-600">{attendanceStats.late} Day(s)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Days Absent</span>
                    <span className="font-mono font-black text-rose-600">{attendanceStats.absent} Day(s)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Excused Absence</span>
                    <span className="font-mono font-black text-blue-600">{attendanceStats.excused} Day(s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BEHAVIOR & DISCIPLINE HISTORY */}
          {(activeTab === 'overview' || activeTab === 'behavior') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <h4 className="font-black text-slate-900 text-sm">Behavioral &amp; Discipline Logs</h4>
                </div>
                {onNavigateToDiscipline && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToDiscipline(student);
                      onClose();
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    + Log New Incident
                  </button>
                )}
              </div>

              {studentDisciplineLogs.length === 0 ? (
                <div className="p-6 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-3 text-emerald-900 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Clean Conduct Record</p>
                    <p className="text-emerald-700 text-[11px]">No formal disciplinary warnings or incidents recorded for {student.name}.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentDisciplineLogs.map((log, i) => (
                    <div key={log.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{log.title || log.category || 'Discipline Notice'}</span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            {log.category || log.status || 'Warning'}
                          </span>
                        </div>
                        <p className="text-slate-600">{log.description || 'Behavioral misconduct warning logged.'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Date: {log.date || 'N/A'} • Action: {log.actionTaken || 'Counseling'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MY REMEDIAL TIMETABLE */}
          {(activeTab === 'overview' || activeTab === 'remedial') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
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

              {studentRemedialSessions.length === 0 ? (
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

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Haby Edu Pro • Student Comprehensive Profile View</span>
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
