import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Award, 
  Printer, 
  CheckCircle, 
  FileText, 
  Edit3, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Layers, 
  Layout, 
  Clock, 
  UserCheck, 
  GraduationCap, 
  Heart, 
  Eye, 
  BookOpen, 
  AlertCircle, 
  Users, 
  CalendarCheck, 
  Calculator, 
  Download, 
  Save, 
  Search, 
  RotateCcw,
  Sliders,
  Upload,
  Trash2,
  CheckSquare,
  Square,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
  BarChart3,
  Smartphone
} from 'lucide-react';
import { Student, SchoolInfo, UserAccount, Exam, ExaminationRecord, Teacher, UsalRecord, ExamTerm, RecordExamType } from '../types';
import { printReportCardDocument } from '../utils/export';
import { exportGradeDistributionAndPerformancePDF } from '../utils/performancePdfExport';
import { ReportCardDocument } from './ReportCard/ReportCardDocument';
import { EditReportCardModal } from './ReportCard/EditReportCardModal';
import { StudentComparisonView } from './StudentComparisonView';
import { ExamDocumentsModal } from './Exams/ExamDocumentsModal';
import { GradeCutoffModal } from './Exams/GradeCutoffModal';
import { USALModal } from './USAL/USALModal';
import { calculateNectaLevelResults } from '../utils/nectaRules';
import { buildExaminationRecord } from '../utils/examinationRecordsUtils';
import { 
  calculatePerformanceSummary, 
  generateCharacterFromPerformance, 
  getDefaultPeriodSetting,
  calculateOLevelDivision,
  calculatePrimaryScoreResult,
  isPrimaryOrNursery,
  getPrimarySubjectGradeInfo,
  cleanAndFilterMarksForClass,
  isSameClass
} from '../utils/reportCardUtils';
import { 
  ALL_SCHOOL_CLASSES, 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../constants/defaults';

interface ResultsViewProps {
  students: Student[];
  resultsStatus: 'active' | 'inactive';
  schoolInfo: SchoolInfo;
  onUpdateStudent: (student: Student) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onToggleResultsStatus: (status: 'active' | 'inactive') => void;
  currentUser?: UserAccount | null;
  onNavigateToAttendance?: () => void;
  exams?: Exam[];
  examinationRecords?: ExaminationRecord[];
  onAutoSaveExaminationRecords?: (records: ExaminationRecord[]) => void;
  onReleaseResultsToRecords?: (records: ExaminationRecord[], className: string, examName: string) => Promise<void> | void;
  onNavigateToExamRecords?: () => void;
  onNavigateToSms?: () => void;
  usalRecords?: UsalRecord[];
  onSaveUsalRecord?: (record: UsalRecord) => void;
  onNavigateToMarkEntry?: (examName?: string, className?: string) => void;
  teachers?: Teacher[];
  ledgerSubjectKeys?: string[];
  onUpdateLedgerSubjectKeys?: (keys: string[]) => void;
}

// Complete list of available Tanzanian subjects across Nursery, Primary, Secondary and High School
export interface LedgerSubjectItem {
  key: string;
  label: string;
  fullName: string;
  category: 'Core' | 'Languages' | 'Sciences' | 'Social' | 'Commercial' | 'Technical' | 'Religion' | 'Arts';
  level: 'SECONDARY' | 'PRIMARY' | 'NURSERY';
}

export const ALL_AVAILABLE_SUBJECTS: LedgerSubjectItem[] = [
  // Primary & Pre-Primary Tanzanian Subjects
  { key: 'KISW', label: 'KISW', fullName: 'Kiswahili', category: 'Languages', level: 'PRIMARY' },
  { key: 'ENG.PRI', label: 'ENG', fullName: 'English Language (Primary)', category: 'Languages', level: 'PRIMARY' },
  { key: 'HISABATI', label: 'HIS', fullName: 'Hisabati (Mathematics)', category: 'Core', level: 'PRIMARY' },
  { key: 'SAYANSI', label: 'SAY', fullName: 'Sayansi na Teknolojia', category: 'Sciences', level: 'PRIMARY' },
  { key: 'JAMII', label: 'JAMII', fullName: 'Maarifa ya Jamii', category: 'Social', level: 'PRIMARY' },
  { key: 'URAIA', label: 'URAIA', fullName: 'Uraia na Maadili', category: 'Core', level: 'PRIMARY' },
  { key: 'STADI', label: 'STADI', fullName: 'Stadi za Kazi', category: 'Technical', level: 'PRIMARY' },
  { key: 'EDK', label: 'EDK', fullName: 'Elimu ya Dini ya Kiislamu', category: 'Religion', level: 'PRIMARY' },
  { key: 'EDKRI', label: 'EDKRI', fullName: 'Elimu ya Dini ya Kikristo', category: 'Religion', level: 'PRIMARY' },
  { key: 'TEHAMA', label: 'TEHAMA', fullName: 'TEHAMA (ICT)', category: 'Technical', level: 'PRIMARY' },
  { key: 'KUSOMA', label: 'KUSOMA', fullName: 'Kusoma', category: 'Languages', level: 'PRIMARY' },
  { key: 'KUANDIKA', label: 'KUANDIKA', fullName: 'Kuandika', category: 'Languages', level: 'PRIMARY' },
  { key: 'KUHESABU', label: 'KUHESABU', fullName: 'Kuhesabu', category: 'Core', level: 'PRIMARY' },
  { key: 'AFYA', label: 'AFYA', fullName: 'Afya na Mazingira', category: 'Sciences', level: 'PRIMARY' },
  { key: 'SANAA', label: 'SANAA', fullName: 'Sanaa na Michezo', category: 'Arts', level: 'PRIMARY' },
  { key: 'MIKONDO.PRI', label: 'MIK', fullName: 'Mikondo', category: 'Core', level: 'PRIMARY' },
  { key: 'AWALI.NUM', label: 'NUM', fullName: 'Kuhesabu na Namba (Awali)', category: 'Core', level: 'NURSERY' },
  { key: 'AWALI.LIT', label: 'LIT', fullName: 'Kusoma na Kuwasiliana (Awali)', category: 'Languages', level: 'NURSERY' },
  { key: 'AWALI.ENG', label: 'ENG.A', fullName: 'Lugha ya Kiingereza ya Awali', category: 'Languages', level: 'NURSERY' },
  { key: 'AWALI.ENV', label: 'ENV', fullName: 'Afya na Mazingira ya Mtoto', category: 'Sciences', level: 'NURSERY' },
  { key: 'AWALI.ART', label: 'ART', fullName: 'Sanaa, Muziki na Michezo ya Awali', category: 'Arts', level: 'NURSERY' },
  { key: 'AWALI.SOC', label: 'SOC', fullName: 'Maadili na Malezi Bora', category: 'Social', level: 'NURSERY' },

  // Secondary School Subjects (O-Level & A-Level)
  { key: 'ENG', label: 'ENG', fullName: 'English Language', category: 'Languages', level: 'SECONDARY' },
  { key: 'KIS', label: 'KIS', fullName: 'Kiswahili', category: 'Languages', level: 'SECONDARY' },
  { key: 'B.MATH', label: 'B.MATH', fullName: 'Basic Mathematics', category: 'Core', level: 'SECONDARY' },
  { key: 'CIV', label: 'CIV', fullName: 'Civics', category: 'Core', level: 'SECONDARY' },
  { key: 'GEO', label: 'GEO', fullName: 'Geography', category: 'Social', level: 'SECONDARY' },
  { key: 'HIS', label: 'HIS', fullName: 'History', category: 'Social', level: 'SECONDARY' },
  { key: 'BIO', label: 'BIO', fullName: 'Biology', category: 'Sciences', level: 'SECONDARY' },
  { key: 'CHE', label: 'CHE', fullName: 'Chemistry', category: 'Sciences', level: 'SECONDARY' },
  { key: 'PHY', label: 'PHY', fullName: 'Physics', category: 'Sciences', level: 'SECONDARY' },
  { key: 'BUS', label: 'BUS', fullName: 'Business Studies', category: 'Commercial', level: 'SECONDARY' },
  { key: 'B.KEEP', label: 'B.KEEP', fullName: 'Book Keeping', category: 'Commercial', level: 'SECONDARY' },
  { key: 'COMM', label: 'COMM', fullName: 'Commerce', category: 'Commercial', level: 'SECONDARY' },
  { key: 'COMP', label: 'COMP', fullName: 'Computer Studies', category: 'Technical', level: 'SECONDARY' },
  { key: 'AGRI', label: 'AGRI', fullName: 'Agriculture', category: 'Technical', level: 'SECONDARY' },
  { key: 'F.ART', label: 'F.ART', fullName: 'Fine Art', category: 'Arts', level: 'SECONDARY' },
  { key: 'H.TZ', label: 'H.TZ', fullName: 'Historia Ya Tanzania Na Maadili', category: 'Social', level: 'SECONDARY' },
  { key: 'E.DINI', label: 'E.DINI', fullName: 'Elimu ya Dini ya Kiislamu', category: 'Religion', level: 'SECONDARY' },
  { key: 'CRE', label: 'CRE', fullName: 'Christian Religious Education', category: 'Religion', level: 'SECONDARY' },
  { key: 'LIT', label: 'LIT', fullName: 'Literature in English', category: 'Languages', level: 'SECONDARY' },
  { key: 'FRE', label: 'FRE', fullName: 'French', category: 'Languages', level: 'SECONDARY' },
  { key: 'ARA', label: 'ARA', fullName: 'Arabic', category: 'Languages', level: 'SECONDARY' },
  { key: 'PE', label: 'PE', fullName: 'Physical Education', category: 'Arts', level: 'SECONDARY' },
  { key: 'MIKONDO', label: 'MIK', fullName: 'Mikondo', category: 'Core', level: 'SECONDARY' }
];

export const DEFAULT_ACTIVE_SUBJECT_KEYS = [
  'ENG', 'KIS', 'B.MATH', 'GEO', 'HIS', 'BIO', 'CHE', 'PHY', 'CIV', 'MIKONDO'
];

export const PRIMARY_UPPER_SUBJECT_KEYS = [
  'KISW', 'ENG.PRI', 'HISABATI', 'SAYANSI', 'JAMII', 'URAIA', 'EDK'
];

export const PRIMARY_LOWER_SUBJECT_KEYS = [
  'KUSOMA', 'KUANDIKA', 'KUHESABU', 'AFYA', 'SANAA'
];

export const NURSERY_SUBJECT_KEYS = [
  'AWALI.NUM', 'AWALI.LIT', 'AWALI.ENG', 'AWALI.ENV', 'AWALI.ART', 'AWALI.SOC'
];

export const ResultsView: React.FC<ResultsViewProps> = ({
  students,
  resultsStatus,
  schoolInfo,
  onUpdateStudent,
  onUpdateStudents,
  onToggleResultsStatus,
  currentUser,
  onNavigateToAttendance,
  exams = [],
  examinationRecords = [],
  onAutoSaveExaminationRecords,
  onReleaseResultsToRecords,
  onNavigateToExamRecords,
  onNavigateToSms,
  usalRecords = [],
  onSaveUsalRecord,
  onNavigateToMarkEntry,
  teachers = [],
  ledgerSubjectKeys: initialLedgerSubjectKeys = [],
  onUpdateLedgerSubjectKeys
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'dashboard' | 'reportcard' | 'comparison'>('ledger');
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedExam, setSelectedExam] = useState<string>('Midterm I');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState<boolean>(false);
  const [isEditMarksMode, setIsEditMarksMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SAT' | 'NO_SUBJECT'>('ALL');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalExamId, setDocModalExamId] = useState<number | undefined>(undefined);
  const [isCutoffModalOpen, setIsCutoffModalOpen] = useState(false);
  const [isUsalModalOpen, setIsUsalModalOpen] = useState(false);

  // Handle inline teacher remarks on candidate
  const handleUpdateStudentRemarks = (studentId: number, remarks: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const updated: Student = {
      ...student,
      reportCardData: {
        ...student.reportCardData,
        classTeacherRemarks: remarks
      }
    };
    onUpdateStudent(updated);
  };

  // Dynamic list of exams: exam created in Exams tab appears in Academic tab!
  const allAvailableExams = useMemo(() => {
    const list: { name: string; isRegistered?: boolean; level?: string }[] = [];
    const seen = new Set<string>();

    // 1. Registered exams created in Exams tab
    exams.forEach(e => {
      if (e.name && !seen.has(e.name)) {
        seen.add(e.name);
        list.push({ name: e.name, isRegistered: true, level: e.level });
      }
    });

    // 2. Default academic examination sessions
    const defaults = [
      'Midterm I',
      'Terminal',
      'Annual',
      'Midterm II',
      'Pre-Mock',
      'Mock',
      'SFNA Final (Std IV)',
      'PSLE Final (Std VII)',
      'FTNA Final (Form II)',
      'NECTA Final (Form IV CSEE)',
      'ACSEE Final (Form VI)'
    ];
    defaults.forEach(d => {
      if (!seen.has(d)) {
        seen.add(d);
        list.push({ name: d, isRegistered: false });
      }
    });
    return list;
  }, [exams]);

  // Selected student for Report Card tab
  const [selectedStudentReg, setSelectedStudentReg] = useState<string>(students[0]?.regNo || '');
  const [reportOrientation, setReportOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);

  // Dynamic streams collected from all registered classes and streams
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    // 1. Collect from students
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    // 2. Pre-Primary & Nursery registered streams
    ['Baby Class A', 'Baby Class B', 'Middle Class A', 'Middle Class B', 'Pre-Unit A', 'Pre-Unit B'].forEach(st => set.add(st));
    // 3. Primary Std 1A - 7C registered streams
    for (let std = 1; std <= 7; std++) {
      ['A', 'B', 'C'].forEach(letter => set.add(`Std ${std}${letter}`));
    }
    // 4. Secondary Form 1A - 4B registered streams
    for (let f = 1; f <= 4; f++) {
      ['A', 'B'].forEach(letter => set.add(`Form ${f}${letter}`));
    }
    // 5. High School combinations
    ['PCM', 'PCB', 'HGE', 'HKL', 'EGM', 'CBG'].forEach(c => set.add(c));
    // 6. Generic single letter stream options
    ['A', 'B', 'C', 'D', 'E'].forEach(st => set.add(st));
    return Array.from(set);
  }, [students]);

  // Local Search & Filter state

  // Modal and batch management states
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [bulkClearTarget, setBulkClearTarget] = useState<'ALL' | string>('ALL');
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState<string>('ALL');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');

  // CSV Upload file handling state
  const [uploadCsvFile, setUploadCsvFile] = useState<File | null>(null);
  const [uploadParsedRows, setUploadParsedRows] = useState<{
    matched: boolean;
    studentName?: string;
    regNo: string;
    scores: Record<string, number>;
  }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load customized subjects from props
  const [selectedSubjectKeys, setSelectedSubjectKeys] = useState<string[]>(initialLedgerSubjectKeys || []);

  useEffect(() => {
    if (initialLedgerSubjectKeys && initialLedgerSubjectKeys.length > 0) {
      setSelectedSubjectKeys(initialLedgerSubjectKeys);
    }
  }, [initialLedgerSubjectKeys]);

  // Save customized subjects via callback
  const handleSaveSubjectKeys = (keys: string[]) => {
    setSelectedSubjectKeys(keys);
    if (onUpdateLedgerSubjectKeys) {
      onUpdateLedgerSubjectKeys(keys);
    }
  };

  const isClassPrimary = isPrimaryOrNursery(undefined, selectedClass);
  const isClassNursery = NURSERY_CLASSES.includes(selectedClass);
  const currentSectionLevel: 'SECONDARY' | 'PRIMARY' | 'NURSERY' = isClassNursery 
    ? 'NURSERY' 
    : isClassPrimary 
    ? 'PRIMARY' 
    : 'SECONDARY';

  // Restrict ledger columns for Teacher role to only their registered/assigned subjects, or user customization
  const activeLedgerSubjects = useMemo(() => {
    // 1. Strictly filter by current class educational level
    const levelSubjects = ALL_AVAILABLE_SUBJECTS.filter(sub => sub.level === currentSectionLevel);

    if (currentUser?.role === 'TEACHER') {
      const assigned = currentUser.assignedSubjects || [];
      if (assigned.length > 0) {
        const teacherSubs = levelSubjects.filter(sub =>
          assigned.some(a =>
            a.toLowerCase() === sub.fullName.toLowerCase() ||
            a.toLowerCase() === sub.key.toLowerCase() ||
            sub.fullName.toLowerCase().includes(a.toLowerCase()) ||
            a.toLowerCase().includes(sub.fullName.toLowerCase())
          )
        );
        if (teacherSubs.length > 0) return teacherSubs;
      }
    }

    const filtered = levelSubjects.filter(sub => selectedSubjectKeys.includes(sub.key));
    if (filtered.length > 0) return filtered;

    if (currentSectionLevel === 'SECONDARY') {
      return levelSubjects.filter(s => DEFAULT_ACTIVE_SUBJECT_KEYS.includes(s.key));
    } else if (currentSectionLevel === 'PRIMARY') {
      if (selectedClass === 'Standard 1' || selectedClass === 'Standard 2') {
        return levelSubjects.filter(s => PRIMARY_LOWER_SUBJECT_KEYS.includes(s.key));
      }
      return levelSubjects.filter(s => PRIMARY_UPPER_SUBJECT_KEYS.includes(s.key));
    } else {
      return levelSubjects.filter(s => NURSERY_SUBJECT_KEYS.includes(s.key));
    }
  }, [currentUser, selectedSubjectKeys, currentSectionLevel, selectedClass]);

  // Local pending marks: studentId -> { [subjectKey]: score }
  const [pendingMarks, setPendingMarks] = useState<Record<number, Record<string, number | string>>>({});

  // Sync selected student for report card
  useEffect(() => {
    if (students.length > 0 && !selectedStudentReg) {
      setSelectedStudentReg(students[0].regNo);
    }
  }, [students, selectedStudentReg]);

  // Check if candidate has attempted at least 1 subject
  const hasStudentAttemptedAnySubject = (student: Student, pending?: Record<string, any>): boolean => {
    if (pending) {
      const hasPending = Object.values(pending).some(v => v !== '' && v !== undefined && v !== null && !isNaN(Number(v)));
      if (hasPending) return true;
    }
    if (!student.marks) return false;
    const validScores = Object.values(student.marks).filter(v => v !== undefined && v !== null && typeof v === 'number' && !isNaN(v));
    return validScores.length > 0;
  };

  // Base list of all candidates in this class and stream (unfiltered by search/status for accurate stats)
  const allClassCandidates = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass && selectedClass !== 'ALL'
        ? isSameClass(s.className, selectedClass)
        : true;
      const matchStream = !selectedStream || selectedStream === 'All' || 
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      return matchClass && matchStream;
    });
  }, [students, selectedClass, selectedStream]);

  // Filter students for the ledger matching Class, Stream, Search, and Status (Sat vs Didn't do any subject)
  const classCandidates = useMemo(() => {
    return allClassCandidates.filter(s => {
      const matchSearch = !searchQuery || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.regNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const attempted = hasStudentAttemptedAnySubject(s, pendingMarks[s.id]);
      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'SAT' && attempted) ||
        (statusFilter === 'NO_SUBJECT' && !attempted);

      return matchSearch && matchStatus;
    });
  }, [allClassCandidates, searchQuery, statusFilter, pendingMarks]);

  // Multi-select handlers
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.length === classCandidates.length && classCandidates.length > 0) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(classCandidates.map(c => c.id));
    }
  };

  const handleToggleSelectCandidate = (id: number) => {
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getScore = (student: Student, subjectFullName: string, subjectKey: string): number | string => {
    if (pendingMarks[student.id] && pendingMarks[student.id][subjectKey] !== undefined) {
      return pendingMarks[student.id][subjectKey];
    }
    if (!student.marks) return '';

    // Direct match on fullName or key
    if (student.marks[subjectFullName] !== undefined) return student.marks[subjectFullName];
    if (student.marks[subjectKey] !== undefined) return student.marks[subjectKey];

    // Deduplicated alias matching for Secondary
    if (subjectKey === 'B.MATH') {
      return student.marks['Basic Mathematics'] ?? student.marks['Mathematics'] ?? student.marks['Maths'] ?? '';
    }
    if (subjectKey === 'ENG') {
      return student.marks['English Language'] ?? student.marks['English'] ?? '';
    }
    if (subjectKey === 'KIS') {
      return student.marks['Kiswahili'] ?? student.marks['KISW'] ?? '';
    }
    if (subjectKey === 'HISABATI') {
      return student.marks['Hisabati (Mathematics)'] ?? student.marks['Hisabati'] ?? student.marks['Mathematics (Hisabati)'] ?? '';
    }
    if (subjectKey === 'ENG.PRI') {
      return student.marks['English Language (Primary)'] ?? student.marks['English Language'] ?? '';
    }
    if (subjectKey === 'SAYANSI') {
      return student.marks['Sayansi na Teknolojia'] ?? student.marks['Science and Technology (Sayansi na Teknolojia)'] ?? student.marks['Science'] ?? '';
    }
    if (subjectKey === 'JAMII') {
      return student.marks['Maarifa ya Jamii'] ?? student.marks['Social Studies (Maarifa ya Jamii)'] ?? student.marks['Social Studies'] ?? '';
    }
    if (subjectKey === 'URAIA') {
      return student.marks['Uraia na Maadili'] ?? student.marks['Civic and Moral Education (Uraia na Maadili)'] ?? '';
    }
    if (subjectKey === 'MIKONDO' || subjectKey === 'MIKONDO.PRI') {
      return student.marks['Mikondo'] ?? '';
    }

    return '';
  };

  const handleCellChange = (studentId: number, subjectKey: string, val: string) => {
    const num = val === '' ? '' : Math.min(100, Math.max(0, parseInt(val, 10) || 0));
    setPendingMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectKey]: num
      }
    }));
  };

  const handleCalculateAll = () => {
    // Recompute total, average, division and ranking for all candidates in this class
    const updatedCandidates = classCandidates.map(s => {
      const p = pendingMarks[s.id] || {};
      const rawMarks = { ...(s.marks || {}) };

      activeLedgerSubjects.forEach(sub => {
        if (p[sub.key] !== undefined) {
          if (p[sub.key] === '') {
            delete rawMarks[sub.fullName];
            delete rawMarks[sub.key];
            if (sub.key === 'B.MATH') delete rawMarks['Mathematics'];
          } else {
            rawMarks[sub.fullName] = Number(p[sub.key]);
            if (sub.key === 'B.MATH') {
              rawMarks['Basic Mathematics'] = Number(p[sub.key]);
              delete rawMarks['Mathematics'];
            }
          }
        }
      });

      const newMarks = cleanAndFilterMarksForClass(rawMarks, s.className || selectedClass, s.level);
      const scores = Object.values(newMarks).filter(v => typeof v === 'number' && !isNaN(v as number)) as number[];
      
      // Official NECTA National Evaluation Rules according to class level (Std IV, Std VII, Form II, Form IV, Form VI)
      const nectaRes = calculateNectaLevelResults(newMarks, s.className || selectedClass);

      return {
        ...s,
        marks: newMarks,
        total: nectaRes.total,
        average: scores.length > 0 ? String(nectaRes.average) : undefined,
        primaryGrade: nectaRes.isPrimary ? (nectaRes.overallGrade as any) : undefined,
        passStatus: nectaRes.remarks,
        division: nectaRes.division
      };
    });

    // Rank candidates
    const sorted = [...updatedCandidates].sort((a, b) => (b.total || 0) - (a.total || 0));
    const rankedMap = new Map<number, number>();
    sorted.forEach((s, idx) => {
      rankedMap.set(s.id, idx + 1);
    });

    const finalStudents = students.map(s => {
      const found = updatedCandidates.find(u => u.id === s.id);
      if (found) {
        return {
          ...found,
          reportCardData: {
            ...(found.reportCardData || {}),
            positionInClass: rankedMap.get(found.id),
            totalStudentsInClass: updatedCandidates.length
          }
        };
      }
      return s;
    });

    if (onUpdateStudents) {
      onUpdateStudents(finalStudents);
    } else {
      finalStudents.forEach(s => onUpdateStudent(s));
    }

    // Auto-save/upsert calculated results to Examination Records ledger
    if (onAutoSaveExaminationRecords) {
      const currentYear = selectedYear || new Date().getFullYear().toString();
      const termName = (selectedTerm || 'Term 1') as ExamTerm;
      const examName = (selectedExam || 'Terminal') as RecordExamType;
      const newExamRecords: ExaminationRecord[] = finalStudents
        .filter(s => updatedCandidates.some(u => u.id === s.id))
        .map(c => {
          return buildExaminationRecord(
            c,
            currentYear,
            termName,
            examName,
            updatedCandidates.length
          );
        });

      const existing = examinationRecords || [];
      const updatedMap = new Map<string, ExaminationRecord>();
      existing.forEach(r => updatedMap.set(r.id, r));
      newExamRecords.forEach(r => updatedMap.set(r.id, r));

      onAutoSaveExaminationRecords(Array.from(updatedMap.values()));
    }

    setPendingMarks({});
    setSaveToast(`Calculated totals, averages, NECTA rankings & auto-saved to Examination Records ledger (${selectedTerm} - ${selectedYear}) for ${updatedCandidates.length} candidates!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  const handleSaveMarks = () => {
    handleCalculateAll();
  };

  const handleInitiateRelease = () => {
    const streamTag = selectedStream !== 'All' ? selectedStream.replace(/^STREAM\s+/i, '') : '';
    const classStreamStr = `${selectedClass}${streamTag ? ` ${streamTag}` : ''}`;
    const examYear = selectedYear || '2026';
    const examTerm = selectedTerm || 'Term 1';
    const examName = selectedExam || 'Terminal';

    handleExecuteRelease(classStreamStr, examYear, examTerm, examName);
  };

  const handleExecuteRelease = async (classStreamStr: string, examYear: string, examTerm: string, examName: string) => {
    setIsReleasing(true);
    try {
      // 1. Recompute latest marks to ensure calculations are fresh
      handleCalculateAll();

      // 2. Build complete ExaminationRecords for all candidates in this class/stream
      const currentYear = examYear;
      const termName = examTerm as ExamTerm;
      const typeName = examName as RecordExamType;
      
      const recordsToRelease: ExaminationRecord[] = classCandidates.map(c => {
        return buildExaminationRecord(
          c,
          currentYear,
          termName,
          typeName,
          classCandidates.length
        );
      });

      // 3. Push/copy to Examination Records collection
      if (onReleaseResultsToRecords) {
        await onReleaseResultsToRecords(recordsToRelease, selectedClass, examName);
      } else if (onAutoSaveExaminationRecords) {
        onAutoSaveExaminationRecords(recordsToRelease);
      }

      setSaveToast(`Results successfully released! ${recordsToRelease.length} examination records for ${classStreamStr} transferred to Examination Records.`);
      setTimeout(() => {
        setSaveToast(null);
        if (onNavigateToExamRecords) {
          onNavigateToExamRecords();
        }
      }, 1500);
    } catch (e) {
      console.error("Error releasing results:", e);
      setSaveToast("Error releasing results to records. Please try again.");
    } finally {
      setIsReleasing(false);
    }
  };

  // CSV Template Export (with clean or pre-filled marks)
  const handleDownloadCsvTemplate = (withExistingMarks = false) => {
    const headers = [
      'REG NO', 
      'FULL NAME', 
      'SEX', 
      'CLASS', 
      'STREAM', 
      ...activeLedgerSubjects.map(s => s.key)
    ];
    const rows = [headers];

    classCandidates.forEach(s => {
      const subjectCols = activeLedgerSubjects.map(sub => {
        if (!withExistingMarks) return '';
        const sc = getScore(s, sub.fullName, sub.key);
        return sc === '' ? '' : String(sc);
      });

      rows.push([
        s.regNo,
        s.name,
        s.gender ? (s.gender === 'Female' ? 'F' : 'M') : '',
        s.className,
        s.stream || 'A',
        ...subjectCols
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Marks_Template_${selectedClass}_${selectedStream}_${selectedExam}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Batch Delete Marks for selected candidates
  const handleBulkDeleteMarks = () => {
    if (selectedCandidateIds.length === 0) return;
    const count = selectedCandidateIds.length;
    const targetLabel = bulkClearTarget === 'ALL' 
      ? 'ALL subject marks' 
      : `marks for ${ALL_AVAILABLE_SUBJECTS.find(s => s.key === bulkClearTarget)?.fullName || bulkClearTarget}`;

    const updated = students.map(s => {
      if (!selectedCandidateIds.includes(s.id)) return s;
      const newMarks = { ...(s.marks || {}) };
      
      if (bulkClearTarget === 'ALL') {
        return {
          ...s,
          marks: {},
          total: undefined,
          average: undefined,
          division: undefined
        };
      } else {
        const targetSub = ALL_AVAILABLE_SUBJECTS.find(x => x.key === bulkClearTarget);
        if (targetSub) {
          delete newMarks[targetSub.fullName];
          delete newMarks[targetSub.key];
        }
        const scores = Object.values(newMarks).filter(v => typeof v === 'number' && !isNaN(v as number)) as number[];
        const total = scores.reduce((a, b) => a + b, 0);
        const avgNum = scores.length > 0 ? Number((total / scores.length).toFixed(1)) : 0;
        const olevel = calculateOLevelDivision(newMarks);
        return {
          ...s,
          marks: newMarks,
          total: scores.length > 0 ? total : undefined,
          average: scores.length > 0 ? String(avgNum) : undefined,
          division: scores.length > 0 ? olevel.division : undefined
        };
      }
    });

    if (onUpdateStudents) {
      onUpdateStudents(updated);
    } else {
      updated.forEach(st => onUpdateStudent(st));
    }

    setSelectedCandidateIds([]);
    setIsBulkDeleteModalOpen(false);
    setSaveToast(`Successfully cleared ${targetLabel} for ${count} candidate(s)!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // CSV File Upload & Parsing Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadCsvFile(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setUploadError('Uploaded file is empty.');
          return;
        }

        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setUploadError('CSV file must contain a header row and at least one candidate row.');
          return;
        }

        // Parse header
        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toUpperCase());
        const regNoIdx = rawHeaders.findIndex(h => h.includes('REG') || h === 'ID' || h === 'TOKEN');
        const nameIdx = rawHeaders.findIndex(h => h.includes('NAME'));

        if (regNoIdx === -1 && nameIdx === -1) {
          setUploadError('Header must include a "REG NO" or "NAME" column.');
          return;
        }

        // Map recognized subject column indexes
        const subjectColMap: { subKey: string; fullName: string; colIdx: number }[] = [];
        ALL_AVAILABLE_SUBJECTS.forEach(sub => {
          const idx = rawHeaders.findIndex(h => 
            h === sub.key.toUpperCase() || 
            h === sub.label.toUpperCase() || 
            h === sub.fullName.toUpperCase() ||
            h.includes(sub.key.toUpperCase())
          );
          if (idx !== -1) {
            subjectColMap.push({ subKey: sub.key, fullName: sub.fullName, colIdx: idx });
          }
        });

        if (subjectColMap.length === 0) {
          setUploadError('No recognized subject columns found. Expected headers like: ENG, KIS, B.MATH, GEO, BIO, CHE, PHY...');
          return;
        }

        const parsed: {
          matched: boolean;
          studentName?: string;
          regNo: string;
          scores: Record<string, number>;
        }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const regNo = regNoIdx !== -1 ? cols[regNoIdx] || '' : '';
          const name = nameIdx !== -1 ? cols[nameIdx] || '' : '';

          if (!regNo && !name) continue;

          // Match student by regNo or name
          const matchedStudent = students.find(s => 
            (regNo && s.regNo.toLowerCase() === regNo.toLowerCase()) ||
            (name && s.name.toLowerCase() === name.toLowerCase())
          );

          const scores: Record<string, number> = {};
          subjectColMap.forEach(sc => {
            const rawVal = cols[sc.colIdx];
            if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
              const num = Math.min(100, Math.max(0, parseInt(rawVal, 10)));
              scores[sc.fullName] = num;
            }
          });

          parsed.push({
            matched: !!matchedStudent,
            studentName: matchedStudent?.name || name || 'Unknown',
            regNo: matchedStudent?.regNo || regNo,
            scores
          });
        }

        setUploadParsedRows(parsed);
      } catch (err: any) {
        setUploadError(`Failed to parse CSV: ${err.message || 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  // Apply parsed CSV upload to student marks
  const handleApplyCsvUpload = () => {
    if (uploadParsedRows.length === 0) return;

    let updatedCount = 0;
    const updated = students.map(s => {
      const match = uploadParsedRows.find(p => 
        p.matched && (p.regNo.toLowerCase() === s.regNo.toLowerCase() || p.studentName?.toLowerCase() === s.name.toLowerCase())
      );
      if (!match || Object.keys(match.scores).length === 0) return s;

      const newMarks = { ...(s.marks || {}), ...match.scores };
      const scores = Object.values(newMarks).filter(v => typeof v === 'number' && !isNaN(v as number)) as number[];
      const total = scores.reduce((a, b) => a + b, 0);
      const avgNum = scores.length > 0 ? Number((total / scores.length).toFixed(1)) : 0;
      const olevel = calculateOLevelDivision(newMarks);
      updatedCount++;

      return {
        ...s,
        marks: newMarks,
        total,
        average: scores.length > 0 ? String(avgNum) : undefined,
        division: scores.length > 0 ? olevel.division : undefined
      };
    });

    if (onUpdateStudents) {
      onUpdateStudents(updated);
    } else {
      updated.forEach(st => onUpdateStudent(st));
    }

    setIsUploadModalOpen(false);
    setUploadCsvFile(null);
    setUploadParsedRows([]);
    setSaveToast(`Successfully imported and updated marks for ${updatedCount} candidates from CSV!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  const handleExportCsv = () => {
    const headers = ['REG NO', 'NAME', 'SEX', ...activeLedgerSubjects.map(s => s.key), 'TOT', 'AVG', 'DIV', 'RANK'];
    const rows = [headers];

    classCandidates.forEach((s, idx) => {
      const subjectScores = activeLedgerSubjects.map(sub => {
        const sc = getScore(s, sub.fullName, sub.key);
        return sc === '' ? '-' : String(sc);
      });

      rows.push([
        s.regNo,
        s.name,
        s.gender ? (s.gender === 'Female' ? 'F' : 'M') : '-',
        ...subjectScores,
        s.total !== undefined ? String(s.total) : '-',
        s.average ? `${s.average}%` : '-',
        s.division ? s.division : '-',
        String(s.reportCardData?.positionInClass ?? idx + 1)
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `results_${selectedClass}_${selectedStream}_${selectedExam}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Dashboard & Grade Distribution calculations (A, B, C, D, E, F) and Class Average
  const dashboardMetrics = useMemo(() => {
    const totalCandidates = allClassCandidates.length;
    const noSubjectStudents = allClassCandidates.filter(s => !hasStudentAttemptedAnySubject(s, pendingMarks[s.id]));
    const noSubjectCount = noSubjectStudents.length;
    const noSubjectBoys = noSubjectStudents.filter(s => s.gender === 'Male').length;
    const noSubjectGirls = noSubjectStudents.filter(s => s.gender === 'Female').length;
    const noSubjectRate = totalCandidates > 0 ? ((noSubjectCount / totalCandidates) * 100).toFixed(1) : '0.0';

    const satCandidates = allClassCandidates.filter(s => hasStudentAttemptedAnySubject(s, pendingMarks[s.id]));
    const satCount = satCandidates.length;
    const satBoys = satCandidates.filter(s => s.gender === 'Male').length;
    const satGirls = satCandidates.filter(s => s.gender === 'Female').length;
    const satRate = totalCandidates > 0 ? ((satCount / totalCandidates) * 100).toFixed(1) : '0.0';

    let divI = 0;
    let divII = 0;
    let divIII = 0;
    let divIV = 0;
    let div0 = 0;
    let divIncomplete = 0;
    let sumAvg = 0;
    let countedAvg = 0;

    const gradeDistribution: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = {
      A: 0, B: 0, C: 0, D: 0, E: 0, F: 0
    };
    const gradeDistributionBoys: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = {
      A: 0, B: 0, C: 0, D: 0, E: 0, F: 0
    };
    const gradeDistributionGirls: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = {
      A: 0, B: 0, C: 0, D: 0, E: 0, F: 0
    };

    let passCount = 0;
    let failCount = 0;

    allClassCandidates.forEach(s => {
      if (s.division === 'I') divI++;
      else if (s.division === 'II') divII++;
      else if (s.division === 'III') divIII++;
      else if (s.division === 'IV') divIV++;
      else if (s.division === 'INCOMPLETE') divIncomplete++;
      else if (s.division === '0') div0++;

      const isGirl = (s.gender || '').toLowerCase().startsWith('f') || s.sex === 'F';

      if (s.average) {
        const num = parseFloat(s.average);
        if (!isNaN(num)) {
          sumAvg += num;
          countedAvg++;

          let gradeKey = 'F';
          if (isClassPrimary) {
            // Tanzanian Primary: A=81-100, B=61-80, C=41-60, D=21-40, E=0-20
            if (num >= 81) { gradeKey = 'A'; passCount++; }
            else if (num >= 61) { gradeKey = 'B'; passCount++; }
            else if (num >= 41) { gradeKey = 'C'; passCount++; }
            else if (num >= 21) { gradeKey = 'D'; failCount++; }
            else { gradeKey = 'E'; failCount++; }
          } else {
            // Secondary NECTA CSEE: A=75-100, B=65-74, C=45-64, D=30-44, F=0-29
            if (num >= 75) { gradeKey = 'A'; passCount++; }
            else if (num >= 65) { gradeKey = 'B'; passCount++; }
            else if (num >= 45) { gradeKey = 'C'; passCount++; }
            else if (num >= 30) { gradeKey = 'D'; passCount++; }
            else { gradeKey = 'F'; failCount++; }
          }

          if (isGirl) {
            gradeDistributionGirls[gradeKey as keyof typeof gradeDistributionGirls]++;
          } else {
            gradeDistributionBoys[gradeKey as keyof typeof gradeDistributionBoys]++;
          }
          gradeDistribution[gradeKey as keyof typeof gradeDistribution]++;
        }
      }
    });

    const avgOverall = countedAvg > 0 ? (sumAvg / countedAvg).toFixed(1) : '-';
    const passRate = (passCount + failCount) > 0 
      ? ((passCount / (passCount + failCount)) * 100).toFixed(1) 
      : '0.0';

    // School GPA calculation
    let schoolGPA = '-';
    if (isClassPrimary) {
      const graded = gradeDistribution.A + gradeDistribution.B + gradeDistribution.C + gradeDistribution.D + gradeDistribution.E;
      if (graded > 0) {
        const weighted = (
          gradeDistribution.A * 1.0 + 
          gradeDistribution.B * 2.0 + 
          gradeDistribution.C * 3.0 + 
          gradeDistribution.D * 4.0 + 
          gradeDistribution.E * 5.0
        ) / graded;
        schoolGPA = weighted.toFixed(2);
      }
    } else {
      const gradedCandidates = divI + divII + divIII + divIV + div0;
      if (gradedCandidates > 0) {
        const weighted = (divI * 1.0 + divII * 2.0 + divIII * 3.0 + divIV * 4.0 + div0 * 5.0) / gradedCandidates;
        schoolGPA = weighted.toFixed(2);
      }
    }

    // Subject by Subject Performance Breakdown & Grade counts
    const subjectPerformances = activeLedgerSubjects.map(sub => {
      let subTotalM = 0, subTotalF = 0, testedM = 0, testedF = 0;
      let highestM = -1, highestF = -1, lowestM = 999, lowestF = 999;
      let passedM = 0, passedF = 0;
      const subGrades: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
      const subGradesBoys: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
      const subGradesGirls: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

      allClassCandidates.forEach(s => {
        const sc = s.marks?.[sub.fullName] ?? s.marks?.[sub.key];
        const isGirl = (s.gender || '').toLowerCase().startsWith('f') || s.sex === 'F';
        if (typeof sc === 'number' && !isNaN(sc)) {
          if (isGirl) {
            subTotalF += sc;
            testedF++;
            if (sc > highestF) highestF = sc;
            if (sc < lowestF) lowestF = sc;
          } else {
            subTotalM += sc;
            testedM++;
            if (sc > highestM) highestM = sc;
            if (sc < lowestM) lowestM = sc;
          }

          let gradeKey = 'F';
          let isPassed = false;
          if (isClassPrimary) {
            const pInfo = getPrimarySubjectGradeInfo(sc);
            gradeKey = pInfo.grade;
            isPassed = sc >= 41;
          } else {
            if (sc >= 75) { gradeKey = 'A'; isPassed = true; }
            else if (sc >= 65) { gradeKey = 'B'; isPassed = true; }
            else if (sc >= 45) { gradeKey = 'C'; isPassed = true; }
            else if (sc >= 30) { gradeKey = 'D'; isPassed = true; }
            else { gradeKey = 'F'; }
          }

          if (isGirl) {
            subGradesGirls[gradeKey as keyof typeof subGradesGirls]++;
            if (isPassed) passedF++;
          } else {
            subGradesBoys[gradeKey as keyof typeof subGradesBoys]++;
            if (isPassed) passedM++;
          }
          subGrades[gradeKey as keyof typeof subGrades]++;
        }
      });

      const testedCount = testedM + testedF;
      const meanScore = testedCount > 0 ? Number(((subTotalM + subTotalF) / testedCount).toFixed(1)) : 0;
      const meanScoreBoys = testedM > 0 ? Number((subTotalM / testedM).toFixed(1)) : 0;
      const meanScoreGirls = testedF > 0 ? Number((subTotalF / testedF).toFixed(1)) : 0;
      const passRate = testedCount > 0 ? Number((((passedM + passedF) / testedCount) * 100).toFixed(1)) : 0;
      const passRateBoys = testedM > 0 ? Number(((passedM / testedM) * 100).toFixed(1)) : 0;
      const passRateGirls = testedF > 0 ? Number(((passedF / testedF) * 100).toFixed(1)) : 0;
      const highest = Math.max(highestM, highestF, 0);
      const lowest = Math.min(lowestM === 999 ? 0 : lowestM, lowestF === 999 ? 0 : lowestF);

      return {
        subjectKey: sub.key,
        subjectName: sub.fullName,
        testedCount,
        testedBoys: testedM,
        testedGirls: testedF,
        meanScore,
        meanScoreBoys,
        meanScoreGirls,
        highest,
        lowest,
        passRate,
        passRateBoys,
        passRateGirls,
        grades: subGrades,
        gradesBoys: subGradesBoys,
        gradesGirls: subGradesGirls
      };
    });

    return {
      totalCandidates,
      noSubjectStudents,
      noSubjectCount,
      noSubjectBoys,
      noSubjectGirls,
      noSubjectRate,
      satCandidates,
      satCount,
      satBoys,
      satGirls,
      satRate,
      schoolGPA,
      divI,
      divII,
      divIII,
      divIV,
      div0,
      divIncomplete,
      avgOverall,
      passRate,
      passCount,
      failCount,
      gradeDistribution,
      gradeDistributionBoys,
      gradeDistributionGirls,
      subjectPerformances
    };

    return {
      totalCandidates,
      noSubjectStudents,
      noSubjectCount,
      noSubjectBoys,
      noSubjectGirls,
      noSubjectRate,
      satCandidates,
      satCount,
      satBoys,
      satGirls,
      satRate,
      schoolGPA,
      divI,
      divII,
      divIII,
      divIV,
      div0,
      divIncomplete,
      avgOverall,
      passRate,
      passCount,
      failCount,
      gradeDistribution,
      subjectPerformances
    };
  }, [allClassCandidates, pendingMarks, activeLedgerSubjects, isClassPrimary]);

  // Export Grade Distribution & Student Performance Summary to formatted PDF
  const handleExportPerformancePdf = () => {
    exportGradeDistributionAndPerformancePDF({
      schoolInfo,
      className: selectedClass,
      stream: selectedStream,
      examName: selectedExam,
      academicYear: String(new Date().getFullYear()),
      totalCandidates: dashboardMetrics.totalCandidates,
      noSubjectCount: dashboardMetrics.noSubjectCount,
      satCandidatesCount: dashboardMetrics.satCount,
      noSubjectRate: dashboardMetrics.noSubjectRate,
      classAverage: dashboardMetrics.avgOverall,
      passRate: dashboardMetrics.passRate,
      gradeDistribution: dashboardMetrics.gradeDistribution,
      gradeDistributionBoys: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      gradeDistributionGirls: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
      divisionDistribution: {
        divI: dashboardMetrics.divI,
        divII: dashboardMetrics.divII,
        divIII: dashboardMetrics.divIII,
        divIV: dashboardMetrics.divIV,
        div0: dashboardMetrics.div0,
        incomplete: dashboardMetrics.divIncomplete
      },
      schoolGPA: dashboardMetrics.schoolGPA,
      isPrimary: isClassPrimary,
      subjectPerformances: dashboardMetrics.subjectPerformances,
      topCandidates: allClassCandidates
        .filter(c => c.total !== undefined)
        .sort((a, b) => (b.total || 0) - (a.total || 0))
        .map((c, idx) => ({
          rank: idx + 1,
          regNo: c.regNo,
          name: c.name,
          gender: c.gender || 'Unknown',
          total: c.total || 0,
          average: c.average || '0',
          divisionOrGrade: isClassPrimary 
            ? `Grade ${c.primaryGrade || c.division || 'A'}` 
            : `Division ${c.division || 'N/A'}`,
          passStatus: c.passStatus
        }))
    });
  };

  // Report Card navigation
  const currentIndex = students.findIndex(s => s.regNo === selectedStudentReg);
  const reportStudent = students.find(s => s.regNo === selectedStudentReg) || students[0];

  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      setSelectedStudentReg(students[currentIndex - 1].regNo);
    }
  };

  const handleNextStudent = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentReg(students[currentIndex + 1].regNo);
    }
  };

  const handlePrintReport = () => {
    if (!reportStudent) return;
    printReportCardDocument(
      'report-card-printable-area',
      reportOrientation,
      reportStudent.name,
      schoolInfo.name
    );
  };

  return (
    <div className="space-y-5">
      {/* Official School Branding & Examination Status Header */}
      <div className="bg-gradient-to-r from-blue-950 via-[#1f4d8b] to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Logo or School Crest */}
          {schoolInfo.logo ? (
            <div className="w-16 h-16 rounded-xl bg-white p-1 border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
              <img 
                src={schoolInfo.logo} 
                alt={schoolInfo.name} 
                className="w-full h-full object-contain" 
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-800 border-2 border-amber-400 flex flex-col items-center justify-center shrink-0 shadow-md">
              <GraduationCap className="w-8 h-8 text-amber-300" />
              <span className="text-[9px] font-black text-white uppercase tracking-tighter">NECTA</span>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-wide text-white uppercase drop-shadow-xs">
                {schoolInfo.name}
              </h2>
              {schoolInfo.schoolNumber && (
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[11px] font-mono font-bold">
                  REG: {schoolInfo.schoolNumber}
                </span>
              )}
            </div>

            <p className="text-xs text-blue-200 flex flex-wrap items-center gap-3">
              {schoolInfo.motto && <span className="italic">"{schoolInfo.motto}"</span>}
              <span className="text-blue-300/60">•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-200">
                <span>Tel / WhatsApp:</span>
                <span className="font-mono">{schoolInfo.phone || '0717616343'}</span>
              </span>
              <span className="text-blue-300/60">•</span>
              <span className="text-blue-200">{schoolInfo.address || 'Tanzania'}</span>
            </p>
          </div>
        </div>

        {/* Right Actions: Results Release Status & Exam Documents Modal */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-blue-800/60">
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title="Generate Photo Entry Form, ISAL, and CAL official documents for this class and stream"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>Exam Forms (Photo Entry, ISAL, CAL)</span>
          </button>

          {/* Results Status Toggle & Archive indicator */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${resultsStatus === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                {resultsStatus === 'active' ? 'RESULTS RELEASED' : 'DRAFT / UNRELEASED'}
              </span>
            </div>

            {(currentUser?.role === 'HEADMASTER' || (currentUser?.role as string) === 'ADMIN') && (
              <button
                type="button"
                onClick={() => {
                  const newStatus = resultsStatus === 'active' ? 'inactive' : 'active';
                  if (confirm(
                    newStatus === 'active' 
                      ? 'Release examination results to students, teachers, and parents? Released exams are permanently recorded in past examination archives.' 
                      : 'Revert examination results to unreleased processing status?'
                  )) {
                    onToggleResultsStatus(newStatus);
                  }
                }}
                className={`ml-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  resultsStatus === 'active'
                    ? 'bg-rose-500/80 hover:bg-rose-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {resultsStatus === 'active' ? 'Unrelease' : 'Release Results'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Filter Bar matching Screenshot B & C */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider text-[11px]">Class:</span>
            <select
              value={selectedClass}
              onChange={e => {
                const newClass = e.target.value;
                setSelectedClass(newClass);
                if (NURSERY_CLASSES.includes(newClass)) {
                  const hasNursery = selectedSubjectKeys.some(k => NURSERY_SUBJECT_KEYS.includes(k));
                  if (!hasNursery) handleSaveSubjectKeys(NURSERY_SUBJECT_KEYS);
                } else if (newClass === 'Standard 1' || newClass === 'Standard 2') {
                  const hasLower = selectedSubjectKeys.some(k => PRIMARY_LOWER_SUBJECT_KEYS.includes(k));
                  if (!hasLower) handleSaveSubjectKeys(PRIMARY_LOWER_SUBJECT_KEYS);
                } else if (PRIMARY_CLASSES.includes(newClass)) {
                  const hasUpper = selectedSubjectKeys.some(k => PRIMARY_UPPER_SUBJECT_KEYS.includes(k));
                  if (!hasUpper) handleSaveSubjectKeys(PRIMARY_UPPER_SUBJECT_KEYS);
                } else if (SECONDARY_CLASSES.includes(newClass)) {
                  const hasSecondary = selectedSubjectKeys.some(k => DEFAULT_ACTIVE_SUBJECT_KEYS.includes(k));
                  if (!hasSecondary) handleSaveSubjectKeys(DEFAULT_ACTIVE_SUBJECT_KEYS);
                }
              }}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="Pre-Primary / Nursery Level">
                {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Primary School (Standard 1 - 7)">
                {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Secondary School (Form 1 - 6)">
                {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider text-[11px]">Stream:</span>
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Streams</option>
              {availableStreams.map(str => (
                <option key={str} value={str}>Stream {str}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider text-[11px]">Term:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider text-[11px]">Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="2026">Year 2026</option>
              <option value="2025">Year 2025</option>
              <option value="2024">Year 2024</option>
              <option value="2027">Year 2027</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider text-[11px]">Exam:</span>
            <select
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {allAvailableExams.map(ex => (
                <option key={ex.name} value={ex.name}>
                  {ex.isRegistered ? `★ ${ex.name} (Registered)` : ex.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Cutoff / Grade Settings */}
          <button
            type="button"
            onClick={() => setIsCutoffModalOpen(true)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-300"
            title="Configure Cutoff / Grade Settings for this exam"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Cutoffs & Settings</span>
          </button>

          {/* USAL (Sealed Marksheet) Button */}
          <button
            type="button"
            onClick={() => setIsUsalModalOpen(true)}
            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Open USAL (Sealed Marksheet) & CSEE/CPS Records"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
            <span>USAL (Sealed)</span>
          </button>

          {/* Teacher Marks Entry Quick Access */}
          {onNavigateToMarkEntry && (
            <button
              type="button"
              onClick={() => onNavigateToMarkEntry(selectedExam, selectedClass)}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Go to Marks Entry page"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Marks Entry</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name or reg no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-56 sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Sub-Tabs: Results Entry | Dashboard | Report Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-[#1f4d8b] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Results Entry
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-[#1f4d8b] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('reportcard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reportcard'
                ? 'bg-[#1f4d8b] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report Card</span>
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comparison'
                ? 'bg-[#1f4d8b] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Side-by-Side Comparison</span>
            {selectedCandidateIds.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'comparison' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {selectedCandidateIds.length}
              </span>
            )}
          </button>
        </div>

        {onNavigateToAttendance && (
          <button
            onClick={onNavigateToAttendance}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Student Attendance</span>
          </button>
        )}
      </div>

      {/* Toast Alert */}
      {saveToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* TAB 1: RESULTS ENTRY / CANDIDATE MARKS LEDGER (Screenshot B) */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Ledger Header matching Screenshot B */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1f4d8b]">
                {selectedClass.toUpperCase()} {selectedStream !== 'All' ? selectedStream : ''} - {selectedExam.toUpperCase()} Candidate Marks Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click Edit Marks to enter scores. Save when done. Real-time NECTA standard calculations.
              </p>
            </div>

            {/* Action Buttons matching Screenshot B + Customization & Bulk Operations */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Select which subjects to display or omit in the ledger"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Customize Subjects ({activeLedgerSubjects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Import multiple student marks from CSV spreadsheet"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload Marks (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCsvTemplate(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Download CSV template populated with candidates"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV Template</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditMarksMode(!isEditMarksMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isEditMarksMode 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMarksMode ? 'Done Editing' : 'Edit Marks'}</span>
              </button>

              {selectedCandidateIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('comparison')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
                  title="Compare selected candidates side by side"
                >
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  <span>Compare Selected ({selectedCandidateIds.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCalculateAll}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                <span>Calculate</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export results ledger to CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfExportModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-400"
                title="Export results ledger table as clean printable PDF with remarks and signatures"
              >
                <Printer className="w-3.5 h-3.5 text-blue-200" />
                <span>Export Results PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportPerformancePdf}
                className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export formatted Grade Distribution & Performance Summary PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMarks}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Marks</span>
              </button>

              <button
                type="button"
                onClick={handleInitiateRelease}
                disabled={isReleasing || classCandidates.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 animate-in fade-in"
                title="Save and roll all calculated results (with marks, total, average, points, division, grade, position) to Examination Records"
              >
                {isReleasing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-200" />
                )}
                <span>SAVE &amp; ROLL TO RESULTS</span>
              </button>

              {onNavigateToSms && (
                <button
                  type="button"
                  onClick={onNavigateToSms}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                  title="Tuma matokeo haya kwa wazazi kupitia SMS (Beem Africa)"
                >
                  <Smartphone className="w-4 h-4 text-emerald-200" />
                  <span>Tuma kwa Wazazi via SMS</span>
                </button>
              )}
            </div>
          </div>

          {/* Batch Operations Floating/Inline Bar */}
          {selectedCandidateIds.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>{selectedCandidateIds.length} candidate(s) selected</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-[11px] text-slate-600 font-normal">Apply batch operations across all selected rows</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkClearTarget('ALL');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Marks ({selectedCandidateIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCandidateIds([])}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Table Header with Candidate Count (e.g. 0 CANDIDATES in Screenshot B) */}
          <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>{classCandidates.length} CANDIDATES</span>
              <span className="text-[11px] text-slate-500 font-normal">
                ({activeLedgerSubjects.length} subjects displayed)
              </span>
            </div>
            {currentUser?.role === 'TEACHER' ? (
              <span className="text-[11px] text-amber-700 font-semibold lowercase bg-amber-100/80 px-2.5 py-0.5 rounded">
                teacher mode: showing your subjects ({activeLedgerSubjects.map(s => s.label).join(', ')})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                Customize Subject Columns
              </button>
            )}
          </div>

          {/* Examination Participation & Absenteeism Summary Strip with Dynamic Filters */}
          <div className="bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Participation:</span>
              
              {/* Filter: All Candidates */}
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ALL'
                    ? 'bg-[#1f4d8b] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="View all registered candidates in this class"
              >
                <span>All Registered</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {dashboardMetrics.totalCandidates}
                </span>
              </button>

              {/* Filter: Sat Exam */}
              <button
                type="button"
                onClick={() => setStatusFilter('SAT')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'SAT'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-emerald-800 hover:bg-emerald-50'
                }`}
                title="Filter candidates who attempted at least one examination subject"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sat Exam</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === 'SAT' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {dashboardMetrics.satCount} ({dashboardMetrics.satRate}%)
                </span>
              </button>

              {/* Filter: Didn't Do Any Subject */}
              <button
                type="button"
                onClick={() => setStatusFilter('NO_SUBJECT')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'NO_SUBJECT'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
                title="Filter candidates who did not do any subject (Absent / zero marks entered)"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Didn't Do Subject (Absent)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${statusFilter === 'NO_SUBJECT' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
                  {dashboardMetrics.noSubjectCount} ({dashboardMetrics.noSubjectRate}%)
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>Boys: <strong className="text-slate-800">{dashboardMetrics.satBoys} sat</strong> ({dashboardMetrics.noSubjectBoys} absent)</span>
              <span>•</span>
              <span>Girls: <strong className="text-slate-800">{dashboardMetrics.satGirls} sat</strong> ({dashboardMetrics.noSubjectGirls} absent)</span>
            </div>
          </div>

          {/* Quick Grade Distribution & Class Average Summary Ribbon */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">Class Average:</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black font-mono">
                {dashboardMetrics.avgOverall !== '-' ? `${dashboardMetrics.avgOverall}%` : '-'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[10px] font-bold uppercase text-slate-500">Pass Rate:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black font-mono">
                {dashboardMetrics.passRate}%
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[10px] font-bold uppercase text-slate-500">Grades:</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">
                A: {dashboardMetrics.gradeDistribution.A}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[10px] border border-blue-300">
                B: {dashboardMetrics.gradeDistribution.B}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-black text-[10px] border border-amber-300">
                C: {dashboardMetrics.gradeDistribution.C}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-black text-[10px] border border-orange-300">
                D: {dashboardMetrics.gradeDistribution.D}
              </span>
              {isClassPrimary ? (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[10px] border border-rose-300">
                  E: {dashboardMetrics.gradeDistribution.E}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[10px] border border-rose-300">
                  F: {dashboardMetrics.gradeDistribution.F}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportPerformancePdf}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Download Grade Distribution & Student Performance Summary PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Export PDF Report</span>
            </button>
          </div>

          {/* Teacher Mode Notice Banner */}
          {currentUser?.role === 'TEACHER' && (
            <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
              <span className="font-medium">
                Showing candidate marks for your assigned subjects only: <strong>{activeLedgerSubjects.map(s => s.fullName).join(', ') || 'No subjects assigned'}</strong>
              </span>
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Restricted View</span>
            </div>
          )}

          {/* Full Marks Table Matching Screenshot B */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-2.5 border-r border-slate-200 text-center w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all candidates in this view"
                      checked={selectedCandidateIds.length === classCandidates.length && classCandidates.length > 0}
                      onChange={handleToggleSelectAll}
                      className="cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-2.5 border-r border-slate-200 whitespace-nowrap">REG NO</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[150px] whitespace-nowrap">NAME</th>
                  <th className="p-2.5 border-r border-slate-200 text-center w-10">SEX</th>
                  {activeLedgerSubjects.map(sub => (
                    <th key={sub.key} className="p-2 border-r border-slate-200 text-center w-12 font-mono" title={sub.fullName}>
                      {sub.label}
                    </th>
                  ))}
                  <th className="p-2 border-r border-slate-200 text-center font-black bg-blue-50/50 w-12">TOT</th>
                  <th className="p-2 border-r border-slate-200 text-center font-black bg-blue-50/50 w-14">AVG</th>
                  <th className="p-2 border-r border-slate-200 text-center font-black bg-blue-50/50 w-10">DIV</th>
                  <th className="p-2 border-r border-slate-200 text-center font-black bg-blue-50/50 w-10">RANK</th>
                  <th className="p-2 border-r border-slate-200 text-left min-w-[210px]">TEACHER REMARKS / COMMENTS</th>
                  <th className="p-2 text-center w-16">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={activeLedgerSubjects.length + 10} className="p-8 text-center text-slate-400 font-bold">
                      0 CANDIDATES FOUND FOR {selectedClass} {selectedStream}. Register students in the Registration view.
                    </td>
                  </tr>
                ) : (
                  classCandidates.map((st, idx) => (
                    <tr 
                      key={st.id} 
                      className={`hover:bg-blue-50/30 transition-colors ${
                        selectedCandidateIds.includes(st.id) ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${st.name}`}
                          checked={selectedCandidateIds.includes(st.id)}
                          onChange={() => handleToggleSelectCandidate(st.id)}
                          className="cursor-pointer rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {st.regNo}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{st.name}</span>
                          {!hasStudentAttemptedAnySubject(st, pendingMarks[st.id]) && (
                            <span 
                              className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[9px] border border-rose-200" 
                              title="Candidate did not sit / zero subject marks entered"
                            >
                              ABSENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">
                        <span className={st.gender === 'Female' ? 'text-pink-700' : 'text-blue-700'}>
                          {st.gender ? (st.gender === 'Female' ? 'F' : 'M') : '-'}
                        </span>
                      </td>

                      {/* Subject Scores */}
                      {activeLedgerSubjects.map(sub => {
                        const sc = getScore(st, sub.fullName, sub.key);
                        return (
                          <td key={sub.key} className="p-1 border-r border-slate-200 text-center font-mono">
                            {isEditMarksMode ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={sc}
                                onChange={e => handleCellChange(st.id, sub.key, e.target.value)}
                                placeholder="-"
                                className="w-11 px-1 py-0.5 text-center font-bold text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            ) : (
                              <span className={`font-semibold ${sc !== '' ? 'text-slate-800' : 'text-slate-300'}`}>
                                {sc !== '' ? sc : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Metrics */}
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-black text-slate-900 bg-slate-50/40">
                        {hasStudentAttemptedAnySubject(st, pendingMarks[st.id]) ? (st.total ?? '-') : '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-black text-blue-700 bg-slate-50/40">
                        {hasStudentAttemptedAnySubject(st, pendingMarks[st.id]) ? (st.average ? `${st.average}%` : '-') : '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-black bg-slate-50/40">
                        {!hasStudentAttemptedAnySubject(st, pendingMarks[st.id]) ? (
                          <span 
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title="Candidate did not sit any subject"
                          >
                            ABS
                          </span>
                        ) : isClassPrimary ? (
                          (st.primaryGrade || st.division) ? (
                            <span 
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                (st.primaryGrade || st.division) === 'A' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                (st.primaryGrade || st.division) === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                (st.primaryGrade || st.division) === 'C' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                (st.primaryGrade || st.division) === 'D' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              Grade {st.primaryGrade || st.division}
                            </span>
                          ) : '-'
                        ) : (
                          st.division ? (
                            <span 
                              title={st.division === 'INCOMPLETE' ? 'Incomplete: Fewer than 7 subjects scored' : `Division ${st.division}`}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                st.division === 'I' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                st.division === 'II' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                st.division === 'III' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                st.division === 'IV' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                st.division === 'INCOMPLETE' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                'bg-red-100 text-red-800 border border-red-300'
                              }`}
                            >
                              {st.division === 'INCOMPLETE' ? 'INC' : `Div ${st.division}${((st as any).points || calculateOLevelDivision((pendingMarks[st.id] || st.marks || {}) as any).points) ? ` (Pts ${(st as any).points || calculateOLevelDivision((pendingMarks[st.id] || st.marks || {}) as any).points})` : ''}`}
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                        {hasStudentAttemptedAnySubject(st, pendingMarks[st.id]) ? (st.reportCardData?.positionInClass ?? idx + 1) : '-'}
                      </td>
                      {/* Annotatable Inline Teacher Remarks / Comments */}
                      <td className="p-2 border-r border-slate-200 min-w-[210px]">
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Add remark inline..."
                            value={st.reportCardData?.classTeacherRemarks || ''}
                            onChange={(e) => handleUpdateStudentRemarks(st.id, e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:bg-amber-50 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 outline-none font-medium transition"
                            title="Click to edit teacher remark inline"
                          />
                          <div className="flex items-center gap-1 flex-wrap">
                            {['Excellent', 'Very Good', 'Good Effort', 'Needs Improvement', 'Amefaulu'].map(badge => (
                              <button
                                key={badge}
                                type="button"
                                onClick={() => handleUpdateStudentRemarks(st.id, badge)}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 cursor-pointer transition"
                              >
                                {badge}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => {
                            setSelectedStudentReg(st.regNo);
                            setActiveTab('reportcard');
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Header Bar with PDF Export */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  {selectedClass.toUpperCase()} {selectedStream !== 'All' ? `(${selectedStream})` : ''} - {selectedExam} Academic Analytics
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official {isClassPrimary ? 'Primary Education' : 'NECTA Secondary Education'} Grade Distribution and Examination Insights
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPerformancePdf}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                title="Export this grade distribution and performance summary as a publication-ready PDF"
              >
                <FileText className="w-4 h-4" />
                <span>Export Performance PDF</span>
              </button>
            </div>
          </div>

          {/* Top 6 Executive KPI Metrics Including Examination Sitting & Absenteeism */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Registered</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{dashboardMetrics.totalCandidates}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{allClassCandidates.length} enrolled</div>
            </div>

            <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 shadow-xs text-center">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Sat For Exam</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{dashboardMetrics.satCount}</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{dashboardMetrics.satRate}% (B:{dashboardMetrics.satBoys} G:{dashboardMetrics.satGirls})</div>
            </div>

            <div className="bg-white border border-rose-200 bg-rose-50/30 rounded-xl p-4 shadow-xs text-center">
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Didn't Do Subject</div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{dashboardMetrics.noSubjectCount}</div>
              <div className="text-[10px] text-rose-600 font-bold mt-0.5">{dashboardMetrics.noSubjectRate}% (B:{dashboardMetrics.noSubjectBoys} G:{dashboardMetrics.noSubjectGirls})</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class Average</div>
              <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
                {dashboardMetrics.avgOverall !== '-' ? `${dashboardMetrics.avgOverall}%` : '-'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Mean Score ({selectedExam})</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pass Rate</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                {dashboardMetrics.passRate}%
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{dashboardMetrics.passCount} passed</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">School GPA</div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">{dashboardMetrics.schoolGPA}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Scale: 1.0 (Top) - 5.0</div>
            </div>
          </div>

          {/* Grade Distribution Summary (A, B, C, D, E, F) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Grade Distribution Summary ({selectedClass} - {selectedExam})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of candidate overall averages into standard performance tiers
                </p>
              </div>

              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Grading System: <span className="text-blue-700">{isClassPrimary ? 'Primary (A: 81-100, B: 61-80, C: 41-60, D: 21-40, E: 0-20)' : 'NECTA CSEE (A: 75+, B: 65+, C: 45+, D: 30+, F: <30)'}</span>
              </div>
            </div>

            {/* Visual Colored Grade Cards */}
            <div className={`grid grid-cols-2 ${isClassPrimary ? 'sm:grid-cols-5' : 'sm:grid-cols-5'} gap-3`}>
              {/* Grade A */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">GRADE A</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  {isClassPrimary ? '81-100% (Bora Sana)' : '75-100% (Distinction)'}
                </div>
                <div className="text-3xl font-black text-emerald-700 mt-2">
                  {dashboardMetrics.gradeDistribution.A}
                </div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">
                  {dashboardMetrics.totalCandidates > 0 
                    ? `${((dashboardMetrics.gradeDistribution.A / dashboardMetrics.totalCandidates) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>

              {/* Grade B */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <div className="text-xs font-black text-blue-800 uppercase tracking-wider">GRADE B</div>
                <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  {isClassPrimary ? '61-80% (Vizuri Sana)' : '65-74% (Very Good)'}
                </div>
                <div className="text-3xl font-black text-blue-700 mt-2">
                  {dashboardMetrics.gradeDistribution.B}
                </div>
                <div className="text-[11px] text-blue-600 font-bold mt-1">
                  {dashboardMetrics.totalCandidates > 0 
                    ? `${((dashboardMetrics.gradeDistribution.B / dashboardMetrics.totalCandidates) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>

              {/* Grade C */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div className="text-xs font-black text-amber-800 uppercase tracking-wider">GRADE C</div>
                <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                  {isClassPrimary ? '41-60% (Average / Pass)' : '45-64% (Good)'}
                </div>
                <div className="text-3xl font-black text-amber-700 mt-2">
                  {dashboardMetrics.gradeDistribution.C}
                </div>
                <div className="text-[11px] text-amber-600 font-bold mt-1">
                  {dashboardMetrics.totalCandidates > 0 
                    ? `${((dashboardMetrics.gradeDistribution.C / dashboardMetrics.totalCandidates) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>

              {/* Grade D */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
                <div className="text-xs font-black text-orange-800 uppercase tracking-wider">GRADE D</div>
                <div className="text-[10px] text-orange-600 font-semibold mt-0.5">
                  {isClassPrimary ? '21-40% (Hafifu / Fail)' : '30-44% (Satisfactory)'}
                </div>
                <div className="text-3xl font-black text-orange-700 mt-2">
                  {dashboardMetrics.gradeDistribution.D}
                </div>
                <div className="text-[11px] text-orange-600 font-bold mt-1">
                  {dashboardMetrics.totalCandidates > 0 
                    ? `${((dashboardMetrics.gradeDistribution.D / dashboardMetrics.totalCandidates) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>

              {/* Grade E / F */}
              {isClassPrimary ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-xs font-black text-rose-800 uppercase tracking-wider">GRADE E</div>
                  <div className="text-[10px] text-rose-600 font-semibold mt-0.5">0-20% (Hafifu Sana)</div>
                  <div className="text-3xl font-black text-rose-700 mt-2">
                    {dashboardMetrics.gradeDistribution.E}
                  </div>
                  <div className="text-[11px] text-rose-600 font-bold mt-1">
                    {dashboardMetrics.totalCandidates > 0 
                      ? `${((dashboardMetrics.gradeDistribution.E / dashboardMetrics.totalCandidates) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                  <div className="text-xs font-black text-red-800 uppercase tracking-wider">GRADE F</div>
                  <div className="text-[10px] text-red-600 font-semibold mt-0.5">0-29% (Fail)</div>
                  <div className="text-3xl font-black text-red-700 mt-2">
                    {dashboardMetrics.gradeDistribution.F}
                  </div>
                  <div className="text-[11px] text-red-600 font-bold mt-1">
                    {dashboardMetrics.totalCandidates > 0 
                      ? `${((dashboardMetrics.gradeDistribution.F / dashboardMetrics.totalCandidates) * 100).toFixed(1)}%`
                      : '0%'}
                  </div>
                </div>
              )}
            </div>

            {/* Proportion Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Distribution Proportion</span>
                <span>{dashboardMetrics.totalCandidates} Total Candidates</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                <div 
                  style={{ width: `${dashboardMetrics.totalCandidates > 0 ? (dashboardMetrics.gradeDistribution.A / dashboardMetrics.totalCandidates) * 100 : 0}%` }}
                  className="bg-emerald-500 transition-all duration-300" 
                  title={`Grade A: ${dashboardMetrics.gradeDistribution.A}`}
                />
                <div 
                  style={{ width: `${dashboardMetrics.totalCandidates > 0 ? (dashboardMetrics.gradeDistribution.B / dashboardMetrics.totalCandidates) * 100 : 0}%` }}
                  className="bg-blue-500 transition-all duration-300" 
                  title={`Grade B: ${dashboardMetrics.gradeDistribution.B}`}
                />
                <div 
                  style={{ width: `${dashboardMetrics.totalCandidates > 0 ? (dashboardMetrics.gradeDistribution.C / dashboardMetrics.totalCandidates) * 100 : 0}%` }}
                  className="bg-amber-500 transition-all duration-300" 
                  title={`Grade C: ${dashboardMetrics.gradeDistribution.C}`}
                />
                <div 
                  style={{ width: `${dashboardMetrics.totalCandidates > 0 ? (dashboardMetrics.gradeDistribution.D / dashboardMetrics.totalCandidates) * 100 : 0}%` }}
                  className="bg-orange-500 transition-all duration-300" 
                  title={`Grade D: ${dashboardMetrics.gradeDistribution.D}`}
                />
                <div 
                  style={{ width: `${dashboardMetrics.totalCandidates > 0 ? ((isClassPrimary ? dashboardMetrics.gradeDistribution.E : dashboardMetrics.gradeDistribution.F) / dashboardMetrics.totalCandidates) * 100 : 0}%` }}
                  className="bg-rose-500 transition-all duration-300" 
                  title={`Grade ${isClassPrimary ? 'E' : 'F'}: ${isClassPrimary ? dashboardMetrics.gradeDistribution.E : dashboardMetrics.gradeDistribution.F}`}
                />
              </div>
            </div>
          </div>

          {/* Division Summary Section (Secondary) / Classification (Primary) */}
          {!isClassPrimary ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                NECTA Division Summary ({selectedClass} {selectedStream} - {selectedExam})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">Division I</div>
                  <div className="text-xs text-emerald-600 font-semibold mt-0.5">7-17 pts</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{dashboardMetrics.divI}</div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-blue-800 uppercase">Division II</div>
                  <div className="text-xs text-blue-600 font-semibold mt-0.5">18-21 pts</div>
                  <div className="text-2xl font-black text-blue-700 mt-1">{dashboardMetrics.divII}</div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">Division III</div>
                  <div className="text-xs text-amber-600 font-semibold mt-0.5">22-25 pts</div>
                  <div className="text-2xl font-black text-amber-700 mt-1">{dashboardMetrics.divIII}</div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-orange-800 uppercase">Division IV</div>
                  <div className="text-xs text-orange-600 font-semibold mt-0.5">26-33 pts</div>
                  <div className="text-2xl font-black text-orange-700 mt-1">{dashboardMetrics.divIV}</div>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-red-800 uppercase">Below / Div 0</div>
                  <div className="text-xs text-red-600 font-semibold mt-0.5">34-35 pts</div>
                  <div className="text-2xl font-black text-red-700 mt-1">{dashboardMetrics.div0}</div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-purple-800 uppercase">Incomplete</div>
                  <div className="text-xs text-purple-600 font-semibold mt-0.5">&lt; 7 subjects</div>
                  <div className="text-2xl font-black text-purple-700 mt-1">{dashboardMetrics.divIncomplete}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Primary School Pass Status Classification ({selectedClass} - {selectedExam})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-emerald-800 uppercase">Waliopasi (Passed: Grade A, B, C)</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">Alama 41 - 100%</div>
                  </div>
                  <div className="text-3xl font-black text-emerald-700">{dashboardMetrics.passCount}</div>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-rose-800 uppercase">Hawajapasi (Failed: Grade D, E)</div>
                    <div className="text-xs text-rose-600 font-semibold mt-0.5">Alama 0 - 40%</div>
                  </div>
                  <div className="text-3xl font-black text-rose-700">{dashboardMetrics.failCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Candidates Who Did Not Sit Any Subject (Absenteeism Ledger Audit) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Candidates Who Did Not Sit Any Subject ({dashboardMetrics.noSubjectCount} / {dashboardMetrics.totalCandidates})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official absenteeism audit ledger for {selectedClass} {selectedStream !== 'All' ? selectedStream : ''} ({selectedExam}). Candidates with zero recorded subject marks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Absentee Rate: {dashboardMetrics.noSubjectRate}%
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Sitting Rate: {dashboardMetrics.satRate}%
                </span>
              </div>
            </div>

            {dashboardMetrics.noSubjectCount === 0 ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs font-bold text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Excellent attendance! All {dashboardMetrics.totalCandidates} registered candidates sat and attempted examination subjects. Zero absentees recorded.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-50/80 text-rose-950 border-b border-rose-200 uppercase text-[10px] font-black tracking-wider">
                      <th className="p-2.5 border-r border-rose-200 w-12 text-center">#</th>
                      <th className="p-2.5 border-r border-rose-200 w-28">Reg / Index No</th>
                      <th className="p-2.5 border-r border-rose-200">Candidate Full Name</th>
                      <th className="p-2.5 border-r border-rose-200 text-center w-16">Gender</th>
                      <th className="p-2.5 border-r border-rose-200 w-28">Class & Stream</th>
                      <th className="p-2.5 border-r border-rose-200 text-center w-36">Examination Status</th>
                      <th className="p-2.5 text-center w-28">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allClassCandidates
                      .filter(s => !hasStudentAttemptedAnySubject(s, pendingMarks[s.id]))
                      .map((absentStudent, aIdx) => (
                        <tr key={absentStudent.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-500 font-mono">
                            {aIdx + 1}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-slate-800">
                            {absentStudent.regNo}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                            {absentStudent.name}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                            <span className={absentStudent.gender === 'Female' ? 'text-pink-700' : 'text-blue-700'}>
                              {absentStudent.gender || 'Unknown'}
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-slate-600">
                            {absentStudent.className} {absentStudent.stream || ''}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                              ABSENT / NO MARKS
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery(absentStudent.regNo);
                                setStatusFilter('ALL');
                                setActiveTab('ledger');
                                setIsEditMarksMode(true);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Enter examination scores for this candidate"
                            >
                              Enter Marks
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subject Performance & Grade Distribution Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
              <div>
                <h3 className="text-sm font-bold text-[#1f4d8b] uppercase tracking-wider">
                  Subject Mean Performance & Grade Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed analysis of candidate scores, pass rates, and grade distribution per subject
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPerformancePdf}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Download Report (PDF)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[11px] font-black">
                    <th className="p-3 border-r border-slate-200">Subject</th>
                    <th className="p-3 border-r border-slate-200 text-center">Tested</th>
                    <th className="p-3 border-r border-slate-200 text-center">Mean Score</th>
                    <th className="p-3 border-r border-slate-200 text-center">Pass Rate</th>
                    <th className="p-3 border-r border-slate-200 text-center bg-emerald-50 text-emerald-800">A</th>
                    <th className="p-3 border-r border-slate-200 text-center bg-blue-50 text-blue-800">B</th>
                    <th className="p-3 border-r border-slate-200 text-center bg-amber-50 text-amber-800">C</th>
                    <th className="p-3 border-r border-slate-200 text-center bg-orange-50 text-orange-800">D</th>
                    <th className="p-3 border-r border-slate-200 text-center bg-rose-50 text-rose-800">
                      {isClassPrimary ? 'E' : 'F'}
                    </th>
                    <th className="p-3 border-r border-slate-200 text-center">Highest</th>
                    <th className="p-3 text-center">Lowest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardMetrics.subjectPerformances.map((sub, idx) => (
                    <tr key={sub.subjectKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                        <span>{sub.subjectName}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-400">({sub.subjectKey})</span>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono text-slate-700">
                        {sub.testedCount}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-black text-blue-700">
                        {sub.testedCount > 0 ? `${sub.meanScore}%` : '-'}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-emerald-700">
                        {sub.testedCount > 0 ? `${sub.passRate}%` : '-'}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                        {sub.grades.A}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-blue-800 bg-blue-50/40">
                        {sub.grades.B}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-amber-800 bg-amber-50/40">
                        {sub.grades.C}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-orange-800 bg-orange-50/40">
                        {sub.grades.D}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-rose-800 bg-rose-50/40">
                        {isClassPrimary ? sub.grades.E : sub.grades.F}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono text-slate-800">
                        {sub.testedCount > 0 ? sub.highest : '-'}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-800">
                        {sub.testedCount > 0 ? sub.lowest : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORT CARD (Screenshot F) */}
      {activeTab === 'reportcard' && (
        <div className="space-y-4">
          {/* Report Card Action Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStudent}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedStudentReg}
                onChange={e => setSelectedStudentReg(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-800 max-w-xs"
              >
                {students.map(s => (
                  <option key={s.id} value={s.regNo}>
                    {s.regNo} - {s.name} ({s.className})
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextStudent}
                disabled={currentIndex >= students.length - 1}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Remarks</span>
              </button>

              <button
                onClick={handlePrintReport}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={handlePrintReport}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report Card</span>
              </button>

              <button
                onClick={() => {
                  if (allClassCandidates.length === 0) return;
                  printReportCardDocument(
                    'bulk-reports-printable-container',
                    reportOrientation,
                    `All Students ${selectedClass}`,
                    schoolInfo.name
                  );
                }}
                className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Print all students report cards for this class, strictly one student per page without overlapping"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print All Class Reports ({allClassCandidates.length})</span>
              </button>
            </div>
          </div>

          {/* Bulk Printable Container for All Class Students - Strictly 1 student per page */}
          <div id="bulk-reports-printable-container" className="hidden">
            {allClassCandidates.map(cand => (
              <ReportCardDocument
                key={cand.id}
                student={cand}
                schoolInfo={schoolInfo}
                orientation={reportOrientation}
                allStudents={allClassCandidates}
              />
            ))}
          </div>

          {/* Report Card Printable Component */}
          {reportStudent && (
            <div id="report-card-printable-area" className="bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-sm">
              <ReportCardDocument
                student={reportStudent}
                schoolInfo={schoolInfo}
                orientation={reportOrientation}
                allStudents={allClassCandidates.length > 0 ? allClassCandidates : students}
              />
            </div>
          )}

          {/* Edit Modal */}
          {isEditModalOpen && reportStudent && (
            <EditReportCardModal
              isOpen={isEditModalOpen}
              student={reportStudent}
              onClose={() => setIsEditModalOpen(false)}
              onSave={(updated) => {
                onUpdateStudent(updated);
                setIsEditModalOpen(false);
                setSaveToast(`Report card remarks updated for ${updated.name}!`);
                setTimeout(() => setSaveToast(null), 3000);
              }}
            />
          )}
        </div>
      )}

      {/* TAB 4: MULTI-STUDENT SIDE-BY-SIDE PERFORMANCE COMPARISON */}
      {activeTab === 'comparison' && (
        <StudentComparisonView
          students={students}
          classCandidates={classCandidates}
          selectedCandidateIds={selectedCandidateIds}
          onToggleSelectCandidate={handleToggleSelectCandidate}
          onClearSelectedCandidates={() => setSelectedCandidateIds([])}
          onSelectCandidates={(ids) => setSelectedCandidateIds(ids)}
          activeLedgerSubjects={activeLedgerSubjects}
          selectedClass={selectedClass}
          selectedStream={selectedStream}
          selectedExam={selectedExam}
          schoolInfo={schoolInfo}
          onBackToLedger={() => setActiveTab('ledger')}
        />
      )}

      {/* MODAL 1: CUSTOMIZE SUBJECTS MODAL */}
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Customize Academic Marks Ledger Subjects</h3>
                  <p className="text-xs text-slate-500">
                    Select which subjects to display or omit in the ledger, CSV templates, and exports.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets and Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 mr-1">
                  Presets ({currentSectionLevel}):
                </span>
                {currentSectionLevel === 'SECONDARY' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(['ENG', 'KIS', 'B.MATH', 'GEO', 'HIS', 'BIO', 'CIV'])}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-800 cursor-pointer"
                    >
                      Secondary Core 7
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(DEFAULT_ACTIVE_SUBJECT_KEYS)}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-50 border border-indigo-300 hover:bg-indigo-100 text-indigo-800 cursor-pointer"
                    >
                      All Secondary Active (10)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(['B.MATH', 'PHY', 'CHE', 'BIO', 'GEO'])}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-emerald-700 cursor-pointer"
                    >
                      Sciences
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(['ENG', 'KIS', 'GEO', 'HIS', 'CIV', 'H.TZ'])}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-amber-700 cursor-pointer"
                    >
                      Arts & Social
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(['B.MATH', 'BUS', 'B.KEEP', 'COMM', 'ENG', 'KIS'])}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-purple-700 cursor-pointer"
                    >
                      Commercial
                    </button>
                  </>
                )}
                {currentSectionLevel === 'PRIMARY' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(PRIMARY_UPPER_SUBJECT_KEYS)}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                    >
                      Primary Std 3-7 (8 Subjects)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSubjectKeys(PRIMARY_LOWER_SUBJECT_KEYS)}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-800 cursor-pointer"
                    >
                      Primary Std 1-2 (5 Subjects)
                    </button>
                  </>
                )}
                {currentSectionLevel === 'NURSERY' && (
                  <button
                    type="button"
                    onClick={() => handleSaveSubjectKeys(NURSERY_SUBJECT_KEYS)}
                    className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 cursor-pointer"
                  >
                    Nursery Level (6 Areas)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveSubjectKeys(ALL_AVAILABLE_SUBJECTS.filter(s => s.level === currentSectionLevel).map(s => s.key))}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  Show All {currentSectionLevel} ({ALL_AVAILABLE_SUBJECTS.filter(s => s.level === currentSectionLevel).length})
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Category tabs */}
                <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold py-0.5">
                  {['ALL', 'Core', 'Sciences', 'Languages', 'Social', 'Commercial', 'Technical', 'Religion', 'Arts'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSubjectCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        subjectCategoryFilter === cat 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-200/70 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subject..."
                    value={subjectSearchQuery}
                    onChange={e => setSubjectSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-300 rounded-lg w-44 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Subject Checkboxes Grid */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_AVAILABLE_SUBJECTS
                  .filter(s => {
                    const matchLevel = s.level === currentSectionLevel;
                    const matchCat = subjectCategoryFilter === 'ALL' || s.category === subjectCategoryFilter;
                    const matchQ = !subjectSearchQuery || 
                      s.fullName.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                      s.key.toLowerCase().includes(subjectSearchQuery.toLowerCase());
                    return matchLevel && matchCat && matchQ;
                  })
                  .map(sub => {
                    const isChecked = selectedSubjectKeys.includes(sub.key);
                    return (
                      <label
                        key={sub.key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked 
                            ? 'bg-blue-50/60 border-blue-300 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (selectedSubjectKeys.length <= 1) {
                                  alert('At least one subject must remain selected for the ledger.');
                                  return;
                                }
                                handleSaveSubjectKeys(selectedSubjectKeys.filter(k => k !== sub.key));
                              } else {
                                handleSaveSubjectKeys([...selectedSubjectKeys, sub.key]);
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{sub.fullName}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold">
                                {sub.key}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Category: {sub.category}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isChecked ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isChecked ? 'Included' : 'Omitted'}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                <strong>{selectedSubjectKeys.length}</strong> of {ALL_AVAILABLE_SUBJECTS.length} subjects currently active in ledger
              </span>
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Done & Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD MARKS CSV MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Multiple Upload of Marks (CSV Import)</h3>
                  <p className="text-xs text-slate-500">
                    Upload candidate marks spreadsheet for {selectedClass} ({selectedExam}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadCsvFile(null);
                  setUploadParsedRows([]);
                  setUploadError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Step 1: Download Template */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Step 1: Download Standard CSV Template</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-populated with all candidate names, registration numbers, and currently active subject headers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadCsvTemplate(false)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Blank Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsvTemplate(true)}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Template with Current Marks</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload CSV File */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Step 2: Select or Drop Completed CSV</h4>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl p-6 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-700">
                    {uploadCsvFile ? uploadCsvFile.name : 'Click to browse or drop CSV file here'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Accepts comma-separated .csv files formatted with candidate identifiers and subject columns
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Error Display */}
              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error importing CSV: </span>
                    <span>{uploadError}</span>
                  </div>
                </div>
              )}

              {/* Step 3: Live Preview Table */}
              {uploadParsedRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      Step 3: Verification & Import Preview ({uploadParsedRows.length} candidates detected)
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                      {uploadParsedRows.filter(p => p.matched).length} matched candidates ready
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                        <tr>
                          <th className="p-2 border-b border-r border-slate-200">Status</th>
                          <th className="p-2 border-b border-r border-slate-200">Candidate</th>
                          <th className="p-2 border-b border-r border-slate-200">Reg No</th>
                          <th className="p-2 border-b border-slate-200">Scores Detected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {uploadParsedRows.map((row, rIdx) => (
                          <tr key={rIdx} className={row.matched ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                            <td className="p-2 border-r border-slate-200 font-bold">
                              {row.matched ? (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                                </span>
                              ) : (
                                <span className="text-rose-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Unmatched
                                </span>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                              {row.studentName}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                              {row.regNo}
                            </td>
                            <td className="p-2 text-slate-700 font-mono">
                              {Object.entries(row.scores)
                                .map(([sub, score]) => `${sub}: ${score}`)
                                .join(' | ') || 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadCsvFile(null);
                  setUploadParsedRows([]);
                  setUploadError(null);
                }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={uploadParsedRows.filter(p => p.matched).length === 0}
                onClick={handleApplyCsvUpload}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Import & Save All Marks ({uploadParsedRows.filter(p => p.matched).length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK DELETE / CLEAR MARKS MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Clear Candidate Marks</h3>
                  <p className="text-xs text-rose-700">
                    Bulk delete scores for selected candidates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                You have selected <strong className="text-slate-900">{selectedCandidateIds.length} candidate(s)</strong>. 
                Please choose which marks you want to clear:
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Scope of Marks to Delete:
                </label>
                <select
                  value={bulkClearTarget}
                  onChange={e => setBulkClearTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="ALL">All Subjects (Clear entire candidate result)</option>
                  <optgroup label="Specific Subject Only:">
                    {ALL_AVAILABLE_SUBJECTS.map(sub => (
                      <option key={sub.key} value={sub.key}>
                        {sub.fullName} ({sub.key})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Totals, class ranks, averages, and NECTA division standings will be automatically recalculated immediately.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteMarks}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Exam Documents Modal (Photo Entry, ISAL, CAL) */}
      <ExamDocumentsModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        exams={exams || []}
        students={students}
        schoolInfo={schoolInfo}
        initialClass={selectedClass}
        initialStream={selectedStream}
      />

      {/* Grade Cutoff & NECTA Criteria Modal */}
      {isCutoffModalOpen && (
        <GradeCutoffModal
          isOpen={isCutoffModalOpen}
          onClose={() => setIsCutoffModalOpen(false)}
          selectedExamName={selectedExam}
          selectedClassName={selectedClass}
          onSaveCutoffs={(policy) => {
            setSaveToast(`Cutoffs updated for ${selectedClass} (${policy.title})`);
            setTimeout(() => setSaveToast(null), 3000);
          }}
        />
      )}

      {/* USAL (Sealed Marksheet) & CSEE / CPS Modal */}
      {isUsalModalOpen && (
        <USALModal
          isOpen={isUsalModalOpen}
          onClose={() => setIsUsalModalOpen(false)}
          usalRecords={usalRecords}
          onSaveUsalRecord={(rec) => {
            if (onSaveUsalRecord) onSaveUsalRecord(rec);
          }}
          students={students}
          teachers={teachers}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          selectedExamName={selectedExam}
        />
      )}

      {/* Clean Printable Results Ledger PDF Modal */}
      {isPdfExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="no-print bg-[#0f2948] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-300">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Official Examination Results Ledger (PDF / Print)</h3>
                  <p className="text-xs text-blue-200">
                    Filtered by: {selectedClass} • {selectedStream !== 'All' ? `Stream ${selectedStream}` : 'All Streams'} • {selectedTerm} • Year {selectedYear} • {selectedExam}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfExportModalOpen(false)}
                  className="p-2 text-white/70 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-900 bg-white" id="results-view-pdf-print-area">
              {/* Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-4">
                  {schoolInfo?.logo && (
                    <img src={schoolInfo.logo} alt="School Logo" className="w-16 h-16 object-contain" />
                  )}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">
                      {schoolInfo?.name || 'HABY EDU PRO SCHOOL'}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 uppercase">
                      OFFICIAL EXAMINATION RESULT RECORD &amp; MARKS LEDGER
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      CTR: {schoolInfo?.schoolNumber || 'S.0123'} • {schoolInfo?.address || 'Tanzania'} • Tel: {schoolInfo?.phone || '+255...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Class Level:</span>
                  <strong className="text-slate-900 font-black">{selectedClass}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Stream:</span>
                  <strong className="text-slate-900 font-black">{selectedStream !== 'All' ? selectedStream : 'All Streams'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Academic Year:</span>
                  <strong className="text-slate-900 font-black">{selectedYear}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Term &amp; Exam:</span>
                  <strong className="text-slate-900 font-black">{selectedTerm} ({selectedExam})</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Candidates:</span>
                  <strong className="text-blue-900 font-black">{classCandidates.length} Students</strong>
                </div>
              </div>

              {/* Cohort Performance Summary */}
              <div className="flex items-center justify-between gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs flex-wrap">
                <span className="font-bold text-blue-950">Cohort Statistics:</span>
                <div className="flex items-center gap-3 flex-wrap text-xs font-bold">
                  <span className="text-blue-800">Boys: {classCandidates.filter(c => c.gender?.toLowerCase().startsWith('m')).length}</span>
                  <span className="text-rose-800">Girls: {classCandidates.filter(c => c.gender?.toLowerCase().startsWith('f')).length}</span>
                  <span className="text-slate-700">|</span>
                  <span className="text-emerald-700">Class Average: {dashboardMetrics.avgOverall}%</span>
                  <span className="text-blue-700">Pass Rate: {dashboardMetrics.passRate}%</span>
                </div>
              </div>

              {/* Results Table with Remarks */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5 text-center w-10 border-r border-blue-900">Pos</th>
                      <th className="p-2.5 border-r border-blue-900">Reg No</th>
                      <th className="p-2.5 border-r border-blue-900">Student Name</th>
                      <th className="p-2.5 text-center w-12 border-r border-blue-900">Sex</th>
                      {activeLedgerSubjects.slice(0, 8).map(sub => (
                        <th key={sub.key} className="p-2 text-center border-r border-blue-900 max-w-[85px] truncate" title={sub.fullName}>
                          {sub.label}
                        </th>
                      ))}
                      <th className="p-2.5 text-center border-r border-blue-900 w-12">Total</th>
                      <th className="p-2.5 text-center border-r border-blue-900 w-14">Avg%</th>
                      <th className="p-2.5 text-center border-r border-blue-900 w-14">Grade/Div</th>
                      <th className="p-2.5 min-w-[180px]">Teacher Remarks &amp; Annotations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {classCandidates.map((st, i) => {
                      const pos = st.reportCardData?.positionInClass ?? i + 1;
                      const remarks = st.reportCardData?.classTeacherRemarks || 'Good progress and steady participation.';
                      return (
                        <tr key={st.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2 text-center font-black border-r border-slate-200">
                            {pos}
                          </td>
                          <td className="p-2 font-mono text-slate-700 border-r border-slate-200">
                            {st.regNo}
                          </td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                            {st.name}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-bold">
                            {st.gender?.toLowerCase().startsWith('f') ? 'F' : 'M'}
                          </td>
                          {activeLedgerSubjects.slice(0, 8).map(sub => {
                            const sc = getScore(st, sub.fullName, sub.key);
                            return (
                              <td key={sub.key} className="p-2 text-center border-r border-slate-200 font-mono font-bold">
                                {sc !== '' ? sc : '-'}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-black text-slate-900 border-r border-slate-200">
                            {st.total ?? '-'}
                          </td>
                          <td className="p-2 text-center font-black text-blue-900 border-r border-slate-200">
                            {st.average ? `${st.average}%` : '-'}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-bold">
                            {isClassPrimary 
                              ? (st.primaryGrade || st.division ? `Grade ${st.primaryGrade || st.division}` : '-')
                              : (st.division ? `Div ${st.division}` : '-')}
                          </td>
                          <td className="p-2 text-slate-800 text-xs italic">
                            {remarks}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Official Signatures Section */}
              <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mwalimu wa Darasa (Class Teacher):</span>
                  <div className="mt-8 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">Saini na Tarehe</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mwalimu wa Taaluma (Academic Master):</span>
                  <div className="mt-8 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">Saini na Tarehe</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mkuu wa Shule (Head of School):</span>
                  <div className="mt-8 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">Muhuri Rasmi na Saini</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
