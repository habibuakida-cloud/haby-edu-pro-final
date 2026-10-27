import React, { useState, useEffect, useMemo } from 'react';
import { DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/dbClient';
import { markPeriodAttendance, getPeriodAttendance } from '../lib/dataService';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  CheckSquare,
  Square,
  Printer,
  Download,
  BarChart3,
  Filter,
  CheckCircle2,
  BookOpen,
  Building
} from 'lucide-react';
import { isSameClass } from '../utils/reportCardUtils';

interface DailyTeachingTrackerViewProps {
  currentUser?: any;
  schoolInfo?: any;
  timetableAssignments: any[];
  periodSettings: any[];
  teachers?: any[];
  streamSettings?: any[];
}

interface NormalizedSlot {
  id: string;
  slotKey: string;
  period_number: number;
  period_label: string;
  start_time: string;
  end_time: string;
  class_name: string;
  stream: string;
  subject: string;
  teacher_id?: number;
  teacher_name: string;
  day: string;
}

const SWAHILI_DAYS: Record<string, string> = {
  Monday: 'Jumatatu',
  Tuesday: 'Jumanne',
  Wednesday: 'Jumatano',
  Thursday: 'Alhamisi',
  Friday: 'Ijumaa',
  Saturday: 'Jumamosi',
  Sunday: 'Jumapili'
};

function getWeekdayFromDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return 'Monday';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[d.getDay()];
  // If user picks Saturday/Sunday and school timetable is Mon-Fri, still return actual day or fallback
  return day;
}

function extractPeriodInfo(assignment: any, periodSettings: any[]): { num: number; start: string; end: string; label: string } {
  const rawPeriod = String(assignment.period || assignment.periodName || '');
  const numMatch = rawPeriod.match(/Period\s*(\d+)/i) || rawPeriod.match(/(\d+)/);
  const pNum = assignment.period_number || (numMatch ? parseInt(numMatch[1], 10) : 1);
  const timeMatch = rawPeriod.match(/\(([\d:]+)\s*-\s*([\d:]+)\)/);

  const matchedSetting = periodSettings.find(
    p => p.id === assignment.periodId || p.number === pNum || p.name?.toLowerCase().includes(`period ${pNum}`)
  );

  const start = timeMatch ? timeMatch[1] : (matchedSetting?.startTime || '08:00');
  const end = timeMatch ? timeMatch[2] : (matchedSetting?.endTime || '08:40');
  const label = assignment.periodName || `Period ${pNum}`;

  return { num: pNum, start, end, label };
}

export const DailyTeachingTrackerView: React.FC<DailyTeachingTrackerViewProps> = ({
  currentUser,
  schoolInfo,
  timetableAssignments = [],
  periodSettings = [],
  teachers = [],
  streamSettings = []
}) => {
  const schoolId = currentUser?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID;

  // Sub-tab: 'daily_ticker' (Ufuatiliaji kwa Tarehe) vs 'reports' (Ripoti za Wiki / Mwezi / Muhula)
  const [activeTab, setActiveTab] = useState<'daily_ticker' | 'reports'>('daily_ticker');

  // Selected Date (Defaults to today, or most recent weekday)
  const [todayDate, setTodayDate] = useState<string>(() => {
    const now = new Date();
    // If weekend, default to Friday so timetable immediately shows periods
    if (now.getDay() === 0) now.setDate(now.getDate() - 2);
    if (now.getDay() === 6) now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0];
  });

  const dayName = useMemo(() => getWeekdayFromDate(todayDate), [todayDate]);

  // Class & Stream Filters ('ALL' pulls the entire school's schedule for that day)
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');

  // Local + Remote attendance cache keyed by `${date}__${slotKey}`
  const [historyMap, setHistoryMap] = useState<Record<string, Record<string, {
    status: 'taught' | 'not_taught';
    reason?: string;
    class_name: string;
    stream: string;
    subject: string;
    teacher_name: string;
    period_number: number;
    date: string;
  }>>>(() => {
    try {
      const saved = localStorage.getItem(`haby_daily_teaching_tracker_${schoolId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Report Filter State
  const [reportPeriodType, setReportPeriodType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERM'>('WEEKLY');
  const [reportRefDate, setReportRefDate] = useState<string>(todayDate);
  const [reportMonth, setReportMonth] = useState<string>(todayDate.slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(todayDate);
  const [reportClassFilter, setReportClassFilter] = useState<string>('ALL');
  const [reportTeacherFilter, setReportTeacherFilter] = useState<string>('ALL');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Persist historyMap to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`haby_daily_teaching_tracker_${schoolId}`, JSON.stringify(historyMap));
    } catch {}
  }, [historyMap, schoolId]);

  // Discover distinct classes from timetableAssignments and streamSettings
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    timetableAssignments.forEach(a => {
      if (a.className) set.add(a.className);
    });
    streamSettings.forEach(s => {
      if (s.className) set.add(s.className);
    });
    if (set.size === 0) {
      ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(c => set.add(c));
    }
    return Array.from(set);
  }, [timetableAssignments, streamSettings]);

  // Normalize all timetableAssignments with teacher names and period numbers
  const allNormalizedAssignments: NormalizedSlot[] = useMemo(() => {
    return timetableAssignments.map((a, idx) => {
      const pInfo = extractPeriodInfo(a, periodSettings);
      const matchedTeacher = teachers.find(t => String(t.id) === String(a.teacherId) || t.name === a.teacherName);
      const tName = a.teacherName || matchedTeacher?.name || 'Mwalimu wa Somo';
      const cName = a.className || 'Form 1';
      const strm = a.stream || 'A';
      const slotKey = `${cName}__${strm}__P${pInfo.num}__${a.subject}`;
      return {
        id: a.id || `slot_${idx}`,
        slotKey,
        period_number: pInfo.num,
        period_label: pInfo.label,
        start_time: pInfo.start,
        end_time: pInfo.end,
        class_name: cName,
        stream: strm,
        subject: a.subject || 'Subject',
        teacher_id: a.teacherId,
        teacher_name: tName,
        day: a.day || 'Monday'
      };
    });
  }, [timetableAssignments, periodSettings, teachers]);

  // Slots for the selected Date's Weekday (e.g., if Monday date is chosen, pulls all Monday periods)
  const dayTimetableSlots = useMemo(() => {
    const effectiveDay = ['Saturday', 'Sunday'].includes(dayName) ? 'Monday' : dayName;
    return allNormalizedAssignments
      .filter(slot => {
        const matchDay = slot.day.toLowerCase() === dayName.toLowerCase() ||
          (['Saturday', 'Sunday'].includes(dayName) && slot.day.toLowerCase() === effectiveDay.toLowerCase());
        const matchClass = selectedClass === 'ALL' || isSameClass(slot.class_name, selectedClass);
        const matchStream = selectedStream === 'ALL' || slot.stream.toUpperCase() === selectedStream.toUpperCase();
        const matchTeacher = teacherFilter === 'ALL' || slot.teacher_name.toLowerCase() === teacherFilter.toLowerCase();
        return matchDay && matchClass && matchStream && matchTeacher;
      })
      .sort((a, b) => {
        if (a.period_number !== b.period_number) return a.period_number - b.period_number;
        return `${a.class_name} ${a.stream}`.localeCompare(`${b.class_name} ${b.stream}`);
      });
  }, [allNormalizedAssignments, dayName, selectedClass, selectedStream, teacherFilter]);

  // Fetch remote attendance records for todayDate and merge into historyMap
  useEffect(() => {
    let isMounted = true;
    const loadRemoteForDate = async () => {
      setLoading(true);
      try {
        const targetClasses = selectedClass === 'ALL' ? availableClasses : [selectedClass];
        const fetchedEntries: Record<string, any> = {};

        for (const cls of targetClasses) {
          const remoteData = await getPeriodAttendance(schoolId, todayDate, cls);
          if (Array.isArray(remoteData)) {
            remoteData.forEach((rec: any) => {
              const sKey = `${rec.class_name}__${rec.stream || 'A'}__P${rec.period_number}__${rec.subject}`;
              fetchedEntries[sKey] = {
                status: rec.status,
                reason: rec.reason || '',
                class_name: rec.class_name,
                stream: rec.stream || 'A',
                subject: rec.subject,
                teacher_name: rec.teacher_name || 'Mwalimu',
                period_number: rec.period_number,
                date: todayDate
              };
            });
          }
        }

        if (isMounted && Object.keys(fetchedEntries).length > 0) {
          setHistoryMap(prev => ({
            ...prev,
            [todayDate]: {
              ...(prev[todayDate] || {}),
              ...fetchedEntries
            }
          }));
        }
      } catch (e) {
        // Keep local cache if offline
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRemoteForDate();
    return () => {
      isMounted = false;
    };
  }, [todayDate, selectedClass, schoolId, availableClasses]);

  // Toggle Taught / Untick (Not Taught) for a specific slot
  const handleToggleSlotStatus = async (
    slot: NormalizedSlot,
    status: 'taught' | 'not_taught',
    reason = 'Teacher Absent (Mwalimu hayupo)'
  ) => {
    setSavingId(slot.id);
    const finalReason = status === 'not_taught' ? reason : '';

    // Immediately update local state so UI responds instantaneously
    setHistoryMap(prev => ({
      ...prev,
      [todayDate]: {
        ...(prev[todayDate] || {}),
        [slot.slotKey]: {
          status,
          reason: finalReason,
          class_name: slot.class_name,
          stream: slot.stream,
          subject: slot.subject,
          teacher_name: slot.teacher_name,
          period_number: slot.period_number,
          date: todayDate
        }
      }
    }));

    const payload = {
      date: todayDate,
      day_of_week: dayName,
      period_number: slot.period_number,
      class_name: slot.class_name,
      stream: slot.stream || 'A',
      subject: slot.subject,
      teacher_name: slot.teacher_name,
      status,
      reason: finalReason,
      marked_at: new Date().toISOString()
    };

    try {
      await markPeriodAttendance(schoolId, payload);
    } catch (err) {
      // Stored in localStorage cache as fallback
    } finally {
      setSavingId(null);
    }
  };

  // Summary counts for currently displayed date
  const todaySummary = useMemo(() => {
    const dateRecords = historyMap[todayDate] || {};
    let taughtCount = 0;
    let untaughtCount = 0;
    dayTimetableSlots.forEach(slot => {
      const rec = dateRecords[slot.slotKey];
      // Default is TAUGHT (Ticked) unless explicitly unticked by Mtaaluma
      const status = rec?.status || 'taught';
      if (status === 'not_taught') untaughtCount++;
      else taughtCount++;
    });
    const total = dayTimetableSlots.length;
    const pct = total > 0 ? Math.round((taughtCount / total) * 100) : 100;
    return { total, taughtCount, untaughtCount, pct };
  }, [historyMap, todayDate, dayTimetableSlots]);

  // ============================================================================
  // TEACHING REPORT GENERATOR (KWA SIKU, KWA WIKI, KWA MWEZI, KWA MUHULA)
  // ============================================================================
  const reportDateList = useMemo(() => {
    const dates: string[] = [];
    if (reportPeriodType === 'DAILY') {
      dates.push(reportRefDate);
    } else if (reportPeriodType === 'WEEKLY') {
      const ref = new Date(`${reportRefDate}T12:00:00`);
      const day = ref.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(ref);
      mon.setDate(ref.getDate() + diffToMon);
      for (let i = 0; i < 5; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (reportPeriodType === 'MONTHLY') {
      const [yr, mo] = reportMonth.split('-').map(Number);
      if (yr && mo) {
        const daysInMonth = new Date(yr, mo, 0).getDate();
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          const d = new Date(yr, mo - 1, dayNum, 12, 0, 0);
          if (d.getDay() >= 1 && d.getDay() <= 5) {
            dates.push(d.toISOString().split('T')[0]);
          }
        }
      }
    } else {
      // TERM / Custom Date Range
      const start = new Date(`${reportStartDate}T12:00:00`);
      const end = new Date(`${reportEndDate}T12:00:00`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        const cur = new Date(start);
        let guard = 0;
        while (cur <= end && guard < 120) {
          if (cur.getDay() >= 1 && cur.getDay() <= 5) {
            dates.push(cur.toISOString().split('T')[0]);
          }
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
      }
    }
    return dates;
  }, [reportPeriodType, reportRefDate, reportMonth, reportStartDate, reportEndDate]);

  const teachingReportData = useMemo(() => {
    const teacherStats: Record<string, {
      teacherName: string;
      subjects: Set<string>;
      classes: Set<string>;
      expected: number;
      taught: number;
      untaught: number;
      reasons: string[];
    }> = {};

    const classStats: Record<string, {
      classStream: string;
      expected: number;
      taught: number;
      untaught: number;
    }> = {};

    const untaughtLogs: Array<{
      date: string;
      daySw: string;
      period: number;
      classStream: string;
      subject: string;
      teacherName: string;
      reason: string;
    }> = [];

    let totalExpected = 0;
    let totalTaught = 0;
    let totalUntaught = 0;

    reportDateList.forEach(dStr => {
      const wDay = getWeekdayFromDate(dStr);
      const daySlots = allNormalizedAssignments.filter(slot => {
        const matchDay = slot.day.toLowerCase() === wDay.toLowerCase();
        const matchClass = reportClassFilter === 'ALL' || isSameClass(slot.class_name, reportClassFilter);
        const matchTeacher = reportTeacherFilter === 'ALL' || slot.teacher_name.toLowerCase() === reportTeacherFilter.toLowerCase();
        return matchDay && matchClass && matchTeacher;
      });

      const dateRecs = historyMap[dStr] || {};

      daySlots.forEach(slot => {
        const rec = dateRecs[slot.slotKey];
        const status = rec?.status || 'taught';
        const reason = rec?.reason || 'Teacher Absent';
        const classStreamKey = `${slot.class_name} ${slot.stream}`;

        totalExpected++;
        if (status === 'not_taught') {
          totalUntaught++;
          untaughtLogs.push({
            date: dStr,
            daySw: SWAHILI_DAYS[wDay] || wDay,
            period: slot.period_number,
            classStream: classStreamKey,
            subject: slot.subject,
            teacherName: slot.teacher_name,
            reason
          });
        } else {
          totalTaught++;
        }

        // Teacher stats
        if (!teacherStats[slot.teacher_name]) {
          teacherStats[slot.teacher_name] = {
            teacherName: slot.teacher_name,
            subjects: new Set(),
            classes: new Set(),
            expected: 0,
            taught: 0,
            untaught: 0,
            reasons: []
          };
        }
        const tStat = teacherStats[slot.teacher_name];
        tStat.subjects.add(slot.subject);
        tStat.classes.add(classStreamKey);
        tStat.expected++;
        if (status === 'not_taught') {
          tStat.untaught++;
          if (reason && !tStat.reasons.includes(reason)) tStat.reasons.push(reason);
        } else {
          tStat.taught++;
        }

        // Class stats
        if (!classStats[classStreamKey]) {
          classStats[classStreamKey] = {
            classStream: classStreamKey,
            expected: 0,
            taught: 0,
            untaught: 0
          };
        }
        classStats[classStreamKey].expected++;
        if (status === 'not_taught') classStats[classStreamKey].untaught++;
        else classStats[classStreamKey].taught++;
      });
    });

    return {
      totalExpected,
      totalTaught,
      totalUntaught,
      overallPct: totalExpected > 0 ? Math.round((totalTaught / totalExpected) * 100) : 100,
      teacherRows: Object.values(teacherStats).sort((a, b) => b.untaught - a.untaught || a.teacherName.localeCompare(b.teacherName)),
      classRows: Object.values(classStats).sort((a, b) => a.classStream.localeCompare(b.classStream)),
      untaughtLogs
    };
  }, [reportDateList, allNormalizedAssignments, reportClassFilter, reportTeacherFilter, historyMap]);

  const handleExportReportCSV = () => {
    const headers = ['Mwalimu (Teacher)', 'Masomo (Subjects)', 'Madarasa (Classes)', 'Vipindi Vilivyopangwa (Expected)', 'Vilivyofundishwa (Taught)', 'Ambavyo Havikufundishwa (Untaught)', 'Asilimia (%)', 'Sababu (Reasons)'];
    const rows = teachingReportData.teacherRows.map(r => {
      const pct = r.expected > 0 ? Math.round((r.taught / r.expected) * 100) : 100;
      return [
        `"${r.teacherName}"`,
        `"${Array.from(r.subjects).join(', ')}"`,
        `"${Array.from(r.classes).join(', ')}"`,
        r.expected,
        r.taught,
        r.untaught,
        `${pct}%`,
        `"${r.reasons.join('; ') || '-'}"`
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ripoti_ya_Ufundishaji_${reportPeriodType}_${todayDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ripoti ya Ufundishaji imepakuliwa kwa CSV!');
  };

  return (
    <div className="space-y-6 font-sans">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-700 text-white rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full">
            Academic Master Daily Period Tracker &amp; Reports
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-2">
            Ufuatiliaji wa Vipindi Vilivyofundishwa kwa Tarehe &amp; Ripoti
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl">
            Chagua tarehe yoyote (mfano Jumatatu) na mfumo utavuta ratiba yote ya siku hiyo moja kwa moja. Vipindi vyote vimewekwa tiki (✓) tayari — Mtaaluma <strong>untick</strong> tu vile ambavyo havikufundishwa.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('daily_ticker')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'daily_ticker'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>1. Ufuatiliaji kwa Tarehe (Untick)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'reports'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>2. Ripoti za Ufundishaji (Wiki / Mwezi)</span>
          </button>
        </div>
      </div>

      {activeTab === 'daily_ticker' ? (
        <>
          {/* Date & Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {/* Date Picker (Primary Trigger) */}
              <div>
                <label className="block text-[11px] font-black text-blue-900 uppercase mb-1">
                  1. Chagua Tarehe (Pulls Day Schedule):
                </label>
                <input
                  type="date"
                  value={todayDate}
                  onChange={e => setTodayDate(e.target.value)}
                  className="w-full p-2.5 bg-blue-50 border-2 border-blue-400 rounded-xl font-mono font-black text-xs text-blue-950 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Auto-detected Weekday Badge */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Siku ya Ratiba Iliyovutwa:
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-black text-xs text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    {SWAHILI_DAYS[dayName] || dayName} ({dayName})
                    {['Saturday', 'Sunday'].includes(dayName) ? ' • Ratiba ya Jumatatu' : ''}
                  </span>
                </div>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Chuja Darasa (Class):
                </label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none"
                >
                  <option value="ALL">Shule Nzima (Madarasa Yote)</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Stream Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Mkondo (Stream):
                </label>
                <select
                  value={selectedStream}
                  onChange={e => setSelectedStream(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none"
                >
                  <option value="ALL">Mikondo Yote (All Streams)</option>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                    <option key={s} value={s}>Stream {s}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Chuja Mwalimu (Teacher):
                </label>
                <select
                  value={teacherFilter}
                  onChange={e => setTeacherFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none"
                >
                  <option value="ALL">Walimu Wote</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Day Summary Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-black">
                  Jumla ya Vipindi vya {SWAHILI_DAYS[dayName] || dayName}: {todaySummary.total}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-black flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Vilivyofundishwa (Ticked): {todaySummary.taughtCount}</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 text-xs font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                  <span>Ambavyo Havikufundishwa (Unticked): {todaySummary.untaughtCount}</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 text-xs font-black">
                  Ufanisi wa Siku: {todaySummary.pct}%
                </span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  for (const slot of dayTimetableSlots) {
                    await handleToggleSlotStatus(slot, 'taught', '');
                  }
                  showToast(`Vipindi vyote ${dayTimetableSlots.length} vya tarehe ${todayDate} vimewekwa tiki (Vilifundishwa)!`);
                }}
                disabled={dayTimetableSlots.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Tick Vipindi Vyote (Mark All Taught)</span>
              </button>
            </div>
          </div>

          {/* Period Ticker Table / Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span>
                    Ratiba ya Vipindi vya {SWAHILI_DAYS[dayName] || dayName} — Tarehe {todayDate}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Vipindi vyote vimewekwa tiki (✓ Kilifundishwa). Ondoa tiki (Untick) kwenye kipindi chochote ambacho hakikufundishwa.
                </p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-xl font-black">
                {dayTimetableSlots.length} Vipindi Vimevutwa Kwenye Ratiba
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 font-bold">Inavuta ratiba ya siku ya {SWAHILI_DAYS[dayName] || dayName}...</div>
            ) : dayTimetableSlots.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                Hakuna vipindi vilivyopangwa kwenye ratiba kuu kwa kichujio hiki. Badilisha Darasa kuwa &quot;Shule Nzima&quot; au panga vipindi kwenye moduli ya Timetable.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayTimetableSlots.map(slot => {
                  const dateRecords = historyMap[todayDate] || {};
                  const currentAtt = dateRecords[slot.slotKey] || { status: 'taught', reason: '' };
                  const isTaught = currentAtt.status !== 'not_taught';

                  return (
                    <div
                      key={slot.slotKey}
                      className={`border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition ${
                        isTaught
                          ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                          : 'bg-rose-50/80 border-2 border-rose-400 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Interactive Tick / Untick Checkbox */}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSlotStatus(
                              slot,
                              isTaught ? 'not_taught' : 'taught',
                              currentAtt.reason || 'Teacher Absent (Mwalimu hayupo)'
                            )
                          }
                          title={isTaught ? 'Bonyeza ku-UNTICK kama hakikufundishwa' : 'Bonyeza kuweka TIKI kuwa kilifundishwa'}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black transition cursor-pointer shrink-0 shadow-2xs ${
                            isTaught
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-rose-600 text-white hover:bg-rose-700'
                          }`}
                        >
                          {isTaught ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                        </button>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono font-black">
                              P{slot.period_number} ({slot.start_time}-{slot.end_time})
                            </span>
                            <span className="font-black text-slate-900 text-sm">{slot.subject}</span>
                            <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                              {slot.class_name} • Stream {slot.stream}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4 mt-1 font-semibold">
                            <span className="flex items-center gap-1 text-slate-800">
                              <User className="w-3.5 h-3.5 text-blue-700" />
                              <span>Mwalimu: <strong>{slot.teacher_name}</strong></span>
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Siku: {SWAHILI_DAYS[slot.day] || slot.day} ({todayDate})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex rounded-xl overflow-hidden border border-slate-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleToggleSlotStatus(slot, 'taught', '')}
                            className={`px-3.5 py-2 text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                              isTaught ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>✓ Kilifundishwa (Taught)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSlotStatus(
                                slot,
                                'not_taught',
                                currentAtt.reason || 'Teacher Absent (Mwalimu hayupo)'
                              )
                            }
                            className={`px-3.5 py-2 text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                              !isTaught ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Untick (Hakikufundishwa)</span>
                          </button>
                        </div>

                        {!isTaught && (
                          <select
                            value={currentAtt.reason || 'Teacher Absent (Mwalimu hayupo)'}
                            onChange={e => handleToggleSlotStatus(slot, 'not_taught', e.target.value)}
                            className="p-2 bg-white border-2 border-rose-400 rounded-xl text-xs font-black text-rose-900 outline-none"
                          >
                            <option value="Teacher Absent (Mwalimu hayupo)">Mwalimu Hayupo (Teacher Absent)</option>
                            <option value="Sick (Mwalimu Anaumwa)">Mwalimu Anaumwa (Sick)</option>
                            <option value="Official Permission / Ruhusa">Ruhusa Rasmi (Permitted)</option>
                            <option value="Staff Meeting (Kikao cha Shule)">Kikao cha Shule (Meeting)</option>
                            <option value="School Event / Michezo">Shughuli za Shule / Michezo</option>
                            <option value="Other (Sababu Nyingine)">Sababu Nyingine (Other)</option>
                          </select>
                        )}

                        {savingId === slot.id && (
                          <span className="text-[11px] text-blue-600 font-bold animate-pulse">Inahifadhi...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ============================================================================ */
        /* TAB 2: RIPOTI YA UFUNDISHAJI (KWA SIKU, KWA WIKI, KWA MWEZI, KWA MUHULA)      */
        /* ============================================================================ */
        <div className="space-y-6">
          {/* Report Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Vigezo vya Ripoti ya Ufundishaji (Teaching Coverage Report Filters)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ripoti (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportReportCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel (CSV)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* Report Type */}
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                  Aina ya Ripoti (Report Period):
                </label>
                <select
                  value={reportPeriodType}
                  onChange={e => setReportPeriodType(e.target.value as any)}
                  className="w-full p-2.5 bg-blue-50 border border-blue-300 rounded-xl text-xs font-black text-blue-950"
                >
                  <option value="DAILY">Kwa Siku (Daily Report)</option>
                  <option value="WEEKLY">Kwa Wiki (Weekly Report)</option>
                  <option value="MONTHLY">Kwa Mwezi (Monthly Report)</option>
                  <option value="TERM">Kwa Muhula / Tarehe Maalum (Term / Range)</option>
                </select>
              </div>

              {/* Dynamic Date Selector based on Report Type */}
              {reportPeriodType === 'DAILY' || reportPeriodType === 'WEEKLY' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    {reportPeriodType === 'DAILY' ? 'Tarehe ya Ripoti:' : 'Chagua Tarehe Ndani ya Wiki:'}
                  </label>
                  <input
                    type="date"
                    value={reportRefDate}
                    onChange={e => setReportRefDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              ) : reportPeriodType === 'MONTHLY' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Chagua Mwezi (Month):
                  </label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={e => setReportMonth(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Kuanzia Tarehe:</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={e => setReportStartDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Mpaka Tarehe:</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={e => setReportEndDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                </>
              )}

              {/* Class Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Darasa (Class):</label>
                <select
                  value={reportClassFilter}
                  onChange={e => setReportClassFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="ALL">Madarasa Yote</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Mwalimu (Teacher):</label>
                <select
                  value={reportTeacherFilter}
                  onChange={e => setReportTeacherFilter(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="ALL">Walimu Wote</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Printable Report Sheet */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="text-center border-b border-slate-200 pb-4">
              <h3 className="text-base sm:text-lg font-black uppercase text-slate-900">
                {schoolInfo?.name || 'SHULE YA SEKONDARI'} — RIPOTI YA UFUNDISHAJI WA VIPINDI
              </h3>
              <p className="text-xs font-bold text-blue-800 uppercase mt-1">
                {reportPeriodType === 'DAILY' && `Ripoti ya Siku (${reportRefDate})`}
                {reportPeriodType === 'WEEKLY' && `Ripoti ya Wiki (${reportDateList[0] || ''} hadi ${reportDateList[reportDateList.length - 1] || ''})`}
                {reportPeriodType === 'MONTHLY' && `Ripoti ya Mwezi (${reportMonth}) • Siku za Masomo: ${reportDateList.length}`}
                {reportPeriodType === 'TERM' && `Ripoti ya Muhula (${reportStartDate} hadi ${reportEndDate}) • Siku za Masomo: ${reportDateList.length}`}
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-500">Vipindi Vilivyopangwa</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{teachingReportData.totalExpected}</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-700">Vilivyofundishwa (Taught)</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">{teachingReportData.totalTaught}</div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="text-[10px] font-bold uppercase text-rose-700">Havikufundishwa (Unticked)</div>
                <div className="text-2xl font-black text-rose-900 mt-1">{teachingReportData.totalUntaught}</div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-bold uppercase text-blue-700">Asilimia ya Ufundishaji</div>
                <div className="text-2xl font-black text-blue-900 mt-1">{teachingReportData.overallPct}%</div>
              </div>
            </div>

            {/* Teacher Breakdown Table */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-700" />
                <span>1. Uchambuzi wa Ufundishaji kwa Kila Mwalimu (Teacher Performance Summary)</span>
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px]">
                      <th className="p-3">#</th>
                      <th className="p-3">Jina la Mwalimu</th>
                      <th className="p-3">Masomo</th>
                      <th className="p-3">Madarasa</th>
                      <th className="p-3 text-center">Vilivyopangwa</th>
                      <th className="p-3 text-center">Vilivyofundishwa</th>
                      <th className="p-3 text-center">Havikufundishwa</th>
                      <th className="p-3 text-center">Ufanisi (%)</th>
                      <th className="p-3">Sababu za Kutofundisha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {teachingReportData.teacherRows.map((row, idx) => {
                      const pct = row.expected > 0 ? Math.round((row.taught / row.expected) * 100) : 100;
                      return (
                        <tr key={row.teacherName} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-black text-slate-900">{row.teacherName}</td>
                          <td className="p-3 text-slate-700 font-semibold">{Array.from(row.subjects).join(', ')}</td>
                          <td className="p-3 text-slate-600">{Array.from(row.classes).join(', ')}</td>
                          <td className="p-3 text-center font-mono font-bold">{row.expected}</td>
                          <td className="p-3 text-center font-mono font-black text-emerald-700">{row.taught}</td>
                          <td className="p-3 text-center font-mono font-black text-rose-700">{row.untaught}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              pct >= 85 ? 'bg-emerald-100 text-emerald-900' : pct >= 60 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'
                            }`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="p-3 text-rose-700 font-semibold">{row.reasons.join(', ') || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Class Breakdown Table */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-800 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-700" />
                <span>2. Uchambuzi wa Ufundishaji kwa Madarasa na Mikondo (Class &amp; Stream Summary)</span>
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] border-b border-slate-200">
                      <th className="p-3">Darasa &amp; Mkondo</th>
                      <th className="p-3 text-center">Vipindi Vilivyopangwa</th>
                      <th className="p-3 text-center">Vilivyofundishwa</th>
                      <th className="p-3 text-center">Havikufundishwa</th>
                      <th className="p-3 text-center">Asilimia (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {teachingReportData.classRows.map(cRow => {
                      const pct = cRow.expected > 0 ? Math.round((cRow.taught / cRow.expected) * 100) : 100;
                      return (
                        <tr key={cRow.classStream} className="hover:bg-slate-50">
                          <td className="p-3 font-black text-slate-900">{cRow.classStream}</td>
                          <td className="p-3 text-center font-mono font-bold">{cRow.expected}</td>
                          <td className="p-3 text-center font-mono font-black text-emerald-700">{cRow.taught}</td>
                          <td className="p-3 text-center font-mono font-black text-rose-700">{cRow.untaught}</td>
                          <td className="p-3 text-center font-black text-blue-900">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Untaught Periods Log */}
            {teachingReportData.untaughtLogs.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase text-rose-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>3. Orodha ya Vipindi Ambavyo Havikufundishwa (Unticked Periods Log)</span>
                </h4>
                <div className="overflow-x-auto border border-rose-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-rose-900 text-white uppercase text-[10px]">
                        <th className="p-2.5">Tarehe</th>
                        <th className="p-2.5">Siku</th>
                        <th className="p-2.5">Kipindi</th>
                        <th className="p-2.5">Darasa</th>
                        <th className="p-2.5">Somo</th>
                        <th className="p-2.5">Mwalimu</th>
                        <th className="p-2.5">Sababu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {teachingReportData.untaughtLogs.map((u, i) => (
                        <tr key={i} className="bg-rose-50/40">
                          <td className="p-2.5 font-mono font-bold">{u.date}</td>
                          <td className="p-2.5 font-semibold">{u.daySw}</td>
                          <td className="p-2.5 font-mono font-black">P{u.period}</td>
                          <td className="p-2.5 font-bold">{u.classStream}</td>
                          <td className="p-2.5 font-black text-slate-900">{u.subject}</td>
                          <td className="p-2.5 font-semibold">{u.teacherName}</td>
                          <td className="p-2.5 font-bold text-rose-700">{u.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
