import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  X, 
  User, 
  BookOpen, 
  Building, 
  GraduationCap, 
  Layers, 
  Sparkles,
  RefreshCw,
  Grid,
  List,
  Check,
  ArrowRight,
  Settings2,
  Info,
  CalendarCheck2,
  Users,
  FileSpreadsheet,
  AlertCircle,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { 
  saveRemedialTimetable, 
  saveRemedialTimetableBatch,
  deleteRemedialTimetableEntry,
  clearRemedialTimetable,
  checkRemedialConflict,
  checkComprehensiveRemedialClashes,
  detectAllRemedialClashes,
  RemedialClashDetail,
  timeToMinutes,
  RemedialTimetableEntry 
} from '../../lib/remedialService';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES,
  NURSERY_SUBJECTS_LIST,
  LOWER_PRIMARY_SUBJECTS_LIST,
  UPPER_PRIMARY_SUBJECTS_LIST,
  SECONDARY_SUBJECTS,
  SUBJECT_LIST
} from '../../constants/defaults';
import { 
  Teacher, 
  SchoolInfo, 
  Student, 
  PeriodSetting, 
  StreamSetting, 
  TimetableAssignment, 
  TeacherAssignment,
  ExaminationRecord,
  Exam,
  UserAccount 
} from '../../types';
import { exportRemedialTimetablePDF } from '../../utils/remedialPdfExport';
import { exportRemedialTimetableCSV } from '../../utils/remedialExportUtils';
import { isSameClass } from '../../utils/reportCardUtils';
import { RemedialDashboardSummary } from './RemedialDashboardSummary';
import { RemedialMonthView } from './RemedialMonthView';
import { RemedialPerformanceReport } from './RemedialPerformanceReport';
import { GeneralRemedialTimetable } from './GeneralRemedialTimetable';
import { RemedialTeacherManualEntry } from './RemedialTeacherManualEntry';
import { RemedialTimeSlotSettings } from './RemedialTimeSlotSettings';
import { getRemedialTimeSlots, RemedialTimeSlot, getRemedialGlobalSettings, getRemedialTimetable } from '../../lib/remedialService';

interface RemedialTimetableSetupProps {
  schoolId: string;
  teachers: Teacher[];
  schoolInfo?: SchoolInfo;
  students?: Student[];
  onAddActivityLog?: (log: any) => void;
  periodSettings?: PeriodSetting[];
  streamSettings?: StreamSetting[];
  timetableAssignments?: TimetableAssignment[];
  teacherAssignments?: TeacherAssignment[];
  examinationRecords?: ExaminationRecord[];
  exams?: Exam[];
  currentUser?: UserAccount | null;
}

const REMEDIAL_NURSERY_CLASSES = ['Baby Class', 'Middle', 'Pre-Unit'];
const REMEDIAL_PRIMARY_CLASSES = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7'
];
const REMEDIAL_SECONDARY_CLASSES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];

const ALL_REMEDIAL_CLASSES = [
  ...REMEDIAL_NURSERY_CLASSES,
  ...REMEDIAL_PRIMARY_CLASSES,
  ...REMEDIAL_SECONDARY_CLASSES
];

const STREAM_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'All Streams'];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SWAHILI_DAYS: Record<string, string> = {
  Monday: 'Jumatatu',
  Tuesday: 'Jumanne',
  Wednesday: 'Jumatano',
  Thursday: 'Alhamisi',
  Friday: 'Ijumaa',
  Saturday: 'Jumamosi',
  Sunday: 'Jumapili'
};

// Remedial standard shifts (completely separate from general teaching timetable periods)
export interface RemedialShiftDefinition {
  id: string;
  name: string;
  swahiliName: string;
  startTime: string;
  endTime: string;
  description: string;
  defaultDays: string[];
}

const DEFAULT_REMEDIAL_SHIFTS: RemedialShiftDefinition[] = [
  {
    id: 'evening',
    name: 'Evening Tuition',
    swahiliName: 'Jioni (Evening Tuition)',
    startTime: '16:00',
    endTime: '17:30',
    description: 'Masomo ya jioni baada ya vipindi vya kawaida (Jumatatu - Ijumaa)',
    defaultDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    id: 'morning',
    name: 'Morning Pre-Prep',
    swahiliName: 'Asubuhi (Pre-Prep)',
    startTime: '06:30',
    endTime: '07:30',
    description: 'Masomo ya asubuhi kabla ya mchakamchaka (Jumatatu - Ijumaa)',
    defaultDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    id: 'saturday_m1',
    name: 'Saturday Session 1',
    swahiliName: 'Jumamosi Asubuhi (Kipindi cha 1)',
    startTime: '08:30',
    endTime: '10:30',
    description: 'Masomo ya ziada Jumamosi asubuhi',
    defaultDays: ['Saturday']
  },
  {
    id: 'saturday_m2',
    name: 'Saturday Session 2',
    swahiliName: 'Jumamosi Mchana (Kipindi cha 2)',
    startTime: '10:45',
    endTime: '12:45',
    description: 'Masomo ya ziada Jumamosi kipindi cha pili',
    defaultDays: ['Saturday']
  },
  {
    id: 'sunday',
    name: 'Sunday Intensive',
    swahiliName: 'Jumapili (Tuition & Revision)',
    startTime: '14:00',
    endTime: '16:00',
    description: 'Mazoezi maalum ya mwishoni mwa juma (Jumapili)',
    defaultDays: ['Sunday']
  }
];

export const RemedialTimetableSetup: React.FC<RemedialTimetableSetupProps> = ({ 
  schoolId, 
  teachers = [],
  schoolInfo,
  students = [],
  periodSettings = [],
  streamSettings = [],
  timetableAssignments = [],
  teacherAssignments = [],
  examinationRecords = [],
  exams = [],
  currentUser,
  onAddActivityLog
}) => {
  const isOverlappingWithBreak = (day: string, start: string, end: string) => {
    const timeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const startM = timeToMinutes(start);
    const endM = timeToMinutes(end);

    return periodSettings.some(p => {
      if (p.day !== day || !p.isBreak) return false;
      const pStartM = timeToMinutes(p.start);
      const pEndM = timeToMinutes(p.end);
      return startM < pEndM && endM > pStartM;
    });
  };
  const [entries, setEntries] = useState<RemedialTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Active View Tab: Primary Views ('kiomoni_matrix' | 'general' | 'class' | 'teacher' | 'general_unified' | 'teacher_manual_entry') + ('month' | 'list' | 'generator' | 'performance')
  const [activeTab, setActiveTab] = useState<'general' | 'class' | 'teacher' | 'month' | 'list' | 'generator' | 'performance' | 'kiomoni_matrix' | 'general_unified' | 'teacher_manual_entry' | 'settings'>('kiomoni_matrix');
  const [timeSlots, setTimeSlots] = useState<RemedialTimeSlot[]>([]);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data } = await getRemedialTimeSlots(schoolId);
        if (data) setTimeSlots(data);
      } catch (e) {}
    };
    fetchSlots();
  }, [schoolId, activeTab]);

  // Dynamic class resolution from regular timetable system (streamSettings, timetable assignments, and student records)
  const registeredClasses = useMemo(() => {
    const classSet = new Set<string>();

    if (Array.isArray(streamSettings) && streamSettings.length > 0) {
      streamSettings.forEach(s => {
        if (s?.className?.trim()) classSet.add(s.className.trim());
      });
    }

    if (Array.isArray(timetableAssignments) && timetableAssignments.length > 0) {
      timetableAssignments.forEach(t => {
        if (t?.className?.trim()) classSet.add(t.className.trim());
      });
    }

    if (Array.isArray(students) && students.length > 0) {
      students.forEach(s => {
        if (s?.className?.trim()) classSet.add(s.className.trim());
      });
    }

    // Default fallback if no class registered yet
    if (classSet.size === 0) {
      ALL_REMEDIAL_CLASSES.forEach(c => classSet.add(c));
    }

    return Array.from(classSet);
  }, [streamSettings, timetableAssignments, students]);

  // Dynamic streams resolution for a given class from regular timetable configuration
  const getStreamsForClass = (className: string): string[] => {
    if (!className) return ['A', 'B', 'All Streams'];
    const streamSet = new Set<string>();

    // 1. From regular timetable streamSettings
    const setting = (streamSettings || []).find(s => s && isSameClass(s.className, className));
    if (setting && Array.isArray(setting.streams)) {
      setting.streams.forEach(st => {
        if (st?.trim()) {
          const clean = st.replace(/^STREAM\s+/i, '').trim();
          if (clean) streamSet.add(clean);
        }
      });
    }

    // 2. From regular timetable assignments
    (timetableAssignments || []).forEach(a => {
      if (a && isSameClass(a.className, className) && a.stream) {
        const clean = a.stream.replace(/^STREAM\s+/i, '').trim();
        if (clean && clean.toLowerCase() !== 'all' && clean.toLowerCase() !== 'all streams') {
          streamSet.add(clean);
        }
      }
    });

    // 3. From student enrollment records
    (students || []).forEach(s => {
      if (s && isSameClass(s.className, className) && s.stream) {
        const clean = s.stream.replace(/^STREAM\s+/i, '').trim();
        if (clean) streamSet.add(clean);
      }
    });

    if (streamSet.size === 0) {
      return ['A', 'B', 'C', 'All Streams'];
    }

    return [...Array.from(streamSet).sort(), 'All Streams'];
  };

  // Filters
  const [classFilter, setClassFilter] = useState<string>(() => registeredClasses[0] || 'Class 5');
  const [streamFilter, setStreamFilter] = useState<string>('A');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string>(() => {
    try {
      return localStorage.getItem(`haby_remedial_session_filter_${schoolId}`) || 'Evening';
    } catch {
      return 'Evening';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`haby_remedial_session_filter_${schoolId}`, sessionTypeFilter);
    } catch {}
  }, [sessionTypeFilter, schoolId]);

  // Auto-set teacher filter to current logged-in teacher if applicable
  useEffect(() => {
    if (currentUser?.name && !selectedTeacherFilter) {
      const match = teachers.find(t => t.name.toLowerCase() === currentUser.name?.toLowerCase());
      if (match) {
        setSelectedTeacherFilter(match.name);
      }
    }
  }, [currentUser, teachers, selectedTeacherFilter]);

  // Toast / Alert Notification State
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Form State for Manual Session Add/Edit
  const [formData, setFormData] = useState({
    class_name: registeredClasses[0] || 'Class 5',
    stream: 'A',
    subject: 'Mathematics (Hisabati)',
    teacher_name: '',
    date: new Date().toISOString().split('T')[0],
    day_of_week: 'Monday',
    start_time: '16:00',
    end_time: '17:30',
    room: `${registeredClasses[0] || 'Class 5'} Classroom`,
    session_type: 'Evening' as 'Morning' | 'Evening' | 'Weekend' | 'All Sessions',
    notify_students: true,
    term: 'Term 1',
    academic_year: new Date().getFullYear().toString(),
    target_type: 'ALL_CLASS' as 'ALL_CLASS' | 'TARGETED_STUDENTS',
    target_student_ids: [] as string[],
    notes: ''
  });
  const [studentSearchInModal, setStudentSearchInModal] = useState('');

  // Auto-fill from Time Slot Templates
  useEffect(() => {
    if (isModalOpen && !editingEntryId && timeSlots.length > 0) {
      const slot = timeSlots.find(s => 
        isSameClass(s.class_name, formData.class_name) && 
        (s.session_type === formData.session_type || formData.session_type === 'All Sessions') && 
        s.days.includes(formData.day_of_week)
      );
      if (slot) {
        setFormData(prev => ({
          ...prev,
          start_time: slot.start_time,
          end_time: slot.end_time
        }));
      }
    }
  }, [formData.class_name, formData.session_type, formData.day_of_week, isModalOpen, editingEntryId, timeSlots]);

  // Streams available for the current class in modal
  const availableStreamsForModal = useMemo(() => {
    return getStreamsForClass(formData.class_name);
  }, [formData.class_name, streamSettings, timetableAssignments, students]);

  // Streams available for the current filtered class in filter bar
  const availableStreamsForFilter = useMemo(() => {
    return getStreamsForClass(classFilter);
  }, [classFilter, streamSettings, timetableAssignments, students]);

  // Live calculation of duration in minutes
  const durationMinutes = useMemo(() => {
    const startM = timeToMinutes(formData.start_time);
    const endM = timeToMinutes(formData.end_time);
    return endM > startM ? endM - startM : 0;
  }, [formData.start_time, formData.end_time]);

  // Live Comprehensive Clash Detection Preview in Form (Remedial + Regular Timetable + Teacher Assignments)
  const liveConflict = useMemo(() => {
    if (!isModalOpen || !formData.start_time || !formData.end_time || !formData.teacher_name) return null;
    const payload: RemedialTimetableEntry = {
      ...(editingEntryId ? { id: editingEntryId } : {}),
      class_name: formData.class_name,
      stream: formData.stream,
      subject: formData.subject,
      teacher_name: formData.teacher_name,
      date: formData.date,
      day_of_week: formData.day_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      room: formData.room
    };
    const check = checkComprehensiveRemedialClashes(
      payload,
      entries,
      timetableAssignments || [],
      teacherAssignments || [],
      teachers || [],
      periodSettings || [],
      editingEntryId || undefined
    );
    return check.hasConflict ? check : null;
  }, [isModalOpen, formData, entries, editingEntryId, timetableAssignments, teacherAssignments, teachers, periodSettings]);

  useEffect(() => {
    if (liveConflict) {
      setAlertNotice({
        type: 'error',
        message: `Conflict Detected: ${liveConflict.primaryMessage}`
      });
    }
  }, [liveConflict]);

  // Real-time Clash Detection across ALL entries in schedule against regular timetable & other remedial slots
  const allScheduleClashes = useMemo(() => {
    return detectAllRemedialClashes(
      entries,
      timetableAssignments || [],
      teacherAssignments || [],
      teachers || [],
      periodSettings || []
    );
  }, [entries, timetableAssignments, teacherAssignments, teachers, periodSettings]);

  // Nominal roll students for selected class & stream
  const classNominalStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = isSameClass(s.className, formData.class_name);
      const matchStream = formData.stream === 'All Streams' || !s.stream || s.stream.toUpperCase().includes(formData.stream.toUpperCase());
      return matchClass && matchStream;
    });
  }, [students, formData.class_name, formData.stream]);

  // Filtered nominal students by modal search query
  const filteredNominalStudents = useMemo(() => {
    if (!studentSearchInModal.trim()) return classNominalStudents;
    const q = studentSearchInModal.toLowerCase();
    return classNominalStudents.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.regNo && s.regNo.toLowerCase().includes(q))
    );
  }, [classNominalStudents, studentSearchInModal]);

  // Nominal roll students for the filtered class and stream (for Class View)
  const classFilterNominalStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = isSameClass(s.className, classFilter);
      const matchStream = streamFilter === 'ALL' || streamFilter === 'All Streams' || !s.stream || s.stream.toUpperCase().includes(streamFilter.toUpperCase());
      return matchClass && matchStream;
    });
  }, [students, classFilter, streamFilter]);

  // Entries specifically for the chosen class view
  const classViewEntries = useMemo(() => {
    return entries.filter(e => {
      const matchClass = classFilter === 'ALL' || isSameClass(e.class_name, classFilter);
      const matchStream = streamFilter === 'ALL' || streamFilter === 'All Streams' || e.stream === 'All Streams' || e.stream?.toUpperCase() === streamFilter.toUpperCase();
      return matchClass && matchStream;
    });
  }, [entries, classFilter, streamFilter]);

  // Entries specifically for the chosen teacher view
  const teacherViewEntries = useMemo(() => {
    if (!selectedTeacherFilter) return entries;
    return entries.filter(e => e.teacher_name?.trim().toLowerCase() === selectedTeacherFilter.trim().toLowerCase());
  }, [entries, selectedTeacherFilter]);

  // Workload calculations for chosen teacher
  const teacherWorkload = useMemo(() => {
    let totalMinutes = 0;
    const classesSet = new Set<string>();
    const subjectsSet = new Set<string>();

    teacherViewEntries.forEach(e => {
      if (e.class_name) classesSet.add(`${e.class_name} ${e.stream || ''}`.trim());
      if (e.subject) subjectsSet.add(e.subject);
      if (e.duration_minutes) {
        totalMinutes += e.duration_minutes;
      } else if (e.start_time && e.end_time) {
        const sm = timeToMinutes(e.start_time);
        const em = timeToMinutes(e.end_time);
        if (em > sm) totalMinutes += (em - sm);
      } else {
        totalMinutes += 60;
      }
    });

    return {
      totalSessions: teacherViewEntries.length,
      totalMinutes,
      classes: Array.from(classesSet),
      subjects: Array.from(subjectsSet)
    };
  }, [teacherViewEntries]);

  // Standalone Generator Studio State
  const [generatingAuto, setGeneratingAuto] = useState(false);
  const [generatorConfig, setGeneratorConfig] = useState({
    scope: 'SINGLE_CLASS' as 'SINGLE_CLASS' | 'LEVEL_PRIMARY' | 'LEVEL_SECONDARY' | 'EXAM_CLASSES' | 'ALL_SCHOOL',
    target_class: 'Class 5',
    target_stream: 'A',
    mode: 'WEEKLY_TEMPLATE' as 'WEEKLY_TEMPLATE' | 'DATE_BOUND',
    weeks_count: 4,
    start_date: new Date().toISOString().split('T')[0],
    selected_shifts: ['evening', 'saturday_m1'] as string[],
    selected_subjects: [] as string[],
    teacher_strategy: 'AUTO_SPECIALIZATION' as 'AUTO_SPECIALIZATION' | 'SINGLE_TEACHER',
    single_teacher_name: '',
    term: 'Term 1',
    academic_year: new Date().getFullYear().toString(),
    clear_existing_first: false
  });

  // Calculate day of week automatically from date when date changes
  useEffect(() => {
    if (formData.date) {
      const d = new Date(formData.date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const calculated = dayNames[d.getDay()] || 'Monday';
      setFormData(prev => ({ ...prev, day_of_week: calculated }));
    }
  }, [formData.date]);

  // Helper to resolve a teacher's registered subjects, classes, and streams from teachers + teacherAssignments + timetableAssignments
  const getTeacherRegisteredMetadata = (teacherName: string) => {
    const tObj = teachers.find(
      t => t.name.trim().toLowerCase() === String(teacherName || '').trim().toLowerCase()
    );
    const subjectSet = new Set<string>();
    const classStreamMap = new Map<string, Set<string>>();

    const addClsStream = (cls: string, strm?: string) => {
      if (!cls) return;
      const existingCls = Array.from(classStreamMap.keys()).find(k => isSameClass(k, cls)) || cls;
      if (!classStreamMap.has(existingCls)) {
        classStreamMap.set(existingCls, new Set<string>());
      }
      if (strm) {
        classStreamMap.get(existingCls)!.add(strm.toUpperCase());
      }
    };

    if (tObj) {
      (tObj.subjects || []).forEach(s => {
        const clean = String(s || '').replace(/\s*\([^)]*\)\s*$/g, '').trim();
        if (clean) subjectSet.add(clean);
      });
      (tObj.teachingStreams || []).forEach(ts => {
        const m = String(ts || '').trim().match(/^(Form\s*\d+|Class\s*\d+|Standard\s*\d+|Std\s*\d+|Darasa\s*la\s*\d+)\s*(?:-\s*)?(?:Stream\s*)?([A-Z])?$/i);
        if (m) {
          addClsStream(m[1].replace(/\s+/g, ' ').trim(), m[2] ? m[2].toUpperCase() : undefined);
        } else if (ts) {
          addClsStream(String(ts).trim());
        }
      });
    }

    (teacherAssignments || []).forEach((ta: any) => {
      const matchId = tObj && String(ta.teacherId) === String(tObj.id);
      const matchName = ta.teacherName && ta.teacherName.trim().toLowerCase() === String(teacherName || '').trim().toLowerCase();
      if (matchId || matchName) {
        if (ta.subject) subjectSet.add(String(ta.subject).trim());
        if (ta.level) {
          if (Array.isArray(ta.streams) && ta.streams.length > 0) {
            ta.streams.forEach((s: string) => addClsStream(ta.level, s));
          } else {
            addClsStream(ta.level);
          }
        }
      }
    });

    (timetableAssignments || []).forEach((a: any) => {
      const matchId = tObj && String(a.teacherId) === String(tObj.id);
      const matchName = a.teacherName && a.teacherName.trim().toLowerCase() === String(teacherName || '').trim().toLowerCase();
      if (matchId || matchName) {
        if (a.subject) subjectSet.add(String(a.subject).trim());
        if (a.className) addClsStream(a.className, a.stream || 'A');
      }
    });

    return {
      subjects: Array.from(subjectSet),
      classes: Array.from(classStreamMap.keys()),
      classStreamMap
    };
  };

  // Dynamic subjects based on chosen teacher's registered subjects in Form (ONLY teacher's subjects)
  const dynamicSubjects = useMemo(() => {
    if (formData.teacher_name) {
      const meta = getTeacherRegisteredMetadata(formData.teacher_name);
      return meta.subjects;
    }
    return [];
  }, [formData.teacher_name, teachers, teacherAssignments, timetableAssignments]);

  // Dynamic classes for modal based on chosen teacher's registered classes
  const availableClassesForModal = useMemo(() => {
    if (formData.teacher_name) {
      const meta = getTeacherRegisteredMetadata(formData.teacher_name);
      if (meta.classes.length > 0) return meta.classes;
    }
    return registeredClasses;
  }, [formData.teacher_name, teachers, teacherAssignments, timetableAssignments, registeredClasses]);

  // Streams available for the current class in modal (filtered to teacher's registered streams if teacher is selected)
  const availableStreamsForModalScoped = useMemo(() => {
    if (formData.teacher_name) {
      const meta = getTeacherRegisteredMetadata(formData.teacher_name);
      const matchedClsKey = Array.from(meta.classStreamMap.keys()).find(k => isSameClass(k, formData.class_name));
      if (matchedClsKey) {
        const tStreams = Array.from(meta.classStreamMap.get(matchedClsKey)!).sort();
        if (tStreams.length > 0) return tStreams;
      }
    }
    return availableStreamsForModal;
  }, [formData.teacher_name, formData.class_name, availableStreamsForModal, teachers, teacherAssignments, timetableAssignments]);

  // Dynamic subjects for generator (filtered if single teacher is selected)
  const generatorSubjects = useMemo(() => {
    if (generatorConfig.teacher_strategy === 'SINGLE_TEACHER' && generatorConfig.single_teacher_name) {
      const meta = getTeacherRegisteredMetadata(generatorConfig.single_teacher_name);
      if (meta.subjects.length > 0) return meta.subjects;
    }
    return SUBJECT_LIST.map(s => s.name);
  }, [generatorConfig.target_class, generatorConfig.scope, generatorConfig.teacher_strategy, generatorConfig.single_teacher_name, teachers, teacherAssignments, timetableAssignments]);

  // Keep selected subject, class, and stream valid when teacher changes
  useEffect(() => {
    if (dynamicSubjects.length > 0 && !dynamicSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: dynamicSubjects[0] }));
    } else if (dynamicSubjects.length === 0 && formData.subject) {
      setFormData(prev => ({ ...prev, subject: '' }));
    }
  }, [dynamicSubjects]);

  useEffect(() => {
    if (availableClassesForModal.length > 0 && !availableClassesForModal.some(c => isSameClass(c, formData.class_name))) {
      const nextCls = availableClassesForModal[0];
      setFormData(prev => ({
        ...prev,
        class_name: nextCls,
        room: `${nextCls} Classroom`
      }));
    }
  }, [availableClassesForModal]);

  useEffect(() => {
    if (availableStreamsForModalScoped.length > 0 && !availableStreamsForModalScoped.includes(formData.stream)) {
      setFormData(prev => ({ ...prev, stream: availableStreamsForModalScoped[0] || 'A' }));
    }
  }, [availableStreamsForModalScoped]);

  useEffect(() => {
    loadTimetable();
  }, [schoolId]);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const { data } = await getRemedialTimetable(schoolId);
      if (data) setEntries(data);
    } catch (err) {
      console.error("Error loading remedial timetable:", err);
    } finally {
      setLoading(false);
    }
  };

  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        const settings = await getRemedialGlobalSettings(schoolId);
        if (settings) setGlobalSettings(settings);
      } catch (e) {}
    };
    fetchGlobal();
  }, [schoolId]);

  const resetForm = () => {
    const initialClass = classFilter !== 'ALL' ? classFilter : (registeredClasses[0] || 'Class 5');
    const availableStreams = getStreamsForClass(initialClass);
    const initialStream = streamFilter !== 'ALL' && streamFilter !== 'All Streams' ? streamFilter : (availableStreams[0] || 'A');

    setFormData({
      class_name: initialClass,
      stream: initialStream,
      subject: dynamicSubjects[0] || 'Mathematics (Hisabati)',
      teacher_name: selectedTeacherFilter || teachers[0]?.name || '',
      date: globalSettings?.startDate || new Date().toISOString().split('T')[0],
      day_of_week: 'Monday',
      start_time: globalSettings?.defaultStartTime || '16:00',
      end_time: globalSettings?.defaultEndTime || '17:30',
      room: `${initialClass} Classroom`,
      session_type: 'Evening',
      notify_students: true,
      term: 'Term 1',
      academic_year: new Date().getFullYear().toString(),
      target_type: 'ALL_CLASS',
      target_student_ids: [],
      notes: ''
    });
    setStudentSearchInModal('');
    setEditingEntryId(null);
  };

  const handleOpenAdd = (presetDay?: string, presetStart?: string, presetEnd?: string, presetDate?: string) => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      day_of_week: presetDay || prev.day_of_week,
      start_time: presetStart || prev.start_time,
      end_time: presetEnd || prev.end_time,
      date: presetDate || prev.date
    }));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: RemedialTimetableEntry) => {
    setEditingEntryId(entry.id || null);
    const times = entry.period_time ? entry.period_time.split('-') : [];
    setFormData({
      class_name: entry.class_name || 'Class 5',
      stream: entry.stream || 'A',
      subject: entry.subject || '',
      teacher_name: entry.teacher_name || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      day_of_week: entry.day_of_week || 'Monday',
      start_time: entry.start_time || times[0] || '16:00',
      end_time: entry.end_time || times[1] || '17:30',
      room: entry.room || '',
      session_type: entry.session_type || 'Evening',
      notify_students: !!entry.notify_students,
      term: entry.term || 'Term 1',
      academic_year: entry.academic_year || new Date().getFullYear().toString(),
      target_type: entry.target_type || 'ALL_CLASS',
      target_student_ids: entry.target_student_ids || [],
      notes: entry.notes || ''
    });
    setStudentSearchInModal('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class_name) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua darasa (Class is required).' });
      return;
    }
    if (!formData.stream) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua mkondo (Stream is required).' });
      return;
    }
    if (!formData.subject) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua somo (Subject is required).' });
      return;
    }
    if (!formData.teacher_name) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua mwalimu (Teacher is required).' });
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali weka muda wa kuanza na kuisha (Start and end times are required).' });
      return;
    }

    if (isOverlappingWithBreak(formData.day_of_week, formData.start_time, formData.end_time)) {
      setAlertNotice({ type: 'error', message: 'Huwezi kupanga kipindi wakati wa mapumziko (Break time conflict).' });
      return;
    }

    const startM = timeToMinutes(formData.start_time);
    const endM = timeToMinutes(formData.end_time);
    const duration = endM > startM ? endM - startM : 60;

    const payload: RemedialTimetableEntry = {
      ...(editingEntryId ? { id: editingEntryId } : {}),
      class_name: formData.class_name,
      stream: formData.stream,
      subject: formData.subject,
      teacher_name: formData.teacher_name,
      date: formData.date,
      day_of_week: formData.day_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      duration_minutes: duration,
      period_time: `${formData.start_time}-${formData.end_time}`,
      room: formData.room || `${formData.class_name} Room`,
      session_type: formData.session_type,
      target_type: formData.target_type,
      target_student_ids: formData.target_type === 'TARGETED_STUDENTS' ? formData.target_student_ids : [],
      notes: formData.notes,
      term: formData.term,
      academic_year: formData.academic_year,
      notify_students: formData.notify_students
    };

    // Conflict Checking (Conflict Prevention logic)
    const conflictCheck = checkRemedialConflict(entries, payload, editingEntryId || undefined);
    if (conflictCheck.hasConflict) {
      setAlertNotice({
        type: 'error',
        message: conflictCheck.message || 'Mgongano wa ratiba umepatikana kwa mwalimu huyu!'
      });
      return;
    }

    setSaving(true);
    try {
      await saveRemedialTimetable(schoolId, payload);

      if (formData.notify_students) {
        const classStudents = students.filter(s => 
          isSameClass(s.className, formData.class_name) && 
          (formData.stream === 'All Streams' || !s.stream || s.stream.toUpperCase().includes(formData.stream.toUpperCase()))
        );

        if (onAddActivityLog) {
          onAddActivityLog({
            action: 'REMEDIAL_SCHEDULED',
            category: 'timetable',
            title: `Remedial Timetable Scheduled: ${formData.class_name} ${formData.stream}`,
            description: `Kipindi cha ${formData.subject} kimepangwa kwa Mwl. ${formData.teacher_name} siku ya ${formData.day_of_week} (${formData.start_time}-${formData.end_time}) kwa wanafunzi ${classStudents.length}.`
          });
        }
      }

      setAlertNotice({
        type: 'success',
        message: `Ratiba ya Remedial ya ${formData.class_name} (${formData.stream}) imehifadhiwa kikamilifu!`
      });
      setIsModalOpen(false);
      resetForm();
      loadTimetable();
    } catch (err: any) {
      console.error("Save remedial error:", err);
      setAlertNotice({ type: 'error', message: err.message || 'Hitilafu imetokea wakati wa kuhifadhi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Una uhakika unataka kufuta kipindi hiki cha remedial kwenye ratiba?')) return;
    try {
      await deleteRemedialTimetableEntry(schoolId, id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setAlertNotice({ type: 'success', message: 'Kipindi kimefutwa kwenye ratiba.' });
    } catch (err: any) {
      setAlertNotice({ type: 'error', message: 'Hitilafu wakati wa kufuta kipindi.' });
    }
  };

  const handleClearSchedule = async (className?: string, streamName?: string) => {
    const targetDesc = className ? `${className} ${streamName || ''}` : 'Shule Nzima';
    if (!window.confirm(`Una uhakika unataka kufuta ratiba nzima ya remedial kwa ajili ya ${targetDesc}? Hatua hii itafuta vipindi vyote vilivyopangwa vya remedial tu bila kugusa ratiba kuu ya shule.`)) {
      return;
    }

    try {
      setLoading(true);
      await clearRemedialTimetable(schoolId, className, streamName);
      await loadTimetable();
      setAlertNotice({
        type: 'success',
        message: `Ratiba ya Remedial ya ${targetDesc} imefutwa kikamilifu. Sasa unaweza kutengeneza upya ratiba huru.`
      });
    } catch (err) {
      setAlertNotice({ type: 'error', message: 'Hitilafu wakati wa kufuta ratiba.' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered entries for table & grid
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const matchClass = classFilter === 'ALL' || isSameClass(item.class_name, classFilter);
      const matchStream = streamFilter === 'ALL' || 
        item.stream === 'All Streams' || 
        item.stream?.toUpperCase() === streamFilter.toUpperCase();
      const matchDate = !dateFilter || item.date === dateFilter;
      const matchTeacher = !selectedTeacherFilter || item.teacher_name === selectedTeacherFilter;
      const matchSearch = !searchQuery || 
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.room && item.room.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSessionType = sessionTypeFilter === 'ALL' || !item.session_type || item.session_type === 'All Sessions' || item.session_type === sessionTypeFilter;

      return matchClass && matchStream && matchDate && matchTeacher && matchSearch && matchSessionType;
    });
  }, [entries, classFilter, streamFilter, dateFilter, selectedTeacherFilter, searchQuery, sessionTypeFilter]);

  // Distinct time slots for the Weekly Grid (Strictly filtered by sessionTypeFilter, e.g., Jioni / Evening Only)
  const gridTimeSlots = useMemo(() => {
    const slotsMap = new Map<string, { start: string; end: string; label: string }>();

    // Add predefined default shifts matching the active sessionTypeFilter (e.g. Evening / Jioni)
    DEFAULT_REMEDIAL_SHIFTS
      .filter(s => {
        if (sessionTypeFilter === 'ALL') return true;
        const isWeekendShift = s.defaultDays.includes('Saturday') || s.defaultDays.includes('Sunday') || s.id.includes('saturday') || s.id.includes('sunday');
        const isEveningShift = s.id.includes('evening') || s.name.toLowerCase().includes('evening') || parseInt(s.startTime.split(':')[0], 10) >= 14;
        const isMorningShift = s.id.includes('morning') || s.name.toLowerCase().includes('morning') || (!isWeekendShift && parseInt(s.startTime.split(':')[0], 10) < 12);
        if (sessionTypeFilter === 'Evening') return isEveningShift && !isWeekendShift;
        if (sessionTypeFilter === 'Morning') return isMorningShift && !isWeekendShift;
        if (sessionTypeFilter === 'Weekend') return isWeekendShift;
        return true;
      })
      .forEach(s => {
        slotsMap.set(`${s.startTime}-${s.endTime}`, {
          start: s.startTime,
          end: s.endTime,
          label: `${s.name} (${s.startTime} - ${s.endTime})`
        });
      });

    // Add any unique periods present in entries that also match sessionTypeFilter
    entries
      .filter(e => sessionTypeFilter === 'ALL' || !e.session_type || e.session_type === 'All Sessions' || e.session_type === sessionTypeFilter)
      .forEach(e => {
        const st = e.start_time || e.period_time?.split('-')[0];
        const et = e.end_time || e.period_time?.split('-')[1];
        if (st && et) {
          // If sessionTypeFilter is Evening, also ignore morning times (<12:00) if session_type was unset
          if (sessionTypeFilter === 'Evening' && parseInt(st.split(':')[0], 10) < 12) return;
          if (sessionTypeFilter === 'Morning' && parseInt(st.split(':')[0], 10) >= 12) return;
          const key = `${st}-${et}`;
          if (!slotsMap.has(key)) {
            slotsMap.set(key, {
              start: st,
              end: et,
              label: `${st} - ${et}`
            });
          }
        }
      });

    return Array.from(slotsMap.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [entries, sessionTypeFilter]);

  // Handle PDF Export for School-Wide General Timetable
  const handleExportGeneralPDF = () => {
    exportRemedialTimetablePDF({
      entries,
      schoolInfo,
      title: `RATIBA YA JUMLA YA REMEDIAL - SHULE NZIMA - ${new Date().getFullYear()}`,
      subtitle: `Ratiba Kuu ya Masomo ya Ziada Shuleni • Jumla ya Vipindi: ${entries.length}`,
      showClassColumn: true,
      academicYear: new Date().getFullYear().toString()
    });
  };

  // Handle PDF Export for a Class
  const handleExportClassPDF = (targetClass: string = classFilter, targetStream: string = streamFilter) => {
    const cls = targetClass !== 'ALL' ? targetClass : (registeredClasses[0] || 'Class 5');
    const strm = targetStream !== 'ALL' ? targetStream : 'All Streams';

    const targetEntries = entries.filter(e => 
      isSameClass(e.class_name, cls) &&
      (strm === 'ALL' || strm === 'All Streams' || e.stream === 'All Streams' || e.stream?.toUpperCase() === strm.toUpperCase())
    );

    const streamDisplay = strm === 'ALL' || strm === 'All Streams' ? 'MIKONDO YOTE' : `MKONDO ${strm}`;

    exportRemedialTimetablePDF({
      entries: targetEntries,
      schoolInfo,
      className: cls,
      streamName: strm,
      title: `RATIBA YA REMEDIAL - ${cls.toUpperCase()} (${streamDisplay}) - ${new Date().getFullYear()}`,
      subtitle: `Ratiba Maalum ya Masomo ya Ziada ya Darasa • Vipindi: ${targetEntries.length}`,
      showClassColumn: false,
      academicYear: new Date().getFullYear().toString()
    });
  };

  // Handle PDF Export for a Teacher
  const handleExportTeacherPDF = (teacherName: string = selectedTeacherFilter) => {
    const targetName = teacherName || selectedTeacherFilter || (teachers[0]?.name || '');
    const teacherEntries = entries.filter(e => 
      e.teacher_name?.trim().toLowerCase() === targetName.trim().toLowerCase()
    );

    exportRemedialTimetablePDF({
      entries: teacherEntries,
      schoolInfo,
      title: `RATIBA YA REMEDIAL - MWALIMU ${targetName.toUpperCase()} - ${new Date().getFullYear()}`,
      subtitle: `Ratiba Binafsi ya Kufundisha Masomo ya Ziada • Vipindi: ${teacherEntries.length}`,
      showClassColumn: true,
      academicYear: new Date().getFullYear().toString()
    });
  };

  // Generic Handle PDF Export
  const handleExportPDF = () => {
    if (activeTab === 'teacher') {
      handleExportTeacherPDF();
    } else if (activeTab === 'class') {
      handleExportClassPDF();
    } else {
      handleExportGeneralPDF();
    }
  };

  // STANDALONE REMEDIAL GENERATOR ENGINE (KIVYAKE)
  const handleRunStandaloneGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingAuto(true);
    setAlertNotice(null);

    try {
      // 1. Determine target classes based on chosen scope
      let targetClasses: string[] = [];
      if (generatorConfig.scope === 'SINGLE_CLASS') {
        targetClasses = [generatorConfig.target_class];
      } else if (generatorConfig.scope === 'LEVEL_PRIMARY') {
        targetClasses = REMEDIAL_PRIMARY_CLASSES;
      } else if (generatorConfig.scope === 'LEVEL_SECONDARY') {
        targetClasses = REMEDIAL_SECONDARY_CLASSES;
      } else if (generatorConfig.scope === 'EXAM_CLASSES') {
        targetClasses = ['Class 4', 'Class 7', 'Form 2', 'Form 4'];
      } else if (generatorConfig.scope === 'ALL_SCHOOL') {
        targetClasses = ALL_REMEDIAL_CLASSES;
      }

      if (targetClasses.length === 0) {
        setAlertNotice({ type: 'warning', message: 'Tafadhali chagua madarasa yatakayohusika.' });
        setGeneratingAuto(false);
        return;
      }

      // 2. Determine target shifts
      const chosenShifts = DEFAULT_REMEDIAL_SHIFTS.filter(s => 
        generatorConfig.selected_shifts.includes(s.id)
      );

      if (chosenShifts.length === 0) {
        setAlertNotice({ type: 'warning', message: 'Tafadhali chagua angalau shift/muda mmoja wa masomo ya remedial.' });
        setGeneratingAuto(false);
        return;
      }

      // Optional clear existing for these classes first
      if (generatorConfig.clear_existing_first) {
        for (const cls of targetClasses) {
          await clearRemedialTimetable(schoolId, cls, generatorConfig.target_stream);
        }
      }

      const generatedEntries: RemedialTimetableEntry[] = [];
      const isDateBound = generatorConfig.mode === 'DATE_BOUND';
      const startDate = new Date(generatorConfig.start_date || new Date());
      const totalDays = isDateBound ? generatorConfig.weeks_count * 7 : 7;

      let rotationIndex = 0;

      // Iterate through each target class
      for (const currentClass of targetClasses) {
        // Resolve subject list for this class
        let classSubjects = generatorConfig.selected_subjects.length > 0 
          ? generatorConfig.selected_subjects 
          : (NURSERY_CLASSES.includes(currentClass) ? NURSERY_SUBJECTS_LIST : 
             (currentClass === 'Class 1' || currentClass === 'Class 2') ? LOWER_PRIMARY_SUBJECTS_LIST :
             PRIMARY_CLASSES.includes(currentClass) ? UPPER_PRIMARY_SUBJECTS_LIST : SECONDARY_SUBJECTS);

        if (classSubjects.length === 0) {
          classSubjects = ['Mathematics (Hisabati)', 'English Language', 'Science (Sayansi)', 'Kiswahili'];
        }

        // Iterate through days (either 7 days of weekly template or multi-week dates)
        for (let d = 0; d < totalDays; d++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + d);
          const dayOfWeekNum = currentDate.getDay();
          const dayName = DAYS_OF_WEEK[(dayOfWeekNum + 6) % 7]; // standard day name
          const dateStr = currentDate.toISOString().split('T')[0];

          // Check which templates/shifts apply to this day
          // Prioritize user-defined timeSlots over hardcoded defaults
          const applicableTemplates = timeSlots.filter(s => 
            isSameClass(s.class_name, currentClass) && 
            s.days.includes(dayName)
          );

          const applicableShifts = applicableTemplates.length > 0
            ? applicableTemplates.map(t => ({
                id: t.id,
                name: t.session_type,
                startTime: t.start_time,
                endTime: t.end_time,
                defaultDays: t.days
              }))
            : chosenShifts.filter(shift => shift.defaultDays.includes(dayName));

          if (applicableShifts.length === 0) continue;

          for (const shift of applicableShifts) {
            const currentSubject = classSubjects[rotationIndex % classSubjects.length];
            rotationIndex++;

            // Teacher Assignment Strategy
            let assignedTeacherName = 'Mwalimu wa Somo';
            if (generatorConfig.teacher_strategy === 'SINGLE_TEACHER' && generatorConfig.single_teacher_name) {
              assignedTeacherName = generatorConfig.single_teacher_name;
            } else {
              // Match teacher specializing in this subject
              const matchedTeacher = teachers.find(t => 
                t.subjects && t.subjects.some((s: string) => 
                  s.toLowerCase().includes(currentSubject.toLowerCase()) || 
                  currentSubject.toLowerCase().includes(s.toLowerCase())
                )
              );
              assignedTeacherName = matchedTeacher?.name || teachers[rotationIndex % Math.max(1, teachers.length)]?.name || 'Mwalimu wa Somo';
            }

            const newEntry: RemedialTimetableEntry = {
              class_name: currentClass,
              stream: generatorConfig.target_stream,
              subject: currentSubject,
              teacher_name: assignedTeacherName,
              date: isDateBound ? dateStr : undefined as any,
              day_of_week: dayName,
              start_time: shift.startTime,
              end_time: shift.endTime,
              period_time: `${shift.startTime}-${shift.endTime}`,
              room: `${currentClass} Room`,
              term: generatorConfig.term,
              academic_year: generatorConfig.academic_year,
              notify_students: true
            };

            // Conflict check
            const conflict = checkRemedialConflict([...entries, ...generatedEntries], newEntry);
            const isBreak = isOverlappingWithBreak(newEntry.day_of_week, newEntry.start_time, newEntry.end_time);

            if (!conflict.hasConflict && !isBreak) {
              generatedEntries.push(newEntry);
            }
          }
        }
      }

      if (generatedEntries.length === 0) {
        setAlertNotice({ 
          type: 'warning', 
          message: 'Hakuna vipindi vipya vilivyoweza kutengenezwa (huenda tayari vipo au kuna migongano ya walimu kwa muda huu).' 
        });
      } else {
        await saveRemedialTimetableBatch(schoolId, generatedEntries);

        setAlertNotice({
          type: 'success',
          message: `Hongera! Ratiba Huru ya Remedial imetengenezwa kikamilifu kwa vipindi ${generatedEntries.length} bila kuingiliana na Ratiba Kuu!`
        });

        if (onAddActivityLog) {
          onAddActivityLog({
            action: 'REMEDIAL_TIMETABLE_AUTO_GENERATED',
            category: 'timetable',
            title: `Remedial Timetable Generated (${generatorConfig.scope})`,
            description: `Vipindi ${generatedEntries.length} vya masomo ya ziada vimetengenezwa kiotomatiki kwa mfumo huru wa Remedial.`
          });
        }

        // Switch to grid view to preview results immediately
        setActiveTab('general');
        await loadTimetable();
      }
    } catch (err: any) {
      console.error("Standalone generator error:", err);
      setAlertNotice({ type: 'error', message: err.message || 'Hitilafu imetokea wakati wa kutengeneza ratiba.' });
    } finally {
      setGeneratingAuto(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Standalone Header Banner */}
      <div className="bg-gradient-to-r from-[#0a1e38] via-[#163e72] to-[#0f2948] rounded-3xl p-6 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        {/* Subtle decorative background blurbs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg font-black shrink-0">
              <CalendarCheck2 className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  RATIBA HURU YA REMEDIAL (REMEDIAL TIMETABLE)
                </h2>
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-[11px] rounded-full uppercase tracking-wider shadow-xs">
                  Inajitegemea 100% (Standalone)
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1 font-medium max-w-2xl">
                Ratiba hii inatengenezwa na kusimamiwa kivyake kwa masomo ya jioni (Evening), asubuhi (Pre-prep), na wikendi (Weekend Tuition). 
                <strong> Haina mgongano wala uhusiano na Ratiba Kuu ya Kufundishia (Teaching Timetable).</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                activeTab === 'generator'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-white'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400'
              }`}
            >
              <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>⚡ Mjenzi Huru wa Ratiba</span>
            </button>

            <button
              onClick={() => handleOpenAdd()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Weka Kipindi</span>
            </button>

            <button
              onClick={() => {
                const targetEntries = filteredEntries.length > 0 ? filteredEntries : entries;
                exportRemedialTimetableCSV({
                  entries: targetEntries,
                  schoolInfo,
                  className: classFilter,
                  streamName: streamFilter,
                  academicYear: new Date().getFullYear().toString()
                });
                setAlertNotice({ type: 'success', message: 'Ratiba ya Remedial imepakuliwa kama faili la Excel (.CSV)!' });
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Pakua ratiba kama Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Pakua Excel (CSV)</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4 text-blue-700" />
              <span>Print PDF</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar inside Banner */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('kiomoni_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'kiomoni_matrix'
                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white font-extrabold'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Grid className="w-4 h-4 text-amber-300" />
            <span>🏫 Ratiba ya Kiomoni (Master Matrix)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'general'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Building className="w-4 h-4 text-blue-700" />
            <span>🏫 Ratiba ya Jumla (General Master)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'class'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>🎒 Ratiba ya Darasa (Class Timetable)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teacher')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'teacher'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4 text-amber-500" />
            <span>👨‍🏫 Ratiba ya Mwalimu (Teacher Timetable)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('month')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'month'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>📅 Mwonekano wa Mwezi (Monthly View)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'list'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <List className="w-4 h-4" />
            <span>📋 Orodha Kamili ({entries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general_unified')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'general_unified'
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-white font-extrabold'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-300" />
            <span>👥 Walimu &amp; Venues Sambamba</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teacher_manual_entry')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'teacher_manual_entry'
                ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white font-extrabold'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-300" />
            <span>✍️ Upangaji kwa Fomu (Manual Form Entry)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'generator'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>⚡ Mjenzi Huru wa Ratiba (Generator Studio)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'performance'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold ring-2 ring-white/50'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-300" />
            <span>📊 Ripoti ya Ufanisi (Performance & Impact)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'settings'
                ? 'bg-white text-blue-900 shadow-md ring-2 ring-white'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Settings2 className="w-4 h-4 text-amber-300" />
            <span>⚙️ Mipangilio ya Muda</span>
          </button>
        </div>
      </div>

      {/* Remedial Key Executive Dashboard Summary */}
      <RemedialDashboardSummary
        schoolId={schoolId}
        onQuickAddSchedule={() => handleOpenAdd()}
      />

      {/* Global Clash Alert Banner */}
      {allScheduleClashes.size > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-rose-100 border-2 border-rose-400 text-rose-950 p-4 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-rose-800 tracking-wider flex items-center gap-2">
                <span>Migongano ya Ratiba Imegunduliwa ({allScheduleClashes.size} Vipindi)</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-extrabold">Inahitaji Marekebisho</span>
              </div>
              <div className="text-xs font-semibold text-rose-900/90 mt-0.5">
                Kuna vipindi vya masomo ya ziada vinavyogongana na vipindi vya ratiba ya kawaida (Timetable Assignments) au vipindi vingine vya remedial. Kila kipindi chenye mgongano kimewekewa alama nyekundu.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer transition"
          >
            Tazama Kwenye Orodha
          </button>
        </div>
      )}

      {/* Toast / Alert notice */}
      {alertNotice && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold animate-in fade-in duration-200 ${
          alertNotice.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          alertNotice.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {alertNotice.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> :
             alertNotice.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> :
             <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span>{alertNotice.message}</span>
          </div>
          <button onClick={() => setAlertNotice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'performance' && (
        <RemedialPerformanceReport
          schoolId={schoolId}
          students={students}
          examinationRecords={examinationRecords}
          exams={exams}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
        />
      )}

      {/* Time Slot Templates Settings */}
      {activeTab === 'settings' && (
        <RemedialTimeSlotSettings 
          schoolId={schoolId} 
          registeredClasses={registeredClasses}
        />
      )}

      {/* FILTER CONTROLS BAR */}
      {activeTab !== 'generator' && activeTab !== 'performance' && activeTab !== 'settings' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Darasa Filter (Shown for Class, List, Month, and General) */}
              {(activeTab === 'class' || activeTab === 'list' || activeTab === 'month' || activeTab === 'general') && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {activeTab === 'class' ? 'Chagua Darasa:' : 'Darasa:'}
                  </span>
                  <select
                    value={classFilter}
                    onChange={e => {
                      const newCls = e.target.value;
                      setClassFilter(newCls);
                      if (newCls !== 'ALL') {
                        const streams = getStreamsForClass(newCls);
                        setStreamFilter(streams[0] || 'A');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    {activeTab !== 'class' && <option value="ALL">Madarasa Yote (All Classes)</option>}
                    {registeredClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mkondo Filter */}
              {(activeTab === 'class' || activeTab === 'list' || activeTab === 'month' || activeTab === 'general') && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mkondo:</span>
                  <select
                    value={streamFilter}
                    onChange={e => setStreamFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Mikondo Yote</option>
                    {availableStreamsForFilter.map(s => (
                      <option key={s} value={s}>{s === 'All Streams' ? 'Mikondo Yote' : `Stream ${s}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Session Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aina ya Kipindi:</span>
                <select
                  value={sessionTypeFilter}
                  onChange={e => setSessionTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Aina Zote (All Sessions)</option>
                  <option value="Morning">Asubuhi (Morning)</option>
                  <option value="Evening">Jioni (Evening)</option>
                  <option value="Weekend">Wikendi (Weekend)</option>
                </select>
              </div>

              {/* Teacher Selector (Shown for Teacher and List view) */}
              {activeTab === 'teacher' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chagua Mwalimu:</span>
                  <select
                    value={selectedTeacherFilter}
                    onChange={e => setSelectedTeacherFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Walimu Wote --</option>
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {/* Tarehe Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarehe:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tafuta somo, mwalimu..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {classFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleClearSchedule(classFilter, streamFilter)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer flex items-center gap-1"
                  title={`Futa ratiba ya remedial kwa ${classFilter}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Futa Ratiba</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT REMEDIAL SESSION SETTING BAR (CHAGUA REMEDIAL INAYOPANGWA: JIONI / ASUBUHI / WEEKEND) */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Setting ya Remedial Inayopangwa (Active Remedial Session Mode)</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Ukichagua <strong>Remedial ya Jioni (Evening)</strong>, vipindi vya Jioni pekee ndivyo vitakavyoonekana kwenye jedwali na fomu za kupanga ratiba.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'Evening', label: '🌙 Remedial ya Jioni Tu (Evening)' },
            { id: 'Morning', label: '🌅 Remedial ya Asubuhi Tu (Morning)' },
            { id: 'Weekend', label: '📅 Remedial ya Weekend Tu' },
            { id: 'ALL', label: '📋 Vipindi Vyote (All)' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSessionTypeFilter(opt.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                sessionTypeFilter === opt.id
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-white/50'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW - TEACHER MANUAL FORM ENTRY (REMEDIAL)                                */}
      {/* ========================================================================= */}
      {activeTab === 'teacher_manual_entry' && (
        <RemedialTeacherManualEntry
          schoolId={schoolId}
          teachers={teachers}
          currentUser={currentUser}
          students={students}
          teacherAssignments={teacherAssignments}
          timetableAssignments={timetableAssignments}
          activeSessionTypeSetting={sessionTypeFilter}
          onChangeSessionTypeSetting={setSessionTypeFilter}
          onRefresh={loadTimetable}
        />
      )}

      {/* ========================================================================= */}
      {/* VIEW - GENERAL UNIFIED REMEDIAL TIMETABLE (TEACHERS & VENUES SIDE-BY-SIDE) */}
      {/* ========================================================================= */}
      {activeTab === 'general_unified' && (
        <GeneralRemedialTimetable
          schoolId={schoolId}
          teachers={teachers}
          schoolInfo={schoolInfo}
          teacherAssignments={teacherAssignments}
          timetableAssignments={timetableAssignments}
        />
      )}

      {/* ========================================================================= */}
      {/* VIEW 0: 🏫 KIOMONI MASTER MATRIX TABLE (EXACTLY MATCHING ATTACHED IMAGE)  */}
      {/* ========================================================================= */}
      {activeTab === 'kiomoni_matrix' && (
        <div className="space-y-6">
          <div className="bg-white border-4 border-red-600 rounded-3xl shadow-xl overflow-hidden">
            {/* School Name Header */}
            <div className="bg-red-600 text-white py-4 px-6 text-center font-black tracking-wider text-lg md:text-2xl uppercase shadow-md">
              KIOMONI SECONDARY SCHOOL
            </div>
            <div className="bg-amber-400 text-slate-950 py-2.5 px-6 text-center font-black tracking-widest text-sm md:text-lg uppercase border-y-2 border-red-600">
              REMEDIAL TIME TABLE (MASTER MATRIX)
            </div>

            {/* Control Actions Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-700">
                Ratiba Rasmi ya Jumla ya Shule Nzima (Kiomoni Style Matrix Grid) • Bonyeza kwenye sanduku lolote la somo kuona au kuhariri.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportGeneralPDF}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Print PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>+ Weka Kipindi Kipya</span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto p-4">
              <table className="w-full border-2 border-slate-900 text-center text-xs border-collapse min-w-[1100px]">
                <thead>
                  {/* Top Level Grouping Header: Form Classes */}
                  <tr className="bg-slate-900 text-white font-black text-xs uppercase border-b-2 border-slate-900">
                    <th className="p-3 border-r-2 border-slate-900 w-36 bg-slate-950">DAY / DATE</th>
                    <th className="p-3 border-r-2 border-slate-900 w-28 bg-slate-950">TIME</th>
                    <th colSpan={5} className="p-3 border-r-2 border-slate-900 bg-emerald-900 text-emerald-100">FORM TWO</th>
                    <th colSpan={6} className="p-3 border-r-2 border-slate-900 bg-teal-900 text-teal-100">FORM THREE</th>
                    <th colSpan={4} className="p-3 bg-blue-950 text-blue-100">FORM FOUR</th>
                  </tr>
                  {/* Second Level Streams Header */}
                  <tr className="bg-slate-800 text-white font-bold text-[11px] uppercase border-b-2 border-slate-900">
                    <th className="p-2 border-r-2 border-slate-900 bg-slate-850"></th>
                    <th className="p-2 border-r-2 border-slate-900 bg-slate-850"></th>
                    {/* Form Two Streams A-E */}
                    {['A', 'B', 'C', 'D', 'E'].map(s => (
                      <th key={`f2_${s}`} className="p-2 border-r border-slate-700 bg-emerald-800">{s}</th>
                    ))}
                    {/* Form Three Streams A-F */}
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                      <th key={`f3_${s}`} className="p-2 border-r border-slate-700 bg-teal-800">{s}</th>
                    ))}
                    {/* Form Four Streams A-D */}
                    {['A', 'B', 'C', 'D'].map((s, i) => (
                      <th key={`f4_${s}`} className={`p-2 ${i < 3 ? 'border-r border-slate-700' : ''} bg-blue-900`}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-900 font-semibold">
                  {gridTimeSlots.map((slot) => {
                    const slotDates = [
                      { date: '2026-02-02', day: 'Monday' },
                      { date: '2026-02-03', day: 'Tuesday' },
                      { date: '2026-02-04', day: 'Wednesday' },
                      { date: '2026-02-09', day: 'Monday' },
                      { date: '2026-02-10', day: 'Tuesday' },
                      { date: '2026-02-11', day: 'Wednesday' },
                      { date: '2026-02-16', day: 'Monday' },
                      { date: '2026-02-17', day: 'Tuesday' },
                      { date: '2026-02-18', day: 'Wednesday' }
                    ];

                    return slotDates.map((sd, sIdx) => {
                      const getCellSubject = (className: string, stream: string) => {
                        const match = entries.find(e => {
                          const matchDate = e.date === sd.date || (e.day_of_week || '').toLowerCase() === sd.day.toLowerCase();
                          const matchClass = isSameClass(e.class_name, className);
                          const matchStream = e.stream === 'All Streams' || e.stream?.toUpperCase() === stream.toUpperCase();
                          const matchTime = (e.start_time === slot.start && e.end_time === slot.end) || e.period_time?.includes(slot.start);
                          return matchDate && matchClass && matchStream && matchTime;
                        });
                        if (match) {
                          return { subject: match.subject, teacher: match.teacher_name, id: match.id };
                        }
                        return null;
                      };

                      return (
                        <tr key={`${sd.date}_${slot.start}_${sIdx}`} className="hover:bg-amber-50/40 transition">
                          {/* Day / Date Cell */}
                          <td className="p-2.5 border-r-2 border-slate-900 bg-slate-100 font-black text-slate-900 uppercase">
                            <div>{SWAHILI_DAYS[sd.day] || sd.day}</div>
                            <div className="text-[10px] text-slate-600 font-mono mt-0.5">{sd.date}</div>
                          </td>

                          {/* Time Cell */}
                          <td className="p-2.5 border-r-2 border-slate-900 bg-slate-200/80 font-mono font-black text-blue-950 text-xs">
                            {slot.start}-{slot.end}
                          </td>

                          {/* Form Two Streams (A, B, C, D, E) */}
                          {['A', 'B', 'C', 'D', 'E'].map(stream => {
                            const cellData = getCellSubject('Form 2', stream) || getCellSubject('Form Two', stream);
                            return (
                              <td key={`f2_cell_${stream}`} className="p-2 border-r border-slate-300 text-center align-middle">
                                {cellData ? (
                                  <div 
                                    onClick={() => {
                                      const target = entries.find(e => e.id === cellData.id);
                                      if (target) handleOpenEdit(target);
                                    }}
                                    className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-[11px] shadow-xs cursor-pointer hover:scale-105 transition"
                                    title={`Somo: ${cellData.subject} | Mwl: ${cellData.teacher}`}
                                  >
                                    {cellData.subject.split(' ')[0].toUpperCase()}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdd(sd.day, slot.start, slot.end, sd.date)}
                                    className="w-full h-8 text-[10px] text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center cursor-pointer"
                                  >
                                    —
                                  </button>
                                )}
                              </td>
                            );
                          })}

                          {/* Form Three Streams (A, B, C, D, E, F) */}
                          {['A', 'B', 'C', 'D', 'E', 'F'].map(stream => {
                            const cellData = getCellSubject('Form 3', stream) || getCellSubject('Form Three', stream);
                            return (
                              <td key={`f3_cell_${stream}`} className="p-2 border-r border-slate-300 text-center align-middle">
                                {cellData ? (
                                  <div 
                                    onClick={() => {
                                      const target = entries.find(e => e.id === cellData.id);
                                      if (target) handleOpenEdit(target);
                                    }}
                                    className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-700 to-pink-700 text-white font-black text-[11px] shadow-xs cursor-pointer hover:scale-105 transition"
                                    title={`Somo: ${cellData.subject} | Mwl: ${cellData.teacher}`}
                                  >
                                    {cellData.subject.split(' ')[0].toUpperCase()}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdd(sd.day, slot.start, slot.end, sd.date)}
                                    className="w-full h-8 text-[10px] text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center cursor-pointer"
                                  >
                                    —
                                  </button>
                                )}
                              </td>
                            );
                          })}

                          {/* Form Four Streams (A, B, C, D) */}
                          {['A', 'B', 'C', 'D'].map((stream, i) => {
                            const cellData = getCellSubject('Form 4', stream) || getCellSubject('Form Four', stream);
                            return (
                              <td key={`f4_cell_${stream}`} className={`p-2 ${i < 3 ? 'border-r border-slate-300' : ''} text-center align-middle`}>
                                {cellData ? (
                                  <div 
                                    onClick={() => {
                                      const target = entries.find(e => e.id === cellData.id);
                                      if (target) handleOpenEdit(target);
                                    }}
                                    className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-700 to-rose-700 text-white font-black text-[11px] shadow-xs cursor-pointer hover:scale-105 transition"
                                    title={`Somo: ${cellData.subject} | Mwl: ${cellData.teacher}`}
                                  >
                                    {cellData.subject.split(' ')[0].toUpperCase()}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdd(sd.day, slot.start, slot.end, sd.date)}
                                    className="w-full h-8 text-[10px] text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center cursor-pointer"
                                  >
                                    —
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: 🏫 RATIBA YA JUMLA YA REMEDIAL (MASTER WHOLE-SCHOOL TIMETABLE)     */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* Executive Master Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-3xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  RATIBA YA JUMLA YA REMEDIAL (MASTER TIMETABLE)
                </h3>
              </div>
              <p className="text-xs text-blue-200 mt-1 font-medium">
                Jedwali kuu la shule nzima linaloonyesha vipindi vyote vya masomo ya ziada katika madarasa, mikondo, vyumba, na walimu wote.
              </p>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{entries.length} Vipindi Vimeratibiwa</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{registeredClasses.length} Madarasa Yaliyosajiliwa</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-300" />
                  <span>{new Set(entries.map(e => e.teacher_name).filter(Boolean)).size} Walimu Wanaofundisha</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-300" />
                  <span>{new Set(entries.map(e => e.room).filter(Boolean)).size || 1} Vyumba Vinavyotumika</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleExportGeneralPDF}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
                title="Chapisha Ratiba ya Jumla ya Shule Nzima"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>🖨️ Chapisha PDF ya Shule</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportRemedialTimetableCSV(entries, 'Ratiba_ya_Jumla_Remedial');
                  setAlertNotice({ type: 'success', message: 'Ratiba ya Jumla imepakuliwa kama CSV/Excel!' });
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
                title="Pakua Excel ya Shule Nzima"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Pakua Excel (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>+ Weka Kipindi</span>
              </button>
            </div>
          </div>

          {/* Master Grid Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-black text-[11px] border-b border-slate-200">
                    <th className="p-3.5 border-r border-slate-200 w-36 text-center bg-slate-200/70">Muda / Shift</th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day} className="p-3.5 border-r border-slate-200 text-center last:border-r-0">
                        <div>{SWAHILI_DAYS[day] || day}</div>
                        <div className="text-[10px] text-slate-400 font-medium lowercase tracking-normal">{day}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridTimeSlots.map((slot) => (
                    <tr key={`${slot.start}-${slot.end}`} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 border-r border-slate-200 bg-slate-50/80 text-center align-top">
                        <div className="font-mono font-black text-blue-950 text-xs">
                          {slot.start} - {slot.end}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                          {slot.label.split('(')[0]?.trim()}
                        </div>
                      </td>

                      {DAYS_OF_WEEK.map(day => {
                        const matchingSessions = filteredEntries.filter(e => {
                          const matchDay = (e.day_of_week || '').toLowerCase() === day.toLowerCase();
                          const sStart = e.start_time || e.period_time?.split('-')[0];
                          const sEnd = e.end_time || e.period_time?.split('-')[1];
                          return matchDay && sStart === slot.start && sEnd === slot.end;
                        });

                        return (
                          <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[140px]">
                            {matchingSessions.length > 0 ? (
                              <div className="space-y-1.5">
                                {matchingSessions.map(session => (
                                  <div 
                                    key={session.id} 
                                    className="group relative p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 hover:border-blue-400 hover:shadow-md transition text-slate-800"
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-700 text-white shrink-0">
                                        {session.class_name} {session.stream === 'All Streams' ? '(Yote)' : session.stream}
                                      </span>
                                      {session.target_type === 'TARGETED_STUDENTS' && (
                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                          🎯 Maalum ({session.target_student_ids?.length || 0})
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-1 font-black text-xs text-blue-950 leading-tight">
                                      {session.subject}
                                    </div>

                                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-slate-700 truncate">
                                      <User className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span className="truncate">{session.teacher_name}</span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{session.room || `${session.class_name} Room`}</span>
                                    </div>

                                    {/* Quick action buttons */}
                                    <div className="mt-2 pt-1.5 border-t border-blue-200/60 flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(session)}
                                        className="p-1 text-blue-700 hover:bg-blue-100 rounded cursor-pointer"
                                        title="Hariri kipindi"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(session.id)}
                                        className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                                        title="Futa kipindi"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full min-h-[70px] flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdd(day, slot.start, slot.end)}
                                  className="w-full h-full py-3 border border-dashed border-slate-200 rounded-xl text-[11px] font-bold text-slate-400 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50/30 transition flex flex-col items-center justify-center gap-1 cursor-pointer group"
                                >
                                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition" />
                                  <span>+ Weka</span>
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: 🎒 RATIBA YA KILA DARASA (DEDICATED CLASS TIMETABLE)               */}
      {/* ========================================================================= */}
      {activeTab === 'class' && (
        <div className="space-y-5">
          {/* Class Header Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-sm border border-emerald-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-amber-300" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  RATIBA YA REMEDIAL: {classFilter.toUpperCase()} {streamFilter !== 'ALL' ? `(MKONDO ${streamFilter})` : '(MIKONDO YOTE)'}
                </h3>
              </div>
              <p className="text-xs text-emerald-100 mt-1 font-medium">
                Ratiba rasmi ya masomo ya ziada kwa darasa hili iliyosawazishwa na usajili wa madarasa wa mfumo mkuu wa kawaida.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>{classViewEntries.length} Vipindi Vimepangwa</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{classFilterNominalStudents.length} Wanafunzi Waliosajiliwa Darasani</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>
                    {classFilterNominalStudents.filter(s => classViewEntries.some(e => e.target_student_ids?.includes(String(s.id)))).length} Wanafunzi Maalum
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleExportClassPDF(classFilter, streamFilter)}
                className="px-4 py-2.5 bg-white text-emerald-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer hover:bg-emerald-50 transition"
              >
                <Printer className="w-4 h-4 text-emerald-800" />
                <span>🖨️ Chapisha Ratiba ya Darasa (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportRemedialTimetableCSV(classViewEntries, `Ratiba_Remedial_${classFilter}_${streamFilter}`);
                  setAlertNotice({ type: 'success', message: `Ratiba ya ${classFilter} imepakuliwa kama CSV!` });
                }}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Pakua CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAdd()}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>+ Panga Kipindi</span>
              </button>
            </div>
          </div>

          {/* Class Weekly Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-black text-xs text-slate-900 uppercase flex items-center gap-2">
                <Grid className="w-4 h-4 text-emerald-600" />
                <span>Ratiba ya Wiki kwa {classFilter} ({streamFilter !== 'ALL' ? `Mkondo ${streamFilter}` : 'Mikondo Yote'})</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {classViewEntries.length} Vipindi Vimepangwa
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-black text-[11px] border-b border-slate-200">
                    <th className="p-3.5 border-r border-slate-200 w-36 text-center bg-slate-200/70">Muda / Shift</th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day} className="p-3.5 border-r border-slate-200 text-center last:border-r-0">
                        <div>{SWAHILI_DAYS[day] || day}</div>
                        <div className="text-[10px] text-slate-400 font-medium lowercase tracking-normal">{day}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridTimeSlots.map(slot => (
                    <tr key={`${slot.start}-${slot.end}`} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 border-r border-slate-200 bg-slate-50/80 text-center align-top">
                        <div className="font-mono font-black text-emerald-950 text-xs">
                          {slot.start} - {slot.end}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                          {slot.label.split('(')[0]?.trim()}
                        </div>
                      </td>

                      {DAYS_OF_WEEK.map(day => {
                        const classSessions = classViewEntries.filter(e => {
                          const matchDay = (e.day_of_week || '').toLowerCase() === day.toLowerCase();
                          const sStart = e.start_time || e.period_time?.split('-')[0];
                          const sEnd = e.end_time || e.period_time?.split('-')[1];
                          return matchDay && sStart === slot.start && sEnd === slot.end;
                        });

                        return (
                          <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[130px]">
                            {classSessions.length > 0 ? (
                              <div className="space-y-1.5">
                                {classSessions.map(session => (
                                  <div
                                    key={session.id}
                                    className="group relative p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition text-slate-800 space-y-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="font-black text-xs text-emerald-950 leading-tight">
                                        {session.subject}
                                      </div>
                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 shrink-0">
                                        {session.stream === 'All Streams' ? 'Yote' : `M ${session.stream}`}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 truncate">
                                      <User className="w-3 h-3 text-emerald-700 shrink-0" />
                                      <span className="truncate">Mwl. {session.teacher_name}</span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                      <span className="flex items-center gap-0.5 truncate">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{session.room || 'Classroom'}</span>
                                      </span>
                                      {session.target_type === 'TARGETED_STUDENTS' ? (
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                                          🎯 Maalum ({session.target_student_ids?.length || 0})
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                          👥 Darasa Zima
                                        </span>
                                      )}
                                    </div>

                                    <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(session)}
                                        className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                                        title="Hariri kipindi"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(session.id)}
                                        className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                                        title="Futa kipindi"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full min-h-[65px] flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdd(day, slot.start, slot.end)}
                                  className="w-full h-full py-2.5 border border-dashed border-slate-200 rounded-xl text-[11px] font-bold text-slate-400 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col items-center justify-center gap-1 cursor-pointer group"
                                >
                                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition" />
                                  <span>+ Weka</span>
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nominal Roll & Remedial Targeting Checklist for this Class */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-xs uppercase text-slate-900">
                  Orodha ya Wanafunzi wa {classFilter} {streamFilter !== 'ALL' ? `(Mkondo ${streamFilter})` : ''} ({classFilterNominalStudents.length} Wanafunzi)
                </h4>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                Wanafunzi wote waliosajiliwa kwenye daftari la shule
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
              {classFilterNominalStudents.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs font-bold text-slate-400">
                  Hakuna orodha ya wanafunzi iliyopatikana kwa darasa hili kwa sasa.
                </div>
              ) : (
                classFilterNominalStudents.map(student => {
                  const targetedInSessions = classViewEntries.filter(e => 
                    e.target_type === 'TARGETED_STUDENTS' && e.target_student_ids?.includes(String(student.id))
                  );

                  return (
                    <div
                      key={student.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-800 truncate">{student.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{student.regNo || 'Bila Namba'}</div>
                      </div>
                      {targetedInSessions.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 shrink-0">
                          🎯 {targetedInSessions.length} Remedial
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200 text-slate-600 shrink-0">
                          👥 Darasa
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 📅 MWONEKANO WA MWEZI (MONTHLY CALENDAR VIEW)                         */}
      {/* ========================================================================= */}
      {activeTab === 'month' && (
        <RemedialMonthView
          entries={entries}
          classFilter={classFilter}
          streamFilter={streamFilter}
          onSelectEntry={handleOpenEdit}
          onAddOnDate={(dateStr, dayOfWeek) => {
            handleOpenAdd(dayOfWeek, '16:00', '17:30', dateStr);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 📋 ORODHA YA VIPINDI (DETAILED SESSION LIST VIEW)                   */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-blue-700" />
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                ORODHA KAMILI YA VIPINDI VYA REMEDIAL ({filteredEntries.length} VIPINDI)
              </h3>
            </div>
            <button
              onClick={() => handleOpenAdd()}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Weka Kipindi Kipya</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider font-black text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3 border-r border-slate-200 w-12 text-center">#</th>
                  <th className="p-3 border-r border-slate-200">Siku ya Wiki</th>
                  <th className="p-3 border-r border-slate-200">Muda (Shift)</th>
                  <th className="p-3 border-r border-slate-200">Darasa &amp; Mkondo</th>
                  <th className="p-3 border-r border-slate-200">Somo</th>
                  <th className="p-3 border-r border-slate-200">Mwalimu</th>
                  <th className="p-3 border-r border-slate-200">Chumba / Venue</th>
                  <th className="p-3 text-center w-24">Hatua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      Inapakia ratiba ya remedial...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">Hakuna vipindi vilivyopangwa kwa uteuzi huu.</p>
                      <p className="text-xs text-slate-400 mt-1">Tumia Mjenzi Huru wa Ratiba au kitufe cha '+ Weka Kipindi' kuanza.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-black text-[#1f4d8b] uppercase">{SWAHILI_DAYS[item.day_of_week] || item.day_of_week}</div>
                        {item.date && <div className="text-[10px] text-slate-400 font-mono">{item.date}</div>}
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded font-mono font-bold text-xs">
                          {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : item.period_time}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-black text-slate-900">{item.class_name}</div>
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {item.stream === 'All Streams' ? 'Mikondo Yote' : `Mkondo ${item.stream}`}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{item.subject}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{item.teacher_name}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-slate-200">
                        <span className="text-slate-600 font-medium">
                          {item.room || `${item.class_name} Room`}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ⚡ MJENZI HURU WA RATIBA (STANDALONE GENERATOR STUDIO KIVYAKE)     */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-500 fill-amber-500" />
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                  MJENZI HURU WA RATIBA YA REMEDIAL (STANDALONE REMEDIAL GENERATOR)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tengeneza ratiba nzima ya masomo ya ziada kivyake bila kutegemea wala kugusa ratiba ya kawaida ya masomo.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleRunStandaloneGenerator} className="space-y-6">
            {/* HATUA 1: WIGO WA RATIBA (SCOPE) */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="block text-xs font-black uppercase text-slate-900">
                1. Chagua Wigo wa Ratiba (Scope ya Madarasa) <span className="text-rose-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { id: 'SINGLE_CLASS', label: 'Darasa Moja Pekee', desc: 'Class maalum na mkondo wake' },
                  { id: 'LEVEL_PRIMARY', label: 'Primary Nzima (Class 1-7)', desc: 'Madarasa yote ya Msingi' },
                  { id: 'LEVEL_SECONDARY', label: 'Secondary (Form 1-4)', desc: 'Kidato cha 1 hadi 4' },
                  { id: 'EXAM_CLASSES', label: 'Madarasa ya Mitihani', desc: 'Class 4, 7 & Form 2, 4' },
                  { id: 'ALL_SCHOOL', label: 'Shule Nzima (All Levels)', desc: 'Madarasa yote yaliyosajiliwa' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGeneratorConfig({ ...generatorConfig, scope: opt.id as any })}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      generatorConfig.scope === opt.id
                        ? 'bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-500/20 font-black'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-normal">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {generatorConfig.scope === 'SINGLE_CLASS' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Chagua Darasa:</label>
                    <select
                      value={generatorConfig.target_class}
                      onChange={e => {
                        const newCls = e.target.value;
                        const streams = getStreamsForClass(newCls);
                        setGeneratorConfig({
                          ...generatorConfig,
                          target_class: newCls,
                          target_stream: streams[0] || 'A'
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      {registeredClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Chagua Mkondo (Stream):</label>
                    <select
                      value={generatorConfig.target_stream}
                      onChange={e => setGeneratorConfig({ ...generatorConfig, target_stream: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      {getStreamsForClass(generatorConfig.target_class).map(s => (
                        <option key={s} value={s}>{s === 'All Streams' ? 'Mikondo Yote' : `Stream ${s}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* HATUA 2: SHIFTS / NYAKATI ZA REMEDIAL */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-slate-900">
                  2. Chagua Nyakati / Shifts za Masomo ya Remedial <span className="text-rose-500">*</span>
                </label>
                <button 
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="text-[10px] font-black text-blue-600 hover:underline uppercase"
                >
                  Sanidi Templates Zaidi →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_REMEDIAL_SHIFTS.map(shift => {
                  const isSelected = generatorConfig.selected_shifts.includes(shift.id);
                  const hasTemplate = timeSlots.some(s => s.session_type === shift.name || s.id === shift.id);
                  
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setGeneratorConfig({
                            ...generatorConfig,
                            selected_shifts: generatorConfig.selected_shifts.filter(s => s !== shift.id)
                          });
                        } else {
                          setGeneratorConfig({
                            ...generatorConfig,
                            selected_shifts: [...generatorConfig.selected_shifts, shift.id]
                          });
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex items-start gap-3 ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-black">{shift.swahiliName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-blue-700">
                            {shift.startTime} - {shift.endTime}
                          </span>
                          {hasTemplate && (
                            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Template
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-tight">{shift.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-blue-100/50 p-3 rounded-xl border border-blue-200/50 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 font-medium">
                  <strong>Kidokezo:</strong> Ikiwa uliweka muda maalum kwenye "Mipangilio ya Muda", mjenzi atatumia muda huo kwa kila darasa badala ya muda wa kawaida hapo juu. Hii inahakikisha walimu hawahitaji kuingiza muda kila mara.
                </p>
              </div>
            </div>

            {/* HATUA 3: UTEUZI WA MASOMO (SUBJECTS) */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-slate-900">
                  3. Chagua Masomo Yatakayofundishwa kwenye Remedial
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGeneratorConfig({ ...generatorConfig, selected_subjects: generatorSubjects })}
                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Chagua Yote
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setGeneratorConfig({ ...generatorConfig, selected_subjects: [] })}
                    className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Weka Upya
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                {generatorSubjects.map(sub => {
                  const isChecked = generatorConfig.selected_subjects.includes(sub);
                  return (
                    <label key={sub} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setGeneratorConfig({
                              ...generatorConfig,
                              selected_subjects: [...generatorConfig.selected_subjects, sub]
                            });
                          } else {
                            setGeneratorConfig({
                              ...generatorConfig,
                              selected_subjects: generatorConfig.selected_subjects.filter(s => s !== sub)
                            });
                          }
                        }}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="truncate">{sub}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">
                {generatorConfig.selected_subjects.length === 0
                  ? 'Ukichagua bila kuweka alama, masomo yote makuu yatazungushwa kwa zamu.'
                  : `Masomo ${generatorConfig.selected_subjects.length} yamechaguliwa kwa ajili ya kuratibiwa.`}
              </p>
            </div>

            {/* HATUA 4: MGAWANYO WA WALIMU NA MFUMO WA WIKI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-black uppercase text-slate-900">
                  4. Mfumo wa Ratiba (Schedule Mode)
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-white cursor-pointer">
                    <input
                      type="radio"
                      name="gen_mode"
                      checked={generatorConfig.mode === 'WEEKLY_TEMPLATE'}
                      onChange={() => setGeneratorConfig({ ...generatorConfig, mode: 'WEEKLY_TEMPLATE' })}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">Ratiba ya Wiki Inayojirudia (Weekly Recurring)</div>
                      <div className="text-[10px] text-slate-500">Inatengeneza ratiba ya kila wiki inayotumika muhula mzima.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-white cursor-pointer">
                    <input
                      type="radio"
                      name="gen_mode"
                      checked={generatorConfig.mode === 'DATE_BOUND'}
                      onChange={() => setGeneratorConfig({ ...generatorConfig, mode: 'DATE_BOUND' })}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-black text-slate-900">Ratiba ya Tarehe Maalum (Calendar Date Sessions)</div>
                      <div className="text-[10px] text-slate-500">Inapanga tarehe maalum kwenye kalenda kwa wiki zilizochaguliwa.</div>
                    </div>
                  </label>
                </div>

                {generatorConfig.mode === 'DATE_BOUND' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Tarehe ya Kuanza:</label>
                      <input
                        type="date"
                        value={generatorConfig.start_date}
                        onChange={e => setGeneratorConfig({ ...generatorConfig, start_date: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Idadi ya Wiki:</label>
                      <select
                        value={generatorConfig.weeks_count}
                        onChange={e => setGeneratorConfig({ ...generatorConfig, weeks_count: Number(e.target.value) })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                      >
                        <option value={1}>Wiki 1</option>
                        <option value={2}>Wiki 2</option>
                        <option value={4}>Wiki 4 (Mwezi 1)</option>
                        <option value={8}>Wiki 8 (Miezi 2)</option>
                        <option value={12}>Wiki 12 (Muhula)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-black uppercase text-slate-900">
                  5. Mpangilio wa Walimu &amp; Ufutaji
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mgawanyo wa Walimu:</label>
                    <select
                      value={generatorConfig.teacher_strategy}
                      onChange={e => setGeneratorConfig({ ...generatorConfig, teacher_strategy: e.target.value as any })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="AUTO_SPECIALIZATION">Otomatiki: Kulingana na Masomo ya Walimu (Specialization)</option>
                      <option value="SINGLE_TEACHER">Panga Mwalimu Maalum kwa Vipindi Vyote</option>
                    </select>
                  </div>

                  {generatorConfig.teacher_strategy === 'SINGLE_TEACHER' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Chagua Mwalimu:</label>
                      <select
                        value={generatorConfig.single_teacher_name}
                        onChange={e => setGeneratorConfig({ ...generatorConfig, single_teacher_name: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        required
                      >
                        <option value="">-- Chagua Mwalimu --</option>
                        {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950">
                      <input
                        type="checkbox"
                        checked={generatorConfig.clear_existing_first}
                        onChange={e => setGeneratorConfig({ ...generatorConfig, clear_existing_first: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>Futa vipindi vya zamani vya madarasa haya kwanza kabla ya kuanzisha vipya</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTON BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Mfumo unahakikisha hakuna mwalimu atakayepangwa vipindi viwili kwa saa moja (Conflict-Free Guarantee).</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Ghairi (Rudi kwenye Jedwali)
                </button>

                <button
                  type="submit"
                  disabled={generatingAuto}
                  className="flex-1 sm:flex-initial px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition flex items-center justify-center gap-2"
                >
                  {generatingAuto ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
                  )}
                  <span>⚡ TENGENEZA RATIBA YA REMEDIAL KIVYAKE</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: 👨‍🏫 RATIBA YA MWALIMU (TEACHER TIMETABLE VIEW)                      */}
      {/* ========================================================================= */}
      {activeTab === 'teacher' && (
        <div className="space-y-5">
          {/* Teacher Executive Workload Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white p-5 rounded-3xl shadow-sm border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-amber-200" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  RATIBA YA REMEDIAL KWA MWALIMU: {selectedTeacherFilter ? `MWL. ${selectedTeacherFilter.toUpperCase()}` : 'WALIMU WOTE'}
                </h3>
              </div>
              <p className="text-xs text-amber-100 mt-1 font-medium">
                Ratiba binafsi ya ufundishaji wa masomo ya ziada na uchanganuzi wa masaa ya kazi kwa wiki.
              </p>

              {/* Workload badges */}
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-200" />
                  <span>{teacherWorkload.totalSessions} Vipindi kwa Wiki</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {teacherWorkload.totalMinutes} Dakika ({Math.floor(teacherWorkload.totalMinutes / 60)}h {teacherWorkload.totalMinutes % 60}m)
                  </span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-200" />
                  <span>{teacherWorkload.subjects.length} Masomo: {teacherWorkload.subjects.join(', ') || '-'}</span>
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{teacherWorkload.classes.length} Madarasa: {teacherWorkload.classes.join(', ') || '-'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleExportTeacherPDF(selectedTeacherFilter)}
                className="px-4 py-2.5 bg-white text-slate-900 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition"
              >
                <Printer className="w-4 h-4 text-amber-700" />
                <span>🖨️ Chapisha Ratiba ya Mwalimu (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportRemedialTimetableCSV(teacherViewEntries, `Ratiba_Remedial_Mwalimu_${selectedTeacherFilter || 'Wote'}`);
                  setAlertNotice({ type: 'success', message: 'Ratiba ya mwalimu imepakuliwa kama CSV!' });
                }}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Pakua CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  if (selectedTeacherFilter) {
                    setFormData(prev => ({ ...prev, teacher_name: selectedTeacherFilter }));
                  }
                  setIsModalOpen(true);
                }}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>+ Panga Kipindi</span>
              </button>
            </div>
          </div>

          {/* Teacher Weekly Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-black text-xs text-slate-900 uppercase flex items-center gap-2">
                <Grid className="w-4 h-4 text-amber-600" />
                <span>Jedwali la Vipindi vya Mwl. {selectedTeacherFilter || 'Wote'} kwa Wiki</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {teacherViewEntries.length} Vipindi Vimepatikana
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-black text-[11px] border-b border-slate-200">
                    <th className="p-3.5 border-r border-slate-200 w-36 text-center bg-slate-200/70">Muda / Shift</th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day} className="p-3.5 border-r border-slate-200 text-center last:border-r-0">
                        <div>{SWAHILI_DAYS[day] || day}</div>
                        <div className="text-[10px] text-slate-400 font-medium lowercase tracking-normal">{day}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gridTimeSlots.map(slot => (
                    <tr key={`${slot.start}-${slot.end}`} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 border-r border-slate-200 bg-slate-50/80 text-center align-top">
                        <div className="font-mono font-black text-amber-950 text-xs">
                          {slot.start} - {slot.end}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                          {slot.label.split('(')[0]?.trim()}
                        </div>
                      </td>

                      {DAYS_OF_WEEK.map(day => {
                        const sessions = teacherViewEntries.filter(e => {
                          const matchDay = (e.day_of_week || '').toLowerCase() === day.toLowerCase();
                          const sStart = e.start_time || e.period_time?.split('-')[0];
                          const sEnd = e.end_time || e.period_time?.split('-')[1];
                          return matchDay && sStart === slot.start && sEnd === slot.end;
                        });

                        return (
                          <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[130px]">
                            {sessions.length > 0 ? (
                              <div className="space-y-1.5">
                                {sessions.map(session => (
                                  <div
                                    key={session.id}
                                    className="group relative p-3 rounded-2xl bg-amber-50/90 border border-amber-200 hover:border-amber-400 hover:shadow-md transition text-slate-800 space-y-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-700 text-white shrink-0">
                                        {session.class_name} {session.stream === 'All Streams' ? '(Yote)' : `M ${session.stream}`}
                                      </span>
                                      {session.target_type === 'TARGETED_STUDENTS' && (
                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-white text-amber-800 border border-amber-300">
                                          🎯 ({session.target_student_ids?.length || 0})
                                        </span>
                                      )}
                                    </div>

                                    <div className="font-black text-xs text-amber-950 leading-tight">
                                      {session.subject}
                                    </div>

                                    <div className="text-[10px] text-slate-600 flex items-center justify-between">
                                      <span className="flex items-center gap-0.5 truncate">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{session.room || 'Classroom'}</span>
                                      </span>
                                      <span className="font-mono text-slate-500 text-[10px]">
                                        {session.duration_minutes || 60}m
                                      </span>
                                    </div>

                                    <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(session)}
                                        className="p-1 text-amber-800 hover:bg-amber-100 rounded cursor-pointer"
                                        title="Hariri kipindi"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(session.id)}
                                        className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                                        title="Futa kipindi"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full min-h-[65px] flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenAdd(day, slot.start, slot.end);
                                    if (selectedTeacherFilter) {
                                      setFormData(prev => ({ ...prev, teacher_name: selectedTeacherFilter }));
                                    }
                                  }}
                                  className="w-full h-full py-2.5 border border-dashed border-slate-200 rounded-xl text-[11px] font-bold text-slate-400 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/30 transition flex flex-col items-center justify-center gap-1 cursor-pointer group"
                                >
                                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition" />
                                  <span>+ Weka</span>
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WEKA AU HARIRI KIPINDI CHA REMEDIAL                                 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-[#1f4d8b] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingEntryId ? 'Hariri Kipindi cha Remedial (Edit Session)' : 'Weka Kipindi Kipya cha Remedial'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Live Conflict Alert Banner */}
              {liveConflict && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start gap-2.5 text-rose-900 text-xs font-bold animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black uppercase tracking-wide text-rose-700">Tahadhari ya Mgongano wa Ratiba (Clash Detected)</div>
                    <div className="mt-0.5 font-semibold text-rose-800">{liveConflict.primaryMessage}</div>
                  </div>
                </div>
              )}

              {/* Chagua Mwalimu Kwanza ili kuchuja Masomo na Mikondo yake */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                {/* Mwalimu */}
                <div>
                  <label className="block text-xs font-black text-blue-950 uppercase mb-1">
                    1. Chagua Mwalimu Kwanza (Teacher) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.teacher_name}
                    onChange={e => {
                      const tName = e.target.value;
                      const meta = getTeacherRegisteredMetadata(tName);
                      const nextCls = meta.classes[0] || formData.class_name;
                      const matchedKey = Array.from(meta.classStreamMap.keys()).find(k => isSameClass(k, nextCls));
                      const nextStreams = matchedKey ? Array.from(meta.classStreamMap.get(matchedKey)!).sort() : ['A'];
                      const nextStrm = nextStreams[0] || 'A';
                      setFormData({
                        ...formData,
                        teacher_name: tName,
                        subject: meta.subjects.includes(formData.subject) ? formData.subject : (meta.subjects[0] || ''),
                        class_name: nextCls,
                        stream: nextStrm,
                        room: `${nextCls} ${nextStrm} Room`
                      });
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs font-black focus:ring-2 focus:ring-blue-500 ${liveConflict?.teacherClash ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20' : 'bg-white border border-blue-300 text-slate-900'}`}
                    required
                  >
                    <option value="">-- Chagua Mwalimu --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({(t.subjects || []).join(', ') || 'Masomo'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Somo (ONLY Teacher's Registered Subjects) */}
                <div>
                  <label className="block text-xs font-black text-blue-950 uppercase mb-1">
                    2. Somo Analofundisha Mwalimu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    disabled={!formData.teacher_name || dynamicSubjects.length === 0}
                    className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                    required
                  >
                    {!formData.teacher_name ? (
                      <option value="">-- Chagua Mwalimu kwanza --</option>
                    ) : dynamicSubjects.length === 0 ? (
                      <option value="">-- Mwalimu hajasajiliwa somo --</option>
                    ) : (
                      dynamicSubjects.map(s => <option key={s} value={s}>{s}</option>)
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chagua Darasa (Filtered to Teacher's Registered Classes) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    3. Darasa la Mwalimu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_name}
                    onChange={e => {
                      const newCls = e.target.value;
                      const meta = getTeacherRegisteredMetadata(formData.teacher_name);
                      const matchedKey = Array.from(meta.classStreamMap.keys()).find(k => isSameClass(k, newCls));
                      const streams = matchedKey && meta.classStreamMap.get(matchedKey)!.size > 0
                        ? Array.from(meta.classStreamMap.get(matchedKey)!).sort()
                        : getStreamsForClass(newCls);
                      const nextStrm = streams[0] || 'A';
                      setFormData({
                        ...formData,
                        class_name: newCls,
                        stream: nextStrm,
                        room: `${newCls} ${nextStrm} Room`
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableClassesForModal.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Chagua Mkondo (Filtered to Teacher's Registered Streams) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    4. Mkondo Aliosajiliwa (Stream) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.stream}
                    onChange={e => setFormData({ ...formData, stream: e.target.value, room: `${formData.class_name} ${e.target.value} Room` })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableStreamsForModalScoped.map(s => (
                      <option key={s} value={s}>{s === 'All Streams' ? 'Mikondo Yote' : `Stream ${s}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Aina ya Kipindi (Session Type) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Aina ya Kipindi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.session_type}
                    onChange={e => setFormData({ ...formData, session_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Evening">Jioni (Evening)</option>
                    <option value="Morning">Asubuhi (Morning)</option>
                    <option value="Weekend">Wikendi (Weekend)</option>
                    <option value="All Sessions">Zote (All)</option>
                  </select>
                </div>

                {/* Siku ya Wiki */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Siku ya Wiki <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{SWAHILI_DAYS[d]} ({d})</option>
                    ))}
                  </select>
                </div>

                {/* Tarehe (Specific Date) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Tarehe (Date)
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Muda Kuanza */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Muda Kuanza (Start Time) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500 ${liveConflict ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20' : 'bg-slate-50 border border-slate-300 text-slate-800'}`}
                    required
                  />
                </div>

                {/* Muda Kuisha */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Muda Kuisha (End Time) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500 ${liveConflict ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20' : 'bg-slate-50 border border-slate-300 text-slate-800'}`}
                    required
                  />
                </div>

                {/* Duration Badge */}
                <div className="col-span-full bg-slate-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Muda wa Kipindi (Duration):</span>
                  </span>
                  <span className="font-black text-blue-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {durationMinutes} Dakika ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
                  </span>
                </div>
              </div>

              {/* Chumba / Venue */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Chumba au Eneo la Kufundishia (Venue / Classroom)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Room 5A, Science Lab 2, Main Hall"
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 ${liveConflict?.roomClash ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 ring-2 ring-rose-500/20' : 'bg-slate-50 border border-slate-300 text-slate-800'}`}
                  />
                </div>
                {/* Quick venue chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold self-center mr-1">Chagua haraka:</span>
                  {['Room 1A', 'Room 2B', 'Room 3A', 'Room 4B', 'Room 5A', 'Science Lab', 'Main Hall', 'Computer Lab'].map(rm => (
                    <button
                      key={rm}
                      type="button"
                      onClick={() => setFormData({ ...formData, room: rm })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition ${
                        formData.room === rm
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {rm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Selection (Mahudhurio na Orodha ya Wanafunzi) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase text-slate-900">
                    Orodha ya Wanafunzi (Student Selection)
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">
                    {classNominalStudents.length} Wanafunzi Darasani
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    formData.target_type === 'ALL_CLASS' 
                      ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-black' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="modal_target_type"
                      checked={formData.target_type === 'ALL_CLASS'}
                      onChange={() => setFormData({ ...formData, target_type: 'ALL_CLASS' })}
                      className="text-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Darasa Zima (Wanafunzi Wote)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Wanafunzi wote wa darasa hili wanahusika.</div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    formData.target_type === 'TARGETED_STUDENTS' 
                      ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-black' 
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="modal_target_type"
                      checked={formData.target_type === 'TARGETED_STUDENTS'}
                      onChange={() => setFormData({ ...formData, target_type: 'TARGETED_STUDENTS' })}
                      className="text-amber-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Wanafunzi Maalum Pekee (Targeted Support)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Chagua wanafunzi wanaohitaji msaada wa ziada.</div>
                    </div>
                  </label>
                </div>

                {formData.target_type === 'TARGETED_STUDENTS' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Tafuta jina au namba ya usajili..."
                          value={studentSearchInModal}
                          onChange={e => setStudentSearchInModal(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            target_student_ids: classNominalStudents.map(s => String(s.id || s.regNo))
                          })}
                          className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          Chagua Wote
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, target_student_ids: [] })}
                          className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Ondoa Wote
                        </button>
                      </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl p-2 space-y-1 divide-y divide-slate-100">
                      {filteredNominalStudents.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400 italic">
                          Hakuna wanafunzi waliopatikana kwa {formData.class_name} {formData.stream}.
                        </div>
                      ) : (
                        filteredNominalStudents.map(student => {
                          const sid = String(student.id || student.regNo);
                          const isChecked = formData.target_student_ids.includes(sid);
                          return (
                            <label key={sid} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs">
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, target_student_ids: [...formData.target_student_ids, sid] });
                                    } else {
                                      setFormData({ ...formData, target_student_ids: formData.target_student_ids.filter(id => id !== sid) });
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 cursor-pointer"
                                />
                                <span className="font-bold text-slate-900 truncate">{student.name}</span>
                                <span className="text-[10px] text-slate-400">({student.regNo || 'Reg: N/A'})</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">{student.gender || '-'}</span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="text-[11px] font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
                      <span>🎯 Wanafunzi Waliochaguliwa kwa Kipindi hiki:</span>
                      <span className="font-black text-amber-950">{formData.target_student_ids.length} kati ya {classNominalStudents.length}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tuma Arifa */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="modal_notify_students"
                  checked={formData.notify_students}
                  onChange={e => setFormData({ ...formData, notify_students: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="modal_notify_students" className="text-xs font-bold text-blue-900 cursor-pointer flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tuma arifa kwa wanafunzi wa {formData.class_name} ({formData.stream})</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={saving || Boolean(liveConflict)}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{editingEntryId ? 'Hifadhi Mabadiliko' : '+ Weka Kwenye Ratiba'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
