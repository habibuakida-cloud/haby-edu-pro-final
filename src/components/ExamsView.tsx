import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  X, 
  CheckCircle2, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Layers,
  LayoutGrid,
  List,
  Filter,
  Eye,
  Check,
  FileSpreadsheet,
  Lock,
  Unlock,
  Sliders,
  ShieldCheck,
  UserCheck,
  Edit3
} from 'lucide-react';
import { useConfirmDelete } from '../context/ConfirmDeleteContext';
import { Exam, InvigilationSession, EducationLevel, Student, SchoolInfo, Teacher, UserAccount } from '../types';
import { ALL_SCHOOL_CLASSES, NURSERY_CLASSES, PRIMARY_CLASSES, SECONDARY_CLASSES, SUBJECT_NAMES_LIST, SECONDARY_SUBJECTS, PRIMARY_SUBJECTS } from '../constants/defaults';
import { ExamDocumentsModal } from './Exams/ExamDocumentsModal';
import { SubjectPaperConfigModal } from './Exams/SubjectPaperConfigModal';
import { ExamSettingsView } from './Exams/ExamSettingsView';

interface ExamsViewProps {
  exams: Exam[];
  teachers?: Teacher[];
  currentUser?: UserAccount | null;
  onAddExam: (exam: Exam, session: InvigilationSession) => void;
  onUpdateExam?: (exam: Exam) => void;
  onUpdateExams?: (exams: Exam[]) => void;
  onDeleteExam: (id: number) => void;
  students?: Student[];
  schoolInfo?: SchoolInfo;
  onNavigateToMarkEntry?: (examName?: string, className?: string) => void;
  initialViewMode?: 'calendar' | 'table' | 'settings';
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  teachers = [],
  currentUser,
  onAddExam,
  onUpdateExam,
  onUpdateExams,
  onDeleteExam,
  students = [],
  schoolInfo,
  onNavigateToMarkEntry,
  initialViewMode = 'calendar'
}) => {
  const { openConfirmDelete } = useConfirmDelete();
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'settings'>(initialViewMode);
  const [calendarScope, setCalendarScope] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Filtering
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Teacher Profile & HOD Authorization Check
  const loggedInTeacher = useMemo(() => {
    if (!currentUser || !teachers.length) return null;
    return teachers.find(t => 
      (currentUser.id && String(t.id) === String(currentUser.id)) ||
      (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser.fullName && (
        t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()) ||
        currentUser.fullName.toLowerCase().includes(t.name.toLowerCase())
      ))
    ) || null;
  }, [currentUser, teachers]);

  const isAdminOrHOD = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.isSuperAdmin) return true;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HEADMASTER' || currentUser.role === 'ACADEMIC') return true;
    const roleName = (loggedInTeacher?.schoolRole || '').toLowerCase();
    return (
      roleName.includes('head of department') ||
      roleName.includes('hod') ||
      roleName.includes('academic master') ||
      roleName.includes('academic mistress') ||
      roleName.includes('headmaster') ||
      roleName.includes('deputy') ||
      roleName.includes('second master')
    );
  }, [currentUser, loggedInTeacher]);

  // Assigned subjects and classes for the teacher
  const assignedSubjects = useMemo(() => {
    if (isAdminOrHOD) return SUBJECT_NAMES_LIST;
    const list = loggedInTeacher?.subjects || currentUser?.assignedSubjects || [];
    return list.length > 0 ? list : ['Basic Mathematics'];
  }, [isAdminOrHOD, loggedInTeacher, currentUser]);

  const assignedClasses = useMemo(() => {
    if (isAdminOrHOD) return ALL_SCHOOL_CLASSES;
    const rawStreams = loggedInTeacher?.teachingStreams || [];
    const classSet = new Set<string>();
    rawStreams.forEach(str => {
      const parts = str.split(/[-–—/]/);
      const cls = (parts[0] || str).trim();
      if (cls) classSet.add(cls);
    });
    return Array.from(classSet);
  }, [isAdminOrHOD, loggedInTeacher]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | string | null>(null);
  const [selectedExamDetails, setSelectedExamDetails] = useState<Exam | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalExamId, setDocModalExamId] = useState<number | string | undefined>(undefined);
  const [isPaperConfigModalOpen, setIsPaperConfigModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Midterm I');
  const [level, setLevel] = useState<EducationLevel>('PRIMARY');
  const [className, setClassName] = useState('Standard 7');
  const [subject, setSubject] = useState(assignedSubjects[0] || 'Basic Mathematics');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  
  // HOD Override states for setting/creating exams
  const [isHODOverride, setIsHODOverride] = useState(false);
  const [hodApprovedBy, setHodApprovedBy] = useState('');
  const [overrideReason, setOverrideReason] = useState('Dharura / Mwalimu mkuu wa somo hayupo');
  const [authError, setAuthError] = useState<string | null>(null);

  // Filtered exams according to level & class
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchLevel = levelFilter === 'ALL' || e.level === levelFilter;
      const matchClass = classFilter === 'ALL' || e.className === classFilter || e.className === 'All';
      return matchLevel && matchClass;
    });
  }, [exams, levelFilter, classFilter]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Generate Month Days (Monday - Sunday aligned)
  const monthDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday is 0, Sunday is 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    // Previous month padding
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLastDay - i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        isCurrentMonth: false,
        dayNumber: prevLastDay - i
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        isCurrentMonth: true,
        dayNumber: i
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        isCurrentMonth: false,
        dayNumber: i
      });
    }

    return days;
  }, [year, month]);

  // Generate Week Days (Monday to Sunday for selected week)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);

    const days: Array<{
      date: Date;
      dateString: string;
      dayName: string;
      dayNumber: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate()
      });
    }
    return days;
  }, [currentDate]);

  // Check schedule overlaps (same day, same class or same level)
  const scheduleConflicts = useMemo(() => {
    const conflicts: Record<string, Exam[]> = {};
    const dateMap: Record<string, Exam[]> = {};

    exams.forEach(e => {
      const d = e.date ? e.date.slice(0, 10) : '';
      if (!d) return;
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(e);
    });

    Object.entries(dateMap).forEach(([d, examList]) => {
      if (examList.length > 1) {
        // Group by class or check if 2 exams share class/all
        const classSeen: Record<string, boolean> = {};
        let hasCollision = false;

        examList.forEach(e => {
          const c = e.className || 'All';
          if (c === 'All' || classSeen[c] || classSeen['All']) {
            hasCollision = true;
          }
          classSeen[c] = true;
        });

        if (hasCollision || examList.length >= 2) {
          conflicts[d] = examList;
        }
      }
    });

    return conflicts;
  }, [exams]);

  // Navigate calendar
  const handlePrev = () => {
    if (calendarScope === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (calendarScope === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenAddOnDate = (targetDateString: string) => {
    setEditingExamId(null);
    setName('');
    setDate(targetDateString);
    setAuthError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setName(exam.name || '');
    setType(exam.type || 'Midterm I');
    setLevel((exam.level as EducationLevel) || 'PRIMARY');
    setClassName(exam.className || 'Standard 7');
    setSubject(exam.subject || assignedSubjects[0] || 'Basic Mathematics');
    setDate(exam.date ? exam.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setStatus(exam.status === 'Inactive' ? 'Inactive' : 'Active');
    setIsHODOverride(Boolean(exam.isHODOverride));
    setHodApprovedBy(exam.hodApprovedBy || '');
    setOverrideReason(exam.hodOverrideReason || 'Dharura / Mwalimu mkuu wa somo hayupo');
    setAuthError(null);
    setSelectedExamDetails(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Enter examination title.');
      return;
    }

    // Cross-reference teacher's profile (subjects & teachingStreams) with selected exam's class and subject
    if (!isAdminOrHOD) {
      const cleanSub = (subject || name).toLowerCase().trim();
      const isSubAssigned = assignedSubjects.some(s => {
        const cs = s.toLowerCase().trim();
        return cs === cleanSub || cleanSub.includes(cs) || cs.includes(cleanSub);
      });

      const cleanClass = className.toLowerCase().trim();
      const isClassAssigned = className === 'All' || assignedClasses.some(c => {
        const cc = c.toLowerCase().trim();
        return cc === cleanClass || cleanClass.includes(cc) || cc.includes(cleanClass);
      });

      if (!isSubAssigned || !isClassAssigned) {
        if (!isHODOverride) {
          const err = `⛔ UZUIZI WA WASIFU WA MWALIMU:\nHuwezi kutunga mtihani wa somo la "${subject || name}" kwa darasa la "${className}".\n\nKulingana na usajili wako:\n• Masomo Uliyopangiwa: ${assignedSubjects.join(', ') || 'Hamna'}\n• Madarasa Uliyopangiwa: ${assignedClasses.join(', ') || 'Hamna'}\n\nIkiwa umepewa kazi hii na Mkuu wa Idara, tafadhali weka alama ya "Kibali cha Mkuu wa Idara (HOD Override)" na uweke jina lake.`;
          setAuthError(err);
          alert(err);
          return;
        }

        if (!hodApprovedBy.trim()) {
          const err = 'Tafadhali chagua au ingiza jina la Mkuu wa Idara (HOD) aliyetoa kibali hiki kabla ya kuhifadhi.';
          setAuthError(err);
          alert(err);
          return;
        }
      }
    }

    if (editingExamId !== null) {
      const existingExam = exams.find(ex => String(ex.id) === String(editingExamId));
      const updatedExam: Exam = {
        ...(existingExam || {}),
        id: Number(editingExamId),
        name: name.trim(),
        type: type || name.trim(),
        level,
        className,
        date,
        status,
        subject: subject || name.trim(),
        assignedTeacherId: existingExam?.assignedTeacherId || loggedInTeacher?.id,
        assignedTeacherName: existingExam?.assignedTeacherName || loggedInTeacher?.name || currentUser?.fullName || 'Academic Staff',
        isHODOverride: !isAdminOrHOD && isHODOverride,
        hodApprovedBy: isHODOverride ? hodApprovedBy : undefined,
        hodOverrideReason: isHODOverride ? overrideReason : undefined
      };

      if (onUpdateExam) {
        onUpdateExam(updatedExam);
      }
      if (onUpdateExams) {
        onUpdateExams(exams.map(ex => String(ex.id) === String(editingExamId) ? updatedExam : ex));
      }

      setIsModalOpen(false);
      setEditingExamId(null);
      setName('');
      setAuthError(null);
      setIsHODOverride(false);
      setHodApprovedBy('');
      return;
    }

    const examId = Date.now();
    const newExam: Exam = {
      id: examId,
      name: name.trim(),
      type: type || name.trim(),
      level,
      className,
      date,
      status,
      subject: subject || name.trim(),
      assignedTeacherId: loggedInTeacher?.id,
      assignedTeacherName: loggedInTeacher?.name || currentUser?.fullName || 'Academic Staff',
      isHODOverride: !isAdminOrHOD && isHODOverride,
      hodApprovedBy: isHODOverride ? hodApprovedBy : undefined,
      hodOverrideReason: isHODOverride ? overrideReason : undefined
    };

    // Auto-create matching invigilation session
    const parsedDate = new Date(`${date}T00:00:00`);
    const dayName = isNaN(parsedDate.getTime()) ? 'Monday' : parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = isNaN(parsedDate.getTime()) ? date : parsedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const newSession: InvigilationSession = {
      id: examId + 1,
      examTitle: name.trim(),
      rawDate: date,
      date: formattedDate,
      day: dayName,
      session: 'SESSION I',
      start: '08:00',
      end: '10:30',
      time: '08:00-10:30',
      subject: subject || name.trim(),
      level,
      className: className.toUpperCase(),
      stream: level === 'ACSEE' ? 'PCM' : 'STREAM A',
      rooms: 2
    };

    onAddExam(newExam, newSession);
    setIsModalOpen(false);
    setEditingExamId(null);
    setName('');
    setAuthError(null);
    setIsHODOverride(false);
    setHodApprovedBy('');
  };

  const handleToggleStatus = (exam: Exam) => {
    const updatedStatus: 'Active' | 'Inactive' = (exam.status || 'Active') === 'Active' ? 'Inactive' : 'Active';
    if (onUpdateExam) {
      onUpdateExam({
        ...exam,
        status: updatedStatus
      });
    }
    if (selectedExamDetails && selectedExamDetails.id === exam.id) {
      setSelectedExamDetails({
        ...selectedExamDetails,
        status: updatedStatus
      });
    }
  };

  const getLevelBadgeClass = (lvl?: string) => {
    switch (lvl) {
      case 'PRE_PRIMARY':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'PRIMARY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ACSEE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CSEE':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const totalConflictDays = Object.keys(scheduleConflicts).length;

  return (
    <div className="space-y-6">
      {/* Examination Management Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span>Examination Scheduling & Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Plan, visualize, and schedule examinations across Nursery, Primary, O-Level, and A-Level to avoid overlapping conflicts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List ({exams.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('settings')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'settings' 
                  ? 'bg-rose-700 text-white shadow-2xs font-black' 
                  : 'text-slate-700 hover:text-rose-700'
              }`}
              title="Dhibiti ufunguaji na ufungwaji wa mitihani (Lock / Unlock)"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Exam Settings (Lock Control)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                viewMode === 'settings' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {exams.filter(e => e.status === 'Inactive' || e.status === 'Locked' || e.isActive === false).length > 0 
                  ? `${exams.filter(e => e.status === 'Inactive' || e.status === 'Locked' || e.isActive === false).length} LOCKED` 
                  : 'ACTIVE'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              viewMode === 'settings'
                ? 'bg-rose-700 text-white ring-2 ring-rose-400 font-black'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
            }`}
            title="Dhibiti ufunguaji na ufungwaji wa mitihani kwa walimu (Active/Locked switch)"
          >
            <Sliders className="w-4 h-4 text-rose-600" />
            <span>Exam Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaperConfigModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Configure Paper 1, Paper 2, and Paper 3 formats for O-Level and Advance Level subjects"
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>Subject Papers Matrix (Paper 1, 2, 3)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocModalExamId(undefined);
              setIsDocModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Generate Photo Entry Form, ISAL, and CAL documents for each class and stream"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>Exam Documents (Photo Entry, ISAL, CAL)</span>
          </button>

          <button
            onClick={() => {
              setEditingExamId(null);
              setName('');
              setAuthError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </button>
        </div>
      </div>

      {/* OVERLAP CONFLICT BANNER IF DETECTED */}
      {totalConflictDays > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold">Schedule Overlap Alert: </span>
            <span>
              {totalConflictDays} date(s) have multiple examinations scheduled concurrently. Please review the highlighted calendar dates below to adjust schedules and prevent student test collisions.
            </span>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Calendar Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Prev / Next / Today */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-bold hover:bg-slate-100 rounded-md text-slate-700 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-base font-black text-[#1f4d8b]">
                {calendarScope === 'month' 
                  ? monthName 
                  : `Week of ${weekDays[0].dayNumber} - ${weekDays[6].dayNumber} ${monthName}`}
              </h3>
            </div>

            {/* Scope & Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {/* Month / Week switch */}
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCalendarScope('month')}
                  className={`px-3 py-1 rounded-md text-xs cursor-pointer ${
                    calendarScope === 'month' ? 'bg-[#1f4d8b] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarScope('week')}
                  className={`px-3 py-1 rounded-md text-xs cursor-pointer ${
                    calendarScope === 'week' ? 'bg-[#1f4d8b] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Level Filter */}
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Levels</option>
                <option value="PRE_PRIMARY">Pre-Primary (Nursery)</option>
                <option value="PRIMARY">Primary (Std 1-7)</option>
                <option value="CSEE">O-Level (Form 1-4)</option>
                <option value="ACSEE">A-Level (Form 5-6)</option>
              </select>

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Classes</option>
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
          </div>

          {/* MONTHLY CALENDAR GRID */}
          {calendarScope === 'month' && (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600 text-center uppercase tracking-wider py-2">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-amber-700">Sat</div>
                <div className="text-rose-700">Sun</div>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                {monthDays.map((cell, idx) => {
                  const dayExams = filteredExams.filter(e => e.date && e.date.slice(0, 10) === cell.dateString);
                  const isConflictDay = scheduleConflicts[cell.dateString] && scheduleConflicts[cell.dateString].length > 1;
                  const isToday = cell.dateString === todayIso;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-2 transition-colors relative flex flex-col justify-between group ${
                        !cell.isCurrentMonth 
                          ? 'bg-slate-50/50 text-slate-400' 
                          : isConflictDay 
                            ? 'bg-amber-50/60' 
                            : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div>
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                              isToday
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : cell.isCurrentMonth
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          <div className="flex items-center gap-1">
                            {isConflictDay && (
                              <span 
                                title="Overlap detected: multiple exams on this day"
                                className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-0.5"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                <span>Overlap</span>
                              </span>
                            )}

                            {/* Quick Add Button on Hover */}
                            <button
                              type="button"
                              onClick={() => handleOpenAddOnDate(cell.dateString)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-blue-100 rounded text-blue-600 transition-opacity cursor-pointer"
                              title={`Schedule exam on ${cell.dateString}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Exam Pills */}
                        <div className="mt-1.5 space-y-1">
                          {dayExams.slice(0, 3).map(ex => {
                            const isActive = (ex.status || 'Active') === 'Active';
                            return (
                              <div
                                key={ex.id}
                                onClick={() => setSelectedExamDetails(ex)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer shadow-2xs hover:scale-101 ${
                                  isActive
                                    ? getLevelBadgeClass(ex.level)
                                    : 'bg-slate-100 text-slate-500 border-slate-300 opacity-60'
                                }`}
                              >
                                <div className="truncate flex items-center justify-between gap-1">
                                  <span className="truncate">{ex.name}</span>
                                  <span className="text-[9px] uppercase px-1 bg-white/60 rounded">
                                    {ex.className || 'All'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {dayExams.length > 3 && (
                            <div 
                              onClick={() => setSelectedExamDetails(dayExams[3])}
                              className="text-[9px] font-bold text-slate-500 hover:text-blue-600 cursor-pointer pl-1"
                            >
                              +{dayExams.length - 3} more...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conflict count hint */}
                      {isConflictDay && (
                        <div className="text-[9px] font-bold text-amber-700 mt-1 truncate">
                          ⚠️ {dayExams.length} concurrent exams
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEKLY CALENDAR GRID */}
          {calendarScope === 'week' && (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 py-3">
                {weekDays.map((wd, wIdx) => {
                  const isToday = wd.dateString === todayIso;
                  return (
                    <div key={wIdx} className="text-center">
                      <div className="text-[11px] uppercase text-slate-500">{wd.dayName}</div>
                      <div className={`mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-blue-600 text-white font-black' : 'text-slate-800'
                      }`}>
                        {wd.dayNumber} {wd.date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[350px]">
                {weekDays.map((wd, wIdx) => {
                  const dayExams = filteredExams.filter(e => e.date && e.date.slice(0, 10) === wd.dateString);
                  const isConflict = dayExams.length > 1;

                  return (
                    <div 
                      key={wIdx} 
                      className={`p-3 space-y-2 flex flex-col justify-between ${
                        isConflict ? 'bg-amber-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        {isConflict && (
                          <div className="bg-amber-100 border border-amber-300 rounded-lg p-1.5 text-[10px] text-amber-900 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Overlap: {dayExams.length} exams</span>
                          </div>
                        )}

                        {dayExams.length === 0 ? (
                          <div className="text-center py-8 text-[11px] text-slate-300 font-medium">
                            No exams
                          </div>
                        ) : (
                          dayExams.map(ex => (
                            <div
                              key={ex.id}
                              onClick={() => setSelectedExamDetails(ex)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-2xs hover:shadow-xs transition-all ${
                                getLevelBadgeClass(ex.level)
                              }`}
                            >
                              <div className="font-bold text-slate-900 leading-snug">{ex.name}</div>
                              <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1.5">
                                <span>{ex.className || 'All Classes'}</span>
                                <span className="font-mono bg-white/80 px-1.5 py-0.2 rounded font-bold">
                                  {ex.type}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAddOnDate(wd.dateString)}
                        className="w-full py-1.5 mt-2 bg-slate-50 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Exam</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW (matching original table layout) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-200">Exam Title</th>
                  <th className="p-3 border-r border-slate-200">Level</th>
                  <th className="p-3 border-r border-slate-200">Class</th>
                  <th className="p-3 border-r border-slate-200">Scheduled Date</th>
                  <th className="p-3 border-r border-slate-200">Type</th>
                  <th className="p-3 border-r border-slate-200">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No examinations found matching your filter criteria. Click "+ Create Exam" to register an assessment.
                    </td>
                  </tr>
                ) : (
                  filteredExams.map(e => {
                    const isActive = (e.status || 'Active') === 'Active';
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-900 text-sm">
                          <div>{e.name}</div>
                          {e.subject && (
                            <div className="text-[11px] font-semibold text-blue-700 mt-0.5">
                              Somo: {e.subject}
                            </div>
                          )}
                          {e.assignedTeacherName && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>Mtungaji: <strong>{e.assignedTeacherName}</strong></span>
                              {e.isHODOverride && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold">
                                  👑 HOD Override
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getLevelBadgeClass(e.level)}`}>
                            {e.level || 'PRIMARY'}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-700">
                          {e.className || 'All'}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-mono font-semibold text-slate-600">
                          {e.date || '-'}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-medium text-slate-700">
                          {e.type || e.name}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isActive 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2.5 font-bold text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setDocModalExamId(e.id);
                                setIsDocModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Generate Photo Entry, ISAL, and CAL forms for this exam"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Forms</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditExam(e)}
                              className="text-blue-600 hover:text-blue-800 cursor-pointer p-1"
                              title="Edit Exam Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedExamDetails(e)}
                              className="text-slate-600 hover:text-slate-900 cursor-pointer p-1"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(e)}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              Toggle
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete exam "${e.name}"?`)) {
                                  onDeleteExam(Number(e.id));
                                }
                              }}
                              className="text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXAM SETTINGS (ACTIVE / LOCKED SWITCH & ISOLATION MANAGEMENT) */}
      {viewMode === 'settings' && (
        <ExamSettingsView
          exams={exams}
          onUpdateExam={onUpdateExam}
          onUpdateExams={onUpdateExams}
          onNavigateToMarkEntry={onNavigateToMarkEntry}
          onNavigateToExams={() => setViewMode('calendar')}
          schoolInfo={schoolInfo}
          isEmbedded={true}
        />
      )}

      {/* CREATE / EDIT EXAM MODAL (SCROLLABLE CONTENT & STICKY HEADER/FOOTER) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 pb-4 shrink-0 bg-slate-50/80">
              <div>
                <h3 className="font-black text-lg text-[#1f4d8b] flex items-center gap-2">
                  {editingExamId !== null ? <Edit3 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                  <span>{editingExamId !== null ? 'Edit Examination Details' : 'Create & Schedule Examination'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Usajili na uhariri wa mitihani kwa kuzingatia masomo na madarasa ya mwalimu
                </p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingExamId(null); setAuthError(null); }} className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Teacher Profile & Rights Badge */}
              {loggedInTeacher && !isAdminOrHOD && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      Wasifu wa Mwalimu Mtungaji: {loggedInTeacher.name}
                    </span>
                    <span className="text-[10px] bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                      Mwalimu wa Somo
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-800 flex flex-col gap-0.5">
                    <div>
                      <strong>Masomo Yaliyosajiliwa:</strong> {loggedInTeacher.subjects?.join(', ') || 'Hamna'}
                    </div>
                    <div>
                      <strong>Madarasa / Mikondo:</strong> {assignedClasses.join(', ') || 'Hamna'}
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Error Alert */}
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-bold flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line leading-relaxed">{authError}</div>
                </div>
              )}
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Exam Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Standard 7 National Mock or Midterm I"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              {/* Subject Selection (Restricted by Teacher Profile) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase">Subject / Somo la Mtihani *</label>
                  {!isAdminOrHOD && (
                    <span className="text-[10px] font-bold text-blue-700">
                      (Yaliyosajiliwa kwako: {assignedSubjects.length})
                    </span>
                  )}
                </div>
                <select
                  value={subject}
                  onChange={e => {
                    setSubject(e.target.value);
                    setAuthError(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Masomo Yako Yaliyosajiliwa">
                    {assignedSubjects.map(sub => (
                      <option key={sub} value={sub}>⭐ {sub} [Somo Lako]</option>
                    ))}
                  </optgroup>
                  {!isAdminOrHOD && (
                    <optgroup label="Masomo Mengine (Yanahitaji Kibali cha HOD)">
                      {SUBJECT_NAMES_LIST.filter(s => !assignedSubjects.includes(s)).map(sub => (
                        <option key={sub} value={sub}>🔒 {sub} [Kibali cha HOD Kinahitajika]</option>
                      ))}
                    </optgroup>
                  )}
                  {isAdminOrHOD && (
                    <optgroup label="Masomo Yote ya Shule">
                      {SUBJECT_NAMES_LIST.filter(s => !assignedSubjects.includes(s)).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Exam Type *</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Midterm I">Midterm I</option>
                    <option value="Terminal">Terminal</option>
                    <option value="Annual">Annual</option>
                    <option value="Midterm II">Midterm II</option>
                    <option value="Pre-Mock">Pre-Mock</option>
                    <option value="Mock">Mock Exam</option>
                    <option value="PSLE Final">PSLE Final (Primary)</option>
                    <option value="NECTA Final">NECTA Final (CSEE)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Level *</label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value as EducationLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="PRE_PRIMARY">Pre-Primary (Nursery / Awali)</option>
                    <option value="PRIMARY">Primary School (Std 1 - 7)</option>
                    <option value="CSEE">CSEE (O-Level Form 1 - 4)</option>
                    <option value="ACSEE">ACSEE (A-Level Form 5 - 6)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Target Class *</label>
                  <select
                    value={className}
                    onChange={e => {
                      setClassName(e.target.value);
                      setAuthError(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="All">All Classes</option>
                    <optgroup label="Pre-Primary / Nursery">
                      {NURSERY_CLASSES.map(c => {
                        const isAssigned = assignedClasses.includes(c);
                        return <option key={c} value={c}>{isAssigned ? `⭐ ${c} [Darasa Lako]` : c}</option>;
                      })}
                    </optgroup>
                    <optgroup label="Primary School">
                      {PRIMARY_CLASSES.map(c => {
                        const isAssigned = assignedClasses.includes(c);
                        return <option key={c} value={c}>{isAssigned ? `⭐ ${c} [Darasa Lako]` : c}</option>;
                      })}
                    </optgroup>
                    <optgroup label="Secondary School">
                      {SECONDARY_CLASSES.map(c => {
                        const isAssigned = assignedClasses.includes(c);
                        return <option key={c} value={c}>{isAssigned ? `⭐ ${c} [Darasa Lako]` : c}</option>;
                      })}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Exam Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Active">Active (Live in Results & Invigilation)</option>
                  <option value="Inactive">Inactive (Draft / Archived)</option>
                </select>
              </div>

              {/* HOD OVERRIDE & SPECIAL ASSIGNMENT SECTION */}
              {!isAdminOrHOD && (
                <div className={`p-3.5 rounded-xl border transition-all ${
                  isHODOverride 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs select-none">
                    <input
                      type="checkbox"
                      checked={isHODOverride}
                      onChange={e => {
                        setIsHODOverride(e.target.checked);
                        if (e.target.checked && !hodApprovedBy && teachers.length > 0) {
                          setHodApprovedBy(teachers[0].name);
                        }
                      }}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Uteuzi Maalum: Nimepewa Kibali na Mkuu wa Idara (HOD Override)</span>
                    </span>
                  </label>

                  {isHODOverride && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-2.5 animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                          Aliyetoa Kibali (HOD / Academic Master / Uongozi) *
                        </label>
                        <select
                          value={hodApprovedBy}
                          onChange={e => setHodApprovedBy(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-bold text-slate-800"
                          required={isHODOverride}
                        >
                          <option value="">-- Chagua Mkuu wa Idara / Kiongozi --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.name}>
                              {t.name} {t.schoolRole ? `(${t.schoolRole})` : ''}
                            </option>
                          ))}
                          <option value="Academic Master">Academic Master (Taaluma)</option>
                          <option value="Headmaster / Headmistress">Headmaster / Headmistress</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1">
                          Sababu ya Uteuzi / Override Reason *
                        </label>
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                          placeholder="e.g. Mwalimu wa somo hayupo / Dharura / Agizo la Idara"
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg font-medium text-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-amber-800 font-medium">
                        ✓ Kibali hiki kitalinda rekodi ya utungaji na kuweka alama ya idhini kwenye mifumo ya mitihani na usimamizi.
                      </p>
                    </div>
                  )}
                </div>
              )}

              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingExamId(null);
                    setAuthError(null);
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingExamId !== null ? 'Update Exam' : 'Save & Schedule Exam'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM INSPECTOR MODAL */}
      {selectedExamDetails && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getLevelBadgeClass(selectedExamDetails.level)}`}>
                  {selectedExamDetails.level || 'PRIMARY'}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  {selectedExamDetails.name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedExamDetails(null)}
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Type:</span>
                <span className="font-bold text-slate-800">{selectedExamDetails.type}</span>
              </div>
              {selectedExamDetails.subject && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Subject:</span>
                  <span className="font-bold text-blue-700">{selectedExamDetails.subject}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Target Class:</span>
                <span className="font-bold text-slate-800">{selectedExamDetails.className || 'All'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Scheduled Date:</span>
                <span className="font-bold font-mono text-slate-800">{selectedExamDetails.date || 'Unscheduled'}</span>
              </div>
              {selectedExamDetails.assignedTeacherName && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Mtungaji:</span>
                  <span className="font-bold text-slate-800">{selectedExamDetails.assignedTeacherName}</span>
                </div>
              )}
              {selectedExamDetails.isHODOverride && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-0.5">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>👑 Kibali Maalum cha HOD</span>
                  </div>
                  <div>Aliyeidhinisha: {selectedExamDetails.hodApprovedBy || 'HOD'}</div>
                  {selectedExamDetails.hodOverrideReason && (
                    <div className="text-slate-600 italic">Sababu: {selectedExamDetails.hodOverrideReason}</div>
                  )}
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className={`font-bold ${
                  (selectedExamDetails.status || 'Active') === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                  {selectedExamDetails.status || 'Active'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDocModalExamId(selectedExamDetails.id);
                setIsDocModalOpen(true);
                setSelectedExamDetails(null);
              }}
              className="w-full py-2 bg-[#1f4d8b] hover:bg-blue-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Generate Exam Forms (Photo Entry, ISAL, CAL)</span>
            </button>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  openConfirmDelete(
                    "Thibitisha Ufutaji",
                    `Je, una uhakika unataka kufuta mtihani "${selectedExamDetails.name}"? Hatua hii haiwezi kutenduliwa.`,
                    () => {
                      onDeleteExam(Number(selectedExamDetails.id));
                      setSelectedExamDetails(null);
                    }
                  );
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEditExam(selectedExamDetails)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedExamDetails)}
                  className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  Toggle {(selectedExamDetails.status || 'Active') === 'Active' ? 'Inactive' : 'Active'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Exam Documents Modal (Photo Entry, ISAL, CAL) */}
      <ExamDocumentsModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        exams={exams}
        students={students}
        schoolInfo={schoolInfo || {
          name: 'HabyEduPro3A',
          schoolNumber: 'S.0123',
          address: 'P.O. Box 1234, Tanga, Tanzania',
          phone: '0717616343',
          email: 'info@habyedupro3a.ac.tz',
          motto: 'Education for Development & Integrity',
          principal: 'Mwl. H. Akida'
        }}
        initialExamId={docModalExamId}
      />

      {/* Subject Papers Configuration Matrix Modal */}
      <SubjectPaperConfigModal
        isOpen={isPaperConfigModalOpen}
        onClose={() => setIsPaperConfigModalOpen(false)}
        onSelectPaperForDoc={(subjectName, paper, level) => {
          setIsDocModalOpen(true);
        }}
      />
    </div>
  );
};
