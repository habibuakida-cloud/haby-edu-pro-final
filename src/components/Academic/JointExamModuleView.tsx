import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Save,
  Award,
  Users,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  Download,
  RefreshCw,
  Palette,
  Edit3,
  UserPlus,
  Filter,
  Trophy,
  BarChart3,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Wrench,
  GraduationCap,
  TrendingUp,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolInfo, Student, UserAccount } from '../../types';
import {
  computeSchoolGpaLeaderboard,
  computeStudentGpaFromResult,
  getStudentRegisteredSubjects,
  generateRealisticStudentName,
  computeSubjectGradeSummary,
  computeOverallDivisionSummary,
} from './jointExamGpaUtils';
import { JointSchoolGpaLeaderboard } from './JointSchoolGpaLeaderboard';
import {
  JointBulkRegistrationAndMarks,
  DraftJointStudentRow,
} from './JointBulkRegistrationAndMarks';
import { JointResultsSummaryTables } from './JointResultsSummaryTables';

export interface JointExam {
  id: string;
  schoolId?: string | null;
  name: string;
  examDate: string;
  className: string;
  level: string;
  subjects: string[];
  status: string;
  schoolCount?: number;
  studentCount?: number;
}

export interface JointSchool {
  id: string;
  jointExamId: string;
  schoolCode: string;
  schoolName: string;
  hexColor: string;
  region?: string | null;
  district?: string | null;
}

export interface JointResult {
  id: string;
  jointExamId: string;
  jointSchoolId: string;
  studentName: string;
  regNo: string;
  gender: string;
  stream: string;
  subjectMarks: Record<string, number>;
  subjectGrades: Record<string, string>;
  registeredSubjects?: string[];
  gpa?: number;
  subjectsSat: number;
  totalMarks: number;
  averageScore: number;
  overallGrade: string;
  best7Points: number | null;
  division: string;
  schoolRank: number;
  overallRank: number;
  schoolName: string;
  schoolCode: string;
  hexColor: string;
}

export interface IntegrityIssue {
  id: string;
  rowIndex: number;
  studentName: string;
  regNo: string;
  subject?: string;
  type: 'OUT_OF_RANGE' | 'GRADE_MISMATCH' | 'DUPLICATE_REG_NO' | 'EMPTY_MARKS';
  severity: 'error' | 'warning';
  rawValue: string;
  expectedValue?: string;
  computedValue?: string;
  message: string;
}

interface JointExamModuleViewProps {
  schoolInfo: SchoolInfo;
  students: Student[];
  currentUser?: UserAccount | null;
  schoolId?: string;
}

const PRESET_SCHOOL_COLORS = [
  { hex: '#1E40AF', label: 'Royal Blue (#1E40AF)' },
  { hex: '#047857', label: 'Emerald Green (#047857)' },
  { hex: '#B91C1C', label: 'Crimson Red (#B91C1C)' },
  { hex: '#7C3AED', label: 'Royal Purple (#7C3AED)' },
  { hex: '#D97706', label: 'Amber Gold (#D97706)' },
  { hex: '#0E7490', label: 'Ocean Cyan (#0E7490)' },
  { hex: '#BE185D', label: 'Deep Rose (#BE185D)' },
  { hex: '#334155', label: 'Slate Navy (#334155)' },
];

const PRIMARY_NECTA_SUBJECTS = [
  'KISWAHILI',
  'ENGLISH',
  'HISABATI (MATHEMATICS)',
  'SAYANSI NA TEKNOLOJIA',
  'MAARIFA YA JAMII NA STADI ZA KAZI',
  'URAIA NA MAADILI',
];

const SECONDARY_NECTA_SUBJECTS = [
  'CIVICS',
  'HISTORY',
  'GEOGRAPHY',
  'KISWAHILI',
  'ENGLISH',
  'BIOLOGY',
  'BASIC MATHEMATICS',
  'PHYSICS',
  'CHEMISTRY',
  'COMMERCE',
  'BOOK-KEEPING',
  'INFORMATION & COMPUTER STUDIES',
  'BIBLE KNOWLEDGE',
  'ELIMU YA DINI YA KIISLAMU',
  'AGRICULTURE',
];

const STANDARD_NECTA_SUBJECTS = Array.from(
  new Set([...PRIMARY_NECTA_SUBJECTS, ...SECONDARY_NECTA_SUBJECTS])
);

const PRIMARY_CLASSES = [
  'Standard 7',
  'Standard 6',
  'Standard 5',
  'Standard 4',
  'Standard 3',
  'Standard 2',
  'Standard 1',
];

const SECONDARY_CLASSES = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
];

export function isPrimaryEducationLevel(level?: string | null, className?: string | null): boolean {
  const lv = String(level || '').toUpperCase();
  const cls = String(className || '').toUpperCase();
  return (
    lv.includes('PRIMARY') ||
    lv.includes('PSLE') ||
    lv.includes('SFNA') ||
    lv.includes('MSINGI') ||
    cls.includes('STANDARD') ||
    cls.includes('DARASA') ||
    cls.includes('STD')
  );
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || '#1E40AF').replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [Number.isNaN(r) ? 30 : r, Number.isNaN(g) ? 64 : g, Number.isNaN(b) ? 175 : b];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [Number.isNaN(r) ? 30 : r, Number.isNaN(g) ? 64 : g, Number.isNaN(b) ? 175 : b];
}

function tintRgb(rgb: [number, number, number], factor = 0.88): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
}

function computeLocalNectaGrade(score: number, isPrimary = false): { grade: string; points: number } {
  const r = Math.round(score);
  if (isPrimary) {
    if (r >= 81) return { grade: 'A', points: 1 };
    if (r >= 61) return { grade: 'B', points: 2 };
    if (r >= 41) return { grade: 'C', points: 3 };
    if (r >= 21) return { grade: 'D', points: 4 };
    return { grade: 'E', points: 5 };
  }
  if (r >= 75) return { grade: 'A', points: 1 };
  if (r >= 65) return { grade: 'B', points: 2 };
  if (r >= 45) return { grade: 'C', points: 3 };
  if (r >= 30) return { grade: 'D', points: 4 };
  return { grade: 'F', points: 5 };
}

/**
 * Parses a mark cell string which can be either:
 * - A plain numeric mark: "82", "105", "-5"
 * - A mark with an expected/sheet grade tag: "82 A", "82 (B)", "82:B", "82-C"
 */
function parseMarkInput(
  rawInput: string | number | undefined | null,
  isPrimary = false
): {
  isEmpty: boolean;
  numericScore: number | null;
  taggedGrade: string | null;
  computedGrade: string | null;
  isOutOfRange: boolean;
  isGradeMismatch: boolean;
} {
  if (rawInput === undefined || rawInput === null) {
    return {
      isEmpty: true,
      numericScore: null,
      taggedGrade: null,
      computedGrade: null,
      isOutOfRange: false,
      isGradeMismatch: false,
    };
  }
  const str = String(rawInput).trim();
  if (!str) {
    return {
      isEmpty: true,
      numericScore: null,
      taggedGrade: null,
      computedGrade: null,
      isOutOfRange: false,
      isGradeMismatch: false,
    };
  }

  // Match optional number and optional trailing grade letter (A, B, C, D, E, F)
  const match = str.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:[\(\:\-\/\s]\s*([A-Fa-f])\s*\)?)?$/);
  if (!match) {
    const fallbackNum = Number(str);
    if (Number.isNaN(fallbackNum)) {
      return {
        isEmpty: false,
        numericScore: null,
        taggedGrade: null,
        computedGrade: null,
        isOutOfRange: true,
        isGradeMismatch: false,
      };
    }
    const out = fallbackNum < 0 || fallbackNum > 100;
    const comp = !out ? computeLocalNectaGrade(fallbackNum, isPrimary).grade : null;
    return {
      isEmpty: false,
      numericScore: fallbackNum,
      taggedGrade: null,
      computedGrade: comp,
      isOutOfRange: out,
      isGradeMismatch: false,
    };
  }

  const num = Number(match[1]);
  const tagged = match[2] ? match[2].toUpperCase() : null;
  const out = Number.isNaN(num) || num < 0 || num > 100;
  const comp = !out ? computeLocalNectaGrade(num, isPrimary).grade : null;
  const mismatch = Boolean(!out && tagged && comp && tagged !== comp);

  return {
    isEmpty: false,
    numericScore: num,
    taggedGrade: tagged,
    computedGrade: comp,
    isOutOfRange: out,
    isGradeMismatch: mismatch,
  };
}

function computeLocalPreview(
  marks: Record<string, string | number>,
  examSubjects: string[],
  isPrimary = false
) {
  const points: number[] = [];
  let sum = 0;
  let sat = 0;

  for (const subj of examSubjects) {
    const parsed = parseMarkInput(marks[subj], isPrimary);
    if (!parsed.isEmpty && parsed.numericScore !== null && !parsed.isOutOfRange) {
      sum += parsed.numericScore;
      sat += 1;
      points.push(computeLocalNectaGrade(parsed.numericScore, isPrimary).points);
    }
  }

  const avg = sat > 0 ? Number((sum / sat).toFixed(2)) : 0;
  const grade = sat > 0 ? computeLocalNectaGrade(avg, isPrimary).grade : '-';

  let best7: number | null = null;
  let div = '-';
  if (examSubjects.length >= 7 && sat >= 7) {
    const sorted = [...points].sort((a, b) => a - b);
    best7 = sorted.slice(0, 7).reduce((a, b) => a + b, 0);
    if (best7 >= 7 && best7 <= 17) div = 'I';
    else if (best7 >= 18 && best7 <= 21) div = 'II';
    else if (best7 >= 22 && best7 <= 25) div = 'III';
    else if (best7 >= 26 && best7 <= 33) div = 'IV';
    else div = '0';
  }

  return { total: Number(sum.toFixed(1)), avg, grade, best7, div, sat };
}

const JOINT_LOCAL_STORAGE_KEY = 'haby_joint_exams_store_v1';

interface LocalJointStore {
  exams: JointExam[];
  schools: JointSchool[];
  results: JointResult[];
}

function loadLocalJointStore(): LocalJointStore {
  if (typeof window === 'undefined') return { exams: [], schools: [], results: [] };
  try {
    const raw = localStorage.getItem(JOINT_LOCAL_STORAGE_KEY);
    if (!raw) return { exams: [], schools: [], results: [] };
    const parsed = JSON.parse(raw);
    return {
      exams: Array.isArray(parsed?.exams) ? parsed.exams : [],
      schools: Array.isArray(parsed?.schools) ? parsed.schools : [],
      results: Array.isArray(parsed?.results) ? parsed.results : [],
    };
  } catch {
    return { exams: [], schools: [], results: [] };
  }
}

function saveLocalJointStore(store: LocalJointStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(JOINT_LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

function makeUuidFallback(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function recalculateLocalResultsForExam(
  exam: JointExam,
  schoolsList: JointSchool[],
  rawResultsList: JointResult[]
): JointResult[] {
  const isPrimary = isPrimaryEducationLevel(exam.level, exam.className);
  const examSubjs = Array.isArray(exam.subjects) ? exam.subjects : [];
  const schoolMap = new Map(schoolsList.map((s) => [s.id, s]));

  const computed = rawResultsList.map((row) => {
    const rawMarks = row.subjectMarks && typeof row.subjectMarks === 'object' ? row.subjectMarks : {};
    const regSubjs = getStudentRegisteredSubjects(row, examSubjs);
    const regSet = new Set(regSubjs.map((s) => s.toUpperCase()));
    const cleanMarks: Record<string, number> = {};
    const subjectGrades: Record<string, string> = {};
    const pointsList: number[] = [];

    const subjsToEval = examSubjs.length > 0 ? examSubjs : Object.keys(rawMarks);
    for (const subj of subjsToEval) {
      if (regSet.size > 0 && !regSet.has(subj.toUpperCase())) continue;
      const val = rawMarks[subj];
      if (val !== undefined && val !== null && String(val) !== '') {
        const num = Number(val);
        if (!Number.isNaN(num) && num >= 0 && num <= 100) {
          const clamped = Math.round(num * 100) / 100;
          cleanMarks[subj] = clamped;
          const gp = computeLocalNectaGrade(clamped, isPrimary);
          subjectGrades[subj] = gp.grade;
          pointsList.push(gp.points);
        }
      }
    }

    const subjectsSat = pointsList.length;
    const totalMarks = Number(Object.values(cleanMarks).reduce((a, b) => a + b, 0).toFixed(2));
    const averageScore = subjectsSat > 0 ? Number((totalMarks / subjectsSat).toFixed(2)) : 0;
    const overallGrade =
      subjectsSat > 0 ? computeLocalNectaGrade(averageScore, isPrimary).grade : isPrimary ? 'E' : 'F';

    let best7Points: number | null = null;
    let division = '-';
    if (subjsToEval.length >= 7 && subjectsSat >= 7) {
      const sortedPts = [...pointsList].sort((a, b) => a - b);
      best7Points = sortedPts.slice(0, 7).reduce((a, b) => a + b, 0);
      if (best7Points >= 7 && best7Points <= 17) division = 'I';
      else if (best7Points >= 18 && best7Points <= 21) division = 'II';
      else if (best7Points >= 22 && best7Points <= 25) division = 'III';
      else if (best7Points >= 26 && best7Points <= 33) division = 'IV';
      else division = '0';
    }

    const gpa =
      subjsToEval.length >= 7 && subjectsSat >= 7 && best7Points !== null
        ? Number((best7Points / 7).toFixed(4))
        : subjectsSat > 0
        ? Number((pointsList.reduce((a, b) => a + b, 0) / subjectsSat).toFixed(4))
        : 5.0;

    const sch = schoolMap.get(row.jointSchoolId);
    return {
      ...row,
      registeredSubjects: regSubjs,
      gpa,
      subjectMarks: cleanMarks,
      subjectGrades,
      subjectsSat,
      totalMarks,
      averageScore,
      overallGrade,
      best7Points,
      division,
      schoolName: sch?.schoolName || row.schoolName || 'School',
      schoolCode: sch?.schoolCode || row.schoolCode || 'S0101',
      hexColor: sch?.hexColor || row.hexColor || '#1E40AF',
      schoolRank: 1,
      overallRank: 1,
    };
  });

  const comparePerf = (a: JointResult, b: JointResult) => {
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;
    if (a.best7Points !== null && b.best7Points !== null && a.best7Points !== b.best7Points) {
      return a.best7Points - b.best7Points;
    }
    return 0;
  };

  const overallSorted = [...computed].sort(comparePerf);
  for (let i = 0; i < overallSorted.length; i++) {
    if (i > 0 && comparePerf(overallSorted[i - 1], overallSorted[i]) === 0) {
      overallSorted[i].overallRank = overallSorted[i - 1].overallRank;
    } else {
      overallSorted[i].overallRank = i + 1;
    }
  }

  const bySchool = new Map<string, JointResult[]>();
  for (const item of overallSorted) {
    const arr = bySchool.get(item.jointSchoolId) || [];
    arr.push(item);
    bySchool.set(item.jointSchoolId, arr);
  }
  for (const [, schArr] of bySchool.entries()) {
    schArr.sort(comparePerf);
    for (let i = 0; i < schArr.length; i++) {
      if (i > 0 && comparePerf(schArr[i - 1], schArr[i]) === 0) {
        schArr[i].schoolRank = schArr[i - 1].schoolRank;
      } else {
        schArr[i].schoolRank = i + 1;
      }
    }
  }

  return overallSorted;
}

export const JointExamModuleView: React.FC<JointExamModuleViewProps> = ({
  schoolInfo,
  students,
  currentUser,
  schoolId,
}) => {
  const [exams, setExams] = useState<JointExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [currentExam, setCurrentExam] = useState<JointExam | null>(null);
  const [schools, setSchools] = useState<JointSchool[]>([]);
  const [results, setResults] = useState<JointResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Education Level Filter for Exam List: 'ALL' | 'PRIMARY' | 'SECONDARY'
  const [examLevelFilter, setExamLevelFilter] = useState<'ALL' | 'PRIMARY' | 'SECONDARY'>('ALL');

  // Active Tab: 'results' (Dual View Results & Analytics) | 'analytics' (Performance Analytics Dashboard) | 'entry' (Dynamic School Entry Form) | 'schools' (Participating Schools & Subjects Setup)
  const [activeTab, setActiveTab] = useState<'results' | 'analytics' | 'entry' | 'schools'>('results');
  const [showAnalyticsInResults, setShowAnalyticsInResults] = useState<boolean>(true);

  // Dual View Mode in Results Tab: 'combined' (Mtazamo wa Pamoja) vs 'individual' (Mtazamo wa Shule Binafsi)
  const [viewMode, setViewMode] = useState<'combined' | 'individual'>('combined');
  const [filterSchoolId, setFilterSchoolId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamic Mark Entry State
  const [entrySchoolId, setEntrySchoolId] = useState<string>('');
  const [draftRows, setDraftRows] = useState<DraftJointStudentRow[]>([]);
  const [showIntegrityDetails, setShowIntegrityDetails] = useState<boolean>(true);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);

  // New Exam Modal State
  const [showNewExamModal, setShowNewExamModal] = useState<boolean>(false);
  const [newExamEducationType, setNewExamEducationType] = useState<'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [newExamName, setNewExamName] = useState<string>('MTIHANI WA PAMOJA WA KANDA (JOINT MOCK EXAMINATION)');
  const [newExamDate, setNewExamDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newExamClass, setNewExamClass] = useState<string>('Form 4');
  const [newExamLevel, setNewExamLevel] = useState<string>('SECONDARY - CSEE');
  const [newExamSubjects, setNewExamSubjects] = useState<string[]>([
    'CIVICS',
    'HISTORY',
    'GEOGRAPHY',
    'KISWAHILI',
    'ENGLISH',
    'BIOLOGY',
    'BASIC MATHEMATICS',
  ]);
  const [customSubjectInput, setCustomSubjectInput] = useState<string>('');
  const [newExamInitialSchools, setNewExamInitialSchools] = useState<
    Array<{ schoolCode: string; schoolName: string; hexColor: string }>
  >([
    {
      schoolCode: schoolInfo?.centerNumber || 'S0101',
      schoolName: schoolInfo?.name || 'SHULE YA SEKONDARI A',
      hexColor: '#1E40AF',
    },
    {
      schoolCode: 'S0204',
      schoolName: 'SHULE YA SEKONDARI B',
      hexColor: '#047857',
    },
  ]);

  // New Participating School Form State
  const [newSchoolCode, setNewSchoolCode] = useState<string>('');
  const [newSchoolName, setNewSchoolName] = useState<string>('');
  const [newSchoolColor, setNewSchoolColor] = useState<string>('#B91C1C');
  const [newSchoolRegion, setNewSchoolRegion] = useState<string>('');

  const showNotice = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const handleSelectModalEducationType = (eduType: 'PRIMARY' | 'SECONDARY') => {
    setNewExamEducationType(eduType);
    if (eduType === 'PRIMARY') {
      setNewExamClass('Standard 7');
      setNewExamLevel('PRIMARY - PSLE');
      setNewExamName('MTIHANI WA PAMOJA WA SHULE ZA MSINGI (PRIMARY JOINT MOCK EXAM)');
      setNewExamSubjects([...PRIMARY_NECTA_SUBJECTS]);
      setNewExamInitialSchools((prev) =>
        prev.map((sch, idx) => ({
          ...sch,
          schoolCode: sch.schoolCode.startsWith('S0')
            ? sch.schoolCode.replace(/^S0/, 'PS0')
            : sch.schoolCode,
          schoolName: sch.schoolName.includes('SEKONDARI')
            ? sch.schoolName.replace('SEKONDARI', 'MSINGI')
            : sch.schoolName || `SHULE YA MSINGI ${String.fromCharCode(65 + idx)}`,
        }))
      );
    } else {
      setNewExamClass('Form 4');
      setNewExamLevel('SECONDARY - CSEE');
      setNewExamName('MTIHANI WA PAMOJA WA SHULE ZA SEKONDARI (SECONDARY JOINT MOCK EXAM)');
      setNewExamSubjects([
        'CIVICS',
        'HISTORY',
        'GEOGRAPHY',
        'KISWAHILI',
        'ENGLISH',
        'BIOLOGY',
        'BASIC MATHEMATICS',
      ]);
      setNewExamInitialSchools((prev) =>
        prev.map((sch, idx) => ({
          ...sch,
          schoolCode: sch.schoolCode.startsWith('PS0')
            ? sch.schoolCode.replace(/^PS0/, 'S0')
            : sch.schoolCode,
          schoolName: sch.schoolName.includes('MSINGI')
            ? sch.schoolName.replace('MSINGI', 'SEKONDARI')
            : sch.schoolName || `SHULE YA SEKONDARI ${String.fromCharCode(65 + idx)}`,
        }))
      );
    }
  };

  const fetchExamsList = useCallback(async (preferredExamId?: string) => {
    setLoading(true);
    try {
      const localStore = loadLocalJointStore();
      let mergedExams: JointExam[] = [...localStore.exams];

      try {
        const res = await fetch('/api/joint-exams');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data.exams)) {
            const byId = new Map<string, JointExam>();
            data.exams.forEach((ex: JointExam) => byId.set(ex.id, ex));
            localStore.exams.forEach((ex: JointExam) => {
              if (!byId.has(ex.id)) byId.set(ex.id, ex);
            });
            mergedExams = Array.from(byId.values());
            saveLocalJointStore({
              ...localStore,
              exams: mergedExams,
            });
          }
        }
      } catch {
        // Use local store if API is offline or unreachable
      }

      setExams(mergedExams);
      const targetId = preferredExamId || selectedExamId || (mergedExams[0]?.id ?? '');
      if (targetId && targetId !== selectedExamId) {
        setSelectedExamId(targetId);
      }
    } catch (err: any) {
      console.error('Error loading joint exams:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedExamId]);

  const fetchExamFull = useCallback(async (examId: string) => {
    if (!examId) return;
    setLoading(true);
    try {
      let loadedFromApi = false;
      try {
        const res = await fetch(`/api/joint-exams/${examId}/full`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.exam) {
            loadedFromApi = true;
            setCurrentExam(data.exam);
            const loadedSchools: JointSchool[] = data.schools || [];
            const loadedResults: JointResult[] = recalculateLocalResultsForExam(
              data.exam,
              loadedSchools,
              data.results || []
            );
            setSchools(loadedSchools);
            setResults(loadedResults);

            // Sync into local store
            const store = loadLocalJointStore();
            const otherExams = store.exams.filter((e) => e.id !== examId);
            const otherSchools = store.schools.filter((s) => s.jointExamId !== examId);
            const otherResults = store.results.filter((r) => r.jointExamId !== examId);
            saveLocalJointStore({
              exams: [
                {
                  ...data.exam,
                  schoolCount: loadedSchools.length,
                  studentCount: loadedResults.length,
                },
                ...otherExams,
              ],
              schools: [...otherSchools, ...loadedSchools],
              results: [...otherResults, ...loadedResults],
            });

            if (loadedSchools.length > 0) {
              setEntrySchoolId((prev) =>
                loadedSchools.some((s) => s.id === prev) ? prev : loadedSchools[0].id
              );
              setFilterSchoolId((prev) =>
                prev !== 'ALL' && loadedSchools.some((s) => s.id === prev) ? prev : loadedSchools[0].id
              );
            }
          }
        }
      } catch {
        // Fallback to local store below
      }

      if (!loadedFromApi) {
        const store = loadLocalJointStore();
        const localExam = store.exams.find((e) => e.id === examId);
        if (localExam) {
          const localSchools = store.schools.filter((s) => s.jointExamId === examId);
          const localResults = recalculateLocalResultsForExam(
            localExam,
            localSchools,
            store.results.filter((r) => r.jointExamId === examId)
          );
          setCurrentExam(localExam);
          setSchools(localSchools);
          setResults(localResults);
          if (localSchools.length > 0) {
            setEntrySchoolId((prev) =>
              localSchools.some((s) => s.id === prev) ? prev : localSchools[0].id
            );
            setFilterSchoolId((prev) =>
              prev !== 'ALL' && localSchools.some((s) => s.id === prev) ? prev : localSchools[0].id
            );
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading full joint exam:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamsList();
  }, [fetchExamsList]);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamFull(selectedExamId);
    }
  }, [selectedExamId, fetchExamFull]);

  // Populate draft entry rows when entrySchoolId or results change
  useEffect(() => {
    if (!entrySchoolId || !currentExam) return;
    const schoolResults = results.filter((r) => r.jointSchoolId === entrySchoolId);
    const examSubjects = Array.isArray(currentExam.subjects) ? currentExam.subjects : [];

    if (schoolResults.length > 0) {
      setDraftRows(
        schoolResults.map((r) => {
          const strMarks: Record<string, string> = {};
          for (const subj of examSubjects) {
            const val = r.subjectMarks?.[subj];
            strMarks[subj] = val !== undefined && val !== null ? String(val) : '';
          }
          return {
            id: r.id,
            studentName: r.studentName,
            regNo: r.regNo,
            gender: r.gender || 'M',
            stream: r.stream || 'A',
            subjectMarks: strMarks,
            registeredSubjects: getStudentRegisteredSubjects(r, examSubjects),
          };
        })
      );
    } else {
      // Provide 10 pre-numbered rows ready for immediate multi-student entry
      const selectedSchool = schools.find((s) => s.id === entrySchoolId);
      const isPrim = isPrimaryEducationLevel(currentExam.level, currentExam.className);
      const codePrefix = selectedSchool?.schoolCode || (isPrim ? 'PS0101' : 'S0001');
      setDraftRows(
        Array.from({ length: 10 }, (_, idx) => {
          const gender: 'M' | 'F' = idx % 2 === 0 ? 'M' : 'F';
          return {
            studentName: generateRealisticStudentName(idx, gender),
            regNo: `${codePrefix}/${String(idx + 1).padStart(4, '0')}`,
            gender,
            stream: 'A',
            subjectMarks: {},
            registeredSubjects: [...examSubjects],
          };
        })
      );
    }
  }, [entrySchoolId, results, currentExam, schools]);

  const handleSwitchExamEducationLevel = async (
    targetType: 'PRIMARY' | 'SECONDARY',
    customClass?: string
  ) => {
    // Also update modal defaults so if no exam is created yet, the user's choice is ready
    handleSelectModalEducationType(targetType);
    if (customClass) {
      setNewExamClass(customClass);
    }

    if (!currentExam) {
      showNotice(
        'success',
        `Ngazi ya "${targetType === 'PRIMARY' ? 'PRIMARY (Shule ya Msingi)' : 'SECONDARY (Shule ya Sekondari)'}" imechaguliwa! Bonyeza "Anzisha Mtihani wa Pamoja Sasa" kuendelea.`
      );
      return;
    }

    const isCurrentlyPrimary = isPrimaryEducationLevel(currentExam.level, currentExam.className);
    const nextClass =
      customClass ||
      (targetType === 'PRIMARY'
        ? isCurrentlyPrimary
          ? currentExam.className
          : 'Standard 7'
        : !isCurrentlyPrimary
        ? currentExam.className
        : 'Form 4');

    const nextLevel =
      targetType === 'PRIMARY'
        ? nextClass === 'Standard 4'
          ? 'PRIMARY - SFNA'
          : 'PRIMARY - PSLE'
        : nextClass === 'Form 2'
        ? 'SECONDARY - FTNA'
        : nextClass === 'Form 6'
        ? 'SECONDARY - ACSEE'
        : 'SECONDARY - CSEE';

    // If switching between Primary and Secondary and there are no results yet, also apply default subjects for that level
    const shouldSwitchDefaultSubjects = results.length === 0 && isCurrentlyPrimary !== (targetType === 'PRIMARY');
    const nextSubjects = shouldSwitchDefaultSubjects
      ? targetType === 'PRIMARY'
        ? [...PRIMARY_NECTA_SUBJECTS]
        : [
            'CIVICS',
            'HISTORY',
            'GEOGRAPHY',
            'KISWAHILI',
            'ENGLISH',
            'BIOLOGY',
            'BASIC MATHEMATICS',
          ]
      : currentExam.subjects;

    const updatedExamObj: JointExam = {
      ...currentExam,
      level: nextLevel,
      className: nextClass,
      subjects: nextSubjects,
    };

    setSaving(true);
    try {
      let apiOk = false;
      try {
        const res = await fetch(`/api/joint-exams/${currentExam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: nextLevel,
            className: nextClass,
            subjects: nextSubjects,
          }),
        });
        if (res.ok) {
          apiOk = true;
          await fetchExamFull(currentExam.id);
          await fetchExamsList(currentExam.id);
        }
      } catch {
        // Fallback to local update below
      }

      if (!apiOk) {
        const store = loadLocalJointStore();
        const recalculated = recalculateLocalResultsForExam(updatedExamObj, schools, results);
        saveLocalJointStore({
          exams: store.exams.map((e) => (e.id === currentExam.id ? updatedExamObj : e)),
          schools: store.schools,
          results: [
            ...store.results.filter((r) => r.jointExamId !== currentExam.id),
            ...recalculated,
          ],
        });
        setCurrentExam(updatedExamObj);
        setExams((prev) => prev.map((e) => (e.id === currentExam.id ? updatedExamObj : e)));
        setResults(recalculated);
      }

      showNotice(
        'success',
        `Ngazi ya Mtihani wa Pamoja imebadilishwa kuwa: ${
          targetType === 'PRIMARY'
            ? `PRIMARY SCHOOL (${nextClass} • ${nextLevel})`
            : `SECONDARY SCHOOL (${nextClass} • ${nextLevel})`
        }!`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'Imeshindwa kubadili ngazi ya mtihani.');
    } finally {
      setSaving(false);
    }
  };

  const executeCreateJointExam = async (params: {
    name: string;
    examDate: string;
    className: string;
    level: string;
    subjects: string[];
    initialSchools: Array<{ schoolCode: string; schoolName: string; hexColor: string }>;
  }) => {
    setSaving(true);
    try {
      const validInitialSchools =
        params.initialSchools.filter((s) => s.schoolName.trim()).length > 0
          ? params.initialSchools.filter((s) => s.schoolName.trim())
          : [
              {
                schoolCode: isPrimaryEducationLevel(params.level, params.className) ? 'PS0101' : 'S0101',
                schoolName: schoolInfo?.name || 'SHULE INAYOSHIRIKI A',
                hexColor: '#1E40AF',
              },
              {
                schoolCode: isPrimaryEducationLevel(params.level, params.className) ? 'PS0204' : 'S0204',
                schoolName: 'SHULE INAYOSHIRIKI B',
                hexColor: '#047857',
              },
            ];

      let createdExam: JointExam | null = null;
      let createdSchools: JointSchool[] = [];

      try {
        const res = await fetch('/api/joint-exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            name: params.name.trim(),
            examDate: params.examDate,
            className: params.className,
            level: params.level,
            subjects: params.subjects,
            schools: validInitialSchools,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.exam) {
            createdExam = data.exam;
            createdSchools = Array.isArray(data.exam.schools) ? data.exam.schools : [];
          }
        }
      } catch {
        // Fallback to local creation below if backend is offline or unreachable
      }

      if (!createdExam) {
        const newExamId = makeUuidFallback();
        createdSchools = validInitialSchools.map((s, idx) => ({
          id: makeUuidFallback(),
          jointExamId: newExamId,
          schoolCode: (s.schoolCode || `S0${idx + 1}01`).trim().toUpperCase(),
          schoolName: s.schoolName.trim(),
          hexColor: s.hexColor || PRESET_SCHOOL_COLORS[idx % PRESET_SCHOOL_COLORS.length].hex,
        }));
        createdExam = {
          id: newExamId,
          schoolId: schoolId || null,
          name: params.name.trim(),
          examDate: params.examDate,
          className: params.className,
          level: params.level,
          subjects: params.subjects,
          status: 'ACTIVE',
          schoolCount: createdSchools.length,
          studentCount: 0,
        };
      }

      // Save to local store so it persists immediately
      const store = loadLocalJointStore();
      const updatedExams = [
        {
          ...createdExam,
          schoolCount: createdSchools.length,
          studentCount: 0,
        },
        ...store.exams.filter((e) => e.id !== createdExam!.id),
      ];
      const updatedSchools = [
        ...store.schools.filter((s) => s.jointExamId !== createdExam!.id),
        ...createdSchools,
      ];
      saveLocalJointStore({
        exams: updatedExams,
        schools: updatedSchools,
        results: store.results,
      });

      // Immediately update React state so the exam opens without delay or blank screen
      setExamLevelFilter('ALL');
      setExams(updatedExams);
      setCurrentExam(createdExam);
      setSchools(createdSchools);
      setResults([]);
      setSelectedExamId(createdExam.id);
      if (createdSchools.length > 0) {
        setEntrySchoolId(createdSchools[0].id);
        setFilterSchoolId(createdSchools[0].id);
      }
      setShowNewExamModal(false);
      setActiveTab('entry');
      showNotice(
        'success',
        `Mtihani wa Pamoja "${createdExam.name}" (${
          isPrimaryEducationLevel(createdExam.level, createdExam.className) ? 'PRIMARY' : 'SECONDARY'
        }) umeanzishwa kikamilifu! Sasa unaweza kuingiza alama za wanafunzi.`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'Hitilafu imetokea wakati wa kuanzisha mtihani.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) {
      showNotice('error', 'Tafadhali weka jina la mtihani wa pamoja.');
      return;
    }
    if (newExamSubjects.length === 0) {
      showNotice('error', 'Tafadhali chagua angalau somo 1 la mtihani.');
      return;
    }

    const formattedLevel =
      newExamEducationType === 'PRIMARY'
        ? newExamLevel.toUpperCase().includes('PRIMARY')
          ? newExamLevel
          : `PRIMARY - ${newExamLevel}`
        : newExamLevel.toUpperCase().includes('SECONDARY')
        ? newExamLevel
        : `SECONDARY - ${newExamLevel}`;

    await executeCreateJointExam({
      name: newExamName.trim(),
      examDate: newExamDate,
      className: newExamClass,
      level: formattedLevel,
      subjects: newExamSubjects,
      initialSchools: newExamInitialSchools,
    });
  };

  const handleQuickStartExam = async (eduType: 'PRIMARY' | 'SECONDARY' = newExamEducationType) => {
    const isPrim = eduType === 'PRIMARY';
    const defaultClass = isPrim ? 'Standard 7' : 'Form 4';
    const defaultLevel = isPrim ? 'PRIMARY - PSLE' : 'SECONDARY - CSEE';
    const defaultName = isPrim
      ? 'MTIHANI WA PAMOJA WA SHULE ZA MSINGI (PRIMARY JOINT MOCK EXAM)'
      : 'MTIHANI WA PAMOJA WA SHULE ZA SEKONDARI (SECONDARY JOINT MOCK EXAM)';
    const defaultSubjs = isPrim
      ? [...PRIMARY_NECTA_SUBJECTS]
      : [
          'CIVICS',
          'HISTORY',
          'GEOGRAPHY',
          'KISWAHILI',
          'ENGLISH',
          'BIOLOGY',
          'BASIC MATHEMATICS',
        ];
    const defaultSchools = [
      {
        schoolCode: isPrim ? 'PS0101' : schoolInfo?.centerNumber || 'S0101',
        schoolName:
          schoolInfo?.name || (isPrim ? 'SHULE YA MSINGI A' : 'SHULE YA SEKONDARI A'),
        hexColor: '#1E40AF',
      },
      {
        schoolCode: isPrim ? 'PS0204' : 'S0204',
        schoolName: isPrim ? 'SHULE YA MSINGI B' : 'SHULE YA SEKONDARI B',
        hexColor: '#047857',
      },
    ];

    await executeCreateJointExam({
      name: newExamName.trim() || defaultName,
      examDate: newExamDate || new Date().toISOString().split('T')[0],
      className: isPrimaryEducationLevel(newExamLevel, newExamClass) === isPrim ? newExamClass : defaultClass,
      level: defaultLevel,
      subjects: newExamSubjects.length > 0 ? newExamSubjects : defaultSubjs,
      initialSchools:
        newExamInitialSchools.filter((s) => s.schoolName.trim()).length > 0
          ? newExamInitialSchools
          : defaultSchools,
    });
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExam) return;
    if (!newSchoolName.trim()) {
      showNotice('error', 'Weka jina la shule inayoshiriki.');
      return;
    }

    const isPrim = isPrimaryEducationLevel(currentExam.level, currentExam.className);
    const defaultPrefix = isPrim ? 'PS0' : 'S0';
    const codeToUse = (newSchoolCode.trim() || `${defaultPrefix}${schools.length + 1}01`).toUpperCase();

    setSaving(true);
    try {
      let createdSchool: JointSchool | null = null;
      try {
        const res = await fetch(`/api/joint-exams/${currentExam.id}/schools`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolCode: codeToUse,
            schoolName: newSchoolName.trim(),
            hexColor: newSchoolColor,
            region: newSchoolRegion.trim(),
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.school) createdSchool = data.school;
        }
      } catch {
        // Fallback to local
      }

      if (!createdSchool) {
        createdSchool = {
          id: makeUuidFallback(),
          jointExamId: currentExam.id,
          schoolCode: codeToUse,
          schoolName: newSchoolName.trim(),
          hexColor: newSchoolColor,
          region: newSchoolRegion.trim() || null,
        };
      }

      const nextSchools = [...schools, createdSchool];
      setSchools(nextSchools);
      const store = loadLocalJointStore();
      saveLocalJointStore({
        exams: store.exams.map((ex) =>
          ex.id === currentExam.id ? { ...ex, schoolCount: nextSchools.length } : ex
        ),
        schools: [...store.schools.filter((s) => s.id !== createdSchool!.id), createdSchool],
        results: store.results,
      });

      setNewSchoolCode('');
      setNewSchoolName('');
      setNewSchoolRegion('');
      showNotice('success', `Shule "${createdSchool.schoolName}" imeongezwa kwenye mtihani huu!`);
      await fetchExamsList(currentExam.id);
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSchoolColor = async (schoolIdToUpdate: string, hexColor: string) => {
    if (!currentExam) return;
    try {
      const nextSchools = schools.map((s) => (s.id === schoolIdToUpdate ? { ...s, hexColor } : s));
      const nextResults = results.map((r) =>
        r.jointSchoolId === schoolIdToUpdate ? { ...r, hexColor } : r
      );
      setSchools(nextSchools);
      setResults(nextResults);

      const store = loadLocalJointStore();
      saveLocalJointStore({
        exams: store.exams,
        schools: store.schools.map((s) => (s.id === schoolIdToUpdate ? { ...s, hexColor } : s)),
        results: store.results.map((r) =>
          r.jointSchoolId === schoolIdToUpdate ? { ...r, hexColor } : r
        ),
      });

      await fetch(`/api/joint-exams/${currentExam.id}/schools/${schoolIdToUpdate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hexColor }),
      }).catch(() => {});
      showNotice('success', 'Rangi ya utambulisho wa shule imebadilishwa!');
    } catch (err: any) {
      showNotice('error', 'Imeshindwa kubadili rangi ya shule.');
    }
  };

  const handleDeleteSchool = async (schoolIdToDelete: string, schoolName: string) => {
    if (!currentExam) return;
    setSaving(true);
    try {
      await fetch(`/api/joint-exams/${currentExam.id}/schools/${schoolIdToDelete}`, {
        method: 'DELETE',
      }).catch(() => {});

      const nextSchools = schools.filter((s) => s.id !== schoolIdToDelete);
      const remainingResults = results.filter((r) => r.jointSchoolId !== schoolIdToDelete);
      const recalculated = recalculateLocalResultsForExam(currentExam, nextSchools, remainingResults);
      setSchools(nextSchools);
      setResults(recalculated);

      const store = loadLocalJointStore();
      saveLocalJointStore({
        exams: store.exams.map((ex) =>
          ex.id === currentExam.id
            ? { ...ex, schoolCount: nextSchools.length, studentCount: recalculated.length }
            : ex
        ),
        schools: store.schools.filter((s) => s.id !== schoolIdToDelete),
        results: [
          ...store.results.filter((r) => r.jointExamId !== currentExam.id),
          ...recalculated,
        ],
      });

      showNotice('success', `Shule "${schoolName}" imeondolewa.`);
      await fetchExamsList(currentExam.id);
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExamSubject = async (subject: string) => {
    if (!currentExam) return;
    const currentSubjects = Array.isArray(currentExam.subjects) ? currentExam.subjects : [];
    const exists = currentSubjects.includes(subject);
    const updatedSubjects = exists
      ? currentSubjects.filter((s) => s !== subject)
      : [...currentSubjects, subject];

    if (updatedSubjects.length === 0) {
      showNotice('error', 'Mtihani lazima uwe na angalau somo 1.');
      return;
    }

    const updatedExamObj: JointExam = {
      ...currentExam,
      subjects: updatedSubjects,
    };

    setSaving(true);
    try {
      let apiOk = false;
      try {
        const res = await fetch(`/api/joint-exams/${currentExam.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjects: updatedSubjects }),
        });
        if (res.ok) {
          apiOk = true;
          await fetchExamFull(currentExam.id);
        }
      } catch {
        // Fallback to local update below
      }

      if (!apiOk) {
        const recalculated = recalculateLocalResultsForExam(updatedExamObj, schools, results);
        setCurrentExam(updatedExamObj);
        setResults(recalculated);
        const store = loadLocalJointStore();
        saveLocalJointStore({
          exams: store.exams.map((e) => (e.id === currentExam.id ? updatedExamObj : e)),
          schools: store.schools,
          results: [
            ...store.results.filter((r) => r.jointExamId !== currentExam.id),
            ...recalculated,
          ],
        });
      }

      showNotice(
        'success',
        `Masomo yameboreshwa (${updatedSubjects.length} masomo). Matokeo na Rank zimehesabiwa upya!`
      );
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDraftRow = () => {
    const selectedSchool = schools.find((s) => s.id === entrySchoolId);
    const isPrim = isPrimaryEducationLevel(currentExam?.level, currentExam?.className);
    const codePrefix = selectedSchool?.schoolCode || (isPrim ? 'PS0101' : 'S0001');
    const nextNum = String(draftRows.length + 1).padStart(4, '0');
    setDraftRows((prev) => [
      ...prev,
      {
        studentName: '',
        regNo: `${codePrefix}/${nextNum}`,
        gender: 'M',
        stream: 'A',
        subjectMarks: {},
      },
    ]);
  };

  const handleImportHostSchoolStudents = () => {
    if (!currentExam || !entrySchoolId) return;
    const targetClass = currentExam.className || 'Form 4';
    const matching = students.filter(
      (s) => !s.className || s.className.toLowerCase() === targetClass.toLowerCase()
    );
    const sourceList = matching.length > 0 ? matching : students.slice(0, 30);

    if (sourceList.length === 0) {
      showNotice('error', 'Hakuna wanafunzi waliosajiliwa kwenye mfumo wa shule kwa sasa.');
      return;
    }

    const selectedSchool = schools.find((s) => s.id === entrySchoolId);
    const isPrim = isPrimaryEducationLevel(currentExam.level, currentExam.className);
    const codePrefix = selectedSchool?.schoolCode || (isPrim ? 'PS0101' : 'S0101');

    const existingNames = new Set(draftRows.map((r) => r.studentName.trim().toLowerCase()).filter(Boolean));
    const importedRows = sourceList
      .filter((st) => !existingNames.has(st.name.trim().toLowerCase()))
      .map((st, idx) => ({
        studentName: st.name,
        regNo: st.regNo || `${codePrefix}/${String(draftRows.length + idx + 1).padStart(4, '0')}`,
        gender: st.gender?.toLowerCase().startsWith('f') ? 'F' : 'M',
        stream: st.stream || 'A',
        subjectMarks: {},
        expectedGrade: 'AUTO',
      }));

    setDraftRows((prev) => [...prev.filter((r) => r.studentName.trim() !== ''), ...importedRows]);
    showNotice('success', `Wanafunzi ${importedRows.length} wameingizwa kwenye fomu tayari kwa kujaziwa alama!`);
  };

  const examSubjects: string[] = useMemo(() => {
    return Array.isArray(currentExam?.subjects) ? currentExam.subjects : [];
  }, [currentExam]);

  const isCurrentExamPrimary = useMemo(() => {
    return isPrimaryEducationLevel(currentExam?.level, currentExam?.className);
  }, [currentExam]);

  const isSevenOrMoreSubjects = useMemo(() => {
    if (examSubjects.length < 7) return false;
    const satStudents = results.filter((r) => (r.subjectsSat ?? 0) > 0);
    if (satStudents.length === 0) return true;
    return satStudents.some((r) => (r.subjectsSat ?? 0) >= 7);
  }, [examSubjects, results]);

  const isEntryDivisionActive = useMemo(() => {
    if (examSubjects.length < 7) return false;
    const rowsWithMarks = draftRows.filter(
      (r) => computeLocalPreview(r.subjectMarks, examSubjects, isCurrentExamPrimary).sat > 0
    );
    if (rowsWithMarks.length === 0) return true;
    return rowsWithMarks.some(
      (r) => computeLocalPreview(r.subjectMarks, examSubjects, isCurrentExamPrimary).sat >= 7
    );
  }, [draftRows, examSubjects, isCurrentExamPrimary]);

  // =========================================================================
  // RESULT INTEGRITY CHECK ENGINE (PRE-SUBMISSION & SAVED RESULTS AUDIT)
  // =========================================================================
  const entryIntegrityIssues: IntegrityIssue[] = useMemo(() => {
    const issues: IntegrityIssue[] = [];
    const regNoCounts: Record<string, number[]> = {};

    draftRows.forEach((row, idx) => {
      const cleanReg = row.regNo.trim().toUpperCase();
      if (cleanReg && row.studentName.trim()) {
        if (!regNoCounts[cleanReg]) regNoCounts[cleanReg] = [];
        regNoCounts[cleanReg].push(idx + 1);
      }
    });

    draftRows.forEach((row, rIdx) => {
      const hasAnyMark = examSubjects.some((s) => {
        const v = row.subjectMarks[s];
        return v !== undefined && v !== null && String(v).trim() !== '';
      });
      if (!row.studentName.trim() && !hasAnyMark) return;

      const labelName = row.studentName.trim() || `Mstari #${rIdx + 1} (Bila Jina)`;
      const cleanReg = row.regNo.trim().toUpperCase();

      if (cleanReg && regNoCounts[cleanReg] && regNoCounts[cleanReg].length > 1) {
        issues.push({
          id: `dup-${rIdx}-${cleanReg}`,
          rowIndex: rIdx,
          studentName: labelName,
          regNo: row.regNo,
          type: 'DUPLICATE_REG_NO',
          severity: 'warning',
          rawValue: row.regNo,
          message: `Namba ya usajili "${row.regNo}" imejirudia kwenye mistari: ${regNoCounts[cleanReg].join(', ')}.`,
        });
      }

      for (const subj of examSubjects) {
        const rawVal = row.subjectMarks[subj];
        const parsed = parseMarkInput(rawVal, isCurrentExamPrimary);
        if (parsed.isEmpty) continue;

        if (parsed.isOutOfRange) {
          issues.push({
            id: `range-${rIdx}-${subj}`,
            rowIndex: rIdx,
            studentName: labelName,
            regNo: row.regNo,
            subject: subj,
            type: 'OUT_OF_RANGE',
            severity: 'error',
            rawValue: String(rawVal),
            expectedValue: '0 - 100',
            message: `Alama nje ya mipaka (${rawVal}) kwenye somo la ${subj} kwa ${labelName}. Alama halali za NECTA ni 0 hadi 100.`,
          });
        } else if (parsed.isGradeMismatch && parsed.numericScore !== null && parsed.computedGrade) {
          issues.push({
            id: `mismatch-${rIdx}-${subj}`,
            rowIndex: rIdx,
            studentName: labelName,
            regNo: row.regNo,
            subject: subj,
            type: 'GRADE_MISMATCH',
            severity: 'error',
            rawValue: String(rawVal),
            expectedValue: parsed.taggedGrade || '',
            computedValue: parsed.computedGrade,
            message: `Grade haioani na alama (${subj}): Umeweka "${rawVal}" (Grade ${parsed.taggedGrade}) lakini alama ${parsed.numericScore}% kwa vigezo vya NECTA (${isCurrentExamPrimary ? 'Primary A-E' : 'Secondary A-F'}) ni Grade "${parsed.computedGrade}".`,
          });
        }
      }

      // Check row-level Expected Grade / Division verification if specified by user
      const preview = computeLocalPreview(row.subjectMarks, examSubjects, isCurrentExamPrimary);
      if (
        row.expectedGrade &&
        row.expectedGrade !== 'AUTO' &&
        preview.sat > 0
      ) {
        if (row.expectedGrade.startsWith('DIV ')) {
          const expDiv = row.expectedGrade.replace('DIV ', '').trim();
          if (preview.div !== '-' && preview.div !== expDiv) {
            issues.push({
              id: `row-div-mismatch-${rIdx}`,
              rowIndex: rIdx,
              studentName: labelName,
              regNo: row.regNo,
              type: 'GRADE_MISMATCH',
              severity: 'error',
              rawValue: `Expected ${row.expectedGrade}`,
              expectedValue: row.expectedGrade,
              computedValue: `DIV ${preview.div}`,
              message: `Mkanganyiko wa Division kwa ${labelName}: Umechagua "${row.expectedGrade}" lakini masomo 7 bora (${preview.best7} pts) yanatoa "DIV ${preview.div}".`,
            });
          }
        } else if (preview.grade !== '-' && preview.grade !== row.expectedGrade) {
          issues.push({
            id: `row-grade-mismatch-${rIdx}`,
            rowIndex: rIdx,
            studentName: labelName,
            regNo: row.regNo,
            type: 'GRADE_MISMATCH',
            severity: 'error',
            rawValue: `Expected Grade ${row.expectedGrade}`,
            expectedValue: row.expectedGrade,
            computedValue: preview.grade,
            message: `Mkanganyiko wa Grade ya Jumla kwa ${labelName}: Umechagua Grade "${row.expectedGrade}" lakini wastani wa ${preview.avg}% unatoa Grade "${preview.grade}".`,
          });
        }
      }

      if (row.studentName.trim() && preview.sat === 0) {
        issues.push({
          id: `empty-${rIdx}`,
          rowIndex: rIdx,
          studentName: labelName,
          regNo: row.regNo,
          type: 'EMPTY_MARKS',
          severity: 'warning',
          rawValue: '-',
          message: `Mwanafunzi "${labelName}" hana alama kwenye somo lolote bado.`,
        });
      }
    });

    return issues;
  }, [draftRows, examSubjects, isCurrentExamPrimary]);

  // Saved Results Integrity Audit (for Results View)
  const savedResultsIntegrityIssues: IntegrityIssue[] = useMemo(() => {
    const issues: IntegrityIssue[] = [];
    results.forEach((resRow, idx) => {
      for (const subj of examSubjects) {
        const sc = resRow.subjectMarks?.[subj];
        const storedGrd = resRow.subjectGrades?.[subj];
        if (sc !== undefined && sc !== null) {
          const num = Number(sc);
          if (Number.isNaN(num) || num < 0 || num > 100) {
            issues.push({
              id: `saved-range-${resRow.id}-${subj}`,
              rowIndex: idx,
              studentName: resRow.studentName,
              regNo: resRow.regNo,
              subject: subj,
              type: 'OUT_OF_RANGE',
              severity: 'error',
              rawValue: String(sc),
              expectedValue: '0 - 100',
              message: `[${resRow.schoolCode}] ${resRow.studentName}: Alama ya ${subj} (${sc}) iko nje ya 0-100.`,
            });
          } else {
            const expectedGrd = computeLocalNectaGrade(num, isCurrentExamPrimary).grade;
            if (storedGrd && storedGrd !== expectedGrd) {
              issues.push({
                id: `saved-mismatch-${resRow.id}-${subj}`,
                rowIndex: idx,
                studentName: resRow.studentName,
                regNo: resRow.regNo,
                subject: subj,
                type: 'GRADE_MISMATCH',
                severity: 'error',
                rawValue: `${num} (${storedGrd})`,
                expectedValue: storedGrd,
                computedValue: expectedGrd,
                message: `[${resRow.schoolCode}] ${resRow.studentName}: Grade ya ${subj} iliyohifadhiwa (${storedGrd}) haioani na alama ${num}% (Inapaswa kuwa ${expectedGrd}).`,
              });
            }
          }
        }
      }
    });
    return issues;
  }, [results, examSubjects, isCurrentExamPrimary]);

  const handleAutoFixIntegrityIssues = () => {
    setDraftRows((prev) =>
      prev.map((row) => {
        const fixedMarks: Record<string, string> = { ...row.subjectMarks };
        for (const subj of examSubjects) {
          const rawVal = fixedMarks[subj];
          const parsed = parseMarkInput(rawVal, isCurrentExamPrimary);
          if (!parsed.isEmpty && parsed.numericScore !== null) {
            const clamped = Math.max(0, Math.min(100, Math.round(parsed.numericScore)));
            fixedMarks[subj] = String(clamped);
          } else if (!parsed.isEmpty && parsed.numericScore === null) {
            fixedMarks[subj] = '';
          }
        }
        return {
          ...row,
          subjectMarks: fixedMarks,
          expectedGrade: 'AUTO',
        };
      })
    );
    showNotice(
      'success',
      'Result Integrity Auto-Fix: Alama zilizozidi 100 au chini ya 0 zimerekebishwa na Grade zote zimeoanishwa na vigezo vya NECTA!'
    );
  };

  const handleRunIntegrityCheckNow = () => {
    setShowIntegrityDetails(true);
    const criticalErrors = entryIntegrityIssues.filter((i) => i.severity === 'error');
    if (criticalErrors.length === 0 && entryIntegrityIssues.length === 0) {
      showNotice(
        'success',
        'Result Integrity Check Passed: Hakuna alama iliyozidi 100 wala mkanganyiko wa Grade (0 Issues Found)!'
      );
    } else {
      showNotice(
        'error',
        `Result Integrity Check: Zimebainika kasoro ${entryIntegrityIssues.length} (${criticalErrors.length} za lazima kurekebishwa kabla ya kuwasilisha).`
      );
    }
  };

  const handleSaveSchoolMarks = async (customRows?: DraftJointStudentRow[]) => {
    if (!currentExam || !entrySchoolId) {
      showNotice('error', 'Tafadhali chagua shule kwanza.');
      return;
    }

    const sourceRows = customRows || draftRows;
    const nonEmptyRows = sourceRows.filter((r) => r.studentName.trim() !== '');
    if (nonEmptyRows.length === 0) {
      showNotice('error', 'Tafadhali ingiza jina la angalau mwanafunzi mmoja.');
      return;
    }

    // Block submission if Result Integrity Check finds any critical errors (Out-of-Range or Grade Mismatch)
    const blockingIssues = entryIntegrityIssues.filter((i) => i.severity === 'error');
    if (blockingIssues.length > 0) {
      setShowIntegrityDetails(true);
      showNotice(
        'error',
        `Result Integrity Check imezuia uwasilishaji: Kuna kasoro ${blockingIssues.length} (${blockingIssues[0].message}). Tafadhali rekebisha au bonyeza "Auto-Fix Kasoro" kwanza.`
      );
      return;
    }

    const preparedEntries = nonEmptyRows.map((r) => {
      const regSubjects =
        Array.isArray(r.registeredSubjects) && r.registeredSubjects.length > 0
          ? r.registeredSubjects
          : [...examSubjects];
      const regSet = new Set(regSubjects.map((s) => s.toUpperCase()));
      const cleanMarks: Record<string, number> = {};
      for (const [subj, val] of Object.entries(r.subjectMarks)) {
        if (regSet.size > 0 && !regSet.has(subj.toUpperCase())) continue;
        const parsed = parseMarkInput(val, isCurrentExamPrimary);
        if (!parsed.isEmpty && parsed.numericScore !== null && !parsed.isOutOfRange) {
          cleanMarks[subj] = parsed.numericScore;
        }
      }
      return {
        id: r.id,
        studentName: r.studentName.trim(),
        regNo: r.regNo.trim(),
        gender: r.gender,
        stream: r.stream,
        subjectMarks: cleanMarks,
        registeredSubjects: regSubjects,
        replaceMarks: true,
      };
    });

    setSaving(true);
    try {
      let savedViaApi = false;
      try {
        const res = await fetch(`/api/joint-exams/${currentExam.id}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jointSchoolId: entrySchoolId,
            entries: preparedEntries,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.success) {
            savedViaApi = true;
            await fetchExamFull(currentExam.id);
            await fetchExamsList(currentExam.id);
          }
        }
      } catch {
        // Fallback to local calculation & storage below
      }

      if (!savedViaApi) {
        const activeSch = schools.find((s) => s.id === entrySchoolId);
        const otherSchoolsResults = results.filter((r) => r.jointSchoolId !== entrySchoolId);
        const existingSchoolResults = results.filter((r) => r.jointSchoolId === entrySchoolId);

        const updatedSchoolRows: JointResult[] = [...existingSchoolResults];
        for (const entry of preparedEntries) {
          const idx = updatedSchoolRows.findIndex(
            (r) =>
              (entry.id && r.id === entry.id) ||
              (r.regNo.toLowerCase() === entry.regNo.toLowerCase() &&
                r.studentName.toLowerCase() === entry.studentName.toLowerCase())
          );
          if (idx >= 0) {
            updatedSchoolRows[idx] = {
              ...updatedSchoolRows[idx],
              studentName: entry.studentName,
              regNo: entry.regNo,
              gender: entry.gender,
              stream: entry.stream,
              subjectMarks: entry.subjectMarks,
              registeredSubjects: entry.registeredSubjects,
            };
          } else {
            updatedSchoolRows.push({
              id: makeUuidFallback(),
              jointExamId: currentExam.id,
              jointSchoolId: entrySchoolId,
              studentName: entry.studentName,
              regNo: entry.regNo,
              gender: entry.gender,
              stream: entry.stream,
              subjectMarks: entry.subjectMarks,
              registeredSubjects: entry.registeredSubjects,
              subjectGrades: {},
              subjectsSat: 0,
              totalMarks: 0,
              averageScore: 0,
              overallGrade: isCurrentExamPrimary ? 'E' : 'F',
              best7Points: null,
              division: '-',
              schoolRank: 1,
              overallRank: 1,
              schoolName: activeSch?.schoolName || 'School',
              schoolCode: activeSch?.schoolCode || 'S0101',
              hexColor: activeSch?.hexColor || '#1E40AF',
            });
          }
        }

        const recalculated = recalculateLocalResultsForExam(currentExam, schools, [
          ...otherSchoolsResults,
          ...updatedSchoolRows,
        ]);
        setResults(recalculated);

        const store = loadLocalJointStore();
        saveLocalJointStore({
          exams: store.exams.map((ex) =>
            ex.id === currentExam.id ? { ...ex, studentCount: recalculated.length } : ex
          ),
          schools: store.schools,
          results: [
            ...store.results.filter((r) => r.jointExamId !== currentExam.id),
            ...recalculated,
          ],
        });
      }

      showNotice(
        'success',
        `Usajili & Alama za wanafunzi ${nonEmptyRows.length} zimehifadhiwa na Rank Ki-Shule (G.P.A) zimekokotolewa!`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'Hitilafu wakati wa kuhifadhi alama.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // 10-SCHOOLS JOINT EXAM DEMO GENERATOR (SHULE B #1 OUT OF 10 BY GPA)
  // =========================================================================
  const handlePopulateTenSchoolsGpaDemo = async () => {
    if (!currentExam) return;
    setSaving(true);
    try {
      const isPrim = isCurrentExamPrimary;
      const prefix = isPrim ? 'PS0' : 'S0';
      const instWord = isPrim ? 'SHULE YA MSINGI' : 'SHULE YA SEKONDARI';
      const tenPalette = [
        '#1E40AF', // Shule A
        '#047857', // Shule B (Champion #1)
        '#B91C1C', // Shule C
        '#7C3AED', // Shule D
        '#D97706', // Shule E
        '#0E7490', // Shule F
        '#BE185D', // Shule G
        '#334155', // Shule H
        '#4338CA', // Shule I
        '#15803D', // Shule J
      ];

      // Ensure 10 schools (Shule A to Shule J)
      const nextSchools: JointSchool[] = [...schools];
      for (let i = 0; i < 10; i++) {
        const letter = String.fromCharCode(65 + i); // A..J
        const code = `${prefix}${i + 1}01`;
        const existing = nextSchools[i];
        if (!existing) {
          const newSch: JointSchool = {
            id: makeUuidFallback(),
            jointExamId: currentExam.id,
            schoolCode: code,
            schoolName: `${instWord} ${letter}`,
            hexColor: tenPalette[i % tenPalette.length],
          };
          nextSchools.push(newSch);
          try {
            const res = await fetch(`/api/joint-exams/${currentExam.id}/schools`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newSch),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.school?.id) {
                nextSchools[nextSchools.length - 1] = data.school;
              }
            }
          } catch {}
        }
      }

      // Base score offsets per school so that SHULE B (index 1) has the highest scores & lowest (best) GPA (#1 out of 10)!
      const schoolBaseScoreByIndex = [
        74, // Shule A (#2)
        86, // Shule B (#1 Champion - Best GPA ~ 1.15)
        69, // Shule C (#3)
        64, // Shule D (#4)
        60, // Shule E (#5)
        56, // Shule F (#6)
        51, // Shule G (#7)
        47, // Shule H (#8)
        42, // Shule I (#9)
        37, // Shule J (#10)
      ];

      const allDemoResults: JointResult[] = [];
      for (let sIdx = 0; sIdx < nextSchools.length; sIdx++) {
        const sch = nextSchools[sIdx];
        const baseScore = schoolBaseScoreByIndex[sIdx % schoolBaseScoreByIndex.length];
        const schoolEntries: any[] = [];

        // Create 10 students for each of the 10 schools
        for (let stIdx = 0; stIdx < 10; stIdx++) {
          const gender: 'M' | 'F' = stIdx % 2 === 0 ? 'M' : 'F';
          const studentName = generateRealisticStudentName(sIdx * 10 + stIdx, gender);
          const regNo = `${sch.schoolCode}/${String(stIdx + 1).padStart(4, '0')}`;
          const subjectMarks: Record<string, number> = {};

          examSubjects.forEach((subj, subjIdx) => {
            const delta = ((stIdx * 3 + subjIdx * 5) % 13) - 6;
            const score = Math.max(15, Math.min(98, baseScore + delta));
            subjectMarks[subj] = score;
          });

          schoolEntries.push({
            studentName,
            regNo,
            gender,
            stream: 'A',
            subjectMarks,
            registeredSubjects: [...examSubjects],
            replaceMarks: true,
          });

          allDemoResults.push({
            id: makeUuidFallback(),
            jointExamId: currentExam.id,
            jointSchoolId: sch.id,
            studentName,
            regNo,
            gender,
            stream: 'A',
            subjectMarks,
            registeredSubjects: [...examSubjects],
            subjectGrades: {},
            subjectsSat: examSubjects.length,
            totalMarks: 0,
            averageScore: 0,
            overallGrade: 'A',
            best7Points: null,
            division: 'I',
            schoolRank: 1,
            overallRank: 1,
            schoolName: sch.schoolName,
            schoolCode: sch.schoolCode,
            hexColor: sch.hexColor,
          });
        }

        try {
          await fetch(`/api/joint-exams/${currentExam.id}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jointSchoolId: sch.id,
              entries: schoolEntries,
            }),
          });
        } catch {}
      }

      const recalculated = recalculateLocalResultsForExam(currentExam, nextSchools, allDemoResults);
      setSchools(nextSchools);
      setResults(recalculated);

      const store = loadLocalJointStore();
      saveLocalJointStore({
        exams: store.exams.map((ex) =>
          ex.id === currentExam.id
            ? { ...ex, schoolCount: nextSchools.length, studentCount: recalculated.length }
            : ex
        ),
        schools: [
          ...store.schools.filter((s) => s.jointExamId !== currentExam.id),
          ...nextSchools,
        ],
        results: [
          ...store.results.filter((r) => r.jointExamId !== currentExam.id),
          ...recalculated,
        ],
      });

      await fetchExamFull(currentExam.id);
      await fetchExamsList(currentExam.id);

      const secondSchoolName = nextSchools[1]?.schoolName || 'SHULE B';
      showNotice(
        'success',
        `Shule ${nextSchools.length} zimepangwa kwa ufaulu wa G.P.A! "${secondSchoolName}" ndiyo ya Kwanza (Nafasi ya 1 kati ya Shule ${nextSchools.length}) kulingana na G.P.A ya wanafunzi wote!`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'Hitilafu wakati wa kupanga shule 10.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudentResult = async (resultId: string, studentName: string) => {
    if (!currentExam) return;
    setSaving(true);
    try {
      await fetch(`/api/joint-exams/${currentExam.id}/results/${resultId}`, {
        method: 'DELETE',
      }).catch(() => {});

      const remaining = results.filter((r) => r.id !== resultId);
      const recalculated = recalculateLocalResultsForExam(currentExam, schools, remaining);
      setResults(recalculated);

      const store = loadLocalJointStore();
      saveLocalJointStore({
        exams: store.exams.map((ex) =>
          ex.id === currentExam.id ? { ...ex, studentCount: recalculated.length } : ex
        ),
        schools: store.schools,
        results: [
          ...store.results.filter((r) => r.jointExamId !== currentExam.id),
          ...recalculated,
        ],
      });

      showNotice('success', `Matokeo ya "${studentName}" yamefutwa na nafasi zimepangwa upya.`);
      await fetchExamsList(currentExam.id);
    } catch (err: any) {
      showNotice('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered exams list by Primary / Secondary filter
  const filteredExamsList = useMemo(() => {
    if (examLevelFilter === 'ALL') return exams;
    return exams.filter((ex) => {
      const isPrim = isPrimaryEducationLevel(ex.level, ex.className);
      return examLevelFilter === 'PRIMARY' ? isPrim : !isPrim;
    });
  }, [exams, examLevelFilter]);

  // Filtered & sorted results according to Dual View Mode
  const displayedResults = useMemo(() => {
    let list = [...results];

    if (viewMode === 'individual' && filterSchoolId && filterSchoolId !== 'ALL') {
      list = list.filter((r) => r.jointSchoolId === filterSchoolId);
      list.sort((a, b) => a.schoolRank - b.schoolRank);
    } else {
      list.sort((a, b) => a.overallRank - b.overallRank);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.regNo.toLowerCase().includes(q) ||
          r.schoolName.toLowerCase().includes(q) ||
          r.schoolCode.toLowerCase().includes(q)
      );
    }

    return list;
  }, [results, viewMode, filterSchoolId, searchQuery]);

  // School Comparison Summary Stats & NECTA School GPA Ranking (1 out of N schools)
  const schoolComparisonStats = useMemo(() => {
    return computeSchoolGpaLeaderboard(schools, results, examSubjects, isCurrentExamPrimary);
  }, [schools, results, examSubjects, isCurrentExamPrimary]);

  // =========================================================================
  // RECHARTS PERFORMANCE ANALYTICS DATASETS
  // =========================================================================
  const overallJointMean = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + Number(r.averageScore || 0), 0);
    return Number((sum / results.length).toFixed(2));
  }, [results]);

  // Chart 1 Data: School Average Scores & Pass Rates Comparison
  const schoolAverageChartData = useMemo(() => {
    return schoolComparisonStats.map((st) => ({
      schoolId: st.id,
      schoolCode: st.schoolCode,
      schoolName: st.schoolName,
      shortLabel: `${st.schoolCode} (${st.schoolName.slice(0, 14)})`,
      meanAvg: st.meanAvg,
      highestAvg: st.highestAvg,
      passRate: st.passRate,
      candidates: st.studentCount,
      hexColor: st.hexColor || '#1E40AF',
    }));
  }, [schoolComparisonStats]);

  // Chart 2 Data: Subject Performance Trends Across Participating Schools
  const subjectTrendsChartData = useMemo(() => {
    return examSubjects.map((subj) => {
      const row: Record<string, any> = {
        subject: subj,
        shortSubject: subj.length > 12 ? `${subj.slice(0, 10)}..` : subj,
      };

      let totalScoreAll = 0;
      let totalSatAll = 0;
      let topSchoolCode = '-';
      let topSchoolColor = '#1E40AF';
      let topSchoolAvg = -1;

      schools.forEach((sch) => {
        const schResults = results.filter((r) => r.jointSchoolId === sch.id);
        let sum = 0;
        let sat = 0;
        schResults.forEach((r) => {
          const val = r.subjectMarks?.[subj];
          if (val !== undefined && val !== null && !Number.isNaN(Number(val))) {
            sum += Number(val);
            sat += 1;
            totalScoreAll += Number(val);
            totalSatAll += 1;
          }
        });
        const avg = sat > 0 ? Number((sum / sat).toFixed(1)) : 0;
        row[sch.schoolCode] = avg;
        if (sat > 0 && avg > topSchoolAvg) {
          topSchoolAvg = avg;
          topSchoolCode = `${sch.schoolCode} (${avg}%)`;
          topSchoolColor = sch.hexColor;
        }
      });

      row.overallAvg = totalSatAll > 0 ? Number((totalScoreAll / totalSatAll).toFixed(1)) : 0;
      row.topSchoolCode = topSchoolCode;
      row.topSchoolColor = topSchoolColor;
      return row;
    });
  }, [examSubjects, schools, results]);

  const overallDivisionSummary = useMemo(() => {
    return computeOverallDivisionSummary(
      results,
      examSubjects,
      isCurrentExamPrimary,
      isSevenOrMoreSubjects
    );
  }, [results, examSubjects, isCurrentExamPrimary, isSevenOrMoreSubjects]);

  const allSchoolsSubjectGradeSummary = useMemo(() => {
    return computeSubjectGradeSummary(results, examSubjects, isCurrentExamPrimary, 'ALL');
  }, [results, examSubjects, isCurrentExamPrimary]);

  const handleExportCsv = () => {
    if (!currentExam) {
      showNotice('error', 'Chagua mtihani wa pamoja kwanza.');
      return;
    }
    if (results.length === 0) {
      showNotice('error', 'Hakuna alama zilizohifadhiwa bado za ku-export kwenye CSV. Weka alama kwanza kwenye fomu ya shule.');
      return;
    }

    try {
      const failGradeLabel = isCurrentExamPrimary ? 'GRADE_E' : 'GRADE_F';
      const csvLines: string[] = [];

      // 1. EXAM METADATA HEADER
      csvLines.push(`"CONSOLIDATED JOINT EXAMINATION REPORT: ${currentExam.name.toUpperCase()}"`);
      csvLines.push(
        `"Class: ${currentExam.className}","Level: ${currentExam.level}","Date: ${currentExam.examDate}","Participating Schools: ${schools.length}","Candidates: ${results.length}","Overall Joint GPA: ${overallDivisionSummary.overallGpaFormatted} (${overallDivisionSummary.overallGpaGrade})"`
      );
      csvLines.push('');

      // 2. OVERALL DIVISION / GRADE SUMMARY ACROSS ALL SCHOOLS
      csvLines.push(
        isSevenOrMoreSubjects
          ? '"1. MUHTASARI WA DIVISION KWA SHULE ZOTE PAMOJA (OVERALL DIVISION SUMMARY - MASOMO 7+)"'
          : '"1. MUHTASARI WA GRADE KWA SHULE ZOTE PAMOJA (CHINI YA MASOMO 7 - BILA DIVISION)"'
      );
      if (isSevenOrMoreSubjects) {
        csvLines.push('"CATEGORY","REGISTERED","SAT","DIV_I","DIV_II","DIV_III","DIV_IV","DIV_0","PASSED","PASS_RATE_%","JOINT_GPA"');
        csvLines.push(
          `"WAVULANA (BOYS - M)",${overallDivisionSummary.totalRegistered.M},${overallDivisionSummary.totalSat.M},${overallDivisionSummary.divisions.I.M},${overallDivisionSummary.divisions.II.M},${overallDivisionSummary.divisions.III.M},${overallDivisionSummary.divisions.IV.M},${overallDivisionSummary.divisions['0'].M},${overallDivisionSummary.totalPassed.M},"${overallDivisionSummary.totalSat.M > 0 ? ((overallDivisionSummary.totalPassed.M / overallDivisionSummary.totalSat.M) * 100).toFixed(1) : '0.0'}%","-"`
        );
        csvLines.push(
          `"WASICHANA (GIRLS - F)",${overallDivisionSummary.totalRegistered.F},${overallDivisionSummary.totalSat.F},${overallDivisionSummary.divisions.I.F},${overallDivisionSummary.divisions.II.F},${overallDivisionSummary.divisions.III.F},${overallDivisionSummary.divisions.IV.F},${overallDivisionSummary.divisions['0'].F},${overallDivisionSummary.totalPassed.F},"${overallDivisionSummary.totalSat.F > 0 ? ((overallDivisionSummary.totalPassed.F / overallDivisionSummary.totalSat.F) * 100).toFixed(1) : '0.0'}%","-"`
        );
        csvLines.push(
          `"JUMLA KUU (TOTAL)",${overallDivisionSummary.totalRegistered.T},${overallDivisionSummary.totalSat.T},${overallDivisionSummary.divisions.I.T},${overallDivisionSummary.divisions.II.T},${overallDivisionSummary.divisions.III.T},${overallDivisionSummary.divisions.IV.T},${overallDivisionSummary.divisions['0'].T},${overallDivisionSummary.totalPassed.T},"${overallDivisionSummary.totalPassed.pct}%","${overallDivisionSummary.overallGpaFormatted} (${overallDivisionSummary.overallGpaGrade})"`
        );
      } else {
        csvLines.push(`"CATEGORY","REGISTERED","SAT","GRADE_A","GRADE_B","GRADE_C","GRADE_D","${failGradeLabel}","PASSED","PASS_RATE_%","JOINT_GPA"`);
        const failM = isCurrentExamPrimary ? overallDivisionSummary.grades.E.M : overallDivisionSummary.grades.F.M;
        const failF = isCurrentExamPrimary ? overallDivisionSummary.grades.E.F : overallDivisionSummary.grades.F.F;
        const failT = isCurrentExamPrimary ? overallDivisionSummary.grades.E.T : overallDivisionSummary.grades.F.T;
        csvLines.push(
          `"WAVULANA (BOYS - M)",${overallDivisionSummary.totalRegistered.M},${overallDivisionSummary.totalSat.M},${overallDivisionSummary.grades.A.M},${overallDivisionSummary.grades.B.M},${overallDivisionSummary.grades.C.M},${overallDivisionSummary.grades.D.M},${failM},${overallDivisionSummary.totalPassed.M},"${overallDivisionSummary.totalSat.M > 0 ? ((overallDivisionSummary.totalPassed.M / overallDivisionSummary.totalSat.M) * 100).toFixed(1) : '0.0'}%","-"`
        );
        csvLines.push(
          `"WASICHANA (GIRLS - F)",${overallDivisionSummary.totalRegistered.F},${overallDivisionSummary.totalSat.F},${overallDivisionSummary.grades.A.F},${overallDivisionSummary.grades.B.F},${overallDivisionSummary.grades.C.F},${overallDivisionSummary.grades.D.F},${failF},${overallDivisionSummary.totalPassed.F},"${overallDivisionSummary.totalSat.F > 0 ? ((overallDivisionSummary.totalPassed.F / overallDivisionSummary.totalSat.F) * 100).toFixed(1) : '0.0'}%","-"`
        );
        csvLines.push(
          `"JUMLA KUU (TOTAL)",${overallDivisionSummary.totalRegistered.T},${overallDivisionSummary.totalSat.T},${overallDivisionSummary.grades.A.T},${overallDivisionSummary.grades.B.T},${overallDivisionSummary.grades.C.T},${overallDivisionSummary.grades.D.T},${failT},${overallDivisionSummary.totalPassed.T},"${overallDivisionSummary.totalPassed.pct}%","${overallDivisionSummary.overallGpaFormatted} (${overallDivisionSummary.overallGpaGrade})"`
        );
      }
      csvLines.push('');

      // 3. PER-SCHOOL DIVISION / GRADE & GPA SUMMARY
      csvLines.push(
        isSevenOrMoreSubjects
          ? '"2. MUHTASARI WA DIVISION NA G.P.A KWA KILA SHULE (DIVISION SUMMARY PER SCHOOL - MASOMO 7+)"'
          : '"2. MUHTASARI WA GRADE NA G.P.A KWA KILA SHULE (CHINI YA MASOMO 7 - BILA DIVISION)"'
      );
      if (isSevenOrMoreSubjects) {
        csvLines.push('"SCHOOL_RANK","SCHOOL_CODE","SCHOOL_NAME","REG","SAT","DIV_I","DIV_II","DIV_III","DIV_IV","DIV_0","PASSED","PASS_RATE_%","MEAN_AVG_%","SCHOOL_GPA","GPA_GRADE"');
        schoolComparisonStats.forEach((st) => {
          const passed = st.divCounts.I + st.divCounts.II + st.divCounts.III + st.divCounts.IV;
          csvLines.push(
            `"${st.schoolPosition}/${st.totalSchools}","${st.schoolCode}","${st.schoolName}",${st.studentCount},${st.satCount},${st.divCounts.I},${st.divCounts.II},${st.divCounts.III},${st.divCounts.IV},${st.divCounts['0']},${passed},"${st.passRate}%","${st.meanAvg}%","${st.schoolGpaFormatted}","${st.schoolGpaGrade}"`
          );
        });
      } else {
        csvLines.push(`"SCHOOL_RANK","SCHOOL_CODE","SCHOOL_NAME","REG","SAT","GRADE_A","GRADE_B","GRADE_C","GRADE_D","${failGradeLabel}","PASSED","PASS_RATE_%","MEAN_AVG_%","SCHOOL_GPA","GPA_GRADE"`);
        schoolComparisonStats.forEach((st) => {
          const passed = st.gradeCounts.A + st.gradeCounts.B + st.gradeCounts.C + st.gradeCounts.D;
          const failCnt = isCurrentExamPrimary ? st.gradeCounts.E : st.gradeCounts.F;
          csvLines.push(
            `"${st.schoolPosition}/${st.totalSchools}","${st.schoolCode}","${st.schoolName}",${st.studentCount},${st.satCount},${st.gradeCounts.A},${st.gradeCounts.B},${st.gradeCounts.C},${st.gradeCounts.D},${failCnt},${passed},"${st.passRate}%","${st.meanAvg}%","${st.schoolGpaFormatted}","${st.schoolGpaGrade}"`
          );
        });
      }
      csvLines.push('');

      // 4. SUBJECT-BY-SUBJECT GRADE DISTRIBUTION SUMMARY (A, B, C, D, E/F)
      csvLines.push('"3. MUHTASARI WA MATOKEO KWA KILA SOMO (SUBJECT GRADE DISTRIBUTION SUMMARY: A, B, C, D, E/F)"');
      csvLines.push(
        `"SUBJECT_RANK","SUBJECT_NAME","REGISTERED","SAT","GRADE_A","GRADE_B","GRADE_C","GRADE_D","${failGradeLabel}","PASSED_(A-D)","PASS_RATE_%","MEAN_SCORE_%","SUBJECT_GPA","SUBJECT_GRADE"`
      );
      allSchoolsSubjectGradeSummary.forEach((sRow) => {
        const failT = isCurrentExamPrimary ? sRow.grades.E.T : sRow.grades.F.T;
        csvLines.push(
          `"${sRow.subjectPosition}/${sRow.totalSubjects}","${sRow.subject}",${sRow.registeredCount},${sRow.satCount},${sRow.grades.A.T},${sRow.grades.B.T},${sRow.grades.C.T},${sRow.grades.D.T},${failT},${sRow.passCount},"${sRow.passRate}%","${sRow.meanScore}%","${sRow.subjectGpaFormatted}","${sRow.subjectGrade}"`
        );
      });
      csvLines.push('');

      // 5. STUDENT RESULTS TABLE
      csvLines.push('"4. ORODHA YA MATOKEO YA WANAFUNZI (CANDIDATE RESULTS)"');
      const headers = [
        'OVERALL_RANK',
        'SCHOOL_RANK',
        'REG_NO',
        'STUDENT_NAME',
        'GENDER',
        'SCHOOL_CODE',
        'SCHOOL_NAME',
        ...examSubjects,
        'TOTAL_MARKS',
        'AVERAGE',
        'GRADE',
        ...(isSevenOrMoreSubjects ? ['BEST_7_POINTS', 'DIVISION'] : []),
      ];

      csvLines.push(headers.join(','));
      const rowsToExport = displayedResults.length > 0 ? displayedResults : results;
      rowsToExport.forEach((r) => {
        const subjCols = examSubjects.map((s) => {
          const score = r.subjectMarks?.[s];
          const grd = r.subjectGrades?.[s];
          return score !== undefined ? `"${score} (${grd || ''})"` : '""';
        });
        csvLines.push(
          [
            r.overallRank,
            r.schoolRank,
            `"${r.regNo}"`,
            `"${r.studentName}"`,
            r.gender,
            `"${r.schoolCode}"`,
            `"${r.schoolName}"`,
            ...subjCols,
            r.totalMarks,
            r.averageScore,
            r.overallGrade,
            ...(isSevenOrMoreSubjects ? [r.best7Points ?? '-', r.division] : []),
          ].join(',')
        );
      });

      const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `${currentExam.name.replace(/\s+/g, '_')}_JOINT_RESULTS_AND_SUMMARIES.csv`);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
      showNotice(
        'success',
        'Faili la CSV/Excel lenye Matokeo, Summary ya Division na Summary ya Kila Somo (A, B, C, D, E/F) limepakuliwa kikamilifu!'
      );
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      showNotice('error', `Hitilafu wakati wa kupakua CSV: ${err.message || 'Imeshindwa'}`);
    }
  };

  // =========================================================================
  // HELPER FOR SAFE AUTOTABLE INVOCATION ACROSS BUNDLERS
  // =========================================================================
  const safeAutoTable = (docObj: jsPDF, options: any) => {
    try {
      if (typeof autoTable === 'function') {
        autoTable(docObj, options);
      } else if (typeof (docObj as any).autoTable === 'function') {
        (docObj as any).autoTable(options);
      } else if ((autoTable as any)?.default && typeof (autoTable as any).default === 'function') {
        (autoTable as any).default(docObj, options);
      } else {
        console.warn('jsPDF autoTable plugin unavailable');
      }
    } catch (err) {
      console.error('Error running autoTable:', err);
    }
  };

  // =========================================================================
  // SELF-CONTAINED A4/LANDSCAPE PRINT HANDLER FOR JOINT RESULTS & SUMMARIES
  // =========================================================================
  const handlePrintJointResults = () => {
    if (!currentExam) {
      showNotice('error', 'Chagua mtihani wa pamoja kwanza.');
      return;
    }
    if (results.length === 0) {
      showNotice('error', 'Hakuna matokeo ya wanafunzi yaliyohifadhiwa bado ya kuchapisha. Weka alama kwanza kwenye fomu ya shule.');
      return;
    }

    // Always open high-fidelity Print Preview Modal for interactive preview & printing
    setShowPrintPreviewModal(true);
    showNotice('success', 'Dirisha la Kuchapisha na Kagua Matokeo limefunguka!');

    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
      }
    }, 400);
  };

  // =========================================================================
  // CONSOLIDATED JOINT PDF GENERATOR (WITH SCHOOL HEX COLOR BRANDING ON ROWS)
  // =========================================================================
  const handleDownloadJointPdf = () => {
    if (!currentExam) {
      showNotice('error', 'Chagua mtihani wa pamoja kwanza.');
      return;
    }
    if (results.length === 0) {
      showNotice('error', 'Hakuna matokeo ya wanafunzi yaliyohifadhiwa bado ya kupakua kwenye PDF. Weka alama kwanza kwenye fomu ya shule.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const failGradeKey = isCurrentExamPrimary ? 'E' : 'F';
    const eduLevelLabel = isCurrentExamPrimary
      ? 'PRIMARY EDUCATION (SHULE ZA MSINGI - PSLE/SFNA)'
      : 'SECONDARY EDUCATION (SHULE ZA SEKONDARI - CSEE/FTNA/ACSEE)';

    // Top Official Header Banner
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(10, 10, pageWidth - 20, 23, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(
      `CONSOLIDATED JOINT EXAMINATION REPORT: ${currentExam.name.toUpperCase()}`,
      pageWidth / 2,
      17.5,
      { align: 'center' }
    );

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Education Level: ${eduLevelLabel}   |   Class: ${currentExam.className} (${currentExam.level})   |   Date: ${currentExam.examDate}`,
      pageWidth / 2,
      23.5,
      { align: 'center' }
    );
    doc.text(
      `Participating Schools: ${schools.length}   |   Total Candidates: ${results.length}   |   Joint Mean: ${overallDivisionSummary.overallMean}%   |   Joint G.P.A: ${overallDivisionSummary.overallGpaFormatted} (${overallDivisionSummary.overallGpaGrade})`,
      pageWidth / 2,
      29,
      { align: 'center' }
    );

    // -----------------------------------------------------------------------
    // SECTION 1A: OVERALL DIVISION SUMMARY FOR ALL SCHOOLS COMBINED
    // -----------------------------------------------------------------------
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      isSevenOrMoreSubjects
        ? '1A. OVERALL DIVISION SUMMARY ACROSS ALL PARTICIPATING SCHOOLS (MUHTASARI WA DIVISION KWA SHULE ZOTE PAMOJA — MASOMO 7+)'
        : '1A. OVERALL GRADE SUMMARY ACROSS ALL PARTICIPATING SCHOOLS (CHINI YA MASOMO 7 — BILA DIVISION)',
      10,
      38.5
    );

    const overallDivHeaders = [
      'GENDER / GROUP',
      'REGISTERED',
      'SAT',
      ...(isSevenOrMoreSubjects
        ? ['DIV I', 'DIV II', 'DIV III', 'DIV IV', 'DIV 0']
        : ['GRADE A', 'GRADE B', 'GRADE C', 'GRADE D', `GRADE ${failGradeKey}`]),
      'PASSED',
      'PASS RATE (%)',
      'JOINT G.P.A',
    ];

    const overallDivBody =
      isSevenOrMoreSubjects
        ? [
            [
              'Wavulana (Boys - M)',
              String(overallDivisionSummary.totalRegistered.M),
              String(overallDivisionSummary.totalSat.M),
              String(overallDivisionSummary.divisions.I.M),
              String(overallDivisionSummary.divisions.II.M),
              String(overallDivisionSummary.divisions.III.M),
              String(overallDivisionSummary.divisions.IV.M),
              String(overallDivisionSummary.divisions['0'].M),
              String(overallDivisionSummary.totalPassed.M),
              overallDivisionSummary.totalSat.M > 0
                ? `${((overallDivisionSummary.totalPassed.M / overallDivisionSummary.totalSat.M) * 100).toFixed(1)}%`
                : '0.0%',
              '-',
            ],
            [
              'Wasichana (Girls - F)',
              String(overallDivisionSummary.totalRegistered.F),
              String(overallDivisionSummary.totalSat.F),
              String(overallDivisionSummary.divisions.I.F),
              String(overallDivisionSummary.divisions.II.F),
              String(overallDivisionSummary.divisions.III.F),
              String(overallDivisionSummary.divisions.IV.F),
              String(overallDivisionSummary.divisions['0'].F),
              String(overallDivisionSummary.totalPassed.F),
              overallDivisionSummary.totalSat.F > 0
                ? `${((overallDivisionSummary.totalPassed.F / overallDivisionSummary.totalSat.F) * 100).toFixed(1)}%`
                : '0.0%',
              '-',
            ],
            [
              'JUMLA KUU (TOTAL ALL SCHOOLS)',
              String(overallDivisionSummary.totalRegistered.T),
              String(overallDivisionSummary.totalSat.T),
              `${overallDivisionSummary.divisions.I.T} (${overallDivisionSummary.divisions.I.pct}%)`,
              `${overallDivisionSummary.divisions.II.T} (${overallDivisionSummary.divisions.II.pct}%)`,
              `${overallDivisionSummary.divisions.III.T} (${overallDivisionSummary.divisions.III.pct}%)`,
              `${overallDivisionSummary.divisions.IV.T} (${overallDivisionSummary.divisions.IV.pct}%)`,
              `${overallDivisionSummary.divisions['0'].T} (${overallDivisionSummary.divisions['0'].pct}%)`,
              String(overallDivisionSummary.totalPassed.T),
              `${overallDivisionSummary.totalPassed.pct}%`,
              `${overallDivisionSummary.overallGpaFormatted} (${overallDivisionSummary.overallGpaGrade})`,
            ],
          ]
        : [
            [
              'Wavulana (Boys - M)',
              String(overallDivisionSummary.totalRegistered.M),
              String(overallDivisionSummary.totalSat.M),
              String(overallDivisionSummary.grades.A.M),
              String(overallDivisionSummary.grades.B.M),
              String(overallDivisionSummary.grades.C.M),
              String(overallDivisionSummary.grades.D.M),
              String(isCurrentExamPrimary ? overallDivisionSummary.grades.E.M : overallDivisionSummary.grades.F.M),
              String(overallDivisionSummary.totalPassed.M),
              overallDivisionSummary.totalSat.M > 0
                ? `${((overallDivisionSummary.totalPassed.M / overallDivisionSummary.totalSat.M) * 100).toFixed(1)}%`
                : '0.0%',
              '-',
            ],
            [
              'Wasichana (Girls - F)',
              String(overallDivisionSummary.totalRegistered.F),
              String(overallDivisionSummary.totalSat.F),
              String(overallDivisionSummary.grades.A.F),
              String(overallDivisionSummary.grades.B.F),
              String(overallDivisionSummary.grades.C.F),
              String(overallDivisionSummary.grades.D.F),
              String(isCurrentExamPrimary ? overallDivisionSummary.grades.E.F : overallDivisionSummary.grades.F.F),
              String(overallDivisionSummary.totalPassed.F),
              overallDivisionSummary.totalSat.F > 0
                ? `${((overallDivisionSummary.totalPassed.F / overallDivisionSummary.totalSat.F) * 100).toFixed(1)}%`
                : '0.0%',
              '-',
            ],
            [
              'JUMLA KUU (TOTAL ALL SCHOOLS)',
              String(overallDivisionSummary.totalRegistered.T),
              String(overallDivisionSummary.totalSat.T),
              `${overallDivisionSummary.grades.A.T} (${overallDivisionSummary.grades.A.pct}%)`,
              `${overallDivisionSummary.grades.B.T} (${overallDivisionSummary.grades.B.pct}%)`,
              `${overallDivisionSummary.grades.C.T} (${overallDivisionSummary.grades.C.pct}%)`,
              `${overallDivisionSummary.grades.D.T} (${overallDivisionSummary.grades.D.pct}%)`,
              String(isCurrentExamPrimary ? overallDivisionSummary.grades.E.T : overallDivisionSummary.grades.F.T),
              String(overallDivisionSummary.totalPassed.T),
              `${overallDivisionSummary.totalPassed.pct}%`,
              `${overallDivisionSummary.overallGpaFormatted} (${overallDivisionSummary.overallGpaGrade})`,
            ],
          ];

    safeAutoTable(doc, {
      startY: 40.5,
      margin: { left: 10, right: 10 },
      head: [overallDivHeaders],
      body: overallDivBody,
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: 1.8,
        valign: 'middle',
        halign: 'center',
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          if (data.row.index === 2) {
            data.cell.styles.fillColor = [226, 232, 240];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // -----------------------------------------------------------------------
    // SECTION 1B: PARTICIPATING SCHOOLS DIVISION & GPA SUMMARY TABLE
    // -----------------------------------------------------------------------
    let sec1bY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 70;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      isSevenOrMoreSubjects
        ? '1B. DIVISION & G.P.A SUMMARY PER PARTICIPATING SCHOOL (MUHTASARI WA DIVISION KWA KILA SHULE — MASOMO 7+)'
        : '1B. GRADE & G.P.A SUMMARY PER PARTICIPATING SCHOOL (CHINI YA MASOMO 7 — BILA DIVISION)',
      10,
      sec1bY
    );

    const schoolSummaryHeaders = [
      'RANK',
      'SCHOOL COLOR BADGE & CODE',
      'PARTICIPATING SCHOOL NAME',
      'SAT/REG',
      'MEAN (%)',
      'SCHOOL G.P.A',
      'GPA GRADE',
      ...(isSevenOrMoreSubjects
        ? ['DIV I', 'DIV II', 'DIV III', 'DIV IV', 'DIV 0']
        : ['GRADE A', 'GRADE B', 'GRADE C', 'GRADE D', isCurrentExamPrimary ? 'GRADE E' : 'GRADE F']),
      'PASS %',
    ];

    const schoolSummaryBody = schoolComparisonStats.map((st) => [
      `${st.schoolPosition} / ${st.totalSchools}`,
      `${st.schoolCode} (${st.hexColor})`,
      st.schoolName,
      `${st.satCount}/${st.studentCount}`,
      `${st.meanAvg}%`,
      st.schoolGpaFormatted,
      `${st.schoolGpaGrade} (${st.schoolGpaRemark.split(' ')[0]})`,
      ...(isSevenOrMoreSubjects
        ? [
            String(st.divCounts.I),
            String(st.divCounts.II),
            String(st.divCounts.III),
            String(st.divCounts.IV),
            String(st.divCounts['0']),
          ]
        : [
            String(st.gradeCounts.A),
            String(st.gradeCounts.B),
            String(st.gradeCounts.C),
            String(st.gradeCounts.D),
            String(isCurrentExamPrimary ? st.gradeCounts.E : st.gradeCounts.F),
          ]),
      `${st.passRate}%`,
    ]);

    safeAutoTable(doc, {
      startY: sec1bY + 2,
      margin: { left: 10, right: 10 },
      head: [schoolSummaryHeaders],
      body: schoolSummaryBody,
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: 1.8,
        valign: 'middle',
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const statRow = schoolComparisonStats[data.row.index];
          if (statRow) {
            const rgb = hexToRgbTuple(statRow.hexColor);
            const lightRgb = tintRgb(rgb, 0.88);
            if (data.column.index === 1 || data.column.index === 0) {
              data.cell.styles.fillColor = rgb;
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.halign = 'center';
            } else {
              data.cell.styles.fillColor = lightRgb;
              data.cell.styles.textColor = [15, 23, 42];
              if (data.column.index >= 3) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.halign = 'center';
              }
            }
          }
        }
      },
    });

    // -----------------------------------------------------------------------
    // SECTION 1C: SUBJECT-BY-SUBJECT GRADE DISTRIBUTION SUMMARY (A, B, C, D, E/F)
    // -----------------------------------------------------------------------
    let sec1cY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 120;
    if (sec1cY > pageHeight - 45) {
      doc.addPage();
      sec1cY = 15;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      `1C. SUBJECT-BY-SUBJECT GRADE DISTRIBUTION SUMMARY (MUHTASARI WA KILA SOMO: IDADI YA A, B, C, D, ${failGradeKey})`,
      10,
      sec1cY
    );

    const subjSummaryHead = [
      'RANK',
      'SUBJECT NAME',
      'REG',
      'SAT',
      'GRADE A (M/F)',
      'GRADE B (M/F)',
      'GRADE C (M/F)',
      'GRADE D (M/F)',
      `GRADE ${failGradeKey}`,
      'PASSED',
      'PASS %',
      'MEAN (%)',
      'SUBJECT G.P.A',
      'GRADE',
    ];

    const subjSummaryBody = allSchoolsSubjectGradeSummary.map((sRow) => {
      const failObj = isCurrentExamPrimary ? sRow.grades.E : sRow.grades.F;
      return [
        `${sRow.subjectPosition} / ${sRow.totalSubjects}`,
        sRow.subject,
        String(sRow.registeredCount),
        String(sRow.satCount),
        `${sRow.grades.A.T} (${sRow.grades.A.M}/${sRow.grades.A.F})`,
        `${sRow.grades.B.T} (${sRow.grades.B.M}/${sRow.grades.B.F})`,
        `${sRow.grades.C.T} (${sRow.grades.C.M}/${sRow.grades.C.F})`,
        `${sRow.grades.D.T} (${sRow.grades.D.M}/${sRow.grades.D.F})`,
        `${failObj.T} (${failObj.M}/${failObj.F})`,
        String(sRow.passCount),
        `${sRow.passRate}%`,
        `${sRow.meanScore}%`,
        sRow.subjectGpaFormatted,
        `${sRow.subjectGrade} (${sRow.subjectRemark.split(' ')[0]})`,
      ];
    });

    safeAutoTable(doc, {
      startY: sec1cY + 2,
      margin: { left: 10, right: 10 },
      head: [subjSummaryHead],
      body: subjSummaryBody,
      theme: 'grid',
      styles: {
        fontSize: 7.0,
        cellPadding: 1.6,
        valign: 'middle',
        halign: 'center',
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [6, 78, 59], // Emerald-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.halign = 'left';
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // -----------------------------------------------------------------------
    // SECTION 2: COMBINED OVERALL JOINT RANKING (ALL RESULT ROWS BRANDED BY SCHOOL COLOR)
    // -----------------------------------------------------------------------
    let currentY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 7
      : 80;

    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 15;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      '2. COMBINED OVERALL JOINT RANKING (MSIMAMO WA PAMOJA WA SHULE ZOTE - BRANDED BY SCHOOL COLOR)',
      10,
      currentY
    );

    const sortedCombined = [...results].sort((a, b) => a.overallRank - b.overallRank);
    const subjAbbrevs = examSubjects.map((s) => s.slice(0, 5));

    const combinedHead = [
      'OVR',
      'SCH',
      'REG NO',
      'CANDIDATE NAME',
      'SEX',
      'SCHOOL BADGE',
      ...subjAbbrevs,
      'TOTAL',
      'AVG%',
      'GRD',
      ...(isSevenOrMoreSubjects ? ['PTS', 'DIV'] : []),
    ];

    const combinedBody = sortedCombined.map((r) => [
      String(r.overallRank),
      `#${r.schoolRank}`,
      r.regNo,
      r.studentName,
      r.gender,
      `${r.schoolCode} - ${r.schoolName} (${r.hexColor})`,
      ...examSubjects.map((s) => {
        const sc = r.subjectMarks?.[s];
        const gr = r.subjectGrades?.[s];
        return sc !== undefined && sc !== null ? `${sc}${gr ? ' ' + gr : ''}` : '-';
      }),
      String(r.totalMarks),
      `${Number(r.averageScore).toFixed(1)}`,
      r.overallGrade,
      ...(isSevenOrMoreSubjects ? [String(r.best7Points ?? '-'), r.division] : []),
    ]);

    safeAutoTable(doc, {
      startY: currentY + 2.5,
      margin: { left: 10, right: 10 },
      head: [combinedHead],
      body: combinedBody,
      rowPageBreak: 'avoid',
      theme: 'grid',
      styles: {
        fontSize: 6.8,
        cellPadding: 1.5,
        valign: 'middle',
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const rowObj = sortedCombined[data.row.index];
          if (!rowObj) return;
          const schoolRgb = hexToRgbTuple(rowObj.hexColor);
          const rowTint = tintRgb(schoolRgb, 0.88);
          const accentTint = tintRgb(schoolRgb, 0.8);
          const borderTint = tintRgb(schoolRgb, 0.65);

          // Apply participating institution's branding color across the ENTIRE result row
          data.cell.styles.fillColor = rowTint;
          data.cell.styles.lineColor = borderTint;
          data.cell.styles.textColor = [15, 23, 42];

          if (data.column.index === 5 || data.column.index === 0) {
            // Solid school branding color (#1E40AF, #047857, etc.) on Rank & School Badge cells
            data.cell.styles.fillColor = schoolRgb;
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
            if (data.column.index === 0) data.cell.styles.halign = 'center';
          } else if (data.column.index === 1) {
            data.cell.styles.fillColor = accentTint;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.halign = 'center';
          } else if (data.column.index === 3) {
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index >= 6) {
            data.cell.styles.halign = 'center';
            if (data.column.index >= 6 + examSubjects.length) {
              data.cell.styles.fillColor = accentTint;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
    });

    // -----------------------------------------------------------------------
    // SECTION 3: INDIVIDUAL PARTICIPATING SCHOOL SECTIONS (BRANDED BY HEX COLOR)
    // -----------------------------------------------------------------------
    schoolComparisonStats.forEach((schStat, sIdx) => {
      const schResults = results
        .filter((r) => r.jointSchoolId === schStat.id)
        .sort((a, b) => a.schoolRank - b.schoolRank);

      if (schResults.length === 0) return;

      let secY = (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable.finalY + 9
        : 30;

      if (secY > pageHeight - 50) {
        doc.addPage();
        secY = 15;
      }

      const rgb = hexToRgbTuple(schStat.hexColor);
      const evenRowTint = tintRgb(rgb, 0.87);
      const oddRowTint = tintRgb(rgb, 0.93);
      const borderTint = tintRgb(rgb, 0.65);

      // School Section Colored Banner
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(10, secY, pageWidth - 20, 9.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        `3.${sIdx + 1} SCHOOL SECTION: ${schStat.schoolCode} — ${schStat.schoolName.toUpperCase()}  [BRAND COLOR: ${schStat.hexColor}]`,
        13,
        secY + 6.2
      );
      doc.setFontSize(8);
      doc.text(
        `School Position: #${schStat.schoolPosition}   |   Candidates: ${schStat.studentCount}   |   School Mean: ${schStat.meanAvg}%`,
        pageWidth - 13,
        secY + 6.2,
        { align: 'right' }
      );

      const schoolHead = [
        'SCH RK',
        'OVR RK',
        'REG NO',
        'CANDIDATE NAME',
        'SEX',
        ...subjAbbrevs,
        'TOTAL',
        'AVG%',
        'GRD',
        ...(isSevenOrMoreSubjects ? ['PTS', 'DIV'] : []),
      ];

      const schoolBody = schResults.map((r) => [
        String(r.schoolRank),
        `#${r.overallRank}`,
        r.regNo,
        r.studentName,
        r.gender,
        ...examSubjects.map((s) => {
          const sc = r.subjectMarks?.[s];
          const gr = r.subjectGrades?.[s];
          return sc !== undefined && sc !== null ? `${sc}${gr ? ' ' + gr : ''}` : '-';
        }),
        String(r.totalMarks),
        `${Number(r.averageScore).toFixed(1)}`,
        r.overallGrade,
        ...(isSevenOrMoreSubjects ? [String(r.best7Points ?? '-'), r.division] : []),
      ]);

      safeAutoTable(doc, {
        startY: secY + 10.5,
        margin: { left: 10, right: 10 },
        head: [schoolHead],
        body: schoolBody,
        rowPageBreak: 'avoid',
        theme: 'grid',
        styles: {
          fontSize: 6.8,
          cellPadding: 1.5,
          valign: 'middle',
          lineColor: borderTint,
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: rgb,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            data.cell.styles.fillColor = data.row.index % 2 === 0 ? evenRowTint : oddRowTint;
            data.cell.styles.textColor = [15, 23, 42];
            if (data.column.index === 0) {
              data.cell.styles.fillColor = rgb;
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.halign = 'center';
            } else if (data.column.index === 3) {
              data.cell.styles.fontStyle = 'bold';
            } else if (data.column.index >= 4 || data.column.index === 1) {
              data.cell.styles.halign = 'center';
            }
          }
        },
      });
    });

      const filename = `${currentExam.name.replace(/\s+/g, '_')}_CONSOLIDATED_JOINT_REPORT.pdf`;
      try {
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 2500);
      } catch (blobErr) {
        doc.save(filename);
      }
      showNotice(
        'success',
        `Ripoti ya Pamoja ya PDF ("${filename}") imepakuliwa ikiwa na rangi za utambulisho za shule zote ${schools.length}!`
      );
    } catch (err: any) {
      console.error('Error generating joint PDF:', err);
      showNotice('error', `Imeshindwa kutengeneza PDF: ${err.message || 'Hitilafu imetokea'}`);
    }
  };

  const activeEntrySchool = schools.find((s) => s.id === entrySchoolId) || null;

  return (
    <div className="space-y-6 pb-12">
      {/* TOP BANNER & EXAM SELECTOR */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg border border-slate-800 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                    INTER-SCHOOL JOINT EXAMINATIONS ENGINE • NECTA STANDARD
                  </span>
                  {currentExam && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isCurrentExamPrimary
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {isCurrentExamPrimary
                        ? 'PRIMARY LEVEL (SHULE YA MSINGI)'
                        : 'SECONDARY LEVEL (SHULE YA SEKONDARI)'}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Moduli ya Mitihani ya Pamoja (Joint Examinations)
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl">
              Unganisha shule 2 au zaidi za <strong className="text-emerald-300">Primary (Msingi)</strong> au{' '}
              <strong className="text-amber-300">Secondary (Sekondari)</strong>, ingiza alama kwa kila shule, linganisha ufaulu kwa chati za{' '}
              <strong className="text-sky-300">Performance Analytics</strong>, na pakua ripoti ya pamoja ya PDF yenye rangi za kila shule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Exams by Level (All / Primary / Secondary) */}
            {exams.length > 0 && (
              <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                {(['ALL', 'PRIMARY', 'SECONDARY'] as const).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setExamLevelFilter(lv)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer ${
                      examLevelFilter === lv
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lv === 'ALL' ? 'Zote' : lv === 'PRIMARY' ? 'Primary' : 'Secondary'}
                  </button>
                ))}
              </div>
            )}

            {filteredExamsList.length > 0 && (
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {filteredExamsList.map((ex) => {
                  const isPrim = isPrimaryEducationLevel(ex.level, ex.className);
                  return (
                    <option key={ex.id} value={ex.id}>
                      [{isPrim ? 'PRIMARY' : 'SECONDARY'}] {ex.name} ({ex.className} • Shule {ex.schoolCount || 0} • Wanafunzi {ex.studentCount || 0})
                    </option>
                  );
                })}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowNewExamModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Unda Mtihani Mpya wa Pamoja</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            PROMINENT EDUCATION LEVEL SELECTOR BAR (PRIMARY OR SECONDARY)
            Visible both before and after creating a Joint Exam
           =================================================================== */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
                CHAGUA NGAZI YA MTIHANI HUU WA PAMOJA (SELECT JOINT EXAM EDUCATION LEVEL)
              </span>
              <p className="text-xs font-bold text-white">
                Je, Joint Exam hii inafanywa kwa ngazi gani? Chagua{' '}
                <span className="text-emerald-300 font-black">PRIMARY (Shule ya Msingi)</span> au{' '}
                <span className="text-amber-300 font-black">SECONDARY (Shule ya Sekondari)</span>:
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* PRIMARY LEVEL BUTTON */}
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (currentExam) {
                  handleSwitchExamEducationLevel('PRIMARY');
                } else {
                  handleSelectModalEducationType('PRIMARY');
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border-2 ${
                (currentExam ? isCurrentExamPrimary : newExamEducationType === 'PRIMARY')
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-white'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  (currentExam ? isCurrentExamPrimary : newExamEducationType === 'PRIMARY')
                    ? 'bg-white'
                    : 'bg-emerald-400'
                }`}
              />
              <span>PRIMARY (Shule ya Msingi • Std 1–7)</span>
              {(currentExam ? isCurrentExamPrimary : newExamEducationType === 'PRIMARY') && (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
            </button>

            {/* SECONDARY LEVEL BUTTON */}
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (currentExam) {
                  handleSwitchExamEducationLevel('SECONDARY');
                } else {
                  handleSelectModalEducationType('SECONDARY');
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border-2 ${
                (currentExam ? !isCurrentExamPrimary : newExamEducationType === 'SECONDARY')
                  ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-white'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  (currentExam ? !isCurrentExamPrimary : newExamEducationType === 'SECONDARY')
                    ? 'bg-white'
                    : 'bg-amber-400'
                }`}
              />
              <span>SECONDARY (Shule ya Sekondari • Form 1–6)</span>
              {(currentExam ? !isCurrentExamPrimary : newExamEducationType === 'SECONDARY') && (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
            </button>

            {/* CLASS / GRADE SELECTOR FOR ACTIVE LEVEL */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-black uppercase text-slate-400">
                {(currentExam ? isCurrentExamPrimary : newExamEducationType === 'PRIMARY')
                  ? 'Darasa:'
                  : 'Kidato:'}
              </span>
              <select
                value={currentExam ? currentExam.className : newExamClass}
                disabled={saving}
                onChange={(e) => {
                  if (currentExam) {
                    handleSwitchExamEducationLevel(
                      isCurrentExamPrimary ? 'PRIMARY' : 'SECONDARY',
                      e.target.value
                    );
                  } else {
                    setNewExamClass(e.target.value);
                  }
                }}
                className="bg-transparent text-white text-xs font-black focus:outline-hidden cursor-pointer"
              >
                {((currentExam ? isCurrentExamPrimary : newExamEducationType === 'PRIMARY')
                  ? PRIMARY_CLASSES
                  : SECONDARY_CLASSES
                ).map((cls) => (
                  <option key={cls} value={cls} className="bg-slate-900 text-white">
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        {currentExam && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'results'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>1. Jedwali la Matokeo (Dual View: Pamoja &amp; Shule Binafsi)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>2. Performance Analytics (Uchambuzi wa Chati za Shule &amp; Masomo)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('entry')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'entry'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>3. Fomu ya Kuingiza Alama kwa Shule (Dynamic Entry)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schools')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'schools'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>4. Shule Zinazoshiriki ({schools.length}) &amp; Masomo ({examSubjects.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                Ngazi &amp; Uhesabuji:{' '}
                <strong className={isSevenOrMoreSubjects ? 'text-amber-300' : 'text-emerald-300'}>
                  {isSevenOrMoreSubjects
                    ? `${isCurrentExamPrimary ? 'PRIMARY' : 'SECONDARY'} (${currentExam.className} • Masomo ${examSubjects.length} ≥ 7 • NECTA Best 7 Points & Division I–0)`
                    : `${isCurrentExamPrimary ? 'PRIMARY' : 'SECONDARY'} (${currentExam.className} • Masomo ${examSubjects.length} < 7 • Bila Division: Total, Avg, Grade & Rank)`}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 print:hidden ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-bold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-black underline cursor-pointer"
          >
            Funga
          </button>
        </div>
      )}

      {/* EMPTY STATE IF NO JOINT EXAM IS SELECTED OR EXISTS YET */}
      {!loading && !currentExam && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-lg font-black text-slate-900">
              Anzisha Mtihani wa Pamoja (Joint Examination)
            </h2>
            <p className="text-xs text-slate-600">
              Chagua ngazi ya elimu hapa chini (<strong>PRIMARY - Shule ya Msingi</strong> au{' '}
              <strong>SECONDARY - Shule ya Sekondari</strong>) kisha bonyeza{' '}
              <strong>&ldquo;Anzisha Mtihani wa Pamoja Sasa&rdquo;</strong> ili kufungua jedwali la matokeo na kuanza kuingiza alama za shule zinazoshiriki mara moja.
            </p>
          </div>

          {/* LEVEL SELECTION PILLS INSIDE EMPTY STATE */}
          <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <button
              type="button"
              onClick={() => handleSelectModalEducationType('PRIMARY')}
              className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start justify-between gap-2 ${
                newExamEducationType === 'PRIMARY'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <span className="text-xs font-black uppercase block">
                  1. PRIMARY (SHULE YA MSINGI)
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  Darasa la 1 – 7 (PSLE / SFNA) • Masomo ya Msingi • Grade A–E, Total, Average &amp; Rank
                </span>
              </div>
              {newExamEducationType === 'PRIMARY' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectModalEducationType('SECONDARY')}
              className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start justify-between gap-2 ${
                newExamEducationType === 'SECONDARY'
                  ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                <span className="text-xs font-black uppercase block">
                  2. SECONDARY (SHULE YA SEKONDARI)
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  Form 1 – 6 (FTNA / CSEE / ACSEE) • Best 7 Subjects Points &amp; Division (I–0)
                </span>
              </div>
              {newExamEducationType === 'SECONDARY' && (
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleQuickStartExam(newExamEducationType)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 shadow-md cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? 'Inaanzisha Mtihani...'
                  : `Anzisha Mtihani wa Pamoja Sasa (${
                      newExamEducationType === 'PRIMARY' ? 'Primary' : 'Secondary'
                    })`}
              </span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => setShowNewExamModal(true)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black inline-flex items-center gap-2 border border-slate-300 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Badilisha Jina, Masomo &amp; Shule Kabla ya Kuanzisha</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          PERFORMANCE ANALYTICS DASHBOARD (RECHARTS SIDE-BY-SIDE BAR CHARTS)
          Shown in 'analytics' tab OR inside 'results' tab when toggled on
         ===================================================================== */}
      {currentExam && (activeTab === 'analytics' || (activeTab === 'results' && showAnalyticsInResults)) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5 print:break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900 text-[10px] font-black uppercase tracking-wider">
                  RECHARTS VISUAL ANALYTICS
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    isCurrentExamPrimary
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {isCurrentExamPrimary
                    ? `PRIMARY SCHOOL LEVEL (${currentExam.className})`
                    : `SECONDARY SCHOOL LEVEL (${currentExam.className})`}
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-600" />
                <span>
                  Performance Analytics — Ulinganisho wa Wastani wa Shule &amp; Mwenendo wa Masomo (Side-by-Side Bar Charts)
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Chati za pembeni kwa pembeni (Side-by-Side Recharts Bar Charts) zikilinganisha wastani wa alama za shule zote zinazoshiriki na ufaulu wa kila somo kwa rangi maalum za kila shule.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleDownloadJointPdf}
                disabled={results.length === 0}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Joint PDF</span>
              </button>
              {activeTab === 'results' && (
                <button
                  type="button"
                  onClick={() => setShowAnalyticsInResults(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Ficha Chati
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">
                Ingiza alama za wanafunzi kwenye kichupo cha &ldquo;Fomu ya Kuingiza Alama&rdquo; ili kuona chati za ulinganisho wa shule na masomo.
              </p>
            </div>
          ) : (
            <>
              {/* SIDE-BY-SIDE RECHARTS BAR CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CHART 1: SCHOOL AVERAGE SCORES COMPARISON */}
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-700 block">
                        CHATI YA 1 • SCHOOL AVERAGE SCORES COMPARISON
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        Ulinganisho wa Wastani wa Jumla na Kiwango cha Ufaulu kwa Shule (%)
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-slate-800">
                      Wastani wa Pamoja: {overallJointMean}%
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={schoolAverageChartData}
                        margin={{ top: 12, right: 16, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis
                          dataKey="schoolCode"
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                          unit="%"
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [`${value}%`, name]}
                          labelFormatter={(label: any) => {
                            const found = schoolAverageChartData.find((s) => s.schoolCode === label);
                            return found ? `${found.schoolCode} — ${found.schoolName}` : label;
                          }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <ReferenceLine
                          y={overallJointMean}
                          stroke="#0f172a"
                          strokeDasharray="4 4"
                          label={{
                            value: `Joint Mean (${overallJointMean}%)`,
                            position: 'insideTopRight',
                            fontSize: 10,
                            fill: '#0f172a',
                          }}
                        />
                        <Bar
                          dataKey="meanAvg"
                          name="Wastani wa Shule (Mean Avg %)"
                          radius={[6, 6, 0, 0]}
                        >
                          {schoolAverageChartData.map((entry) => (
                            <Cell key={`cell-avg-${entry.schoolId}`} fill={entry.hexColor} />
                          ))}
                        </Bar>
                        <Bar
                          dataKey="highestAvg"
                          name="Alama ya Juu Zaidi (Top Candidate %)"
                          fill="#64748b"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CHART 2: SUBJECT PERFORMANCE TRENDS ACROSS ALL PARTICIPATING SCHOOLS */}
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 block">
                        CHATI YA 2 • SUBJECT PERFORMANCE TRENDS ACROSS SCHOOLS
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        Mwenendo wa Ufaulu wa Kila Somo kwa Shule Zinazoshiriki (%)
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-black text-slate-800">
                      Masomo: {examSubjects.length}
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectTrendsChartData}
                        margin={{ top: 12, right: 16, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                        <XAxis
                          dataKey="shortSubject"
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#0f172a' }}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                          unit="%"
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [`${value}%`, name]}
                          labelFormatter={(label: any, payload: any) => {
                            const fullSubj = payload?.[0]?.payload?.subject || label;
                            return `Somo: ${fullSubj}`;
                          }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        {schools.map((sch) => (
                          <Bar
                            key={sch.id}
                            dataKey={sch.schoolCode}
                            name={`${sch.schoolCode} - ${sch.schoolName}`}
                            fill={sch.hexColor}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* SUBJECT PERFORMANCE MATRIX TABLE ACROSS PARTICIPATING SCHOOLS */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase">
                    Jedwali la Ulinganisho wa Wastani wa Masomo kwa Kila Shule (Subject Performance Matrix)
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">
                    Shule Inayoongoza Kila Somo Inaoneshwa kwa Rangi Yake
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase">
                        <th className="py-2.5 px-3 border-r border-slate-200">Somo (Subject)</th>
                        {schools.map((sch) => (
                          <th
                            key={sch.id}
                            className="py-2.5 px-3 text-center border-r border-slate-200 text-white"
                            style={{ backgroundColor: sch.hexColor }}
                          >
                            {sch.schoolCode} — {sch.schoolName}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-slate-100">
                          Wastani wa Pamoja
                        </th>
                        <th className="py-2.5 px-3 text-center bg-slate-100">
                          Shule Inayoongoza Somo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {subjectTrendsChartData.map((sRow) => (
                        <tr key={sRow.subject} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-black text-slate-900 border-r border-slate-200">
                            {sRow.subject}
                          </td>
                          {schools.map((sch) => (
                            <td
                              key={sch.id}
                              className="py-2 px-3 text-center font-bold text-slate-800 border-r border-slate-200"
                            >
                              {sRow[sch.schoolCode] !== undefined ? `${sRow[sch.schoolCode]}%` : '-'}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-center font-black text-blue-900 bg-blue-50/40 border-r border-slate-200">
                            {sRow.overallAvg}%
                          </td>
                          <td className="py-2 px-3 text-center">
                            {sRow.topSchoolCode !== '-' ? (
                              <span
                                className="px-2.5 py-0.5 rounded text-[10px] font-black text-white inline-block"
                                style={{ backgroundColor: sRow.topSchoolColor }}
                              >
                                {sRow.topSchoolCode}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 1: DUAL VIEW RESULTS (MTAZAMO WA PAMOJA VS SHULE BINAFSI)
         ===================================================================== */}
      {currentExam && activeTab === 'results' && (
        <div className="space-y-6">
          {/* SCHOOL-LEVEL GPA RANKING LEADERBOARD (1 OUT OF N SCHOOLS BY GPA) */}
          <JointSchoolGpaLeaderboard
            schoolStats={schoolComparisonStats}
            isPrimary={isCurrentExamPrimary}
            isSevenOrMoreSubjects={isSevenOrMoreSubjects}
            saving={saving}
            onPopulateTenSchoolsDemo={handlePopulateTenSchoolsGpaDemo}
            onSelectSchoolFilter={(schId) => {
              setViewMode('individual');
              setFilterSchoolId(schId);
            }}
          />

          {/* PARTICIPATING SCHOOLS BADGE STRIP & COMPARISON CARDS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 print:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Kadi za Ufaulu &amp; G.P.A za Shule Zinazoshiriki ({schools.length})</span>
                  </h2>
                  {results.length > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                        savedResultsIntegrityIssues.length === 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}
                    >
                      {savedResultsIntegrityIssues.length === 0 ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Result Integrity Verified (0 Grade/Mark Mismatches)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          <span>{savedResultsIntegrityIssues.length} Integrity Mismatches Found</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kila shule imepangwa kwa G.P.A ya wanafunzi wake wote na ina rangi maalum ya utambulisho (Hex Color Badge).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {!showAnalyticsInResults && (
                  <button
                    type="button"
                    onClick={() => setShowAnalyticsInResults(true)}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Onyesha Performance Analytics</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('entry')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sajili Wanafunzi &amp; Ingiza Alama</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadJointPdf}
                  disabled={results.length === 0}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  title="Pakua Ripoti ya Pamoja ya PDF yenye rangi za utambulisho za kila shule"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Joint PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={displayedResults.length === 0}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintJointResults}
                  disabled={results.length === 0}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Matokeo &amp; Summary (A4)</span>
                </button>
              </div>
            </div>

            {/* SCHOOL COMPARISON GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {schoolComparisonStats.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 flex flex-col justify-between gap-3 relative overflow-hidden tabular-nums"
                  style={{ borderLeftWidth: '6px', borderLeftColor: st.hexColor }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black text-white uppercase tracking-wider shadow-2xs"
                        style={{ backgroundColor: st.hexColor }}
                      >
                        {st.schoolCode} • NAFASI YA {st.schoolPosition} KATI YA {st.totalSchools}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1.5">{st.schoolName}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase block">
                        School G.P.A
                      </span>
                      <span className="text-lg font-mono font-black text-slate-900">
                        {st.schoolGpaFormatted}
                      </span>
                      <span className="block text-[10px] font-bold text-slate-600">
                        Wastani: {st.meanAvg}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Watahiniwa</span>
                      <strong className="text-slate-900 font-black">
                        {st.satCount} / {st.studentCount}
                      </strong>
                    </div>
                    {isSevenOrMoreSubjects ? (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Divisions (I / II / III / IV / 0)</span>
                        <strong className="text-slate-900 font-black">
                          {st.divCounts.I} / {st.divCounts.II} / {st.divCounts.III} / {st.divCounts.IV} / {st.divCounts['0']}
                        </strong>
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">
                          {isCurrentExamPrimary ? 'Grades (A / B / C / D / E)' : 'Daraja la G.P.A'}
                        </span>
                        <strong className="text-slate-900 font-black truncate block">
                          {isCurrentExamPrimary
                            ? `${st.gradeCounts.A} / ${st.gradeCounts.B} / ${st.gradeCounts.C} / ${st.gradeCounts.D} / ${st.gradeCounts.E}`
                            : `Grade ${st.schoolGpaGrade} (${st.schoolGpaRemark})`}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DUAL VIEW SWITCHER BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('combined')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  viewMode === 'combined'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Mtazamo wa Pamoja / Muungano (Combined Joint Ranking)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('individual');
                  if (filterSchoolId === 'ALL' && schools.length > 0) {
                    setFilterSchoolId(schools[0].id);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  viewMode === 'individual'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Mtazamo wa Shule Binafsi (Individual School View)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {viewMode === 'individual' && (
                <select
                  value={filterSchoolId}
                  onChange={(e) => setFilterSchoolId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-black text-slate-900 focus:outline-hidden"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      Shule: {s.schoolCode} - {s.schoolName}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tafuta mwanafunzi au shule..."
                  className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* MAIN RESULTS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Title Banner */}
            <div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  {viewMode === 'combined'
                    ? `MSIMAMO WA PAMOJA WA SHULE ZOTE (${currentExam.name})`
                    : `MATOKEO YA SHULE BINAFSI: ${
                        schools.find((s) => s.id === filterSchoolId)?.schoolName || ''
                      }`}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Darasa: {currentExam.className} ({currentExam.level}) • Tarehe: {currentExam.examDate} • Jumla ya Watahiniwa:{' '}
                  {displayedResults.length}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {schools.map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 rounded-md text-[10px] font-black text-white shadow-2xs"
                    style={{ backgroundColor: s.hexColor }}
                  >
                    {s.schoolCode}: {s.schoolName}
                  </span>
                ))}
              </div>
            </div>

            {displayedResults.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-bold text-slate-700">
                  Bado hakuna alama za wanafunzi zilizoingizwa kwenye mtihani huu.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('entry')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Fungua Fomu ya Kuingiza Alama za Shule</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                      <th className="py-3 px-3 text-center bg-blue-50 text-blue-950 border-r border-slate-200">
                        {viewMode === 'combined' ? 'Overall Rank' : 'School Rank'}
                      </th>
                      <th className="py-3 px-3 text-center bg-slate-50 text-slate-700 border-r border-slate-200">
                        {viewMode === 'combined' ? 'School Rank' : 'Overall Rank'}
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200">Namba / Reg No</th>
                      <th className="py-3 px-3 border-r border-slate-200 min-w-[180px]">Jina la Mwanafunzi</th>
                      <th className="py-3 px-2 text-center border-r border-slate-200">Jinsia</th>
                      <th className="py-3 px-3 border-r border-slate-200 min-w-[170px]">
                        Shule (School Color Tag)
                      </th>
                      {examSubjects.map((subj) => (
                        <th
                          key={subj}
                          className="py-3 px-2.5 text-center border-r border-slate-200 min-w-[78px]"
                          title={subj}
                        >
                          {subj.slice(0, 8)}
                        </th>
                      ))}
                      <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-950 border-r border-slate-200">
                        Total
                      </th>
                      <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-950 border-r border-slate-200">
                        Average
                      </th>
                      <th className="py-3 px-2.5 text-center bg-emerald-50 text-emerald-950 border-r border-slate-200">
                        Grade
                      </th>
                      {isSevenOrMoreSubjects && (
                        <>
                          <th className="py-3 px-2.5 text-center bg-amber-50 text-amber-950 border-r border-slate-200">
                            Best 7 Pts
                          </th>
                          <th className="py-3 px-3 text-center bg-amber-50 text-amber-950 border-r border-slate-200">
                            Division
                          </th>
                        </>
                      )}
                      <th className="py-3 px-2 text-center print:hidden">Hatua</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedResults.map((row) => {
                      const primaryRank = viewMode === 'combined' ? row.overallRank : row.schoolRank;
                      const secondaryRank = viewMode === 'combined' ? row.schoolRank : row.overallRank;

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50/90 transition-colors"
                          style={{ borderLeft: `5px solid ${row.hexColor}` }}
                        >
                          {/* Primary Rank */}
                          <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-blue-50/40 border-r border-slate-200">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                                primaryRank === 1
                                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                                  : primaryRank === 2
                                  ? 'bg-slate-300 text-slate-900'
                                  : primaryRank === 3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-white text-slate-800 border border-slate-300'
                              }`}
                            >
                              {primaryRank}
                            </span>
                          </td>

                          {/* Secondary Rank */}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-600 border-r border-slate-200">
                            #{secondaryRank}
                          </td>

                          {/* Reg No */}
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 border-r border-slate-200">
                            {row.regNo}
                          </td>

                          {/* Student Name */}
                          <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200">
                            {row.studentName}
                          </td>

                          {/* Gender */}
                          <td className="py-2.5 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                            {row.gender}
                          </td>

                          {/* School Color Badge */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black text-white shadow-2xs"
                              style={{ backgroundColor: row.hexColor }}
                            >
                              <span>{row.schoolCode}</span>
                              <span>•</span>
                              <span className="truncate max-w-[140px]">{row.schoolName}</span>
                            </span>
                          </td>

                          {/* Subject Marks & Grades */}
                          {examSubjects.map((subj) => {
                            const score = row.subjectMarks?.[subj];
                            const grade = row.subjectGrades?.[subj];
                            return (
                              <td
                                key={subj}
                                className="py-2.5 px-2 text-center border-r border-slate-200 font-medium"
                              >
                                {score !== undefined && score !== null ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-bold text-slate-900">{score}</span>
                                    <span
                                      className={`text-[10px] font-black px-1 rounded ${
                                        grade === 'A'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : grade === 'B'
                                          ? 'bg-blue-100 text-blue-800'
                                          : grade === 'C'
                                          ? 'bg-amber-100 text-amber-800'
                                          : grade === 'D'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {grade}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Total */}
                          <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-emerald-50/40 border-r border-slate-200">
                            {row.totalMarks}
                          </td>

                          {/* Average */}
                          <td className="py-2.5 px-3 text-center font-black text-emerald-900 bg-emerald-50/40 border-r border-slate-200">
                            {Number(row.averageScore).toFixed(1)}%
                          </td>

                          {/* Overall Grade */}
                          <td className="py-2.5 px-2.5 text-center font-black border-r border-slate-200 bg-emerald-50/40">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-xs ${
                                row.overallGrade === 'A'
                                  ? 'bg-emerald-600 text-white'
                                  : row.overallGrade === 'B'
                                  ? 'bg-blue-600 text-white'
                                  : row.overallGrade === 'C'
                                  ? 'bg-amber-500 text-slate-950'
                                  : row.overallGrade === 'D'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {row.overallGrade}
                            </span>
                          </td>

                          {/* Best 7 Points & Division (Strictly When >= 7 Subjects) */}
                          {isSevenOrMoreSubjects && (
                            <>
                              <td className="py-2.5 px-2.5 text-center font-black text-amber-950 bg-amber-50/40 border-r border-slate-200">
                                {row.best7Points ?? '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-black bg-amber-50/40 border-r border-slate-200">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                    row.division === 'I'
                                      ? 'bg-emerald-700 text-white'
                                      : row.division === 'II'
                                      ? 'bg-blue-700 text-white'
                                      : row.division === 'III'
                                      ? 'bg-amber-500 text-slate-950'
                                      : row.division === 'IV'
                                      ? 'bg-orange-600 text-white'
                                      : row.division === '0'
                                      ? 'bg-rose-700 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {row.division === '-' ? '-' : `DIV ${row.division}`}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Delete Action */}
                          <td className="py-2.5 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteStudentResult(row.id, row.studentName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Futa matokeo ya mwanafunzi huyu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* =================================================================
              COMPREHENSIVE SUMMARY TABLES:
              1. Overall Division Summary for All Schools Combined
              2. Division & GPA Summary Per Participating School
              3. Subject-by-Subject Grade Distribution Summary (A, B, C, D, E/F)
             ================================================================= */}
          <JointResultsSummaryTables
            currentExam={currentExam}
            schools={schools}
            results={results}
            schoolStats={schoolComparisonStats}
            examSubjects={examSubjects}
            isPrimary={isCurrentExamPrimary}
            isSevenOrMoreSubjects={isSevenOrMoreSubjects}
            onDownloadJointPdf={handleDownloadJointPdf}
            onExportFullCsv={handleExportCsv}
            onPrintJointReport={handlePrintJointResults}
            onSelectSchoolFilter={(schId) => {
              setViewMode('individual');
              setFilterSchoolId(schId);
            }}
          />
        </div>
      )}

      {/* =====================================================================
          TAB 2: DYNAMIC SCHOOL MARK ENTRY FORM (FOMU YA KUINGIZA ALAMA KWA SHULE)
         ===================================================================== */}
      {currentExam && activeTab === 'entry' && (
        <div className="space-y-6">
          {/* BULK MULTIPLE STUDENT REGISTRATION PER SCHOOL & SUBJECT-FILTERED MARK ENTRY (10 / 100 STUDENTS) */}
          <JointBulkRegistrationAndMarks
            currentExam={currentExam}
            schools={schools}
            entrySchoolId={entrySchoolId}
            onSelectEntrySchool={(schId) => setEntrySchoolId(schId)}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            examSubjects={examSubjects}
            isPrimary={isCurrentExamPrimary}
            saving={saving}
            onSaveSchoolMarks={handleSaveSchoolMarks}
            onImportHostSchoolStudents={handleImportHostSchoolStudents}
            onOpenSchoolsTab={() => setActiveTab('schools')}
          />

          {/* STEP 1: CHOOSE PARTICIPATING SCHOOL & FULL MULTI-SUBJECT SPREADSHEET */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  JEDWALI LA MASOMO YOTE KWA MPIGO (MULTI-SUBJECT SPREADSHEET ENTRY)
                </span>
                <h2 className="text-base font-black text-slate-900">
                  Fomu ya Kuingiza Alama za Masomo Yote kwa Shule (Full School Mark Sheet)
                </h2>
                <p className="text-xs text-slate-500">
                  Hapa unaweza pia kuingiza au kuhariri alama za masomo yote kwenye jedwali moja. Mfumo una{' '}
                  <strong>Result Integrity Check</strong> inayokagua alama zilizozidi 100 na kuoanisha Grade za NECTA kabla ya kuwasilisha.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunIntegrityCheckNow}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Result Integrity Check ({entryIntegrityIssues.filter((i) => i.severity === 'error').length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleImportHostSchoolStudents}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pakia Wanafunzi wa {currentExam.className}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddDraftRow}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Ongeza Mwanafunzi (+ Row)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSchoolMarks()}
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Inahifadhi & Kukokotoa Rank...' : 'Hifadhi Alama & Kokotoa Rank'}</span>
                </button>
              </div>
            </div>

            {/* SCHOOL SELECTION PILLS */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {schools.map((sch) => {
                const isSelected = sch.id === entrySchoolId;
                const count = results.filter((r) => r.jointSchoolId === sch.id).length;
                return (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => setEntrySchoolId(sch.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition cursor-pointer border-2 ${
                      isSelected
                        ? 'text-white shadow-md scale-[1.01]'
                        : 'bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                    style={{
                      backgroundColor: isSelected ? sch.hexColor : '#ffffff',
                      borderColor: sch.hexColor,
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/60"
                      style={{ backgroundColor: isSelected ? '#ffffff' : sch.hexColor }}
                    />
                    <span>
                      {sch.schoolCode} — {sch.schoolName}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                        isSelected ? 'bg-black/25 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Wanafunzi {count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveTab('schools')}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-dashed border-slate-400 text-slate-600 hover:text-slate-900 hover:border-slate-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ongeza Shule Nyingine</span>
              </button>
            </div>
          </div>

          {/* RESULT INTEGRITY CHECK PANEL (PRE-SUBMISSION VALIDATOR) */}
          <div
            className={`rounded-2xl border p-4 shadow-xs transition ${
              entryIntegrityIssues.some((i) => i.severity === 'error')
                ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                : entryIntegrityIssues.length > 0
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                {entryIntegrityIssues.some((i) => i.severity === 'error') ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wide">
                      Result Integrity Check (Ukaguzi wa Mipaka ya Alama 0–100 &amp; Ulinganifu wa Grade za NECTA)
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        entryIntegrityIssues.some((i) => i.severity === 'error')
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {entryIntegrityIssues.some((i) => i.severity === 'error')
                        ? `${entryIntegrityIssues.filter((i) => i.severity === 'error').length} Critical Errors`
                        : 'PASSED • Tayari Kuwasilishwa'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Unaweza kuingiza alama pekee (mf. <code>82</code>) au alama yenye Grade ya karatasi ili kuhakiki (mf.{' '}
                    <code>82 A</code> au <code>82 B</code>), au kuchagua <strong>Expected Grade/Div</strong>. Mfumo unazuia alama nje ya{' '}
                    <strong>0–100</strong> na unaonesha papo hapo kama Grade imekosewa.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {entryIntegrityIssues.some((i) => i.severity === 'error') && (
                  <button
                    type="button"
                    onClick={handleAutoFixIntegrityIssues}
                    className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Auto-Fix Kasoro Zote</span>
                  </button>
                )}
                {entryIntegrityIssues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowIntegrityDetails((prev) => !prev)}
                    className="px-3 py-1.5 bg-white/80 hover:bg-white rounded-lg border border-current/20 text-[11px] font-black cursor-pointer"
                  >
                    {showIntegrityDetails ? 'Ficha Orodha' : `Onyesha Kasoro (${entryIntegrityIssues.length})`}
                  </button>
                )}
              </div>
            </div>

            {showIntegrityDetails && entryIntegrityIssues.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current/15 space-y-1.5 max-h-48 overflow-y-auto">
                {entryIntegrityIssues.map((iss) => (
                  <div
                    key={iss.id}
                    className={`px-3 py-2 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                      iss.severity === 'error'
                        ? 'bg-white border border-rose-300 text-rose-900'
                        : 'bg-white/70 border border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          iss.type === 'OUT_OF_RANGE'
                            ? 'bg-rose-600 text-white'
                            : iss.type === 'GRADE_MISMATCH'
                            ? 'bg-purple-700 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {iss.type === 'OUT_OF_RANGE'
                          ? 'OUT OF RANGE (>100 / <0)'
                          : iss.type === 'GRADE_MISMATCH'
                          ? 'GRADE MISMATCH'
                          : iss.type}
                      </span>
                      <span className="font-bold">{iss.message}</span>
                    </div>
                    {iss.computedValue && (
                      <span className="text-[11px] font-black text-emerald-700 shrink-0">
                        Sahihi: {iss.computedValue}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 2: DYNAMIC SPREADSHEET MARK ENTRY TABLE */}
          {activeEntrySchool && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div
                className="px-5 py-3.5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                style={{ backgroundColor: activeEntrySchool.hexColor }}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-5 h-5" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      FOMU YA ALAMA: {activeEntrySchool.schoolCode} — {activeEntrySchool.schoolName}
                    </h3>
                    <p className="text-[11px] text-white/90">
                      Masomo ya Mtihani ({examSubjects.length}): {examSubjects.join(' • ')}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-black bg-black/25 px-3 py-1 rounded-lg">
                  Integrity Check Active: 0 – 100 &amp; NECTA Grade Sync
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                      <th className="py-3 px-2.5 text-center w-10">#</th>
                      <th className="py-3 px-2.5 min-w-[130px]">Namba (Reg No)</th>
                      <th className="py-3 px-2.5 min-w-[200px]">Jina Kamili la Mwanafunzi</th>
                      <th className="py-3 px-2 text-center w-20">Jinsia</th>
                      {examSubjects.map((subj) => (
                        <th key={subj} className="py-3 px-2 text-center min-w-[105px]">
                          {subj}
                          <span className="block text-[9px] text-slate-500 font-normal">
                            (0-100 au 80 A)
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-2.5 text-center bg-slate-50">Total</th>
                      <th className="py-3 px-2.5 text-center bg-slate-50">Avg</th>
                      <th className="py-3 px-2.5 text-center bg-slate-50">Grade</th>
                      {isEntryDivisionActive && (
                        <>
                          <th className="py-3 px-2.5 text-center bg-amber-50 text-amber-900">Pts (7)</th>
                          <th className="py-3 px-2.5 text-center bg-amber-50 text-amber-900">Div</th>
                        </>
                      )}
                      <th
                        className="py-3 px-2 text-center bg-purple-50 text-purple-950 min-w-[115px]"
                        title="Chagua Grade/Division unayoitarajia kutoka kwenye karatasi ili mfumo uhakiki kama inaoana na alama"
                      >
                        Verify Grade
                        <span className="block text-[9px] text-purple-700 font-normal">
                          (Integrity Check)
                        </span>
                      </th>
                      <th className="py-3 px-2 text-center w-12">Ondoa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {draftRows.map((row, rIdx) => {
                      const preview = computeLocalPreview(
                        row.subjectMarks,
                        examSubjects,
                        isCurrentExamPrimary
                      );
                      const rowIssues = entryIntegrityIssues.filter(
                        (iss) => iss.rowIndex === rIdx && iss.severity === 'error'
                      );
                      const hasRowError = rowIssues.length > 0;

                      return (
                        <tr
                          key={row.id || rIdx}
                          className={
                            hasRowError
                              ? 'bg-rose-50/40 hover:bg-rose-50/70'
                              : 'hover:bg-slate-50/70'
                          }
                        >
                          <td className="py-2 px-2.5 text-center font-bold text-slate-500">
                            {rIdx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.regNo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraftRows((prev) =>
                                  prev.map((item, i) => (i === rIdx ? { ...item, regNo: val } : item))
                                );
                              }}
                              placeholder={isCurrentExamPrimary ? 'PS0101/0001' : 'S0101/0001'}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.studentName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraftRows((prev) =>
                                  prev.map((item, i) =>
                                    i === rIdx ? { ...item, studentName: val } : item
                                  )
                                );
                              }}
                              placeholder="Jina Kamili la Mwanafunzi..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={row.gender}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraftRows((prev) =>
                                  prev.map((item, i) => (i === rIdx ? { ...item, gender: val } : item))
                                );
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                            >
                              <option value="M">M</option>
                              <option value="F">F</option>
                            </select>
                          </td>
                          {examSubjects.map((subj) => {
                            const rawVal = row.subjectMarks[subj] ?? '';
                            const parsed = parseMarkInput(rawVal, isCurrentExamPrimary);
                            const isOutOfRange = parsed.isOutOfRange;
                            const isGradeMismatch = parsed.isGradeMismatch;

                            return (
                              <td key={subj} className="py-2 px-1.5 align-top">
                                <div className="relative">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDraftRows((prev) =>
                                        prev.map((item, i) =>
                                          i === rIdx
                                            ? {
                                                ...item,
                                                subjectMarks: {
                                                  ...item.subjectMarks,
                                                  [subj]: val,
                                                },
                                              }
                                            : item
                                        )
                                      );
                                    }}
                                    placeholder="-"
                                    className={`w-full px-2 py-1.5 text-center rounded-lg border text-xs font-bold focus:outline-hidden focus:ring-2 ${
                                      isOutOfRange
                                        ? 'border-rose-600 bg-rose-100 text-rose-950 focus:ring-rose-600'
                                        : isGradeMismatch
                                        ? 'border-purple-600 bg-purple-100 text-purple-950 focus:ring-purple-600'
                                        : 'border-slate-300 text-slate-900 focus:ring-blue-500'
                                    }`}
                                  />
                                  {!parsed.isEmpty && (
                                    <div className="mt-1 flex items-center justify-center">
                                      {isOutOfRange ? (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white">
                                          ERR: 0-100!
                                        </span>
                                      ) : isGradeMismatch ? (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-700 text-white">
                                          {parsed.taggedGrade} ≠ {parsed.computedGrade}
                                        </span>
                                      ) : parsed.computedGrade ? (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                          Grade {parsed.computedGrade}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-2 px-2.5 text-center font-black text-slate-900 bg-slate-50">
                            {preview.sat > 0 ? preview.total : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-black text-blue-800 bg-slate-50">
                            {preview.sat > 0 ? `${preview.avg}%` : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-black bg-slate-50">
                            {preview.grade}
                          </td>
                          {isEntryDivisionActive && (
                            <>
                              <td className="py-2 px-2.5 text-center font-black text-amber-900 bg-amber-50/40">
                                {preview.best7 ?? '-'}
                              </td>
                              <td className="py-2 px-2.5 text-center font-black text-amber-900 bg-amber-50/40">
                                {preview.div}
                              </td>
                            </>
                          )}
                          {/* Expected Grade / Division Integrity Verifier */}
                          <td className="py-2 px-2 bg-purple-50/30">
                            <select
                              value={row.expectedGrade || 'AUTO'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraftRows((prev) =>
                                  prev.map((item, i) =>
                                    i === rIdx ? { ...item, expectedGrade: val } : item
                                  )
                                );
                              }}
                              className={`w-full px-1.5 py-1.5 rounded-lg border text-[11px] font-black ${
                                row.expectedGrade &&
                                row.expectedGrade !== 'AUTO' &&
                                ((row.expectedGrade.startsWith('DIV ') &&
                                  preview.div !== '-' &&
                                  `DIV ${preview.div}` !== row.expectedGrade) ||
                                  (!row.expectedGrade.startsWith('DIV ') &&
                                    preview.grade !== '-' &&
                                    preview.grade !== row.expectedGrade))
                                  ? 'border-purple-600 bg-purple-100 text-purple-950'
                                  : 'border-slate-300 bg-white text-slate-700'
                              }`}
                            >
                              <option value="AUTO">Auto (NECTA)</option>
                              <optgroup label="Expected Grade">
                                <option value="A">Expect Grade A</option>
                                <option value="B">Expect Grade B</option>
                                <option value="C">Expect Grade C</option>
                                <option value="D">Expect Grade D</option>
                                {isCurrentExamPrimary ? (
                                  <option value="E">Expect Grade E</option>
                                ) : (
                                  <option value="F">Expect Grade F</option>
                                )}
                              </optgroup>
                              {isEntryDivisionActive && (
                                <optgroup label="Expected Division">
                                  <option value="DIV I">Expect DIV I</option>
                                  <option value="DIV II">Expect DIV II</option>
                                  <option value="DIV III">Expect DIV III</option>
                                  <option value="DIV IV">Expect DIV IV</option>
                                  <option value="DIV 0">Expect DIV 0</option>
                                </optgroup>
                              )}
                            </select>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setDraftRows((prev) => prev.filter((_, idx) => idx !== rIdx))
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Ondoa mstari huu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddDraftRow}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Ongeza Mwanafunzi Mwingine (+ Row)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRunIntegrityCheckNow}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Run Result Integrity Check</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSchoolMarks()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {saving
                      ? 'Inahifadhi...'
                      : `Hifadhi Alama za ${activeEntrySchool.schoolName} & Kokotoa Matokeo`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: PARTICIPATING SCHOOLS & FLEXIBLE SUBJECTS CONFIGURATION
         ===================================================================== */}
      {currentExam && activeTab === 'schools' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: PARTICIPATING SCHOOLS & HEX COLOR TAGS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span>Shule Zinazoshiriki &amp; Rangi za Utambulisho (Hex Colors)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ongeza shule 2 au zaidi na chagua rangi maalum (Hex code k.m. #1E40AF, #047857) itakayotambulisha wanafunzi wa shule hiyo kwenye jedwali la pamoja na kwenye PDF.
              </p>
            </div>

            {/* ADD NEW PARTICIPATING SCHOOL FORM */}
            <form onSubmit={handleAddSchool} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-700">
                Sajili Shule Mpya Kwenye Mtihani Huu ({isCurrentExamPrimary ? 'Shule ya Msingi' : 'Shule ya Sekondari'})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Namba ya Kituo (Code)
                  </label>
                  <input
                    type="text"
                    value={newSchoolCode}
                    onChange={(e) => setNewSchoolCode(e.target.value)}
                    placeholder={isCurrentExamPrimary ? 'Mf. PS0305' : 'Mf. S0305'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Jina la Shule Inayoshiriki
                  </label>
                  <input
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder={
                      isCurrentExamPrimary
                        ? 'Mf. SHULE YA MSINGI UHURU'
                        : 'Mf. KILAKALA SECONDARY SCHOOL'
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Chagua Rangi ya Utambulisho wa Shule (Hex Color Code)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_SCHOOL_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewSchoolColor(c.hex)}
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition cursor-pointer ${
                        newSchoolColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-slate-950 scale-110 shadow-xs'
                          : 'border-white/80 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    >
                      {newSchoolColor.toLowerCase() === c.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={newSchoolColor}
                    onChange={(e) => setNewSchoolColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                    title="Chagua rangi yoyote maalum"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 px-2 py-1 bg-white rounded border border-slate-200">
                    {newSchoolColor}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeza Shule Kwenye Mtihani wa Pamoja</span>
              </button>
            </form>

            {/* LIST OF PARTICIPATING SCHOOLS */}
            <div className="space-y-2.5">
              {schools.map((sch) => (
                <div
                  key={sch.id}
                  className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-white"
                  style={{ borderLeft: `6px solid ${sch.hexColor}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="color"
                      value={sch.hexColor}
                      onChange={(e) => handleUpdateSchoolColor(sch.id, e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer shrink-0"
                      title="Badilisha rangi ya shule hii"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                          style={{ backgroundColor: sch.hexColor }}
                        >
                          {sch.schoolCode}
                        </span>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {sch.schoolName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Hex Color: {sch.hexColor}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSchool(sch.id, sch.schoolName)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Ondoa shule hii"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: EDUCATION LEVEL (PRIMARY / SECONDARY) & FLEXIBLE SUBJECTS CONFIGURATION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Ngazi ya Elimu (Primary / Secondary) &amp; Masomo ({examSubjects.length} Masomo)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chagua kama mtihani ni wa <strong>Primary (Shule ya Msingi)</strong> au{' '}
                <strong>Secondary (Shule ya Sekondari)</strong>. Kwa Secondary yenye masomo 7+ mfumo unakokotoa{' '}
                <strong>Best 7 Points &amp; Division (I–0)</strong>; kwa Primary mfumo unakokotoa{' '}
                <strong>Total, Average, Grade (A–E) &amp; Rank</strong>.
              </p>
            </div>

            {/* QUICK LEVEL & SUBJECT PRESETS */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/joint-exams/${currentExam.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      level: 'PRIMARY - PSLE',
                      className: 'Standard 7',
                      subjects: PRIMARY_NECTA_SUBJECTS,
                    }),
                  });
                  await fetchExamFull(currentExam.id);
                  await fetchExamsList();
                  showNotice('success', 'Imewekwa PRIMARY SCHOOL (Masomo 6 ya Msingi - Grade A hadi E)!');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black cursor-pointer"
              >
                Preset: Primary School (Masomo 6 ya Msingi)
              </button>

              <button
                type="button"
                onClick={async () => {
                  const twoSubj = ['BASIC MATHEMATICS', 'ENGLISH'];
                  await fetch(`/api/joint-exams/${currentExam.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subjects: twoSubj }),
                  });
                  await fetchExamFull(currentExam.id);
                  showNotice('success', 'Imewekwa Masomo 2 (Total, Average, Grade & Rank Mode)!');
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-black cursor-pointer"
              >
                Preset: Masomo 2 (Math &amp; English)
              </button>

              <button
                type="button"
                onClick={async () => {
                  const sevenSubj = [
                    'CIVICS',
                    'HISTORY',
                    'GEOGRAPHY',
                    'KISWAHILI',
                    'ENGLISH',
                    'BIOLOGY',
                    'BASIC MATHEMATICS',
                  ];
                  await fetch(`/api/joint-exams/${currentExam.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      level: 'SECONDARY - CSEE',
                      className: isCurrentExamPrimary ? 'Form 4' : currentExam.className,
                      subjects: sevenSubj,
                    }),
                  });
                  await fetchExamFull(currentExam.id);
                  await fetchExamsList();
                  showNotice('success', 'Imewekwa SECONDARY Masomo 7 (NECTA Best 7 & Division Mode)!');
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-black cursor-pointer"
              >
                Preset: Secondary Masomo 7 (NECTA Division)
              </button>

              <button
                type="button"
                onClick={async () => {
                  const nineSubj = [
                    'CIVICS',
                    'HISTORY',
                    'GEOGRAPHY',
                    'KISWAHILI',
                    'ENGLISH',
                    'BIOLOGY',
                    'BASIC MATHEMATICS',
                    'PHYSICS',
                    'CHEMISTRY',
                  ];
                  await fetch(`/api/joint-exams/${currentExam.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      level: 'SECONDARY - CSEE',
                      className: isCurrentExamPrimary ? 'Form 4' : currentExam.className,
                      subjects: nineSubj,
                    }),
                  });
                  await fetchExamFull(currentExam.id);
                  await fetchExamsList();
                  showNotice('success', 'Imewekwa SECONDARY Masomo 9 (Sayansi & Arts — Best 7 Points Mode)!');
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black cursor-pointer"
              >
                Preset: Secondary Masomo 9 (Best 7 Selection)
              </button>
            </div>

            {/* SUBJECT CHECKBOX GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STANDARD_NECTA_SUBJECTS.map((subj) => {
                const active = examSubjects.includes(subj);
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => handleToggleExamSubject(subj)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-400 text-blue-950 font-black'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{subj}</span>
                    {active && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE NEW JOINT EXAMINATION (WITH PRIMARY OR SECONDARY SELECTOR)
         ===================================================================== */}
      {showNewExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Unda Mtihani Mpya wa Pamoja (Joint Examination)
                </h2>
                <p className="text-xs text-slate-500">
                  Chagua ngazi ya elimu (Primary au Secondary), weka jina la mtihani, masomo, na shule zinazoshiriki.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewExamModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Funga (X)
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="underline font-black cursor-pointer"
                >
                  Funga
                </button>
              </div>
            )}

            <form onSubmit={handleCreateExam} className="space-y-4">
              {/* STEP 1: CHOOSE PRIMARY OR SECONDARY LEVEL */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>1. Chagua Ngazi ya Joint Exam (Primary or Secondary Level)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectModalEducationType('PRIMARY')}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-start justify-between gap-2 ${
                      newExamEducationType === 'PRIMARY'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-black uppercase block">
                        PRIMARY SCHOOL (SHULE YA MSINGI)
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Darasa la 1 – 7 (PSLE / SFNA) • Masomo ya Msingi • Grade A–E, Total, Average &amp; Rank
                      </span>
                    </div>
                    {newExamEducationType === 'PRIMARY' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectModalEducationType('SECONDARY')}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-start justify-between gap-2 ${
                      newExamEducationType === 'SECONDARY'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-black uppercase block">
                        SECONDARY SCHOOL (SHULE YA SEKONDARI)
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Form 1 – 6 (FTNA / CSEE / ACSEE) • Best 7 Subjects Points &amp; Division (I–0)
                      </span>
                    </div>
                    {newExamEducationType === 'SECONDARY' && (
                      <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Jina la Mtihani wa Pamoja
                  </label>
                  <input
                    type="text"
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tarehe</label>
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {newExamEducationType === 'PRIMARY' ? 'Darasa (Standard 1–7)' : 'Kidato (Form 1–6)'}
                  </label>
                  <select
                    value={newExamClass}
                    onChange={(e) => setNewExamClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {(newExamEducationType === 'PRIMARY' ? PRIMARY_CLASSES : SECONDARY_CLASSES).map(
                      (cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ngazi ya Mtihani ya NECTA
                  </label>
                  <select
                    value={newExamLevel}
                    onChange={(e) => setNewExamLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {newExamEducationType === 'PRIMARY' ? (
                      <>
                        <option value="PRIMARY - PSLE">PRIMARY - PSLE (Darasa la 7)</option>
                        <option value="PRIMARY - SFNA">PRIMARY - SFNA (Darasa la 4)</option>
                        <option value="PRIMARY - MOCK">PRIMARY - JOINT MOCK (Darasa la 1–7)</option>
                      </>
                    ) : (
                      <>
                        <option value="SECONDARY - FTNA">SECONDARY - FTNA (Form 2)</option>
                        <option value="SECONDARY - CSEE">SECONDARY - CSEE (Form 4)</option>
                        <option value="SECONDARY - ACSEE">SECONDARY - ACSEE (Form 6)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* SUBJECTS FOR THIS JOINT EXAM */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">
                  Masomo ya Mtihani Huu ({newExamSubjects.length} yamechaguliwa)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(newExamEducationType === 'PRIMARY' ? PRIMARY_NECTA_SUBJECTS : SECONDARY_NECTA_SUBJECTS).map(
                    (subj) => {
                      const active = newExamSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => {
                            if (active && newExamSubjects.length <= 1) return;
                            setNewExamSubjects((prev) =>
                              active ? prev.filter((s) => s !== subj) : [...prev, subj]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition cursor-pointer flex items-center gap-1 ${
                            active
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          <span>{subj}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* INITIAL PARTICIPATING SCHOOLS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">
                    Shule Zinazoshiriki na Rangi Zake (Hex Color Badges)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewExamInitialSchools((prev) => [
                        ...prev,
                        {
                          schoolCode:
                            newExamEducationType === 'PRIMARY'
                              ? `PS0${prev.length + 1}05`
                              : `S0${prev.length + 1}05`,
                          schoolName:
                            newExamEducationType === 'PRIMARY'
                              ? `SHULE YA MSINGI ${String.fromCharCode(65 + prev.length)}`
                              : `SHULE YA SEKONDARI ${String.fromCharCode(65 + prev.length)}`,
                          hexColor:
                            PRESET_SCHOOL_COLORS[prev.length % PRESET_SCHOOL_COLORS.length].hex,
                        },
                      ])
                    }
                    className="text-xs font-black text-blue-600 hover:underline cursor-pointer"
                  >
                    + Ongeza Shule Nyingine
                  </button>
                </div>

                {newExamInitialSchools.map((sch, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sch.hexColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewExamInitialSchools((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, hexColor: val } : item))
                        );
                      }}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={sch.schoolCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewExamInitialSchools((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, schoolCode: val } : item))
                        );
                      }}
                      placeholder={newExamEducationType === 'PRIMARY' ? 'Code (PS0101)' : 'Code (S0101)'}
                      className="w-28 px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold uppercase"
                    />
                    <input
                      type="text"
                      value={sch.schoolName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewExamInitialSchools((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, schoolName: val } : item))
                        );
                      }}
                      placeholder="Jina la Shule"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewExamModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>
                    {saving ? 'Inaanzisha Mtihani...' : 'Anzisha & Fungua Mtihani wa Pamoja'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================================
          MODAL: HIGH-FIDELITY PRINT PREVIEW FOR CONSOLIDATED JOINT RESULTS
         ===================================================================== */}
      {showPrintPreviewModal && currentExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col p-2 sm:p-5 overflow-y-auto">
          {/* Top Sticky Action Toolbar */}
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 shadow-2xl mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Dirisha la Kuchapisha Matokeo ya Pamoja (Print Preview - A4)
                </h3>
                <p className="text-[11px] text-slate-400">
                  {currentExam.name} • Shule {schools.length} • Watahiniwa {results.length} • {isSevenOrMoreSubjects ? 'Masomo 7+ (Division)' : 'Chini ya Masomo 7 (Bila Division)'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                title="Fungua kisanduku cha kuchapisha (Print Dialog)"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Chapisha Sasa (Print Sheet)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJointPdf}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                title="Pakua ripoti nzima kama faili la PDF la A4"
              >
                <Download className="w-4 h-4" />
                <span>Pakua PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                title="Pakua matokeo na summaries kama CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintPreviewModal(false)}
                className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition cursor-pointer"
                title="Funga dirisha hili"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Paper (A4 Style) */}
          <div
            id="joint-exam-printable-sheet"
            className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6 border border-slate-300 print:p-0 print:border-none print:shadow-none"
            style={{
              fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          >
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #joint-exam-printable-sheet, #joint-exam-printable-sheet * {
                  visibility: visible;
                }
                #joint-exam-printable-sheet {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 5mm !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
              }
            `}</style>

            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                {isCurrentExamPrimary
                  ? 'JAMHURI YA MUUNGANO WA TANZANIA • OFISI YA RAIS - TAMISEMI • SHULE ZA MSINGI'
                  : 'JAMHURI YA MUUNGANO WA TANZANIA • OFISI YA RAIS - TAMISEMI • SHULE ZA SEKONDARI'}
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                {currentExam.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-700 pt-1">
                <span>Darasa: <strong>{currentExam.className}</strong></span>
                <span>•</span>
                <span>Ngazi: <strong>{currentExam.level}</strong></span>
                <span>•</span>
                <span>Tarehe: <strong>{currentExam.examDate}</strong></span>
                <span>•</span>
                <span>Jumla ya Watahiniwa: <strong>{results.length}</strong></span>
                <span>•</span>
                <span>Shule Zinazoshiriki: <strong>{schools.length}</strong></span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {schools.map((sch) => (
                  <span
                    key={sch.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-black text-white shadow-2xs"
                    style={{ backgroundColor: sch.hexColor }}
                  >
                    <span>{sch.schoolCode}</span>
                    <span>-</span>
                    <span>{sch.schoolName}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* SECTION 1: OVERALL SUMMARY */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                {isSevenOrMoreSubjects
                  ? '1. Muhtasari wa Division kwa Shule Zote Pamoja (Overall Joint Division Summary — Masomo 7+)'
                  : '1. Muhtasari wa Matokeo & Grade kwa Shule Zote Pamoja (Chini ya Masomo 7 — Bila Division)'}
              </h2>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2 text-left">Jinsia / Kundi</th>
                      <th className="p-2 text-center">Reg</th>
                      <th className="p-2 text-center">Sat</th>
                      {isSevenOrMoreSubjects ? (
                        <>
                          <th className="p-2 text-center">Div I</th>
                          <th className="p-2 text-center">Div II</th>
                          <th className="p-2 text-center">Div III</th>
                          <th className="p-2 text-center">Div IV</th>
                          <th className="p-2 text-center">Div 0</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 text-center">Grade A</th>
                          <th className="p-2 text-center">Grade B</th>
                          <th className="p-2 text-center">Grade C</th>
                          <th className="p-2 text-center">Grade D</th>
                          <th className="p-2 text-center">Grade {isCurrentExamPrimary ? 'E' : 'F'}</th>
                        </>
                      )}
                      <th className="p-2 text-center">Waliofaulu</th>
                      <th className="p-2 text-center">Asilimia (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {isSevenOrMoreSubjects ? (
                      <>
                        <tr>
                          <td className="p-2 font-bold">Wavulana (Boys - M)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalRegistered.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalSat.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.I.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.II.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.III.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.IV.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions['0'].M}</td>
                          <td className="p-2 text-center font-bold">{overallDivisionSummary.totalPassed.M}</td>
                          <td className="p-2 text-center">
                            {overallDivisionSummary.totalSat.M > 0
                              ? ((overallDivisionSummary.totalPassed.M / overallDivisionSummary.totalSat.M) * 100).toFixed(1)
                              : '0.0'}%
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold">Wasichana (Girls - F)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalRegistered.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalSat.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.I.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.II.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.III.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.IV.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions['0'].F}</td>
                          <td className="p-2 text-center font-bold">{overallDivisionSummary.totalPassed.F}</td>
                          <td className="p-2 text-center">
                            {overallDivisionSummary.totalSat.F > 0
                              ? ((overallDivisionSummary.totalPassed.F / overallDivisionSummary.totalSat.F) * 100).toFixed(1)
                              : '0.0'}%
                          </td>
                        </tr>
                        <tr className="bg-slate-100 font-black">
                          <td className="p-2">JUMLA KUU (ALL SCHOOLS)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalRegistered.T}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalSat.T}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.I.T} ({overallDivisionSummary.divisions.I.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.II.T} ({overallDivisionSummary.divisions.II.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.III.T} ({overallDivisionSummary.divisions.III.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions.IV.T} ({overallDivisionSummary.divisions.IV.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.divisions['0'].T} ({overallDivisionSummary.divisions['0'].pct}%)</td>
                          <td className="p-2 text-center font-black">{overallDivisionSummary.totalPassed.T}</td>
                          <td className="p-2 text-center font-black">
                            {overallDivisionSummary.totalPassed.pct}% (GPA: {overallDivisionSummary.overallGpaFormatted})
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td className="p-2 font-bold">Wavulana (Boys - M)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalRegistered.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalSat.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.A.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.B.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.C.M}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.D.M}</td>
                          <td className="p-2 text-center">{isCurrentExamPrimary ? overallDivisionSummary.grades.E.M : overallDivisionSummary.grades.F.M}</td>
                          <td className="p-2 text-center font-bold">{overallDivisionSummary.totalPassed.M}</td>
                          <td className="p-2 text-center">
                            {overallDivisionSummary.totalSat.M > 0
                              ? ((overallDivisionSummary.totalPassed.M / overallDivisionSummary.totalSat.M) * 100).toFixed(1)
                              : '0.0'}%
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold">Wasichana (Girls - F)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalRegistered.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalSat.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.A.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.B.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.C.F}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.D.F}</td>
                          <td className="p-2 text-center">{isCurrentExamPrimary ? overallDivisionSummary.grades.E.F : overallDivisionSummary.grades.F.F}</td>
                          <td className="p-2 text-center font-bold">{overallDivisionSummary.totalPassed.F}</td>
                          <td className="p-2 text-center">
                            {overallDivisionSummary.totalSat.F > 0
                              ? ((overallDivisionSummary.totalPassed.F / overallDivisionSummary.totalSat.F) * 100).toFixed(1)
                              : '0.0'}%
                          </td>
                        </tr>
                        <tr className="bg-slate-100 font-black">
                          <td className="p-2">JUMLA KUU (ALL SCHOOLS)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalRegistered.T}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.totalSat.T}</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.A.T} ({overallDivisionSummary.grades.A.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.B.T} ({overallDivisionSummary.grades.B.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.C.T} ({overallDivisionSummary.grades.C.pct}%)</td>
                          <td className="p-2 text-center">{overallDivisionSummary.grades.D.T} ({overallDivisionSummary.grades.D.pct}%)</td>
                          <td className="p-2 text-center">{isCurrentExamPrimary ? overallDivisionSummary.grades.E.T : overallDivisionSummary.grades.F.T}</td>
                          <td className="p-2 text-center font-black">{overallDivisionSummary.totalPassed.T}</td>
                          <td className="p-2 text-center font-black">
                            {overallDivisionSummary.totalPassed.pct}% (GPA: {overallDivisionSummary.overallGpaFormatted})
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: SCHOOL COMPARISON */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                {isSevenOrMoreSubjects
                  ? '2. Muhtasari wa Division na G.P.A kwa Kila Shule (Division Summary Per School — Masomo 7+)'
                  : '2. Muhtasari wa Grade na G.P.A kwa Kila Shule (Chini ya Masomo 7 — Bila Division)'}
              </h2>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2 text-center">Nafasi</th>
                      <th className="p-2 text-left">Jina la Shule</th>
                      <th className="p-2 text-center">Reg</th>
                      <th className="p-2 text-center">Sat</th>
                      {isSevenOrMoreSubjects ? (
                        <>
                          <th className="p-2 text-center">Div I</th>
                          <th className="p-2 text-center">Div II</th>
                          <th className="p-2 text-center">Div III</th>
                          <th className="p-2 text-center">Div IV</th>
                          <th className="p-2 text-center">Div 0</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 text-center">A</th>
                          <th className="p-2 text-center">B</th>
                          <th className="p-2 text-center">C</th>
                          <th className="p-2 text-center">D</th>
                          <th className="p-2 text-center">{isCurrentExamPrimary ? 'E' : 'F'}</th>
                        </>
                      )}
                      <th className="p-2 text-center">Waliofaulu</th>
                      <th className="p-2 text-center">Pass %</th>
                      <th className="p-2 text-center">Wastani (%)</th>
                      <th className="p-2 text-center">G.P.A</th>
                      <th className="p-2 text-center">Daraja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {schoolComparisonStats.map((st) => {
                      const passed = isSevenOrMoreSubjects
                        ? st.divCounts.I + st.divCounts.II + st.divCounts.III + st.divCounts.IV
                        : st.gradeCounts.A + st.gradeCounts.B + st.gradeCounts.C + st.gradeCounts.D;
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-black">
                            <span
                              className="px-2 py-0.5 rounded text-white text-[10px]"
                              style={{ backgroundColor: st.hexColor }}
                            >
                              {st.schoolPosition} / {st.totalSchools}
                            </span>
                          </td>
                          <td className="p-2 font-bold flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.hexColor }} />
                            <span>{st.schoolName} ({st.schoolCode})</span>
                          </td>
                          <td className="p-2 text-center">{st.studentCount}</td>
                          <td className="p-2 text-center">{st.satCount}</td>
                          {isSevenOrMoreSubjects ? (
                            <>
                              <td className="p-2 text-center">{st.divCounts.I}</td>
                              <td className="p-2 text-center">{st.divCounts.II}</td>
                              <td className="p-2 text-center">{st.divCounts.III}</td>
                              <td className="p-2 text-center">{st.divCounts.IV}</td>
                              <td className="p-2 text-center">{st.divCounts['0']}</td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 text-center">{st.gradeCounts.A}</td>
                              <td className="p-2 text-center">{st.gradeCounts.B}</td>
                              <td className="p-2 text-center">{st.gradeCounts.C}</td>
                              <td className="p-2 text-center">{st.gradeCounts.D}</td>
                              <td className="p-2 text-center">{isCurrentExamPrimary ? st.gradeCounts.E : st.gradeCounts.F}</td>
                            </>
                          )}
                          <td className="p-2 text-center font-bold">{passed}</td>
                          <td className="p-2 text-center font-bold">{st.passRate}%</td>
                          <td className="p-2 text-center font-bold">{st.meanAvg}%</td>
                          <td className="p-2 text-center font-black text-blue-900">{st.schoolGpaFormatted}</td>
                          <td className="p-2 text-center font-bold">{st.schoolGpaGrade}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: SUBJECT GRADE DISTRIBUTION */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                3. Muhtasari wa Matokeo kwa Kila Somo (Subject Grade Distribution: A, B, C, D, {isCurrentExamPrimary ? 'E' : 'F'})
              </h2>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2 text-center">Nafasi</th>
                      <th className="p-2 text-left">Somo (Subject)</th>
                      <th className="p-2 text-center">Reg</th>
                      <th className="p-2 text-center">Sat</th>
                      <th className="p-2 text-center">GRADE A</th>
                      <th className="p-2 text-center">GRADE B</th>
                      <th className="p-2 text-center">GRADE C</th>
                      <th className="p-2 text-center">GRADE D</th>
                      <th className="p-2 text-center">GRADE {isCurrentExamPrimary ? 'E' : 'F'}</th>
                      <th className="p-2 text-center">Waliofaulu (A-D)</th>
                      <th className="p-2 text-center">Pass %</th>
                      <th className="p-2 text-center">Wastani %</th>
                      <th className="p-2 text-center">GPA</th>
                      <th className="p-2 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allSchoolsSubjectGradeSummary.map((sRow) => (
                      <tr key={sRow.subject} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-bold">{sRow.subjectPosition} / {sRow.totalSubjects}</td>
                        <td className="p-2 font-bold uppercase">{sRow.subject}</td>
                        <td className="p-2 text-center">{sRow.registeredCount}</td>
                        <td className="p-2 text-center">{sRow.satCount}</td>
                        <td className="p-2 text-center">{sRow.grades.A.T}</td>
                        <td className="p-2 text-center">{sRow.grades.B.T}</td>
                        <td className="p-2 text-center">{sRow.grades.C.T}</td>
                        <td className="p-2 text-center">{sRow.grades.D.T}</td>
                        <td className="p-2 text-center">{isCurrentExamPrimary ? sRow.grades.E.T : sRow.grades.F.T}</td>
                        <td className="p-2 text-center font-bold">{sRow.passCount}</td>
                        <td className="p-2 text-center font-bold">{sRow.passRate}%</td>
                        <td className="p-2 text-center font-bold">{sRow.meanScore}%</td>
                        <td className="p-2 text-center font-black text-blue-900">{sRow.subjectGpaFormatted}</td>
                        <td className="p-2 text-center font-bold">{sRow.subjectGrade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4: CANDIDATE RESULTS TABLE */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                4. Orodha Kamili ya Matokeo ya Wanafunzi (Combined Joint Student Ranking)
              </h2>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-1.5 text-center">OVR</th>
                      <th className="p-1.5 text-center">SCH</th>
                      <th className="p-1.5 text-left">Reg No</th>
                      <th className="p-1.5 text-left">Jina la Mwanafunzi</th>
                      <th className="p-1.5 text-center">Jinsia</th>
                      <th className="p-1.5 text-left">Shule</th>
                      {examSubjects.map((s) => (
                        <th key={s} className="p-1.5 text-center uppercase">{s.slice(0, 6)}</th>
                      ))}
                      <th className="p-1.5 text-center">Total</th>
                      <th className="p-1.5 text-center">Avg %</th>
                      <th className="p-1.5 text-center">Grade</th>
                      {isSevenOrMoreSubjects && (
                        <>
                          <th className="p-1.5 text-center">Pts</th>
                          <th className="p-1.5 text-center">Div</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedResults.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-1.5 text-center font-black">{r.overallRank}</td>
                        <td className="p-1.5 text-center font-bold text-slate-600">#{r.schoolRank}</td>
                        <td className="p-1.5 font-mono text-[10px]">{r.regNo}</td>
                        <td className="p-1.5 font-bold uppercase">{r.studentName}</td>
                        <td className="p-1.5 text-center">{r.gender}</td>
                        <td className="p-1.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black text-white shadow-2xs whitespace-nowrap"
                            style={{ backgroundColor: r.hexColor }}
                          >
                            <span>{r.schoolCode}</span>
                            <span>•</span>
                            <span>{r.schoolName}</span>
                          </span>
                        </td>
                        {examSubjects.map((s) => {
                          const mark = r.subjectMarks?.[s];
                          const grd = r.subjectGrades?.[s];
                          return (
                            <td key={s} className="p-1.5 text-center">
                              {mark !== undefined && mark !== null ? (
                                <span className="font-semibold">
                                  {mark} <span className="text-[10px] text-slate-500 font-bold">({grd})</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-1.5 text-center font-black">{r.totalMarks}</td>
                        <td className="p-1.5 text-center font-black">{r.averageScore}%</td>
                        <td className="p-1.5 text-center font-black text-blue-900">{r.overallGrade}</td>
                        {isSevenOrMoreSubjects && (
                          <>
                            <td className="p-1.5 text-center font-bold">{r.best7Points ?? '-'}</td>
                            <td className="p-1.5 text-center font-black">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px]">
                                {r.division}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs font-bold text-slate-800">
              <div>
                <p>Mratibu wa Mtihani wa Pamoja: __________________________</p>
                <p className="pt-2 text-slate-500 font-normal">Sahihi &amp; Tarehe</p>
              </div>
              <div className="text-right">
                <p>Afisa Elimu / Mwenyekiti wa Kamati: __________________________</p>
                <p className="pt-2 text-slate-500 font-normal">Sahihi &amp; Muhuri Rasmi</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
