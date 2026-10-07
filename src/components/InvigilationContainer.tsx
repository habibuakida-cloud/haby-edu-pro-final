import React, { useState, useMemo } from 'react';
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
  Zap
} from 'lucide-react';
import { 
  InvigilationSession, 
  Teacher, 
  Supervisor, 
  SchoolInfo 
} from '../types';
import { SUBJECT_LIST, DEFAULT_CLASSES } from '../constants/defaults';
import { getTeacherColor, getSubjectColor, getDayTheme } from '../utils/colors';
import { printFormattedSection, exportInvigilationToCSV } from '../utils/export';
import { AssignInvigilatorModal } from './Invigilation/AssignInvigilatorModal';
import { SessionEditModal, getDayAndFormattedDate, INVIGILATION_ALLOWED_SESSIONS } from './Invigilation/SessionEditModal';
import { BulkEditInvigilationModal } from './Invigilation/BulkEditInvigilationModal';

interface InvigilationContainerProps {
  sessions: InvigilationSession[];
  teachers: Teacher[];
  supervisors: Supervisor[];
  selectedInvigilators: number[];
  invigilationAssignments: Record<string, number>;
  timetableReleased: boolean;
  schoolInfo: SchoolInfo;
  dayThemes?: Record<string, string>;
  onUpdateSessions: (sessions: InvigilationSession[]) => void;
  onUpdateSupervisors: (supervisors: Supervisor[]) => void;
  onUpdateSelectedInvigilators: (ids: number[]) => void;
  onUpdateInvigilationAssignments: (assignments: Record<string, number>) => void;
  onToggleRelease: () => void;
  onNavigateToSittingPlan?: () => void;
}

export const InvigilationContainer: React.FC<InvigilationContainerProps> = ({
  sessions,
  teachers,
  supervisors,
  selectedInvigilators,
  invigilationAssignments,
  timetableReleased,
  schoolInfo,
  dayThemes,
  onUpdateSessions,
  onUpdateSupervisors,
  onUpdateSelectedInvigilators,
  onUpdateInvigilationAssignments,
  onToggleRelease,
  onNavigateToSittingPlan
}) => {
  // Navigation tabs matching TimetableContainer aesthetic
  const [activeTab, setActiveTab] = useState<'general' | 'sessions' | 'invigilators' | 'supervisors' | 'class' | 'personal'>('general');
  
  // Layout view mode for General Timetable: 'cards' (Modern visual cards), 'matrix' (Traditional Exam Hall grid) or 'master' (One large master table)
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'master'>('cards');

  // Filters
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<'ALL' | 'SESSION I' | 'SESSION II' | 'SESSION III'>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Personal schedule selected teacher
  const [selectedTeacherForPersonal, setSelectedTeacherForPersonal] = useState<number>(teachers[0]?.id || 0);

  // Class invigilation selected class
  const [selectedClassForInvig, setSelectedClassForInvig] = useState('Form 1');

  // Modal States
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<InvigilationSession | null>(null);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);

  const [assignModalData, setAssignModalData] = useState<{
    session: InvigilationSession;
    roomIndex: number;
    currentTeacherId?: number;
  } | null>(null);

  // Supervisor state
  const [selectedSupervisorTeacher, setSelectedSupervisorTeacher] = useState<number>(teachers[0]?.id || 0);
  const [assignNotice, setAssignNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Filter available teachers
  const availableTeachers = useMemo(() => teachers.filter(t => !t.excludeInvigilation), [teachers]);
  const activeRoster = useMemo(() => teachers.filter(t => selectedInvigilators.includes(t.id)), [teachers, selectedInvigilators]);
  const effectivePool = activeRoster.length > 0 ? activeRoster : availableTeachers;

  // Normalize existing sessions to ensure session is strictly SESSION I or SESSION II
  const normalizedSessions = useMemo(() => {
    return sessions.map(s => {
      let validSession = s.session;
      if (!INVIGILATION_ALLOWED_SESSIONS.includes(validSession as any)) {
        validSession = /II|2|afternoon/i.test(validSession) ? 'SESSION II' : 'SESSION I';
      }
      return {
        ...s,
        session: validSession
      };
    });
  }, [sessions]);

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
      if (!map.has(s.rawDate)) {
        map.set(s.rawDate, { rawDate: s.rawDate, date: s.date, day: s.day });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
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
      if (selectedClassFilter !== 'ALL' && s.className.toLowerCase() !== selectedClassFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = s.subject.toLowerCase().includes(q);
        const matchClass = s.className.toLowerCase().includes(q);
        const matchStream = s.stream.toLowerCase().includes(q);
        const matchDay = s.day.toLowerCase().includes(q);
        const matchDate = s.date.toLowerCase().includes(q);
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
    if (sessionData.id) {
      // Edit
      const updated = normalizedSessions.map(s => s.id === sessionData.id ? { ...s, ...sessionData } as InvigilationSession : s);
      onUpdateSessions(updated);
    } else {
      // Add
      const newSession: InvigilationSession = {
        ...sessionData,
        id: Date.now()
      };
      onUpdateSessions([...normalizedSessions, newSession]);
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
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'personal' ? 'bg-[#1f4d8b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Personal Duty Slip
        </button>

        {onNavigateToSittingPlan && (
          <button
            onClick={onNavigateToSittingPlan}
            className="ml-auto px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Open Official NECTA Sitting Plan Generator"
          >
            <Grid className="w-4 h-4" />
            NECTA Sitting Plan
          </button>
        )}
      </div>

      {/* 2. SUMMARY METRICS CARDS (Just like Timetable stats) */}
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

      {/* 3. CLASH & CONFLICT ALERT BAR (Just like TimetableContainer) */}
      {conflicts.length > 0 && (
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
                  onClick={() => exportInvigilationToCSV(normalizedSessions, teachers, invigilationAssignments)}
                  className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Export CSV
                </button>

                <button
                  onClick={() => printFormattedSection('general-invig-print', 'Master Examination Invigilation Timetable', schoolInfo.name, { orientation: 'landscape' })}
                  className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF (Landscape)
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

              <button
                onClick={() => {
                  setEditingSession(null);
                  setSessionModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                + Add Examination Session
              </button>
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
                        {t.excludeInvigilation ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Excluded
                          </span>
                        ) : isSelected ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active in Roster
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Standby
                          </span>
                        )}
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
      {activeTab === 'class' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">Class Examination & Invigilation Schedule</h3>
                <p className="text-xs text-slate-500 font-medium">Ratiba ya mtihani na wasimamizi kwa kila darasa na mkondo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Select Class:</label>
                <select
                  value={selectedClassForInvig}
                  onChange={e => setSelectedClassForInvig(e.target.value)}
                  className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white shadow-2xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEFAULT_CLASSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printFormattedSection('class-invig-print', `${selectedClassForInvig} Examination & Invigilation Schedule`, schoolInfo.name)}
                  className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => printFormattedSection('class-invig-print', `${selectedClassForInvig} Examination & Invigilation Schedule`, schoolInfo.name)}
                  className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>

          <div id="class-invig-print" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {normalizedSessions.filter(s => s.className.toLowerCase() === selectedClassForInvig.toLowerCase()).length === 0 ? (
                <div className="col-span-full py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-bold text-sm">No examination sessions scheduled for {selectedClassForInvig}.</p>
                </div>
              ) : (
                normalizedSessions
                  .filter(s => s.className.toLowerCase() === selectedClassForInvig.toLowerCase())
                  .map(s => {
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
                          <span>Stream: <strong className="text-blue-700">{s.stream}</strong></span>
                          <span>Rooms: <strong className="text-indigo-700">{s.rooms} Exam Halls</strong></span>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assigned Invigilators</span>
                          <div className="space-y-1">
                            {Array.from({ length: s.rooms }).map((_, r) => {
                              const tid = invigilationAssignments[`${s.id}_room${r}`];
                              const tObj = teachers.find(t => t.id === tid);
                              return (
                                <div key={r} className="text-xs font-semibold text-slate-700 flex items-center justify-between bg-slate-50/60 px-2.5 py-1.5 rounded-lg">
                                  <span>Room {r + 1}:</span>
                                  <span className={tObj ? 'text-indigo-700 font-bold' : 'text-amber-600 italic'}>
                                    {tObj ? tObj.name : 'Unassigned'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: PERSONAL SCHEDULE & DUTY SLIP                     */}
      {/* ======================================================== */}
      {activeTab === 'personal' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600 uppercase">Select Teacher:</label>
              <select
                value={selectedTeacherForPersonal}
                onChange={e => setSelectedTeacherForPersonal(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.initial})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const t = teachers.find(item => item.id === selectedTeacherForPersonal);
                printFormattedSection('personal-invig-print', `Personal Invigilation Duty Schedule - ${t?.name}`, schoolInfo.name);
              }}
              className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Personal Duty Slip
            </button>
          </div>

          {/* Teacher Summary Metrics */}
          {(() => {
            const currentT = teachers.find(t => t.id === selectedTeacherForPersonal);
            if (!currentT) return null;

            // Find all sessions assigned to this teacher
            const duties: { session: InvigilationSession; room: number }[] = [];
            normalizedSessions.forEach(sess => {
              for (let r = 0; r < sess.rooms; r++) {
                const key = `${sess.id}_room${r}`;
                const assignedId = invigilationAssignments[key];
                if (assignedId === currentT.id) {
                  duties.push({ session: sess, room: r + 1 });
                }
              }
            });

            const morningDuties = duties.filter(d => d.session.session === 'SESSION I').length;
            const afternoonDuties = duties.filter(d => d.session.session === 'SESSION II').length;
            const eveningDuties = duties.filter(d => d.session.session === 'SESSION III').length;
            const uniqueDatesCount = new Set(duties.map(d => d.session.rawDate)).size;

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                    <div className="text-2xl font-black text-[#1d4182]">{duties.length}</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Total Duty Slots</div>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                    <div className="text-2xl font-black text-[#065f46]">{morningDuties}</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Session I (Morning)</div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                    <div className="text-2xl font-black text-[#92400e]">{afternoonDuties}</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Session II (Afternoon)</div>
                  </div>

                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-center">
                    <div className="text-2xl font-black text-[#5b21b6]">{eveningDuties}</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Session III (Evening)</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="text-2xl font-black text-slate-700">{uniqueDatesCount}</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase">Exam Days Active</div>
                  </div>
                </div>

                <div id="personal-invig-print" className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase">
                        <th className="p-3 border-r border-slate-200">Date & Day of Week</th>
                        <th className="p-3 border-r border-slate-200">Session Slot</th>
                        <th className="p-3 border-r border-slate-200">Time Range</th>
                        <th className="p-3 border-r border-slate-200">Exam Subject</th>
                        <th className="p-3 border-r border-slate-200">Class & Stream</th>
                        <th className="p-3 text-center">Assigned Exam Hall / Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duties.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No invigilation sessions assigned to this teacher yet. Click on any room slot in the Master Timetable to assign them.
                          </td>
                        </tr>
                      ) : (
                        duties.map((d, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 border-r border-slate-200 font-bold">
                              <div>{d.session.day}</div>
                              <span className="text-[11px] text-slate-500 font-normal">{d.session.date}</span>
                            </td>
                            <td className="p-3 border-r border-slate-200">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                d.session.session === 'SESSION I'
                                  ? 'bg-blue-100 text-blue-900'
                                  : d.session.session === 'SESSION II'
                                  ? 'bg-indigo-100 text-indigo-900'
                                  : 'bg-purple-100 text-purple-900'
                              }`}>
                                {d.session.session}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-200 font-mono text-slate-600 font-semibold">
                              {d.session.time}
                            </td>
                            <td className="p-3 border-r border-slate-200 font-bold text-blue-900">
                              {d.session.subject}
                            </td>
                            <td className="p-3 border-r border-slate-200">
                              {d.session.className} • {d.session.stream}
                            </td>
                            <td className="p-3 text-center font-black text-blue-800 bg-blue-50/50">
                              ROOM {d.room}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
      {/* MODAL: ADD / EDIT EXAMINATION SESSION                    */}
      {/* ======================================================== */}
      {sessionModalOpen && (
        <SessionEditModal
          initialSession={editingSession}
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
    </div>
  );
};
