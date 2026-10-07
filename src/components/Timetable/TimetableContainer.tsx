import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Printer, 
  Download, 
  Sparkles, 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  Layers, 
  Clock, 
  CheckCircle,
  FileSpreadsheet,
  Move,
  Info,
  Palette,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  Coffee,
  Utensils,
  BookMarked,
  Trees,
  Trophy,
  MessageSquare,
  BookOpen,
  Users,
  Library,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Zap,
  Sliders,
  Edit3
} from 'lucide-react';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  ActivityType,
  InstitutionalPolicy,
  SubjectPeriodAllocation,
  TeacherAssignment,
  SchoolInfo,
  UserAccount,
  Student
} from '../../types';
import { 
  DAYS_OF_WEEK, 
  DEFAULT_CLASSES, 
  NURSERY_CLASSES,
  PRIMARY_CLASSES,
  SECONDARY_CLASSES,
  EXTRA_CURRICULAR_ACTIVITIES,
  DEFAULT_DAY_THEMES,
  DEFAULT_INSTITUTIONAL_POLICY
} from '../../constants/defaults';
import { 
  getSubjectColor, 
  getTeacherColor, 
  getDayTheme, 
  getFormStreamTheme,
  getExtraCurricularInfo 
} from '../../utils/colors';
import { 
  exportTimetableToCSV, 
  exportClassTimetableGridToCSV, 
  printFormattedSection 
} from '../../utils/export';
import { exportTimetablePDF } from '../../utils/timetablePdfExport';
import { isSameClass } from '../../utils/reportCardUtils';
import { isSameStream } from '../../lib/timetableService';
import { detectTimetableConflicts } from '../../utils/conflicts';
import { generateTimetableIntegrityReport } from '../../utils/timetableIntegrity';
import { 
  validateTimetableAgainstConstraints, 
  getSlotConstraintViolation, 
  DEFAULT_CONSTRAINTS_CONFIG,
  TimetableConstraintsConfig 
} from '../../utils/timetableConstraintValidator';
import { EditSlotModal } from './EditSlotModal';
import { PeriodSettingsManager } from './PeriodSettingsManager';
import { ScheduleExtraCurricularModal } from './ScheduleExtraCurricularModal';
import { AITimetableGeneratorModal } from './AITimetableGeneratorModal';
import { TimetableIntegrityReportModal } from './TimetableIntegrityReportModal';
import { InstitutionalPoliciesTab } from './InstitutionalPoliciesTab';
import { ConstraintConfigurationPanel } from './ConstraintConfigurationPanel';
import { SubjectPeriodAllocationTab } from './SubjectPeriodAllocationTab';
import { TeacherAssignmentsTab } from './TeacherAssignmentsTab';
import { AIGenerateByLevelModal } from './AIGenerateByLevelModal';
import { ClassJournalTab } from './ClassJournalTab';

export const renderActivityIcon = (iconName: string, className = "w-3 h-3") => {
  switch (iconName) {
    case 'Coffee': return <Coffee className={className} />;
    case 'Utensils': return <Utensils className={className} />;
    case 'BookMarked': return <BookMarked className={className} />;
    case 'Trees': return <Trees className={className} />;
    case 'Trophy': return <Trophy className={className} />;
    case 'MessageSquare': return <MessageSquare className={className} />;
    case 'BookOpen': return <BookOpen className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Library': return <Library className={className} />;
    case 'FileCheck': return <FileCheck className={className} />;
    default: return <Sparkles className={className} />;
  }
};

interface TimetableContainerProps {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  classTimetableReleased: Record<string, boolean>;
  schoolName: string;
  dayThemes?: Record<string, string>;
  institutionalPolicy?: InstitutionalPolicy;
  subjectPeriodAllocations?: SubjectPeriodAllocation[];
  teacherAssignments?: TeacherAssignment[];
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  students?: Student[];
  initialTab?: 'general' | 'class' | 'teacher' | 'master' | 'journal' | 'policies' | 'allocations' | 'teacherAssignments' | 'integrity' | 'settings';
  onUpdateAssignments: (assignments: TimetableAssignment[]) => void;
  onUpdatePeriodSettings: (settings: PeriodSetting[]) => void;
  onUpdateStreamSettings: (settings: StreamSetting[]) => void;
  onToggleClassRelease: (className: string) => void;
  onUpdateDayThemes?: (themes: Record<string, string>) => void;
  onUpdateInstitutionalPolicy?: (policy: InstitutionalPolicy) => void;
  onUpdateSubjectPeriodAllocations?: (allocations: SubjectPeriodAllocation[]) => void;
  onUpdateTeacherAssignments?: (assignments: TeacherAssignment[]) => void;
}

export const TimetableContainer: React.FC<TimetableContainerProps> = ({
  assignments,
  teachers,
  periodSettings,
  streamSettings,
  classTimetableReleased,
  schoolName,
  dayThemes,
  institutionalPolicy = DEFAULT_INSTITUTIONAL_POLICY,
  subjectPeriodAllocations = [],
  teacherAssignments = [],
  schoolInfo,
  currentUser,
  students,
  initialTab,
  onUpdateAssignments,
  onUpdatePeriodSettings,
  onUpdateStreamSettings,
  onToggleClassRelease,
  onUpdateDayThemes,
  onUpdateInstitutionalPolicy,
  onUpdateSubjectPeriodAllocations,
  onUpdateTeacherAssignments
}) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'class' | 'teacher' | 'master' | 'journal' | 'policies' | 'constraints' | 'allocations' | 'teacherAssignments' | 'integrity' | 'settings'
  >(initialTab || 'general');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Form 1');
  const [selectedGeneralClass, setSelectedGeneralClass] = useState<string>('Form 1');
  const [selectedGeneralStream, setSelectedGeneralStream] = useState<string>('All');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<number>(teachers[0]?.id || 0);

  // Manual editing modal state
  const [editingSlot, setEditingSlot] = useState<{
    className: string;
    stream: string;
    day: string;
    period: string;
    assignment?: TimetableAssignment;
  } | null>(null);

  // Drag and drop state
  const [draggedAssignment, setDraggedAssignment] = useState<TimetableAssignment | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  
  // AI Timetable Generator Modal state (Class-level & Level-wide)
  const [aiGeneratorModalOpen, setAiGeneratorModalOpen] = useState(false);
  const [aiByLevelModalOpen, setAiByLevelModalOpen] = useState(false);
  
  // Timetable Integrity Report Modal state
  const [integrityReportModalOpen, setIntegrityReportModalOpen] = useState(false);

  // Scheduling Mode: Manual vs Auto (Zero-Clash Isolation)
  const [schedulingMode, setSchedulingMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');

  const manualAssignmentsCount = useMemo(() => {
    return assignments.filter(a => a.isManual || a.isLocked || a.allocationMode === 'manual').length;
  }, [assignments]);

  const autoAssignmentsCount = useMemo(() => {
    return assignments.filter(a => a.allocationMode === 'auto' || (!a.isManual && !a.isLocked)).length;
  }, [assignments]);

  const handleShareTimetableWhatsApp = (scope: string) => {
    const text = `*HABY EDUPRO TIMETABLE (RATIBA YA MASOMO)*
Shule: ${schoolName}
Mwonekano: ${scope}
Tarehe: ${new Date().toLocaleDateString()}
Ratiba hii imekaguliwa rasmi na haina mgongano (Zero Clashes).`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrintActiveTimetableGrid = () => {
    if (activeTab === 'general') {
      const scopeLabel = selectedGeneralClass === 'All' ? 'Whole School' : selectedGeneralClass;
      const streamLabel = selectedGeneralStream !== 'All' ? selectedGeneralStream : '';
      printFormattedSection('general-printable-view', `General Teaching Timetable - ${scopeLabel} ${streamLabel}`.trim(), schoolName, { orientation: printOrientation });
    } else if (activeTab === 'class') {
      printFormattedSection('class-printable-view', `${selectedClassFilter} Timetable`, schoolName, { orientation: 'landscape' });
    } else if (activeTab === 'teacher') {
      const currentTeacher = teachers.find(t => t.id === selectedTeacherFilter);
      printFormattedSection('teacher-printable-view', `${currentTeacher?.name || 'Teacher'} Teaching Timetable`, schoolName, { orientation: 'landscape' });
    } else if (activeTab === 'journal') {
      printFormattedSection('official-class-journal-printable', `Official Class Journal`, schoolName, { orientation: 'landscape' });
    } else {
      window.print();
    }
  };

  // Comprehensive Timetable Integrity Analysis
  const integrityReport = useMemo(() => {
    return generateTimetableIntegrityReport(
      assignments,
      teachers,
      periodSettings,
      streamSettings
    );
  }, [assignments, teachers, periodSettings, streamSettings]);

  // User-Defined Constraints & Heuristic Validation Engine
  const [constraintsConfig, setConstraintsConfig] = useState<TimetableConstraintsConfig>(DEFAULT_CONSTRAINTS_CONFIG);
  const [highlightConstraintsInRed, setHighlightConstraintsInRed] = useState<boolean>(true);

  const constraintValidationReport = useMemo(() => {
    return validateTimetableAgainstConstraints(
      assignments,
      teachers,
      periodSettings,
      streamSettings,
      constraintsConfig
    );
  }, [assignments, teachers, periodSettings, streamSettings, constraintsConfig]);

  const handleApplyAITimetable = (newAssignments: TimetableAssignment[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      onUpdateAssignments(newAssignments);
    } else {
      const existingKeys = new Set(
        assignments.map(a => `${a.className}|${a.stream}|${a.day}|${a.period}`)
      );
      const toAdd = newAssignments.filter(
        a => !existingKeys.has(`${a.className}|${a.stream}|${a.day}|${a.period}`)
      );
      onUpdateAssignments([...assignments, ...toAdd]);
    }
  };

  // Conflict detection
  const conflicts = detectTimetableConflicts(assignments, teachers);
  const totalConflicts = Object.keys(conflicts).length;

  // Resolve all conflicts by unassigning teachers from redundant slots
  const handleResolveConflicts = () => {
    if (totalConflicts === 0) return;
    
    if (window.confirm(`Are you sure you want to resolve all ${totalConflicts} conflicts? This will unassign teachers from conflicting slots while keeping the subjects.`)) {
      const resolved = [...assignments];
      
      // Group assignments by the conflict key
      const slotTeacherMap: Record<string, TimetableAssignment[]> = {};
      assignments.forEach(a => {
        if (!a.teacherId) return;
        const normalizedPeriod = a.periodName || a.period.split(' (')[0];
        const key = `${a.day}_${normalizedPeriod}_teacher_${a.teacherId}`;
        if (!slotTeacherMap[key]) slotTeacherMap[key] = [];
        slotTeacherMap[key].push(a);
      });

      // For each group with more than 1 assignment, unassign all but the first
      Object.values(slotTeacherMap).forEach(group => {
        if (group.length > 1) {
          // Keep the first one, unassign others
          for (let i = 1; i < group.length; i++) {
            const assignmentToFix = group[i];
            const idx = resolved.findIndex(r => r.id === assignmentToFix.id);
            if (idx !== -1) {
              resolved[idx] = { ...resolved[idx], teacherId: undefined };
            }
          }
        }
      });

      onUpdateAssignments(resolved);
    }
  };

  // Helpers for class streams (only return explicitly registered streams)
  const getStreamsForClass = (className: string): string[] => {
    const setting = streamSettings.find(s => s.className === className);
    return setting && Array.isArray(setting.streams) ? setting.streams : [];
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, assignment: TimetableAssignment) => {
    setDraggedAssignment(assignment);
    e.dataTransfer.setData('text/plain', JSON.stringify(assignment));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== targetKey) {
      setDragOverKey(targetKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverKey(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    targetClass: string,
    targetStream: string,
    targetDay: string,
    targetPeriod: string
  ) => {
    e.preventDefault();
    setDragOverKey(null);

    if (!draggedAssignment) return;

    // Check if dropping on the exact same slot
    if (
      draggedAssignment.className === targetClass &&
      draggedAssignment.stream === targetStream &&
      draggedAssignment.day === targetDay &&
      draggedAssignment.period === targetPeriod
    ) {
      return;
    }

    // Check if target already has an assignment
    const targetExisting = assignments.find(
      a =>
        isSameClass(a.className, targetClass) &&
        isSameStream(a.stream, targetStream) &&
        a.day === targetDay &&
        (a.period === targetPeriod || a.periodName === targetPeriod || a.period.startsWith(targetPeriod.split(' (')[0]))
    );

    let updated: TimetableAssignment[];

    if (targetExisting) {
      // SWAP positions
      updated = assignments.map(a => {
        if (a.id === draggedAssignment.id) {
          return {
            ...a,
            className: targetClass,
            stream: targetStream,
            day: targetDay,
            period: targetPeriod
          };
        }
        if (a.id === targetExisting.id) {
          return {
            ...a,
            className: draggedAssignment.className,
            stream: draggedAssignment.stream,
            day: draggedAssignment.day,
            period: draggedAssignment.period
          };
        }
        return a;
      });
    } else {
      // MOVE to empty slot
      updated = assignments.map(a => {
        if (a.id === draggedAssignment.id) {
          return {
            ...a,
            className: targetClass,
            stream: targetStream,
            day: targetDay,
            period: targetPeriod
          };
        }
        return a;
      });
    }

    onUpdateAssignments(updated);
    setDraggedAssignment(null);
  };

  // Slot Save from Modal
  const handleSaveSlot = (data: {
    className: string;
    stream: string;
    day: string;
    period: string;
    subject: string;
    teacherId?: number;
    room?: string;
    activityType: ActivityType;
    customNote?: string;
    applySchoolWide?: boolean;
  }) => {
    if (data.applySchoolWide) {
      // Apply to ALL streams across ALL classes for this day + period
      const newItems: TimetableAssignment[] = [];
      const updatedList = assignments.filter(a => !(a.day === data.day && a.period === data.period));

      DEFAULT_CLASSES.forEach(cName => {
        const streams = getStreamsForClass(cName);
        streams.forEach(sName => {
          newItems.push({
            id: Date.now() + Math.floor(Math.random() * 10000),
            className: cName,
            stream: sName,
            day: data.day,
            period: data.period,
            subject: data.subject,
            teacherId: data.teacherId,
            room: data.room,
            activityType: data.activityType,
            customNote: data.customNote
          });
        });
      });

      onUpdateAssignments([...updatedList, ...newItems]);
    } else {
      // Apply to single slot
      const existing = assignments.find(
        a =>
          isSameClass(a.className, data.className) &&
          isSameStream(a.stream, data.stream) &&
          a.day === data.day &&
          (a.period === data.period || a.periodName === data.period || a.period.startsWith(data.period.split(' (')[0]))
      );

      if (existing) {
        onUpdateAssignments(
          assignments.map(a => (a.id === existing.id ? { ...a, ...data } : a))
        );
      } else {
        onUpdateAssignments([
          ...assignments,
          {
            id: Date.now(),
            ...data
          }
        ]);
      }
    }
  };

  const handleDeleteSlot = (id: number) => {
    onUpdateAssignments(assignments.filter(a => a.id !== id));
  };

  // Extra-Curricular Scheduling Modal State (Supports Editable Start/End Times)
  const [extraCurricularModalOpen, setExtraCurricularModalOpen] = useState(false);
  const [selectedActivityForModal, setSelectedActivityForModal] = useState<typeof EXTRA_CURRICULAR_ACTIVITIES[0] | null>(null);

  const handleOpenScheduleExtraCurricular = (act?: typeof EXTRA_CURRICULAR_ACTIVITIES[0]) => {
    setSelectedActivityForModal(act || null);
    setExtraCurricularModalOpen(true);
  };

  const handleSaveExtraCurricularSchedule = (data: {
    activity: typeof EXTRA_CURRICULAR_ACTIVITIES[0];
    day: string;
    periodName: string;
    startTime: string;
    endTime: string;
    isSchoolWide: boolean;
    targetClass?: string;
    targetStream?: string;
    teacherId?: number;
    room: string;
    customNote?: string;
    syncToPeriodSettings: boolean;
  }) => {
    // 1. Sync or add to PeriodSettings if requested
    if (data.syncToPeriodSettings) {
      const existingIndex = periodSettings.findIndex(
        p => p.day === data.day && (p.name.toLowerCase() === data.periodName.toLowerCase() || (p.start === data.startTime && p.end === data.endTime))
      );
      let updatedPeriods = [...periodSettings];
      if (existingIndex >= 0) {
        updatedPeriods[existingIndex] = {
          ...updatedPeriods[existingIndex],
          name: data.periodName,
          start: data.startTime,
          end: data.endTime
        };
      } else {
        updatedPeriods.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          day: data.day,
          name: data.periodName,
          start: data.startTime,
          end: data.endTime
        });
      }
      onUpdatePeriodSettings(updatedPeriods);
    }

    // 2. Format period label
    const periodKey = `${data.periodName} (${data.startTime}-${data.endTime})`;

    // 3. Update assignments
    let newItems: TimetableAssignment[] = [];
    let updatedList = assignments.filter(a => {
      if (a.day !== data.day) return true;
      if (data.isSchoolWide) {
        return a.period !== periodKey && a.period !== data.periodName && a.periodName !== data.periodName;
      } else {
        return !(
          a.className === data.targetClass &&
          a.stream === data.targetStream &&
          (a.period === periodKey || a.period === data.periodName || a.periodName === data.periodName)
        );
      }
    });

    if (data.isSchoolWide) {
      DEFAULT_CLASSES.forEach(cName => {
        const streams = getStreamsForClass(cName);
        streams.forEach(sName => {
          newItems.push({
            id: Date.now() + Math.floor(Math.random() * 100000),
            className: cName,
            stream: sName,
            day: data.day,
            period: periodKey,
            periodName: data.periodName,
            subject: data.activity.name,
            activityType: data.activity.id as ActivityType,
            teacherId: data.teacherId,
            room: data.room,
            customNote: data.customNote
          });
        });
      });
    } else if (data.targetClass && data.targetStream) {
      newItems.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        className: data.targetClass,
        stream: data.targetStream,
        day: data.day,
        period: periodKey,
        periodName: data.periodName,
        subject: data.activity.name,
        activityType: data.activity.id as ActivityType,
        teacherId: data.teacherId,
        room: data.room,
        customNote: data.customNote
      });
    }

    onUpdateAssignments([...updatedList, ...newItems]);
  };

  // Stream Settings Form state
  const [newStreamClass, setNewStreamClass] = useState('Form 1');
  const [newStreamLevel, setNewStreamLevel] = useState<'CSEE' | 'ACSEE'>('CSEE');
  const [newStreamNames, setNewStreamNames] = useState('STREAM A, STREAM B');

  // Master Assignment Form state
  const [assignClass, setAssignClass] = useState('Form 1');
  const [assignStream, setAssignStream] = useState('STREAM A');
  const [assignDay, setAssignDay] = useState('Monday');
  const [assignPeriod, setAssignPeriod] = useState('');
  const [assignTeacher, setAssignTeacher] = useState<number>(teachers[0]?.id || 0);
  const [assignSubject, setAssignSubject] = useState(teachers[0]?.subjects[0] || 'Mathematics');

  const handleMasterAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPeriod) {
      alert('Please select a period.');
      return;
    }

    const data: TimetableAssignment = {
      id: Date.now(),
      className: assignClass,
      stream: assignStream,
      day: assignDay,
      period: assignPeriod,
      teacherId: assignTeacher || undefined,
      subject: assignSubject,
      activityType: 'academic'
    };

    console.log('[TimetableContainer] INVESTIGATE SAVE - handleMasterAssign new assignment object:', JSON.stringify(data, null, 2));

    const updated = assignments.filter(
      a =>
        !(
          a.className === assignClass &&
          a.stream === assignStream &&
          a.day === assignDay &&
          a.period === assignPeriod
        )
    );

    const finalAssignments = [...updated, data];
    console.log('[TimetableContainer] INVESTIGATE SAVE - dispatching total assignments count:', finalAssignments.length);

    onUpdateAssignments(finalAssignments);
    alert(`Assigned ${assignSubject} to ${assignClass} ${assignStream} on ${assignDay}!`);
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex flex-wrap gap-1 items-center flex-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          General Timetable
        </button>

        <button
          onClick={() => setActiveTab('class')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'class'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Class Timetable
        </button>

        <button
          onClick={() => setActiveTab('teacher')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'teacher'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Teacher Timetable
        </button>

        <button
          onClick={() => setActiveTab('master')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'master'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-4 h-4" />
          Master Assignment
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'journal'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Shajara ya Darasa (Class Journal)</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'policies'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Institutional Policies
        </button>

        <button
          onClick={() => setActiveTab('constraints')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'constraints'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Constraint Rules &amp; Audit</span>
          {constraintValidationReport.criticalIssuesCount + constraintValidationReport.warningIssuesCount > 0 ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
              <span>{constraintValidationReport.criticalIssuesCount + constraintValidationReport.warningIssuesCount} Violations</span>
            </span>
          ) : (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {constraintValidationReport.overallComplianceScore}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'allocations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Subject Allocations
        </button>

        <button
          onClick={() => setActiveTab('teacherAssignments')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'teacherAssignments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Teacher Allocations
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-4 h-4" />
          Settings
        </button>

        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'integrity'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {integrityReport.criticalCount > 0 ? (
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          )}
          <span>Integrity Report</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            integrityReport.criticalCount > 0
              ? 'bg-rose-100 text-rose-700'
              : integrityReport.warningCount > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {integrityReport.score}% Score
          </span>
        </button>
        </div>

        <div className="flex items-center gap-2 pr-1 shrink-0">
          <button
            type="button"
            onClick={handlePrintActiveTimetableGrid}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 border border-blue-500"
            title="Print current generated timetable grid using browser print"
          >
            <Printer className="w-4 h-4" />
            <span>Print Timetable</span>
          </button>
        </div>
      </div>

      {/* Conflict Bar Alert (if any teacher is double-booked or conflicts exist) */}
      {(totalConflicts > 0 || integrityReport.criticalCount > 0) && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900 shadow-xs animate-in fade-in flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-bold flex items-center gap-2">
                <span>Timetable Integrity Conflicts Detected</span>
                <span className="text-xs font-black px-2 py-0.5 bg-rose-600 text-white rounded-full">
                  {integrityReport.criticalCount || totalConflicts} Clashes
                </span>
                {integrityReport.warningCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-500 text-white rounded-full">
                    {integrityReport.warningCount} Warnings
                  </span>
                )}
              </span>
              <span className="text-[11px] opacity-90 font-medium">
                {integrityReport.criticalCount || totalConflicts} period slot(s) have teacher clashes (double-booked teachers) or policy violations. Clashing slots are highlighted in red below.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIntegrityReportModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Integrity Audit Ledger</span>
            </button>
            <button
              onClick={handleResolveConflicts}
              className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-black hover:bg-rose-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resolve Clashes</span>
            </button>
          </div>
        </div>
      )}

      {/* SCHEDULING MODE SELECTION BAR (MANUAL vs AUTO ISOLATION) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900 flex flex-wrap items-center gap-2">
                  <span>Mbinu ya Kupanga Ratiba (Scheduling Mode)</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <span>🔒</span>
                    <span>Zero-Clash Isolation Active</span>
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chagua kutengeneza ratiba kwa mkono (Manual) au kiotomatiki na AI (Auto). Mifumo hii imetenganishwa ili isingiliane.
                </p>
              </div>
            </div>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setSchedulingMode('MANUAL')}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                schedulingMode === 'MANUAL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="text-sm">✋</span>
              <span>Manual Mode (Kupanga kwa Mkono)</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono">
                {manualAssignmentsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSchedulingMode('AUTO')}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                schedulingMode === 'AUTO'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Auto / AI Mode (Kiotomatiki)</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono">
                {autoAssignmentsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Active Mode Details Banner */}
        {schedulingMode === 'MANUAL' ? (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 sm:mt-0">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-blue-950 block text-sm flex items-center gap-2">
                  <span>Hali ya Kupanga kwa Mkono (Manual Schedule Mode)</span>
                  <span className="px-2 py-0.2 rounded-full bg-blue-200 text-blue-900 text-[10px] font-mono font-bold">
                    {manualAssignmentsCount} Vipindi Vimelindwa (Locked)
                  </span>
                </span>
                <span className="text-blue-800 text-[11px] block mt-0.5">
                  Bofya kisanduku (slot) chochote kwenye jedwali chini kumpangia mwalimu na somo. Vipindi unavyoweka hapa vinalindwa kiotomatiki (🔒 Locked) na haviingiliwi wala kufutwa na generator ya kiotomatiki.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingSlot({
                    className: selectedClassFilter,
                    stream: getStreamsForClass(selectedClassFilter)[0] || 'STREAM A',
                    day: 'Monday',
                    period: periodSettings[0] ? `${periodSettings[0].name} (${periodSettings[0].start}-${periodSettings[0].end})` : 'Period 1 (08:00-08:40)'
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Panga Kipindi cha Mkono</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5 sm:mt-0">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <div>
                <span className="font-extrabold text-indigo-950 block text-sm flex flex-wrap items-center gap-2">
                  <span>Hali ya Kupanga Kiotomatiki na AI (Auto-Generate Engine)</span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                    🔒 Zero-Clash Isolation Active
                  </span>
                </span>
                <span className="text-indigo-800 text-[11px] block mt-0.5">
                  AI inazalisha ratiba kamili kwa ngazi au darasa maalum kwa kufuata sera za shule. Vipindi vyote vya mkono vinalindwa na walimu wao hawawezi kupangiwa vipindi viwili kwa wakati mmoja.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAiByLevelModalOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-700 to-blue-800 hover:brightness-110 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 border border-indigo-500"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Auto-Generate kwa Ngazi (Level)</span>
              </button>

              <button
                type="button"
                onClick={() => setAiGeneratorModalOpen(true)}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 border border-amber-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-amber-600" />
                <span>Auto Darasa Moja (Single Class)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Extra-Curricular Bar (Editable Times) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-white">
                Extra-Curricular & Special Periods (Fully Editable Times)
              </h4>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Select any activity to set custom start & end times, duration, day, and room. Choose school-wide or specific stream.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIntegrityReportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border border-white/20"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Integrity Audit ({integrityReport.score}%)</span>
            </button>
            <button
              type="button"
              onClick={() => setAiByLevelModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-blue-400"
              title="Generate conflict-free timetable for all streams in a chosen level at once"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Generate Timetable with AI by Level</span>
            </button>
            <button
              type="button"
              onClick={() => setAiGeneratorModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-500 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border border-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-amber-500" />
              <span>AI Single Class</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenScheduleExtraCurricular()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Schedule Custom Activity</span>
            </button>
            {EXTRA_CURRICULAR_ACTIVITIES.map(act => (
              <button
                key={act.id}
                type="button"
                onClick={() => handleOpenScheduleExtraCurricular(act)}
                style={{ backgroundColor: act.color }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title={`Schedule ${act.name} with editable times`}
              >
                {renderActivityIcon(act.icon, "w-3.5 h-3.5")}
                <span>{act.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. GENERAL TIMETABLE TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class:</span>
              <select
                value={selectedGeneralClass}
                onChange={e => {
                  setSelectedGeneralClass(e.target.value);
                  setSelectedGeneralStream('All');
                }}
                className="px-3 py-1.5 text-xs font-bold border border-blue-300 rounded-lg bg-blue-50/70 text-blue-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                title="Select Class to display timetable"
              >
                <option value="All">🏫 All Classes (Whole School)</option>
                <optgroup label="NURSERY LEVEL">
                  {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="PRIMARY LEVEL (Std 1 - 7)">
                  {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="SECONDARY LEVEL (Form 1 - 6)">
                  {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Stream:</span>
              <select
                value={selectedGeneralStream}
                onChange={e => setSelectedGeneralStream(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-emerald-300 rounded-lg bg-emerald-50/70 text-emerald-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                title="Select Stream"
              >
                <option value="All">
                  {selectedGeneralClass === 'All' ? 'All Streams' : `All Streams (${getStreamsForClass(selectedGeneralClass).join(', ')})`}
                </option>
                {selectedGeneralClass !== 'All' ? (
                  getStreamsForClass(selectedGeneralClass).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))
                ) : (
                  Array.from(new Set(DEFAULT_CLASSES.flatMap(c => getStreamsForClass(c)))).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))
                )}
              </select>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Day:</span>
              <select
                value={selectedDayFilter}
                onChange={e => setSelectedDayFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white cursor-pointer"
              >
                <option value="All">All Days</option>
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <div className="text-xs text-slate-500 hidden xl:flex items-center gap-1 ml-2">
                <Move className="w-3.5 h-3.5 text-blue-500" />
                <span>Drag slots to reschedule • Click any slot to edit</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                <button
                  onClick={() => setPrintOrientation('portrait')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    printOrientation === 'portrait' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setPrintOrientation('landscape')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                    printOrientation === 'landscape' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Landscape
                </button>
              </div>

              <button
                type="button"
                onClick={() => setHighlightConstraintsInRed(!highlightConstraintsInRed)}
                className={`px-3 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border ${
                  highlightConstraintsInRed
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Toggle red violation highlights on timetable grid for Max Lessons, Double Periods & Availability breaches"
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${highlightConstraintsInRed ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                <span>Violations ({constraintValidationReport.criticalIssuesCount + constraintValidationReport.warningIssuesCount})</span>
                <span className={`w-2 h-2 rounded-full ${highlightConstraintsInRed ? 'bg-rose-600 animate-ping' : 'bg-slate-300'}`} />
              </button>

              <button
                onClick={() => setIntegrityReportModalOpen(true)}
                className={`px-3 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border ${
                  integrityReport.criticalCount > 0
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Cross-reference timetable against institutional policies and teacher availability"
              >
                {integrityReport.criticalCount > 0 ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Integrity Report ({integrityReport.score}%)</span>
                {integrityReport.criticalCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setAiByLevelModalOpen(true)}
                className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-blue-400"
                title="Auto-generates conflict-free timetable for all streams in chosen level at once"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Generate by Level</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('journal')}
                className="px-3.5 py-2 text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Fungua Shajara ya Darasa (Class Journal)"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Shajara ya Darasa (Class Journal)</span>
              </button>

              <button
                onClick={() => setAiGeneratorModalOpen(true)}
                className="px-3 py-2 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI Auto-Generate</span>
              </button>

              <button
                onClick={() => {
                  const scopeLabel = selectedGeneralClass === 'All' ? 'Whole School' : selectedGeneralClass;
                  const streamLabel = selectedGeneralStream !== 'All' ? selectedGeneralStream : '';
                  handleShareTimetableWhatsApp(`General Timetable - ${scopeLabel} ${streamLabel}`.trim());
                }}
                className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Send Timetable details to teachers and parents on WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => exportTimetableToCSV(assignments, teachers)}
                className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export CSV
              </button>

              <button
                onClick={() => {
                  exportTimetablePDF({
                    viewMode: 'general',
                    assignments,
                    teachers,
                    periodSettings,
                    streamSettings,
                    schoolInfo,
                    schoolName,
                    selectedClass: selectedGeneralClass,
                    selectedStream: selectedGeneralStream,
                    selectedDay: selectedDayFilter,
                    orientation: printOrientation
                  });
                }}
                className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Save general timetable as a professional PDF document using jsPDF"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Save PDF (jsPDF)</span>
              </button>

              <button
                onClick={() => {
                  const scopeLabel = selectedGeneralClass === 'All' ? 'Whole School' : selectedGeneralClass;
                  const streamLabel = selectedGeneralStream !== 'All' ? selectedGeneralStream : '';
                  printFormattedSection('general-printable-view', `General Teaching Timetable - ${scopeLabel} ${streamLabel}`.trim(), schoolName, { orientation: printOrientation });
                }}
                className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Timetable</span>
              </button>
            </div>
          </div>

          {/* Timetable View by Days */}
          <div id="general-printable-view" className="space-y-8 master-timetable-container">
            {DAYS_OF_WEEK.filter(day => selectedDayFilter === 'All' || selectedDayFilter === day).map(day => {
              const dayTheme = getDayTheme(day, dayThemes);
  const timeToMinutes = (timeStr: string) => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const dayPeriods = periodSettings
    .filter(p => p.day === day)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

              if (dayPeriods.length === 0) return null;

              return (
                <div
                  key={day}
                  style={{ backgroundColor: dayTheme.bg, borderColor: dayTheme.border }}
                  className="border rounded-xl shadow-xs overflow-hidden transition-all print-avoid-break"
                >
                  {/* Day Header */}
                  <div
                    style={{ backgroundColor: dayTheme.headerBg }}
                    className="px-5 py-3 text-white flex items-center justify-between font-bold"
                  >
                    <div className="flex items-center gap-2 text-base">
                      <span>{day}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                        {dayPeriods.length} Periods Configured
                      </span>
                    </div>
                    <span className="text-xs font-medium text-white/90">
                      Drag & Drop enabled • Color-coded Streams
                    </span>
                  </div>

                  {/* Day Grid: Shows selected class/stream or whole school */}
                  <div className="p-4 space-y-4">
                    {(selectedGeneralClass === 'All' ? DEFAULT_CLASSES : [selectedGeneralClass]).map(className => {
                      const formTheme = getFormStreamTheme(className);
                      const allStreams = getStreamsForClass(className);
                      const streams = selectedGeneralStream === 'All'
                        ? allStreams
                        : allStreams.filter(st => st === selectedGeneralStream);

                      if (streams.length === 0) {
                        if (selectedGeneralClass === 'All') return null;
                        return (
                          <div key={className} className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-400">
                            No stream found for {className} matching &quot;{selectedGeneralStream}&quot;.
                          </div>
                        );
                      }

                      return (
                        <div
                          key={className}
                          className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs"
                        >
                          {/* Class / Form Header */}
                          <div
                            style={{ backgroundColor: formTheme.lightBg, borderLeftColor: formTheme.accent }}
                            className="px-4 py-2 border-l-4 flex items-center justify-between"
                          >
                            <span
                              style={{ color: formTheme.accent }}
                              className="text-xs font-extrabold tracking-wide uppercase"
                            >
                              {className}
                            </span>
                            <div className="flex items-center gap-1">
                              {streams.map(st => (
                                <span
                                  key={st}
                                  style={{ backgroundColor: formTheme.badgeBg, color: formTheme.badgeText }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                >
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Matrix Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                                  <th className="p-2.5 w-32 border-r border-slate-200">Stream</th>
                                  {dayPeriods.map(p => {
                                    const periodExtra = getExtraCurricularInfo(p.name);
                                    const isBreakfast = p.name.toLowerCase().includes('breakfast');
                                    const isLunch = p.name.toLowerCase().includes('lunch');
                                    const isReligion = p.name.toLowerCase().includes('religion');

                                    const thBg = isBreakfast 
                                      ? '#fef3c7' 
                                      : isLunch 
                                      ? '#ffedd5' 
                                      : isReligion 
                                      ? '#e0e7ff' 
                                      : periodExtra 
                                      ? periodExtra.cardBg 
                                      : undefined;

                                    const thText = isBreakfast 
                                      ? '#78350f' 
                                      : isLunch 
                                      ? '#7c2d12' 
                                      : isReligion 
                                      ? '#312e81' 
                                      : periodExtra 
                                      ? periodExtra.text 
                                      : undefined;

                                    const thBorder = isBreakfast 
                                      ? '2px solid #f59e0b' 
                                      : isLunch 
                                      ? '2px solid #ea580c' 
                                      : isReligion 
                                      ? '2px solid #6366f1' 
                                      : periodExtra 
                                      ? `2px solid ${periodExtra.cellBorder}` 
                                      : undefined;

                                    return (
                                      <th 
                                        key={p.id} 
                                        style={{
                                          backgroundColor: thBg,
                                          color: thText,
                                          borderBottom: thBorder
                                        }}
                                        className={`p-2.5 border-r border-slate-200 min-w-[135px] transition-colors ${
                                          thBg ? 'font-extrabold' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {isBreakfast && <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                          {isLunch && <Utensils className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                                          {isReligion && <BookMarked className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                          {!isBreakfast && !isLunch && !isReligion && periodExtra && renderActivityIcon(periodExtra.iconName, "w-3.5 h-3.5 shrink-0")}
                                          <span>{p.name}</span>
                                        </div>
                                        <div 
                                          style={{ color: thText ? thText : undefined }}
                                          className={`text-[10px] font-normal ${thText ? 'opacity-80' : 'text-slate-400'}`}
                                        >
                                          {p.start} - {p.end}
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {streams.map(stream => {
                                  return (
                                    <tr key={stream} className="border-b border-slate-100 hover:bg-slate-50/50">
                                      <td className="p-2.5 border-r border-slate-200 font-bold text-xs bg-slate-50/70">
                                        <span
                                          style={{
                                            backgroundColor: formTheme.lightBg,
                                            color: formTheme.accent,
                                            borderColor: formTheme.border
                                          }}
                                          className="px-2 py-0.5 rounded-md border text-[11px] inline-block"
                                        >
                                          {stream}
                                        </span>
                                      </td>

                                      {dayPeriods.map(period => {
                                        const periodKey = `${period.name} (${period.start}-${period.end})`;
                                        const assignment = assignments.find(
                                          a =>
                                            isSameClass(a.className, className) &&
                                            isSameStream(a.stream, stream) &&
                                            a.day.toLowerCase() === day.toLowerCase() &&
                                            (a.period === periodKey || a.period === period.name || (a.periodName && a.periodName === period.name))
                                        );

                                        const teacher = assignment?.teacherId
                                          ? teachers.find(t => t.id === assignment.teacherId)
                                          : undefined;

                                        const conflict = assignment ? conflicts[assignment.id] : undefined;
                                        const cellKey = `${className}_${stream}_${day}_${periodKey}`;
                                        const isDragOver = dragOverKey === cellKey;

                                        const subColor = assignment ? getSubjectColor(assignment.subject) : null;
                                        const teacherColor = teacher ? getTeacherColor(teacher.id) : null;

                                        const extraInfo = assignment
                                          ? getExtraCurricularInfo(assignment.subject, assignment.activityType)
                                          : getExtraCurricularInfo(period.name);

                                        const constraintViolation = getSlotConstraintViolation(
                                          className,
                                          stream,
                                          day,
                                          periodKey,
                                          constraintValidationReport,
                                          assignment?.id
                                        );

                                        return (
                                          <td
                                            key={period.id}
                                            onDragOver={e => handleDragOver(e, cellKey)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={e => handleDrop(e, className, stream, day, periodKey)}
                                            onClick={() =>
                                              setEditingSlot({
                                                className,
                                                stream,
                                                day,
                                                period: periodKey,
                                                assignment
                                              })
                                            }
                                            style={{
                                              backgroundColor: isDragOver
                                                ? '#dbeafe'
                                                : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                                ? '#fff1f2'
                                                : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isWarning)
                                                ? '#fffbeb'
                                                : conflict?.hasConflict
                                                ? '#fff1f2'
                                                : extraInfo
                                                ? extraInfo.cellBg
                                                : undefined,
                                              borderLeft: extraInfo ? `3px solid ${extraInfo.cellBorder}` : undefined
                                            }}
                                            className={`p-2 border-r border-slate-200 align-top cursor-pointer transition-all ${
                                              isDragOver
                                                ? 'ring-2 ring-blue-400 ring-inset'
                                                : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                                ? 'ring-2 ring-rose-500 ring-inset z-10'
                                                : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isWarning)
                                                ? 'ring-2 ring-amber-500 ring-inset z-10'
                                                : conflict?.hasConflict
                                                ? 'ring-1 ring-rose-400'
                                                : assignment
                                                ? 'hover:brightness-95'
                                                : extraInfo
                                                ? 'hover:brightness-95'
                                                : 'hover:bg-blue-50/40'
                                            }`}
                                          >
                                            {assignment ? (
                                              <div
                                                draggable
                                                onDragStart={e => handleDragStart(e, assignment)}
                                                style={{
                                                  backgroundColor: extraInfo ? extraInfo.cardBg : subColor?.bg,
                                                  borderColor: (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                                    ? '#e11d48'
                                                    : conflict?.hasConflict 
                                                    ? '#f43f5e' 
                                                    : extraInfo 
                                                    ? extraInfo.cellBorder 
                                                    : subColor?.border
                                                }}
                                                className={`p-1.5 rounded-md border text-xs relative group shadow-2xs select-none ${
                                                  extraInfo ? 'border-2' : ''
                                                } ${
                                                  highlightConstraintsInRed && constraintViolation.hasViolation ? 'shadow-lg' : ''
                                                }`}
                                              >
                                                {/* Constraint Violation Indicator */}
                                                {highlightConstraintsInRed && constraintViolation.hasViolation && (
                                                  <div 
                                                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-black z-20 shadow-sm border border-white ${
                                                      constraintViolation.isCritical ? 'bg-rose-600' : 'bg-amber-600'
                                                    }`}
                                                    title={constraintViolation.topMessage}
                                                  >
                                                    !
                                                  </div>
                                                )}

                                                {/* Activity / Meal / Religion Badge */}
                                                {extraInfo && (
                                                  <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span
                                                      style={{
                                                        backgroundColor: extraInfo.accent,
                                                        color: '#ffffff'
                                                      }}
                                                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-2xs"
                                                    >
                                                      {renderActivityIcon(extraInfo.iconName, "w-2.5 h-2.5")}
                                                      <span>{extraInfo.badgeText}</span>
                                                    </span>
                                                    {assignment.activityType && assignment.activityType !== 'academic' && (
                                                      <span className="text-[8px] font-semibold text-slate-500 uppercase">
                                                        Special
                                                      </span>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Subject Tag */}
                                                <div
                                                  style={{ color: extraInfo ? extraInfo.text : subColor?.text }}
                                                  className="font-bold leading-tight truncate flex items-center justify-between gap-1"
                                                >
                                                  <span title={assignment.subject} className="flex items-center gap-1">
                                                    {!extraInfo && <span>{assignment.subject}</span>}
                                                    {extraInfo && <span className="font-extrabold">{assignment.subject}</span>}
                                                  </span>
                                                  {conflict?.hasConflict && (
                                                    <span
                                                      title={`Clash! Double-booked with ${conflict.conflictingWith
                                                        .map(c => `${c.className} ${c.stream}`)
                                                        .join(', ')}`}
                                                      className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 animate-pulse"
                                                    >
                                                      !
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Teacher / Coordinator & Room */}
                                                <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
                                                  {teacher ? (
                                                    <span
                                                      style={{
                                                        backgroundColor: teacherColor?.hex,
                                                        color: '#ffffff'
                                                      }}
                                                      title={`${teacher.name} (${teacher.subjects.join(', ')})`}
                                                      className="px-1.5 py-0.2 rounded-full font-bold shadow-2xs"
                                                    >
                                                      {teacher.initial}
                                                    </span>
                                                  ) : (
                                                    <span className="text-slate-400 italic text-[9px]">
                                                      {extraInfo ? 'Coordinator' : 'No teacher'}
                                                    </span>
                                                  )}

                                                  {assignment.room && (
                                                    <span
                                                      style={{ color: extraInfo ? extraInfo.text : undefined }}
                                                      className="font-semibold truncate max-w-[80px]"
                                                    >
                                                      {assignment.room}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Conflict tooltip */}
                                                {conflict?.hasConflict && (
                                                  <div className="text-[9px] text-rose-700 font-bold mt-0.5 leading-none">
                                                    Clash: {conflict.conflictingWith[0]?.className}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="h-10 flex items-center justify-center text-xs">
                                                {extraInfo ? (
                                                  <span
                                                    style={{ color: extraInfo.accent }}
                                                    className="text-[10px] font-bold flex items-center gap-1 opacity-75 hover:opacity-100"
                                                  >
                                                    {renderActivityIcon(extraInfo.iconName, "w-3 h-3")}
                                                    + {extraInfo.name}
                                                  </span>
                                                ) : (
                                                  <div className="text-slate-300 group-hover:text-slate-400">
                                                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-blue-500">
                                                      + Assign
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CLASS TIMETABLE TAB                                  */}
      {/* ======================================================== */}
      {activeTab === 'class' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Class:</label>
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
              >
                {DEFAULT_CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={() => onToggleClassRelease(selectedClassFilter)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                  classTimetableReleased[selectedClassFilter]
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {classTimetableReleased[selectedClassFilter] ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    Released to Teachers
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Admin Only (Unreleased)
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAiByLevelModalOpen(true)}
                className="px-3 py-2 text-xs font-black bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs hover:from-blue-800 hover:to-indigo-800 cursor-pointer border border-blue-400"
                title="Generate timetable for all streams in this level"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Generate by Level</span>
              </button>

              <button
                onClick={() => setIntegrityReportModalOpen(true)}
                className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Audit timetable integrity"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Integrity Audit</span>
              </button>

              <button
                onClick={() => handleShareTimetableWhatsApp(`${selectedClassFilter} Timetable`)}
                className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Send Class Timetable via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  const streams = getStreamsForClass(selectedClassFilter);
                  exportClassTimetableGridToCSV(
                    selectedClassFilter,
                    streams[0] || 'A',
                    DAYS_OF_WEEK,
                    periodSettings,
                    assignments,
                    teachers
                  );
                }}
                className="px-3 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export Grid CSV
              </button>

              <button
                onClick={() => {
                  exportTimetablePDF({
                    viewMode: 'class',
                    assignments,
                    teachers,
                    periodSettings,
                    streamSettings,
                    schoolInfo,
                    schoolName,
                    selectedClass: selectedClassFilter,
                    selectedStream: 'All',
                    selectedDay: 'All',
                    orientation: 'landscape'
                  });
                }}
                className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Save class timetable grid as a professional PDF document using jsPDF"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Save Grid PDF (jsPDF)</span>
              </button>

              <button
                onClick={() => printFormattedSection('class-printable-view', `${selectedClassFilter} Timetable`, schoolName)}
                className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Class Timetable
              </button>
            </div>
          </div>

          {/* Quick Stream Tabs for the selected level */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Quick Stream Navigator:</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Click any stream below to view its weekly timetable instantly
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {DEFAULT_CLASSES.flatMap(cName => {
                const sList = getStreamsForClass(cName);
                return sList.map(sName => ({
                  className: cName,
                  stream: sName,
                  label: `${cName.replace('Standard ', 'Std ').replace('Form ', 'F')}${sName.replace('STREAM ', '').replace('Stream ', '')}`
                }));
              }).map(item => {
                const isSelected = selectedClassFilter === item.className;
                return (
                  <button
                    key={`${item.className}_${item.stream}`}
                    onClick={() => setSelectedClassFilter(item.className)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Printable Class Grid */}
          <div id="class-printable-view" className="space-y-6 master-timetable-container">
            {getStreamsForClass(selectedClassFilter).map(stream => {
              const formTheme = getFormStreamTheme(selectedClassFilter);

              return (
                <div key={stream} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div
                    style={{ backgroundColor: formTheme.accent }}
                    className="px-5 py-3 text-white flex items-center justify-between font-bold"
                  >
                    <span className="text-sm">
                      {selectedClassFilter} — {stream}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20">
                      Standard Weekly Roster
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[11px]">
                          <th className="p-2.5 border-r border-slate-200 w-36">Period / Time</th>
                          {DAYS_OF_WEEK.map(day => {
                            const dayTheme = getDayTheme(day, dayThemes);
                            return (
                              <th
                                key={day}
                                style={{ backgroundColor: dayTheme.bg, color: dayTheme.text }}
                                className="p-2.5 border-r border-slate-200 min-w-[120px] text-center"
                              >
                                {day}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(periodSettings.map(p => `${p.name} (${p.start}-${p.end})`))).map(periodKey => {
                          return (
                            <tr key={periodKey} className="border-b border-slate-100">
                              <td className="p-2.5 border-r border-slate-200 font-semibold bg-slate-50 text-slate-800">
                                {periodKey}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const pNameOnly = periodKey.split(' (')[0];
                                const assignment = assignments.find(
                                  a =>
                                    isSameClass(a.className, selectedClassFilter) &&
                                    isSameStream(a.stream, stream) &&
                                    a.day === day &&
                                    (a.period === periodKey || a.period === pNameOnly || (a.periodName && a.periodName === pNameOnly))
                                );
                                const teacher = assignment?.teacherId
                                  ? teachers.find(t => t.id === assignment.teacherId)
                                  : undefined;
                                const subColor = assignment ? getSubjectColor(assignment.subject) : null;
                                const teacherColor = teacher ? getTeacherColor(teacher.id) : null;
                                const extraInfo = assignment
                                  ? getExtraCurricularInfo(assignment.subject, assignment.activityType)
                                  : getExtraCurricularInfo(periodKey);

                                const constraintViolation = getSlotConstraintViolation(
                                  selectedClassFilter,
                                  stream,
                                  day,
                                  periodKey,
                                  constraintValidationReport,
                                  assignment?.id
                                );

                                return (
                                  <td
                                    key={day}
                                    onClick={() =>
                                      setEditingSlot({
                                        className: selectedClassFilter,
                                        stream,
                                        day,
                                        period: periodKey,
                                        assignment
                                      })
                                    }
                                    style={{
                                      backgroundColor: (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                        ? '#fff1f2'
                                        : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isWarning)
                                        ? '#fffbeb'
                                        : extraInfo 
                                        ? extraInfo.cellBg 
                                        : undefined,
                                      borderLeft: extraInfo ? `3px solid ${extraInfo.cellBorder}` : undefined
                                    }}
                                    className={`p-2 border-r border-slate-200 text-center cursor-pointer transition-all ${
                                      (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                        ? 'ring-2 ring-rose-500 ring-inset z-10'
                                        : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isWarning)
                                        ? 'ring-2 ring-amber-500 ring-inset z-10'
                                        : 'hover:bg-blue-50/40'
                                    }`}
                                  >
                                    {assignment ? (
                                      <div
                                        style={{ 
                                          backgroundColor: extraInfo ? extraInfo.cardBg : subColor?.bg, 
                                          borderColor: (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                            ? '#e11d48'
                                            : extraInfo 
                                            ? extraInfo.cellBorder 
                                            : subColor?.border 
                                        }}
                                        className={`p-1.5 rounded-md border text-xs shadow-2xs relative ${extraInfo ? 'border-2' : ''} ${
                                          highlightConstraintsInRed && constraintViolation.hasViolation ? 'shadow-lg' : ''
                                        }`}
                                      >
                                        {/* Constraint Violation Indicator */}
                                        {highlightConstraintsInRed && constraintViolation.hasViolation && (
                                          <div 
                                            className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-black z-20 shadow-sm border border-white ${
                                              constraintViolation.isCritical ? 'bg-rose-600' : 'bg-amber-600'
                                            }`}
                                            title={constraintViolation.topMessage}
                                          >
                                            !
                                          </div>
                                        )}

                                        {extraInfo && (
                                          <div className="flex items-center justify-center gap-1 mb-1">
                                            <span
                                              style={{ backgroundColor: extraInfo.accent, color: '#ffffff' }}
                                              className="text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase flex items-center gap-1"
                                            >
                                              {renderActivityIcon(extraInfo.iconName, "w-2.5 h-2.5")}
                                              {extraInfo.badgeText}
                                            </span>
                                          </div>
                                        )}
                                        <div 
                                          style={{ color: extraInfo ? extraInfo.text : subColor?.text }} 
                                          className="font-bold truncate"
                                        >
                                          {assignment.subject}
                                        </div>
                                        <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
                                          {teacher && (
                                            <span
                                              style={{ backgroundColor: teacherColor?.hex, color: '#ffffff' }}
                                              className="px-1.5 py-0.2 rounded-full font-bold shadow-2xs"
                                            >
                                              {teacher.initial}
                                            </span>
                                          )}
                                          {assignment.room && (
                                            <span 
                                              style={{ color: extraInfo ? extraInfo.text : undefined }}
                                              className="font-semibold truncate max-w-[80px]"
                                            >
                                              {assignment.room}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : extraInfo ? (
                                      <span
                                        style={{ color: extraInfo.accent }}
                                        className="text-[10px] font-bold flex items-center justify-center gap-1 opacity-75"
                                      >
                                        {renderActivityIcon(extraInfo.iconName, "w-3 h-3")}
                                        {extraInfo.name}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 font-medium">—</span>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TEACHER TIMETABLE TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'teacher' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Teacher:</label>
              <select
                value={selectedTeacherFilter}
                onChange={e => setSelectedTeacherFilter(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.initial})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currentTeacher = teachers.find(t => t.id === selectedTeacherFilter);
                  handleShareTimetableWhatsApp(`${currentTeacher?.name || 'Teacher'} Teaching Timetable`);
                }}
                className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Send Teacher Timetable via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  exportTimetablePDF({
                    viewMode: 'teacher',
                    assignments,
                    teachers,
                    periodSettings,
                    streamSettings,
                    schoolInfo,
                    schoolName,
                    selectedTeacherId: selectedTeacherFilter,
                    orientation: 'portrait'
                  });
                }}
                className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Save teacher schedule as a professional PDF document using jsPDF"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Save Schedule PDF (jsPDF)</span>
              </button>

              <button
                onClick={() => {
                  const currentTeacher = teachers.find(t => t.id === selectedTeacherFilter);
                  printFormattedSection(
                    'teacher-printable-view',
                    `${currentTeacher?.name || 'Teacher'} Teaching Timetable`,
                    schoolName
                  );
                }}
                className="px-3 py-2 text-xs font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Schedule</span>
              </button>
            </div>
          </div>

          {/* Teacher Schedule View */}
          <div id="teacher-printable-view" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 master-timetable-container">
            {(() => {
              const currentTeacher = teachers.find(t => t.id === selectedTeacherFilter);
              if (!currentTeacher) return <p className="text-slate-500">Select a teacher.</p>;

              const teacherAssignments = assignments.filter(a => a.teacherId === currentTeacher.id);
              const teacherCol = getTeacherColor(currentTeacher.id);

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                    <span
                      style={{ backgroundColor: teacherCol.hex, color: '#ffffff' }}
                      className="w-14 h-14 rounded-xl inline-flex items-center justify-center text-lg font-black shadow-sm"
                    >
                      {currentTeacher.initial}
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">{currentTeacher.name}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        Teaching Subjects: <span className="text-blue-700">{currentTeacher.subjects.join(', ')}</span> • Total Lessons Assigned: <span className="text-emerald-700">{teacherAssignments.length}</span>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[11px]">
                          <th className="p-2.5 border-r border-slate-200 w-36">Period / Time</th>
                          {DAYS_OF_WEEK.map(day => {
                            const dayTheme = getDayTheme(day, dayThemes);
                            return (
                              <th
                                key={day}
                                style={{ backgroundColor: dayTheme.bg, color: dayTheme.text }}
                                className="p-2.5 border-r border-slate-200 min-w-[130px] text-center"
                              >
                                {day}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(periodSettings.map(p => `${p.name} (${p.start}-${p.end})`))).map(periodKey => {
                          return (
                            <tr key={periodKey} className="border-b border-slate-100">
                              <td className="p-2.5 border-r border-slate-200 font-semibold bg-slate-50 text-slate-800">
                                {periodKey}
                              </td>

                              {DAYS_OF_WEEK.map(day => {
                                const pNameOnly = periodKey.split(' (')[0];
                                const assignment = teacherAssignments.find(
                                  a =>
                                    a.day === day &&
                                    (a.period === periodKey || a.period === pNameOnly || (a.periodName && a.periodName === pNameOnly))
                                );
                                const subColor = assignment ? getSubjectColor(assignment.subject) : null;

                                const constraintViolation = assignment ? getSlotConstraintViolation(
                                  assignment.className,
                                  assignment.stream,
                                  day,
                                  periodKey,
                                  constraintValidationReport,
                                  assignment.id
                                ) : { hasViolation: false, isCritical: false, isWarning: false, issues: [], topMessage: '' };

                                return (
                                  <td
                                    key={day}
                                    className={`p-2 border-r border-slate-200 text-center transition-all ${
                                      (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                        ? 'bg-rose-50 ring-2 ring-rose-500 ring-inset z-10'
                                        : (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isWarning)
                                        ? 'bg-amber-50 ring-2 ring-amber-500 ring-inset z-10'
                                        : 'hover:bg-blue-50/40'
                                    }`}
                                  >
                                    {assignment ? (
                                      <div
                                        style={{ 
                                          backgroundColor: subColor?.bg, 
                                          borderColor: (highlightConstraintsInRed && constraintViolation.hasViolation && constraintViolation.isCritical)
                                            ? '#e11d48'
                                            : subColor?.border 
                                        }}
                                        className={`p-2 rounded-md border text-xs shadow-2xs space-y-0.5 relative ${
                                          highlightConstraintsInRed && constraintViolation.hasViolation ? 'shadow-lg' : ''
                                        }`}
                                      >
                                        {/* Constraint Violation Indicator */}
                                        {highlightConstraintsInRed && constraintViolation.hasViolation && (
                                          <div 
                                            className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-black z-20 shadow-sm border border-white ${
                                              constraintViolation.isCritical ? 'bg-rose-600' : 'bg-amber-600'
                                            }`}
                                            title={constraintViolation.topMessage}
                                          >
                                            !
                                          </div>
                                        )}

                                        <div className="font-black text-slate-900 tracking-tighter">{assignment.subject}</div>
                                        <div className="text-[10px] text-slate-700 font-bold bg-white/60 px-1.5 py-0.5 rounded">
                                          {assignment.className} ({assignment.stream})
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 text-[10px] font-bold italic">— Free —</span>
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
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MASTER ASSIGNMENT TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'master' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200 flex items-center justify-between">
                  <span>Assign Teacher to Class Period</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIntegrityReportModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-slate-300"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Audit Integrity ({integrityReport.score}%)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiGeneratorModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Auto-Allocate</span>
                    </button>
                    {(() => {
                      const normalizedTarget = assignPeriod.split(' (')[0];
                      const hasConflict = assignments.some(a => 
                        a.day === assignDay && 
                        (a.periodName || a.period.split(' (')[0]) === normalizedTarget && 
                        a.teacherId === assignTeacher
                      );
                      return hasConflict && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Teacher Clash!
                        </span>
                      );
                    })()}
                  </div>
                </h3>

            <form onSubmit={handleMasterAssign} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Class / Form</label>
                <select
                  value={assignClass}
                  onChange={e => {
                    setAssignClass(e.target.value);
                    const streams = getStreamsForClass(e.target.value);
                    setAssignStream(streams[0] || 'STREAM A');
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {DEFAULT_CLASSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Stream / Combination</label>
                <select
                  value={assignStream}
                  onChange={e => setAssignStream(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {getStreamsForClass(assignClass).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Day</label>
                <select
                  value={assignDay}
                  onChange={e => setAssignDay(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Period</label>
                <select
                  value={assignPeriod}
                  onChange={e => setAssignPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Select Period --</option>
                  {periodSettings
                    .filter(p => p.day === assignDay)
                    .map(p => {
                      const label = `${p.name} (${p.start}-${p.end})`;
                      return <option key={p.id} value={label}>{label}</option>;
                    })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Teacher</label>
                <select
                  value={assignTeacher}
                  onChange={e => {
                    const tid = Number(e.target.value);
                    setAssignTeacher(tid);
                    const t = teachers.find(item => item.id === tid);
                    if (t && t.subjects.length > 0) {
                      setAssignSubject(t.subjects[0]);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.initial})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Subject</label>
                <select
                  value={assignSubject}
                  onChange={e => setAssignSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {teachers.find(t => t.id === assignTeacher)?.subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  )) || <option value="Mathematics">Mathematics</option>}
                </select>
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save & Assign Period
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
              Registered Faculty ({teachers.length})
            </h3>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {teachers.map(t => {
                const col = getTeacherColor(t.id);
                return (
                  <div key={t.id} className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: col.hex, color: '#ffffff' }}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold"
                      >
                        {t.initial}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.subjects.join(', ')}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                      {assignments.filter(a => a.teacherId === t.id).length} classes
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TIMETABLE & PERIOD SETTINGS TAB                       */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Day Background Colors Customizer */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Customizable Day Theme Backgrounds & Colors
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Each day has a distinct color theme for clarity. Choose or customize accents for each day of the week.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {DAYS_OF_WEEK.map(day => {
                const theme = getDayTheme(day, dayThemes);
                return (
                  <div
                    key={day}
                    style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                    className="p-3 rounded-lg border flex flex-col items-center justify-between gap-2 text-center"
                  >
                    <span className="text-xs font-bold" style={{ color: theme.text }}>
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={theme.headerBg}
                        onChange={e => {
                          if (onUpdateDayThemes) {
                            onUpdateDayThemes({
                              ...(dayThemes || {}),
                              [day]: e.target.value
                            });
                          }
                        }}
                        className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                        title={`Customize ${day} accent color`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Period Settings Manager with Edit, Save, and Delete */}
          <PeriodSettingsManager
            periodSettings={periodSettings}
            onUpdatePeriodSettings={onUpdatePeriodSettings}
            assignments={assignments}
            onUpdateAssignments={onUpdateAssignments}
            dayThemes={dayThemes}
          />

          {/* Class Stream Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-200">
              Class Stream Settings (Streams & Combinations)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Class</label>
                <select
                  value={newStreamClass}
                  onChange={e => setNewStreamClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {DEFAULT_CLASSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Level</label>
                <select
                  value={newStreamLevel}
                  onChange={e => {
                    const lvl = e.target.value as 'CSEE' | 'ACSEE';
                    setNewStreamLevel(lvl);
                    if (lvl === 'ACSEE') {
                      setNewStreamNames('PCM, PCB, CBG, HGE');
                    } else {
                      setNewStreamNames('STREAM A, STREAM B');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CSEE">CSEE (Ordinary Level)</option>
                  <option value="ACSEE">ACSEE (Advanced Level)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Streams (Comma Separated)</label>
                <input
                  type="text"
                  value={newStreamNames}
                  onChange={e => setNewStreamNames(e.target.value)}
                  placeholder="e.g. STREAM A, STREAM B"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const streamList = newStreamNames
                  .split(',')
                  .map(s => s.trim().toUpperCase())
                  .filter(Boolean);

                if (!streamList.length) {
                  alert('Enter at least one stream name.');
                  return;
                }

                const existingIndex = streamSettings.findIndex(s => s.className === newStreamClass);
                if (existingIndex > -1) {
                  const copy = [...streamSettings];
                  copy[existingIndex] = {
                    ...copy[existingIndex],
                    level: newStreamLevel,
                    streams: streamList
                  };
                  onUpdateStreamSettings(copy);
                } else {
                  onUpdateStreamSettings([
                    ...streamSettings,
                    {
                      id: Date.now(),
                      className: newStreamClass,
                      level: newStreamLevel,
                      streams: streamList
                    }
                  ]);
                }
                alert(`Streams for ${newStreamClass} updated!`);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
            >
              Save Class Streams
            </button>

            {/* Active Class Streams with Delete buttons */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Orodha ya Madarasa na Mikondo Yaliyopo (Active Class Streams & Combinations):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {streamSettings.map(ss => (
                  <div key={ss.className} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{ss.className}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {ss.streams.length} Mikondo
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ss.streams.map(st => (
                        <span
                          key={st}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs group"
                        >
                          <span>{st}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (ss.streams.length <= 1) {
                                alert(`Darasa la ${ss.className} lina mkondo mmoja tu. Huwezi kufuta mkondo wote.`);
                                return;
                              }
                              if (confirm(`Una uhakika unataka kufuta mkondo wa "${st}" kwenye ${ss.className}?`)) {
                                const updated = streamSettings.map(setting => {
                                  if (setting.className === ss.className) {
                                    return {
                                      ...setting,
                                      streams: setting.streams.filter(x => x !== st)
                                    };
                                  }
                                  return setting;
                                });
                                onUpdateStreamSettings(updated);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5 rounded"
                            title={`Futa mkondo wa ${st}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CLASS JOURNAL TAB (SHAJARA YA DARASA)                 */}
      {/* ======================================================== */}
      {activeTab === 'journal' && (
        <ClassJournalTab
          assignments={assignments}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          schoolInfo={schoolInfo || ({ name: schoolName } as any)}
          currentUser={currentUser}
          students={students}
          institutionalPolicy={institutionalPolicy}
        />
      )}

      {/* ======================================================== */}
      {/* 7. TIMETABLE INTEGRITY & POLICY AUDIT TAB               */}
      {/* ======================================================== */}
      {activeTab === 'integrity' && (
        <TimetableIntegrityReportModal
          isOpen={true}
          inlineMode={true}
          onClose={() => setActiveTab('general')}
          assignments={assignments}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          schoolName={schoolName}
          onUpdateAssignments={onUpdateAssignments}
          onEditSlot={slot => setEditingSlot(slot)}
        />
      )}

      {/* ======================================================== */}
      {/* 7. INSTITUTIONAL POLICIES TAB                           */}
      {/* ======================================================== */}
      {activeTab === 'policies' && (
        <InstitutionalPoliciesTab
          policy={institutionalPolicy}
          onUpdatePolicy={onUpdateInstitutionalPolicy || (() => {})}
        />
      )}

      {/* ======================================================== */}
      {/* CONSTRAINT CONFIGURATION & HEURISTIC AUDIT PANEL        */}
      {/* ======================================================== */}
      {activeTab === 'constraints' && (
        <ConstraintConfigurationPanel
          assignments={assignments}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          savedConfig={constraintsConfig}
          onSaveConfig={(newConfig) => setConstraintsConfig(newConfig)}
          onNavigateToEditSlot={(className, stream, day, period) => {
            const slot = assignments.find(
              a => a.className === className && a.stream === stream && a.day === day && a.period === period
            );
            if (slot) {
              setEditingSlot({
                className,
                stream,
                day,
                period,
                assignment: slot
              });
            }
          }}
        />
      )}

      {/* ======================================================== */}
      {/* 8. SUBJECT PERIOD ALLOCATION TAB                        */}
      {/* ======================================================== */}
      {activeTab === 'allocations' && (
        <SubjectPeriodAllocationTab
          allocations={subjectPeriodAllocations}
          streamSettings={streamSettings}
          onUpdateAllocations={onUpdateSubjectPeriodAllocations || (() => {})}
        />
      )}

      {/* ======================================================== */}
      {/* 9. TEACHER ASSIGNMENTS TAB                              */}
      {/* ======================================================== */}
      {activeTab === 'teacherAssignments' && (
        <TeacherAssignmentsTab
          teachers={teachers}
          streamSettings={streamSettings}
          teacherAssignments={teacherAssignments}
          onUpdateTeacherAssignments={onUpdateTeacherAssignments || (() => {})}
        />
      )}

      {/* Manual Slot Edit Modal */}
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot}
          teachers={teachers}
          onSave={handleSaveSlot}
          onDelete={handleDeleteSlot}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {/* Schedule Extra-Curricular Period Modal (Editable Times) */}
      {extraCurricularModalOpen && (
        <ScheduleExtraCurricularModal
          initialActivity={selectedActivityForModal}
          periodSettings={periodSettings}
          teachers={teachers}
          assignments={assignments}
          onSaveSchedule={handleSaveExtraCurricularSchedule}
          onClose={() => {
            setExtraCurricularModalOpen(false);
            setSelectedActivityForModal(null);
          }}
        />
      )}

      {/* AI Timetable Auto-Generator Modal (Class Scope) */}
      {aiGeneratorModalOpen && (
        <AITimetableGeneratorModal
          isOpen={aiGeneratorModalOpen}
          onClose={() => setAiGeneratorModalOpen(false)}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          currentAssignments={assignments}
          onApplyAssignments={handleApplyAITimetable}
        />
      )}

      {/* AI Timetable Generator by Level Modal (Nursery / Primary / Secondary Scope) */}
      {aiByLevelModalOpen && (
        <AIGenerateByLevelModal
          isOpen={aiByLevelModalOpen}
          onClose={() => setAiByLevelModalOpen(false)}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          institutionalPolicy={institutionalPolicy}
          subjectPeriodAllocations={subjectPeriodAllocations}
          teacherAssignments={teacherAssignments}
          currentAssignments={assignments}
          onApplyAssignments={(newAssignments, mode) => {
            if (mode === 'replace_level') {
              const newClasses = new Set(newAssignments.map(a => a.className));
              const retained = assignments.filter(a => !newClasses.has(a.className));
              onUpdateAssignments([...retained, ...newAssignments]);
            } else {
              onUpdateAssignments([...assignments, ...newAssignments]);
            }
          }}
        />
      )}

      {/* Timetable Integrity Report Modal (Popup Mode) */}
      {integrityReportModalOpen && (
        <TimetableIntegrityReportModal
          isOpen={integrityReportModalOpen}
          inlineMode={false}
          onClose={() => setIntegrityReportModalOpen(false)}
          assignments={assignments}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          schoolName={schoolName}
          onUpdateAssignments={onUpdateAssignments}
          onEditSlot={slot => setEditingSlot(slot)}
        />
      )}
    </div>
  );
};
