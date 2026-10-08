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
  Users
} from 'lucide-react';
import { 
  saveRemedialTimetable, 
  saveRemedialTimetableBatch,
  getRemedialTimetable, 
  deleteRemedialTimetableEntry,
  clearRemedialTimetable,
  checkRemedialConflict,
  RemedialTimetableEntry 
} from '../../lib/remedialService';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES,
  NURSERY_SUBJECTS_LIST,
  LOWER_PRIMARY_SUBJECTS_LIST,
  UPPER_PRIMARY_SUBJECTS_LIST,
  SECONDARY_SUBJECTS
} from '../../constants/defaults';
import { Teacher, SchoolInfo, Student } from '../../types';
import { exportRemedialTimetablePDF } from '../../utils/remedialPdfExport';
import { isSameClass } from '../../utils/reportCardUtils';
import { RemedialDashboardSummary } from './RemedialDashboardSummary';

interface RemedialTimetableSetupProps {
  schoolId: string;
  teachers: Teacher[];
  schoolInfo?: SchoolInfo;
  students?: Student[];
  onAddActivityLog?: (log: any) => void;
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
  onAddActivityLog
}) => {
  const [entries, setEntries] = useState<RemedialTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Active View Tab: 'grid' | 'list' | 'generator' | 'teacher'
  const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'generator' | 'teacher'>('grid');

  // Filters
  const [classFilter, setClassFilter] = useState<string>('Class 5');
  const [streamFilter, setStreamFilter] = useState<string>('A');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('');

  // Toast / Alert Notification State
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Form State for Manual Session Add/Edit
  const [formData, setFormData] = useState({
    class_name: 'Class 5',
    stream: 'A',
    subject: 'Mathematics (Hisabati)',
    teacher_name: '',
    date: new Date().toISOString().split('T')[0],
    day_of_week: 'Monday',
    start_time: '16:00',
    end_time: '17:30',
    room: 'Room 5A',
    notify_students: true,
    term: 'Term 1',
    academic_year: new Date().getFullYear().toString()
  });

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

  // Dynamic subjects based on chosen class in Form
  const dynamicSubjects = useMemo(() => {
    const c = formData.class_name;
    if (NURSERY_CLASSES.includes(c)) return NURSERY_SUBJECTS_LIST;
    if (c === 'Standard 1' || c === 'Standard 2' || c === 'Class 1' || c === 'Class 2') return LOWER_PRIMARY_SUBJECTS_LIST;
    if (PRIMARY_CLASSES.includes(c) || c.toLowerCase().includes('class') || c.toLowerCase().includes('std')) return UPPER_PRIMARY_SUBJECTS_LIST;
    return SECONDARY_SUBJECTS;
  }, [formData.class_name]);

  // Dynamic subjects for generator
  const generatorSubjects = useMemo(() => {
    const c = generatorConfig.target_class;
    if (generatorConfig.scope === 'LEVEL_SECONDARY') return SECONDARY_SUBJECTS;
    if (generatorConfig.scope === 'LEVEL_PRIMARY') return UPPER_PRIMARY_SUBJECTS_LIST;
    if (NURSERY_CLASSES.includes(c)) return NURSERY_SUBJECTS_LIST;
    if (c === 'Standard 1' || c === 'Standard 2' || c === 'Class 1' || c === 'Class 2') return LOWER_PRIMARY_SUBJECTS_LIST;
    if (PRIMARY_CLASSES.includes(c) || c.toLowerCase().includes('class') || c.toLowerCase().includes('std')) return UPPER_PRIMARY_SUBJECTS_LIST;
    return SECONDARY_SUBJECTS;
  }, [generatorConfig.target_class, generatorConfig.scope]);

  // Keep selected subject valid when class level changes
  useEffect(() => {
    if (dynamicSubjects.length > 0 && !dynamicSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: dynamicSubjects[0] }));
    }
  }, [dynamicSubjects]);

  // Load timetable on mount or schoolId change
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

  const resetForm = () => {
    setFormData({
      class_name: classFilter !== 'ALL' ? classFilter : 'Class 5',
      stream: streamFilter !== 'ALL' && streamFilter !== 'All Streams' ? streamFilter : 'A',
      subject: dynamicSubjects[0] || 'Mathematics (Hisabati)',
      teacher_name: teachers[0]?.name || '',
      date: new Date().toISOString().split('T')[0],
      day_of_week: 'Monday',
      start_time: '16:00',
      end_time: '17:30',
      room: `${classFilter !== 'ALL' ? classFilter : 'Class 5'} Classroom`,
      notify_students: true,
      term: 'Term 1',
      academic_year: new Date().getFullYear().toString()
    });
    setEditingEntryId(null);
  };

  const handleOpenAdd = (presetDay?: string, presetStart?: string, presetEnd?: string) => {
    resetForm();
    if (presetDay) {
      setFormData(prev => ({
        ...prev,
        day_of_week: presetDay,
        start_time: presetStart || prev.start_time,
        end_time: presetEnd || prev.end_time
      }));
    }
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
      notify_students: !!entry.notify_students,
      term: entry.term || 'Term 1',
      academic_year: entry.academic_year || new Date().getFullYear().toString()
    });
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
      period_time: `${formData.start_time}-${formData.end_time}`,
      room: formData.room || `${formData.class_name} Room`,
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

      return matchClass && matchStream && matchDate && matchTeacher && matchSearch;
    });
  }, [entries, classFilter, streamFilter, dateFilter, selectedTeacherFilter, searchQuery]);

  // Distinct time slots for the Weekly Grid
  const gridTimeSlots = useMemo(() => {
    const slotsMap = new Map<string, { start: string; end: string; label: string }>();

    // Add predefined default shifts as anchors
    DEFAULT_REMEDIAL_SHIFTS.forEach(s => {
      slotsMap.set(`${s.startTime}-${s.endTime}`, {
        start: s.startTime,
        end: s.endTime,
        label: `${s.name} (${s.startTime} - ${s.endTime})`
      });
    });

    // Add any unique periods present in entries
    entries.forEach(e => {
      const st = e.start_time || e.period_time?.split('-')[0];
      const et = e.end_time || e.period_time?.split('-')[1];
      if (st && et) {
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
  }, [entries]);

  // Handle PDF Export
  const handleExportPDF = () => {
    const targetClass = classFilter !== 'ALL' ? classFilter : 'Class 5';
    const targetStream = streamFilter !== 'ALL' ? streamFilter : 'A';
    
    const targetEntries = entries.filter(e => 
      isSameClass(e.class_name, targetClass) &&
      (targetStream === 'ALL' || e.stream === 'All Streams' || e.stream?.toUpperCase() === targetStream.toUpperCase())
    );

    exportRemedialTimetablePDF({
      entries: targetEntries.length > 0 ? targetEntries : filteredEntries,
      schoolInfo,
      className: targetClass,
      streamName: targetStream,
      academicYear: new Date().getFullYear().toString()
    });
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

          // Check which chosen shifts apply to this day
          const applicableShifts = chosenShifts.filter(shift => shift.defaultDays.includes(dayName));
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
            if (!conflict.hasConflict) {
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
        setActiveTab('grid');
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
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'grid'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>📅 Mwonekano wa Jedwali (Weekly Matrix Grid)</span>
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
            <span>📋 Orodha Kamili ya Vipindi ({entries.length})</span>
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
            onClick={() => setActiveTab('teacher')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'teacher'
                ? 'bg-white text-blue-900 shadow-md'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>👨‍🏫 Ratiba kwa Mwalimu</span>
          </button>
        </div>
      </div>

      {/* Remedial Key Executive Dashboard Summary */}
      <RemedialDashboardSummary
        schoolId={schoolId}
        onQuickAddSchedule={() => handleOpenAdd()}
      />

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

      {/* FILTER CONTROLS BAR (Shown for Grid, List, and Teacher views) */}
      {activeTab !== 'generator' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Darasa Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Darasa:</span>
                <select
                  value={classFilter}
                  onChange={e => setClassFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Madarasa Yote (All Classes)</option>
                  <optgroup label="Pre-Primary / Nursery">
                    {REMEDIAL_NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Primary School">
                    {REMEDIAL_PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="Secondary School">
                    {REMEDIAL_SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Mkondo Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mkondo:</span>
                <select
                  value={streamFilter}
                  onChange={e => setStreamFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Mikondo Yote</option>
                  {STREAM_OPTIONS.map(s => <option key={s} value={s}>Stream {s}</option>)}
                </select>
              </div>

              {/* Teacher Filter */}
              {activeTab === 'teacher' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mwalimu:</span>
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

      {/* ========================================================================= */}
      {/* TAB 1: 📅 RATABA YA JEDWALI (WEEKLY TIMETABLE MATRIX GRID)               */}
      {/* ========================================================================= */}
      {activeTab === 'grid' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-blue-700" />
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                  JEDWALI LA RATIBA YA REMEDIAL: {classFilter !== 'ALL' ? classFilter : 'MADARASA YOTE'} {streamFilter !== 'ALL' ? `(MKONDO ${streamFilter})` : ''}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Bonyeza kitufe chochote cha "+ Weka" kwenye nafasi wazi kupanga kipindi mara moja.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-900 font-black text-xs rounded-xl">
                {filteredEntries.length} Vipindi Vimepangwa
              </span>
            </div>
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
                {gridTimeSlots.map((slot) => (
                  <tr key={`${slot.start}-${slot.end}`} className="hover:bg-slate-50/50 transition">
                    {/* Time Slot Label Column */}
                    <td className="p-3 border-r border-slate-200 bg-slate-50/80 text-center align-top">
                      <div className="font-mono font-black text-blue-950 text-xs">
                        {slot.start} - {slot.end}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                        {slot.label.split('(')[0]?.trim()}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {DAYS_OF_WEEK.map(day => {
                      const matchingSessions = filteredEntries.filter(e => {
                        const matchDay = (e.day_of_week || '').toLowerCase() === day.toLowerCase();
                        const sStart = e.start_time || e.period_time?.split('-')[0];
                        const sEnd = e.end_time || e.period_time?.split('-')[1];
                        return matchDay && sStart === slot.start && sEnd === slot.end;
                      });

                      return (
                        <td key={day} className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[130px]">
                          {matchingSessions.length > 0 ? (
                            <div className="space-y-1.5">
                              {matchingSessions.map(session => (
                                <div 
                                  key={session.id} 
                                  className="group relative p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 hover:border-blue-400 hover:shadow-md transition text-slate-800"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="font-black text-xs text-blue-950 leading-tight">
                                      {session.subject}
                                    </div>
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 shrink-0">
                                      {session.stream === 'All Streams' ? 'Yote' : session.stream}
                                    </span>
                                  </div>

                                  <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-slate-700 truncate">
                                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="truncate">{session.teacher_name}</span>
                                  </div>

                                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {session.class_name} • {session.room || 'Room'}
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
                      onChange={e => setGeneratorConfig({ ...generatorConfig, target_class: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="Pre-Primary">
                        {REMEDIAL_NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Primary School">
                        {REMEDIAL_PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Secondary School">
                        {REMEDIAL_SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-700 block mb-1">Chagua Mkondo (Stream):</label>
                    <select
                      value={generatorConfig.target_stream}
                      onChange={e => setGeneratorConfig({ ...generatorConfig, target_stream: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      {STREAM_OPTIONS.map(s => <option key={s} value={s}>{s === 'All Streams' ? 'Mikondo Yote' : `Stream ${s}`}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* HATUA 2: SHIFTS / NYAKATI ZA REMEDIAL */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-slate-900">
                  2. Chagua Nyakati / Shifts za Masomo ya Remedial <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-blue-700 font-bold">
                  {generatorConfig.selected_shifts.length} Shifts Zimechaguliwa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEFAULT_REMEDIAL_SHIFTS.map(shift => {
                  const isSelected = generatorConfig.selected_shifts.includes(shift.id);
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
                      <div>
                        <div className="text-xs font-black">{shift.swahiliName}</div>
                        <div className="text-[10px] font-mono font-bold text-blue-700 mt-0.5">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{shift.description}</div>
                      </div>
                    </button>
                  );
                })}
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
                  onClick={() => setActiveTab('grid')}
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
      {/* TAB 4: 👨‍🏫 RATIBA KWA MWALIMU (TEACHER TIMETABLE VIEW)                     */}
      {/* ========================================================================= */}
      {activeTab === 'teacher' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-700" />
              <h3 className="font-black text-sm text-slate-900 uppercase">
                RATIBA YA REMEDIAL KWA MWALIMU: {selectedTeacherFilter || 'WALIMU WOTE'}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Vipindi {filteredEntries.length} Vimepatikana
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEntries.map(session => (
              <div key={session.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-300 transition">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#1f4d8b] uppercase">
                    {SWAHILI_DAYS[session.day_of_week] || session.day_of_week}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-900">
                    {session.start_time} - {session.end_time}
                  </span>
                </div>

                <div className="font-black text-sm text-slate-900">{session.subject}</div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>{session.class_name} ({session.stream})</span>
                  <span>{session.room || 'Classroom'}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Mwl. {session.teacher_name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(session)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(session.id)}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chagua Darasa */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Chagua Darasa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_name}
                    onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <optgroup label="Pre-Primary / Nursery">
                      {REMEDIAL_NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Primary School">
                      {REMEDIAL_PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Secondary School">
                      {REMEDIAL_SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>

                {/* Chagua Mkondo */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Chagua Mkondo (Stream) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.stream}
                    onChange={e => setFormData({ ...formData, stream: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {STREAM_OPTIONS.map(s => <option key={s} value={s}>{s === 'All Streams' ? 'Mikondo Yote' : `Stream ${s}`}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Tarehe (Optional) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Tarehe (Hiari)
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
                    Muda Kuanza <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 font-mono focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Muda Kuisha */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Muda Kuisha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 font-mono focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Somo */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Somo (Subject) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {dynamicSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Mwalimu */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Mwalimu (Teacher) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.teacher_name}
                    onChange={e => setFormData({ ...formData, teacher_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Chagua Mwalimu --</option>
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Chumba / Venue */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Chumba / Venue (Hiari)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 5A, Science Lab 2, Main Hall"
                  value={formData.room}
                  onChange={e => setFormData({ ...formData, room: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
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
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
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
