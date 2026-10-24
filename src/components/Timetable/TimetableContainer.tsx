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
  CheckCircle2,
  Settings,
  BarChart3,
  X
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
  SavedTimetableRecord,
  InvigilationSession,
  Supervisor
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
import { isSameStream, isSamePeriod, normalizeStreamName, getConfiguredDays, isPeriodLocked, isAcademicReligiousSubject, computeStreamSubjectProgression, getRegisteredSubjectsForTeacher, isSameSubjectName } from '../../lib/timetableService';
import { detectTimetableConflicts } from '../../utils/conflicts';
import { generateTimetableIntegrityReport } from '../../utils/timetableIntegrity';
import { 
  validateTimetableAgainstConstraints, 
  getSlotConstraintViolation, 
  DEFAULT_CONSTRAINTS_CONFIG,
  TimetableConstraintsConfig 
} from '../../utils/timetableConstraintValidator';
import { WhatsAppShareModal } from '../common/WhatsAppShareModal';
import { EditSlotModal } from './EditSlotModal';
import { PeriodSettingsManager } from './PeriodSettingsManager';
import { ScheduleExtraCurricularModal } from './ScheduleExtraCurricularModal';
import { TimetableIntegrityReportModal } from './TimetableIntegrityReportModal';
import { InstitutionalPoliciesTab } from './InstitutionalPoliciesTab';
import { ConstraintConfigurationPanel } from './ConstraintConfigurationPanel';
import { SubjectPeriodAllocationTab } from './SubjectPeriodAllocationTab';
import { ClassStreamCurriculumConfig } from './ClassStreamCurriculumConfig';
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
  sessions?: InvigilationSession[];
  invigilationAssignments?: Record<string, number>;
  supervisors?: Supervisor[];
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
  sessions = [],
  invigilationAssignments = {},
  supervisors = [],
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

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppDocTitle, setWhatsAppDocTitle] = useState('Timetable Document');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Form 1');
  const [selectedClassStreamFilter, setSelectedClassStreamFilter] = useState<string>('All');
  const [selectedGeneralClass, setSelectedGeneralClass] = useState<string>('Form 1');
  const [selectedGeneralStream, setSelectedGeneralStream] = useState<string>('All');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'ALL' | 'SECONDARY' | 'PRIMARY' | 'NURSERY'>('SECONDARY');
  const [activeWholeSchoolDay, setActiveWholeSchoolDay] = useState<string>('Monday');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<number>(teachers?.[0]?.id || 0);
  const [allocInitialClass, setAllocInitialClass] = useState<string | undefined>(undefined);
  const [allocInitialStream, setAllocInitialStream] = useState<string | undefined>(undefined);
  const [allocInitialSubView, setAllocInitialSubView] = useState<'progression' | 'teacher_progression' | 'register'>('progression');

  const handleManageStreamSubjects = (
    className: string,
    stream: string,
    mode: 'progression' | 'teacher_progression' | 'register' = 'register'
  ) => {
    setAllocInitialClass(className);
    setAllocInitialStream(stream);
    setAllocInitialSubView(mode);
    setActiveTab('allocations');
  };

  const configuredDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

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
    slotAssignments?: TimetableAssignment[];
  } | null>(null);

  // Drag and drop state
  const [draggedAssignment, setDraggedAssignment] = useState<TimetableAssignment | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>(() => {
    try {
      const saved = localStorage.getItem('haby_timetable_print_settings');
      if (saved) return JSON.parse(saved).orientation || 'landscape';
    } catch (e) {}
    return 'landscape';
  });

  const [printMargin, setPrintMargin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('haby_timetable_print_settings');
      if (saved) return JSON.parse(saved).margin || '6mm';
    } catch (e) {}
    return '6mm';
  });

  const [printOptimizedCss, setPrintOptimizedCss] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('haby_timetable_print_settings');
      if (saved) return JSON.parse(saved).optimizedCss ?? true;
    } catch (e) {}
    return true;
  });

  const handleSavePrintSettings = () => {
    try {
      localStorage.setItem('haby_timetable_print_settings', JSON.stringify({
        orientation: printOrientation,
        margin: printMargin,
        optimizedCss: printOptimizedCss
      }));
      alert('Timetable print layout settings saved successfully!');
    } catch (e) {}
  };
  
  // Timetable Integrity Report Modal state
  const [integrityReportModalOpen, setIntegrityReportModalOpen] = useState(false);
  const [conflictListModalOpen, setConflictListModalOpen] = useState(false);

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
    if (forceMaster || !['general', 'class', 'teacher', 'journal', 'allocations'].includes(activeTab)) {
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

  // Comprehensive Timetable Integrity Analysis (includes Curriculum Load Mismatch checks)
  const integrityReport = useMemo(() => {
    return generateTimetableIntegrityReport(
      assignments,
      teachers,
      periodSettings,
      streamSettings,
      undefined,
      subjectPeriodAllocations
    );
  }, [assignments, teachers, periodSettings, streamSettings, subjectPeriodAllocations]);

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
  const conflicts = detectTimetableConflicts(
    assignments,
    teachers,
    institutionalPolicy?.rules?.allowParallelElectiveSubjects ?? true
  );
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

  // Direct quick-fix handler for a conflicting assignment from ConflictListModal or grid
  const handleQuickFixConflict = (assignmentId: number | string) => {
    const targetAssignment = assignments.find(a => a && String(a.id) === String(assignmentId));
    if (targetAssignment) {
      const matchingSlotAssignments = assignments.filter(a => 
        a &&
        a.className === targetAssignment.className && 
        a.stream === targetAssignment.stream && 
        a.day === targetAssignment.day && 
        (a.period === targetAssignment.period || a.periodName === targetAssignment.periodName)
      );
      setConflictListModalOpen(false);
      setEditingSlot({
        className: targetAssignment.className,
        stream: targetAssignment.stream,
        day: targetAssignment.day,
        period: targetAssignment.period || targetAssignment.periodName,
        assignment: targetAssignment,
        slotAssignments: matchingSlotAssignments
      });
    }
  };

  // Helpers for class streams (return registered streams + any streams with active assignments for this class)
  const getStreamsForClass = (className: string): string[] => {
    const setting = streamSettings.find(s => s && isSameClass(s.className, className));
    const configured = setting && Array.isArray(setting.streams) ? [...setting.streams] : [];
    const seenNorm = new Set(configured.map(st => normalizeStreamName(st)));

    (assignments || []).forEach(a => {
      if (a && isSameClass(a.className, className) && a.stream) {
        const norm = normalizeStreamName(a.stream);
        if (norm && norm !== 'all' && !seenNorm.has(norm)) {
          seenNorm.add(norm);
          configured.push(`STREAM ${norm.toUpperCase()}`);
        }
      }
    });

    return configured;
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

    // NEW: Check if either the source or the target is locked
    if (draggedAssignment.isLocked && !isAcademicReligiousSubject(draggedAssignment.subject)) {
      alert('Kipindi hiki kimefungwa (Locked). Huwezi kukisogeza.');
      setDraggedAssignment(null);
      return;
    }

    // Check Global Period Lock for target
    const targetNorm = targetPeriod ? targetPeriod.split(' (')[0].trim() : '';
    const isGlobalLocked = isPeriodLocked(targetDay, targetNorm, periodSettings, assignments, {
      className: targetClass,
      stream: targetStream
    }).isLocked;

    if (isGlobalLocked) {
      alert('Kipindi hiki kimefungwa kimfumo kwenye Mipangilio. Huwezi kuweka kipindi hapa.');
      setDraggedAssignment(null);
      return;
    }

    // Check if target already has an assignment
    const targetExisting = (assignments || []).find(
      a => {
        if (!a) return false;
        return (
          isSameClass(a.className, targetClass) &&
          isSameStream(a.stream, targetStream) &&
          (a.day || '').toLowerCase() === targetDay.toLowerCase() &&
          isSamePeriod(a.period, a.periodName, targetPeriod)
        );
      }
    );

    if (targetExisting && targetExisting.isLocked && !isAcademicReligiousSubject(targetExisting.subject)) {
      alert('Lengo la kipindi hiki kimefungwa (Locked). Huwezi kuweka kipindi hapa.');
      setDraggedAssignment(null);
      return;
    }

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
    assignmentId?: number | string;
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
    isManual?: boolean;
    isLocked?: boolean;
    allocationMode?: 'manual' | 'auto';
    isParallelElective?: boolean;
    parallelElectiveTrack?: string;
    isNewParallel?: boolean;
  }) => {
    // Check Global Period Lock before saving
    const dataPeriodNorm = data.period ? data.period.split(' (')[0].trim() : '';
    const isGlobalLocked = isPeriodLocked(data.day, dataPeriodNorm, periodSettings, assignments, {
      className: data.className,
      stream: data.stream,
      teacherId: data.teacherId
    }).isLocked;

    if (isGlobalLocked && data.activityType === 'academic') {
      alert('Huwezi kuhifadhi kipindi cha darasani kwa sababu kipindi hiki kimefungwa kwenye Mipangilio ya Saa.');
      return;
    }

    if (data.activityType === 'academic' && data.teacherId) {
      const tObj = (teachers || []).find(t => t && Number(t.id) === Number(data.teacherId));
      const allowedSubs = getRegisteredSubjectsForTeacher(tObj, teacherAssignments);
      if (!allowedSubs.some(s => isSameSubjectName(s, data.subject))) {
        alert(`Mwalimu ${tObj?.name || ''} hajasajiliwa kufundisha somo la "${data.subject}". Chagua somo alilosajiliwa tu.`);
        return;
      }
    }

    if (data.applySchoolWide && !isAcademicReligiousSubject(data.subject)) {
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
            customNote: data.customNote,
            isParallelElective: data.isParallelElective,
            parallelElectiveTrack: data.parallelElectiveTrack
          });
        });
      });

      onUpdateAssignments([...updatedList, ...newItems]);
    } else if (data.isNewParallel) {
      // Add as an additional parallel / elective subject in this exact slot
      const newParallelItem: TimetableAssignment = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        className: data.className,
        stream: data.stream,
        day: data.day,
        period: data.period,
        subject: data.subject,
        teacherId: data.teacherId,
        room: data.room,
        activityType: data.activityType,
        customNote: data.customNote,
        isManual: true,
        isLocked: data.isLocked,
        allocationMode: 'manual',
        isParallelElective: true,
        parallelElectiveTrack: data.parallelElectiveTrack
      };

      // Ensure existing assignments in this slot are also flagged as isParallelElective
      const updatedList = assignments.map(a => {
        if (
          isSameClass(a.className, data.className) &&
          isSameStream(a.stream, data.stream) &&
          (a.day || '').toLowerCase() === data.day.toLowerCase() &&
          isSamePeriod(a.period, a.periodName, data.period)
        ) {
          return { ...a, isParallelElective: true };
        }
        return a;
      });

      onUpdateAssignments([...updatedList, newParallelItem]);
    } else if (data.assignmentId) {
      // Update specific existing assignment by ID
      onUpdateAssignments(
        assignments.map(a => (a.id === data.assignmentId ? { ...a, ...data, id: a.id } : a))
      );
    } else {
      // Apply to single slot
      const existing = (assignments || []).find(
        a => {
          if (!a) return false;
          return (
            isSameClass(a.className, data.className) &&
            isSameStream(a.stream, data.stream) &&
            (a.day || '').toLowerCase() === data.day.toLowerCase() &&
            isSamePeriod(a.period, a.periodName, data.period)
          );
        }
      );

      if (existing) {
        onUpdateAssignments(
          assignments.map(a => (a.id === existing.id ? { ...a, ...data, id: a.id } : a))
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

  const handleDeleteSlot = (id: number | string) => {
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
    const isReligiousSub =
      isAcademicReligiousSubject(data.activity.name) ||
      isAcademicReligiousSubject(data.periodName) ||
      data.activity.id === 'religion';

    // 1. Sync or add to PeriodSettings if requested (do NOT lock globally if class-specific or religious subject)
    if (data.syncToPeriodSettings && !isReligiousSub) {
      const targetClassScope = data.isSchoolWide ? 'All Classes' : (data.targetClass || 'All Classes');
      const targetStreamScope = data.isSchoolWide ? 'All Streams' : (data.targetStream || 'All Streams');
      const existingIndex = periodSettings.findIndex(
        p =>
          p.day === data.day &&
          (p.className || 'All Classes') === targetClassScope &&
          (p.name.toLowerCase() === data.periodName.toLowerCase() || (p.start === data.startTime && p.end === data.endTime))
      );
      let updatedPeriods = [...periodSettings];
      if (existingIndex >= 0) {
        updatedPeriods[existingIndex] = {
          ...updatedPeriods[existingIndex],
          name: data.periodName,
          start: data.startTime,
          end: data.endTime,
          className: targetClassScope,
          streamName: targetStreamScope,
          isLocked: data.isSchoolWide,
          locked: data.isSchoolWide,
          activityType: data.activity.id as ActivityType
        };
      } else {
        updatedPeriods.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          day: data.day,
          name: data.periodName,
          start: data.startTime,
          end: data.endTime,
          className: targetClassScope,
          streamName: targetStreamScope,
          isLocked: data.isSchoolWide,
          locked: data.isSchoolWide,
          activityType: data.activity.id as ActivityType
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
      if (data.isSchoolWide && !isReligiousSub) {
        return a.period !== periodKey && a.period !== data.periodName && a.periodName !== data.periodName;
      } else {
        return !(
          a.className === data.targetClass &&
          a.stream === data.targetStream &&
          (a.period === periodKey || a.period === data.periodName || a.periodName === data.periodName)
        );
      }
    });

    if (data.isSchoolWide && !isReligiousSub) {
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
            customNote: data.customNote,
            isLocked: true
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
        activityType: isReligiousSub ? 'academic' : (data.activity.id as ActivityType),
        teacherId: data.teacherId,
        room: data.room,
        customNote: data.customNote,
        isLocked: !isReligiousSub
      });
    }

    onUpdateAssignments([...updatedList, ...newItems]);
  };

  // Stream Settings Form state
  const [newStreamClass, setNewStreamClass] = useState('Form 1');
  const [newStreamLevel, setNewStreamLevel] = useState<'CSEE' | 'ACSEE'>('CSEE');
  const [newStreamNames, setNewStreamNames] = useState('STREAM A, STREAM B');

  // Helper to get strictly registered subjects for a teacher
  const getTeacherSubjectsForId = React.useCallback((tid: number): string[] => {
    const tObj = (teachers || []).find(t => t && Number(t.id) === Number(tid));
    return getRegisteredSubjectsForTeacher(tObj, teacherAssignments);
  }, [teacherAssignments, teachers]);

  // Master Assignment Form state
  const [assignClass, setAssignClass] = useState('Form 1');
  const [assignStream, setAssignStream] = useState('STREAM A');
  const [assignDay, setAssignDay] = useState('Monday');
  const [assignPeriod, setAssignPeriod] = useState('');
  const [assignTeacher, setAssignTeacher] = useState<number>(teachers?.[0]?.id || 0);
  const [assignSubject, setAssignSubject] = useState<string>(() => {
    const subs = getRegisteredSubjectsForTeacher(teachers?.[0], teacherAssignments);
    return subs.length === 1 ? subs[0] : '';
  });

  // Sync assignSubject when assignTeacher or teacher list changes:
  // Auto-fill ONLY if teacher has 1 subject; if multiple subjects, require user selection from dropdown
  React.useEffect(() => {
    const subs = getTeacherSubjectsForId(assignTeacher);
    if (subs.length === 1) {
      setAssignSubject(subs[0]);
    } else if (subs.length > 1) {
      setAssignSubject(prev => (prev && subs.some(s => isSameSubjectName(s, prev)) ? prev : ''));
    } else {
      setAssignSubject('');
    }
  }, [assignTeacher, getTeacherSubjectsForId]);

  const handleMasterAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPeriod) {
      alert('Tafadhali chagua kipindi (Please select a period).');
      return;
    }

    const teacherSubs = getTeacherSubjectsForId(assignTeacher);
    if (teacherSubs.length === 0) {
      alert('Mwalimu huyu hajasajiliwa somo lolote. Tafadhali msajilie masomo kwanza.');
      return;
    }

    const resolvedSubject = teacherSubs.length === 1 ? teacherSubs[0] : assignSubject;

    if (!resolvedSubject || !teacherSubs.some(s => isSameSubjectName(s, resolvedSubject))) {
      alert('Mwalimu huyu ana masomo zaidi ya moja. Tafadhali chagua somo alilosajiliwa kufundisha kwa kipindi hiki.');
      return;
    }

    const assignPeriodNorm = assignPeriod.split(' (')[0].trim();
    const isGlobalLocked = isPeriodLocked(assignDay, assignPeriodNorm, periodSettings, assignments, {
      className: assignClass,
      stream: assignStream,
      teacherId: assignTeacher
    }).isLocked;

    if (isGlobalLocked) {
      alert('Huwezi kupanga hapa; kipindi hiki kimefungwa (Locked) kwenye Mipangilio.');
      return;
    }

    const data: TimetableAssignment = {
      id: Date.now(),
      className: assignClass,
      stream: assignStream,
      day: assignDay,
      period: assignPeriod,
      periodName: assignPeriodNorm,
      teacherId: assignTeacher || undefined,
      subject: resolvedSubject,
      activityType: 'academic'
    };

    const existing = assignments.find(
      a =>
        a &&
        isSameClass(a.className, assignClass) &&
        isSameStream(a.stream, assignStream) &&
        (a.day || '').trim().toLowerCase() === assignDay.trim().toLowerCase() &&
        isSamePeriod(a.period, a.periodName, assignPeriodNorm)
    );

    if (existing && existing.isLocked && !isAcademicReligiousSubject(existing.subject)) {
      alert('Kipindi hiki kimefungwa (Locked). Tafadhali fungua kwanza kabla ya kubadilisha.');
      return;
    }

    const updated = assignments.filter(
      a =>
        !(
          a &&
          isSameClass(a.className, assignClass) &&
          isSameStream(a.stream, assignStream) &&
          (a.day || '').trim().toLowerCase() === assignDay.trim().toLowerCase() &&
          isSamePeriod(a.period, a.periodName, assignPeriodNorm)
        )
    );

    const finalAssignments = [...updated, data];
    onUpdateAssignments(finalAssignments);
    alert(`Assigned ${resolvedSubject} to ${assignClass} ${assignStream} on ${assignDay}!`);
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
          #teacher-printable-view *,
          #progression-printable-view,
          #progression-printable-view * {
            visibility: visible !important;
          }

          .master-timetable-container,
          #master-timetable-container,
          #general-printable-view,
          #class-printable-view,
          #teacher-printable-view,
          #progression-printable-view {
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
          {/* Title & Live Status */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Ratiba ya Masomo
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span>{assignments.length} Vipindi vilivyopangwa</span>
                  <span aria-hidden="true">·</span>
                  <span>Ulinganifu {integrityReport.score}%</span>
                  {integrityReport.criticalCount > 0 || totalConflicts > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setIntegrityReportModalOpen(true)}
                        className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        title="Bofya kukagua migongano"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 inline" />
                        <span>{integrityReport.criticalCount || totalConflicts} Migongano</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Zero Migongano</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Upangaji na usimamizi wa ratiba ya masomo, vipindi na walimu
              </p>
            </div>
          </div>

          {/* Global Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Tumia Msaidizi wa AI kujaza ratiba kiotomatiki kulingana na sera na walimu"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Fungua shughuli maalum (Baraza, Dini, Chakula, Michezo)"
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
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
              title="Hifadhi mabadiliko ya ratiba kudumu kwenye database"
            >
              {saveSuccessNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Imehifadhiwa!</span>
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
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Chapisha (Print) Ratiba ya Masomo"
              data-testid="print-timetable-button"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* 2. PRIMARY TAB NAVIGATION */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
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

          <button
            type="button"
            onClick={() => {
              setAllocInitialSubView('progression');
              setActiveTab('allocations');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'allocations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200'
            }`}
            title="Sajili masomo ya kila mkondo na tazama Progression Report ya vipindi vilivyoingizwa"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Kipimo &amp; Progression Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              ['settings', 'teacherAssignments', 'master', 'generalEntry', 'teacherEntry', 'saved', 'policies', 'constraints', 'integrity'].includes(activeTab)
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Mipangilio &amp; Zana</span>
          </button>
        </div>

        {/* Secondary Sub-Bar if in Settings / Setup Mode */}
        {['settings', 'allocations', 'teacherAssignments', 'master', 'generalEntry', 'teacherEntry', 'saved', 'policies', 'constraints', 'integrity'].includes(activeTab) && (
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500 mr-1 text-[11px] uppercase">Zana &amp; Mipangilio:</span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                ⏱️ Vipindi &amp; Saa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('allocations')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'allocations' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                📊 Masomo ya Mikondo &amp; Progression
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teacherAssignments')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'teacherAssignments' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                👥 Walimu
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('master')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'master' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                ✍️ Master Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('generalEntry')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'generalEntry' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                📝 General Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('teacherEntry')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'teacherEntry' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                📋 Fomu ya Mwalimu
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('policies')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'policies' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                📜 Sera
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('constraints')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'constraints' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                ⚖️ Ukaguzi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('integrity')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'integrity' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                🛡️ Integrity ({integrityReport.score}%)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${activeTab === 'saved' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
              >
                💾 Snapshots ({savedTimetableRecords.length})
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

      {/* Conflict Bar Alert: Inamfahamisha mkuu/academic master kuhusu vipindi vinavyogongana */}
      {totalConflicts > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-300 rounded-2xl flex items-center justify-between text-rose-950 shadow-sm flex-wrap gap-3 no-print animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-xs font-black uppercase tracking-wide text-rose-900">
                  ⚠️ Tahadhari ya Migongano: Vipindi {totalConflicts} Vinagongana!
                </strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 uppercase">
                  Inahitaji Kurekebishwa
                </span>
              </div>
              <p className="text-[11px] text-rose-800 font-medium mt-0.5">
                Kuna mwalimu aliyepangwa madarasa mawili au darasa lenye masomo yanayogongana kwa saa moja. Bofya hapa chini kujua vipindi husika na kuvirekebisha.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConflictListModalOpen(true)}
              className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Orodha ya Migongano ({totalConflicts})</span>
            </button>
            <button
              type="button"
              onClick={() => setIntegrityReportModalOpen(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Ripoti Kamili</span>
            </button>
            <button
              type="button"
              onClick={handleResolveConflicts}
              className="px-3 py-2 bg-white text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition shadow-xs flex items-center gap-1 cursor-pointer"
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
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Level & Class Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Level Selector */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                  {(['ALL', 'SECONDARY', 'PRIMARY', 'NURSERY'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setSelectedLevelFilter(lvl);
                        if (lvl === 'SECONDARY' && !SECONDARY_CLASSES.includes(selectedGeneralClass)) {
                          setSelectedGeneralClass('Form 1');
                        } else if (lvl === 'PRIMARY' && !PRIMARY_CLASSES.includes(selectedGeneralClass)) {
                          setSelectedGeneralClass('Standard 1');
                        } else if (lvl === 'NURSERY' && !NURSERY_CLASSES.includes(selectedGeneralClass)) {
                          setSelectedGeneralClass('Nursery 1');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        selectedLevelFilter === lvl
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl === 'ALL' ? 'Ngazi Zote' : lvl === 'SECONDARY' ? 'Sekondari' : lvl === 'PRIMARY' ? 'Msingi' : 'Awali'}
                    </button>
                  ))}
                </div>

                {/* Class Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Darasa:</span>
                  <select
                    value={selectedGeneralClass}
                    onChange={e => {
                      setSelectedGeneralClass(e.target.value);
                      setSelectedGeneralStream('All');
                    }}
                    className="text-xs font-bold bg-transparent text-slate-900 focus:outline-hidden cursor-pointer"
                  >
                    <option value="All">🏫 Madarasa Yote (Whole School)</option>
                    {(selectedLevelFilter === 'ALL' || selectedLevelFilter === 'SECONDARY') && (
                      <optgroup label="SEKONDARI (Form 1 - 6)">
                        {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    )}
                    {(selectedLevelFilter === 'ALL' || selectedLevelFilter === 'PRIMARY') && (
                      <optgroup label="MSINGI (Std 1 - 7)">
                        {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    )}
                    {(selectedLevelFilter === 'ALL' || selectedLevelFilter === 'NURSERY') && (
                      <optgroup label="AWALI (Nursery)">
                        {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Stream Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Mkondo:</span>
                  <select
                    value={selectedGeneralStream}
                    onChange={e => setSelectedGeneralStream(e.target.value)}
                    className="text-xs font-bold bg-transparent text-slate-900 focus:outline-hidden cursor-pointer"
                  >
                    <option value="All">Mikondo Yote</option>
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

                {/* Day Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Siku:</span>
                  <select
                    value={selectedDayFilter}
                    onChange={e => setSelectedDayFilter(e.target.value)}
                    className="text-xs font-bold bg-transparent text-slate-900 focus:outline-hidden cursor-pointer"
                  >
                    <option value="All">Siku Zote ({configuredDays.length} Days)</option>
                    {configuredDays.map(d => (
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

              {/* Quick Actions (Excel, PDF, WhatsApp, Snapshot) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
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
                  className="px-2.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                  title="Pakua PDF ya A4"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const scopeLabel = selectedGeneralClass === 'All' ? 'Whole School' : selectedGeneralClass;
                    const streamLabel = selectedGeneralStream !== 'All' ? selectedGeneralStream : '';
                    handleShareTimetableWhatsApp(`General Timetable - ${scopeLabel} ${streamLabel}`.trim());
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                  title="Tuma ratiba kupitia WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSnapshotTitle(`Master Timetable — ${new Date().toLocaleDateString()}`);
                    setSaveSnapshotModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                  title="Hifadhi snapshot ya toleo hili la ratiba"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Snapshot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHighlightConstraintsInRed(!highlightConstraintsInRed)}
                  className={`px-2 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer border ${
                    highlightConstraintsInRed
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Washa au zima viashiria vya hitilafu kwenye jedwali"
                >
                  <ShieldAlert className={`w-3.5 h-3.5 ${highlightConstraintsInRed ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Hitilafu ({constraintValidationReport.criticalIssuesCount + constraintValidationReport.warningIssuesCount})</span>
                </button>
              </div>
            </div>

            {/* Quick Class Pills for the selected level */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Madarasa:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedGeneralClass('All');
                  setSelectedGeneralStream('All');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedGeneralClass === 'All'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🏫 Shule Nzima (All)
              </button>
              {(selectedLevelFilter === 'SECONDARY'
                ? SECONDARY_CLASSES
                : selectedLevelFilter === 'PRIMARY'
                ? PRIMARY_CLASSES
                : selectedLevelFilter === 'NURSERY'
                ? NURSERY_CLASSES
                : DEFAULT_CLASSES
              ).map(cName => {
                const isSelected = selectedGeneralClass === cName;
                const hasLessons = (assignments || []).some(a => a && a.className === cName);
                return (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => {
                      setSelectedGeneralClass(cName);
                      setSelectedGeneralStream('All');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{cName}</span>
                    {hasLessons && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Automatic Curriculum Load Error Flagging Strip for General Timetable */}
          {(() => {
            const targetClasses = selectedGeneralClass === 'All'
              ? (selectedLevelFilter === 'SECONDARY'
                  ? SECONDARY_CLASSES
                  : selectedLevelFilter === 'PRIMARY'
                  ? PRIMARY_CLASSES
                  : selectedLevelFilter === 'NURSERY'
                  ? NURSERY_CLASSES
                  : DEFAULT_CLASSES)
              : [selectedGeneralClass];

            const streamAudits = targetClasses.flatMap(cName => {
              const allStreams = getStreamsForClass(cName);
              const targetStreams = selectedGeneralStream === 'All'
                ? allStreams
                : allStreams.filter(st => st === selectedGeneralStream);
              return targetStreams.map(st =>
                computeStreamSubjectProgression(
                  cName,
                  st,
                  subjectPeriodAllocations,
                  assignments,
                  periodSettings,
                  teachers
                )
              );
            }).filter(r => r.totalRequiredSubjects > 0);

            if (streamAudits.length === 0) return null;

            const totalMissing = streamAudits.reduce((acc, r) => acc + r.missingSubjects.length, 0);
            const totalDeficit = streamAudits.reduce((acc, r) => acc + r.incompleteSubjects.length, 0);
            const totalExcess = streamAudits.reduce((acc, r) => acc + r.excessSubjects.length, 0);
            const totalUnreg = streamAudits.reduce((acc, r) => acc + r.unregisteredSubjects.length, 0);
            const totalExpected = streamAudits.reduce((acc, r) => acc + r.totalRequiredPeriods, 0);
            const totalEntered = streamAudits.reduce((acc, r) => acc + Math.min(r.totalEnteredRegisteredPeriods, r.totalRequiredPeriods), 0);
            const overallPct = totalExpected > 0 ? Math.min(100, Math.round((totalEntered / totalExpected) * 100)) : 0;
            const hasErrors = totalMissing > 0 || totalDeficit > 0 || totalExcess > 0 || totalUnreg > 0;

            return (
              <div
                className={`p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden ${
                  !hasErrors
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : totalMissing > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {!hasErrors ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${totalMissing > 0 ? 'text-rose-600' : 'text-amber-600'}`} />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wide">
                        {!hasErrors
                          ? 'Curriculum Load Verified (100% Match with Expected Periods)'
                          : 'Automatic Curriculum Load Error Flagging — General Timetable Mismatch'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/80 border border-current/20">
                        {overallPct}% Completion ({totalEntered}/{totalExpected} expected weekly periods)
                      </span>
                    </div>
                    {hasErrors && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {totalMissing > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            🚩 {totalMissing} Missing Required Subject(s) (0% Entered)
                          </span>
                        )}
                        {totalDeficit > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠️ {totalDeficit} Subject(s) Under-Allocated (Period Deficit)
                          </span>
                        )}
                        {totalExcess > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            ⚡ {totalExcess} Subject(s) Over-Allocated (Exceeds Expected Count)
                          </span>
                        )}
                        {totalUnreg > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-slate-800">
                            ℹ️ {totalUnreg} Unregistered Subject(s) in General Timetable
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleManageStreamSubjects(
                        selectedGeneralClass === 'All' ? 'Form 1' : selectedGeneralClass,
                        selectedGeneralStream === 'All' ? 'STREAM A' : selectedGeneralStream,
                        'progression'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-2xs"
                  >
                    Open Progression Report (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
                  >
                    Class/Stream Curriculum Config
                  </button>
                </div>
              </div>
            );
          })()}

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
            {configuredDays.filter(day => selectedDayFilter === 'All' || selectedDayFilter === day).map(day => {
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
                    {(selectedGeneralClass === 'All'
                      ? (selectedLevelFilter === 'SECONDARY'
                          ? SECONDARY_CLASSES
                          : selectedLevelFilter === 'PRIMARY'
                          ? PRIMARY_CLASSES
                          : selectedLevelFilter === 'NURSERY'
                          ? NURSERY_CLASSES
                          : DEFAULT_CLASSES.filter(c =>
                              (assignments || []).some(a => a && a.className === c) ||
                              ['Form 1', 'Form 2'].includes(c)
                            )
                        )
                      : [selectedGeneralClass]
                    ).map(className => {
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
                            <div className="flex flex-wrap items-center gap-1.5">
                              {streams.map(st => {
                                const prog = computeStreamSubjectProgression(
                                  className,
                                  st,
                                  subjectPeriodAllocations,
                                  assignments,
                                  periodSettings,
                                  teachers
                                );
                                const hasCurriculum = prog.totalRequiredSubjects > 0;
                                const hasFlag = hasCurriculum && (
                                  prog.missingSubjects.length > 0 ||
                                  prog.incompleteSubjects.length > 0 ||
                                  prog.excessSubjects.length > 0
                                );
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleManageStreamSubjects(className, st, 'progression')}
                                    style={{ backgroundColor: formTheme.badgeBg, color: formTheme.badgeText }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 hover:opacity-90 cursor-pointer"
                                    title={
                                      hasCurriculum
                                        ? `${className} ${st}: ${prog.overallPercentage}% Curriculum Completion (${prog.totalEnteredRegisteredPeriods}/${prog.totalRequiredPeriods} periods)`
                                        : `Click to configure required subjects for ${className} ${st}`
                                    }
                                  >
                                    <span>{st}</span>
                                    {hasCurriculum && (
                                      <span
                                        className={`px-1 rounded text-[9px] font-black ${
                                          prog.isFullyComplete && prog.excessSubjects.length === 0
                                            ? 'bg-emerald-600 text-white'
                                            : hasFlag
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-amber-500 text-white'
                                        }`}
                                      >
                                        {prog.overallPercentage}%
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Matrix Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[760px]">
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
                                        const slotAssignments = (assignments || []).filter(
                                          a =>
                                            a &&
                                            isSameClass(a.className, className) &&
                                            isSameStream(a.stream, stream) &&
                                            (a.day || '').toLowerCase() === day.toLowerCase() &&
                                            isSamePeriod(a.period, a.periodName, period.name)
                                        );
                                        const assignment = slotAssignments[0];
                                        const isMultiParallel = slotAssignments.length > 1;

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
                                                assignment,
                                                slotAssignments
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
                                            {isMultiParallel ? (
                                              /* MULTIPLE PARALLEL ELECTIVE SUBJECTS IN SAME SLOT */
                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[9px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                                                  <span>🔀 MICHEPUO ({slotAssignments.length})</span>
                                                </div>
                                                {slotAssignments.map((asg, asgIdx) => {
                                                  const asgColor = getSubjectColor(asg.subject);
                                                  const asgTeacher = asg.teacherId ? teachers.find(t => t.id === asg.teacherId) : undefined;
                                                  const asgTeacherColor = asgTeacher ? getTeacherColor(asgTeacher.id) : null;
                                                  return (
                                                    <div
                                                      key={asg.id || asgIdx}
                                                      draggable
                                                      onDragStart={e => handleDragStart(e, asg)}
                                                      style={{
                                                        backgroundColor: asgColor?.bg,
                                                        borderColor: asgColor?.border
                                                      }}
                                                      className="p-1.5 rounded-md border text-xs shadow-2xs hover:shadow-xs select-none transition-all"
                                                    >
                                                      <div
                                                        style={{ color: asgColor?.text }}
                                                        className="font-bold leading-tight flex items-center justify-between gap-1"
                                                      >
                                                        <span className="truncate">{getSubjectShortName(asg.subject)}</span>
                                                        {asg.parallelElectiveTrack && (
                                                          <span className="text-[8px] px-1 py-0.2 bg-emerald-700 text-white rounded font-black uppercase shrink-0">
                                                            {asg.parallelElectiveTrack}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                                                        {asgTeacher ? (
                                                          <span
                                                            style={{ backgroundColor: asgTeacherColor?.hex, color: '#ffffff' }}
                                                            className="px-1.5 py-0.2 rounded-full font-bold shadow-2xs text-[9px]"
                                                          >
                                                            {asgTeacher.initial}
                                                          </span>
                                                        ) : (
                                                          <span className="text-slate-400 italic text-[9px]">Hakuna mwalimu</span>
                                                        )}
                                                        {asg.room && (
                                                          <span className="font-semibold text-[9px] text-slate-600 truncate max-w-[60px]">
                                                            {asg.room}
                                                          </span>
                                                        )}
                                                      </div>
                                                      {asg.id && conflicts[asg.id]?.hasConflict && (
                                                        <div 
                                                          title={conflicts[asg.id]?.message}
                                                          className="mt-1 flex items-center justify-between text-[8px] bg-rose-600 hover:bg-rose-700 text-white font-black px-1.5 py-0.5 rounded animate-pulse shadow-2xs"
                                                        >
                                                          <span className="flex items-center gap-0.5 truncate">
                                                            <AlertTriangle className="w-2 h-2 shrink-0" />
                                                            <span>MGONGANO!</span>
                                                          </span>
                                                          <span className="underline shrink-0">Rekebisha</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : assignment ? (
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
                                                  {assignment.isParallelElective && (
                                                    <span className="text-[8px] px-1 py-0.2 bg-emerald-600 text-white font-black rounded uppercase">
                                                      {assignment.parallelElectiveTrack || 'Mchepuo'}
                                                    </span>
                                                  )}
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

                                                {/* Conflict high-visibility alert banner on cell */}
                                                {conflict?.hasConflict && (
                                                  <div 
                                                    title={conflict.message || `Clash! Double-booked with ${conflict.conflictingWith.map(c => `${c.className} ${c.stream}`).join(', ')}`}
                                                    className="mt-1.5 flex items-center justify-between gap-1 bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse shadow-xs"
                                                  >
                                                    <span className="flex items-center gap-0.5 truncate">
                                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                                      <span className="truncate">MGONGANO!</span>
                                                    </span>
                                                    <span className="underline shrink-0 text-[8px]">Rekebisha</span>
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
                    configuredDays,
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
                  setWhatsAppDocTitle(`Class Timetable (${selectedClassFilter}) - ${schoolName}`);
                  setShowWhatsAppModal(true);
                }}
                className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Download Timetable PDF and send via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send via WhatsApp</span>
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

          {/* Clean Class & Stream Navigation */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Chagua Darasa na Mkondo wa Kutazama:</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Inaonyesha ratiba ya wiki kwa kila mkondo na vipindi vyake
              </span>
            </div>

            {/* Class Pill Selectors */}
            <div className="flex flex-wrap items-center gap-1.5">
              {DEFAULT_CLASSES.map(cName => {
                const isSelected = selectedClassFilter === cName;
                const hasLessons = (assignments || []).some(a => a && isSameClass(a.className, cName));
                return (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => {
                      setSelectedClassFilter(cName);
                      setSelectedClassStreamFilter('All');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cName}</span>
                    {hasLessons && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stream Filter for selected class */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Mkondo:</span>
              <button
                type="button"
                onClick={() => setSelectedClassStreamFilter('All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedClassStreamFilter === 'All'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Mikondo Yote ({getStreamsForClass(selectedClassFilter).length})
              </button>
              {getStreamsForClass(selectedClassFilter).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedClassStreamFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedClassStreamFilter === st
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
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
              const allStreams = getStreamsForClass(selectedClassFilter);
              const activeStreams = (selectedClassStreamFilter === 'All' ? allStreams : [selectedClassStreamFilter]).filter(Boolean);
              const listToRender = activeStreams.length > 0 ? activeStreams : ['STREAM A'];
              return listToRender.map(stream => (
                <div key={stream} className="mb-6">
                  <ClassTimetable 
                    className={selectedClassFilter} 
                    stream={stream} 
                    assignments={assignments} 
                    periodSettings={periodSettings} 
                    teachers={teachers}
                    subjectPeriodAllocations={subjectPeriodAllocations}
                    onManageStreamSubjects={handleManageStreamSubjects}
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
            <div className="flex flex-wrap items-center gap-3">
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
              {(() => {
                let dutyCount = 0;
                (sessions || []).forEach(sess => {
                  for (let r = 0; r < (sess.rooms || 1); r++) {
                    if (Number(invigilationAssignments[`${sess.id}_room${r}`]) === Number(selectedTeacherFilter)) {
                      dutyCount++;
                    }
                  }
                });
                if (dutyCount === 0) return null;
                return (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>{dutyCount} Vikao vya Mitihani</span>
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAllocInitialSubView('teacher_progression');
                  setActiveTab('allocations');
                }}
                className="px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tazama Ripoti ya Progression ya Walimu (Teacher Progression Report)"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Progression ya Walimu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('teacherEntry')}
                className="px-3 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Fungua Fomu ya Kupanga Vipindi vya Mwalimu"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Panga Vipindi vya Mwalimu</span>
              </button>

              <button
                onClick={() => {
                  const currentTeacher = teachers.find(t => Number(t.id) === Number(selectedTeacherFilter)) || teachers[0];
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
                  const currentTeacher = teachers.find(t => Number(t.id) === Number(selectedTeacherFilter)) || teachers[0];
                  exportTimetablePDF({
                    viewMode: 'teacher',
                    assignments,
                    teachers,
                    periodSettings,
                    streamSettings,
                    schoolInfo,
                    schoolName,
                    selectedTeacherId: currentTeacher?.id ?? selectedTeacherFilter,
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
                      TEACHER TEACHING TIMETABLE • {(teachers.find(t => Number(t.id) === Number(selectedTeacherFilter)) || teachers[0])?.name || 'FACULTY'} (RATIBA YA MWALIMU)
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
                const currentTeacher = teachers.find(t => Number(t.id) === Number(selectedTeacherFilter)) || teachers[0];
                return (
                  <TeacherTimetable 
                    teacher={currentTeacher} 
                    assignments={assignments} 
                    periodSettings={periodSettings}
                    sessions={sessions}
                    invigilationAssignments={invigilationAssignments}
                    supervisors={supervisors}
                    schoolInfo={schoolInfo}
                    schoolName={schoolName}
                  />
                );
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
          teacherAssignments={teacherAssignments}
          subjectPeriodAllocations={subjectPeriodAllocations}
          onManageStreamSubjects={handleManageStreamSubjects}
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
                  {configuredDays.map(d => (
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
                    .filter(p => p.day === assignDay && !p.isBreak)
                    .map(p => {
                      const label = `${p.name} (${p.start}-${p.end})`;
                      const locked = isPeriodLocked(assignDay, p.name, periodSettings, assignments, {
                        className: assignClass,
                        stream: assignStream,
                        teacherId: assignTeacher
                      }).isLocked;
                      return (
                        <option key={p.id} value={label} disabled={locked}>
                          {label}{locked ? ' — [LOCKED 🔒]' : ''}
                        </option>
                      );
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
                    const subs = getTeacherSubjectsForId(tid);
                    if (subs.length === 1) {
                      setAssignSubject(subs[0]);
                    } else {
                      setAssignSubject('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.initial}) — [{getTeacherSubjectsForId(t.id).join(', ') || 'No subject'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Subject (Somo Alilosajiliwa Mwalimu)</label>
                {(() => {
                  const teacherSubs = getTeacherSubjectsForId(assignTeacher);
                  if (teacherSubs.length === 0) {
                    return (
                      <div className="w-full px-3 py-2 text-xs font-bold border border-rose-200 rounded-lg bg-rose-50 text-rose-800">
                        ⚠️ Mwalimu huyu hajasajiliwa somo lolote
                      </div>
                    );
                  }
                  if (teacherSubs.length === 1) {
                    return (
                      <div className="w-full px-3 py-2 text-xs font-bold border border-blue-200 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-between">
                        <span>{teacherSubs[0]}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-black">
                          Auto ✓
                        </span>
                      </div>
                    );
                  }
                  return (
                    <select
                      value={assignSubject}
                      onChange={e => setAssignSubject(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- Chagua Somo (Select Subject) --</option>
                      {teacherSubs.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={getTeacherSubjectsForId(assignTeacher).length === 0}
                  className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
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

          {/* Class & Stream Settings + Curriculum Load Configuration (Required Subjects & Expected Weekly Periods) */}
          <ClassStreamCurriculumConfig
            streamSettings={streamSettings}
            onUpdateStreamSettings={onUpdateStreamSettings}
            subjectPeriodAllocations={subjectPeriodAllocations}
            onUpdateSubjectPeriodAllocations={onUpdateSubjectPeriodAllocations || (() => {})}
            assignments={assignments}
            periodSettings={periodSettings}
            teachers={teachers}
            teacherAssignments={teacherAssignments}
            onUpdateTeacherAssignments={onUpdateTeacherAssignments}
            schoolName={schoolName}
            schoolInfo={schoolInfo}
            onOpenProgressionReport={(className, stream) =>
              handleManageStreamSubjects(className, stream, 'progression')
            }
            onOpenTeacherProgressionReport={() =>
              handleManageStreamSubjects('All', 'All', 'teacher_progression')
            }
            onNavigateToGeneralTimetable={(className, stream) => {
              setSelectedGeneralClass(className);
              setSelectedGeneralStream(stream);
              setActiveTab('generalEntry');
            }}
          />

          {/* Timetable Print Layout & CSS Optimization Settings (Moved from School Identity) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-[#1f4d8b] flex items-center gap-2 uppercase tracking-wide">
                <Printer className="w-5 h-5 text-blue-600" />
                Timetable Print Layout & CSS Optimization Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize print page orientation, page margins, and print-optimized CSS classes for clean A4 printing without cutting off periods.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Print Page Orientation</label>
                <select
                  value={printOrientation}
                  onChange={(e) => setPrintOrientation(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                >
                  <option value="landscape">Landscape (Recommended for Timetables)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Custom Page Margin</label>
                <select
                  value={printMargin}
                  onChange={(e) => setPrintMargin(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                >
                  <option value="4mm">4mm (Ultra Compact)</option>
                  <option value="6mm">6mm (Standard)</option>
                  <option value="10mm">10mm (Balanced)</option>
                  <option value="15mm">15mm (Spacious)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printOptimizedCss}
                    onChange={(e) => setPrintOptimizedCss(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Enable Print-Optimized CSS & Crisp Borders</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSavePrintSettings}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Print Preferences</span>
              </button>
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
          subjectPeriodAllocations={subjectPeriodAllocations}
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
      {/* 8. SUBJECT PERIOD ALLOCATION & PROGRESSION REPORT TAB   */}
      {/* ======================================================== */}
      {activeTab === 'allocations' && (
        <SubjectPeriodAllocationTab
          allocations={subjectPeriodAllocations}
          streamSettings={streamSettings}
          assignments={assignments}
          periodSettings={periodSettings}
          teachers={teachers}
          teacherAssignments={teacherAssignments}
          schoolName={schoolName}
          schoolInfo={schoolInfo}
          initialClass={allocInitialClass}
          initialStream={allocInitialStream}
          initialSubView={allocInitialSubView}
          onUpdateAllocations={onUpdateSubjectPeriodAllocations || (() => {})}
          onNavigateToGeneralTimetable={(cls, st) => {
            setSelectedGeneralClass(cls);
            setSelectedGeneralStream(st);
            setActiveTab('general');
          }}
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
            periodSettings={periodSettings}
            institutionalPolicy={institutionalPolicy}
            assignments={assignments}
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
          subjectPeriodAllocations={subjectPeriodAllocations}
          schoolName={schoolName}
          onUpdateAssignments={onUpdateAssignments}
          onEditSlot={slot => setEditingSlot(slot)}
        />
      )}

      {/* Conflict List Modal (Orodha ya Migongano & Kurekebisha Haraka) */}
      {conflictListModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
                  <AlertTriangle className="w-5 h-5 text-amber-200 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      Orodha ya Migongano ya Ratiba
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 border border-white/30 text-white uppercase tracking-wider">
                      {totalConflicts} {totalConflicts === 1 ? 'Mgongano' : 'Migongano'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 font-medium mt-0.5">
                    Tazama vipindi vinavyogongana na ubofye &quot;Rekebisha Sasa&quot; ili kubadilisha mwalimu, somo au muda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConflictListModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Funga"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-2.5 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between gap-3 text-xs flex-wrap">
              <span className="text-rose-900 font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-rose-600" />
                Bofya <strong>Rekebisha Sasa</strong> kufungua dirisha la kubadili kipindi, au tumia utatuzi wa kiotomatiki.
              </span>
              {totalConflicts > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleResolveConflicts();
                    setConflictListModalOpen(false);
                  }}
                  className="px-3 py-1 bg-white hover:bg-rose-100/70 text-rose-800 border border-rose-300 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                >
                  <RefreshCw className="w-3 h-3 text-rose-600" />
                  <span>Tatua Kiotomatiki Zote</span>
                </button>
              )}
            </div>

            {/* Content List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
              {totalConflicts === 0 ? (
                <div className="py-12 text-center space-y-3 bg-white rounded-xl border border-slate-200">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">
                    Hongera! Hakuna Mgongano Wowote
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Ratiba haina mgongano wowote wa walimu au madarasa kwa sasa. Vipindi vyote vimepangwa kulingana na sheria za shule.
                  </p>
                </div>
              ) : (
                Object.entries(conflicts).map(([asgId, conflictInfo], idx) => {
                  const asg = assignments.find(a => a && String(a.id) === String(asgId));
                  if (!asg) return null;
                  const teacher = asg.teacherId ? teachers.find(t => t.id === asg.teacherId) : undefined;
                  const typeLabel = conflictInfo.type === 'TEACHER_DOUBLE_BOOKED'
                    ? 'Mgongano wa Mwalimu'
                    : conflictInfo.type === 'CLASS_COLLISION'
                    ? 'Mgongano wa Darasa'
                    : 'Mgongano wa Chumba';

                  return (
                    <div
                      key={asgId || idx}
                      className="bg-white rounded-xl border-2 border-rose-200 p-4 shadow-2xs hover:shadow-sm transition space-y-3"
                    >
                      {/* Top Badges & Tags */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="px-2 py-0.5 rounded-md font-black bg-rose-600 text-white text-[10px] uppercase tracking-wide flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {typeLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-800 text-[11px]">
                            📅 {asg.day}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                            ⏰ {asg.period || asg.periodName || 'Kipindi'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                            🏫 {asg.className} ({asg.stream})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickFixConflict(asg.id)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>🛠️ Rekebisha Sasa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Futa kipindi cha ${asg.subject} (${asg.className} ${asg.stream}) ili kuondoa mgongano huu?`)) {
                                onUpdateAssignments(assignments.filter(a => a && a.id !== asg.id));
                              }
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-bold rounded-lg transition border border-slate-200 cursor-pointer"
                            title="Futa kipindi hiki"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Details & Explanation */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Somo</span>
                          <strong className="text-slate-800 font-extrabold">{asg.subject}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Mwalimu Aliye Pangwa</span>
                          <span className="font-bold text-blue-900">
                            {teacher ? `${teacher.name} (${teacher.initial})` : 'Hakuna Mwalimu'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Chumba / Mchepuo</span>
                          <span className="font-medium text-slate-600">
                            {asg.isParallelElective ? `🔀 ${asg.parallelElectiveTrack || 'Mchepuo'}` : (asg.room || 'Chumba cha Kawaida')}
                          </span>
                        </div>
                      </div>

                      {/* Conflict Alert Banner */}
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
                        <p className="text-xs font-bold text-rose-950 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span>{conflictInfo.message}</span>
                        </p>
                        {conflictInfo.recommendation && (
                          <p className="text-[11px] text-rose-800 font-medium pl-5">
                            💡 <strong>Mapendekezo:</strong> {conflictInfo.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Migongano inapunguza ufanisi wa ratiba na kusababisha walimu kutoingia darasani.
              </span>
              <button
                type="button"
                onClick={() => setConflictListModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Funga Dirisha
              </button>
            </div>
          </div>
        </div>
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
      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        documentTitle={whatsAppDocTitle}
      />
    </div>
  );
};
