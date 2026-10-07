import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Save, 
  Printer, 
  Sparkles, 
  Filter, 
  Search, 
  Award, 
  Layers, 
  Calendar, 
  Check, 
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  BookMarked,
  Download,
  UserCheck,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Student, Teacher, SchoolInfo, StreamSetting, UserAccount, Exam } from '../../types';
import { format } from 'date-fns';
import { generateAutoLessonPlan } from '../../utils/lessonPlanGenerator';
import { LessonPlan } from '../../types/lessonPlan';
import { ReportCardDocument } from '../ReportCard/ReportCardDocument';
import { EditReportCardModal } from '../ReportCard/EditReportCardModal';
import { SUBJECT_LIST } from '../../constants/defaults';

interface TeacherPortalViewProps {
  teachers: Teacher[];
  students: Student[];
  schoolInfo: SchoolInfo;
  streamSettings?: StreamSetting[];
  currentUser?: UserAccount | null;
  dailyAttendance?: Record<string, Record<string, string>>;
  onSaveDailyAttendance?: (date: string, records: Record<string, string>) => void;
  onUpdateStudent?: (student: Student) => void;
  onUpdateStudents?: (students: Student[]) => void;
  exams?: Exam[];
  examinationRecords?: any[];
  onAutoSaveExaminationRecords?: (records: any[]) => void;
  onNavigateToView?: (view: string) => void;
}

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({
  teachers = [],
  students = [],
  schoolInfo,
  streamSettings = [],
  currentUser,
  dailyAttendance = {},
  onSaveDailyAttendance,
  onUpdateStudent,
  onUpdateStudents,
  exams = [],
  examinationRecords = [],
  onAutoSaveExaminationRecords,
  onNavigateToView
}) => {
  // 1. Identify Logged-in / Selected Teacher Context
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(() => {
    if (currentUser?.fullName) {
      const match = teachers.find(t => t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()) || currentUser.email === t.email);
      if (match) return match.id;
    }
    return teachers[0]?.id || 101;
  });

  const currentTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Active Tab inside Teacher Portal
  const [activeTab, setActiveTab] = useState<'attendance' | 'markentry' | 'lessonplan' | 'scheme' | 'reports'>('attendance');

  // Common Selection Filters
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedStream, setSelectedStream] = useState<string>('STREAM A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');

  // Auto-set teacher's primary subject & class on teacher change
  useEffect(() => {
    if (currentTeacher) {
      if (currentTeacher.subjects && currentTeacher.subjects.length > 0) {
        setSelectedSubject(currentTeacher.subjects[0]);
      }
      if (currentTeacher.teachingStreams && currentTeacher.teachingStreams.length > 0) {
        const raw = currentTeacher.teachingStreams[0];
        const parts = raw.split('-');
        if (parts.length >= 2) {
          setSelectedClass(parts[0].trim());
          setSelectedStream(parts[1].trim());
        }
      }
    }
  }, [currentTeacher]);

  // Available Classes & Streams
  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(streamSettings.map(s => s.className)));
    if (list.length === 0) return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7'];
    return list;
  }, [streamSettings]);

  const availableStreams = useMemo(() => {
    const streamObj = streamSettings.find(s => s.className === selectedClass);
    return streamObj?.streams || ['STREAM A', 'STREAM B', 'A', 'B'];
  }, [streamSettings, selectedClass]);

  // Available Subjects for Teacher
  const teacherSubjects = useMemo(() => {
    if (currentTeacher && currentTeacher.subjects && currentTeacher.subjects.length > 0) {
      return currentTeacher.subjects;
    }
    return SUBJECT_LIST;
  }, [currentTeacher]);

  // Filtered Students for selected class & stream
  const classStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = (s.className || '').toLowerCase().trim() === selectedClass.toLowerCase().trim();
      const matchStream = !selectedStream || selectedStream === 'ALL' || (s.stream || '').toLowerCase().trim() === selectedStream.toLowerCase().trim();
      return matchClass && matchStream;
    });
  }, [students, selectedClass, selectedStream]);

  // --------------------------------------------------------------------------
  // TAB 1: ATTENDANCE ROLL CALL (Kuita Majina)
  // --------------------------------------------------------------------------
  const [attendanceDate, setAttendanceDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [rollCallState, setRollCallState] = useState<Record<string, string>>({});
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // Load existing attendance for selected date
  useEffect(() => {
    const existingForDate = dailyAttendance[attendanceDate] || {};
    const initialRollCall: Record<string, string> = {};
    classStudents.forEach(st => {
      initialRollCall[st.id] = existingForDate[st.id] || 'present';
    });
    setRollCallState(initialRollCall);
  }, [attendanceDate, classStudents, dailyAttendance]);

  const handleMarkAllPresent = () => {
    const updated: Record<string, string> = {};
    classStudents.forEach(st => {
      updated[st.id] = 'present';
    });
    setRollCallState(updated);
  };

  const handleSaveAttendance = () => {
    if (onSaveDailyAttendance) {
      const currentMap = dailyAttendance[attendanceDate] || {};
      const mergedMap = { ...currentMap, ...rollCallState };
      onSaveDailyAttendance(attendanceDate, mergedMap);
      setAttendanceToast(`Hudhurio la wanafunzi ${classStudents.length} wa ${selectedClass} ${selectedStream} limehifadhiwa kikamilifu!`);
      setTimeout(() => setAttendanceToast(null), 4000);
    }
  };

  // --------------------------------------------------------------------------
  // TAB 2: MARK ENTRY FOR SUBJECT (Kuingiza Marks)
  // --------------------------------------------------------------------------
  const [selectedExamType, setSelectedExamType] = useState<string>('Terminal Exam');
  const [subjectMarks, setSubjectMarks] = useState<Record<string, number | string>>({});
  const [marksToast, setMarksToast] = useState<string | null>(null);

  // Load existing subject marks for class students
  useEffect(() => {
    const initialMarks: Record<string, number | string> = {};
    classStudents.forEach(st => {
      const val = st.marks?.[selectedSubject];
      initialMarks[st.id] = val !== undefined && val !== null ? val : '';
    });
    setSubjectMarks(initialMarks);
  }, [classStudents, selectedSubject]);

  const handleSaveSubjectMarks = () => {
    if (!onUpdateStudents) return;

    const updatedStudentsList = students.map(st => {
      const isTarget = classStudents.some(cs => cs.id === st.id);
      if (!isTarget) return st;

      const markVal = subjectMarks[st.id];
      const numericMark = markVal !== '' && markVal !== undefined ? Number(markVal) : undefined;
      
      const newMarks = { ...(st.marks || {}) };
      if (numericMark !== undefined && !isNaN(numericMark)) {
        newMarks[selectedSubject] = Math.min(100, Math.max(0, numericMark));
      }

      return {
        ...st,
        marks: newMarks
      };
    });

    onUpdateStudents(updatedStudentsList);
    setMarksToast(`Marks za somo la ${selectedSubject} zimehifadhiwa kikamilifu kwa wanafunzi wa ${selectedClass} ${selectedStream}!`);
    setTimeout(() => setMarksToast(null), 4000);
  };

  // --------------------------------------------------------------------------
  // TAB 3: LESSON PLAN GENERATOR & SCHEME OF WORK
  // --------------------------------------------------------------------------
  const [lessonTopic, setLessonTopic] = useState<string>('Algebraic Expressions & Equations');
  const [generatedLessonPlan, setGeneratedLessonPlan] = useState<LessonPlan | null>(null);

  const handleGenerateLessonPlan = () => {
    const plan = generateAutoLessonPlan({
      schoolId: currentUser?.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
      schoolName: schoolInfo?.name || 'HABY EDU PRO',
      teacherName: currentTeacher?.name || 'Mwalimu wa Somo',
      className: selectedClass,
      stream: selectedStream,
      subject: selectedSubject,
      curriculumType: 'NEW_CBC_2023',
      topic: lessonTopic
    });
    setGeneratedLessonPlan(plan);
  };

  // --------------------------------------------------------------------------
  // TAB 5: STUDENT REPORT CARDS (Ripoti za Wanafunzi)
  // --------------------------------------------------------------------------
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [editingReportStudent, setEditingReportStudent] = useState<Student | null>(null);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner - Sehemu ya Mwalimu */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-radial from-amber-500/15 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                SEHEMU YA MWALIMU • TEACHER HUB
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-blue-200 border border-white/15 rounded-full text-[10px] font-bold">
                {schoolInfo?.name || 'HABY EDU PRO'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Portal ya Mwalimu (Teacher Workspace)
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 font-medium max-w-2xl">
              Simamia mahudhurio ya wanafunzi, ingiza alama za masomo, andaa Lesson Plans na Schemes of Work, na utoe Ripoti za Maendeleo za darasa lako.
            </p>
          </div>

          {/* Teacher Selector Profile Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shrink-0 space-y-2 min-w-[280px]">
            <div className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
              Mwalimu Aliyeingia (Active Teacher)
            </div>
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-black bg-slate-900 text-white border border-white/20 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.schoolRole ? `(${t.schoolRole})` : ''}
                </option>
              ))}
            </select>
            
            {currentTeacher && (
              <div className="pt-2 border-t border-white/10 space-y-1 text-[11px] text-blue-100 font-medium">
                <div className="flex justify-between">
                  <span className="text-blue-300 font-bold">Masomo:</span>
                  <span className="font-bold text-amber-300 truncate max-w-[170px]" title={currentTeacher.subjects?.join(', ')}>
                    {currentTeacher.subjects?.join(', ') || 'Hatayajapangwa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300 font-bold">Mikondo/Madarasa:</span>
                  <span className="font-bold text-white truncate max-w-[170px]" title={currentTeacher.teachingStreams?.join(', ')}>
                    {currentTeacher.teachingStreams?.join(', ') || 'All Streams'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Class & Subject Filter Bar */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-amber-300 mb-1">
              1. Chagua Darasa / Form:
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white border border-white/20 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
            >
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-amber-300 mb-1">
              2. Mkondo (Stream):
            </label>
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white border border-white/20 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
            >
              {availableStreams.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-amber-300 mb-1">
              3. Somo Lako (Teaching Subject):
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white border border-white/20 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-hidden cursor-pointer"
            >
              {teacherSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-300" />
          <span>1. Kuita Majina (Attendance)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('markentry')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'markentry'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4 text-emerald-300" />
          <span>2. Kuingiza Marks (Mark Entry)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessonplan')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'lessonplan'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-300" />
          <span>3. Lesson Plan Generator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheme')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'scheme'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookMarked className="w-4 h-4 text-indigo-300" />
          <span>4. Scheme of Work</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-950" />
          <span>5. Ripoti za Wanafunzi (Report Cards)</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: KUITA MAJINA (STUDENT ROLL CALL)                              */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          
          {attendanceToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{attendanceToast}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>Orodha ya Wanafunzi - Kuita Majina ({selectedClass} {selectedStream})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chagua tarehe kisha uandikishe uwepo (Present / Absent / Late) kwa kila mwanafunzi.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Wote Wapo (Mark All Present)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Hifadhi Hudhurio</span>
              </button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Hakuna Wanafunzi Wasiyosajiliwa Kwenye {selectedClass} {selectedStream}</h4>
              <p className="text-xs text-slate-500">
                Tafadhali chagua darasa/mkondo mwingine hapo juu au usajili wanafunzi wapya.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Jina la Mwanafunzi</th>
                    <th className="py-3 px-4">Namba / Reg. No</th>
                    <th className="py-3 px-4 text-center">Hali ya Uwepo (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {classStudents.map((st, idx) => {
                    const currentStatus = rollCallState[st.id] || 'present';
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <span>{st.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{st.id || `STU-${idx+1}`}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRollCallState(prev => ({ ...prev, [st.id]: 'present' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Yupo (Present)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRollCallState(prev => ({ ...prev, [st.id]: 'absent' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                currentStatus === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Hayupo (Absent)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRollCallState(prev => ({ ...prev, [st.id]: 'late' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                currentStatus === 'late'
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Amechelewa (Late)</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: KUINGIZA MARKS (MARK ENTRY FOR SUBJECT)                       */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'markentry' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          
          {marksToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{marksToast}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <span>Kuingiza Marks - Somo: {selectedSubject} ({selectedClass} {selectedStream})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingiza alama za mtihani (0 - 100). Daraja na maoni ya maendeleo yatahesabiwa kiotomatiki.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedExamType}
                onChange={e => setSelectedExamType(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Terminal Exam">Terminal Examination</option>
                <option value="Mid-Term Exam">Mid-Term Examination</option>
                <option value="Annual Exam">Annual Examination</option>
                <option value="Monthly Test">Monthly Continuous Assessment</option>
              </select>

              <button
                type="button"
                onClick={handleSaveSubjectMarks}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Hifadhi Marks Za Somo</span>
              </button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Hakuna Wanafunzi Kwenye {selectedClass} {selectedStream}</h4>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Jina la Mwanafunzi</th>
                    <th className="py-3 px-4">Somo</th>
                    <th className="py-3 px-4 text-center">Marks (0-100)</th>
                    <th className="py-3 px-4 text-center">Daraja (Grade)</th>
                    <th className="py-3 px-4">Maoni (Remarks)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {classStudents.map((st, idx) => {
                    const currentVal = subjectMarks[st.id] !== undefined ? subjectMarks[st.id] : '';
                    const numVal = currentVal !== '' ? Number(currentVal) : null;
                    
                    let grade = '-';
                    let remark = 'Ingiza alama';
                    let gradeBadge = 'bg-slate-100 text-slate-600';

                    if (numVal !== null && !isNaN(numVal)) {
                      if (numVal >= 81) { grade = 'A'; remark = 'Bora Sana (Excellent)'; gradeBadge = 'bg-emerald-100 text-emerald-800 font-black'; }
                      else if (numVal >= 61) { grade = 'B'; remark = 'Vema Sana (Very Good)'; gradeBadge = 'bg-blue-100 text-blue-800 font-black'; }
                      else if (numVal >= 41) { grade = 'C'; remark = 'Vema (Good)'; gradeBadge = 'bg-amber-100 text-amber-800 font-black'; }
                      else if (numVal >= 21) { grade = 'D'; remark = 'Inaridhisha (Satisfactory)'; gradeBadge = 'bg-orange-100 text-orange-800 font-black'; }
                      else { grade = 'F'; remark = 'Inahitaji Jitiada (Fail)'; gradeBadge = 'bg-rose-100 text-rose-800 font-black'; }
                    }

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{st.name}</td>
                        <td className="py-3 px-4 font-semibold text-blue-700">{selectedSubject}</td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={currentVal}
                            onChange={e => {
                              const val = e.target.value;
                              setSubjectMarks(prev => ({ ...prev, [st.id]: val }));
                            }}
                            placeholder="0-100"
                            className="w-24 px-3 py-1.5 text-center text-sm font-black bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs ${gradeBadge}`}>
                            {grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium text-xs">
                          {remark}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: LESSON PLAN GENERATOR                                         */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'lessonplan' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span>Lesson Plan Generator - Somo: {selectedSubject} ({selectedClass})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Andaa Lesson Plan inayofuata miundo rasmi ya TIE/NECTA kwa kutumia syllabus ya somo lako.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateLessonPlan}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>⚡ Kutengeneza Lesson Plan Hivi Sasa</span>
            </button>
          </div>

          {/* Form controls for lesson topic */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mada Kuu (Main Topic / Competence):
              </label>
              <input
                type="text"
                value={lessonTopic}
                onChange={e => setLessonTopic(e.target.value)}
                placeholder="e.g. Quadratic Equations & Graphs"
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mwalimu wa Somo (Subject Teacher):
              </label>
              <input
                type="text"
                readOnly
                value={currentTeacher?.name || 'Mwalimu wa Somo'}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              />
            </div>
          </div>

          {/* Render Generated Lesson Plan Preview if present */}
          {generatedLessonPlan ? (
            <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                <h3 className="text-sm font-black text-purple-950 uppercase">
                  Lesson Plan Preview: {generatedLessonPlan.mainTopic}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-200 text-purple-900">
                  TIE & NECTA COMPLIANT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-purple-900">
                <div><strong>Class:</strong> {generatedLessonPlan.className}</div>
                <div><strong>Subject:</strong> {generatedLessonPlan.subject}</div>
                <div><strong>Date:</strong> {generatedLessonPlan.date}</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-purple-100 space-y-3 text-xs text-slate-800">
                <div>
                  <strong className="text-purple-900 block font-bold">General Competence / Sub-topic:</strong>
                  <p className="text-slate-700 mt-0.5">{generatedLessonPlan.subTopic}</p>
                </div>

                <div>
                  <strong className="text-purple-900 block font-bold">Teaching Aids / References:</strong>
                  <p className="text-slate-700 mt-0.5">{generatedLessonPlan.teachingMaterials?.join(', ')}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToView) onNavigateToView('lessonplans');
                  }}
                  className="px-4 py-2 bg-purple-600 text-white font-extrabold text-xs rounded-xl hover:bg-purple-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Fungua Kwenye Moduli Kuu ya Lesson Plan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <BookOpen className="w-8 h-8 text-purple-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Bofya 'Kutengeneza Lesson Plan'</h4>
              <p className="text-xs text-slate-500">
                Mfumo utatengeneza Lesson Plan kamili ya somo la {selectedSubject} mara moja.
              </p>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: SCHEME OF WORK                                                */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'scheme' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-indigo-600" />
                <span>Scheme of Work - Somo: {selectedSubject} ({selectedClass})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Usimamizi wa mada za Muhula (Termly Syllabus Scheme of Work) na maendeleo ya kila wiki.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onNavigateToView) onNavigateToView('schemes');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>Fungua Scheme of Work Manager</span>
            </button>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-6 text-center space-y-3">
            <BookMarked className="w-10 h-10 text-indigo-600 mx-auto" />
            <h3 className="text-base font-black text-indigo-950">Scheme of Work ya Somo la {selectedSubject}</h3>
            <p className="text-xs text-indigo-800 max-w-xl mx-auto">
              Scheme of Work inakuwezesha kupanga Mada Kuu, Mada Ndogo, Idadi ya Vipindi, Visual Aids, na References za TIE kulingana na muhula.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToView) onNavigateToView('schemes');
              }}
              className="px-5 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer inline-flex items-center gap-2 shadow-sm"
            >
              <span>Kagua & Badili Scheme of Work</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 5: RIPOTI ZA WANAFUNZI (CLASS STUDENT REPORT CARDS)              */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>Ripoti za Wanafunzi wa Darasa - {selectedClass} {selectedStream}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kama Mwalimu wa Darasa (Class Teacher), toa, hakiki au chapa (Print) Ripoti za Maendeleo za wanafunzi wako wote.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ripoti Zote Za Darasa</span>
              </button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Hakuna Wanafunzi Wasiyosajiliwa Kwenye {selectedClass} {selectedStream}</h4>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classStudents.map((st, idx) => {
                return (
                  <div key={st.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-amber-400 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-black flex items-center justify-center border border-amber-300 shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{st.name}</h4>
                          <p className="text-[11px] text-slate-500 font-mono">Reg: {st.id} • {st.className} {st.stream}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        Class Rank: #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForReport(st)}
                        className="px-3 py-1.5 bg-blue-600 text-white font-extrabold text-xs rounded-lg hover:bg-blue-700 transition cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Angalia Ripoti</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingReportStudent(st)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-lg hover:bg-amber-100 hover:text-amber-900 transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Badili Maoni & Tabia</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Single Report Preview Modal */}
      {selectedStudentForReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <h3 className="text-base font-black text-slate-900">
                Ripoti ya Maendeleo ya Mwanafunzi: {selectedStudentForReport.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForReport(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  Funga (Close)
                </button>
              </div>
            </div>

            <ReportCardDocument
              student={selectedStudentForReport}
              schoolInfo={schoolInfo}
              orientation="portrait"
              allStudents={classStudents}
            />
          </div>
        </div>
      )}

      {/* Edit Conduct / Teacher Remarks Modal */}
      {editingReportStudent && (
        <EditReportCardModal
          isOpen={!!editingReportStudent}
          onClose={() => setEditingReportStudent(null)}
          student={editingReportStudent}
          onSave={(updated: Student) => {
            if (onUpdateStudent) onUpdateStudent(updated);
            setEditingReportStudent(null);
          }}
        />
      )}

    </div>
  );
};
