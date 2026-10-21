import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  Printer,
  FileText,
  Search,
  Filter,
  Users,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  Download,
  AlertTriangle,
  TrendingUp,
  Award,
  Phone,
  User,
  ExternalLink,
  FileSpreadsheet,
  Building,
  ShieldCheck,
  Database,
  Zap,
  HardDrive,
  CheckCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Info,
  CalendarDays,
  QrCode
} from 'lucide-react';
import { Student, SchoolInfo, UserAccount } from '../../types';
import { HabyEduProLogo } from '../common/HabyEduProLogo';

interface SmartAttendanceModuleProps {
  students: Student[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  onSaveDailyAttendance?: (date: string, records: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>) => void;
  onNavigateToResults?: () => void;
  onNavigateToDiscipline?: (student?: Student) => void;
  onOpenQrModal?: (student?: Student) => void;
}

export interface DetailedAttendanceLog {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  reason?: string;
  time?: string;
  notes?: string;
  markedBy?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SW = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'
];

const ABSENCE_REASONS = [
  'Ugonjwa / Medical',
  'Dharura ya Familia / Family Emergency',
  'Mahitaji ya Shule / Fees & School Needs',
  'Mvua Kubwa / Severe Weather',
  'Kazi za Nyumbani / Domestic Duty',
  'Bila Taarifa / Unexcused',
  'Nyinginezo / Other'
];

export const SmartAttendanceModule: React.FC<SmartAttendanceModuleProps> = ({
  students,
  schoolInfo,
  currentUser,
  dailyAttendance = {},
  onSaveDailyAttendance,
  onNavigateToResults,
  onNavigateToDiscipline,
  onOpenQrModal
}) => {
  const canEdit = currentUser?.role === 'HEADMASTER' || currentUser?.role === 'ACADEMIC' || currentUser?.role === 'TEACHER';

  // Navigation mode
  const [activeMode, setActiveMode] = useState<'daily' | 'monthly_reports' | 'matrix' | 'analytics'>('daily');

  // Daily Logging States
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedStream, setSelectedStream] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessionPeriod, setSessionPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'excused' | 'flagged'>('all');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<number | null>(null);

  // Modals
  const [showDbInfoModal, setShowDbInfoModal] = useState<boolean>(false);
  const [whatsAppModalStudent, setWhatsAppModalStudent] = useState<any | null>(null);
  const [whatsAppCustomText, setWhatsAppCustomText] = useState<string>('');

  // Detailed reasons state mapped: `${date}_${studentId}` -> DetailedAttendanceLog
  const [attendanceDetails, setAttendanceDetails] = useState<Record<string, DetailedAttendanceLog>>(() => {
    try {
      const saved = localStorage.getItem('haby_smart_attendance_details');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Current day's in-memory attendance records: studentId -> status
  const [currentDayRecords, setCurrentDayRecords] = useState<Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return dailyAttendance[todayStr] || {};
  });

  // Keep records synchronized with prop updates & selectedDate changes
  useEffect(() => {
    if (dailyAttendance && dailyAttendance[selectedDate]) {
      setCurrentDayRecords(dailyAttendance[selectedDate]);
    } else {
      setCurrentDayRecords({});
    }
  }, [selectedDate, dailyAttendance]);

  // Save detailed notes to localStorage
  const saveDetailsToStorage = (updated: Record<string, DetailedAttendanceLog>) => {
    setAttendanceDetails(updated);
    try {
      localStorage.setItem('haby_smart_attendance_details', JSON.stringify(updated));
    } catch (e) {}
  };

  // Available classes collected dynamically
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    if (set.size === 0) {
      ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Standard 1', 'Standard 2', 'Standard 7'].forEach(c => set.add(c));
    }
    return Array.from(set).sort();
  }, [students]);

  // Set default class if not set
  useEffect(() => {
    if (availableClasses.length > 0 && (!selectedClass || !availableClasses.includes(selectedClass))) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // Available streams
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    ['A', 'B', 'C', 'D'].forEach(st => set.add(st));
    return Array.from(set).sort();
  }, [students]);

  // Monthly Report States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [previewStudentForSlip, setPreviewStudentForSlip] = useState<Student | null>(null);
  const [customTeacherRemarks, setCustomTeacherRemarks] = useState<Record<number, string>>({});

  // Calculate 3-day consecutive or chronic absences across history
  const chronicAbsenceFlagged = useMemo(() => {
    const flags: Record<number, { count: number; consecutive: number; isChronic: boolean }> = {};
    if (!dailyAttendance) return flags;

    const allDates = Object.keys(dailyAttendance).sort();

    students.forEach(st => {
      let totalAbsences = 0;
      let maxConsecutive = 0;
      let currentConsecutive = 0;

      allDates.forEach(dt => {
        const status = dailyAttendance[dt]?.[st.id];
        if (status === 'ABSENT') {
          totalAbsences++;
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
        } else if (status === 'PRESENT' || status === 'LATE') {
          currentConsecutive = 0;
        }
      });

      flags[st.id] = {
        count: totalAbsences,
        consecutive: maxConsecutive,
        isChronic: maxConsecutive >= 3 || totalAbsences >= 5
      };
    });

    return flags;
  }, [dailyAttendance, students]);

  // Filtered students for selected class and stream
  const classStudents = useMemo(() => {
    const selClassLower = (selectedClass || 'all').toLowerCase();
    const qLower = (searchQuery || '').toLowerCase();
    return (students || []).filter(s => {
      if (!s) return false;
      const sClass = (s.className || '').toLowerCase();
      const matchClass = selClassLower === 'all' || sClass === selClassLower;
      const matchStream = selectedStream === 'all' ||
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      const matchSearch = !qLower ||
        (s.name || '').toLowerCase().includes(qLower) ||
        (s.regNo || '').toLowerCase().includes(qLower);

      const status = currentDayRecords[s.id] || 'PRESENT';
      const isFlagged = chronicAbsenceFlagged[s.id]?.isChronic;

      let matchFilter = true;
      if (statusFilter === 'present') matchFilter = status === 'PRESENT';
      else if (statusFilter === 'absent') matchFilter = status === 'ABSENT';
      else if (statusFilter === 'late') matchFilter = status === 'LATE';
      else if (statusFilter === 'excused') matchFilter = status === 'EXCUSED';
      else if (statusFilter === 'flagged') matchFilter = !!isFlagged;

      return matchClass && matchStream && matchSearch && matchFilter;
    });
  }, [students, selectedClass, selectedStream, searchQuery, statusFilter, currentDayRecords, chronicAbsenceFlagged]);

  // Daily statistics for currently selected class & date
  const dailyTelemetry = useMemo(() => {
    const selClassLower = (selectedClass || 'all').toLowerCase();
    const rawClassList = (students || []).filter(s => {
      if (!s) return false;
      const sClass = (s.className || '').toLowerCase();
      const matchClass = selClassLower === 'all' || sClass === selClassLower;
      const matchStream = selectedStream === 'all' ||
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      return matchClass && matchStream;
    });

    let presentB = 0, presentG = 0;
    let absentB = 0, absentG = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let boysTotal = 0;
    let girlsTotal = 0;

    rawClassList.forEach(st => {
      const isGirl = (st.gender || '').toLowerCase().startsWith('f');
      if (isGirl) girlsTotal++; else boysTotal++;

      const status = currentDayRecords[st.id] || 'PRESENT';

      if (status === 'PRESENT') {
        if (isGirl) presentG++; else presentB++;
      } else if (status === 'ABSENT') {
        if (isGirl) absentG++; else absentB++;
      } else if (status === 'LATE') {
        lateCount++;
        if (isGirl) presentG++; else presentB++;
      } else if (status === 'EXCUSED') {
        excusedCount++;
      }
    });

    const totalStudents = rawClassList.length;
    const totalPresent = presentB + presentG;
    const totalAbsent = absentB + absentG;
    const attendanceRate = totalStudents > 0
      ? Math.round((totalPresent / totalStudents) * 1000) / 10
      : 100;

    return {
      totalStudents,
      boysTotal,
      girlsTotal,
      presentB,
      presentG,
      totalPresent,
      absentB,
      absentG,
      totalAbsent,
      lateCount,
      excusedCount,
      attendanceRate
    };
  }, [students, selectedClass, selectedStream, currentDayRecords]);

  // Toggle or update status for an individual student
  const handleUpdateStudentStatus = (
    studentId: number,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
    reason?: string
  ) => {
    const updated = {
      ...currentDayRecords,
      [studentId]: status
    };
    setCurrentDayRecords(updated);

    const detailKey = `${selectedDate}_${studentId}`;
    const newDetails = {
      ...attendanceDetails,
      [detailKey]: {
        status,
        reason: reason || (status === 'ABSENT' ? 'Bila Taarifa / Unexcused' : undefined),
        time: status === 'LATE' ? '08:15 AM' : undefined,
        markedBy: currentUser?.fullName || 'Mwalimu wa Darasa'
      }
    };
    saveDetailsToStorage(newDetails);

    if (onSaveDailyAttendance) {
      onSaveDailyAttendance(selectedDate, updated);
    }
  };

  // Mark all students in the class
  const handleBatchMark = (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    const updated = { ...currentDayRecords };
    const newDetails = { ...attendanceDetails };

    classStudents.forEach(st => {
      updated[st.id] = status;
      const key = `${selectedDate}_${st.id}`;
      newDetails[key] = {
        status,
        reason: status === 'ABSENT' ? 'Bila Taarifa / Unexcused' : undefined,
        markedBy: currentUser?.fullName || 'Mwalimu wa Darasa'
      };
    });

    setCurrentDayRecords(updated);
    saveDetailsToStorage(newDetails);

    if (onSaveDailyAttendance) {
      onSaveDailyAttendance(selectedDate, updated);
    }

    setSaveSuccessNotice(`✓ Wote wamewekwa ${status === 'PRESENT' ? 'WAPO (Present)' : status === 'ABSENT' ? 'HAWAPO (Absent)' : status}! Data zimehifadhiwa kiotomatiki.`);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  // Manual save roll call confirmation
  const handleExplicitSave = () => {
    const fullRecords: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
    classStudents.forEach(st => {
      fullRecords[st.id] = currentDayRecords[st.id] || 'PRESENT';
    });

    if (onSaveDailyAttendance) {
      onSaveDailyAttendance(selectedDate, fullRecords);
    }

    setSaveSuccessNotice(`✓ Mahudhurio ya tarehe ${selectedDate} kwa ${selectedClass} yamehifadhiwa vizuri kwenye database! Wanafunzi ${classStudents.length} wamerekodiwa.`);
    setTimeout(() => setSaveSuccessNotice(null), 5000);
  };

  // Compute Days in Selected Month
  const monthCalendarData = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const daysList = [];
    let officialSchoolDays = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!isWeekend) {
        officialSchoolDays++;
      }

      daysList.push({
        day,
        dateString,
        isWeekend,
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNameSw: ['Jpili', 'Jtatu', 'Jnne', 'Ttano', 'Alh', 'Ijumaa', 'Jmosi'][dayOfWeek]
      });
    }

    return {
      daysList,
      totalDaysInMonth,
      officialSchoolDays: Math.max(1, officialSchoolDays)
    };
  }, [selectedYear, selectedMonth]);

  // Compute student monthly summaries for all students in class
  const monthlyStudentSummaries = useMemo(() => {
    const summaries: Array<{
      student: Student;
      officialDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      excusedDays: number;
      attendanceRate: number;
      absenceDates: Array<{ date: string; day: number; reason?: string }>;
      evaluation: { text: string; textSw: string; color: string; bg: string; border: string };
    }> = [];

    const { daysList, officialSchoolDays } = monthCalendarData;

    const selClassLower = (selectedClass || 'all').toLowerCase();
    const qLower = (searchQuery || '').toLowerCase();
    const targetList = (students || []).filter(s => {
      if (!s) return false;
      const sClass = (s.className || '').toLowerCase();
      const matchClass = selClassLower === 'all' || sClass === selClassLower;
      const matchStream = selectedStream === 'all' ||
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      const matchSearch = !qLower ||
        (s.name || '').toLowerCase().includes(qLower) ||
        (s.regNo || '').toLowerCase().includes(qLower);
      return matchClass && matchStream && matchSearch;
    });

    targetList.forEach(st => {
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      const absenceDates: Array<{ date: string; day: number; reason?: string }> = [];

      daysList.forEach(({ dateString, isWeekend, day }) => {
        if (isWeekend) return;

        const dayRec = dailyAttendance[dateString]?.[st.id];
        const detailKey = `${dateString}_${st.id}`;
        const detail = attendanceDetails[detailKey];

        if (dayRec === 'ABSENT') {
          absentCount++;
          absenceDates.push({ date: dateString, day, reason: detail?.reason || 'Bila Taarifa' });
        } else if (dayRec === 'LATE') {
          lateCount++;
          presentCount++;
        } else if (dayRec === 'EXCUSED') {
          excusedCount++;
        } else {
          presentCount++;
        }
      });

      const effectivePresent = Math.min(officialSchoolDays, presentCount);
      const rate = officialSchoolDays > 0 ? Math.round((effectivePresent / officialSchoolDays) * 1000) / 10 : 100;

      let evaluation = {
        text: 'Excellent (Model)',
        textSw: 'Kielelezo Bora',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200'
      };
      if (rate < 75) {
        evaluation = {
          text: 'Critical Concern',
          textSw: 'Tahadhari Kubwa',
          color: 'text-rose-700',
          bg: 'bg-rose-50',
          border: 'border-rose-200'
        };
      } else if (rate < 85) {
        evaluation = {
          text: 'Needs Improvement',
          textSw: 'Inahitaji Uangalizi',
          color: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200'
        };
      } else if (rate < 95) {
        evaluation = {
          text: 'Good Attendance',
          textSw: 'Nzuri Sana',
          color: 'text-blue-700',
          bg: 'bg-blue-50',
          border: 'border-blue-200'
        };
      }

      summaries.push({
        student: st,
        officialDays: officialSchoolDays,
        presentDays: effectivePresent,
        absentDays: absentCount,
        lateDays: lateCount,
        excusedDays: excusedCount,
        attendanceRate: rate,
        absenceDates,
        evaluation
      });
    });

    return summaries;
  }, [students, selectedClass, selectedStream, searchQuery, monthCalendarData, dailyAttendance, attendanceDetails]);

  // Open WhatsApp Drawer Modal
  const openWhatsAppModal = (summaryItem: (typeof monthlyStudentSummaries)[0]) => {
    const st = summaryItem.student;
    const monthName = MONTH_NAMES_SW[selectedMonth];
    const parentName = st.parentName || 'Mzazi / Mlezi';
    const schoolName = schoolInfo.name || 'HABY EDU PRO ACADEMY';

    const defaultMsg =
      `*TAARIFA YA MAHUDHURIO YA MWEZI WA ${monthName.toUpperCase()} ${selectedYear}*\n` +
      `Shule: *${schoolName}*\n\n` +
      `Habari ${parentName},\n` +
      `Tafadhali pokea taarifa rasmi ya mahudhurio ya mwanao shuleni:\n\n` +
      `👤 *Mwanafunzi:* ${st.name}\n` +
      `🆔 *Namba ya Usajili:* ${st.regNo}\n` +
      `🏫 *Darasa:* ${st.className} (${st.stream || 'A'})\n\n` +
      `📊 *Takwimu za Mwezi:* \n` +
      `• Siku za Masomo: ${summaryItem.officialDays}\n` +
      `• Siku Alizohudhuria: ${summaryItem.presentDays}\n` +
      `• Siku Alizokosa: ${summaryItem.absentDays}\n` +
      `• Siku Alizochelewa: ${summaryItem.lateDays}\n` +
      `• Wastani wa Mahudhurio: *${summaryItem.attendanceRate}%* (${summaryItem.evaluation.textSw})\n\n` +
      (summaryItem.absentDays > 0
        ? `⚠️ *Sababu za Utoro:* Mwanafunzi amekosa shule tarehe zifuatazo: ${summaryItem.absenceDates.map(a => `${a.day}/${selectedMonth + 1}`).join(', ')}.\n\n`
        : `✨ *Hongera:* Mwanafunzi amehudhuria vipindi vyote bila kukosa!\n\n`) +
      `Maoni ya Mwalimu: ${customTeacherRemarks[st.id] || (summaryItem.attendanceRate >= 95 ? 'Mwanafunzi ana nidhamu bora ya mahudhurio na ushiriki.' : summaryItem.attendanceRate >= 85 ? 'Mahudhurio mazuri, azidishe bidii ya kuwahi shuleni.' : 'Mzazi unaombwa kumuhamasisha mwanafunzi asikose shule bila sababu maalum.')}\n\n` +
      `Mkuu wa Shule - ${schoolInfo.name}`;

    setWhatsAppCustomText(defaultMsg);
    setWhatsAppModalStudent({ ...summaryItem, defaultMsg });
  };

  // Copy SMS Text
  const handleCopySms = (summaryItem: (typeof monthlyStudentSummaries)[0]) => {
    const st = summaryItem.student;
    const monthName = MONTH_NAMES_SW[selectedMonth];
    const text =
      `TAARIFA YA MAHUDHURIO (${monthName} ${selectedYear}): ${st.name} (${st.className}) amehudhuria siku ${summaryItem.presentDays}/${summaryItem.officialDays} (${summaryItem.attendanceRate}%). Alikosa siku ${summaryItem.absentDays}. - ${schoolInfo.name}`;

    navigator.clipboard.writeText(text);
    setCopiedStudentId(st.id);
    setTimeout(() => setCopiedStudentId(null), 3000);
  };

  // Print Official Parent Slip
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="smart-attendance-system">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE STUDIO TOP BANNER (HERO BAR) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0e2540] via-[#163865] to-[#1e4884] rounded-2xl p-6 sm:p-7 text-white shadow-md border border-blue-900/40">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 shadow-xs">
                HABY EDU PRO STUDIO
              </span>
              <span className="text-xs font-semibold text-blue-200">
                {schoolInfo.name || 'Haby High School'}
              </span>
              <span className="text-blue-300" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setShowDbInfoModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/30 transition cursor-pointer"
                title="Bofya kuona maelezo ya Database iliyounganishwa"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Local-First DB Active (0ms)</span>
                <Info className="w-3 h-3 text-emerald-400/70 ml-0.5" />
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Smart Attendance Studio</span>
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              Mfumo kamili wa kisasa wa kurekodi mahudhurio ya kila siku darasani, uchambuzi wa utoro sugu, na utoaji wa ripoti rasmi za mwezi kwa wazazi zenye slip na ujumbe wa WhatsApp.
            </p>
          </div>

          {/* Quick Database & Help Button */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setShowDbInfoModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Maelezo ya Database</span>
            </button>

            {onNavigateToResults && (
              <button
                type="button"
                onClick={onNavigateToResults}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>Matokeo ya Masomo</span>
              </button>
            )}
          </div>
        </div>

        {/* Studio Sub-Navigation Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/25 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveMode('daily')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>1. Kuita Majina Darasani (Daily Roll Call)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('monthly_reports')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeMode === 'monthly_reports'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>2. Ripoti za Mwezi kwa Wazazi (Parent Slips)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('matrix')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <span>3. Jedwali la Mwezi Mzima (Matrix)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('analytics')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeMode === 'analytics'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <span>4. Uchambuzi & Utoro Sugu</span>
            </button>
          </div>

          <div className="text-xs text-blue-200 font-medium">
            Tarehe: <strong className="text-white font-mono">{selectedDate}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED FILTER & CONTROL DECK */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Class Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Building className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">Darasa:</span>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="text-xs font-black text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Stream Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Mkondo:</span>
              <select
                value={selectedStream}
                onChange={e => setSelectedStream(e.target.value)}
                className="text-xs font-black text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Mikondo Yote</option>
                {availableStreams.map(st => (
                  <option key={st} value={st}>Stream {st}</option>
                ))}
              </select>
            </div>

            {/* If Daily Mode: Date Picker & Quick Shortcuts */}
            {activeMode === 'daily' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Tarehe:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition cursor-pointer"
                >
                  Leo
                </button>
              </div>
            )}

            {/* If Monthly/Matrix Mode: Month & Year Selector */}
            {(activeMode === 'monthly_reports' || activeMode === 'matrix' || activeMode === 'analytics') && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Mwezi:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m} ({MONTH_NAMES_SW[idx]})</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tafuta jina au namba ya usajili..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Quick Status Sub-Filter (In Daily Roll Call mode) */}
        {activeMode === 'daily' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Chuja Hali:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Wote ({dailyTelemetry.totalStudents})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('present')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Waliohudhuria ({dailyTelemetry.totalPresent})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('absent')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'absent' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Waliokosa ({dailyTelemetry.totalAbsent})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('late')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'late' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Waliochelewa ({dailyTelemetry.lateCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('flagged')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'flagged' ? 'bg-rose-700 text-white shadow-xs' : 'bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>⚠️ Utoro Sugu</span>
              </button>
            </div>

            {/* Batch Actions & Session */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchMark('PRESENT')}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Weka Wote Wapo</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchMark('ABSENT')}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Weka Wote Hawapo</span>
              </button>

              <button
                type="button"
                onClick={handleExplicitSave}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hifadhi Mahudhurio</span>
              </button>

              {onOpenQrModal && (
                <button
                  type="button"
                  onClick={() => onOpenQrModal()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Generate QR Code</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Success Notice */}
      {saveSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: DAILY CLASS ROLL CALL VIEW */}
      {/* ========================================================================= */}
      {activeMode === 'daily' && (
        <div className="space-y-4">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Enrolled */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waliosajiliwa Darasani</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 font-mono tabular-nums">{dailyTelemetry.totalStudents}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Wavulana: <strong className="text-slate-800 font-mono">{dailyTelemetry.boysTotal}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Wasichana: <strong className="text-slate-800 font-mono">{dailyTelemetry.girlsTotal}</strong></span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* 2. Present Count & Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Waliohudhuria (Present)</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                  {dailyTelemetry.attendanceRate}%
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-emerald-700 font-mono tabular-nums">{dailyTelemetry.totalPresent}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Wav: <strong className="text-emerald-700 font-mono">{dailyTelemetry.presentB}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Was: <strong className="text-emerald-700 font-mono">{dailyTelemetry.presentG}</strong></span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, dailyTelemetry.attendanceRate)}%` }}
                />
              </div>
            </div>

            {/* 3. Absent Count */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Waliokosa (Absent)</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${dailyTelemetry.totalAbsent === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                  {dailyTelemetry.totalAbsent === 0 ? 'ZERO UTORO' : `${dailyTelemetry.totalAbsent} HAWAPO`}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-rose-700 font-mono tabular-nums">{dailyTelemetry.totalAbsent}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Wav: <strong className="text-rose-700 font-mono">{dailyTelemetry.absentB}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Was: <strong className="text-rose-700 font-mono">{dailyTelemetry.absentG}</strong></span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${dailyTelemetry.totalStudents > 0 ? (dailyTelemetry.totalAbsent / dailyTelemetry.totalStudents) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* 4. Late & Excused */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Waliochelewa / Ruhusa</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-amber-700 font-mono tabular-nums">
                  {dailyTelemetry.lateCount + dailyTelemetry.excusedCount}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Kuchelewa: <strong className="text-slate-800 font-mono">{dailyTelemetry.lateCount}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Ruhusa: <strong className="text-slate-800 font-mono">{dailyTelemetry.excusedCount}</strong></span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${dailyTelemetry.totalStudents > 0 ? ((dailyTelemetry.lateCount + dailyTelemetry.excusedCount) / dailyTelemetry.totalStudents) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Student Roll Call Cards Deck */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Orodha ya Wanafunzi ({classStudents.length}) · {selectedClass} ({selectedStream === 'all' ? 'Mikondo Yote' : `Stream ${selectedStream}`})
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">{selectedDate}</span>
            </div>

            {classStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">Hakuna wanafunzi waliopatikana kwa vigezo hivi</h3>
                <p className="text-xs text-slate-500 mt-1">Jaribu kuweka filter ya 'Wote' au chagua darasa jingine.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {classStudents.map((st, index) => {
                  const status = currentDayRecords[st.id] || 'PRESENT';
                  const detailKey = `${selectedDate}_${st.id}`;
                  const detail = attendanceDetails[detailKey];
                  const flag = chronicAbsenceFlagged[st.id];
                  const isGirl = (st.gender || '').toLowerCase().startsWith('f');

                  return (
                    <div
                      key={st.id}
                      className={`p-4 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        status === 'ABSENT'
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                          : status === 'LATE'
                          ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Left: Avatar, Name, Parent Contacts */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0 pt-1 sm:pt-0">
                          {index + 1}.
                        </span>

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 uppercase border shadow-2xs ${
                          isGirl ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {st.name.substring(0, 2)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{st.name}</h4>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {st.regNo}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">({st.gender || 'M'})</span>

                            {/* Chronic Flag */}
                            {flag && flag.isChronic && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewStudentForSlip(st);
                                  setActiveMode('monthly_reports');
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 hover:bg-rose-200 transition cursor-pointer"
                                title="Mwanafunzi amekosa shule mara kadhaa. Bofya kutoa ripoti ya mzazi."
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>⚠️ Utoro Mara {flag.count} · Fungua Slip</span>
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>Mzazi: <strong className="text-slate-700">{st.parentName || 'Haijabainishwa'}</strong></span>
                            </span>

                            {st.parentPhone && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span className="font-mono">{st.parentPhone}</span>
                              </span>
                            )}

                            {status === 'ABSENT' && detail?.reason && (
                              <span className="text-rose-700 font-semibold bg-rose-100/60 px-2 py-0.5 rounded">
                                Sababu: {detail.reason}
                              </span>
                            )}

                            {status === 'LATE' && detail?.time && (
                              <span className="text-amber-800 font-semibold bg-amber-100/60 px-2 py-0.5 rounded">
                                Alifika: {detail.time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Modern Segmented Status Action Group */}
                      <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 shadow-2xs">
                          {/* Present Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(st.id, 'PRESENT')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                              status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Yupo (P)</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(st.id, 'ABSENT')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                              status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-white/60'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Hayupo (A)</span>
                          </button>

                          {/* Late Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(st.id, 'LATE')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                              status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Chelewa (L)</span>
                          </button>

                          {/* Excused Button */}
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentStatus(st.id, 'EXCUSED')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                              status === 'EXCUSED'
                                ? 'bg-blue-600 text-white shadow-xs font-black'
                                : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Ruhusa (E)</span>
                          </button>

                          {onOpenQrModal && (
                            <button
                              type="button"
                              onClick={() => onOpenQrModal(st)}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-1 cursor-pointer ml-1 shadow-2xs"
                              title="Generate Student QR Code (Attendance + Exam Results)"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR</span>
                            </button>
                          )}
                        </div>

                        {/* If Absent: Reason Selector */}
                        {status === 'ABSENT' && (
                          <select
                            value={detail?.reason || 'Bila Taarifa / Unexcused'}
                            onChange={e => handleUpdateStudentStatus(st.id, 'ABSENT', e.target.value)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl focus:outline-none focus:border-rose-400 cursor-pointer shadow-2xs"
                          >
                            {ABSENCE_REASONS.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: MONTHLY ATTENDANCE REPORTS & PARENT SLIPS */}
      {/* ========================================================================= */}
      {activeMode === 'monthly_reports' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Ripoti za Mahudhurio ya Mwezi</span>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-slate-800">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                <span aria-hidden="true">·</span>
                <span>Siku Rasmi za Shule: {monthCalendarData.officialSchoolDays}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Ripoti Rasmi za Wazazi · {selectedClass}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Mfumo unajumuisha takwimu za mwezi mzima na kutengeneza slip rasmi inayoweza kuchapishwa au kutumwa moja kwa moja kwa WhatsApp/SMS ya mzazi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Chapisha Zote za Darasa (Batch Print)</span>
              </button>
            </div>
          </div>

          {/* Student Summaries Grid Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Wanafunzi wa {selectedClass} ({monthlyStudentSummaries.length})</span>
              <span className="font-mono text-slate-500">{MONTH_NAMES_SW[selectedMonth]} {selectedYear}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Mwanafunzi</th>
                    <th className="py-3 px-4">Mzazi / Namba</th>
                    <th className="py-3 px-3 text-center">Siku za Shule</th>
                    <th className="py-3 px-3 text-center text-emerald-700">Amehudhuria</th>
                    <th className="py-3 px-3 text-center text-rose-700">Amekosa</th>
                    <th className="py-3 px-3 text-center text-amber-700">Kuchelewa</th>
                    <th className="py-3 px-3 text-center">Wastani %</th>
                    <th className="py-3 px-3 text-center">Tathmini</th>
                    <th className="py-3 px-4 text-right">Vitendo vya Mzazi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyStudentSummaries.map((item) => {
                    const st = item.student;
                    const isCopied = copiedStudentId === st.id;

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Student Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{st.name}</div>
                          <div className="text-[11px] font-mono text-slate-500 font-semibold">{st.regNo} · {st.gender || 'M'}</div>
                        </td>

                        {/* Parent Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{st.parentName || 'Mzazi / Mlezi'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{st.parentPhone || 'Hakuna namba'}</div>
                        </td>

                        {/* Official Days */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                          {item.officialDays}
                        </td>

                        {/* Attended */}
                        <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/30">
                          {item.presentDays}
                        </td>

                        {/* Absent */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-rose-700">
                          {item.absentDays}
                        </td>

                        {/* Late */}
                        <td className="py-3.5 px-3 text-center font-mono text-amber-700 font-semibold">
                          {item.lateDays}
                        </td>

                        {/* Rate */}
                        <td className="py-3.5 px-3 text-center font-mono font-black text-slate-900 text-sm">
                          {item.attendanceRate}%
                        </td>

                        {/* Standing */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${item.evaluation.bg} ${item.evaluation.color} ${item.evaluation.border}`}>
                            {item.evaluation.textSw}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Parent Slip */}
                            <button
                              type="button"
                              onClick={() => setPreviewStudentForSlip(st)}
                              className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Tazama slip rasmi ya mzazi"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>Slip ya Mzazi</span>
                            </button>

                            {/* WhatsApp Drawer */}
                            <button
                              type="button"
                              onClick={() => openWhatsAppModal(item)}
                              className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Tuma taarifa kwa WhatsApp ya Mzazi"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Copy SMS */}
                            <button
                              type="button"
                              onClick={() => handleCopySms(item)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                              title="Nakili SMS ya kawaida"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: FULL MONTH ATTENDANCE MATRIX VIEW */}
      {/* ========================================================================= */}
      {activeMode === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Jedwali la Mahudhurio ya Mwezi Mzima ({MONTH_NAMES[selectedMonth]} {selectedYear})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kila safu inawakilisha siku 1 hadi {monthCalendarData.totalDaysInMonth} ya mwezi husika kwa darasa la {selectedClass}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> P = Yupo
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> A = Hayupo
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> L = Chelewa
              </span>
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> E = Ruhusa
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] font-bold">
                    <th className="py-2.5 px-3 text-left sticky left-0 bg-slate-100 z-10 min-w-[160px]">Mwanafunzi</th>
                    {monthCalendarData.daysList.map(d => (
                      <th
                        key={d.day}
                        className={`py-2 px-1 min-w-[28px] border-r border-slate-200 ${d.isWeekend ? 'bg-slate-200/60 text-slate-400' : ''}`}
                      >
                        <div>{d.day}</div>
                        <div className="text-[9px] font-normal">{d.dayName[0]}</div>
                      </th>
                    ))}
                    <th className="py-2.5 px-2 bg-emerald-50 text-emerald-800 font-bold min-w-[36px]">P</th>
                    <th className="py-2.5 px-2 bg-rose-50 text-rose-800 font-bold min-w-[36px]">A</th>
                    <th className="py-2.5 px-2 bg-slate-100 font-bold min-w-[48px]">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                  {monthlyStudentSummaries.map((item, idx) => {
                    const st = item.student;

                    return (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-left font-sans font-bold text-slate-800 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200">
                          <span className="truncate block max-w-[150px]" title={st.name}>
                            {idx + 1}. {st.name}
                          </span>
                        </td>

                        {monthCalendarData.daysList.map(d => {
                          if (d.isWeekend) {
                            return (
                              <td key={d.day} className="py-1 px-0.5 bg-slate-100/50 border-r border-slate-100 text-slate-300">
                                -
                              </td>
                            );
                          }

                          const status = dailyAttendance[d.dateString]?.[st.id] || 'PRESENT';

                          return (
                            <td
                              key={d.day}
                              className={`py-1 px-0.5 border-r border-slate-100 font-black ${
                                status === 'ABSENT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : status === 'LATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : status === 'EXCUSED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'text-emerald-700'
                              }`}
                              title={`${st.name} - ${d.dateString}: ${status}`}
                            >
                              {status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'LATE' ? 'L' : 'E'}
                            </td>
                          );
                        })}

                        <td className="py-1 px-1 bg-emerald-50/70 font-bold text-emerald-800">
                          {item.presentDays}
                        </td>
                        <td className="py-1 px-1 bg-rose-50/70 font-bold text-rose-800">
                          {item.absentDays}
                        </td>
                        <td className="py-1 px-1 bg-slate-50 font-black text-slate-900">
                          {item.attendanceRate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: ATTENDANCE INTELLIGENCE & CHRONIC ABSENTEEISM */}
      {/* ========================================================================= */}
      {activeMode === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-lg font-black text-slate-900">
              Uchambuzi wa Utoro Sugu & Ufuatiliaji wa Wazazi (Chronic Absenteeism Radar)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Wanafunzi wenye utoro wa mara 3 mfululizo au zaidi wanaangaziwa hapa kwa ajili ya wito wa wazazi au hatua za kinidhamu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List of Flagged Students */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Wanafunzi Wenye Utoro Mkubwa (High-Risk Students)</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {students.filter(s => chronicAbsenceFlagged[s.id]?.isChronic).length} Wanafunzi
                </span>
              </div>

              {students.filter(s => chronicAbsenceFlagged[s.id]?.isChronic).length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Hongera! Hakuna mwanafunzi mwenye utoro sugu katika kipindi hiki.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.filter(s => chronicAbsenceFlagged[s.id]?.isChronic).map(st => {
                    const flag = chronicAbsenceFlagged[st.id];

                    return (
                      <div key={st.id} className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{st.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {st.className} · Reg: {st.regNo} · Mzazi: {st.parentName || 'Haijabainishwa'} ({st.parentPhone || 'Bila Namba'})
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-700 font-mono px-2 py-0.5 bg-rose-100 rounded-md">
                            Amekosa Mara {flag.count}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewStudentForSlip(st);
                              setActiveMode('monthly_reports');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs cursor-pointer"
                          >
                            Slip ya Mzazi
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attendance Standing Guidelines */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
                Vigezo Rasmi vya Utathmini wa Mahudhurio
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-emerald-900">95% – 100%: Kielelezo Bora (Model Attendance)</span>
                  <span className="text-[11px] text-emerald-700">Tuzo ya Nidhamu</span>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-blue-900">85% – 94%: Nzuri Sana (Good Attendance)</span>
                  <span className="text-[11px] text-blue-700">Kiwango cha Kawaida</span>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-amber-900">75% – 84%: Inahitaji Uangalizi (Needs Monitoring)</span>
                  <span className="text-[11px] text-amber-700">Onyo kwa Mwanafunzi</span>
                </div>
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-rose-900">&lt; 75%: Tahadhari Kubwa (Critical Alert)</span>
                  <span className="text-[11px] text-rose-700">Wito wa Mzazi Shuleni</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DATABASE TRANSPARENCY MODAL */}
      {/* ========================================================================= */}
      {showDbInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Database Yako: Local-First Hybrid</h3>
                  <p className="text-[11px] text-slate-500">HABY EDU PRO High-Performance Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDbInfoModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <p className="font-bold text-emerald-900">⚡ Hakuna Mlolongo wa Kuunganisha (Zero Friction):</p>
                <p className="mt-1 text-emerald-800">
                  Mfumo sasa unatumia teknolojia ya <strong>IndexedDB (`HabyEduDB`) pamoja na LocalStorage</strong> moja kwa moja kwenye browser yako. Huhitaji kuunda tables 12 kwa mkono, wala kuweka API keys au permissions zinazokatika.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Kasi ya Juu (0ms Latency):</strong> Kurekodi mahudhurio, matokeo, na taarifa za wanafunzi kunafanyika papo hapo bila kusubiri seva ya nje.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Uhifadhi wa Kudumu (Persistent):</strong> Data zako zinabaki hata ukifunga kivinjari, ukizima kompyuta au ukiwa bila mtandao (Offline-Ready).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Uoanifu Kamili (Supabase/PostgreSQL Compatible):</strong> Mfumo una muundo sawa na SQL schemas na unaweza kuunganishwa na wingu wakati wowote ukihitaji bila kupoteza data.</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDbInfoModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Nimeelewa, Endelea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. WHATSAPP DIRECT MESSAGE DRAWER / MODAL */}
      {/* ========================================================================= */}
      {whatsAppModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scaleIn">
            {/* WhatsApp Brand Header */}
            <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Tuma Taarifa ya Mzazi (WhatsApp)</h3>
                  <p className="text-[11px] text-emerald-100">
                    Kwa: {whatsAppModalStudent.student.parentName || 'Mzazi'} ({whatsAppModalStudent.student.parentPhone || 'Bila Namba'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModalStudent(null)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Chat Bubble Preview */}
            <div className="p-4 bg-[#efeae2] max-h-80 overflow-y-auto space-y-3">
              <div className="bg-white rounded-xl rounded-tl-none p-3.5 shadow-xs text-xs text-slate-800 space-y-2 max-w-[90%] border border-slate-200">
                <textarea
                  value={whatsAppCustomText}
                  onChange={e => setWhatsAppCustomText(e.target.value)}
                  rows={9}
                  className="w-full text-xs font-sans text-slate-800 bg-transparent focus:outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppCustomText);
                  setCopiedStudentId(whatsAppModalStudent.student.id);
                  setTimeout(() => setCopiedStudentId(null), 3000);
                }}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedStudentId === whatsAppModalStudent.student.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Imenakiliwa!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Nakili Ujumbe</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWhatsAppModalStudent(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Ghairi
                </button>

                <a
                  href={`https://api.whatsapp.com/send?phone=${(whatsAppModalStudent.student.parentPhone || '').replace(/\D/g, '')}&text=${encodeURIComponent(whatsAppCustomText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#25d366] hover:bg-[#20ba59] rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Fungua WhatsApp Sasa</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PRINTABLE OFFICIAL PARENT REPORT CARD SLIP */}
      {/* ========================================================================= */}
      {previewStudentForSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-scaleIn">
            {/* Modal Top Bar */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Slip Rasmi ya Mahudhurio ya Mwezi kwa Mzazi
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Chapisha (Print)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewStudentForSlip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Print-Ready Parent Report Card Body */}
            {(() => {
              const summary = monthlyStudentSummaries.find(s => s.student.id === previewStudentForSlip.id) || monthlyStudentSummaries[0];
              if (!summary) return null;
              const st = summary.student;

              return (
                <div className="p-6 sm:p-7 space-y-5 bg-white text-slate-900 print:p-0" id="official-parent-slip-content">
                  {/* School Crest & Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <HabyEduProLogo size="md" showDomain={false} />
                    </div>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                      {schoolInfo.name || 'HABY EDU PRO ACADEMY'}
                    </h2>
                    <p className="text-xs text-slate-600 italic font-medium">
                      "{schoolInfo.motto || 'Elimu ni Mwanga na Nguvu ya Maisha'}"
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {schoolInfo.address || 'S.L.P 1234, Dar es Salaam'} · Simu: {schoolInfo.phone || '+255 700 000 000'} · Barua Pepe: {schoolInfo.email || 'info@school.ac.tz'}
                    </p>
                    <div className="mt-3 inline-block px-4 py-1 bg-slate-900 text-white rounded-md text-xs font-black uppercase tracking-wider">
                      TAARIFA RASMI YA MAHUDHURIO YA MWEZI KWA MZAZI · {MONTH_NAMES_SW[selectedMonth].toUpperCase()} {selectedYear}
                    </div>
                  </div>

                  {/* Student & Parent Metadata Table */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Jina la Mwanafunzi:</span>
                      <span className="font-black text-slate-900 text-sm">{st.name}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Nambari ya Usajili (Reg No):</span>
                      <span className="font-mono font-black text-slate-900">{st.regNo}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Darasa na Mkondo:</span>
                      <span className="font-bold text-slate-800">{st.className} (Stream {st.stream || 'A'})</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Mzazi / Mlezi & Simu:</span>
                      <span className="font-bold text-slate-800">{st.parentName || 'Mzazi'} · {st.parentPhone || 'Bila Namba'}</span>
                    </div>
                  </div>

                  {/* Monthly Metrics Summary Table */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-center">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Kipengele cha Mahudhurio</th>
                          <th className="py-2.5 px-3">Siku za Shule</th>
                          <th className="py-2.5 px-3 text-emerald-800">Alizohudhuria</th>
                          <th className="py-2.5 px-3 text-rose-800">Alizokosa</th>
                          <th className="py-2.5 px-3 text-amber-800">Alizochelewa</th>
                          <th className="py-2.5 px-3">Wastani %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-xs">
                        <tr>
                          <td className="py-3 px-3 text-left font-sans font-bold text-slate-800">
                            Mwezi wa {MONTH_NAMES_SW[selectedMonth]} {selectedYear}
                          </td>
                          <td className="py-3 px-3 font-bold">{summary.officialDays}</td>
                          <td className="py-3 px-3 font-black text-emerald-700">{summary.presentDays}</td>
                          <td className="py-3 px-3 font-black text-rose-700">{summary.absentDays}</td>
                          <td className="py-3 px-3 font-semibold text-amber-700">{summary.lateDays}</td>
                          <td className="py-3 px-3 font-black text-slate-900 text-sm">{summary.attendanceRate}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Absence Breakdown (if any) */}
                  {summary.absenceDates.length > 0 ? (
                    <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-xs">
                      <span className="font-bold text-rose-800 block mb-1.5">
                        Mchanganuo wa Siku Alizokosa Shule Mwezi Huu ({summary.absenceDates.length}):
                      </span>
                      <div className="space-y-1">
                        {summary.absenceDates.map((abs, aIdx) => (
                          <div key={aIdx} className="flex items-center justify-between text-[11px] text-rose-900">
                            <span>• Tarehe {abs.day} {MONTH_NAMES_SW[selectedMonth]} {selectedYear}</span>
                            <span className="font-semibold italic">Sababu: {abs.reason || 'Bila Taarifa'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Mwanafunzi amehudhuria vipindi vyote vya shule mwezi huu bila kukosa siku yoyote!</span>
                    </div>
                  )}

                  {/* Teacher Remarks */}
                  <div className="text-xs space-y-1.5">
                    <label className="font-bold text-slate-800 block">
                      Maoni ya Mwalimu wa Darasa (Class Teacher Remarks):
                    </label>
                    <input
                      type="text"
                      value={customTeacherRemarks[st.id] ?? (
                        summary.attendanceRate >= 95
                          ? 'Mwanafunzi ana nidhamu nzuri sana ya kuwahi na kuhudhuria masomo bila kukosa.'
                          : summary.attendanceRate >= 85
                          ? 'Mahudhurio mazuri ya kuridhisha, azidishe bidii ya kuwahi asubuhi.'
                          : 'Mzazi anahitajika kufika shuleni kufuatilia sababu za utoro wa mwanafunzi.'
                      )}
                      onChange={e => setCustomTeacherRemarks({ ...customTeacherRemarks, [st.id]: e.target.value })}
                      className="w-full p-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl print:border-none print:p-0 print:font-semibold"
                    />
                  </div>

                  {/* Signatures & School Stamp Area */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Sahihi ya Mwalimu wa Darasa:</p>
                      <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                      <p className="text-[11px] text-slate-500 mt-1">Tarehe: {new Date().toLocaleDateString('sw-TZ')}</p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">Sahihi & Muhuri wa Mkuu wa Shule:</p>
                      <div className="h-10 border-b border-dashed border-slate-400 mt-2 flex items-center justify-center text-slate-300 font-mono text-[10px]">
                        [ MUHURI WA SHULE ]
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{schoolInfo.principal || 'Mwl. Habibu Akida'}</p>
                    </div>
                  </div>

                  {/* Tear-off Parent Acknowledgment Slip */}
                  <div className="pt-4 border-t-2 border-dashed border-slate-400 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2 mb-1 text-slate-400 font-mono">
                      <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                    </div>
                    <p className="font-bold text-slate-800 uppercase tracking-wide">
                      Kipande cha Kurejesha Shuleni (Tear-off Parent Return Slip):
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Mimi mzazi/mlezi wa {st.name} nimepokea na kusoma taarifa hii ya mahudhurio ya mwezi wa {MONTH_NAMES_SW[selectedMonth]} {selectedYear}.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <span>Sahihi ya Mzazi: __________________________</span>
                      </div>
                      <div>
                        <span>Tarehe: ____________________ Simu: _______________</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
