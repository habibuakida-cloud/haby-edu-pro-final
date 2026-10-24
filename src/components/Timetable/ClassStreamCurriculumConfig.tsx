import React, { useState, useMemo } from 'react';
import {
  Layers,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  User,
  Users,
  Printer,
  Download,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckSquare
} from 'lucide-react';
import {
  StreamSetting,
  SubjectPeriodAllocation,
  TimetableAssignment,
  PeriodSetting,
  Teacher,
  TeacherAssignment,
  EducationLevel,
  SchoolInfo
} from '../../types';
import { DEFAULT_CLASSES } from '../../constants/defaults';
import { SubjectRegistry } from '../../constants/SubjectRegistry';
import { isSameClass } from '../../utils/reportCardUtils';
import {
  computeStreamSubjectProgression,
  inferLevelFromClassName,
  isSameStream,
  isSameSubjectName,
  normalizeStreamName
} from '../../lib/timetableService';
import { exportProgressionReportPDF } from '../../utils/timetablePdfExport';

interface ClassStreamCurriculumConfigProps {
  streamSettings: StreamSetting[];
  subjectPeriodAllocations: SubjectPeriodAllocation[];
  assignments: TimetableAssignment[];
  periodSettings: PeriodSetting[];
  teachers: Teacher[];
  teacherAssignments?: TeacherAssignment[];
  schoolName?: string;
  schoolInfo?: SchoolInfo;
  onUpdateStreamSettings: (settings: StreamSetting[]) => void;
  onUpdateSubjectPeriodAllocations: (allocations: SubjectPeriodAllocation[]) => void;
  onUpdateTeacherAssignments?: (assignments: TeacherAssignment[]) => void;
  onOpenProgressionReport?: (className: string, stream: string) => void;
  onOpenTeacherProgressionReport?: () => void;
  onNavigateToGeneralTimetable?: (className: string, stream: string, subject?: string) => void;
}

const DEFAULT_EXPECTED_PERIODS: Record<string, number> = {
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
  'General Studies': 3,
  'Advanced Mathematics': 8,
  'Economics': 6,
  'Accountancy': 6,
  'Science and Technology': 4,
  'Social Studies': 3,
  'Civic and Moral Education': 3
};

const ALEVEL_COMBINATION_PRESETS: Record<string, { subject: string; periods: number }[]> = {
  PCM: [
    { subject: 'Physics', periods: 8 },
    { subject: 'Chemistry', periods: 8 },
    { subject: 'Advanced Mathematics', periods: 8 },
    { subject: 'General Studies', periods: 3 }
  ],
  PCB: [
    { subject: 'Physics', periods: 8 },
    { subject: 'Chemistry', periods: 8 },
    { subject: 'Biology', periods: 8 },
    { subject: 'General Studies', periods: 3 },
    { subject: 'Basic Applied Mathematics', periods: 3 }
  ],
  CBG: [
    { subject: 'Chemistry', periods: 8 },
    { subject: 'Biology', periods: 8 },
    { subject: 'Geography', periods: 8 },
    { subject: 'General Studies', periods: 3 },
    { subject: 'Basic Applied Mathematics', periods: 3 }
  ],
  HGE: [
    { subject: 'History', periods: 8 },
    { subject: 'Geography', periods: 8 },
    { subject: 'Economics', periods: 8 },
    { subject: 'General Studies', periods: 3 },
    { subject: 'Basic Applied Mathematics', periods: 3 }
  ],
  HGL: [
    { subject: 'History', periods: 8 },
    { subject: 'Geography', periods: 8 },
    { subject: 'English Language', periods: 8 },
    { subject: 'General Studies', periods: 3 }
  ],
  HKL: [
    { subject: 'History', periods: 8 },
    { subject: 'Kiswahili', periods: 8 },
    { subject: 'English Language', periods: 8 },
    { subject: 'General Studies', periods: 3 }
  ]
};

export const ClassStreamCurriculumConfig: React.FC<ClassStreamCurriculumConfigProps> = ({
  streamSettings = [],
  subjectPeriodAllocations = [],
  assignments = [],
  periodSettings = [],
  teachers = [],
  teacherAssignments = [],
  schoolName = 'HABY EDUPRO',
  schoolInfo,
  onUpdateStreamSettings,
  onUpdateSubjectPeriodAllocations,
  onUpdateTeacherAssignments,
  onOpenProgressionReport,
  onOpenTeacherProgressionReport,
  onNavigateToGeneralTimetable
}) => {
  // Stream creation form state
  const [newStreamClass, setNewStreamClass] = useState<string>('Form 1');
  const [newStreamLevel, setNewStreamLevel] = useState<EducationLevel>('CSEE');
  const [newStreamNames, setNewStreamNames] = useState<string>('STREAM A, STREAM B');
  const [autoSeedCurriculumOnSave, setAutoSeedCurriculumOnSave] = useState<boolean>(true);

  // Active expanded Class + Stream for Progression & Expected Period Count configuration
  const [activeConfigClass, setActiveConfigClass] = useState<string>(
    streamSettings[0]?.className || 'Form 1'
  );
  const [activeConfigStream, setActiveConfigStream] = useState<string>(
    streamSettings[0]?.streams?.[0] || 'STREAM A'
  );
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState<boolean>(true);
  const [showAllStreamsProgressionView, setShowAllStreamsProgressionView] = useState<boolean>(false);

  // Add Required Subject form state
  const [subjectToAdd, setSubjectToAdd] = useState<string>('Basic Mathematics');
  const [expectedPeriodsToAdd, setExpectedPeriodsToAdd] = useState<number>(6);
  const [teacherToAdd, setTeacherToAdd] = useState<number | ''>('');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const allSubjectsList = useMemo(() => SubjectRegistry.getPopular(), []);

  const showNotice = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 4500);
  };

  // Get streams for the selected activeConfigClass
  const streamsForActiveClass = useMemo(() => {
    const found = streamSettings.find(s => isSameClass(s.className, activeConfigClass));
    if (found && found.streams.length > 0) {
      return found.streams;
    }
    return ['STREAM A', 'STREAM B'];
  }, [streamSettings, activeConfigClass]);

  // Ensure activeConfigStream is valid when activeConfigClass changes
  React.useEffect(() => {
    if (streamsForActiveClass.length > 0) {
      if (
        activeConfigStream !== 'ALL_STREAMS' &&
        !streamsForActiveClass.some(s => isSameStream(s, activeConfigStream))
      ) {
        setActiveConfigStream(streamsForActiveClass[0]);
      }
    }
  }, [streamsForActiveClass, activeConfigStream]);

  // Helper: Get standard subjects for a class level
  const getStandardSubjectsForClass = (clsName: string, stName: string = 'STREAM A') => {
    const level = inferLevelFromClassName(clsName);
    if (level === 'PRIMARY') {
      return [
        { subject: 'Mathematics', periods: 6 },
        { subject: 'English Language', periods: 6 },
        { subject: 'Kiswahili', periods: 5 },
        { subject: 'Science and Technology', periods: 4 },
        { subject: 'Social Studies', periods: 3 },
        { subject: 'Civic and Moral Education', periods: 3 }
      ];
    }
    if (clsName.includes('Form 5') || clsName.includes('Form 6')) {
      const comboKey = stName.trim().toUpperCase();
      return ALEVEL_COMBINATION_PRESETS[comboKey] || ALEVEL_COMBINATION_PRESETS.PCM;
    }
    // Default O-Level (Secondary)
    return [
      { subject: 'Basic Mathematics', periods: 6 },
      { subject: 'English Language', periods: 5 },
      { subject: 'Kiswahili', periods: 4 },
      { subject: 'Biology', periods: 4 },
      { subject: 'Chemistry', periods: 4 },
      { subject: 'Physics', periods: 4 },
      { subject: 'Geography', periods: 3 },
      { subject: 'History', periods: 3 },
      { subject: 'Civics', periods: 3 }
    ];
  };

  // Save Class Stream Settings and automatically initialize curriculum progression for each stream
  const handleSaveStreams = () => {
    const streamList = newStreamNames
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    if (!streamList.length) return;

    const existingIndex = streamSettings.findIndex(s => isSameClass(s.className, newStreamClass));
    let updated: StreamSetting[];
    if (existingIndex > -1) {
      const copy = [...streamSettings];
      copy[existingIndex] = {
        ...copy[existingIndex],
        level: newStreamLevel,
        streams: streamList
      };
      updated = copy;
    } else {
      updated = [
        ...streamSettings,
        {
          id: Date.now(),
          className: newStreamClass,
          level: newStreamLevel,
          streams: streamList
        }
      ];
    }
    onUpdateStreamSettings(updated);
    setActiveConfigClass(newStreamClass);
    setActiveConfigStream(streamList[0] || 'STREAM A');

    // Auto-seed curriculum period requirements for each newly registered stream if enabled
    if (autoSeedCurriculumOnSave) {
      let nextAllocs = [...subjectPeriodAllocations];
      let addedCount = 0;

      streamList.forEach(st => {
        const standardSubs = getStandardSubjectsForClass(newStreamClass, st);
        standardSubs.forEach(({ subject, periods }) => {
          const exists = nextAllocs.some(
            a =>
              isSameClass(a.className, newStreamClass) &&
              isSameStream(a.stream, st) &&
              isSameSubjectName(a.subjectName || a.subject, subject)
          );
          if (!exists) {
            nextAllocs.push({
              id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${subject.replace(/\s+/g, '')}`,
              level: inferLevelFromClassName(newStreamClass),
              className: newStreamClass,
              stream: st,
              subject,
              subjectName: subject,
              periodsPerWeek: periods
            });
            addedCount++;
          }
        });
      });

      if (addedCount > 0) {
        onUpdateSubjectPeriodAllocations(nextAllocs);
        showNotice(
          `Mikondo ya ${newStreamClass} (${streamList.join(', ')}) imesajiliwa! Masomo ${addedCount} na idadi ya vipindi vya kila mkondo vimepangwa kiotomatiki chini kwenye Progression.`
        );
        return;
      }
    }

    showNotice(`Mikondo ya ${newStreamClass} (${streamList.join(', ')}) imehifadhiwa kikamilifu!`);
  };

  // Assign or update teacher for a specific subject & stream
  const handleAssignTeacherToSubjectStream = (
    targetClass: string,
    targetStream: string,
    subject: string,
    teacherId: number
  ) => {
    if (!onUpdateTeacherAssignments) return;
    const tObj = teachers.find(t => Number(t.id) === Number(teacherId));
    const teacherName = tObj ? tObj.name || tObj.initial : `Teacher #${teacherId}`;

    const currentList = Array.isArray(teacherAssignments) ? [...teacherAssignments] : [];
    const existingIndex = currentList.findIndex(ta => Number(ta.teacherId) === Number(teacherId));

    let updatedList: TeacherAssignment[];
    if (existingIndex >= 0) {
      updatedList = currentList.map((ta, idx) => {
        if (idx === existingIndex) {
          const nextSubs = Array.from(new Set([...(ta.subjects || []), subject]));
          const nextStreams = Array.from(
            new Set([...(ta.streams || []), targetStream, `${targetClass} ${targetStream}`])
          );
          return {
            ...ta,
            subjects: nextSubs,
            streams: nextStreams
          };
        }
        return ta;
      });
    } else {
      const newTA: TeacherAssignment = {
        id: `ta_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        teacherId,
        teacherName,
        level: inferLevelFromClassName(targetClass),
        subjects: [subject],
        streams: [targetStream, `${targetClass} ${targetStream}`]
      };
      updatedList = [...currentList, newTA];
    }

    onUpdateTeacherAssignments(updatedList);
    showNotice(
      `Mwalimu ${teacherName} amepangiwa rasmi kufundisha somo la "${subject}" kwenye ${targetClass} (${targetStream}).`
    );
  };

  // Add or update a Required Subject & Expected Period Count for activeConfigClass + activeConfigStream
  const handleAddRequiredSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSub = subjectToAdd.trim();
    if (!cleanSub) return;
    const safePeriods = Math.max(1, Math.min(25, Number(expectedPeriodsToAdd) || 1));

    const existingIdx = subjectPeriodAllocations.findIndex(
      a =>
        isSameClass(a.className, activeConfigClass) &&
        ((activeConfigStream === 'ALL_STREAMS' && a.stream === 'ALL_STREAMS') ||
          (activeConfigStream !== 'ALL_STREAMS' &&
            a.stream !== 'ALL_STREAMS' &&
            isSameStream(a.stream, activeConfigStream))) &&
        isSameSubjectName(a.subjectName || a.subject, cleanSub)
    );

    let updated: SubjectPeriodAllocation[];
    if (existingIdx >= 0) {
      updated = subjectPeriodAllocations.map((item, i) =>
        i === existingIdx
          ? { ...item, periodsPerWeek: safePeriods, subject: cleanSub, subjectName: cleanSub }
          : item
      );
      showNotice(
        `Idadi ya vipindi vya "${cleanSub}" kwenye ${activeConfigClass} (${
          activeConfigStream === 'ALL_STREAMS' ? 'Mikondo Yote' : activeConfigStream
        }) imesasishwa kuwa vipindi ${safePeriods}/wiki.`
      );
    } else {
      const newEntry: SubjectPeriodAllocation = {
        id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        level: inferLevelFromClassName(activeConfigClass),
        className: activeConfigClass,
        stream: activeConfigStream,
        subject: cleanSub,
        subjectName: cleanSub,
        periodsPerWeek: safePeriods
      };
      updated = [...subjectPeriodAllocations, newEntry];
      showNotice(
        `Somo "${cleanSub}" (Vipindi ${safePeriods}/wiki) limeongezwa kwa ${activeConfigClass} (${
          activeConfigStream === 'ALL_STREAMS' ? 'Mikondo Yote' : activeConfigStream
        }).`
      );
    }
    onUpdateSubjectPeriodAllocations(updated);

    // If a teacher was selected in the add form, assign them
    if (teacherToAdd && onUpdateTeacherAssignments) {
      handleAssignTeacherToSubjectStream(
        activeConfigClass,
        activeConfigStream,
        cleanSub,
        Number(teacherToAdd)
      );
    }
  };

  // Apply a curriculum preset (O-Level Core, Primary Core, or A-Level Combination)
  const handleApplyCurriculumPreset = (presetType: 'OLEVEL_CORE' | 'PRIMARY_CORE' | 'ALEVEL_COMBO') => {
    let itemsToApply: { subject: string; periods: number }[] = [];

    if (presetType === 'OLEVEL_CORE') {
      itemsToApply = [
        { subject: 'Basic Mathematics', periods: 6 },
        { subject: 'English Language', periods: 5 },
        { subject: 'Kiswahili', periods: 4 },
        { subject: 'Biology', periods: 4 },
        { subject: 'Chemistry', periods: 4 },
        { subject: 'Physics', periods: 4 },
        { subject: 'Geography', periods: 3 },
        { subject: 'History', periods: 3 },
        { subject: 'Civics', periods: 3 }
      ];
    } else if (presetType === 'PRIMARY_CORE') {
      itemsToApply = [
        { subject: 'Mathematics', periods: 6 },
        { subject: 'English Language', periods: 6 },
        { subject: 'Kiswahili', periods: 5 },
        { subject: 'Science and Technology', periods: 4 },
        { subject: 'Social Studies', periods: 3 },
        { subject: 'Civic and Moral Education', periods: 3 }
      ];
    } else if (presetType === 'ALEVEL_COMBO') {
      const comboKey = activeConfigStream.trim().toUpperCase();
      itemsToApply = ALEVEL_COMBINATION_PRESETS[comboKey] || ALEVEL_COMBINATION_PRESETS.PCM;
    }

    let next = [...subjectPeriodAllocations];
    itemsToApply.forEach(({ subject, periods }) => {
      const existingIdx = next.findIndex(
        a =>
          isSameClass(a.className, activeConfigClass) &&
          ((activeConfigStream === 'ALL_STREAMS' && a.stream === 'ALL_STREAMS') ||
            (activeConfigStream !== 'ALL_STREAMS' &&
              a.stream !== 'ALL_STREAMS' &&
              isSameStream(a.stream, activeConfigStream))) &&
          isSameSubjectName(a.subjectName || a.subject, subject)
      );

      if (existingIdx >= 0) {
        next[existingIdx] = { ...next[existingIdx], periodsPerWeek: periods };
      } else {
        next.push({
          id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${subject.replace(/\s+/g, '')}`,
          level: inferLevelFromClassName(activeConfigClass),
          className: activeConfigClass,
          stream: activeConfigStream,
          subject,
          subjectName: subject,
          periodsPerWeek: periods
        });
      }
    });

    onUpdateSubjectPeriodAllocations(next);
    showNotice(
      `Masomo ${itemsToApply.length} ya msingi na idadi ya vipindi vyake vimepakiwa kwa ${activeConfigClass} (${
        activeConfigStream === 'ALL_STREAMS' ? 'Mikondo Yote' : activeConfigStream
      })!`
    );
  };

  // Replicate current stream's requirements & teachers across all other streams of this class
  const handleSyncCurriculumToAllStreams = () => {
    if (activeConfigStream === 'ALL_STREAMS') return;
    const currentStreamSubjects = subjectPeriodAllocations.filter(
      a => isSameClass(a.className, activeConfigClass) && isSameStream(a.stream, activeConfigStream)
    );

    if (currentStreamSubjects.length === 0) {
      showNotice(`Hakuna masomo yaliyosajiliwa kwenye ${activeConfigStream} ya kunakili.`);
      return;
    }

    let updatedAllocs = [...subjectPeriodAllocations];
    let syncedCount = 0;

    streamsForActiveClass.forEach(otherStream => {
      if (isSameStream(otherStream, activeConfigStream)) return;

      currentStreamSubjects.forEach(sourceAlloc => {
        const sub = sourceAlloc.subjectName || sourceAlloc.subject;
        const existingIdx = updatedAllocs.findIndex(
          a =>
            isSameClass(a.className, activeConfigClass) &&
            isSameStream(a.stream, otherStream) &&
            isSameSubjectName(a.subjectName || a.subject, sub)
        );

        if (existingIdx >= 0) {
          updatedAllocs[existingIdx] = {
            ...updatedAllocs[existingIdx],
            periodsPerWeek: sourceAlloc.periodsPerWeek
          };
        } else {
          updatedAllocs.push({
            id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${sub.replace(/\s+/g, '')}`,
            level: sourceAlloc.level,
            className: activeConfigClass,
            stream: otherStream,
            subject: sub,
            subjectName: sub,
            periodsPerWeek: sourceAlloc.periodsPerWeek
          });
          syncedCount++;
        }
      });
    });

    onUpdateSubjectPeriodAllocations(updatedAllocs);
    showNotice(
      `Mahitaji ya masomo na vipindi kutoka ${activeConfigStream} yamesawazishwa kwenye mikondo yote ya ${activeConfigClass} (${streamsForActiveClass.join(
        ', '
      )})!`
    );
  };

  const handleUpdateExpectedPeriodCount = (allocId: string, newCount: number) => {
    const safeVal = Math.max(1, Math.min(25, Number(newCount) || 1));
    const next = subjectPeriodAllocations.map(a =>
      a.id === allocId ? { ...a, periodsPerWeek: safeVal } : a
    );
    onUpdateSubjectPeriodAllocations(next);
  };

  const handleDeleteRequiredSubject = (allocId: string) => {
    const next = subjectPeriodAllocations.filter(a => a.id !== allocId);
    onUpdateSubjectPeriodAllocations(next);
    showNotice('Somo limeondolewa kwenye mahitaji ya mkondo.');
  };

  // Progression report for the currently selected Class + Stream
  const activeStreamProgression = useMemo(() => {
    const targetStream =
      activeConfigStream === 'ALL_STREAMS'
        ? streamsForActiveClass[0] || 'STREAM A'
        : activeConfigStream;
    return computeStreamSubjectProgression(
      activeConfigClass,
      targetStream,
      subjectPeriodAllocations,
      assignments,
      periodSettings,
      teachers,
      teacherAssignments
    );
  }, [
    activeConfigClass,
    activeConfigStream,
    streamsForActiveClass,
    subjectPeriodAllocations,
    assignments,
    periodSettings,
    teachers,
    teacherAssignments
  ]);

  // Progression reports for all streams of the active class (for side-by-side comparative analysis)
  const allStreamsProgressionForActiveClass = useMemo(() => {
    return streamsForActiveClass.map(st =>
      computeStreamSubjectProgression(
        activeConfigClass,
        st,
        subjectPeriodAllocations,
        assignments,
        periodSettings,
        teachers,
        teacherAssignments
      )
    );
  }, [
    activeConfigClass,
    streamsForActiveClass,
    subjectPeriodAllocations,
    assignments,
    periodSettings,
    teachers,
    teacherAssignments
  ]);

  // Handle Export PDF of Progression Report
  const handleExportPDF = () => {
    exportProgressionReportPDF({
      reports: [activeStreamProgression],
      schoolName,
      schoolInfo,
      levelFilter: inferLevelFromClassName(activeConfigClass),
      classFilter: activeConfigClass,
      streamFilter: activeConfigStream
    });
  };

  // Teacher map helper
  const teacherMap = useMemo(() => {
    const m = new Map<number, Teacher>();
    teachers.forEach(t => {
      if (t && t.id !== undefined) m.set(Number(t.id), t);
    });
    return m;
  }, [teachers]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Usajili wa Mikondo na Progression ya Uingizaji wa Vipindi</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sajili mikondo ya darasa, weka idadi ya vipindi vinavyohitajika kwa kila somo analofundisha mwalimu, na fuatilia progression ya uingizaji wa vipindi kwenye ratiba kwa wakati halisi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Pakua ripoti ya progression ya mkondo huu kwa PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pakua PDF</span>
          </button>

          {onOpenProgressionReport && (
            <button
              type="button"
              onClick={() =>
                onOpenProgressionReport(
                  activeConfigClass,
                  activeConfigStream === 'ALL_STREAMS' ? 'All' : activeConfigStream
                )
              }
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Ripoti Kamili ya Shule</span>
            </button>
          )}

          {onOpenTeacherProgressionReport && (
            <button
              type="button"
              onClick={onOpenTeacherProgressionReport}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              title="Tazama ripoti ya progression ya kila mwalimu"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Progression ya Walimu</span>
            </button>
          )}
        </div>
      </div>

      {feedbackBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            {feedbackBanner}
          </span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Part 1: Stream Registration Form */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-4">
        <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Hatua ya 1: Sajili Mikondo ya Darasa (Class Streams / Combinations)</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 normal-case">
            Mfano: STREAM A, STREAM B au PCM, PCB, CBG
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Darasa (Class)</label>
            <select
              value={newStreamClass}
              onChange={e => {
                setNewStreamClass(e.target.value);
                setActiveConfigClass(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
            >
              {DEFAULT_CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Ngazi (Level)</label>
            <select
              value={newStreamLevel}
              onChange={e => {
                const lvl = e.target.value as EducationLevel;
                setNewStreamLevel(lvl);
                if (lvl === 'ACSEE') {
                  setNewStreamNames('PCM, PCB, CBG, HGE');
                } else {
                  setNewStreamNames('STREAM A, STREAM B');
                }
              }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
            >
              <option value="CSEE">CSEE (Ordinary Level - O-Level)</option>
              <option value="ACSEE">ACSEE (Advanced Level - A-Level)</option>
              <option value="PRIMARY">Primary Level (Msingi)</option>
              <option value="PRE_PRIMARY">Nursery / Pre-Primary (Awali)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Majina ya Mikondo (Streams)
            </label>
            <div className="space-y-1.5">
              <select
                onChange={e => {
                  const selected = e.target.value;
                  if (selected && selected !== 'Custom') {
                    setNewStreamNames(selected);
                  }
                }}
                className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- Chagua Kiolezo (Preset) --</option>
                <option value="STREAM A, STREAM B">STREAM A, STREAM B</option>
                <option value="STREAM A, STREAM B, STREAM C">STREAM A, STREAM B, STREAM C</option>
                <option value="STREAM A, STREAM B, STREAM C, STREAM D">STREAM A, STREAM B, STREAM C, STREAM D</option>
                <option value="PCM, PCB, CBG, HGE">PCM, PCB, CBG, HGE (A-Level)</option>
                <option value="HGL, HKL, EGM, HGK">HGL, HKL, EGM, HGK (A-Level Arts/Econ)</option>
                <option value="Custom">Custom (Andika kwa Mikono)</option>
              </select>
              <input
                type="text"
                value={newStreamNames}
                onChange={e => setNewStreamNames(e.target.value)}
                placeholder="e.g. STREAM A, STREAM B"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={autoSeedCurriculumOnSave}
              onChange={e => setAutoSeedCurriculumOnSave(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <span>
              Weka idadi ya vipindi vya masomo ya msingi kiotomatiki kwa mikondo mipya (Auto-populate core subjects)
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveStreams}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Hifadhi Mikondo (Save Streams)</span>
            </button>

            {streamSettings.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Je, una uhakika unataka kufuta mikondo yote ya madarasa?')) {
                    onUpdateStreamSettings([]);
                  }
                }}
                className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Futa Yote</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Part 2: PROMINENT PROGRESSION TRACKER & PER-STREAM PERIOD REQUIREMENT     */}
      {/* ========================================================================= */}
      <div className="border border-blue-200 rounded-2xl overflow-hidden bg-white shadow-xs space-y-0">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm sm:text-base font-black tracking-tight">
                  Progression ya Uingizaji wa Vipindi kwa Kila Mkondo
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  {activeConfigClass} • {activeConfigStream}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Kila mkondo unahitaji vipindi vingapi vya somo analofundisha mwalimu, na vipi vimeshaingizwa kwenye ratiba.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllStreamsProgressionView(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                showAllStreamsProgressionView
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showAllStreamsProgressionView ? 'Tazama Mkondo Mmoja' : 'Linganisha Mikondo Yote'}</span>
            </button>

            {onNavigateToGeneralTimetable && (
              <button
                type="button"
                onClick={() => onNavigateToGeneralTimetable(activeConfigClass, activeConfigStream)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <span>Ingiza Kwenye Ratiba</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stream Selector Navigation Tabs */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-slate-500">Chagua Darasa:</span>
            <select
              value={activeConfigClass}
              onChange={e => {
                setActiveConfigClass(e.target.value);
                const firstStream =
                  streamSettings.find(s => isSameClass(s.className, e.target.value))?.streams?.[0] ||
                  'STREAM A';
                setActiveConfigStream(firstStream);
              }}
              className="px-2.5 py-1 text-xs font-black bg-white border border-slate-300 rounded-lg text-slate-900 cursor-pointer"
            >
              {DEFAULT_CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span className="text-slate-300 mx-1">|</span>

            <span className="text-[11px] font-black uppercase text-slate-500">Mkondo (Stream):</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {streamsForActiveClass.map(st => {
                const isSelected = isSameStream(activeConfigStream, st) && !showAllStreamsProgressionView;
                const prog = computeStreamSubjectProgression(
                  activeConfigClass,
                  st,
                  subjectPeriodAllocations,
                  assignments,
                  periodSettings,
                  teachers,
                  teacherAssignments
                );
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setActiveConfigStream(st);
                      setShowAllStreamsProgressionView(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : prog.isFullyComplete
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        : prog.totalEnteredRegisteredPeriods > 0
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{st}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : prog.isFullyComplete
                          ? 'bg-emerald-200 text-emerald-950'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {prog.overallPercentage}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleSyncCurriculumToAllStreams}
              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Sawazisha idadi ya vipindi na masomo ya mkondo huu kwenye mikondo yote ya darasa hili"
            >
              <Copy className="w-3 h-3" />
              <span>Sawazisha Mikondo Yote</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyCurriculumPreset('OLEVEL_CORE')}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Weka upya masomo 9 ya msingi"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Weka Masomo ya Msingi</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 space-y-5">
          {/* Summary Stat Cards for Active Stream */}
          {!showAllStreamsProgressionView && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                  Vipindi Vinavyohitajika
                </span>
                <div className="text-2xl font-black text-blue-950 tabular-nums">
                  {activeStreamProgression.totalRequiredPeriods}
                  <span className="text-xs font-medium text-blue-600 ml-1">/ wiki</span>
                </div>
                <div className="text-[11px] text-blue-700 font-semibold">
                  Kwenye masomo {activeStreamProgression.totalRequiredSubjects}
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                  Vilivyoingizwa Kwenye Ratiba
                </span>
                <div className="text-2xl font-black text-indigo-950 tabular-nums">
                  {activeStreamProgression.totalEnteredRegisteredPeriods}
                  <span className="text-xs font-medium text-indigo-600 ml-1">vipindi</span>
                </div>
                <div className="text-[11px] text-indigo-700 font-semibold">
                  Masomo {activeStreamProgression.exactMatchSubjectsCount} yamekamilika
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                  Vipindi Vilivyobaki
                </span>
                <div className="text-2xl font-black text-amber-950 tabular-nums">
                  {Math.max(
                    0,
                    activeStreamProgression.totalRequiredPeriods -
                      activeStreamProgression.totalEnteredRegisteredPeriods
                  )}
                  <span className="text-xs font-medium text-amber-600 ml-1">vipindi</span>
                </div>
                <div className="text-[11px] text-amber-700 font-semibold">
                  {activeStreamProgression.missingSubjects.length > 0
                    ? `${activeStreamProgression.missingSubjects.length} hayajaingizwa kabisa`
                    : activeStreamProgression.incompleteSubjects.length > 0
                    ? `${activeStreamProgression.incompleteSubjects.length} yameingizwa pungufu`
                    : 'Ratiba imekamilika!'}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                  Kiwango cha Ukamilifu
                </span>
                <div className="text-2xl font-black text-emerald-950 tabular-nums flex items-center justify-between">
                  <span>{activeStreamProgression.overallPercentage}%</span>
                  {activeStreamProgression.isFullyComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, activeStreamProgression.overallPercentage)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick-Add Subject Row directly to Active Stream */}
          {!showAllStreamsProgressionView && (
            <form
              onSubmit={handleAddRequiredSubject}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
            >
              <div className="sm:col-span-4">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Ongeza Somo kwenye Mkondo Huu ({activeConfigStream})
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={allSubjectsList.includes(subjectToAdd) ? subjectToAdd : ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val) {
                        setSubjectToAdd(val);
                        if (DEFAULT_EXPECTED_PERIODS[val]) {
                          setExpectedPeriodsToAdd(DEFAULT_EXPECTED_PERIODS[val]);
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="">-- Chagua Somo --</option>
                    {allSubjectsList.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Mwalimu Anayefundisha
                </label>
                <select
                  value={teacherToAdd}
                  onChange={e => setTeacherToAdd(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 cursor-pointer"
                >
                  <option value="">-- Mwalimu (Si Lazima Sasa) --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.initial})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Vipindi Vinavyohitajika / Wiki
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={expectedPeriodsToAdd}
                  onChange={e => setExpectedPeriodsToAdd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-center text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer h-[34px] transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ongeza Somo</span>
                </button>
              </div>
            </form>
          )}

          {/* MAIN INTERACTIVE TABLE: Progression & Teacher Allocation for Active Stream */}
          {!showAllStreamsProgressionView ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Somo (Subject)</th>
                    <th className="p-3">Mwalimu Anayefundisha (Teacher Assigned)</th>
                    <th className="p-3 text-center w-32">Vinavyohitajika</th>
                    <th className="p-3 text-center w-32">Vilivyoingizwa</th>
                    <th className="p-3 text-center w-28">Baki</th>
                    <th className="p-3 w-40">Maendeleo (%)</th>
                    <th className="p-3 text-center">Hali (Status)</th>
                    <th className="p-3 text-center w-24">Kitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStreamProgression.subjects.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-2">
                          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-bold text-slate-700">
                            Bado hakuna masomo yaliyosajiliwa kwa ajili ya {activeConfigClass} ({activeConfigStream}).
                          </p>
                          <p className="text-xs text-slate-400">
                            Tumia kitufe cha "Weka Masomo ya Msingi" hapo juu kupakia masomo ya kiwango hiki kiotomatiki, au ongeza somo kupitia fomu iliyo hapo juu.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleApplyCurriculumPreset('OLEVEL_CORE')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Weka Masomo ya Msingi Kiotomatiki (9 Masomo)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeStreamProgression.subjects.map((sub, idx) => {
                      // Determine current assigned teacher ID if any
                      const currentTeacherId =
                        sub.primaryTeacherId ||
                        (sub.assignedTeachers.length > 0
                          ? teachers.find(t => t.name === sub.assignedTeachers[0] || t.initial === sub.assignedTeachers[0])?.id
                          : undefined);

                      return (
                        <tr key={sub.allocationId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Subject Name */}
                          <td className="p-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{sub.subject}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  sub.isStreamSpecific
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                                title={sub.isStreamSpecific ? 'Mahitaji maalum ya mkondo huu' : 'Mahitaji ya mikondo yote ya darasa hili'}
                              >
                                {sub.isStreamSpecific ? activeStreamProgression.stream : 'ALL STREAMS'}
                              </span>
                            </div>
                          </td>

                          {/* Teacher Assigned Dropdown */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={currentTeacherId || ''}
                                onChange={e => {
                                  const tId = Number(e.target.value);
                                  if (tId) {
                                    handleAssignTeacherToSubjectStream(
                                      activeConfigClass,
                                      activeConfigStream,
                                      sub.subject,
                                      tId
                                    );
                                  }
                                }}
                                className={`px-2.5 py-1 text-xs rounded-lg border font-semibold cursor-pointer max-w-[210px] truncate ${
                                  currentTeacherId
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                                    : 'bg-white border-dashed border-amber-300 text-amber-800'
                                }`}
                              >
                                <option value="">-- Chagua Mwalimu --</option>
                                {teachers.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.initial})
                                  </option>
                                ))}
                              </select>

                              {sub.assignedTeachers.length > 0 && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black shrink-0"
                                  title={`Mwalimu aliyepo kwenye ratiba: ${sub.assignedTeachers.join(', ')}`}
                                >
                                  ✓ Ratibani
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Required Periods / Week (Editable) */}
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={25}
                              value={sub.requiredPeriods}
                              onChange={e =>
                                handleUpdateExpectedPeriodCount(sub.allocationId, Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-black text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                              title="Bofya kurekebisha idadi ya vipindi vinavyohitajika kwa wiki"
                            />
                          </td>

                          {/* Entered Periods */}
                          <td className="p-3 text-center font-black text-slate-800 tabular-nums">
                            <span className="text-sm font-black">{sub.enteredPeriods}</span>
                            <span className="text-slate-400 font-normal ml-1">/ {sub.requiredPeriods}</span>
                          </td>

                          {/* Remaining Periods */}
                          <td className="p-3 text-center">
                            {sub.status === 'COMPLETE' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                0 (Kamili ✓)
                              </span>
                            ) : sub.status === 'EXCESS' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                                +{sub.excessPeriods} Ziada
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  sub.status === 'MISSING'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                Bado {sub.remainingPeriods}
                              </span>
                            )}
                          </td>

                          {/* Progress Bar & Percentage */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    sub.status === 'COMPLETE'
                                      ? 'bg-emerald-500'
                                      : sub.status === 'MISSING'
                                      ? 'bg-rose-500'
                                      : sub.status === 'INCOMPLETE'
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, sub.percentage)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-black text-slate-700 w-9 text-right tabular-nums">
                                {sub.percentage}%
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3 text-center">
                            {sub.status === 'COMPLETE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                <CheckCircle2 className="w-3 h-3" /> Kamili
                              </span>
                            )}
                            {sub.status === 'MISSING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                <XCircle className="w-3 h-3" /> Haijaingizwa
                              </span>
                            )}
                            {sub.status === 'INCOMPLETE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                                <AlertTriangle className="w-3 h-3" /> Pungufu
                              </span>
                            )}
                            {sub.status === 'EXCESS' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                                <AlertTriangle className="w-3 h-3" /> Ziada
                              </span>
                            )}
                          </td>

                          {/* Quick Actions */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {onNavigateToGeneralTimetable && sub.remainingPeriods > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onNavigateToGeneralTimetable(
                                      activeConfigClass,
                                      activeConfigStream,
                                      sub.subject
                                    )
                                  }
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold cursor-pointer transition"
                                  title={`Panga vipindi vilivyobaki vya somo la ${sub.subject}`}
                                >
                                  Panga
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteRequiredSubject(sub.allocationId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Ondoa somo hili"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          ) : (
            /* ALL STREAMS SIDE-BY-SIDE COMPARISON VIEW */
            <div className="space-y-4">
              <div className="text-xs font-black uppercase text-slate-700 flex items-center justify-between">
                <span>Muhtasari wa Progression kwa Mikondo Yote ya {activeConfigClass}:</span>
                <span className="text-[11px] text-slate-500 font-semibold normal-case">
                  Inalinganisha utimilifu wa ratiba kwa kila mkondo wa darasa hili
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allStreamsProgressionForActiveClass.map(rep => (
                  <div
                    key={rep.stream}
                    className={`border rounded-xl p-4 space-y-3 ${
                      rep.isFullyComplete
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-sm text-slate-900">{rep.stream}</span>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          {rep.totalRequiredSubjects} Masomo yaliyosajiliwa
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-black ${
                          rep.isFullyComplete
                            ? 'bg-emerald-200 text-emerald-950'
                            : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {rep.overallPercentage}%
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Vipindi Vinavyohitajika:</span>
                        <span className="font-bold text-slate-900">{rep.totalRequiredPeriods}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Vilivyoingizwa:</span>
                        <span className="font-bold text-emerald-700">
                          {rep.totalEnteredRegisteredPeriods}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Vipindi Vilivyobaki:</span>
                        <span className="font-bold text-amber-700">
                          {Math.max(0, rep.totalRequiredPeriods - rep.totalEnteredRegisteredPeriods)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          rep.isFullyComplete ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, rep.overallPercentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConfigStream(rep.stream);
                          setShowAllStreamsProgressionView(false);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Tazama Masomo &amp; Walimu →
                      </button>

                      {onNavigateToGeneralTimetable && (
                        <button
                          type="button"
                          onClick={() => onNavigateToGeneralTimetable(activeConfigClass, rep.stream)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-bold cursor-pointer"
                        >
                          Ingiza Ratiba
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
