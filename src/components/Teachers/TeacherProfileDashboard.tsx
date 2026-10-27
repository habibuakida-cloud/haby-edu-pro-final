import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Calendar,
  Clock,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Plus,
  Edit3,
  Search,
  Filter,
  Building,
  Award,
  Phone,
  Mail,
  Users,
  Sparkles,
  Check,
  X,
  ChevronRight,
  Layers
} from 'lucide-react';
import {
  Teacher,
  TimetableAssignment,
  PeriodSetting,
  InvigilationSession,
  Supervisor,
  SchoolInfo,
  UserAccount,
  StreamSetting
} from '../../types';
import { ClassJournalEntry } from '../Timetable/ClassJournalTab';
import { getCurrentSchoolId } from '../../lib/dbBridge';

interface TeacherProfileDashboardProps {
  teachers: Teacher[];
  timetableAssignments: TimetableAssignment[];
  periodSettings: PeriodSetting[];
  sessions: InvigilationSession[];
  invigilationAssignments: Record<string, number>;
  supervisors?: Supervisor[];
  journalRecords?: Record<string, ClassJournalEntry>;
  onUpdateJournal?: (records: Record<string, ClassJournalEntry>) => void;
  streamSettings?: StreamSetting[];
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  initialTeacherId?: number;
  onNavigateToView?: (view: string) => void;
}

const WEEKDAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7
};

const SWAHILI_WEEKDAYS: Record<string, string> = {
  MONDAY: 'Jumatatu (Monday)',
  TUESDAY: 'Jumanne (Tuesday)',
  WEDNESDAY: 'Jumatano (Wednesday)',
  THURSDAY: 'Alhamisi (Thursday)',
  FRIDAY: 'Ijumaa (Friday)',
  SATURDAY: 'Jumamosi (Saturday)',
  SUNDAY: 'Jumapili (Sunday)'
};

function getTodayWeekdayKey(): string {
  const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ...
  const map: Record<number, string> = {
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
    6: 'SATURDAY',
    0: 'SUNDAY'
  };
  return map[dayIndex] || 'MONDAY';
}

export const TeacherProfileDashboard: React.FC<TeacherProfileDashboardProps> = ({
  teachers = [],
  timetableAssignments = [],
  periodSettings = [],
  sessions = [],
  invigilationAssignments = {},
  supervisors = [],
  journalRecords = {},
  onUpdateJournal,
  schoolInfo,
  currentUser,
  initialTeacherId,
  onNavigateToView
}) => {
  const isTeacherRole = currentUser?.role === 'TEACHER' && !currentUser?.isSuperAdmin;
  const schoolId = getCurrentSchoolId();

  // Determine selected teacher
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(() => {
    if (initialTeacherId) return initialTeacherId;
    if (currentUser?.fullName || currentUser?.email) {
      const match = teachers.find(t => {
        const matchEmail =
          currentUser.email &&
          t.email &&
          t.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
        const matchName =
          currentUser.fullName &&
          t.name &&
          (t.name.toLowerCase().includes(currentUser.fullName.toLowerCase().trim()) ||
            currentUser.fullName.toLowerCase().includes(t.name.toLowerCase().trim()));
        return matchEmail || matchName;
      });
      if (match) return match.id;
    }
    return teachers[0]?.id || 1;
  });

  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    }
  }, [initialTeacherId]);

  const selectedTeacher: Teacher = useMemo(() => {
    return (
      teachers.find(t => Number(t.id) === Number(selectedTeacherId)) ||
      teachers[0] || {
        id: 1,
        name: currentUser?.fullName || 'Mwalimu wa Somo',
        initial: (currentUser?.fullName || 'MS').substring(0, 2).toUpperCase(),
        email: currentUser?.email || '',
        phone: '',
        subjects: currentUser?.assignedSubjects || ['Mathematics'],
        excludeInvigilation: false,
        schoolRole: 'Subject Teacher',
        gender: 'Male',
        teachingStreams: [],
        passportPhoto: undefined,
        fingerprintEnrolled: false
      }
    );
  }, [teachers, selectedTeacherId, currentUser]);

  // Active sub-panel focus ('all' shows the unified 3-column/stacked dashboard, or user can focus a specific section)
  const [activeSection, setActiveSection] = useState<'overview' | 'lessons' | 'invigilation' | 'journal'>('overview');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [journalSearch, setJournalSearch] = useState<string>('');
  const [journalStatusFilter, setJournalStatusFilter] = useState<string>('ALL');

  // Quick Journal Entry Modal State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<Partial<ClassJournalEntry>>({
    className: selectedTeacher?.teachingStreams?.[0]?.split(/[-–—/]/)[0]?.trim() || 'Form 3',
    stream: 'A',
    week: 'Wiki ya 1',
    day: 'Monday',
    periodNumber: 1,
    periodName: 'Period 1',
    timeRange: '08:00 - 08:40',
    scheduledSubject: selectedTeacher?.subjects?.[0] || 'Mathematics',
    status: 'TAUGHT',
    topicTaught: '',
    studentsPresent: 42,
    totalStudentsInClass: 45,
    teacherRemarks: ''
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load any local journal entries if journalRecords prop is empty
  const mergedJournalRecords = useMemo(() => {
    const combined: Record<string, ClassJournalEntry> = { ...journalRecords };
    try {
      const localRaw = localStorage.getItem(`haby_class_journal_${schoolId}`);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        Object.assign(combined, parsed);
      }
    } catch {}
    return combined;
  }, [journalRecords, schoolId]);

  // Helper to check if a timetable slot belongs to selectedTeacher
  const doesLessonBelongToTeacher = (assignment: TimetableAssignment, teacher: Teacher): boolean => {
    if (!assignment || !teacher) return false;
    if (assignment.teacherId !== undefined && Number(assignment.teacherId) === Number(teacher.id)) return true;
    const rawTeacher = String((assignment as any).teacher || assignment.teacherName || '').toLowerCase().trim();
    const tName = (teacher.name || '').toLowerCase().trim();
    const tInitial = (teacher.initial || '').toLowerCase().trim();
    if (!rawTeacher) return false;
    if (tName && (rawTeacher === tName || rawTeacher.includes(tName) || tName.includes(rawTeacher))) return true;
    if (tInitial && rawTeacher === tInitial) return true;
    return false;
  };

  // ---------------------------------------------------------------------------
  // 1. UPCOMING LESSONS FOR SELECTED TEACHER
  // ---------------------------------------------------------------------------
  const todayWeekday = getTodayWeekdayKey();

  const teacherLessons = useMemo(() => {
    if (!selectedTeacher) return [];

    const matched = timetableAssignments.filter(a => doesLessonBelongToTeacher(a, selectedTeacher));

    const enriched = matched.map((a, index) => {
      const rawDay = String(a.day || 'MONDAY').toUpperCase().trim();
      const rawPeriod = String(a.period || a.periodName || (a as any).periodId || '1');
      const numMatch = rawPeriod.match(/(\d+)/);
      const periodNumber = (a as any).period_number || (numMatch ? parseInt(numMatch[1], 10) : index + 1);

      const matchedSetting = periodSettings.find(
        p =>
          String(p.id) === String((a as any).periodId) ||
          Number((p as any).number) === periodNumber ||
          (p.name && p.name.toLowerCase().includes(`period ${periodNumber}`))
      );

      const startTime = matchedSetting?.start || (matchedSetting as any)?.startTime || `${String(7 + periodNumber).padStart(2, '0')}:20`;
      const endTime = matchedSetting?.end || (matchedSetting as any)?.endTime || `${String(8 + periodNumber).padStart(2, '0')}:00`;
      const periodLabel = matchedSetting?.name || `Period ${periodNumber}`;
      const className = a.className || (a as any).class_name || (a as any).form || 'Form 3';
      const stream = a.stream || 'A';
      const subject = a.subject || selectedTeacher.subjects?.[0] || 'Somo';

      // Calculate upcoming priority relative to today
      const todayRank = WEEKDAY_ORDER[todayWeekday] || 1;
      const slotRank = WEEKDAY_ORDER[rawDay] || 1;
      const daysAhead = slotRank >= todayRank ? slotRank - todayRank : 7 - todayRank + slotRank;

      // Check if there is a journal entry for this class/subject/day/period
      const journalMatch = (Object.values(mergedJournalRecords) as ClassJournalEntry[]).find(
        j =>
          j.className.toLowerCase() === className.toLowerCase() &&
          j.day.toUpperCase() === rawDay &&
          (Number(j.periodNumber) === Number(periodNumber) ||
            j.scheduledSubject.toLowerCase() === subject.toLowerCase())
      );

      return {
        id: `${rawDay}_${periodNumber}_${className}_${stream}_${index}`,
        dayKey: rawDay,
        dayLabel: SWAHILI_WEEKDAYS[rawDay] || rawDay,
        periodNumber,
        periodLabel,
        startTime,
        endTime,
        timeRange: `${startTime} - ${endTime}`,
        className,
        stream,
        subject,
        isToday: rawDay === todayWeekday,
        daysAhead,
        journalEntry: journalMatch
      };
    });

    return enriched.sort((a, b) => {
      if (a.daysAhead !== b.daysAhead) return a.daysAhead - b.daysAhead;
      return a.periodNumber - b.periodNumber;
    });
  }, [selectedTeacher, timetableAssignments, periodSettings, todayWeekday, mergedJournalRecords]);

  const filteredLessons = useMemo(() => {
    if (selectedDayFilter === 'ALL') return teacherLessons;
    if (selectedDayFilter === 'TODAY') return teacherLessons.filter(l => l.isToday);
    return teacherLessons.filter(l => l.dayKey === selectedDayFilter);
  }, [teacherLessons, selectedDayFilter]);

  const todaysLessonsCount = useMemo(() => teacherLessons.filter(l => l.isToday).length, [teacherLessons]);

  // ---------------------------------------------------------------------------
  // 2. ASSIGNED INVIGILATION SESSIONS FOR SELECTED TEACHER
  // ---------------------------------------------------------------------------
  const teacherInvigilationDuties = useMemo(() => {
    if (!selectedTeacher) return [];

    // Check dispatch records in localStorage to show paper collection/return status
    let dispatchList: any[] = [];
    try {
      const savedDisp = localStorage.getItem(`haby_exam_dispatch_${schoolId}`);
      if (savedDisp) dispatchList = JSON.parse(savedDisp);
    } catch {}

    const duties: {
      id: string;
      sessionId: string;
      examTitle: string;
      date: string;
      sessionName: string;
      subject: string;
      className: string;
      stream?: string;
      roomNumber: number;
      roomLabel: string;
      role: 'INVIGILATOR' | 'SUPERVISOR';
      isTaken?: boolean;
      isReturned?: boolean;
    }[] = [];

    sessions.forEach(sess => {
      const totalRooms = Math.max(1, Number(sess.rooms) || 1);
      for (let r = 0; r < totalRooms; r++) {
        const assignedTid = invigilationAssignments[`${sess.id}_room${r}`];
        if (Number(assignedTid) === Number(selectedTeacher.id)) {
          const examTitle = sess.examTitle || 'Pre-National Examination 2026';
          const matchingDispatch = dispatchList.find(
            d =>
              d.subject?.toLowerCase() === sess.subject?.toLowerCase() &&
              d.className?.toLowerCase() === sess.className?.toLowerCase() &&
              (d.invigilatorName?.toLowerCase().includes(selectedTeacher.name.toLowerCase()) ||
                d.roomVenue?.includes(`Room ${r + 1}`))
          );

          duties.push({
            id: `${sess.id}_room_${r}`,
            sessionId: String(sess.id),
            examTitle,
            date: sess.date || sess.rawDate || 'Tarehe ya Mtihani',
            sessionName: sess.time || 'SESSION I (08:00 - 11:00)',
            subject: sess.subject,
            className: sess.className,
            stream: sess.stream,
            roomNumber: r + 1,
            roomLabel: `Room ${r + 1}`,
            role: 'INVIGILATOR',
            isTaken: matchingDispatch?.isTaken,
            isReturned: matchingDispatch?.isReturned
          });
        }
      }
    });

    // Also include Supervisor assignments if this teacher is a supervisor
    supervisors.forEach((sup, idx) => {
      const isMatch =
        Number(sup.teacherId) === Number(selectedTeacher.id) ||
        (sup.name &&
          selectedTeacher.name &&
          sup.name.toLowerCase().trim() === selectedTeacher.name.toLowerCase().trim());

      if (isMatch) {
        duties.push({
          id: `sup_${sup.id || idx}`,
          sessionId: String(sup.id || idx),
          examTitle: 'Simamizi Mkuu wa Mitihani (Supervisor)',
          date: (sup as any).date || 'Ratiba ya Mtihani',
          sessionName: (sup as any).time || 'Muda wa Mtihani',
          subject: 'Ukaguzi wa Ukumbi & Wasimamizi',
          className: (sup as any).hall || 'Examination Hall',
          roomNumber: 0,
          roomLabel: (sup as any).hall || 'Main Hall',
          role: 'SUPERVISOR'
        });
      }
    });

    return duties;
  }, [selectedTeacher, sessions, invigilationAssignments, supervisors, schoolId]);

  // ---------------------------------------------------------------------------
  // 3. TEACHER'S OWN TEACHING JOURNAL ENTRIES
  // ---------------------------------------------------------------------------
  const teacherJournalEntries = useMemo(() => {
    if (!selectedTeacher) return [];
    const tName = (selectedTeacher.name || '').toLowerCase().trim();

    const allEntries = Object.values(mergedJournalRecords) as ClassJournalEntry[];
    const ownEntries = allEntries.filter(entry => {
      if (Number(entry.scheduledTeacherId) === Number(selectedTeacher.id)) return true;
      const schedName = (entry.scheduledTeacherName || '').toLowerCase().trim();
      const actualName = (entry.actualTeacherName || '').toLowerCase().trim();
      return (
        (tName && schedName && (schedName.includes(tName) || tName.includes(schedName))) ||
        (tName && actualName && (actualName.includes(tName) || tName.includes(actualName)))
      );
    });

    return ownEntries
      .filter(entry => {
        const matchStatus = journalStatusFilter === 'ALL' || entry.status === journalStatusFilter;
        const matchSearch =
          !journalSearch ||
          entry.scheduledSubject?.toLowerCase().includes(journalSearch.toLowerCase()) ||
          entry.topicTaught?.toLowerCase().includes(journalSearch.toLowerCase()) ||
          entry.className?.toLowerCase().includes(journalSearch.toLowerCase());
        return matchStatus && matchSearch;
      })
      .sort((a, b) => (b.teacherSignedAt || '').localeCompare(a.teacherSignedAt || ''));
  }, [selectedTeacher, mergedJournalRecords, journalStatusFilter, journalSearch]);

  const handleOpenLogJournalForLesson = (lesson?: (typeof teacherLessons)[0]) => {
    if (lesson) {
      setEditingJournalEntry({
        id: lesson.journalEntry?.id || `${lesson.className}_${lesson.stream}_${lesson.dayKey}_${lesson.periodNumber}_Wiki1`,
        className: lesson.className,
        stream: lesson.stream,
        week: lesson.journalEntry?.week || 'Wiki ya Sasa',
        day: lesson.dayKey,
        periodNumber: lesson.periodNumber,
        periodName: lesson.periodLabel,
        timeRange: lesson.timeRange,
        scheduledSubject: lesson.subject,
        scheduledTeacherName: selectedTeacher.name,
        scheduledTeacherId: selectedTeacher.id,
        status: lesson.journalEntry?.status || 'TAUGHT',
        topicTaught: lesson.journalEntry?.topicTaught || '',
        studentsPresent: lesson.journalEntry?.studentsPresent ?? 42,
        totalStudentsInClass: lesson.journalEntry?.totalStudentsInClass ?? 45,
        teacherRemarks: lesson.journalEntry?.teacherRemarks || ''
      });
    } else {
      setEditingJournalEntry({
        id: `journal_${selectedTeacher.id}_${Date.now()}`,
        className: selectedTeacher.teachingStreams?.[0]?.split('-')?.[0]?.trim() || 'Form 1',
        stream: selectedTeacher.teachingStreams?.[0]?.split('-')?.[1]?.trim() || 'A',
        week: 'Wiki ya Sasa',
        day: todayWeekday,
        periodNumber: 1,
        periodName: 'Period 1',
        timeRange: '08:00 - 08:40',
        scheduledSubject: selectedTeacher.subjects?.[0] || 'Mathematics',
        scheduledTeacherName: selectedTeacher.name,
        scheduledTeacherId: selectedTeacher.id,
        status: 'TAUGHT',
        topicTaught: '',
        studentsPresent: 42,
        totalStudentsInClass: 45,
        teacherRemarks: ''
      });
    }
    setIsJournalModalOpen(true);
  };

  const handleSaveJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entryId =
      editingJournalEntry.id ||
      `${editingJournalEntry.className}_${editingJournalEntry.stream}_${editingJournalEntry.day}_${editingJournalEntry.periodNumber}_${Date.now()}`;

    const newEntry: ClassJournalEntry = {
      id: entryId,
      className: editingJournalEntry.className || 'Form 1',
      stream: editingJournalEntry.stream || 'A',
      week: editingJournalEntry.week || 'Wiki ya Sasa',
      day: editingJournalEntry.day || todayWeekday,
      periodNumber: Number(editingJournalEntry.periodNumber) || 1,
      periodName: editingJournalEntry.periodName || `Period ${editingJournalEntry.periodNumber || 1}`,
      timeRange: editingJournalEntry.timeRange || '08:00 - 08:40',
      scheduledSubject: editingJournalEntry.scheduledSubject || selectedTeacher.subjects?.[0] || 'Somo',
      scheduledTeacherName: selectedTeacher.name,
      scheduledTeacherId: selectedTeacher.id,
      status: (editingJournalEntry.status as any) || 'TAUGHT',
      actualTeacherName: selectedTeacher.name,
      topicTaught: editingJournalEntry.topicTaught || 'Mada ya Somo',
      studentsPresent: Number(editingJournalEntry.studentsPresent) || 40,
      totalStudentsInClass: Number(editingJournalEntry.totalStudentsInClass) || 45,
      teacherSignature: selectedTeacher.initial || selectedTeacher.name,
      teacherSignedAt: new Date().toLocaleString('en-GB'),
      teacherRemarks: editingJournalEntry.teacherRemarks || '',
      monitorConfirmed: Boolean(editingJournalEntry.monitorConfirmed),
      monitorName: editingJournalEntry.monitorName || 'Monitor wa Darasa'
    };

    const nextRecords = {
      ...mergedJournalRecords,
      [entryId]: newEntry
    };

    try {
      localStorage.setItem(`haby_class_journal_${schoolId}`, JSON.stringify(nextRecords));
    } catch {}

    if (onUpdateJournal) {
      onUpdateJournal(nextRecords);
    }

    setIsJournalModalOpen(false);
    showToast(`✓ Kipindi cha ${newEntry.scheduledSubject} (${newEntry.className}) kimehifadhiwa kwenye Teaching Journal yako!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-950 text-white rounded-2xl shadow-lg border border-emerald-700 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP PROFILE HERO & TEACHER SWITCHER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-800/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-start sm:items-center gap-4">
            {selectedTeacher.passportPhoto ? (
              <img
                src={selectedTeacher.passportPhoto}
                alt={selectedTeacher.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0">
                {selectedTeacher.initial || selectedTeacher.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  TEACHER PROFILE DASHBOARD
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] font-bold">
                  {selectedTeacher.schoolRole || 'Subject Teacher'}
                </span>
                {selectedTeacher.fingerprintEnrolled && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                    ✓ Biometric Enrolled
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {selectedTeacher.name}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200">
                {selectedTeacher.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedTeacher.phone}</span>
                  </span>
                )}
                {selectedTeacher.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedTeacher.email}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Masomo: {(selectedTeacher.subjects || []).join(', ') || 'Hayajapangwa'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Teacher Selector (for Admin/Academic/Headmaster) & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {!isTeacherRole && teachers.length > 1 && (
              <div className="bg-white/10 border border-white/15 rounded-2xl p-2.5">
                <label className="text-[10px] font-black uppercase text-amber-300 block mb-1">
                  Chagua Mwalimu (Switch Teacher Profile):
                </label>
                <select
                  value={selectedTeacher.id}
                  onChange={e => setSelectedTeacherId(Number(e.target.value))}
                  className="bg-slate-900 text-white border border-indigo-400/40 rounded-xl px-3 py-1.5 text-xs font-black outline-none min-w-[220px]"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({(t.subjects || []).slice(0, 2).join(', ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleOpenLogJournalForLesson()}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl shadow-md flex items-center gap-2 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Rekodi Teaching Journal</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/15 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print Profile</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          <div
            onClick={() => setActiveSection('lessons')}
            className="p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-blue-200">Vipindi vya Leo (Today)</span>
              <Clock className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{todaysLessonsCount} Vipindi</div>
            <div className="text-[11px] text-blue-200 mt-0.5">
              Jumla kwa Wiki: <strong>{teacherLessons.length} Vipindi</strong>
            </div>
          </div>

          <div
            onClick={() => setActiveSection('invigilation')}
            className="p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-300">Usimamizi wa Mitihani</span>
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {teacherInvigilationDuties.length} Sessions
            </div>
            <div className="text-[11px] text-blue-200 mt-0.5">
              Vyumba & Kumbi za Mitihani
            </div>
          </div>

          <div
            onClick={() => setActiveSection('journal')}
            className="p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/10 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-300">Teaching Journal Entries</span>
              <BookOpen className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {teacherJournalEntries.length} Kumbukumbu
            </div>
            <div className="text-[11px] text-blue-200 mt-0.5">
              Vipindi vilivyofundishwa: {teacherJournalEntries.filter(j => j.status === 'TAUGHT').length}
            </div>
          </div>

          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-purple-200">Madarasa & Mikondo</span>
              <Layers className="w-4 h-4 text-purple-300" />
            </div>
            <div className="text-lg font-black text-white mt-1 truncate">
              {(selectedTeacher.teachingStreams || []).length || 1} Streams
            </div>
            <div className="text-[10px] text-blue-200 mt-0.5 truncate">
              {(selectedTeacher.teachingStreams || ['Form 1 - A']).join(' • ')}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION NAVIGATION PILLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'overview', label: '📊 Muhtasari Wote (All-in-One View)' },
            { id: 'lessons', label: `📚 Vipindi Vinavyofuata (${teacherLessons.length})` },
            { id: 'invigilation', label: `🛡️ Usimamizi wa Mitihani (${teacherInvigilationDuties.length})` },
            { id: 'journal', label: `📖 Teaching Journal Yangu (${teacherJournalEntries.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition ${
                activeSection === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onNavigateToView && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToView('lessonplans')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Lesson Plans →
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView('invigilation')}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Ratiba ya Usimamizi →
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PANEL 1: UPCOMING LESSONS (VIPINDI VINAVYOFUATA DARASANI)                 */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'lessons') && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  1. Vipindi vya Darasani Vinavyofuata (Upcoming Lessons — {selectedTeacher.name})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Orodha ya vipindi vilivyopangwa kwenye ratiba ya kufundisha kuanzia leo ({SWAHILI_WEEKDAYS[todayWeekday]})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: 'Wiki Nzima' },
                { key: 'TODAY', label: `Leo (${todaysLessonsCount})` },
                { key: 'MONDAY', label: 'Jumatatu' },
                { key: 'TUESDAY', label: 'Jumanne' },
                { key: 'WEDNESDAY', label: 'Jumatano' },
                { key: 'THURSDAY', label: 'Alhamisi' },
                { key: 'FRIDAY', label: 'Ijumaa' }
              ].map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDayFilter(d.key)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black cursor-pointer transition ${
                    selectedDayFilter === d.key
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-xs">
                Hakuna vipindi vilivyopatikana kwa kichujio hiki kwenye ratiba ya {selectedTeacher.name}.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Unaweza kubonyeza "Wiki Nzima" au kusajili kipindi moja kwa moja kwenye Teaching Journal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 sm:p-5">
              {filteredLessons.map(lesson => (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 transition ${
                    lesson.isToday
                      ? 'bg-blue-50/50 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          lesson.isToday
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {lesson.isToday ? '🌟 LEO • ' : ''}
                        {lesson.dayLabel}
                      </span>
                      <span className="text-xs font-mono font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                        {lesson.timeRange}
                      </span>
                    </div>

                    <div>
                      <div className="text-sm font-black text-slate-900">{lesson.subject}</div>
                      <div className="text-xs font-bold text-slate-600 flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                          {lesson.className} {lesson.stream ? `(${lesson.stream})` : ''}
                        </span>
                        <span>•</span>
                        <span>{lesson.periodLabel}</span>
                      </div>
                    </div>

                    {lesson.journalEntry ? (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                        <div className="font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Journal Imerekodiwa: {lesson.journalEntry.topicTaught}</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          Mahudhurio: {lesson.journalEntry.studentsPresent}/{lesson.journalEntry.totalStudentsInClass} Wanafunzi
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
                        <span>Bado haijarekodiwa kwenye Journal</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenLogJournalForLesson(lesson)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {lesson.journalEntry ? 'Hariri Kumbukumbu ya Journal' : 'Jaza Teaching Journal ya Kipindi'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL 2: ASSIGNED INVIGILATION SESSIONS (USIMAMIZI WA MITIHANI)           */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'invigilation') && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  2. Vipindi vya Usimamizi wa Mitihani Alivyopangiwa (Assigned Invigilation Sessions)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Ratiba ya vyumba vya mitihani na majukumu ya usimamizi kwa Mwl. {selectedTeacher.name}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
              {teacherInvigilationDuties.length} Vipindi vya Usimamizi
            </span>
          </div>

          {teacherInvigilationDuties.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-xs">
                Mwl. {selectedTeacher.name} bado hajapangiwa chumba cha kusimamia mtihani kwenye ratiba ya sasa.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200 text-center">#</th>
                    <th className="p-3 border-r border-slate-200">Mtihani (Exam Title)</th>
                    <th className="p-3 border-r border-slate-200">Tarehe & Muda wa Kipindi</th>
                    <th className="p-3 border-r border-slate-200">Somo la Mtihani</th>
                    <th className="p-3 border-r border-slate-200">Kidato / Darasa</th>
                    <th className="p-3 border-r border-slate-200 text-center">Chumba / Ukumbi</th>
                    <th className="p-3 border-r border-slate-200 text-center">Jukumu</th>
                    <th className="p-3 text-center">Hali ya Bahasha / Scripts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {teacherInvigilationDuties.map((duty, idx) => (
                    <tr key={duty.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <span className="font-black text-indigo-950">{duty.examTitle}</span>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-black text-slate-900 font-mono">{duty.date}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{duty.sessionName}</div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <span className="font-black text-slate-900">{duty.subject}</span>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                          {duty.className} {duty.stream ? `(${duty.stream})` : ''}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-black text-xs inline-flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{duty.roomLabel}</span>
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        {duty.role === 'SUPERVISOR' ? (
                          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-black text-[10px] uppercase">
                            👑 Msimamizi Mkuu (Supervisor)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-black text-[10px] uppercase">
                            🛡️ Msimamizi wa Chumba
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {duty.isReturned ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                            ✓ Amerudisha Mitihani
                          </span>
                        ) : duty.isTaken ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                            ⏳ Amechukua (Vyumbani)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">Imepangwa</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL 3: TEACHER'S OWN TEACHING JOURNAL ENTRIES (TEACHING JOURNAL YANGU)  */}
      {/* ========================================================================= */}
      {(activeSection === 'overview' || activeSection === 'journal') && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  3. Kumbukumbu za Teaching Journal za Mwalimu ({selectedTeacher.name})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Mada zilizofundishwa, mahudhurio ya wanafunzi kwenye kipindi, na uthibitisho wa Monitor wa darasa
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tafuta somo au mada..."
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <select
                value={journalStatusFilter}
                onChange={e => setJournalStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="ALL">Hali Zote ({teacherJournalEntries.length})</option>
                <option value="TAUGHT">✓ Vilivyofundishwa (Taught)</option>
                <option value="NOT_TAUGHT">⚠️ Havikufundishwa</option>
                <option value="STAND_IN">🔄 Mwalimu wa Kushikilia (Stand-in)</option>
              </select>

              <button
                type="button"
                onClick={() => handleOpenLogJournalForLesson()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ongeza Kumbukumbu ya Kipindi</span>
              </button>
            </div>
          </div>

          {teacherJournalEntries.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-xs">
                Bado hakuna kumbukumbu za Teaching Journal zilizojazwa kwa Mwl. {selectedTeacher.name}.
              </p>
              <button
                type="button"
                onClick={() => handleOpenLogJournalForLesson()}
                className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                + Rekodi Kipindi Chako cha Kwanza Sasa
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200 text-center">#</th>
                    <th className="p-3 border-r border-slate-200">Siku & Kipindi</th>
                    <th className="p-3 border-r border-slate-200">Somo & Darasa</th>
                    <th className="p-3 border-r border-slate-200">Mada Iliyofundishwa (Topic Taught)</th>
                    <th className="p-3 border-r border-slate-200 text-center">Wanafunzi</th>
                    <th className="p-3 border-r border-slate-200 text-center">Hali</th>
                    <th className="p-3 border-r border-slate-200 text-center">Uthibitisho wa Monitor</th>
                    <th className="p-3 text-center">Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {teacherJournalEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-black text-slate-900">{entry.day} ({entry.week})</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {entry.periodName} • {entry.timeRange}
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-black text-indigo-950">{entry.scheduledSubject}</div>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                          {entry.className} {entry.stream ? `(${entry.stream})` : ''}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{entry.topicTaught || '—'}</div>
                        {entry.teacherRemarks && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">{entry.teacherRemarks}</div>
                        )}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 font-black">
                          {entry.studentsPresent}/{entry.totalStudentsInClass}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        {entry.status === 'TAUGHT' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                            ✓ Imefundishwa
                          </span>
                        ) : entry.status === 'STAND_IN' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black">
                            🔄 Stand-In
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black">
                            ⚠️ Haikufundishwa
                          </span>
                        )}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        {entry.monitorConfirmed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            ✓ {entry.monitorName || 'Monitor'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Inasubiri Monitor</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingJournalEntry(entry);
                            setIsJournalModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition"
                          title="Hariri Kumbukumbu ya Journal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT TEACHING JOURNAL ENTRY */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-emerald-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Rekodi / Hariri Teaching Journal ya Mwalimu
                  </h3>
                  <p className="text-[11px] text-emerald-200">{selectedTeacher.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJournalModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournalEntry} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Somo (Subject):</label>
                  <input
                    type="text"
                    value={editingJournalEntry.scheduledSubject || ''}
                    onChange={e => setEditingJournalEntry({ ...editingJournalEntry, scheduledSubject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Darasa (Class):</label>
                  <input
                    type="text"
                    value={editingJournalEntry.className || ''}
                    onChange={e => setEditingJournalEntry({ ...editingJournalEntry, className: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Mkondo (Stream):</label>
                  <input
                    type="text"
                    value={editingJournalEntry.stream || ''}
                    onChange={e => setEditingJournalEntry({ ...editingJournalEntry, stream: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Siku (Day):</label>
                  <select
                    value={editingJournalEntry.day || 'MONDAY'}
                    onChange={e => setEditingJournalEntry({ ...editingJournalEntry, day: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="MONDAY">Jumatatu (Monday)</option>
                    <option value="TUESDAY">Jumanne (Tuesday)</option>
                    <option value="WEDNESDAY">Jumatano (Wednesday)</option>
                    <option value="THURSDAY">Alhamisi (Thursday)</option>
                    <option value="FRIDAY">Ijumaa (Friday)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Kipindi (Period):</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editingJournalEntry.periodNumber || 1}
                    onChange={e =>
                      setEditingJournalEntry({
                        ...editingJournalEntry,
                        periodNumber: Number(e.target.value) || 1,
                        periodName: `Period ${Number(e.target.value) || 1}`
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                  Mada Iliyofundishwa Darasani (Topic / Sub-topic Taught):
                </label>
                <input
                  type="text"
                  placeholder="Mfano: Quadratic Equations & Factorization..."
                  value={editingJournalEntry.topicTaught || ''}
                  onChange={e => setEditingJournalEntry({ ...editingJournalEntry, topicTaught: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Hali ya Kipindi:</label>
                  <select
                    value={editingJournalEntry.status || 'TAUGHT'}
                    onChange={e => setEditingJournalEntry({ ...editingJournalEntry, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="TAUGHT">✓ Imefundishwa</option>
                    <option value="STAND_IN">🔄 Stand-in</option>
                    <option value="NOT_TAUGHT">⚠️ Haikufundishwa</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Waliohudhuria:</label>
                  <input
                    type="number"
                    min={0}
                    value={editingJournalEntry.studentsPresent ?? 40}
                    onChange={e =>
                      setEditingJournalEntry({ ...editingJournalEntry, studentsPresent: Number(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Wanafunzi Wote:</label>
                  <input
                    type="number"
                    min={1}
                    value={editingJournalEntry.totalStudentsInClass ?? 45}
                    onChange={e =>
                      setEditingJournalEntry({
                        ...editingJournalEntry,
                        totalStudentsInClass: Number(e.target.value) || 45
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">
                  Maoni ya Mwalimu (Teacher Remarks):
                </label>
                <textarea
                  rows={2}
                  placeholder="Maoni kuhusu uelewa wa wanafunzi au zoezi lililotolewa..."
                  value={editingJournalEntry.teacherRemarks || ''}
                  onChange={e => setEditingJournalEntry({ ...editingJournalEntry, teacherRemarks: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  ✓ Hifadhi Kwenye Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
