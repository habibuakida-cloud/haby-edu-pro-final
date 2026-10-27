import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Download, 
  Unlock, 
  Lock, 
  UserCheck, 
  Calendar, 
  Clock, 
  Layers,
  AlertTriangle,
  Search,
  Building,
  CheckCircle2,
  Sparkles,
  Filter,
  Copy,
  Users,
  Grid,
  Table,
  ListFilter,
  Zap,
  Save,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Share2,
  FileText,
  Upload,
  X,
  PackageCheck
} from 'lucide-react';
import { 
  InvigilationSession, 
  Teacher, 
  Supervisor, 
  SchoolInfo,
  SavedInvigilationRecord,
  UserAccount
} from '../types';
import { SUBJECT_LIST, DEFAULT_CLASSES } from '../constants/defaults';
import { getTeacherColor, getSubjectColor, getDayTheme } from '../utils/colors';
import { printFormattedSection, exportInvigilationToCSV } from '../utils/export';
import { exportInvigilationTimetableExcel, exportTeacherInvigilationExcel } from '../utils/timetableExcelExport';
import { exportInvigilationPDF, exportTeacherInvigilationPDF, captureDomToPdf } from '../utils/timetablePdfExport';
import { saveSchoolData } from '../lib/dataService';
import { getCurrentSchoolId } from '../lib/dbBridge';
import { AssignInvigilatorModal } from './Invigilation/AssignInvigilatorModal';
import { SessionEditModal, getDayAndFormattedDate, INVIGILATION_ALLOWED_SESSIONS, PRESET_INVIGILATION_EXAM_TITLES } from './Invigilation/SessionEditModal';
import { BulkEditInvigilationModal } from './Invigilation/BulkEditInvigilationModal';
import { ImportExamTimetableModal, downloadExamTimetableSampleCSV } from './Invigilation/ImportExamTimetableModal';
import { ExamControlLogForms } from './Invigilation/ExamControlLogForms';
import { ScriptReturnEnvelopeView } from './Invigilation/ScriptReturnEnvelopeView';

interface InvigilationContainerProps {
  sessions: InvigilationSession[];
  teachers: Teacher[];
  supervisors: Supervisor[];
  selectedInvigilators: number[];
  invigilationAssignments: Record<string, number>;
  savedInvigilationRecords?: SavedInvigilationRecord[];
  timetableReleased: boolean;
  schoolInfo: SchoolInfo;
  dayThemes?: Record<string, string>;
  currentUser?: UserAccount | null;
  initialTab?: 'general' | 'sessions' | 'invigilators' | 'supervisors' | 'class' | 'teacher' | 'personal' | 'saved' | 'control_logs' | 'envelope_cover';
  initialTeacherId?: number;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onUpdateSessions: (sessions: InvigilationSession[]) => void;
  onUpdateSupervisors: (supervisors: Supervisor[]) => void;
  onUpdateSelectedInvigilators: (ids: number[]) => void;
  onUpdateInvigilationAssignments: (assignments: Record<string, number>) => void;
  onUpdateSavedInvigilationRecords?: (records: SavedInvigilationRecord[]) => void;
  onToggleRelease: () => void;
  onNavigateToSittingPlan?: () => void;
  onNavigateToCalendar?: () => void;
  exams?: any[];
}

export const InvigilationContainer: React.FC<InvigilationContainerProps> = ({
  sessions = [],
  teachers = [],
  supervisors = [],
  selectedInvigilators = [],
  invigilationAssignments = {},
  savedInvigilationRecords = [],
  timetableReleased = false,
  schoolInfo,
  dayThemes,
  currentUser,
  initialTab,
  initialTeacherId,
  onUpdateTeacher,
  onUpdateSessions,
  onUpdateSupervisors,
  onUpdateSelectedInvigilators,
  onUpdateInvigilationAssignments,
  onUpdateSavedInvigilationRecords,
  onToggleRelease,
  onNavigateToSittingPlan,
  onNavigateToCalendar
}) => {
  const isTeacherRole = currentUser?.role === 'TEACHER' && !currentUser?.isSuperAdmin;

  const matchedTeacherId = useMemo(() => {
    if (initialTeacherId) return initialTeacherId;
    if (currentUser?.fullName && Array.isArray(teachers)) {
      const match = teachers.find(t =>
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (t.name && t.name.toLowerCase().includes(currentUser.fullName.toLowerCase())) ||
        (t.name && currentUser.fullName.toLowerCase().includes(t.name.toLowerCase()))
      );
      if (match) return match.id;
    }
    return teachers?.[0]?.id || 0;
  }, [currentUser, teachers, initialTeacherId]);

  // Navigation tabs matching TimetableContainer aesthetic
  const [activeTab, setActiveTab] = useState<'general' | 'sessions' | 'invigilators' | 'supervisors' | 'class' | 'teacher' | 'personal' | 'saved' | 'control_logs' | 'envelope_cover'>(
    () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('haby_invigilation_active_tab') : null;
      if (stored && ['general', 'sessions', 'invigilators', 'supervisors', 'class', 'teacher', 'personal', 'saved', 'control_logs', 'envelope_cover'].includes(stored)) {
        localStorage.removeItem('haby_invigilation_active_tab');
        return stored as any;
      }
      return initialTab || (isTeacherRole ? 'teacher' : 'general');
    }
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const stored = localStorage.getItem('haby_invigilation_active_tab');
    if (stored && ['general', 'sessions', 'invigilators', 'supervisors', 'class', 'teacher', 'personal', 'saved', 'control_logs', 'envelope_cover'].includes(stored)) {
      localStorage.removeItem('haby_invigilation_active_tab');
      setActiveTab(stored as any);
    }
  }, []);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [activeExamTitle, setActiveExamTitle] = useState<string>(() => {
    const schoolId = getCurrentSchoolId();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`haby_active_invigilation_exam_${schoolId}`) : null;
    return saved || 'Pre-National Examination 2026';
  });
  const [isCustomExamTitle, setIsCustomExamTitle] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState(activeExamTitle);

  useEffect(() => {
    const schoolId = getCurrentSchoolId();
    if (activeExamTitle.trim()) {
      localStorage.setItem(`haby_active_invigilation_exam_${schoolId}`, activeExamTitle.trim());
    }
  }, [activeExamTitle]);
  
  // Layout view mode for General Timetable: 'cards' (Modern visual cards), 'matrix' (Traditional Exam Hall grid) or 'master' (One large master table)
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'master'>('cards');

  // Filters
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<'ALL' | 'SESSION I' | 'SESSION II' | 'SESSION III'>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Teacher schedule states
  const [selectedTeacherForPersonal, setSelectedTeacherForPersonal] = useState<number>(matchedTeacherId);
  const [teacherViewMode, setTeacherViewMode] = useState<'matrix' | 'cards' | 'master'>('matrix');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [onlyTeachersWithDuties, setOnlyTeachersWithDuties] = useState(false);

  // Sync selected teacher if user or matchedTeacherId changes
  useEffect(() => {
    if (matchedTeacherId) {
      setSelectedTeacherForPersonal(matchedTeacherId);
    }
  }, [matchedTeacherId]);

  // Class invigilation selected class & view mode ('cards' | 'matrix' | 'master')
  const [selectedClassForInvig, setSelectedClassForInvig] = useState('Form 1');
  const [classViewMode, setClassViewMode] = useState<'cards' | 'matrix' | 'master'>('matrix');
  const [controlInitialSubTab, setControlInitialSubTab] = useState<'dispatch' | 'setting' | 'scripts' | 'reams'>('dispatch');

  // Modal States
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<InvigilationSession | null>(null);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleImportCSV = (
    importedSessions: InvigilationSession[],
    importedAssignments: Record<string, number>,
    replaceExisting: boolean
  ) => {
    if (replaceExisting) {
      onUpdateSessions(importedSessions);
      onUpdateInvigilationAssignments(importedAssignments);
      setAssignNotice({
        type: 'success',
        message: `✓ Ratiba ya Mitihani Imesasishwa (CSV): Zimeingizwa session ${importedSessions.length} na walimu ${Object.keys(importedAssignments).length} waliopangwa!`
      });
    } else {
      const mergedSessions = [...sessions, ...importedSessions];
      const mergedAssignments = { ...invigilationAssignments, ...importedAssignments };
      onUpdateSessions(mergedSessions);
      onUpdateInvigilationAssignments(mergedAssignments);
      setAssignNotice({
        type: 'success',
        message: `✓ Ratiba ya Mitihani Imewekwa Pamoja (CSV): Zimeongezwa session ${importedSessions.length} mpya na walimu ${Object.keys(importedAssignments).length} waliopangwa!`
      });
    }
    setTimeout(() => setAssignNotice(null), 6000);
  };

  const [assignModalData, setAssignModalData] = useState<{
    session: InvigilationSession;
    roomIndex: number;
    currentTeacherId?: number;
  } | null>(null);

  // Supervisor state
  const [selectedSupervisorTeacher, setSelectedSupervisorTeacher] = useState<number>(teachers[0]?.id || 0);
  const [assignNotice, setAssignNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const [isSavingDb, setIsSavingDb] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const handleSavePermanentlyToDatabase = async () => {
    setIsSavingDb(true);
    try {
      const schoolId = getCurrentSchoolId();
      await saveSchoolData(schoolId, {
        sessions: normalizedSessions,
        supervisors,
        selectedInvigilators,
        invigilationAssignments,
        savedInvigilationRecords
      });
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 4000);
    } catch (err) {
      console.warn("Save invigilation database error:", err);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleExportExcel = () => {
    exportInvigilationTimetableExcel({
      schoolName: schoolInfo.name,
      sessions: normalizedSessions,
      teachers,
      invigilationAssignments,
      schoolInfo
    });
  };

  const handleDownloadClassInvigPdf = async () => {
    const el = document.getElementById('class-invig-print');
    if (el) {
      const ok = await captureDomToPdf(el, `${selectedClassForInvig.replace(/\s+/g, '_')}_Invigilation_Schedule.pdf`);
      if (ok) return;
    }
    printFormattedSection('class-invig-print', `${selectedClassForInvig} Examination & Invigilation Schedule`, schoolInfo.name);
  };

  const handleDownloadPersonalInvigPdf = async () => {
    const el = document.getElementById('personal-invig-print');
    const t = teachers.find(item => item.id === selectedTeacherForPersonal);
    if (el) {
      const ok = await captureDomToPdf(el, `Personal_Invigilation_${(t?.name || 'Teacher').replace(/\s+/g, '_')}.pdf`);
      if (ok) return;
    }
    printFormattedSection('personal-invig-print', `Personal Invigilation Duty Schedule - ${t?.name}`, schoolInfo.name);
  };

  // Filter available teachers
  const availableTeachers = useMemo(() => (Array.isArray(teachers) ? teachers : []).filter(t => t && !t.excludeInvigilation), [teachers]);
  const activeRoster = useMemo(() => (Array.isArray(teachers) ? teachers : []).filter(t => t && (Array.isArray(selectedInvigilators) ? selectedInvigilators : []).includes(t.id)), [teachers, selectedInvigilators]);
  const effectivePool = activeRoster.length > 0 ? activeRoster : availableTeachers;

  // Normalize existing sessions to ensure session is strictly SESSION I or SESSION II and filter by activeExamTitle if session has an examTitle
  const normalizedSessions = useMemo(() => {
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const allNormalized = safeSessions.filter(Boolean).map(s => {
      let validSession = s.session || 'SESSION I';
      if (!INVIGILATION_ALLOWED_SESSIONS.includes(validSession as any)) {
        validSession = /II|2|afternoon/i.test(validSession) ? 'SESSION II' : 'SESSION I';
      }
      return {
        ...s,
        rawDate: s.rawDate || s.date || '',
        date: s.date || s.rawDate || '',
        day: s.day || '',
        subject: s.subject || '',
        className: s.className || '',
        stream: s.stream || '',
        rooms: Number(s.rooms || 1),
        session: validSession,
        examTitle: s.examTitle || activeExamTitle
      };
    });
    // Filter to sessions belonging to the active exam title (or untitled legacy sessions that default to activeExamTitle)
    const matching = allNormalized.filter(
      s => !s.examTitle || s.examTitle.toLowerCase().trim() === (activeExamTitle || '').toLowerCase().trim()
    );
    return matching.length > 0 ? matching : allNormalized;
  }, [sessions, activeExamTitle]);

  // Conflict Detection: check if any teacher is double-booked across different rooms at the exact same Date & Session
  const conflicts = useMemo(() => {
    const list: { teacherId: number; teacherName: string; date: string; day: string; session: string; count: number }[] = [];
    const dateSessionMap: Record<string, Record<number, number>> = {};

    normalizedSessions.forEach(s => {
      const slotKey = `${s.rawDate}_${s.session}`;
      if (!dateSessionMap[slotKey]) dateSessionMap[slotKey] = {};

      for (let r = 0; r < s.rooms; r++) {
        const key = `${s.id}_room${r}`;
        const tid = invigilationAssignments[key];
        if (tid) {
          dateSessionMap[slotKey][tid] = (dateSessionMap[slotKey][tid] || 0) + 1;
        }
      }
    });

    Object.entries(dateSessionMap).forEach(([slotKey, teacherMap]) => {
      const [rawDate, sess] = slotKey.split('_');
      const sessionObj = normalizedSessions.find(s => s.rawDate === rawDate && s.session === sess);
      const dateLabel = sessionObj?.date || rawDate;
      const dayLabel = sessionObj?.day || '';

      Object.entries(teacherMap).forEach(([tidStr, count]) => {
        if (count > 1) {
          const tid = Number(tidStr);
          const tObj = teachers.find(t => t.id === tid);
          list.push({
            teacherId: tid,
            teacherName: tObj?.name || `Teacher #${tid}`,
            date: dateLabel,
            day: dayLabel,
            session: sess,
            count
          });
        }
      });
    });

    return list;
  }, [normalizedSessions, invigilationAssignments, teachers]);

  // Duty Statistics
  const totalSlotsNeeded = useMemo(() => {
    return normalizedSessions.reduce((sum, s) => sum + s.rooms, 0);
  }, [normalizedSessions]);

  const assignedSlotsCount = useMemo(() => {
    let count = 0;
    normalizedSessions.forEach(s => {
      for (let r = 0; r < s.rooms; r++) {
        if (invigilationAssignments[`${s.id}_room${r}`]) {
          count++;
        }
      }
    });
    return count;
  }, [normalizedSessions, invigilationAssignments]);

  const unassignedSlotsCount = Math.max(0, totalSlotsNeeded - assignedSlotsCount);

  // Group normalized sessions by Date / Day
  const uniqueDates = useMemo(() => {
    const map = new Map<string, { rawDate: string; date: string; day: string }>();
    normalizedSessions.forEach(s => {
      const rDate = s.rawDate || '';
      if (!map.has(rDate)) {
        map.set(rDate, { rawDate: rDate, date: s.date || '', day: s.day || '' });
      }
    });
    return Array.from(map.values()).sort((a, b) => String(a.rawDate || '').localeCompare(String(b.rawDate || '')));
  }, [normalizedSessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return normalizedSessions.filter(s => {
      if (selectedDayFilter !== 'ALL' && s.rawDate !== selectedDayFilter && s.day !== selectedDayFilter) {
        return false;
      }
      if (selectedSessionFilter !== 'ALL' && s.session !== selectedSessionFilter) {
        return false;
      }
      if (selectedClassFilter !== 'ALL' && String(s.className || '').toLowerCase() !== selectedClassFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = String(s.subject || '').toLowerCase().includes(q);
        const matchClass = String(s.className || '').toLowerCase().includes(q);
        const matchStream = String(s.stream || '').toLowerCase().includes(q);
        const matchDay = String(s.day || '').toLowerCase().includes(q);
        const matchDate = String(s.date || '').toLowerCase().includes(q);
        if (!matchSub && !matchClass && !matchStream && !matchDay && !matchDate) return false;
      }
      return true;
    });
  }, [normalizedSessions, selectedDayFilter, selectedSessionFilter, selectedClassFilter, searchQuery]);

  // Group filtered sessions by Date & Day for rendering
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, InvigilationSession[]> = {};
    filteredSessions.forEach(s => {
      const key = `${s.rawDate}__${s.day}__${s.date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }, [filteredSessions]);

  // Session CRUD handlers
  const handleSaveSessionData = (sessionData: Omit<InvigilationSession, 'id'> & { id?: number }) => {
    const withTitle = {
      ...sessionData,
      examTitle: sessionData.examTitle || activeExamTitle
    };
    if (withTitle.id) {
      // Edit
      const updated = sessions.map(s => s.id === withTitle.id ? { ...s, ...withTitle } as InvigilationSession : s);
      onUpdateSessions(updated);
    } else {
      // Add
      const newSession: InvigilationSession = {
        ...withTitle,
        id: Date.now()
      };
      onUpdateSessions([...sessions, newSession]);
    }
  };

  const handleDeleteSession = (sessionId: number) => {
    if (confirm('Are you sure you want to delete this examination session? All associated room invigilation assignments will be removed.')) {
      onUpdateSessions(normalizedSessions.filter(s => s.id !== sessionId));
      // Cleanup assignments
      const cleanAssignments = { ...invigilationAssignments };
      Object.keys(cleanAssignments).forEach(key => {
        if (key.startsWith(`${sessionId}_room`)) {
          delete cleanAssignments[key];
        }
      });
      onUpdateInvigilationAssignments(cleanAssignments);
    }
  };

  const handleDuplicateSession = (session: InvigilationSession) => {
    const dup: InvigilationSession = {
      ...session,
      id: Date.now(),
      stream: `${session.stream} (Copy)`
    };
    onUpdateSessions([...normalizedSessions, dup]);
  };

  // Supervisor save handler
  const handleAddSupervisor = () => {
    const t = teachers.find(item => item.id === selectedSupervisorTeacher);
    if (!t) return;
    if (supervisors.some(s => s.teacherId === t.id)) {
      alert(`${t.name} is already in the supervisors pool.`);
      return;
    }

    onUpdateSupervisors([
      ...supervisors,
      {
        id: Date.now(),
        teacherId: t.id,
        name: t.name,
        initial: t.initial
      }
    ]);
  };

  // Smart clash-free invigilator auto-assignment
  const handleAutoAssignAll = () => {
    const activeTeachers = teachers.filter(t => 
      !t.excludeInvigilation && (selectedInvigilators.length === 0 || selectedInvigilators.includes(t.id))
    );

    if (activeTeachers.length === 0) {
      setAssignNotice({
        type: 'warning',
        message: 'No active invigilators available. Please enable teachers in the Invigilators tab first.'
      });
      setTimeout(() => setAssignNotice(null), 5000);
      return;
    }

    const newAssignments = { ...invigilationAssignments };
    const dutyCount: Record<number, number> = {};
    activeTeachers.forEach(t => { dutyCount[t.id] = 0; });

    // Track slots occupied by date and session: key = `${rawDate}_${session}` -> Set<teacherId>
    const occupiedSlots: Record<string, Set<number>> = {};

    // Count already assigned teachers
    normalizedSessions.forEach(s => {
      const slotKey = `${s.rawDate}_${s.session}`;
      if (!occupiedSlots[slotKey]) occupiedSlots[slotKey] = new Set();

      for (let r = 0; r < s.rooms; r++) {
        const key = `${s.id}_room${r}`;
        const tid = newAssignments[key];
        if (tid) {
          occupiedSlots[slotKey].add(tid);
          dutyCount[tid] = (dutyCount[tid] || 0) + 1;
        }
      }
    });

    let assignedCount = 0;

    // Fill unassigned slots
    normalizedSessions.forEach(s => {
      const slotKey = `${s.rawDate}_${s.session}`;
      if (!occupiedSlots[slotKey]) occupiedSlots[slotKey] = new Set();

      for (let r = 0; r < s.rooms; r++) {
        const key = `${s.id}_room${r}`;
        if (!newAssignments[key]) {
          // Find candidates not occupied in this timeslot
          const available = activeTeachers.filter(t => !occupiedSlots[slotKey].has(t.id));

          if (available.length > 0) {
            // Further filter to avoid teachers invigilating their own subjects (if possible)
            let candidates = available.filter(t => !t.subjects.includes(s.subject));
            
            // If all available teach this subject, fallback to all available
            if (candidates.length === 0) candidates = available;

            // Sort by lowest duty count for fair balance
            candidates.sort((a, b) => (dutyCount[a.id] || 0) - (dutyCount[b.id] || 0));
            const chosen = candidates[0];

            newAssignments[key] = chosen.id;
            occupiedSlots[slotKey].add(chosen.id);
            dutyCount[chosen.id] = (dutyCount[chosen.id] || 0) + 1;
            assignedCount++;
          }
        }
      }
    });

    onUpdateInvigilationAssignments(newAssignments);
    setAssignNotice({
      type: 'success',
      message: `Successfully auto-assigned ${assignedCount} room duty slot(s) with balanced workload and zero clashes across ${activeTeachers.length} available teachers!`
    });
    setTimeout(() => setAssignNotice(null), 6000);
  };

  // Re-auto assign invigilation from scratch with fresh randomized clash-free allocation
  const handleReAutoAssignAll = () => {
    const activeTeachers = teachers.filter(t => 
      !t.excludeInvigilation && (selectedInvigilators.length === 0 || selectedInvigilators.includes(t.id))
    );

    if (activeTeachers.length === 0) {
      setAssignNotice({
        type: 'warning',
        message: 'Hakuna walimu wanaoweza kusimamia. Tafadhali ruhusu walimu kwenye tab ya Invigilators kwanza.'
      });
      setTimeout(() => setAssignNotice(null), 5000);
      return;
    }

    // Shuffle active teachers to create a fresh random balanced rotation
    const shuffledTeachers = [...activeTeachers].sort(() => Math.random() - 0.5);

    const freshAssignments: Record<string, number> = {};
    const dutyCount: Record<number, number> = {};
    shuffledTeachers.forEach(t => { dutyCount[t.id] = 0; });

    const occupiedSlots: Record<string, Set<number>> = {};
    let assignedCount = 0;

    normalizedSessions.forEach(s => {
      const slotKey = `${s.rawDate}_${s.session}`;
      if (!occupiedSlots[slotKey]) occupiedSlots[slotKey] = new Set();

      for (let r = 0; r < s.rooms; r++) {
        const key = `${s.id}_room${r}`;
        const available = shuffledTeachers.filter(t => !occupiedSlots[slotKey].has(t.id));

        if (available.length > 0) {
          available.sort((a, b) => (dutyCount[a.id] || 0) - (dutyCount[b.id] || 0));
          const chosen = available[0];

          freshAssignments[key] = chosen.id;
          occupiedSlots[slotKey].add(chosen.id);
          dutyCount[chosen.id] = (dutyCount[chosen.id] || 0) + 1;
          assignedCount++;
        }
      }
    });

    onUpdateInvigilationAssignments(freshAssignments);
    setAssignNotice({
      type: 'success',
      message: `✓ Ratiba Imepangwa Upya Kiatomatiki: Jumla ya nafasi ${assignedCount} za usimamizi zimegawanywa upya kwa usawa na bila migongano (clash-free) kwa walimu ${activeTeachers.length}!`
    });
    setTimeout(() => setAssignNotice(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {assignNotice && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          assignNotice.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
            : 'bg-amber-50 border border-amber-300 text-amber-900'
        }`}>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {assignNotice.message}
          </span>
          <button
            type="button"
            onClick={() => setAssignNotice(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 0. ACTIVE EXAMINATION CONTEXT BANNER (MTIHANI GANI UNAOPANGIWA RATIBA & UFUATILIAJI) */}
      <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-[#153460] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                MTIHANI UNAOPANGIWA SASA (ACTIVE EXAM)
              </span>
              <span className="text-xs text-blue-200 font-semibold">
                Kila mtihani una Ratiba yake ya Usimamizi na Ufuatiliaji wake binafsi
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <span>RATIBA YA USIMAMIZI & UFUATILIAJI: <u className="decoration-amber-400 underline-offset-4">{activeExamTitle}</u></span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 p-2.5 rounded-xl border border-white/15">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-amber-300 mb-1">
                Chagua Mtihani (Select Exam Title):
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={PRESET_INVIGILATION_EXAM_TITLES.includes(activeExamTitle as any) && !isCustomExamTitle ? activeExamTitle : '__CUSTOM__'}
                  onChange={e => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomExamTitle(true);
                    } else {
                      setIsCustomExamTitle(false);
                      setActiveExamTitle(e.target.value);
                    }
                  }}
                  className="px-3 py-2 text-xs font-black rounded-lg bg-white text-slate-900 border border-amber-300 shadow-2xs focus:outline-hidden"
                >
                  {PRESET_INVIGILATION_EXAM_TITLES.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                  <option value="__CUSTOM__">+ Andika Jina Jingine la Mtihani...</option>
                </select>

                {(isCustomExamTitle || !PRESET_INVIGILATION_EXAM_TITLES.includes(activeExamTitle as any)) && (
                  <input
                    type="text"
                    value={activeExamTitle}
                    onChange={e => setActiveExamTitle(e.target.value)}
                    placeholder="Andika Jina la Mtihani hapa..."
                    className="px-3 py-2 text-xs font-black rounded-lg bg-white text-blue-950 border-2 border-amber-400 w-56 focus:outline-hidden"
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    const updated = sessions.map(s => ({ ...s, examTitle: activeExamTitle }));
                    onUpdateSessions(updated);
                    setAssignNotice({
                      type: 'success',
                      message: `✓ Vipindi vyote vya ratiba hii sasa vimefungamanishwa rasmi na mtihani wa "${activeExamTitle}"!`
                    });
                    setTimeout(() => setAssignNotice(null), 4500);
                  }}
                  className="px-3 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-xs cursor-pointer transition active:scale-95"
                  title="Thibitisha vipindi vya ratiba hii viwe chini ya mtihani huu uliochaguliwa"
                >
                  ✓ Husisha Ratiba na Mtihani Huu
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('envelope_cover');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-2 text-xs font-black rounded-lg shadow-xs cursor-pointer transition flex items-center gap-1.5 ${
                    activeTab === 'envelope_cover'
                      ? 'bg-white text-slate-950 ring-2 ring-amber-400'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400'
                  }`}
                  title="Fungua Fomu Rasmi ya Bahasha ya Scripts za Majibu ya Wanafunzi (NECTA Script Return Envelope Cover Form)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>✉️ Fungua Fomu ya Bahasha (Envelope Cover)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. TOP SUB-NAVIGATION TABS (Matching TimetableContainer) */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'general' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Master Invigilation Timetable
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'sessions' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Exam Sessions & Schedule
        </button>

        <button
          onClick={() => setActiveTab('invigilators')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'invigilators' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Invigilators & Duty Balance
        </button>

        <button
          onClick={() => setActiveTab('supervisors')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'supervisors' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Supervisors Pool
        </button>

        <button
          onClick={() => setActiveTab('class')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'class' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Class Timetable
        </button>

        <button
          onClick={() => setActiveTab('teacher')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'teacher' || activeTab === 'personal' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Tazama Ratiba ya Usimamizi kwa Mwalimu mmoja au Walimu wote"
        >
          <Users className="w-4 h-4" />
          Teacher Timetable
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'saved' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Save className="w-4 h-4" />
          Saved Timetables
          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded-full font-bold">
            {(savedInvigilationRecords || []).length}
          </span>
        </button>

        <button
          onClick={() => {
            setControlInitialSubTab('dispatch');
            setActiveTab('control_logs');
          }}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'control_logs' && controlInitialSubTab !== 'reams'
              ? 'bg-[#1f4d8b] text-white shadow-xs ring-2 ring-amber-400 font-extrabold'
              : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300'
          }`}
          title="Usimamizi wa Kupokea & Kurudisha Mitihani (Check-in/Check-out), Utungaji na Script za Kusahihisha"
        >
          <PackageCheck className="w-4 h-4 text-amber-600" />
          <span>📋 Check-in/Check-out & Udhibiti</span>
        </button>

        <button
          onClick={() => {
            setControlInitialSubTab('reams');
            setActiveTab('control_logs');
          }}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'control_logs' && controlInitialSubTab === 'reams'
              ? 'bg-emerald-800 text-white shadow-xs ring-2 ring-amber-400 font-extrabold'
              : 'text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300'
          }`}
          title="Mfumo wa Makadirio ya Ream na Karatasi za Urudufishaji wa Mitihani kwa Kila Kidato na Somo"
        >
          <FileText className="w-4 h-4 text-emerald-700" />
          <span>🖨️ Makadirio ya Ream (Urudufishaji)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('envelope_cover');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'envelope_cover'
              ? 'bg-slate-900 text-white shadow-xs ring-2 ring-amber-400 font-extrabold'
              : 'text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300'
          }`}
          title="Fomu Rasmi ya Kubandika Juu ya Bahasha ya Scripts za Majibu ya Wanafunzi (NECTA Script Return Envelope Cover Form)"
        >
          <Printer className="w-4 h-4 text-indigo-700" />
          <span>✉️ Fomu ya Bahasha ya Script (Envelope Cover)</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className="px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              title="Tazama Kalenda ya Mwezi ya Usimamizi wa Mitihani"
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>Kalenda ya Mwezi</span>
            </button>
          )}

          {onNavigateToSittingPlan && (
            <button
              onClick={onNavigateToSittingPlan}
              className="px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              title="Open Official NECTA Sitting Plan Generator"
            >
              <Grid className="w-4 h-4" />
              <span>NECTA Sitting Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUMMARY METRICS CARDS (Only on Timetable Views, hidden on Envelope Cover & Control Logs) */}
      {activeTab !== 'envelope_cover' && activeTab !== 'control_logs' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#1f4d8b] rounded-xl shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{normalizedSessions.length}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exam Sessions</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{totalSlotsNeeded}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Room Duties Needed</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${unassignedSlotsCount === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">
                {assignedSlotsCount} <span className="text-xs text-slate-400 font-normal">/ {totalSlotsNeeded}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {unassignedSlotsCount === 0 ? '100% Assigned' : `${unassignedSlotsCount} Unassigned`}
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{activeRoster.length || availableTeachers.length}</div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Invigilators</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLASH & CONFLICT ALERT BAR (Only on Timetable Views) */}
      {activeTab !== 'envelope_cover' && activeTab !== 'control_logs' && conflicts.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <h4 className="text-sm font-bold text-rose-900">
                Double-Booking Conflict Alert ({conflicts.length} clashing assignment{conflicts.length > 1 ? 's' : ''})
              </h4>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-rose-200 text-rose-800 rounded-full">
              Attention Required
            </span>
          </div>
          <p className="text-xs text-rose-800">
            The following invigilator(s) have been scheduled into multiple rooms at the exact same examination date and session slot:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {conflicts.map((c, i) => (
              <span key={i} className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-900 flex items-center gap-1.5 shadow-2xs">
                <span>{c.teacherName}</span>
                <span className="text-slate-400 font-normal">•</span>
                <span className="text-blue-800">{c.date} ({c.day})</span>
                <span className="text-slate-400 font-normal">•</span>
                <span className="text-amber-800">{c.session}</span>
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[10px] font-bold">
                  {c.count} rooms
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MASTER INVIGILATION TIMETABLE                     */}
      {/* ======================================================== */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Action & Filter Bar (Matching Timetable action bar) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#1f4d8b]">Master Examination Invigilation Timetable</h3>
                <p className="text-xs text-slate-500">
                  Strictly divided into Session I (Morning) & Session II (Afternoon) with dynamic Day identification and 1-click room assignment.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAutoAssignAll}
                  className="px-3 py-2 text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  title="Fair round-robin distribution with zero double-booking clashes"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  Auto-Assign Invigilators
                </button>

                <button
                  onClick={handleReAutoAssignAll}
                  className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border border-amber-400 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Panga Upya Kiatomatiki: Futia kazi zote za zamani na upange upya kwa walimu wote wenye fursa"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
                  <span>Re-Auto Assign Invigilation</span>
                </button>

                <button
                  onClick={() => setBulkEditModalOpen(true)}
                  className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  Bulk Edit
                </button>

                <button
                  onClick={() => {
                    setEditingSession(null);
                    setSessionModalOpen(true);
                  }}
                  className="px-3 py-2 text-xs font-bold bg-[#1f4d8b] text-white rounded-lg hover:bg-blue-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Exam Session
                </button>

                <button
                  onClick={onToggleRelease}
                  className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                    timetableReleased
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                  }`}
                >
                  {timetableReleased ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      Released to Faculty
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Draft (Not Released)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSavePermanentlyToDatabase}
                  disabled={isSavingDb}
                  className={`px-3 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    saveSuccessNotice
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                  title="Hifadhi Ratiba yote ya Usimamizi kudumu kwenye Database (SQL & Firestore) isipotee ukilogout"
                >
                  {saveSuccessNotice ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Imehifadhiwa Kudumu! ✓</span>
                    </>
                  ) : isSavingDb ? (
                    <>
                      <Zap className="w-3.5 h-3.5 animate-spin" />
                      <span>Inahifadhi...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Hifadhi Kudumu (Save DB)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 text-xs font-bold bg-white text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-50 flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Pakua Ratiba ya Usimamizi kwenye Excel (.xlsx) ikiwa imepangwa kikamilifu"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pakua Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => {
                    setSnapshotTitle(`Term Exam Invigilation Timetable (${new Date().getFullYear()})`);
                    setSaveModalOpen(true);
                  }}
                  className="px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Save current invigilation timetable snapshot (MIDTERM / TERMINAL)"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Snapshot
                </button>

                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Import Examination Timetable & Invigilator Directory from CSV File"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Import CSV (Leta CSV)</span>
                </button>

                <button
                  onClick={() => exportInvigilationToCSV(normalizedSessions, teachers, invigilationAssignments)}
                  className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Export Examination Directory to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => exportInvigilationPDF({
                    schoolName: schoolInfo.name,
                    sessions: normalizedSessions,
                    teachers,
                    invigilationAssignments,
                    schoolInfo,
                    examTitle: activeExamTitle,
                    mode: 'download'
                  })}
                  className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Download Examination Invigilation Timetable as formatted A4 Landscape PDF"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Pakua PDF (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportInvigilationPDF({
                    schoolName: schoolInfo.name,
                    sessions: normalizedSessions,
                    teachers,
                    invigilationAssignments,
                    schoolInfo,
                    examTitle: activeExamTitle,
                    mode: 'print'
                  })}
                  className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Chapisha Moja kwa Moja Ratiba ya Usimamizi (Printable A4 PDF)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Chapisha PDF (Print)</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Date / Day Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Date / Day:</span>
                  <select
                    value={selectedDayFilter}
                    onChange={e => setSelectedDayFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All Exam Dates</option>
                    {uniqueDates.map(item => (
                      <option key={item.rawDate} value={item.rawDate}>
                        {item.day} • {item.date}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Filter: Strictly SESSION I and SESSION II */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Session:</span>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedSessionFilter('ALL')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        selectedSessionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Sessions
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSessionFilter('SESSION I')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        selectedSessionFilter === 'SESSION I' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Session I (Morning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSessionFilter('SESSION II')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        selectedSessionFilter === 'SESSION II' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Session II (Afternoon)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSessionFilter('SESSION III')}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        selectedSessionFilter === 'SESSION III' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Session III (Evening)
                    </button>
                  </div>
                </div>

                {/* Class Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">Class:</span>
                  <select
                    value={selectedClassFilter}
                    onChange={e => setSelectedClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All Classes</option>
                    {DEFAULT_CLASSES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Search query */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subject or stream..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-48"
                  />
                </div>
              </div>

              {/* View Mode Toggle: Cards vs Table Matrix */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">View:</span>
                <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                      viewMode === 'cards' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Card Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('matrix')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                      viewMode === 'matrix' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Exam Hall Matrix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('master')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                      viewMode === 'master' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Master Table</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Invigilation Matrix */}
          <div id="general-invig-print" className="space-y-8 master-timetable-container">
            {Object.keys(sessionsByDate).length === 0 ? (
              <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No Examination Sessions Found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No examination sessions match your current filter settings. Try resetting your filters or click below to schedule an exam session.
                </p>
                <button
                  onClick={() => {
                    setSelectedDayFilter('ALL');
                    setSelectedSessionFilter('ALL');
                    setSelectedClassFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                >
                  Reset All Filters
                </button>
              </div>
            ) : viewMode === 'master' ? (
              /* Master Table View: All days in one giant table */
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-[#0f2948] p-4 text-white">
                  <h3 className="text-lg font-bold">Master Invigilation Schedule</h3>
                  <p className="text-[11px] text-slate-300 font-medium">Complete listing of all examination sessions and assigned invigilators</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-700 font-black uppercase tracking-wider">
                        <th className="p-3 border-r border-slate-200 w-36">Date & Day</th>
                        <th className="p-3 border-r border-slate-200 w-24">Session</th>
                        <th className="p-3 border-r border-slate-200 w-44">Exam Subject & Details</th>
                        {[1, 2, 3, 4, 5, 6, 7].map(r => (
                          <th key={r} className="p-3 border-r border-slate-200 text-center min-w-[100px]">Room {r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(sessionsByDate).map(([dateKey, daySessions]) => {
                        const [_rawDate, dayName, formattedDate] = dateKey.split('__');
                        const dayTheme = getDayTheme(dayName, dayThemes);
                        
                        return daySessions.map((session, sIdx) => (
                          <tr key={session.id} className={`border-b border-slate-100 hover:bg-slate-50/80 ${sIdx === 0 ? 'border-t-2 border-t-slate-200' : ''} print-avoid-break`}>
                            {sIdx === 0 && (
                              <td 
                                rowSpan={daySessions.length} 
                                className="p-3 border-r border-slate-200 font-black text-slate-900 bg-slate-50/50 align-top"
                                style={{ borderLeft: `4px solid ${dayTheme.border}` }}
                              >
                                <div className="text-[12px]">{dayName}</div>
                                <div className="text-[10px] text-slate-500 font-bold">{formattedDate}</div>
                              </td>
                            )}
                            <td className="p-3 border-r border-slate-200">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                session.session === 'SESSION I'
                                  ? 'bg-blue-100 text-blue-900 border-blue-200'
                                  : session.session === 'SESSION II'
                                  ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                  : 'bg-purple-100 text-purple-900 border-purple-200'
                              }`}>
                                {session.session}
                              </span>
                              <div className="text-[9px] text-slate-500 mt-1 font-mono">{session.start}-{session.end}</div>
                            </td>
                            <td className="p-3 border-r border-slate-200">
                              <div className="font-bold text-slate-800 mb-0.5">{session.subject}</div>
                              <div className="text-[10px] font-medium text-slate-600">{session.className} • {session.stream}</div>
                            </td>
                            {[0, 1, 2, 3, 4, 5, 6].map(roomIndex => {
                              const isRequired = roomIndex < session.rooms;
                              const assignmentKey = `${session.id}_room${roomIndex}`;
                              const assignedId = invigilationAssignments[assignmentKey];
                              const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                              const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;
                              
                              return (
                                <td key={roomIndex} className="p-1 border-r border-slate-200 text-center">
                                  {isRequired ? (
                                    <div 
                                      onClick={() => setAssignModalData({ session, roomIndex, currentTeacherId: assignedId })}
                                      className={`p-1 rounded-lg border text-[10px] cursor-pointer min-h-[44px] flex flex-col justify-center items-center transition-all ${
                                        assignedTeacher 
                                          ? 'bg-blue-50 border-blue-100 hover:bg-blue-100' 
                                          : 'bg-amber-50/50 border-dashed border-amber-200 hover:bg-amber-100'
                                      }`}
                                    >
                                      {assignedTeacher ? (
                                        <>
                                          <span 
                                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white mb-0.5 shadow-2xs"
                                            style={{ backgroundColor: assignedTeacher.color || tCol?.hex || '#1e40af' }}
                                          >
                                            {assignedTeacher.initial}
                                          </span>
                                          <span className="font-black text-slate-800 leading-none truncate max-w-[80px]">
                                            {assignedTeacher.name.split(' ')[0]}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="font-bold text-amber-700">+ Add</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              Object.entries(sessionsByDate).map(([dateKey, daySessions], dayIdx) => {
                const [_rawDate, dayName, formattedDate] = dateKey.split('__');
                const dayTheme = getDayTheme(dayName, dayThemes);
                const supervisor = supervisors[dayIdx % Math.max(supervisors.length, 1)];

                // Separate daySessions into SESSION I, SESSION II, and SESSION III
                const sessionOneList = daySessions.filter(s => s.session === 'SESSION I');
                const sessionTwoList = daySessions.filter(s => s.session === 'SESSION II');
                const sessionThreeList = daySessions.filter(s => s.session === 'SESSION III');

                return (
                  <div
                    key={dateKey}
                    style={{ borderColor: dayTheme.border }}
                    className="bg-white border rounded-2xl shadow-xs overflow-hidden print-avoid-break"
                  >
                    {/* Day Banner with dynamic Day of Week and Date displayed prominently */}
                    <div
                      style={{ backgroundColor: dayTheme.headerBg }}
                      className="px-6 py-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded-lg bg-white/20 text-white">
                          <Calendar className="w-5 h-5" />
                        </span>
                        <div>
                          <div className="text-base font-black tracking-wide uppercase flex items-center gap-2">
                            <span>{dayName}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-bold">
                              {formattedDate}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/80 font-medium">
                            {daySessions.length} examination paper{daySessions.length > 1 ? 's' : ''} scheduled
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-white/20 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                          <ShieldCheck className="w-4 h-4 text-amber-300" />
                          <span>SUPERVISOR:</span>
                          <strong className="text-white">
                            {supervisor ? `${supervisor.name} (${supervisor.initial})` : 'To Be Appointed'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* View Mode 1: Modern Card Grid View (Clear, intuitive, aesthetic) */}
                    {viewMode === 'cards' ? (
                      <div className="p-5 space-y-6">
                        {/* SESSION I SECTION */}
                        {sessionOneList.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                                  SESSION I (MORNING)
                                </span>
                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {sessionOneList[0]?.start} - {sessionOneList[0]?.end}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-400">
                                {sessionOneList.length} Exam Paper(s)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sessionOneList.map(session => {
                                const subCol = getSubjectColor(session.subject);
                                return (
                                  <div
                                    key={session.id}
                                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-300 transition-all space-y-3"
                                  >
                                    {/* Paper header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                            className="px-2.5 py-0.5 rounded-md border font-black text-xs inline-block"
                                          >
                                            {session.subject}
                                          </span>
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                            {session.level}
                                          </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-800">
                                          {session.className} • <span className="text-blue-700 font-semibold">{session.stream}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingSession(session);
                                            setSessionModalOpen(true);
                                          }}
                                          title="Edit Session Details"
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDuplicateSession(session)}
                                          title="Duplicate Session"
                                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSession(session.id)}
                                          title="Delete Session"
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Room Slots Grid */}
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span>Invigilation Rooms ({session.rooms})</span>
                                        <span className="text-slate-400 font-normal">Click slot to assign</span>
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Array.from({ length: session.rooms }).map((_, rIdx) => {
                                          const assignmentKey = `${session.id}_room${rIdx}`;
                                          const assignedId = invigilationAssignments[assignmentKey];
                                          const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                          const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                          return (
                                            <div
                                              key={rIdx}
                                              onClick={() => setAssignModalData({
                                                session,
                                                roomIndex: rIdx,
                                                currentTeacherId: assignedId
                                              })}
                                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between min-h-[58px] ${
                                                assignedTeacher
                                                  ? 'bg-white border-slate-300 hover:border-blue-500 shadow-2xs'
                                                  : 'bg-amber-50/50 border-dashed border-amber-300 hover:bg-amber-100/60'
                                              }`}
                                            >
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                  Room {rIdx + 1}
                                                </span>
                                                {assignedTeacher && (
                                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                )}
                                              </div>

                                              {assignedTeacher ? (
                                                <div className="flex items-center gap-1.5">
                                                  <span
                                                    style={{ backgroundColor: assignedTeacher.color || tCol?.hex, color: '#ffffff' }}
                                                    className="w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs"
                                                  >
                                                    {assignedTeacher.initial}
                                                  </span>
                                                  <span className="font-bold text-slate-800 text-[11px] truncate">
                                                    {assignedTeacher.name}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                                  <Plus className="w-3 h-3 text-amber-600" />
                                                  <span>Assign</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* SESSION II SECTION */}
                        {sessionTwoList.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md text-xs font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                                  SESSION II (AFTERNOON)
                                </span>
                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {sessionTwoList[0]?.start} - {sessionTwoList[0]?.end}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-400">
                                {sessionTwoList.length} Exam Paper(s)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sessionTwoList.map(session => {
                                const subCol = getSubjectColor(session.subject);
                                return (
                                  <div
                                    key={session.id}
                                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-all space-y-3"
                                  >
                                    {/* Paper header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                            className="px-2.5 py-0.5 rounded-md border font-black text-xs inline-block"
                                          >
                                            {session.subject}
                                          </span>
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                            {session.level}
                                          </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-800">
                                          {session.className} • <span className="text-indigo-700 font-semibold">{session.stream}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingSession(session);
                                            setSessionModalOpen(true);
                                          }}
                                          title="Edit Session Details"
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDuplicateSession(session)}
                                          title="Duplicate Session"
                                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSession(session.id)}
                                          title="Delete Session"
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Room Slots Grid */}
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span>Invigilation Rooms ({session.rooms})</span>
                                        <span className="text-slate-400 font-normal">Click slot to assign</span>
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Array.from({ length: session.rooms }).map((_, rIdx) => {
                                          const assignmentKey = `${session.id}_room${rIdx}`;
                                          const assignedId = invigilationAssignments[assignmentKey];
                                          const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                          const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                          return (
                                            <div
                                              key={rIdx}
                                              onClick={() => setAssignModalData({
                                                session,
                                                roomIndex: rIdx,
                                                currentTeacherId: assignedId
                                              })}
                                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between min-h-[58px] ${
                                                assignedTeacher
                                                  ? 'bg-white border-slate-300 hover:border-indigo-500 shadow-2xs'
                                                  : 'bg-amber-50/50 border-dashed border-amber-300 hover:bg-amber-100/60'
                                              }`}
                                            >
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                  Room {rIdx + 1}
                                                </span>
                                                {assignedTeacher && (
                                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                )}
                                              </div>

                                              {assignedTeacher ? (
                                                <div className="flex items-center gap-1.5">
                                                  <span
                                                    style={{ backgroundColor: assignedTeacher.color || tCol?.hex, color: '#ffffff' }}
                                                    className="w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs"
                                                  >
                                                    {assignedTeacher.initial}
                                                  </span>
                                                  <span className="font-bold text-slate-800 text-[11px] truncate">
                                                    {assignedTeacher.name}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                                  <Plus className="w-3 h-3 text-amber-600" />
                                                  <span>Assign</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* SESSION III SECTION */}
                        {sessionThreeList.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                                  SESSION III (EVENING)
                                </span>
                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {sessionThreeList[0]?.start} - {sessionThreeList[0]?.end}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-400">
                                {sessionThreeList.length} Exam Paper(s)
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sessionThreeList.map(session => {
                                const subCol = getSubjectColor(session.subject);
                                return (
                                  <div
                                    key={session.id}
                                    className="p-4 rounded-xl border border-slate-200 bg-purple-50/20 hover:bg-purple-50/40 hover:border-purple-300 transition-all space-y-3"
                                  >
                                    {/* Paper header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                            className="px-2.5 py-0.5 rounded-md border font-black text-xs inline-block"
                                          >
                                            {session.subject}
                                          </span>
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                            {session.level}
                                          </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-800">
                                          {session.className} • <span className="text-purple-700 font-semibold">{session.stream}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingSession(session);
                                            setSessionModalOpen(true);
                                          }}
                                          title="Edit Session Details"
                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDuplicateSession(session)}
                                          title="Duplicate Session"
                                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSession(session.id)}
                                          title="Delete Session"
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Room Slots Grid */}
                                    <div>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                                        <span>Invigilation Rooms ({session.rooms})</span>
                                        <span className="text-slate-400 font-normal">Click slot to assign</span>
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Array.from({ length: session.rooms }).map((_, rIdx) => {
                                          const assignmentKey = `${session.id}_room${rIdx}`;
                                          const assignedId = invigilationAssignments[assignmentKey];
                                          const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                          const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                          return (
                                            <div
                                              key={rIdx}
                                              onClick={() => setAssignModalData({
                                                session,
                                                roomIndex: rIdx,
                                                currentTeacherId: assignedId
                                              })}
                                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between min-h-[58px] ${
                                                assignedTeacher
                                                  ? 'bg-white border-slate-300 hover:border-purple-500 shadow-2xs'
                                                  : 'bg-amber-50/50 border-dashed border-amber-300 hover:bg-amber-100/60'
                                              }`}
                                            >
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                  Room {rIdx + 1}
                                                </span>
                                                {assignedTeacher && (
                                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                )}
                                              </div>

                                              {assignedTeacher ? (
                                                <div className="flex items-center gap-1.5">
                                                  <span
                                                    style={{ backgroundColor: assignedTeacher.color || tCol?.hex, color: '#ffffff' }}
                                                    className="w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs"
                                                  >
                                                    {assignedTeacher.initial}
                                                  </span>
                                                  <span className="font-bold text-slate-800 text-[11px] truncate">
                                                    {assignedTeacher.name}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                                  <Plus className="w-3 h-3 text-amber-600" />
                                                  <span>Assign</span>
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* View Mode 2: Formal Master Exam Hall Matrix (Matching Timetable Grid) */
                      <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                          <thead>
                            <tr className="bg-[#0f2948] text-white font-bold uppercase text-[11px] tracking-wider">
                              <th className="p-2.5 border-r border-slate-700 w-32">Session Slot</th>
                              <th className="p-2.5 border-r border-slate-700 w-28">Time</th>
                              <th className="p-2.5 border-r border-slate-700">Exam Subject</th>
                              <th className="p-2.5 border-r border-slate-700 w-36">Class & Stream</th>
                              {[1, 2, 3, 4, 5, 6, 7].map(r => (
                                <th key={r} className="p-2.5 border-r border-slate-700 text-center min-w-[90px]">
                                  Room {r}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {daySessions.map(session => {
                              const subCol = getSubjectColor(session.subject);
                              return (
                                <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                  <td className="p-2.5 border-r border-slate-200 font-bold">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      session.session === 'SESSION I'
                                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                        : session.session === 'SESSION II'
                                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                        : 'bg-purple-100 text-purple-900 border border-purple-200'
                                    }`}>
                                      {session.session}
                                    </span>
                                  </td>

                                  <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                                    {session.start} - {session.end}
                                  </td>

                                  <td className="p-2.5 border-r border-slate-200">
                                    <span
                                      style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                      className="px-2 py-0.5 rounded-md border font-bold text-[11px] inline-block"
                                    >
                                      {session.subject}
                                    </span>
                                  </td>

                                  <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">
                                    <div>{session.className}</div>
                                    <span className="text-[10px] font-semibold text-blue-700">
                                      {session.stream}
                                    </span>
                                  </td>

                                  {/* 7 Rooms */}
                                  {[0, 1, 2, 3, 4, 5, 6].map(roomIndex => {
                                    const assignmentKey = `${session.id}_room${roomIndex}`;
                                    const isRequired = roomIndex < session.rooms;
                                    const assignedId = invigilationAssignments[assignmentKey];
                                    const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                    const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                    return (
                                      <td
                                        key={roomIndex}
                                        className="p-2 border-r border-slate-200 text-center align-middle"
                                      >
                                        {isRequired ? (
                                          <div
                                            onClick={() => setAssignModalData({
                                              session,
                                              roomIndex,
                                              currentTeacherId: assignedId
                                            })}
                                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                              assignedTeacher
                                                ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:bg-blue-100/50'
                                                : 'bg-amber-50/70 border-dashed border-amber-300 hover:bg-amber-100'
                                            }`}
                                          >
                                            {assignedTeacher ? (
                                              <div className="flex items-center justify-center gap-1.5" title={assignedTeacher.name}>
                                                <span
                                                  style={{ backgroundColor: assignedTeacher.color || tCol?.hex, color: '#ffffff' }}
                                                  className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-[10px] shadow-2xs"
                                                >
                                                  {assignedTeacher.initial}
                                                </span>
                                                <span className="font-bold text-slate-800 text-[10px] truncate max-w-[65px]">
                                                  {assignedTeacher.name.split(' ')[0]}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-[10px] font-bold text-amber-700">
                                                + Assign
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 font-light">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EXAM SESSIONS & SCHEDULE MANAGER                  */}
      {/* ======================================================== */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-[#1f4d8b]">Examination Sessions Directory</h3>
                <p className="text-xs text-slate-500">
                  Register, edit, or delete examination sessions. Dates dynamically display their day of the week, and sessions are strictly Session I & Session II.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadExamTimetableSampleCSV}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download Example CSV Template for Examination Schedule"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  title="Import Examination Timetable & Invigilator Directory from CSV File"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Import CSV (Leta CSV)</span>
                </button>

                <button
                  onClick={() => {
                    setEditingSession(null);
                    setSessionModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + Add Examination Session
                </button>
              </div>
            </div>

            {/* List of Sessions */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-black uppercase tracking-wider">
                    <th className="p-4 border-r border-slate-200">Date & Day</th>
                    <th className="p-4 border-r border-slate-200">Session</th>
                    <th className="p-4 border-r border-slate-200">Time</th>
                    <th className="p-4 border-r border-slate-200">Subject</th>
                    <th className="p-4 border-r border-slate-200">Class/Stream</th>
                    <th className="p-4 border-r border-slate-200 text-center">Rooms</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No examination sessions registered yet. Click "+ Add Examination Session" to begin.
                      </td>
                    </tr>
                  ) : (
                    normalizedSessions.map(s => {
                      const subCol = getSubjectColor(s.subject);
                      return (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="p-3 border-r border-slate-200 font-bold">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <div>
                                <div className="text-slate-900 font-black">{s.day}</div>
                                <span className="text-[11px] text-slate-500 font-medium">{s.date}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 border-r border-slate-200">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-black inline-block ${
                              s.session === 'SESSION I'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                            }`}>
                              {s.session}
                            </span>
                          </td>

                          <td className="p-3 border-r border-slate-200 font-mono text-slate-600 font-semibold">
                            {s.time}
                          </td>

                          <td className="p-3 border-r border-slate-200">
                            <span
                              style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                              className="px-2.5 py-0.5 rounded-md border font-bold text-xs inline-block"
                            >
                              {s.subject}
                            </span>
                          </td>

                          <td className="p-3 border-r border-slate-200 font-semibold text-slate-800">
                            {s.className} • <span className="text-blue-700 font-bold">{s.stream}</span>
                          </td>

                          <td className="p-3 border-r border-slate-200 text-center font-bold">
                            <span className="px-2.5 py-0.5 bg-slate-100 rounded-full text-slate-700 text-xs">
                              {s.rooms} {s.rooms === 1 ? 'Room' : 'Rooms'}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingSession(s);
                                  setSessionModalOpen(true);
                                }}
                                title="Edit Session"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateSession(s)}
                                title="Duplicate Session"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(s.id)}
                                title="Delete Session"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: INVIGILATORS ROSTER & WORKLOAD BALANCER           */}
      {/* ======================================================== */}
      {activeTab === 'invigilators' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-[#1f4d8b]">Invigilators Active Roster & Workload Balance</h3>
              <p className="text-xs text-slate-500">
                Track and balance duty assignments between Session I (Morning) and Session II (Afternoon) for equitable workload distribution.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full shrink-0">
              {selectedInvigilators.length || availableTeachers.length} of {teachers.length} Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase">
                  <th className="p-3 border-r border-slate-200 w-12 text-center">Active</th>
                  <th className="p-3 border-r border-slate-200 text-center w-16">Badge</th>
                  <th className="p-3 border-r border-slate-200">Teacher Full Name</th>
                  <th className="p-3 border-r border-slate-200">Teaching Subjects</th>
                  <th className="p-3 border-r border-slate-200 text-center">Session I (Morning)</th>
                  <th className="p-3 border-r border-slate-200 text-center">Session II (Afternoon)</th>
                  <th className="p-3 border-r border-slate-200 text-center">Session III (Evening)</th>
                  <th className="p-3 border-r border-slate-200 text-center">Total Duties</th>
                  <th className="p-3 text-center">Duty Status</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => {
                  const isSelected = selectedInvigilators.includes(t.id);
                  const col = getTeacherColor(t.id);

                  // Calculate teacher's duties by session
                  let sessionOneDuties = 0;
                  let sessionTwoDuties = 0;
                  let sessionThreeDuties = 0;

                  normalizedSessions.forEach(s => {
                    for (let r = 0; r < s.rooms; r++) {
                      if (invigilationAssignments[`${s.id}_room${r}`] === t.id) {
                        if (s.session === 'SESSION I') sessionOneDuties++;
                        if (s.session === 'SESSION II') sessionTwoDuties++;
                        if (s.session === 'SESSION III') sessionThreeDuties++;
                      }
                    }
                  });

                  const totalDuties = sessionOneDuties + sessionTwoDuties + sessionThreeDuties;

                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 border-r border-slate-200 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={t.excludeInvigilation}
                          onChange={e => {
                            if (e.target.checked) {
                              onUpdateSelectedInvigilators([...selectedInvigilators, t.id]);
                            } else {
                              onUpdateSelectedInvigilators(selectedInvigilators.filter(id => id !== t.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      </td>

                      <td className="p-3 border-r border-slate-200 text-center">
                        <span
                          style={{ backgroundColor: t.color || col.hex, color: '#ffffff' }}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center font-bold text-xs shadow-2xs"
                        >
                          {t.initial}
                        </span>
                      </td>

                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{t.name}</td>
                      <td className="p-3 border-r border-slate-200 text-slate-600">{t.subjects.join(', ')}</td>

                      <td className="p-3 border-r border-slate-200 text-center font-bold text-blue-800">
                        {sessionOneDuties}
                      </td>

                      <td className="p-3 border-r border-slate-200 text-center font-bold text-indigo-800">
                        {sessionTwoDuties}
                      </td>

                      <td className="p-3 border-r border-slate-200 text-center font-bold text-purple-800">
                        {sessionThreeDuties}
                      </td>

                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className="px-2.5 py-1 rounded-full font-black text-xs bg-slate-100 text-slate-800">
                          {totalDuties}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateTeacher) {
                              onUpdateTeacher({ ...t, excludeInvigilation: !t.excludeInvigilation });
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] font-black rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95 ${
                            t.excludeInvigilation
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : isSelected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                          title={t.excludeInvigilation ? 'Mwalimu HUYU HASIMAMII mitihani. Bofya kubadilisha awe anasimamia.' : 'Mwalimu HUYU ANASIMAMIA mitihani. Bofya kubadilisha asisimamie.'}
                        >
                          {t.excludeInvigilation ? (
                            <>
                              <X className="w-3.5 h-3.5 text-rose-600 shrink-0 font-bold" />
                              <span>Hasimamii</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Anasimamia</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SUPERVISORS POOL                                  */}
      {/* ======================================================== */}
      {activeTab === 'supervisors' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-[#1f4d8b]">Daily Examination Supervisors Pool</h3>
              <p className="text-xs text-slate-500">
                Supervisors are appointed and rotated across examination dates to manage overall conduct and support invigilators.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSupervisorTeacher}
                onChange={e => setSelectedSupervisorTeacher(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.initial})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddSupervisor}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
              >
                + Add Supervisor
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase">
                  <th className="p-3 border-r border-slate-200 w-12 text-center">#</th>
                  <th className="p-3 border-r border-slate-200">Supervisor Name</th>
                  <th className="p-3 border-r border-slate-200 text-center">Initial Badge</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {supervisors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      No daily supervisors appointed yet. Select a teacher above to add them to the pool.
                    </td>
                  </tr>
                ) : (
                  supervisors.map((s, idx) => {
                    const tCol = getTeacherColor(s.teacherId);
                    return (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{s.name}</td>
                        <td className="p-3 border-r border-slate-200 text-center">
                          <span
                            style={{ backgroundColor: tCol.hex, color: '#ffffff' }}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center font-bold text-xs shadow-2xs"
                          >
                            {s.initial}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onUpdateSupervisors(supervisors.filter(item => item.id !== s.id))}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ======================================================== */}
      {/* TAB 5: CLASS INVIGILATION TIMETABLE                      */}
      {/* ======================================================== */}
      {activeTab === 'class' && (() => {
        const classFilteredSessions = normalizedSessions.filter(s =>
          selectedClassForInvig === 'ALL' || s.className.toLowerCase() === selectedClassForInvig.toLowerCase()
        );

        // Group class sessions by date for Matrix View & Master Table View
        const classSessionsByDate: Record<string, InvigilationSession[]> = {};
        classFilteredSessions.forEach(s => {
          const key = `${s.rawDate}__${s.day}__${s.date}`;
          if (!classSessionsByDate[key]) classSessionsByDate[key] = [];
          classSessionsByDate[key].push(s);
        });

        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    Class Examination & Invigilation Schedule ({selectedClassForInvig === 'ALL' ? 'All Classes' : selectedClassForInvig})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ratiba ya mtihani na wasimamizi kwa darasa ({activeExamTitle}) — Chagua Examination Hall Matrix, Master Table, au Card View
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Class Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Darasa (Class):</label>
                  <select
                    value={selectedClassForInvig}
                    onChange={e => setSelectedClassForInvig(e.target.value)}
                    className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white shadow-2xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Madarasa Yote (All Classes)</option>
                    {DEFAULT_CLASSES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* View Mode Toggle: Exam Hall Matrix, Master Table, Card Grid */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">View:</span>
                  <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setClassViewMode('matrix')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        classViewMode === 'matrix' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Examination Hall Matrix</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassViewMode('master')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        classViewMode === 'master' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Master Table View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassViewMode('cards')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        classViewMode === 'cards' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Card View</span>
                    </button>
                  </div>
                </div>

                {/* PDF Download & Print Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportInvigilationPDF({
                      schoolName: schoolInfo.name,
                      sessions: classFilteredSessions,
                      teachers,
                      invigilationAssignments,
                      schoolInfo,
                      examTitle: `${activeExamTitle} — ${selectedClassForInvig === 'ALL' ? 'MADARASA YOTE' : selectedClassForInvig.toUpperCase()}`,
                      mode: 'download'
                    })}
                    className="px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pakua PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportInvigilationPDF({
                      schoolName: schoolInfo.name,
                      sessions: classFilteredSessions,
                      teachers,
                      invigilationAssignments,
                      schoolInfo,
                      examTitle: `${activeExamTitle} — ${selectedClassForInvig === 'ALL' ? 'MADARASA YOTE' : selectedClassForInvig.toUpperCase()}`,
                      mode: 'print'
                    })}
                    className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Chapisha PDF (Print)</span>
                  </button>
                </div>
              </div>
            </div>

            <div id="class-invig-print" className="space-y-6">
              {classFilteredSessions.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 font-bold text-sm">
                    Hakuna vipindi vya mtihani vilivyopangwa kwa {selectedClassForInvig === 'ALL' ? 'madarasa yote' : selectedClassForInvig}.
                  </p>
                </div>
              ) : classViewMode === 'master' ? (
                /* VIEW 1: MASTER TABLE VIEW (ONE COMPREHENSIVE MASTER TABLE FOR THE CLASS) */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                  <div className="bg-[#0f2948] p-4 text-white flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                        Master Examination & Invigilation Table — {selectedClassForInvig === 'ALL' ? 'All Classes' : selectedClassForInvig} ({activeExamTitle})
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Jedwali kuu la mitihani yote, tarehe, vipindi na wasimamizi wa vyumba (Bofya chumba kubadilisha msimamizi)
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-white/15 text-amber-300 text-xs font-black">
                      {classFilteredSessions.length} Vipindi vya Mtihani
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-700 font-black uppercase tracking-wider">
                          <th className="p-3 border-r border-slate-200 w-36">Tarehe & Siku</th>
                          <th className="p-3 border-r border-slate-200 w-28">Kipindi & Muda</th>
                          <th className="p-3 border-r border-slate-200 w-48">Somo la Mtihani & Darasa</th>
                          {[1, 2, 3, 4, 5, 6, 7].map(r => (
                            <th key={r} className="p-3 border-r border-slate-200 text-center min-w-[100px]">Chumba / Room {r}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(classSessionsByDate).map(([dateKey, daySessions]) => {
                          const [_rawDate, dayName, formattedDate] = dateKey.split('__');
                          const dayTheme = getDayTheme(dayName, dayThemes);

                          return daySessions.map((session, sIdx) => {
                            const subCol = getSubjectColor(session.subject);
                            return (
                              <tr key={session.id} className={`border-b border-slate-100 hover:bg-slate-50/80 ${sIdx === 0 ? 'border-t-2 border-t-slate-200' : ''}`}>
                                {sIdx === 0 && (
                                  <td
                                    rowSpan={daySessions.length}
                                    className="p-3 border-r border-slate-200 font-black text-slate-900 bg-slate-50/60 align-top"
                                    style={{ borderLeft: `4px solid ${dayTheme.border}` }}
                                  >
                                    <div className="text-xs uppercase">{dayName}</div>
                                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{formattedDate}</div>
                                  </td>
                                )}
                                <td className="p-3 border-r border-slate-200">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                    session.session === 'SESSION I'
                                      ? 'bg-blue-100 text-blue-900 border-blue-200'
                                      : session.session === 'SESSION II'
                                      ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                      : 'bg-purple-100 text-purple-900 border-purple-200'
                                  }`}>
                                    {session.session}
                                  </span>
                                  <div className="text-[10px] text-slate-500 mt-1 font-mono font-bold">{session.start} - {session.end}</div>
                                </td>
                                <td className="p-3 border-r border-slate-200">
                                  <span
                                    style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                    className="px-2 py-0.5 rounded-md border font-black text-[11px] inline-block mb-1"
                                  >
                                    {session.subject}
                                  </span>
                                  <div className="text-[10px] font-bold text-slate-600">{session.className} • {session.stream}</div>
                                </td>
                                {[0, 1, 2, 3, 4, 5, 6].map(roomIndex => {
                                  const isRequired = roomIndex < session.rooms;
                                  const assignmentKey = `${session.id}_room${roomIndex}`;
                                  const assignedId = invigilationAssignments[assignmentKey];
                                  const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                  const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                  return (
                                    <td key={roomIndex} className="p-1.5 border-r border-slate-200 text-center">
                                      {isRequired ? (
                                        <div
                                          onClick={() => setAssignModalData({ session, roomIndex, currentTeacherId: assignedId })}
                                          className={`p-1.5 rounded-lg border text-[10px] cursor-pointer min-h-[46px] flex flex-col justify-center items-center transition-all ${
                                            assignedTeacher
                                              ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-100'
                                              : 'bg-amber-50/60 border-dashed border-amber-300 hover:bg-amber-100'
                                          }`}
                                          title={assignedTeacher ? `Msimamizi: ${assignedTeacher.name} (Bofya kubadilisha)` : 'Bofya kupanga msimamizi'}
                                        >
                                          {assignedTeacher ? (
                                            <>
                                              <span
                                                className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white mb-0.5 shadow-2xs"
                                                style={{ backgroundColor: assignedTeacher.color || tCol?.hex || '#1e40af' }}
                                              >
                                                {assignedTeacher.initial}
                                              </span>
                                              <span className="font-black text-slate-800 leading-none truncate max-w-[82px]">
                                                {assignedTeacher.name.split(' ')[0]}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="font-bold text-amber-700">+ Assign</span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : classViewMode === 'matrix' ? (
                /* VIEW 2: EXAMINATION HALL MATRIX VIEW (GROUPED BY DAY WITH HALL ROOM COLUMNS) */
                <div className="space-y-6">
                  {Object.entries(classSessionsByDate).map(([dateKey, daySessions], dayIdx) => {
                    const [_rawDate, dayName, formattedDate] = dateKey.split('__');
                    const dayTheme = getDayTheme(dayName, dayThemes);
                    const supervisor = supervisors[dayIdx % Math.max(supervisors.length, 1)];

                    return (
                      <div
                        key={dateKey}
                        style={{ borderColor: dayTheme.border }}
                        className="bg-white border rounded-2xl shadow-xs overflow-hidden"
                      >
                        <div
                          style={{ backgroundColor: dayTheme.headerBg }}
                          className="px-5 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="p-1.5 rounded-lg bg-white/20 text-white">
                              <Calendar className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
                                <span>{dayName}</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-bold">
                                  {formattedDate}
                                </span>
                              </div>
                              <span className="text-[11px] text-white/80 font-medium">
                                {selectedClassForInvig === 'ALL' ? 'Madarasa Yote' : selectedClassForInvig} • {daySessions.length} Kipindi / Masomo
                              </span>
                            </div>
                          </div>

                          <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                            <span>SUPERVISOR:</span>
                            <strong className="text-white">
                              {supervisor ? `${supervisor.name} (${supervisor.initial})` : 'To Be Appointed'}
                            </strong>
                          </div>
                        </div>

                        <div className="overflow-x-auto p-4">
                          <table className="w-full text-left border-collapse text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                            <thead>
                              <tr className="bg-[#0f2948] text-white font-bold uppercase text-[11px] tracking-wider">
                                <th className="p-2.5 border-r border-slate-700 w-32">Session Slot</th>
                                <th className="p-2.5 border-r border-slate-700 w-28">Time</th>
                                <th className="p-2.5 border-r border-slate-700">Exam Subject</th>
                                <th className="p-2.5 border-r border-slate-700 w-36">Class & Stream</th>
                                {[1, 2, 3, 4, 5, 6, 7].map(r => (
                                  <th key={r} className="p-2.5 border-r border-slate-700 text-center min-w-[90px]">
                                    Room {r}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {daySessions.map(session => {
                                const subCol = getSubjectColor(session.subject);
                                return (
                                  <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                    <td className="p-2.5 border-r border-slate-200 font-bold">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                        session.session === 'SESSION I'
                                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                          : session.session === 'SESSION II'
                                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                                      }`}>
                                        {session.session}
                                      </span>
                                    </td>

                                    <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                                      {session.start} - {session.end}
                                    </td>

                                    <td className="p-2.5 border-r border-slate-200">
                                      <span
                                        style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                        className="px-2 py-0.5 rounded-md border font-bold text-[11px] inline-block"
                                      >
                                        {session.subject}
                                      </span>
                                    </td>

                                    <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">
                                      <div>{session.className}</div>
                                      <span className="text-[10px] font-semibold text-blue-700">
                                        {session.stream}
                                      </span>
                                    </td>

                                    {[0, 1, 2, 3, 4, 5, 6].map(roomIndex => {
                                      const assignmentKey = `${session.id}_room${roomIndex}`;
                                      const isRequired = roomIndex < session.rooms;
                                      const assignedId = invigilationAssignments[assignmentKey];
                                      const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                      const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                      return (
                                        <td
                                          key={roomIndex}
                                          className="p-2 border-r border-slate-200 text-center align-middle"
                                        >
                                          {isRequired ? (
                                            <div
                                              onClick={() => setAssignModalData({
                                                session,
                                                roomIndex,
                                                currentTeacherId: assignedId
                                              })}
                                              className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                                assignedTeacher
                                                  ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:bg-blue-100/50'
                                                  : 'bg-amber-50/70 border-dashed border-amber-300 hover:bg-amber-100'
                                              }`}
                                            >
                                              {assignedTeacher ? (
                                                <div className="flex items-center justify-center gap-1.5" title={assignedTeacher.name}>
                                                  <span
                                                    style={{ backgroundColor: assignedTeacher.color || tCol?.hex, color: '#ffffff' }}
                                                    className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-[10px] shadow-2xs"
                                                  >
                                                    {assignedTeacher.initial}
                                                  </span>
                                                  <span className="font-bold text-slate-800 text-[10px] truncate max-w-[65px]">
                                                    {assignedTeacher.name.split(' ')[0]}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[10px] font-bold text-amber-700">
                                                  + Assign
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-slate-300 font-light">—</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VIEW 3: CARD GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classFilteredSessions.map(s => {
                    const subCol = getSubjectColor(s.subject);
                    return (
                      <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                            s.session === 'SESSION I' ? 'bg-blue-100 text-blue-900' :
                            s.session === 'SESSION II' ? 'bg-indigo-100 text-indigo-900' :
                            'bg-purple-100 text-purple-900'
                          }`}>
                            {s.session}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-600">{s.time}</span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.day} • {s.date}</div>
                          <h4 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                            <span 
                              style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                              className="px-2.5 py-1 rounded-lg border text-xs font-bold"
                            >
                              {s.subject}
                            </span>
                          </h4>
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                          <span>Class/Stream: <strong className="text-blue-700">{s.className} ({s.stream})</strong></span>
                          <span>Rooms: <strong className="text-indigo-700">{s.rooms} Exam Halls</strong></span>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assigned Invigilators (Click to change)</span>
                          <div className="space-y-1">
                            {Array.from({ length: s.rooms }).map((_, r) => {
                              const tid = invigilationAssignments[`${s.id}_room${r}`];
                              const tObj = teachers.find(t => t.id === tid);
                              return (
                                <div
                                  key={r}
                                  onClick={() => setAssignModalData({ session: s, roomIndex: r, currentTeacherId: tid })}
                                  className="text-xs font-semibold text-slate-700 flex items-center justify-between bg-slate-50/60 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  <span>Room {r + 1}:</span>
                                  <span className={tObj ? 'text-indigo-700 font-bold' : 'text-amber-600 italic'}>
                                    {tObj ? tObj.name : '+ Assign Invigilator'}
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
              )}
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* TAB 6: TEACHER INVIGILATION TIMETABLE                    */}
      {/* ======================================================== */}
      {(activeTab === 'teacher' || activeTab === 'personal') && (() => {
        const isAllTeachersSelected = selectedTeacherForPersonal === 0;
        const currentT = isAllTeachersSelected
          ? undefined
          : teachers.find(t => t.id === selectedTeacherForPersonal) || teachers[0];

        const isSupervisor = currentT
          ? supervisors.some(s =>
              Number(s.teacherId) === Number(currentT.id) ||
              (s.name && currentT.name && s.name.toLowerCase().includes(currentT.name.toLowerCase()))
            )
          : false;

        // Collect all duties for the selected teacher (or all assigned duties if All Teachers selected)
        const duties: { session: InvigilationSession; room: number; roomIndex: number; teacher?: Teacher }[] = [];
        const teacherSessionsList: InvigilationSession[] = [];

        normalizedSessions.forEach(sess => {
          let hasTeacherInSession = false;
          for (let r = 0; r < sess.rooms; r++) {
            const key = `${sess.id}_room${r}`;
            const assignedId = invigilationAssignments[key];
            if (isAllTeachersSelected) {
              if (assignedId) {
                const tObj = teachers.find(t => t.id === assignedId);
                duties.push({ session: sess, room: r + 1, roomIndex: r, teacher: tObj });
              }
              hasTeacherInSession = true;
            } else if (currentT && Number(assignedId) === Number(currentT.id)) {
              duties.push({ session: sess, room: r + 1, roomIndex: r, teacher: currentT });
              hasTeacherInSession = true;
            }
          }
          if (hasTeacherInSession || !onlyTeachersWithDuties) {
            if (isAllTeachersSelected || hasTeacherInSession) {
              teacherSessionsList.push(sess);
            }
          }
        });

        // Sessions to display in Matrix / Master / Card views:
        // When a specific teacher is selected, by default show sessions where that teacher is assigned (or all sessions if toggle is enabled)
        const displaySessions = onlyTeachersWithDuties
          ? normalizedSessions
          : teacherSessionsList;

        // Group displaySessions by date for Examination Hall Matrix & Matrix Master Table
        const teacherSessionsByDate: Record<string, InvigilationSession[]> = {};
        displaySessions.forEach(s => {
          const key = `${s.rawDate}__${s.day}__${s.date}`;
          if (!teacherSessionsByDate[key]) teacherSessionsByDate[key] = [];
          teacherSessionsByDate[key].push(s);
        });

        const morningDuties = duties.filter(d => d.session.session === 'SESSION I').length;
        const afternoonDuties = duties.filter(d => d.session.session === 'SESSION II').length;
        const eveningDuties = duties.filter(d => d.session.session === 'SESSION III').length;
        const uniqueDatesCount = new Set(duties.map(d => d.session.rawDate)).size;

        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    Teacher Invigilation Timetable ({isAllTeachersSelected ? 'All Teachers / Walimu Wote' : currentT?.name})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ratiba ya usimamizi wa mitihani ({activeExamTitle}) — Chagua Examination Hall Matrix, Matrix Master Table, au Card View
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Teacher Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Mwalimu (Teacher):</label>
                  <select
                    value={selectedTeacherForPersonal}
                    onChange={e => setSelectedTeacherForPersonal(Number(e.target.value))}
                    className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white shadow-2xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>👥 Walimu Wote (All Teachers Matrix)</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.initial || '--'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scope Filter when single teacher is selected */}
                {!isAllTeachersSelected && (
                  <button
                    type="button"
                    onClick={() => setOnlyTeachersWithDuties(prev => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      onlyTeachersWithDuties
                        ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    }`}
                    title="Badilisha kati ya kuonyesha vipindi vya mwalimu huyu pekee au vipindi vyote vya mtihani"
                  >
                    {onlyTeachersWithDuties ? '📅 Vipindi Vyote vya Mtihani' : '🎯 Vipindi vya Mwalimu Huyu Pekee'}
                  </button>
                )}

                {/* View Mode Toggle: Examination Hall Matrix, Matrix Master Table, Card View */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase">View:</span>
                  <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setTeacherViewMode('matrix')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        teacherViewMode === 'matrix' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Examination Hall Matrix</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeacherViewMode('master')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        teacherViewMode === 'master' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Matrix Master Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeacherViewMode('cards')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                        teacherViewMode === 'cards' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Card View</span>
                    </button>
                  </div>
                </div>

                {/* Export PDF / Excel / Print Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAllTeachersSelected || !currentT) {
                        exportInvigilationPDF({
                          schoolName: schoolInfo.name,
                          sessions: normalizedSessions,
                          teachers,
                          invigilationAssignments,
                          schoolInfo,
                          examTitle: `${activeExamTitle} — RATIBA YA WALIMU WOTE`,
                          mode: 'download'
                        });
                        return;
                      }
                      exportTeacherInvigilationPDF({
                        schoolName: schoolInfo.name,
                        teacher: currentT,
                        sessions: normalizedSessions,
                        invigilationAssignments,
                        schoolInfo,
                        examTitle: activeExamTitle,
                        mode: 'download'
                      });
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Pakua Ratiba ya Mwalimu kama PDF ya A4"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Pakua PDF</span>
                  </button>

                  {!isAllTeachersSelected && currentT && (
                    <button
                      type="button"
                      onClick={() => {
                        exportTeacherInvigilationExcel({
                          schoolName: schoolInfo.name,
                          teacher: currentT,
                          sessions: normalizedSessions,
                          invigilationAssignments,
                          schoolInfo
                        });
                      }}
                      className="px-3.5 py-2 text-xs font-bold bg-white text-emerald-800 border border-emerald-300 rounded-xl hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Pakua Ratiba Binafsi ya Mwalimu kama Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Excel</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isAllTeachersSelected || !currentT) {
                        exportInvigilationPDF({
                          schoolName: schoolInfo.name,
                          sessions: normalizedSessions,
                          teachers,
                          invigilationAssignments,
                          schoolInfo,
                          examTitle: `${activeExamTitle} — RATIBA YA WALIMU WOTE`,
                          mode: 'print'
                        });
                        return;
                      }
                      exportTeacherInvigilationPDF({
                        schoolName: schoolInfo.name,
                        teacher: currentT,
                        sessions: normalizedSessions,
                        invigilationAssignments,
                        schoolInfo,
                        examTitle: activeExamTitle,
                        mode: 'print'
                      });
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Chapisha PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Supervisor Banner & Summary Metrics */}
            <div className="space-y-6">
              {isSupervisor && currentT && (
                <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-amber-400/50 shadow-md space-y-2 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black shrink-0 shadow-sm">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-amber-300 uppercase tracking-tight">
                            🛡️ WEWE NI MSIMAMIZI MKUU (CENTER EXAM SUPERVISOR)
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                            OFFICIAL SUPERVISOR
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium mt-0.5">
                          Mwalimu <strong className="text-white">{currentT.name}</strong>, umesajiliwa na kupangiwa kama Msimamizi Mkuu wa Mitihani katika kituo hiki cha mtihani. Unawajibika kusimamia uendeshaji mzima wa mitihani, ufunguzi wa bahasha na kuongoza wasimamizi wote wa vyumba.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-center shadow-2xs">
                  <div className="text-2xl font-black text-[#1d4182]">{duties.length}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Total Duty Slots</div>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center shadow-2xs">
                  <div className="text-2xl font-black text-[#065f46]">{morningDuties}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Session I (Morning)</div>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-center shadow-2xs">
                  <div className="text-2xl font-black text-[#92400e]">{afternoonDuties}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Session II (Afternoon)</div>
                </div>

                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl text-center shadow-2xs">
                  <div className="text-2xl font-black text-[#5b21b6]">{eveningDuties}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Session III (Evening)</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-2xs">
                  <div className="text-2xl font-black text-slate-700">{uniqueDatesCount}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Exam Days Active</div>
                </div>
              </div>

              <div id="personal-invig-print" className="space-y-6">
                {displaySessions.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="text-slate-600 font-bold text-sm">
                      {isAllTeachersSelected
                        ? 'Hakuna vipindi vya mtihani vilivyopangwa bado.'
                        : `Mwalimu ${currentT?.name} hajapangiwa chumba chochote cha kusimamia mtihani huu bado.`}
                    </div>
                    {!isAllTeachersSelected && (
                      <button
                        type="button"
                        onClick={() => setOnlyTeachersWithDuties(true)}
                        className="px-4 py-2 text-xs font-bold bg-[#1f4d8b] text-white rounded-xl hover:bg-blue-800 cursor-pointer shadow-xs"
                      >
                        Onyesha Vipindi Vyote vya Mtihani ili Umpangie Chumba
                      </button>
                    )}
                  </div>
                ) : teacherViewMode === 'master' ? (
                  /* ================================================================== */
                  /* VIEW 1: MATRIX MASTER TABLE (UNIFIED MASTER TABLE WITH HALL MATRIX)*/
                  /* ================================================================== */
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="bg-[#0f2948] p-4 text-white flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                          Teacher Matrix Master Table — {isAllTeachersSelected ? 'All Teachers' : `${currentT?.name} (${currentT?.initial})`} ({activeExamTitle})
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">
                          Jedwali kuu la usimamizi wa mitihani likionyesha chumba cha mwalimu pamoja na Matrix ya Vyumba vyote (Room 1 – Room 7)
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-white/15 text-amber-300 text-xs font-black">
                        {duties.length} Zamu za Usimamizi • {displaySessions.length} Vipindi
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-[10px] text-slate-700 font-black uppercase tracking-wider">
                            <th className="p-3 border-r border-slate-200 w-36">Tarehe & Siku</th>
                            <th className="p-3 border-r border-slate-200 w-28">Kipindi & Muda</th>
                            <th className="p-3 border-r border-slate-200 w-44">Somo & Darasa</th>
                            {!isAllTeachersSelected && (
                              <th className="p-3 border-r border-slate-200 text-center w-32 bg-amber-50 text-amber-950">
                                Chumba cha {currentT?.initial || 'Mwalimu'}
                              </th>
                            )}
                            {[1, 2, 3, 4, 5, 6, 7].map(r => (
                              <th key={r} className="p-3 border-r border-slate-200 text-center min-w-[95px]">
                                Room {r}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(teacherSessionsByDate).map(([dateKey, daySessions]) => {
                            const [_rawDate, dayName, formattedDate] = dateKey.split('__');
                            const dayTheme = getDayTheme(dayName, dayThemes);

                            return daySessions.map((session, sIdx) => {
                              const subCol = getSubjectColor(session.subject);
                              // Find rooms assigned to selected teacher in this session
                              const myRooms: number[] = [];
                              if (!isAllTeachersSelected && currentT) {
                                for (let r = 0; r < session.rooms; r++) {
                                  if (Number(invigilationAssignments[`${session.id}_room${r}`]) === Number(currentT.id)) {
                                    myRooms.push(r + 1);
                                  }
                                }
                              }

                              return (
                                <tr key={session.id} className={`border-b border-slate-100 hover:bg-slate-50/80 ${sIdx === 0 ? 'border-t-2 border-t-slate-200' : ''}`}>
                                  {sIdx === 0 && (
                                    <td
                                      rowSpan={daySessions.length}
                                      className="p-3 border-r border-slate-200 font-black text-slate-900 bg-slate-50/60 align-top"
                                      style={{ borderLeft: `4px solid ${dayTheme.border}` }}
                                    >
                                      <div className="text-xs uppercase">{dayName}</div>
                                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{formattedDate}</div>
                                    </td>
                                  )}
                                  <td className="p-3 border-r border-slate-200">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                      session.session === 'SESSION I'
                                        ? 'bg-blue-100 text-blue-900 border-blue-200'
                                        : session.session === 'SESSION II'
                                        ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                                        : 'bg-purple-100 text-purple-900 border-purple-200'
                                    }`}>
                                      {session.session}
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-1 font-mono font-bold">
                                      {session.start} - {session.end}
                                    </div>
                                  </td>
                                  <td className="p-3 border-r border-slate-200">
                                    <span
                                      style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                      className="px-2 py-0.5 rounded-md border font-black text-[11px] inline-block mb-1"
                                    >
                                      {session.subject}
                                    </span>
                                    <div className="text-[10px] font-bold text-slate-600">
                                      {session.className} • {session.stream}
                                    </div>
                                  </td>
                                  {!isAllTeachersSelected && (
                                    <td className="p-2 border-r border-slate-200 text-center bg-amber-50/30">
                                      {myRooms.length > 0 ? (
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                          {myRooms.map(rm => (
                                            <span
                                              key={rm}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[11px] shadow-2xs"
                                            >
                                              ROOM {rm}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-semibold text-slate-400">Hajapangiwa</span>
                                      )}
                                    </td>
                                  )}
                                  {[0, 1, 2, 3, 4, 5, 6].map(roomIndex => {
                                    const isRequired = roomIndex < session.rooms;
                                    const assignmentKey = `${session.id}_room${roomIndex}`;
                                    const assignedId = invigilationAssignments[assignmentKey];
                                    const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                    const isSelectedTeacherRoom = !isAllTeachersSelected && currentT && Number(assignedId) === Number(currentT.id);
                                    const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                    return (
                                      <td key={roomIndex} className="p-1.5 border-r border-slate-200 text-center">
                                        {isRequired ? (
                                          <div
                                            onClick={() => setAssignModalData({ session, roomIndex, currentTeacherId: assignedId })}
                                            className={`p-1.5 rounded-lg border text-[10px] cursor-pointer min-h-[46px] flex flex-col justify-center items-center transition-all ${
                                              isSelectedTeacherRoom
                                                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-amber-400 shadow-sm'
                                                : assignedTeacher
                                                ? 'bg-blue-50/70 border-blue-200 hover:bg-blue-100'
                                                : 'bg-amber-50/60 border-dashed border-amber-300 hover:bg-amber-100'
                                            }`}
                                            title={assignedTeacher ? `Msimamizi: ${assignedTeacher.name} (Bofya kubadilisha)` : 'Bofya kupanga msimamizi'}
                                          >
                                            {assignedTeacher ? (
                                              <>
                                                <span
                                                  className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white mb-0.5 shadow-2xs"
                                                  style={{
                                                    backgroundColor: isSelectedTeacherRoom
                                                      ? '#f59e0b'
                                                      : assignedTeacher.color || tCol?.hex || '#1e40af',
                                                    color: isSelectedTeacherRoom ? '#0f172a' : '#ffffff'
                                                  }}
                                                >
                                                  {assignedTeacher.initial}
                                                </span>
                                                <span className={`font-black leading-none truncate max-w-[82px] ${isSelectedTeacherRoom ? 'text-white' : 'text-slate-800'}`}>
                                                  {assignedTeacher.name.split(' ')[0]}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="font-bold text-amber-700">+ Assign</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : teacherViewMode === 'matrix' ? (
                  /* ================================================================== */
                  /* VIEW 2: EXAMINATION HALL MATRIX (GROUPED BY DAY WITH ROOM COLUMNS) */
                  /* ================================================================== */
                  <div className="space-y-6">
                    {Object.entries(teacherSessionsByDate).map(([dateKey, daySessions], dayIdx) => {
                      const [_rawDate, dayName, formattedDate] = dateKey.split('__');
                      const dayTheme = getDayTheme(dayName, dayThemes);
                      const supervisor = supervisors[dayIdx % Math.max(supervisors.length, 1)];

                      return (
                        <div
                          key={dateKey}
                          style={{ borderColor: dayTheme.border }}
                          className="bg-white border rounded-2xl shadow-xs overflow-hidden"
                        >
                          <div
                            style={{ backgroundColor: dayTheme.headerBg }}
                            className="px-5 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="p-1.5 rounded-lg bg-white/20 text-white">
                                <Calendar className="w-4 h-4" />
                              </span>
                              <div>
                                <div className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
                                  <span>{dayName}</span>
                                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-bold">
                                    {formattedDate}
                                  </span>
                                </div>
                                <span className="text-[11px] text-white/80 font-medium">
                                  {isAllTeachersSelected ? 'Walimu Wote' : currentT?.name} • {daySessions.length} Kipindi / Masomo
                                </span>
                              </div>
                            </div>

                            <div className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                              <span>SUPERVISOR:</span>
                              <strong className="text-white">
                                {supervisor ? `${supervisor.name} (${supervisor.initial})` : 'To Be Appointed'}
                              </strong>
                            </div>
                          </div>

                          <div className="overflow-x-auto p-4">
                            <table className="w-full text-left border-collapse text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                              <thead>
                                <tr className="bg-[#0f2948] text-white font-bold uppercase text-[11px] tracking-wider">
                                  <th className="p-2.5 border-r border-slate-700 w-32">Session Slot</th>
                                  <th className="p-2.5 border-r border-slate-700 w-28">Time</th>
                                  <th className="p-2.5 border-r border-slate-700">Exam Subject</th>
                                  <th className="p-2.5 border-r border-slate-700 w-36">Class & Stream</th>
                                  {[1, 2, 3, 4, 5, 6, 7].map(r => (
                                    <th key={r} className="p-2.5 border-r border-slate-700 text-center min-w-[95px]">
                                      Room {r}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {daySessions.map(session => {
                                  const subCol = getSubjectColor(session.subject);
                                  return (
                                    <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                      <td className="p-2.5 border-r border-slate-200 font-bold">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                          session.session === 'SESSION I'
                                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                            : session.session === 'SESSION II'
                                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                                        }`}>
                                          {session.session}
                                        </span>
                                      </td>

                                      <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                                        {session.start} - {session.end}
                                      </td>

                                      <td className="p-2.5 border-r border-slate-200">
                                        <span
                                          style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                          className="px-2 py-0.5 rounded-md border font-bold text-[11px] inline-block"
                                        >
                                          {session.subject}
                                        </span>
                                      </td>

                                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">
                                        <div>{session.className}</div>
                                        <span className="text-[10px] font-semibold text-blue-700">
                                          {session.stream}
                                        </span>
                                      </td>

                                      {[0, 1, 2, 3, 4, 5, 6].map(roomIndex => {
                                        const assignmentKey = `${session.id}_room${roomIndex}`;
                                        const isRequired = roomIndex < session.rooms;
                                        const assignedId = invigilationAssignments[assignmentKey];
                                        const assignedTeacher = assignedId ? teachers.find(t => t.id === assignedId) : undefined;
                                        const isSelectedTeacherRoom = !isAllTeachersSelected && currentT && Number(assignedId) === Number(currentT.id);
                                        const tCol = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                                        return (
                                          <td
                                            key={roomIndex}
                                            className="p-2 border-r border-slate-200 text-center align-middle"
                                          >
                                            {isRequired ? (
                                              <div
                                                onClick={() => setAssignModalData({
                                                  session,
                                                  roomIndex,
                                                  currentTeacherId: assignedId
                                                })}
                                                className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                                  isSelectedTeacherRoom
                                                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-amber-400 shadow-sm'
                                                    : assignedTeacher
                                                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:bg-blue-100/50'
                                                    : 'bg-amber-50/70 border-dashed border-amber-300 hover:bg-amber-100'
                                                }`}
                                              >
                                                {assignedTeacher ? (
                                                  <div className="flex items-center justify-center gap-1.5" title={assignedTeacher.name}>
                                                    <span
                                                      style={{
                                                        backgroundColor: isSelectedTeacherRoom
                                                          ? '#f59e0b'
                                                          : assignedTeacher.color || tCol?.hex,
                                                        color: isSelectedTeacherRoom ? '#0f172a' : '#ffffff'
                                                      }}
                                                      className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-[10px] shadow-2xs"
                                                    >
                                                      {assignedTeacher.initial}
                                                    </span>
                                                    <span className={`font-bold text-[10px] truncate max-w-[65px] ${isSelectedTeacherRoom ? 'text-white font-black' : 'text-slate-800'}`}>
                                                      {assignedTeacher.name.split(' ')[0]}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-[10px] font-bold text-amber-700">
                                                    + Assign
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-slate-300 font-light">—</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ================================================================== */
                  /* VIEW 3: CARD VIEW (MODERN VISUAL INVIGILATION DUTY CARDS)          */
                  /* ================================================================== */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displaySessions.map(s => {
                      const subCol = getSubjectColor(s.subject);
                      const teacherRoomsInSession: number[] = [];
                      if (!isAllTeachersSelected && currentT) {
                        for (let r = 0; r < s.rooms; r++) {
                          if (Number(invigilationAssignments[`${s.id}_room${r}`]) === Number(currentT.id)) {
                            teacherRoomsInSession.push(r + 1);
                          }
                        }
                      }

                      return (
                        <div
                          key={s.id}
                          className={`bg-white border rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-all ${
                            teacherRoomsInSession.length > 0
                              ? 'border-emerald-400 ring-1 ring-emerald-200'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                              s.session === 'SESSION I' ? 'bg-blue-100 text-blue-900' :
                              s.session === 'SESSION II' ? 'bg-indigo-100 text-indigo-900' :
                              'bg-purple-100 text-purple-900'
                            }`}>
                              {s.session}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-600">{s.time || `${s.start} - ${s.end}`}</span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.day} • {s.date}</div>
                              <h4 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                                <span
                                  style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                  className="px-2.5 py-1 rounded-lg border text-xs font-bold"
                                >
                                  {s.subject}
                                </span>
                              </h4>
                            </div>

                            {teacherRoomsInSession.length > 0 && (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black shadow-xs shrink-0">
                                {teacherRoomsInSession.map(rm => `ROOM ${rm}`).join(', ')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                            <span>Class/Stream: <strong className="text-blue-700">{s.className} ({s.stream})</strong></span>
                            <span>Rooms: <strong className="text-indigo-700">{s.rooms} Exam Halls</strong></span>
                          </div>

                          <div className="space-y-1 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                              Assigned Invigilators (Click room to change)
                            </span>
                            <div className="space-y-1">
                              {Array.from({ length: s.rooms }).map((_, r) => {
                                const tid = invigilationAssignments[`${s.id}_room${r}`];
                                const tObj = teachers.find(t => t.id === tid);
                                const isMyRoom = !isAllTeachersSelected && currentT && Number(tid) === Number(currentT.id);
                                return (
                                  <div
                                    key={r}
                                    onClick={() => setAssignModalData({ session: s, roomIndex: r, currentTeacherId: tid })}
                                    className={`text-xs font-semibold flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                      isMyRoom
                                        ? 'bg-emerald-600 text-white font-black shadow-2xs'
                                        : 'text-slate-700 bg-slate-50/60 hover:bg-blue-50'
                                    }`}
                                  >
                                    <span>Room {r + 1}:</span>
                                    <span className={isMyRoom ? 'text-amber-300 font-black' : tObj ? 'text-indigo-700 font-bold' : 'text-amber-600 italic'}>
                                      {tObj ? `${tObj.name} (${tObj.initial})` : '+ Assign Invigilator'}
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
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* MODAL: ASSIGN INVIGILATOR                                */}
      {/* ======================================================== */}
      {assignModalData && (
        <AssignInvigilatorModal
          session={assignModalData.session}
          roomIndex={assignModalData.roomIndex}
          currentTeacherId={assignModalData.currentTeacherId}
          teachers={teachers}
          selectedInvigilators={selectedInvigilators}
          allAssignments={invigilationAssignments}
          allSessions={normalizedSessions}
          onAssign={(teacherId) => {
            const key = `${assignModalData.session.id}_room${assignModalData.roomIndex}`;
            onUpdateInvigilationAssignments({
              ...invigilationAssignments,
              [key]: teacherId
            });
          }}
          onClear={() => {
            const key = `${assignModalData.session.id}_room${assignModalData.roomIndex}`;
            const copy = { ...invigilationAssignments };
            delete copy[key];
            onUpdateInvigilationAssignments(copy);
          }}
          onClose={() => setAssignModalData(null)}
        />
      )}

      {/* ======================================================== */}
      {/* TAB: SAVED INVIGILATION TIMETABLES                       */}
      {/* ======================================================== */}
      {activeTab === 'saved' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#1f4d8b]">Saved Examination Invigilation Timetables</h3>
              <p className="text-xs text-slate-500">
                Access, load, or delete your previously saved exam invigilation schedules (MIDTERM, TERMINAL, ANNUAL).
              </p>
            </div>
            <button
              onClick={() => {
                setSnapshotTitle(`Exam Invigilation Timetable - ${new Date().toLocaleDateString()}`);
                setSaveModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Current Timetable
            </button>
          </div>

          {(!savedInvigilationRecords || savedInvigilationRecords.length === 0) ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Saved Invigilation Timetables Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Create and configure your exam sessions and room assignments in the Master Tab, then click "Save Snapshot" to store different exam timetables (MIDTERM, TERMINAL, ANNUAL) securely here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedInvigilationRecords.map(rec => (
                <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-800 line-clamp-1">{rec.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full shrink-0">
                        {rec.createdAt}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5 text-blue-500" /> {rec.sessionsCount || rec.sessions?.length || 0} Sessions</span>
                      <span className="flex items-center gap-1 font-medium"><ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> {rec.supervisorsCount || rec.supervisors?.length || 0} Supervisors</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (confirm(`Load saved timetable "${rec.title}" into active workspace?`)) {
                          onUpdateSessions(rec.sessions || []);
                          onUpdateSupervisors(rec.supervisors || []);
                          if (rec.assignments) {
                            onUpdateInvigilationAssignments(rec.assignments);
                          }
                          setActiveTab('general');
                          alert(`Successfully loaded "${rec.title}".`);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Load Timetable
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete saved timetable "${rec.title}"?`)) {
                          const updated = (savedInvigilationRecords || []).filter(r => r.id !== rec.id);
                          if (onUpdateSavedInvigilationRecords) {
                            onUpdateSavedInvigilationRecords(updated);
                          }
                        }
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                      title="Delete saved timetable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: EXAM CONTROL LOGS & FORMS                           */}
      {/* ======================================================== */}
      {activeTab === 'control_logs' && (
        <ExamControlLogForms
          schoolId={getCurrentSchoolId()}
          teachers={teachers}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          sessions={normalizedSessions}
          invigilationAssignments={invigilationAssignments}
          activeExamTitle={activeExamTitle}
          onChangeExamTitle={setActiveExamTitle}
          initialSubTab={controlInitialSubTab}
          onOpenEnvelopeCoverForm={() => setActiveTab('envelope_cover')}
        />
      )}

      {/* ======================================================== */}
      {/* TAB: SCRIPT RETURN ENVELOPE COVER FORM (NECTA FORMAT)    */}
      {/* ======================================================== */}
      {activeTab === 'envelope_cover' && (
        <ScriptReturnEnvelopeView
          schoolInfo={schoolInfo}
          sessions={normalizedSessions}
          teachers={teachers}
          supervisors={supervisors}
          invigilationAssignments={invigilationAssignments}
          activeExamTitle={activeExamTitle}
          onBack={() => {
            setActiveTab('general');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT EXAMINATION SESSION                    */}
      {/* ======================================================== */}
      {sessionModalOpen && (
        <SessionEditModal
          initialSession={editingSession}
          defaultExamTitle={activeExamTitle}
          onSave={handleSaveSessionData}
          onClose={() => {
            setSessionModalOpen(false);
            setEditingSession(null);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: QUICK BULK EDIT INVIGILATION                      */}
      {/* ======================================================== */}
      {bulkEditModalOpen && (
        <BulkEditInvigilationModal
          sessions={normalizedSessions}
          teachers={teachers}
          assignments={invigilationAssignments}
          selectedInvigilators={selectedInvigilators}
          onSaveAssignments={(updated) => onUpdateInvigilationAssignments(updated)}
          onClose={() => setBulkEditModalOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: SAVE TIMETABLE SNAPSHOT                           */}
      {/* ======================================================== */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Save className="w-5 h-5 text-emerald-600" />
                Save Invigilation Timetable Snapshot
              </h3>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Timetable Title / Exam Type (e.g., MIDTERM / TERMINAL)
                </label>
                <input
                  type="text"
                  value={snapshotTitle}
                  onChange={e => setSnapshotTitle(e.target.value)}
                  placeholder="e.g. Midterm Term 1 Invigilation Timetable"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Saving this snapshot preserves all exam sessions, room allocations, invigilator duty assignments, and supervisors. You can easily switch between Midterm and Terminal timetables anytime from the Saved Timetables tab.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!snapshotTitle.trim()) {
                    alert('Please enter a title.');
                    return;
                  }
                  const newRecord: SavedInvigilationRecord = {
                    id: 'invig_rec_' + Date.now(),
                    title: snapshotTitle.trim(),
                    createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    examTitle: snapshotTitle.trim(),
                    sessionsCount: sessions.length,
                    supervisorsCount: supervisors.length,
                    sessions: JSON.parse(JSON.stringify(sessions)),
                    supervisors: JSON.parse(JSON.stringify(supervisors)),
                    assignments: JSON.parse(JSON.stringify(invigilationAssignments))
                  };
                  const updated = [newRecord, ...(savedInvigilationRecords || [])];
                  if (onUpdateSavedInvigilationRecords) {
                    onUpdateSavedInvigilationRecords(updated);
                  }
                  setSaveModalOpen(false);
                  setActiveTab('saved');
                  alert(`Invigilation timetable "${snapshotTitle}" saved successfully!`);
                }}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Timetable
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      {importModalOpen && (
        <ImportExamTimetableModal
          existingTeachers={teachers}
          onImport={handleImportCSV}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  );
};
