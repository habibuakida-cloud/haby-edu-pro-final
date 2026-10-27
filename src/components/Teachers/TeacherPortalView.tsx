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
  ShieldCheck,
  KeyRound,
  FileEdit,
  ClipboardCheck,
  ShieldAlert
} from 'lucide-react';
import { ChangePasswordModal } from '../common/ChangePasswordModal';
import { Student, Teacher, SchoolInfo, StreamSetting, UserAccount, Exam, AcademicTermDates, TimetableAssignment, PeriodSetting, InvigilationSession, Supervisor, DutyRosterData, DisciplineRecord } from '../../types';
import { format } from 'date-fns';
import { generateAutoLessonPlan } from '../../utils/lessonPlanGenerator';
import { LessonPlan } from '../../types/lessonPlan';
import { ReportCardDocument } from '../ReportCard/ReportCardDocument';
import { EditReportCardModal } from '../ReportCard/EditReportCardModal';
import { SUBJECT_LIST } from '../../constants/defaults';
import { TeacherTimetable } from '../Timetable/TeacherTimetable';
import { TeacherProfileDashboard } from './TeacherProfileDashboard';
import { TeacherIndividualTestBank } from './TeacherIndividualTestBank';
import { TeacherDutyRosterTab } from './TeacherDutyRosterTab';
import { parseClassTeacherOf, formatClassTeacherString, getTeacherAllocatedStreams, isStudentEnrolledInSubject } from '../../utils/classTeacherUtils';

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
  academicTermDates?: AcademicTermDates;
  timetableAssignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  sessions?: InvigilationSession[];
  invigilationAssignments?: Record<string, number>;
  supervisors?: Supervisor[];
  journalRecords?: Record<string, any>;
  onUpdateJournal?: (records: Record<string, any>) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  dutyRosterData?: DutyRosterData;
  onUpdateDutyRoster?: (data: DutyRosterData) => void;
  disciplineRecords?: DisciplineRecord[];
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
  onNavigateToView,
  academicTermDates,
  timetableAssignments = [],
  periodSettings = [],
  sessions = [],
  invigilationAssignments = {},
  supervisors = [],
  journalRecords = {},
  onUpdateJournal,
  onUpdateTeacher,
  dutyRosterData,
  onUpdateDutyRoster,
  disciplineRecords = []
}) => {
  // 1. Identify Logged-in / Selected Teacher Context
  const isTeacherOnly = currentUser?.role === 'TEACHER' && !currentUser?.isSuperAdmin;

  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(() => {
    if (currentUser?.fullName) {
      const match = teachers.find(t => 
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()) || 
        currentUser.fullName.toLowerCase().includes(t.name.toLowerCase())
      );
      if (match) return match.id;
    }
    return teachers[0]?.id || 101;
  });

  const currentTeacher = useMemo(() => {
    return teachers.find(t => Number(t.id) === Number(selectedTeacherId)) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Invigilation duties assigned to current teacher
  const teacherInvigilationCount = useMemo(() => {
    if (!currentTeacher || !sessions || !invigilationAssignments) return 0;
    let count = 0;
    sessions.forEach(sess => {
      for (let r = 0; r < (sess.rooms || 1); r++) {
        if (Number(invigilationAssignments[`${sess.id}_room${r}`]) === Number(currentTeacher.id)) {
          count++;
        }
      }
    });
    return count;
  }, [currentTeacher, sessions, invigilationAssignments]);

  // Check if current teacher is an assigned Supervisor / Msimamizi Mkuu
  const isSupervisor = useMemo(() => {
    if (!currentTeacher || !supervisors || supervisors.length === 0) return false;
    return supervisors.some(s => 
      Number(s.teacherId) === Number(currentTeacher.id) ||
      (s.name && currentTeacher.name && s.name.toLowerCase().includes(currentTeacher.name.toLowerCase())) ||
      (currentTeacher.name && s.name && currentTeacher.name.toLowerCase().includes(s.name.toLowerCase()))
    );
  }, [currentTeacher, supervisors]);

  // Active Tab inside Teacher Portal
  const [activeTab, setActiveTab] = useState<'profile_dashboard' | 'timetable' | 'invigilation' | 'attendance' | 'test_records' | 'duty_roster' | 'markentry' | 'lessonplan' | 'scheme' | 'reports' | 'biometric'>('profile_dashboard');
  const [attendanceMode, setAttendanceMode] = useState<'subject_period' | 'class_official'>('subject_period');
  const [bioScanState, setBioScanState] = useState<'idle' | 'scanning' | 'registered'>(() => currentTeacher?.fingerprintEnrolled ? 'registered' : 'idle');
  const [bioToast, setBioToast] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    if (currentTeacher) {
      setBioScanState(currentTeacher.fingerprintEnrolled ? 'registered' : 'idle');
      setBioToast(null);
    }
  }, [currentTeacher?.id]);

  // Common Selection Filters
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedStream, setSelectedStream] = useState<string>('STREAM A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');

  // Class Teacher Assignment Details
  const classTeacherAssignment = useMemo(() => {
    if (!currentTeacher) return null;
    const parsed = parseClassTeacherOf(currentTeacher.classTeacherOf);
    if (parsed) return parsed;
    if (currentTeacher.isClassTeacher || currentTeacher.schoolRole === 'Class Teacher / Master') {
      return { className: 'Form 1', stream: 'STREAM A' };
    }
    return null;
  }, [currentTeacher]);

  const isClassTeacher = Boolean(classTeacherAssignment);

  // Auto-switch class & stream if switching to attendance / reports tab for Class Teacher
  useEffect(() => {
    if ((activeTab === 'attendance' || activeTab === 'reports') && classTeacherAssignment) {
      setSelectedClass(classTeacherAssignment.className);
      const str = classTeacherAssignment.stream.toUpperCase().startsWith('STREAM') 
        ? classTeacherAssignment.stream.toUpperCase() 
        : `STREAM ${classTeacherAssignment.stream.toUpperCase()}`;
      setSelectedStream(str);
    }
  }, [activeTab, classTeacherAssignment]);

  // Compute all allocated teaching streams for current teacher
  const allocatedStreamKeys = useMemo(() => {
    return getTeacherAllocatedStreams(currentTeacher, timetableAssignments);
  }, [currentTeacher, timetableAssignments]);

  // Auto-set teacher's primary subject & class on teacher change
  useEffect(() => {
    if (currentTeacher) {
      if (currentTeacher.subjects && currentTeacher.subjects.length > 0) {
        setSelectedSubject(currentTeacher.subjects[0]);
      }
      if (allocatedStreamKeys.length > 0) {
        const raw = allocatedStreamKeys[0];
        const parts = raw.split(/[-–—/]/);
        if (parts.length >= 2) {
          setSelectedClass(parts[0].trim());
          const str = parts[1].trim().toUpperCase().startsWith('STREAM') ? parts[1].trim().toUpperCase() : `STREAM ${parts[1].trim().toUpperCase()}`;
          setSelectedStream(str);
        }
      }
    }
  }, [currentTeacher, allocatedStreamKeys]);

  // Available Classes & Streams mapped from current teacher's assigned teachingStreams or streamSettings
  const availableClasses = useMemo(() => {
    if (allocatedStreamKeys.length > 0) {
      const classesFromAlloc = Array.from(new Set(allocatedStreamKeys.map(st => {
        const parts = st.split(/[-–—/]/);
        return parts[0]?.trim() || '';
      }).filter(Boolean)));
      if (classesFromAlloc.length > 0) return classesFromAlloc;
    }
    const list = Array.from(new Set(streamSettings.map(s => s.className)));
    if (list.length === 0) return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Standard 1', 'Standard 2', 'Standard 3', 'Standard 4', 'Standard 5', 'Standard 6', 'Standard 7'];
    return list;
  }, [allocatedStreamKeys, streamSettings]);

  const availableStreams = useMemo(() => {
    if (allocatedStreamKeys.length > 0) {
      const streamsForClass = allocatedStreamKeys
        .filter(st => st.toLowerCase().includes(selectedClass.toLowerCase()))
        .map(st => {
          const parts = st.split(/[-–—/]/);
          const raw = parts[1]?.trim() || st;
          return raw.toUpperCase().startsWith('STREAM') ? raw.toUpperCase() : `STREAM ${raw.toUpperCase()}`;
        });
      if (streamsForClass.length > 0) {
        return Array.from(new Set(streamsForClass));
      }
    }
    const streamObj = streamSettings.find(s => s.className === selectedClass);
    return streamObj?.streams || ['STREAM A', 'STREAM B', 'STREAM C', 'STREAM D'];
  }, [allocatedStreamKeys, streamSettings, selectedClass]);

  // Available Subjects for Teacher mapped from current teacher's assigned subjects in state
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
      const sStream = (s.stream || '').toLowerCase().trim().replace(/^stream\s+/i, '');
      const selStream = selectedStream.toLowerCase().trim().replace(/^stream\s+/i, '');
      const matchStream = !selectedStream || selectedStream === 'ALL' || sStream === selStream || sStream.includes(selStream) || selStream.includes(sStream);
      return matchClass && matchStream;
    });
  }, [students, selectedClass, selectedStream]);

  // Students enrolled in selected teaching subject (For Mark Entry & Subject Rosters)
  const subjectClassStudents = useMemo(() => {
    return classStudents.filter(s => isStudentEnrolledInSubject(s, selectedSubject));
  }, [classStudents, selectedSubject]);

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

  // Load existing subject marks for students enrolled in selectedSubject
  useEffect(() => {
    const initialMarks: Record<string, number | string> = {};
    subjectClassStudents.forEach(st => {
      const val = st.marks?.[selectedSubject];
      initialMarks[st.id] = val !== undefined && val !== null ? val : '';
    });
    setSubjectMarks(initialMarks);
  }, [subjectClassStudents, selectedSubject]);

  const handleSaveSubjectMarks = () => {
    if (!onUpdateStudents) return;

    const updatedStudentsList = students.map(st => {
      const isTarget = subjectClassStudents.some(cs => cs.id === st.id);
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
    setMarksToast(`Marks za somo la ${selectedSubject} zimehifadhiwa kikamilifu kwa wanafunzi ${subjectClassStudents.length} wa ${selectedClass} ${selectedStream}!`);
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
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                Mwalimu Aliyeingia (Active Teacher)
              </div>
              {isSupervisor && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>SUPERVISOR</span>
                </span>
              )}
            </div>
            {isTeacherOnly ? (
              <div className="w-full px-3 py-2 text-xs font-black bg-slate-900 text-amber-300 border border-white/20 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="truncate">{currentUser?.fullName || currentTeacher?.name}</span>
              </div>
            ) : (
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
            )}
            
            {currentTeacher && (
              <div className="pt-2 border-t border-white/10 space-y-1 text-[11px] text-blue-100 font-medium">
                <div className="flex justify-between">
                  <span className="text-blue-300 font-bold">Masomo:</span>
                  <span className="font-bold text-amber-300 truncate max-w-[170px]" title={currentTeacher.subjects?.join(', ')}>
                    {currentTeacher.subjects?.join(', ') || 'Hatayajapangwa'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-blue-300 font-bold">Mikondo/Madarasa (All Streams):</span>
                  <div className="flex flex-wrap gap-1">
                    {currentTeacher.teachingStreams && currentTeacher.teachingStreams.length > 0 ? (
                      currentTeacher.teachingStreams.map((st, sIdx) => (
                        <span key={sIdx} className="bg-white/15 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/20">
                          {st}
                        </span>
                      ))
                    ) : (
                      <span className="text-white font-bold text-[10px]">All Streams (Standard Allocation)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-950" />
                <span>Badili Nywila (Change Password)</span>
              </button>
            </div>
          </div>
        </div>

        <ChangePasswordModal
          currentUser={currentUser || null}
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
        />

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
          onClick={() => setActiveTab('profile_dashboard')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'profile_dashboard'
              ? 'bg-gradient-to-r from-indigo-900 to-blue-800 text-white shadow-md ring-2 ring-amber-400'
              : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>👤 Teacher Profile Dashboard (Wasifu & Journal)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'timetable'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-300" />
          <span>Ratiba ya Masomo (My Timetable)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invigilation')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'invigilation'
              ? 'bg-[#1f4d8b] text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Usimamizi wa Mitihani (Invigilation)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'invigilation'
              ? 'bg-amber-400 text-slate-950'
              : teacherInvigilationCount > 0
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {teacherInvigilationCount}
          </span>
        </button>

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
          onClick={() => setActiveTab('test_records')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'test_records'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-amber-300'
              : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <FileEdit className="w-4 h-4 text-amber-300" />
          <span>📝 Test Binafsi (Individual Test Bank)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('duty_roster')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'duty_roster'
              ? 'bg-teal-700 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-teal-300" />
          <span>📘 Kitabu cha Zamu (Duty Log Book)</span>
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

        <button
          type="button"
          onClick={() => setActiveTab('biometric')}
          className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'biometric'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <span>Biometric Enrollment</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 00: SPECIALIZED TEACHER PROFILE DASHBOARD                        */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'profile_dashboard' && (
        <TeacherProfileDashboard
          teachers={teachers}
          timetableAssignments={timetableAssignments}
          periodSettings={periodSettings}
          sessions={sessions}
          invigilationAssignments={invigilationAssignments}
          supervisors={supervisors}
          journalRecords={journalRecords}
          onUpdateJournal={onUpdateJournal}
          streamSettings={streamSettings}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          initialTeacherId={selectedTeacherId}
          onNavigateToView={onNavigateToView}
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 0A: RATIBA YA MASOMO (TEACHER TEACHING TIMETABLE)                */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'timetable' && (
        <TeacherTimetable
          teacher={currentTeacher}
          assignments={timetableAssignments}
          periodSettings={periodSettings}
          sessions={sessions}
          invigilationAssignments={invigilationAssignments}
          supervisors={supervisors}
          schoolInfo={schoolInfo}
          schoolName={schoolInfo?.name || 'HABY EDUPRO'}
          defaultScheduleType="teaching"
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 0B: RATIBA YA USIMAMIZI WA MITIHANI (INVIGILATION TIMETABLE)     */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'invigilation' && (
        <TeacherTimetable
          teacher={currentTeacher}
          assignments={timetableAssignments}
          periodSettings={periodSettings}
          sessions={sessions}
          invigilationAssignments={invigilationAssignments}
          supervisors={supervisors}
          schoolInfo={schoolInfo}
          schoolName={schoolInfo?.name || 'HABY EDUPRO'}
          defaultScheduleType="invigilation"
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1A: TEST BINAFSI ZA MWALIMU (TEACHER INDIVIDUAL TEST BANK)        */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'test_records' && (
        <TeacherIndividualTestBank
          currentTeacher={currentTeacher}
          students={students}
          schoolInfo={schoolInfo}
          streamSettings={streamSettings}
          selectedClass={selectedClass}
          selectedStream={selectedStream}
          selectedSubject={selectedSubject}
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1B: KITABU CHA ZAMU (DUTY ROSTER & TEACHER LOG)                    */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'duty_roster' && (
        <TeacherDutyRosterTab
          currentTeacher={currentTeacher}
          currentUser={currentUser}
          teachers={teachers}
          students={students}
          schoolInfo={schoolInfo}
          dutyRosterData={dutyRosterData}
          onUpdateDutyRoster={onUpdateDutyRoster}
        />
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1C: KUITA MAJINA (STUDENT ROLL CALL)                              */}
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

          {/* Attendance Type Selector Tabs */}
          <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-2 border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setAttendanceMode('subject_period')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                attendanceMode === 'subject_period'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Mahudhurio ya Kipindi cha Somo (Per-Period Subject)</span>
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full">100% Pre-ticked</span>
            </button>

            <button
              type="button"
              onClick={() => setAttendanceMode('class_official')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                attendanceMode === 'class_official'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>2. Mahudhurio Rasmi ya Shule (Class Morning Roll Call)</span>
              {isClassTeacher && <span className="px-2 py-0.5 bg-amber-300 text-slate-950 text-[9px] rounded-full font-black">Darasa Lako</span>}
            </button>
          </div>

          {attendanceMode === 'subject_period' ? (
            /* Mode A: Subject Per-Period Attendance */
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Mahudhurio ya Kipindi cha {selectedSubject} ({selectedClass} {selectedStream})</span>
                </h4>
                <span className="text-[10px] text-blue-800 font-bold bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-full">
                  Wanafunzi wote wamewekwa Yupo (Present) kwa default. Untick wale tu ambao hawapo.
                </span>
              </div>
              <p className="text-[11px] text-blue-900 font-medium">
                Rekodi hii ya somo ni kwa ajili ya kufuatilia mahudhurio ya vipindi vyako darasani. Inaonyesha wanafunzi wote waliohudhuria somo la {selectedSubject}.
              </p>
            </div>
          ) : (
            /* Mode B: Official Morning Roll Call */
            isClassTeacher && classTeacherAssignment ? (
              <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                    🎓
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                      Mwalimu wa Darasa (Class Teacher): {classTeacherAssignment.className} - {classTeacherAssignment.stream}
                    </h4>
                    <p className="text-[11px] text-emerald-900 font-medium">
                      Unaita majina na kusimamia mahudhurio ya kila siku (Roll Call) kwa darasa yako rasmi. Taarifa hizi zinaingia kwenye Database kuu ya Shule na Ripoti za Wanafunzi.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-700 text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-2xs shrink-0">
                  Darasa Lako Rasmi
                </span>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <h4 className="font-black uppercase tracking-wide">Taarifa kwa Mwalimu wa Somo:</h4>
                  <p>
                    Wewe ni Mwalimu wa Somo kwa darasa la {selectedClass} {selectedStream}. Mahudhurio haya rasmi ya asubuhi yanaidhinishwa na Mwalimu wa Darasa (Class Teacher) au Mwalimu wa Nidhamu. Unaweza kutumia Tab 1 ya "Mahudhurio ya Kipindi cha Somo" kujaza mahudhurio ya somo lako.
                  </p>
                </div>
              </div>
            )
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>Orodha ya Wanafunzi - Kuita Majina ({selectedClass} {selectedStream})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chagua tarehe kisha uandikishe uwepo (Present / Absent / Ruhusa / Sick) kwa kila mwanafunzi.
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
                        <td className="py-3 px-4 text-slate-500 font-mono">{st.regNo || st.id || `STU-${idx+1}`}</td>
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
                              <span>Yupo</span>
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
                              <span>Hayupo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRollCallState(prev => ({ ...prev, [st.id]: 'ruhusa' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                currentStatus === 'ruhusa'
                                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Ruhusa</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRollCallState(prev => ({ ...prev, [st.id]: 'sick' }))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                currentStatus === 'sick'
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Mgonjwa</span>
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

          {/* Class Teacher Discipline Feed Link */}
          {isClassTeacher && disciplineRecords && disciplineRecords.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Kumbukumbu za Nidhamu za Darasa Lako ({selectedClass} {selectedStream})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onNavigateToView && onNavigateToView('discipline')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Fungua Moduli ya Nidhamu →
                </button>
              </div>

              <div className="space-y-2">
                {disciplineRecords
                  .filter(r => r.className?.toLowerCase() === selectedClass.toLowerCase())
                  .slice(0, 3)
                  .map(r => (
                    <div key={r.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{r.studentName}</span>
                        <span className="text-slate-500 text-[11px] ml-2">• {r.title} ({r.category})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
              </div>
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

          {subjectClassStudents.length < classStudents.length && classStudents.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold flex items-center justify-between">
              <span>
                📚 Inaonyesha wanafunzi <strong>{subjectClassStudents.length}</strong> kati ya <strong>{classStudents.length}</strong> wa {selectedClass} {selectedStream} waliosajiliwa kusoma somo la <strong>{selectedSubject}</strong>.
              </span>
              <span className="text-[10px] bg-blue-200 text-blue-950 px-2 py-0.5 rounded font-black">
                {classStudents.length - subjectClassStudents.length} Hawajasajiliwa Somo Hili
              </span>
            </div>
          )}

          {subjectClassStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Hakuna Wanafunzi Waliosajiliwa Somo la {selectedSubject} Katika {selectedClass} {selectedStream}</h4>
              <p className="text-xs text-slate-500">
                Tafadhali kagua usajili wa masomo ya wanafunzi au chagua darasa jingine.
              </p>
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
                  {subjectClassStudents.map((st, idx) => {
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
          {!isClassTeacher && isTeacherOnly ? (
            <div className="p-8 text-center bg-amber-50/90 border border-amber-300 rounded-2xl space-y-3 shadow-xs">
              <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="text-base font-black text-amber-950">
                Ripoti za Maendeleo Zinasimamiwa na Mwalimu wa Darasa (Class Teacher)
              </h3>
              <p className="text-xs text-amber-900 max-w-lg mx-auto font-medium">
                Kama Mwalimu wa Somo, unaingiza alama za masomo yako kwenye Tab ya 2 (Kuingiza Marks). Ripoti za Maendeleo (Report Cards) za darasa zinasimamiwa, kuandikwa maoni, na kuchapishwa na Mwalimu wa Darasa (Class Teacher) husika au Uongozi wa Shule.
              </p>
            </div>
          ) : (
            <>
              {isClassTeacher && classTeacherAssignment && (
                <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                      🎓
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                        Mwalimu wa Darasa (Class Teacher): {classTeacherAssignment.className} - {classTeacherAssignment.stream}
                      </h4>
                      <p className="text-[11px] text-emerald-900 font-medium">
                        Unakagua, kuandika maoni (Remarks), na kuchapa Ripoti za Maendeleo za darasa yako.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-700 text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-2xs shrink-0">
                    Darasa Lako
                  </span>
                </div>
              )}

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
            </>
          )}

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

      {/* -------------------------------------------------------------------- */}
      {/* TAB 6: BIOMETRIC ENROLLMENT TAB                                      */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'biometric' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Biometric Enrollment - {currentTeacher.name}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sajili alama ya vidole vya mwalimu ili kujiandikisha kuingia (Arrival) na kutoka (Departure) kazini kwa urahisi.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              currentTeacher.fingerprintEnrolled ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-amber-50 text-amber-800 border border-amber-300'
            }`}>
              {currentTeacher.fingerprintEnrolled ? `🔑 Registered (${currentTeacher.fingerprintId || 'Enrolled'})` : '⚠️ Not Enrolled'}
            </span>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl transition-all duration-700 ${
                bioScanState === 'scanning'
                  ? 'bg-indigo-600 text-white animate-pulse ring-8 ring-indigo-200 scale-105'
                  : bioScanState === 'registered'
                  ? 'bg-emerald-600 text-white ring-8 ring-emerald-200 scale-105'
                  : 'bg-white text-indigo-700 border-4 border-dashed border-indigo-300 hover:border-indigo-500 cursor-pointer'
              }`}
              onClick={() => {
                if (bioScanState === 'scanning') return;
                setBioScanState('scanning');
                setBioToast(null);
                setTimeout(() => {
                  setBioScanState('registered');
                  const fpId = currentTeacher.fingerprintId || `FP-${Math.floor(1000 + Math.random() * 9000)}`;
                  setBioToast(`Registered: Alama ya kidole imesajiliwa kikamilifu kwa ${currentTeacher.name} (${fpId})!`);
                  if (onUpdateTeacher) {
                    onUpdateTeacher({
                      ...currentTeacher,
                      fingerprintEnrolled: true,
                      fingerprintId: fpId
                    });
                  }
                }, 1800);
              }}
              title="Gusa hapa kuweka kidole kwenye skana"
              >
                <ShieldCheck className="w-16 h-16" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              {bioScanState === 'idle' && (
                <>
                  <p className="text-sm font-black text-slate-800">Weka Kidole kwenye Skana ya Biometric</p>
                  <p className="text-xs text-slate-500">Bonyeza duara la skana hapo juu au kitufe cha chini kuiga mwalimu kuweka kidole kwenye kifaa.</p>
                </>
              )}
              {bioScanState === 'scanning' && (
                <>
                  <p className="text-sm font-black text-indigo-700 animate-bounce">Scanning... Tafadhali subiri kidole kinasomwa...</p>
                  <p className="text-xs text-slate-500">Inathibitisha alama ya kipekee ya vidole vya mwalimu...</p>
                </>
              )}
              {bioScanState === 'registered' && (
                <>
                  <p className="text-sm font-black text-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Registered (Imesajiliwa Mafanikio)
                  </p>
                  <p className="text-xs text-emerald-800 font-medium">Alama ya vidole imehifadhiwa salama kwenye mfumo wa shule. Sasa mwalimu anaweza kutumia kidole kuingia na kutoka kazini.</p>
                </>
              )}
            </div>

            {bioToast && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold w-full flex items-center justify-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bioToast}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={bioScanState === 'scanning'}
                onClick={() => {
                  setBioScanState('scanning');
                  setBioToast(null);
                  setTimeout(() => {
                    setBioScanState('registered');
                    const fpId = currentTeacher.fingerprintId || `FP-${Math.floor(1000 + Math.random() * 9000)}`;
                    setBioToast(`Registered: Alama ya kidole imesajiliwa mafanikio! ID: ${fpId}`);
                    if (onUpdateTeacher) {
                      onUpdateTeacher({
                        ...currentTeacher,
                        fingerprintEnrolled: true,
                        fingerprintId: fpId
                      });
                    }
                  }, 1800);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition"
              >
                {bioScanState === 'scanning' ? 'Scanning...' : 'Anzisha Usajili wa Kidole'}
              </button>
              {currentTeacher.fingerprintEnrolled && (
                <button
                  type="button"
                  onClick={() => {
                    setBioScanState('idle');
                    setBioToast(null);
                    if (onUpdateTeacher) {
                      onUpdateTeacher({
                        ...currentTeacher,
                        fingerprintEnrolled: false,
                        fingerprintId: undefined
                      });
                    }
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Futa Usajili (Revoke)
                </button>
              )}
            </div>
          </div>
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
              academicTermDates={academicTermDates}
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
