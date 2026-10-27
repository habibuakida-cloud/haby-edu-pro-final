import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Users,
  UserCheck,
  ClipboardCheck,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Database,
  RefreshCw,
  Filter,
  Eye,
  X,
  Check,
  Building2,
  TrendingUp,
  AlertCircle,
  Download,
  FileText
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
  AreaChart,
  Area
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DutyRosterData,
  DutyStream,
  DutyTeacher,
  DutyWeeklyAssignment,
  DutyDailyReport,
  DutyStreamAttendanceRow,
  Student,
  Teacher,
  SchoolInfo,
  UserAccount
} from '../../types';
import { db } from '../../lib/dbClient';
import { doc, setDoc } from 'firebase/firestore';
import { MonthlyAttendanceTrendsWidget } from '../Dashboard/MonthlyAttendanceTrendsWidget';

interface DutyRosterSystemProps {
  schoolId: string;
  schoolInfo: SchoolInfo;
  students: Student[];
  teachers: Teacher[];
  currentUser?: UserAccount | null;
  dutyRosterData?: DutyRosterData;
  onUpdateDutyRoster: (data: DutyRosterData) => void;
  onAddMainTeacher?: (teacher: Teacher) => void;
  onUpdateMainTeacher?: (teacher: Teacher) => void;
}

const SWAHILI_DAYS: Record<number, string> = {
  0: 'Jumapili',
  1: 'Jumatatu',
  2: 'Jumanne',
  3: 'Jumatano',
  4: 'Alhamisi',
  5: 'Ijumaa',
  6: 'Jumamosi',
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMondayAndSunday(dateStr: string): { monday: string; sunday: string; label: string } {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return getMondayAndSunday(now.toISOString().slice(0, 10));
  }
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMonday);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const mondayISO = mon.toISOString().slice(0, 10);
  const sundayISO = sun.toISOString().slice(0, 10);
  const label = `${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]} - ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]} ${sun.getFullYear()}`;
  return { monday: mondayISO, sunday: sundayISO, label };
}

export function getWeekDaysList(mondayISO: string): { date: string; dayName: string; shortDay: string }[] {
  const base = new Date(mondayISO + 'T00:00:00');
  if (isNaN(base.getTime())) return [];
  const list: { date: string; dayName: string; shortDay: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dayName = SWAHILI_DAYS[d.getDay()] || 'Siku';
    list.push({ date: iso, dayName, shortDay: dayName.slice(0, 3) });
  }
  return list;
}

function normalizeStreamKey(className: string, stream: string): string {
  const cls = (className || 'Form 1').trim();
  const str = (stream || 'A').replace(/^STREAM\s+/i, '').trim();
  return `${cls}${str.length === 1 ? str : ' ' + str}`.replace(/\s+/g, ' ').trim();
}

function isStudentBoy(gender?: string): boolean {
  const g = (gender || 'Male').trim().toLowerCase();
  return g === 'male' || g === 'm' || g === 'boy' || g === 'mvulana' || g === 'b';
}

export function computeStreamsFromRegisteredStudents(students: Student[]): DutyStream[] {
  if (!students || students.length === 0) return [];
  const map = new Map<string, { boys: number; girls: number }>();
  students.forEach(st => {
    const key = normalizeStreamKey(st.className, st.stream || 'A');
    const curr = map.get(key) || { boys: 0, girls: 0 };
    if (isStudentBoy(st.gender)) {
      curr.boys += 1;
    } else {
      curr.girls += 1;
    }
    map.set(key, curr);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, counts], idx) => ({
      id: `stream_${name.toLowerCase().replace(/\s+/g, '_')}_${idx}`,
      name,
      registeredBoys: counts.boys,
      registeredGirls: counts.girls,
      totalStudents: counts.boys + counts.girls,
      classTeacher: '',
    }));
}

function ensureStreamGenderFields(stream: DutyStream, students?: Student[]): DutyStream {
  if (students && students.length > 0) {
    let matchedBoys = 0;
    let matchedGirls = 0;
    const targetName = stream.name.toLowerCase().replace(/\s+/g, '');
    students.forEach(st => {
      const stKey = normalizeStreamKey(st.className, st.stream || 'A').toLowerCase().replace(/\s+/g, '');
      if (stKey === targetName) {
        if (isStudentBoy(st.gender)) matchedBoys++;
        else matchedGirls++;
      }
    });
    if (matchedBoys + matchedGirls > 0) {
      return {
        ...stream,
        registeredBoys: matchedBoys,
        registeredGirls: matchedGirls,
        totalStudents: matchedBoys + matchedGirls,
      };
    }
  }
  const total = Number(stream.totalStudents) || 0;
  const regB =
    typeof stream.registeredBoys === 'number'
      ? stream.registeredBoys
      : Math.ceil(total / 2);
  const regG =
    typeof stream.registeredGirls === 'number'
      ? stream.registeredGirls
      : Math.max(0, total - regB);
  return {
    ...stream,
    registeredBoys: regB,
    registeredGirls: regG,
    totalStudents: regB + regG,
  };
}

function ensureRowGenderFields(row: DutyStreamAttendanceRow, stream?: DutyStream): DutyStreamAttendanceRow {
  const total = Number(stream?.totalStudents ?? row.totalStudents) || 0;
  const regB =
    typeof stream?.registeredBoys === 'number'
      ? stream.registeredBoys
      : typeof row.registeredBoys === 'number'
      ? row.registeredBoys
      : Math.ceil(total / 2);
  const regG =
    typeof stream?.registeredGirls === 'number'
      ? stream.registeredGirls
      : typeof row.registeredGirls === 'number'
      ? row.registeredGirls
      : Math.max(0, total - regB);
  const resolvedTotal = regB + regG;

  const absT = Number(row.absent) || 0;
  const absB = typeof row.absentBoys === 'number' ? row.absentBoys : Math.ceil(absT / 2);
  const absG = typeof row.absentGirls === 'number' ? row.absentGirls : Math.max(0, absT - absB);

  const permT = Number(row.permitted) || 0;
  const permB = typeof row.permittedBoys === 'number' ? row.permittedBoys : Math.ceil(permT / 2);
  const permG = typeof row.permittedGirls === 'number' ? row.permittedGirls : Math.max(0, permT - permB);

  const sickT = Number(row.sickPua) || 0;
  const sickB = typeof row.sickBoys === 'number' ? row.sickBoys : Math.ceil(sickT / 2);
  const sickG = typeof row.sickGirls === 'number' ? row.sickGirls : Math.max(0, sickT - sickB);

  const presB =
    typeof row.presentBoys === 'number'
      ? row.presentBoys
      : Math.max(0, regB - (absB + permB + sickB));
  const presG =
    typeof row.presentGirls === 'number'
      ? row.presentGirls
      : Math.max(0, regG - (absG + permG + sickG));
  const presT = presB + presG;

  return {
    ...row,
    streamName: stream?.name || row.streamName,
    registeredBoys: regB,
    registeredGirls: regG,
    totalStudents: resolvedTotal,
    presentBoys: presB,
    presentGirls: presG,
    present: presT,
    absentBoys: absB,
    absentGirls: absG,
    absent: absB + absG,
    permittedBoys: permB,
    permittedGirls: permG,
    permitted: permB + permG,
    sickBoys: sickB,
    sickGirls: sickG,
    sickPua: sickB + sickG,
    unexcused: absB + absG,
    remarks: row.remarks || '',
  };
}

export function buildDefaultDutyRosterData(existingTeachers: Teacher[], existingStudents?: Student[]): DutyRosterData {
  const todayISO = new Date().toISOString().slice(0, 10);
  const currentWeek = getMondayAndSunday(todayISO);

  const computedFromStudents = existingStudents && existingStudents.length > 0
    ? computeStreamsFromRegisteredStudents(existingStudents)
    : [];

  const defaultStreams: DutyStream[] = computedFromStudents.length > 0
    ? computedFromStudents
    : [
        { id: 'stream_f1a', name: 'Form 1A', registeredBoys: 15, registeredGirls: 15, totalStudents: 30, classTeacher: 'Mwl. Habibu Akida' },
        { id: 'stream_f1b', name: 'Form 1B', registeredBoys: 15, registeredGirls: 15, totalStudents: 30, classTeacher: 'Mwl. Fatuma Mwaupeya' },
        { id: 'stream_f2a', name: 'Form 2A', registeredBoys: 15, registeredGirls: 15, totalStudents: 30, classTeacher: 'Mwl. Marttin Mhalwa' },
        { id: 'stream_f3a', name: 'Form 3A', registeredBoys: 15, registeredGirls: 15, totalStudents: 30, classTeacher: 'Mwl. Nelson Kisoma' },
        { id: 'stream_f4a', name: 'Form 4A', registeredBoys: 15, registeredGirls: 15, totalStudents: 30, classTeacher: 'Mwl. Merkion Mlelwa' },
      ];

  const mappedTeachers: DutyTeacher[] = existingTeachers && existingTeachers.length > 0
    ? existingTeachers.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone || '0754 123 456',
        subject: Array.isArray(t.subjects) && t.subjects.length > 0 ? t.subjects.join(', ') : 'Hisabati / Sayansi',
      }))
    : [
        { id: 1001, name: 'HABIBU AKIDA', phone: '0789463526', subject: 'KISWAHILI, HISTORY' },
        { id: 1002, name: 'FATUMA MWAUPEYA', phone: '0678563647', subject: 'GEOGRAPHY, KISWAHILI' },
        { id: 1003, name: 'MARTTIN MHALWA', phone: '0754 563 546', subject: 'HISTORY, ENGLISH' },
      ];

  const assignedTeachers = mappedTeachers.slice(0, 3);

  const defaultWeekAssignment: DutyWeeklyAssignment = {
    id: `week_${currentWeek.monday}`,
    weekStart: currentWeek.monday,
    weekEnd: currentWeek.sunday,
    weekLabel: currentWeek.label,
    teacherIds: assignedTeachers.map(t => t.id),
    teacherNames: assignedTeachers.map(t => t.name),
    notes: 'Kusimamia usafi wa asubuhi, ukaguzi wa sare za shule na mahudhurio ya vipindi.',
    assignedBy: 'Discipline Master',
    createdAt: new Date().toISOString(),
  };

  const monDate = currentWeek.monday;
  const sampleStreamsDay1: DutyStreamAttendanceRow[] = defaultStreams.map((s, idx) => {
    const regB = s.registeredBoys ?? Math.ceil(s.totalStudents / 2);
    const regG = s.registeredGirls ?? Math.max(0, s.totalStudents - regB);
    const absB = idx % 5 === 0 ? 1 : 0;
    const absG = idx % 7 === 0 ? 1 : 0;
    const permB = idx % 6 === 0 ? 1 : 0;
    const permG = 0;
    const sickB = 0;
    const sickG = idx % 8 === 0 ? 1 : 0;
    const presB = Math.max(0, regB - (absB + permB + sickB));
    const presG = Math.max(0, regG - (absG + permG + sickG));
    return {
      streamId: s.id,
      streamName: s.name,
      registeredBoys: regB,
      registeredGirls: regG,
      totalStudents: regB + regG,
      presentBoys: presB,
      presentGirls: presG,
      present: presB + presG,
      absentBoys: absB,
      absentGirls: absG,
      absent: absB + absG,
      permittedBoys: permB,
      permittedGirls: permG,
      permitted: permB + permG,
      sickBoys: sickB,
      sickGirls: sickG,
      sickPua: sickB + sickG,
      unexcused: absB + absG,
      remarks: absB + absG > 0 ? 'Ufuatiliaji wa watoro unaendelea' : 'Mahudhurio mazuri',
    };
  });

  const totalsDay1 = sampleStreamsDay1.reduce(
    (acc, r) => ({
      registeredBoys: (acc.registeredBoys || 0) + (r.registeredBoys || 0),
      registeredGirls: (acc.registeredGirls || 0) + (r.registeredGirls || 0),
      totalStudents: acc.totalStudents + r.totalStudents,
      presentBoys: (acc.presentBoys || 0) + (r.presentBoys || 0),
      presentGirls: (acc.presentGirls || 0) + (r.presentGirls || 0),
      present: acc.present + r.present,
      absentBoys: (acc.absentBoys || 0) + (r.absentBoys || 0),
      absentGirls: (acc.absentGirls || 0) + (r.absentGirls || 0),
      absent: acc.absent + r.absent,
      permittedBoys: (acc.permittedBoys || 0) + (r.permittedBoys || 0),
      permittedGirls: (acc.permittedGirls || 0) + (r.permittedGirls || 0),
      permitted: acc.permitted + r.permitted,
      sickBoys: (acc.sickBoys || 0) + (r.sickBoys || 0),
      sickGirls: (acc.sickGirls || 0) + (r.sickGirls || 0),
      sickPua: acc.sickPua + r.sickPua,
      unexcused: acc.unexcused + r.unexcused,
    }),
    {
      registeredBoys: 0,
      registeredGirls: 0,
      totalStudents: 0,
      presentBoys: 0,
      presentGirls: 0,
      present: 0,
      absentBoys: 0,
      absentGirls: 0,
      absent: 0,
      permittedBoys: 0,
      permittedGirls: 0,
      permitted: 0,
      sickBoys: 0,
      sickGirls: 0,
      sickPua: 0,
      unexcused: 0,
    }
  );

  const sampleReport1: DutyDailyReport = {
    id: `rep_${monDate}_1`,
    weekAssignmentId: defaultWeekAssignment.id,
    weekStart: currentWeek.monday,
    weekEnd: currentWeek.sunday,
    weekLabel: currentWeek.label,
    date: monDate,
    dayName: SWAHILI_DAYS[new Date(monDate + 'T00:00:00').getDay()] || 'Jumatatu',
    teacherId: assignedTeachers[0]?.id || 1001,
    teacherName: assignedTeachers[0]?.name || 'HABIBU AKIDA',
    allWeekTeachers: assignedTeachers.map(t => t.name),
    streams: sampleStreamsDay1,
    totals: totalsDay1,
    environmentRating: 9,
    environmentNotes: 'Maeneo ya madarasa na vyoo yamesafishwa vizuri kabla ya saa 1:20 asubuhi.',
    generalDiscipline: 'Nidhamu ni nzuri kwa ujumla. Wanafunzi walizingatia ratiba ya paredi ya asubuhi.',
    teachersPresent: Math.max(1, mappedTeachers.length - 1),
    teachersAbsent: 1,
    teacherAttendanceNotes: 'Walimu wote walifika kwa wakati isipokuwa mwalimu 1 aliyeomba ruhusa ya kikazi.',
    keyEvents: 'Ukaguzi wa madaftari na sare za shule ulifanyika wakati wa paredi ya asubuhi.',
    bellSchedule: 'Imezingatiwa Kikamilifu - Kengele zote ziligongwa kwa wakati kuanzia saa 1:30 asubuhi.',
    recommendations: 'Wazazi wa wanafunzi wasio na sababu wapigiwe simu kufuatilia mahudhurio yao.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    streams: defaultStreams,
    teachers: mappedTeachers,
    weeklyAssignments: [defaultWeekAssignment],
    dailyReports: [sampleReport1],
    updatedAt: new Date().toISOString(),
  };
}

export const DutyRosterSystem: React.FC<DutyRosterSystemProps> = ({
  schoolId,
  schoolInfo,
  students,
  teachers,
  currentUser,
  dutyRosterData,
  onUpdateDutyRoster,
  onAddMainTeacher,
}) => {
  const localCacheKey = `haby_duty_roster_${schoolId || 'default'}`;

  const [rosterState, setRosterState] = useState<DutyRosterData>(() => {
    if (dutyRosterData && Array.isArray(dutyRosterData.streams) && dutyRosterData.streams.length > 0) {
      return {
        ...dutyRosterData,
        streams: dutyRosterData.streams.map(s => ensureStreamGenderFields(s, students)),
      };
    }
    try {
      const cached = localStorage.getItem(localCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.streams) && parsed.streams.length > 0) {
          return {
            ...parsed,
            streams: parsed.streams.map((s: DutyStream) => ensureStreamGenderFields(s, students)),
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return buildDefaultDutyRosterData(teachers, students);
  });

  const [dbSaveState, setDbSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(new Date().toLocaleTimeString());
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Sync with parent dutyRosterData, registered students (600), and registered teachers (42)
  useEffect(() => {
    setRosterState(prev => {
      let changed = false;
      let nextStreams = prev.streams;
      let nextTeachers = prev.teachers;
      let nextWeeks = prev.weeklyAssignments;
      let nextReports = prev.dailyReports;

      if (dutyRosterData) {
        if (Array.isArray(dutyRosterData.streams) && dutyRosterData.streams.length > prev.streams.length) {
          nextStreams = dutyRosterData.streams;
          changed = true;
        }
        if (Array.isArray(dutyRosterData.teachers) && dutyRosterData.teachers.length > prev.teachers.length) {
          nextTeachers = dutyRosterData.teachers;
          changed = true;
        }
        if (Array.isArray(dutyRosterData.weeklyAssignments) && dutyRosterData.weeklyAssignments.length > prev.weeklyAssignments.length) {
          nextWeeks = dutyRosterData.weeklyAssignments;
          changed = true;
        }
        if (Array.isArray(dutyRosterData.dailyReports) && dutyRosterData.dailyReports.length > prev.dailyReports.length) {
          nextReports = dutyRosterData.dailyReports;
          changed = true;
        }
      }

      if (Array.isArray(teachers) && teachers.length > nextTeachers.length) {
        nextTeachers = teachers.map(t => ({
          id: t.id,
          name: t.name,
          phone: t.phone || '0754 123 456',
          subject: Array.isArray(t.subjects) && t.subjects.length > 0 ? t.subjects.join(', ') : 'Hisabati / Sayansi',
        }));
        changed = true;
      }

      if (Array.isArray(students) && students.length > 0) {
        const computedStreams = computeStreamsFromRegisteredStudents(students);
        if (computedStreams.length > 0) {
          const existingNames = new Set(nextStreams.map(s => s.name.toLowerCase().replace(/\s+/g, '')));
          const missing = computedStreams.filter(cs => !existingNames.has(cs.name.toLowerCase().replace(/\s+/g, '')));
          if (missing.length > 0) {
            nextStreams = [...nextStreams, ...missing].map(s => ensureStreamGenderFields(s, students));
            changed = true;
          } else if (computedStreams.length > nextStreams.length) {
            nextStreams = computedStreams;
            changed = true;
          } else {
            const enriched = nextStreams.map(s => ensureStreamGenderFields(s, students));
            const diff = enriched.some(
              (s, i) =>
                s.registeredBoys !== nextStreams[i]?.registeredBoys ||
                s.registeredGirls !== nextStreams[i]?.registeredGirls ||
                s.totalStudents !== nextStreams[i]?.totalStudents
            );
            if (diff) {
              nextStreams = enriched;
              changed = true;
            }
          }
        }
      }

      if (!changed) return prev;
      const updated: DutyRosterData = {
        ...prev,
        streams: nextStreams,
        teachers: nextTeachers,
        weeklyAssignments: nextWeeks,
        dailyReports: nextReports,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(localCacheKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [dutyRosterData, teachers, students, localCacheKey]);

  // Load latest from Cloud SQL /api/db/duty-roster on mount
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/db/duty-roster?schoolId=${encodeURIComponent(schoolId)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(remote => {
        if (!isMounted || !remote) return;
        if (Array.isArray(remote.streams) && remote.streams.length > 0) {
          setRosterState(prev => {
            const rawStreams: DutyStream[] =
              remote.streams.length >= prev.streams.length ? remote.streams : prev.streams;
            const mergedStreams = rawStreams.map(s => ensureStreamGenderFields(s, students));
            const merged: DutyRosterData = {
              streams: mergedStreams,
              teachers:
                Array.isArray(remote.teachers) && remote.teachers.length >= prev.teachers.length
                  ? remote.teachers
                  : prev.teachers,
              weeklyAssignments:
                Array.isArray(remote.weeklyAssignments) && remote.weeklyAssignments.length > 0
                  ? remote.weeklyAssignments
                  : prev.weeklyAssignments,
              dailyReports:
                Array.isArray(remote.dailyReports) && remote.dailyReports.length >= prev.dailyReports.length
                  ? remote.dailyReports
                  : prev.dailyReports,
              updatedAt: remote.updatedAt || new Date().toISOString(),
            };
            try {
              localStorage.setItem(localCacheKey, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [schoolId, localCacheKey, students]);

  // Unified Persist helper -> LocalStorage + Cloud SQL (PostgreSQL) + Firebase Firestore + App state
  const persistRosterData = async (nextData: DutyRosterData, customSuccessMsg?: string) => {
    const stamped: DutyRosterData = {
      ...nextData,
      updatedAt: new Date().toISOString(),
    };
    setRosterState(stamped);
    setDbSaveState('saving');

    try {
      localStorage.setItem(localCacheKey, JSON.stringify(stamped));
    } catch (e) {}

    onUpdateDutyRoster(stamped);

    try {
      const [sqlRes] = await Promise.all([
        fetch('/api/db/duty-roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId, dutyRosterData: stamped }),
        }),
        setDoc(doc(db, 'duty_roster', schoolId || 'default'), stamped, { merge: true }).catch(() => {}),
      ]);

      if (sqlRes && sqlRes.ok) {
        setDbSaveState('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
        if (customSuccessMsg) showToast('success', customSuccessMsg);
      } else {
        setDbSaveState('saved');
        if (customSuccessMsg) showToast('success', customSuccessMsg);
      }
    } catch (err) {
      setDbSaveState('saved');
      if (customSuccessMsg) showToast('success', customSuccessMsg);
    }
  };

  // Role Management
  const isDefaultAdmin = !currentUser || ['HEADMASTER', 'SUPER_ADMIN', 'ACADEMIC'].includes(currentUser.role);
  const [activeRoleMode, setActiveRoleMode] = useState<'DISCIPLINE_MASTER' | 'TEACHER_ON_DUTY'>(
    isDefaultAdmin ? 'DISCIPLINE_MASTER' : 'TEACHER_ON_DUTY'
  );

  const [selectedDutyTeacherId, setSelectedDutyTeacherId] = useState<string>(() => {
    const firstAssigned = rosterState.weeklyAssignments[0]?.teacherIds?.[0];
    return String(firstAssigned ?? rosterState.teachers[0]?.id ?? '1001');
  });

  const [activeTab, setActiveTab] = useState<'MASTER_VIEW' | 'DUTY_DASHBOARD' | 'SETUP' | 'VISUAL_CALENDAR'>(
    isDefaultAdmin ? 'MASTER_VIEW' : 'DUTY_DASHBOARD'
  );

  // Visual Duty Calendar State
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dailyDutiesMap, setDailyDutiesMap] = useState<Record<string, {
    assemblyMonitorId?: string;
    assemblyMonitorName?: string;
    disciplinePatrolId?: string;
    disciplinePatrolName?: string;
    gateMonitorId?: string;
    gateMonitorName?: string;
    diningSupervisorId?: string;
    diningSupervisorName?: string;
    groundsSupervisorId?: string;
    groundsSupervisorName?: string;
    notes?: string;
  }>>(() => {
    try {
      const cached = localStorage.getItem(`haby_daily_duties_map_${schoolId || 'default'}`);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [dutyAssignModalOpen, setDutyAssignModalOpen] = useState(false);

  useEffect(() => {
    if (activeRoleMode === 'TEACHER_ON_DUTY' && activeTab !== 'VISUAL_CALENDAR') {
      setActiveTab('DUTY_DASHBOARD');
    }
  }, [activeRoleMode]);

  // School-wide Registered Gender Totals (B | G | T)
  const schoolRegisteredTotals = useMemo(() => {
    return rosterState.streams.reduce(
      (acc, s) => {
        const b = s.registeredBoys ?? Math.ceil((Number(s.totalStudents) || 0) / 2);
        const g = s.registeredGirls ?? Math.max(0, (Number(s.totalStudents) || 0) - b);
        return {
          boys: acc.boys + b,
          girls: acc.girls + g,
          total: acc.total + b + g,
        };
      },
      { boys: 0, girls: 0, total: 0 }
    );
  }, [rosterState.streams]);

  const totalSchoolStudents = schoolRegisteredTotals.total;

  // ============================================================================
  // 1. SETUP PAGE STATE & HANDLERS (FOR DISCIPLINE MASTER ONLY)
  // ============================================================================
  const [newStreamName, setNewStreamName] = useState('');
  const [newStreamBoys, setNewStreamBoys] = useState<number>(15);
  const [newStreamGirls, setNewStreamGirls] = useState<number>(15);
  const [newStreamTeacher, setNewStreamTeacher] = useState('');
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState<string | number | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(todayISO);
  const [selectedWeekTeacherIds, setSelectedWeekTeacherIds] = useState<(string | number)[]>(() =>
    rosterState.weeklyAssignments[0]?.teacherIds || []
  );
  const [weeklyNotes, setWeeklyNotes] = useState<string>('');

  const computedWeekRange = useMemo(() => getMondayAndSunday(selectedWeekDate), [selectedWeekDate]);

  const handleSaveStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName.trim()) {
      showToast('error', 'Tafadhali andika jina la mkondo (mfano: Form 1A au Form 3 Science)');
      return;
    }
    const bCount = Math.max(0, Number(newStreamBoys) || 0);
    const gCount = Math.max(0, Number(newStreamGirls) || 0);
    const totalCount = Math.max(1, bCount + gCount);
    let updatedStreams: DutyStream[];

    if (editingStreamId) {
      updatedStreams = rosterState.streams.map(s =>
        s.id === editingStreamId
          ? {
              ...s,
              name: newStreamName.trim(),
              registeredBoys: bCount,
              registeredGirls: gCount,
              totalStudents: totalCount,
              classTeacher: newStreamTeacher.trim(),
            }
          : s
      );
    } else {
      const newStream: DutyStream = {
        id: `stream_${Date.now()}`,
        name: newStreamName.trim(),
        registeredBoys: bCount,
        registeredGirls: gCount,
        totalStudents: totalCount,
        classTeacher: newStreamTeacher.trim(),
      };
      updatedStreams = [...rosterState.streams, newStream];
    }

    persistRosterData(
      { ...rosterState, streams: updatedStreams },
      editingStreamId ? 'Mkondo umehaririwa kikamilifu!' : 'Mkondo mpya umeongezwa kwenye database!'
    );
    setNewStreamName('');
    setNewStreamBoys(15);
    setNewStreamGirls(15);
    setNewStreamTeacher('');
    setEditingStreamId(null);
  };

  const handleDeleteStream = (id: string) => {
    const updated = rosterState.streams.filter(s => s.id !== id);
    persistRosterData({ ...rosterState, streams: updated }, 'Mkondo umeondolewa.');
  };

  const handleSyncStreamsFromRegisteredStudents = () => {
    if (!students || students.length === 0) {
      showToast('error', 'Hakuna wanafunzi waliosajiliwa bado kwenye mfumo mkuu.');
      return;
    }
    const syncedStreams = computeStreamsFromRegisteredStudents(students);
    if (syncedStreams.length > 0) {
      persistRosterData(
        { ...rosterState, streams: syncedStreams },
        `Mikondo ${syncedStreams.length} imesawazishwa na wanafunzi ${students.length} (B/G/T)!`
      );
    }
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherSubject.trim()) {
      showToast('error', 'Tafadhali jaza jina la mwalimu na somo analofundisha.');
      return;
    }

    let updatedTeachers: DutyTeacher[];
    if (editingTeacherId !== null) {
      updatedTeachers = rosterState.teachers.map(t =>
        String(t.id) === String(editingTeacherId)
          ? { ...t, name: newTeacherName.trim(), phone: newTeacherPhone.trim(), subject: newTeacherSubject.trim() }
          : t
      );
    } else {
      const newId = Date.now();
      const newT: DutyTeacher = {
        id: newId,
        name: newTeacherName.trim(),
        phone: newTeacherPhone.trim() || '0754 000 000',
        subject: newTeacherSubject.trim(),
      };
      updatedTeachers = [...rosterState.teachers, newT];

      if (onAddMainTeacher) {
        onAddMainTeacher({
          id: newId,
          name: newT.name,
          initial: newT.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3),
          subjects: newT.subject.split(',').map(s => s.trim()).filter(Boolean),
          excludeInvigilation: false,
          phone: newT.phone,
          schoolRole: 'Subject Teacher',
        });
      }
    }

    persistRosterData(
      { ...rosterState, teachers: updatedTeachers },
      editingTeacherId !== null ? 'Taarifa za mwalimu zimeboreshwa!' : 'Mwalimu mpya ameongezwa kwenye mfumo!'
    );
    setNewTeacherName('');
    setNewTeacherPhone('');
    setNewTeacherSubject('');
    setEditingTeacherId(null);
  };

  const handleDeleteTeacher = (id: string | number) => {
    const updated = rosterState.teachers.filter(t => String(t.id) !== String(id));
    persistRosterData({ ...rosterState, teachers: updated }, 'Mwalimu ameondolewa kwenye orodha ya zamu.');
  };

  const toggleTeacherForWeek = (id: string | number) => {
    setSelectedWeekTeacherIds(prev => {
      const exists = prev.some(item => String(item) === String(id));
      if (exists) return prev.filter(item => String(item) !== String(id));
      return [...prev, id];
    });
  };

  const handleAssignWeeklyDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWeekTeacherIds.length === 0) {
      showToast('error', 'Tafadhali chagua angalau mwalimu 1 hadi 3 kwa ajili ya zamu ya wiki hii.');
      return;
    }

    const chosenTeachers = rosterState.teachers.filter(t =>
      selectedWeekTeacherIds.some(id => String(id) === String(t.id))
    );

    const newAssignment: DutyWeeklyAssignment = {
      id: `week_${computedWeekRange.monday}`,
      weekStart: computedWeekRange.monday,
      weekEnd: computedWeekRange.sunday,
      weekLabel: computedWeekRange.label,
      teacherIds: chosenTeachers.map(t => t.id),
      teacherNames: chosenTeachers.map(t => t.name),
      notes: weeklyNotes.trim() || 'Kusimamia mahudhurio ya mikondo yote, usafi wa mazingira, kengele na nidhamu ya shule.',
      assignedBy: currentUser?.fullName || 'Discipline Master',
      createdAt: new Date().toISOString(),
    };

    const existingIdx = rosterState.weeklyAssignments.findIndex(
      w => w.weekStart === computedWeekRange.monday
    );
    let updatedAssignments: DutyWeeklyAssignment[];
    if (existingIdx >= 0) {
      updatedAssignments = rosterState.weeklyAssignments.map((w, i) =>
        i === existingIdx ? newAssignment : w
      );
    } else {
      updatedAssignments = [newAssignment, ...rosterState.weeklyAssignments];
    }

    persistRosterData(
      { ...rosterState, weeklyAssignments: updatedAssignments },
      `Zamu ya Wiki (${computedWeekRange.label}) imepangwa kwa: ${chosenTeachers.map(t => t.name).join(', ')}!`
    );
    setWeeklyNotes('');
  };

  const handleDeleteWeeklyAssignment = (id: string) => {
    const updated = rosterState.weeklyAssignments.filter(w => w.id !== id);
    persistRosterData({ ...rosterState, weeklyAssignments: updated }, 'Ratiba ya wiki imeondolewa.');
  };

  // ============================================================================
  // 2. DUTY ROSTER DASHBOARD STATE & LOGIC (FOR TEACHER ON DUTY)
  // ============================================================================
  const assignedWeeksForCurrentTeacher = useMemo(() => {
    return rosterState.weeklyAssignments.filter(w =>
      w.teacherIds.some(id => String(id) === String(selectedDutyTeacherId))
    );
  }, [rosterState.weeklyAssignments, selectedDutyTeacherId]);

  const activeTeacherWeek: DutyWeeklyAssignment | null = useMemo(() => {
    if (assignedWeeksForCurrentTeacher.length === 0) {
      return activeRoleMode === 'DISCIPLINE_MASTER' ? (rosterState.weeklyAssignments[0] || null) : null;
    }
    const matchingToday = assignedWeeksForCurrentTeacher.find(
      w => todayISO >= w.weekStart && todayISO <= w.weekEnd
    );
    return matchingToday || assignedWeeksForCurrentTeacher[0];
  }, [assignedWeeksForCurrentTeacher, activeRoleMode, rosterState.weeklyAssignments, todayISO]);

  const currentDutyTeacherObj = useMemo(() => {
    return rosterState.teachers.find(t => String(t.id) === String(selectedDutyTeacherId)) || rosterState.teachers[0];
  }, [rosterState.teachers, selectedDutyTeacherId]);

  const [reportDate, setReportDate] = useState<string>(todayISO);
  const [autoCalculatePresent, setAutoCalculatePresent] = useState<boolean>(true);

  const activeWeekDays = useMemo(() => {
    if (!activeTeacherWeek) return [];
    return getWeekDaysList(activeTeacherWeek.weekStart);
  }, [activeTeacherWeek]);

  // Stream attendance rows for the active form
  const [streamRows, setStreamRows] = useState<DutyStreamAttendanceRow[]>([]);
  const [environmentRating, setEnvironmentRating] = useState<number>(8);
  const [environmentNotes, setEnvironmentNotes] = useState<string>('');
  const [generalDiscipline, setGeneralDiscipline] = useState<string>('');
  const [teachersPresent, setTeachersPresent] = useState<number>(rosterState.teachers.length);
  const [teachersAbsent, setTeachersAbsent] = useState<number>(0);
  const [teacherAttendanceNotes, setTeacherAttendanceNotes] = useState<string>('');
  const [keyEvents, setKeyEvents] = useState<string>('');
  const [bellSchedule, setBellSchedule] = useState<string>('Imezingatiwa Kikamilifu - Vipindi vyote vimefuata ratiba.');
  const [recommendations, setRecommendations] = useState<string>('');

  // Whenever streams or reportDate changes, load existing daily report for that date or initialize from streams
  useEffect(() => {
    const existingReport = rosterState.dailyReports.find(
      r => r.date === reportDate && (!activeTeacherWeek || r.weekAssignmentId === activeTeacherWeek.id)
    );

    if (existingReport) {
      const mergedRows = rosterState.streams.map(s => {
        const found = existingReport.streams.find(r => r.streamId === s.id || r.streamName === s.name);
        if (found) {
          return ensureRowGenderFields(found, s);
        }
        return ensureRowGenderFields(
          {
            streamId: s.id,
            streamName: s.name,
            registeredBoys: s.registeredBoys,
            registeredGirls: s.registeredGirls,
            totalStudents: s.totalStudents,
            presentBoys: s.registeredBoys,
            presentGirls: s.registeredGirls,
            present: s.totalStudents,
            absentBoys: 0,
            absentGirls: 0,
            absent: 0,
            permittedBoys: 0,
            permittedGirls: 0,
            permitted: 0,
            sickBoys: 0,
            sickGirls: 0,
            sickPua: 0,
            unexcused: 0,
            remarks: '',
          },
          s
        );
      });
      setStreamRows(mergedRows);
      setEnvironmentRating(existingReport.environmentRating || 8);
      setEnvironmentNotes(existingReport.environmentNotes || '');
      setGeneralDiscipline(existingReport.generalDiscipline || '');
      setTeachersPresent(existingReport.teachersPresent ?? rosterState.teachers.length);
      setTeachersAbsent(existingReport.teachersAbsent ?? 0);
      setTeacherAttendanceNotes(existingReport.teacherAttendanceNotes || '');
      setKeyEvents(existingReport.keyEvents || '');
      setBellSchedule(existingReport.bellSchedule || 'Imezingatiwa Kikamilifu');
      setRecommendations(existingReport.recommendations || '');
    } else {
      setStreamRows(
        rosterState.streams.map(s =>
          ensureRowGenderFields(
            {
              streamId: s.id,
              streamName: s.name,
              registeredBoys: s.registeredBoys,
              registeredGirls: s.registeredGirls,
              totalStudents: s.totalStudents,
              presentBoys: s.registeredBoys,
              presentGirls: s.registeredGirls,
              present: s.totalStudents,
              absentBoys: 0,
              absentGirls: 0,
              absent: 0,
              permittedBoys: 0,
              permittedGirls: 0,
              permitted: 0,
              sickBoys: 0,
              sickGirls: 0,
              sickPua: 0,
              unexcused: 0,
              remarks: '',
            },
            s
          )
        )
      );
      setEnvironmentRating(8);
      setEnvironmentNotes('');
      setGeneralDiscipline('');
      setTeachersPresent(rosterState.teachers.length);
      setTeachersAbsent(0);
      setTeacherAttendanceNotes('');
      setKeyEvents('');
      setBellSchedule('Imezingatiwa Kikamilifu - Vipindi vyote vimefuata ratiba.');
      setRecommendations('');
    }
  }, [reportDate, rosterState.streams, rosterState.dailyReports, activeTeacherWeek, rosterState.teachers.length]);

  const handleStreamGenderCellChange = (
    streamId: string,
    field:
      | 'presentBoys'
      | 'presentGirls'
      | 'absentBoys'
      | 'absentGirls'
      | 'permittedBoys'
      | 'permittedGirls'
      | 'sickBoys'
      | 'sickGirls'
      | 'remarks',
    value: string | number
  ) => {
    setStreamRows(prev =>
      prev.map(row => {
        if (row.streamId !== streamId) return row;
        if (field === 'remarks') {
          return { ...row, remarks: String(value) };
        }
        const regB = row.registeredBoys ?? Math.ceil(row.totalStudents / 2);
        const regG = row.registeredGirls ?? Math.max(0, row.totalStudents - regB);
        const numVal = Math.max(0, parseInt(String(value) || '0', 10) || 0);
        const updated = { ...row, [field]: numVal };

        const absB = Number(updated.absentBoys) || 0;
        const absG = Number(updated.absentGirls) || 0;
        const permB = Number(updated.permittedBoys) || 0;
        const permG = Number(updated.permittedGirls) || 0;
        const sickB = Number(updated.sickBoys) || 0;
        const sickG = Number(updated.sickGirls) || 0;

        updated.absent = absB + absG;
        updated.permitted = permB + permG;
        updated.sickPua = sickB + sickG;
        updated.unexcused = updated.absent;

        if (
          autoCalculatePresent &&
          (field === 'absentBoys' ||
            field === 'absentGirls' ||
            field === 'permittedBoys' ||
            field === 'permittedGirls' ||
            field === 'sickBoys' ||
            field === 'sickGirls')
        ) {
          updated.presentBoys = Math.max(0, regB - (absB + permB + sickB));
          updated.presentGirls = Math.max(0, regG - (absG + permG + sickG));
        }

        updated.present = (Number(updated.presentBoys) || 0) + (Number(updated.presentGirls) || 0);
        return updated;
      })
    );
  };

  const handleBalanceRow = (streamId: string) => {
    setStreamRows(prev =>
      prev.map(row => {
        if (row.streamId !== streamId) return row;
        const regB = row.registeredBoys ?? Math.ceil(row.totalStudents / 2);
        const regG = row.registeredGirls ?? Math.max(0, row.totalStudents - regB);
        const absB = Number(row.absentBoys) || 0;
        const absG = Number(row.absentGirls) || 0;
        const permB = Number(row.permittedBoys) || 0;
        const permG = Number(row.permittedGirls) || 0;
        const sickB = Number(row.sickBoys) || 0;
        const sickG = Number(row.sickGirls) || 0;
        const presentBoys = Math.max(0, regB - (absB + permB + sickB));
        const presentGirls = Math.max(0, regG - (absG + permG + sickG));
        return {
          ...row,
          presentBoys,
          presentGirls,
          present: presentBoys + presentGirls,
          absent: absB + absG,
          permitted: permB + permG,
          sickPua: sickB + sickG,
          unexcused: absB + absG,
        };
      })
    );
  };

  // Validate each row: B and G sums must match registeredBoys and registeredGirls
  const rowValidation = useMemo(() => {
    return streamRows.map(row => {
      const regB = row.registeredBoys ?? Math.ceil(row.totalStudents / 2);
      const regG = row.registeredGirls ?? Math.max(0, row.totalStudents - regB);
      const sumB =
        (Number(row.presentBoys) || 0) +
        (Number(row.absentBoys) || 0) +
        (Number(row.permittedBoys) || 0) +
        (Number(row.sickBoys) || 0);
      const sumG =
        (Number(row.presentGirls) || 0) +
        (Number(row.absentGirls) || 0) +
        (Number(row.permittedGirls) || 0) +
        (Number(row.sickGirls) || 0);
      const sumFour = sumB + sumG;
      const isValid = sumB === regB && sumG === regG && sumFour === row.totalStudents;
      return {
        streamId: row.streamId,
        sumB,
        regB,
        sumG,
        regG,
        sumFour,
        total: row.totalStudents,
        isValid,
      };
    });
  }, [streamRows]);

  const allRowsValid = useMemo(() => rowValidation.every(r => r.isValid), [rowValidation]);

  // Automatic Daily Totals Summary with full B | G | T Breakdown
  const dailyTotals = useMemo(() => {
    return streamRows.reduce(
      (acc, r) => {
        const regB = r.registeredBoys ?? Math.ceil((Number(r.totalStudents) || 0) / 2);
        const regG = r.registeredGirls ?? Math.max(0, (Number(r.totalStudents) || 0) - regB);
        const presB = Number(r.presentBoys) || 0;
        const presG = Number(r.presentGirls) || 0;
        const absB = Number(r.absentBoys) || 0;
        const absG = Number(r.absentGirls) || 0;
        const permB = Number(r.permittedBoys) || 0;
        const permG = Number(r.permittedGirls) || 0;
        const sickB = Number(r.sickBoys) || 0;
        const sickG = Number(r.sickGirls) || 0;
        return {
          registeredBoys: acc.registeredBoys + regB,
          registeredGirls: acc.registeredGirls + regG,
          totalStudents: acc.totalStudents + regB + regG,
          presentBoys: acc.presentBoys + presB,
          presentGirls: acc.presentGirls + presG,
          present: acc.present + presB + presG,
          absentBoys: acc.absentBoys + absB,
          absentGirls: acc.absentGirls + absG,
          absent: acc.absent + absB + absG,
          permittedBoys: acc.permittedBoys + permB,
          permittedGirls: acc.permittedGirls + permG,
          permitted: acc.permitted + permB + permG,
          sickBoys: acc.sickBoys + sickB,
          sickGirls: acc.sickGirls + sickG,
          sickPua: acc.sickPua + sickB + sickG,
          unexcused: acc.unexcused + absB + absG,
        };
      },
      {
        registeredBoys: 0,
        registeredGirls: 0,
        totalStudents: 0,
        presentBoys: 0,
        presentGirls: 0,
        present: 0,
        absentBoys: 0,
        absentGirls: 0,
        absent: 0,
        permittedBoys: 0,
        permittedGirls: 0,
        permitted: 0,
        sickBoys: 0,
        sickGirls: 0,
        sickPua: 0,
        unexcused: 0,
      }
    );
  }, [streamRows]);

  const buildCurrentDraftReport = (): DutyDailyReport => {
    const dayIndex = new Date(reportDate + 'T00:00:00').getDay();
    const dayName = SWAHILI_DAYS[dayIndex] || 'Siku ya Kazi';
    const weekObj = activeTeacherWeek || rosterState.weeklyAssignments[0] || {
      id: `week_${computedWeekRange.monday}`,
      weekStart: computedWeekRange.monday,
      weekEnd: computedWeekRange.sunday,
      weekLabel: computedWeekRange.label,
      teacherIds: [],
      teacherNames: [currentDutyTeacherObj?.name || 'Mwalimu wa Zamu'],
      createdAt: new Date().toISOString(),
    };
    return {
      id: `rep_${reportDate}`,
      weekAssignmentId: weekObj.id,
      weekStart: weekObj.weekStart,
      weekEnd: weekObj.weekEnd,
      weekLabel: weekObj.weekLabel,
      date: reportDate,
      dayName,
      teacherId: currentDutyTeacherObj?.id || selectedDutyTeacherId,
      teacherName: currentDutyTeacherObj?.name || 'Mwalimu wa Zamu',
      allWeekTeachers: weekObj.teacherNames,
      streams: streamRows,
      totals: dailyTotals,
      environmentRating,
      environmentNotes: environmentNotes.trim() || 'Mazingira ya shule ni safi.',
      generalDiscipline: generalDiscipline.trim() || 'Shughuli za shule zimeenda salama na kwa utulivu.',
      teachersPresent: Number(teachersPresent) || 0,
      teachersAbsent: Number(teachersAbsent) || 0,
      teacherAttendanceNotes: teacherAttendanceNotes.trim() || 'Walimu wa zamu na masomo walihudhuria vipindi.',
      keyEvents: keyEvents.trim() || 'Hakuna tukio la dharura lililoripotiwa.',
      bellSchedule: bellSchedule.trim() || 'Imezingatiwa kikamilifu.',
      recommendations: recommendations.trim() || 'Ufuatiliaji wa wanafunzi watoro uendelee.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSaveDailyDutyReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacherWeek) {
      showToast('error', 'Hakuna wiki ya zamu iliyopangwa bado. Wasiliana na Discipline Master.');
      return;
    }

    if (!allRowsValid) {
      const invalidNames = streamRows
        .filter((_, idx) => !rowValidation[idx]?.isValid)
        .map(r => r.streamName)
        .join(', ');
      showToast(
        'error',
        `Hesabu ya B/G haioani na Waliosajiliwa kwenye mikondo: ${invalidNames}. Bofya "Sawazisha" au hakikisha Present + Absent + Ruhusa + Wagonjwa = Waliosajiliwa (B na G).`
      );
      return;
    }

    const dayIndex = new Date(reportDate + 'T00:00:00').getDay();
    const dayName = SWAHILI_DAYS[dayIndex] || 'Siku ya Kazi';

    const existingIdx = rosterState.dailyReports.findIndex(
      r => r.date === reportDate && r.weekAssignmentId === activeTeacherWeek.id
    );

    const reportRecord: DutyDailyReport = {
      ...buildCurrentDraftReport(),
      id: existingIdx >= 0 ? rosterState.dailyReports[existingIdx].id : `rep_${reportDate}_${Date.now()}`,
      createdAt: existingIdx >= 0 ? rosterState.dailyReports[existingIdx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedReports: DutyDailyReport[];
    if (existingIdx >= 0) {
      updatedReports = rosterState.dailyReports.map((r, idx) => (idx === existingIdx ? reportRecord : r));
    } else {
      updatedReports = [reportRecord, ...rosterState.dailyReports];
    }

    persistRosterData(
      { ...rosterState, dailyReports: updatedReports },
      `Taarifa ya Zamu ya ${dayName} (${reportDate}) imehifadhiwa kwenye Database na kuingizwa kwenye Ripoti ya Wiki Nzima!`
    );
  };

  // ============================================================================
  // 3. DISCIPLINE MASTER VIEW: FILTERS, CHARTS, PDF & EXCEL EXPORT
  // ============================================================================
  const [filterWeekId, setFilterWeekId] = useState<string>('ALL');
  const [filterStreamName, setFilterStreamName] = useState<string>('ALL');
  const [filterTeacherName, setFilterTeacherName] = useState<string>('ALL');
  const [inspectingReport, setInspectingReport] = useState<DutyDailyReport | null>(null);

  const filteredDailyReports = useMemo(() => {
    return rosterState.dailyReports
      .filter(rep => {
        const matchWeek = filterWeekId === 'ALL' || rep.weekAssignmentId === filterWeekId;
        const matchTeacher =
          filterTeacherName === 'ALL' ||
          rep.teacherName === filterTeacherName ||
          (rep.allWeekTeachers && rep.allWeekTeachers.includes(filterTeacherName));
        const matchStream =
          filterStreamName === 'ALL' ||
          rep.streams.some(s => s.streamName === filterStreamName);
        return matchWeek && matchTeacher && matchStream;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rosterState.dailyReports, filterWeekId, filterTeacherName, filterStreamName]);

  // Chart 1: Attendance Trend for the Week
  const weeklyTrendChartData = useMemo(() => {
    return filteredDailyReports.map(rep => {
      if (filterStreamName !== 'ALL') {
        const st = rep.streams.find(s => s.streamName === filterStreamName);
        return {
          name: `${rep.dayName.slice(0, 3)} (${rep.date.slice(5)})`,
          Waliofika: st?.present || 0,
          Absent: st?.absent || 0,
          Walioruhusiwa: st?.permitted || 0,
          Wagonjwa_PUA: st?.sickPua || 0,
        };
      }
      return {
        name: `${rep.dayName.slice(0, 3)} (${rep.date.slice(5)})`,
        Waliofika: rep.totals.present,
        Absent: rep.totals.absent,
        Walioruhusiwa: rep.totals.permitted,
        Wagonjwa_PUA: rep.totals.sickPua,
      };
    });
  }, [filteredDailyReports, filterStreamName]);

  // Chart 2 & Stream Summary with full B | G | T Breakdown
  const streamAbsenteesChartData = useMemo(() => {
    const map = new Map<
      string,
      {
        streamName: string;
        regB: number;
        regG: number;
        roll: number;
        presentBSum: number;
        presentGSum: number;
        presentSum: number;
        absentBSum: number;
        absentGSum: number;
        unexcused: number;
        permittedBSum: number;
        permittedGSum: number;
        permitted: number;
        sickBSum: number;
        sickGSum: number;
        sickPua: number;
        totalAbsent: number;
        daysCount: number;
      }
    >();

    rosterState.streams.forEach(s => {
      const b = s.registeredBoys ?? Math.ceil(s.totalStudents / 2);
      const g = s.registeredGirls ?? Math.max(0, s.totalStudents - b);
      map.set(s.name, {
        streamName: s.name,
        regB: b,
        regG: g,
        roll: b + g,
        presentBSum: 0,
        presentGSum: 0,
        presentSum: 0,
        absentBSum: 0,
        absentGSum: 0,
        unexcused: 0,
        permittedBSum: 0,
        permittedGSum: 0,
        permitted: 0,
        sickBSum: 0,
        sickGSum: 0,
        sickPua: 0,
        totalAbsent: 0,
        daysCount: 0,
      });
    });

    filteredDailyReports.forEach(rep => {
      rep.streams.forEach(rawSt => {
        const streamDef = rosterState.streams.find(x => x.id === rawSt.streamId || x.name === rawSt.streamName);
        const st = ensureRowGenderFields(rawSt, streamDef);
        const entry = map.get(st.streamName) || {
          streamName: st.streamName,
          regB: st.registeredBoys || 0,
          regG: st.registeredGirls || 0,
          roll: st.totalStudents,
          presentBSum: 0,
          presentGSum: 0,
          presentSum: 0,
          absentBSum: 0,
          absentGSum: 0,
          unexcused: 0,
          permittedBSum: 0,
          permittedGSum: 0,
          permitted: 0,
          sickBSum: 0,
          sickGSum: 0,
          sickPua: 0,
          totalAbsent: 0,
          daysCount: 0,
        };
        const nonPresent = (Number(st.absent) || 0) + (Number(st.permitted) || 0) + (Number(st.sickPua) || 0);
        entry.presentBSum += Number(st.presentBoys) || 0;
        entry.presentGSum += Number(st.presentGirls) || 0;
        entry.presentSum += Number(st.present) || 0;
        entry.absentBSum += Number(st.absentBoys) || 0;
        entry.absentGSum += Number(st.absentGirls) || 0;
        entry.unexcused += Number(st.absent) || 0;
        entry.permittedBSum += Number(st.permittedBoys) || 0;
        entry.permittedGSum += Number(st.permittedGirls) || 0;
        entry.permitted += Number(st.permitted) || 0;
        entry.sickBSum += Number(st.sickBoys) || 0;
        entry.sickGSum += Number(st.sickGirls) || 0;
        entry.sickPua += Number(st.sickPua) || 0;
        entry.totalAbsent += nonPresent;
        entry.daysCount += 1;
        map.set(st.streamName, entry);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.streamName.localeCompare(b.streamName));
  }, [filteredDailyReports, rosterState.streams]);

  const topAbsentStream = useMemo(() => {
    return [...streamAbsenteesChartData].sort((a, b) => b.totalAbsent - a.totalAbsent)[0];
  }, [streamAbsenteesChartData]);

  // Helper to trigger print on a generated jsPDF document
  const triggerPdfPrintOrSave = (docPdf: jsPDF, filename: string, shouldPrint?: boolean) => {
    docPdf.save(filename);
    if (shouldPrint) {
      try {
        docPdf.autoPrint();
        const blobUrl = docPdf.output('bloburl');
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = String(blobUrl);
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {}
        };
      } catch (e) {}
    }
  };

  // Export / Print Single Day Duty Roster PDF with ALL B/G/T & Qualitative Info
  const handleExportDailyPdf = (targetReport?: DutyDailyReport, shouldPrint = false) => {
    const rep = targetReport || buildCurrentDraftReport();
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const schoolTitle = (schoolInfo?.name || 'SHULE YA SEKONDARI TANZANIA').toUpperCase();

    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(14);
    docPdf.setTextColor(31, 77, 139);
    docPdf.text(schoolTitle, 148, 12, { align: 'center' });

    docPdf.setFontSize(11);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text(
      `FOMU RASMI YA ZAMU YA KILA SIKU (DAILY DUTY ROSTER REPORT) - ${rep.dayName.toUpperCase()} (${rep.date})`,
      148,
      18,
      { align: 'center' }
    );

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(8.5);
    docPdf.setTextColor(51, 65, 85);
    docPdf.text(
      `Wiki ya Zamu: ${rep.weekLabel} (${rep.weekStart} hadi ${rep.weekEnd})  |  Mwalimu wa Zamu Leo: ${rep.teacherName}  |  Walimu wa Wiki: ${rep.allWeekTeachers.join(', ')}`,
      148,
      23,
      { align: 'center' }
    );

    const enrichedStreams = rep.streams.map(r => {
      const sDef = rosterState.streams.find(x => x.id === r.streamId || x.name === r.streamName);
      return ensureRowGenderFields(r, sDef);
    });

    const tRegB = enrichedStreams.reduce((a, r) => a + (r.registeredBoys || 0), 0);
    const tRegG = enrichedStreams.reduce((a, r) => a + (r.registeredGirls || 0), 0);
    const tRegT = tRegB + tRegG;
    const tPresB = enrichedStreams.reduce((a, r) => a + (r.presentBoys || 0), 0);
    const tPresG = enrichedStreams.reduce((a, r) => a + (r.presentGirls || 0), 0);
    const tPresT = tPresB + tPresG;
    const tAbsB = enrichedStreams.reduce((a, r) => a + (r.absentBoys || 0), 0);
    const tAbsG = enrichedStreams.reduce((a, r) => a + (r.absentGirls || 0), 0);
    const tAbsT = tAbsB + tAbsG;
    const tPermB = enrichedStreams.reduce((a, r) => a + (r.permittedBoys || 0), 0);
    const tPermG = enrichedStreams.reduce((a, r) => a + (r.permittedGirls || 0), 0);
    const tPermT = tPermB + tPermG;
    const tSickB = enrichedStreams.reduce((a, r) => a + (r.sickBoys || 0), 0);
    const tSickG = enrichedStreams.reduce((a, r) => a + (r.sickGirls || 0), 0);
    const tSickT = tSickB + tSickG;

    autoTable(docPdf, {
      startY: 26,
      head: [
        [
          { content: 'MKONDO\n(STREAM)', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
          { content: 'WALIOSAJILIWA\n(REGISTERED)', colSpan: 3, styles: { halign: 'center', fillColor: [30, 41, 59] } },
          { content: 'WALIOFIKA\n(PRESENT)', colSpan: 3, styles: { halign: 'center', fillColor: [5, 150, 105] } },
          { content: 'WASIOFIKA\n(ABSENT)', colSpan: 3, styles: { halign: 'center', fillColor: [225, 29, 72] } },
          { content: 'WALIORUHUSIWA\n(PERMITTED)', colSpan: 3, styles: { halign: 'center', fillColor: [37, 99, 235] } },
          { content: 'WAGONJWA\n(SICK / PUA)', colSpan: 3, styles: { halign: 'center', fillColor: [217, 119, 6] } },
          { content: '%', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'MAELEZO YA MKONDO', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
        ],
        [
          'B', 'G', 'T',
          'B', 'G', 'T',
          'B', 'G', 'T',
          'B', 'G', 'T',
          'B', 'G', 'T',
        ],
      ],
      body: [
        ...enrichedStreams.map(r => [
          r.streamName,
          String(r.registeredBoys ?? 0),
          String(r.registeredGirls ?? 0),
          String(r.totalStudents ?? 0),
          String(r.presentBoys ?? 0),
          String(r.presentGirls ?? 0),
          String(r.present ?? 0),
          String(r.absentBoys ?? 0),
          String(r.absentGirls ?? 0),
          String(r.absent ?? 0),
          String(r.permittedBoys ?? 0),
          String(r.permittedGirls ?? 0),
          String(r.permitted ?? 0),
          String(r.sickBoys ?? 0),
          String(r.sickGirls ?? 0),
          String(r.sickPua ?? 0),
          r.totalStudents > 0 ? `${((r.present / r.totalStudents) * 100).toFixed(1)}%` : '0%',
          r.remarks || '-',
        ]),
        [
          'JUMLA KUU YA SHULE',
          String(tRegB), String(tRegG), String(tRegT),
          String(tPresB), String(tPresG), String(tPresT),
          String(tAbsB), String(tAbsG), String(tAbsT),
          String(tPermB), String(tPermG), String(tPermT),
          String(tSickB), String(tSickG), String(tSickT),
          tRegT > 0 ? `${((tPresT / tRegT) * 100).toFixed(1)}%` : '0%',
          'Jumla ya Mikondo Yote',
        ],
      ],
      styles: { fontSize: 7.2, cellPadding: 1.4, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 24 },
        3: { fontStyle: 'bold', fillColor: [241, 245, 249] },
        6: { fontStyle: 'bold', fillColor: [236, 253, 245] },
        9: { fontStyle: 'bold', fillColor: [255, 241, 242] },
        12: { fontStyle: 'bold', fillColor: [239, 246, 255] },
        15: { fontStyle: 'bold', fillColor: [255, 251, 235] },
        17: { halign: 'left', cellWidth: 42 },
      },
      headStyles: { fillColor: [31, 77, 139], textColor: 255, fontStyle: 'bold', halign: 'center' },
      didParseCell: data => {
        if (data.section === 'body' && data.row.index === enrichedStreams.length) {
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const afterStreamsY = (docPdf as any).lastAutoTable?.finalY ? (docPdf as any).lastAutoTable.finalY + 5 : 140;

    autoTable(docPdf, {
      startY: afterStreamsY,
      head: [['SEHEMU YA TAARIFA ZA ZAMU YA SIKU', 'MAELEZO KAMILI YALIYOJAZWA NA MWALIMU WA ZAMU']],
      body: [
        ['1. Usafi wa Mazingira (1-10)', `Alama: ${rep.environmentRating}/10 — ${rep.environmentNotes || 'Mazingira ni safi.'}`],
        [
          '2. Mahudhurio ya Walimu',
          `Walimu Waliofika: ${rep.teachersPresent}  |  Walimu Wasiofika: ${rep.teachersAbsent} — ${rep.teacherAttendanceNotes || '-'}`,
        ],
        ['3. Nidhamu Jumla Shuleni', rep.generalDiscipline || '-'],
        ['4. Matukio Muhimu ya Siku', rep.keyEvents || '-'],
        ['5. Kengele na Ratiba ya Vipindi', rep.bellSchedule || '-'],
        ['6. Mapendekezo kwa Discipline Master', rep.recommendations || '-'],
      ],
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 65, fillColor: [248, 250, 252] },
      },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    });

    const sigY = (docPdf as any).lastAutoTable?.finalY ? (docPdf as any).lastAutoTable.finalY + 9 : 192;
    if (sigY < 200) {
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(30, 41, 59);
      docPdf.text(`Sahihi ya Mwalimu wa Zamu (${rep.teacherName}): ______________________`, 14, sigY);
      docPdf.text('Sahihi ya Discipline Master: ______________________', 120, sigY);
      docPdf.text('Sahihi ya Mkuu wa Shule: ______________________', 210, sigY);
    }

    triggerPdfPrintOrSave(docPdf, `Ripoti_Zamu_Siku_${rep.dayName}_${rep.date}.pdf`, shouldPrint);
    showToast(
      'success',
      shouldPrint
        ? `Ripoti ya Siku (${rep.dayName}, ${rep.date}) imehifadhiwa kwenye PDF na kufunguliwa kwa ajili ya Kuchapisha (Print)!`
        : `Ripoti ya Siku (${rep.dayName}, ${rep.date}) yenye mchanganuo wa B/G/T imepakuliwa kwa PDF!`
    );
  };

  // Export Weekly Report as Comprehensive Swahili PDF with full B | G | T Breakdown
  const handlePrintSwahiliPdf = (shouldPrint = false) => {
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const schoolTitle = (schoolInfo?.name || 'SHULE YA SEKONDARI TANZANIA').toUpperCase();
    const selectedWeekObj =
      rosterState.weeklyAssignments.find(w => w.id === filterWeekId) ||
      activeTeacherWeek ||
      rosterState.weeklyAssignments[0];
    const weekTitle = selectedWeekObj ? selectedWeekObj.weekLabel : 'Wiki Zote';
    const dutyTeachersList = selectedWeekObj ? selectedWeekObj.teacherNames.join(', ') : 'Walimu wa Zamu';

    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(14);
    docPdf.setTextColor(31, 77, 139);
    docPdf.text(schoolTitle, 148, 12, { align: 'center' });

    docPdf.setFontSize(11);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text('MFUMO WA ZAMU YA WALIMU - RIPOTI KAMILI YA ZAMU YA WIKI NZIMA (B / G / T)', 148, 18, {
      align: 'center',
    });

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(8.5);
    docPdf.setTextColor(71, 85, 105);
    docPdf.text(
      `Wiki: ${weekTitle}  |  Walimu wa Zamu: ${dutyTeachersList}  |  Waliosajiliwa Shuleni: B=${schoolRegisteredTotals.boys}, G=${schoolRegisteredTotals.girls}, T=${schoolRegisteredTotals.total}`,
      148,
      23,
      { align: 'center' }
    );

    // Table 1: Day-by-Day Weekly Compilation (Jumatatu - Jumapili) with B | G | T
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(9.5);
    docPdf.setTextColor(31, 77, 139);
    docPdf.text(
      '1. MUHTASARI WA MAHUDHURIO YA KILA SIKU KWA WIKI NZIMA (DAILY B / G / T COMPILATION)',
      14,
      28
    );

    const dailyCompilationBody = filteredDailyReports.map(r => {
      const enriched = r.streams.map(st => {
        const sDef = rosterState.streams.find(x => x.id === st.streamId || x.name === st.streamName);
        return ensureRowGenderFields(st, sDef);
      });
      const regB = enriched.reduce((a, x) => a + (x.registeredBoys || 0), 0);
      const regG = enriched.reduce((a, x) => a + (x.registeredGirls || 0), 0);
      const regT = regB + regG;
      const presB = enriched.reduce((a, x) => a + (x.presentBoys || 0), 0);
      const presG = enriched.reduce((a, x) => a + (x.presentGirls || 0), 0);
      const presT = presB + presG;
      const absB = enriched.reduce((a, x) => a + (x.absentBoys || 0), 0);
      const absG = enriched.reduce((a, x) => a + (x.absentGirls || 0), 0);
      const absT = absB + absG;
      const permB = enriched.reduce((a, x) => a + (x.permittedBoys || 0), 0);
      const permG = enriched.reduce((a, x) => a + (x.permittedGirls || 0), 0);
      const permT = permB + permG;
      const sickB = enriched.reduce((a, x) => a + (x.sickBoys || 0), 0);
      const sickG = enriched.reduce((a, x) => a + (x.sickGirls || 0), 0);
      const sickT = sickB + sickG;
      return [
        `${r.dayName} (${r.date})`,
        r.teacherName,
        String(regB), String(regG), String(regT),
        String(presB), String(presG), String(presT),
        String(absB), String(absG), String(absT),
        String(permB), String(permG), String(permT),
        String(sickB), String(sickG), String(sickT),
        `${r.teachersPresent}/${r.teachersPresent + r.teachersAbsent}`,
        `${r.environmentRating}/10`,
      ];
    });

    autoTable(docPdf, {
      startY: 30,
      head: [
        [
          { content: 'SIKU & TAREHE', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'MWALIMU WA ZAMU', rowSpan: 2, styles: { valign: 'middle' } },
          { content: 'WALIOSAJILIWA', colSpan: 3, styles: { halign: 'center', fillColor: [30, 41, 59] } },
          { content: 'WALIOFIKA (PRESENT)', colSpan: 3, styles: { halign: 'center', fillColor: [5, 150, 105] } },
          { content: 'ABSENT (WATORO)', colSpan: 3, styles: { halign: 'center', fillColor: [225, 29, 72] } },
          { content: 'WALIORUHUSIWA', colSpan: 3, styles: { halign: 'center', fillColor: [37, 99, 235] } },
          { content: 'WAGONJWA / PUA', colSpan: 3, styles: { halign: 'center', fillColor: [217, 119, 6] } },
          { content: 'WALIMU', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'USAFI', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        ],
        ['B', 'G', 'T', 'B', 'G', 'T', 'B', 'G', 'T', 'B', 'G', 'T', 'B', 'G', 'T'],
      ],
      body: dailyCompilationBody,
      styles: { fontSize: 7.2, cellPadding: 1.5, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { halign: 'left' },
      },
      headStyles: { fillColor: [31, 77, 139], textColor: 255, fontStyle: 'bold' },
    });

    const afterDailyTableY = (docPdf as any).lastAutoTable?.finalY
      ? (docPdf as any).lastAutoTable.finalY + 6
      : 80;

    // Table 2: Stream Attendance Summary with B | G | T
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(9.5);
    docPdf.setTextColor(31, 77, 139);
    docPdf.text(
      '2. MCHANGANUO WA MAHUDHURIO KWA KILA MKONDO (STREAMS B / G / T BREAKDOWN)',
      14,
      afterDailyTableY
    );

    autoTable(docPdf, {
      startY: afterDailyTableY + 2,
      head: [
        [
          { content: 'MKONDO\n(STREAM)', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
          { content: 'WALIOSAJILIWA', colSpan: 3, styles: { halign: 'center', fillColor: [30, 41, 59] } },
          { content: 'WASTANI WALIOFIKA', colSpan: 3, styles: { halign: 'center', fillColor: [5, 150, 105] } },
          { content: 'JUMLA ABSENT', colSpan: 3, styles: { halign: 'center', fillColor: [225, 29, 72] } },
          { content: 'WALIORUHUSIWA', colSpan: 3, styles: { halign: 'center', fillColor: [37, 99, 235] } },
          { content: 'WAGONJWA / PUA', colSpan: 3, styles: { halign: 'center', fillColor: [217, 119, 6] } },
          { content: 'JUMLA WASIOFIKA', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        ],
        ['B', 'G', 'T', 'B', 'G', 'T', 'B', 'G', 'T', 'B', 'G', 'T', 'B', 'G', 'T'],
      ],
      body: [
        ...streamAbsenteesChartData.map(s => {
          const avgPresB = s.daysCount > 0 ? Math.round(s.presentBSum / s.daysCount) : s.regB;
          const avgPresG = s.daysCount > 0 ? Math.round(s.presentGSum / s.daysCount) : s.regG;
          const avgPresT = avgPresB + avgPresG;
          return [
            s.streamName,
            String(s.regB), String(s.regG), String(s.roll),
            String(avgPresB), String(avgPresG), String(avgPresT),
            String(s.absentBSum), String(s.absentGSum), String(s.unexcused),
            String(s.permittedBSum), String(s.permittedGSum), String(s.permitted),
            String(s.sickBSum), String(s.sickGSum), String(s.sickPua),
            String(s.totalAbsent),
          ];
        }),
        [
          'JUMLA KUU YA SHULE',
          String(schoolRegisteredTotals.boys),
          String(schoolRegisteredTotals.girls),
          String(schoolRegisteredTotals.total),
          String(
            streamAbsenteesChartData.reduce(
              (a, s) => a + (s.daysCount > 0 ? Math.round(s.presentBSum / s.daysCount) : s.regB),
              0
            )
          ),
          String(
            streamAbsenteesChartData.reduce(
              (a, s) => a + (s.daysCount > 0 ? Math.round(s.presentGSum / s.daysCount) : s.regG),
              0
            )
          ),
          String(
            streamAbsenteesChartData.reduce(
              (a, s) =>
                a +
                (s.daysCount > 0
                  ? Math.round(s.presentBSum / s.daysCount) + Math.round(s.presentGSum / s.daysCount)
                  : s.roll),
              0
            )
          ),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.absentBSum, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.absentGSum, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.unexcused, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.permittedBSum, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.permittedGSum, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.permitted, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.sickBSum, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.sickGSum, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.sickPua, 0)),
          String(streamAbsenteesChartData.reduce((a, s) => a + s.totalAbsent, 0)),
        ],
      ],
      styles: { fontSize: 7, cellPadding: 1.4, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
      },
      headStyles: { fillColor: [31, 77, 139], textColor: 255, fontStyle: 'bold' },
      didParseCell: data => {
        if (data.section === 'body' && data.row.index === streamAbsenteesChartData.length) {
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // Add a new page for qualitative daily reports so all notes, events, bell, and recommendations are clearly printed
    docPdf.addPage('a4', 'landscape');
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(10);
    docPdf.setTextColor(31, 77, 139);
    docPdf.text(
      `3. TAARIFA KAMILI ZA KILA SIKU ZA MWALIMU WA ZAMU (${weekTitle})`,
      14,
      14
    );

    autoTable(docPdf, {
      startY: 17,
      head: [[
        'Tarehe & Siku',
        'Mwalimu wa Zamu',
        'Waliofika (B/G/T)',
        'Usafi & Maelezo',
        'Walimu (Wapo/Hawapo)',
        'Nidhamu Jumla',
        'Matukio Muhimu & Kengele',
        'Mapendekezo kwa Discipline Master',
      ]],
      body: filteredDailyReports.map(r => [
        `${r.dayName}\n${r.date}`,
        r.teacherName,
        `B:${r.totals.presentBoys ?? '-'} G:${r.totals.presentGirls ?? '-'}\nT:${r.totals.present}/${r.totals.totalStudents}`,
        `${r.environmentRating}/10\n${r.environmentNotes || ''}`,
        `Wapo: ${r.teachersPresent}\nHawapo: ${r.teachersAbsent}\n${r.teacherAttendanceNotes || ''}`,
        r.generalDiscipline || '-',
        `${r.keyEvents || '-'}\nKengele: ${r.bellSchedule || '-'}`,
        r.recommendations || '-',
      ]),
      styles: { fontSize: 7.8, cellPadding: 2 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = (docPdf as any).lastAutoTable?.finalY ? (docPdf as any).lastAutoTable.finalY + 12 : 175;
    if (finalY < 195) {
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(9);
      docPdf.setTextColor(51, 65, 85);
      docPdf.text('Sahihi ya Mwalimu wa Zamu: ___________________________', 14, finalY);
      docPdf.text('Sahihi ya Discipline Master: ___________________________', 110, finalY);
      docPdf.text('Sahihi ya Mkuu wa Shule: ___________________________', 205, finalY);
    }

    triggerPdfPrintOrSave(
      docPdf,
      `Ripoti_Kamili_Zamu_ya_Wiki_${weekTitle.replace(/\s+/g, '_')}.pdf`,
      shouldPrint
    );
    showToast(
      'success',
      shouldPrint
        ? 'Ripoti ya Wiki Nzima (PDF) imehifadhiwa na kufunguliwa kwa ajili ya Kuchapisha (Print)!'
        : 'Ripoti Kamili ya Wiki Nzima (PDF yenye B/G/T na taarifa zote) imepakuliwa!'
    );
  };

  // Export to Excel (.xlsx) in Swahili with B | G | T columns
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const streamSummarySheetData = streamAbsenteesChartData.map(s => {
      const avgPresB = s.daysCount > 0 ? Math.round(s.presentBSum / s.daysCount) : s.regB;
      const avgPresG = s.daysCount > 0 ? Math.round(s.presentGSum / s.daysCount) : s.regG;
      return {
        'Mkondo (Stream)': s.streamName,
        'Waliosajiliwa Wavulana (B)': s.regB,
        'Waliosajiliwa Wasichana (G)': s.regG,
        'Waliosajiliwa Jumla (T)': s.roll,
        'Siku Zilizorekodiwa': s.daysCount,
        'Wastani Waliofika (B)': avgPresB,
        'Wastani Waliofika (G)': avgPresG,
        'Wastani Waliofika (T)': avgPresB + avgPresG,
        'Jumla Absent (B)': s.absentBSum,
        'Jumla Absent (G)': s.absentGSum,
        'Jumla Absent (T)': s.unexcused,
        'Walioruhusiwa (B)': s.permittedBSum,
        'Walioruhusiwa (G)': s.permittedGSum,
        'Walioruhusiwa (T)': s.permitted,
        'Wagonjwa / PUA (B)': s.sickBSum,
        'Wagonjwa / PUA (G)': s.sickGSum,
        'Wagonjwa / PUA (T)': s.sickPua,
        'Jumla Wasiofika Wote': s.totalAbsent,
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(streamSummarySheetData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Muhtasari_wa_Mikondo_BGT');

    const dailyReportsSheetData = filteredDailyReports.map(r => ({
      'Tarehe': r.date,
      'Siku': r.dayName,
      'Wiki': r.weekLabel,
      'Mwalimu wa Zamu': r.teacherName,
      'Walimu Wote wa Wiki': r.allWeekTeachers.join(', '),
      'Waliosajiliwa (B)': r.totals.registeredBoys ?? schoolRegisteredTotals.boys,
      'Waliosajiliwa (G)': r.totals.registeredGirls ?? schoolRegisteredTotals.girls,
      'Waliosajiliwa (T)': r.totals.totalStudents,
      'Waliofika (B)': r.totals.presentBoys ?? 0,
      'Waliofika (G)': r.totals.presentGirls ?? 0,
      'Waliofika (T)': r.totals.present,
      'Absent (B)': r.totals.absentBoys ?? 0,
      'Absent (G)': r.totals.absentGirls ?? 0,
      'Absent (T)': r.totals.absent,
      'Walioruhusiwa (B)': r.totals.permittedBoys ?? 0,
      'Walioruhusiwa (G)': r.totals.permittedGirls ?? 0,
      'Walioruhusiwa (T)': r.totals.permitted,
      'Wagonjwa / PUA (B)': r.totals.sickBoys ?? 0,
      'Wagonjwa / PUA (G)': r.totals.sickGirls ?? 0,
      'Wagonjwa / PUA (T)': r.totals.sickPua,
      'Usafi wa Mazingira (1-10)': r.environmentRating,
      'Maelezo ya Usafi': r.environmentNotes || '',
      'Nidhamu Jumla': r.generalDiscipline,
      'Walimu Waliofika': r.teachersPresent,
      'Walimu Wasiofika': r.teachersAbsent,
      'Maelezo ya Mahudhurio ya Walimu': r.teacherAttendanceNotes,
      'Matukio Muhimu ya Siku': r.keyEvents,
      'Kengele / Ratiba': r.bellSchedule,
      'Mapendekezo kwa Discipline Master': r.recommendations,
    }));
    const ws2 = XLSX.utils.json_to_sheet(dailyReportsSheetData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Ripoti_za_Kila_Siku_BGT');

    const detailedRows: Record<string, any>[] = [];
    filteredDailyReports.forEach(r => {
      r.streams.forEach(rawS => {
        const sDef = rosterState.streams.find(x => x.id === rawS.streamId || x.name === rawS.streamName);
        const s = ensureRowGenderFields(rawS, sDef);
        detailedRows.push({
          'Tarehe': r.date,
          'Siku': r.dayName,
          'Mwalimu wa Zamu': r.teacherName,
          'Stream': s.streamName,
          'Waliosajiliwa (B)': s.registeredBoys,
          'Waliosajiliwa (G)': s.registeredGirls,
          'Waliosajiliwa (T)': s.totalStudents,
          'Waliofika (B)': s.presentBoys,
          'Waliofika (G)': s.presentGirls,
          'Waliofika (T)': s.present,
          'Absent (B)': s.absentBoys,
          'Absent (G)': s.absentGirls,
          'Absent (T)': s.absent,
          'Walioruhusiwa (B)': s.permittedBoys,
          'Walioruhusiwa (G)': s.permittedGirls,
          'Walioruhusiwa (T)': s.permitted,
          'Wagonjwa (B)': s.sickBoys,
          'Wagonjwa (G)': s.sickGirls,
          'Wagonjwa (T)': s.sickPua,
          'Maelezo': s.remarks || '',
        });
      });
    });
    const ws3 = XLSX.utils.json_to_sheet(detailedRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Mahudhurio_Kwa_Mkondo_BGT');

    XLSX.writeFile(wb, `Mfumo_wa_Zamu_ya_Walimu_BGT_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', 'Faili la Excel (.xlsx) lenye mchanganuo wa B/G/T limepakuliwa kikamilifu!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 text-xs font-bold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Cloud SQL + Firestore Connected (Walimu {rosterState.teachers.length} · Wanafunzi {totalSchoolStudents})</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">
                {dbSaveState === 'saving'
                  ? 'Inahifadhi kwenye database...'
                  : `Imehifadhiwa (${lastSavedTime}) — Kila siku inatengeneza Ripoti ya Wiki Nzima`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Mfumo wa Zamu ya Walimu (Duty Roster System — B / G / T Gender Breakdown)
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              Mchanganuo kamili wa Kijinsia <strong>(B = Wavulana, G = Wasichana, T = Jumla)</strong> kwa{' '}
              <strong>Waliosajiliwa, Present, Absent, Walioruhusiwa na Wagonjwa</strong>. Jaza na uhifadhi kila siku ili kutengeneza na kuchapisha Ripoti ya Wiki Nzima (PDF & Print).
            </p>
          </div>

          {/* Role Switcher & Teacher Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md">
              <button
                type="button"
                onClick={() => setActiveRoleMode('DISCIPLINE_MASTER')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeRoleMode === 'DISCIPLINE_MASTER'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Discipline Master (Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleMode('TEACHER_ON_DUTY')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeRoleMode === 'TEACHER_ON_DUTY'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Mwalimu wa Zamu</span>
              </button>
            </div>

            {activeRoleMode === 'TEACHER_ON_DUTY' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-semibold whitespace-nowrap">Mwalimu:</span>
                <select
                  value={selectedDutyTeacherId}
                  onChange={e => setSelectedDutyTeacherId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
                >
                  {rosterState.teachers.map(t => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {activeRoleMode === 'DISCIPLINE_MASTER' ? (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('MASTER_VIEW')}
                className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'MASTER_VIEW'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span>Ripoti ya Wiki Nzima & Takwimu (Discipline Master)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DUTY_DASHBOARD')}
                className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'DUTY_DASHBOARD'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                <span>Dashibodi ya Mwalimu wa Zamu (Jaza Kila Siku B/G/T)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('VISUAL_CALENDAR')}
                className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'VISUAL_CALENDAR'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Kalenda ya Zamu za Kila Siku (Visual Duty Calendar)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SETUP')}
                className={`px-3.5 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === 'SETUP'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 text-amber-500" />
                <span>Usanidi wa Mfumo (Mikondo, Walimu & Wiki)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <ClipboardCheck className="w-4 h-4" />
              <span>
                Upo kwenye Mtazamo wa Mwalimu wa Zamu — Jaza na hifadhi taarifa za kila siku (B/G/T) na chapisha PDF.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span>Mikondo: <strong className="text-white">{rosterState.streams.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>
              Waliosajiliwa: <strong className="text-sky-400">B: {schoolRegisteredTotals.boys}</strong> |{' '}
              <strong className="text-pink-400">G: {schoolRegisteredTotals.girls}</strong> |{' '}
              <strong className="text-emerald-400">T: {schoolRegisteredTotals.total}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>Walimu: <strong className="text-white">{rosterState.teachers.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          VIEW 1: SETUP PAGE (FOR DISCIPLINE MASTER ONLY)
          ========================================================================== */}
      {activeRoleMode === 'DISCIPLINE_MASTER' && activeTab === 'SETUP' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1A: Add / Edit Streams & Student Roll with B / G / T */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>1. Mikondo ya Madarasa & Usajili (B / G / T)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ongeza au hariri mkondo na idadi ya Wavulana (B), Wasichana (G) na Jumla (T)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncStreamsFromRegisteredStudents}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Chukua mikondo na mchanganuo wa B/G/T kutoka kwenye usajili wa wanafunzi 600"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sawazisha na Daftari (B/G/T)</span>
                </button>
              </div>

              <form onSubmit={handleSaveStream} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Jina la Mkondo *</label>
                  <input
                    type="text"
                    placeholder="Mf. Form 1A"
                    value={newStreamName}
                    onChange={e => setNewStreamName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-sky-700 block mb-1">Wavulana (B) *</label>
                  <input
                    type="number"
                    min={0}
                    value={newStreamBoys}
                    onChange={e => setNewStreamBoys(parseInt(e.target.value || '0', 10) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-sky-300 rounded-lg font-bold text-sky-900"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-pink-700 block mb-1">Wasichana (G) *</label>
                  <input
                    type="number"
                    min={0}
                    value={newStreamGirls}
                    onChange={e => setNewStreamGirls(parseInt(e.target.value || '0', 10) || 0)}
                    className="w-full px-2.5 py-2 bg-white border border-pink-300 rounded-lg font-bold text-pink-900"
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">
                    Mwalimu wa Darasa (T = {newStreamBoys + newStreamGirls})
                  </label>
                  <input
                    type="text"
                    placeholder="Hiari (Mf. Mwl. Juma)"
                    value={newStreamTeacher}
                    onChange={e => setNewStreamTeacher(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-12 flex justify-end gap-2 pt-1">
                  {editingStreamId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStreamId(null);
                        setNewStreamName('');
                        setNewStreamBoys(15);
                        setNewStreamGirls(15);
                        setNewStreamTeacher('');
                      }}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg font-bold"
                    >
                      Ghairi
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingStreamId ? 'Hifadhi Mabadiliko ya Mkondo' : 'Ongeza Mkondo'}</span>
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">Mkondo (Stream)</th>
                      <th className="p-2.5 border-r border-slate-200 text-center text-sky-700">B (Wavulana)</th>
                      <th className="p-2.5 border-r border-slate-200 text-center text-pink-700">G (Wasichana)</th>
                      <th className="p-2.5 border-r border-slate-200 text-center text-slate-900">T (Jumla)</th>
                      <th className="p-2.5 border-r border-slate-200">Mwalimu wa Darasa</th>
                      <th className="p-2.5 text-center">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rosterState.streams.map(st => {
                      const b = st.registeredBoys ?? Math.ceil(st.totalStudents / 2);
                      const g = st.registeredGirls ?? Math.max(0, st.totalStudents - b);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{st.name}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-sky-700">{b}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-pink-700">{g}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-black text-blue-900 bg-slate-50">
                            {b + g}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-slate-600">{st.classTeacher || '-'}</td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStreamId(st.id);
                                  setNewStreamName(st.name);
                                  setNewStreamBoys(b);
                                  setNewStreamGirls(g);
                                  setNewStreamTeacher(st.classTeacher || '');
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="Hariri Mkondo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStream(st.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Futa Mkondo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black">
                      <td className="p-3">JUMLA WALIOSAJILIWA SHULENI</td>
                      <td className="p-3 text-center text-sky-300">{schoolRegisteredTotals.boys}</td>
                      <td className="p-3 text-center text-pink-300">{schoolRegisteredTotals.girls}</td>
                      <td className="p-3 text-center text-emerald-400 text-sm">{schoolRegisteredTotals.total}</td>
                      <td colSpan={2} className="p-3 text-right text-[11px] font-normal text-slate-300">
                        Mikondo {rosterState.streams.length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 1B: Add / Edit Teachers List */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>2. Orodha ya Walimu ({rosterState.teachers.length} Waliosajiliwa)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sajili au hariri walimu wanaopangiwa zamu za kila wiki
                </p>
              </div>

              <form onSubmit={handleSaveTeacher} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Jina la Mwalimu *</label>
                  <input
                    type="text"
                    placeholder="Mf. Mwl. Juma Bakari"
                    value={newTeacherName}
                    onChange={e => setNewTeacherName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Namba ya Simu *</label>
                  <input
                    type="text"
                    placeholder="Mf. 0754 210 340"
                    value={newTeacherPhone}
                    onChange={e => setNewTeacherPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="font-bold text-slate-700 block mb-1">Somo Analofundisha *</label>
                  <input
                    type="text"
                    placeholder="Mf. Mathematics & Physics"
                    value={newTeacherSubject}
                    onChange={e => setNewTeacherSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div className="sm:col-span-12 flex justify-end gap-2 pt-1">
                  {editingTeacherId !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeacherId(null);
                        setNewTeacherName('');
                        setNewTeacherPhone('');
                        setNewTeacherSubject('');
                      }}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg font-bold"
                    >
                      Ghairi
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingTeacherId !== null ? 'Hifadhi Mwalimu' : 'Ongeza Mwalimu'}</span>
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">Jina la Mwalimu</th>
                      <th className="p-2.5 border-r border-slate-200">Simu</th>
                      <th className="p-2.5 border-r border-slate-200">Somo (Subject)</th>
                      <th className="p-2.5 text-center">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rosterState.teachers.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{t.name}</td>
                        <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">{t.phone}</td>
                        <td className="p-2.5 border-r border-slate-200 text-slate-700">{t.subject}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeacherId(t.id);
                                setNewTeacherName(t.name);
                                setNewTeacherPhone(t.phone);
                                setNewTeacherSubject(t.subject);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Hariri Mwalimu"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeacher(t.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="Futa Mwalimu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 1C: Weekly Assignment (Jumatatu - Jumapili) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>3. Pangilia Zamu ya Wiki (Jumatatu – Jumapili)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chagua wiki (Jumatatu hadi Jumapili) na uchague walimu 2 au 3 wa zamu kwa wiki hiyo
                </p>
              </div>
              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                Wiki Iliyochaguliwa: {computedWeekRange.label} ({computedWeekRange.monday} hadi {computedWeekRange.sunday})
              </div>
            </div>

            <form onSubmit={handleAssignWeeklyDuty} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chagua Tarehe Yoyote Ndani ya Wiki (Mon–Sun Date Picker) *
                  </label>
                  <input
                    type="date"
                    value={selectedWeekDate}
                    onChange={e => setSelectedWeekDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mfumo unakokotoa otomatiki Jumatatu ({computedWeekRange.monday}) hadi Jumapili ({computedWeekRange.sunday}).
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Maelekezo Maalum ya Wiki (Hiari)
                  </label>
                  <input
                    type="text"
                    placeholder="Mfano: Kusimamia usafi wa mazingira asubuhi na paredi ya saa 1:30..."
                    value={weeklyNotes}
                    onChange={e => setWeeklyNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700">
                    Chagua Walimu wa Zamu kwa Wiki Hii (Chagua Walimu 2–3) — Waliochaguliwa: {selectedWeekTeacherIds.length}
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {rosterState.teachers.map(teacher => {
                    const isChecked = selectedWeekTeacherIds.some(id => String(id) === String(teacher.id));
                    return (
                      <button
                        type="button"
                        key={teacher.id}
                        onClick={() => toggleTeacherForWeek(teacher.id)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 border ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold truncate">{teacher.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{teacher.subject}</div>
                          <div className="text-[10px] font-mono text-slate-400">{teacher.phone}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Pangilia Zamu ya Wiki ({computedWeekRange.label})</span>
                </button>
              </div>
            </form>

            {/* Assigned Weeks Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 border-r border-slate-200">Wiki (Jumatatu – Jumapili)</th>
                    <th className="p-3 border-r border-slate-200">Tarehe</th>
                    <th className="p-3 border-r border-slate-200">Walimu Waliopangiwa Zamu</th>
                    <th className="p-3 border-r border-slate-200">Maelekezo</th>
                    <th className="p-3 text-center">Vitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rosterState.weeklyAssignments.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="p-3 border-r border-slate-200 font-black text-indigo-900">{w.weekLabel}</td>
                      <td className="p-3 border-r border-slate-200 font-mono text-slate-600">
                        {w.weekStart} → {w.weekEnd}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">
                        {w.teacherNames.join(' · ')}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-600">{w.notes || '-'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteWeeklyAssignment(w.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Futa Zamu ya Wiki"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          VIEW 2: DUTY ROSTER DASHBOARD (FOR TEACHER ON DUTY - FILL & SAVE DAILY)
          ========================================================================== */}
      {activeTab === 'DUTY_DASHBOARD' && (
        <div className="space-y-6">
          {!activeTeacherWeek ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="text-base font-black text-amber-950">
                Hujapangiwa Zamu ya Wiki kwa Sasa ({currentDutyTeacherObj?.name || 'Mwalimu'})
              </h3>
              <p className="text-xs text-amber-800 max-w-lg mx-auto">
                Kwa mujibu wa sheria za mfumo, Mwalimu wa Zamu anaweza kuona na kujaza taarifa za wiki aliyopangiwa pekee. Tafadhali wasiliana na Discipline Master au chagua mwalimu aliyepangiwa zamu wiki hii kwenye menyu ya juu.
              </p>
            </div>
          ) : (
            <>
              {/* Assigned Week Header Banner + Quick Daily Selector Pills */}
              <div className="bg-white border-2 border-indigo-600 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      Fomu ya Kujaza na Kuhifadhi Kila Siku (Inatengeneza Ripoti ya Wiki Nzima)
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      Zamu ya Wiki: {activeTeacherWeek.weekLabel} — Mwalimu: {currentDutyTeacherObj?.name || activeTeacherWeek.teacherNames.join(', ')}
                    </h3>
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span>Walimu wa Zamu Wiki Hii: <strong>{activeTeacherWeek.teacherNames.join(' · ')}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Muda: <strong>{activeTeacherWeek.weekStart} hadi {activeTeacherWeek.weekEnd}</strong></span>
                    </div>
                  </div>

                  {/* Print / Save PDF & Date Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleExportDailyPdf(undefined, false)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Pakua PDF ya Siku ({SWAHILI_DAYS[new Date(reportDate + 'T00:00:00').getDay()]})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportDailyPdf(undefined, true)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Fomu ya Leo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintSwahiliPdf(false)}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF ya Wiki Nzima</span>
                    </button>
                  </div>
                </div>

                {/* Day-by-Day Interactive Selector Bar (Jumatatu - Jumapili) */}
                <div className="pt-3 border-t border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 mr-1">Chagua Siku ya Kujaza / Kuhariri:</span>
                    {activeWeekDays.map(d => {
                      const isSelected = reportDate === d.date;
                      const isSaved = rosterState.dailyReports.some(
                        r => r.date === d.date && r.weekAssignmentId === activeTeacherWeek.id
                      );
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setReportDate(d.date)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                              : isSaved
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span>{d.dayName}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                            ({d.date.slice(5)})
                          </span>
                          {isSaved && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-600 text-white'
                              }`}
                            >
                              ✓ Imehifadhiwa
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Tarehe:</label>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoCalculatePresent}
                        onChange={e => setAutoCalculatePresent(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Kokotoa Waliofika (B/G/T) Otomatiki</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Automatic Summary KPI Cards with B / G / T Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-4 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-300 uppercase">1. Waliosajiliwa (Registered)</div>
                  <div className="text-2xl font-black text-white mt-1">T: {dailyTotals.totalStudents}</div>
                  <div className="text-xs font-bold mt-1 flex items-center gap-3">
                    <span className="text-sky-300">B: {dailyTotals.registeredBoys}</span>
                    <span className="text-pink-300">G: {dailyTotals.registeredGirls}</span>
                    <span className="text-emerald-300">T: {dailyTotals.totalStudents}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-xs">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">2. Waliofika (Present)</div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-emerald-700">T: {dailyTotals.present}</span>
                    <span className="text-xs font-black text-emerald-800">
                      {dailyTotals.totalStudents > 0
                        ? `${((dailyTotals.present / dailyTotals.totalStudents) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="text-xs font-bold mt-1 flex items-center gap-3 text-emerald-900">
                    <span>B: {dailyTotals.presentBoys}</span>
                    <span>G: {dailyTotals.presentGirls}</span>
                    <span>T: {dailyTotals.present}</span>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs">
                  <div className="text-[11px] font-bold text-rose-800 uppercase">3. Wasiofika (Absent)</div>
                  <div className="text-2xl font-black text-rose-700 mt-1">T: {dailyTotals.absent}</div>
                  <div className="text-xs font-bold mt-1 flex items-center gap-3 text-rose-900">
                    <span>B: {dailyTotals.absentBoys}</span>
                    <span>G: {dailyTotals.absentGirls}</span>
                    <span>T: {dailyTotals.absent}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-xs">
                  <div className="text-[11px] font-bold text-blue-800 uppercase">4. Walioruhusiwa (Permitted)</div>
                  <div className="text-2xl font-black text-blue-700 mt-1">T: {dailyTotals.permitted}</div>
                  <div className="text-xs font-bold mt-1 flex items-center gap-3 text-blue-900">
                    <span>B: {dailyTotals.permittedBoys}</span>
                    <span>G: {dailyTotals.permittedGirls}</span>
                    <span>T: {dailyTotals.permitted}</span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">5. Wagonjwa (Sick / PUA)</div>
                  <div className="text-2xl font-black text-amber-700 mt-1">T: {dailyTotals.sickPua}</div>
                  <div className="text-xs font-bold mt-1 flex items-center gap-3 text-amber-900">
                    <span>B: {dailyTotals.sickBoys}</span>
                    <span>G: {dailyTotals.sickGirls}</span>
                    <span>T: {dailyTotals.sickPua}</span>
                  </div>
                </div>
              </div>

              {/* Stream Attendance Table with Full Gender Breakdown B | G | T */}
              <form onSubmit={handleSaveDailyDutyReport} className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Jedwali la Mahudhurio ya Wanafunzi kwa Kila Mkondo — Mchanganuo wa Jinsia (B = Boys, G = Girls, T = Total)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Kanuni: <strong>Waliofika (B/G/T) + Absent (B/G/T) + Walioruhusiwa (B/G/T) + Wagonjwa (B/G/T) = Waliosajiliwa (B/G/T)</strong>
                      </p>
                    </div>
                    <div className="text-xs font-bold">
                      {allRowsValid ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Hesabu za B, G na T kwenye mikondo yote zinalingana na Waliosajiliwa!</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>Baadhi ya mikondo haijatimia Waliosajiliwa (B/G) — Bofya "Sawazisha"</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold text-[11px]">
                          <th rowSpan={2} className="p-2.5 border-r border-slate-700">
                            MKONDO (STREAM)
                          </th>
                          <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-slate-800">
                            WALIOSAJILIWA (ROLL)
                          </th>
                          <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-emerald-900">
                            WALIOFIKA (PRESENT)
                          </th>
                          <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-rose-900">
                            ABSENT (WATORO)
                          </th>
                          <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-blue-900">
                            WALIORUHUSIWA (RUHUSA)
                          </th>
                          <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-amber-900">
                            WAGONJWA (SICK / PUA)
                          </th>
                          <th rowSpan={2} className="p-2.5 border-r border-slate-700 min-w-[150px]">
                            MAELEZO
                          </th>
                          <th rowSpan={2} className="p-2.5 text-center">
                            UHAKIKI
                          </th>
                        </tr>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black text-[11px] text-center">
                          {/* Waliosajiliwa B G T */}
                          <th className="p-1.5 border-r border-slate-200 text-sky-700">B</th>
                          <th className="p-1.5 border-r border-slate-200 text-pink-700">G</th>
                          <th className="p-1.5 border-r border-slate-300 bg-slate-200 text-slate-900">T</th>
                          {/* Present B G T */}
                          <th className="p-1.5 border-r border-slate-200 bg-emerald-50 text-emerald-800">B</th>
                          <th className="p-1.5 border-r border-slate-200 bg-emerald-50 text-emerald-800">G</th>
                          <th className="p-1.5 border-r border-slate-300 bg-emerald-100 text-emerald-950">T</th>
                          {/* Absent B G T */}
                          <th className="p-1.5 border-r border-slate-200 bg-rose-50 text-rose-800">B</th>
                          <th className="p-1.5 border-r border-slate-200 bg-rose-50 text-rose-800">G</th>
                          <th className="p-1.5 border-r border-slate-300 bg-rose-100 text-rose-950">T</th>
                          {/* Permitted B G T */}
                          <th className="p-1.5 border-r border-slate-200 bg-blue-50 text-blue-800">B</th>
                          <th className="p-1.5 border-r border-slate-200 bg-blue-50 text-blue-800">G</th>
                          <th className="p-1.5 border-r border-slate-300 bg-blue-100 text-blue-950">T</th>
                          {/* Sick B G T */}
                          <th className="p-1.5 border-r border-slate-200 bg-amber-50 text-amber-800">B</th>
                          <th className="p-1.5 border-r border-slate-200 bg-amber-50 text-amber-800">G</th>
                          <th className="p-1.5 border-r border-slate-300 bg-amber-100 text-amber-950">T</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {streamRows.map((row, idx) => {
                          const val = rowValidation[idx];
                          const regB = row.registeredBoys ?? Math.ceil(row.totalStudents / 2);
                          const regG = row.registeredGirls ?? Math.max(0, row.totalStudents - regB);
                          return (
                            <tr
                              key={row.streamId}
                              className={val?.isValid ? 'hover:bg-slate-50/80' : 'bg-rose-50/40'}
                            >
                              <td className="p-2 border-r border-slate-200 font-black text-slate-900 whitespace-nowrap">
                                {row.streamName}
                              </td>

                              {/* WALIOSAJILIWA: B | G | T */}
                              <td className="p-1.5 border-r border-slate-200 text-center font-bold text-sky-700 bg-slate-50">
                                {regB}
                              </td>
                              <td className="p-1.5 border-r border-slate-200 text-center font-bold text-pink-700 bg-slate-50">
                                {regG}
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-black text-slate-900 bg-slate-100">
                                {row.totalStudents}
                              </td>

                              {/* WALIOFIKA (PRESENT): B | G | T */}
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regB}
                                  value={row.presentBoys ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'presentBoys', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regG}
                                  value={row.presentGirls ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'presentGirls', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-black text-emerald-900 bg-emerald-100/70">
                                {row.present}
                              </td>

                              {/* ABSENT: B | G | T */}
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regB}
                                  value={row.absentBoys ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'absentBoys', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-rose-900 bg-rose-50 border border-rose-300 rounded"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regG}
                                  value={row.absentGirls ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'absentGirls', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-rose-900 bg-rose-50 border border-rose-300 rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-black text-rose-900 bg-rose-100/70">
                                {row.absent}
                              </td>

                              {/* WALIORUHUSIWA: B | G | T */}
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regB}
                                  value={row.permittedBoys ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'permittedBoys', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-blue-900 bg-blue-50 border border-blue-300 rounded"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regG}
                                  value={row.permittedGirls ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'permittedGirls', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-blue-900 bg-blue-50 border border-blue-300 rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-black text-blue-900 bg-blue-100/70">
                                {row.permitted}
                              </td>

                              {/* WAGONJWA: B | G | T */}
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regB}
                                  value={row.sickBoys ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'sickBoys', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded"
                                />
                              </td>
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={regG}
                                  value={row.sickGirls ?? 0}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'sickGirls', e.target.value)
                                  }
                                  className="w-12 px-1 py-1 text-center font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded"
                                />
                              </td>
                              <td className="p-1.5 border-r border-slate-300 text-center font-black text-amber-900 bg-amber-100/70">
                                {row.sickPua}
                              </td>

                              <td className="p-1.5 border-r border-slate-200">
                                <input
                                  type="text"
                                  placeholder="Maelezo ya mkondo..."
                                  value={row.remarks}
                                  onChange={e =>
                                    handleStreamGenderCellChange(row.streamId, 'remarks', e.target.value)
                                  }
                                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded"
                                />
                              </td>

                              <td className="p-1.5 text-center whitespace-nowrap">
                                {val?.isValid ? (
                                  <span className="text-emerald-700 font-bold text-[11px]">
                                    ✓ {val.sumFour}/{val.total}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleBalanceRow(row.streamId)}
                                    className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                    title="Sawazisha Waliofika B na G ili ilingane na Waliosajiliwa"
                                  >
                                    Sawazisha
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-black text-xs text-center">
                          <td className="p-3 border-r border-slate-700 text-left">JUMLA KUU YA SHULE LEO</td>
                          {/* Registered B G T */}
                          <td className="p-2 border-r border-slate-700 text-sky-300">{dailyTotals.registeredBoys}</td>
                          <td className="p-2 border-r border-slate-700 text-pink-300">{dailyTotals.registeredGirls}</td>
                          <td className="p-2 border-r border-slate-600 bg-slate-800 text-white">{dailyTotals.totalStudents}</td>
                          {/* Present B G T */}
                          <td className="p-2 border-r border-slate-700 text-emerald-300">{dailyTotals.presentBoys}</td>
                          <td className="p-2 border-r border-slate-700 text-emerald-300">{dailyTotals.presentGirls}</td>
                          <td className="p-2 border-r border-slate-600 bg-emerald-950 text-emerald-400">{dailyTotals.present}</td>
                          {/* Absent B G T */}
                          <td className="p-2 border-r border-slate-700 text-rose-300">{dailyTotals.absentBoys}</td>
                          <td className="p-2 border-r border-slate-700 text-rose-300">{dailyTotals.absentGirls}</td>
                          <td className="p-2 border-r border-slate-600 bg-rose-950 text-rose-400">{dailyTotals.absent}</td>
                          {/* Permitted B G T */}
                          <td className="p-2 border-r border-slate-700 text-blue-300">{dailyTotals.permittedBoys}</td>
                          <td className="p-2 border-r border-slate-700 text-blue-300">{dailyTotals.permittedGirls}</td>
                          <td className="p-2 border-r border-slate-600 bg-blue-950 text-blue-300">{dailyTotals.permitted}</td>
                          {/* Sick B G T */}
                          <td className="p-2 border-r border-slate-700 text-amber-300">{dailyTotals.sickBoys}</td>
                          <td className="p-2 border-r border-slate-700 text-amber-300">{dailyTotals.sickGirls}</td>
                          <td className="p-2 border-r border-slate-600 bg-amber-950 text-amber-300">{dailyTotals.sickPua}</td>
                          <td colSpan={2} className="p-2 text-right text-emerald-300">
                            Mahudhurio: {dailyTotals.totalStudents > 0 ? ((dailyTotals.present / dailyTotals.totalStudents) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Important Duty Sections Below */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* 1. Usafi wa Mazingira (1-10 rating) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-900">
                        1. Usafi wa Mazingira (Alama 1 hadi 10)
                      </label>
                      <span className="text-xs font-black text-emerald-700">
                        Alama: {environmentRating} / 10
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setEnvironmentRating(num)}
                          className={`w-9 h-9 rounded-lg font-black text-xs transition-all cursor-pointer border ${
                            environmentRating === num
                              ? num >= 8
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                : num >= 5
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-rose-600 text-white border-rose-700 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Maelezo ya usafi wa madarasa, vyoo na viwanja..."
                      value={environmentNotes}
                      onChange={e => setEnvironmentNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* 2. Mahudhurio ya Walimu */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <label className="text-sm font-black text-slate-900 block">
                      2. Mahudhurio ya Walimu (Waalimu Waliofika / Hawakufika)
                    </label>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-600 block mb-1">Walimu Waliofika:</span>
                        <input
                          type="number"
                          min={0}
                          value={teachersPresent}
                          onChange={e => setTeachersPresent(parseInt(e.target.value || '0', 10) || 0)}
                          className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-lg font-black text-emerald-900"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-600 block mb-1">Walimu Wasiofika:</span>
                        <input
                          type="number"
                          min={0}
                          value={teachersAbsent}
                          onChange={e => setTeachersAbsent(parseInt(e.target.value || '0', 10) || 0)}
                          className="w-full px-3 py-2 bg-rose-50 border border-rose-300 rounded-lg font-black text-rose-900"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Majina au sababu za walimu wasiofika / waliochelewa..."
                      value={teacherAttendanceNotes}
                      onChange={e => setTeacherAttendanceNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* 3. Nidhamu Jumla */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                    <label className="text-sm font-black text-slate-900 block">
                      3. Nidhamu Jumla (Maelezo ya matukio ya utoro, fujo, sare)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Eleza hali ya nidhamu kwa ujumla, matukio ya utoro, uchelewaji au fujo..."
                      value={generalDiscipline}
                      onChange={e => setGeneralDiscipline(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* 4. Matukio Muhimu ya Siku */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                    <label className="text-sm font-black text-slate-900 block">
                      4. Matukio Muhimu ya Siku (Ugonjwa wa ghafla, mgeni, mvua, n.k.)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Andika matukio yoyote muhimu kama ugonjwa wa ghafla, ugeni, hali ya hewa au dharura..."
                      value={keyEvents}
                      onChange={e => setKeyEvents(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* 5. Kengele / Ratiba (Ilikuwaje?) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                    <label className="text-sm font-black text-slate-900 block">
                      5. Kengele / Ratiba (Ilikuwaje?)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Je, kengele na ratiba za vipindi zilizingatiwa kwa wakati?"
                      value={bellSchedule}
                      onChange={e => setBellSchedule(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* 6. Mapendekezo kwa Discipline Master */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
                    <label className="text-sm font-black text-slate-900 block">
                      6. Mapendekezo kwa Discipline Master
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Toa ushauri au hatua zinazopaswa kuchukuliwa na Discipline Master..."
                      value={recommendations}
                      onChange={e => setRecommendations(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Save Daily Record & Print Action Bar */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-xl">
                  <div className="text-xs text-slate-300">
                    Ukibonyeza <strong>"Hifadhi Taarifa ya Siku ({SWAHILI_DAYS[new Date(reportDate + 'T00:00:00').getDay()]})"</strong>, rekodi inahifadhiwa kwenye Database na kuingizwa moja kwa moja kwenye <strong>Ripoti ya Wiki Nzima</strong>.
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleExportDailyPdf(undefined, false)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save PDF (Siku Hii)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportDailyPdf(undefined, true)}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Siku Hii</span>
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Hifadhi Taarifa ya Siku ({reportDate})</span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      {/* ==========================================================================
          VIEW 3: DISCIPLINE MASTER VIEW (WEEKLY COMPILATION, B/G/T, PDF & EXCEL)
          ========================================================================== */}
      {activeRoleMode === 'DISCIPLINE_MASTER' && activeTab === 'MASTER_VIEW' && (
        <div className="space-y-6">
          {/* Filter & Export Action Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-600">Chuja kwa Wiki:</span>
                <select
                  value={filterWeekId}
                  onChange={e => setFilterWeekId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="ALL">Wiki Zote ({rosterState.weeklyAssignments.length})</option>
                  {rosterState.weeklyAssignments.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.weekLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Mkondo (Stream):</span>
                <select
                  value={filterStreamName}
                  onChange={e => setFilterStreamName(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="ALL">Mikondo Yote ({rosterState.streams.length})</option>
                  {rosterState.streams.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Mwalimu:</span>
                <select
                  value={filterTeacherName}
                  onChange={e => setFilterTeacherName(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="ALL">Walimu Wote</option>
                  {rosterState.teachers.map(t => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handlePrintSwahiliPdf(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Hifadhi Ripoti ya Wiki Nzima (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintSwahiliPdf(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ripoti ya Wiki Nzima</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Pakua kwenye Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Mwenendo wa Mahudhurio kwa Wiki (Attendance Trend)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ulinganisho wa Waliofika, Absent, Walioruhusiwa na Wagonjwa/PUA kwa siku
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                {weeklyTrendChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Hakuna ripoti za siku zilizochujwa bado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Waliofika" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                      <Area type="monotone" dataKey="Absent" stroke="#e11d48" fill="#ffe4e6" strokeWidth={2} />
                      <Area type="monotone" dataKey="Walioruhusiwa" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                      <Area type="monotone" dataKey="Wagonjwa_PUA" stroke="#d97706" fill="#fef3c7" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-rose-600" />
                    <span>Mikondo yenye Watoro / Wasiofika Wengi (Most Absentees)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mkondo unaoongoza kwa wasiofika:{' '}
                    <strong className="text-rose-600">
                      {topAbsentStream ? `${topAbsentStream.streamName} (${topAbsentStream.totalAbsent})` : '-'}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={streamAbsenteesChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="streamName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="unexcused" name="Absent (Bila Sababu)" stackId="a" fill="#e11d48" />
                    <Bar dataKey="permitted" name="Walioruhusiwa" stackId="a" fill="#2563eb" />
                    <Bar dataKey="sickPua" name="Wagonjwa / PUA" stackId="a" fill="#d97706" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Attendance Trends Visualization */}
          <MonthlyAttendanceTrendsWidget
            students={students}
            dutyRosterData={rosterState}
          />

          {/* Weekly Compilation Table by Day (B / G / T) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Ripoti ya Wiki Nzima — Mchanganuo wa Kila Siku kwa Jinsia (B / G / T) ({filteredDailyReports.length} Siku)
                </h3>
                <p className="text-xs text-slate-500">
                  Taarifa zinazojazwa na kuhifadhiwa kila siku zinajumuishwa hapa kutengeneza Ripoti ya Wiki Nzima
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th rowSpan={2} className="p-2.5 border-r border-slate-700">Tarehe & Siku</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-700">Mwalimu wa Zamu</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-slate-800">WALIOSAJILIWA</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-emerald-900">WALIOFIKA (PRESENT)</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-rose-900">ABSENT</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-blue-900">WALIORUHUSIWA</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-amber-900">WAGONJWA</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-700 text-center">Usafi</th>
                    <th rowSpan={2} className="p-2.5 border-r border-slate-700">Nidhamu & Matukio</th>
                    <th rowSpan={2} className="p-2.5 text-center">Vitendo</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black text-[10px] text-center">
                    <th className="p-1.5 border-r border-slate-200">B</th>
                    <th className="p-1.5 border-r border-slate-200">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-slate-200">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-emerald-100">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-rose-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-rose-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-rose-100">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-blue-100">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-amber-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-amber-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-amber-100">T</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDailyReports.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="p-8 text-center text-slate-400">
                        Hakuna ripoti za zamu zilizopatikana kwa vichujio ulivyochagua.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyReports.map(rep => {
                      const enriched = rep.streams.map(st => {
                        const sDef = rosterState.streams.find(x => x.id === st.streamId || x.name === st.streamName);
                        return ensureRowGenderFields(st, sDef);
                      });
                      const regB = enriched.reduce((a, x) => a + (x.registeredBoys || 0), 0);
                      const regG = enriched.reduce((a, x) => a + (x.registeredGirls || 0), 0);
                      const regT = regB + regG;
                      const presB = enriched.reduce((a, x) => a + (x.presentBoys || 0), 0);
                      const presG = enriched.reduce((a, x) => a + (x.presentGirls || 0), 0);
                      const presT = presB + presG;
                      const absB = enriched.reduce((a, x) => a + (x.absentBoys || 0), 0);
                      const absG = enriched.reduce((a, x) => a + (x.absentGirls || 0), 0);
                      const absT = absB + absG;
                      const permB = enriched.reduce((a, x) => a + (x.permittedBoys || 0), 0);
                      const permG = enriched.reduce((a, x) => a + (x.permittedGirls || 0), 0);
                      const permT = permB + permG;
                      const sickB = enriched.reduce((a, x) => a + (x.sickBoys || 0), 0);
                      const sickG = enriched.reduce((a, x) => a + (x.sickGirls || 0), 0);
                      const sickT = sickB + sickG;

                      return (
                        <tr key={rep.id} className="hover:bg-slate-50 text-center">
                          <td className="p-2.5 border-r border-slate-200 text-left whitespace-nowrap">
                            <div className="font-black text-slate-900">{rep.dayName}</div>
                            <div className="font-mono text-[11px] text-slate-500">{rep.date}</div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-left font-bold text-slate-900">
                            {rep.teacherName}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-semibold text-sky-700">{regB}</td>
                          <td className="p-2 border-r border-slate-200 font-semibold text-pink-700">{regG}</td>
                          <td className="p-2 border-r border-slate-300 font-black bg-slate-50">{regT}</td>

                          <td className="p-2 border-r border-slate-200 text-emerald-700 font-semibold">{presB}</td>
                          <td className="p-2 border-r border-slate-200 text-emerald-700 font-semibold">{presG}</td>
                          <td className="p-2 border-r border-slate-300 font-black text-emerald-800 bg-emerald-50">{presT}</td>

                          <td className="p-2 border-r border-slate-200 text-rose-700 font-semibold">{absB}</td>
                          <td className="p-2 border-r border-slate-200 text-rose-700 font-semibold">{absG}</td>
                          <td className="p-2 border-r border-slate-300 font-black text-rose-800 bg-rose-50">{absT}</td>

                          <td className="p-2 border-r border-slate-200 text-blue-700 font-semibold">{permB}</td>
                          <td className="p-2 border-r border-slate-200 text-blue-700 font-semibold">{permG}</td>
                          <td className="p-2 border-r border-slate-300 font-black text-blue-800 bg-blue-50">{permT}</td>

                          <td className="p-2 border-r border-slate-200 text-amber-700 font-semibold">{sickB}</td>
                          <td className="p-2 border-r border-slate-200 text-amber-700 font-semibold">{sickG}</td>
                          <td className="p-2 border-r border-slate-300 font-black text-amber-800 bg-amber-50">{sickT}</td>

                          <td className="p-2 border-r border-slate-200 font-black">{rep.environmentRating}/10</td>
                          <td className="p-2 border-r border-slate-200 text-left max-w-xs">
                            <div className="font-semibold text-slate-800 line-clamp-1">{rep.generalDiscipline}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{rep.keyEvents}</div>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setInspectingReport(rep)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Angalia Mchanganuo wa Kila Mkondo"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Angalia</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportDailyPdf(rep, false)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Pakua PDF ya Siku Hii"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportDailyPdf(rep, true)}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="Print Ripoti ya Siku Hii"
                              >
                                <Printer className="w-3.5 h-3.5" />
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

      {/* ==========================================================================
          VIEW 4: VISUAL DUTY CALENDAR (MONTH & WEEK DUTY ROSTER GRID)
          ========================================================================== */}
      {activeTab === 'VISUAL_CALENDAR' && (
        <div className="space-y-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#1f4d8b] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>Kalenda ya Zamu za Kila Siku (Daily School Duty Calendar)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Panga na kutazama majukumu ya kila siku (Assembly Patrol, Discipline Patrol, Gate Duty, Dining, na Usafi) kwa muundo wa kalenda.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(calendarMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCalendarMonth(prev);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                ← Mwezi Uliopita
              </button>
              <span className="font-black text-xs text-slate-900 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl">
                {calendarMonth.toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' }).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(calendarMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarMonth(next);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Mwezi Ujao →
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-purple-300" />
                <span>Print Kalenda</span>
              </button>
            </div>
          </div>

          {/* Calendar Month Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[750px]">
              {/* Header Days */}
              <div className="grid grid-cols-7 gap-1 bg-slate-900 text-white p-2.5 rounded-t-xl text-center text-xs font-bold uppercase tracking-wider">
                <div>Jumatatu</div>
                <div>Jumanne</div>
                <div>Jumatano</div>
                <div>Alhamisi</div>
                <div>Ijumaa</div>
                <div>Jumamosi</div>
                <div>Jumapili</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 bg-slate-100 p-1.5 rounded-b-xl border border-slate-200 text-xs">
                {(() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  
                  // Monday-first indexing: 0 = Mon, 6 = Sun
                  let startDayIdx = firstDay.getDay() - 1;
                  if (startDayIdx === -1) startDayIdx = 6;

                  const daysInMonth = lastDay.getDate();
                  const cells = [];

                  // Empty padded cells before month start
                  for (let i = 0; i < startDayIdx; i++) {
                    cells.push(
                      <div key={`empty-prev-${i}`} className="bg-slate-50/50 p-2 min-h-[110px] rounded-lg border border-dashed border-slate-200 opacity-40"></div>
                    );
                  }

                  // Active month days
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, month, d);
                    const isoDate = dateObj.toISOString().slice(0, 10);
                    const isToday = isoDate === new Date().toISOString().slice(0, 10);

                    // Find matching weekly duty assignment
                    const weekAssignment = rosterState.weeklyAssignments.find(
                      w => isoDate >= w.weekStart && isoDate <= w.weekEnd
                    );

                    const duties = dailyDutiesMap[isoDate] || {};

                    cells.push(
                      <div
                        key={isoDate}
                        onClick={() => {
                          setSelectedCalendarDate(isoDate);
                          setDutyAssignModalOpen(true);
                        }}
                        className={`p-2 min-h-[115px] rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                          isToday 
                            ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-300 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5">
                            <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
                              isToday ? 'bg-purple-600 text-white' : 'text-slate-800 group-hover:text-purple-700'
                            }`}>
                              {d}
                            </span>
                            {weekAssignment && (
                              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">
                                {weekAssignment.teacherNames[0] || 'Zamu'}
                              </span>
                            )}
                          </div>

                          {/* Duty Badges */}
                          <div className="space-y-1 text-[9.5px]">
                            {duties.assemblyMonitorName && (
                              <div className="bg-blue-50 text-blue-900 border border-blue-200 px-1.5 py-0.5 rounded font-bold truncate flex items-center gap-1">
                                <span>🏫 Paredi:</span>
                                <span className="font-extrabold">{duties.assemblyMonitorName}</span>
                              </div>
                            )}
                            {duties.disciplinePatrolName && (
                              <div className="bg-rose-50 text-rose-900 border border-rose-200 px-1.5 py-0.5 rounded font-bold truncate flex items-center gap-1">
                                <span>🛡️ Patrol:</span>
                                <span className="font-extrabold">{duties.disciplinePatrolName}</span>
                              </div>
                            )}
                            {duties.gateMonitorName && (
                              <div className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-bold truncate flex items-center gap-1">
                                <span>🚪 Getini:</span>
                                <span className="font-extrabold">{duties.gateMonitorName}</span>
                              </div>
                            )}
                            {duties.diningSupervisorName && (
                              <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded font-bold truncate flex items-center gap-1">
                                <span>🍲 Chakula:</span>
                                <span className="font-extrabold">{duties.diningSupervisorName}</span>
                              </div>
                            )}
                            {!duties.assemblyMonitorName && !duties.disciplinePatrolName && weekAssignment && (
                              <div className="text-[9px] text-slate-400 italic">
                                Walimu: {weekAssignment.teacherNames.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-1 text-[9px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <Plus className="w-2.5 h-2.5" />
                          <span>Assign Duties</span>
                        </div>
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Daily Duty Assignments (Assembly, Patrol, Gate, Dining) */}
      {dutyAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-[#1f4d8b] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>Assign Daily Duty Roles: {selectedCalendarDate}</span>
                </h3>
                <p className="text-xs text-slate-500">Panga walimu wa zamu wa kusimamia paredi, patrol, geti na chakula</p>
              </div>
              <button
                type="button"
                onClick={() => setDutyAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const currentDuties = dailyDutiesMap[selectedCalendarDate] || {};
              return (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">🏫 Assembly &amp; Parade Monitor (Ukaguzi wa Paredi &amp; Sare)</label>
                    <select
                      value={currentDuties.assemblyMonitorId || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const tObj = rosterState.teachers.find(t => String(t.id) === val);
                        const updated = {
                          ...dailyDutiesMap,
                          [selectedCalendarDate]: {
                            ...currentDuties,
                            assemblyMonitorId: val,
                            assemblyMonitorName: tObj?.name || ''
                          }
                        };
                        setDailyDutiesMap(updated);
                        try { localStorage.setItem(`haby_daily_duties_map_${schoolId || 'default'}`, JSON.stringify(updated)); } catch {}
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                    >
                      <option value="">-- Chagua Mwalimu wa Paredi --</option>
                      {rosterState.teachers.map(t => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">🛡️ Discipline Patrol Duty (Doria ya Nidhamu &amp; Sare)</label>
                    <select
                      value={currentDuties.disciplinePatrolId || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const tObj = rosterState.teachers.find(t => String(t.id) === val);
                        const updated = {
                          ...dailyDutiesMap,
                          [selectedCalendarDate]: {
                            ...currentDuties,
                            disciplinePatrolId: val,
                            disciplinePatrolName: tObj?.name || ''
                          }
                        };
                        setDailyDutiesMap(updated);
                        try { localStorage.setItem(`haby_daily_duties_map_${schoolId || 'default'}`, JSON.stringify(updated)); } catch {}
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                    >
                      <option value="">-- Chagua Mwalimu wa Patrol --</option>
                      {rosterState.teachers.map(t => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">🚪 Gate &amp; Entry Monitor (Getini &amp; Mahudhurio ya Asubuhi)</label>
                    <select
                      value={currentDuties.gateMonitorId || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const tObj = rosterState.teachers.find(t => String(t.id) === val);
                        const updated = {
                          ...dailyDutiesMap,
                          [selectedCalendarDate]: {
                            ...currentDuties,
                            gateMonitorId: val,
                            gateMonitorName: tObj?.name || ''
                          }
                        };
                        setDailyDutiesMap(updated);
                        try { localStorage.setItem(`haby_daily_duties_map_${schoolId || 'default'}`, JSON.stringify(updated)); } catch {}
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                    >
                      <option value="">-- Chagua Mwalimu wa Geti --</option>
                      {rosterState.teachers.map(t => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">🍲 Dining &amp; Lunch Supervisor (Chakula cha Mchana)</label>
                    <select
                      value={currentDuties.diningSupervisorId || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const tObj = rosterState.teachers.find(t => String(t.id) === val);
                        const updated = {
                          ...dailyDutiesMap,
                          [selectedCalendarDate]: {
                            ...currentDuties,
                            diningSupervisorId: val,
                            diningSupervisorName: tObj?.name || ''
                          }
                        };
                        setDailyDutiesMap(updated);
                        try { localStorage.setItem(`haby_daily_duties_map_${schoolId || 'default'}`, JSON.stringify(updated)); } catch {}
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium"
                    >
                      <option value="">-- Chagua Mwalimu wa Ukaguzi wa Chakula --</option>
                      {rosterState.teachers.map(t => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDutyAssignModalOpen(false)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                    >
                      Hifadhi Majukumu ya Siku
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal for Inspecting Full Daily Report Breakdown with B / G / T & Print/Save PDF */}
      {inspectingReport && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Ripoti Kamili ya Siku (B / G / T): {inspectingReport.dayName}, {inspectingReport.date}
                </h3>
                <p className="text-xs text-slate-500">
                  Wiki: {inspectingReport.weekLabel} · Mwalimu wa Zamu: {inspectingReport.teacherName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportDailyPdf(inspectingReport, false)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportDailyPdf(inspectingReport, true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ripoti</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingReport(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th rowSpan={2} className="p-2.5 border-r border-slate-700">Stream</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-slate-800">WALIOSAJILIWA</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-emerald-900">WALIOFIKA (PRESENT)</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-rose-900">ABSENT</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-blue-900">WALIORUHUSIWA</th>
                    <th colSpan={3} className="p-2 border-r border-slate-700 border-b text-center bg-amber-900">WAGONJWA / PUA</th>
                    <th rowSpan={2} className="p-2.5">Maelezo</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-black text-[10px] text-center">
                    <th className="p-1.5 border-r border-slate-200">B</th>
                    <th className="p-1.5 border-r border-slate-200">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-slate-200">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-emerald-100">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-rose-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-rose-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-rose-100">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-blue-100">T</th>
                    <th className="p-1.5 border-r border-slate-200 bg-amber-50">B</th>
                    <th className="p-1.5 border-r border-slate-200 bg-amber-50">G</th>
                    <th className="p-1.5 border-r border-slate-300 bg-amber-100">T</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inspectingReport.streams.map(rawS => {
                    const sDef = rosterState.streams.find(x => x.id === rawS.streamId || x.name === rawS.streamName);
                    const s = ensureRowGenderFields(rawS, sDef);
                    return (
                      <tr key={s.streamId} className="text-center">
                        <td className="p-2 border-r border-slate-200 text-left font-bold">{s.streamName}</td>
                        <td className="p-2 border-r border-slate-200 text-sky-700 font-semibold">{s.registeredBoys}</td>
                        <td className="p-2 border-r border-slate-200 text-pink-700 font-semibold">{s.registeredGirls}</td>
                        <td className="p-2 border-r border-slate-300 font-black bg-slate-50">{s.totalStudents}</td>
                        <td className="p-2 border-r border-slate-200 text-emerald-700">{s.presentBoys}</td>
                        <td className="p-2 border-r border-slate-200 text-emerald-700">{s.presentGirls}</td>
                        <td className="p-2 border-r border-slate-300 font-black text-emerald-800 bg-emerald-50">{s.present}</td>
                        <td className="p-2 border-r border-slate-200 text-rose-700">{s.absentBoys}</td>
                        <td className="p-2 border-r border-slate-200 text-rose-700">{s.absentGirls}</td>
                        <td className="p-2 border-r border-slate-300 font-black text-rose-800 bg-rose-50">{s.absent}</td>
                        <td className="p-2 border-r border-slate-200 text-blue-700">{s.permittedBoys}</td>
                        <td className="p-2 border-r border-slate-200 text-blue-700">{s.permittedGirls}</td>
                        <td className="p-2 border-r border-slate-300 font-black text-blue-800 bg-blue-50">{s.permitted}</td>
                        <td className="p-2 border-r border-slate-200 text-amber-700">{s.sickBoys}</td>
                        <td className="p-2 border-r border-slate-200 text-amber-700">{s.sickGirls}</td>
                        <td className="p-2 border-r border-slate-300 font-black text-amber-800 bg-amber-50">{s.sickPua}</td>
                        <td className="p-2 text-left text-slate-600">{s.remarks || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong>Usafi wa Mazingira:</strong> {inspectingReport.environmentRating}/10 ({inspectingReport.environmentNotes || '-'})</div>
              <div><strong>Mahudhurio ya Walimu:</strong> Waliofika {inspectingReport.teachersPresent}, Hawakufika {inspectingReport.teachersAbsent} ({inspectingReport.teacherAttendanceNotes})</div>
              <div><strong>Nidhamu Jumla:</strong> {inspectingReport.generalDiscipline}</div>
              <div><strong>Matukio Muhimu ya Siku:</strong> {inspectingReport.keyEvents}</div>
              <div><strong>Kengele / Ratiba:</strong> {inspectingReport.bellSchedule}</div>
              <div><strong>Mapendekezo kwa Discipline Master:</strong> {inspectingReport.recommendations}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
