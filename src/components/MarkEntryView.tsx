import React, { useState, useMemo, useEffect } from 'react';
import { 
  Lock, 
  Edit3, 
  Printer, 
  Download, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Search, 
  Filter,
  Calendar,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  User,
  Layers,
  ChevronRight,
  Eye,
  Award
} from 'lucide-react';
import { 
  Student, 
  Teacher, 
  UserAccount, 
  Exam, 
  TimetableAssignment, 
  InvigilationSession, 
  PeriodSetting, 
  StreamSetting, 
  UsalRecord,
  SchoolInfo
} from '../types';
import { 
  SUBJECT_LIST, 
  NURSERY_SUBJECTS, 
  LOWER_PRIMARY_SUBJECTS, 
  UPPER_PRIMARY_SUBJECTS,
  SECONDARY_SUBJECTS,
  NURSERY_CLASSES,
  PRIMARY_CLASSES,
  SECONDARY_CLASSES
} from '../constants/defaults';
import { calculateOLevelDivision, calculatePrimaryScoreResult, isPrimaryOrNursery, getPrimarySubjectGradeInfo, cleanAndFilterMarksForClass, isSameClass } from '../utils/reportCardUtils';
import { USALModal } from './USAL/USALModal';

interface MarkEntryViewProps {
  students: Student[];
  teachers: Teacher[];
  exams: Exam[];
  timetableAssignments?: TimetableAssignment[];
  invigilationSessions?: InvigilationSession[];
  invigilationAssignments?: Record<string, number>;
  periodSettings?: PeriodSetting[];
  streamSettings?: StreamSetting[];
  usalRecords?: UsalRecord[];
  onSaveUsalRecord?: (record: UsalRecord) => void;
  currentUser?: UserAccount | null;
  schoolInfo?: SchoolInfo;
  onUpdateStudents: (updatedStudents: Student[]) => void;
}

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

export const MarkEntryView: React.FC<MarkEntryViewProps> = ({
  students,
  teachers,
  exams,
  timetableAssignments = [],
  invigilationSessions = [],
  invigilationAssignments = {},
  periodSettings = [],
  streamSettings = [],
  usalRecords = [],
  onSaveUsalRecord,
  currentUser,
  schoolInfo,
  onUpdateStudents
}) => {
  // Navigation sub-tab: 'marks' | 'timetable' | 'invigilation'
  const [activeSubTab, setActiveSubTab] = useState<'marks' | 'timetable' | 'invigilation'>('marks');
  const [isUsalModalOpen, setIsUsalModalOpen] = useState(false);

  // Filters for Marks Entry
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedExam, setSelectedExam] = useState<string>('Midterm I');
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Selected teacher for timetable view (if admin, can choose any teacher; if teacher, defaults to current)
  const isTeacher = currentUser?.role === 'TEACHER';
  
  // Find current teacher object
  const loggedInTeacher = useMemo(() => {
    if (!currentUser) return null;
    return teachers.find(t => 
      (currentUser.id && String(t.id) === String(currentUser.id)) ||
      (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser.fullName && t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()))
    ) || null;
  }, [currentUser, teachers]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(
    loggedInTeacher?.id || teachers[0]?.id || 1
  );

  useEffect(() => {
    if (loggedInTeacher) {
      setSelectedTeacherId(loggedInTeacher.id);
    }
  }, [loggedInTeacher]);

  const currentViewingTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || loggedInTeacher || teachers[0];
  }, [teachers, selectedTeacherId, loggedInTeacher]);

  // Dynamic available exams from both registered exams and standard defaults
  const allAvailableExams = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    exams.forEach(e => {
      if (e.name && !seen.has(e.name)) {
        seen.add(e.name);
        list.push(e.name);
      }
    });

    ['Midterm I', 'Terminal', 'Annual', 'Midterm II', 'Mock'].forEach(d => {
      if (!seen.has(d)) {
        seen.add(d);
        list.push(d);
      }
    });

    return list;
  }, [exams]);

  // Set default selectedExam from first registered exam if available
  useEffect(() => {
    if (exams.length > 0 && !exams.some(e => e.name === selectedExam)) {
      setSelectedExam(exams[0].name);
    }
  }, [exams]);

  // Dynamic registered streams across all students
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

  const isClassPrimary = isPrimaryOrNursery(undefined, selectedClass);
  const isClassNursery = NURSERY_CLASSES.includes(selectedClass);
  const isClassLowerPrimary = selectedClass === 'Standard 1' || selectedClass === 'Standard 2';

  // Subjects for appropriate school level, including all teacher subjects without limiting
  const availableSubjects = useMemo(() => {
    let baseList = [...SECONDARY_SUBJECTS];
    if (isClassNursery) {
      baseList = [...NURSERY_SUBJECTS];
    } else if (isClassLowerPrimary) {
      baseList = [...LOWER_PRIMARY_SUBJECTS];
    } else if (isClassPrimary) {
      baseList = [...UPPER_PRIMARY_SUBJECTS];
    }

    // Teacher sees ALL subjects for this educational level plus any specific subjects they teach
    const assigned = currentUser?.assignedSubjects || (loggedInTeacher?.subjects) || [];
    assigned.forEach(sub => {
      if (!baseList.some(b => b.toLowerCase().trim() === sub.toLowerCase().trim())) {
        baseList.push(sub);
      }
    });

    return baseList;
  }, [currentUser, loggedInTeacher, isClassNursery, isClassLowerPrimary, isClassPrimary]);

  const [selectedSubject, setSelectedSubject] = useState<string>(availableSubjects[0] || 'English Language');

  // Keep selected subject in sync with available subjects
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // Local state for mark values: studentId -> score
  const [localScores, setLocalScores] = useState<Record<number, number | string>>({});

  // Filter students matching class and stream strictly to prevent cross-class data mixing
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass && selectedClass !== 'ALL' 
        ? isSameClass(s.className, selectedClass) 
        : true;
      const matchStream = !selectedStream || selectedStream === 'All' || 
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      const matchSearch = !searchQuery || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.regNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchStream && matchSearch;
    });
  }, [students, selectedClass, selectedStream, searchQuery]);

  // Determine current score for a student
  const getStudentScore = (s: Student): number | string => {
    if (localScores[s.id] !== undefined) {
      return localScores[s.id];
    }
    return s.marks?.[selectedSubject] ?? '';
  };

  const handleScoreChange = (studentId: number, val: string) => {
    if (val === '') {
      setLocalScores(prev => ({ ...prev, [studentId]: '' }));
      return;
    }
    const num = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
    setLocalScores(prev => ({ ...prev, [studentId]: num }));
  };

  const getGradeInfo = (score: number | string) => {
    if (score === '' || isNaN(Number(score))) {
      return { grade: '-', color: 'text-slate-400 bg-slate-100' };
    }
    const s = Number(score);
    if (isClassPrimary) {
      const p = getPrimarySubjectGradeInfo(s);
      if (p.grade === 'A') return { grade: 'A', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
      if (p.grade === 'B') return { grade: 'B', color: 'text-blue-700 bg-blue-100 border-blue-300' };
      if (p.grade === 'C') return { grade: 'C', color: 'text-amber-700 bg-amber-100 border-amber-300' };
      if (p.grade === 'D') return { grade: 'D', color: 'text-orange-700 bg-orange-100 border-orange-300' };
      return { grade: 'E', color: 'text-rose-700 bg-rose-100 border-rose-300' };
    }
    // Official O-Level: A=75-100, B=65-74, C=45-64, D=30-44, F=0-29
    if (s >= 75) return { grade: 'A', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
    if (s >= 65) return { grade: 'B', color: 'text-blue-700 bg-blue-100 border-blue-300' };
    if (s >= 45) return { grade: 'C', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    if (s >= 30) return { grade: 'D', color: 'text-orange-700 bg-orange-100 border-orange-300' };
    return { grade: 'F', color: 'text-red-700 bg-red-100 border-red-300' };
  };

  // Calculate stats for current selection
  const stats = useMemo(() => {
    let markedCount = 0;
    let totalScore = 0;
    const dist: Record<string, number> = isClassPrimary 
      ? { A: 0, B: 0, C: 0, D: 0, E: 0 }
      : { A: 0, B: 0, C: 0, D: 0, F: 0 };

    filteredStudents.forEach(s => {
      const scoreVal = getStudentScore(s);
      if (scoreVal !== '' && !isNaN(Number(scoreVal))) {
        markedCount++;
        const num = Number(scoreVal);
        totalScore += num;
        const { grade } = getGradeInfo(num);
        if (dist[grade] !== undefined) {
          dist[grade]++;
        }
      }
    });

    const avg = markedCount > 0 ? (totalScore / markedCount).toFixed(1) : '-';
    return {
      total: filteredStudents.length,
      marked: markedCount,
      avg,
      dist
    };
  }, [filteredStudents, localScores, selectedSubject, isClassPrimary]);

  const handleSaveAll = () => {
    const updated = students.map(s => {
      const pending = localScores[s.id];
      if (pending === undefined) return s;

      const currentMarks = { ...(s.marks || {}) };
      if (pending === '') {
        delete currentMarks[selectedSubject];
        if (selectedSubject === 'Basic Mathematics') delete currentMarks['Mathematics'];
      } else {
        currentMarks[selectedSubject] = Number(pending);
        if (selectedSubject === 'Basic Mathematics') delete currentMarks['Mathematics'];
      }

      const isStudentPrimary = isPrimaryOrNursery(s.level, s.className || selectedClass);
      const cleanedMarks = cleanAndFilterMarksForClass(currentMarks, s.className || selectedClass, s.level);
      const markVals = Object.values(cleanedMarks);
      const total = markVals.reduce((acc, curr) => acc + curr, 0);
      const avg = markVals.length > 0 ? (total / markVals.length).toFixed(1) : undefined;

      if (isStudentPrimary) {
        const primaryRes = calculatePrimaryScoreResult(cleanedMarks);
        return {
          ...s,
          marks: cleanedMarks,
          total,
          average: avg,
          primaryGrade: primaryRes.overallGrade,
          passStatus: primaryRes.passStatus,
          division: primaryRes.overallGrade
        };
      } else {
        const olevel = calculateOLevelDivision(cleanedMarks);
        return {
          ...s,
          marks: cleanedMarks,
          total,
          average: avg,
          division: olevel.division
        };
      }
    });

    onUpdateStudents(updated);
    setLocalScores({});
    setSaveSuccessMsg(`Marks for ${selectedSubject} (${selectedClass} ${selectedStream} - ${selectedExam}) saved successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleExportCsv = () => {
    const rows = [
      ['REG NO', 'NAME', 'GENDER', 'CLASS', 'STREAM', 'EXAM', 'SUBJECT', 'SCORE', 'GRADE']
    ];
    filteredStudents.forEach(s => {
      const score = getStudentScore(s);
      const { grade } = getGradeInfo(score);
      rows.push([
        s.regNo,
        s.name,
        s.gender || '',
        s.className,
        s.stream || '',
        selectedExam,
        selectedSubject,
        score === '' ? '' : String(score),
        grade
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marks_${selectedClass}_${selectedStream}_${selectedSubject.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // --- TEACHER TIMETABLE & TEACHING SCHEDULE DATA ---
  const teacherTimetableSlots = useMemo(() => {
    if (!currentViewingTeacher) return [];
    const tName = currentViewingTeacher.name.toLowerCase();
    const tInit = currentViewingTeacher.initial?.toLowerCase();

    return timetableAssignments.filter(a => {
      const matchId = a.teacherId === currentViewingTeacher.id;
      const aTeacher = (('teacher' in a ? (a as any).teacher : '') || '').toLowerCase();
      return matchId || aTeacher === tName || (tInit && aTeacher === tInit) || aTeacher.includes(tName);
    });
  }, [currentViewingTeacher, timetableAssignments]);

  // Standard period names
  const periodsList = useMemo(() => {
    if (periodSettings.length > 0) {
      return periodSettings.map((p, idx) => p.name || `PERIOD ${idx + 1}`);
    }
    return [
      'PERIOD 1', 'PERIOD 2', 'PERIOD 3', 'PERIOD 4', 
      'PERIOD 5', 'PERIOD 6', 'PERIOD 7', 'PERIOD 8'
    ];
  }, [periodSettings]);

  // Matrix: day -> period -> assignment
  const scheduleMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, TimetableAssignment | undefined>> = {};
    WEEKDAYS.forEach(day => {
      matrix[day] = {};
      periodsList.forEach(p => {
        const found = teacherTimetableSlots.find(s => 
          s.day.toUpperCase() === day && s.period.toUpperCase() === p.toUpperCase()
        );
        matrix[day][p] = found;
      });
    });
    return matrix;
  }, [teacherTimetableSlots, periodsList]);

  // --- TEACHER INVIGILATION SESSIONS ---
  const teacherInvigilationSessions = useMemo(() => {
    if (!currentViewingTeacher) return [];
    return invigilationSessions.filter(s => {
      for (let r = 0; r < (s.rooms || 1); r++) {
        const key = `${s.id}_room${r}`;
        if (invigilationAssignments[key] === currentViewingTeacher.id) return true;
      }
      const anyS = s as any;
      if (anyS.invigilators && Array.isArray(anyS.invigilators)) {
        return anyS.invigilators.includes(currentViewingTeacher.id);
      }
      return false;
    });
  }, [currentViewingTeacher, invigilationSessions, invigilationAssignments]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Teacher Examination & Schedule Center
              </h2>
              {currentUser && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {currentUser.role}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter and lock subject marks, monitor teaching timetables, review invigilation duties, and view USAL ledgers.
            </p>
          </div>
        </div>

        {/* View Switcher Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('marks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'marks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Mark Entry Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('timetable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'timetable'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Class Timetable & Schedule</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
              {teacherTimetableSlots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('invigilation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'invigilation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Invigilation Schedule</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {teacherInvigilationSessions.length}
            </span>
          </button>

          {/* Quick USAL (Sealed Marksheet) Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsUsalModalOpen(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Open USAL (Sealed Continuous Assessment & Marksheet)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
            <span>USAL (Sealed)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MARK ENTRY LEDGER */}
      {activeSubTab === 'marks' && (
        <div className="space-y-5">
          {/* Notification banner for teachers */}
          {isTeacher && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-amber-900 shadow-xs">
              <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold flex items-center gap-2">
                  <span>Teacher Entry Mode: {currentUser?.fullName}</span>
                  <span className="bg-amber-200/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    Subjects: {availableSubjects.join(', ') || 'All subjects'}
                  </span>
                </div>
                <p className="text-amber-700 mt-0.5">
                  Enter student continuous assessment and exam marks. Click &ldquo;Save &amp; Publish All Marks&rdquo; when completed. You can also view your weekly teaching timetable or invigilation schedule using the tabs above.
                </p>
              </div>
            </div>
          )}

          {/* Filter Controls Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase tracking-wider text-[11px]">Class:</span>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
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
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase tracking-wider text-[11px]">Stream:</span>
                <select
                  value={selectedStream}
                  onChange={e => setSelectedStream(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Streams</option>
                  {availableStreams.map(str => (
                    <option key={str} value={str}>Stream {str}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase tracking-wider text-[11px]">Exam:</span>
                <select
                  value={selectedExam}
                  onChange={e => setSelectedExam(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {allAvailableExams.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase tracking-wider text-[11px]">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  className="bg-blue-50 border border-blue-300 rounded-lg px-3 py-1.5 font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                >
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search candidate or reg..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  isEditing 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Editing Mode' : 'View Mode'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
                title="Download CSV Template"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
                title="Print this ledger"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Marks</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {saveSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Candidates</div>
              <div className="text-xl font-black text-slate-800 mt-0.5">{stats.total}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks Entered</div>
              <div className="text-xl font-black text-blue-600 mt-0.5">{stats.marked} / {stats.total}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Average</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{stats.avg}</div>
            </div>
            <div className="bg-white border border-emerald-100 bg-emerald-50/20 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Grade A</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.dist['A'] || 0}</div>
            </div>
            <div className="bg-white border border-blue-100 bg-blue-50/20 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Grade B</div>
              <div className="text-xl font-black text-blue-700 mt-0.5">{stats.dist['B'] || 0}</div>
            </div>
            <div className="bg-white border border-amber-100 bg-amber-50/20 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Grade C</div>
              <div className="text-xl font-black text-amber-700 mt-0.5">{stats.dist['C'] || 0}</div>
            </div>
            <div className="bg-white border border-orange-100 bg-orange-50/20 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Grade D</div>
              <div className="text-xl font-black text-orange-700 mt-0.5">{stats.dist['D'] || 0}</div>
            </div>
            <div className="bg-white border border-rose-100 bg-rose-50/20 rounded-xl p-3 shadow-2xs text-center">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                {isClassPrimary ? 'Grade E' : 'Grade F'}
              </div>
              <div className="text-xl font-black text-rose-700 mt-0.5">
                {isClassPrimary ? (stats.dist['E'] || 0) : (stats.dist['F'] || 0)}
              </div>
            </div>
          </div>

          {/* Mark Entry Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  {selectedClass} {selectedStream !== 'All' ? `Stream ${selectedStream}` : '(All Streams)'} - {selectedSubject}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({selectedExam})
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Range: 0 - 100
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-12 border-r border-blue-900">#</th>
                    <th className="p-3 border-r border-blue-900">Reg No</th>
                    <th className="p-3 border-r border-blue-900">Candidate Full Name</th>
                    <th className="p-3 border-r border-blue-900 text-center">Sex</th>
                    <th className="p-3 border-r border-blue-900 text-center">Class & Stream</th>
                    <th className="p-3 border-r border-blue-900 text-center w-28">Score (0-100)</th>
                    <th className="p-3 border-r border-blue-900 text-center w-20">Grade</th>
                    <th className="p-3 border-r border-blue-900">Remarks</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        No candidates found for {selectedClass} {selectedStream} ({selectedSubject}). Register students in the Registration view.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => {
                      const currentScore = getStudentScore(st);
                      const { grade, color } = getGradeInfo(currentScore);
                      const hasScore = currentScore !== '' && !isNaN(Number(currentScore));

                      let remark = '-';
                      if (hasScore) {
                        const sc = Number(currentScore);
                        if (sc >= 75) remark = 'Excellent';
                        else if (sc >= 65) remark = 'Very Good';
                        else if (sc >= 45) remark = 'Good / Pass';
                        else if (sc >= 30) remark = 'Satisfactory';
                        else remark = 'Failed / Needs Help';
                      }

                      return (
                        <tr key={st.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 border-r border-slate-200 text-center text-slate-500 font-mono font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-800">
                            {st.regNo}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                            {st.name}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center font-medium">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.gender === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                              {st.gender ? (st.gender === 'Female' ? 'F' : 'M') : '-'}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center text-slate-600 font-medium">
                            {st.className} {st.stream || 'A'}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={currentScore}
                                  onChange={e => handleScoreChange(st.id, e.target.value)}
                                  placeholder="0-100"
                                  className="w-20 px-2.5 py-1 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                              </div>
                            ) : (
                              <span className="font-bold text-sm text-slate-800">
                                {hasScore ? currentScore : '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs border ${color}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 text-slate-600 font-medium">
                            {remark}
                          </td>
                          <td className="p-3 text-center">
                            {hasScore ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Recorded</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Card Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <strong>{filteredStudents.length}</strong> candidates for <strong>{selectedSubject}</strong>.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Publish All Marks</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TEACHER CLASS TIMETABLE & TEACHING SCHEDULE */}
      {activeSubTab === 'timetable' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Weekly Teaching Timetable &amp; Schedule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned teaching periods, streams, and subjects for faculty staff across the academic week.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Teacher selector (available if admin or reviewing other teachers) */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="text-slate-500">Teacher:</span>
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(Number(e.target.value))}
                  disabled={isTeacher}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 disabled:opacity-75"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.initial || 'T'}) - {t.schoolRole || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Schedule</span>
              </button>
            </div>
          </div>

          {/* Teacher Summary Badges */}
          {currentViewingTeacher && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faculty Member</div>
                <div className="text-base font-black text-slate-900 mt-1">{currentViewingTeacher.name}</div>
                <div className="text-xs text-blue-600 font-semibold mt-0.5">{currentViewingTeacher.schoolRole || 'Subject Teacher'}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teaching Subjects</div>
                <div className="text-sm font-bold text-slate-800 mt-1">
                  {(currentViewingTeacher.subjects || []).join(', ') || 'None specified'}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Streams</div>
                <div className="text-sm font-bold text-slate-800 mt-1">
                  {(currentViewingTeacher.teachingStreams || []).join(', ') || 'All Streams'}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Workload</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {teacherTimetableSlots.length} Periods <span className="text-xs font-normal text-slate-500">/ week</span>
                </div>
              </div>
            </div>
          )}

          {/* Timetable Grid Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">
                Weekly Class Teaching Grid (Monday – Friday)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Standard: 40 minutes per period
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-28 border-r border-blue-900">Day</th>
                    {periodsList.map((p, idx) => (
                      <th key={p} className="p-3 text-center border-r border-blue-900 min-w-[130px]">
                        <div>{p}</div>
                        <div className="text-[9px] text-blue-200 font-normal">
                          {periodSettings[idx] ? `${periodSettings[idx].start} - ${periodSettings[idx].end}` : `Period ${idx + 1}`}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {WEEKDAYS.map(day => (
                    <tr key={day} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5 border-r border-slate-200 font-black text-slate-900 bg-slate-50/80 text-center">
                        {day}
                      </td>
                      {periodsList.map(p => {
                        const slot = scheduleMatrix[day]?.[p];
                        return (
                          <td key={p} className="p-2.5 border-r border-slate-200 text-center align-top">
                            {slot ? (
                              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-slate-800 shadow-2xs space-y-1">
                                <div className="font-bold text-xs text-blue-900 leading-tight">
                                  {slot.subject}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-700 bg-white/70 py-0.5 px-1.5 rounded inline-block">
                                  {slot.className} {slot.stream ? `(${slot.stream})` : ''}
                                </div>
                                {slot.room && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Room: {slot.room}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <div>
                Total Scheduled Lessons: <strong>{teacherTimetableSlots.length}</strong>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('marks')}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <span>Back to Mark Entry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TEACHER INVIGILATION SCHEDULE */}
      {activeSubTab === 'invigilation' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Examination Invigilation Schedule
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled supervisory duty shifts, examination halls, and session timings for official exams.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invigilation Duty Slip</span>
              </button>
            </div>
          </div>

          {/* Invigilation Sessions Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">
                Assigned Invigilation Sessions ({teacherInvigilationSessions.length} total shifts)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Faculty: <strong>{currentViewingTeacher?.name}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-12 border-r border-blue-900">#</th>
                    <th className="p-3 border-r border-blue-900">Date &amp; Day</th>
                    <th className="p-3 border-r border-blue-900 text-center">Session</th>
                    <th className="p-3 border-r border-blue-900 text-center">Time</th>
                    <th className="p-3 border-r border-blue-900">Examination Subject</th>
                    <th className="p-3 border-r border-blue-900 text-center">Class &amp; Stream</th>
                    <th className="p-3 border-r border-blue-900 text-center">Rooms</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teacherInvigilationSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
                        No invigilation sessions assigned to {currentViewingTeacher?.name || 'this teacher'}. Check the Invigilation tab for school-wide rosters.
                      </td>
                    </tr>
                  ) : (
                    teacherInvigilationSessions.map((session, idx) => (
                      <tr key={session.id} className="hover:bg-amber-50/30 transition">
                        <td className="p-3.5 border-r border-slate-200 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 font-bold text-slate-900">
                          <div>{session.date || session.rawDate}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{session.day}</div>
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-center font-black text-blue-800">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[10px]">
                            {session.session}
                          </span>
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-center font-mono font-semibold text-slate-700">
                          {session.time || `${session.start} - ${session.end}`}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 font-bold text-slate-900">
                          {session.subject}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-center font-semibold text-slate-700">
                          {session.className} {session.stream ? `(${session.stream})` : ''}
                        </td>
                        <td className="p-3.5 border-r border-slate-200 text-center font-bold text-slate-800">
                          {session.rooms || 1} Room(s)
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 w-fit mx-auto">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirmed Shift</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <div>
                Total Invigilation Duties: <strong>{teacherInvigilationSessions.length}</strong>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('marks')}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <span>Back to Mark Entry</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USAL MODAL */}
      {isUsalModalOpen && (
        <USALModal
          isOpen={isUsalModalOpen}
          onClose={() => setIsUsalModalOpen(false)}
          usalRecords={usalRecords}
          onSaveUsalRecord={(rec) => {
            if (onSaveUsalRecord) onSaveUsalRecord(rec);
          }}
          students={students}
          teachers={teachers}
          schoolInfo={schoolInfo || { name: 'HABY EDU PRO' } as SchoolInfo}
          currentUser={currentUser}
          selectedExamName={selectedExam}
        />
      )}
    </div>
  );
};
