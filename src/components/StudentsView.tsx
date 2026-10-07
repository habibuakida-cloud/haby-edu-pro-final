import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Eye, 
  Check, 
  Search,
  BookOpen,
  Camera,
  Printer,
  FileSpreadsheet,
  Users,
  Filter,
  ArrowUpDown,
  X,
  User,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  Grid,
  GraduationCap,
  ChevronRight,
  PlusCircle,
  Plus,
  Shield,
  QrCode,
  FileText,
  BarChart2
} from 'lucide-react';
import { Student, SchoolInfo, EducationLevel, StreamSetting, ExaminationRecord } from '../types';
import { useConfirmDelete } from '../context/ConfirmDeleteContext';
import { CameraCaptureModal } from './common/CameraCaptureModal';
import { 
  SUBJECT_LIST, 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES, 
  NURSERY_SUBJECTS_LIST, 
  LOWER_PRIMARY_SUBJECTS_LIST, 
  UPPER_PRIMARY_SUBJECTS_LIST,
  SECONDARY_SUBJECTS,
  INITIAL_STREAM_SETTINGS 
} from '../constants/defaults';
import { downloadFile, escapeCSV, printFormattedSection } from '../utils/export';
import { formatStudentRegNo, getNextStudentRegNo } from '../utils/studentRegUtils';
import { GenderSummary } from './common/GenderSummary';
import { HabyEduProLogo } from './common/HabyEduProLogo';
import { supabase } from '../lib/supabaseClient';
import { PhoneInputPlugin } from './common/PhoneInputPlugin';
import { StudentPhoneBadge } from './common/StudentPhoneBadge';
import { StudentCsvImportModal } from './Students/StudentCsvImportModal';
import { StudentQrScannerModal } from './Students/StudentQrScannerModal';
import { StudentDashboardModal } from './Students/StudentDashboardModal';
import { BulkPromotionWizard } from './Students/BulkPromotionWizard';
import { getTanzanianCarrier, formatPhoneNumber } from '../utils/phoneUtils';
import { ClassStreamManagerModal } from './common/ClassStreamManagerModal';
import { exportClassListPDF } from '../utils/classListPdfExport';
import { exportRegisteredStudentsPDF } from '../utils/studentRegisterPdfExport';
import { 
  getAllAvailableClasses, 
  getStreamsForClass, 
  inferEducationLevel, 
  syncClassAndStreamToSettings,
  getNextLogicalStream,
  normalizeStreamName
} from '../utils/classStreamUtils';
import { DisciplineRecord, PromotionHistory } from '../types';

interface StudentsViewProps {
  students: Student[];
  schoolInfo?: SchoolInfo;
  streamSettings?: StreamSetting[];
  onUpdateStreamSettings?: (settings: StreamSetting[]) => void;
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onDeleteStudent: (id: number | string) => void;
  onBulkDeleteStudents?: (ids: (number | string)[]) => void;
  onBulkAddStudents?: (newStudents: Student[]) => void;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  onSaveDailyAttendance?: (date: string, records: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>) => void;
  disciplineRecords?: DisciplineRecord[];
  onExecutePromotion?: (promotedStudents: Student[], historyLogs: PromotionHistory[]) => void;
  onNavigateToDiscipline?: (student: Student) => void;
  examinationRecords?: ExaminationRecord[];
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  schoolInfo,
  streamSettings = INITIAL_STREAM_SETTINGS,
  onUpdateStreamSettings,
  onAddStudent,
  onUpdateStudent,
  onUpdateStudents,
  onDeleteStudent,
  onBulkDeleteStudents,
  onBulkAddStudents,
  dailyAttendance = {},
  onSaveDailyAttendance,
  disciplineRecords = [],
  onExecutePromotion,
  onNavigateToDiscipline,
  examinationRecords = []
}) => {
  const { openConfirmDelete } = useConfirmDelete();
  // Form State
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('Male');
  const [className, setClassName] = useState('Form 1');
  const [level, setLevel] = useState<EducationLevel>('CSEE');
  const [stream, setStream] = useState('STREAM A');
  const [combination, setCombination] = useState('PCM');
  const [dob, setDob] = useState('2010-01-01');
  const [parentPhone, setParentPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'English Language', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics'
  ]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showAutoFillNotice, setShowAutoFillNotice] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [isClassStreamModalOpen, setIsClassStreamModalOpen] = useState(false);

  // Recent Searches State
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('haby_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  const saveSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('haby_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  // Modified Search Handler
  const handleSearch = (term: string) => {
    setSearchFilter(term);
    saveSearch(term);
  };
  const allRegisteredStreams: string[] = useMemo(() => {
    const set = new Set<string>();
    ['A', 'B', 'C', 'D', 'E'].forEach((st: string) => set.add(st));
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [students]);

  // List filters & sorting (with gender-grouped alphabetical arrangement per user request)
  const [activeTab, setActiveTab] = useState<'form' | 'register_list' | 'classes_streams' | 'parents_list' | 'class_lists'>('classes_streams');
  
  // DB Parents list for Parent Directory
  const [dbParents, setDbParents] = useState<any[]>([]);
  const [loadingDbParents, setLoadingDbParents] = useState(false);

  const fetchDbParents = async () => {
    try {
      setLoadingDbParents(true);
      const schoolId = schoolInfo?.schoolNumber || localStorage.getItem('currentSchoolId') || 'DEMO_SCHOOL';
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('school_id', schoolId);
      if (!error && data) {
        setDbParents(data);
      }
    } catch (e) {
      console.warn("Error fetching parents in StudentsView:", e);
    } finally {
      setLoadingDbParents(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'parents_list') {
      fetchDbParents();
    }
  }, [activeTab]);

  const [searchFilter, setSearchFilter] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'regNo_asc' | 'regNo_desc' | 'name_asc' | 'girls_first_asc' | 'boys_first_asc'>('regNo_asc');
  const [classDirLevelFilter, setClassDirLevelFilter] = useState<string>('ALL');
  const [classDirSearch, setClassDirSearch] = useState<string>('');

  // QR Scanner & Class List States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  const [cameraCaptureTarget, setCameraCaptureTarget] = useState<'register' | 'edit'>('register');
  const [selectedClassListClass, setSelectedClassListClass] = useState<string>('Form 1');
  const [selectedClassListStream, setSelectedClassListStream] = useState<string>('All');
  const [classListSearch, setClassListSearch] = useState<string>('');
  const [classListSortBy, setClassListSortBy] = useState<'regNo_asc' | 'name_asc' | 'girls_first_asc' | 'boys_first_asc'>('name_asc');
  const [showPhotosInList, setShowPhotosInList] = useState<boolean>(false);
  const [showParentPhoneInList, setShowParentPhoneInList] = useState<boolean>(true);
  const [showSubjectsInList, setShowSubjectsInList] = useState<boolean>(true);
  const [showSignatureCol, setShowSignatureCol] = useState<boolean>(true);
  const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState<boolean>(false);

  // Dynamic list of all available registered classes
  const allAvailableClassesList = useMemo(() => {
    return getAllAvailableClasses(streamSettings, students);
  }, [streamSettings, students]);

  // Dynamic streams for selected class in registration form
  const currentClassStreams = useMemo(() => {
    return getStreamsForClass(className, streamSettings, students);
  }, [className, streamSettings, students]);

  // Created Classes & Streams Directory computation
  const createdClassesDirectory = useMemo(() => {
    const classMap = new Map<string, {
      className: string;
      level: EducationLevel;
      streamsMap: Map<string, { streamName: string; total: number; boys: number; girls: number; studentList: Student[] }>;
      totalStudents: number;
      boys: number;
      girls: number;
    }>();

    // 1. Initialize from streamSettings
    const activeSettings = streamSettings && streamSettings.length > 0 ? streamSettings : INITIAL_STREAM_SETTINGS;
    activeSettings.forEach(setting => {
      const streamsMap = new Map<string, { streamName: string; total: number; boys: number; girls: number; studentList: Student[] }>();
      (setting.streams || ['STREAM A', 'STREAM B']).forEach(st => {
        streamsMap.set(st, { streamName: st, total: 0, boys: 0, girls: 0, studentList: [] });
      });
      classMap.set(setting.className, {
        className: setting.className,
        level: setting.level || inferEducationLevel(setting.className),
        streamsMap,
        totalStudents: 0,
        boys: 0,
        girls: 0
      });
    });

    // 2. Populate with registered students and capture any custom classes/streams
    students.forEach(student => {
      const cName = student.className || 'Form 1';
      let entry = classMap.get(cName);
      if (!entry) {
        const lvl: EducationLevel = student.level || inferEducationLevel(cName);
        entry = {
          className: cName,
          level: lvl,
          streamsMap: new Map(),
          totalStudents: 0,
          boys: 0,
          girls: 0
        };
        classMap.set(cName, entry);
      }

      const sName = student.stream || student.combination || 'STREAM A';
      let sEntry = entry.streamsMap.get(sName);
      if (!sEntry) {
        sEntry = { streamName: sName, total: 0, boys: 0, girls: 0, studentList: [] };
        entry.streamsMap.set(sName, sEntry);
      }

      const isGirl = (student.gender || '').toLowerCase().startsWith('f') || student.sex === 'F';
      entry.totalStudents++;
      sEntry.total++;
      sEntry.studentList.push(student);
      if (isGirl) {
        entry.girls++;
        sEntry.girls++;
      } else {
        entry.boys++;
        sEntry.boys++;
      }
    });

    return Array.from(classMap.values()).map(c => ({
      ...c,
      streams: Array.from(c.streamsMap.values())
    }));
  }, [streamSettings, students]);

  // Class List Tab Data computation for individual or batch lists
  const classListData = useMemo(() => {
    let filteredClasses = createdClassesDirectory;
    if (selectedClassListClass !== 'ALL' && selectedClassListClass !== 'All') {
      filteredClasses = createdClassesDirectory.filter(c => c.className.toLowerCase() === selectedClassListClass.toLowerCase());
    }

    return filteredClasses.map(c => {
      let streamsToInclude = c.streams;
      if (selectedClassListStream !== 'ALL' && selectedClassListStream !== 'All') {
        const targetStr = selectedClassListStream.replace(/^STREAM\s+/i, '').toLowerCase();
        streamsToInclude = c.streams.filter(s => s.streamName.replace(/^STREAM\s+/i, '').toLowerCase() === targetStr);
      }

      const processedStreams = streamsToInclude.map(st => {
        let stStudents = [...st.studentList];

        // Search filter within class list
        if (classListSearch.trim()) {
          const q = classListSearch.toLowerCase().trim();
          stStudents = stStudents.filter(s => 
            s.name.toLowerCase().includes(q) || 
            (s.regNo && s.regNo.toLowerCase().includes(q)) ||
            (s.parentPhone && s.parentPhone.includes(q))
          );
        }

        // Sorting
        stStudents.sort((a, b) => {
          if (classListSortBy === 'name_asc') {
            return a.name.localeCompare(b.name);
          } else if (classListSortBy === 'regNo_asc') {
            return (a.regNo || '').localeCompare(b.regNo || '');
          } else if (classListSortBy === 'girls_first_asc') {
            const aIsGirl = (a.gender || '').toLowerCase().startsWith('f') || a.sex === 'F';
            const bIsGirl = (b.gender || '').toLowerCase().startsWith('f') || b.sex === 'F';
            if (aIsGirl && !bIsGirl) return -1;
            if (!aIsGirl && bIsGirl) return 1;
            return a.name.localeCompare(b.name);
          } else if (classListSortBy === 'boys_first_asc') {
            const aIsGirl = (a.gender || '').toLowerCase().startsWith('f') || a.sex === 'F';
            const bIsGirl = (b.gender || '').toLowerCase().startsWith('f') || b.sex === 'F';
            if (!aIsGirl && bIsGirl) return -1;
            if (aIsGirl && !bIsGirl) return 1;
            return a.name.localeCompare(b.name);
          }
          return 0;
        });

        const boys = stStudents.filter(s => !(s.gender || '').toLowerCase().startsWith('f') && s.sex !== 'F').length;
        const girls = stStudents.filter(s => (s.gender || '').toLowerCase().startsWith('f') || s.sex === 'F').length;

        return {
          ...st,
          studentList: stStudents,
          total: stStudents.length,
          boys,
          girls
        };
      });

      const totalStudents = processedStreams.reduce((acc, curr) => acc + curr.total, 0);
      const totalBoys = processedStreams.reduce((acc, curr) => acc + curr.boys, 0);
      const totalGirls = processedStreams.reduce((acc, curr) => acc + curr.girls, 0);

      return {
        ...c,
        streams: processedStreams,
        totalStudents,
        boys: totalBoys,
        girls: totalGirls
      };
    });
  }, [createdClassesDirectory, selectedClassListClass, selectedClassListStream, classListSearch, classListSortBy]);

  // Top Summary Cards Gender Statistics (Requirement 2)
  const topGenderStats = useMemo(() => {
    const stats = {
      total: { B: 0, G: 0, T: students.length },
      nursery: { B: 0, G: 0, T: 0 },
      primary: { B: 0, G: 0, T: 0 },
      secondary: { B: 0, G: 0, T: 0 }
    };

    students.forEach(s => {
      const isGirl = (s.gender || '').toLowerCase().startsWith('f');
      if (isGirl) stats.total.G++; else stats.total.B++;

      const isNursery = NURSERY_CLASSES.includes(s.className) || s.level === 'PRE_PRIMARY';
      const isPrimary = PRIMARY_CLASSES.includes(s.className) || s.level === 'PRIMARY';
      const isSecondary = SECONDARY_CLASSES.includes(s.className) || s.level === 'CSEE' || s.level === 'ACSEE';

      if (isNursery) {
        if (isGirl) stats.nursery.G++; else stats.nursery.B++;
        stats.nursery.T++;
      } else if (isPrimary) {
        if (isGirl) stats.primary.G++; else stats.primary.B++;
        stats.primary.T++;
      } else if (isSecondary) {
        if (isGirl) stats.secondary.G++; else stats.secondary.B++;
        stats.secondary.T++;
      }
    });

    return stats;
  }, [students]);

  // Multiple Student Selection for Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [showBulkRemoveSubjectModal, setShowBulkRemoveSubjectModal] = useState(false);
  const [bulkEnrollSubjects, setBulkEnrollSubjects] = useState<string[]>([]);
  const [bulkRemoveSubjects, setBulkRemoveSubjects] = useState<string[]>([]);
  const [studentCreatedNotice, setStudentCreatedNotice] = useState<string | null>(null);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // Edit and View Modals
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingRecordStudent, setViewingRecordStudent] = useState<Student | null>(null);

  const handleQuickIncreaseStream = (targetClass: string) => {
    if (!onUpdateStreamSettings) return;
    const currentList = streamSettings && streamSettings.length > 0 ? streamSettings : INITIAL_STREAM_SETTINGS;
    const setting = currentList.find(s => s.className.toLowerCase().trim() === targetClass.toLowerCase().trim());
    const existing = setting ? setting.streams : getStreamsForClass(targetClass, currentList, students);
    const nextStream = getNextLogicalStream(existing);

    let updated: StreamSetting[];
    if (setting) {
      updated = currentList.map(s => {
        if (s.className.toLowerCase().trim() === targetClass.toLowerCase().trim()) {
          if (s.streams.includes(nextStream)) return s;
          return {
            ...s,
            streams: [...s.streams, nextStream]
          };
        }
        return s;
      });
    } else {
      updated = [
        ...currentList,
        {
          id: Date.now(),
          className: targetClass,
          level: inferEducationLevel(targetClass),
          streams: [...existing, nextStream]
        }
      ];
    }
    onUpdateStreamSettings(updated);
    setStudentCreatedNotice(`✓ Mkondo mpya wa "${nextStream}" umeongezwa kwenye ${targetClass} kikamilifu!`);
    setTimeout(() => setStudentCreatedNotice(null), 4000);
  };

  const handleQuickDecreaseStream = (targetClass: string) => {
    if (!onUpdateStreamSettings) return;
    const currentList = streamSettings && streamSettings.length > 0 ? streamSettings : INITIAL_STREAM_SETTINGS;
    const setting = currentList.find(s => s.className.toLowerCase().trim() === targetClass.toLowerCase().trim());
    const existing = setting ? setting.streams : getStreamsForClass(targetClass, currentList, students);

    if (existing.length <= 1) {
      alert(`Darasa la ${targetClass} lina mkondo mmoja tu (${existing[0]}). Huwezi kupunguza mikondo chini ya 1.`);
      return;
    }

    const streamToRemove = existing[existing.length - 1];
    const studentCount = students.filter(
      s => s.className.toLowerCase().trim() === targetClass.toLowerCase().trim() &&
           ((s.stream || '').toUpperCase().includes(streamToRemove.toUpperCase().replace(/^STREAM\s+/i, '')) ||
            (s.combination || '').toUpperCase() === streamToRemove.toUpperCase())
    ).length;

    if (studentCount > 0) {
      if (!window.confirm(`Kuna wanafunzi ${studentCount} walioandikishwa kwenye ${targetClass} - ${streamToRemove}. Je, una uhakika unataka kupunguza/kufuta mkondo huu?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Je, una uhakika unataka kupunguza mkondo wa mwisho (${streamToRemove}) kutoka ${targetClass}?`)) {
        return;
      }
    }

    const updatedStreams = existing.slice(0, existing.length - 1);
    let updated: StreamSetting[];
    if (setting) {
      updated = currentList.map(s => {
        if (s.className.toLowerCase().trim() === targetClass.toLowerCase().trim()) {
          return {
            ...s,
            streams: updatedStreams
          };
        }
        return s;
      });
    } else {
      updated = [
        ...currentList,
        {
          id: Date.now(),
          className: targetClass,
          level: inferEducationLevel(targetClass),
          streams: updatedStreams
        }
      ];
    }

    onUpdateStreamSettings(updated);
    setStudentCreatedNotice(`✓ Mkondo wa "${streamToRemove}" umepunguzwa kutoka ${targetClass}!`);
    setTimeout(() => setStudentCreatedNotice(null), 4000);
  };

  const handleDeleteSpecificStream = (targetClass: string, streamName: string) => {
    if (!onUpdateStreamSettings) return;
    const currentList = streamSettings && streamSettings.length > 0 ? streamSettings : INITIAL_STREAM_SETTINGS;
    const setting = currentList.find(s => s.className.toLowerCase().trim() === targetClass.toLowerCase().trim());
    const existing = setting ? setting.streams : getStreamsForClass(targetClass, currentList, students);

    if (existing.length <= 1) {
      alert(`Darasa la ${targetClass} lina mkondo mmoja tu (${existing[0]}). Huwezi kufuta mkondo wa pekee.`);
      return;
    }

    const studentCount = students.filter(
      s => s.className.toLowerCase().trim() === targetClass.toLowerCase().trim() &&
           ((s.stream || '').toUpperCase().includes(streamName.toUpperCase().replace(/^STREAM\s+/i, '')) ||
            (s.combination || '').toUpperCase() === streamName.toUpperCase())
    ).length;

    const msg = studentCount > 0
      ? `Kuna wanafunzi ${studentCount} walioandikishwa kwenye ${targetClass} - ${streamName}. Je, una uhakika unataka kufuta mkondo huu?`
      : `Je, una uhakika unataka kufuta mkondo wa "${streamName}" kwenye darasa la ${targetClass}?`;

    if (!window.confirm(msg)) return;

    const updatedStreams = existing.filter(st => st.toLowerCase().trim() !== streamName.toLowerCase().trim());
    let updated: StreamSetting[];
    if (setting) {
      updated = currentList.map(s => {
        if (s.className.toLowerCase().trim() === targetClass.toLowerCase().trim()) {
          return {
            ...s,
            streams: updatedStreams
          };
        }
        return s;
      });
    } else {
      updated = [
        ...currentList,
        {
          id: Date.now(),
          className: targetClass,
          level: inferEducationLevel(targetClass),
          streams: updatedStreams
        }
      ];
    }

    onUpdateStreamSettings(updated);
    setStudentCreatedNotice(`✓ Mkondo wa "${streamName}" umefutwa kikamilifu kutoka ${targetClass}!`);
    setTimeout(() => setStudentCreatedNotice(null), 4000);
  };

  const handleClassChange = (newClass: string) => {
    setClassName(newClass);
    if (NURSERY_CLASSES.includes(newClass)) {
      setLevel('PRE_PRIMARY');
      setSelectedSubjects(NURSERY_SUBJECTS_LIST);
      setShowAutoFillNotice(true);
      setTimeout(() => setShowAutoFillNotice(false), 3000);
    } else if (newClass === 'Standard 1' || newClass === 'Standard 2') {
      setLevel('PRIMARY');
      setSelectedSubjects(LOWER_PRIMARY_SUBJECTS_LIST);
      setShowAutoFillNotice(true);
      setTimeout(() => setShowAutoFillNotice(false), 3000);
    } else if (PRIMARY_CLASSES.includes(newClass)) {
      setLevel('PRIMARY');
      setSelectedSubjects(UPPER_PRIMARY_SUBJECTS_LIST);
      setShowAutoFillNotice(true);
      setTimeout(() => setShowAutoFillNotice(false), 3000);
    } else if (['Form 1', 'Form 2', 'Form 3', 'Form 4'].includes(newClass)) {
      setLevel('CSEE');
      setSelectedSubjects(['English Language', 'Kiswahili', 'Basic Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Civics']);
      setShowAutoFillNotice(true);
      setTimeout(() => setShowAutoFillNotice(false), 3000);
    } else if (['Form 5', 'Form 6'].includes(newClass)) {
      setLevel('ACSEE');
      autoFillCombinationSubjects(combination);
    }
  };

  const handleLevelChange = (newLevel: EducationLevel) => {
    setLevel(newLevel);
    if (newLevel === 'PRE_PRIMARY') {
      setSelectedSubjects(NURSERY_SUBJECTS_LIST);
    } else if (newLevel === 'PRIMARY') {
      if (className === 'Standard 1' || className === 'Standard 2') {
        setSelectedSubjects(LOWER_PRIMARY_SUBJECTS_LIST);
      } else {
        setSelectedSubjects(UPPER_PRIMARY_SUBJECTS_LIST);
      }
    } else if (newLevel === 'CSEE') {
      setSelectedSubjects(['English Language', 'Kiswahili', 'Basic Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'Civics']);
    } else if (newLevel === 'ACSEE') {
      autoFillCombinationSubjects(combination);
    }
  };

  const autoFillCombinationSubjects = (combo: string) => {
    const comboMap: Record<string, string[]> = {
      'PCM': ['Physics', 'Chemistry', 'Advanced Mathematics'],
      'PCB': ['Physics', 'Chemistry', 'Biology'],
      'CBG': ['Chemistry', 'Biology', 'Geography'],
      'HGE': ['History', 'Geography', 'Economics'],
      'HKL': ['History', 'Kiswahili', 'English Language'],
      'EGM': ['Economics', 'Geography', 'Advanced Mathematics'],
      'ECA': ['Economics', 'Chemistry', 'Agriculture'],
      'CBA': ['Chemistry', 'Biology', 'Agriculture'],
      'PGM': ['Physics', 'Geography', 'Advanced Mathematics'],
      'PGK': ['Physics', 'Geography', 'Kiswahili'],
      'HGL': ['History', 'Geography', 'English Language'],
      'HGK': ['History', 'Geography', 'Kiswahili'],
      'KLF': ['Kiswahili', 'English Language', 'Fine Art']
    };

    const compulsory = ['Academic Communications', 'Historia Ya Tanzania Na Maadili'];
    const specific = comboMap[combo] || ['Physics', 'Chemistry', 'Mathematics'];
    setSelectedSubjects([...compulsory, ...specific]);
    setShowAutoFillNotice(true);
    setTimeout(() => setShowAutoFillNotice(false), 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
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

          if (isEditing && editingStudent) {
            setEditingStudent({ ...editingStudent, passportPhoto: compressed });
          } else {
            setPassportPhoto(compressed);
          }
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter student full name.');
      return;
    }
    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject.');
      return;
    }

    const isPrimarySection = level === 'PRIMARY' || level === 'PRE_PRIMARY' || 
      PRIMARY_CLASSES.includes(className) || NURSERY_CLASSES.includes(className);
    const regNo = getNextStudentRegNo(students, schoolInfo?.schoolNumber, undefined, isPrimarySection);
    const activeStream = level === 'ACSEE' ? (combination || stream) : (stream || 'STREAM A');
    const newStudent: Student = {
      id: Date.now(),
      regNo,
      name: name.trim(),
      gender,
      className,
      level,
      stream: activeStream,
      combination: level === 'ACSEE' ? combination : undefined,
      dob,
      parentName: parentName.trim() || undefined,
      parentPhone: parentPhone.trim() || undefined,
      phone: parentPhone.trim() || undefined,
      passportPhoto: passportPhoto || undefined,
      subjects: selectedSubjects,
      marks: {},
      total: 0,
      average: '0.0',
      division: '-'
    };

    onAddStudent(newStudent);

    // Auto-sync class and stream into streamSettings registry
    if (onUpdateStreamSettings) {
      const { updatedSettings, wasChanged } = syncClassAndStreamToSettings(
        className,
        activeStream,
        streamSettings
      );
      if (wasChanged) {
        onUpdateStreamSettings(updatedSettings);
      }
    }

    setName('');
    setParentPhone('');
    setParentName('');
    setPassportPhoto('');
    // After Student Create, show all students in Student button list immediately
    setActiveTab('register_list');
    setStudentCreatedNotice(`Student ${newStudent.name} (${newStudent.regNo}) registered successfully! Class ${className} (${activeStream}) updated across system.`);
    setTimeout(() => setStudentCreatedNotice(null), 6000);
  };

  const exportTemplate = () => {
    const headers = [
      'Full Name',
      'Gender',
      'Class',
      'Level',
      'Stream or Combination',
      'Parent Phone Number',
      'Date of Birth',
      'Subjects (semicolon separated)',
      'Assigned Token Reg No (Optional)'
    ];
    const sample = [
      'Juma Ally Mrisho',
      'Male',
      'Form 1',
      'CSEE',
      'STREAM A',
      '0754123456',
      '2010-05-14',
      'English Language; Kiswahili; Mathematics; Physics; Chemistry; Biology',
      formatStudentRegNo(schoolInfo?.schoolNumber, 1)
    ];
    downloadFile('student_registration_with_phone_template.csv', [headers.map(escapeCSV).join(','), sample.map(escapeCSV).join(',')].join('\n'));
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = String(evt.target?.result || '');
      const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        alert('CSV file does not have enough rows.');
        return;
      }
      const newStudentsBatch: Student[] = [];

      const parseCSVLine = (textLine: string) => {
        const delimiter = (textLine.match(/;/g) || []).length > (textLine.match(/,/g) || []).length ? ';' : ',';
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < textLine.length; i++) {
          const char = textLine[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === delimiter && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else cur += char;
        }
        result.push(cur.trim());
        return result;
      };

      const headerTokens = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const nameIdx = headerTokens.findIndex(h => h.includes('name') || h.includes('jina'));
      const genderIdx = headerTokens.findIndex(h => h.includes('gender') || h.includes('jinsi') || h.includes('sex'));
      const classIdx = headerTokens.findIndex(h => h.includes('class') || h.includes('darasa') || h.includes('grade'));
      const levelIdx = headerTokens.findIndex(h => h.includes('level') || h.includes('ngazi'));
      const streamIdx = headerTokens.findIndex(h => h.includes('stream') || h.includes('mkondo') || h.includes('combination'));
      const phoneIdx = headerTokens.findIndex(h => h.includes('phone') || h.includes('simu') || h.includes('contact'));
      const dobIdx = headerTokens.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('kuzaliwa'));
      const subsIdx = headerTokens.findIndex(h => h.includes('subject') || h.includes('masomo'));
      const regIdx = headerTokens.findIndex(h => h.includes('reg') || h.includes('token') || h.includes('namba'));

      lines.slice(1).forEach((line, index) => {
        const parts = parseCSVLine(line);
        if (parts.length >= 1 && parts[0]) {
          const sName = (nameIdx >= 0 ? parts[nameIdx] : parts[0])?.trim();
          const sGender = ((genderIdx >= 0 ? parts[genderIdx] : parts[1])?.trim() as 'Male' | 'Female') || 'Male';
          const sClass = (classIdx >= 0 ? parts[classIdx] : parts[2])?.trim() || 'Form 1';
          const sLevel = ((levelIdx >= 0 ? parts[levelIdx] : parts[3])?.trim() as 'CSEE' | 'ACSEE') || 'CSEE';
          const sStream = (streamIdx >= 0 ? parts[streamIdx] : parts[4])?.trim() || 'STREAM A';
          const sPhoneRaw = (phoneIdx >= 0 ? parts[phoneIdx] : parts[5])?.trim() || '';
          const sDob = (dobIdx >= 0 ? parts[dobIdx] : parts[6])?.trim() || '2010-01-01';
          const sSubsRaw = (subsIdx >= 0 ? parts[subsIdx] : parts[7])?.trim() || '';
          const explicitRegNo = (regIdx >= 0 ? parts[regIdx] : parts[8])?.trim();

          const sPhone = sPhoneRaw ? formatPhoneNumber(sPhoneRaw) : undefined;
          const sSubs = sSubsRaw ? sSubsRaw.split(/[;,]/).map(s => s.trim()).filter(Boolean) : ['English Language', 'Mathematics'];

          if (sName) {
            const isBatchPrimary = (sLevel as string) === 'PRIMARY' || (sLevel as string) === 'PRE_PRIMARY' || 
              PRIMARY_CLASSES.includes(sClass) || NURSERY_CLASSES.includes(sClass);
            newStudentsBatch.push({
              id: Date.now() + index,
              regNo: explicitRegNo || formatStudentRegNo(schoolInfo?.schoolNumber, students.length + newStudentsBatch.length + 1, undefined, isBatchPrimary),
              name: sName,
              gender: sGender,
              className: sClass,
              level: sLevel,
              stream: sLevel === 'CSEE' ? sStream : undefined,
              combination: sLevel === 'ACSEE' ? sStream : undefined,
              parentPhone: sPhone,
              phone: sPhone,
              dob: sDob,
              subjects: sSubs
            });
          }
        }
      });

      if (newStudentsBatch.length > 0) {
        if (onBulkAddStudents) {
          onBulkAddStudents(newStudentsBatch);
        } else {
          newStudentsBatch.forEach(s => onAddStudent(s));
        }
        alert(`Imported ${newStudentsBatch.length} students successfully from CSV!`);
      } else {
        alert('No valid student rows found in the uploaded CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportRegisteredListCSV = () => {
    const headers = [
      'Registration Order', 
      'Reg No', 
      'Student Full Name', 
      'Gender', 
      'Class', 
      'Level', 
      'Stream / Combination', 
      'Parent Phone Number', 
      'Carrier Network',
      'Date of Birth', 
      'Total Subjects Enrolled'
    ];
    const rows = sortedFilteredStudents.map((s, idx) => {
      const ph = s.parentPhone || s.phone || '';
      const carrier = ph ? getTanzanianCarrier(ph)?.name || '' : '';
      return [
        String(idx + 1),
        s.regNo || '',
        s.name,
        s.gender || '',
        s.className,
        s.level,
        s.stream || s.combination || '',
        ph,
        carrier,
        s.dob || '',
        String(s.subjects.length)
      ];
    });
    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
    downloadFile('Official_Registered_Students_List.csv', csvContent, 'text/csv;charset=utf-8');
  };

  const handlePrintRegisteredList = () => {
    printFormattedSection(
      'registered-students-print-table',
      'Official Master List of Registered Students',
      schoolInfo?.name || 'SECONDARY SCHOOL',
      { orientation: 'portrait', pageSize: 'A4', fontSize: 'large' }
    );
  };

  const isSelectedLevelPrimary = level === 'PRIMARY' || PRIMARY_CLASSES.includes(className);
  const isSelectedLevelNursery = level === 'PRE_PRIMARY' || NURSERY_CLASSES.includes(className);

  const availableSubjectsForStudent = isSelectedLevelNursery 
    ? NURSERY_SUBJECTS_LIST 
    : isSelectedLevelPrimary 
    ? (className === 'Standard 1' || className === 'Standard 2' ? LOWER_PRIMARY_SUBJECTS_LIST : UPPER_PRIMARY_SUBJECTS_LIST)
    : SECONDARY_SUBJECTS;

  const filteredSubjects = availableSubjectsForStudent.filter(s => 
    s.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // Filter and sort registered students according to registration
  const sortedFilteredStudents = [...students].filter(s => {
    const q = searchFilter.toLowerCase();
    const matchSearch = !q || 
      s.name.toLowerCase().includes(q) || 
      (s.regNo && s.regNo.toLowerCase().includes(q)) ||
      (s.parentPhone && s.parentPhone.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q));
    if (!matchSearch) return false;
    if (classFilter !== 'ALL' && s.className !== classFilter) return false;
    if (streamFilter !== 'ALL') {
      const target = streamFilter.toUpperCase().replace(/^STREAM\s+/i, '');
      const sStream = (s.stream || '').toUpperCase().replace(/^STREAM\s+/i, '');
      const sCombo = (s.combination || '').toUpperCase();
      const match = sStream === target || sStream.includes(target) || sCombo === target || sCombo.includes(target);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'regNo_asc') {
      return (a.regNo || '').localeCompare(b.regNo || '', undefined, { numeric: true });
    }
    if (sortBy === 'regNo_desc') {
      return (b.regNo || '').localeCompare(a.regNo || '', undefined, { numeric: true });
    }
    if (sortBy === 'girls_first_asc') {
      const isGirlA = (a.gender || '').toLowerCase().startsWith('f');
      const isGirlB = (b.gender || '').toLowerCase().startsWith('f');
      if (isGirlA && !isGirlB) return -1;
      if (!isGirlA && isGirlB) return 1;
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'boys_first_asc') {
      const isBoyA = !(a.gender || '').toLowerCase().startsWith('f');
      const isBoyB = !(b.gender || '').toLowerCase().startsWith('f');
      if (isBoyA && !isBoyB) return -1;
      if (!isBoyA && isBoyB) return 1;
      return a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  // Cohort Gender Breakdown (Requirement 3: B = 15 (45%) G = 18 (55%) T = 33)
  const filteredCohortGenderStats = useMemo(() => {
    let B = 0;
    let G = 0;
    sortedFilteredStudents.forEach(s => {
      const isGirl = (s.gender || '').toLowerCase().startsWith('f');
      if (isGirl) G++; else B++;
    });
    return { B, G, T: sortedFilteredStudents.length };
  }, [sortedFilteredStudents]);

  // Multiple selection helpers for student bulk deletion
  const handleToggleSelectStudent = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = sortedFilteredStudents.map(s => s.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedStudentIds.includes(id));
    if (isAllSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const isAllFilteredSelected = sortedFilteredStudents.length > 0 && 
    sortedFilteredStudents.every(s => selectedStudentIds.includes(s.id));
  const isSomeFilteredSelected = sortedFilteredStudents.some(s => selectedStudentIds.includes(s.id)) && !isAllFilteredSelected;

  const handleConfirmBulkDelete = () => {
    if (selectedStudentIds.length === 0) return;
    if (onBulkDeleteStudents) {
      onBulkDeleteStudents(selectedStudentIds);
    } else {
      selectedStudentIds.forEach(id => onDeleteStudent(id));
    }
    setSelectedStudentIds([]);
    setShowBulkDeleteModal(false);
  };

  const handleConfirmBulkEnroll = () => {
    if (selectedStudentIds.length === 0 || bulkEnrollSubjects.length === 0) return;
    const targetSet = new Set(selectedStudentIds);
    const updated = students.map(s => {
      if (targetSet.has(s.id)) {
        const mergedSubs = Array.from(new Set([...(s.subjects || []), ...bulkEnrollSubjects]));
        return { ...s, subjects: mergedSubs };
      }
      return s;
    });

    if (onUpdateStudents) {
      onUpdateStudents(updated);
    } else {
      updated.filter(s => targetSet.has(s.id)).forEach(s => onUpdateStudent(s));
    }
    setStudentCreatedNotice(`Successfully enrolled ${selectedStudentIds.length} students into: ${bulkEnrollSubjects.join(', ')}`);
    setTimeout(() => setStudentCreatedNotice(null), 5000);
    setBulkEnrollSubjects([]);
    setSelectedStudentIds([]);
    setShowBulkEnrollModal(false);
  };

  const handleConfirmBulkRemoveSubjects = () => {
    if (selectedStudentIds.length === 0 || bulkRemoveSubjects.length === 0) return;
    const targetSet = new Set(selectedStudentIds);
    const removeSet = new Set(bulkRemoveSubjects);

    const updated = students.map(s => {
      if (targetSet.has(s.id)) {
        const remainingSubs = (s.subjects || []).filter(sub => !removeSet.has(sub));
        const updatedMarks = { ...(s.marks || {}) };
        bulkRemoveSubjects.forEach(sub => delete updatedMarks[sub]);
        return { ...s, subjects: remainingSubs, marks: updatedMarks };
      }
      return s;
    });

    if (onUpdateStudents) {
      onUpdateStudents(updated);
    } else {
      updated.filter(s => targetSet.has(s.id)).forEach(s => onUpdateStudent(s));
    }
    setStudentCreatedNotice(`Successfully removed ${bulkRemoveSubjects.join(', ')} from ${selectedStudentIds.length} students.`);
    setTimeout(() => setStudentCreatedNotice(null), 5000);
    setBulkRemoveSubjects([]);
    setSelectedStudentIds([]);
    setShowBulkRemoveSubjectModal(false);
  };

  const selectedStudentsList = useMemo(() => {
    const set = new Set(selectedStudentIds);
    return students.filter(s => set.has(s.id));
  }, [students, selectedStudentIds]);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards (Requirement 2: Total Students, Nursery, Primary, Secondary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Students */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Total Students
            </span>
            <span className="font-black text-slate-900 text-sm">{topGenderStats.total.T}</span>
          </div>
          <div>
            <GenderSummary
              B={topGenderStats.total.B}
              G={topGenderStats.total.G}
              T={topGenderStats.total.T}
              total={students.length}
              size="xs"
            />
          </div>
        </div>

        {/* Nursery */}
        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-purple-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Nursery / Awali
            </span>
            <span className="font-black text-purple-950 text-sm">{topGenderStats.nursery.T}</span>
          </div>
          <div>
            <GenderSummary
              B={topGenderStats.nursery.B}
              G={topGenderStats.nursery.G}
              T={topGenderStats.nursery.T}
              total={students.length}
              size="xs"
            />
          </div>
        </div>

        {/* Primary */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Primary (Std 1 - 7)
            </span>
            <span className="font-black text-emerald-950 text-sm">{topGenderStats.primary.T}</span>
          </div>
          <div>
            <GenderSummary
              B={topGenderStats.primary.B}
              G={topGenderStats.primary.G}
              T={topGenderStats.primary.T}
              total={students.length}
              size="xs"
            />
          </div>
        </div>

        {/* Secondary */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Secondary (Form 1 - 6)
            </span>
            <span className="font-black text-blue-950 text-sm">{topGenderStats.secondary.T}</span>
          </div>
          <div>
            <GenderSummary
              B={topGenderStats.secondary.B}
              G={topGenderStats.secondary.G}
              T={topGenderStats.secondary.T}
              total={students.length}
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('classes_streams')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'classes_streams'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Created Classes & Streams Directory ({createdClassesDirectory.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('class_lists')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'class_lists'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Class Registers &amp; Nominal Rolls</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register_list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'register_list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Students List ({students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Student Registration Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parents_list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'parents_list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Wazazi & Wanafunzi Wao (Parents Directory)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Promotion Wizard Button */}
          <button
            type="button"
            onClick={() => setIsPromotionWizardOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
            title="Launch Bulk Student Academic Promotion Wizard"
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Promotion Wizard</span>
          </button>

          {/* QR Code Camera Scanner Button */}
          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
            title="Scan student QR code or ID card via camera for instant profile, attendance, or discipline"
          >
            <QrCode className="w-4 h-4 text-slate-950" />
            <span>Scan Student QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCsvImportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 transition-colors border border-purple-200 cursor-pointer"
            title="Import Students from CSV file with phone numbers"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintRegisteredList}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print Registered Students List with Large Clear Font"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Register (Large Font)</span>
          </button>
          <button
            type="button"
            onClick={handleExportRegisteredListCSV}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV of all registered students"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Registration Form Tab */}
      {activeTab === 'form' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1f4d8b]">Student Registration</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Register new students with passport photo, biographical details, class allocation, and subject enrollments.
              </p>
            </div>
            <div className="text-xs font-bold text-blue-800 bg-blue-50 px-3.5 py-2 rounded-lg border border-blue-200 flex items-center gap-1.5 shadow-xs">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Next Reg Token:</span>
              <span className="font-mono text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                {getNextStudentRegNo(
                  students, 
                  schoolInfo?.schoolNumber, 
                  undefined, 
                  level === 'PRIMARY' || level === 'PRE_PRIMARY' || PRIMARY_CLASSES.includes(className) || NURSERY_CLASSES.includes(className)
                )}
              </span>
            </div>
          </div>
          
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Passport Photo Upload Box */}
              <div className="lg:col-span-1 flex flex-col items-center justify-start p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3 text-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  Passport Size Photo
                </label>

                <div className="relative w-28 h-36 bg-white border-2 border-dashed border-slate-300 rounded-lg overflow-hidden flex flex-col items-center justify-center shadow-xs group hover:border-blue-400 transition-colors">
                  {passportPhoto ? (
                    <>
                      <img
                        src={passportPhoto}
                        alt="Student Passport"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPassportPhoto('')}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm cursor-pointer"
                        title="Remove Photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center p-2 cursor-pointer text-slate-400 hover:text-blue-600">
                      <User className="w-10 h-10 mb-1 stroke-1" />
                      <span className="text-[10px] font-bold text-slate-500">Attach Photo</span>
                      <span className="text-[8px] text-slate-400 mt-0.5">3.5 × 4.5 cm (Passport)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handlePhotoUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <label className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    Select Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraCaptureTarget('register');
                      setIsCameraCaptureOpen(true);
                    }}
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
                  Official 35×45mm passport picture for Student ID Cards and School Roster.
                </p>
              </div>

              {/* Biographical Details */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Amina Selemani"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as 'Male' | 'Female')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Class / Form *</label>
                    <button
                      type="button"
                      onClick={() => setIsClassStreamModalOpen(true)}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3 text-blue-600" />
                      <span>+ Manage Classes & Streams</span>
                    </button>
                  </div>
                  <select
                    value={className}
                    onChange={e => handleClassChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  >
                    <optgroup label="Registered Classes">
                      {allAvailableClassesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Level *</label>
                  <select
                    value={level}
                    onChange={e => handleLevelChange(e.target.value as EducationLevel)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                  >
                    <option value="PRE_PRIMARY">Pre-Primary (Elimu ya Awali / Nursery)</option>
                    <option value="PRIMARY">Primary School (Elimu ya Msingi: Std 1 - 7)</option>
                    <option value="CSEE">CSEE (Ordinary Level Form 1 - 4)</option>
                    <option value="ACSEE">ACSEE (Advanced Level Form 5 - 6)</option>
                  </select>
                </div>

                {level === 'ACSEE' ? (
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Combination *</label>
                    <select
                      value={combination}
                      onChange={e => {
                        setCombination(e.target.value);
                        autoFillCombinationSubjects(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-bold text-blue-700"
                    >
                      {currentClassStreams.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                      <option value="PCM">PCM (Physics, Chemistry, Mathematics)</option>
                      <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                      <option value="CBG">CBG (Chemistry, Biology, Geography)</option>
                      <option value="HGE">HGE (History, Geography, Economics)</option>
                      <option value="HKL">HKL (History, Kiswahili, English)</option>
                      <option value="EGM">EGM (Economics, Geography, Mathematics)</option>
                      <option value="ECA">ECA (Economics, Chemistry, Agriculture)</option>
                      <option value="CBA">CBA (Chemistry, Biology, Agriculture)</option>
                      <option value="PGM">PGM (Physics, Geography, Mathematics)</option>
                      <option value="PGK">PGK (Physics, Geography, Kiswahili)</option>
                      <option value="HGL">HGL (History, Geography, English)</option>
                      <option value="HGK">HGK (History, Geography, Kiswahili)</option>
                      <option value="KLF">KLF (Kiswahili, English, Fine Art)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Stream *</label>
                    <select
                      value={stream}
                      onChange={e => setStream(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold text-slate-900"
                    >
                      {currentClassStreams.map((st: string) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Parent / Guardian Full Name</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={e => setParentName(e.target.value)}
                    placeholder="e.g. Juma Mohamed"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <PhoneInputPlugin
                  value={parentPhone}
                  onChange={setParentPhone}
                  label="Parent / Guardian Phone Number"
                  required
                  studentName={name}
                />
              </div>
            </div>

            {/* Subjects Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase">
                  Enrolled Subjects ({selectedSubjects.length} selected)
                </label>
                {showAutoFillNotice && (
                  <span className="text-xs font-bold text-emerald-600 animate-fade-in">
                    ✓ Compulsory & combination subjects auto-filled for ACSEE
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject..."
                  value={subjectSearch}
                  onChange={e => setSubjectSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {filteredSubjects.map(sub => {
                  const checked = selectedSubjects.includes(sub);
                  return (
                    <label
                      key={sub}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                        checked
                          ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedSubjects([...selectedSubjects, sub]);
                          } else {
                            setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-600"
                      />
                      <span className="truncate">{sub}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Register Student
              </button>

              <button
                type="button"
                onClick={exportTemplate}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                Download CSV Template
              </button>

              <button
                type="button"
                onClick={() => setIsCsvImportModalOpen(true)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-purple-600" />
                <span>Import CSV (Batch with Phone)</span>
              </button>

              {/* Quick tip banner for multiple deletion after registration */}
              <div className="w-full mt-1.5 p-2.5 bg-blue-50/80 border border-blue-200/70 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Multiple Delete Students:</strong> After registration, check the boxes on any students in the master list below to delete multiple candidates in one go.</span>
                </span>
                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shrink-0 shadow-xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {selectedStudentIds.length} Selected
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 1: CREATED CLASSES & STREAMS DIRECTORY (Orodha ya Madarasa na Mikondo) */}
      {activeTab === 'classes_streams' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Metric Cards for Classes & Streams */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Classes</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {createdClassesDirectory.filter(c => c.totalStudents > 0 || ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Standard 1', 'Standard 4', 'Standard 7'].includes(c.className)).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Active Academic Classes</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Streams</span>
                <Grid className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-indigo-900 mt-1">
                {createdClassesDirectory.reduce((acc, c) => acc + c.streams.filter(s => s.total > 0 || ['STREAM A', 'STREAM B'].includes(s.streamName)).length, 0)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Class Cohort Streams</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Students</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-800 mt-1">{students.length}</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                B: {topGenderStats.total.B} • G: {topGenderStats.total.G}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Avg Stream Size</span>
                <GraduationCap className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-900 mt-1">
                {students.length > 0 ? Math.round(students.length / Math.max(1, createdClassesDirectory.reduce((acc, c) => acc + c.streams.filter(s => s.total > 0).length, 0))) : 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Students per Stream</p>
            </div>
          </div>

          {/* Directory Filter & Search Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Filter Level:</span>
              {[
                { id: 'ALL', label: 'All Levels' },
                { id: 'CSEE', label: 'Secondary (O-Level Form 1-4)' },
                { id: 'ACSEE', label: 'Secondary (A-Level Form 5-6)' },
                { id: 'PRIMARY', label: 'Primary (Std 1-7)' },
                { id: 'PRE_PRIMARY', label: 'Pre-Primary / Nursery' }
              ].map(lvl => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setClassDirLevelFilter(lvl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    classDirLevelFilter === lvl.id
                      ? 'bg-[#0f2948] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={classDirSearch}
                  onChange={e => setClassDirSearch(e.target.value)}
                  placeholder="Search class or stream..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsClassStreamModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-yellow-300" />
                <span>+ Sajili Darasa / Mkondo Mpya</span>
              </button>
            </div>
          </div>

          {/* Classes & Streams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdClassesDirectory
              .filter(c => {
                if (classDirLevelFilter !== 'ALL' && c.level !== classDirLevelFilter) return false;
                if (classDirSearch.trim()) {
                  const q = classDirSearch.toLowerCase();
                  const matchClass = c.className.toLowerCase().includes(q);
                  const matchStream = c.streams.some(s => s.streamName.toLowerCase().includes(q));
                  if (!matchClass && !matchStream) return false;
                }
                return true;
              })
              .map((classItem, idx) => {
                const totalInClass = classItem.totalStudents;
                const boysInClass = classItem.boys;
                const girlsInClass = classItem.girls;
                const boyPercent = totalInClass > 0 ? Math.round((boysInClass / totalInClass) * 100) : 50;
                const girlPercent = totalInClass > 0 ? 100 - boyPercent : 50;

                const levelBadgeClass = 
                  classItem.level === 'CSEE' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  classItem.level === 'ACSEE' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                  classItem.level === 'PRIMARY' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  'bg-amber-100 text-amber-800 border-amber-200';

                return (
                  <div 
                    key={idx}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    {/* Class Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">
                            {classItem.className}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${levelBadgeClass}`}>
                            {classItem.level === 'CSEE' ? 'O-Level' : classItem.level === 'ACSEE' ? 'A-Level' : classItem.level}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500">
                            {classItem.streams.length} Stream{classItem.streams.length > 1 ? 's' : ''} Configured
                          </p>
                          <button
                            type="button"
                            onClick={() => handleQuickIncreaseStream(classItem.className)}
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title={`Ongeza mkondo unaofuata kwenye ${classItem.className}`}
                          >
                            <Plus className="w-3 h-3 text-emerald-600" />
                            <span>+ Ongeza Mkondo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDecreaseStream(classItem.className)}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                            title={`Punguza mkondo wa mwisho kutoka ${classItem.className}`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>- Punguza Mkondo</span>
                          </button>
                        </div>
                      </div>

                      {/* Class Stats Badge */}
                      <div className="text-right">
                        <span className="text-xl font-black text-[#0f2948]">
                          {totalInClass}
                        </span>
                        <span className="text-xs text-slate-400 font-bold ml-1">students</span>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-0.5">
                          <span className="text-blue-700">Wavulana: {boysInClass}</span>
                          <span>•</span>
                          <span className="text-rose-700">Wasichana: {girlsInClass}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gender Ratio Progress Bar */}
                    {totalInClass > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <span>Boys ({boyPercent}%)</span>
                          <span>Girls ({girlPercent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-blue-600 transition-all" style={{ width: `${boyPercent}%` }} />
                          <div className="h-full bg-rose-500 transition-all" style={{ width: `${girlPercent}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Stream Breakdown Cards */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                        Streams Under {classItem.className}:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {classItem.streams.map((streamItem, sIdx) => {
                          const sTotal = streamItem.total;
                          const sBoys = streamItem.boys;
                          const sGirls = streamItem.girls;

                          return (
                            <div 
                              key={sIdx}
                              className="bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl p-3 transition-all flex flex-col justify-between gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <Grid className="w-3.5 h-3.5 text-blue-600" />
                                  {streamItem.streamName}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 shadow-2xs font-mono" title="Wanafunzi waliosajiliwa">
                                    {sTotal}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSpecificStream(classItem.className, streamItem.streamName);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title={`Futa mkondo wa ${streamItem.streamName} kutoka ${classItem.className}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                <span>B: {sBoys} • G: {sGirls}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClassFilter(classItem.className);
                                    setStreamFilter(streamItem.streamName);
                                    setActiveTab('register_list');
                                  }}
                                  className="text-blue-700 hover:text-blue-900 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>View Students</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Class Card Quick Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setClassFilter(classItem.className);
                          setStreamFilter('ALL');
                          setActiveTab('register_list');
                        }}
                        className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>View All {classItem.className} Students ({totalInClass})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setClassName(classItem.className);
                          setStream('STREAM A');
                          handleClassChange(classItem.className);
                          setActiveTab('form');
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Enroll Student</span>
                      </button>
                    </div>

                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED STUDENTS MASTER LIST */}
      {activeTab === 'register_list' && (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-[#1f4d8b] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Official Registered Students List According to Registration ({sortedFilteredStudents.length} of {students.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Accredited enrollment register arranged by registration order (Reg No) with passport photos and class streams.
            </p>
            {/* Class / Stream Cohort Gender Summary (Requirement 3: B = 15 (45%) G = 18 (55%) T = 33) */}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                {classFilter !== 'ALL' ? classFilter : 'Class Cohort'} {streamFilter !== 'ALL' ? `(${streamFilter})` : ''}:
              </span>
              <GenderSummary
                B={filteredCohortGenderStats.B}
                G={filteredCohortGenderStats.G}
                T={filteredCohortGenderStats.T}
                total={students.length}
                size="xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, Reg No..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Classes</option>
              <optgroup label="Pre-Primary / Nursery">
                {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Primary School (Std 1 - 7)">
                {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Secondary School (Form 1 - 6)">
                {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>

            {/* Stream Filter */}
            <select
              value={streamFilter}
              onChange={e => setStreamFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Streams</option>
              {allRegisteredStreams.map((str: string) => (
                <option key={str} value={str}>Stream {str}</option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
            >
              <option value="regNo_asc">Registration Order (S0001 →)</option>
              <option value="regNo_desc">Latest Registered First</option>
              <option value="name_asc">Alphabetical (A - Z)</option>
              <option value="girls_first_asc">All Girls A-Z first, then All Boys A-Z</option>
              <option value="boys_first_asc">All Boys A-Z first, then All Girls A-Z</option>
            </select>

            {/* Multi-Delete Action Button */}
            {selectedStudentIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Permanently remove selected students from register"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedStudentIds.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Select all visible students to delete or manage"
              >
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Multi-Select</span>
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Controls Banner for Multiple Student Deletions */}
        {selectedStudentIds.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {selectedStudentIds.length}
              </span>
              <div>
                <span className="font-bold text-slate-800 text-xs">
                  {selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected
                </span>
                <span className="text-slate-400 text-xs mx-1.5">•</span>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Deselect visible list' : `Select all ${sortedFilteredStudents.length} visible`}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkEnrollSubjects([]);
                  setShowBulkEnrollModal(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Enroll selected students into multiple subjects"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Multiple Subject Enrollment</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBulkRemoveSubjects([]);
                  setShowBulkRemoveSubjectModal(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-white hover:bg-amber-50 border border-amber-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Delete or remove multiple subjects from selected students"
              >
                <X className="w-3.5 h-3.5 text-amber-600" />
                <span>Multiple Subject Delete</span>
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Permanently remove selected students from register"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Student Created Notification Notice */}
        {studentCreatedNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{studentCreatedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setStudentCreatedNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Student List Filters */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center gap-3 mb-4 no-print">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, reg, phone..."
              value={searchFilter}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {recentSearches.length > 0 && !searchFilter && (
              <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Recent Searches</div>
                {recentSearches.map((term, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSearch(term)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Classes</option>
            {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5', 'Std 6', 'Std 7'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={streamFilter}
            onChange={e => setStreamFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Streams</option>
            {allRegisteredStreams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Printable Section with Increased Font Size */}
        <div id="registered-students-print-table" className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                <th className="p-2.5 border-r border-slate-200 w-10 text-center no-print">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={handleSelectAllFiltered}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title={isAllFilteredSelected ? "Deselect all" : "Select all in filtered list"}
                  />
                </th>
                <th className="p-2.5 border-r border-slate-200 w-10 text-center">#</th>
                <th className="p-2.5 border-r border-slate-200 w-14 text-center">Photo</th>
                <th className="p-2.5 border-r border-slate-200">Registration No</th>
                <th className="p-2.5 border-r border-slate-200">Full Name</th>
                <th className="p-2.5 border-r border-slate-200 text-center">Gender</th>
                <th className="p-2.5 border-r border-slate-200">Class & Stream</th>
                <th className="p-2.5 border-r border-slate-200">Parent Phone</th>
                <th className="p-2.5 border-r border-slate-200">Level</th>
                <th className="p-2.5 border-r border-slate-200">Subjects Enrolled</th>
                <th className="p-2.5 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No registered students found matching your criteria.
                  </td>
                </tr>
              ) : (
                sortedFilteredStudents.map((s, idx) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <td className="p-2.5 border-r border-slate-200 text-center no-print">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(s.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title={`Select ${s.name}`}
                        />
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        {s.passportPhoto ? (
                          <img
                            src={s.passportPhoto}
                            alt={s.name}
                            className="w-9 h-11 object-cover rounded border border-slate-300 mx-auto shadow-2xs"
                          />
                        ) : (
                          <div className="w-9 h-11 bg-slate-100 rounded border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-blue-700">
                        {s.regNo || `S${String(idx + 1).padStart(4, '0')}`}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">{s.name}</td>
                      <td className="p-2.5 border-r border-slate-200 text-center">{s.gender}</td>
                      <td className="p-2.5 border-r border-slate-200 font-medium text-slate-700">
                        {s.className} - {s.stream || s.combination || 'Standard'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <StudentPhoneBadge 
                          phone={s.parentPhone || s.phone} 
                          studentName={s.name}
                          onUpdatePhone={newPhone => onUpdateStudent({ ...s, parentPhone: newPhone, phone: newPhone })}
                        />
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.level === 'ACSEE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {s.level}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 max-w-xs truncate" title={s.subjects.join(', ')}>
                        <span className="font-bold text-slate-800">({s.subjects.length})</span> {s.subjects.slice(0, 4).join(', ')}{s.subjects.length > 4 ? '...' : ''}
                      </td>
                      <td className="p-2.5 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingRecordStudent(s)}
                            className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="View 360° Read-Only Student Dashboard, Grades & Attendance"
                          >
                            <BarChart2 className="w-3 h-3 text-blue-600" />
                            <span>Dashboard</span>
                          </button>
                          <button
                            onClick={() => setEditingStudent(s)}
                            className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openConfirmDelete('Delete Student', `Are you sure you want to delete student ${s.name}?`, () => onDeleteStudent(s.id))}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            title="Delete Student"
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
      )}

      {/* TAB 3: GENERATED CLASS LISTS & NOMINAL ROLLS */}
      {activeTab === 'class_lists' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-extrabold text-[#1f4d8b] flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Generated Class Nominal Rolls &amp; Registers
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Official student nominal rolls organized per class and stream for attendance, examinations, and official record keeping.
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  printFormattedSection(
                    'class-lists-print-container',
                    `Class Nominal Rolls - ${selectedClassListClass} (${selectedClassListStream})`,
                    schoolInfo?.name || 'HABYEDU PRO SCHOOLS'
                  );
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Print the displayed class lists"
              >
                <Printer className="w-4 h-4" />
                <span>Print Class Register</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Export single or all visible streams to PDF
                  const targetClass = classListData[0];
                  if (targetClass && targetClass.streams.length > 0) {
                    const targetStream = targetClass.streams[0];
                    exportClassListPDF({
                      className: targetClass.className,
                      streamName: targetStream.streamName,
                      students: targetStream.studentList,
                      schoolInfo,
                      academicYear: '2026/2027'
                    });
                  } else {
                    alert('No students found for PDF export.');
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Save selected class list as PDF document"
              >
                <Download className="w-4 h-4 text-purple-600" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Export CSV for all visible students in selected class/stream
                  let csv = 'S/N,Registration No,Student Full Name,Gender,Class,Stream,Parent Phone,Enrolled Subjects Count,Subjects Enrolled\n';
                  let idx = 1;
                  classListData.forEach(c => {
                    c.streams.forEach(s => {
                      s.studentList.forEach(st => {
                        csv += `${idx++},"${st.regNo || ''}","${st.name}","${st.gender || 'Male'}","${st.className || c.className}","${st.stream || s.streamName}","${st.parentPhone || st.phone || ''}",${st.subjects ? st.subjects.length : 0},"${(st.subjects || []).join('; ')}"\n`;
                      });
                    });
                  });
                  downloadFile(`${selectedClassListClass}_${selectedClassListStream}_Nominal_Roll.csv`, csv, 'text/csv;charset=utf-8');
                }}
                className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Download CSV nominal roll"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filtering & View Options Strip */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Class Select */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Class</label>
                <select
                  value={selectedClassListClass}
                  onChange={e => {
                    setSelectedClassListClass(e.target.value);
                    setSelectedClassListStream('All');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Classes (Schoolwide)</option>
                  <optgroup label="Secondary School (Form 1 - 6)">
                    {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Primary School (Std 1 - 7)">
                    {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Pre-Primary / Nursery">
                    {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Stream Select */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Stream</label>
                <select
                  value={selectedClassListStream}
                  onChange={e => setSelectedClassListStream(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Streams</option>
                  {allRegisteredStreams.map(st => (
                    <option key={st} value={st}>Stream {st}</option>
                  ))}
                </select>
              </div>

              {/* Sorting Order */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Sorting Arrangement</label>
                <select
                  value={classListSortBy}
                  onChange={e => setClassListSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name_asc">Alphabetical (A - Z)</option>
                  <option value="regNo_asc">Registration Order (S0001 →)</option>
                  <option value="girls_first_asc">All Girls A-Z First, then Boys</option>
                  <option value="boys_first_asc">All Boys A-Z First, then Girls</option>
                </select>
              </div>

              {/* Search in Class List */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Filter Student</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, Reg No..."
                    value={classListSearch}
                    onChange={e => setClassListSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Display Feature Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 text-xs font-bold text-slate-700">
              <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">Display Options:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPhotosInList}
                  onChange={e => setShowPhotosInList(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Include Passport Photos</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showParentPhoneInList}
                  onChange={e => setShowParentPhoneInList(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Parent Contact Phone</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSubjectsInList}
                  onChange={e => setShowSubjectsInList(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Enrolled Subjects Count</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSignatureCol}
                  onChange={e => setShowSignatureCol(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Official Signature / Marking Column</span>
              </label>
            </div>
          </div>

          {/* Printable Class Lists Render Area */}
          <div id="class-lists-print-container" className="space-y-8">
            {classListData.length === 0 || classListData.every(c => c.streams.every(s => s.studentList.length === 0)) ? (
              <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No Students Found for Selected Class &amp; Stream</h4>
                <p className="text-xs text-slate-500">
                  Try changing the class or stream filter, or enroll new students into {selectedClassListClass}.
                </p>
              </div>
            ) : (
              classListData.map(cEntry => {
                if (cEntry.streams.length === 0) return null;
                return (
                  <div key={cEntry.className} className="space-y-6">
                    {cEntry.streams.map(sEntry => {
                      if (sEntry.studentList.length === 0 && classListSearch.trim()) return null;
                      return (
                        <div
                          key={`${cEntry.className}-${sEntry.streamName}`}
                          className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs space-y-4 page-break-after-always"
                        >
                          {/* Class & Stream Nominal Roll Header */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-800">
                            <div className="flex items-center gap-3">
                              <HabyEduProLogo size="md" />
                              <div>
                                <h2 className="text-base font-black text-[#1f4d8b] uppercase tracking-wide">
                                  {schoolInfo?.name || 'HABYEDU PRO SCHOOLS'}
                                </h2>
                                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                                  <span>CLASS NOMINAL ROLL &amp; REGISTER:</span>
                                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-xs">
                                    {cEntry.className.toUpperCase()} - {sEntry.streamName.toUpperCase()}
                                  </span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                  Academic Session 2026/2027 • Accredited School Student Register
                                </p>
                              </div>
                            </div>

                            {/* Gender Statistics Summary Pill & Actions */}
                            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                              <div className="flex items-center gap-2">
                                <GenderSummary
                                  B={sEntry.boys}
                                  G={sEntry.girls}
                                  T={sEntry.total}
                                  total={students.length}
                                  size="xs"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 no-print">
                                <button
                                  type="button"
                                  onClick={() => exportClassListPDF({
                                    className: cEntry.className,
                                    streamName: sEntry.streamName,
                                    students: sEntry.studentList,
                                    schoolInfo,
                                    academicYear: '2026/2027'
                                  })}
                                  className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    let csv = 'S/N,Registration No,Student Full Name,Gender,Class,Stream,Parent Phone,Enrolled Subjects Count,Subjects Enrolled\n';
                                    sEntry.studentList.forEach((st, i) => {
                                      csv += `${i + 1},"${st.regNo || ''}","${st.name}","${st.gender || 'Male'}","${st.className || cEntry.className}","${st.stream || sEntry.streamName}","${st.parentPhone || st.phone || ''}",${st.subjects ? st.subjects.length : 0},"${(st.subjects || []).join('; ')}"\n`;
                                    });
                                    downloadFile(`${cEntry.className}_${sEntry.streamName}_Nominal_Roll.csv`, csv, 'text/csv;charset=utf-8');
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  <FileSpreadsheet className="w-3 h-3" />
                                  <span>CSV</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Nominal Roll Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
                                  <th className="p-2.5 border-r border-slate-700 w-10 text-center">#</th>
                                  {showPhotosInList && <th className="p-2.5 border-r border-slate-700 w-12 text-center">Photo</th>}
                                  <th className="p-2.5 border-r border-slate-700 w-28">Reg No</th>
                                  <th className="p-2.5 border-r border-slate-700">Student Full Name</th>
                                  <th className="p-2.5 border-r border-slate-700 w-14 text-center">Sex</th>
                                  {showParentPhoneInList && <th className="p-2.5 border-r border-slate-700 w-32">Parent Phone</th>}
                                  {showSubjectsInList && <th className="p-2.5 border-r border-slate-700 w-28 text-center">Subjects</th>}
                                  {showSignatureCol && <th className="p-2.5 border-r border-slate-700 w-44 text-center">Signature / Remarks</th>}
                                  <th className="p-2.5 text-center no-print w-24">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {sEntry.studentList.length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="p-6 text-center text-slate-400 italic font-medium">
                                      No students registered in {cEntry.className} ({sEntry.streamName}).
                                    </td>
                                  </tr>
                                ) : (
                                  sEntry.studentList.map((st, idx) => {
                                    const isGirl = (st.gender || '').toLowerCase().startsWith('f') || st.sex === 'F';
                                    return (
                                      <tr key={st.id || idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-500">
                                          {idx + 1}
                                        </td>
                                        {showPhotosInList && (
                                          <td className="p-2 border-r border-slate-200 text-center">
                                            {st.passportPhoto ? (
                                              <img
                                                src={st.passportPhoto}
                                                alt={st.name}
                                                className="w-8 h-10 object-cover rounded border border-slate-300 mx-auto"
                                              />
                                            ) : (
                                              <div className="w-8 h-10 bg-slate-100 rounded border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                                                <User className="w-3.5 h-3.5" />
                                              </div>
                                            )}
                                          </td>
                                        )}
                                        <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-blue-700">
                                          {st.regNo || `S${String(idx + 1).padStart(4, '0')}`}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 font-extrabold text-slate-800">
                                          {st.name}
                                        </td>
                                        <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                                          <span className={isGirl ? 'text-pink-600' : 'text-blue-600'}>
                                            {isGirl ? 'F' : 'M'}
                                          </span>
                                        </td>
                                        {showParentPhoneInList && (
                                          <td className="p-2.5 border-r border-slate-200 font-mono text-slate-700">
                                            {st.parentPhone || st.phone || '-'}
                                          </td>
                                        )}
                                        {showSubjectsInList && (
                                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-700">
                                            {st.subjects ? st.subjects.length : 0} Subjects
                                          </td>
                                        )}
                                        {showSignatureCol && (
                                          <td className="p-2.5 border-r border-slate-200">
                                            <div className="h-6 border-b border-dashed border-slate-300"></div>
                                          </td>
                                        )}
                                        <td className="p-2.5 text-center no-print">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => setViewingRecordStudent(st)}
                                              className="p-1 text-purple-600 hover:bg-purple-50 rounded cursor-pointer"
                                              title="View Record"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingStudent(st)}
                                              className="p-1 text-amber-600 hover:bg-amber-50 rounded cursor-pointer"
                                              title="Edit Student"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
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

                          {/* Print Sign-off Footer */}
                          <div className="pt-6 mt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
                            <div>
                              <p className="mb-8">Class Teacher Name &amp; Signature: _______________________</p>
                              <p className="text-slate-500 font-medium text-[11px]">Date: ____ / ____ / 2026</p>
                            </div>
                            <div className="text-right">
                              <p className="mb-8">Academic Master Signature &amp; Stamp: _______________________</p>
                              <p className="text-slate-500 font-medium text-[11px]">Official School Stamp</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PARENT DIRECTORY (WAZAZI NA WANAFUNZI WAO) */}
      {activeTab === 'parents_list' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-[#1f4d8b] flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Orodha ya Wazazi na Wanafunzi Wao (Parent Directory & Login Info)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Wazazi wote waliojisajili kupitia namba za simu wakati wa kusajili wanafunzi, pamoja na wanafunzi wao. Wazazi wanaweza kuingia kwenye Parent Portal kwa namba zao za simu.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                <tr>
                  <th className="p-3 border-r border-slate-200">#</th>
                  <th className="p-3 border-r border-slate-200">Parent / Guardian Name</th>
                  <th className="p-3 border-r border-slate-200">Parent Phone (Portal Login)</th>
                  <th className="p-3 border-r border-slate-200">Linked Student(s) Name</th>
                  <th className="p-3 border-r border-slate-200">Reg No</th>
                  <th className="p-3 border-r border-slate-200">Class & Stream</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const parentMap = new Map<string, { parentName: string; phone: string; students: any[] }>();
                  
                  // 1. First populate from students array
                  students.forEach(st => {
                    const phone = st.parentPhone || st.phone || (st as any).parent_phone || '';
                    if (!phone) return;
                    const pName = st.parentName || (st as any).parent_name || 'Mzazi / Mlezi';
                    const cleanPhone = phone.trim();
                    if (!parentMap.has(cleanPhone)) {
                      parentMap.set(cleanPhone, { parentName: pName, phone: cleanPhone, students: [] });
                    }
                    if (!parentMap.get(cleanPhone)?.students.some(s => s.id === st.id)) {
                      parentMap.get(cleanPhone)?.students.push(st);
                    }
                  });

                  // 2. Then merge from dbParents (loaded from parents table)
                  dbParents.forEach(dp => {
                    const phone = dp.phone || dp.phone_255 || '';
                    if (!phone) return;
                    const cleanPhone = phone.trim();
                    const pName = dp.parent_name || dp.full_name || dp.student_name || 'Mzazi / Mlezi';
                    
                    if (!parentMap.has(cleanPhone)) {
                      parentMap.set(cleanPhone, { parentName: pName, phone: cleanPhone, students: [] });
                    }
                    
                    // Unconditionally find and link students by CNO or parentPhone
                    const matchedSt = students.filter(st => 
                      (dp.student_cno && st.regNo?.toUpperCase().trim() === dp.student_cno.toUpperCase().trim()) ||
                      (st.parentPhone && st.parentPhone.trim() === cleanPhone)
                    );
                    matchedSt.forEach(st => {
                      if (!parentMap.get(cleanPhone)?.students.some(s => s.id === st.id)) {
                        parentMap.get(cleanPhone)?.students.push(st);
                      }
                    });
                  });

                  const parentsList = Array.from(parentMap.values());

                  if (parentsList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold italic">
                          Hakuna wazazi waliosajiliwa na namba za simu bado. Sajili mwanafunzi na uweke namba ya simu ya mzazi.
                        </td>
                      </tr>
                    );
                  }

                  return parentsList.map((p, idx) => (
                    <tr key={p.phone} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-500 text-center">{idx + 1}</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-900">{p.parentName}</td>
                      <td className="p-3 border-r border-slate-200 font-mono font-bold text-blue-600">{p.phone}</td>
                      <td className="p-3 border-r border-slate-200 font-semibold text-slate-800">
                        {p.students.length > 0 ? p.students.map(s => s.name).join(', ') : 'Hakuna mwanafunzi aliyeunganishwa'}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-mono text-slate-600">
                        {p.students.length > 0 ? p.students.map(s => s.regNo || '-').join(', ') : '-'}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-700">
                        {p.students.length > 0 ? p.students.map(s => `${s.className} (${s.stream || '-'})`).join('; ') : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(p.phone);
                            alert(`Namba ya simu ya mzazi ${p.phone} imekopiwa! Wanafunzi: ${p.students.map(s => s.name).join(', ')}`);
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Copy Phone / Login Info
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-slate-800">
                Edit Student Information ({editingStudent.regNo})
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-4 items-start">
              {/* Passport in edit modal */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-20 h-24 bg-slate-100 border border-slate-300 rounded overflow-hidden flex items-center justify-center">
                  {editingStudent.passportPhoto ? (
                    <img
                      src={editingStudent.passportPhoto}
                      alt={editingStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 mt-1 text-[9px] font-semibold text-slate-500">
                  <label className="text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5">
                    <Upload className="w-2.5 h-2.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handlePhotoUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraCaptureTarget('edit');
                      setIsCameraCaptureOpen(true);
                    }}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-0.5"
                  >
                    <Camera className="w-2.5 h-2.5 text-blue-600" />
                    Take Photo
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Class</label>
                    <select
                      value={editingStudent.className}
                      onChange={e => {
                        const newClass = e.target.value;
                        let newLevel: EducationLevel = editingStudent.level || 'CSEE';
                        if (NURSERY_CLASSES.includes(newClass)) newLevel = 'PRE_PRIMARY';
                        else if (PRIMARY_CLASSES.includes(newClass)) newLevel = 'PRIMARY';
                        else if (['Form 1', 'Form 2', 'Form 3', 'Form 4'].includes(newClass)) newLevel = 'CSEE';
                        else if (['Form 5', 'Form 6'].includes(newClass)) newLevel = 'ACSEE';
                        setEditingStudent({ ...editingStudent, className: newClass, level: newLevel });
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <optgroup label="Pre-Primary / Nursery">
                        {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Primary School (Std 1 - 7)">
                        {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Secondary School (Form 1 - 6)">
                        {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Stream</label>
                    <select
                      value={editingStudent.stream ? editingStudent.stream.replace(/^STREAM\s+/i, '') : 'A'}
                      onChange={e => setEditingStudent({ ...editingStudent, stream: `STREAM ${e.target.value}` })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {allRegisteredStreams.map((st: string) => (
                        <option key={st} value={st}>Stream {st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Gender</label>
                    <select
                      value={editingStudent.gender}
                      onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Parent / Guardian Full Name</label>
                  <input
                    type="text"
                    value={editingStudent.parentName || (editingStudent as any).parent_name || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, parentName: e.target.value } as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <PhoneInputPlugin
                    value={editingStudent.parentPhone || editingStudent.phone || ''}
                    onChange={val => setEditingStudent({ ...editingStudent, parentPhone: val, phone: val })}
                    label="Parent / Guardian Phone Number"
                    studentName={editingStudent.name}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editingStudent.dob || '2010-01-01'}
                    onChange={e => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateStudent(editingStudent);
                  setEditingStudent(null);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360° Read-Only Student Dashboard Modal with Recharts */}
      <StudentDashboardModal
        isOpen={!!viewingRecordStudent}
        onClose={() => setViewingRecordStudent(null)}
        student={viewingRecordStudent}
        schoolInfo={schoolInfo}
        dailyAttendance={dailyAttendance}
        disciplineRecords={disciplineRecords}
        allStudentsInClass={students}
        onNavigateToDiscipline={onNavigateToDiscipline}
        examinationRecords={examinationRecords}
      />

      {/* Multiple Subject Enrollment Modal */}
      {showBulkEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-blue-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Multiple Subject Enrollment ({selectedStudentIds.length} Students)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select subjects to enroll all {selectedStudentIds.length} selected candidates. Existing enrollments are preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkEnrollModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Core Buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Quick Add Core Curriculum:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Basic Mathematics', 'English Language', 'Kiswahili', 'Biology', 
                  'Chemistry', 'Physics', 'Geography', 'History', 'Civics', 
                  'ICT / TEHAMA', 'Commerce', 'Book Keeping'
                ].map(sub => {
                  const isChecked = bulkEnrollSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        setBulkEnrollSubjects(prev => 
                          prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isChecked 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? `✓ ${sub}` : `+ ${sub}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Subjects Badges */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1.5">
              <div className="text-[11px] font-bold text-blue-900 uppercase">
                Subjects to Enroll ({bulkEnrollSubjects.length} selected):
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                {bulkEnrollSubjects.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No subjects selected yet. Click from above or search below.</span>
                ) : (
                  bulkEnrollSubjects.map(sub => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => setBulkEnrollSubjects(prev => prev.filter(s => s !== sub))}
                        className="hover:text-rose-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkEnrollModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkEnroll}
                disabled={bulkEnrollSubjects.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Enrollment for {selectedStudentIds.length} Students</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Subject Deletion / Unenroll Modal */}
      {showBulkRemoveSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-amber-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Multiple Subject Delete ({selectedStudentIds.length} Students)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select subjects to permanently unenroll/delete from the {selectedStudentIds.length} selected candidates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkRemoveSubjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Common enrolled subjects across selected students */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Select Subjects to Remove:</div>
              <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                {Array.from(new Set(selectedStudentsList.flatMap(s => s.subjects || []))).map(sub => {
                  const isChecked = bulkRemoveSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        setBulkRemoveSubjects(prev => 
                          prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isChecked 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? `✓ Remove ${sub}` : sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Removing a subject unenrolls the candidate from that subject ledger and removes any stored score for that subject.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkRemoveSubjectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkRemoveSubjects}
                disabled={bulkRemoveSubjects.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove ({bulkRemoveSubjects.length}) Subjects</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-rose-100 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete {selectedStudentIds.length} Registered Student{selectedStudentIds.length > 1 ? 's' : ''}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You are about to remove multiple student records from the accredited school register.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Alert */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Permanent Deletion Warning:</strong>
                <p className="text-rose-700 mt-0.5">
                  This will permanently delete all {selectedStudentIds.length} selected students along with their examination marks, subject enrolments, and attendance history. This action cannot be recovered.
                </p>
              </div>
            </div>

            {/* Selected Students Preview List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span>Selected Candidates to Remove ({selectedStudentsList.length})</span>
                <span>{schoolInfo?.name || 'School Register'}</span>
              </div>
              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                {selectedStudentsList.map((st, i) => (
                  <div key={st.id} className="p-2 flex items-center justify-between gap-3 text-xs bg-white rounded-lg my-0.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono text-slate-400 w-5 text-right">{i + 1}.</span>
                      {st.passportPhoto ? (
                        <img src={st.passportPhoto} alt={st.name} className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 text-[10px] font-bold border border-slate-200">
                          {st.name.charAt(0)}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">{st.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {st.regNo || 'No RegNo'} • {st.className} {st.stream || st.combination || ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {st.gender}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel & Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Permanently Delete ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Student CSV Import Modal with Phone Validation */}
      <StudentCsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        onImportStudents={newBatch => {
          if (onBulkAddStudents) {
            onBulkAddStudents(newBatch);
          } else {
            newBatch.forEach(s => onAddStudent(s));
          }
          setActiveTab('register_list');
          setStudentCreatedNotice(`Imported ${newBatch.length} students successfully with verified phone numbers!`);
          setTimeout(() => setStudentCreatedNotice(null), 6000);
        }}
        existingStudentsCount={students.length}
        schoolInfo={schoolInfo}
      />

      {/* Class & Stream Manager Modal */}
      <ClassStreamManagerModal
        isOpen={isClassStreamModalOpen}
        onClose={() => setIsClassStreamModalOpen(false)}
        streamSettings={streamSettings}
        onUpdateStreamSettings={newSettings => {
          if (onUpdateStreamSettings) {
            onUpdateStreamSettings(newSettings);
          }
        }}
        students={students}
      />

      {/* Student QR Camera Scanner Modal */}
      <StudentQrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        students={students}
        schoolInfo={schoolInfo}
        onViewStudentProfile={st => {
          setViewingRecordStudent(st);
          setIsQrScannerOpen(false);
        }}
        onLogDiscipline={st => {
          setViewingRecordStudent(st);
          setIsQrScannerOpen(false);
        }}
        onLogAttendance={(studentId, status) => {
          const today = new Date().toISOString().split('T')[0];
          const todayRecords = { ...(dailyAttendance[today] || {}), [studentId]: status };
          if (onSaveDailyAttendance) {
            onSaveDailyAttendance(today, todayRecords);
          }
          const st = students.find(s => s.id === studentId);
          if (st) {
            setStudentCreatedNotice(`Attendance recorded: ${st.name} marked as ${status} for today.`);
            setTimeout(() => setStudentCreatedNotice(null), 5000);
          }
        }}
      />

      {/* Bulk Student Academic Promotion Wizard */}
      <BulkPromotionWizard
        isOpen={isPromotionWizardOpen}
        onClose={() => setIsPromotionWizardOpen(false)}
        students={students}
        schoolInfo={schoolInfo}
        onExecutePromotion={(promotedStudents, historyLogs) => {
          if (onExecutePromotion) {
            onExecutePromotion(promotedStudents, historyLogs);
          } else if (onUpdateStudents) {
            onUpdateStudents(promotedStudents);
          } else {
            promotedStudents.forEach(s => onUpdateStudent(s));
          }
          setStudentCreatedNotice(`Successfully promoted ${historyLogs.length} students to their next grade level!`);
          setTimeout(() => setStudentCreatedNotice(null), 6000);
        }}
      />

      {/* Reusable Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraCaptureOpen}
        onClose={() => setIsCameraCaptureOpen(false)}
        onCapture={(photoDataUrl) => {
          if (cameraCaptureTarget === 'register') {
            setPassportPhoto(photoDataUrl);
          } else if (cameraCaptureTarget === 'edit' && editingStudent) {
            setEditingStudent({ ...editingStudent, passportPhoto: photoDataUrl });
          }
        }}
      />
    </div>
  );
};
