import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { jsPDF } from 'jspdf';
import { 
  UserCheck, 
  Fingerprint,
  Trash2, 
  Edit3, 
  ShieldAlert, 
  Palette, 
  Camera, 
  Upload, 
  X, 
  Award, 
  Phone, 
  Mail, 
  Briefcase,
  Search, 
  Filter, 
  User, 
  Layers, 
  Clock, 
  Sparkles, 
  Check,
  Calendar,
  Plus,
  Printer,
  ChevronRight,
  BookOpen,
  FileSpreadsheet,
  Users,
  CheckSquare,
  Square,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Sliders,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
  MessageSquare,
  Send,
  AlertCircle
} from 'lucide-react';
import { GenderSummary, formatGenderSummaryText } from './common/GenderSummary';
import { CameraCaptureModal } from './common/CameraCaptureModal';
import { 
  Teacher, 
  SchoolStaffRole, 
  TeacherEvaluation, 
  SchoolInfo, 
  UserAccount, 
  StreamSetting,
  TimetableAssignment,
  PeriodSetting,
  InvigilationSession,
  Supervisor
} from '../types';
import { SUBJECT_LIST, INVIGILATOR_COLORS, STAFF_ROLES_LIST, DEFAULT_CLASSES } from '../constants/defaults';
import { SubjectRegistry } from '../constants/SubjectRegistry';

import { getTeacherColor } from '../utils/colors';
import { cleanSubjectName } from '../utils/cleanSubject';
import { TeacherEvaluationView } from './TeacherEvaluationView';
import { MultipleTeacherRegistrationModal } from './Teachers/MultipleTeacherRegistrationModal';
import { PhoneInputPlugin } from './common/PhoneInputPlugin';
import { StudentPhoneBadge } from './common/StudentPhoneBadge';
import { useConfirmDelete } from '../context/ConfirmDeleteContext';
import { BiometricRegistration } from './Teachers/BiometricRegistration';
import { computeTeacherInitial } from '../utils/teacherInitials';
import { TeacherTimetable } from './Timetable/TeacherTimetable';
import { TeacherProfileDashboard } from './Teachers/TeacherProfileDashboard';
import { isSamePeriod, isSameStream } from '../lib/timetableService';
import { isSameClass } from '../utils/reportCardUtils';
import { parseClassTeacherOf, formatClassTeacherString } from '../utils/classTeacherUtils';

interface TeachersViewProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
  onBulkAddTeachers?: (teachers: Teacher[]) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onBulkUpdateTeachers?: (teachers: Teacher[]) => void;
  onDeleteTeacher: (id: number) => void;
  onBulkDeleteTeachers?: (ids: number[]) => void;
  teacherEvaluations?: TeacherEvaluation[];
  onSaveEvaluation?: (evaluation: TeacherEvaluation) => void;
  onDeleteEvaluation?: (id: string) => void;
  streamSettings?: StreamSetting[];
  timetableAssignments?: TimetableAssignment[];
  onUpdateTimetableAssignments?: (assignments: TimetableAssignment[]) => void;
  periodSettings?: PeriodSetting[];
  sessions?: InvigilationSession[];
  invigilationAssignments?: Record<string, number>;
  supervisors?: Supervisor[];
  journalRecords?: Record<string, any>;
  onUpdateJournal?: (records: Record<string, any>) => void;
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
}

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

const POPULAR_SUBJECTS = SubjectRegistry.getPopular();

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  onAddTeacher,
  onBulkAddTeachers,
  onUpdateTeacher,
  onBulkUpdateTeachers,
  onDeleteTeacher,
  onBulkDeleteTeachers,
  teacherEvaluations = [],
  onSaveEvaluation,
  onDeleteEvaluation,
  streamSettings = [],
  timetableAssignments = [],
  onUpdateTimetableAssignments,
  periodSettings = [],
  sessions = [],
  invigilationAssignments = {},
  supervisors = [],
  journalRecords = {},
  onUpdateJournal,
  schoolInfo,
  currentUser
}) => {
  const { openConfirmDelete } = useConfirmDelete();
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'evaluations' | 'workload' | 'profile_dashboard'>('roster');
  const [profileDashboardTeacherId, setProfileDashboardTeacherId] = useState<number | undefined>(undefined);
  const [isMultipleTeacherModalOpen, setIsMultipleTeacherModalOpen] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [registeringBiometricId, setRegisteringBiometricId] = useState<string | null>(null);


  // If logged in as TEACHER: show ONLY the current teacher (hide list of other teachers)
  const isTeacherUser = currentUser?.role === 'TEACHER' && !currentUser?.isSuperAdmin;
  const currentTeacherName = (currentUser?.fullName || '').toLowerCase().trim();
  const currentTeacherEmail = (currentUser?.email || '').toLowerCase().trim();

  const isFemaleTeacher = (t: { gender?: string; schoolRole?: string }) => {
    const g = (t.gender || '').toLowerCase().trim();
    if (g.startsWith('f') || g === 'ke' || g === 'girl' || g === 'mwanamke' || g === 'g') return true;
    const r = (t.schoolRole || '').toLowerCase();
    if (r.includes('mistress') || r.includes('matron')) return true;
    return false;
  };

  const compareTeachersFemaleFirst = (
    a: { name?: string; gender?: string; schoolRole?: string },
    b: { name?: string; gender?: string; schoolRole?: string }
  ) => {
    const aFem = isFemaleTeacher(a);
    const bFem = isFemaleTeacher(b);
    if (aFem !== bFem) return aFem ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  };

  const effectiveTeachers = useMemo(() => {
    let list = !isTeacherUser ? teachers : teachers.filter(t => {
      const tName = (t.name || '').toLowerCase().trim();
      const tEmail = (t.email || '').toLowerCase().trim();
      return (
        (tEmail && tEmail === currentTeacherEmail) ||
        (tName && (tName.includes(currentTeacherName) || currentTeacherName.includes(tName)))
      );
    });
    if (isTeacherUser && list.length === 0) {
      list = [{
        id: 9999,
        name: currentUser?.fullName || 'Mwalimu wa Somo',
        email: currentUser?.email || '',
        subjects: currentUser?.assignedSubjects || [],
        schoolRole: 'Subject Teacher',
        gender: 'Male'
      } as Teacher];
    }
    return [...list].sort(compareTeachersFemaleFirst);
  }, [teachers, isTeacherUser, currentTeacherName, currentTeacherEmail, currentUser]);

  // Workload Analytics State
  const [workloadThreshold, setWorkloadThreshold] = useState<number>(20);
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'OVERWORKED' | 'TOP10'>('ALL');
  const [workloadSort, setWorkloadSort] = useState<'DESC' | 'ASC' | 'ALPHA'>('DESC');
  const [isWorkloadChartExpanded, setIsWorkloadChartExpanded] = useState<boolean>(true);

  // Workload Analytics Data calculation for Recharts
  const teacherWorkloadData = useMemo(() => {
    return effectiveTeachers.map(t => {
      const tSlots = timetableAssignments.filter(a => {
        const matchId = a.teacherId === t.id;
        const aT = (('teacher' in a ? (a as any).teacher : '') || '').toLowerCase();
        return matchId || aT === t.name.toLowerCase() || (t.initial && aT === t.initial.toLowerCase()) || aT.includes(t.name.toLowerCase());
      });

      const lessonsCount = tSlots.length;
      const isOverworked = lessonsCount > workloadThreshold;
      const diff = lessonsCount - workloadThreshold;

      return {
        id: t.id,
        name: t.name,
        shortName: t.initial || (t.name ? t.name.split(' ')[0] : `T${t.id}`),
        role: t.schoolRole || 'Subject Teacher',
        lessonsCount,
        subjects: t.subjects || [],
        isOverworked,
        diff,
        gender: t.gender || 'Male'
      };
    });
  }, [effectiveTeachers, timetableAssignments, workloadThreshold]);

  const processedChartData = useMemo(() => {
    let list = [...teacherWorkloadData];
    if (workloadFilter === 'OVERWORKED') {
      list = list.filter(d => d.isOverworked);
    }

    if (workloadSort === 'DESC') {
      list.sort((a, b) => b.lessonsCount - a.lessonsCount);
    } else if (workloadSort === 'ASC') {
      list.sort((a, b) => a.lessonsCount - b.lessonsCount);
    } else if (workloadSort === 'ALPHA') {
      list.sort((a, b) => compareTeachersFemaleFirst({ name: a.name, gender: a.gender, schoolRole: a.role }, { name: b.name, gender: b.gender, schoolRole: b.role }));
    }

    if (workloadFilter === 'TOP10') {
      list.sort((a, b) => b.lessonsCount - a.lessonsCount);
      list = list.slice(0, 10);
    }

    return list;
  }, [teacherWorkloadData, workloadFilter, workloadSort]);

  const overworkedTeachers = useMemo(() => {
    return teacherWorkloadData.filter(d => d.isOverworked);
  }, [teacherWorkloadData]);

  const underallocatedTeachers = useMemo(() => {
    return teacherWorkloadData.filter(d => d.lessonsCount < 10);
  }, [teacherWorkloadData]);

  const avgWorkload = useMemo(() => {
    if (teacherWorkloadData.length === 0) return '0.0';
    const total = teacherWorkloadData.reduce((acc, d) => acc + d.lessonsCount, 0);
    return (total / teacherWorkloadData.length).toFixed(1);
  }, [teacherWorkloadData]);

  const peakWorkload = useMemo(() => {
    if (teacherWorkloadData.length === 0) return 0;
    return Math.max(...teacherWorkloadData.map(d => d.lessonsCount));
  }, [teacherWorkloadData]);

  // Form states
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('Male');
  const [schoolRole, setSchoolRole] = useState<string>('Subject Teacher');
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Class Teacher Assignment States
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [classTeacherClass, setClassTeacherClass] = useState<string>('Form 1');
  const [classTeacherStream, setClassTeacherStream] = useState<string>('STREAM A');
  
  // MULTIPLE TEACHING SUBJECTS WITH STREAM ID (One after another)
  const [subjects, setSubjects] = useState<string[]>([]);
  const [allocSubject, setAllocSubject] = useState<string>('Basic Mathematics');
  const [allocClass, setAllocClass] = useState<string>('Form 1');
  const [allocStreams, setAllocStreams] = useState<string[]>(['A', 'B']);
  const [customSubjectText, setCustomSubjectText] = useState<string>('');
  const [manualSubjectStreamInput, setManualSubjectStreamInput] = useState<string>('');
  const [subjectSearch, setSubjectSearch] = useState('');

  const [excludeInvigilation, setExcludeInvigilation] = useState(false);
  const [customColor, setCustomColor] = useState(INVIGILATOR_COLORS[0].hex);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<string>('');
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  
  // Quick SMS State
  const [quickSmsTeacher, setQuickSmsTeacher] = useState<Teacher | null>(null);
  const [quickSmsMessage, setQuickSmsMessage] = useState<string>('');
  const [isSendingQuickSms, setIsSendingQuickSms] = useState<boolean>(false);
  const [quickSmsToast, setQuickSmsToast] = useState<string | null>(null);
  
  // Teaching streams allocation
  const [teachingStreams, setTeachingStreams] = useState<string[]>([]);
  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState<number>(20);

  // Complete deduplicated list of all subjects from registry, SUBJECT_LIST, streamSettings, and existing teachers
  const allAvailableSubjectsList = useMemo(() => {
    const customFromTeachers = teachers.flatMap(t => (t.subjects || []).map(cleanSubjectName));
    return Array.from(
      new Set([
        ...POPULAR_SUBJECTS,
        ...SUBJECT_LIST.map(s => s.name).filter(n => n !== 'Mikondo'),
        ...customFromTeachers
      ].filter(Boolean))
    );
  }, [teachers]);

  // Available stream IDs for selected allocation class
  const availableStreamIdsForClass = useMemo(() => {
    const found = streamSettings.find(s => s.className === allocClass);
    if (found?.streams && found.streams.length > 0) {
      return found.streams.map(st => st.replace(/^stream\s*/i, '').trim().toUpperCase());
    }
    return ['A', 'B', 'C', 'D'];
  }, [allocClass, streamSettings]);

  const formatSubjectStream = (sub: string, cName: string, strId: string) => {
    const cleanStream = strId.replace(/^stream\s*/i, '').trim().toUpperCase();
    return `${sub.trim()} ${cName}${cleanStream}`;
  };

  const handleAddSubjectOnly = () => {
    const sub = customSubjectText.trim() || allocSubject.trim();
    if (!sub) {
      alert('Tafadhali chagua au andika somo (Please select or enter a teaching subject).');
      return;
    }
    if (!subjects.includes(sub)) {
      setSubjects(prev => [...prev, sub]);
    }
    setCustomSubjectText('');
  };

  const handleRegisterSubjectStreams = () => {
    const sub = customSubjectText.trim() || allocSubject.trim();
    if (!sub) {
      alert('Please select or enter a teaching subject.');
      return;
    }
    if (allocStreams.length === 0) {
      // If no stream selected, add the subject directly
      if (!subjects.includes(sub)) {
        setSubjects(prev => [...prev, sub]);
      }
      setCustomSubjectText('');
      return;
    }

    const newEntries: string[] = [];
    allocStreams.forEach(str => {
      const formatted = formatSubjectStream(sub, allocClass, str);
      if (!subjects.includes(formatted)) {
        newEntries.push(formatted);
      }
    });

    if (newEntries.length === 0) {
      alert('All selected subject streams are already registered for this teacher.');
      return;
    }

    setSubjects(prev => [...prev, ...newEntries]);
    
    // Auto-sync teaching streams
    const streamNames = allocStreams.map(str => `${allocClass} - Stream ${str.toUpperCase()}`);
    setTeachingStreams(prev => Array.from(new Set([...prev, ...streamNames])));
    setCustomSubjectText('');
  };

  const handleToggleAllocStream = (str: string) => {
    setAllocStreams(prev => 
      prev.includes(str) ? prev.filter(s => s !== str) : [...prev, str]
    );
  };

  const handleRemoveSubjectEntry = (entry: string) => {
    setSubjects(prev => prev.filter(s => s !== entry));
  };

  const handleAddManualSubjectStream = () => {
    const trimmed = manualSubjectStreamInput.trim();
    if (!trimmed) return;
    if (subjects.includes(trimmed)) {
      alert(`"${trimmed}" is already in the registered subjects list.`);
      return;
    }
    setSubjects(prev => [...prev, trimmed]);
    setManualSubjectStreamInput('');
  };

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Timetable schedule modal state
  const [viewingTimetableTeacher, setViewingTimetableTeacher] = useState<Teacher | null>(null);

  // New timetable slot form within modal
  const [slotDay, setSlotDay] = useState('MONDAY');
  const [slotPeriod, setSlotPeriod] = useState('PERIOD 1');
  const [slotClass, setSlotClass] = useState('Form 1');
  const [slotStream, setSlotStream] = useState('STREAM A');
  const [slotSubject, setSlotSubject] = useState('');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotToast, setSlotToast] = useState<string | null>(null);

  // Compute all available class streams for selection
  const allAvailableStreams = useMemo(() => {
    const list: string[] = [];
    DEFAULT_CLASSES.forEach(cName => {
      const found = streamSettings.find(s => s.className === cName);
      const streams = found?.streams && found.streams.length > 0 ? found.streams : ['STREAM A', 'STREAM B'];
      streams.forEach(sName => {
        list.push(`${cName} - ${sName}`);
      });
    });
    return list;
  }, [streamSettings]);

  // Standard period names
  const periodsList = useMemo(() => {
    if (periodSettings.length > 0) {
      return periodSettings.map((p, idx) => p.name || `PERIOD ${idx + 1}`);
    }
    return [
      'PERIOD 1', 'PERIOD 2', 'PERIOD 3', 'PERIOD 4', 
      'PERIOD 5', 'PERIOD 6', 'PERIOD 7', 'PERIOD 8'
    ];
  }, [periodSettings]);

  // Auto-generate initials (First letter of First Name + First letter of Last Name, e.g. Juma Hassan = JH)
  const generateInitials = (fullName: string, currentTeacherId?: number): string => {
    const base = computeTeacherInitial(fullName);
    if (!base || base === 'TR') return 'TR';

    let result = base;
    let counter = 1;
    while (teachers.some(t => t.initial === result && t.id !== currentTeacherId)) {
      counter++;
      result = `${base}${counter}`;
    }
    return result;
  };

  const currentInitial = name.trim() ? generateInitials(name, editingTeacher?.id) : '--';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo file size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setPassportPhoto(compressed);
        };
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle subject selection
  const handleToggleSubject = (sub: string) => {
    setSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  // Toggle stream selection
  const handleToggleStream = (streamName: string) => {
    setTeachingStreams(prev => 
      prev.includes(streamName) ? prev.filter(s => s !== streamName) : [...prev, streamName]
    );
  };

  const [teacherFormError, setTeacherFormError] = useState<string | null>(null);
  const [duplicateTeacherModal, setDuplicateTeacherModal] = useState<{
    existingMatches: Teacher[];
    pendingTeacher: Teacher;
    isEditing: boolean;
  } | null>(null);
  const [allowDuplicateTeacherPermission, setAllowDuplicateTeacherPermission] = useState(false);

  const normalizePersonName = (val: string) =>
    String(val || '').trim().toLowerCase().replace(/^mwl\.?\s*/i, '').replace(/\s+/g, ' ');

  const matchingExistingTeachersByName = useMemo(() => {
    const targetName = normalizePersonName(name);
    if (!targetName || targetName.length < 3) return [];
    return teachers.filter(t => {
      if (editingTeacher && t.id === editingTeacher.id) return false;
      return normalizePersonName(t.name) === targetName;
    });
  }, [name, teachers, editingTeacher]);

  const resetTeacherForm = () => {
    setName('');
    setGender('Male');
    setSchoolRole('Subject Teacher');
    setIsCustomRole(false);
    setCustomRole('');
    setIsClassTeacher(false);
    setClassTeacherClass('Form 1');
    setClassTeacherStream('STREAM A');
    setSubjects([]);
    setSubjectSearch('');
    setExcludeInvigilation(false);
    setCustomColor(INVIGILATOR_COLORS[0].hex);
    setPhone('');
    setEmail('');
    setPassportPhoto('');
    setTeachingStreams([]);
    setMaxPeriodsPerWeek(20);
    setAllocSubject('Basic Mathematics');
    setAllocClass('Form 1');
    setAllocStreams(['A', 'B']);
    setCustomSubjectText('');
    setManualSubjectStreamInput('');
    setTeacherFormError(null);
  };

  const finalizeSaveTeacher = (teacherRecord: Teacher, isEditMode: boolean) => {
    if (isEditMode) {
      onUpdateTeacher(teacherRecord);
      setEditingTeacher(null);
      setIsEditTeacherModalOpen(false);
      setFormNotice(`✓ Taarifa za Mwalimu ${teacherRecord.name} zimehaririwa na kuhifadhiwa kikamilifu (${teacherRecord.subjects.join(', ')})!`);
      setTimeout(() => setFormNotice(null), 5000);
    } else {
      onAddTeacher(teacherRecord);
      setFormNotice(`✓ Mwalimu ${teacherRecord.name} (${teacherRecord.initial}) amesajiliwa kikamilifu kwenye masomo: ${teacherRecord.subjects.join(', ')}!`);
      setTimeout(() => setFormNotice(null), 4000);
    }
    setDuplicateTeacherModal(null);
    setAllowDuplicateTeacherPermission(false);
    resetTeacherForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError(null);

    if (!name.trim()) {
      setTeacherFormError('Tafadhali jaza jina kamili la mwalimu.');
      return;
    }

    const effectiveSubjectsList = subjects.length > 0
      ? subjects
      : (customSubjectText.trim() || allocSubject.trim() ? [customSubjectText.trim() || allocSubject.trim()] : []);

    if (effectiveSubjectsList.length === 0) {
      setTeacherFormError('Tafadhali chagua angalau somo moja la kufundisha.');
      return;
    }

    // Strict restriction on duplicate email
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail) {
      const existingByEmail = teachers.find(t => {
        if (editingTeacher && t.id === editingTeacher.id) return false;
        return String(t.email || '').trim().toLowerCase() === normalizedEmail;
      });
      if (existingByEmail) {
        setTeacherFormError(
          `ZUIZO LA USAJILI: Barua pepe "${email.trim()}" tayari inatumiwa na Mwl. ${existingByEmail.name}. Hairuhusiwi kusajili walimu wawili wenye barua pepe moja.`
        );
        return;
      }
    }

    const cleanedSubjects = Array.from(new Set(effectiveSubjectsList.map(cleanSubjectName).filter(Boolean)));
    const finalRole = isCustomRole ? (customRole.trim() || 'Subject Teacher') : schoolRole;
    const finalGender = gender || (finalRole.includes('Mistress') || finalRole.includes('Headmistress') ? 'Female' : 'Male');

    const classTeacherVal = isClassTeacher
      ? `${classTeacherClass} - ${classTeacherStream.replace(/^STREAM\s+/i, 'STREAM ')}`
      : undefined;

    const candidateTeacher: Teacher = editingTeacher
      ? {
          ...editingTeacher,
          name: name.trim(),
          initial: generateInitials(name.trim(), editingTeacher.id),
          gender: finalGender,
          schoolRole: finalRole,
          subjects: cleanedSubjects,
          excludeInvigilation,
          color: customColor,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          passportPhoto: passportPhoto || undefined,
          teachingStreams,
          maxPeriodsPerWeek,
          isClassTeacher,
          classTeacherOf: classTeacherVal
        }
      : {
          id: Date.now(),
          name: name.trim(),
          initial: currentInitial,
          gender: finalGender,
          schoolRole: finalRole,
          subjects: cleanedSubjects,
          excludeInvigilation,
          color: customColor,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          passportPhoto: passportPhoto || undefined,
          teachingStreams,
          maxPeriodsPerWeek,
          isClassTeacher,
          classTeacherOf: classTeacherVal
        };

    // Check for duplicate teacher name and require explicit permission override
    const normalizedTargetName = normalizePersonName(name);
    const sameNameMatches = teachers.filter(t => {
      if (editingTeacher && t.id === editingTeacher.id) return false;
      return normalizePersonName(t.name) === normalizedTargetName;
    });

    if (sameNameMatches.length > 0) {
      setAllowDuplicateTeacherPermission(false);
      setDuplicateTeacherModal({
        existingMatches: sameNameMatches,
        pendingTeacher: candidateTeacher,
        isEditing: Boolean(editingTeacher)
      });
      return;
    }

    finalizeSaveTeacher(candidateTeacher, Boolean(editingTeacher));
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name || '');
    setGender(teacher.gender || (teacher.schoolRole?.includes('Mistress') || teacher.schoolRole?.includes('Headmistress') ? 'Female' : 'Male'));
    
    if (teacher.schoolRole && STAFF_ROLES_LIST.includes(teacher.schoolRole)) {
      setSchoolRole(teacher.schoolRole);
      setIsCustomRole(false);
      setCustomRole('');
    } else if (teacher.schoolRole) {
      setIsCustomRole(true);
      setCustomRole(teacher.schoolRole);
    } else {
      setSchoolRole('Subject Teacher');
      setIsCustomRole(false);
    }

    const parsedCT = parseClassTeacherOf(teacher.classTeacherOf);
    if (parsedCT || teacher.isClassTeacher || teacher.schoolRole === 'Class Teacher / Master') {
      setIsClassTeacher(true);
      setClassTeacherClass(parsedCT?.className || 'Form 1');
      const rawStr = parsedCT?.stream ? (parsedCT.stream.toUpperCase().startsWith('STREAM') ? parsedCT.stream.toUpperCase() : `STREAM ${parsedCT.stream.toUpperCase()}`) : 'STREAM A';
      setClassTeacherStream(rawStr);
    } else {
      setIsClassTeacher(false);
      setClassTeacherClass('Form 1');
      setClassTeacherStream('STREAM A');
    }

    setSubjects(teacher.subjects && teacher.subjects.length > 0 ? [...teacher.subjects] : []);
    if (teacher.subjects && teacher.subjects.length > 0) {
      setAllocSubject(cleanSubjectName(teacher.subjects[0]));
    }
    setExcludeInvigilation(Boolean(teacher.excludeInvigilation));
    setCustomColor(teacher.color || INVIGILATOR_COLORS[0].hex);
    setPhone(teacher.phone || '');
    setEmail(teacher.email || '');
    setPassportPhoto(teacher.passportPhoto || '');
    setTeachingStreams(Array.isArray(teacher.teachingStreams) ? [...teacher.teachingStreams] : []);
    setMaxPeriodsPerWeek(teacher.maxPeriodsPerWeek || 20);
    setSubjectSearch('');
    setCustomSubjectText('');
    setManualSubjectStreamInput('');
    setIsEditTeacherModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingTeacher(null);
    setIsEditTeacherModalOpen(false);
    setName('');
    setGender('Male');
    setSchoolRole('Subject Teacher');
    setIsCustomRole(false);
    setCustomRole('');
    setIsClassTeacher(false);
    setClassTeacherClass('Form 1');
    setClassTeacherStream('STREAM A');
    setSubjects([]);
    setSubjectSearch('');
    setExcludeInvigilation(false);
    setCustomColor(INVIGILATOR_COLORS[0].hex);
    setPhone('');
    setEmail('');
    setPassportPhoto('');
    setTeachingStreams([]);
    setMaxPeriodsPerWeek(20);
    setAllocSubject('Basic Mathematics');
    setAllocClass('Form 1');
    setAllocStreams(['A', 'B']);
    setCustomSubjectText('');
    setManualSubjectStreamInput('');
  };

  // Gender summary for teachers (Requirement 5)
  const teacherGenderStats = useMemo(() => {
    let male = 0;
    let female = 0;
    teachers.forEach(t => {
      const g = (t.gender || '').toLowerCase();
      if (g.startsWith('f') || g.includes('female') || (t.schoolRole && (t.schoolRole.includes('Mistress') || t.schoolRole.includes('Headmistress')))) {
        female++;
      } else {
        male++;
      }
    });
    return {
      male,
      female,
      total: teachers.length
    };
  }, [teachers]);

  // Filter teachers by search and role
  const filteredTeachers = effectiveTeachers.filter(t => {
    const q = searchFilter.toLowerCase();
    const matchesSearch = !q || 
      t.name.toLowerCase().includes(q) || 
      (t.schoolRole && t.schoolRole.toLowerCase().includes(q)) ||
      (t.subjects && t.subjects.some(s => s.toLowerCase().includes(q)));
    
    if (!matchesSearch) return false;

    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'ACADEMIC') {
      return t.schoolRole?.includes('Academic') || t.schoolRole?.includes('Examination');
    }
    if (roleFilter === 'DISCIPLINE') {
      return t.schoolRole?.includes('Discipline');
    }
    if (roleFilter === 'LEADERSHIP') {
      return t.schoolRole?.includes('Headmaster') || t.schoolRole?.includes('Second Master') || t.schoolRole?.includes('Deputy');
    }
    if (roleFilter === 'HOD') {
      return t.schoolRole?.includes('Head of Department');
    }
    return true;
  });

  const isAllFilteredSelected = filteredTeachers.length > 0 && filteredTeachers.every(t => selectedTeacherIds.includes(t.id));

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredSet = new Set(filteredTeachers.map(t => t.id));
      setSelectedTeacherIds(prev => prev.filter(id => !filteredSet.has(id)));
    } else {
      const filteredIds = filteredTeachers.map(t => t.id);
      setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectTeacher = (id: number) => {
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkInvigilationToggle = (enable: boolean) => {
    if (selectedTeacherIds.length === 0) return;
    const updatedList: Teacher[] = [];
    teachers.forEach(t => {
      if (selectedTeacherIds.includes(t.id)) {
        const updatedTeacher = { ...t, excludeInvigilation: !enable };
        updatedList.push(updatedTeacher);
        onUpdateTeacher(updatedTeacher);
      }
    });

    if (onBulkUpdateTeachers && updatedList.length > 0) {
      onBulkUpdateTeachers(updatedList);
    }

    setFormNotice(
      `✓ Taarifa zimebadilishwa: Walimu ${selectedTeacherIds.length} sasa ${
        enable ? 'WANASIMAMIA mitihani (Enabled Invigilation)' : 'HAWASIMAMII mitihani (Disabled Invigilation)'
      }!`
    );
    setTimeout(() => setFormNotice(null), 5000);
    setSelectedTeacherIds([]);
  };

  const handleBulkDeleteTeachersClick = () => {
    if (selectedTeacherIds.length === 0) return;
    openConfirmDelete(
      "Thibitisha Ufutaji Wa Walimu",
      `Je, una uhakika unataka kufuta walimu ${selectedTeacherIds.length} waliochaguliwa? Hatua hii haiwezi kutenduliwa.`,
      () => {
        if (onBulkDeleteTeachers) {
          onBulkDeleteTeachers(selectedTeacherIds);
        } else {
          selectedTeacherIds.forEach(id => onDeleteTeacher(id));
        }
        setSelectedTeacherIds([]);
      }
    );
  };

  const getRoleBadgeStyle = (role?: string) => {
    if (!role) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (role.includes('Headmaster') || role.includes('Deputy')) {
      return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    }
    if (role.includes('Academic') || role.includes('Examination')) {
      return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
    }
    if (role.includes('Discipline')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    }
    if (role.includes('Head of Department')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Export Faculty Roster to CSV
  const handleExportTeachersCSV = () => {
    if (!filteredTeachers || filteredTeachers.length === 0) {
      alert('Hakuna walimu katika orodha iliyochaguliwa.');
      return;
    }

    const headers = ['#', 'Full Name', 'Gender', 'School Role', 'Class Teacher Of', 'Initial', 'Teaching Subjects', 'Teaching Streams', 'Phone', 'Email', 'Invigilation Status'];
    const rows = filteredTeachers.map((t, idx) => [
      idx + 1,
      `"${t.name || ''}"`,
      t.gender || 'Male',
      `"${t.schoolRole || 'Subject Teacher'}"`,
      `"${formatClassTeacherString(t.classTeacherOf) || (t.isClassTeacher ? 'Yes' : 'No')}"`,
      t.initial || '',
      `"${(t.subjects || []).join(', ')}"`,
      `"${(t.teachingStreams || []).join(', ')}"`,
      `"${t.phone || ''}"`,
      `"${t.email || ''}"`,
      t.excludeInvigilation ? 'Disabled' : 'Active'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Orodha_ya_Walimu_${(schoolInfo?.name || 'Faculty').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Faculty Roster to Vector PDF using jsPDF
  const handleExportTeachersPDF = () => {
    if (!filteredTeachers || filteredTeachers.length === 0) {
      alert('Hakuna walimu katika orodha ya kuchapisha.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const innerW = pageW - margin * 2;

    // Header Letterhead
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text((schoolInfo?.name || 'HABYEDUPRO ACADEMIC FACULTY').toUpperCase(), pageW / 2, margin + 8, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`CENTER NO: ${schoolInfo?.schoolNumber || 'S.0123'}  |  ${schoolInfo?.address || 'P.O. Box Tanzania'}  |  TEL: ${schoolInfo?.phone || '+255'}`, pageW / 2, margin + 14, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('OFFICIAL FACULTY ROSTER & TEACHING STAFF ALLOCATION REPORT', pageW / 2, margin + 21, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(margin, margin + 24, pageW - margin, margin + 24);

    // Summary Line
    const femaleCount = filteredTeachers.filter(t => t.gender?.toLowerCase().startsWith('f')).length;
    const maleCount = filteredTeachers.length - femaleCount;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumla ya Walimu (Total Staff): ${filteredTeachers.length}  |  Walimu Wanawake (Female/KE): ${femaleCount}  |  Walimu Wanaume (Male/ME): ${maleCount}  |  Tarehe: ${new Date().toLocaleDateString('sw-TZ')}`, margin, margin + 30);

    // Table Header
    let y = margin + 35;
    const colWidths = [10, 50, 20, 42, 14, 65, 42, 34];
    const colTitles = ['#', 'Jina Kamili la Mwalimu', 'Jinsia', 'Cheo / Role', 'Init.', 'Masomo Anayofundisha', 'Mikondo', 'Simu / Contact'];

    doc.setFillColor(31, 77, 139);
    doc.rect(margin, y, innerW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    
    let curX = margin + 2;
    colTitles.forEach((t, i) => {
      doc.text(t, curX, y + 5);
      curX += colWidths[i];
    });

    y += 7;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filteredTeachers.forEach((t, idx) => {
      if (y > pageH - 25) {
        doc.addPage();
        y = margin + 10;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, y, innerW, 6.5, 'F');
      }

      let x = margin + 2;
      doc.text(String(idx + 1), x, y + 4.5); x += colWidths[0];
      doc.text((t.name || '').slice(0, 28), x, y + 4.5); x += colWidths[1];
      doc.text(t.gender?.toLowerCase().startsWith('f') ? 'Female (KE)' : 'Male (ME)', x, y + 4.5); x += colWidths[2];
      doc.text((t.schoolRole || 'Subject Teacher').slice(0, 24), x, y + 4.5); x += colWidths[3];
      doc.text(t.initial || 'TR', x, y + 4.5); x += colWidths[4];
      doc.text((t.subjects || []).join(', ').slice(0, 42), x, y + 4.5); x += colWidths[5];
      doc.text((t.teachingStreams || []).join(', ').slice(0, 28) || 'All Streams', x, y + 4.5); x += colWidths[6];
      doc.text(t.phone || t.email || '-', x, y + 4.5);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, pageW - margin, y + 6.5);
      y += 6.5;
    });

    // Verification Box
    y += 6;
    if (y < pageH - 25) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('UTHIBITISHO WA ANWANI YA TAALUMA (ACADEMIC VERIFICATION)', margin, y);
      y += 4;
      doc.rect(margin, y, 120, 15);
      doc.text('Mkuu wa Shule / Headmaster Signature & Stamp:', margin + 2, y + 4);
      doc.text('Tarehe: ____ / ____ / 20___', margin + 2, y + 11);

      doc.rect(margin + 130, y, 130, 15);
      doc.text('Mwalimu Mkuu wa Taaluma (Academic Master) Signature:', margin + 132, y + 4);
      doc.text('Tarehe: ____ / ____ / 20___', margin + 132, y + 11);
    }

    doc.save(`Orodha_ya_Walimu_${(schoolInfo?.name || 'Faculty').replace(/\s+/g, '_')}.pdf`);
  };

  // Direct Print Handler
  const handlePrintTeachersRoster = () => {
    handleExportTeachersPDF();
  };

  // Filter subjects for the multi-select search
  const searchedSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return allAvailableSubjectsList;
    const q = subjectSearch.toLowerCase();
    return allAvailableSubjectsList.filter(s => s.toLowerCase().includes(q));
  }, [subjectSearch, allAvailableSubjectsList]);

  // Timetable slots for viewing teacher
  const viewingTeacherSlots = useMemo(() => {
    if (!viewingTimetableTeacher) return [];
    const tName = (viewingTimetableTeacher.name || '').trim().toLowerCase();
    const tInit = (viewingTimetableTeacher.initial || '').trim().toLowerCase();

    return (timetableAssignments || []).filter(a => {
      if (!a || !a.subject) return false;
      const matchId = a.teacherId !== undefined && Number(a.teacherId) === Number(viewingTimetableTeacher.id);
      const aTeacher = (('teacher' in a ? (a as any).teacher : (a as any).teacherName) || '').trim().toLowerCase();
      return matchId || (tName && aTeacher === tName) || (tInit && aTeacher === tInit);
    });
  }, [viewingTimetableTeacher, timetableAssignments]);

  // Matrix: day -> period -> assignment
  const viewingScheduleMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, TimetableAssignment | undefined>> = {};
    WEEKDAYS.forEach(day => {
      matrix[day] = {};
      periodsList.forEach(p => {
        const found = viewingTeacherSlots.find(s => 
          s &&
          (s.day || '').trim().toUpperCase() === day &&
          isSamePeriod(s.period, s.periodName, p)
        );
        matrix[day][p] = found;
      });
    });
    return matrix;
  }, [viewingTeacherSlots, periodsList]);

  // Handle adding a timetable slot for the teacher
  const handleAddTimetableSlot = () => {
    if (!viewingTimetableTeacher || !onUpdateTimetableAssignments) return;
    const tSubjects = (viewingTimetableTeacher.subjects || []).filter(Boolean);
    if (tSubjects.length === 0) {
      alert('Mwalimu huyu hajasajiliwa somo lolote. Tafadhali msajilie masomo kwanza.');
      return;
    }
    const subjectToAssign = tSubjects.length === 1 ? tSubjects[0] : (tSubjects.includes(slotSubject) ? slotSubject : '');

    if (!subjectToAssign) {
      alert('Mwalimu huyu ana masomo zaidi ya moja. Tafadhali chagua somo alilosajiliwa (Please select a registered subject).');
      return;
    }

    const formattedDay = slotDay.charAt(0).toUpperCase() + slotDay.slice(1).toLowerCase();

    const newSlot: TimetableAssignment = {
      id: Date.now(),
      day: formattedDay as any,
      period: slotPeriod,
      periodName: slotPeriod.split(' (')[0].trim(),
      teacherId: viewingTimetableTeacher.id,
      subject: subjectToAssign,
      className: slotClass,
      stream: slotStream,
      room: slotRoom.trim() || undefined,
      activityType: 'academic'
    };
    (newSlot as any).teacher = viewingTimetableTeacher.name;

    // Filter out existing slot in same day & period if exists
    const updated = [
      ...(timetableAssignments || []).filter(a => 
        !(a &&
          (a.day || '').trim().toUpperCase() === slotDay.toUpperCase() && 
          isSamePeriod(a.period, a.periodName, slotPeriod) &&
          isSameClass(a.className, slotClass) &&
          isSameStream(a.stream, slotStream))
      ),
      newSlot
    ];

    onUpdateTimetableAssignments(updated);
    setSlotToast(`Assigned ${subjectToAssign} for ${slotClass} (${slotStream}) on ${formattedDay} ${slotPeriod}`);
    setTimeout(() => setSlotToast(null), 3000);
  };

  const handleRemoveTimetableSlot = (slotId: number | string) => {
    if (!onUpdateTimetableAssignments) return;
    const updated = (timetableAssignments || []).filter(a => a && String(a.id) !== String(slotId));
    onUpdateTimetableAssignments(updated);
  };

  if (registeringBiometricId) {
    const selectedBioTeacher =
      teachers.find(t => String(t.id) === String(registeringBiometricId) || String(t.firestoreDocId || '') === String(registeringBiometricId)) ||
      effectiveTeachers.find(t => String(t.id) === String(registeringBiometricId)) ||
      null;
    return (
      <BiometricRegistration 
        teacherId={registeringBiometricId}
        teacher={selectedBioTeacher}
        schoolId={currentUser?.schoolId}
        onUpdateTeacher={onUpdateTeacher}
        onBack={() => setRegisteringBiometricId(null)}
        onSuccess={() => setRegisteringBiometricId(null)}
      />
    );
  }

  return (

    <div className="space-y-6">
      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'roster'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Faculty Roster &amp; Staff Registration</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'roster' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
            }`}>
              {teachers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('workload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'workload'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Workload Analytics &amp; Overwork Monitor</span>
            {overworkedTeachers.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {overworkedTeachers.length} Overworked
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                Balanced
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('evaluations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'evaluations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Academic Teaching Evaluations</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSubTab === 'evaluations' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {teacherEvaluations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('profile_dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'profile_dashboard'
                ? 'bg-gradient-to-r from-indigo-900 to-blue-800 text-white shadow-xs ring-2 ring-amber-400'
                : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>👤 Teacher Profile Dashboard (Lessons, Invigilation &amp; Journal)</span>
          </button>
        </div>

        {activeSubTab === 'roster' && (
          <span className="text-xs text-slate-500 font-medium">
            Standard: <strong>40 minutes</strong> per teaching period
          </span>
        )}
      </div>

      {/* SPECIALIZED TEACHER PROFILE DASHBOARD SUB-TAB */}
      {activeSubTab === 'profile_dashboard' && (
        <TeacherProfileDashboard
          teachers={teachers}
          timetableAssignments={timetableAssignments}
          periodSettings={periodSettings}
          sessions={sessions}
          invigilationAssignments={invigilationAssignments}
          supervisors={supervisors}
          journalRecords={journalRecords}
          onUpdateJournal={onUpdateJournal}
          streamSettings={streamSettings}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          initialTeacherId={profileDashboardTeacherId}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* RECHARTS VISUAL SUMMARY WIDGET FOR ACADEMIC MASTER WORKLOAD MONITOR */}
      {/* ------------------------------------------------------------------ */}
      {(activeSubTab === 'workload' || activeSubTab === 'roster') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Section Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3 h-3 text-blue-600" />
                  Academic Analytics
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Visual Recharts Summary
                </span>
              </div>
              <h3 className="text-base font-extrabold text-[#1f4d8b] flex items-center gap-2">
                <span>Teacher Workload Distribution (Lessons / Week)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Helps the Academic Master easily spot overworked teaching staff, manage period allocations, and balance teaching quotas.
              </p>
            </div>

            {/* Quick Chart Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Threshold Selector */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-xl">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-600">Max Limit:</span>
                <select
                  value={workloadThreshold}
                  onChange={e => setWorkloadThreshold(Number(e.target.value))}
                  className="bg-transparent font-black text-slate-800 outline-none cursor-pointer"
                >
                  <option value={16}>16 periods/wk</option>
                  <option value={18}>18 periods/wk</option>
                  <option value={20}>20 periods/wk (Default)</option>
                  <option value={22}>22 periods/wk</option>
                  <option value={24}>24 periods/wk</option>
                  <option value={28}>28 periods/wk</option>
                </select>
              </div>

              {/* Filter */}
              <select
                value={workloadFilter}
                onChange={e => setWorkloadFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Staff ({teacherWorkloadData.length})</option>
                <option value="OVERWORKED">Overworked Only ({overworkedTeachers.length})</option>
                <option value="TOP10">Top 10 Most Loaded</option>
              </select>

              {/* Sort */}
              <select
                value={workloadSort}
                onChange={e => setWorkloadSort(e.target.value as any)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="DESC">Sort: Highest Workload First</option>
                <option value="ASC">Sort: Lowest Workload First</option>
                <option value="ALPHA">Sort: Alphabetical</option>
              </select>

              {/* Collapse/Expand toggle */}
              <button
                type="button"
                onClick={() => setIsWorkloadChartExpanded(!isWorkloadChartExpanded)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                title={isWorkloadChartExpanded ? "Collapse Analytics Chart" : "Expand Analytics Chart"}
              >
                {isWorkloadChartExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide Chart</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show Chart</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isWorkloadChartExpanded && (
            <>
              {/* Summary KPIs Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Teaching Faculty
                  </span>
                  <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{teacherWorkloadData.length} Staff</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Average Workload
                  </span>
                  <div className="text-lg font-black text-indigo-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>{avgWorkload} <span className="text-xs font-semibold text-slate-500">periods/wk</span></span>
                  </div>
                </div>

                <div className={`border p-3 rounded-xl space-y-1 ${
                  overworkedTeachers.length > 0 
                    ? 'bg-rose-50 border-rose-300 text-rose-900' 
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    Overworked Alert Status
                  </span>
                  <div className="text-lg font-black flex items-center gap-1.5">
                    {overworkedTeachers.length > 0 ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                        <span>{overworkedTeachers.length} Overworked Staff</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>All Within Quotas</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Peak Individual Workload
                  </span>
                  <div className="text-lg font-black text-amber-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>{peakWorkload} <span className="text-xs font-semibold text-slate-500">periods/wk</span></span>
                  </div>
                </div>
              </div>

              {/* Overworked Staff Academic Master Action Alert Box */}
              {overworkedTeachers.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-500 text-white rounded-lg shadow-2xs">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                          Academic Master Action Required ({overworkedTeachers.length} Staff Over-threshold)
                        </h4>
                        <p className="text-[11px] text-rose-800 font-medium">
                          The staff members below exceed the maximum warning limit of <strong>{workloadThreshold} periods/week</strong>.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-[10px] font-extrabold self-start sm:self-auto">
                      High Workload Alert
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {overworkedTeachers.map(t => (
                      <div key={t.id} className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{t.name}</span>
                          <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-2xs">
                            {t.lessonsCount} periods (+{t.diff} Over)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">{t.role}</p>
                        {underallocatedTeachers.length > 0 && (
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-700 space-y-0.5">
                            <span className="font-bold text-indigo-700 block">Academic Master Recommendation:</span>
                            <span>
                              Consider reassigning {t.diff} period(s) to lighter-load staff like <strong>{underallocatedTeachers[0].name}</strong> ({underallocatedTeachers[0].lessonsCount} periods).
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Recharts Bar Chart Container */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
                  <div className="flex items-center gap-4 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-rose-600 inline-block" /> Overworked (&gt;{workloadThreshold})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Max Limit (={workloadThreshold})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Optimal (12-{workloadThreshold - 1})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> Light Load (&lt;12)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Interactive Recharts Module</span>
                </div>

                <div className="w-full h-80 pt-4">
                  {processedChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      No teacher workload records match the selected filter.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedChartData} margin={{ top: 20, right: 30, left: 0, bottom: 35 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="shortName" 
                          tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                          allowDecimals={false}
                          domain={[0, (dataMax: number) => Math.max(dataMax + 4, workloadThreshold + 4)]}
                        />
                        <Tooltip 
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const diff = data.lessonsCount - workloadThreshold;
                              return (
                                <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 border border-slate-700 max-w-xs z-50">
                                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                                    <div>
                                      <span className="font-black text-sm text-white block">{data.name}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">{data.role}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      data.isOverworked 
                                        ? 'bg-rose-500 text-white shadow-xs' 
                                        : data.lessonsCount === workloadThreshold 
                                        ? 'bg-amber-500 text-slate-950' 
                                        : data.lessonsCount >= 12 
                                        ? 'bg-emerald-500 text-slate-950' 
                                        : 'bg-indigo-500 text-white'
                                    }`}>
                                      {data.isOverworked ? `Overworked (+${diff})` : data.lessonsCount === workloadThreshold ? 'Max Capacity' : data.lessonsCount >= 12 ? 'Optimal' : 'Light Load'}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-slate-300">
                                    <div className="flex items-baseline justify-between text-xs">
                                      <span className="text-slate-400 font-medium">Assigned Lessons:</span>
                                      <span className="font-mono font-bold text-amber-300 text-sm">{data.lessonsCount} periods/wk</span>
                                    </div>
                                    <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                                      <span className="text-slate-400">Warning Limit:</span>
                                      <span className="font-mono text-slate-300">{workloadThreshold} periods/wk</span>
                                    </div>
                                  </div>
                                  {data.subjects && data.subjects.length > 0 && (
                                    <div className="pt-2 border-t border-slate-800 text-[10px]">
                                      <span className="text-slate-400 block font-bold mb-1 uppercase tracking-wider">Teaching Subjects:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {data.subjects.map((s: string, idx: number) => (
                                          <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded-md font-mono text-[9px]">
                                            {s}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine 
                          y={workloadThreshold} 
                          stroke="#ef4444" 
                          strokeDasharray="4 4" 
                          strokeWidth={2}
                          label={{ 
                            value: `Overwork Warning Threshold (${workloadThreshold} Periods/Wk)`, 
                            fill: '#dc2626', 
                            fontSize: 11, 
                            fontWeight: 800,
                            position: 'top'
                          }} 
                        />
                        <Bar dataKey="lessonsCount" radius={[6, 6, 0, 0]} maxBarSize={45}>
                          {processedChartData.map((entry) => {
                            let fill = '#10b981';
                            if (entry.lessonsCount > workloadThreshold) {
                              fill = '#dc2626';
                            } else if (entry.lessonsCount === workloadThreshold) {
                              fill = '#f59e0b';
                            } else if (entry.lessonsCount < 12) {
                              fill = '#6366f1';
                            }
                            return <Cell key={`cell-${entry.id}`} fill={fill} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'evaluations' ? (
        <TeacherEvaluationView
          teachers={teachers}
          evaluations={teacherEvaluations}
          onSaveEvaluation={onSaveEvaluation || (() => {})}
          onDeleteEvaluation={onDeleteEvaluation || (() => {})}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          streamSettings={streamSettings}
        />
      ) : (
        <>
          {/* Top Summary Cards (Requirement 5: Teacher Summary) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Faculty */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Total Teaching Faculty
                </span>
                <span className="font-black text-slate-900 text-sm">{teacherGenderStats.total}</span>
              </div>
              <div>
                <GenderSummary
                  B={teacherGenderStats.male}
                  G={teacherGenderStats.female}
                  T={teacherGenderStats.total}
                  total={teachers.length}
                  size="xs"
                />
              </div>
            </div>

            {/* Male Teachers */}
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Male Teachers
                </span>
                <span className="font-black text-blue-950 text-sm">{teacherGenderStats.male}</span>
              </div>
              <div>
                <GenderSummary
                  B={teacherGenderStats.male}
                  G={0}
                  T={teacherGenderStats.male}
                  total={teachers.length}
                  size="xs"
                />
              </div>
            </div>

            {/* Female Teachers */}
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Female Teachers
                </span>
                <span className="font-black text-rose-950 text-sm">{teacherGenderStats.female}</span>
              </div>
              <div>
                <GenderSummary
                  B={0}
                  G={teacherGenderStats.female}
                  T={teacherGenderStats.female}
                  total={teachers.length}
                  size="xs"
                />
              </div>
            </div>
          </div>

          {/* Registration / Edit Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            {formNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold text-xs flex items-center justify-between shadow-xs animate-in fade-in">
                <span>{formNotice}</span>
                <button
                  type="button"
                  onClick={() => setFormNotice(null)}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  {editingTeacher ? `Edit Faculty Record: ${editingTeacher.name}` : 'Staff & Faculty Registration'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Register teachers with multiple teaching subjects, class stream allocations, weekly timetable quotas, and administrative roles.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!editingTeacher && (
                  <button
                    type="button"
                    onClick={() => setIsMultipleTeacherModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <Users className="w-4 h-4" />
                    <span>Multiple Registration of Teachers (Grid & CSV)</span>
                  </button>
                )}
                {editingTeacher && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Passport Photo Upload Column */}
                <div className="lg:col-span-1 flex flex-col items-center justify-start p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    Passport Size Photo
                  </label>

                  <div className="relative w-28 h-36 bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-xs group hover:border-blue-400 transition-colors">
                    {passportPhoto ? (
                      <>
                        <img
                          src={passportPhoto}
                          alt="Teacher Passport"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setPassportPhoto('')}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm"
                          title="Remove Photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center p-2 cursor-pointer text-slate-400 hover:text-blue-600">
                        <User className="w-10 h-10 mb-1 stroke-1" />
                        <span className="text-[10px] font-bold text-slate-500">Upload Photo</span>
                        <span className="text-[8px] text-slate-400 mt-0.5">3.5 × 4.5 cm (Passport)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    <label className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      Select Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCameraCaptureOpen(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-blue-600" />
                      Take Photo
                    </button>
                    {passportPhoto && (
                      <button
                        type="button"
                        onClick={() => setPassportPhoto('')}
                        className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Recommended 350×450px. Appears on printed faculty rosters and IDs.
                  </p>
                </div>

                {/* Inputs Column */}
                <div className="lg:col-span-3 space-y-5">
                  {teacherFormError && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs font-bold flex-1">{teacherFormError}</div>
                      <button
                        type="button"
                        onClick={() => setTeacherFormError(null)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Teacher Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Adelmarcy Mallya"
                        value={name}
                        onChange={e => {
                          setName(e.target.value);
                          if (teacherFormError) setTeacherFormError(null);
                        }}
                        className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 bg-white ${
                          matchingExistingTeachersByName.length > 0
                            ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/30'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                        required
                      />
                      {matchingExistingTeachersByName.length > 0 && (
                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black">Tahadhari ya Kujirudia Jina:</span> Mwalimu mwenye jina{' '}
                            <strong>"{name.trim()}"</strong> tayari yupo (
                            {matchingExistingTeachersByName.map(m => `${m.name} - ${m.schoolRole || 'Teacher'}`).join(', ')}
                            ). Ukibonyeza kusajili utahitajika kutoa ruhusa maalum kama ni walimu wawili tofauti.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Teacher Gender */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Teacher Gender *</label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value as 'Male' | 'Female')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="Male">Male (B)</option>
                        <option value="Female">Female (G)</option>
                      </select>
                    </div>

                    {/* School Administrative / Faculty Role */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase block mb-1 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        School Staff Role *
                      </label>
                      {!isCustomRole ? (
                        <select
                          value={schoolRole}
                          onChange={e => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomRole(true);
                              setCustomRole('');
                            } else {
                              setSchoolRole(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                          <optgroup label="Academic & Discipline Leadership">
                            <option value="Academic Master">Academic Master</option>
                            <option value="Academic Mistress">Academic Mistress</option>
                            <option value="Discipline Master">Discipline Master</option>
                            <option value="Discipline Mistress">Discipline Mistress</option>
                            <option value="Examination Officer">Examination Officer</option>
                          </optgroup>
                          <optgroup label="School Executive Administration">
                            <option value="Headmaster">Headmaster</option>
                            <option value="Headmistress">Headmistress</option>
                            <option value="Second Master">Second Master</option>
                            <option value="Deputy Headmaster">Deputy Headmaster</option>
                          </optgroup>
                          <optgroup label="Heads of Department (HOD)">
                            <option value="Head of Department (HOD) - Science">Head of Department (HOD) - Science</option>
                            <option value="Head of Department (HOD) - Mathematics">Head of Department (HOD) - Mathematics</option>
                            <option value="Head of Department (HOD) - Languages">Head of Department (HOD) - Languages</option>
                            <option value="Head of Department (HOD) - Arts & Social Studies">Head of Department (HOD) - Arts & Social Studies</option>
                            <option value="Head of Department (HOD) - Business & ICT">Head of Department (HOD) - Business & ICT</option>
                          </optgroup>
                          <optgroup label="Student Welfare & Special Roles">
                            <option value="Class Teacher / Master">Class Teacher / Master</option>
                            <option value="Sports & Games Master">Sports & Games Master</option>
                            <option value="Health, Sanitation & Environment Master">Health & Environmental Master</option>
                            <option value="Guidance & Counseling Master">Guidance & Counseling Master</option>
                            <option value="Patron / Matron (Boarding)">Patron / Matron (Boarding)</option>
                            <option value="Subject Teacher">Subject Teacher (Standard)</option>
                          </optgroup>
                          <option value="CUSTOM">+ Specify Other Custom Role...</option>
                        </select>
                      ) : (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. Lab Technician"
                            value={customRole}
                            onChange={e => setCustomRole(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomRole(false);
                              setSchoolRole('Subject Teacher');
                            }}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded border"
                            title="Back to list"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Class Teacher Assignment Card */}
                    <div className="sm:col-span-2 md:col-span-3 bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isClassTeacher}
                            onChange={e => setIsClassTeacher(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-emerald-600" />
                            Mteue Mwalimu Huyu Kuwa Mwalimu wa Darasa (Assign as Class Teacher)
                          </span>
                        </label>
                        {isClassTeacher && (
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-xs">
                            Mwalimu wa Darasa
                          </span>
                        )}
                      </div>

                      {isClassTeacher && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200 animate-in fade-in">
                          <div>
                            <label className="block text-[11px] font-extrabold text-emerald-950 uppercase mb-1">
                              1. Chagua Darasa (Class):
                            </label>
                            <select
                              value={classTeacherClass}
                              onChange={e => setClassTeacherClass(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-black bg-white text-slate-900 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                              {DEFAULT_CLASSES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold text-emerald-950 uppercase mb-1">
                              2. Chagua Mkondo (Stream):
                            </label>
                            <select
                              value={classTeacherStream}
                              onChange={e => setClassTeacherStream(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-black bg-white text-slate-900 border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                              {['STREAM A', 'STREAM B', 'STREAM C', 'STREAM D', 'STREAM E'].map(str => (
                                <option key={str} value={str}>{str}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 text-[11px] text-emerald-950 font-bold bg-white/90 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                            <span>
                              Mwalimu <strong>{name || 'huyu'}</strong> atasimamia <strong>{classTeacherClass} - {classTeacherStream}</strong>.
                              Ataweza kuita majina (Roll Call) na kutoa Ripoti za Maendeleo za darasa hili pekee!
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Weekly Period Quota</label>
                      <input
                        type="number"
                        min="1"
                        max="45"
                        value={maxPeriodsPerWeek}
                        onChange={e => setMaxPeriodsPerWeek(Number(e.target.value) || 20)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        placeholder="e.g. 20 periods"
                      />
                    </div>

                    <div>
                      <PhoneInputPlugin
                        value={phone}
                        onChange={setPhone}
                        label="Phone Number (Optional)"
                        studentName={name}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Email Address (Optional)</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          placeholder="teacher@school.ac.tz"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Invigilation Availability</label>
                      <select
                        value={excludeInvigilation ? 'yes' : 'no'}
                        onChange={e => setExcludeInvigilation(e.target.value === 'yes')}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                      >
                        <option value="no">Available for Invigilation</option>
                        <option value="yes">Excluded from Invigilation</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Color Identity</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={e => setCustomColor(e.target.value)}
                          className="w-10 h-9 rounded-lg border border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs text-slate-600">Distinct Invigilator Color</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Initial Preview</label>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: customColor, color: '#ffffff' }}
                          className="w-9 h-9 rounded-full inline-flex items-center justify-center font-bold text-sm shadow-xs"
                        >
                          {currentInitial}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Auto-assigned</span>
                      </div>
                    </div>
                  </div>

                  {/* SUBJECT REGISTRATION WITH STREAM ID OR DIRECT SELECTION (ALL SUBJECTS INCLUDED) */}
                  <div className="p-5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border-2 border-blue-200 rounded-2xl space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-700" />
                          <h4 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                            Chagua Masomo ya Mwalimu / Subject Registration ({subjects.length} Selected)
                          </h4>
                        </div>
                        <p className="text-xs text-blue-800/80 mt-0.5 font-medium">
                          Chagua somo lolote (mfano: <strong>Elimu ya Dini ya Kiislamu</strong>, <strong>Fine Art</strong>, <strong>Bible Knowledge</strong>, <strong>Arabic</strong>, <strong>Physics</strong>, n.k.) moja kwa moja au pamoja na darasa/mkondo.
                        </p>
                      </div>
                      <div className="text-[11px] font-bold px-2.5 py-1 bg-blue-100 text-blue-900 rounded-full border border-blue-300">
                        All NECTA &amp; School Subjects ({allAvailableSubjectsList.length})
                      </div>
                    </div>

                    {/* QUICK DIRECT MULTI-SELECT PILLS FOR ALL SUBJECTS WITH LIVE SEARCH */}
                    <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-3 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">
                            A. Bonyeza Kuchagua Somo Moja kwa Moja (1-Click Select Any Subject)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Bonyeza somo lolote hapa chini kuliongeza au kuliondoa kwa mwalimu huyu:
                          </span>
                        </div>
                        <div className="relative w-full sm:w-72">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Tafuta somo (mf. Kiislamu, Fine Art, Arabic...)"
                            value={subjectSearch}
                            onChange={e => setSubjectSearch(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                          />
                          {subjectSearch && (
                            <button
                              type="button"
                              onClick={() => setSubjectSearch('')}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {searchedSubjects.map(subName => {
                          const isSelected = subjects.some(
                            s => s.toLowerCase() === subName.toLowerCase() || cleanSubjectName(s).toLowerCase() === subName.toLowerCase()
                          );
                          return (
                            <button
                              key={subName}
                              type="button"
                              onClick={() => {
                                setAllocSubject(subName);
                                if (subjects.includes(subName)) {
                                  setSubjects(prev => prev.filter(s => s !== subName));
                                } else {
                                  setSubjects(prev => [...prev, subName]);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                              }`}
                            >
                              {isSelected ? <Check className="w-3 h-3 shrink-0" /> : <Plus className="w-3 h-3 text-slate-400 shrink-0" />}
                              <span>{subName}</span>
                            </button>
                          );
                        })}
                        {searchedSubjects.length === 0 && subjectSearch.trim() && (
                          <div className="w-full flex items-center justify-between p-2 text-xs text-slate-600">
                            <span>Somo <strong>"{subjectSearch.trim()}"</strong> halipo kwenye orodha. Unaweza kuliongeza:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const custom = subjectSearch.trim();
                                if (custom && !subjects.includes(custom)) {
                                  setSubjects(prev => [...prev, custom]);
                                  setSubjectSearch('');
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold cursor-pointer"
                            >
                              + Ongeza "{subjectSearch.trim()}"
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Stream-by-Stream Subject Builder */}
                    <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-3 shadow-2xs">
                      <div className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        B. Au Chagua Somo na Darasa / Mkondo (Subject + Class Stream Builder)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* 1. Subject selector */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                            1. Select Subject (Masomo Yote)
                          </label>
                          <select
                            value={allocSubject}
                            onChange={e => {
                              setAllocSubject(e.target.value);
                              setCustomSubjectText('');
                            }}
                            className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 text-slate-800"
                          >
                            <optgroup label="Masomo ya Dini (Religious Education)">
                              <option value="Elimu ya Dini ya Kiislamu">Elimu ya Dini ya Kiislamu</option>
                              <option value="Islamic Knowledge">Islamic Knowledge</option>
                              <option value="Elimu ya Dini ya Kikristo">Elimu ya Dini ya Kikristo</option>
                              <option value="Bible Knowledge">Bible Knowledge</option>
                              <option value="Divinity">Divinity</option>
                            </optgroup>
                            <optgroup label="Sanaa, Muziki na Michezo (Arts & Sports)">
                              <option value="Fine Art">Fine Art (Sanaa za Ufundi)</option>
                              <option value="Music">Music (Muziki)</option>
                              <option value="Physical Education">Physical Education (Elimu ya Michezo)</option>
                              <option value="Theatre Arts">Theatre Arts (Sanaa za Maonyesho)</option>
                              <option value="Sports and Games">Sports and Games</option>
                            </optgroup>
                            <optgroup label="Masomo ya Msingi Sekondari (Core O-Level)">
                              <option value="Basic Mathematics">Basic Mathematics</option>
                              <option value="English Language">English Language</option>
                              <option value="Kiswahili">Kiswahili</option>
                              <option value="Biology">Biology</option>
                              <option value="Chemistry">Chemistry</option>
                              <option value="Physics">Physics</option>
                              <option value="Geography">Geography</option>
                              <option value="History">History</option>
                              <option value="Civics">Civics</option>
                              <option value="Historia ya Tanzania na Maadili">Historia ya Tanzania na Maadili</option>
                            </optgroup>
                            <optgroup label="Lugha za Kigeni & Fasihi (Languages & Literature)">
                              <option value="Literature in English">Literature in English</option>
                              <option value="Arabic Language">Arabic Language (Kiarabu)</option>
                              <option value="Lugha ya Kiarabu (Arabic)">Lugha ya Kiarabu (Arabic)</option>
                              <option value="French Language">French Language (Kifaransa)</option>
                              <option value="Chinese Language">Chinese Language (Kichina)</option>
                            </optgroup>
                            <optgroup label="Biashara na Uchumi (Business & Commercial)">
                              <option value="Business Studies">Business Studies</option>
                              <option value="Commerce">Commerce</option>
                              <option value="Book Keeping">Book Keeping</option>
                              <option value="Accountancy">Accountancy</option>
                              <option value="Economics">Economics</option>
                            </optgroup>
                            <optgroup label="Sayansi, Kilimo, TEHAMA & Lishe (Science, ICT & Nutrition)">
                              <option value="Agriculture">Agriculture (Kilimo)</option>
                              <option value="Additional Mathematics">Additional Mathematics</option>
                              <option value="Information & Computer Studies">Information & Computer Studies (ICS)</option>
                              <option value="Computer Studies">Computer Studies</option>
                              <option value="Computer Science">Computer Science</option>
                              <option value="Food and Human Nutrition">Food and Human Nutrition</option>
                              <option value="Home Economics">Home Economics</option>
                              <option value="Textiles and Garment Construction">Textiles and Garment Construction</option>
                            </optgroup>
                            <optgroup label="Masomo ya Ufundi (Technical & Engineering)">
                              <option value="Engineering Science">Engineering Science</option>
                              <option value="Building Construction">Building Construction</option>
                              <option value="Architectural Draughting">Architectural Draughting</option>
                              <option value="Surveying">Surveying</option>
                              <option value="Woodwork and Painting">Woodwork and Painting</option>
                              <option value="Electrical Engineering">Electrical Engineering</option>
                              <option value="Electronics and Radio Repair">Electronics and Radio Repair</option>
                              <option value="Mechanical Engineering">Mechanical Engineering</option>
                              <option value="Motor Vehicle Mechanics">Motor Vehicle Mechanics</option>
                              <option value="Welding and Metal Fabrication">Welding and Metal Fabrication</option>
                              <option value="Engineering Drawing">Engineering Drawing</option>
                            </optgroup>
                            <optgroup label="Kidato cha 5 & 6 (A-Level)">
                              <option value="General Studies">General Studies</option>
                              <option value="Basic Applied Mathematics">Basic Applied Mathematics (BAM)</option>
                              <option value="Advanced Mathematics">Advanced Mathematics</option>
                              <option value="Academic Communication">Academic Communication</option>
                              <option value="Education">Education</option>
                            </optgroup>
                            <optgroup label="Shule ya Msingi & Awali (Primary & Pre-Primary)">
                              <option value="Mathematics">Mathematics (Hisabati)</option>
                              <option value="Science and Technology">Science and Technology (Sayansi na Teknolojia)</option>
                              <option value="Social Studies & Vocational Skills">Social Studies & Vocational Skills</option>
                              <option value="Civic and Moral Education">Civic and Moral Education (Uraia na Maadili)</option>
                              <option value="Sanaa na Michezo (Arts & Sports)">Sanaa na Michezo (Arts & Sports)</option>
                              <option value="Afya na Mazingira (Health & Environment)">Afya na Mazingira (Health & Environment)</option>
                              <option value="Kusoma (Reading)">Kusoma (Reading)</option>
                              <option value="Kuandika (Writing)">Kuandika (Writing)</option>
                              <option value="Kuhesabu (Arithmetic)">Kuhesabu (Arithmetic)</option>
                            </optgroup>
                          </select>
                          <input
                            type="text"
                            placeholder="Au andika somo jingine maalum hapa..."
                            value={customSubjectText}
                            onChange={e => setCustomSubjectText(e.target.value)}
                            className="mt-1.5 w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white placeholder-slate-400"
                          />
                        </div>

                        {/* 2. Class Level selector */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                            2. Class Level
                          </label>
                          <select
                            value={allocClass}
                            onChange={e => setAllocClass(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 text-slate-800"
                          >
                            <optgroup label="SECONDARY SCHOOL (Form 1 - 6)">
                              {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </optgroup>
                            <optgroup label="PRIMARY SCHOOL (Standard 1 - 7)">
                              {['Standard 1', 'Standard 2', 'Standard 3', 'Standard 4', 'Standard 5', 'Standard 6', 'Standard 7'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </optgroup>
                            <optgroup label="PRE-PRIMARY / NURSERY">
                              {['Baby Class', 'Middle Class', 'Pre-Unit'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </optgroup>
                          </select>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Target level for stream allocations
                          </span>
                        </div>

                        {/* 3. Multi-Select Streams */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                              3. Multi-Select Streams ({allocStreams.length})
                            </label>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setAllocStreams([...availableStreamIdsForClass])}
                                className="text-blue-600 hover:underline font-bold cursor-pointer"
                              >
                                All
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setAllocStreams([])}
                                className="text-slate-500 hover:underline font-medium cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            {availableStreamIdsForClass.map(streamId => {
                              const isChecked = allocStreams.includes(streamId);
                              return (
                                <button
                                  key={streamId}
                                  type="button"
                                  onClick={() => handleToggleAllocStream(streamId)}
                                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer border ${
                                    isChecked
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {isChecked ? `✓ Stream ${streamId}` : `+ Stream ${streamId}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Add Buttons & Preview */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-slate-700">Preview: </span>
                          {allocStreams.length > 0 ? (
                            <span className="font-mono text-blue-900 font-bold">
                              {allocStreams.map(s => formatSubjectStream(customSubjectText || allocSubject, allocClass, s)).join(', ')}
                            </span>
                          ) : (
                            <span className="font-mono text-blue-900 font-bold">
                              {customSubjectText || allocSubject}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAddSubjectOnly}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Ongeza "{customSubjectText || allocSubject}" Pekee</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRegisterSubjectStreams}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Ongeza {customSubjectText || allocSubject} kwa Mikondo ({allocStreams.length})</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Registered Subjects List (One after another) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Masomo Yaliyochaguliwa kwa Mwalimu Huyu ({subjects.length}):
                        </span>
                        {subjects.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSubjects([])}
                            className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                          >
                            Clear All Subjects
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-blue-200 min-h-[50px] items-center">
                        {subjects.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            Bado hujachagua somo. Bonyeza somo lolote hapo juu (mf. Elimu ya Dini ya Kiislamu, Fine Art, Mathematics) au bonyeza kitufe cha "Ongeza".
                          </span>
                        ) : (
                          subjects.map((sub, idx) => (
                            <span
                              key={`${sub}_${idx}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-100/90 text-blue-950 border border-blue-300 shadow-2xs hover:bg-blue-200 transition"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span className="font-mono tracking-tight">{sub}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubjectEntry(sub)}
                                className="text-blue-700 hover:text-rose-700 hover:bg-rose-100 rounded-full p-0.5 transition cursor-pointer"
                                title={`Remove ${sub}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Manual Single Entry Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                        Au andika somo lolote kwa mkono:
                      </span>
                      <input
                        type="text"
                        placeholder="mf. Elimu ya Dini ya Kiislamu, Fine Art..."
                        value={manualSubjectStreamInput}
                        onChange={e => setManualSubjectStreamInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualSubjectStream();
                          }
                        }}
                        className="px-3 py-1 text-xs border border-slate-300 rounded-lg bg-white flex-1 max-w-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualSubjectStream}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 cursor-pointer"
                      >
                        + Add Subject
                      </button>
                    </div>

                    {/* Registered Teaching Streams (Madarasa & Mikondo Anayofundisha) with Delete (X) & Add (+) */}
                    <div className="space-y-2 pt-3 border-t border-blue-200/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Madarasa &amp; Mikondo Anayofundisha ({teachingStreams.length}):</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newStreams = allocStreams.map(str => `${allocClass} - Stream ${str.toUpperCase()}`);
                              setTeachingStreams(prev => Array.from(new Set([...prev, ...newStreams])));
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg cursor-pointer"
                          >
                            + Ongeza {allocClass} ({allocStreams.join(', ')})
                          </button>
                          {teachingStreams.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setTeachingStreams([])}
                              className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                            >
                              Futa Mikondo Yote
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 p-3 bg-white rounded-xl border border-indigo-200 min-h-[46px] items-center">
                        {teachingStreams.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            Bado hujachagua darasa/mkondo maalum (All Streams / Standard). Unaweza kuongeza mikondo hapo juu au hapa chini.
                          </span>
                        ) : (
                          teachingStreams.map((st, idx) => (
                            <span
                              key={`${st}_${idx}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-950 border border-indigo-300 shadow-2xs"
                            >
                              <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>{st}</span>
                              <button
                                type="button"
                                onClick={() => setTeachingStreams(prev => prev.filter((_, i) => i !== idx))}
                                className="text-indigo-700 hover:text-rose-700 hover:bg-rose-100 rounded-full p-0.5 transition cursor-pointer"
                                title={`Futa mkondo ${st}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                    editingTeacher ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  {editingTeacher ? 'Update Teacher Record' : 'Register Faculty Member'}
                </button>
                {editingTeacher && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl shadow-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Registered Teachers Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-[#1f4d8b] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Registered School Faculty &amp; Staff ({filteredTeachers.length} of {effectiveTeachers.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete registry of teaching faculty, subject allocations, and weekly timetables.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search teacher, subject..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700"
                >
                  <option value="ALL">All Roles ({teachers.length})</option>
                  <option value="ACADEMIC">Academic &amp; Exam Officers</option>
                  <option value="DISCIPLINE">Discipline Staff</option>
                  <option value="LEADERSHIP">School Leadership</option>
                  <option value="HOD">Heads of Department (HOD)</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportTeachersCSV}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Export complete faculty roster to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintTeachersRoster}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Print teacher roster"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Print Roster</span>
                </button>
              </div>
            </div>

            {/* Bulk Action Selection Banner */}
            {selectedTeacherIds.length > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold text-blue-950 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>{selectedTeacherIds.length} staff member(s) selected:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkInvigilationToggle(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                    title="Enable exam invigilation availability for all selected teachers"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Enable Invigilation ({selectedTeacherIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkInvigilationToggle(false)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                    title="Disable exam invigilation (exclude from invigilation) for selected teachers"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                    <span>Disable Invigilation ({selectedTeacherIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDeleteTeachersClick}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete ({selectedTeacherIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTeacherIds([])}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                    <th className="p-2.5 border-r border-slate-200 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-blue-600 cursor-pointer inline-flex items-center justify-center"
                        title={isAllFilteredSelected ? "Deselect All" : "Select All Filtered Teachers"}
                      >
                        {isAllFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-2.5 border-r border-slate-200 w-10 text-center">#</th>
                    <th className="p-2.5 border-r border-slate-200 w-14 text-center">Photo</th>
                    <th className="p-2.5 border-r border-slate-200">Teacher Full Name</th>
                    <th className="p-2.5 border-r border-slate-200 text-center w-24">Gender</th>
                    <th className="p-2.5 border-r border-slate-200">Staff Role</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Initial</th>
                    <th className="p-2.5 border-r border-slate-200">Teaching Subjects</th>
                    <th className="p-2.5 border-r border-slate-200">Class Timetable &amp; Streams</th>
                    <th className="p-2.5 border-r border-slate-200 text-center">Exam Invigilation</th>
                    <th className="p-2.5 border-r border-slate-200">Contact</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400">
                        No faculty members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t, idx) => {
                      const col = getTeacherColor(t.id);
                      const tSlots = timetableAssignments.filter(a => {
                        const matchId = a.teacherId === t.id;
                        const aT = (('teacher' in a ? (a as any).teacher : '') || '').toLowerCase();
                        return matchId || aT === t.name.toLowerCase() || (t.initial && aT === t.initial.toLowerCase()) || aT.includes(t.name.toLowerCase());
                      });

                      const isFemale = t.gender?.toLowerCase().startsWith('f') || (t.schoolRole && (t.schoolRole.includes('Mistress') || t.schoolRole.includes('Headmistress')));
                      const isSelected = selectedTeacherIds.includes(t.id);

                      return (
                        <tr key={t.id} className={`transition ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectTeacher(t.id)}
                              className="text-slate-500 hover:text-blue-600 cursor-pointer inline-flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            {t.passportPhoto ? (
                              <img
                                src={t.passportPhoto}
                                alt={t.name}
                                className="w-9 h-11 object-cover rounded-lg border border-slate-300 mx-auto shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-11 bg-slate-100 rounded-lg border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <div className="font-bold text-slate-800">{t.name}</div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-normal">
                            {isFemale ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-normal">
                                Female (G)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-normal">
                                Male (B)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border shadow-2xs ${getRoleBadgeStyle(t.schoolRole)}`}>
                                {t.schoolRole || 'Subject Teacher'}
                              </span>
                              {(t.classTeacherOf || t.isClassTeacher) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs block w-fit">
                                  🎓 Mwalimu wa Darasa: {formatClassTeacherString(t.classTeacherOf) || 'Form 1 - STREAM A'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <span
                              style={{ backgroundColor: t.color || col.hex, color: '#ffffff' }}
                              className="w-7 h-7 rounded-full inline-flex items-center justify-center font-bold text-xs shadow-2xs"
                            >
                              {t.initial}
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(t.subjects || []).map(sub => (
                                <span
                                  key={sub}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 text-xs">
                                  {tSlots.length} periods/wk
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingTimetableTeacher(t);
                                    setSlotSubject(t.subjects && t.subjects.length === 1 ? t.subjects[0] : '');
                                  }}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="View complete weekly teaching schedule"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>Timetable</span>
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(t.teachingStreams && t.teachingStreams.length > 0) ? (
                                  t.teachingStreams.map((st, idx) => (
                                    <span key={idx} className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                      {st}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">All Streams / Standard</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTeacher({ ...t, excludeInvigilation: !t.excludeInvigilation });
                              }}
                              className={`px-2.5 py-1 text-[11px] font-black rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs hover:scale-[1.03] active:scale-95 ${
                                t.excludeInvigilation
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:border-rose-400'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                              }`}
                              title={
                                t.excludeInvigilation
                                  ? 'Mwalimu HUYU HASIMAMII mitihani. Bofya hapa ili kumruhusu asinamie mitihani.'
                                  : 'Mwalimu HUYU ANASIMAMIA mitihani. Bofya hapa ili kuzuia asisimamie mitihani.'
                              }
                            >
                              {t.excludeInvigilation ? (
                                <>
                                  <X className="w-3.5 h-3.5 text-rose-600 shrink-0 font-black" />
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
                          <td className="p-2.5 border-r border-slate-200">
                            {t.phone ? (
                              <StudentPhoneBadge 
                                phone={t.phone} 
                                studentName={t.name}
                                onUpdatePhone={newPhone => onUpdateTeacher({ ...t, phone: newPhone })}
                              />
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No phone</span>
                            )}
                            {t.email && <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">{t.email}</div>}
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProfileDashboardTeacherId(t.id);
                                    setActiveSubTab('profile_dashboard');
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg border border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Fungua Teacher Profile Dashboard ya mwalimu huyu (Vipindi, Usimamizi & Journal)"
                                >
                                  <User className="w-3 h-3 text-indigo-600" />
                                  <span>Profile</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(t)}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                    editingTeacher?.id === t.id 
                                      ? 'bg-amber-600 text-white border-amber-600' 
                                      : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                  }`}
                                >
                                  {editingTeacher?.id === t.id ? 'Editing...' : 'Edit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateTeacher({ ...t, excludeInvigilation: !t.excludeInvigilation })}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                                    t.excludeInvigilation
                                      ? 'border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100'
                                      : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                  title={t.excludeInvigilation ? 'Mwalimu huyu hasimamii. Bofya kubadilisha awe anasimamia' : 'Mwalimu huyu anasimamia. Bofya kubadilisha asisimamie'}
                                >
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>{t.excludeInvigilation ? 'Hasimamii' : 'Anasimamia'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRegisteringBiometricId(String(t.id))}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                                    t.hasBiometric || t.fingerprintEnrolled
                                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                                      : 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'
                                  }`}
                                  title={t.hasBiometric || t.fingerprintEnrolled ? 'Biometric & PIN Imesajiliwa (Bofya kuhariri)' : 'Sajili Alama ya Kidole na PIN'}
                                >
                                  <Fingerprint className="w-3 h-3" />
                                  <span>{t.hasBiometric || t.fingerprintEnrolled ? 'Biometric ✅' : 'Sajili Vidole'}</span>
                                </button>

                              <button
                                type="button"
                                onClick={() => {
                                  openConfirmDelete(
                                    "Thibitisha Ufutaji",
                                    `Je, una uhakika unataka kufuta mfanyakazi ${t.name}? Hatua hii haiwezi kutenduliwa.`,
                                    () => {
                                      onDeleteTeacher(t.id);
                                      if (editingTeacher?.id === t.id) cancelEdit();
                                    }
                                  );
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                title="Delete Teacher"
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
          </div>
        </>
      )}

      {/* TEACHER TIMETABLE & TEACHING SCHEDULE MODAL */}
      {viewingTimetableTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-indigo-900 text-white p-5 flex flex-wrap items-center justify-between gap-4 border-b border-blue-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      Teaching Schedule: {viewingTimetableTeacher.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      {viewingTimetableTeacher.schoolRole || 'Teacher'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Subjects: {(viewingTimetableTeacher.subjects || []).join(', ')} | Allocated Streams: {(viewingTimetableTeacher.teachingStreams || []).join(', ') || 'All'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Timetable</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTimetableTeacher(null)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {slotToast && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{slotToast}</span>
                </div>
              )}

              {/* Synchronized Teacher Timetable View */}
              <TeacherTimetable
                teacher={viewingTimetableTeacher}
                assignments={timetableAssignments}
                periodSettings={periodSettings}
              />

              {/* Quick Add Timetable Slot Form */}
              {onUpdateTimetableAssignments && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Assign Teaching Period Slot to {viewingTimetableTeacher.name}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Day</label>
                      <select
                        value={slotDay}
                        onChange={e => setSlotDay(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                      >
                        {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Period</label>
                      <select
                        value={slotPeriod}
                        onChange={e => setSlotPeriod(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                      >
                        {periodsList.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Class</label>
                      <select
                        value={slotClass}
                        onChange={e => setSlotClass(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                      >
                        {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Stream</label>
                      <select
                        value={slotStream}
                        onChange={e => setSlotStream(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                      >
                        {['STREAM A', 'STREAM B', 'STREAM C', 'STREAM D', 'PCM', 'PCB', 'CBG', 'HGE'].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Subject</label>
                      {(viewingTimetableTeacher.subjects || []).length === 0 ? (
                        <div className="w-full px-2.5 py-1.5 text-xs border border-rose-200 rounded-lg bg-rose-50 text-rose-800 font-bold truncate">
                          ⚠️ Hana Somo
                        </div>
                      ) : (viewingTimetableTeacher.subjects || []).length === 1 ? (
                        <div className="w-full px-2.5 py-1.5 text-xs border border-blue-200 rounded-lg bg-blue-50 text-blue-900 font-bold flex items-center justify-between">
                          <span className="truncate">{viewingTimetableTeacher.subjects[0]}</span>
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-black">Auto ✓</span>
                        </div>
                      ) : (
                        <select
                          value={viewingTimetableTeacher.subjects.includes(slotSubject) ? slotSubject : ''}
                          onChange={e => setSlotSubject(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                        >
                          <option value="">-- Chagua Somo --</option>
                          {viewingTimetableTeacher.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={(viewingTimetableTeacher.subjects || []).length === 0}
                        onClick={handleAddTimetableSlot}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold cursor-pointer transition shadow-xs"
                      >
                        Add to Schedule
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* EDIT TEACHER MODAL (Opens immediately when clicking Edit on any Teacher row) */}
      {isEditTeacherModalOpen && editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#1f4d8b] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  <span>Hariri Taarifa za Mwalimu / Edit Teacher: {editingTeacher.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Taarifa zote za mwanzo za mwalimu zimeletwa hapa chini. Unaweza kufuta (✕) au kuongeza (+) masomo, mikondo, picha, na taarifa zake kisha ubofye <strong>Hifadhi Mabadiliko</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col md:flex-row gap-5 items-start">
                {/* Teacher Photo */}
                <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl w-full md:w-36 shrink-0">
                  <div className="relative w-24 h-28 bg-white border border-slate-300 rounded-lg overflow-hidden flex items-center justify-center shadow-2xs">
                    {passportPhoto ? (
                      <>
                        <img src={passportPhoto} alt={name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPassportPhoto('')}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-xs cursor-pointer"
                          title="Futa Picha"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <User className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1.5 w-full text-[11px] font-bold">
                    <label className="w-full py-1 px-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md cursor-pointer flex items-center justify-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCameraCaptureOpen(true)}
                      className="w-full py-1 px-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-blue-600" />
                      <span>Take Photo</span>
                    </button>
                    {passportPhoto && (
                      <button
                        type="button"
                        onClick={() => setPassportPhoto('')}
                        className="w-full py-1 px-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Futa Picha</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Personal & Role Info */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Jina Kamili la Mwalimu *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Jinsia (Gender) *</label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value as 'Male' | 'Female')}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Male">Male (Mwanaume)</option>
                        <option value="Female">Female (Mwanamke)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Cheo / Wadhifa (Staff Role) *</label>
                      {!isCustomRole ? (
                        <select
                          value={schoolRole}
                          onChange={e => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomRole(true);
                              setCustomRole('');
                            } else {
                              setSchoolRole(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                        >
                          {STAFF_ROLES_LIST.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          <option value="CUSTOM">+ Cheo Kingine Maalum...</option>
                        </select>
                      ) : (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={customRole}
                            onChange={e => setCustomRole(e.target.value)}
                            placeholder="Andika cheo..."
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomRole(false);
                              setSchoolRole('Subject Teacher');
                            }}
                            className="px-2 py-1 text-xs bg-slate-100 rounded border"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <PhoneInputPlugin
                        value={phone}
                        onChange={setPhone}
                        label="Namba ya Simu"
                        studentName={name}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Barua Pepe (Email)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="teacher@school.ac.tz"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Vipindi kwa Wiki (Quota)</label>
                      <input
                        type="number"
                        min="1"
                        max="45"
                        value={maxPeriodsPerWeek}
                        onChange={e => setMaxPeriodsPerWeek(Number(e.target.value) || 20)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Usimamizi &amp; Rangi</label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={excludeInvigilation ? 'yes' : 'no'}
                          onChange={e => setExcludeInvigilation(e.target.value === 'yes')}
                          className="flex-1 px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="no">Anasimamia</option>
                          <option value="yes">Hasimamii</option>
                        </select>
                        <input
                          type="color"
                          value={customColor}
                          onChange={e => setCustomColor(e.target.value)}
                          className="w-9 h-8 rounded border border-slate-300 cursor-pointer shrink-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. MASOMO ALIYOSAJILIWA MWALIMU HUYU (DELETE X OR ADD +) */}
              <div className="p-4 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <h4 className="text-xs font-black text-blue-950 uppercase tracking-wide">
                      1. Masomo Anayofundisha Mwalimu Huyu ({subjects.length} Subjects)
                    </h4>
                  </div>
                  {subjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSubjects([])}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                    >
                      Futa Masomo Yote
                    </button>
                  )}
                </div>

                {/* Current Subjects with Delete (X) */}
                <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-blue-200 min-h-[48px] items-center">
                  {subjects.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Hakuna somo lililochaguliwa. Ongeza somo hapa chini (+).
                    </span>
                  ) : (
                    subjects.map((sub, idx) => (
                      <span
                        key={`${sub}_${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs"
                      >
                        <BookOpen className="w-3 h-3 text-blue-700 shrink-0" />
                        <span>{sub}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubjectEntry(sub)}
                          className="text-blue-700 hover:text-rose-700 hover:bg-rose-100 rounded-full p-0.5 transition cursor-pointer"
                          title={`Futa somo la ${sub}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add Subject via Dropdown or Custom Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Chagua Somo la Kuongeza (+ Ongeza Somo):
                    </label>
                    <select
                      value=""
                      onChange={e => {
                        const val = e.target.value;
                        if (val && !subjects.includes(val)) {
                          setSubjects(prev => [...prev, val]);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                    >
                      <option value="">+ Chagua Somo Kwenye Orodha...</option>
                      {allAvailableSubjectsList.map(subName => (
                        <option key={subName} value={subName} disabled={subjects.includes(subName)}>
                          {subName} {subjects.includes(subName) ? ' (Tayari lipo ✓)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Au Andika Somo Jingine Kwa Mkono:
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={manualSubjectStreamInput}
                        onChange={e => setManualSubjectStreamInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualSubjectStream();
                          }
                        }}
                        placeholder="Mf. Elimu ya Dini ya Kiislamu, Fine Art..."
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualSubjectStream}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ongeza</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. MADARASA & MIKONDO ANAYOFUNDISHA (DELETE X OR ADD +) */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white border border-indigo-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                      2. Madarasa na Mikondo Anayofundisha ({teachingStreams.length} Streams)
                    </h4>
                  </div>
                  {teachingStreams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTeachingStreams([])}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                    >
                      Futa Mikondo Yote
                    </button>
                  )}
                </div>

                {/* Current Teaching Streams Chips with Delete (X) */}
                <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-indigo-200 min-h-[48px] items-center">
                  {teachingStreams.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Hakuna mkondo maalum uliofungwa (Anaruhusiwa kufundisha mikondo yote). Bonyeza hapa chini kuongeza darasa/mkondo.
                    </span>
                  ) : (
                    teachingStreams.map((st, idx) => (
                      <span
                        key={`${st}_${idx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs"
                      >
                        <Layers className="w-3 h-3 text-indigo-700 shrink-0" />
                        <span>{st}</span>
                        <button
                          type="button"
                          onClick={() => setTeachingStreams(prev => prev.filter((_, i) => i !== idx))}
                          className="text-indigo-700 hover:text-rose-700 hover:bg-rose-100 rounded-full p-0.5 transition cursor-pointer"
                          title={`Futa mkondo ${st}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick Add Class & Stream */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Bonyeza Darasa &amp; Mkondo kuongeza (+) au kuondoa (✓):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
                    {allAvailableStreams.map(streamLabel => {
                      const isSelected = teachingStreams.includes(streamLabel);
                      return (
                        <button
                          key={streamLabel}
                          type="button"
                          onClick={() => handleToggleStream(streamLabel)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50'
                          }`}
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
                          <span>{streamLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Hifadhi Mabadiliko (Update Teacher)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multiple Teacher Registration Modal (Spreadsheet & CSV Import) */}
      <CameraCaptureModal
        isOpen={isCameraCaptureOpen}
        onClose={() => setIsCameraCaptureOpen(false)}
        onCapture={(photoDataUrl) => {
          setPassportPhoto(photoDataUrl);
        }}
        title="Live Teacher Photo Capture"
        guideText="Align the teacher face within the passport guide frame below."
      />

      <MultipleTeacherRegistrationModal
        isOpen={isMultipleTeacherModalOpen}
        onClose={() => setIsMultipleTeacherModalOpen(false)}
        onBulkAddTeachers={newTeachers => {
          if (onBulkAddTeachers) {
            onBulkAddTeachers(newTeachers);
          } else {
            newTeachers.forEach(t => onAddTeacher(t));
          }
          setFormNotice(`Successfully registered ${newTeachers.length} staff members!`);
          setTimeout(() => setFormNotice(null), 6000);
        }}
        existingTeachers={teachers}
      />

      {/* Duplicate Teacher Registration Restriction & Permission Modal */}
      {duplicateTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border-2 border-amber-400 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-500 text-slate-950 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/90 text-amber-600 flex items-center justify-center shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide">
                    Tahadhari: Jina la Mwalimu Linajirudia!
                  </h4>
                  <p className="text-[11px] font-bold text-amber-950">
                    Mfumo umezuia usajili wa moja kwa moja ili kuepuka kurudia mwalimu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDuplicateTeacherModal(null);
                  setAllowDuplicateTeacherPermission(false);
                }}
                className="p-1 rounded-lg hover:bg-amber-600/30 text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                <p className="font-bold">
                  Unajaribu kusajili mwalimu mwenye jina{' '}
                  <span className="underline font-black">"{duplicateTeacherModal.pendingTeacher.name}"</span> ambaye tayari anaonekana kwenye orodha ya walimu:
                </p>
                <ul className="list-disc list-inside space-y-1 font-semibold text-amber-900 pt-1">
                  {duplicateTeacherModal.existingMatches.map(m => (
                    <li key={m.id}>
                      <strong>{m.name}</strong> ({m.initial}) — Wadhifa: <strong>{m.schoolRole || 'Subject Teacher'}</strong>, Masomo:{' '}
                      <span className="font-mono">{(m.subjects || []).join(', ') || 'Bado'}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowDuplicateTeacherPermission}
                    onChange={e => setAllowDuplicateTeacherPermission(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    Ninathibitisha na kutoa ruhusa kuwa huyu ni mwalimu mwingine tofauti ingawa majina yao yanafanana (Ruhusu kusajili mwalimu huyu kwa initials za "{duplicateTeacherModal.pendingTeacher.initial}").
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateTeacherModal(null);
                    setAllowDuplicateTeacherPermission(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  Sitisha Usajili (Cancel)
                </button>
                <button
                  type="button"
                  disabled={!allowDuplicateTeacherPermission}
                  onClick={() => finalizeSaveTeacher(duplicateTeacherModal.pendingTeacher, duplicateTeacherModal.isEditing)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs shadow-sm cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Ruhusu na Sajili Mwalimu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
