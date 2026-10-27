import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Clock,
  BookOpen,
  Fingerprint,
  History,
  RefreshCw,
  UserCheck,
  Users,
  School,
  CheckCircle2,
  PlusCircle,
  ShieldCheck,
  Calendar,
  Download
} from 'lucide-react';
import { UserAccount, Teacher, TimetableAssignment, PeriodSetting, Student, StreamSetting, AcademicTermDates, SchoolInfo } from '../../types';
import { FingerprintScanner } from '../common/FingerprintScanner';
import { MonitorRegistrationModal } from '../common/MonitorRegistrationModal';
import { getMonitorClass } from '../../lib/dataService';
import { getAcademicWeek } from '../../utils/dateUtils';
import { exportClassJournalPDF } from '../../utils/classJournalPdfExport';
import { TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS } from '../../constants/defaults';

export const normalizeClass = (name?: string): string => {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
};

export const normalizeStream = (stream?: string): string => {
  if (!stream) return '';
  return String(stream).trim().toUpperCase().replace(/^STREAM\s+/i, '').trim();
};

export const isAssignmentForClassAndStream = (
  a: any,
  targetClass?: string,
  targetStream?: string
): boolean => {
  if (!a) return false;
  const aClass = normalizeClass(a.className || a.class_name || a.name);
  const tClass = normalizeClass(targetClass);
  if (!aClass || !tClass) return false;

  const classMatches = aClass === tClass || aClass.replace(/\s+/g, '') === tClass.replace(/\s+/g, '');
  if (!classMatches) return false;

  if (targetStream && targetStream !== 'ALL' && targetStream !== 'All Streams') {
    const tSt = normalizeStream(targetStream);
    const aSt = normalizeStream(a.stream);
    if (aSt && tSt && aSt !== tSt && !aSt.includes(tSt) && !tSt.includes(aSt)) {
      return false;
    }
  }
  return true;
};

export const matchPeriodName = (aPeriod?: string, targetPeriodName?: string): boolean => {
  if (!aPeriod || !targetPeriodName) return false;
  const cleanA = aPeriod.trim().toLowerCase();
  const cleanB = targetPeriodName.trim().toLowerCase();
  if (cleanA === cleanB) return true;
  const numA = cleanA.match(/(\d+)/)?.[1];
  const numB = cleanB.match(/(\d+)/)?.[1];
  if (numA && numB && numA === numB) return true;
  return cleanA.includes(cleanB) || cleanB.includes(cleanA);
};

interface MonitorDashboardProps {
  currentUser: UserAccount | null;
  schoolId: string;
  teachers: Teacher[];
  timetableAssignments: TimetableAssignment[];
  periodSettings: PeriodSetting[];
  students?: Student[];
  streamSettings?: StreamSetting[];
  users?: UserAccount[];
  academicTermDates?: AcademicTermDates;
  schoolInfo?: SchoolInfo;
}

export const MonitorDashboard: React.FC<MonitorDashboardProps> = ({
  currentUser,
  schoolId,
  teachers = [],
  timetableAssignments = [],
  periodSettings = [],
  students = [],
  streamSettings = [],
  users = [],
  academicTermDates,
  schoolInfo
}) => {
  const selectedClassStorageKey = `haby_selected_monitor_class_${schoolId}`;
  const [assignedClass, setAssignedClass] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`haby_selected_monitor_class_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const hasInitializedRef = useRef(false);

  const [allDbClasses, setAllDbClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanAction, setScanAction] = useState<'in' | 'out'>('in');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [todayJournals, setTodayJournals] = useState<any[]>([]);
  const [activeRegModal, setActiveRegModal] = useState<{ className: string; stream: string } | null>(null);
  const [showAllClassesRegistry, setShowAllClassesRegistry] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [autoDetectPeriod, setAutoDetectPeriod] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Merge provided timetable assignments with rich template assignments so every class/stream has valid schedules
  const allTimetableAssignments = useMemo(() => {
    const map = new Map<string, any>();
    // Seed with template assignments first
    TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS.forEach((a: any) => {
      const cls = normalizeClass(a.className || a.class_name);
      const str = normalizeStream(a.stream);
      const d = (a.day || '').trim().toLowerCase();
      const prd = (a.periodName || a.period || '').trim().toLowerCase();
      const key = `${cls}__${str}__${d}__${prd}`;
      map.set(key, { ...a, className: a.className || a.class_name, stream: a.stream || 'STREAM A' });
    });

    // Layer in explicit user/school assignments
    if (Array.isArray(timetableAssignments)) {
      timetableAssignments.forEach((a: any) => {
        const cls = normalizeClass(a.className || a.class_name);
        const str = normalizeStream(a.stream);
        const d = (a.day || '').trim().toLowerCase();
        const prd = (a.periodName || a.period || '').trim().toLowerCase();
        const key = `${cls}__${str}__${d}__${prd}`;
        map.set(key, { ...a, className: a.className || a.class_name, stream: a.stream || 'STREAM A' });
      });
    }

    return Array.from(map.values());
  }, [timetableAssignments]);

  const academicWeekInfo = useMemo(() => {
    return getAcademicWeek(selectedDate, academicTermDates);
  }, [selectedDate, academicTermDates]);

  // Local cache of registered monitors/monitresses so names and IDs persist immediately
  const monitorStorageKey = `haby_class_monitors_${schoolId}`;
  const [localMonitorsMap, setLocalMonitorsMap] = useState<
    Record<string, { monitorId?: string | null; monitressId?: string | null; monitorName?: string | null; monitressName?: string | null }>
  >(() => {
    try {
      const saved = localStorage.getItem(`haby_class_monitors_${schoolId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(monitorStorageKey);
      if (saved) setLocalMonitorsMap(JSON.parse(saved));
    } catch {}
  }, [monitorStorageKey]);

  // Build available class-stream pairs from streamSettings + allDbClasses + localMonitorsMap
  const classStreamList = useMemo(() => {
    const map = new Map<
      string,
      {
        className: string;
        stream: string;
        monitorId?: string | null;
        monitressId?: string | null;
        monitorName?: string | null;
        monitressName?: string | null;
      }
    >();
    if (Array.isArray(streamSettings) && streamSettings.length > 0) {
      streamSettings.forEach(ss => {
        const streams = Array.isArray(ss.streams) && ss.streams.length > 0 ? ss.streams : ['STREAM A'];
        streams.forEach(st => {
          const key = `${ss.className}__${st}`;
          map.set(key, { className: ss.className, stream: st, monitorId: null, monitressId: null, monitorName: null, monitressName: null });
        });
      });
    } else {
      ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(cName => {
        ['STREAM A', 'STREAM B'].forEach(st => {
          map.set(`${cName}__${st}`, { className: cName, stream: st, monitorId: null, monitressId: null, monitorName: null, monitressName: null });
        });
      });
    }

    allDbClasses.forEach((c: any) => {
      const cName = c.name || c.className || 'Form 1';
      const st = c.stream || 'STREAM A';
      const key = `${cName}__${st}`;
      const existing = map.get(key);
      map.set(key, {
        className: cName,
        stream: st,
        monitorId: c.monitorId ?? c.monitor_id ?? existing?.monitorId ?? null,
        monitressId: c.monitressId ?? c.monitress_id ?? existing?.monitressId ?? null,
        monitorName: c.monitorName ?? c.monitor_name ?? existing?.monitorName ?? null,
        monitressName: c.monitressName ?? c.monitress_name ?? existing?.monitressName ?? null
      });
    });

    Object.entries(localMonitorsMap).forEach(([key, val]) => {
      const [cName, st] = key.split('__');
      if (!cName || !st) return;
      const existing = map.get(key);
      map.set(key, {
        className: cName,
        stream: st,
        monitorId: val.monitorId !== undefined ? val.monitorId : existing?.monitorId ?? null,
        monitressId: val.monitressId !== undefined ? val.monitressId : existing?.monitressId ?? null,
        monitorName: val.monitorName !== undefined ? val.monitorName : existing?.monitorName ?? null,
        monitressName: val.monitressName !== undefined ? val.monitressName : existing?.monitressName ?? null
      });
    });

    return Array.from(map.values());
  }, [streamSettings, allDbClasses, localMonitorsMap]);

  const resolveLeaderName = useCallback(
    (leaderId?: string | null, explicitName?: string | null) => {
      if (explicitName && explicitName.trim()) return explicitName.trim();
      if (!leaderId) return null;
      const u = users.find(x => String(x.id) === String(leaderId));
      if (u) return u.fullName.replace(/\s*\((Monitor|Monitress)\s*-.*\)$/i, '');
      const s = students.find(x => String(x.id) === String(leaderId) || `stud_${x.id}` === String(leaderId));
      if (s) return s.name;
      return `ID: ${String(leaderId).slice(0, 8)}`;
    },
    [users, students]
  );

  const fetchAllClassesMonitors = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes/all-monitors?schoolId=${encodeURIComponent(schoolId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.classes)) {
          setAllDbClasses(data.classes);
          return data.classes;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch all classes monitors:', e);
    }
    return [];
  }, [schoolId]);

  const fetchJournalsByDate = useCallback(
    async (className?: string, date?: string) => {
      const cName = className || assignedClass?.name;
      const targetDate = date || selectedDate;
      if (!cName) return;
      try {
        const res = await fetch(
          `/api/db/query?table=class_journals&schoolId=${encodeURIComponent(schoolId)}&className=${encodeURIComponent(cName)}&date=${encodeURIComponent(targetDate)}`
        );
        const data = await res.json();
        setTodayJournals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching journals:', err);
      }
    },
    [schoolId, assignedClass?.name, selectedDate]
  );

  const loadInitialMonitorState = useCallback(async () => {
    setLoading(true);
    try {
      const dbClsList = await fetchAllClassesMonitors();

      // If user has already chosen a class or one was loaded from localStorage, preserve it!
      if (hasInitializedRef.current && assignedClass?.name) {
        setLoading(false);
        return;
      }

      let foundClass: any = null;

      // 1. Try local storage saved class
      try {
        const saved = localStorage.getItem(selectedClassStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.name || parsed.className)) {
            foundClass = parsed;
          }
        }
      } catch {}

      // 2. If currentUser is a monitor/monitress, look up their specifically assigned class
      if (!foundClass && currentUser?.id) {
        foundClass = await getMonitorClass(schoolId, currentUser.id);
      }

      // 3. Fallback to first class with monitor or first class in db
      if (!foundClass && dbClsList.length > 0) {
        const withMon = dbClsList.find((c: any) => c.monitorId || c.monitressId);
        foundClass = withMon || dbClsList[0];
      }

      // 4. Default fallback
      if (!foundClass) {
        const firstDefault =
          Array.isArray(streamSettings) && streamSettings.length > 0
            ? { name: streamSettings[0].className, stream: streamSettings[0].streams?.[0] || 'STREAM A' }
            : { name: 'Form 1', stream: 'STREAM A' };
        foundClass = firstDefault;
      }

      const normalizedFound = {
        ...foundClass,
        name: foundClass.name || foundClass.className || 'Form 1',
        className: foundClass.name || foundClass.className || 'Form 1',
        stream: foundClass.stream || 'STREAM A'
      };

      setAssignedClass(normalizedFound);
      hasInitializedRef.current = true;
      try {
        localStorage.setItem(selectedClassStorageKey, JSON.stringify(normalizedFound));
      } catch {}

      if (normalizedFound.name) {
        fetchJournalsByDate(normalizedFound.name, selectedDate);
      }
    } catch (err) {
      console.error('Error initializing monitor dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, schoolId, streamSettings, fetchAllClassesMonitors, fetchJournalsByDate, selectedClassStorageKey, selectedDate, assignedClass?.name]);

  const updateCurrentPeriod = useCallback(() => {
    if (!assignedClass?.name || !autoDetectPeriod) return;

    const now = new Date();
    // Only auto-detect if the selected date is today
    const selectedIsToday = selectedDate === now.toISOString().split('T')[0];
    if (!selectedIsToday) return;

    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Find the current period from periodSettings
    const activePeriodSetting = periodSettings.find(p => {
      const [startH, startM] = (p.start || '').split(':').map(Number);
      const [endH, endM] = (p.end || '').split(':').map(Number);
      const startTotal = (startH || 0) * 60 + (startM || 0);
      const endTotal = (endH || 0) * 60 + (endM || 0);
      return currentTime >= startTotal && currentTime <= endTotal;
    });

    if (activePeriodSetting) {
      // Find the assignment for this class, stream and period
      const assignment = allTimetableAssignments.find(a => {
        const aDay = (a.day || (a as any).day_name || '').trim().toLowerCase();
        if (aDay !== currentDay) return false;
        if (!isAssignmentForClassAndStream(a, assignedClass.name, assignedClass.stream)) return false;
        return matchPeriodName(a.period || a.periodName, activePeriodSetting.name);
      });

      if (assignment) {
        setCurrentPeriod({
          name: activePeriodSetting.name,
          startTime: activePeriodSetting.start,
          endTime: activePeriodSetting.end,
          subject: assignment.subject,
          teacherName: assignment.teacherName || (assignment as any).teacher_name,
          teacherId: assignment.teacherId ?? (assignment as any).teacher_id,
          isLocked: true // Signal to scanner that this is a scheduled period
        });
        setSelectedSubject(assignment.subject);
      } else {
        setCurrentPeriod({
          name: activePeriodSetting.name,
          startTime: activePeriodSetting.start,
          endTime: activePeriodSetting.end,
          isBreak: activePeriodSetting.isBreak,
          subject: activePeriodSetting.isBreak ? 'MAPUMZIKO (BREAK)' : 'Hakuna Somo'
        });
      }
    } else {
      setCurrentPeriod(null);
    }
  }, [assignedClass?.name, assignedClass?.stream, autoDetectPeriod, periodSettings, allTimetableAssignments, selectedDate]);

  useEffect(() => {
    loadInitialMonitorState();
    // Only run on component mount or schoolId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, currentUser?.id]);

  useEffect(() => {
    updateCurrentPeriod();
    const interval = setInterval(updateCurrentPeriod, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [updateCurrentPeriod]);

  useEffect(() => {
    if (assignedClass?.name) {
      fetchJournalsByDate(assignedClass.name, selectedDate);
    }
  }, [selectedDate, assignedClass?.name, assignedClass?.stream, fetchJournalsByDate]);

  // Available subjects for the selected class
  const classSubjects = useMemo(() => {
    const set = new Set<string>();
    if (assignedClass?.name) {
      allTimetableAssignments
        .filter(a => isAssignmentForClassAndStream(a, assignedClass.name, assignedClass.stream))
        .forEach(a => {
          if (a.subject) set.add(a.subject);
        });
    }
    teachers.forEach(t => {
      (t.subjects || []).forEach(sub => {
        if (sub) set.add(sub);
      });
    });
    [
      'Basic Mathematics',
      'English Language',
      'Kiswahili',
      'Biology',
      'Chemistry',
      'Physics',
      'History',
      'Geography',
      'Civics',
      'Book Keeping',
      'Commerce',
      'Computer Studies',
      'Social Studies',
      'Science',
      'Religious Education'
    ].forEach(s => set.add(s));

    return Array.from(set);
  }, [assignedClass?.name, assignedClass?.stream, allTimetableAssignments, teachers]);

  const currentClassStudents = useMemo(() => {
    const cName = normalizeClass(assignedClass?.name || 'Form 1');
    const cStream = normalizeStream(assignedClass?.stream || 'STREAM A');
    const matched = students.filter(s => {
      const sameCls = normalizeClass(s.className || (s as any).class_name) === cName;
      if (!sameCls) return false;
      if (!s.stream) return true;
      const st = normalizeStream(s.stream);
      return st === cStream || st.includes(cStream) || cStream.includes(st);
    });
    if (matched.length > 0) {
      return [...matched].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    // Fallback: match by class only
    const classOnly = students.filter(s => normalizeClass(s.className || (s as any).class_name) === cName);
    if (classOnly.length > 0) {
      return [...classOnly].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return [...students].slice(0, 45).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [students, assignedClass?.name, assignedClass?.stream]);

  const totalClassCount = currentClassStudents.length > 0 ? currentClassStudents.length : 45;

  // Per-subject/period attendance records persisted in localStorage for the active class & date
  const todayDateStr = new Date().toISOString().split('T')[0];
  const attendanceStorageKey = `haby_mon_att_${schoolId}_${assignedClass?.name || 'Form1'}_${assignedClass?.stream || 'A'}_${todayDateStr}`;

  const [periodAttendanceMap, setPeriodAttendanceMap] = useState<Record<string, {
    subject: string;
    present: number;
    absent: number;
    sick: number;
    permitted: number;
    absentStudents: { id: string | number; name: string; regNo?: string; reason: 'ABSENT' | 'SICK' | 'PERMITTED' }[];
  }>>({});

  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(attendanceStorageKey);
      if (saved) {
        setPeriodAttendanceMap(JSON.parse(saved));
      } else {
        setPeriodAttendanceMap({});
      }
    } catch {
      setPeriodAttendanceMap({});
    }
  }, [attendanceStorageKey]);

  const savePeriodAttendanceMap = (nextMap: typeof periodAttendanceMap) => {
    setPeriodAttendanceMap(nextMap);
    try {
      localStorage.setItem(attendanceStorageKey, JSON.stringify(nextMap));
    } catch {}
  };

  const handleSelectClassStream = async (cName: string, st: string) => {
    const matched = allDbClasses.find(c => {
      const name = c.name || c.className;
      return normalizeClass(name) === normalizeClass(cName) && normalizeStream(c.stream) === normalizeStream(st);
    });
    const localMatch = localMonitorsMap[`${cName}__${st}`];
    const nextClass = {
      ...(matched || {}),
      ...(localMatch || {}),
      name: cName,
      className: cName,
      stream: st,
      monitorId: localMatch?.monitorId ?? matched?.monitorId ?? null,
      monitressId: localMatch?.monitressId ?? matched?.monitressId ?? null,
      monitorName: localMatch?.monitorName ?? matched?.monitorName ?? null,
      monitressName: localMatch?.monitressName ?? matched?.monitressName ?? null
    };

    hasInitializedRef.current = true;
    setAssignedClass(nextClass);
    try {
      localStorage.setItem(selectedClassStorageKey, JSON.stringify(nextClass));
    } catch {}

    await fetchJournalsByDate(cName, selectedDate);
  };

  const handleSaveMonitors = async (
    monitorId: string | null,
    monitressId: string | null,
    monitorName?: string | null,
    monitressName?: string | null
  ) => {
    if (!activeRegModal) return;
    const { className, stream } = activeRegModal;
    const key = `${className}__${stream}`;

    // Immediately update local state & localStorage so UI reflects registration right away
    const nextLocal = {
      ...localMonitorsMap,
      [key]: {
        monitorId,
        monitressId,
        monitorName: monitorName || null,
        monitressName: monitressName || null
      }
    };
    setLocalMonitorsMap(nextLocal);
    try {
      localStorage.setItem(monitorStorageKey, JSON.stringify(nextLocal));
    } catch {}

    if (assignedClass?.name === className && assignedClass?.stream === stream) {
      setAssignedClass((prev: any) => ({
        ...prev,
        monitorId,
        monitressId,
        monitorName: monitorName || null,
        monitressName: monitressName || null
      }));
    }

    setToastMsg(`✓ Monitor & Monitress wa ${className} (${stream}) wamesajiliwa kikamilifu!`);
    setTimeout(() => setToastMsg(null), 4000);

    try {
      const res = await fetch('/api/classes/find-and-update-monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className,
          stream,
          monitorId,
          monitressId,
          monitorName,
          monitressName,
          schoolId
        })
      });
      if (res.ok) {
        const updatedList = await fetchAllClassesMonitors();
        const updatedCurrent = updatedList.find(
          (c: any) => (c.name || c.className) === className && c.stream === stream
        );
        if (updatedCurrent && assignedClass?.name === className && assignedClass?.stream === stream) {
          setAssignedClass({
            ...updatedCurrent,
            monitorName: updatedCurrent.monitorName || monitorName || null,
            monitressName: updatedCurrent.monitressName || monitressName || null
          });
        }
      }
    } catch (e) {
      console.error('Error saving monitors:', e);
    }
  };

  const currentClassEntry = classStreamList.find(
    cs => cs.className === (assignedClass?.name || 'Form 1') && cs.stream === (assignedClass?.stream || 'STREAM A')
  );
  const currentMonitorName = resolveLeaderName(
    currentClassEntry?.monitorId || assignedClass?.monitorId,
    currentClassEntry?.monitorName || assignedClass?.monitorName
  );
  const currentMonitressName = resolveLeaderName(
    currentClassEntry?.monitressId || assignedClass?.monitressId,
    currentClassEntry?.monitressName || assignedClass?.monitressName
  );

  const currentSubjAtt = periodAttendanceMap[selectedSubject] || {
    subject: selectedSubject,
    present: totalClassCount,
    absent: 0,
    sick: 0,
    permitted: 0,
    absentStudents: []
  };

  const handleToggleMonitorStudentStatus = (
    student: Student,
    status: 'PRESENT' | 'ABSENT' | 'SICK' | 'PERMITTED'
  ) => {
    const existingList = currentSubjAtt.absentStudents || [];
    let nextList = [...existingList];
    if (status === 'PRESENT') {
      nextList = existingList.filter(x => String(x.id) !== String(student.id));
    } else {
      const idx = existingList.findIndex(x => String(x.id) === String(student.id));
      const newRec = { id: student.id, name: student.name, regNo: student.regNo, reason: status };
      if (idx >= 0) {
        if (existingList[idx].reason === status) {
          nextList = existingList.filter(x => String(x.id) !== String(student.id));
        } else {
          nextList[idx] = newRec;
        }
      } else {
        nextList.push(newRec);
      }
    }
    const absent = nextList.filter(x => x.reason === 'ABSENT').length;
    const sick = nextList.filter(x => x.reason === 'SICK').length;
    const permitted = nextList.filter(x => x.reason === 'PERMITTED').length;
    const present = Math.max(0, totalClassCount - (absent + sick + permitted));

    savePeriodAttendanceMap({
      ...periodAttendanceMap,
      [selectedSubject]: {
        subject: selectedSubject,
        present,
        absent,
        sick,
        permitted,
        absentStudents: nextList
      }
    });
  };

  const handleManualCountChange = (field: 'present' | 'absent' | 'sick' | 'permitted', val: number) => {
    const next = { ...currentSubjAtt, [field]: Math.max(0, val) };
    if (field !== 'present') {
      next.present = Math.max(0, totalClassCount - (next.absent + next.sick + next.permitted));
    }
    savePeriodAttendanceMap({
      ...periodAttendanceMap,
      [selectedSubject]: next
    });
  };

  const dayOfWeekName = useMemo(() => {
    return new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
  }, [selectedDate]);

  const scheduledPeriodsForDay = useMemo(() => {
    if (!assignedClass?.name) return [];
    const targetDay = dayOfWeekName.toLowerCase();
    return allTimetableAssignments.filter(a => {
      const aDay = (a.day || (a as any).day_name || '').trim().toLowerCase();
      if (aDay !== targetDay) return false;
      return isAssignmentForClassAndStream(a, assignedClass.name, assignedClass.stream);
    });
  }, [allTimetableAssignments, assignedClass?.name, assignedClass?.stream, dayOfWeekName]);

  const daySchedule = useMemo(() => {
    if (!assignedClass?.name) return [];
    const targetDay = dayOfWeekName.toLowerCase();
    return allTimetableAssignments
      .filter(a => {
        const aDay = (a.day || (a as any).day_name || '').trim().toLowerCase();
        if (aDay !== targetDay) return false;
        return isAssignmentForClassAndStream(a, assignedClass?.name, assignedClass?.stream);
      })
      .sort((a, b) => {
        const getNum = (s?: string) => {
          const match = (s || '').match(/(\d+)/);
          return match ? parseInt(match[1]) : 999;
        };
        return getNum(a.periodName || a.period) - getNum(b.periodName || b.period);
      });
  }, [allTimetableAssignments, assignedClass?.name, assignedClass?.stream, dayOfWeekName]);

  const totalScheduledCount = scheduledPeriodsForDay.length;
  const totalLessonsTaught = todayJournals.length;
  const pendingLessons = Math.max(0, totalScheduledCount - totalLessonsTaught);

  const uniqueCompletedTeachers = useMemo(() => {
    const set = new Set<string>();
    todayJournals.forEach(j => {
      if (j.teacherName || j.teacher_name) {
        set.add(j.teacherName || j.teacher_name);
      }
    });
    return set.size;
  }, [todayJournals]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-2 text-blue-600" />
        <p className="font-bold text-slate-600">Inapakia Mfumo wa Monitor &amp; Monitress...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Control Bar: Select Class/Stream + Date Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
              <School className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Darasa & Mkondo (Active Class)
              </label>
              <select
                value={`${assignedClass?.name || 'Form 1'}__${assignedClass?.stream || 'STREAM A'}`}
                onChange={e => {
                  const [cName, st] = e.target.value.split('__');
                  if (cName && st) handleSelectClassStream(cName, st);
                }}
                className="mt-0.5 px-3 py-1.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {classStreamList.map(cs => (
                  <option key={`${cs.className}__${cs.stream}`} value={`${cs.className}__${cs.stream}`}>
                    {cs.className} — {cs.stream}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Tarehe ya Journal (Selected Date)
              </label>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setAutoDetectPeriod(false);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  title="Leo"
                >
                  Leo
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Somo (Subject)
              </label>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setAutoDetectPeriod(false);
                  }}
                  disabled={currentPeriod?.isLocked}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${currentPeriod?.isLocked ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
                >
                  {classSubjects.map(sub => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setAutoDetectPeriod(true)}
                  title="Detect Current Period"
                  className={`p-2 rounded-xl transition-all ${autoDetectPeriod ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveRegModal({
                className: assignedClass?.name || 'Form 1',
                stream: assignedClass?.stream || 'STREAM A'
              })
            }
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sajili Monitor ({assignedClass?.name})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAllClassesRegistry(prev => !prev)}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-slate-200 cursor-pointer transition-all"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>{showAllClassesRegistry ? 'Ficha Orodha' : 'Madarasa Yote'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Daily Statistics Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumla ya Vipindi Vilivyofundishwa</p>
            <p className="text-xl font-black text-slate-900">{totalLessonsTaught} / {totalScheduledCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mada za Kusubiri (Pending Topics)</p>
            <p className="text-xl font-black text-amber-600">{pendingLessons}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Walimu Waliomaliza Kusaini</p>
            <p className="text-xl font-black text-blue-600">{uniqueCompletedTeachers}</p>
          </div>
        </div>
      </div>

      {/* Collapsible Full School Monitor & Monitress Registry */}
      {showAllClassesRegistry && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Orodha ya Monitor & Monitress Shule Nzima</span>
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Bonyeza <strong>"Sajili"</strong> kumchagua kiongozi wa darasa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classStreamList.map(cs => {
              const monName = resolveLeaderName(cs.monitorId, cs.monitorName);
              const montName = resolveLeaderName(cs.monitressId, cs.monitressName);
              const isCurrent = cs.className === assignedClass?.name && cs.stream === assignedClass?.stream;
              return (
                <div
                  key={`${cs.className}__${cs.stream}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isCurrent ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => handleSelectClassStream(cs.className, cs.stream)}
                        className="text-xs font-black text-slate-900 hover:text-blue-700 uppercase tracking-tight cursor-pointer"
                      >
                        {cs.className} • {cs.stream}
                      </button>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black text-blue-700 uppercase">M:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[150px]">
                          {monName || <em className="text-slate-400 font-normal">--</em>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black text-rose-700 uppercase">F:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[150px]">
                          {montName || <em className="text-slate-400 font-normal">--</em>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveRegModal({ className: cs.className, stream: cs.stream })}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Sajili</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 p-6 sm:p-8 rounded-[36px] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full border border-white/30 backdrop-blur-md mb-3">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  Class Journal System — {academicWeekInfo.label} — {selectedDate === new Date().toISOString().split('T')[0] ? 'Leo' : selectedDate}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {assignedClass?.name || 'Form 1'} — {assignedClass?.stream || 'STREAM A'}
              </h2>
              <p className="mt-1 text-blue-100 font-bold opacity-90 text-sm">
                {new Date(selectedDate).toLocaleDateString('sw-TZ', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/30 shadow-lg hidden sm:block">
              <Clock className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200 mb-0.5">
                Monitor (Boy)
              </p>
              <p className="text-sm font-bold truncate">
                {currentMonitorName || 'Bofya Sajili'}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-200 mb-0.5">
                Monitress (Girl)
              </p>
              <p className="text-sm font-bold truncate">
                {currentMonitressName || 'Bofya Sajili'}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200 mb-0.5">
                Kipindi (Selected):
              </p>
              <div className="text-sm font-black truncate">
                {selectedSubject ? (
                  <>
                    <span className="text-white block truncate">{selectedSubject}</span>
                    <span className="text-[10px] text-emerald-300 font-bold block truncate mt-0.5 uppercase">
                      {currentPeriod?.name || 'Manual'} • {currentPeriod?.startTime || '--'}-{currentPeriod?.endTime || '--'}
                    </span>
                  </>
                ) : (
                  <span className="text-white/60 italic font-medium">Chagua hapa chini</span>
                )}
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-3.5 border border-white/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-200 mb-0.5">
                Mtumiaji
              </p>
              <p className="text-sm font-bold truncate">
                {currentUser?.fullName?.split(' ')[0] || 'User'} ({currentUser?.role || 'MONITOR'})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Day Schedule (Pushed from Main Timetable) - List Based View */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Ratiba ya Masomo: {assignedClass?.name || 'Form 1'} • {assignedClass?.stream || 'STREAM A'} ({new Date(selectedDate).toLocaleDateString('sw-TZ', { weekday: 'long' })})</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportClassJournalPDF({
                journals: todayJournals,
                schoolInfo,
                className: assignedClass?.name || 'Form 1',
                streamName: assignedClass?.stream || 'STREAM A',
                selectedDate,
                academicWeekInfo
              })}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pakua PDF</span>
            </button>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase border border-blue-100">
              Source: Master Timetable
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {daySchedule.map((a, idx) => {
            const periodLabel = a.periodName || a.period;
            const isActive = selectedSubject === a.subject && (currentPeriod?.name === periodLabel);
            const isSigned = todayJournals.some(j => j.subject === a.subject && (j.periodName === periodLabel || j.periodName === a.period));
            
            return (
              <button
                key={a.id || idx}
                onClick={() => {
                  setSelectedSubject(a.subject);
                  setAutoDetectPeriod(false);
                  setCurrentPeriod({
                    name: periodLabel,
                    subject: a.subject,
                    teacherName: a.teacherName || a.teacher_name,
                    teacherId: a.teacherId ?? a.teacher_id,
                    isLocked: true
                  });
                }}
                className={`w-full p-4 sm:p-5 flex items-center gap-4 transition-all text-left group hover:bg-slate-50 ${isActive ? 'bg-blue-50/50' : ''}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 transition-all ${
                  isSigned 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : isActive 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                      : 'bg-white border-slate-100 text-slate-400 group-hover:border-blue-200'
                }`}>
                  <span className="text-[10px] font-black leading-none uppercase">P</span>
                  <span className="text-lg font-black">{periodLabel.match(/(\d+)/)?.[1] || idx+1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                      {periodLabel}
                    </p>
                    {isSigned && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Imesainiwa
                      </span>
                    )}
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase animate-pulse">
                        Inasainiwa
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-base text-slate-900 leading-tight truncate">{a.subject}</h4>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mt-0.5">Tr. {a.teacherName || a.teacher_name || 'Hajapangwa'}</p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {isSigned ? (
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                    }`}>
                      Saini Sasa
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        
          {/* Manual / Substitution Option */}
          <button
            onClick={() => {
              setSelectedSubject('Basic Mathematics');
              setAutoDetectPeriod(false);
              setCurrentPeriod(null);
            }}
            className={`w-full p-4 sm:p-5 flex items-center gap-4 transition-all text-left hover:bg-slate-50 border-t border-dashed border-slate-200 ${!currentPeriod && !autoDetectPeriod ? 'bg-indigo-50/50' : ''}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 border-dashed transition-all ${
              !currentPeriod && !autoDetectPeriod 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                : 'bg-white border-slate-200 text-slate-400'
            }`}>
              <PlusCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 italic">Substitution / Extra Session</p>
              <h4 className="font-black text-base text-slate-900">Mengineyo (Sio ya Ratiba)</h4>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mt-0.5">Kwa ajili ya vipindi vya dharura au ziada</p>
            </div>
          </button>

          {daySchedule.length === 0 && (
             <div className="p-10 text-center space-y-3 bg-slate-50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h4 className="text-slate-600 font-black uppercase tracking-widest text-xs">
                  Hakuna vipindi vilivyopangwa kwenye ratiba ya {assignedClass?.name || 'darasa hili'} ({assignedClass?.stream || 'STREAM A'}) siku ya {new Date(selectedDate).toLocaleDateString('sw-TZ', { weekday: 'long' })}
                </h4>
                <p className="text-slate-400 text-[10px] font-bold max-w-md mx-auto">
                  Ikiwa kuna kipindi kilichofundishwa, unaweza kuchagua Somo moja kwa moja kutoka kwenye sehemu ya juu au utumie chaguo la "Mengineyo".
                </p>
             </div>
          )}
        </div>
      </div>

      {/* Main Verification Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => {
            setScanAction('in');
            setIsScannerOpen(true);
          }}
          className="group relative overflow-hidden bg-white p-8 sm:p-10 rounded-[36px] shadow-xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-emerald-100 transition-all text-center active:scale-[0.98] cursor-pointer"
        >
          <div className="mb-5 w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[28px] mx-auto flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-50">
            <Fingerprint className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
            Mwalimu Ingia Darasani
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-bold leading-tight">
            Anza kipindi cha <span className="text-emerald-700 underline">{selectedSubject}</span> kwa kugonga kidole au PIN
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setScanAction('out');
            setIsScannerOpen(true);
          }}
          className="group relative overflow-hidden bg-white p-8 sm:p-10 rounded-[36px] shadow-xl border-2 border-slate-100 hover:border-amber-500 hover:shadow-amber-100 transition-all text-center active:scale-[0.98] cursor-pointer"
        >
          <div className="mb-5 w-20 h-20 bg-amber-100 text-amber-600 rounded-[28px] mx-auto flex items-center justify-center group-hover:-rotate-12 transition-transform shadow-lg shadow-amber-50">
            <Clock className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
            Mwalimu Toka Darasani
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-bold leading-tight">
            Maliza kipindi cha <span className="text-amber-700 underline">{selectedSubject}</span> na kurekodi muda
          </p>
        </button>
      </div>

      {/* Period Student Attendance: Present / Absent / Sick / Permitted + Student Roster Selector */}
      <div className="bg-white rounded-[36px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
              Mahudhurio ya Kipindi ({selectedSubject})
            </span>
            <h3 className="text-lg sm:text-xl font-black mt-1">
              Jaza Wanafunzi Waliopo, Absent, Sick na Walioruhusiwa
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Chagua wanafunzi ambao hawapo kwenye kipindi cha <strong>{selectedSubject}</strong> kutoka kwenye orodha ya wanafunzi wa <strong>{assignedClass?.name} ({assignedClass?.stream})</strong>.
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/20 text-right shrink-0">
            <span className="text-[10px] font-black uppercase text-amber-300 block">Jumla ya Darasa</span>
            <span className="text-lg font-black text-white">{totalClassCount} Wanafunzi</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 4 Numeric Inputs: Present, Absent, Sick, Permitted */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <label className="text-[10px] font-black uppercase text-emerald-700 block mb-1">
                1. Student Present (Waliopo)
              </label>
              <input
                type="number"
                min="0"
                max={totalClassCount}
                value={currentSubjAtt.present}
                onChange={e => handleManualCountChange('present', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-black text-base text-emerald-950 outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <label className="text-[10px] font-black uppercase text-rose-700 block mb-1">
                2. Absent (Wasiokuwepo)
              </label>
              <input
                type="number"
                min="0"
                max={totalClassCount}
                value={currentSubjAtt.absent}
                onChange={e => handleManualCountChange('absent', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl font-black text-base text-rose-950 outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                3. Sick (Wagonjwa)
              </label>
              <input
                type="number"
                min="0"
                max={totalClassCount}
                value={currentSubjAtt.sick}
                onChange={e => handleManualCountChange('sick', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-base text-amber-950 outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <label className="text-[10px] font-black uppercase text-blue-700 block mb-1">
                4. Walioruhusiwa (Permitted)
              </label>
              <input
                type="number"
                min="0"
                max={totalClassCount}
                value={currentSubjAtt.permitted}
                onChange={e => handleManualCountChange('permitted', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-black text-base text-blue-950 outline-none"
              />
            </div>
          </div>

          {/* Student Roster Selector */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase text-slate-800">
                Orodha ya Wanafunzi wa {assignedClass?.name} ({assignedClass?.stream}) — Select Wale Wasiokuwepo Kwenye Kipindi cha {selectedSubject}:
              </h4>
              <input
                type="text"
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                placeholder="Tafuta mwanafunzi..."
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white outline-none w-full sm:w-64"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {currentClassStudents
                .filter(s => !studentSearchQuery.trim() || s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                .map((student, idx) => {
                  const found = currentSubjAtt.absentStudents.find(x => String(x.id) === String(student.id));
                  const stStatus = found ? found.reason : 'PRESENT';
                  return (
                    <div
                      key={student.id}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition ${
                        stStatus === 'ABSENT'
                          ? 'bg-rose-50 border-rose-300'
                          : stStatus === 'SICK'
                          ? 'bg-amber-50 border-amber-300'
                          : stStatus === 'PERMITTED'
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {idx + 1}. {student.name}
                        </span>
                        {student.regNo && (
                          <span className="text-[9px] font-mono text-slate-400 font-bold">{student.regNo}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleMonitorStudentStatus(student, 'PRESENT')}
                          className={`py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                            stStatus === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Yupo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMonitorStudentStatus(student, 'ABSENT')}
                          className={`py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                            stStatus === 'ABSENT' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMonitorStudentStatus(student, 'SICK')}
                          className={`py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                            stStatus === 'SICK' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Sick
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMonitorStudentStatus(student, 'PERMITTED')}
                          className={`py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                            stStatus === 'PERMITTED' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Ruhusa
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Selected Absent Students List at the Bottom */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h4 className="text-xs font-black uppercase text-rose-800">
              Orodha ya Wanafunzi Ambavyo Hawakuwepo Kwenye Kipindi cha {selectedSubject} ({currentSubjAtt.absentStudents.length}):
            </h4>
            {currentSubjAtt.absentStudents.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                ✓ Wanafunzi wote ({totalClassCount}) walikuwepo kwenye kipindi cha {selectedSubject}.
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                <p className="text-[11px] font-black text-rose-900 uppercase">
                  Wanafunzi hawa hawakuwepo kwenye kipindi cha {selectedSubject} ({assignedClass?.name} - {assignedClass?.stream}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentSubjAtt.absentStudents.map((st, idx) => (
                    <span
                      key={`${st.id}_${idx}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        st.reason === 'SICK'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : st.reason === 'PERMITTED'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}
                    >
                      <span>{idx + 1}. {st.name}</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/80">
                        {st.reason === 'SICK' ? 'Mgonjwa (Sick)' : st.reason === 'PERMITTED' ? 'Ameruhusiwa' : 'Hayupo (Absent)'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Teaching History (The Class Journal) */}
      <div className="bg-white rounded-[36px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight">
                Journal ya Vipindi vya Leo ({assignedClass?.name})
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Mada zilizofundishwa na walimu walioingia darasani
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchJournalsByDate()}
            className="p-3 hover:bg-slate-200/70 rounded-2xl transition-all text-slate-500 hover:text-blue-600 active:rotate-180 cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-3">
            {todayJournals.length === 0 ? (
              <div className="p-14 text-center text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                  <BookOpen className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-black uppercase text-xs tracking-widest">
                  Hakuna rekodi za vipindi kwa {assignedClass?.name} leo bado
                </p>
                <p className="text-[11px] mt-1 font-bold">
                  Mwalimu akifika darasani, bonyeza &apos;Mwalimu Ingia Darasani&apos; hapo juu.
                </p>
              </div>
            ) : (
              [...todayJournals].reverse().map((j, i) => {
                const timeInStr = j.time_in || j.timeIn;
                const timeOutStr = j.time_out || j.timeOut;
                const duration =
                  timeOutStr && timeInStr
                    ? Math.max(1, Math.round((new Date(timeOutStr).getTime() - new Date(timeInStr).getTime()) / 60000))
                    : null;

                const matchedTeacher = teachers.find(
                  t =>
                    String(t.id) === String(j.teacher_id || j.teacherId) ||
                    String(t.firestoreDocId || '') === String(j.teacher_id || j.teacherId)
                );
                const resolvedTeacherName =
                  j.teacher_name || j.teacherName || matchedTeacher?.name || 'Mwalimu wa Somo';
                const subjAtt = periodAttendanceMap[j.subject || selectedSubject];

                return (
                  <div
                    key={j.id || i}
                    className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center gap-4 group hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-500 shrink-0">
                      {todayJournals.length - i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="font-black text-slate-900 text-base uppercase truncate">
                          {j.subject || selectedSubject}
                        </h4>
                        <div className="flex flex-col items-end shrink-0">
                          {timeInStr && (
                            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                              Ingia: {new Date(timeInStr).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {timeOutStr && (
                            <span className="text-[10px] font-bold text-slate-500 mt-1">
                              Toka: {new Date(timeOutStr).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-black text-blue-700 uppercase tracking-tight">
                          Tr. {resolvedTeacherName}
                        </p>
                        {duration !== null && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            Dakika {duration}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
                          Waliopo: {j.presentCount || 0} | Absent: {j.absentCount || 0} | Sick: {j.sickCount || 0} | Ruhusa: {j.permittedCount || 0}
                        </span>
                      </div>
                      {(j.mainTopic || j.subTopic) && (
                        <div className="mt-2.5 p-3 bg-white rounded-2xl border border-blue-100 flex flex-col gap-1">
                          {j.mainTopic && (
                            <div className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">
                                <BookOpen className="w-3.5 h-3.5" />
                              </span>
                              <p className="text-xs text-slate-700 font-bold">
                                <span className="text-blue-600 uppercase text-[9px] tracking-wider block">
                                  Mada Kuu (Main Topic):
                                </span>
                                {j.mainTopic}
                              </p>
                            </div>
                          )}
                          {j.subTopic && (
                            <div className="flex items-start gap-2 ml-5">
                              <p className="text-[11px] text-slate-500 font-medium italic">
                                <span className="text-slate-400 uppercase text-[8px] tracking-wider block not-italic">
                                  Mada Ndogo (Sub Topic):
                                </span>
                                — {j.subTopic}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {subjAtt && subjAtt.absentStudents.length > 0 && (
                        <div className="mt-2 p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-[11px]">
                          <span className="font-black text-rose-800 uppercase text-[9px] block mb-1">
                            Wanafunzi Wasiokuwepo Kwenye Kipindi Hiki ({subjAtt.absentStudents.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {subjAtt.absentStudents.map((st, sIdx) => (
                              <span key={`${st.id}_${sIdx}`} className="px-2 py-0.5 bg-white border border-rose-200 rounded text-[10px] font-bold text-rose-900">
                                {sIdx + 1}. {st.name} ({st.reason === 'SICK' ? 'Mgonjwa' : st.reason === 'PERMITTED' ? 'Ruhusa' : 'Absent'})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <FingerprintScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onVerified={() => {
          fetchJournalsByDate();
          // Optionally clear local attendance after successful 'in' scan if desired,
          // but usually it's better to keep it until the day ends.
        }}
        teachers={teachers}
        schoolId={schoolId}
        monitorId={currentUser?.id || 'usr_monitor'}
        className={assignedClass?.name || 'Form 1'}
        subject={selectedSubject}
        action={scanAction}
        presentCount={currentSubjAtt.present}
        absentCount={currentSubjAtt.absent}
        sickCount={currentSubjAtt.sick}
        permittedCount={currentSubjAtt.permitted}
        periodName={currentPeriod?.name}
        scheduledTeacherId={currentPeriod?.teacherId}
        scheduledTeacherName={currentPeriod?.teacherName}
        isLocked={currentPeriod?.isLocked}
        term={academicWeekInfo.term}
        academicWeek={academicWeekInfo.week}
      />

      {activeRegModal && (
        <MonitorRegistrationModal
          isOpen={!!activeRegModal}
          onClose={() => setActiveRegModal(null)}
          className={activeRegModal.className}
          stream={activeRegModal.stream}
          schoolId={schoolId}
          users={users}
          students={students}
          initialMonitorId={
            classStreamList.find(
              c => c.className === activeRegModal.className && c.stream === activeRegModal.stream
            )?.monitorId
          }
          initialMonitressId={
            classStreamList.find(
              c => c.className === activeRegModal.className && c.stream === activeRegModal.stream
            )?.monitressId
          }
          initialMonitorName={
            resolveLeaderName(
              classStreamList.find(
                c => c.className === activeRegModal.className && c.stream === activeRegModal.stream
              )?.monitorId,
              classStreamList.find(
                c => c.className === activeRegModal.className && c.stream === activeRegModal.stream
              )?.monitorName
            )
          }
          initialMonitressName={
            resolveLeaderName(
              classStreamList.find(
                c => c.className === activeRegModal.className && c.stream === activeRegModal.stream
              )?.monitressId,
              classStreamList.find(
                c => c.className === activeRegModal.className && c.stream === activeRegModal.stream
              )?.monitressName
            )
          }
          onSave={handleSaveMonitors}
        />
      )}
    </div>
  );
};
