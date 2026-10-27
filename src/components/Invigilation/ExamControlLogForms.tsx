import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  User, 
  Building, 
  Calendar, 
  Printer, 
  FileSpreadsheet, 
  X, 
  Edit3, 
  Trash2, 
  Check, 
  ArrowRightLeft, 
  BookOpen, 
  Layers, 
  Download, 
  Lock, 
  UserCheck, 
  ShieldCheck,
  Send,
  PackageCheck,
  FileCheck,
  Users
} from 'lucide-react';
import { Teacher, SchoolInfo, UserAccount, InvigilationSession } from '../../types';
import { SUBJECT_LIST, DEFAULT_CLASSES } from '../../constants/defaults';
import { saveSchoolData, getSchoolData } from '../../lib/dataService';
import { downloadFile, escapeCSV } from '../../utils/export';
import { exportExamControlReportPDF } from '../../utils/timetablePdfExport';
import { PRESET_INVIGILATION_EXAM_TITLES } from './SessionEditModal';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface ExamDispatchRecord {
  id: string;
  examName: string;
  subject: string;
  className: string;
  stream?: string;
  roomVenue: string;
  invigilatorName: string;
  invigilatorPhone?: string;
  date: string;
  sessionTime: string;
  checkoutTime: string;
  envelopesIssuedCount: number;
  issuedBy: string;
  status: 'SCHEDULED' | 'CHECKED_OUT' | 'IN_EXAM_ROOM' | 'RETURNED';
  returnTime?: string;
  scriptsReturnedCount?: number;
  receivedBy?: string;
  remarks?: string;
  updatedAt: string;
  // Timetable synchronization & interactive checkbox flags
  isTaken?: boolean;     // Amechukua Mtihani
  isReturned?: boolean;  // Amerudisha Mtihani
  timetableSessionId?: string;
  roomIndex?: number;
}

export interface ExamSettingStatusRecord {
  id: string;
  examName: string;
  term: string;
  subject: string;
  className: string;
  teacherName: string;
  deadlineDate: string;
  status: 'NOT_SET' | 'IN_PROGRESS' | 'SUBMITTED' | 'VETTED' | 'PRINTED_AND_SEALED';
  isInvolved?: boolean; // true = Anahusika kwenye utungaji, false = Hahusiki (Ameondolewa kwenye ripoti)
  vettedBy?: string;
  vettedDate?: string;
  fileRef?: string;
  remarks?: string;
  isHODOverride?: boolean; // Ruhusa ya Mkuu wa Idara (HOD) au Uongozi wa Shule
  assignedByRole?: string;
  overrideReason?: string;
  updatedAt: string;
}

export interface ExamScriptMarkingRecord {
  id: string;
  examName: string;
  subject: string;
  className: string;
  stream?: string;
  teacherName: string;
  checkoutDate: string;
  checkoutTime: string;
  scriptsCount: number;
  markingDeadline: string;
  issuedBy: string;
  status: 'CHECKED_OUT' | 'MARKING_IN_PROGRESS' | 'COMPLETED_AND_RETURNED';
  returnedDate?: string;
  returnedTime?: string;
  receivedBy?: string;
  remarks?: string;
  updatedAt: string;
}

export interface ExamReamSubjectItem {
  id: string;
  examName: string;
  className: string;
  subject: string;
  examDate?: string;
  pagesCount: number; // Idadi ya kurasa za mtihani (mf. 4 pages)
  questionsCount?: number; // Idadi ya maswali ya mtihani (mf. 10 au 14 maswali)
  customSheetsPerStudent?: number; // Idadi ya karatasi kwa mwanafunzi ikihaririwa moja kwa moja
  customStudentCount?: number; // Idadi ya wanafunzi kwa somo/kidato husika
}

export interface ExamReamConfig {
  classStudentCounts: Record<string, number>;
  printDoubleSided: boolean; // true = Pande Mbili (Kurasa 2 = Karatasi 1)
  sheetsPerReam: number; // default 500
  extraCopiesPerSubject: number; // default 0
  pricePerReam: number; // default 18000 TZS
}

// Helper: Normalize any stream-qualified class name (e.g. "Form 1A", "Form 1 - Stream B", "Form 1 (A, B)") to whole class ("Form 1")
export function normalizeWholeClassName(rawClass?: string): string {
  if (!rawClass) return 'Form 1';
  const cleaned = rawClass.trim();
  const matchForm = cleaned.match(/^(Form\s*[1-6]|Form\s*(?:VI|IV|V|III|II|I)|Kidato\s*cha\s*[1-6])/i);
  if (matchForm) {
    const token = matchForm[1].replace(/\s+/g, ' ').trim();
    const romanMap: Record<string, string> = {
      'form i': 'Form 1',
      'form ii': 'Form 2',
      'form iii': 'Form 3',
      'form iv': 'Form 4',
      'form v': 'Form 5',
      'form vi': 'Form 6'
    };
    const lower = token.toLowerCase();
    if (romanMap[lower]) return romanMap[lower];
    if (lower.startsWith('form ')) {
      return `Form ${token.split(' ')[1]}`;
    }
    return token;
  }
  // Strip trailing stream letters like " - A", " Stream A", " (All Streams)"
  return cleaned.replace(/\s*[-–•(].*$/, '').replace(/\s+[A-Z]$/, '').trim() || 'Form 1';
}

// Helper: Deduplicate setting records so each (examName, subject, wholeClass) has strictly 1 record for the whole class
export function deduplicateWholeClassSettings(records: ExamSettingStatusRecord[]): ExamSettingStatusRecord[] {
  if (!Array.isArray(records)) return [];
  const map = new Map<string, ExamSettingStatusRecord>();
  records.forEach(r => {
    const wholeClass = normalizeWholeClassName(r.className);
    const key = `${(r.examName || '').toLowerCase().trim()}__${(r.subject || '').toLowerCase().trim()}__${wholeClass.toLowerCase()}`;
    const existing = map.get(key);
    const normalizedRecord: ExamSettingStatusRecord = {
      ...r,
      className: wholeClass
    };
    if (!existing) {
      map.set(key, normalizedRecord);
    } else {
      // Keep the one with more advanced status if duplicate streams existed
      const rank: Record<ExamSettingStatusRecord['status'], number> = {
        NOT_SET: 0,
        IN_PROGRESS: 1,
        SUBMITTED: 2,
        VETTED: 3,
        PRINTED_AND_SEALED: 4
      };
      if ((rank[normalizedRecord.status] || 0) > (rank[existing.status] || 0)) {
        map.set(key, normalizedRecord);
      }
    }
  });
  return Array.from(map.values());
}

// Helper: Determine Swahili day key and label from YYYY-MM-DD or date text
export function getSwahiliDayInfo(dateStr?: string): { key: string; label: string } {
  if (!dateStr) return { key: 'UNKNOWN', label: 'Tarehe Haijawekwa' };
  const upper = dateStr.toUpperCase();
  if (upper.includes('MON') || upper.includes('JUMATATU')) return { key: 'JUMATATU', label: 'Jumatatu (Monday)' };
  if (upper.includes('TUE') || upper.includes('JUMANNE')) return { key: 'JUMANNE', label: 'Jumanne (Tuesday)' };
  if (upper.includes('WED') || upper.includes('JUMATANO')) return { key: 'JUMATANO', label: 'Jumatano (Wednesday)' };
  if (upper.includes('THU') || upper.includes('ALHAMISI')) return { key: 'ALHAMISI', label: 'Alhamisi (Thursday)' };
  if (upper.includes('FRI') || upper.includes('IJUMAA')) return { key: 'IJUMAA', label: 'Ijumaa (Friday)' };
  if (upper.includes('SAT') || upper.includes('JUMAMOSI')) return { key: 'JUMAMOSI', label: 'Jumamosi (Saturday)' };
  if (upper.includes('SUN') || upper.includes('JUMAPILI')) return { key: 'JUMAPILI', label: 'Jumapili (Sunday)' };

  const parsed = new Date(`${dateStr}T00:00:00`);
  if (!isNaN(parsed.getTime())) {
    const dayIdx = parsed.getDay(); // 0 = Sun, 1 = Mon ...
    const map: Record<number, { key: string; label: string }> = {
      1: { key: 'JUMATATU', label: 'Jumatatu (Monday)' },
      2: { key: 'JUMANNE', label: 'Jumanne (Tuesday)' },
      3: { key: 'JUMATANO', label: 'Jumatano (Wednesday)' },
      4: { key: 'ALHAMISI', label: 'Alhamisi (Thursday)' },
      5: { key: 'IJUMAA', label: 'Ijumaa (Friday)' },
      6: { key: 'JUMAMOSI', label: 'Jumamosi (Saturday)' },
      0: { key: 'JUMAPILI', label: 'Jumapili (Sunday)' }
    };
    return map[dayIdx] || { key: 'UNKNOWN', label: dateStr };
  }
  return { key: 'UNKNOWN', label: dateStr };
}

interface ExamControlLogFormsProps {
  schoolId: string;
  teachers?: Teacher[];
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  sessions?: InvigilationSession[];
  invigilationAssignments?: Record<string, number>;
  activeExamTitle?: string;
  onChangeExamTitle?: (title: string) => void;
  initialSubTab?: 'dispatch' | 'setting' | 'scripts' | 'reams';
  onOpenEnvelopeCoverForm?: () => void;
}

export const ExamControlLogForms: React.FC<ExamControlLogFormsProps> = ({
  schoolId,
  teachers = [],
  schoolInfo,
  currentUser,
  sessions = [],
  invigilationAssignments = {},
  activeExamTitle = 'Pre-National Examination 2026',
  onChangeExamTitle,
  initialSubTab = 'dispatch',
  onOpenEnvelopeCoverForm
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dispatch' | 'setting' | 'scripts' | 'reams'>(initialSubTab);
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>(activeExamTitle || 'Pre-National Examination 2026');
  const [isCustomExamTitle, setIsCustomExamTitle] = useState(false);
  const userEditedRef = useRef(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (activeExamTitle && activeExamTitle !== selectedExamFilter) {
      setSelectedExamFilter(activeExamTitle);
    }
  }, [activeExamTitle]);

  const handleExamFilterChange = (newTitle: string) => {
    setSelectedExamFilter(newTitle);
    if (onChangeExamTitle && newTitle !== 'ALL_EXAMS') {
      onChangeExamTitle(newTitle);
    }
  };

  // Datasets
  const [dispatchRecords, setDispatchRecords] = useState<ExamDispatchRecord[]>([]);
  const [settingRecords, setSettingRecords] = useState<ExamSettingStatusRecord[]>([]);
  const [scriptRecords, setScriptRecords] = useState<ExamScriptMarkingRecord[]>([]);
  const [savedSessions, setSavedSessions] = useState<InvigilationSession[]>(sessions || []);
  const [savedAssignments, setSavedAssignments] = useState<Record<string, number>>(invigilationAssignments || {});
  
  // Dispatch View Mode & Report Filter + Day-to-Day / Weekly / Full Exam Scope
  const [dispatchViewMode, setDispatchViewMode] = useState<'checklist' | 'report'>('checklist');
  const [reportFilter, setReportFilter] = useState<'ALL' | 'RETURNED' | 'PENDING'>('ALL');
  const [reportPeriodScope, setReportPeriodScope] = useState<'FULL_EXAM' | 'DAY_TO_DAY' | 'WEEKLY'>('FULL_EXAM');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('JUMATATU');
  const [selectedExamWeek, setSelectedExamWeek] = useState<'WEEK_1' | 'WEEK_2' | 'WEEK_3'>('WEEK_1');
  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState(false);

  // Exam Setting Involvement Filter & Progression Report View State
  const [settingInvolvementFilter, setSettingInvolvementFilter] = useState<'INVOLVED_ONLY' | 'EXEMPTED_ONLY' | 'ALL'>('INVOLVED_ONLY');
  const [showTeacherProgressionTable, setShowTeacherProgressionTable] = useState<boolean>(false);

  // Ream & Duplication Calculator State
  const [reamConfig, setReamConfig] = useState<ExamReamConfig>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`haby_exam_ream_config_${schoolId}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      classStudentCounts: {
        'Form 1': 200,
        'Form 2': 180,
        'Form 3': 160,
        'Form 4': 150
      },
      printDoubleSided: true, // Kurasa 2 = Karatasi 1 (mf. Kurasa 4 = Karatasi 2)
      sheetsPerReam: 500,
      extraCopiesPerSubject: 0,
      pricePerReam: 18000
    };
  });

  const [reamItems, setReamItems] = useState<ExamReamSubjectItem[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`haby_exam_ream_items_${schoolId}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });
  const [newReamClass, setNewReamClass] = useState('Form 1');
  const [newReamSubject, setNewReamSubject] = useState('Basic Mathematics');
  const [newReamPages, setNewReamPages] = useState(4);
  const [newReamQuestions, setNewReamQuestions] = useState(10);

  // Edit Ream Subject Modal State (Hariri Idadi ya Karatasi, Maswali na Idadi ya Wanafunzi)
  const [isReamEditModalOpen, setIsReamEditModalOpen] = useState(false);
  const [editingReamData, setEditingReamData] = useState<{
    id: string;
    className: string;
    subject: string;
    examDate: string;
    studentCount: number;
    applyStudentsToWholeClass: boolean;
    questionsCount: number;
    pagesCount: number;
    sheetsPerStudent: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);

  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [editingSettingId, setEditingSettingId] = useState<string | null>(null);

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  // Automated SMS Alert State (for unreturned exam papers)
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsCustomMessage, setSmsCustomMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Form States
  const [dispatchFormData, setDispatchFormData] = useState<Partial<ExamDispatchRecord>>({
    examName: 'Midterm Examination 2026',
    subject: 'Mathematics',
    className: 'Form 4',
    stream: 'A',
    roomVenue: 'Room 101',
    invigilatorName: teachers[0]?.name || '',
    date: new Date().toISOString().split('T')[0],
    sessionTime: 'SESSION I (08:00 - 11:00)',
    checkoutTime: '07:45',
    envelopesIssuedCount: 1,
    issuedBy: currentUser?.fullName || 'Exam Officer',
    status: 'CHECKED_OUT',
    returnTime: '',
    scriptsReturnedCount: 0,
    receivedBy: currentUser?.fullName || 'Exam Officer',
    remarks: ''
  });

  const [settingFormData, setSettingFormData] = useState<Partial<ExamSettingStatusRecord>>({
    examName: 'Terminal Examination 2026',
    term: 'Term 1',
    subject: 'Physics',
    className: 'Form 2',
    teacherName: teachers[0]?.name || '',
    deadlineDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'NOT_SET',
    vettedBy: '',
    vettedDate: '',
    remarks: ''
  });

  const [scriptFormData, setScriptFormData] = useState<Partial<ExamScriptMarkingRecord>>({
    examName: 'Midterm Examination 2026',
    subject: 'Biology',
    className: 'Form 3',
    stream: 'A',
    teacherName: teachers[0]?.name || '',
    checkoutDate: new Date().toISOString().split('T')[0],
    checkoutTime: '12:00',
    scriptsCount: 40,
    markingDeadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    issuedBy: currentUser?.fullName || 'Exam Officer',
    status: 'CHECKED_OUT',
    returnedDate: '',
    returnedTime: '',
    receivedBy: '',
    remarks: ''
  });

  // Load Persisted Data
  useEffect(() => {
    loadControlData();
  }, [schoolId]);

  const loadControlData = async () => {
    setIsLoading(true);
    try {
      // 1. Try local storage first for fast response
      const localDisp = localStorage.getItem(`haby_exam_dispatch_${schoolId}`);
      const localSett = localStorage.getItem(`haby_exam_setting_${schoolId}`);
      const localScrp = localStorage.getItem(`haby_exam_scripts_${schoolId}`);
      const localSess = localStorage.getItem(`haby_invigilation_sessions_${schoolId}`);
      const localAssg = localStorage.getItem(`haby_invigilation_assignments_${schoolId}`);

      const normalizeDispatchRecords = (records: any[]): ExamDispatchRecord[] => {
        if (!Array.isArray(records)) return [];
        return records.map(r => ({
          ...r,
          examName: r.examName || activeExamTitle || 'Pre-National Examination 2026',
          isTaken: typeof r.isTaken === 'boolean' ? r.isTaken : (r.status === 'RETURNED'),
          isReturned: typeof r.isReturned === 'boolean' ? r.isReturned : (r.status === 'RETURNED')
        }));
      };

      if (localDisp) {
        try {
          setDispatchRecords(normalizeDispatchRecords(JSON.parse(localDisp)));
        } catch (e) {}
      }
      if (localSett) {
        try {
          const deduped = deduplicateWholeClassSettings(JSON.parse(localSett));
          setSettingRecords(deduped);
        } catch (e) {}
      }
      if (localScrp) setScriptRecords(JSON.parse(localScrp));
      if (localSess) setSavedSessions(JSON.parse(localSess));
      if (localAssg) setSavedAssignments(JSON.parse(localAssg));

      // 2. Try school_data Cloud SQL / Firestore
      const schoolData = await getSchoolData(schoolId);
      if (schoolData && !userEditedRef.current) {
        if (Array.isArray(schoolData.examDispatchRecords) && schoolData.examDispatchRecords.length > 0 && !localDisp) {
          const normalized = normalizeDispatchRecords(schoolData.examDispatchRecords);
          setDispatchRecords(normalized);
          localStorage.setItem(`haby_exam_dispatch_${schoolId}`, JSON.stringify(normalized));
        }
        if (Array.isArray(schoolData.examSettingRecords) && schoolData.examSettingRecords.length > 0 && !localSett) {
          const deduped = deduplicateWholeClassSettings(schoolData.examSettingRecords);
          setSettingRecords(deduped);
          localStorage.setItem(`haby_exam_setting_${schoolId}`, JSON.stringify(deduped));
        }
        if (Array.isArray(schoolData.examScriptRecords) && schoolData.examScriptRecords.length > 0 && !localScrp) {
          setScriptRecords(schoolData.examScriptRecords);
          localStorage.setItem(`haby_exam_scripts_${schoolId}`, JSON.stringify(schoolData.examScriptRecords));
        }
        if (Array.isArray(schoolData.sessions) && schoolData.sessions.length > 0) {
          setSavedSessions(schoolData.sessions);
        }
        if (schoolData.invigilationAssignments) {
          setSavedAssignments(schoolData.invigilationAssignments);
        }
      }

      // 3. If dispatch records are empty but timetable sessions exist, auto-sync from timetable
      const activeSessions = (schoolData?.sessions && schoolData.sessions.length > 0) 
        ? schoolData.sessions 
        : (localSess ? JSON.parse(localSess) : sessions);
      const activeDisp = localDisp ? JSON.parse(localDisp) : (schoolData?.examDispatchRecords || []);

      if ((!activeDisp || activeDisp.length === 0) && activeSessions && activeSessions.length > 0) {
        setTimeout(() => {
          handleSyncDispatchFromTimetable(false);
        }, 150);
      }
    } catch (e) {
      console.error('Error loading exam control records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper 1: Find Scheduled Invigilator from Timetable for an exam paper (Requirement 1)
  const findScheduledInvigilator = (subject?: string, className?: string, date?: string) => {
    if (!subject || !savedSessions || savedSessions.length === 0) return null;
    const subLower = subject.toLowerCase().trim();
    const classLower = (className || '').toLowerCase().trim();

    const matchSession = savedSessions.find(s => {
      const matchSub = s.subject.toLowerCase().trim() === subLower || s.subject.toLowerCase().includes(subLower) || subLower.includes(s.subject.toLowerCase());
      const matchCls = !classLower || s.className.toLowerCase().includes(classLower) || classLower.includes(s.className.toLowerCase());
      const matchDt = !date || s.date === date || s.rawDate === date;
      return matchSub && matchCls && matchDt;
    }) || savedSessions.find(s => s.subject.toLowerCase().trim() === subLower || s.subject.toLowerCase().includes(subLower));

    if (!matchSession) return null;

    for (let r = 0; r < matchSession.rooms; r++) {
      const key = `${matchSession.id}_room${r}`;
      const tid = savedAssignments[key];
      if (tid) {
        const foundTeacher = teachers.find(t => t.id === tid);
        if (foundTeacher) {
          return {
            teacher: foundTeacher,
            session: matchSession,
            roomNumber: r + 1,
            venue: `Room ${r + 1} (${matchSession.stream || matchSession.className})`
          };
        }
      }
    }
    return null;
  };

  // Helper 2: Find Registered Teachers for a Subject & Class Level (Requirement 2)
  const getRegisteredSubjectTeachers = (subject?: string, className?: string) => {
    if (!teachers || teachers.length === 0) return [];
    if (!subject) return teachers;

    const subLower = subject.toLowerCase().trim();
    const classLower = (className || '').toLowerCase().trim();

    // Teachers whose subjects list contains this subject
    const subjectTeachers = teachers.filter(t => 
      Array.isArray(t.subjects) && t.subjects.some(s => {
        const sClean = s.toLowerCase().trim();
        return sClean === subLower || sClean.includes(subLower) || subLower.includes(sClean);
      })
    );

    // If teacher has teachingStreams configured, filter by class level
    if (classLower) {
      const classSpecific = subjectTeachers.filter(t => 
        Array.isArray(t.teachingStreams) && t.teachingStreams.some(str => str.toLowerCase().includes(classLower))
      );
      if (classSpecific.length > 0) return classSpecific;
    }

    if (subjectTeachers.length > 0) return subjectTeachers;

    // Fallback: all teachers
    return teachers;
  };

  const persistData = async (
    newDispatch?: ExamDispatchRecord[],
    newSetting?: ExamSettingStatusRecord[],
    newScript?: ExamScriptMarkingRecord[]
  ) => {
    const disp = newDispatch || dispatchRecords;
    const sett = newSetting || settingRecords;
    const scrp = newScript || scriptRecords;

    localStorage.setItem(`haby_exam_dispatch_${schoolId}`, JSON.stringify(disp));
    localStorage.setItem(`haby_exam_setting_${schoolId}`, JSON.stringify(sett));
    localStorage.setItem(`haby_exam_scripts_${schoolId}`, JSON.stringify(scrp));

    try {
      const existingData = await getSchoolData(schoolId);
      await saveSchoolData(schoolId, {
        ...existingData,
        examDispatchRecords: disp,
        examSettingRecords: sett,
        examScriptRecords: scrp
      });
    } catch (e) {
      console.warn('Error saving to backend:', e);
    }
  };

  // Pre-fill / Auto Generate Exam Setting Status Checklist from Teachers' Registered Subjects & Whole Classes (Darasa Zima)
  const handleAutoGenerateSettingTracker = () => {
    if (teachers.length === 0) {
      setAlertNotice({ type: 'error', message: 'Hakuna walimu waliosajiliwa kwa sasa.' });
      return;
    }

    const generated: ExamSettingStatusRecord[] = [];
    const targetExamName = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Pre-National Examination 2026');
    const baseCleanSettings = deduplicateWholeClassSettings(settingRecords);

    teachers.forEach(t => {
      const tSubjects = (t.subjects && t.subjects.length > 0) ? t.subjects : [];
      if (tSubjects.length === 0) return;

      // Normalize all teachingStreams to WHOLE CLASS (e.g. Form 1A, Form 1B -> Form 1)
      let tClasses: string[] = [];
      if (t.teachingStreams && t.teachingStreams.length > 0) {
        tClasses = Array.from(new Set(
          t.teachingStreams.map(str => normalizeWholeClassName(str.split('-')[0].trim()))
        ));
      } else {
        tClasses = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
      }

      tSubjects.forEach(sub => {
        tClasses.forEach(rawCls => {
          const cls = normalizeWholeClassName(rawCls);
          const id = `sett_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          // Strictly 1 exam setting per (examName, subject, wholeClass) — NOT per stream!
          const exists = baseCleanSettings.some(r => 
            r.examName.toLowerCase().trim() === targetExamName.toLowerCase().trim() &&
            r.subject.toLowerCase().trim() === sub.toLowerCase().trim() && 
            normalizeWholeClassName(r.className).toLowerCase() === cls.toLowerCase()
          ) || generated.some(r => 
            r.examName.toLowerCase().trim() === targetExamName.toLowerCase().trim() &&
            r.subject.toLowerCase().trim() === sub.toLowerCase().trim() && 
            normalizeWholeClassName(r.className).toLowerCase() === cls.toLowerCase()
          );

          if (!exists) {
            generated.push({
              id,
              examName: targetExamName,
              term: 'Term 1',
              subject: sub,
              className: cls, // Whole Class (Darasa Zima)
              teacherName: t.name,
              deadlineDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              status: 'NOT_SET',
              updatedAt: new Date().toISOString()
            });
          }
        });
      });
    });

    const nextSetting = deduplicateWholeClassSettings([...baseCleanSettings, ...generated]);
    userEditedRef.current = true;
    setSettingRecords(nextSetting);
    persistData(undefined, nextSetting, undefined);

    if (generated.length === 0) {
      setAlertNotice({ type: 'info', message: `Masomo yote kwa Darasa Zima (Kidato Kizima) kwa mtihani wa "${targetExamName}" tayari yapo kwenye orodha.` });
    } else {
      setAlertNotice({ type: 'success', message: `Orodha ya utungaji kwa Darasa Zima ("${targetExamName}") imetengenezwa (${generated.length} Masomo — Mtihani 1 kwa kila Kidato)!` });
    }
  };

  // Merge any duplicate stream setting records into Whole Class (Darasa Zima)
  const handleMergeStreamsToWholeClass = () => {
    userEditedRef.current = true;
    const merged = deduplicateWholeClassSettings(settingRecords);
    setSettingRecords(merged);
    persistData(undefined, merged, undefined);
    setAlertNotice({
      type: 'success',
      message: `✓ Utungaji wa mitihani umeunganishwa kwa Darasa Zima (Kidato Kizima)! Sasa kila somo lina mtihani mmoja tu kwa kidato husika.`
    });
  };

  // Synchronize / Auto-generate Dispatch Tracking from Scheduled Timetable (Isolated per Exam Title)
  const handleSyncDispatchFromTimetable = (forceNotice = true) => {
    const activeSessions = sessions.length > 0 ? sessions : savedSessions;
    const activeAssignments = Object.keys(invigilationAssignments).length > 0 ? invigilationAssignments : (savedAssignments || {});
    const targetExamName = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Pre-National Examination 2026');

    if (!activeSessions || activeSessions.length === 0) {
      if (forceNotice) {
        setAlertNotice({
          type: 'error',
          message: 'Hakuna vipindi vya mtihani kwenye ratiba ya usimamizi kwa sasa. Tafadhali andaa au hifadhi ratiba kwanza.'
        });
      }
      return;
    }

    let newlyCreatedCount = 0;
    const updatedDispatch: ExamDispatchRecord[] = [...dispatchRecords];

    activeSessions.forEach(sess => {
      const totalRooms = sess.rooms || 1;
      for (let r = 0; r < totalRooms; r++) {
        const roomKey = `${sess.id}_room${r}`;
        const teacherId = activeAssignments[roomKey];
        const assignedTeacher = teacherId ? teachers.find(t => t.id === teacherId) : null;
        const teacherName = assignedTeacher ? assignedTeacher.name : 'Msimamizi Hajapangiwa';
        const teacherPhone = assignedTeacher?.phone || '';

        const sessAny = sess as any;
        const recordExamName = targetExamName || sessAny.examTitle || 'Pre-National Examination 2026';
        const venueName = sessAny.venue ? `${sessAny.venue} (Chumba ${r + 1})` : `Chumba ${r + 1} (${sess.stream || sess.className})`;
        const sessDate = sess.date || sess.rawDate || new Date().toISOString().split('T')[0];
        const sessTime = sess.time || `${sess.start || '08:00'} - ${sess.end || '10:30'}`;

        // Check if a dispatch record already exists for this exact examName + slot
        const existingIdx = updatedDispatch.findIndex(d => 
          d.examName.toLowerCase().trim() === recordExamName.toLowerCase().trim() &&
          (
            (d.timetableSessionId === String(sess.id) && d.roomIndex === r) ||
            (d.subject.toLowerCase().trim() === sess.subject.toLowerCase().trim() &&
             d.className.toLowerCase().trim() === sess.className.toLowerCase().trim() &&
             d.date === sessDate &&
             (d.roomVenue === venueName || totalRooms === 1))
          )
        );

        if (existingIdx >= 0) {
          // Update details from timetable WITHOUT locking or forcing isTaken/isReturned
          const curr = updatedDispatch[existingIdx];
          updatedDispatch[existingIdx] = {
            ...curr,
            timetableSessionId: String(sess.id),
            roomIndex: r,
            invigilatorName: assignedTeacher ? assignedTeacher.name : curr.invigilatorName,
            invigilatorPhone: teacherPhone || curr.invigilatorPhone,
            roomVenue: venueName,
            date: sessDate,
            sessionTime: `${sess.session || 'SESSION'} (${sessTime})`,
            examName: recordExamName,
            isTaken: Boolean(curr.isTaken),
            isReturned: Boolean(curr.isReturned),
            updatedAt: new Date().toISOString()
          };
        } else {
          // Create new record from timetable session (unlocked: isTaken=false, isReturned=false)
          newlyCreatedCount++;
          updatedDispatch.push({
            id: `disp_tt_${sess.id}_r${r}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            examName: recordExamName,
            subject: sess.subject,
            className: sess.className,
            stream: sess.stream || '',
            roomVenue: venueName,
            invigilatorName: teacherName,
            invigilatorPhone: teacherPhone,
            date: sessDate,
            sessionTime: `${sess.session || 'SESSION'} (${sessTime})`,
            checkoutTime: sessTime.split('-')[0].trim() || '08:00',
            envelopesIssuedCount: 1,
            issuedBy: currentUser?.fullName || 'Exam Officer',
            status: 'SCHEDULED',
            isTaken: false,
            isReturned: false,
            returnTime: '',
            scriptsReturnedCount: 0,
            receivedBy: '',
            timetableSessionId: String(sess.id),
            roomIndex: r,
            remarks: '',
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    userEditedRef.current = true;
    setDispatchRecords(updatedDispatch);
    persistData(updatedDispatch, undefined, undefined);

    if (forceNotice) {
      setAlertNotice({
        type: 'success',
        message: `Fomu ya ufuatiliaji wa "${targetExamName}" imesawazishwa na ratiba ya usimamizi! (${newlyCreatedCount} vipindi vipya vimeongezwa).`
      });
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS FOR DISPATCH FORM & INTERACTIVE TICKING
  // ---------------------------------------------------------------------------
  const handleOpenDispatchAdd = () => {
    const defaultExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Pre-National Examination 2026');
    setEditingDispatchId(null);
    setDispatchFormData({
      examName: defaultExam,
      subject: 'Mathematics',
      className: 'Form 4',
      stream: 'A',
      roomVenue: 'Room 101',
      invigilatorName: teachers[0]?.name || '',
      date: new Date().toISOString().split('T')[0],
      sessionTime: 'SESSION I (08:00 - 11:00)',
      checkoutTime: new Date().toTimeString().substring(0, 5),
      envelopesIssuedCount: 1,
      issuedBy: currentUser?.fullName || 'Exam Officer',
      status: 'SCHEDULED',
      isTaken: false,
      isReturned: false,
      returnTime: '',
      scriptsReturnedCount: 0,
      receivedBy: currentUser?.fullName || 'Exam Officer',
      remarks: ''
    });
    setIsDispatchModalOpen(true);
  };

  const handleSaveDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchFormData.examName || !dispatchFormData.subject || !dispatchFormData.invigilatorName) {
      setAlertNotice({ type: 'error', message: 'Tafadhali jaza taarifa zote muhimu za mtihani na msimamizi.' });
      return;
    }

    userEditedRef.current = true;
    let updatedList: ExamDispatchRecord[];
    if (editingDispatchId) {
      updatedList = dispatchRecords.map(r => r.id === editingDispatchId ? {
        ...(r as ExamDispatchRecord),
        ...(dispatchFormData as ExamDispatchRecord),
        isTaken: typeof dispatchFormData.isTaken === 'boolean' ? dispatchFormData.isTaken : (dispatchFormData.status === 'RETURNED'),
        isReturned: typeof dispatchFormData.isReturned === 'boolean' ? dispatchFormData.isReturned : (dispatchFormData.status === 'RETURNED'),
        updatedAt: new Date().toISOString()
      } : r);
      setAlertNotice({ type: 'success', message: 'Taarifa za kuchukua/kurudisha mtihani zimehifadhiwa kikamilifu!' });
    } else {
      const newRec: ExamDispatchRecord = {
        id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...(dispatchFormData as ExamDispatchRecord),
        isTaken: typeof dispatchFormData.isTaken === 'boolean' ? dispatchFormData.isTaken : false,
        isReturned: typeof dispatchFormData.isReturned === 'boolean' ? dispatchFormData.isReturned : false,
        status: (dispatchFormData.isReturned ? 'RETURNED' : dispatchFormData.isTaken ? 'CHECKED_OUT' : 'SCHEDULED') as ExamDispatchRecord['status'],
        updatedAt: new Date().toISOString()
      };
      updatedList = [newRec, ...dispatchRecords];
      setAlertNotice({ type: 'success', message: 'Mtihani umeandikishwa kwenye fomu ya udhibiti!' });
    }

    setDispatchRecords(updatedList);
    persistData(updatedList, undefined, undefined);
    setIsDispatchModalOpen(false);
  };

  // Interactive Tick 1: Amechukua Mtihani (Taken / Dispatched to room) — 100% Unlocked
  const handleToggleAmechukua = (rec: ExamDispatchRecord) => {
    userEditedRef.current = true;
    const nextTaken = !Boolean(rec.isTaken);
    const curTime = new Date().toTimeString().substring(0, 5);
    const nextReturned = nextTaken ? Boolean(rec.isReturned) : false;

    setDispatchRecords(prev => {
      const updated = prev.map(r => r.id === rec.id ? {
        ...r,
        isTaken: nextTaken,
        isReturned: nextReturned,
        status: (nextReturned ? 'RETURNED' : nextTaken ? 'CHECKED_OUT' : 'SCHEDULED') as ExamDispatchRecord['status'],
        checkoutTime: nextTaken ? (r.checkoutTime || curTime) : '',
        returnTime: nextReturned ? r.returnTime : '',
        updatedAt: new Date().toISOString()
      } : r);
      persistData(updated, undefined, undefined);
      return updated;
    });

    setAlertNotice({
      type: nextTaken ? 'success' : 'info',
      message: nextTaken 
        ? `✓ Mwalimu ${rec.invigilatorName} amethibitishwa Kuchukua mtihani wa ${rec.subject} (${rec.className}) — [${rec.examName}]!`
        : `Uthibitisho wa kuchukua mtihani wa ${rec.subject} umeondolewa.`
    });
  };

  // Interactive Tick 2: Amerudisha Mtihani (Returned / Handed Over) — 100% Unlocked
  const handleToggleAmerudisha = (rec: ExamDispatchRecord) => {
    userEditedRef.current = true;
    const nextReturned = !Boolean(rec.isReturned);
    const curTime = new Date().toTimeString().substring(0, 5);

    setDispatchRecords(prev => {
      const updated = prev.map(r => r.id === rec.id ? {
        ...r,
        isReturned: nextReturned,
        isTaken: nextReturned ? true : Boolean(r.isTaken),
        status: (nextReturned ? 'RETURNED' : r.isTaken ? 'CHECKED_OUT' : 'SCHEDULED') as ExamDispatchRecord['status'],
        returnTime: nextReturned ? (r.returnTime || curTime) : '',
        scriptsReturnedCount: nextReturned ? (r.scriptsReturnedCount || 40) : 0,
        receivedBy: nextReturned ? (r.receivedBy || currentUser?.fullName || 'Exam Officer') : '',
        updatedAt: new Date().toISOString()
      } : r);
      persistData(updated, undefined, undefined);
      return updated;
    });

    setAlertNotice({
      type: nextReturned ? 'success' : 'info',
      message: nextReturned 
        ? `✓ Mwalimu ${rec.invigilatorName} amethibitishwa Kurudisha mtihani wa ${rec.subject} (${rec.className}) — [${rec.examName}]!`
        : `Uthibitisho wa kurudisha mtihani wa ${rec.subject} umeondolewa.`
    });
  };

  // Bulk Unlock / Reset Ticks for Active Exam
  const handleResetAllTicksForExam = () => {
    const targetExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : activeExamTitle;
    userEditedRef.current = true;
    setDispatchRecords(prev => {
      const updated = prev.map(r => {
        if (selectedExamFilter === 'ALL_EXAMS' || r.examName.toLowerCase().trim() === targetExam.toLowerCase().trim()) {
          return {
            ...r,
            isTaken: false,
            isReturned: false,
            status: 'SCHEDULED' as ExamDispatchRecord['status'],
            returnTime: '',
            scriptsReturnedCount: 0,
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });
      persistData(updated, undefined, undefined);
      return updated;
    });
    setAlertNotice({
      type: 'info',
      message: `✓ Ticks zote za kuchukua na kurudisha kwa mtihani wa "${targetExam}" zimewekwa upya na kufunguliwa (unlocked)!`
    });
  };

  const handleToggleDispatchReturn = (rec: ExamDispatchRecord) => {
    handleToggleAmerudisha(rec);
  };

  const handleDeleteDispatch = (id: string) => {
    if (!window.confirm('Una uhakika unataka kufuta kumbukumbu hii ya mtihani?')) return;
    const updated = dispatchRecords.filter(r => r.id !== id);
    setDispatchRecords(updated);
    persistData(updated, undefined, undefined);
    setAlertNotice({ type: 'info', message: 'Kumbukumbu imefutwa.' });
  };

  // Automated SMS alerts for pending exam paper returns (Requirement 1)
  const handleOpenSmsAlertModal = () => {
    if (pendingList.length === 0) {
      setAlertNotice({ type: 'info', message: 'Hakuna waalimu wanaodaiwa kurudisha mitihani kwa sasa.' });
      return;
    }

    const defaultMsg = `Ndugu Mwalimu Msimamizi, unakumbushwa kurudisha bahasha na scripts za mtihani Idara ya Mitihani/Taaluma mara baada ya kipindi kumalizika. Tafadhali hakikisha umekabidhi na kusaini fomu ya udhibiti. Asante. - ${schoolInfo?.name || 'HABY EDU PRO'}`;
    setSmsCustomMessage(defaultMsg);
    setIsSmsModalOpen(true);
  };

  const handleSendSmsAlerts = async () => {
    if (pendingList.length === 0) return;
    setIsSendingSms(true);

    try {
      const recipients = pendingList.map(item => {
        const foundTch = teachers.find(t => 
          (item.invigilatorName && t.name.toLowerCase().trim() === item.invigilatorName.toLowerCase().trim()) ||
          (item.invigilatorPhone && t.phone && t.phone.trim() === item.invigilatorPhone.trim())
        );
        const phone = item.invigilatorPhone || foundTch?.phone || '';
        return {
          teacherName: item.invigilatorName,
          phone,
          subject: item.subject,
          className: item.className,
          roomVenue: item.roomVenue
        };
      }).filter(r => Boolean(r.phone));

      if (recipients.length === 0) {
        setAlertNotice({
          type: 'error',
          message: 'Waalimu walio na mitihani inayosubiriwa hawana namba za simu kwenye wasifu wao. Tafadhali sasisha namba zao kwanza.'
        });
        setIsSendingSms(false);
        setIsSmsModalOpen(false);
        return;
      }

      const payloadRecipients = recipients.map(r => ({
        student_cno: 'STAFF',
        student_name: r.teacherName,
        phone_255: r.phone,
        phone: r.phone
      }));

      const response = await fetch('/api/sms/send-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          schoolName: schoolInfo.name || 'HABY EDU PRO',
          target: 'Waalimu Wasimamizi wa Mitihani',
          message: smsCustomMessage,
          recipients: payloadRecipients
        })
      });

      const result = await response.json().catch(() => ({}));
      const sentCount = result.sentCount || recipients.length;

      setAlertNotice({
        type: 'success',
        message: `📱 Ujumbe wa SMS ya kikumbusho umetumwa kwa walimu ${sentCount} wanaoshikilia mitihani!`
      });
      setIsSmsModalOpen(false);
    } catch (e: any) {
      console.warn('SMS dispatch error:', e);
      setAlertNotice({
        type: 'info',
        message: 'Kikumbusho cha SMS kimesajiliwa kwenye kumbukumbu za mfumo wa SMS.'
      });
      setIsSmsModalOpen(false);
    } finally {
      setIsSendingSms(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS FOR SETTING FORM (ENFORCING TEACHER SUBJECTS & CLASSES)
  // ---------------------------------------------------------------------------
  const handleOpenSettingAdd = () => {
    const defaultExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Pre-National Examination 2026');
    setEditingSettingId(null);
    setSettingFormData({
      examName: defaultExam,
      term: 'Term 1',
      subject: 'Physics',
      className: 'Form 2',
      teacherName: teachers[0]?.name || '',
      deadlineDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'NOT_SET',
      isInvolved: true,
      vettedBy: '',
      vettedDate: '',
      remarks: '',
      isHODOverride: false,
      assignedByRole: 'Head of Department (HOD)'
    });
    setIsSettingModalOpen(true);
  };

  const handleSaveSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingFormData.subject || !settingFormData.teacherName) {
      setAlertNotice({ type: 'error', message: 'Tafadhali chagua somo na mwalimu anayetunga mtihani.' });
      return;
    }

    // Teacher registration validation: check registered subjects & classes
    const selectedTeacherObj = teachers.find(t => t.name === settingFormData.teacherName);
    if (selectedTeacherObj) {
      const regSubs = selectedTeacherObj.subjects || [];
      const teachesSub = !settingFormData.subject || regSubs.length === 0 || regSubs.some(s => {
        const sClean = s.toLowerCase().trim();
        const fClean = (settingFormData.subject || '').toLowerCase().trim();
        return sClean === fClean || sClean.includes(fClean) || fClean.includes(sClean);
      });

      const teacherClasses = Array.from(new Set(
        (selectedTeacherObj.teachingStreams || []).map(str => str.split('-')[0].trim().toLowerCase())
      ));
      const targetClassLower = (settingFormData.className || '').toLowerCase().trim();
      const teachesCls = teacherClasses.length === 0 || teacherClasses.some(c => c.includes(targetClassLower) || targetClassLower.includes(c));

      if ((!teachesSub || !teachesCls) && !settingFormData.isHODOverride) {
        setAlertNotice({
          type: 'error',
          message: `Mwalimu ${selectedTeacherObj.name} hajasajiliwa kufundisha somo la ${settingFormData.subject} kwa darasa la ${settingFormData.className}. Huwezi kumpa utungaji huu bila Uteuzi Maalumu wa Mkuu wa Idara (HOD) au Uongozi wa Shule (Weka alama ya Uteuzi Maalumu kuruhusu).`
        });
        return;
      }
    }

    const wholeClass = normalizeWholeClassName(settingFormData.className);
    const normalizedPayload: ExamSettingStatusRecord = {
      ...(settingFormData as ExamSettingStatusRecord),
      className: wholeClass,
      updatedAt: new Date().toISOString()
    };

    let updatedList: ExamSettingStatusRecord[];
    if (editingSettingId) {
      updatedList = deduplicateWholeClassSettings(
        settingRecords.map(r => r.id === editingSettingId ? {
          ...(r as ExamSettingStatusRecord),
          ...normalizedPayload
        } : r)
      );
      setAlertNotice({ type: 'success', message: `Hali ya utungaji wa mtihani wa ${normalizedPayload.subject} kwa ${wholeClass} (Darasa Zima) imehifadhiwa!` });
    } else {
      const existingSameClassIdx = settingRecords.findIndex(r =>
        r.examName.toLowerCase().trim() === (normalizedPayload.examName || '').toLowerCase().trim() &&
        r.subject.toLowerCase().trim() === (normalizedPayload.subject || '').toLowerCase().trim() &&
        normalizeWholeClassName(r.className).toLowerCase() === wholeClass.toLowerCase()
      );
      if (existingSameClassIdx >= 0) {
        updatedList = settingRecords.map((r, i) => i === existingSameClassIdx ? {
          ...r,
          ...normalizedPayload
        } : r);
        setAlertNotice({ type: 'success', message: `Mtihani wa ${normalizedPayload.subject} kwa ${wholeClass} (Darasa Zima) umesasishwa (Mtihani 1 kwa Kidato Kizima)!` });
      } else {
        const newRec: ExamSettingStatusRecord = {
          id: `sett_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...normalizedPayload
        };
        updatedList = [newRec, ...settingRecords];
        setAlertNotice({ type: 'success', message: `Utungaji wa somo la ${normalizedPayload.subject} kwa ${wholeClass} (Darasa Zima) umeongezwa!` });
      }
    }

    setSettingRecords(updatedList);
    persistData(undefined, updatedList, undefined);
    setIsSettingModalOpen(false);
  };

  const handleCycleSettingStatus = (rec: ExamSettingStatusRecord) => {
    const sequence: ExamSettingStatusRecord['status'][] = [
      'NOT_SET', 
      'IN_PROGRESS', 
      'SUBMITTED', 
      'VETTED', 
      'PRINTED_AND_SEALED'
    ];
    const curIdx = sequence.indexOf(rec.status);
    const nextStatus = sequence[(curIdx + 1) % sequence.length];

    const updated = settingRecords.map(r => r.id === rec.id ? {
      ...r,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    } : r);

    setSettingRecords(updated);
    persistData(undefined, updated, undefined);
    setAlertNotice({ type: 'info', message: `Hali ya utungaji wa ${rec.subject} (${rec.className}) imebadilishwa kuwa ${nextStatus}.` });
  };

  // Toggle whether a teacher/subject is involved in exam setting (Anahusika vs Hahusiki)
  // If marked Hahusiki (isInvolved: false), they are excluded from the active report and progression metrics
  const handleToggleSettingInvolvement = (rec: ExamSettingStatusRecord) => {
    userEditedRef.current = true;
    const currentlyInvolved = rec.isInvolved !== false;
    const nextInvolved = !currentlyInvolved;

    const updated = settingRecords.map(r =>
      r.id === rec.id
        ? {
            ...r,
            isInvolved: nextInvolved,
            updatedAt: new Date().toISOString()
          }
        : r
    );

    setSettingRecords(updated);
    persistData(undefined, updated, undefined);
    setAlertNotice({
      type: nextInvolved ? 'success' : 'info',
      message: nextInvolved
        ? `✓ Mwalimu ${rec.teacherName} (${rec.subject} — ${rec.className}) amerudishwa kwenye orodha ya Wanaohusika na Utungaji wa Mitihani!`
        : `🚫 Mwalimu ${rec.teacherName} (${rec.subject} — ${rec.className}) amewekwa "Hahusiki kwenye Utungaji" na ameondolewa kwenye Ripoti ya Utungaji!`
    });
  };

  const handleDeleteSetting = (id: string) => {
    if (!window.confirm('Una uhakika unataka kufuta taarifa hii ya utungaji?')) return;
    const updated = settingRecords.filter(r => r.id !== id);
    setSettingRecords(updated);
    persistData(undefined, updated, undefined);
  };

  // ---------------------------------------------------------------------------
  // HANDLERS FOR SCRIPT MARKING FORM
  // ---------------------------------------------------------------------------
  const handleOpenScriptAdd = () => {
    const defaultExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Pre-National Examination 2026');
    setEditingScriptId(null);
    setScriptFormData({
      examName: defaultExam,
      subject: 'Biology',
      className: 'Form 3',
      stream: 'A',
      teacherName: teachers[0]?.name || '',
      checkoutDate: new Date().toISOString().split('T')[0],
      checkoutTime: new Date().toTimeString().substring(0, 5),
      scriptsCount: 40,
      markingDeadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      issuedBy: currentUser?.fullName || 'Exam Officer',
      status: 'CHECKED_OUT',
      returnedDate: '',
      returnedTime: '',
      receivedBy: '',
      remarks: ''
    });
    setIsScriptModalOpen(true);
  };

  const handleSaveScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptFormData.subject || !scriptFormData.teacherName) {
      setAlertNotice({ type: 'error', message: 'Tafadhali chagua somo na mwalimu anayechukua script.' });
      return;
    }

    let updatedList: ExamScriptMarkingRecord[];
    if (editingScriptId) {
      updatedList = scriptRecords.map(r => r.id === editingScriptId ? {
        ...(r as ExamScriptMarkingRecord),
        ...(scriptFormData as ExamScriptMarkingRecord),
        updatedAt: new Date().toISOString()
      } : r);
      setAlertNotice({ type: 'success', message: 'Taarifa za kutoa/kurudisha script zimehifadhiwa!' });
    } else {
      const newRec: ExamScriptMarkingRecord = {
        id: `scrp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...(scriptFormData as ExamScriptMarkingRecord),
        updatedAt: new Date().toISOString()
      };
      updatedList = [newRec, ...scriptRecords];
      setAlertNotice({ type: 'success', message: 'Makabidhiano ya script zilizochukuliwa na mwalimu yamesajiliwa!' });
    }

    setScriptRecords(updatedList);
    persistData(undefined, undefined, updatedList);
    setIsScriptModalOpen(false);
  };

  const handleToggleScriptReturned = (rec: ExamScriptMarkingRecord) => {
    const isDone = rec.status === 'COMPLETED_AND_RETURNED';
    const nextStatus = isDone ? 'CHECKED_OUT' : 'COMPLETED_AND_RETURNED';
    const curDate = new Date().toISOString().split('T')[0];
    const curTime = new Date().toTimeString().substring(0, 5);

    const updated = scriptRecords.map(r => r.id === rec.id ? {
      ...r,
      status: nextStatus as any,
      returnedDate: nextStatus === 'COMPLETED_AND_RETURNED' ? curDate : '',
      returnedTime: nextStatus === 'COMPLETED_AND_RETURNED' ? curTime : '',
      receivedBy: nextStatus === 'COMPLETED_AND_RETURNED' ? (currentUser?.fullName || 'Exam Officer') : '',
      updatedAt: new Date().toISOString()
    } : r);

    setScriptRecords(updated);
    persistData(undefined, undefined, updated);
    setAlertNotice({
      type: 'success',
      message: nextStatus === 'COMPLETED_AND_RETURNED'
        ? `Script za ${rec.subject} (${rec.className}) zimekamilika kusahihishwa na kurudishwa idara ya mitihani!`
        : `Hali ya script zimerudishwa kwenye Zinasahihishwa.`
    });
  };

  const handleDeleteScript = (id: string) => {
    if (!window.confirm('Una uhakika unataka kufuta kumbukumbu hii ya script?')) return;
    const updated = scriptRecords.filter(r => r.id !== id);
    setScriptRecords(updated);
    persistData(undefined, undefined, updated);
  };

  // ---------------------------------------------------------------------------
  // FILTERED DATASETS (STRICTLY ISOLATED BY SELECTED EXAM TITLE & PERIOD SCOPE)
  // ---------------------------------------------------------------------------
  const allKnownExamTitles = useMemo(() => {
    const set = new Set<string>(PRESET_INVIGILATION_EXAM_TITLES as unknown as string[]);
    if (activeExamTitle) set.add(activeExamTitle);
    if (selectedExamFilter && selectedExamFilter !== 'ALL_EXAMS') set.add(selectedExamFilter);
    dispatchRecords.forEach(r => { if (r.examName) set.add(r.examName); });
    settingRecords.forEach(r => { if (r.examName) set.add(r.examName); });
    scriptRecords.forEach(r => { if (r.examName) set.add(r.examName); });
    reamItems.forEach(r => { if (r.examName) set.add(r.examName); });
    return Array.from(set);
  }, [activeExamTitle, selectedExamFilter, dispatchRecords, settingRecords, scriptRecords, reamItems]);

  // Unique sorted dates for the selected exam (used for Day-to-Day & Weekly grouping)
  const examUniqueDates = useMemo(() => {
    const dates = new Set<string>();
    dispatchRecords.forEach(r => {
      const matchExam = selectedExamFilter === 'ALL_EXAMS' || r.examName.toLowerCase().trim() === selectedExamFilter.toLowerCase().trim();
      if (matchExam && r.date) dates.add(r.date);
    });
    return Array.from(dates).sort();
  }, [dispatchRecords, selectedExamFilter]);

  // Helper to check if a record's date belongs to WEEK_1, WEEK_2, or WEEK_3 of the exam
  const getExamWeekForDate = (dateStr?: string): 'WEEK_1' | 'WEEK_2' | 'WEEK_3' => {
    if (!dateStr || examUniqueDates.length === 0) return 'WEEK_1';
    const firstDateStr = examUniqueDates[0];
    const d0 = new Date(`${firstDateStr}T00:00:00`);
    const dCurr = new Date(`${dateStr}T00:00:00`);
    if (!isNaN(d0.getTime()) && !isNaN(dCurr.getTime())) {
      const diffDays = Math.floor((dCurr.getTime() - d0.getTime()) / 86400000);
      if (diffDays < 7) return 'WEEK_1';
      if (diffDays < 14) return 'WEEK_2';
      return 'WEEK_3';
    }
    const idx = examUniqueDates.indexOf(dateStr);
    if (idx < 5) return 'WEEK_1';
    if (idx < 10) return 'WEEK_2';
    return 'WEEK_3';
  };

  // Human-readable label for the active Report Period Scope
  const activePeriodScopeLabel = useMemo(() => {
    if (reportPeriodScope === 'DAY_TO_DAY') {
      if (dateFilter) {
        const dayInfo = getSwahiliDayInfo(dateFilter);
        return `RIPOTI YA SIKU: ${dayInfo.label.toUpperCase()} (${dateFilter})`;
      }
      const dayLabels: Record<string, string> = {
        JUMATATU: 'Jumatatu (Monday)',
        JUMANNE: 'Jumanne (Tuesday)',
        JUMATANO: 'Jumatano (Wednesday)',
        ALHAMISI: 'Alhamisi (Thursday)',
        IJUMAA: 'Ijumaa (Friday)',
        JUMAMOSI: 'Jumamosi (Saturday)',
        ALL_DAYS: 'Siku Zote'
      };
      return `RIPOTI YA SIKU KWA SIKU: ${(dayLabels[selectedDayOfWeek] || selectedDayOfWeek).toUpperCase()}`;
    }
    if (reportPeriodScope === 'WEEKLY') {
      if (selectedExamWeek === 'WEEK_1') return 'RIPOTI YA WIKI YA KWANZA YA MTIHANI (WEEK 1)';
      if (selectedExamWeek === 'WEEK_2') return 'RIPOTI YA WIKI YA PILI YA MTIHANI (WEEK 2)';
      return 'RIPOTI YA WIKI YA TATU YA MTIHANI (WEEK 3)';
    }
    return 'RIPOTI YA MTIHANI MZIMA (FULL EXAM REPORT)';
  }, [reportPeriodScope, selectedDayOfWeek, selectedExamWeek, dateFilter]);

  const filteredDispatch = useMemo(() => {
    return dispatchRecords.filter(r => {
      const matchExam = selectedExamFilter === 'ALL_EXAMS' || r.examName.toLowerCase().trim() === selectedExamFilter.toLowerCase().trim();
      const matchSearch = !searchQuery || 
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.invigilatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.roomVenue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.examName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter === 'ALL' || normalizeWholeClassName(r.className) === normalizeWholeClassName(classFilter) || r.className === classFilter;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchDate = !dateFilter || r.date === dateFilter;

      // Day-to-Day or Weekly Period Scope Filter
      let matchPeriodScope = true;
      if (reportPeriodScope === 'DAY_TO_DAY') {
        if (dateFilter) {
          matchPeriodScope = r.date === dateFilter;
        } else if (selectedDayOfWeek !== 'ALL_DAYS') {
          const dayInfo = getSwahiliDayInfo(r.date);
          matchPeriodScope = dayInfo.key === selectedDayOfWeek;
        }
      } else if (reportPeriodScope === 'WEEKLY') {
        matchPeriodScope = getExamWeekForDate(r.date) === selectedExamWeek;
      }

      return matchExam && matchSearch && matchClass && matchStatus && matchDate && matchPeriodScope;
    });
  }, [dispatchRecords, selectedExamFilter, searchQuery, classFilter, statusFilter, dateFilter, reportPeriodScope, selectedDayOfWeek, selectedExamWeek, examUniqueDates]);

  // Automated Reconciliation Lists: Nani Karudisha vs Nani Hajarudisha (Requirement 1)
  const returnedList = useMemo(() => {
    return filteredDispatch.filter(r => r.status === 'RETURNED' || r.isReturned);
  }, [filteredDispatch]);

  const pendingList = useMemo(() => {
    return filteredDispatch.filter(r => r.status !== 'RETURNED' && !r.isReturned);
  }, [filteredDispatch]);

  const displayedReportList = useMemo(() => {
    if (reportFilter === 'RETURNED') return returnedList;
    if (reportFilter === 'PENDING') return pendingList;
    return filteredDispatch;
  }, [reportFilter, returnedList, pendingList, filteredDispatch]);

  // Base setting records matching exam, search, class, and status (before involvement filter)
  const examMatchedSetting = useMemo(() => {
    return settingRecords.filter(r => {
      const matchExam = selectedExamFilter === 'ALL_EXAMS' || r.examName.toLowerCase().trim() === selectedExamFilter.toLowerCase().trim();
      const matchSearch = !searchQuery || 
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.examName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter === 'ALL' || normalizeWholeClassName(r.className) === normalizeWholeClassName(classFilter);
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchExam && matchSearch && matchClass && matchStatus;
    });
  }, [settingRecords, selectedExamFilter, searchQuery, classFilter, statusFilter]);

  // Strictly Involved records (Wanaohusika Tu na Utungaji) — used for Reports, Progression & Exports
  const activeInvolvedSetting = useMemo(() => {
    return examMatchedSetting.filter(r => r.isInvolved !== false);
  }, [examMatchedSetting]);

  // Exempted / Non-involved records (Wasiohusika / Waliotolewa kwenye Ripoti)
  const exemptedSetting = useMemo(() => {
    return examMatchedSetting.filter(r => r.isInvolved === false);
  }, [examMatchedSetting]);

  // Displayed table rows based on settingInvolvementFilter
  const filteredSetting = useMemo(() => {
    if (settingInvolvementFilter === 'INVOLVED_ONLY') return activeInvolvedSetting;
    if (settingInvolvementFilter === 'EXEMPTED_ONLY') return exemptedSetting;
    return examMatchedSetting;
  }, [settingInvolvementFilter, activeInvolvedSetting, exemptedSetting, examMatchedSetting]);

  // Exam Setting Progression Report Metrics (Calculated strictly from Wanaohusika Tu)
  const settingProgressionStats = useMemo(() => {
    const totalInvolved = activeInvolvedSetting.length;
    const exemptedCount = exemptedSetting.length;

    const notSetCount = activeInvolvedSetting.filter(r => r.status === 'NOT_SET').length;
    const inProgressCount = activeInvolvedSetting.filter(r => r.status === 'IN_PROGRESS').length;
    const submittedCount = activeInvolvedSetting.filter(r => r.status === 'SUBMITTED').length;
    const vettedCount = activeInvolvedSetting.filter(r => r.status === 'VETTED').length;
    const printedCount = activeInvolvedSetting.filter(r => r.status === 'PRINTED_AND_SEALED').length;

    // Completed/Submitted = SUBMITTED + VETTED + PRINTED_AND_SEALED
    const completedCount = submittedCount + vettedCount + printedCount;
    const pendingCount = notSetCount + inProgressCount;

    const completionRate = totalInvolved > 0 ? Math.round((completedCount / totalInvolved) * 100) : 0;

    // Weighted progression across stages: NOT_SET=0, IN_PROGRESS=40, SUBMITTED=80, VETTED=90, PRINTED=100
    const weightMap: Record<ExamSettingStatusRecord['status'], number> = {
      NOT_SET: 0,
      IN_PROGRESS: 40,
      SUBMITTED: 80,
      VETTED: 90,
      PRINTED_AND_SEALED: 100
    };
    const totalPoints = activeInvolvedSetting.reduce((sum, r) => sum + (weightMap[r.status] || 0), 0);
    const weightedProgressionRate = totalInvolved > 0 ? Math.round(totalPoints / totalInvolved) : 0;

    // Class-by-Class Progression (Form 1, Form 2, Form 3, Form 4, etc.)
    const classNamesSet = new Set<string>(['Form 1', 'Form 2', 'Form 3', 'Form 4']);
    activeInvolvedSetting.forEach(r => {
      if (r.className) classNamesSet.add(normalizeWholeClassName(r.className));
    });
    const classProgression = Array.from(classNamesSet).map(cls => {
      const clsItems = activeInvolvedSetting.filter(r => normalizeWholeClassName(r.className) === cls);
      const clsTotal = clsItems.length;
      const clsCompleted = clsItems.filter(
        r => r.status === 'SUBMITTED' || r.status === 'VETTED' || r.status === 'PRINTED_AND_SEALED'
      ).length;
      const clsInProgress = clsItems.filter(r => r.status === 'IN_PROGRESS').length;
      const clsNotSet = clsItems.filter(r => r.status === 'NOT_SET').length;
      const clsVettedPrinted = clsItems.filter(
        r => r.status === 'VETTED' || r.status === 'PRINTED_AND_SEALED'
      ).length;
      const percentComplete = clsTotal > 0 ? Math.round((clsCompleted / clsTotal) * 100) : 0;

      return {
        className: cls,
        totalInvolved: clsTotal,
        completedCount: clsCompleted,
        inProgressCount: clsInProgress,
        notSetCount: clsNotSet,
        vettedAndPrintedCount: clsVettedPrinted,
        percentComplete
      };
    });

    // Teacher-by-Teacher Progression (Wanaohusika Tu)
    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        totalAssigned: number;
        completed: number;
        inProgress: number;
        notSet: number;
        subjects: string[];
      }
    >();
    activeInvolvedSetting.forEach(r => {
      const tName = r.teacherName || 'Hajapangiwa';
      const existing = teacherMap.get(tName) || {
        teacherName: tName,
        totalAssigned: 0,
        completed: 0,
        inProgress: 0,
        notSet: 0,
        subjects: []
      };
      existing.totalAssigned += 1;
      if (r.status === 'SUBMITTED' || r.status === 'VETTED' || r.status === 'PRINTED_AND_SEALED') {
        existing.completed += 1;
      } else if (r.status === 'IN_PROGRESS') {
        existing.inProgress += 1;
      } else {
        existing.notSet += 1;
      }
      existing.subjects.push(`${r.subject} (${normalizeWholeClassName(r.className)})`);
      teacherMap.set(tName, existing);
    });

    const teacherProgression = Array.from(teacherMap.values())
      .map(t => ({
        ...t,
        percentComplete: t.totalAssigned > 0 ? Math.round((t.completed / t.totalAssigned) * 100) : 0
      }))
      .sort((a, b) => b.percentComplete - a.percentComplete);

    return {
      totalInvolved,
      exemptedCount,
      notSetCount,
      inProgressCount,
      submittedCount,
      vettedCount,
      printedCount,
      completedCount,
      pendingCount,
      completionRate,
      weightedProgressionRate,
      classProgression,
      teacherProgression
    };
  }, [activeInvolvedSetting, exemptedSetting]);

  const filteredScripts = useMemo(() => {
    return scriptRecords.filter(r => {
      const matchExam = selectedExamFilter === 'ALL_EXAMS' || r.examName.toLowerCase().trim() === selectedExamFilter.toLowerCase().trim();
      const matchSearch = !searchQuery || 
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.examName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = classFilter === 'ALL' || r.className === classFilter;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchExam && matchSearch && matchClass && matchStatus;
    });
  }, [scriptRecords, selectedExamFilter, searchQuery, classFilter, statusFilter]);

  // ---------------------------------------------------------------------------
  // REAM & DUPLICATION CALCULATOR LOGIC (MAKADIRIO YA REAM NA KARATASI)
  // ---------------------------------------------------------------------------
  const saveReamState = (nextConfig: ExamReamConfig, nextItems: ExamReamSubjectItem[]) => {
    setReamConfig(nextConfig);
    setReamItems(nextItems);
    localStorage.setItem(`haby_exam_ream_config_${schoolId}`, JSON.stringify(nextConfig));
    localStorage.setItem(`haby_exam_ream_items_${schoolId}`, JSON.stringify(nextItems));
  };

  // Sync subjects per class from the Exam Timetable into the Ream Calculator
  const handleSyncReamsFromTimetable = (showNotice = true) => {
    const activeSessions = sessions.length > 0 ? sessions : savedSessions;
    const targetExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Terminal Examination 2026');
    const updatedItems = [...reamItems];
    let addedCount = 0;

    if (activeSessions && activeSessions.length > 0) {
      activeSessions.forEach(sess => {
        const wholeClass = normalizeWholeClassName(sess.className);
        const sub = (sess.subject || '').trim();
        if (!sub) return;
        const exists = updatedItems.some(item =>
          item.examName.toLowerCase().trim() === targetExam.toLowerCase().trim() &&
          normalizeWholeClassName(item.className).toLowerCase() === wholeClass.toLowerCase() &&
          item.subject.toLowerCase().trim() === sub.toLowerCase().trim()
        );
        if (!exists) {
          addedCount++;
          updatedItems.push({
            id: `ream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            examName: targetExam,
            className: wholeClass,
            subject: sub,
            examDate: sess.date || sess.rawDate || '',
            pagesCount: 4 // Default 4 pages = 2 sheets per student in Duplex mode
          });
        }
      });
    }

    // If timetable had no sessions yet, populate core secondary subjects for Form 1 - Form 4
    if (addedCount === 0 && updatedItems.filter(i => i.examName.toLowerCase().trim() === targetExam.toLowerCase().trim()).length === 0) {
      const coreSubjects = [
        'Basic Mathematics',
        'English Language',
        'Kiswahili',
        'Biology',
        'Physics',
        'Chemistry',
        'Geography',
        'History',
        'Civics'
      ];
      ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(cls => {
        coreSubjects.forEach(sub => {
          addedCount++;
          updatedItems.push({
            id: `ream_std_${cls}_${sub}_${Math.random().toString(36).substring(2, 6)}`,
            examName: targetExam,
            className: cls,
            subject: sub,
            examDate: new Date().toISOString().split('T')[0],
            pagesCount: 4
          });
        });
      });
    }

    saveReamState(reamConfig, updatedItems);
    if (showNotice) {
      setAlertNotice({
        type: 'success',
        message: `✓ Masomo ya urudufishaji kwa mtihani wa "${targetExam}" yameandaliwa (${addedCount} masomo mapya)! Sasa weka idadi ya wanafunzi kwa kila kidato na kurasa/karatasi za kila mtihani.`
      });
    }
  };

  // Auto-populate ream items on first visit if empty for current exam
  useEffect(() => {
    const targetExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Pre-National Examination 2026');
    const hasForExam = reamItems.some(i => i.examName.toLowerCase().trim() === targetExam.toLowerCase().trim());
    if (!hasForExam && (sessions.length > 0 || savedSessions.length > 0)) {
      handleSyncReamsFromTimetable(false);
    }
  }, [selectedExamFilter, sessions.length, savedSessions.length]);

  const computedReamRows = useMemo(() => {
    const sheetsPerReam = Math.max(1, reamConfig.sheetsPerReam || 500);
    const extraCopies = Math.max(0, reamConfig.extraCopiesPerSubject || 0);

    return reamItems
      .filter(item => {
        const matchExam = selectedExamFilter === 'ALL_EXAMS' || item.examName.toLowerCase().trim() === selectedExamFilter.toLowerCase().trim();
        const matchClass = classFilter === 'ALL' || normalizeWholeClassName(item.className) === normalizeWholeClassName(classFilter);
        const matchSearch = !searchQuery ||
          item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.className.toLowerCase().includes(searchQuery.toLowerCase());
        return matchExam && matchClass && matchSearch;
      })
      .map(item => {
        const wholeClass = normalizeWholeClassName(item.className);
        const studentCount = typeof item.customStudentCount === 'number' && item.customStudentCount > 0
          ? item.customStudentCount
          : (reamConfig.classStudentCounts[wholeClass] ?? 200);
        const totalCopies = Math.max(0, studentCount + extraCopies);
        const pagesCount = Math.max(1, item.pagesCount || 4);
        const questionsCount = Math.max(1, item.questionsCount || 10);
        const sheetsPerStudent =
          typeof item.customSheetsPerStudent === 'number' && item.customSheetsPerStudent > 0
            ? item.customSheetsPerStudent
            : reamConfig.printDoubleSided
            ? Math.ceil(pagesCount / 2)
            : pagesCount;
        const totalSheets = totalCopies * sheetsPerStudent;
        const reamsRequired = totalSheets / sheetsPerReam;

        return {
          ...item,
          className: wholeClass,
          studentCount,
          extraCopies,
          totalCopies,
          pagesCount,
          questionsCount,
          sheetsPerStudent,
          totalSheets,
          reamsRequired
        };
      });
  }, [reamItems, reamConfig, selectedExamFilter, classFilter, searchQuery]);

  const reamSummary = useMemo(() => {
    const sheetsPerReam = Math.max(1, reamConfig.sheetsPerReam || 500);
    const totalSheets = computedReamRows.reduce((acc, r) => acc + r.totalSheets, 0);
    const exactReams = totalSheets / sheetsPerReam;
    const wholeReamsToBuy = Math.ceil(exactReams);
    const fullReamsPart = Math.floor(exactReams);
    const remainderSheets = totalSheets - fullReamsPart * sheetsPerReam;

    const classesList = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
    computedReamRows.forEach(r => {
      if (!classesList.includes(r.className)) classesList.push(r.className);
    });

    const classBreakdown = classesList.map(cls => {
      const clsRows = computedReamRows.filter(r => r.className === cls);
      const clsSheets = clsRows.reduce((acc, r) => acc + r.totalSheets, 0);
      const clsExactReams = clsSheets / sheetsPerReam;
      return {
        className: cls,
        studentCount: reamConfig.classStudentCounts[cls] ?? 200,
        subjectsCount: clsRows.length,
        totalSheets: clsSheets,
        exactReams: clsExactReams,
        wholeReams: Math.ceil(clsExactReams)
      };
    });

    const totalStudents = classBreakdown.reduce((acc, c) => acc + c.studentCount, 0);
    const totalEstimatedCost = wholeReamsToBuy * (reamConfig.pricePerReam || 0);

    return {
      totalStudents,
      totalSubjects: computedReamRows.length,
      totalSheets,
      exactReams,
      wholeReamsToBuy,
      fullReamsPart,
      remainderSheets,
      sheetsPerReam,
      printModeLabel: reamConfig.printDoubleSided
        ? 'Chapa Pande Mbili (Duplex: Kurasa 2 = Karatasi 1)'
        : 'Chapa Upande Mmoja (Single-Sided: Ukurasa 1 = Karatasi 1)',
      extraCopiesPerExam: reamConfig.extraCopiesPerSubject || 0,
      pricePerReam: reamConfig.pricePerReam || 0,
      totalEstimatedCost,
      classBreakdown
    };
  }, [computedReamRows, reamConfig]);

  // Direct PDF & Print Export Handler for any Sub-Tab
  const handleExportPDFReport = (
    mode: 'download' | 'print',
    overrideType?: 'dispatch_checklist' | 'reconciliation_report' | 'setting_tracker' | 'script_marking' | 'ream_calculator'
  ) => {
    const effectiveExamTitle = selectedExamFilter === 'ALL_EXAMS' ? (activeExamTitle || 'Mitihani Yote') : selectedExamFilter;
    const reportType = overrideType || (
      activeSubTab === 'dispatch'
        ? (dispatchViewMode === 'report' ? 'reconciliation_report' : 'dispatch_checklist')
        : activeSubTab === 'setting'
        ? 'setting_tracker'
        : activeSubTab === 'reams'
        ? 'ream_calculator'
        : 'script_marking'
    );

    exportExamControlReportPDF({
      schoolName: schoolInfo?.name || 'HABY EDU PRO SECONDARY SCHOOL',
      schoolInfo,
      officerName: currentUser?.fullName || 'Afisa Mitihani',
      examTitle: effectiveExamTitle,
      periodLabel: (reportType === 'dispatch_checklist' || reportType === 'reconciliation_report') ? activePeriodScopeLabel : undefined,
      reportType,
      mode,
      dispatchRecords: filteredDispatch,
      settingRecords: activeInvolvedSetting,
      scriptRecords: filteredScripts,
      reamRecords: computedReamRows,
      reamSummary
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeSubTab === 'dispatch') {
      const headers = [
        'S/N', 'Jina la Mtihani', 'Kipindi cha Ripoti', 'Somo', 'Darasa & Mkondo', 'Chumba / Ukumbi',
        'Msimamizi (Invigilator)', 'Muda wa Kuchukua', 'Bahasha Zilizochukuliwa',
        'Mtoaji', 'Hali ya Mtihani', 'Muda wa Kurudisha', 'Script Zilizorudishwa', 'Mpokeaji'
      ];
      const rows = filteredDispatch.map((r, i) => [
        i + 1, r.examName, activePeriodScopeLabel, r.subject, `${r.className} ${r.stream || ''}`, r.roomVenue,
        r.invigilatorName, `${r.date} ${r.checkoutTime}`, r.envelopesIssuedCount,
        r.issuedBy, r.status === 'RETURNED' ? 'Umerejeshwa' : 'Umechaguliwa / Vyumbani',
        r.returnTime || '-', r.scriptsReturnedCount || 0, r.receivedBy || '-'
      ].map(escapeCSV).join(','));

      const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
      downloadFile(`Kumbukumbu_Mitihani_Vyumbani_${schoolId}.csv`, csvContent);
    } else if (activeSubTab === 'setting') {
      const headers = [
        'S/N', 'Mtihani & Muhula', 'Somo', 'Kidato / Darasa Zima', 'Mwalimu Mhusika (Wanaohusika Tu)',
        'Tarehe ya Mwisho (Deadline)', 'Hali ya Utungaji', 'Aliyehakiki (Vetted By)', 'Maelezo'
      ];
      const rows = activeInvolvedSetting.map((r, i) => [
        i + 1, `${r.examName} (${r.term})`, r.subject, `${r.className} (Darasa Zima)`, r.teacherName,
        r.deadlineDate, r.status, r.vettedBy || '-', r.remarks || '-'
      ].map(escapeCSV).join(','));

      const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
      downloadFile(`Ripoti_Utungaji_Mitihani_Wanaohusika_${schoolId}.csv`, csvContent);
    } else if (activeSubTab === 'reams') {
      const headers = [
        'S/N', 'Mtihani', 'Kidato / Darasa', 'Somo', 'Idadi ya Wanafunzi', 'Nakala za Akiba',
        'Jumla ya Nakala', 'Kurasa za Mtihani (Pages)', 'Karatasi kwa Mwanafunzi (Sheets)',
        'Jumla ya Karatasi (Total Sheets)', 'Idadi ya Ream (Reams)'
      ];
      const rows = computedReamRows.map((r, i) => [
        i + 1, r.examName, r.className, r.subject, r.studentCount, r.extraCopies,
        r.totalCopies, r.pagesCount, r.sheetsPerStudent, r.totalSheets, r.reamsRequired.toFixed(2)
      ].map(escapeCSV).join(','));

      const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
      downloadFile(`Makadirio_ya_Ream_na_Urudufishaji_${schoolId}.csv`, csvContent);
    } else {
      const headers = [
        'S/N', 'Mtihani', 'Somo', 'Darasa', 'Mwalimu Aliyechukua Script',
        'Muda wa Kuchukua', 'Idadi ya Script', 'Tarehe ya Mwisho Kusaisha',
        'Mtoaji', 'Hali ya Usahihishaji', 'Muda wa Kurudisha'
      ];
      const rows = filteredScripts.map((r, i) => [
        i + 1, r.examName, r.subject, `${r.className} ${r.stream || ''}`, r.teacherName,
        `${r.checkoutDate} ${r.checkoutTime}`, r.scriptsCount, r.markingDeadline,
        r.issuedBy, r.status === 'COMPLETED_AND_RETURNED' ? 'Zimekamilika & Kurudishwa' : 'Zinasahihishwa',
        r.returnedDate ? `${r.returnedDate} ${r.returnedTime}` : '-'
      ].map(escapeCSV).join(','));

      const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\n');
      downloadFile(`Kumbukumbu_Script_za_Kusahihisha_${schoolId}.csv`, csvContent);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {alertNotice && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold animate-in fade-in ${
          alertNotice.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          alertNotice.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{alertNotice.message}</span>
          </div>
          <button onClick={() => setAlertNotice(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ACTIVE EXAMINATION SELECTOR BANNER FOR TRACKING ISOLATION */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-900 text-amber-200 text-[10px] font-black uppercase tracking-wider">
              MTIHANI UNAOFUATILIWA SASA (ISOLATED PER EXAM)
            </span>
            <span className="text-xs font-bold text-amber-900">
              Taarifa za mtihani huu zimetengwa ili usichanganye na mtihani mwingine (mf. Annual vs Pre-National vs Terminal)
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Ufuatiliaji wa: <strong className="text-blue-900 underline decoration-amber-500">{selectedExamFilter === 'ALL_EXAMS' ? 'Mitihani Yote Pamoja' : selectedExamFilter}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={isCustomExamTitle ? '__CUSTOM__' : selectedExamFilter}
            onChange={e => {
              if (e.target.value === '__CUSTOM__') {
                setIsCustomExamTitle(true);
              } else {
                setIsCustomExamTitle(false);
                handleExamFilterChange(e.target.value);
              }
            }}
            className="px-3.5 py-2 bg-white border-2 border-amber-400 rounded-xl text-xs font-black text-slate-900 shadow-2xs focus:outline-hidden"
          >
            {allKnownExamTitles.map(title => (
              <option key={title} value={title}>🎯 {title}</option>
            ))}
            <option value="ALL_EXAMS">📂 Onyesha Mitihani Yote (All Exams)</option>
            <option value="__CUSTOM__">✏️ + Andika Jina Jingine la Mtihani...</option>
          </select>

          {isCustomExamTitle && (
            <input
              type="text"
              value={selectedExamFilter === 'ALL_EXAMS' ? '' : selectedExamFilter}
              onChange={e => handleExamFilterChange(e.target.value)}
              placeholder="Andika jina la mtihani..."
              className="px-3 py-2 bg-white border-2 border-blue-600 rounded-xl text-xs font-black text-slate-900 w-52"
            />
          )}

          <button
            type="button"
            onClick={() => handleSyncDispatchFromTimetable(true)}
            className="px-3 py-2 bg-[#1f4d8b] hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition flex items-center gap-1.5"
            title="Tengeneza fomu mpya ya ufuatiliaji wa mtihani huu kutoka kwenye ratiba ya usimamizi"
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>Andaa Ufuatiliaji wa Mtihani Huu</span>
          </button>
        </div>
      </div>

      {/* TOP HEADER SUB-TABS */}
      <div className="bg-slate-900 text-white p-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => { setActiveSubTab('dispatch'); setStatusFilter('ALL'); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition ${
              activeSubTab === 'dispatch'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>📦 Mitihani Vyumbani ({filteredDispatch.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('setting'); setStatusFilter('ALL'); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition ${
              activeSubTab === 'setting'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>📝 Utungaji Mitihani — Darasa Zima ({filteredSetting.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('scripts'); setStatusFilter('ALL'); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition ${
              activeSubTab === 'scripts'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>📑 Script za Kusahihisha ({filteredScripts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('reams'); setStatusFilter('ALL'); }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition ${
              activeSubTab === 'reams'
                ? 'bg-emerald-400 text-slate-950 shadow-md font-extrabold'
                : 'text-emerald-300 hover:bg-slate-800 border border-emerald-700/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>🖨️ Makadirio ya Ream ({reamSummary.wholeReamsToBuy} Ream)</span>
          </button>

          {onOpenEnvelopeCoverForm && (
            <button
              type="button"
              onClick={onOpenEnvelopeCoverForm}
              className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer transition text-indigo-200 hover:bg-slate-800 border border-indigo-500/60"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>✉️ Fomu ya Bahasha ya Script (Envelope Cover)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pr-1 flex-wrap">
          <button
            type="button"
            onClick={() => handleExportPDFReport('download')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            title="Pakua Taarifa ya Mtihani Huu Kama PDF (Download A4 PDF)"
          >
            <Download className="w-4 h-4" />
            <span>Pakua PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportPDFReport('print')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            title="Chapisha Moja kwa Moja Taarifa ya Mtihani Huu (Printable PDF)"
          >
            <Printer className="w-4 h-4" />
            <span>Chapisha PDF (Print)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            title="Pakua Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Pakua Excel</span>
          </button>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Darasa Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase">Kidato / Darasa:</span>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Madarasa Yote</option>
              {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          {activeSubTab !== 'reams' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase">Hali (Status):</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Hali Zote</option>
                {activeSubTab === 'dispatch' && (
                  <>
                    <option value="CHECKED_OUT">Vyumbani (Zimechukuliwa)</option>
                    <option value="RETURNED">Zimerudishwa Tayari</option>
                  </>
                )}
                {activeSubTab === 'setting' && (
                  <>
                    <option value="NOT_SET">Bado Haijatungwa</option>
                    <option value="IN_PROGRESS">Inatungwa</option>
                    <option value="SUBMITTED">Imeshatungwa & Kuwasilishwa</option>
                    <option value="VETTED">Imehakikiwa (Vetted)</option>
                    <option value="PRINTED_AND_SEALED">Imechapishwa (Printed)</option>
                  </>
                )}
                {activeSubTab === 'scripts' && (
                  <>
                    <option value="CHECKED_OUT">Zimechukuliwa Kusahihishwa</option>
                    <option value="COMPLETED_AND_RETURNED">Zimekamilika & Kurudishwa</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tafuta somo, mwalimu, chumba..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
            />
          </div>
        </div>

        {/* Action Button Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {activeSubTab === 'dispatch' && (
            <>
              {/* View Mode Toggle: Checklist Table vs Return Report */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDispatchViewMode('checklist')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    dispatchViewMode === 'checklist' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Jedwali la Usimamizi na Kuweka Ticks (Checklist Table)"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Jedwali la Ticks</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchViewMode('report')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    dispatchViewMode === 'report' 
                      ? 'bg-amber-400 text-slate-950 shadow-xs font-extrabold' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ripoti ya Nani Karudisha na Nani Hajarudisha"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-800" />
                  <span>Ripoti ya Urejesho</span>
                  {pendingList.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                      {pendingList.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Synchronize from Timetable (Requirement 1) */}
              <button
                type="button"
                onClick={() => handleSyncDispatchFromTimetable(true)}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                title="Vuta na kusawazisha ratiba ya usimamizi kiotomatiki kwenye fomu hii"
              >
                <Layers className="w-4 h-4 text-indigo-200" />
                <span className="hidden sm:inline">Sawazisha Kutoka Ratiba</span>
              </button>

              {/* Print Report Button */}
              <button
                type="button"
                onClick={() => setIsPrintReportModalOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                title="Chapisha Ripoti ya Urejesho wa Mitihani"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Chapisha Ripoti</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDispatchAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Sajili Mtihani</span>
              </button>
            </>
          )}

          {activeSubTab === 'setting' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMergeStreamsToWholeClass}
                className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-black text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
                title="Unganisha mikondo yote iwe mtihani mmoja kwa Darasa Zima (mf. Form 1 badala ya Form 1A, Form 1B)"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-700" />
                <span>Unganisha kwa Darasa Zima</span>
              </button>

              <button
                type="button"
                onClick={handleAutoGenerateSettingTracker}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                title="Vuta masomo na madarasa ya walimu waliosajiliwa kuanzisha orodha ya utungaji kwa Darasa Zima"
              >
                <Layers className="w-4 h-4" />
                <span>Vuta Masomo (Darasa Zima)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenSettingAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Sajili Utungaji</span>
              </button>
            </div>
          )}

          {activeSubTab === 'scripts' && (
            <button
              type="button"
              onClick={handleOpenScriptAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Sajili Script Zilizochukuliwa</span>
            </button>
          )}

          {activeSubTab === 'reams' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSyncReamsFromTimetable(true)}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
              >
                <Layers className="w-4 h-4 text-amber-300" />
                <span>🔄 Vuta Masomo Kutoka Ratiba ya Mtihani</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDFReport('download', 'ream_calculator')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
              >
                <Download className="w-4 h-4" />
                <span>Pakua PDF ya Makadirio ya Ream</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDFReport('print', 'ream_calculator')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Chapisha (Print)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODULE 1: EXAM DISPATCH & RETURN CONTROL FORM (MITIHANI VYUMBANI)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'dispatch' && (
        <div className="space-y-4">
          {/* REPORT PERIOD SCOPE SELECTOR: DAY-TO-DAY (SIKU KWA SIKU), WEEKLY (WIKI YA MTIHANI), OR FULL EXAM (MTIHANI MZIMA) */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl shadow-md border border-blue-800/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Chagua Kipindi cha Taarifa ya Urejesho wa Mitihani ({selectedExamFilter})
                  </div>
                  <div className="text-xs font-bold text-blue-100">
                    Unaweza kutoa ripoti ya <span className="text-white underline">Siku kwa Siku</span> (mf. Jumatatu, Jumanne), <span className="text-white underline">Wiki ya Mtihani</span> (Wiki ya 1, Wiki ya 2), au <span className="text-white underline">Mtihani Mzima</span>
                  </div>
                </div>
              </div>

              {/* 3-Way Period Scope Toggle */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setReportPeriodScope('FULL_EXAM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    reportPeriodScope === 'FULL_EXAM'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>📊 Ripoti ya Mtihani Mzima</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportPeriodScope('DAY_TO_DAY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    reportPeriodScope === 'DAY_TO_DAY'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>📅 Siku kwa Siku (Day-to-Day)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportPeriodScope('WEEKLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    reportPeriodScope === 'WEEKLY'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>🗓️ Kwa Wiki ya Mtihani</span>
                </button>
              </div>
            </div>

            {/* Sub-selector when DAY_TO_DAY is active */}
            {reportPeriodScope === 'DAY_TO_DAY' && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-amber-300 mr-1">Chagua Siku:</span>
                  {[
                    { key: 'ALL_DAYS', label: 'Siku Zote' },
                    { key: 'JUMATATU', label: 'Jumatatu (Mon)' },
                    { key: 'JUMANNE', label: 'Jumanne (Tue)' },
                    { key: 'JUMATANO', label: 'Jumatano (Wed)' },
                    { key: 'ALHAMISI', label: 'Alhamisi (Thu)' },
                    { key: 'IJUMAA', label: 'Ijumaa (Fri)' },
                    { key: 'JUMAMOSI', label: 'Jumamosi (Sat)' },
                  ].map(day => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        setSelectedDayOfWeek(day.key);
                        setDateFilter('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
                        selectedDayOfWeek === day.key && !dateFilter
                          ? 'bg-white text-slate-950 shadow-2xs'
                          : 'bg-white/10 text-blue-100 hover:bg-white/20'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>

                {examUniqueDates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-200">Au Tarehe Maalumu:</span>
                    <select
                      value={dateFilter}
                      onChange={e => setDateFilter(e.target.value)}
                      className="px-2.5 py-1 bg-slate-900 border border-blue-400/40 rounded-lg text-xs font-bold text-white"
                    >
                      <option value="">-- Tarehe Zote ({selectedDayOfWeek}) --</option>
                      {examUniqueDates.map(d => (
                        <option key={d} value={d}>
                          {d} ({getSwahiliDayInfo(d).label})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Sub-selector when WEEKLY is active */}
            {reportPeriodScope === 'WEEKLY' && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-amber-300">Chagua Wiki ya Mtihani:</span>
                  {[
                    { week: 'WEEK_1' as const, label: 'Wiki ya Kwanza ya Mtihani (Week 1 — Siku 1 hadi 7)' },
                    { week: 'WEEK_2' as const, label: 'Wiki ya Pili ya Mtihani (Week 2 — Siku 8 hadi 14)' },
                    { week: 'WEEK_3' as const, label: 'Wiki ya Tatu na Kuendelea (Week 3+)' },
                  ].map(w => (
                    <button
                      key={w.week}
                      type="button"
                      onClick={() => setSelectedExamWeek(w.week)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                        selectedExamWeek === w.week
                          ? 'bg-white text-slate-950 shadow-2xs'
                          : 'bg-white/10 text-blue-100 hover:bg-white/20'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Period Scope Status Pill & Quick PDF/Print */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-black text-[11px]">
                  📌 Kipindi Kinachoonyeshwa: {activePeriodScopeLabel}
                </span>
                <span className="text-blue-200 font-bold text-[11px]">
                  ({filteredDispatch.length} Vipindi vya Mitihani)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportPDFReport('download', dispatchViewMode === 'report' ? 'reconciliation_report' : 'dispatch_checklist')}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pakua PDF ({reportPeriodScope === 'DAY_TO_DAY' ? 'Siku kwa Siku' : reportPeriodScope === 'WEEKLY' ? 'Kwa Wiki' : 'Mtihani Mzima'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDFReport('print', dispatchViewMode === 'report' ? 'reconciliation_report' : 'dispatch_checklist')}
                  className="px-3 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>Print Ripoti Hii</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Jumla ya Mitihani Iliyopangwa</div>
                  <div className="text-lg font-black text-slate-900">{dispatchRecords.length} Session</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSyncDispatchFromTimetable(true)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Sawazisha tena na ratiba ya usimamizi"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-4 bg-white border rounded-2xl shadow-2xs flex items-center justify-between transition ${
              pendingList.length > 0 ? 'border-amber-300 ring-2 ring-amber-200/50 bg-amber-50/20' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Nani Hajarudisha (Inashikiliwa)</div>
                  <div className="text-lg font-black text-amber-700 flex items-center gap-2">
                    <span>{pendingList.length} Mitihani</span>
                    {pendingList.length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-black animate-pulse">
                        Bado Vyumbani
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDispatchViewMode('report'); setReportFilter('PENDING'); }}
                className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
              >
                Orodha →
              </button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Nani Karudisha (Wamerejesha)</div>
                  <div className="text-lg font-black text-emerald-700 flex items-center gap-2">
                    <span>{returnedList.length} Mitihani</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                      {dispatchRecords.length > 0 ? Math.round((returnedList.length / dispatchRecords.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDispatchViewMode('report'); setReportFilter('RETURNED'); }}
                className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Orodha →
              </button>
            </div>
          </div>

          {/* MODE 1: CHECKLIST TABLE WITH TICKABLE CHECKBOXES (AMECHUKUA & AMERUDISHA) */}
          {dispatchViewMode === 'checklist' && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="font-black text-xs text-slate-900 uppercase flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-blue-600" />
                  <span>Jedwali la Udhibiti ({selectedExamFilter}): Bofya Kuweka au Kuondoa Ticks za Kuchukua [✓] na Kurudisha [✓]</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{filteredDispatch.length} Vipindi</span>
                  <button
                    type="button"
                    onClick={handleResetAllTicksForExam}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition cursor-pointer"
                    title="Fungua na weka upya ticks zote za mtihani huu ziwe hazijawekwa alama"
                  >
                    🔓 Fungua / Weka Upya Ticks Zote
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncDispatchFromTimetable(true)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
                  >
                    🔄 Sawazisha na Ratiba
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPDFReport('download', 'dispatch_checklist')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPDFReport('print', 'dispatch_checklist')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 text-center">#</th>
                      <th className="p-3 border-r border-slate-200">Mtihani & Somo</th>
                      <th className="p-3 border-r border-slate-200">Darasa & Chumba</th>
                      <th className="p-3 border-r border-slate-200">Msimamizi (Invigilator)</th>
                      <th className="p-3 border-r border-slate-200 text-center min-w-[160px]">
                        Amechukua Mtihani (Check-Out)
                      </th>
                      <th className="p-3 border-r border-slate-200 text-center min-w-[160px]">
                        Amerudisha Mtihani (Check-In)
                      </th>
                      <th className="p-3 border-r border-slate-200 text-center">Hali (Status)</th>
                      <th className="p-3 border-r border-slate-200 text-center">Script Zilizorudishwa</th>
                      <th className="p-3 text-center">Hatua</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                          Inapakia kumbukumbu za mitihani vyumbani...
                        </td>
                      </tr>
                    ) : filteredDispatch.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-slate-400">
                          <PackageCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-700">
                            Hakuna kumbukumbu za ufuatiliaji kwa mtihani wa "{selectedExamFilter}".
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Bonyeza <strong>'Sawazisha na Ratiba Sasa'</strong> kuandaa fomu ya ufuatiliaji wa mtihani huu kiotomatiki.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSyncDispatchFromTimetable(true)}
                            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer"
                          >
                            Sawazisha na Ratiba Sasa ({selectedExamFilter})
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredDispatch.map((item, idx) => {
                        const isTaken = Boolean(item.isTaken);
                        const isReturned = Boolean(item.isReturned);

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 transition ${isReturned ? 'bg-emerald-50/20' : ''}`}>
                            <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                            
                            <td className="p-3 border-r border-slate-200">
                              <div className="font-black text-slate-900">{item.subject}</div>
                              <div className="text-[10px] text-blue-700 font-bold">{item.examName}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{item.date} • {item.sessionTime}</div>
                            </td>

                            <td className="p-3 border-r border-slate-200">
                              <span className="font-bold text-slate-800">{item.className} {item.stream ? `(${item.stream})` : ''}</span>
                              <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                                <Building className="w-3 h-3" />
                                <span>{item.roomVenue}</span>
                              </div>
                            </td>

                            <td className="p-3 border-r border-slate-200">
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>{item.invigilatorName}</span>
                              </div>
                              {item.invigilatorPhone && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  📞 {item.invigilatorPhone}
                                </div>
                              )}
                            </td>

                            {/* TICKABLE BUTTON 1: AMECHUKUA MTIHANI (100% UNLOCKED & INTERACTIVE) */}
                            <td className="p-3 border-r border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleAmechukua(item)}
                                className={`w-full py-2 px-3 rounded-xl border-2 flex items-center justify-between gap-2 text-xs font-black cursor-pointer transition-all active:scale-95 select-none ${
                                  isTaken
                                    ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs hover:bg-blue-100'
                                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-blue-400'
                                }`}
                                title="Bofya kuweka au kuondoa tiki ya Kuchukua Mtihani (Check-out)"
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    isTaken ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-400'
                                  }`}>
                                    {isTaken && <Check className="w-3 h-3 stroke-[3]" />}
                                  </span>
                                  <span>{isTaken ? 'Amechukua' : 'Hajachukua'}</span>
                                </span>
                                {item.checkoutTime && isTaken && (
                                  <span className="font-mono text-[10px] text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded font-bold">
                                    {item.checkoutTime}
                                  </span>
                                )}
                              </button>
                            </td>

                            {/* TICKABLE BUTTON 2: AMERUDISHA MTIHANI (100% UNLOCKED & INTERACTIVE) */}
                            <td className="p-3 border-r border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleAmerudisha(item)}
                                className={`w-full py-2 px-3 rounded-xl border-2 flex items-center justify-between gap-2 text-xs font-black cursor-pointer transition-all active:scale-95 select-none ${
                                  isReturned
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs hover:bg-emerald-100'
                                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-emerald-400'
                                }`}
                                title="Bofya kuweka au kuondoa tiki ya Kurudisha Mtihani (Check-in)"
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                    isReturned ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-400'
                                  }`}>
                                    {isReturned && <Check className="w-3 h-3 stroke-[3]" />}
                                  </span>
                                  <span>{isReturned ? 'Amerudisha' : 'Hajarudisha'}</span>
                                </span>
                                {item.returnTime && isReturned && (
                                  <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                    {item.returnTime}
                                  </span>
                                )}
                              </button>
                            </td>

                            {/* STATUS BADGE */}
                            <td className="p-3 border-r border-slate-200 text-center">
                              {isReturned ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Imerejeshwa</span>
                                </span>
                              ) : isTaken ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Vyumbani</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                  <span>Bado Kuchukuliwa</span>
                                </span>
                              )}
                            </td>

                            {/* SCRIPTS RETURNED COUNT */}
                            <td className="p-3 border-r border-slate-200 text-center font-bold">
                              {isReturned ? (
                                <div>
                                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black">
                                    {item.scriptsReturnedCount || 40} Scripts
                                  </span>
                                  {item.receivedBy && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">Mpokeaji: {item.receivedBy}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>

                            {/* ACTIONS */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDispatchId(item.id);
                                    setDispatchFormData(item);
                                    setIsDispatchModalOpen(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title="Hariri Taarifa"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDispatch(item.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Futa"
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

          {/* MODE 2: AUTOMATED REPORT VIEW — NANI KARUDISHA VS NANI HAJARUDISHA (REQUIREMENT 1) */}
          {dispatchViewMode === 'report' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Report Sub-filter Pills & Print CTA */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-slate-700">Chuja Ripoti:</span>
                  <button
                    type="button"
                    onClick={() => setReportFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                      reportFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Orodha Yote ({filteredDispatch.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportFilter('RETURNED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 ${
                      reportFilter === 'RETURNED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Nani Karudisha ({returnedList.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 ${
                      reportFilter === 'PENDING'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>⚠️ Nani Hajarudisha ({pendingList.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {pendingList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenSmsAlertModal}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
                      title="Tuma ujumbe mfupi wa SMS kwa walimu wote ambao hawajarudisha mitihani"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>📱 Tuma SMS ya Kikumbusho ({pendingList.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportPDFReport('download', 'reconciliation_report')}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pakua PDF ya Ripoti</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPDFReport('print', 'reconciliation_report')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Chapisha Ripoti (Print PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Pakua CSV</span>
                  </button>
                </div>
              </div>

              {/* SECTION A: NANI HAJARUDISHA (PENDING & UNRETURNED PAPERS) */}
              {(reportFilter === 'ALL' || reportFilter === 'PENDING') && (
                <div className="bg-white border-2 border-rose-200 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                          ⚠️ Ambao Hawajarudisha Mitihani (Inashikiliwa Vyumbani)
                        </h3>
                        <p className="text-[11px] text-rose-700 font-medium">
                          Walimu wasimamizi ambao bado hawajakabidhi scripts na bahasha za mitihani idara ya mitihani
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-black">
                        {pendingList.length} Hawajarudisha
                      </span>
                      {pendingList.length > 0 && (
                        <button
                          type="button"
                          onClick={handleOpenSmsAlertModal}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                          <span>Tuma SMS</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {pendingList.length === 0 ? (
                    <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-xs font-black text-emerald-900 uppercase">
                        Safi Sana! Hakuna mwalimu anayedaiwa mitihani au scripts kwa sasa.
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Mitihani yote iliyosajiliwa imerejeshwa salama na kuingizwa kwenye kumbukumbu.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                      {pendingList.map(item => (
                        <div
                          key={item.id}
                          className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs transition"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md">
                                  Bado Haijarudishwa
                                </span>
                                <h4 className="font-black text-slate-900 text-sm mt-1.5">{item.invigilatorName}</h4>
                                {item.invigilatorPhone && (
                                  <a 
                                    href={`tel:${item.invigilatorPhone}`} 
                                    className="text-[11px] text-blue-700 font-bold hover:underline block mt-0.5"
                                  >
                                    📞 {item.invigilatorPhone}
                                  </a>
                                )}
                              </div>
                              <span className="text-right text-[10px] font-mono font-bold text-slate-600">
                                {item.date}
                              </span>
                            </div>

                            <div className="mt-3 p-2.5 bg-white rounded-xl border border-rose-100 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-900">{item.subject}</span>
                                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.className} {item.stream || ''}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>Chumba: {item.roomVenue}</span>
                                <span className="font-mono text-slate-700">Muda: {item.checkoutTime}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Bahasha: {item.envelopesIssuedCount} | Kipindi: {item.sessionTime}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleAmerudisha(item)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                            <span>Thibitisha Kurudisha Sasa</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B: NANI KARUDISHA (RETURNED & RECONCILED PAPERS) */}
              {(reportFilter === 'ALL' || reportFilter === 'RETURNED') && (
                <div className="bg-white border-2 border-emerald-200 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                          ✓ Waliorejesha Mitihani Salama (Nani Karudisha)
                        </h3>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Orodha ya wasimamizi waliorejesha scripts na bahasha zilizokaguliwa na kusajiliwa
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-black">
                      {returnedList.length} Wamerejesha
                    </span>
                  </div>

                  {returnedList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-xs font-bold text-slate-600">Bado hakuna mwalimu aliyerejesha mtihani kwa sasa.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Tumia jedwali au ripoti kuweka alama ya kurudisha mara tu scripts zinapopokelewa.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-emerald-50 text-emerald-950 font-black uppercase text-[10px] tracking-wider border-b border-emerald-200">
                            <th className="p-2.5 border-r border-emerald-200">#</th>
                            <th className="p-2.5 border-r border-emerald-200">Msimamizi</th>
                            <th className="p-2.5 border-r border-emerald-200">Somo & Darasa</th>
                            <th className="p-2.5 border-r border-emerald-200">Chumba / Venue</th>
                            <th className="p-2.5 border-r border-emerald-200 font-mono">Muda wa Kurudisha</th>
                            <th className="p-2.5 border-r border-emerald-200 text-center">Scripts Zilizopokelewa</th>
                            <th className="p-2.5 border-r border-emerald-200">Mpokeaji</th>
                            <th className="p-2.5 text-center">Hatua</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100 font-medium">
                          {returnedList.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                              <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 border-r border-slate-200 font-black text-slate-900">
                                {item.invigilatorName}
                                {item.invigilatorPhone && (
                                  <span className="text-[10px] text-slate-400 block font-normal">📞 {item.invigilatorPhone}</span>
                                )}
                              </td>
                              <td className="p-2.5 border-r border-slate-200">
                                <span className="font-black text-slate-800">{item.subject}</span>
                                <span className="text-[10px] text-slate-500 block">{item.className} {item.stream || ''}</span>
                              </td>
                              <td className="p-2.5 border-r border-slate-200 text-slate-700 font-bold">{item.roomVenue}</td>
                              <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-emerald-800">
                                {item.returnTime || '11:00'} ({item.date})
                              </td>
                              <td className="p-2.5 border-r border-slate-200 text-center">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-black text-xs">
                                  {item.scriptsReturnedCount || 40} Scripts
                                </span>
                              </td>
                              <td className="p-2.5 border-r border-slate-200 text-slate-700 font-semibold">{item.receivedBy || 'Afisa Mitihani'}</td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAmerudisha(item)}
                                  className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                                  title="Ghairi alama ya kurudisha mtihani"
                                >
                                  Ghairi
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 2: EXAM SETTING & VETTING STATUS TRACKER (UTUNGAJI MITIHANI)    */}
      {/* ========================================================================= */}
      {activeSubTab === 'setting' && (
        <div className="space-y-4">
          {/* 1. PROGRESSION REPORT BANNER (RIPOTI YA MAENDELEO YA UTUNGAJI WA MITIHANI) */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-emerald-700/50 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    📊 PROGRESSION REPORT YA UTUNGAJI WA MITIHANI
                  </span>
                  <span className="text-[11px] text-emerald-200 font-bold">
                    (Inajumuisha Wanaohusika Tu — Walioondolewa hawaingii kwenye ripoti)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  Maendeleo ya Utungaji na Uwasilishaji wa Mitihani — {selectedExamFilter === 'ALL_EXAMS' ? 'Mitihani Yote' : selectedExamFilter}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Fuatilia asilimia ya mitihani iliyotungwa na kuwasilishwa kwa kila kidato na kila mwalimu mhusika.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherProgressionTable(prev => !prev)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition border ${
                    showTeacherProgressionTable
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>
                    {showTeacherProgressionTable
                      ? 'Ficha Progression ya Walimu'
                      : `Progression kwa Kila Mwalimu (${settingProgressionStats.teacherProgression.length})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDFReport('download', 'setting_tracker')}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Export PDF (Ripoti & Progression)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDFReport('print', 'setting_tracker')}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Chapisha Ripoti (Print)</span>
                </button>
              </div>
            </div>

            {/* Overall Progress Bar & Stage Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-5 bg-white/10 border border-white/15 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-300">
                    Kiwango cha Ukamilishaji (Submission Rate)
                  </span>
                  <span className="text-2xl font-black text-amber-300">
                    {settingProgressionStats.completionRate}%
                  </span>
                </div>
                <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, settingProgressionStats.completionRate))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 pt-0.5">
                  <span>
                    ✓ Tayari / Imewasilishwa: <strong className="text-emerald-300">{settingProgressionStats.completedCount}</strong> / {settingProgressionStats.totalInvolved}
                  </span>
                  <span>
                    ⏳ Bado: <strong className="text-rose-300">{settingProgressionStats.pendingCount}</strong>
                  </span>
                </div>
              </div>

              {/* 5 Stage Breakdown Pills */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-rose-500/20 border border-rose-400/30 rounded-2xl text-center">
                  <div className="text-[10px] font-black uppercase text-rose-200">1. Bado Haijatungwa</div>
                  <div className="text-xl font-black text-white mt-0.5">{settingProgressionStats.notSetCount}</div>
                  <div className="text-[10px] text-rose-300 font-bold">
                    {settingProgressionStats.totalInvolved > 0
                      ? `${Math.round((settingProgressionStats.notSetCount / settingProgressionStats.totalInvolved) * 100)}%`
                      : '0%'}
                  </div>
                </div>

                <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-center">
                  <div className="text-[10px] font-black uppercase text-amber-200">2. Inatungwa Sasa</div>
                  <div className="text-xl font-black text-amber-300 mt-0.5">{settingProgressionStats.inProgressCount}</div>
                  <div className="text-[10px] text-amber-200 font-bold">
                    {settingProgressionStats.totalInvolved > 0
                      ? `${Math.round((settingProgressionStats.inProgressCount / settingProgressionStats.totalInvolved) * 100)}%`
                      : '0%'}
                  </div>
                </div>

                <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-center">
                  <div className="text-[10px] font-black uppercase text-blue-200">3. Imewasilishwa</div>
                  <div className="text-xl font-black text-blue-300 mt-0.5">{settingProgressionStats.submittedCount}</div>
                  <div className="text-[10px] text-blue-200 font-bold">
                    {settingProgressionStats.totalInvolved > 0
                      ? `${Math.round((settingProgressionStats.submittedCount / settingProgressionStats.totalInvolved) * 100)}%`
                      : '0%'}
                  </div>
                </div>

                <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-2xl text-center">
                  <div className="text-[10px] font-black uppercase text-purple-200">4. Imehakikiwa</div>
                  <div className="text-xl font-black text-purple-300 mt-0.5">{settingProgressionStats.vettedCount}</div>
                  <div className="text-[10px] text-purple-200 font-bold">
                    {settingProgressionStats.totalInvolved > 0
                      ? `${Math.round((settingProgressionStats.vettedCount / settingProgressionStats.totalInvolved) * 100)}%`
                      : '0%'}
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/25 border border-emerald-400/40 rounded-2xl text-center">
                  <div className="text-[10px] font-black uppercase text-emerald-200">5. Imechapishwa</div>
                  <div className="text-xl font-black text-emerald-300 mt-0.5">{settingProgressionStats.printedCount}</div>
                  <div className="text-[10px] text-emerald-200 font-bold">
                    {settingProgressionStats.totalInvolved > 0
                      ? `${Math.round((settingProgressionStats.printedCount / settingProgressionStats.totalInvolved) * 100)}%`
                      : '0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Class-by-Class Progression Cards (Kidato kwa Kidato) */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center justify-between">
                <span>Progression ya Utungaji kwa Kila Kidato (Wanaohusika Tu):</span>
                {settingProgressionStats.exemptedCount > 0 && (
                  <span className="text-amber-300">
                    🚫 Walioondolewa (Hawahusiki): {settingProgressionStats.exemptedCount} Masomo/Walimu
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {settingProgressionStats.classProgression.map(cp => (
                  <div
                    key={cp.className}
                    className="p-3.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl space-y-2 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-white uppercase">{cp.className}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                          cp.percentComplete === 100
                            ? 'bg-emerald-400 text-slate-950'
                            : cp.percentComplete >= 50
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-rose-500/80 text-white'
                        }`}
                      >
                        {cp.percentComplete}% Tayari
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cp.percentComplete === 100
                            ? 'bg-emerald-400'
                            : cp.percentComplete >= 50
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${cp.percentComplete}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                      <span>Wanaohusika: <strong className="text-white">{cp.totalInvolved}</strong></span>
                      <span className="text-emerald-300">✓ Wamewasilisha: {cp.completedCount}</span>
                      <span className="text-rose-300">Bado: {cp.notSetCount + cp.inProgressCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collapsible Teacher-by-Teacher Progression Table */}
            {showTeacherProgressionTable && (
              <div className="pt-3 border-t border-white/15 animate-in fade-in">
                <div className="bg-white text-slate-900 rounded-2xl p-4 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-900">
                        Ripoti ya Maendeleo ya Utungaji kwa Kila Mwalimu Mhusika (Teacher Progression)
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Inaonyesha walimu wanaohusika tu na idadi ya mitihani waliyokamilisha dhidi ya wanayodaiwa
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black">
                      Walimu Wanaohusika: {settingProgressionStats.teacherProgression.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                          <th className="p-2.5 border-r border-slate-200">#</th>
                          <th className="p-2.5 border-r border-slate-200">Mwalimu Mhusika</th>
                          <th className="p-2.5 border-r border-slate-200">Masomo & Vidato Anavyotunga</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">Jumla ya Mitihani</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">Iliyowasilishwa (✓)</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">Bado Inadaiwa</th>
                          <th className="p-2.5 text-center">Progression (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {settingProgressionStats.teacherProgression.map((tp, idx) => (
                          <tr key={tp.teacherName} className="hover:bg-slate-50">
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 border-r border-slate-200 font-black text-slate-900">{tp.teacherName}</td>
                            <td className="p-2.5 border-r border-slate-200 text-[11px] text-slate-700">
                              {tp.subjects.join(', ')}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-black">{tp.totalAssigned}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-black text-emerald-700">
                              {tp.completed}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-black text-rose-600">
                              {tp.notSet + tp.inProgress}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden min-w-[60px]">
                                  <div
                                    className={`h-full rounded-full ${
                                      tp.percentComplete === 100
                                        ? 'bg-emerald-600'
                                        : tp.percentComplete >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${tp.percentComplete}%` }}
                                  />
                                </div>
                                <span className="font-mono font-black text-[11px] w-10 text-right">
                                  {tp.percentComplete}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. INVOLVEMENT FILTER BAR (CHUJA WANAOHUSIKA TU VS WALIOONDOLEWA KWENYE RIPOTI) */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 uppercase">
                  Udhibiti wa Wanaohusika na Utungaji wa Mitihani (Darasa Zima)
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Ukiweka mwalimu/somo <strong>"Hahusiki"</strong> kwenye safu ya Hatua, anaondolewa moja kwa moja kwenye <strong>Ripoti ya Utungaji</strong> ili wabaki wanaohusika tu.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSettingInvolvementFilter('INVOLVED_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  settingInvolvementFilter === 'INVOLVED_ONLY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Wanaohusika Tu Kwenye Ripoti ({activeInvolvedSetting.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingInvolvementFilter('EXEMPTED_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  settingInvolvementFilter === 'EXEMPTED_ONLY'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Waliotolewa / Hawahusiki ({exemptedSetting.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingInvolvementFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  settingInvolvementFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                <span>Onyesha Wote ({examMatchedSetting.length})</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="font-black text-xs text-slate-900 uppercase flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {settingInvolvementFilter === 'EXEMPTED_ONLY'
                    ? 'Orodha ya Walimu / Masomo Yasiyohusika na Utungaji (Waliotolewa Kwenye Ripoti)'
                    : 'Form ya Udhibiti wa Utungaji na Uhakiki wa Mitihani — Wanaohusika (Darasa Zima)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Wanaohusika Kwenye Ripoti: {activeInvolvedSetting.length}
                </span>
                {exemptedSetting.length > 0 && (
                  <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                    Waliotolewa (Hawahusiki): {exemptedSetting.length}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">#</th>
                    <th className="p-3 border-r border-slate-200">Mtihani & Muhula</th>
                    <th className="p-3 border-r border-slate-200">Somo & Kidato (Darasa Zima)</th>
                    <th className="p-3 border-r border-slate-200">Mwalimu Mhusika</th>
                    <th className="p-3 border-r border-slate-200 text-center">Ushiriki wa Utungaji (Action)</th>
                    <th className="p-3 border-r border-slate-200">Tarehe ya Mwisho (Deadline)</th>
                    <th className="p-3 border-r border-slate-200 text-center">Hali ya Utungaji & Progression</th>
                    <th className="p-3 border-r border-slate-200">Uhakiki (Vetting)</th>
                    <th className="p-3 text-center">Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        Inapakia taarifa za utungaji wa mitihani...
                      </td>
                    </tr>
                  ) : filteredSetting.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">
                          {settingInvolvementFilter === 'EXEMPTED_ONLY'
                            ? 'Hakuna mwalimu au somo lililowekwa "Hahusiki" kwa sasa.'
                            : 'Hakuna orodha ya utungaji iliyopatikana.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {settingInvolvementFilter === 'EXEMPTED_ONLY'
                            ? 'Walimu wote waliosajiliwa kwa sasa wanahusika na utungaji.'
                            : "Bonyeza 'Vuta Masomo (Darasa Zima)' kuanzisha orodha kiotomatiki au '+ Sajili Utungaji'."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSetting.map((item, idx) => {
                      const isInvolved = item.isInvolved !== false;
                      const stageProgress =
                        item.status === 'PRINTED_AND_SEALED'
                          ? 100
                          : item.status === 'VETTED'
                          ? 90
                          : item.status === 'SUBMITTED'
                          ? 80
                          : item.status === 'IN_PROGRESS'
                          ? 40
                          : 0;

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${
                            !isInvolved ? 'bg-rose-50/40 opacity-75 hover:opacity-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>

                          <td className="p-3 border-r border-slate-200">
                            <div className="font-black text-slate-900">{item.examName}</div>
                            <div className="text-[10px] text-slate-500">{item.term || 'Term 1'}</div>
                          </td>

                          <td className="p-3 border-r border-slate-200">
                            <div className={`font-black ${!isInvolved ? 'line-through text-slate-500' : 'text-blue-900'}`}>
                              {item.subject}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                                {normalizeWholeClassName(item.className)} — Darasa Zima
                              </span>
                            </div>
                          </td>

                          <td className="p-3 border-r border-slate-200">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className={!isInvolved ? 'line-through text-slate-500' : ''}>{item.teacherName}</span>
                              {item.isHODOverride && (
                                <span
                                  className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-black tracking-tight flex items-center gap-1"
                                  title={`Uteuzi Maalumu: ${item.assignedByRole || 'HOD'}${item.overrideReason ? ` - ${item.overrideReason}` : ''}`}
                                >
                                  👑 Uteuzi wa HOD
                                </span>
                              )}
                            </div>
                          </td>

                          {/* ACTION BUTTON: ANAHUSIKA VS HAHUSIKI (ONDOA KWENYE RIPOTI) */}
                          <td className="p-3 border-r border-slate-200 text-center">
                            {isInvolved ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase">
                                  ✓ Anahusika
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSettingInvolvement(item)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 rounded-lg text-[10px] font-black cursor-pointer transition shadow-2xs"
                                  title="Bonyeza kusema mwalimu/somo hili HAHUSIKI kwenye utungaji na kumtoa kwenye ripoti"
                                >
                                  🚫 Weka: Hahusiki (Ondoa Ripoti)
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-black uppercase">
                                  🚫 Hahusiki (Ametolewa Ripoti)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSettingInvolvement(item)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black cursor-pointer transition shadow-2xs"
                                  title="Bonyeza kumrudisha mwalimu/somo hili kwenye orodha ya wanaohusika na utungaji"
                                >
                                  ✓ Rudisha: Anahusika
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="p-3 border-r border-slate-200">
                            <div className="font-mono font-bold text-slate-800">{item.deadlineDate}</div>
                          </td>

                          <td className="p-3 border-r border-slate-200 text-center">
                            {isInvolved ? (
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCycleSettingStatus(item)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer transition ${
                                    item.status === 'NOT_SET' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                    item.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                    item.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                    item.status === 'VETTED' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                                    'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}
                                  title="Bonyeza kubadilisha hali ya utungaji"
                                >
                                  {item.status === 'NOT_SET' && '🔴 Bado Haijatungwa (0%)'}
                                  {item.status === 'IN_PROGRESS' && '🟡 Inatungwa (40%)'}
                                  {item.status === 'SUBMITTED' && '🔵 Imeshatungwa & Wasilishwa (80%)'}
                                  {item.status === 'VETTED' && '🟣 Imehakikiwa / Vetted (90%)'}
                                  {item.status === 'PRINTED_AND_SEALED' && '🟢 Imechapishwa & Sealed (100%)'}
                                </button>
                                <div className="w-28 mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      stageProgress >= 80
                                        ? 'bg-emerald-500'
                                        : stageProgress >= 40
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${stageProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-rose-700 italic">
                                Hahusiki kwenye ripoti
                              </span>
                            )}
                          </td>

                          <td className="p-3 border-r border-slate-200">
                            {item.vettedBy ? (
                              <div>
                                <div className="font-bold text-slate-800">{item.vettedBy}</div>
                                <div className="text-[10px] text-slate-400">{item.vettedDate}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Bado kuhakikiwa</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSettingId(item.id);
                                  setSettingFormData(item);
                                  setIsSettingModalOpen(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Hariri"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSetting(item.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Futa"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 3: EXAM SCRIPT COLLECTION FOR MARKING (SCRIPT ZA KUSAHIHISHA)  */}
      {/* ========================================================================= */}
      {activeSubTab === 'scripts' && (
        <div className="space-y-4">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase">Jumla ya Makabidhiano ya Script</div>
                <div className="text-lg font-black text-slate-900">{scriptRecords.length} Awamu</div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase">Zinasahihishwa na Walimu</div>
                <div className="text-lg font-black text-amber-700">
                  {scriptRecords.filter(r => r.status !== 'COMPLETED_AND_RETURNED').length} Vikundi
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase">Zimesahasishwa & Kurudishwa</div>
                <div className="text-lg font-black text-emerald-700">
                  {scriptRecords.filter(r => r.status === 'COMPLETED_AND_RETURNED').length} Vikundi
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="font-black text-xs text-slate-900 uppercase flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <span>Form ya Udhibiti wa Script za Watahiniwa Zilizochukuliwa na Walimu Kwenda Kusahihishwa</span>
              </div>
              <span className="text-xs font-bold text-slate-500">{filteredScripts.length} Awamu</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200">#</th>
                    <th className="p-3 border-r border-slate-200">Mtihani & Somo</th>
                    <th className="p-3 border-r border-slate-200">Darasa</th>
                    <th className="p-3 border-r border-slate-200">Mwalimu Aliyechukua Script</th>
                    <th className="p-3 border-r border-slate-200 text-center">Idadi ya Script</th>
                    <th className="p-3 border-r border-slate-200">Muda wa Kuchukua</th>
                    <th className="p-3 border-r border-slate-200">Tarehe ya Mwisho (Deadline)</th>
                    <th className="p-3 border-r border-slate-200 text-center">Hali ya Usahihishaji</th>
                    <th className="p-3 text-center">Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        Inapakia kumbukumbu za script za usahihishaji...
                      </td>
                    </tr>
                  ) : filteredScripts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <Send className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">Hakuna kumbukumbu za script zilizotolewa kusaishwa.</p>
                        <p className="text-xs text-slate-400 mt-1">Tumia kitufe cha '+ Sajili Script Zilizochukuliwa' kuanza.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredScripts.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>

                        <td className="p-3 border-r border-slate-200">
                          <div className="font-black text-slate-900">{item.subject}</div>
                          <div className="text-[10px] text-purple-700 font-bold">{item.examName}</div>
                        </td>

                        <td className="p-3 border-r border-slate-200">
                          <span className="font-bold text-slate-800">{item.className} {item.stream ? `(${item.stream})` : ''}</span>
                        </td>

                        <td className="p-3 border-r border-slate-200">
                          <div className="font-black text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{item.teacherName}</span>
                          </div>
                        </td>

                        <td className="p-3 border-r border-slate-200 text-center">
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 font-black rounded-lg">
                            {item.scriptsCount} Scripts
                          </span>
                        </td>

                        <td className="p-3 border-r border-slate-200">
                          <div className="font-mono font-bold text-slate-800">{item.checkoutDate} {item.checkoutTime}</div>
                          <div className="text-[10px] text-slate-400">Mtoaji: {item.issuedBy}</div>
                        </td>

                        <td className="p-3 border-r border-slate-200">
                          <div className="font-mono font-bold text-rose-800">{item.markingDeadline}</div>
                        </td>

                        <td className="p-3 border-r border-slate-200 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleScriptReturned(item)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer transition shadow-2xs ${
                              item.status === 'COMPLETED_AND_RETURNED'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse'
                            }`}
                          >
                            {item.status === 'COMPLETED_AND_RETURNED' ? '✓ Zimesahihishwa & Kurudishwa' : '🟡 Zinasahihishwa'}
                          </button>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingScriptId(item.id);
                                setScriptFormData(item);
                                setIsScriptModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Hariri"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteScript(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Futa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODULE 4: MFUMO WA MAKADIRIO YA REAM NA URUDUFISHAJI WA MITIHANI      */}
      {/* ========================================================================= */}
      {activeSubTab === 'reams' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Top Grand Summary Banner */}
          <div className="p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white rounded-3xl shadow-lg border border-indigo-800/60">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black shrink-0">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                    Mfumo wa Makadirio ya Karatasi & Ream za Urudufishaji ({selectedExamFilter})
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Hesabu ya Ream kwa Kufuata Ratiba ya Mtihani wa Kila Somo na Kila Kidato
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Ingiza idadi ya wanafunzi kwa kila kidato na idadi ya kurasa (pages) za kila mtihani ili kujua jumla ya karatasi na Ream zote zitakazotumika.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSyncReamsFromTimetable(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                >
                  <Layers className="w-4 h-4 text-amber-300" />
                  <span>🔄 Sawazisha na Ratiba ya Mtihani</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDFReport('download', 'ream_calculator')}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Pakua PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDFReport('print', 'ream_calculator')}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Chapisha Makadirio (Print)</span>
                </button>
              </div>
            </div>

            {/* 4 Key Ream Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black uppercase text-blue-200">Jumla ya Mitihani (Masomo)</div>
                <div className="text-xl font-black text-white mt-0.5">{reamSummary.totalSubjects} Mitihani</div>
                <div className="text-[10px] text-blue-300 mt-0.5">Wanafunzi wote: {reamSummary.totalStudents.toLocaleString()}</div>
              </div>
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                <div className="text-[10px] font-black uppercase text-blue-200">Jumla ya Karatasi (Sheets)</div>
                <div className="text-xl font-black text-amber-300 mt-0.5">
                  {reamSummary.totalSheets.toLocaleString()} Sheets
                </div>
                <div className="text-[10px] text-blue-300 mt-0.5">
                  Ream {reamSummary.fullReamsPart} + Karatasi {reamSummary.remainderSheets}
                </div>
              </div>
              <div className="p-3.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/40">
                <div className="text-[10px] font-black uppercase text-emerald-200">Makadirio Halisi ya Ream</div>
                <div className="text-xl font-black text-emerald-300 mt-0.5">
                  {reamSummary.exactReams.toFixed(2)} Reams
                </div>
                <div className="text-[10px] text-emerald-200 mt-0.5">
                  1 Ream = Karatasi {reamConfig.sheetsPerReam}
                </div>
              </div>
              <div className="p-3.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
                <div className="text-[10px] font-black uppercase text-slate-800">Ream za Kuagiza Stoo (Nje)</div>
                <div className="text-2xl font-black text-slate-950 mt-0.5">
                  {reamSummary.wholeReamsToBuy} Ream Kamili
                </div>
                <div className="text-[10px] font-bold text-slate-800 mt-0.5">
                  Gharama: TZS {reamSummary.totalEstimatedCost.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 1: IDADI YA WANAFUNZI KWA KILA KIDATO & MIPANGILIO YA URUDUFISHAJI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Student Counts Per Form */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>1. Ingiza Idadi ya Wanafunzi kwa Kila Kidato (Darasa Zima)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Mfano: Kama Form 1 ina wanafunzi 200 na mtihani wa Basic Mathematics una kurasa 4 (karatasi 2 kwa mwanafunzi), itatumia karatasi 400.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DEFAULT_CLASSES.map(cls => {
                  const count = reamConfig.classStudentCounts[cls] ?? 150;
                  const classStat = reamSummary.classBreakdown.find(c => c.className === cls) || {
                    subjectsCount: 0,
                    totalSheets: 0,
                    exactReams: 0,
                    wholeReams: 0
                  };
                  return (
                    <div key={cls} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 uppercase">{cls}</span>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                          {classStat.subjectsCount} Masomo
                        </span>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Idadi ya Wanafunzi:</label>
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          value={count}
                          onChange={e => {
                            const val = Math.max(1, Number(e.target.value) || 0);
                            const nextConfig: ExamReamConfig = {
                              ...reamConfig,
                              classStudentCounts: {
                                ...reamConfig.classStudentCounts,
                                [cls]: val,
                              },
                            };
                            saveReamState(nextConfig, reamItems);
                          }}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500">{classStat.totalSheets.toLocaleString()} Karatasi</span>
                        <span className="font-black text-emerald-700">{classStat.exactReams.toFixed(2)} Ream</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duplication Mode Settings (Duplex vs Single-sided, Sheets per Ream, Buffer) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>2. Mfumo wa Uchapishaji (Pande Mbili vs Upande Mmoja)</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Chagua kama mashine inatoa kopi pande mbili (kurasa 4 = karatasi 2) au upande mmoja.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => saveReamState({ ...reamConfig, printDoubleSided: true }, reamItems)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    reamConfig.printDoubleSided
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-black flex items-center justify-between">
                    <span>📄 Pande Mbili (Duplex)</span>
                    {reamConfig.printDoubleSided && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-[10px] mt-1 font-medium text-slate-600">
                    Kurasa 2 kwenye karatasi 1 (Mf: Kurasa 4 = Karatasi 2 kwa mwanafunzi)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => saveReamState({ ...reamConfig, printDoubleSided: false }, reamItems)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    !reamConfig.printDoubleSided
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-black flex items-center justify-between">
                    <span>📃 Upande Mmoja (Single)</span>
                    {!reamConfig.printDoubleSided && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-[10px] mt-1 font-medium text-slate-600">
                    Ukurasa 1 kwenye karatasi 1 (Mf: Kurasa 4 = Karatasi 4 kwa mwanafunzi)
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Karatasi / Ream:</label>
                  <input
                    type="number"
                    min={100}
                    max={1000}
                    value={reamConfig.sheetsPerReam}
                    onChange={e => saveReamState({ ...reamConfig, sheetsPerReam: Math.max(1, Number(e.target.value) || 500) }, reamItems)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Kopi za Ziada/Somo:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={reamConfig.extraCopiesPerSubject}
                    onChange={e => saveReamState({ ...reamConfig, extraCopiesPerSubject: Math.max(0, Number(e.target.value) || 0) }, reamItems)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black"
                    title="Kopi za ziada kwa kila somo (kwa ajili ya wasimamizi na faili la ofisi)"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Bei ya 1 Ream (TZS):</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={reamConfig.pricePerReam}
                    onChange={e => saveReamState({ ...reamConfig, pricePerReam: Math.max(0, Number(e.target.value) || 0) }, reamItems)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ADD SUBJECT TO REAM CALCULATOR */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Ongeza Somo kwa Kidato:</label>
                <select
                  value={newReamClass}
                  onChange={e => setNewReamClass(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Somo (Subject):</label>
                <select
                  value={newReamSubject}
                  onChange={e => setNewReamSubject(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {SUBJECT_LIST.map((s, idx) => {
                    const name = typeof s === 'string' ? s : s.name;
                    return <option key={idx} value={name}>{name}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Idadi ya Maswali:</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newReamQuestions}
                  onChange={e => setNewReamQuestions(Math.max(1, Number(e.target.value) || 10))}
                  className="w-24 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 block mb-1">Kurasa za Mtihani (Pages):</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={newReamPages}
                  onChange={e => setNewReamPages(Math.max(1, Number(e.target.value) || 4))}
                  className="w-24 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-center"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetExam = selectedExamFilter !== 'ALL_EXAMS' ? selectedExamFilter : (activeExamTitle || 'Terminal Examination 2026');
                  const nextItem: ExamReamSubjectItem = {
                    id: `ream_custom_${Date.now()}`,
                    examName: targetExam,
                    className: newReamClass,
                    subject: newReamSubject,
                    examDate: new Date().toISOString().split('T')[0],
                    pagesCount: newReamPages,
                    questionsCount: newReamQuestions
                  };
                  saveReamState(reamConfig, [nextItem, ...reamItems]);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ongeza Somo Hili</span>
              </button>
            </div>
            <div className="text-[11px] font-bold text-slate-500">
              Mfumo: <span className="text-indigo-900 font-black">{reamSummary.printModeLabel}</span>
            </div>
          </div>

          {/* STEP 2: JEDWALI LA MAKADIRIO YA KARATASI NA REAM KWA KILA SOMO NA KILA KIDATO */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span className="font-black text-xs text-slate-900 uppercase">
                  Jedwali la Urudufishaji wa Mitihani kwa Kila Kidato na Kila Somo ({selectedExamFilter})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">Chuja Kidato:</span>
                <button
                  type="button"
                  onClick={() => setClassFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition ${
                    classFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Vidato Vyote ({computedReamRows.length})
                </button>
                {DEFAULT_CLASSES.map(cls => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassFilter(cls)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition ${
                      classFilter === cls ? 'bg-indigo-600 text-white' : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3 border-r border-slate-200 text-center">#</th>
                    <th className="p-3 border-r border-slate-200">Kidato (Darasa Zima)</th>
                    <th className="p-3 border-r border-slate-200">Somo la Mtihani</th>
                    <th className="p-3 border-r border-slate-200">Tarehe ya Mtihani</th>
                    <th className="p-3 border-r border-slate-200 text-center">Idadi ya Wanafunzi</th>
                    <th className="p-3 border-r border-slate-200 text-center">Idadi ya Maswali</th>
                    <th className="p-3 border-r border-slate-200 text-center">
                      Kurasa (Pages)
                    </th>
                    <th className="p-3 border-r border-slate-200 text-center">
                      Idadi ya Karatasi / Mwanafunzi
                    </th>
                    <th className="p-3 border-r border-slate-200 text-center">
                      Jumla ya Karatasi (Sheets)
                    </th>
                    <th className="p-3 border-r border-slate-200 text-center">
                      Idadi ya Ream
                    </th>
                    <th className="p-3 text-center">Hatua (Edit / Futa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {computedReamRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-400">
                        <Printer className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">Hakuna masomo yaliyopatikana kwenye makadirio ya Ream.</p>
                        <button
                          type="button"
                          onClick={() => handleSyncReamsFromTimetable(true)}
                          className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer"
                        >
                          🔄 Vuta Masomo Kutoka Ratiba ya Mtihani
                        </button>
                      </td>
                    </tr>
                  ) : (
                    computedReamRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-200">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-950 border border-indigo-200 font-black text-xs">
                            {row.className}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-black text-slate-900">{row.subject}</div>
                        </td>
                        <td className="p-3 border-r border-slate-200 text-[11px] text-slate-600 font-mono">
                          {row.examDate ? `${row.examDate} (${getSwahiliDayInfo(row.examDate).label})` : 'Ratiba ya Mtihani'}
                        </td>
                        {/* IDADI YA WANAFUNZI (Inline Editable) */}
                        <td className="p-3 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={2000}
                              value={row.studentCount}
                              onChange={e => {
                                const countVal = Math.max(1, Number(e.target.value) || 1);
                                const updated = reamItems.map(it =>
                                  it.id === row.id ? { ...it, customStudentCount: countVal } : it
                                );
                                saveReamState(reamConfig, updated);
                              }}
                              className="w-16 p-1.5 bg-indigo-50/70 border border-indigo-300 rounded-xl text-center font-black text-xs text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                              title="Hariri idadi ya wanafunzi wa somo hili"
                            />
                            <span className="text-[10px] font-bold text-slate-500">Wanafunzi</span>
                          </div>
                          {row.extraCopies > 0 && (
                            <div className="text-[9px] text-slate-400 mt-0.5">+{row.extraCopies} ziada = {row.totalCopies}</div>
                          )}
                        </td>
                        {/* IDADI YA MASWALI (Inline Editable) */}
                        <td className="p-3 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={150}
                              value={row.questionsCount}
                              onChange={e => {
                                const qCount = Math.max(1, Number(e.target.value) || 1);
                                const updated = reamItems.map(it =>
                                  it.id === row.id ? { ...it, questionsCount: qCount } : it
                                );
                                saveReamState(reamConfig, updated);
                              }}
                              className="w-14 p-1.5 bg-purple-50 border border-purple-300 rounded-xl text-center font-black text-xs text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none"
                              title="Hariri idadi ya maswali ya mtihani huu"
                            />
                            <span className="text-[10px] font-bold text-slate-600">Maswali</span>
                          </div>
                        </td>
                        {/* KURASA ZA MTIHANI (PAGES) */}
                        <td className="p-3 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={row.pagesCount}
                              onChange={e => {
                                const pages = Math.max(1, Number(e.target.value) || 1);
                                const autoSheets = reamConfig.printDoubleSided ? Math.ceil(pages / 2) : pages;
                                const updated = reamItems.map(it =>
                                  it.id === row.id
                                    ? { ...it, pagesCount: pages, customSheetsPerStudent: autoSheets }
                                    : it
                                );
                                saveReamState(reamConfig, updated);
                              }}
                              className="w-14 p-1.5 bg-amber-50 border border-amber-300 rounded-xl text-center font-black text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="text-[10px] font-bold text-slate-600">Pages</span>
                          </div>
                        </td>
                        {/* IDADI YA KARATASI / MWANAFUNZI (Inline Editable) */}
                        <td className="p-3 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={row.sheetsPerStudent}
                              onChange={e => {
                                const sheets = Math.max(1, Number(e.target.value) || 1);
                                const syncedPages = reamConfig.printDoubleSided ? sheets * 2 : sheets;
                                const updated = reamItems.map(it =>
                                  it.id === row.id
                                    ? { ...it, customSheetsPerStudent: sheets, pagesCount: syncedPages }
                                    : it
                                );
                                saveReamState(reamConfig, updated);
                              }}
                              className="w-14 p-1.5 bg-blue-50 border-2 border-blue-300 rounded-xl text-center font-black text-xs text-blue-950 focus:ring-2 focus:ring-blue-500 outline-none"
                              title="Hariri idadi ya karatasi (sheets) kwa kila mwanafunzi"
                            />
                            <span className="text-[10px] font-black text-blue-900">Karatasi</span>
                          </div>
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            ({row.pagesCount} pages ÷ {reamConfig.printDoubleSided ? '2' : '1'})
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 text-center">
                          <span className="font-black text-sm text-slate-900">
                            {row.totalSheets.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            ({row.totalCopies} × {row.sheetsPerStudent})
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 text-center">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 font-black text-xs">
                            {row.reamsRequired.toFixed(2)} Ream
                          </span>
                        </td>
                        {/* HATUA: EDIT (HARIRI) & DELETE (FUTA) */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReamData({
                                  id: row.id,
                                  className: row.className,
                                  subject: row.subject,
                                  examDate: row.examDate || new Date().toISOString().split('T')[0],
                                  studentCount: row.studentCount,
                                  applyStudentsToWholeClass: false,
                                  questionsCount: row.questionsCount,
                                  pagesCount: row.pagesCount,
                                  sheetsPerStudent: row.sheetsPerStudent
                                });
                                setIsReamEditModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                              title="Hariri idadi ya karatasi, maswali na idadi ya wanafunzi"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = reamItems.filter(it => it.id !== row.id);
                                saveReamState(reamConfig, updated);
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                              title="Ondoa somo hili kwenye makadirio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {computedReamRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td colSpan={8} className="p-3.5 text-right uppercase tracking-wider text-amber-300">
                        JUMLA KUU YA KARATASI & REAM KWA MTIHANI MZIMA ({selectedExamFilter}):
                      </td>
                      <td className="p-3.5 text-center text-sm text-amber-300">
                        {reamSummary.totalSheets.toLocaleString()} Sheets
                      </td>
                      <td colSpan={2} className="p-3.5 text-center text-sm text-emerald-300">
                        {reamSummary.exactReams.toFixed(2)} Ream (Agiza Ream {reamSummary.wholeReamsToBuy})
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* MODAL: EDIT REAM SUBJECT ROW (IDADI YA KARATASI, MASWALI NA IDADI YA WANAFUNZI) */}
          {isReamEditModalOpen && editingReamData && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto">
                <div className="bg-indigo-950 text-white p-5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Edit3 className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wide">
                        Hariri Urudufishaji: Wanafunzi, Maswali & Karatasi
                      </h3>
                      <p className="text-[11px] text-indigo-200">
                        {editingReamData.subject} — {editingReamData.className}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReamEditModalOpen(false);
                      setEditingReamData(null);
                    }}
                    className="p-1 text-white/70 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!editingReamData) return;

                    let nextConfig = { ...reamConfig };
                    if (editingReamData.applyStudentsToWholeClass) {
                      nextConfig = {
                        ...reamConfig,
                        classStudentCounts: {
                          ...reamConfig.classStudentCounts,
                          [editingReamData.className]: editingReamData.studentCount
                        }
                      };
                    }

                    const updatedItems = reamItems.map(it => {
                      if (it.id === editingReamData.id) {
                        return {
                          ...it,
                          className: editingReamData.className,
                          subject: editingReamData.subject,
                          examDate: editingReamData.examDate,
                          customStudentCount: editingReamData.studentCount,
                          questionsCount: editingReamData.questionsCount,
                          pagesCount: editingReamData.pagesCount,
                          customSheetsPerStudent: editingReamData.sheetsPerStudent
                        };
                      }
                      if (editingReamData.applyStudentsToWholeClass && normalizeWholeClassName(it.className) === editingReamData.className) {
                        return {
                          ...it,
                          customStudentCount: editingReamData.studentCount
                        };
                      }
                      return it;
                    });

                    saveReamState(nextConfig, updatedItems);
                    setIsReamEditModalOpen(false);
                    setEditingReamData(null);
                    setAlertNotice({
                      type: 'success',
                      message: `✓ Taarifa za urudufishaji wa ${editingReamData.subject} (${editingReamData.className}) zimehifadhiwa kikamilifu!`
                    });
                  }}
                  className="p-6 space-y-4 overflow-y-auto flex-1"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Kidato (Darasa Zima):</label>
                      <select
                        value={editingReamData.className}
                        onChange={e => setEditingReamData({ ...editingReamData, className: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                      >
                        {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Somo la Mtihani:</label>
                      <input
                        type="text"
                        value={editingReamData.subject}
                        onChange={e => setEditingReamData({ ...editingReamData, subject: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                    <div>
                      <label className="text-[11px] font-black uppercase text-indigo-950 block mb-1">
                        1. Idadi ya Wanafunzi (Student Count):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={2500}
                        value={editingReamData.studentCount}
                        onChange={e =>
                          setEditingReamData({
                            ...editingReamData,
                            studentCount: Math.max(1, Number(e.target.value) || 1)
                          })
                        }
                        className="w-full p-2.5 bg-white border-2 border-indigo-300 rounded-xl text-sm font-black text-indigo-950"
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingReamData.applyStudentsToWholeClass}
                        onChange={e =>
                          setEditingReamData({
                            ...editingReamData,
                            applyStudentsToWholeClass: e.target.checked
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span>Tumia idadi hii ya wanafunzi kwa masomo yote ya {editingReamData.className}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-black uppercase text-purple-900 block mb-1">
                        2. Idadi ya Maswali:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={editingReamData.questionsCount}
                        onChange={e =>
                          setEditingReamData({
                            ...editingReamData,
                            questionsCount: Math.max(1, Number(e.target.value) || 1)
                          })
                        }
                        className="w-full p-2.5 bg-purple-50 border-2 border-purple-300 rounded-xl text-sm font-black text-purple-950 text-center"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-amber-900 block mb-1">
                        3. Kurasa (Pages):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editingReamData.pagesCount}
                        onChange={e => {
                          const pages = Math.max(1, Number(e.target.value) || 1);
                          const autoSheets = reamConfig.printDoubleSided ? Math.ceil(pages / 2) : pages;
                          setEditingReamData({
                            ...editingReamData,
                            pagesCount: pages,
                            sheetsPerStudent: autoSheets
                          });
                        }}
                        className="w-full p-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-sm font-black text-slate-900 text-center"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-blue-900 block mb-1">
                        4. Karatasi / Mwanafunzi:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={editingReamData.sheetsPerStudent}
                        onChange={e => {
                          const sheets = Math.max(1, Number(e.target.value) || 1);
                          const syncedPages = reamConfig.printDoubleSided ? sheets * 2 : sheets;
                          setEditingReamData({
                            ...editingReamData,
                            sheetsPerStudent: sheets,
                            pagesCount: syncedPages
                          });
                        }}
                        className="w-full p-2.5 bg-blue-50 border-2 border-blue-400 rounded-xl text-sm font-black text-blue-950 text-center"
                        required
                      />
                    </div>
                  </div>

                  {/* Live Calculation Preview */}
                  {(() => {
                    const totalCopies = editingReamData.studentCount + (reamConfig.extraCopiesPerSubject || 0);
                    const totalSheets = totalCopies * editingReamData.sheetsPerStudent;
                    const totalReams = totalSheets / (reamConfig.sheetsPerReam || 500);
                    return (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-black text-emerald-950 uppercase">Makadirio ya Somo Hili:</div>
                          <div className="text-emerald-800 font-semibold mt-0.5">
                            {totalCopies} Kopi × {editingReamData.sheetsPerStudent} Karatasi • Maswali {editingReamData.questionsCount}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">{totalSheets.toLocaleString()} Karatasi</div>
                          <div className="text-xs font-black text-emerald-700">= {totalReams.toFixed(2)} Ream</div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsReamEditModalOpen(false);
                        setEditingReamData(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Ghairi
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    >
                      ✓ Hifadhi Marekebisho
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EXAM DISPATCH FORM (MITIHANI VYUMBANI)                           */}
      {/* ========================================================================= */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingDispatchId ? 'Hariri Mtihani Uliochukuliwa' : 'Kusajili Mtihani Uliochukuliwa Kwenda Vyumbani'}
                </h3>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="p-1 text-white/70 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDispatch} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Jina la Mtihani:</label>
                  <input
                    type="text"
                    value={dispatchFormData.examName}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, examName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Somo (Subject):</label>
                  <select
                    value={dispatchFormData.subject}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, subject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    {SUBJECT_LIST.map((s, idx) => {
                      const name = typeof s === 'string' ? s : s.name;
                      return <option key={idx} value={name}>{name}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Darasa:</label>
                  <select
                    value={dispatchFormData.className}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, className: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Mkondo:</label>
                  <input
                    type="text"
                    value={dispatchFormData.stream}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, stream: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Chumba / Venue:</label>
                  <input
                    type="text"
                    value={dispatchFormData.roomVenue}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, roomVenue: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Helper Bar: Scheduled Invigilator from Timetable */}
              {(() => {
                const scheduledInv = findScheduledInvigilator(dispatchFormData.subject, dispatchFormData.className, dispatchFormData.date);
                if (!scheduledInv) return null;
                return (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-700 block">
                        Msimamizi Aliye kwenye Ratiba ya Mtihani:
                      </span>
                      <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5 mt-0.5">
                        <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{scheduledInv.teacher.name} — {scheduledInv.venue}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDispatchFormData({
                        ...dispatchFormData,
                        invigilatorName: scheduledInv.teacher.name,
                        roomVenue: scheduledInv.venue
                      })}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition"
                    >
                      Vuta Kutoka Ratibani
                    </button>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Msimamizi (Invigilator):</label>
                  <select
                    value={dispatchFormData.invigilatorName}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, invigilatorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Idadi ya Bahasha:</label>
                  <input
                    type="number"
                    value={dispatchFormData.envelopesIssuedCount}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, envelopesIssuedCount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Tarehe:</label>
                  <input
                    type="date"
                    value={dispatchFormData.date}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Muda wa Kuchukua:</label>
                  <input
                    type="time"
                    value={dispatchFormData.checkoutTime}
                    onChange={e => setDispatchFormData({ ...dispatchFormData, checkoutTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>

              {/* Status toggle inside modal */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <label className="text-xs font-black uppercase text-blue-900 block">Hali ya Mtihani:</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="disp_status"
                      checked={dispatchFormData.status === 'CHECKED_OUT'}
                      onChange={() => setDispatchFormData({ ...dispatchFormData, status: 'CHECKED_OUT' })}
                      className="text-amber-600"
                    />
                    <span>Vyumbani (Inasimamiwa)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="disp_status"
                      checked={dispatchFormData.status === 'RETURNED'}
                      onChange={() => setDispatchFormData({ 
                        ...dispatchFormData, 
                        status: 'RETURNED', 
                        returnTime: dispatchFormData.returnTime || new Date().toTimeString().substring(0, 5),
                        scriptsReturnedCount: dispatchFormData.scriptsReturnedCount || 40
                      })}
                      className="text-emerald-600"
                    />
                    <span>Imerejeshwa (Returned)</span>
                  </label>
                </div>
              </div>

              {dispatchFormData.status === 'RETURNED' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div>
                    <label className="text-[11px] font-black uppercase text-emerald-900 block mb-1">Muda wa Kurudisha:</label>
                    <input
                      type="time"
                      value={dispatchFormData.returnTime}
                      onChange={e => setDispatchFormData({ ...dispatchFormData, returnTime: e.target.value })}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase text-emerald-900 block mb-1">Script Zilizorudishwa:</label>
                    <input
                      type="number"
                      value={dispatchFormData.scriptsReturnedCount}
                      onChange={e => setDispatchFormData({ ...dispatchFormData, scriptsReturnedCount: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow-md"
                >
                  Hifadhi Kumbukumbu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EXAM SETTING FORM (UTUNGAJI MITIHANI)                            */}
      {/* ========================================================================= */}
      {isSettingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-emerald-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingSettingId ? 'Hariri Taarifa za Utungaji' : 'Sajili Somo & Mwalimu Anayetunga Mtihani'}
                </h3>
              </div>
              <button onClick={() => setIsSettingModalOpen(false)} className="p-1 text-white/70 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSetting} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Jina la Mtihani:</label>
                  <input
                    type="text"
                    value={settingFormData.examName}
                    onChange={e => setSettingFormData({ ...settingFormData, examName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Muhula (Term):</label>
                  <select
                    value={settingFormData.term}
                    onChange={e => setSettingFormData({ ...settingFormData, term: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Somo (Subject):</label>
                  <select
                    value={settingFormData.subject}
                    onChange={e => setSettingFormData({ ...settingFormData, subject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    {SUBJECT_LIST.map((s, idx) => {
                      const name = typeof s === 'string' ? s : s.name;
                      return <option key={idx} value={name}>{name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Darasa:</label>
                  <select
                    value={settingFormData.className}
                    onChange={e => setSettingFormData({ ...settingFormData, className: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Option to pick registered subject teacher (Requirement 2) */}
              {(() => {
                const regTeachers = getRegisteredSubjectTeachers(settingFormData.subject, settingFormData.className);
                if (regTeachers.length >= 2) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Waalimu {regTeachers.length} Waliosajiliwa Somo hili ({settingFormData.className}):</span>
                        </label>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase">
                          Chagua Mwalimu
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Kuna waalimu {regTeachers.length} waliosajiliwa somo la <strong>{settingFormData.subject}</strong> ({settingFormData.className}). Chagua mwalimu mhusika anayetunga au kuwasilisha mtihani huu:
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {regTeachers.map(t => (
                          <label key={t.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                            settingFormData.teacherName === t.name 
                              ? 'bg-amber-100 border-amber-400 font-black text-amber-950 ring-2 ring-amber-300' 
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold'
                          }`}>
                            <input
                              type="radio"
                              name="setting_teacher_choice"
                              checked={settingFormData.teacherName === t.name}
                              onChange={() => setSettingFormData({ ...settingFormData, teacherName: t.name })}
                              className="w-4 h-4 text-amber-600 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {t.initial || t.name.substring(0, 2)}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{t.name}</span>
                              {t.schoolRole && (
                                <span className="text-[10px] text-slate-500 font-normal">({t.schoolRole})</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                } else if (regTeachers.length === 1) {
                  return (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
                      <span>✓ Mwalimu pekee aliyesajiliwa wa somo hili: <strong>{regTeachers[0].name}</strong></span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black uppercase">Aliyesajiliwa</span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Mwalimu Mhusika:</label>
                  <select
                    value={settingFormData.teacherName}
                    onChange={e => setSettingFormData({ ...settingFormData, teacherName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Tarehe ya Mwisho (Deadline):</label>
                  <input
                    type="date"
                    value={settingFormData.deadlineDate}
                    onChange={e => setSettingFormData({ ...settingFormData, deadlineDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Teacher Registered Profile Verification & HOD Override (Requirement 2) */}
              {(() => {
                const selectedTeacherObj = teachers.find(t => t.name === settingFormData.teacherName);
                if (!selectedTeacherObj) return null;

                const regSubs = selectedTeacherObj.subjects || [];
                const teachesSub = !settingFormData.subject || regSubs.length === 0 || regSubs.some(s => {
                  const sClean = s.toLowerCase().trim();
                  const fClean = (settingFormData.subject || '').toLowerCase().trim();
                  return sClean === fClean || sClean.includes(fClean) || fClean.includes(sClean);
                });

                const teacherClasses = Array.from(new Set(
                  (selectedTeacherObj.teachingStreams || []).map(str => str.split('-')[0].trim().toLowerCase())
                ));
                const targetClassLower = (settingFormData.className || '').toLowerCase().trim();
                const teachesCls = teacherClasses.length === 0 || teacherClasses.some(c => c.includes(targetClassLower) || targetClassLower.includes(c));

                const isMismatch = !teachesSub || !teachesCls;

                return (
                  <div className="space-y-2.5 pt-1">
                    {/* Teacher profile badges */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] space-y-1.5">
                      <div className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Wasifu wa Usajili wa Mwalimu:</span>
                        <span className="font-black text-slate-900">{selectedTeacherObj.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-500 font-semibold">Masomo Aliyosajiliwa:</span>
                        {regSubs.length > 0 ? (
                          regSubs.map((s, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              s.toLowerCase().trim() === (settingFormData.subject || '').toLowerCase().trim()
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}>{s}</span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Hayajawekwa (Anaruhusiwa)</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-500 font-semibold">Madarasa Anayofundisha:</span>
                        {teacherClasses.length > 0 ? (
                          teacherClasses.map((c, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              c.toLowerCase() === targetClassLower
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}>{c}</span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Madarasa Yote (Hajagawiwa mkondo mahususi)</span>
                        )}
                      </div>
                    </div>

                    {/* Mismatch Alert & HOD Override Option */}
                    {isMismatch && (
                      <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2.5 animate-in fade-in">
                        <div className="flex items-start gap-2 text-rose-900 text-xs font-bold leading-snug">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-black uppercase tracking-wide text-rose-950">
                              ⚠️ MWALIMU HAJAPANGIWA DARASA AU SOMO HILI!
                            </p>
                            <p className="text-[11px] font-medium text-rose-800 mt-0.5">
                              Mwalimu <strong>{selectedTeacherObj.name}</strong> hajasajiliwa kufundisha somo la <strong>{settingFormData.subject}</strong> kwa <strong>{settingFormData.className}</strong>. Kulingana na mfumo, hawezi kutunga mtihani huu isipokuwa apewe <strong>Uteuzi Maalumu na Mkuu wa Idara (HOD)</strong> au Uongozi wa Shule.
                            </p>
                          </div>
                        </div>

                        <label className="flex items-center gap-2.5 p-2 bg-white border border-rose-200 rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!settingFormData.isHODOverride}
                            onChange={e => setSettingFormData({ ...settingFormData, isHODOverride: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-900">
                            Thibitisha Uteuzi Maalumu wa Mkuu wa Idara (HOD) / Uongozi wa Shule (Override)
                          </span>
                        </label>

                        {settingFormData.isHODOverride && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Mamlaka Iliyoteua:</label>
                              <select
                                value={settingFormData.assignedByRole || 'Head of Department (HOD)'}
                                onChange={e => setSettingFormData({ ...settingFormData, assignedByRole: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                              >
                                <option value="Head of Department (HOD) - Science">Mkuu wa Idara (HOD) - Sayansi</option>
                                <option value="Head of Department (HOD) - Mathematics">Mkuu wa Idara (HOD) - Hisabati</option>
                                <option value="Head of Department (HOD) - Languages">Mkuu wa Idara (HOD) - Lugha</option>
                                <option value="Head of Department (HOD) - Arts">Mkuu wa Idara (HOD) - Sanaa</option>
                                <option value="Academic Master">Mwalimu Mkuu wa Taaluma</option>
                                <option value="Headmaster / Headmistress">Mkuu wa Shule</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Sababu ya Uteuzi:</label>
                              <input
                                type="text"
                                placeholder="e.g. Uteuzi Maalumu wa Dharura"
                                value={settingFormData.overrideReason || ''}
                                onChange={e => setSettingFormData({ ...settingFormData, overrideReason: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Hali ya Utungaji (Status):</label>
                  <select
                    value={settingFormData.status}
                    onChange={e => setSettingFormData({ ...settingFormData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="NOT_SET">🔴 Bado Haijatungwa (Pending)</option>
                    <option value="IN_PROGRESS">🟡 Inatungwa (In Progress)</option>
                    <option value="SUBMITTED">🔵 Imeshatungwa & Kuwasilishwa</option>
                    <option value="VETTED">🟣 Imehakikiwa (Vetted & Approved)</option>
                    <option value="PRINTED_AND_SEALED">🟢 Imechapishwa & Kuwekwa Seals</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Ushiriki wa Utungaji:</label>
                  <select
                    value={settingFormData.isInvolved === false ? 'NO' : 'YES'}
                    onChange={e => setSettingFormData({ ...settingFormData, isInvolved: e.target.value === 'YES' })}
                    className={`w-full p-2.5 border rounded-xl text-xs font-black ${
                      settingFormData.isInvolved === false
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}
                  >
                    <option value="YES">✓ Anahusika kwenye Utungaji (Ingiza Ripoti)</option>
                    <option value="NO">🚫 Hahusiki kwenye Utungaji (Ondoa Ripoti)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md"
                >
                  Hifadhi Taarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXAM SCRIPT MARKING FORM (SCRIPT ZA KUSAHIHISHA)                */}
      {/* ========================================================================= */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-purple-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingScriptId ? 'Hariri Script Zilizotolewa' : 'Sajili Script Zilizochukuliwa na Mwalimu Kusahihishwa'}
                </h3>
              </div>
              <button onClick={() => setIsScriptModalOpen(false)} className="p-1 text-white/70 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScript} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Jina la Mtihani:</label>
                  <input
                    type="text"
                    value={scriptFormData.examName}
                    onChange={e => setScriptFormData({ ...scriptFormData, examName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Somo (Subject):</label>
                  <select
                    value={scriptFormData.subject}
                    onChange={e => setScriptFormData({ ...scriptFormData, subject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    {SUBJECT_LIST.map((s, idx) => {
                      const name = typeof s === 'string' ? s : s.name;
                      return <option key={idx} value={name}>{name}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Darasa:</label>
                  <select
                    value={scriptFormData.className}
                    onChange={e => setScriptFormData({ ...scriptFormData, className: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Mkondo:</label>
                  <input
                    type="text"
                    value={scriptFormData.stream}
                    onChange={e => setScriptFormData({ ...scriptFormData, stream: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Idadi ya Script:</label>
                  <input
                    type="number"
                    value={scriptFormData.scriptsCount}
                    onChange={e => setScriptFormData({ ...scriptFormData, scriptsCount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Mwalimu Aliyechukua Script:</label>
                  <select
                    value={scriptFormData.teacherName}
                    onChange={e => setScriptFormData({ ...scriptFormData, teacherName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    required
                  >
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Tarehe ya Mwisho (Deadline):</label>
                  <input
                    type="date"
                    value={scriptFormData.markingDeadline}
                    onChange={e => setScriptFormData({ ...scriptFormData, markingDeadline: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Tarehe ya Kuchukua:</label>
                  <input
                    type="date"
                    value={scriptFormData.checkoutDate}
                    onChange={e => setScriptFormData({ ...scriptFormData, checkoutDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Muda wa Kuchukua:</label>
                  <input
                    type="time"
                    value={scriptFormData.checkoutTime}
                    onChange={e => setScriptFormData({ ...scriptFormData, checkoutTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsScriptModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-md"
                >
                  Hifadhi Kumbukumbu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRINTABLE EXAM RETURN RECONCILIATION REPORT (CHAPISHA RIPOTI)    */}
      {/* ========================================================================= */}
      {isPrintReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Action Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Ripoti ya Urejesho wa Mitihani (Nani Karudisha vs Nani Hajarudisha)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Chapisha Sasa (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintReportModalOpen(false)}
                  className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 space-y-6 text-slate-900 bg-white" id="printable-exam-reconciliation-report">
              {/* Official Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="text-xs font-black uppercase tracking-widest text-slate-600">
                  JAMHURI YA MUUNGANO WA TANZANIA • OFISI YA RAIS - TAMISEMI
                </div>
                <h1 className="text-xl font-black uppercase tracking-wide text-slate-950">
                  {schoolInfo?.name || 'SHULE YA SEKONDARI'}
                </h1>
                {schoolInfo?.address && (
                  <div className="text-xs text-slate-600 font-semibold">{schoolInfo.address}</div>
                )}
                <div className="text-xs font-black text-indigo-900 uppercase pt-1">
                  IDARA YA MITIHANI NA USIMAMIZI
                </div>
                <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider">
                  RIPOTI YA UREJESHO WA MITIHANI NA SCRIPTS (EXAM MATERIAL RECONCILIATION REPORT)
                </div>
              </div>

              {/* Report Summary Meta Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Tarehe:</span>
                  <span className="font-bold text-slate-800">{new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Jumla ya Mitihani:</span>
                  <span className="font-bold text-slate-800">{dispatchRecords.length} Session</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Waliorejesha (Salama):</span>
                  <span className="font-black text-emerald-700">{returnedList.length} Mitihani ({dispatchRecords.length > 0 ? Math.round((returnedList.length / dispatchRecords.length) * 100) : 0}%)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Hawajarudisha (Inashikiliwa):</span>
                  <span className="font-black text-rose-700">{pendingList.length} Mitihani</span>
                </div>
              </div>

              {/* TABLE 1: MITIHANI AMBAYO BADO HAIJAREJESHWA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-rose-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
                    <span>1. ORODHA YA WASIMAMIZI AMBAO HAWANJARUDISHA MITIHANI (INASHIKILIWA VYUMBANI)</span>
                  </h3>
                  <span className="text-xs font-bold text-rose-800 font-mono">Jumla: {pendingList.length}</span>
                </div>

                {pendingList.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 text-center">
                    ✓ Mitihani yote imerejeshwa salama! Hakuna mwalimu anayedaiwa mtihani kwa sasa.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-rose-50 text-rose-950 font-black text-[10px] uppercase border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300 text-center">#</th>
                        <th className="p-2 border-r border-slate-300">Msimamizi</th>
                        <th className="p-2 border-r border-slate-300">Somo & Darasa</th>
                        <th className="p-2 border-r border-slate-300">Chumba</th>
                        <th className="p-2 border-r border-slate-300 font-mono">Muda wa Kuanza</th>
                        <th className="p-2 border-r border-slate-300">Namba ya Simu</th>
                        <th className="p-2 text-center">Hali</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pendingList.map((p, i) => (
                        <tr key={p.id}>
                          <td className="p-2 border-r border-slate-300 text-center font-bold">{i + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{p.invigilatorName}</td>
                          <td className="p-2 border-r border-slate-300">{p.subject} ({p.className})</td>
                          <td className="p-2 border-r border-slate-300">{p.roomVenue}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{p.checkoutTime || '08:00'}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{p.invigilatorPhone || '-'}</td>
                          <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/50">Bado Haijarudishwa</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* TABLE 2: MITIHANI ILIYOREJESHWA SALAMA */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                    <span>2. ORODHA YA MITIHANI ILIYOREJESHWA SALAMA NA KUPOKELEWA</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-800 font-mono">Jumla: {returnedList.length}</span>
                </div>

                {returnedList.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                    Bado hakuna mitihani iliyorejeshwa kwenye kumbukumbu.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-emerald-50 text-emerald-950 font-black text-[10px] uppercase border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300 text-center">#</th>
                        <th className="p-2 border-r border-slate-300">Msimamizi</th>
                        <th className="p-2 border-r border-slate-300">Somo & Darasa</th>
                        <th className="p-2 border-r border-slate-300">Chumba</th>
                        <th className="p-2 border-r border-slate-300 font-mono">Muda wa Kurudisha</th>
                        <th className="p-2 border-r border-slate-300 text-center">Scripts Zilizorudishwa</th>
                        <th className="p-2 border-r border-slate-300">Mpokeaji</th>
                        <th className="p-2 text-center">Saini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {returnedList.map((r, i) => (
                        <tr key={r.id}>
                          <td className="p-2 border-r border-slate-300 text-center font-bold">{i + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{r.invigilatorName}</td>
                          <td className="p-2 border-r border-slate-300">{r.subject} ({r.className})</td>
                          <td className="p-2 border-r border-slate-300">{r.roomVenue}</td>
                          <td className="p-2 border-r border-slate-300 font-mono font-bold text-emerald-800">{r.returnTime || '11:15'}</td>
                          <td className="p-2 border-r border-slate-300 text-center font-bold">{r.scriptsReturnedCount || 40} Scripts</td>
                          <td className="p-2 border-r border-slate-300">{r.receivedBy || 'Afisa Mitihani'}</td>
                          <td className="p-2 text-center text-slate-300">✓ Imethibitishwa</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Signatures Footer */}
              <div className="pt-10 grid grid-cols-2 gap-8 border-t border-slate-300 mt-6 text-xs">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">
                    Saini ya Afisa Mitihani (Exam Officer):
                  </div>
                  <div className="text-[11px] text-slate-500">Jina: {currentUser?.fullName || '...................................................'}</div>
                  <div className="text-[11px] text-slate-500">Tarehe: ...................................................</div>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">
                    Saini ya Mkuu wa Shule / Taaluma:
                  </div>
                  <div className="text-[11px] text-slate-500">Jina: ...................................................</div>
                  <div className="text-[11px] text-slate-500">Tarehe: ...................................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: AUTOMATED SMS ALERT MODAL (TUMA SMS KWA WASIORUDISHA)            */}
      {/* ========================================================================= */}
      {isSmsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-900 to-amber-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Tuma Kikumbusho cha SMS kwa Wasiorudisha
                  </h3>
                  <p className="text-[11px] text-amber-200 font-medium">
                    Kikumbusho cha kiotomatiki kwa walimu wanaoshikilia mitihani vyumbani
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSmsModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Target Teachers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black uppercase tracking-wider text-slate-700 text-[11px]">
                    Walengwa: Walimu Wanaodaiwa ({pendingList.length})
                  </label>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                    Hawajarudisha Bahasha
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {pendingList.map((item, idx) => {
                    const foundTch = teachers.find(t => 
                      (item.invigilatorName && t.name.toLowerCase().trim() === item.invigilatorName.toLowerCase().trim()) ||
                      (item.invigilatorPhone && t.phone && t.phone.trim() === item.invigilatorPhone.trim())
                    );
                    const phone = item.invigilatorPhone || foundTch?.phone || '';

                    return (
                      <div key={item.id || idx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.invigilatorName}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {item.subject} ({item.className}) • {item.roomVenue}
                          </div>
                        </div>
                        <div>
                          {phone ? (
                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                              📞 {phone}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                              Bila Namba ya Simu
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message Template Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-black uppercase tracking-wider text-slate-700 text-[11px]">
                    Ujumbe wa SMS (Swahili):
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {smsCustomMessage.length} herufi (1 SMS)
                  </span>
                </div>
                <textarea
                  value={smsCustomMessage}
                  onChange={e => setSmsCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="Andika ujumbe wa kikumbusho hapa..."
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Ujumbe huu utatumwa kwa walimu wote walio na namba za simu. Salio la SMS litapunguzwa moja kwa moja kutoka kwenye SMS Wallet ya shule.
                </p>
              </div>

              {/* Info Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Kumbuka:</strong> Mfumo utatuma SMS hii mara moja kupitia geti la mawasiliano la Beem Africa na kuweka rekodi kwenye <strong>SmsModule</strong> ya shule.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsSmsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition cursor-pointer"
                disabled={isSendingSms}
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleSendSmsAlerts}
                disabled={isSendingSms || pendingList.length === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingSms ? 'Inatuma SMS...' : `Thibitisha na Tuma SMS (${pendingList.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
