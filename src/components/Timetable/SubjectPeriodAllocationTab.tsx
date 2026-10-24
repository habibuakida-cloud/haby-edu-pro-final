import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Filter,
  AlertTriangle,
  XCircle,
  BarChart3,
  CheckSquare,
  Copy,
  Printer,
  Download,
  Edit3,
  User,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  SubjectPeriodAllocation,
  StreamSetting,
  TimetableAssignment,
  PeriodSetting,
  Teacher,
  TeacherAssignment,
  SchoolInfo
} from '../../types';
import {
  NURSERY_CLASSES,
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
  DEFAULT_CLASSES
} from '../../constants/defaults';
import { SubjectRegistry } from '../../constants/SubjectRegistry';
import { isSameClass } from '../../utils/reportCardUtils';
import {
  computeStreamSubjectProgression,
  getAllStreamsForClassHelper,
  inferLevelFromClassName,
  isSameStream,
  isSameSubjectName,
  normalizeStreamName,
  StreamProgressionReport
} from '../../lib/timetableService';
import { exportProgressionReportPDF } from '../../utils/timetablePdfExport';

import { ProgressionReportModule } from './ProgressionReportModule';
import { TeacherProgressionReportModule } from './TeacherProgressionReportModule';

interface SubjectPeriodAllocationTabProps {
  allocations: SubjectPeriodAllocation[];
  streamSettings?: StreamSetting[];
  assignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  teachers?: Teacher[];
  teacherAssignments?: TeacherAssignment[];
  schoolName?: string;
  schoolInfo?: SchoolInfo;
  initialClass?: string;
  initialStream?: string;
  initialSubView?: 'progression' | 'teacher_progression' | 'register';
  onUpdateAllocations: (allocations: SubjectPeriodAllocation[]) => void;
  onNavigateToGeneralTimetable?: (className: string, stream: string) => void;
}

const DEFAULT_SUBJECT_PERIODS: Record<string, number> = {
  'Basic Mathematics': 6,
  'Mathematics': 6,
  'English Language': 5,
  'Kiswahili': 4,
  'Biology': 4,
  'Chemistry': 4,
  'Physics': 4,
  'Geography': 3,
  'History': 3,
  'Civics': 3,
  'Historia ya Tanzania na Maadili': 3,
  'Elimu ya Dini ya Kiislamu': 2,
  'Elimu ya Dini ya Kikristo': 2,
  'Bible Knowledge': 2,
  'Islamic Knowledge': 2,
  'Fine Art': 2,
  'Information & Computer Studies': 3,
  'Computer Science': 3,
  'Business Studies': 3,
  'Commerce': 3,
  'Book Keeping': 3,
  'Literature in English': 3,
  'Arabic Language': 3,
  'French Language': 3,
  'Agriculture': 3,
  'Physical Education': 2,
  'Music': 2,
  'General Studies': 3
};

export const SubjectPeriodAllocationTab: React.FC<SubjectPeriodAllocationTabProps> = ({
  allocations = [],
  streamSettings = [],
  assignments = [],
  periodSettings = [],
  teachers = [],
  teacherAssignments = [],
  schoolName = 'HABY EDUPRO',
  schoolInfo,
  initialClass,
  initialStream,
  initialSubView = 'progression',
  onUpdateAllocations,
  onNavigateToGeneralTimetable
}) => {
  const [localAllocations, setLocalAllocations] = useState<SubjectPeriodAllocation[]>(allocations);
  const [subView, setSubView] = useState<'progression' | 'teacher_progression' | 'register'>(initialSubView);
  const [activeLevel, setActiveLevel] = useState<'ALL' | 'NURSERY' | 'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(initialClass || 'All');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>(initialStream || 'All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INCOMPLETE_OR_MISSING' | 'MISSING_ONLY' | 'COMPLETE'>('ALL');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Registration form states
  const [regLevel, setRegLevel] = useState<'NURSERY' | 'PRIMARY' | 'SECONDARY'>(
    initialClass ? inferLevelFromClassName(initialClass) : 'SECONDARY'
  );
  const [newClass, setNewClass] = useState<string>(initialClass || 'Form 1');
  const [newStream, setNewStream] = useState<string>(initialStream && initialStream !== 'All' ? initialStream : 'STREAM A');
  const [customStreamInput, setCustomStreamInput] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('Basic Mathematics');
  const [newPeriods, setNewPeriods] = useState<number>(6);

  // Bulk checklist registration state
  const [showBulkSelector, setShowBulkSelector] = useState<boolean>(false);
  const [bulkSelectedSubjects, setBulkSelectedSubjects] = useState<Record<string, number>>({});
  const [bulkSearchQuery, setBulkSearchQuery] = useState<string>('');

  // Copy curriculum state
  const [copyTargetClass, setCopyTargetClass] = useState<string>('Form 1');
  const [copyTargetStream, setCopyTargetStream] = useState<string>('STREAM B');

  useEffect(() => {
    setLocalAllocations(allocations);
  }, [allocations]);

  useEffect(() => {
    if (initialClass) {
      setSelectedClassFilter(initialClass);
      setNewClass(initialClass);
      setRegLevel(inferLevelFromClassName(initialClass));
    }
    if (initialStream) {
      setSelectedStreamFilter(initialStream);
      if (initialStream !== 'All') {
        setNewStream(initialStream);
      }
    }
  }, [initialClass, initialStream]);

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3500);
  };

  const commitAllocations = (next: SubjectPeriodAllocation[], toastMessage?: string) => {
    setLocalAllocations(next);
    onUpdateAllocations(next);
    if (toastMessage) {
      showToast(toastMessage);
    }
  };

  const levelClasses = useMemo(() => {
    if (activeLevel === 'NURSERY') return NURSERY_CLASSES;
    if (activeLevel === 'PRIMARY') return PRIMARY_CLASSES;
    if (activeLevel === 'SECONDARY') return SECONDARY_CLASSES;
    return DEFAULT_CLASSES;
  }, [activeLevel]);

  const regLevelClasses = useMemo(() => {
    if (regLevel === 'NURSERY') return NURSERY_CLASSES;
    if (regLevel === 'PRIMARY') return PRIMARY_CLASSES;
    return SECONDARY_CLASSES;
  }, [regLevel]);

  const availableStreamsForNewClass = useMemo(() => {
    const dynamic = getAllStreamsForClassHelper(newClass, streamSettings, assignments, localAllocations);
    const base = ['STREAM A', 'STREAM B', 'STREAM C'];
    const merged = Array.from(new Set([...dynamic, ...base]));
    return merged;
  }, [newClass, streamSettings, assignments, localAllocations]);

  const availableStreamsForFilterClass = useMemo(() => {
    if (selectedClassFilter === 'All') return [];
    return getAllStreamsForClassHelper(selectedClassFilter, streamSettings, assignments, localAllocations);
  }, [selectedClassFilter, streamSettings, assignments, localAllocations]);

  // Build progression reports across all active classes & streams
  const allStreamReports = useMemo<StreamProgressionReport[]>(() => {
    const reports: StreamProgressionReport[] = [];

    // Determine which classes have streamSettings, allocations, or assignments
    const classesToInclude = levelClasses.filter(cName => {
      if (selectedClassFilter !== 'All' && !isSameClass(cName, selectedClassFilter)) {
        return false;
      }
      if (selectedClassFilter !== 'All') return true;

      const hasSetting = streamSettings.some(s => s && isSameClass(s.className, cName));
      const hasAlloc = localAllocations.some(a => a && isSameClass(a.className, cName));
      const hasAsg = assignments.some(a => a && isSameClass(a.className, cName));
      return hasSetting || hasAlloc || hasAsg;
    });

    const finalClasses = classesToInclude.length > 0
      ? classesToInclude
      : (selectedClassFilter !== 'All' ? [selectedClassFilter] : ['Form 1', 'Form 2', 'Form 3', 'Form 4']);

    finalClasses.forEach(cName => {
      const streams = getAllStreamsForClassHelper(cName, streamSettings, assignments, localAllocations);
      streams.forEach(stName => {
        if (selectedStreamFilter !== 'All' && !isSameStream(stName, selectedStreamFilter)) {
          return;
        }
        const rep = computeStreamSubjectProgression(
          cName,
          stName,
          localAllocations,
          assignments,
          periodSettings,
          teachers,
          teacherAssignments
        );
        reports.push(rep);
      });
    });

    return reports.filter(rep => {
      if (statusFilter === 'INCOMPLETE_OR_MISSING') {
        return rep.missingSubjects.length > 0 || rep.incompleteSubjects.length > 0 || rep.totalRequiredSubjects === 0;
      }
      if (statusFilter === 'MISSING_ONLY') {
        return rep.missingSubjects.length > 0;
      }
      if (statusFilter === 'COMPLETE') {
        return rep.isFullyComplete;
      }
      return true;
    });
  }, [
    levelClasses,
    selectedClassFilter,
    selectedStreamFilter,
    statusFilter,
    streamSettings,
    localAllocations,
    assignments,
    periodSettings,
    teachers,
    teacherAssignments
  ]);

  // Global summary KPIs across all reports in current level/class filter
  const summaryMetrics = useMemo(() => {
    const totalStreams = allStreamReports.length;
    const configuredStreams = allStreamReports.filter(r => r.totalRequiredSubjects > 0).length;
    const fullyCompleteStreams = allStreamReports.filter(r => r.isFullyComplete).length;
    const totalMissingSubjectInstances = allStreamReports.reduce((s, r) => s + r.missingSubjects.length, 0);
    const totalIncompleteSubjectInstances = allStreamReports.reduce((s, r) => s + r.incompleteSubjects.length, 0);
    const totalRequiredPeriods = allStreamReports.reduce((s, r) => s + r.totalRequiredPeriods, 0);
    const totalEnteredPeriods = allStreamReports.reduce((s, r) => s + r.totalEnteredRegisteredPeriods, 0);
    const overallPct = totalRequiredPeriods > 0 ? Math.round((totalEnteredPeriods / totalRequiredPeriods) * 100) : 0;

    return {
      totalStreams,
      configuredStreams,
      fullyCompleteStreams,
      totalMissingSubjectInstances,
      totalIncompleteSubjectInstances,
      totalRequiredPeriods,
      totalEnteredPeriods,
      overallPct
    };
  }, [allStreamReports]);

  // Handle adding a single subject requirement for a class & stream
  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    const subjectClean = newSubject.trim();
    if (!subjectClean) return;

    const targetStream = newStream === 'CUSTOM' ? (customStreamInput.trim().toUpperCase() || 'STREAM A') : newStream;

    // Check if this subject already exists for this exact class & stream
    const existingIdx = localAllocations.findIndex(
      a =>
        isSameClass(a.className, newClass) &&
        ((targetStream === 'ALL_STREAMS' && a.stream === 'ALL_STREAMS') ||
          (targetStream !== 'ALL_STREAMS' && a.stream !== 'ALL_STREAMS' && isSameStream(a.stream, targetStream))) &&
        isSameSubjectName(a.subjectName || a.subject, subjectClean)
    );

    let next: SubjectPeriodAllocation[];
    if (existingIdx >= 0) {
      next = localAllocations.map((item, idx) =>
        idx === existingIdx
          ? { ...item, periodsPerWeek: Number(newPeriods), subject: subjectClean, subjectName: subjectClean }
          : item
      );
      commitAllocations(
        next,
        `Idadi ya vipindi vya ${subjectClean} kwa ${newClass} (${targetStream === 'ALL_STREAMS' ? 'Mikondo Yote' : targetStream}) imesahihishwa kuwa ${newPeriods}!`
      );
    } else {
      const newAlloc: SubjectPeriodAllocation = {
        id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        level: inferLevelFromClassName(newClass),
        className: newClass,
        stream: targetStream,
        subject: subjectClean,
        subjectName: subjectClean,
        periodsPerWeek: Number(newPeriods)
      };
      next = [...localAllocations, newAlloc];
      commitAllocations(
        next,
        `Somo la ${subjectClean} (${newPeriods} vipindi/wiki) limesajiliwa kwa ${newClass} (${targetStream === 'ALL_STREAMS' ? 'Mikondo Yote' : targetStream})!`
      );
    }
  };

  // Handle Bulk Multi-Subject Registration for selected Class & Stream
  const handleSaveBulkSubjects = () => {
    const entries = Object.entries(bulkSelectedSubjects).filter(([_, count]) => count > 0);
    if (entries.length === 0) {
      alert('Tafadhali weka alama ya tiki (✓) kwenye angalau somo moja unalotaka kusajili.');
      return;
    }

    const targetStream = newStream === 'CUSTOM' ? (customStreamInput.trim().toUpperCase() || 'STREAM A') : newStream;
    let next = [...localAllocations];

    entries.forEach(([subName, periods]) => {
      const existingIdx = next.findIndex(
        a =>
          isSameClass(a.className, newClass) &&
          ((targetStream === 'ALL_STREAMS' && a.stream === 'ALL_STREAMS') ||
            (targetStream !== 'ALL_STREAMS' && a.stream !== 'ALL_STREAMS' && isSameStream(a.stream, targetStream))) &&
          isSameSubjectName(a.subjectName || a.subject, subName)
      );

      if (existingIdx >= 0) {
        next[existingIdx] = {
          ...next[existingIdx],
          periodsPerWeek: Number(periods)
        };
      } else {
        next.push({
          id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${subName.replace(/\s+/g, '')}`,
          level: inferLevelFromClassName(newClass),
          className: newClass,
          stream: targetStream,
          subject: subName,
          subjectName: subName,
          periodsPerWeek: Number(periods)
        });
      }
    });

    commitAllocations(
      next,
      `Masomo ${entries.length} yamesajiliwa rasmi kwa ${newClass} (${targetStream === 'ALL_STREAMS' ? 'Mikondo Yote' : targetStream})!`
    );
    setBulkSelectedSubjects({});
    setShowBulkSelector(false);
  };

  // Quick register an unregistered subject directly from a stream progression card
  const handleQuickRegisterUnregistered = (className: string, stream: string, subject: string, periods: number) => {
    const newAlloc: SubjectPeriodAllocation = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      level: inferLevelFromClassName(className),
      className,
      stream,
      subject,
      subjectName: subject,
      periodsPerWeek: Math.max(1, periods)
    };
    commitAllocations(
      [...localAllocations, newAlloc],
      `Somo la ${subject} (${periods} vipindi) limesajiliwa kwenye ${className} ${stream}!`
    );
  };

  // Copy curriculum from current (newClass, newStream) to (copyTargetClass, copyTargetStream)
  const handleCopyCurriculum = () => {
    const sourceStream = newStream === 'CUSTOM' ? (customStreamInput.trim().toUpperCase() || 'STREAM A') : newStream;
    const sourceItems = localAllocations.filter(
      a =>
        isSameClass(a.className, newClass) &&
        (a.stream === 'ALL_STREAMS' || isSameStream(a.stream, sourceStream))
    );

    if (sourceItems.length === 0) {
      alert(`Hakuna masomo yaliyosajiliwa kwa ${newClass} (${sourceStream}) ya kunakili.`);
      return;
    }

    let next = [...localAllocations];
    sourceItems.forEach(src => {
      const subName = src.subjectName || src.subject;
      const existingIdx = next.findIndex(
        a =>
          isSameClass(a.className, copyTargetClass) &&
          ((copyTargetStream === 'ALL_STREAMS' && a.stream === 'ALL_STREAMS') ||
            (copyTargetStream !== 'ALL_STREAMS' && a.stream !== 'ALL_STREAMS' && isSameStream(a.stream, copyTargetStream))) &&
          isSameSubjectName(a.subjectName || a.subject, subName)
      );

      if (existingIdx >= 0) {
        next[existingIdx] = { ...next[existingIdx], periodsPerWeek: src.periodsPerWeek };
      } else {
        next.push({
          id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          level: inferLevelFromClassName(copyTargetClass),
          className: copyTargetClass,
          stream: copyTargetStream,
          subject: subName,
          subjectName: subName,
          periodsPerWeek: src.periodsPerWeek
        });
      }
    });

    commitAllocations(
      next,
      `Masomo ${sourceItems.length} yamenakiliwa kutoka ${newClass} (${sourceStream}) kwenda ${copyTargetClass} (${copyTargetStream})!`
    );
  };

  const handleDeleteAllocation = (id: string) => {
    const next = localAllocations.filter(a => a.id !== id);
    commitAllocations(next, 'Somo limeondolewa kwenye orodha ya mahitaji ya vipindi.');
  };

  const handlePeriodChange = (id: string, val: number) => {
    const safeVal = Math.max(1, Math.min(20, Number(val) || 1));
    const next = localAllocations.map(a => (a.id === id ? { ...a, periodsPerWeek: safeVal } : a));
    commitAllocations(next);
  };

  const handleJumpToStreamRegistration = (className: string, stream: string) => {
    setRegLevel(inferLevelFromClassName(className));
    setNewClass(className);
    setNewStream(stream);
    setSubView('register');
  };

  // Filtered allocations for the registration table
  const filteredRegAllocations = useMemo(() => {
    const targetStream = newStream === 'CUSTOM' ? customStreamInput.trim().toUpperCase() : newStream;
    return localAllocations.filter(a => {
      if (!isSameClass(a.className, newClass)) return false;
      if (targetStream && targetStream !== 'ALL_STREAMS') {
        return a.stream === 'ALL_STREAMS' || isSameStream(a.stream, targetStream);
      }
      return true;
    });
  }, [localAllocations, newClass, newStream, customStreamInput]);

  const allPopularSubjects = useMemo(() => SubjectRegistry.getPopular(), []);
  const filteredBulkSubjects = useMemo(() => {
    if (!bulkSearchQuery.trim()) return allPopularSubjects;
    const q = bulkSearchQuery.toLowerCase();
    return allPopularSubjects.filter(s => s.toLowerCase().includes(q));
  }, [allPopularSubjects, bulkSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Command Banner */}
      <div className="bg-gradient-to-r from-[#1f4d8b] via-blue-900 to-indigo-950 text-white p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs no-print">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
            <BarChart3 className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              Usajili wa Masomo kwa Kila Mkondo &amp; Kipimo cha Vipindi (Progression Report)
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Sajili masomo na idadi ya vipindi vinavyotakiwa kwa kila darasa/mkondo, kisha pima kama vipindi vimeingizwa sawa na kutambua masomo ambayo hayajaingizwa.
            </p>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-900/50 p-1 rounded-xl border border-white/15 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setSubView('progression')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                subView === 'progression'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>📊 Progression ya Madarasa (Classes)</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('teacher_progression')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                subView === 'teacher_progression'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>👨‍🏫 Progression ya Walimu (Teachers)</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('register')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                subView === 'register'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>📝 Sajili Masomo &amp; Vipindi vya Darasa/Mkondo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              exportProgressionReportPDF({
                reports: allStreamReports,
                schoolName,
                schoolInfo,
                levelFilter: activeLevel,
                classFilter: selectedClassFilter,
                streamFilter: selectedStreamFilter,
                statusFilter,
                mode: 'print'
              })
            }
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Chapisha Ripoti ya Maendeleo ya Upangaji wa Vipindi (Print Report)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Chapa Ripoti (Print)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportProgressionReportPDF({
                reports: allStreamReports,
                schoolName,
                schoolInfo,
                levelFilter: activeLevel,
                classFilter: selectedClassFilter,
                streamFilter: selectedStreamFilter,
                statusFilter,
                mode: 'download'
              })
            }
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Pakua Ripoti ya Maendeleo ya Upangaji wa Vipindi katika mfumo wa PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pakua PDF (Export PDF)</span>
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{savedToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW: RIPOTI YA PROGRESSION YA WAALIMU (TEACHER PROGRESSION REPORT)    */}
      {/* ===================================================================== */}
      {subView === 'teacher_progression' && (
        <TeacherProgressionReportModule
          teachers={teachers}
          assignments={assignments}
          allocations={localAllocations}
          periodSettings={periodSettings}
          teacherAssignments={teacherAssignments}
          schoolName={schoolName}
          schoolInfo={schoolInfo}
          onNavigateToTeacherEntry={() => {
            // Can be extended or handled via callbacks
          }}
          onNavigateToGeneralTimetable={(cls, st) => {
            if (onNavigateToGeneralTimetable) {
              onNavigateToGeneralTimetable(cls, st);
            }
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: USAJILI WA MASOMO NA VIPINDI KWA KILA DARASA & MKONDO          */}
      {/* ===================================================================== */}
      {subView === 'register' && (
        <div className="space-y-6 no-print">
          {/* Step 1: Class & Stream Selection + Single Subject Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>1. Chagua Darasa na Mkondo wa Kusajili Masomo Yanayotakiwa Kusomwa</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unaweza kusajili masomo kwa mkondo maalum (mf. STREAM A, STREAM B, PCM) au kwa mikondo yote ya darasa husika.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Pre-populate bulk selector with currently registered subjects for this class/stream
                    const preselected: Record<string, number> = {};
                    filteredRegAllocations.forEach(a => {
                      const sName = a.subjectName || a.subject;
                      preselected[sName] = a.periodsPerWeek;
                    });
                    setBulkSelectedSubjects(preselected);
                    setShowBulkSelector(prev => !prev);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border ${
                    showBulkSelector
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{showBulkSelector ? 'Funga Orodha ya Kuchagua Mengi' : '☑️ Chagua Masomo Mengi kwa Pamoja (Checklist)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassFilter(newClass);
                    setSelectedStreamFilter(newStream === 'ALL_STREAMS' ? 'All' : newStream);
                    setSubView('progression');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Tazama Ripoti ya {newClass}</span>
                </button>
              </div>
            </div>

            {/* Level Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1">Ngazi ya Elimu:</span>
              {(
                [
                  { id: 'SECONDARY', label: 'Sekondari (Form 1 - 6)' },
                  { id: 'PRIMARY', label: 'Msingi (Standard 1 - 7)' },
                  { id: 'NURSERY', label: 'Awali (Nursery)' }
                ] as const
              ).map(lvl => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setRegLevel(lvl.id);
                    if (lvl.id === 'NURSERY') {
                      setNewClass(NURSERY_CLASSES[0] || 'Baby Class');
                    } else if (lvl.id === 'PRIMARY') {
                      setNewClass(PRIMARY_CLASSES[0] || 'Standard 1');
                    } else {
                      setNewClass(SECONDARY_CLASSES[0] || 'Form 1');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    regLevel === lvl.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            {/* Single Subject Add Form */}
            <form
              onSubmit={handleAddAllocation}
              className="bg-slate-50 border border-slate-200/90 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
            >
              <div className="lg:col-span-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                  Darasa (Class)
                </label>
                <select
                  value={newClass}
                  onChange={e => {
                    const cls = e.target.value;
                    setNewClass(cls);
                    const streams = getAllStreamsForClassHelper(cls, streamSettings, assignments, localAllocations);
                    if (streams.length > 0 && newStream !== 'ALL_STREAMS') {
                      setNewStream(streams[0]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                >
                  {regLevelClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                  Mkondo (Stream)
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={newStream}
                    onChange={e => setNewStream(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="ALL_STREAMS">🏫 Mikondo Yote ya {newClass}</option>
                    {availableStreamsForNewClass.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                    <option value="CUSTOM">+ Andika Mkondo Mpya...</option>
                  </select>
                  {newStream === 'CUSTOM' && (
                    <input
                      type="text"
                      value={customStreamInput}
                      onChange={e => setCustomStreamInput(e.target.value)}
                      placeholder="Mf. STREAM D"
                      className="w-32 px-2.5 py-2 bg-white border border-blue-400 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="lg:col-span-4">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                  Somo (Chagua au Andika Somo)
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={allPopularSubjects.includes(newSubject) ? newSubject : ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val) {
                        setNewSubject(val);
                        if (DEFAULT_SUBJECT_PERIODS[val]) {
                          setNewPeriods(DEFAULT_SUBJECT_PERIODS[val]);
                        }
                      }
                    }}
                    className="flex-1 px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="">-- Chagua Somo --</option>
                    {allPopularSubjects.map(subName => (
                      <option key={subName} value={subName}>{subName}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none"
                    placeholder="Au andika somo..."
                  />
                </div>
              </div>

              <div className="lg:col-span-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                  Vipindi/Wiki
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newPeriods}
                  onChange={e => setNewPeriods(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none text-center"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer h-[38px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sajili Somo</span>
                </button>
              </div>
            </form>

            {/* Collapsible Bulk Multi-Subject Checklist Selector */}
            {showBulkSelector && (
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span>
                        Chagua Masomo Yote Yanayosomwa na{' '}
                        <span className="underline">{newClass} ({newStream === 'ALL_STREAMS' ? 'Mikondo Yote' : newStream})</span>
                      </span>
                    </h4>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      Weka tiki kwenye masomo wanayotakiwa kusoma na weka idadi ya vipindi kwa wiki kwa kila somo, kisha bonyeza "Hifadhi Masomo Yote".
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const coreOlevel = [
                          'Basic Mathematics',
                          'English Language',
                          'Kiswahili',
                          'Biology',
                          'Chemistry',
                          'Physics',
                          'Geography',
                          'History',
                          'Civics'
                        ];
                        const nextBulk = { ...bulkSelectedSubjects };
                        coreOlevel.forEach(s => {
                          nextBulk[s] = DEFAULT_SUBJECT_PERIODS[s] || 4;
                        });
                        setBulkSelectedSubjects(nextBulk);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      + Masomo 9 ya Msingi Sekondari (Core O-Level)
                    </button>

                    <input
                      type="text"
                      value={bulkSearchQuery}
                      onChange={e => setBulkSearchQuery(e.target.value)}
                      placeholder="Tafuta somo..."
                      className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-y-auto p-1">
                  {filteredBulkSubjects.map(subName => {
                    const isChecked = bulkSelectedSubjects[subName] !== undefined && bulkSelectedSubjects[subName] > 0;
                    const periodVal = bulkSelectedSubjects[subName] || DEFAULT_SUBJECT_PERIODS[subName] || 4;

                    return (
                      <div
                        key={subName}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isChecked
                            ? 'bg-white border-indigo-500 shadow-2xs'
                            : 'bg-white/70 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setBulkSelectedSubjects(prev => ({
                                  ...prev,
                                  [subName]: DEFAULT_SUBJECT_PERIODS[subName] || 4
                                }));
                              } else {
                                setBulkSelectedSubjects(prev => {
                                  const copy = { ...prev };
                                  delete copy[subName];
                                  return copy;
                                });
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <span className="truncate" title={subName}>{subName}</span>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={periodVal}
                              onChange={e => {
                                const v = Math.max(1, Number(e.target.value) || 1);
                                setBulkSelectedSubjects(prev => ({
                                  ...prev,
                                  [subName]: v
                                }));
                              }}
                              className="w-12 px-1.5 py-1 text-center text-xs font-black bg-indigo-50 border border-indigo-300 rounded-lg text-indigo-950"
                              title="Idadi ya vipindi kwa wiki"
                            />
                            <span className="text-[10px] font-bold text-slate-500">vip</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200">
                  <span className="text-xs font-bold text-indigo-900">
                    Masomo Yaliyochaguliwa: <strong>{Object.keys(bulkSelectedSubjects).length}</strong> • Jumla ya Vipindi:{' '}
                    <strong>{Object.values(bulkSelectedSubjects).reduce((a, b) => a + b, 0)} vipindi/wiki</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkSelector(false)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white rounded-lg cursor-pointer"
                    >
                      Ghairi
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBulkSubjects}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        Hifadhi Masomo Yote ({Object.keys(bulkSelectedSubjects).length}) kwa {newClass} ({newStream === 'ALL_STREAMS' ? 'Mikondo Yote' : newStream})
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Registered Subjects Table for Selected Class & Stream + Copy Tool */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                    Masomo Yaliyosajiliwa kwa {newClass} — {newStream === 'ALL_STREAMS' ? 'Mikondo Yote' : newStream} ({filteredRegAllocations.length})
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Jumla ya Vipindi Vinavyohitajika kwa Wiki:{' '}
                    <strong className="text-blue-700">
                      {filteredRegAllocations.reduce((s, a) => s + (Number(a.periodsPerWeek) || 0), 0)} Vipindi
                    </strong>
                  </p>
                </div>

                {/* Copy to another stream/class */}
                {filteredRegAllocations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 px-1">
                      <Copy className="w-3.5 h-3.5 text-blue-600" /> Nakili kwenda:
                    </span>
                    <select
                      value={copyTargetClass}
                      onChange={e => setCopyTargetClass(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      {DEFAULT_CLASSES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={copyTargetStream}
                      onChange={e => setCopyTargetStream(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="ALL_STREAMS">Mikondo Yote</option>
                      {getAllStreamsForClassHelper(copyTargetClass, streamSettings, assignments, localAllocations).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                      <option value="STREAM B">STREAM B</option>
                      <option value="STREAM C">STREAM C</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCopyCurriculum}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      Nakili Sasa
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Darasa</th>
                      <th className="p-3">Mkondo (Stream)</th>
                      <th className="p-3">Somo</th>
                      <th className="p-3 text-center w-40">Vipindi Vinavyotakiwa / Wiki</th>
                      <th className="p-3 text-center w-24">Ondoa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRegAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400">
                          Bado hujasajili masomo kwa <strong>{newClass} ({newStream === 'ALL_STREAMS' ? 'Mikondo Yote' : newStream})</strong>.
                          Tumia fomu ya hapo juu au bonyeza kitufe cha <strong>"Chagua Masomo Mengi kwa Pamoja"</strong>.
                        </td>
                      </tr>
                    ) : (
                      filteredRegAllocations.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-900">{item.className}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              item.stream === 'ALL_STREAMS'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.stream === 'ALL_STREAMS' ? 'MIKONDO YOTE' : item.stream}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{item.subjectName || item.subject}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={item.periodsPerWeek}
                              onChange={e => handlePeriodChange(item.id, Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteAllocation(item.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Futa somo hili"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: RIPOTI YA MAENDELEO YA VIPINDI (PROGRESSION REPORT)           */}
      {/* ===================================================================== */}
      {subView === 'progression' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Wastani wa Uingizaji Vipindi
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-blue-700">{summaryMetrics.overallPct}%</span>
                <span className="text-xs font-bold text-slate-500">
                  {summaryMetrics.totalEnteredPeriods} / {summaryMetrics.totalRequiredPeriods} vipindi
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    summaryMetrics.overallPct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, summaryMetrics.overallPct)}%` }}
                />
              </div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                Mikondo Iliyokamilika Sawa
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-700">
                  {summaryMetrics.fullyCompleteStreams} / {summaryMetrics.configuredStreams || summaryMetrics.totalStreams}
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">
                Masomo na vipindi vyote 100% sawa
              </span>
            </div>

            <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                Masomo Ambayo Hayajaingizwa
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-rose-600">
                  {summaryMetrics.totalMissingSubjectInstances}
                </span>
                <XCircle className="w-5 h-5 text-rose-500" />
              </div>
              <span className="text-[11px] text-rose-700 font-semibold block mt-1">
                Masomo yaliyosajiliwa yenye vipindi 0
              </span>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                Masomo Yenye Vipindi Pungufu
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-600">
                  {summaryMetrics.totalIncompleteSubjectInstances}
                </span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-[11px] text-amber-800 font-semibold block mt-1">
                Vimeingizwa pungufu ya mahitaji
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Ongeza / Hariri Masomo
              </span>
              <button
                type="button"
                onClick={() => setSubView('register')}
                className="mt-2 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Sajili Masomo ya Mkondo</span>
              </button>
            </div>
          </div>

          {/* Filter Bar for Progression Report */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(
                  [
                    { id: 'ALL', label: 'Ngazi Zote' },
                    { id: 'SECONDARY', label: 'Sekondari' },
                    { id: 'PRIMARY', label: 'Msingi' },
                    { id: 'NURSERY', label: 'Awali' }
                  ] as const
                ).map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setActiveLevel(lvl.id);
                      setSelectedClassFilter('All');
                      setSelectedStreamFilter('All');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      activeLevel === lvl.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Darasa:</span>
                <select
                  value={selectedClassFilter}
                  onChange={e => {
                    setSelectedClassFilter(e.target.value);
                    setSelectedStreamFilter('All');
                  }}
                  className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                >
                  <option value="All">Madarasa Yote</option>
                  {levelClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Stream Filter */}
              {selectedClassFilter !== 'All' && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Mkondo:</span>
                  <select
                    value={selectedStreamFilter}
                    onChange={e => setSelectedStreamFilter(e.target.value)}
                    className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="All">Mikondo Yote</option>
                    {availableStreamsForFilterClass.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Status Filter & Quick Print / Export PDF Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Chuja Hali:</span>
              {(
                [
                  { id: 'ALL', label: 'Mikondo Yote' },
                  { id: 'INCOMPLETE_OR_MISSING', label: '⚠️ Yenye Upungufu / Bado' },
                  { id: 'MISSING_ONLY', label: '❌ Masomo Hayajaingizwa' },
                  { id: 'COMPLETE', label: '✅ Iliyokamilika 100%' }
                ] as const
              ).map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    statusFilter === st.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    exportProgressionReportPDF({
                      reports: allStreamReports,
                      schoolName,
                      schoolInfo,
                      levelFilter: activeLevel,
                      classFilter: selectedClassFilter,
                      streamFilter: selectedStreamFilter,
                      statusFilter,
                      mode: 'print'
                    })
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                  title="Chapisha Ripoti (Print)"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportProgressionReportPDF({
                      reports: allStreamReports,
                      schoolName,
                      schoolInfo,
                      levelFilter: activeLevel,
                      classFilter: selectedClassFilter,
                      streamFilter: selectedStreamFilter,
                      statusFilter,
                      mode: 'download'
                    })
                  }
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Pakua Ripoti kwenye PDF (Export PDF)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>

          <div id="progression-printable-view" className="space-y-6">
            {/* Printable Progression Report Header (Print Only) */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
              <h1 className="text-lg font-black uppercase text-slate-900">{schoolInfo?.name || schoolName}</h1>
              <p className="text-xs font-bold text-slate-700 uppercase">
                RIPOTI YA MAENDELEO YA UPANGAJI WA VIPINDI KWA KILA DARASA NA MKONDO (TIMETABLE PROGRESSION REPORT)
              </p>
              <p className="text-[10px] text-slate-500">
                Darasa: {selectedClassFilter === 'All' ? 'Madarasa Yote' : selectedClassFilter} • Mkondo:{' '}
                {selectedStreamFilter === 'All' ? 'Mikondo Yote' : selectedStreamFilter} • Tarehe:{' '}
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Visual Progression Report Module (Subject Percentage Completion + Stream Gap Cards) */}
            <ProgressionReportModule
              reports={allStreamReports}
              schoolName={schoolName}
              schoolInfo={schoolInfo}
              levelFilter={activeLevel}
              classFilter={selectedClassFilter}
              streamFilter={selectedStreamFilter}
              statusFilter={statusFilter}
              onConfigureStreamSubjects={(cls, st) => handleJumpToStreamRegistration(cls, st)}
              onQuickRegisterUnregistered={(cls, st, sub, per) =>
                handleQuickRegisterUnregistered(cls, st, sub, per)
              }
              onNavigateToGeneralTimetable={onNavigateToGeneralTimetable}
            />

            {/* Detailed Editable Stream-by-Stream Progression Cards */}
            <div className="space-y-6">
            {allStreamReports.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-black text-slate-800">Hakuna Mikondo Inayolingana na Kichujio Hiki</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Badilisha kichujio cha Darasa au Hali, au bonyeza kitufe cha kusajili masomo na vipindi kwa darasa husika.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSubView('register');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sajili Masomo ya Darasa / Mkondo</span>
                </button>
              </div>
            ) : (
              allStreamReports.map(report => {
                const streamKey = `${report.className}_${report.stream}`;
                const totalRemaining = report.subjects.reduce((s, item) => s + item.remainingPeriods, 0);

                return (
                  <div
                    key={streamKey}
                    className={`bg-white rounded-2xl border shadow-xs overflow-hidden print-avoid-break ${
                      report.isFullyComplete
                        ? 'border-emerald-300'
                        : report.missingSubjects.length > 0
                        ? 'border-rose-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Stream Card Header */}
                    <div
                      className={`p-4 sm:p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        report.isFullyComplete
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : report.missingSubjects.length > 0
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black uppercase tracking-wide">
                            {report.className} — {report.stream}
                          </span>

                          {report.totalRequiredSubjects === 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Masomo Yanayotakiwa Kusomwa Hayajasajiliwa Bado</span>
                            </span>
                          ) : report.isFullyComplete ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✅ Vipindi Vyote Vimeingizwa Sawa (100% Complete)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                Bado Vipindi {totalRemaining} Kuingizwa ({report.overallPercentage}% Imekamilika)
                              </span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 font-medium">
                          Masomo Yaliyosajiliwa: <strong className="text-slate-900">{report.totalRequiredSubjects}</strong> •
                          Masomo Yaliyokamilika: <strong className="text-emerald-700">{report.exactMatchSubjectsCount}/{report.totalRequiredSubjects}</strong> •
                          Masomo Hayajaingizwa Kabisa: <strong className="text-rose-600">{report.missingSubjects.length}</strong> •
                          Vipindi Vilivyoingizwa: <strong className="text-blue-700">{report.totalEnteredRegisteredPeriods} / {report.totalRequiredPeriods}</strong>
                        </p>
                      </div>

                      {/* Progress Bar & Quick Register Button */}
                      <div className="flex flex-wrap items-center gap-3">
                        {report.totalRequiredSubjects > 0 && (
                          <div className="w-44 sm:w-52 bg-white p-2.5 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between text-[11px] font-black mb-1">
                              <span className="text-slate-600">Maendeleo (Progress)</span>
                              <span className={report.isFullyComplete ? 'text-emerald-700' : 'text-blue-700'}>
                                {report.overallPercentage}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  report.isFullyComplete
                                    ? 'bg-emerald-500'
                                    : report.overallPercentage >= 70
                                    ? 'bg-blue-600'
                                    : report.overallPercentage >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, report.overallPercentage)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            exportProgressionReportPDF({
                              reports: [report],
                              schoolName,
                              schoolInfo,
                              levelFilter: activeLevel,
                              classFilter: report.className,
                              streamFilter: report.stream,
                              statusFilter,
                              mode: 'print'
                            })
                          }
                          className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                          title={`Chapisha Ripoti ya ${report.className} (${report.stream})`}
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-700" />
                          <span>Print</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            exportProgressionReportPDF({
                              reports: [report],
                              schoolName,
                              schoolInfo,
                              levelFilter: activeLevel,
                              classFilter: report.className,
                              streamFilter: report.stream,
                              statusFilter,
                              mode: 'download'
                            })
                          }
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                          title={`Pakua PDF ya Ripoti ya ${report.className} (${report.stream})`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleJumpToStreamRegistration(report.className, report.stream)}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>+ Sajili / Hariri Masomo ya {report.stream}</span>
                        </button>
                      </div>
                    </div>

                    {/* Alert Highlights for Missing or Incomplete Subjects */}
                    {(report.missingSubjects.length > 0 || report.incompleteSubjects.length > 0) && (
                      <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {report.missingSubjects.length > 0 && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                            <div className="flex items-center gap-1.5 text-rose-900 font-black text-xs">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Masomo Ambayo Hayajaingizwa Kabisa Kwenye Ratiba ({report.missingSubjects.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {report.missingSubjects.map(ms => (
                                <span
                                  key={ms.allocationId}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[11px] font-bold shadow-2xs"
                                >
                                  {ms.subject} <strong className="text-rose-600">(0 / {ms.requiredPeriods} vipindi)</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {report.incompleteSubjects.length > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Masomo Yenye Vipindi Pungufu ({report.incompleteSubjects.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {report.incompleteSubjects.map(inc => (
                                <span
                                  key={inc.allocationId}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs"
                                >
                                  {inc.subject}: Imeingizwa <strong>{inc.enteredPeriods}/{inc.requiredPeriods}</strong>{' '}
                                  <span className="text-rose-600 font-black">(Bado {inc.remainingPeriods})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detailed Subject-by-Subject Progression Table */}
                    {report.totalRequiredSubjects === 0 ? (
                      <div className="p-6 text-center space-y-3">
                        <p className="text-xs text-slate-600">
                          Mkondo wa <strong>{report.className} — {report.stream}</strong> bado haujasajiliwa orodha ya masomo na idadi ya vipindi vinavyotakiwa kusomwa kwa wiki.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleJumpToStreamRegistration(report.className, report.stream)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Sajili Masomo ya {report.className} ({report.stream}) Sasa</span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="p-3">#</th>
                              <th className="p-3">Somo (Registered Subject)</th>
                              <th className="p-3">Mwalimu Kwenye Ratiba</th>
                              <th className="p-3 text-center">Vinavyotakiwa (Wiki)</th>
                              <th className="p-3 text-center">Vilivyoingizwa</th>
                              <th className="p-3 text-center">Upungufu / Baki</th>
                              <th className="p-3 w-44">Kipimo cha Uingizaji</th>
                              <th className="p-3 text-center">Hali (Status)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {report.subjects.map((sub, idx) => (
                              <tr
                                key={sub.allocationId}
                                className={`hover:bg-slate-50/80 transition ${
                                  sub.status === 'MISSING'
                                    ? 'bg-rose-50/30'
                                    : sub.status === 'INCOMPLETE'
                                    ? 'bg-amber-50/20'
                                    : ''
                                }`}
                              >
                                <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-3">
                                  <div className="font-black text-slate-900">{sub.subject}</div>
                                  <span className="text-[10px] text-slate-400">
                                    {sub.isStreamSpecific ? `Mahsusi kwa ${report.stream}` : `Mikondo yote ya ${report.className}`}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {sub.assignedTeachers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {sub.assignedTeachers.map(tName => (
                                        <span
                                          key={tName}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold"
                                        >
                                          <User className="w-3 h-3 text-blue-600" />
                                          {tName}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-rose-500 font-bold text-[11px] italic">
                                      Hajapangwa bado
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={sub.requiredPeriods}
                                    onChange={e => handlePeriodChange(sub.allocationId, Number(e.target.value))}
                                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Badilisha idadi ya vipindi vinavyotakiwa kwa wiki"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg font-black text-xs ${
                                      sub.status === 'COMPLETE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sub.status === 'MISSING'
                                        ? 'bg-rose-100 text-rose-800'
                                        : sub.status === 'INCOMPLETE'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {sub.enteredPeriods}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-black">
                                  {sub.status === 'COMPLETE' ? (
                                    <span className="text-emerald-600">0 (Sawa)</span>
                                  ) : sub.status === 'MISSING' || sub.status === 'INCOMPLETE' ? (
                                    <span className="text-rose-600">Bado {sub.remainingPeriods}</span>
                                  ) : (
                                    <span className="text-blue-600">Ziada +{sub.excessPeriods}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          sub.status === 'COMPLETE'
                                            ? 'bg-emerald-500'
                                            : sub.status === 'MISSING'
                                            ? 'bg-rose-500'
                                            : sub.status === 'INCOMPLETE'
                                            ? 'bg-amber-500'
                                            : 'bg-blue-600'
                                        }`}
                                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-700 w-9 text-right">
                                      {sub.percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  {sub.status === 'COMPLETE' && (
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>IMEKAMILIKA SAWA</span>
                                    </span>
                                  )}
                                  {sub.status === 'MISSING' && (
                                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] inline-flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      <span>HAIJAINGIZWA (0/{sub.requiredPeriods})</span>
                                    </span>
                                  )}
                                  {sub.status === 'INCOMPLETE' && (
                                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] inline-flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>PUNGUFU (-{sub.remainingPeriods})</span>
                                    </span>
                                  )}
                                  {sub.status === 'EXCESS' && (
                                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] inline-flex items-center gap-1">
                                      <span>ZIADA (+{sub.excessPeriods})</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Unregistered Subjects Entered in Timetable for this Stream */}
                    {report.unregisteredSubjects.length > 0 && (
                      <div className="p-4 bg-blue-50/60 border-t border-blue-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-blue-950 block">
                            ℹ️ Masomo Yaliyoingizwa Kwenye Ratiba ya {report.className} ({report.stream}) Lakini Bado Hayajasajiliwa Kwenye Mahitaji ya Mkondo:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {report.unregisteredSubjects.map(u => (
                              <div
                                key={u.subject}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-blue-200 text-xs font-bold text-slate-800 shadow-2xs"
                              >
                                <span>
                                  {u.subject} <strong className="text-blue-700">({u.enteredPeriods} vipindi)</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickRegisterUnregistered(
                                      report.className,
                                      report.stream,
                                      u.subject,
                                      u.enteredPeriods
                                    )
                                  }
                                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-black cursor-pointer no-print"
                                  title="Sajili somo hili kwenye mahitaji ya mkondo huu"
                                >
                                  + Sajili ({u.enteredPeriods} vip)
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
