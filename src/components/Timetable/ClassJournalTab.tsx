import React, { useState, useEffect, useMemo } from 'react';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  SchoolInfo, 
  UserAccount, 
  Student,
  InstitutionalPolicy 
} from '../../types';
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  PenTool, 
  Printer, 
  ShieldCheck, 
  BookOpen, 
  Users, 
  Layers, 
  CheckCheck, 
  RotateCcw, 
  Award,
  ChevronDown,
  Filter
} from 'lucide-react';
import { printFormattedSection } from '../../utils/export';
import { exportClassJournalPDF } from '../../utils/timetablePdfExport';
import { Download } from 'lucide-react';

export interface ClassJournalEntry {
  id: string; // `${className}_${stream}_${day}_${periodIndex}_${week}`
  className: string;
  stream: string;
  week: string;
  day: string;
  periodNumber: number;
  periodName: string;
  timeRange: string;
  scheduledSubject: string;
  scheduledTeacherName: string;
  scheduledTeacherId?: number;
  
  // Real classroom status
  status: 'TAUGHT' | 'NOT_TAUGHT' | 'STAND_IN' | 'FREE_PERIOD';
  actualTeacherName?: string;
  topicTaught: string;
  studentsPresent: number;
  totalStudentsInClass: number;
  
  // Teacher sign-off
  teacherSignature: string;
  teacherSignedAt?: string;
  teacherRemarks?: string;
  
  // Monitor sign-off (Kiranja wa Darasa)
  monitorConfirmed: boolean;
  monitorName: string;
  monitorConfirmedAt?: string;
  monitorRemarks?: string;
}

interface ClassJournalTabProps {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  students?: Student[];
  institutionalPolicy?: InstitutionalPolicy;
}

export const ClassJournalTab: React.FC<ClassJournalTabProps> = ({
  assignments,
  teachers,
  periodSettings,
  streamSettings,
  schoolInfo,
  currentUser,
  students = [],
  institutionalPolicy
}) => {
  // Available classes & streams
  const classList = useMemo(() => {
    if (streamSettings.length > 0) {
      return streamSettings.map(s => s.className);
    }
    return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'];
  }, [streamSettings]);

  const [selectedClass, setSelectedClass] = useState<string>(classList[0] || 'Form 1');

  // Streams for selected class
  const availableStreams = useMemo(() => {
    const setting = streamSettings.find(s => s.className.toLowerCase() === selectedClass.toLowerCase());
    if (setting && setting.streams.length > 0) {
      return setting.streams;
    }
    return ['STREAM A', 'STREAM B'];
  }, [streamSettings, selectedClass]);

  const [selectedStream, setSelectedStream] = useState<string>(availableStreams[0] || 'STREAM A');

  // Keep selected stream in sync
  useEffect(() => {
    if (availableStreams.length > 0 && !availableStreams.includes(selectedStream)) {
      setSelectedStream(availableStreams[0]);
    }
  }, [availableStreams, selectedStream]);

  // Working days (Monday to Friday or custom)
  const workingDays = useMemo(() => {
    if (institutionalPolicy?.workingDays && institutionalPolicy.workingDays.length > 0) {
      return institutionalPolicy.workingDays;
    }
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [institutionalPolicy]);

  const [selectedDayView, setSelectedDayView] = useState<string>('All'); // 'All' or specific day
  const [selectedWeek, setSelectedWeek] = useState<string>('Week 1');

  // Export scope and date-range states
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<'single' | 'range' | 'term1' | 'term2'>('single');
  const [exportStartWeek, setExportStartWeek] = useState<string>('Week 1');
  const [exportEndWeek, setExportEndWeek] = useState<string>('Week 4');

  // Compile entries for multiple weeks helper
  const compileJournalEntriesForWeeks = (weeks: string[]) => {
    const allEntries: ClassJournalEntry[] = [];
    weeks.forEach(week => {
      workingDays.forEach(day => {
        const daySpecificPeriods = periodSettings.filter(p => !p.day || p.day === day || p.day === 'All');
        const sortedPeriods = daySpecificPeriods.length > 0 
          ? [...daySpecificPeriods].sort((a, b) => a.start.localeCompare(b.start))
          : [
              { id: 1, name: 'Period 1', start: '08:00', end: '08:40', durationMinutes: 40, isBreak: false },
              { id: 2, name: 'Period 2', start: '08:40', end: '09:20', durationMinutes: 40, isBreak: false },
              { id: 3, name: 'Period 3', start: '09:20', end: '10:00', durationMinutes: 40, isBreak: false },
              { id: 4, name: 'Period 4', start: '10:40', end: '11:20', durationMinutes: 40, isBreak: false },
              { id: 5, name: 'Period 5', start: '11:20', end: '12:00', durationMinutes: 40, isBreak: false },
              { id: 6, name: 'Period 6', start: '12:00', end: '12:40', durationMinutes: 40, isBreak: false },
              { id: 7, name: 'Period 7', start: '13:40', end: '14:20', durationMinutes: 40, isBreak: false },
              { id: 8, name: 'Period 8', start: '14:20', end: '15:00', durationMinutes: 40, isBreak: false },
            ];

        sortedPeriods.forEach((period, pIdx) => {
          if (period.isBreak) return;

          const periodIndex = pIdx + 1;
          const entryId = `${selectedClass}_${selectedStream}_${day}_${period.name}_${week}`.replace(/\s+/g, '_');
          const periodKey = `${period.name} (${period.start}-${period.end})`;
          const periodKeySpaced = `${period.name} (${period.start} - ${period.end})`;
          const cleanStream = selectedStream.replace(/^stream\s*/i, '').trim().toLowerCase();

          const match = assignments.find(a => {
            const aClass = a.className.trim().toLowerCase();
            const targetClass = selectedClass.trim().toLowerCase();
            if (aClass !== targetClass) return false;

            const aStream = a.stream.trim().toLowerCase();
            const cleanAStream = a.stream.replace(/^stream\s*/i, '').trim().toLowerCase();
            const streamMatches = 
              aStream === selectedStream.toLowerCase() ||
              aStream === 'all' ||
              selectedStream.toLowerCase() === 'all' ||
              cleanAStream === cleanStream;
            if (!streamMatches) return false;

            const aDay = a.day.trim().toLowerCase();
            if (aDay !== day.toLowerCase()) return false;

            const aPeriod = a.period.trim().toLowerCase();
            const pName = period.name.trim().toLowerCase();
            return (
              aPeriod === periodKey.toLowerCase() ||
              aPeriod === periodKeySpaced.toLowerCase() ||
              aPeriod === pName ||
              aPeriod.includes(pName) ||
              (a.periodName && a.periodName.trim().toLowerCase() === pName)
            );
          });

          const scheduledSubject = match ? match.subject : 'Self Study / Free Period';
          const assignedTeacher = match ? teachers.find(t => t.id === match.teacherId) : null;
          const scheduledTeacherName = assignedTeacher ? assignedTeacher.name : (match?.customNote || '—');

          const existingRecord = journalRecords[entryId];

          if (existingRecord) {
            allEntries.push(existingRecord);
          } else {
            allEntries.push({
              id: entryId,
              className: selectedClass,
              stream: selectedStream,
              week,
              day,
              periodNumber: periodIndex,
              periodName: period.name,
              timeRange: `${period.start} - ${period.end}`,
              scheduledSubject,
              scheduledTeacherName,
              scheduledTeacherId: assignedTeacher?.id,
              status: scheduledSubject === 'Self Study / Free Period' ? 'FREE_PERIOD' : 'TAUGHT',
              topicTaught: '',
              studentsPresent: classStudentCount,
              totalStudentsInClass: classStudentCount,
              teacherSignature: '',
              teacherSignedAt: undefined,
              teacherRemarks: '',
              monitorConfirmed: false,
              monitorName,
              monitorConfirmedAt: undefined,
              monitorRemarks: ''
            });
          }
        });
      });
    });
    return allEntries;
  };

  const getSelectedExportWeeks = (): string[] => {
    const allWeeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'];
    if (exportScope === 'single') {
      return [selectedWeek];
    }
    if (exportScope === 'term1') {
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
    }
    if (exportScope === 'term2') {
      return ['Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'];
    }
    if (exportScope === 'range') {
      const startIdx = allWeeks.indexOf(exportStartWeek);
      const endIdx = allWeeks.indexOf(exportEndWeek);
      if (startIdx <= endIdx) {
        return allWeeks.slice(startIdx, endIdx + 1);
      } else {
        return allWeeks.slice(endIdx, startIdx + 1);
      }
    }
    return [selectedWeek];
  };

  const getExportWeeksLabel = (): string => {
    if (exportScope === 'single') return selectedWeek;
    if (exportScope === 'term1') return 'Term 1 (Weeks 1-6)';
    if (exportScope === 'term2') return 'Term 2 (Weeks 7-12)';
    if (exportScope === 'range') return `${exportStartWeek} - ${exportEndWeek}`;
    return selectedWeek;
  };

  // Monitor Profile state (persisted per class & stream)
  const [monitorName, setMonitorName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`haby_monitor_${selectedClass}_${selectedStream}`);
      if (saved) return saved;
    } catch {}
    return 'Head Class Monitor';
  });

  const [classTeacherName, setClassTeacherName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`haby_classteacher_${selectedClass}_${selectedStream}`);
      if (saved) return saved;
    } catch {}
    return teachers[0]?.name || 'Class Teacher';
  });

  // Calculate student count for this class and stream
  const classStudentCount = useMemo(() => {
    const count = students.filter(
      s => s.className.toLowerCase() === selectedClass.toLowerCase() &&
           (!s.stream || s.stream.toUpperCase().includes(selectedStream.toUpperCase().replace(/^STREAM\s+/i, '')) || selectedStream === 'All')
    ).length;
    return count > 0 ? count : 45; // sensible default
  }, [students, selectedClass, selectedStream]);

  // Local state for Journal Entries
  const storageKey = `haby_class_journal_records_${schoolInfo?.name || 'default'}`;
  const [journalRecords, setJournalRecords] = useState<Record<string, ClassJournalEntry>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  // Save to localStorage whenever modified
  const updateJournalEntry = (entryId: string, updates: Partial<ClassJournalEntry>) => {
    setJournalRecords(prev => {
      const existing = prev[entryId];
      if (!existing) return prev;
      const updated = {
        ...prev,
        [entryId]: {
          ...existing,
          ...updates
        }
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Save monitor name on change
  const handleSaveMonitorName = (name: string) => {
    setMonitorName(name);
    try {
      localStorage.setItem(`haby_monitor_${selectedClass}_${selectedStream}`, name);
    } catch {}
  };

  const handleSaveClassTeacherName = (name: string) => {
    setClassTeacherName(name);
    try {
      localStorage.setItem(`haby_classteacher_${selectedClass}_${selectedStream}`, name);
    } catch {}
  };

  // Generate / Compile Journal Entries for the selected class, stream, and week
  const weekJournalEntries = useMemo(() => {
    const entries: ClassJournalEntry[] = [];

    workingDays.forEach(day => {
      // Find period settings for this day or global periods
      const daySpecificPeriods = periodSettings.filter(p => !p.day || p.day === day || p.day === 'All');
      const sortedPeriods = daySpecificPeriods.length > 0 
        ? [...daySpecificPeriods].sort((a, b) => a.start.localeCompare(b.start))
        : [
            { id: 1, name: 'Period 1', start: '08:00', end: '08:40', durationMinutes: 40, isBreak: false },
            { id: 2, name: 'Period 2', start: '08:40', end: '09:20', durationMinutes: 40, isBreak: false },
            { id: 3, name: 'Period 3', start: '09:20', end: '10:00', durationMinutes: 40, isBreak: false },
            { id: 4, name: 'Period 4', start: '10:40', end: '11:20', durationMinutes: 40, isBreak: false },
            { id: 5, name: 'Period 5', start: '11:20', end: '12:00', durationMinutes: 40, isBreak: false },
            { id: 6, name: 'Period 6', start: '12:00', end: '12:40', durationMinutes: 40, isBreak: false },
            { id: 7, name: 'Period 7', start: '13:40', end: '14:20', durationMinutes: 40, isBreak: false },
            { id: 8, name: 'Period 8', start: '14:20', end: '15:00', durationMinutes: 40, isBreak: false },
          ];

      sortedPeriods.forEach((period, pIdx) => {
        if (period.isBreak) return; // Skip tea/lunch break from official teaching journal

        const periodIndex = pIdx + 1;
        const entryId = `${selectedClass}_${selectedStream}_${day}_${period.name}_${selectedWeek}`.replace(/\s+/g, '_');
        const periodKey = `${period.name} (${period.start}-${period.end})`;
        const periodKeySpaced = `${period.name} (${period.start} - ${period.end})`;
        const cleanStream = selectedStream.replace(/^stream\s*/i, '').trim().toLowerCase();

        // Look for scheduled timetable assignment
        const match = assignments.find(a => {
          const aClass = a.className.trim().toLowerCase();
          const targetClass = selectedClass.trim().toLowerCase();
          if (aClass !== targetClass) return false;

          const aStream = a.stream.trim().toLowerCase();
          const cleanAStream = a.stream.replace(/^stream\s*/i, '').trim().toLowerCase();
          const streamMatches = 
            aStream === selectedStream.toLowerCase() ||
            aStream === 'all' ||
            selectedStream.toLowerCase() === 'all' ||
            cleanAStream === cleanStream;
          if (!streamMatches) return false;

          const aDay = a.day.trim().toLowerCase();
          if (aDay !== day.toLowerCase()) return false;

          const aPeriod = a.period.trim().toLowerCase();
          const pName = period.name.trim().toLowerCase();
          return (
            aPeriod === periodKey.toLowerCase() ||
            aPeriod === periodKeySpaced.toLowerCase() ||
            aPeriod === pName ||
            aPeriod.includes(pName) ||
            (a.periodName && a.periodName.trim().toLowerCase() === pName)
          );
        });

        const scheduledSubject = match ? match.subject : 'Self Study / Free Period';
        const assignedTeacher = match ? teachers.find(t => t.id === match.teacherId) : null;
        const scheduledTeacherName = assignedTeacher ? assignedTeacher.name : (match?.customNote || '—');

        const existingRecord = journalRecords[entryId];

        if (existingRecord) {
          entries.push(existingRecord);
        } else {
          // Pre-populate defaults
          const defaultEntry: ClassJournalEntry = {
            id: entryId,
            className: selectedClass,
            stream: selectedStream,
            week: selectedWeek,
            day,
            periodNumber: periodIndex,
            periodName: period.name,
            timeRange: `${period.start} - ${period.end}`,
            scheduledSubject,
            scheduledTeacherName,
            scheduledTeacherId: assignedTeacher?.id,
            status: scheduledSubject === 'Self Study / Free Period' ? 'FREE_PERIOD' : 'TAUGHT',
            topicTaught: '',
            studentsPresent: classStudentCount,
            totalStudentsInClass: classStudentCount,
            teacherSignature: '',
            teacherSignedAt: undefined,
            teacherRemarks: '',
            monitorConfirmed: false,
            monitorName,
            monitorConfirmedAt: undefined,
            monitorRemarks: ''
          };
          entries.push(defaultEntry);
        }
      });
    });

    return entries;
  }, [workingDays, periodSettings, selectedClass, selectedStream, selectedWeek, assignments, teachers, journalRecords, monitorName, classStudentCount]);

  // Ensure entries exist in storage
  useEffect(() => {
    let hasNew = false;
    const newRecords = { ...journalRecords };
    weekJournalEntries.forEach(entry => {
      if (!newRecords[entry.id]) {
        newRecords[entry.id] = entry;
        hasNew = true;
      }
    });
    if (hasNew) {
      setJournalRecords(newRecords);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newRecords));
      } catch {}
    }
  }, [weekJournalEntries, storageKey]);

  // Filtered entries according to Day selection
  const displayedEntries = useMemo(() => {
    if (selectedDayView === 'All') {
      return weekJournalEntries;
    }
    return weekJournalEntries.filter(e => e.day.toLowerCase() === selectedDayView.toLowerCase());
  }, [weekJournalEntries, selectedDayView]);

  // Weekly Analytics Summary
  const stats = useMemo(() => {
    const total = weekJournalEntries.length;
    const taught = weekJournalEntries.filter(e => e.status === 'TAUGHT').length;
    const standIn = weekJournalEntries.filter(e => e.status === 'STAND_IN').length;
    const notTaught = weekJournalEntries.filter(e => e.status === 'NOT_TAUGHT').length;
    const monitorConfirmed = weekJournalEntries.filter(e => e.monitorConfirmed).length;
    const teacherSigned = weekJournalEntries.filter(e => e.teacherSignature && e.teacherSignature.trim().length > 0).length;

    const teachingRate = total > 0 ? Math.round(((taught + standIn) / total) * 100) : 0;
    const monitorVerificationRate = total > 0 ? Math.round((monitorConfirmed / total) * 100) : 0;

    return {
      total,
      taught,
      standIn,
      notTaught,
      monitorConfirmed,
      teacherSigned,
      teachingRate,
      monitorVerificationRate
    };
  }, [weekJournalEntries]);

  // Quick action: Monitor confirms all taught periods for current day
  const handleBatchConfirmByMonitor = (dayName: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetDay = dayName === 'All' ? null : dayName;

    const updated = { ...journalRecords };
    weekJournalEntries.forEach(entry => {
      if (!targetDay || entry.day.toLowerCase() === targetDay.toLowerCase()) {
        updated[entry.id] = {
          ...entry,
          monitorConfirmed: true,
          monitorName: monitorName || 'Class Monitor',
          monitorConfirmedAt: entry.monitorConfirmedAt || now
        };
      }
    });

    setJournalRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  // Quick action: Teacher signs all their periods for the week
  const handleBatchSignAsCurrentTeacher = () => {
    const teacherName = currentUser?.fullName || currentUser?.email || 'Subject Teacher';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updated = { ...journalRecords };
    weekJournalEntries.forEach(entry => {
      const isTeacherMatch = currentUser?.role === 'TEACHER'
        ? (entry.scheduledTeacherName.toLowerCase().includes(teacherName.toLowerCase()) || teacherName.toLowerCase().includes(entry.scheduledTeacherName.toLowerCase()))
        : true;

      if (isTeacherMatch && entry.status === 'TAUGHT') {
        updated[entry.id] = {
          ...entry,
          teacherSignature: entry.teacherSignature || teacherName,
          teacherSignedAt: entry.teacherSignedAt || now
        };
      }
    });

    setJournalRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  // Print official class journal
  const handlePrintJournal = () => {
    printFormattedSection(
      'official-class-journal-printable',
      `Official Class Journal - ${selectedClass} ${selectedStream} (${getExportWeeksLabel()})`,
      schoolInfo?.name || 'HabyEduPro3A',
      {
        orientation: 'landscape',
        pageSize: 'A4',
        margin: '5mm',
        hideLetterhead: true
      }
    );
  };

  const handleDownloadPDF = () => {
    const classStudents = students.filter(
      s => s.className.toLowerCase() === selectedClass.toLowerCase() &&
           (!s.stream || s.stream.toUpperCase().includes(selectedStream.toUpperCase().replace(/^STREAM\s+/i, '')) || selectedStream === 'All')
    );

    const targetWeeks = getSelectedExportWeeks();
    const compiledEntries = compileJournalEntriesForWeeks(targetWeeks);

    exportClassJournalPDF({
      className: selectedClass,
      stream: selectedStream,
      week: getExportWeeksLabel(),
      entries: compiledEntries,
      schoolInfo,
      monitorName,
      classTeacherName,
      students: classStudents
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                Class Journal
              </span>
              <span className="text-xs text-blue-200 font-semibold">
                Official Classroom Period Log &amp; Monitoring Book
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Classroom Period Journal</span>
              <span className="text-blue-300 font-normal text-base md:text-lg">
                ({selectedClass} - {selectedStream})
              </span>
            </h2>
            <p className="text-xs text-blue-100/90 max-w-2xl leading-relaxed">
              This journal is automatically generated from the Master Timetable. The Class Monitor verifies period completion, and each subject teacher signs off and logs the taught topic for the entire week.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setExportScope('single');
                setShowExportModal(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              title="Download official class journal as a professional PDF document"
            >
              <Download className="w-4 h-4" />
              <span>Download Journal (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExportScope('single');
                setShowExportModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Journal (PDF)</span>
            </button>
            <button
              type="button"
              onClick={handleBatchSignAsCurrentTeacher}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Batch sign your taught periods automatically"
            >
              <PenTool className="w-4 h-4 text-amber-300" />
              <span>Sign as Subject Teacher</span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchConfirmByMonitor(selectedDayView)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Class monitor verifies all taught periods"
            >
              <CheckCheck className="w-4 h-4 text-emerald-300" />
              <span>Verify All (Monitor)</span>
            </button>
          </div>
        </div>

        {/* Ambient watermark */}
        <BookOpen className="w-72 h-72 text-white/5 absolute -right-10 -bottom-16 pointer-events-none" />
      </div>

      {/* Filter and Configuration Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Class Select */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Class:
            </label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            >
              {classList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stream Select */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Stream:
            </label>
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            >
              {availableStreams.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Week Select */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Academic Week:
            </label>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            >
              {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'].map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Class Monitor Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center justify-between">
              <span>Class Monitor:</span>
              <span className="text-[10px] text-blue-600 font-semibold">Monitor</span>
            </label>
            <input
              type="text"
              value={monitorName}
              onChange={e => handleSaveMonitorName(e.target.value)}
              placeholder="Class Monitor Name..."
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>

          {/* Class Teacher Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center justify-between">
              <span>Class Teacher:</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Class Teacher</span>
            </label>
            <input
              type="text"
              value={classTeacherName}
              onChange={e => handleSaveClassTeacherName(e.target.value)}
              placeholder="Class Teacher Name..."
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* Day Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Day:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayView('All')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                selectedDayView === 'All'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Full Week (Mon - Fri)
            </button>
            {workingDays.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayView(day)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  selectedDayView === day
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Students in Class: <strong>{classStudentCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Scheduled
          </span>
          <div className="text-xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[10px] text-slate-500">Scheduled Periods</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Taught Periods
          </span>
          <div className="text-xl font-black text-emerald-700">{stats.taught}</div>
          <p className="text-[10px] text-slate-500">Taught by Scheduled Teacher</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Relief / Stand-in
          </span>
          <div className="text-xl font-black text-amber-700">{stats.standIn}</div>
          <p className="text-[10px] text-slate-500">Relief / Stand-in Teachers</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Missed Periods
          </span>
          <div className="text-xl font-black text-rose-700">{stats.notTaught}</div>
          <p className="text-[10px] text-slate-500">Absent / Missed Periods</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Monitor Verified
          </span>
          <div className="text-xl font-black text-blue-700">
            {stats.monitorConfirmed} <span className="text-xs text-slate-400">/ {stats.total}</span>
          </div>
          <p className="text-[10px] text-slate-500">{stats.monitorVerificationRate}% Verified by Monitor</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
            Teaching Compliance
          </span>
          <div className="text-xl font-black text-indigo-700">{stats.teachingRate}%</div>
          <p className="text-[10px] text-slate-500">Weekly Teaching Rate</p>
        </div>
      </div>

      {/* Main Journal Table / Logbook */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Period Journal Ledger</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {displayedEntries.length} Periods
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each period is verified by the class monitor and signed by the assigned subject teacher.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Class Teacher:</span>
            <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {classTeacherName}
            </span>
          </div>
        </div>

        {/* Table of Journal Entries */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-28">Day &amp; Time</th>
                <th className="p-3 w-36">Subject &amp; Teacher</th>
                <th className="p-3 w-32 text-center">Period Status</th>
                <th className="p-3 min-w-[200px]">Topic Covered</th>
                <th className="p-3 w-24 text-center">Attendance</th>
                <th className="p-3 min-w-[170px]">Teacher Signature</th>
                <th className="p-3 min-w-[190px]">Monitor Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    No periods scheduled for this day on the timetable.
                  </td>
                </tr>
              ) : (
                displayedEntries.map((entry, idx) => {
                  const isTaught = entry.status === 'TAUGHT';
                  const isStandIn = entry.status === 'STAND_IN';
                  const isNotTaught = entry.status === 'NOT_TAUGHT';
                  const isFree = entry.status === 'FREE_PERIOD';

                  return (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-blue-50/40 transition-colors ${
                        entry.monitorConfirmed ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Period # */}
                      <td className="p-3 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Day & Time */}
                      <td className="p-3 space-y-0.5">
                        <span className="font-extrabold text-slate-900 block">{entry.day}</span>
                        <span className="text-[11px] font-bold text-blue-700 block">{entry.periodName}</span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {entry.timeRange}
                        </span>
                      </td>

                      {/* Scheduled Subject & Teacher */}
                      <td className="p-3 space-y-1">
                        <span className="font-extrabold text-slate-900 block">{entry.scheduledSubject}</span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>{entry.scheduledTeacherName}</span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="p-3 text-center">
                        <select
                          value={entry.status}
                          onChange={e => updateJournalEntry(entry.id, { status: e.target.value as any })}
                          className={`w-full text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                            isTaught 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : isStandIn 
                              ? 'bg-amber-50 text-amber-800 border-amber-300' 
                              : isNotTaught 
                              ? 'bg-rose-50 text-rose-800 border-rose-300' 
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="TAUGHT">✓ Taught</option>
                          <option value="STAND_IN">⇄ Relief / Stand-in</option>
                          <option value="NOT_TAUGHT">✗ Not Taught</option>
                          <option value="FREE_PERIOD">— Free Period</option>
                        </select>
                        {isStandIn && (
                          <input
                            type="text"
                            placeholder="Relief teacher name..."
                            value={entry.actualTeacherName || ''}
                            onChange={e => updateJournalEntry(entry.id, { actualTeacherName: e.target.value })}
                            className="w-full mt-1 px-1.5 py-0.5 text-[10px] border border-amber-300 rounded bg-white text-amber-900"
                          />
                        )}
                      </td>

                      {/* Topic Covered */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={entry.topicTaught}
                          onChange={e => updateJournalEntry(entry.id, { topicTaught: e.target.value })}
                          placeholder={isNotTaught ? 'Reason for not teaching...' : 'Topic / Subtopic covered...'}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-800"
                        />
                      </td>

                      {/* Attendance (Students present) */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            min="0"
                            max={classStudentCount}
                            value={entry.studentsPresent}
                            onChange={e => updateJournalEntry(entry.id, { studentsPresent: parseInt(e.target.value, 10) || 0 })}
                            className="w-12 px-1.5 py-1 text-center font-bold text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">/{classStudentCount}</span>
                        </div>
                      </td>

                      {/* Teacher Signature & Remarks */}
                      <td className="p-3 space-y-1.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={entry.teacherSignature}
                            onChange={e => updateJournalEntry(entry.id, { 
                              teacherSignature: e.target.value,
                              teacherSignedAt: e.target.value ? (entry.teacherSignedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : undefined
                            })}
                            placeholder="Teacher signature..."
                            className="flex-1 px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-800"
                          />
                          {!entry.teacherSignature && (
                            <button
                              type="button"
                              onClick={() => {
                                const tName = currentUser?.fullName || entry.scheduledTeacherName;
                                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                updateJournalEntry(entry.id, {
                                  teacherSignature: tName,
                                  teacherSignedAt: now
                                });
                              }}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Sign period now"
                            >
                              Sign
                            </button>
                          )}
                        </div>
                        {entry.teacherSignedAt && (
                          <span className="text-[9px] text-slate-400 font-mono block">
                            Time: {entry.teacherSignedAt}
                          </span>
                        )}
                      </td>

                      {/* Monitor Confirmation (Uthibitisho wa Kiranja) */}
                      <td className="p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const willConfirm = !entry.monitorConfirmed;
                              const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              updateJournalEntry(entry.id, {
                                monitorConfirmed: willConfirm,
                                monitorName: monitorName || 'Class Monitor',
                                monitorConfirmedAt: willConfirm ? now : undefined
                              });
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              entry.monitorConfirmed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                            }`}
                          >
                            {entry.monitorConfirmed ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>✓ Verified</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Verify (Monitor)</span>
                              </>
                            )}
                          </button>
                        </div>
                        {entry.monitorConfirmed && (
                          <div className="text-[10px] text-emerald-700 font-medium">
                            <span>By: <strong>{entry.monitorName}</strong></span>
                            {entry.monitorConfirmedAt && <span className="text-slate-400 ml-1">({entry.monitorConfirmedAt})</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Journal Guidelines:</span>
            <span>Class monitor verifies after each period ends • Subject teacher signs off after teaching.</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Haby Edu Pro • Official School Academic Journal Module</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HIDDEN PRINTABLE CONTAINER FOR OFFICIAL EXPORT / PRINTING */}
      {/* ------------------------------------------------------------- */}
      <div id="official-class-journal-printable" className="hidden print:block bg-white text-slate-900 p-8 font-sans">
        {/* Official Header */}
        <div className="border-b-4 border-slate-900 pb-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {schoolInfo?.logo && (
              <img src={schoolInfo.logo} alt="Logo" className="w-20 h-20 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tighter leading-none">
                {schoolInfo?.name || 'HabyEduPro3A'}
              </h1>
              <p className="text-[11px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
                {schoolInfo?.address || 'P.O. BOX 145, TANGA, TANZANIA'} • TEL: {schoolInfo?.phone || '0717616343'}
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                Official Classroom Journal &amp; Period Log
              </div>
            </div>
          </div>
          <div className="text-right space-y-1 border-l-2 border-slate-200 pl-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Class & Stream</div>
            <div className="text-sm font-black text-slate-900 uppercase">{selectedClass} - {selectedStream}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">Academic Session</div>
            <div className="text-xs font-black text-slate-900">{selectedWeek} • {new Date().getFullYear()}</div>
          </div>
        </div>

        {/* Particulars Bar */}
        <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-xl mb-6 grid grid-cols-4 gap-6 text-[10px]">
          <div className="space-y-1">
            <span className="text-slate-500 font-bold uppercase tracking-widest block">Class Monitor</span>
            <span className="text-sm font-black text-slate-900">{monitorName}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-bold uppercase tracking-widest block">Class Teacher</span>
            <span className="text-sm font-black text-slate-900">{classTeacherName}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-bold uppercase tracking-widest block">Total Students</span>
            <span className="text-sm font-black text-slate-900">{classStudentCount} Registered</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-bold uppercase tracking-widest block">Compliance Rate</span>
            <span className="text-sm font-black text-emerald-700">{stats.teachingRate}% Execution</span>
          </div>
        </div>

        {/* Printable Tables per Selected Week */}
        {getSelectedExportWeeks().map((weekName, weekIdx) => {
          const compiledWeekEntries = compileJournalEntriesForWeeks([weekName]);
          return (
            <div key={weekName} className={weekIdx > 0 ? "page-break-before-always mt-12 pt-8 border-t-2 border-slate-300" : ""}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Journal Records: <span className="text-blue-900 font-extrabold">{weekName}</span>
                </h3>
                <span className="text-[9px] font-bold text-slate-400">
                  {compiledWeekEntries.length} Periods Scheduled
                </span>
              </div>
              <table className="w-full text-left border-collapse text-[10px] border-2 border-slate-900 mb-6">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-black uppercase border-b-2 border-slate-900">
                    <th className="p-2 border border-slate-900 text-center w-10">No.</th>
                    <th className="p-2 border border-slate-900 w-32">Day & Timing</th>
                    <th className="p-2 border border-slate-900 w-44">Subject & Instructor</th>
                    <th className="p-2 border border-slate-900 w-24 text-center">Status</th>
                    <th className="p-2 border border-slate-900">Topic / Material Covered</th>
                    <th className="p-2 border border-slate-900 w-20 text-center">Attd.</th>
                    <th className="p-2 border border-slate-900 w-36">Teacher Sign</th>
                    <th className="p-2 border border-slate-900 w-36">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {compiledWeekEntries.map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-slate-300">
                      <td className="p-1 border border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-1 border border-slate-300">
                        <div className="font-bold">{entry.day}</div>
                        <div className="text-[9px] text-slate-600">{entry.periodName} ({entry.timeRange})</div>
                      </td>
                      <td className="p-1 border border-slate-300">
                        <div className="font-extrabold text-slate-900">{entry.scheduledSubject}</div>
                        <div className="text-[9px] text-slate-600">{entry.scheduledTeacherName}</div>
                      </td>
                      <td className="p-1 border border-slate-300 text-center font-bold">
                        {entry.status === 'TAUGHT' ? '✓ Taught' :
                         entry.status === 'STAND_IN' ? `⇄ Relief (${entry.actualTeacherName || 'Stand-in'})` :
                         entry.status === 'NOT_TAUGHT' ? '✗ Not Taught' : '— Free'}
                      </td>
                      <td className="p-1 border border-slate-300 font-medium">
                        {entry.topicTaught || '—'}
                      </td>
                      <td className="p-1 border border-slate-300 text-center font-bold">
                        {entry.studentsPresent} / {classStudentCount}
                      </td>
                      <td className="p-1 border border-slate-300 font-bold">
                        {entry.teacherSignature ? (
                          <div>
                            <span>{entry.teacherSignature}</span>
                            {entry.teacherSignedAt && <span className="text-[8px] text-slate-500 block">{entry.teacherSignedAt}</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-1 border border-slate-300">
                        {entry.monitorConfirmed ? (
                          <div className="text-emerald-800 font-bold">
                            <span>✓ {entry.monitorName}</span>
                            {entry.monitorConfirmedAt && <span className="text-[8px] text-slate-500 block">{entry.monitorConfirmedAt}</span>}
                          </div>
                        ) : 'Not Verified'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Weekly Endorsement / Sign-off Block */}
        <div className="mt-8 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-12 text-[10px]">
          <div className="space-y-4">
            <div>
              <span className="font-black uppercase block text-slate-900 tracking-wider">I. Class Monitor Endorsement</span>
              <p className="text-[9px] text-slate-500 mt-1 italic">Verified all periods were attended by scheduled instructors.</p>
            </div>
            <div className="pt-4 border-b-2 border-slate-900 font-bold">
              Name: {monitorName}
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-400 font-bold">Signature &amp; Date:</span>
              <div className="w-32 border-b border-slate-300"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="font-black uppercase block text-slate-900 tracking-wider">II. Class Teacher Review</span>
              <p className="text-[9px] text-slate-500 mt-1 italic">Confirmed topics taught align with the scheme of work.</p>
            </div>
            <div className="pt-4 border-b-2 border-slate-900 font-bold">
              Name: {classTeacherName}
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-400 font-bold">Signature &amp; Date:</span>
              <div className="w-32 border-b border-slate-300"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="font-black uppercase block text-slate-900 tracking-wider">III. Academic Master / Stamp</span>
              <p className="text-[9px] text-slate-500 mt-1 italic">Official institutional audit and quality assurance.</p>
            </div>
            <div className="pt-4 border-b-2 border-slate-900 font-bold">
              Auth: {schoolInfo?.principal || 'Academic Master'}
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-400 font-bold">Official Stamp:</span>
              <div className="w-32 h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[8px] text-slate-300">STAMP AREA</div>
            </div>
          </div>
        </div>

        {/* Footer Audit Line */}
        <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          <div>System Generated: Haby Edu Pro School Management System</div>
          <div>Page 01 of 01</div>
          <div>Audit ID: CJ-{selectedClass.substring(0,3).toUpperCase()}-{selectedWeek.replace(' ','')}-{new Date().getTime().toString().slice(-6)}</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SCOPE & DATE RANGE EXPORT FILTER MODAL */}
      {/* ------------------------------------------------------------- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Filter className="w-5 h-5 text-amber-400" />
                <span className="font-black text-sm tracking-tight uppercase text-white">Export Class Journal Report</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-slate-700">
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Select Export Scope / Date Range</h3>
                <p className="text-xs text-slate-500">Choose whether to export a single week, a custom range of weeks, or a specific term's academic data.</p>
              </div>

              {/* Scope Radio Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Single Week */}
                <label className={`p-3.5 border-2 rounded-2xl flex items-start gap-3 cursor-pointer transition ${
                  exportScope === 'single' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === 'single'}
                    onChange={() => setExportScope('single')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-xs text-slate-900 block">Single Selected Week Only</span>
                    <span className="text-[11px] text-slate-500 block">Generates the journal report specifically for <strong className="text-slate-700">{selectedWeek}</strong>.</span>
                  </div>
                </label>

                {/* 2. Custom Week Range */}
                <label className={`p-3.5 border-2 rounded-2xl flex items-start gap-3 cursor-pointer transition ${
                  exportScope === 'range' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === 'range'}
                    onChange={() => setExportScope('range')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-1 flex-1">
                    <span className="font-extrabold text-xs text-slate-900 block">Custom Week-Range Filter</span>
                    <span className="text-[11px] text-slate-500 block">Select a specific custom start week and end week for the audit report.</span>
                    
                    {exportScope === 'range' && (
                      <div className="grid grid-cols-2 gap-2 pt-2 animate-in slide-in-from-top-1 duration-150">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Week:</span>
                          <select
                            value={exportStartWeek}
                            onChange={e => setExportStartWeek(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800"
                          >
                            {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'].map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Week:</span>
                          <select
                            value={exportEndWeek}
                            onChange={e => setExportEndWeek(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800"
                          >
                            {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'].map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* 3. Term 1 */}
                <label className={`p-3.5 border-2 rounded-2xl flex items-start gap-3 cursor-pointer transition ${
                  exportScope === 'term1' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === 'term1'}
                    onChange={() => setExportScope('term1')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-xs text-slate-900 block">Term 1 Full Log (Weeks 1 to 6)</span>
                    <span className="text-[11px] text-slate-500 block">Generates a complete report of teaching execution for the entire first half of the term.</span>
                  </div>
                </label>

                {/* 4. Term 2 */}
                <label className={`p-3.5 border-2 rounded-2xl flex items-start gap-3 cursor-pointer transition ${
                  exportScope === 'term2' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === 'term2'}
                    onChange={() => setExportScope('term2')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-xs text-slate-900 block">Term 2 Full Log (Weeks 7 to 12)</span>
                    <span className="text-[11px] text-slate-500 block">Generates a complete report of teaching execution for the entire second half of the term.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handlePrintJournal();
                    setShowExportModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Selection</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadPDF();
                    setShowExportModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
