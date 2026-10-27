import React, { useState, useMemo } from 'react';
import {
  TimetableAssignment,
  Teacher,
  PeriodSetting,
  StreamSetting,
  TeacherAssignment,
  SubjectPeriodAllocation
} from '../../types';
import {
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Users,
  BookOpen,
  Layers,
  Clock,
  Info,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  Filter,
  Check,
  Building2,
  Lock
} from 'lucide-react';
import { DEFAULT_CLASSES, DAYS_OF_WEEK } from '../../constants/defaults';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';
import { isSameClass } from '../../utils/reportCardUtils';
import {
  isSameStream,
  isSamePeriod,
  isSameSubjectName,
  getConfiguredDays,
  getPeriodsForDayFromSettings,
  getRegisteredSubjectsForTeacher
} from '../../lib/timetableService';
import { saveSchoolData } from '../../lib/dataService';
import { getCurrentSchoolId } from '../../lib/dbBridge';

interface StreamBatchPeriodEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  assignments: TimetableAssignment[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  teacherAssignments: TeacherAssignment[];
  subjectPeriodAllocations?: SubjectPeriodAllocation[];
  onUpdateAssignments: (assignments: TimetableAssignment[]) => void;
  classes?: string[];
}

export const StreamBatchPeriodEntryModal: React.FC<StreamBatchPeriodEntryModalProps> = ({
  isOpen,
  onClose,
  teachers = [],
  assignments = [],
  periodSettings = [],
  streamSettings = [],
  teacherAssignments = [],
  subjectPeriodAllocations = [],
  onUpdateAssignments,
  classes = []
}) => {
  if (!isOpen) return null;

  // Extract available classes
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    if (classes && classes.length > 0) {
      classes.forEach(c => classSet.add(c));
    }
    if (streamSettings && streamSettings.length > 0) {
      streamSettings.forEach(s => classSet.add(s.className));
    }
    if (classSet.size === 0) {
      DEFAULT_CLASSES.forEach(c => classSet.add(c));
    }
    return Array.from(classSet);
  }, [classes, streamSettings]);

  // Selected Class & Stream state
  const [selectedClass, setSelectedClass] = useState<string>(availableClasses[0] || 'Form 1');

  // Stream options for the chosen class
  const streamOptions = useMemo(() => {
    const matchingSetting = streamSettings.find(s => isSameClass(s.className, selectedClass));
    if (matchingSetting && matchingSetting.streams && matchingSetting.streams.length > 0) {
      return matchingSetting.streams;
    }
    return ['STREAM A', 'STREAM B', 'STREAM C'];
  }, [streamSettings, selectedClass]);

  const [selectedStream, setSelectedStream] = useState<string>(streamOptions[0] || 'STREAM A');

  // Update selected stream if class changes
  React.useEffect(() => {
    if (streamOptions.length > 0 && !streamOptions.includes(selectedStream)) {
      setSelectedStream(streamOptions[0]);
    }
  }, [streamOptions, selectedStream]);

  // Registered teacher filtering toggle
  const [onlyRegisteredTeachers, setOnlyRegisteredTeachers] = useState<boolean>(true);

  // Helper to check if teacher assignment record matches class & stream
  const isTeacherAssignedToTargetStream = (
    ta: TeacherAssignment,
    targetClass: string,
    targetStream: string
  ): boolean => {
    if (!ta) return false;
    const fullTag = `${targetClass.trim()} - ${targetStream.trim()}`.toLowerCase();
    const targetClassLower = targetClass.trim().toLowerCase();
    const targetStreamLower = targetStream.trim().toLowerCase();

    return (ta.streams || []).some(s => {
      const sLower = s.trim().toLowerCase();
      if (sLower === fullTag) return true;
      if (sLower === targetStreamLower && (ta.level === undefined || ta.level === 'SECONDARY')) return true;
      if (sLower.includes(targetClassLower) && sLower.includes(targetStreamLower)) return true;
      return false;
    });
  };

  // Registered Teachers for selected class & stream
  const registeredTeachers = useMemo(() => {
    const registeredSet = new Set<number>();

    (teacherAssignments || []).forEach(ta => {
      if (isTeacherAssignedToTargetStream(ta, selectedClass, selectedStream)) {
        registeredSet.add(ta.teacherId);
      }
    });

    (teachers || []).forEach(t => {
      if (t.teachingStreams && t.teachingStreams.length > 0) {
        const hasStream = t.teachingStreams.some(st => {
          const stLower = st.toLowerCase();
          return stLower.includes(selectedClass.toLowerCase()) && stLower.includes(selectedStream.toLowerCase());
        });
        if (hasStream) registeredSet.add(t.id);
      }
    });

    return teachers.filter(t => registeredSet.has(t.id));
  }, [teachers, teacherAssignments, selectedClass, selectedStream]);

  // Displayed Teachers list
  const selectableTeachers = useMemo(() => {
    if (onlyRegisteredTeachers && registeredTeachers.length > 0) {
      return registeredTeachers;
    }
    return teachers;
  }, [onlyRegisteredTeachers, registeredTeachers, teachers]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(
    selectableTeachers[0]?.id || teachers[0]?.id || 0
  );

  // Synchronize teacher selection when class/stream changes
  React.useEffect(() => {
    if (selectableTeachers.length > 0) {
      if (!selectableTeachers.some(t => t.id === selectedTeacherId)) {
        setSelectedTeacherId(selectableTeachers[0].id);
      }
    }
  }, [selectableTeachers]);

  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === Number(selectedTeacherId));
  }, [teachers, selectedTeacherId]);

  // Registered Subjects for Selected Teacher & Stream
  const allowedSubjects = useMemo(() => {
    if (!selectedTeacher) return [];

    const subjectSet = new Set<string>();

    // 1. Check teacherAssignments specifically for selected class and stream
    const matchingAssignments = (teacherAssignments || []).filter(
      ta => Number(ta.teacherId) === Number(selectedTeacher.id) &&
            isTeacherAssignedToTargetStream(ta, selectedClass, selectedStream)
    );

    matchingAssignments.forEach(ta => {
      (ta.subjects || []).forEach(sub => {
        if (sub && sub.trim()) subjectSet.add(sub.trim());
      });
    });

    // 2. If no specific stream match, check any teacherAssignment for this teacher
    if (subjectSet.size === 0) {
      const anyAssignments = (teacherAssignments || []).filter(
        ta => Number(ta.teacherId) === Number(selectedTeacher.id)
      );
      anyAssignments.forEach(ta => {
        (ta.subjects || []).forEach(sub => {
          if (sub && sub.trim()) subjectSet.add(sub.trim());
        });
      });
    }

    // 3. Check teacher profile subjects
    if (subjectSet.size === 0 && Array.isArray(selectedTeacher.subjects)) {
      selectedTeacher.subjects.forEach(sub => {
        if (sub && sub.trim()) subjectSet.add(sub.trim());
      });
    }

    return Array.from(subjectSet);
  }, [selectedTeacher, teacherAssignments, selectedClass, selectedStream]);

  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Auto pick first available subject
  React.useEffect(() => {
    if (allowedSubjects.length > 0) {
      if (!selectedSubject || !allowedSubjects.some(sub => isSameSubjectName(sub, selectedSubject))) {
        setSelectedSubject(allowedSubjects[0]);
      }
    } else {
      setSelectedSubject('');
    }
  }, [allowedSubjects]);

  // Configured days and periods
  const activeDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

  // Normalized period list (deduplicated by period name / index)
  const masterPeriodList = useMemo(() => {
    if (!periodSettings || periodSettings.length === 0) {
      return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        day: 'All',
        name: `Period ${i + 1}`,
        start: `${8 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '40'}`,
        end: `${8 + Math.floor((i + 1) / 2)}:${(i + 1) % 2 === 0 ? '00' : '40'}`,
        isBreak: false
      }));
    }

    const uniquePeriodsMap = new Map<string, PeriodSetting>();
    periodSettings.forEach(p => {
      if (!p || p.isBreak) return;
      const key = p.name || `Period ${p.id}`;
      if (!uniquePeriodsMap.has(key)) {
        uniquePeriodsMap.set(key, p);
      }
    });

    if (uniquePeriodsMap.size === 0) {
      return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        day: 'All',
        name: `Period ${i + 1}`,
        start: `${8 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '40'}`,
        end: `${8 + Math.floor((i + 1) / 2)}:${(i + 1) % 2 === 0 ? '00' : '40'}`,
        isBreak: false
      }));
    }

    return Array.from(uniquePeriodsMap.values());
  }, [periodSettings]);

  // Multi-select grid state: Map<"Day_PeriodName", boolean>
  const [selectedSlots, setSelectedSlots] = useState<Record<string, boolean>>({});

  // Duration & Scheduling options
  const [scheduleScope, setScheduleScope] = useState<'weekly' | 'one_month'>('weekly');
  const [monthBlockLabel, setMonthBlockLabel] = useState<string>('Kitalu cha Mwezi 1 (Month 1 Block)');
  const [conflictStrategy, setConflictStrategy] = useState<'overwrite' | 'skip'>('overwrite');

  // Notification message
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const toggleSlot = (day: string, periodName: string) => {
    const key = `${day}_${periodName}`;
    setSelectedSlots(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const selectAllForDay = (day: string) => {
    const nextState = { ...selectedSlots };
    const allSelectedForDay = masterPeriodList.every(p => nextState[`${day}_${p.name}`]);
    masterPeriodList.forEach(p => {
      nextState[`${day}_${p.name}`] = !allSelectedForDay;
    });
    setSelectedSlots(nextState);
  };

  const selectAllForPeriod = (periodName: string) => {
    const nextState = { ...selectedSlots };
    const allSelectedForPeriod = activeDays.every(d => nextState[`${d}_${periodName}`]);
    activeDays.forEach(d => {
      nextState[`${d}_${periodName}`] = !allSelectedForPeriod;
    });
    setSelectedSlots(nextState);
  };

  const selectMorningPeriods = () => {
    const nextState = { ...selectedSlots };
    const morningPeriods = masterPeriodList.slice(0, 4);
    activeDays.forEach(d => {
      morningPeriods.forEach(p => {
        nextState[`${d}_${p.name}`] = true;
      });
    });
    setSelectedSlots(nextState);
  };

  const clearSelection = () => {
    setSelectedSlots({});
  };

  // Conflict calculation for each slot
  const slotConflictMap = useMemo(() => {
    const conflictMap: Record<string, { type: 'teacher' | 'stream' | 'both'; details: string }> = {};

    if (!selectedTeacher) return conflictMap;

    activeDays.forEach(day => {
      masterPeriodList.forEach(p => {
        const key = `${day}_${p.name}`;

        // 1. Check if selected teacher is already teaching another class/stream in this day & period slot
        const teacherBusy = assignments.find(a =>
          a.day === day &&
          isSamePeriod(a.period, p.name) &&
          Number(a.teacherId) === Number(selectedTeacher.id) &&
          !(isSameClass(a.className, selectedClass) && isSameStream(a.stream, selectedStream))
        );

        // 2. Check if selected stream already has another subject/teacher in this day & period slot
        const streamBusy = assignments.find(a =>
          a.day === day &&
          isSamePeriod(a.period, p.name) &&
          isSameClass(a.className, selectedClass) &&
          isSameStream(a.stream, selectedStream)
        );

        if (teacherBusy && streamBusy) {
          conflictMap[key] = {
            type: 'both',
            details: `Mwalimu yupo ${teacherBusy.className} (${teacherBusy.stream}) & Mkondo huu una ${streamBusy.subject}`
          };
        } else if (teacherBusy) {
          conflictMap[key] = {
            type: 'teacher',
            details: `Mwalimu yupo ${teacherBusy.className} (${teacherBusy.stream}) - ${teacherBusy.subject}`
          };
        } else if (streamBusy) {
          conflictMap[key] = {
            type: 'stream',
            details: `Mkondo una ${streamBusy.subject} (${streamBusy.teacherName || 'Mwalimu'})`
          };
        }
      });
    });

    return conflictMap;
  }, [assignments, selectedTeacher, selectedClass, selectedStream, activeDays, masterPeriodList]);

  // Count total selected slots
  const selectedSlotsCount = useMemo(() => {
    return Object.values(selectedSlots).filter(Boolean).length;
  }, [selectedSlots]);

  // Count conflicts in selected slots
  const selectedConflictsCount = useMemo(() => {
    return Object.entries(selectedSlots).filter(([key, isSel]) => isSel && slotConflictMap[key]).length;
  }, [selectedSlots, slotConflictMap]);

  // Handle Save / Apply Batch Stream Assignments
  const handleApplyAssignments = () => {
    if (!selectedTeacher) {
      setNotification({ text: 'Tafadhali chagua mwalimu kwanza.', type: 'error' });
      return;
    }
    if (!selectedSubject) {
      setNotification({ text: 'Tafadhali chagua somo analofundisha mwalimu.', type: 'error' });
      return;
    }
    if (selectedSlotsCount === 0) {
      setNotification({ text: 'Tafadhali chagua vipindi angalau kimoja kwenye jedwali.', type: 'error' });
      return;
    }

    const updated = [...assignments];
    let createdCount = 0;
    let overwrittenCount = 0;
    let skippedCount = 0;

    Object.entries(selectedSlots).forEach(([key, isSelected]) => {
      if (!isSelected) return;

      const [day, periodName] = key.split('_');
      const conflict = slotConflictMap[key];

      if (conflict && conflictStrategy === 'skip') {
        skippedCount++;
        return;
      }

      // Format period string standard
      const matchingPeriodSetting = masterPeriodList.find(p => p.name === periodName);
      const formattedPeriodString = matchingPeriodSetting
        ? `${periodName} (${matchingPeriodSetting.start}-${matchingPeriodSetting.end})`
        : periodName;

      // Remove existing assignment for this target class/stream/day/period if overwriting
      const existingIdx = updated.findIndex(a =>
        a.day === day &&
        isSamePeriod(a.period, periodName) &&
        isSameClass(a.className, selectedClass) &&
        isSameStream(a.stream, selectedStream)
      );

      if (existingIdx >= 0) {
        updated.splice(existingIdx, 1);
        overwrittenCount++;
      }

      // Add new assignment
      const newAssignment: TimetableAssignment = {
        id: `sb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        className: selectedClass,
        stream: selectedStream,
        day: day,
        period: formattedPeriodString,
        periodName: periodName,
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        subject: selectedSubject,
        activityType: 'academic',
        isManual: true,
        customNote: scheduleScope === 'one_month' ? monthBlockLabel : undefined
      };

      updated.push(newAssignment);
      createdCount++;
    });

    onUpdateAssignments(updated);

    // Save persistent school data
    const schoolId = getCurrentSchoolId() || 'default_school';
    saveSchoolData(schoolId, { timetableAssignments: updated });

    setNotification({
      text: `Imefanikiwa! Vipindi ${createdCount} vimehifadhiwa kwa ${selectedClass} - ${selectedStream} (${selectedTeacher.name} - ${selectedSubject}).${
        skippedCount > 0 ? ` Vipindi ${skippedCount} vilirukwa kwa sababu ya migongano.` : ''
      }`,
      type: 'success'
    });

    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl my-6 flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Zap className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Upangaji wa Vipindi kwa Mkondo
                <span className="text-xs bg-yellow-400 text-indigo-950 px-2 py-0.5 rounded-full font-semibold">
                  Batch Entry
                </span>
              </h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Kuingiza na kupanga vipindi vya mwalimu na somo kwa mkondo mmoja (weekly au mwezi mmoja)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Notification banner */}
          {notification && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between text-sm ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : notification.type === 'error'
                  ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span className="font-medium">{notification.text}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Section 1: Class, Stream, Teacher & Subject Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                1. Chagua Darasa, Mkondo, Mwalimu & Somo
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyRegisteredTeachers}
                    onChange={e => setOnlyRegisteredTeachers(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  Waalimu waliosajiliwa kwa mkondo tu ({registeredTeachers.length})
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Class Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Darasa (Class)
                </label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Mkondo (Stream)
                </label>
                <select
                  value={selectedStream}
                  onChange={e => setSelectedStream(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {streamOptions.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Mwalimu Aliyesajiliwa
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(Number(e.target.value))}
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {selectableTeachers.length === 0 ? (
                    <option value={0}>Hakuna mwalimu aliyepatikana</option>
                  ) : (
                    selectableTeachers.map(t => {
                      const isReg = registeredTeachers.some(rt => rt.id === t.id);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} {isReg ? '✓ [Usajili Mzuri]' : ''}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Somo la Mwalimu (Subject)
                </label>
                {allowedSubjects.length > 0 ? (
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-semibold text-indigo-700 dark:text-indigo-300"
                  >
                    {allowedSubjects.map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Mwalimu hana somo lililosajiliwa.</span>
                  </div>
                )}
              </div>

            </div>

            {/* Registration Banner */}
            {selectedTeacher && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
                    style={{ backgroundColor: getTeacherColor(selectedTeacher.id).hex }}
                  >
                    {selectedTeacher.initial || selectedTeacher.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedTeacher.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">
                      Somo: <strong className="text-indigo-600 dark:text-indigo-400">{selectedSubject || 'Hakuna'}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                    {selectedClass} - {selectedStream}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Duration / Schedule Scope & Conflict Strategy */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              2. Muda wa Ratiba na Mkakati wa Migongano (Schedule Scope & Conflict Handling)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Aina ya Ratiba / Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleScope('weekly')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      scheduleScope === 'weekly'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Kila Wiki (Weekly)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleScope('one_month')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                      scheduleScope === 'one_month'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Mwezi 1 (Month Block)
                  </button>
                </div>
              </div>

              {/* Month Block Tag / Label if 1-Month selected */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Maelezo / Label ya Ratiba
                </label>
                <input
                  type="text"
                  value={monthBlockLabel}
                  onChange={e => setMonthBlockLabel(e.target.value)}
                  disabled={scheduleScope !== 'one_month'}
                  placeholder="e.g. Mwezi wa 1 - Block Teaching"
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                />
              </div>

              {/* Conflict Handling Strategy */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Kama Kukiwa na Mwalimu au Somo Lililopo
                </label>
                <select
                  value={conflictStrategy}
                  onChange={e => setConflictStrategy(e.target.value as 'overwrite' | 'skip')}
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="overwrite">Badilisha lililopo (Overwrite Existing)</option>
                  <option value="skip">Ruka vipindi zenye mgongano (Skip Conflicted)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 3: Interactive Visual Multi-Select Grid */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  3. Chagua Siku na Vipindi Kwenye Jedwali (Select Slots)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bofya kisanduku kuweka au kuondoa kipindi. Tumia vitufe vya haraka kuongeza vipindi vingi kwa pamoja.
                </p>
              </div>

              {/* Quick Select Toolbars */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectMorningPeriods}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  Vipindi vya Asubuhi (P1-P4)
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Safisha (Clear)
                </button>
              </div>
            </div>

            {/* Interactive Grid Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-bold uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-700 min-w-[120px]">
                      Siku \ Period
                    </th>
                    {masterPeriodList.map(p => (
                      <th
                        key={p.name}
                        className="p-2 text-center font-bold border-r border-slate-200 dark:border-slate-700 min-w-[100px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {p.start}-{p.end}
                          </span>
                          <button
                            type="button"
                            onClick={() => selectAllForPeriod(p.name)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                            title={`Chagua ${p.name} kwa siku zote`}
                          >
                            + Siku Zote
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activeDays.map(day => (
                    <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Day Header Column */}
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <span>{day}</span>
                          <button
                            type="button"
                            onClick={() => selectAllForDay(day)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded"
                            title={`Chagua vipindi vyote vya ${day}`}
                          >
                            + Vyote
                          </button>
                        </div>
                      </td>

                      {/* Period Cells */}
                      {masterPeriodList.map(p => {
                        const key = `${day}_${p.name}`;
                        const isSelected = !!selectedSlots[key];
                        const conflict = slotConflictMap[key];

                        // Find existing assignment for tooltip / preview
                        const existingAss = assignments.find(
                          a =>
                            a.day === day &&
                            isSamePeriod(a.period, p.name) &&
                            isSameClass(a.className, selectedClass) &&
                            isSameStream(a.stream, selectedStream)
                        );

                        return (
                          <td
                            key={p.name}
                            onClick={() => toggleSlot(day, p.name)}
                            className={`p-2 border-r border-slate-200 dark:border-slate-700 cursor-pointer text-center transition-all select-none relative ${
                              isSelected
                                ? 'bg-indigo-600 text-white dark:bg-indigo-600 font-bold shadow-inner'
                                : conflict
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                : 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="min-h-[46px] flex flex-col items-center justify-center p-1 rounded-lg">
                              {isSelected ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="w-5 h-5 rounded-full bg-white text-indigo-700 flex items-center justify-center font-bold text-xs shadow-xs">
                                    ✓
                                  </div>
                                  <span className="text-[10px] tracking-tight opacity-90 truncate max-w-[90px]">
                                    {selectedSubject}
                                  </span>
                                </div>
                              ) : existingAss ? (
                                <div className="flex flex-col items-center gap-0.5 text-[10px]">
                                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[85px]">
                                    {existingAss.subject}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[85px]">
                                    {existingAss.teacherName || 'Mwalimu'}
                                  </span>
                                </div>
                              ) : conflict ? (
                                <div className="flex flex-col items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate max-w-[85px] font-medium" title={conflict.details}>
                                    {conflict.type === 'teacher' ? 'Mwalimu Yupo' : 'Somo Lipo'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-300 dark:text-slate-600 font-medium">
                                  + Weka
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Allocation Summary Box */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-yellow-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Muhtasari wa Vipindi Vinavyowekwa (Allocation Summary)
              </h4>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>
                  Darasa & Mkondo: <strong className="text-white">{selectedClass} - {selectedStream}</strong>
                </span>
                <span>•</span>
                <span>
                  Mwalimu: <strong className="text-white">{selectedTeacher?.name || 'Mwalimu'}</strong>
                </span>
                <span>•</span>
                <span>
                  Somo: <strong className="text-white">{selectedSubject || 'Hakuna'}</strong>
                </span>
                <span>•</span>
                <span>
                  Aina: <strong className="text-purple-300">{scheduleScope === 'weekly' ? 'Kila Wiki' : monthBlockLabel}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400 leading-none">
                  {selectedSlotsCount}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Vipindi Vilivyochaguliwa
                </div>
              </div>

              {selectedConflictsCount > 0 && (
                <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{selectedConflictsCount} Mgongano</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            Ghairi (Cancel)
          </button>
          
          <button
            type="button"
            onClick={handleApplyAssignments}
            disabled={selectedSlotsCount === 0 || !selectedTeacher || !selectedSubject}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            Tumia & Hifadhi Vipindi ({selectedSlotsCount})
          </button>
        </div>

      </div>
    </div>
  );
};
