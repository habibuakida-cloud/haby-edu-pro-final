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
  Edit3,
  LayoutGrid,
  Save,
  CheckCircle2
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
  Student,
  SavedTimetableRecord
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
  getExtraCurricularInfo,
  getSubjectShortName 
} from '../../utils/colors';
import { 
  exportTimetableToCSV, 
  exportClassTimetableGridToCSV, 
  printFormattedSection 
} from '../../utils/export';
import { exportTimetablePDF } from '../../utils/timetablePdfExport';
import { exportGeneralTimetableExcel } from '../../utils/timetableExcelExport';
import { saveSchoolData } from '../../lib/dataService';
import { getCurrentSchoolId } from '../../lib/dbBridge';
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
import { TimetableIntegrityReportModal } from './TimetableIntegrityReportModal';
import { InstitutionalPoliciesTab } from './InstitutionalPoliciesTab';
import { ConstraintConfigurationPanel } from './ConstraintConfigurationPanel';
import { SubjectPeriodAllocationTab } from './SubjectPeriodAllocationTab';
import { TeacherAssignmentsTab } from './TeacherAssignmentsTab';
import { ClassJournalTab } from './ClassJournalTab';
import { AITimetableAssistantModal } from './AITimetableAssistantModal';
import { GraphicalTimetableGrid } from './GraphicalTimetableGrid';
import { TeacherEntryForm } from './TeacherEntryForm';
import { GeneralTimetableManualEntry } from './GeneralTimetableManualEntry';
import { TeacherTimetable } from './TeacherTimetable';
import { ClassTimetable } from './ClassTimetable';

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
  savedTimetableRecords?: SavedTimetableRecord[];
  onUpdateSavedTimetableRecords?: (records: SavedTimetableRecord[]) => void;
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  students?: Student[];
  initialTab?: 'general' | 'class' | 'teacher' | 'master' | 'journal' | 'policies' | 'allocations' | 'teacherAssignments' | 'integrity' | 'settings' | 'saved';
  journalRecords?: Record<string, any>;
  onUpdateJournal?: (records: Record<string, any>) => void;
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
  assignments = [],
  teachers = [],
  periodSettings = [],
  streamSettings = [],
  classTimetableReleased = {},
  schoolName = 'HABY EDUPRO',
  dayThemes = {},
  institutionalPolicy = DEFAULT_INSTITUTIONAL_POLICY,
  subjectPeriodAllocations = [],
  teacherAssignments = [],
  savedTimetableRecords = [],
  schoolInfo,
  currentUser,
  students = [],
  initialTab,
  onUpdateAssignments = () => {},
  onUpdatePeriodSettings = () => {},
  onUpdateStreamSettings = () => {},
  onToggleClassRelease = () => {},
  onUpdateDayThemes = () => {},
  onUpdateInstitutionalPolicy = () => {},
  onUpdateSubjectPeriodAllocations = () => {},
  onUpdateTeacherAssignments = () => {},
  onUpdateSavedTimetableRecords = () => {},
  journalRecords = {},
  onUpdateJournal = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'class' | 'teacher' | 'master' | 'journal' | 'policies' | 'constraints' | 'allocations' | 'teacherAssignments' | 'integrity' | 'settings' | 'graphical' | 'teacherEntry' | 'generalEntry' | 'saved'
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
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<number>(teachers?.[0]?.id || 0);

  React.useEffect(() => {
    if ((!selectedTeacherFilter || selectedTeacherFilter === 0) && teachers && teachers.length > 0) {
      setSelectedTeacherFilter(teachers[0].id);
    }
  }, [teachers, selectedTeacherFilter]);

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
  
  // Timetable Integrity Report Modal state
  const [integrityReportModalOpen, setIntegrityReportModalOpen] = useState(false);

  // AI Timetable Assistant Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [saveSnapshotModalOpen, setSaveSnapshotModalOpen] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState('Term 1 Master Timetable');
  const [showExtraCurricularBar, setShowExtraCurricularBar] = useState(false);

  const handleSaveSnapshot = () => {
    if (!snapshotTitle.trim()) {
      alert('Tafadhali ingiza jina la ratiba hii.');
      return;
    }
    const newRecord: SavedTimetableRecord = {
      id: String(Date.now()),
      title: snapshotTitle.trim(),
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      scope: 'General',
      assignmentsCount: assignments.length,
      assignments: [...assignments]
    };
    if (onUpdateSavedTimetableRecords) {
      onUpdateSavedTimetableRecords([...(savedTimetableRecords || []), newRecord]);
    }
    setSaveSnapshotModalOpen(false);
    alert(`Ratiba "${newRecord.title}" imehifadhiwa kikamilifu kwenye Saved Timetables!`);
  };

  const handleShareTimetableWhatsApp = (scope: string) => {
    const text = `*HABY EDUPRO TIMETABLE (RATIBA YA MASOMO)*
Shule: ${schoolName}
Mwonekano: ${scope}
Tarehe: ${new Date().toLocaleDateString()}
Ratiba hii imekaguliwa rasmi na haina mgongano (Zero Clashes).`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrintTimetable = (forceMaster: boolean = false) => {
    // If printing master timetable or currently in a non-grid configuration tab, switch to general tab first
    if (forceMaster || !['general', 'class', 'teacher', 'journal'].includes(activeTab)) {
      if (activeTab !== 'general') {
        setActiveTab('general');
        setTimeout(() => {
          window.print();
        }, 150);
        return;
      }
    }
    window.print();
  };

  const handlePrintActiveTimetableGrid = () => {
    handlePrintTimetable();
  };

  const [isSavingDb, setIsSavingDb] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const handleSavePermanentlyToDatabase = async () => {
    setIsSavingDb(true);
    try {
      if (onUpdateAssignments) {
        onUpdateAssignments(assignments);
      }
      const schoolId = getCurrentSchoolId();
      await saveSchoolData(schoolId, {
        timetableAssignments: assignments,
        periodSettings,
        streamSettings,
        teacherAssignments,
        subjectPeriodAllocations
      });
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 4000);
    } catch (err) {
      console.warn("Save database notice:", err);
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleExportExcel = () => {
    exportGeneralTimetableExcel({
      schoolName,
      selectedClass: selectedGeneralClass,
      selectedStream: selectedGeneralStream,
      selectedDay: selectedDayFilter,
      assignments,
      teachers,
      periodSettings,
      streamSettings,
      schoolInfo
    });
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
      (assignments || []).forEach(a => {
        if (!a || !a.teacherId) return;
        const rawPeriod = a.periodName || a.period || '';
        const normalizedPeriod = rawPeriod ? String(rawPeriod).split(' (')[0] : '';
        const key = `${a.day || ''}_${normalizedPeriod}_teacher_${a.teacherId}`;
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
    const targetNorm = targetPeriod ? targetPeriod.split(' (')[0] : '';
    const targetExisting = (assignments || []).find(
      a => {
        if (!a) return false;
        const aPeriodStr = a.period || '';
        const aPeriodNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
        return (
          isSameClass(a.className, targetClass) &&
          isSameStream(a.stream, targetStream) &&
          a.day === targetDay &&
          (a.period === targetPeriod || a.periodName === targetPeriod || aPeriodNorm === targetNorm || (targetNorm && aPeriodStr.startsWith(targetNorm)))
        );
      }
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
      const dataPeriodNorm = data.period ? data.period.split(' (')[0] : '';
      const existing = (assignments || []).find(
        a => {
          if (!a) return false;
          const aPeriodStr = a.period || '';
          const aPeriodNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
          return (
            isSameClass(a.className, data.className) &&
            isSameStream(a.stream, data.stream) &&
            a.day === data.day &&
            (a.period === data.period || a.periodName === data.period || aPeriodNorm === dataPeriodNorm || (dataPeriodNorm && aPeriodStr.startsWith(dataPeriodNorm)))
          );
        }
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
  const [assignTeacher, setAssignTeacher] = useState<number>(teachers?.[0]?.id || 0);
  const [assignSubject, setAssignSubject] = useState(teachers?.[0]?.subjects?.[0] || 'Mathematics');

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

  const printSettings = useMemo(() => {
    try {
      const saved = localStorage.getItem('haby_timetable_print_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { orientation: 'landscape', margin: '6mm', optimizedCss: true };
  }, []);

  return (
    <div className="space-y-6">
      {/* Dedicated Master Timetable Print CSS Styling */}
      <style>{`
        @media print {
          @page {
            size: ${printSettings.orientation || 'landscape'};
            margin: ${printSettings.margin || '6mm'};
          }

          body * {
            visibility: hidden !important;
          }

          .master-timetable-container,
          .master-timetable-container *,
          #master-timetable-container,
          #master-timetable-container *,
          #general-printable-view,
          #general-printable-view *,
          #class-printable-view,
          #class-printable-view *,
          #teacher-printable-view,
          #teacher-printable-view * {
            visibility: visible !important;
          }

          .master-timetable-container,
          #master-timetable-container,
          #general-printable-view,
          #class-printable-view,
          #teacher-printable-view {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 999999 !important;
          }

          #class-printable-view .overflow-x-auto,
          #teacher-printable-view .overflow-x-auto {
            overflow: visible !important;
          }

          #class-printable-view .grid,
          #teacher-printable-view .grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(50px, 1fr)) !important;
            min-width: 0 !important;
            width: 100% !important;
            gap: 2px !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .master-timetable-container table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            font-size: 7pt !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
          }

          .master-timetable-container th,
          .master-timetable-container td {
            border: 1px solid #000000 !important;
            padding: 2px !important;
            font-size: 7pt !important;
            color: #000000 !important;
            text-align: center !important;
            overflow: hidden !important;
            word-wrap: break-word !important;
          }

          .master-timetable-container thead th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
          }

          .master-timetable-container tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>

      {/* 1. UNIFIED COMMAND HEADER & GLOBAL ACTIONS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Live Status Badges */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-sm shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Ratiba ya Masomo (School Timetable)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                  {assignments.length} Vipindi
                </span>
                {integrityReport.criticalCount > 0 || totalConflicts > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIntegrityReportModalOpen(true)}
                    className="px-2.5 py-0.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
                    title="Bofya kukagua na kutatua migongano ya walimu"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{integrityReport.criticalCount || totalConflicts} Migongano</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Zero Migongano ✓</span>
                  </span>
                )}
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  Ulinganifu {integrityReport.score}%
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Upangaji na usimamizi wa ratiba ya masomo, walimu, na vipindi maalum
              </p>
            </div>
          </div>

          {/* Global Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 border border-indigo-400"
              title="Tumia Msaidizi wa AI kujaza ratiba kiotomatiki kulingana na sera na walimu"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>⚡ Jaza na AI</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingSlot({
                  className: selectedGeneralClass !== 'All' ? selectedGeneralClass : 'Form 1',
                  stream: getStreamsForClass(selectedGeneralClass !== 'All' ? selectedGeneralClass : 'Form 1')[0] || 'STREAM A',
                  day: 'Monday',
                  period: periodSettings[0] ? `${periodSettings[0].name} (${periodSettings[0].start}-${periodSettings[0].end})` : 'Period 1 (08:00-08:40)'
                });
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Panga kipindi cha somo kwa mikono"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Panga Somo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExtraCurricularBar(prev => !prev)}
              className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border ${
                showExtraCurricularBar
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
              title="Fungua orodha ya shughuli maalum (Baraza, Dini, Chakula, Michezo, nk.)"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>Shughuli Maalum</span>
            </button>

            <button
              type="button"
              onClick={handleSavePermanentlyToDatabase}
              disabled={isSavingDb}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                saveSuccessNotice
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="Hifadhi mabadiliko ya ratiba kudumu kwenye database (Cloud SQL & Firestore)"
            >
              {saveSuccessNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Imehifadhiwa! ✓</span>
                </>
              ) : isSavingDb ? (
                <>
                  <Zap className="w-3.5 h-3.5 animate-spin" />
                  <span>Inahifadhi...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Hifadhi DB</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handlePrintTimetable()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer border border-blue-500"
              title="Chapisha (Print) Ratiba ya Masomo"
              data-testid="print-timetable-button"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* 2. CATEGORIZED TAB NAVIGATION */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Roster Views */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Ratiba Kuu (Master)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('class')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'class'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kwa Darasa (Class)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Kwa Mwalimu (Teacher)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('graphical')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'graphical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mwonekano wa Grafu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Shajara ya Darasa (Journal)</span>
            </button>
          </div>

          {/* Secondary Settings & Setup Dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Zana & Mipangilio:
            </span>
            <select
              value={['settings', 'allocations', 'teacherAssignments', 'master', 'generalEntry', 'teacherEntry', 'saved', 'policies', 'constraints', 'integrity'].includes(activeTab) ? activeTab : 'more'}
              onChange={(e) => {
                if (e.target.value !== 'more') {
                  setActiveTab(e.target.value as any);
                }
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="more" disabled>⚙️ Chagua Zana / Mipangilio...</option>
              <option value="settings">⏱️ Vipindi & Saa (Period Settings)</option>
              <option value="allocations">📚 Mgawanyo wa Masomo (Allocations)</option>
              <option value="teacherAssignments">👥 Upangaji wa Walimu (Assignments)</option>
              <option value="master">✍️ Master Assignment</option>
              <option value="generalEntry">📝 General Manual Entry</option>
              <option value="teacherEntry">📋 Fomu ya Mwalimu (Teacher Entry)</option>
              <option value="saved">💾 Ratiba Zilizohifadhiwa ({savedTimetableRecords.length})</option>
              <option value="policies">📜 Sera za Shule (Policies)</option>
              <option value="constraints">⚖️ Sheria & Ukaguzi (Audit)</option>
              <option value="integrity">🛡️ Integrity Audit Report ({integrityReport.score}%)</option>
            </select>
          </div>
        </div>

        {/* Secondary Sub-Bar if in Settings / Setup Mode */}
        {['settings', 'allocations', 'teacherAssignments', 'master', 'generalEntry', 'teacherEntry', 'saved', 'policies', 'constraints', 'integrity'].includes(activeTab) && (
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500 mr-1">Mipangilio Inayotumika:</span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Vipindi & Saa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('allocations')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${activeTab === 'allocations' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Mgawanyo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teacherAssignments')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${activeTab === 'teacherAssignments' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Walimu
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('master')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${activeTab === 'master' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Master Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('policies')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${activeTab === 'policies' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Sera
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('constraints')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${activeTab === 'constraints' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Ukaguzi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${activeTab === 'saved' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                Snapshots ({savedTimetableRecords.length})
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className="px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <span>← Rudi kwenye Ratiba Kuu</span>
            </button>
          </div>
        )}

        {/* Expandable Extra-Curricular Quick Bar */}
        {showExtraCurricularBar && (
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-xl shadow-xs border border-slate-800 animate-in fade-in space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Upangaji wa Shughuli Maalum & Mapumziko:</span>
                <span className="text-slate-300 text-[11px] hidden md:inline">Bofya shughuli kupanga muda na vyumba</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenScheduleExtraCurricular()}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Panga Shughuli Nyingine</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {EXTRA_CURRICULAR_ACTIVITIES.map(act => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => handleOpenScheduleExtraCurricular(act)}
                  style={{ backgroundColor: act.color }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title={`Panga ${act.name} kwenye ratiba`}
                >
                  {renderActivityIcon(act.icon, "w-3 h-3")}
                  <span>{act.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conflict Bar Alert (if any teacher is double-booked or conflicts exist) */}
      {(totalConflicts > 0 || integrityReport.criticalCount > 0) && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900 shadow-xs flex-wrap gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">Migongano ya Walimu Imegundulika: </strong>
              <span>
                Kuna vipindi {integrityReport.criticalCount || totalConflicts} ambapo mwalimu mmoja amepangwa madarasa mawili kwa wakati mmoja.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIntegrityReportModalOpen(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Kagua Migongano</span>
            </button>
            <button
              type="button"
              onClick={handleResolveConflicts}
              className="px-3 py-1 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-black hover:bg-rose-50 transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tatua Kiotomatiki</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. GENERAL TIMETABLE TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Action & Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-blue-900 uppercase">Darasa:</span>
                <select
                  value={selectedGeneralClass}
                  onChange={e => {
                    setSelectedGeneralClass(e.target.value);
                    setSelectedGeneralStream('All');
                  }}
                  className="text-xs font-bold bg-transparent text-blue-950 focus:outline-hidden cursor-pointer"
                  title="Chagua darasa au shule nzima"
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
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-900 uppercase">Mkondo:</span>
                <select
                  value={selectedGeneralStream}
                  onChange={e => setSelectedGeneralStream(e.target.value)}
                  className="text-xs font-bold bg-transparent text-emerald-950 focus:outline-hidden cursor-pointer"
                  title="Chagua mkondo wa darasa"
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
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-slate-600 uppercase">Siku:</span>
                <select
                  value={selectedDayFilter}
                  onChange={e => setSelectedDayFilter(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="All">Siku Zote (All Days)</option>
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Orientation toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintOrientation('portrait')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    printOrientation === 'portrait' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOrientation('landscape')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    printOrientation === 'landscape' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Quick Export & Tool Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHighlightConstraintsInRed(!highlightConstraintsInRed)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border ${
                  highlightConstraintsInRed
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Washa au zima viashiria vya hitilafu kwenye jedwali"
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${highlightConstraintsInRed ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Hitilafu ({constraintValidationReport.criticalIssuesCount + constraintValidationReport.warningIssuesCount})</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-2.5 py-1.5 text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                title="Pakua Ratiba Kuu kwenye Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                type="button"
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
                className="px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                title="Pakua PDF ya A4"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const scopeLabel = selectedGeneralClass === 'All' ? 'Whole School' : selectedGeneralClass;
                  const streamLabel = selectedGeneralStream !== 'All' ? selectedGeneralStream : '';
                  handleShareTimetableWhatsApp(`General Timetable - ${scopeLabel} ${streamLabel}`.trim());
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                title="Tuma ratiba kupitia WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSnapshotTitle(`Master Timetable — ${new Date().toLocaleDateString()}`);
                  setSaveSnapshotModalOpen(true);
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                title="Hifadhi toleo la sasa la ratiba (Snapshot)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Snapshot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Je, una uhakika unataka kusafisha na kuweka upya vipindi vyote vya ratiba hii?")) {
                    onUpdateAssignments([]);
                  }
                }}
                className="px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1 cursor-pointer transition"
                title="Weka upya (Reset) vipindi vyote"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Timetable View by Days */}
          <div id="master-timetable-container" data-alias="general-printable-view" className="space-y-8 master-timetable-container">
            {/* Official Master Timetable Letterhead Header (Visible ONLY during print) */}
            <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(schoolInfo?.logo || schoolInfo?.badge) ? (
                    <img
                      src={schoolInfo?.logo || schoolInfo?.badge}
                      alt={schoolName}
                      className="w-14 h-14 object-contain border border-slate-300 p-1 rounded"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-blue-900 text-white rounded flex items-center justify-center font-black text-xl">
                      {(schoolName || 'HP').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                      {schoolInfo?.name || schoolName || 'HabyEduPro3A'}
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      {schoolInfo?.motto ? `"${schoolInfo.motto}" • ` : ''}
                      {schoolInfo?.address || 'P.O. BOX 1000, ACADEMIC DIVISION'} 
                      {schoolInfo?.phone ? ` • Tel: ${schoolInfo.phone}` : ''}
                    </p>
                    <p className="text-[11px] font-bold text-blue-950 uppercase mt-0.5 tracking-wider">
                      MASTER TEACHING &amp; LESSON TIMETABLE (RATIBA KUU YA MASOMO)
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-700">
                  <div className="font-mono font-bold bg-slate-100 px-2 py-1 border border-slate-300 rounded inline-block">
                    OFFICIAL ACADEMIC SCHEDULE
                  </div>
                  <div className="mt-1 font-semibold">
                    Year: {new Date().getFullYear()}
                  </div>
                  <div>
                    Scope: {selectedGeneralClass === 'All' ? 'Whole School' : selectedGeneralClass} {selectedGeneralStream !== 'All' ? `(${selectedGeneralStream})` : ''}
                  </div>
                  <div>
                    Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
            {DAYS_OF_WEEK.filter(day => selectedDayFilter === 'All' || selectedDayFilter === day).map(day => {
              const dayTheme = getDayTheme(day, dayThemes);
              const timeToMinutes = (timeStr?: string) => {
                if (!timeStr || typeof timeStr !== 'string') return 0;
                const parts = timeStr.split(':').map(Number);
                const hrs = isNaN(parts[0]) ? 0 : parts[0];
                const mins = isNaN(parts[1]) ? 0 : parts[1];
                return hrs * 60 + mins;
              };

              const dayPeriods = (periodSettings || [])
                .filter(p => p && p.day === day)
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
                                  <th className="p-2.5 w-32 border-r border-slate-200 sticky left-0 z-20 bg-slate-100 shadow-2xs font-extrabold text-slate-700">Stream</th>
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
                                      <td className="p-2.5 border-r border-slate-200 font-bold text-xs sticky left-0 z-10 bg-slate-50 shadow-2xs">
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
                                                    {!extraInfo && <span className="font-extrabold">{getSubjectShortName(assignment.subject)}</span>}
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

            {/* Official Signatures & Stamp Footer (Visible ONLY during print) */}
            <div className="hidden print:block mt-8 pt-4 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-500 mb-1" />
                  <p className="font-bold text-slate-900">Academic Master / Mistress</p>
                  <p className="text-[10px] text-slate-600">Signature &amp; Date</p>
                </div>
                <div>
                  <div className="h-10 flex items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded mb-1 text-[10px] uppercase font-bold">
                    Official School Stamp
                  </div>
                  <p className="font-bold text-slate-900">School Registry Stamp</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-500 mb-1" />
                  <p className="font-bold text-slate-900">Head of School / Principal</p>
                  <p className="text-[10px] text-slate-600">Signature &amp; Approval</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CLASS TIMETABLE TAB                                  */}
      {/* ======================================================== */}
      {activeTab === 'class' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
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
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintTimetable()}
                className="px-3.5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                title="Print Class Timetable using dedicated print CSS"
                data-testid="print-class-timetable-btn"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Timetable</span>
              </button>
            </div>
          </div>

          {/* Quick Stream Tabs for the selected level */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs space-y-2 no-print">
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
            {/* Official Class Timetable Letterhead Header (Visible ONLY during print) */}
            <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(schoolInfo?.logo || schoolInfo?.badge) ? (
                    <img
                      src={schoolInfo?.logo || schoolInfo?.badge}
                      alt={schoolName}
                      className="w-14 h-14 object-contain border border-slate-300 p-1 rounded"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-blue-900 text-white rounded flex items-center justify-center font-black text-xl">
                      {(schoolName || 'HP').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                      {schoolInfo?.name || schoolName || 'HabyEduPro3A'}
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      {schoolInfo?.motto ? `"${schoolInfo.motto}" • ` : ''}
                      {schoolInfo?.address || 'P.O. BOX 1000, ACADEMIC DIVISION'} 
                      {schoolInfo?.phone ? ` • Tel: ${schoolInfo.phone}` : ''}
                    </p>
                    <p className="text-[11px] font-bold text-blue-950 uppercase mt-0.5 tracking-wider">
                      CLASS TIMETABLE • {selectedClassFilter} (RATIBA YA DARASA)
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-700">
                  <div className="font-mono font-bold bg-slate-100 px-2 py-1 border border-slate-300 rounded inline-block">
                    CLASS ROSTER
                  </div>
                  <div className="mt-1 font-semibold">
                    Year: {new Date().getFullYear()}
                  </div>
                  <div>
                    Class: {selectedClassFilter}
                  </div>
                  <div>
                    Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
            {(() => {
              const streams = getStreamsForClass(selectedClassFilter);
              const activeStreams = streams && streams.length > 0 ? streams : ['STREAM A'];
              return activeStreams.map(stream => (
                <div key={stream} className="mb-6">
                  <ClassTimetable 
                    className={selectedClassFilter} 
                    stream={stream} 
                    assignments={assignments} 
                    periodSettings={periodSettings} 
                    teachers={teachers}
                  />
                </div>
              ));
            })()}

            {/* Official Signatures & Stamp Footer (Visible ONLY during print) */}
            <div className="hidden print:block mt-8 pt-4 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-500 mb-1" />
                  <p className="font-bold text-slate-900">Academic Master / Mistress</p>
                  <p className="text-[10px] text-slate-600">Signature &amp; Date</p>
                </div>
                <div>
                  <div className="h-10 flex items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded mb-1 text-[10px] uppercase font-bold">
                    Official School Stamp
                  </div>
                  <p className="font-bold text-slate-900">School Registry Stamp</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-500 mb-1" />
                  <p className="font-bold text-slate-900">Head of School / Principal</p>
                  <p className="text-[10px] text-slate-600">Signature &amp; Approval</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TEACHER TIMETABLE TAB                                */}
      {/* ======================================================== */}
      {activeTab === 'teacher' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
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
                    orientation: 'landscape'
                  });
                }}
                className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Download teacher schedule as a professional A4 landscape PDF document using jsPDF"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintTimetable()}
                className="px-3.5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                title="Print Teacher Timetable using dedicated print CSS"
                data-testid="print-teacher-timetable-btn"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Timetable</span>
              </button>
            </div>
          </div>

          {/* Teacher Schedule View */}
          <div id="teacher-printable-view" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 master-timetable-container">
            {/* Official Teacher Timetable Letterhead Header (Visible ONLY during print) */}
            <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(schoolInfo?.logo || schoolInfo?.badge) ? (
                    <img
                      src={schoolInfo?.logo || schoolInfo?.badge}
                      alt={schoolName}
                      className="w-14 h-14 object-contain border border-slate-300 p-1 rounded"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-blue-900 text-white rounded flex items-center justify-center font-black text-xl">
                      {(schoolName || 'HP').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                      {schoolInfo?.name || schoolName || 'HabyEduPro3A'}
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      {schoolInfo?.motto ? `"${schoolInfo.motto}" • ` : ''}
                      {schoolInfo?.address || 'P.O. BOX 1000, ACADEMIC DIVISION'} 
                      {schoolInfo?.phone ? ` • Tel: ${schoolInfo.phone}` : ''}
                    </p>
                    <p className="text-[11px] font-bold text-blue-950 uppercase mt-0.5 tracking-wider">
                      TEACHER TEACHING TIMETABLE • {teachers.find(t => t.id === selectedTeacherFilter)?.name || 'FACULTY'} (RATIBA YA MWALIMU)
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-700">
                  <div className="font-mono font-bold bg-slate-100 px-2 py-1 border border-slate-300 rounded inline-block">
                    INDIVIDUAL FACULTY ROSTER
                  </div>
                  <div className="mt-1 font-semibold">
                    Year: {new Date().getFullYear()}
                  </div>
                  <div>
                    Printed: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
              {(() => {
                const currentTeacher = teachers.find(t => t.id === selectedTeacherFilter);
                if (!currentTeacher) return <p className="text-slate-500">Select a teacher.</p>;
                return <TeacherTimetable teacher={currentTeacher} assignments={assignments} periodSettings={periodSettings} />;
              })()}

            {/* Official Signatures & Stamp Footer (Visible ONLY during print) */}
            <div className="hidden print:block mt-8 pt-4 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-500 mb-1" />
                  <p className="font-bold text-slate-900">Academic Master / Mistress</p>
                  <p className="text-[10px] text-slate-600">Signature &amp; Date</p>
                </div>
                <div>
                  <div className="h-10 flex items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded mb-1 text-[10px] uppercase font-bold">
                    Official School Stamp
                  </div>
                  <p className="font-bold text-slate-900">School Registry Stamp</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-500 mb-1" />
                  <p className="font-bold text-slate-900">Head of School / Principal</p>
                  <p className="text-[10px] text-slate-600">Signature &amp; Approval</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'generalEntry' && (
        <GeneralTimetableManualEntry 
          teachers={teachers} 
          streamSettings={streamSettings} 
          onUpdateAssignments={onUpdateAssignments}
          assignments={assignments}
          periodSettings={periodSettings}
          classes={DEFAULT_CLASSES}
        />
      )}

      {activeTab === 'teacherEntry' && (
        <TeacherEntryForm 
          teachers={teachers} 
          streamSettings={streamSettings} 
          onUpdateAssignments={onUpdateAssignments}
          assignments={assignments}
          periodSettings={periodSettings}
          teacherAssignments={teacherAssignments}
        />
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

                    {(() => {
                      const normalizedTarget = assignPeriod ? assignPeriod.split(' (')[0] : '';
                      const hasConflict = (assignments || []).some(a => {
                        if (!a) return false;
                        const aNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
                        return (
                          a.day === assignDay && 
                          aNorm === normalizedTarget && 
                          a.teacherId === assignTeacher
                        );
                      });
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
            streamSettings={streamSettings}
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
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Select/Add Streams</label>
                <select
                  onChange={e => {
                    const selected = e.target.value;
                    if (selected && selected !== 'Custom') {
                      setNewStreamNames(selected);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white mb-2"
                >
                  <option value="">-- Choose Preset --</option>
                  <option value="STREAM A, STREAM B">STREAM A, STREAM B</option>
                  <option value="STREAM A, STREAM B, STREAM C">STREAM A, STREAM B, STREAM C</option>
                  <option value="PCM, PCB, CBG, HGE">PCM, PCB, CBG, HGE</option>
                  <option value="Custom">Custom (Manual Entry)</option>
                </select>
                <input
                  type="text"
                  value={newStreamNames}
                  onChange={e => setNewStreamNames(e.target.value)}
                  placeholder="e.g. STREAM A, STREAM B"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const streamList = newStreamNames
                    .split(',')
                    .map(s => s.trim().toUpperCase())
                    .filter(Boolean);

                  if (!streamList.length) {
                    return;
                  }

                  const existingIndex = streamSettings.findIndex(s => s.className === newStreamClass);
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
                  setNewStreamNames('');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
              >
                Hifadhi Mikondo (Save Streams)
              </button>

              {streamSettings.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateStreamSettings([])}
                  className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Futa Mikondo Yote (Anza Upya)</span>
                </button>
              )}
            </div>

            {/* Active Class Streams with Delete buttons */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Orodha ya Madarasa na Mikondo Yaliyopo (Active Class Streams & Combinations):
              </h4>
              {streamSettings.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                  Hakuna mikondo au madarasa yaliyosajiliwa. Tumia fomu ya hapo juu kuongeza darasa na mikondo unayotaka kusanidi.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {streamSettings.map(ss => (
                    <div key={ss.className} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-slate-900">{ss.className}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {ss.streams.length} Mikondo
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = streamSettings.filter(setting => setting.className !== ss.className);
                              onUpdateStreamSettings(updated);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                            title={`Futa mipangilio ya darasa la ${ss.className}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Futa Darasa</span>
                          </button>
                        </div>
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
                                const updated = streamSettings.map(setting => {
                                  if (setting.className === ss.className) {
                                    return {
                                      ...setting,
                                      streams: setting.streams.filter(x => x !== st)
                                    };
                                  }
                                  return setting;
                                }).filter(setting => setting.streams.length > 0);
                                onUpdateStreamSettings(updated);
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
              )}
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
          journalRecords={journalRecords}
          onUpdateJournal={onUpdateJournal}
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

      {/* ======================================================== */}
      {/* 10. GRAPHICAL TIMETABLE TAB                             */}
      {/* ======================================================== */}
      {activeTab === 'graphical' && (
        <GraphicalTimetableGrid
          assignments={assignments}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
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

      {/* AI Timetable Assistant Modal */}
      {aiModalOpen && (
        <AITimetableAssistantModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          teachers={teachers}
          periodSettings={periodSettings}
          streamSettings={streamSettings}
          existingAssignments={assignments}
          subjectPeriodAllocations={subjectPeriodAllocations}
          onApplyTimetable={(newAssignments) => {
            onUpdateAssignments(newAssignments);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* SAVED TIMETABLES TAB VIEW                                */}
      {/* ======================================================== */}
      {activeTab === 'saved' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-[#1f4d8b]">Saved Timetable Snapshots (Ratiba Zilizohifadhiwa)</h3>
              <p className="text-xs text-slate-500 font-medium">Hifadhi, pakia, au futa ratiba mbalimbali za masomo (Term 1, Term 2, Annual, Midterm) kwa urahisi.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSnapshotTitle(`Master Timetable — ${new Date().toLocaleDateString()}`);
                setSaveSnapshotModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>+ Hifadhi Ratiba Hii (Save Snapshot)</span>
            </button>
          </div>

          {(!savedTimetableRecords || savedTimetableRecords.length === 0) ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-black text-slate-700">Hakuna Ratiba Zilizohifadhiwa Bado</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Tengeneza ratiba yako ya masomo kwenye General Tab, kisha bonyeza kitufe cha "Hifadhi Ratiba Hii" ili kutunza kumbukumbu ya ratiba hiyo hapa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTimetableRecords.map(rec => (
                <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-900 line-clamp-1">{rec.title}</h4>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full shrink-0">
                        {rec.createdAt}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" /> {rec.assignmentsCount || rec.assignments?.length || 0} Lessons</span>
                      <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-indigo-500" /> Scope: {rec.scope || 'General'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Pakia ratiba "${rec.title}" kwenye kazi yako ya sasa?`)) {
                          onUpdateAssignments(rec.assignments || []);
                          setActiveTab('general');
                          alert(`Ratiba "${rec.title}" imepakiwa kikamilifu!`);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Pakia Ratiba (Load)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Futa ratiba iliyohifadhiwa "${rec.title}"?`)) {
                          const updated = savedTimetableRecords.filter(r => r.id !== rec.id);
                          if (onUpdateSavedTimetableRecords) {
                            onUpdateSavedTimetableRecords(updated);
                          }
                        }
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      title="Futa ratiba"
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

      {/* Save Snapshot Modal */}
      {saveSnapshotModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Save className="w-5 h-5 text-emerald-600" />
                <span>Hifadhi Ratiba Snapshot</span>
              </h4>
              <button
                type="button"
                onClick={() => setSaveSnapshotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Jina la Ratiba (Snapshot Title):</label>
                <input
                  type="text"
                  value={snapshotTitle}
                  onChange={e => setSnapshotTitle(e.target.value)}
                  placeholder="e.g., Term 1 2026 Master Timetable"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Ratiba hii itahifadhi vipindi vyote {assignments.length} vilivyopangwa kwa sasa, ikikuruhusu kuunda na kuhifadhi matoleo tofauti ya ratiba za shule.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSaveSnapshotModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Ghairi (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveSnapshot}
                className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
              >
                Hifadhi Rasmi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
