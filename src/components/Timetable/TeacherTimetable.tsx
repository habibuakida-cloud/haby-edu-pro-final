import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, TimetableAssignment, PeriodSetting, InvigilationSession, Supervisor, SchoolInfo } from '../../types';
import { DAYS_OF_WEEK } from '../../constants/defaults';
import { getSubjectColor, getSubjectShortName } from '../../utils/colors';
import { romanize } from '../../utils/classStreamUtils';
import { 
  Clock, 
  BookOpen, 
  User, 
  CheckCircle2, 
  Coffee, 
  Printer, 
  Filter, 
  Calendar, 
  Utensils, 
  Sparkles,
  Download,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Building,
  Share2,
  CalendarCheck,
  AlertCircle,
  Grid,
  Table,
  Layers
} from 'lucide-react';
import { exportTimetablePDF, exportTeacherInvigilationPDF } from '../../utils/timetablePdfExport';
import { exportTeacherTimetableExcel, exportTeacherInvigilationExcel } from '../../utils/timetableExcelExport';
import { isSamePeriod, normalizeStreamName, getConfiguredDays, getPeriodsForDayFromSettings } from '../../lib/timetableService';

export interface TeacherTimetableProps {
  teacher?: Teacher;
  assignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  sessions?: InvigilationSession[];
  invigilationAssignments?: Record<string, number>;
  supervisors?: Supervisor[];
  schoolInfo?: SchoolInfo;
  schoolName?: string;
  defaultScheduleType?: 'teaching' | 'invigilation';
  onNavigateToInvigilation?: () => void;
}

export const TeacherTimetable: React.FC<TeacherTimetableProps> = ({
  teacher,
  assignments = [],
  periodSettings = [],
  sessions = [],
  invigilationAssignments = {},
  supervisors = [],
  schoolInfo,
  schoolName = 'HABY EDUPRO ACADEMY',
  defaultScheduleType = 'teaching',
  onNavigateToInvigilation
}) => {
  const [scheduleType, setScheduleType] = useState<'teaching' | 'invigilation'>(defaultScheduleType);
  const [selectedDayTab, setSelectedDayTab] = useState<string>('All');
  const [invigSessionFilter, setInvigSessionFilter] = useState<string>('ALL');
  const [invigViewMode, setInvigViewMode] = useState<'matrix' | 'cards' | 'master'>('matrix');

  useEffect(() => {
    if (defaultScheduleType) {
      setScheduleType(defaultScheduleType);
    }
  }, [defaultScheduleType]);

  const teacherAssignments = useMemo(() => {
    if (!teacher) return [];
    const tNameLower = (teacher.name || '').trim().toLowerCase();
    const tInitLower = (teacher.initial || '').trim().toLowerCase();
    return (assignments || []).filter(a => {
      if (!a || !a.subject) return false;
      if (a.teacherId !== undefined && Number(a.teacherId) === Number(teacher.id)) return true;
      const aTeacherName = ((a as any).teacherName || (a as any).teacher || '').trim().toLowerCase();
      if (aTeacherName && tNameLower && (aTeacherName === tNameLower || aTeacherName.includes(tNameLower) || tNameLower.includes(aTeacherName))) return true;
      if (aTeacherName && tInitLower && aTeacherName === tInitLower) return true;
      return false;
    });
  }, [assignments, teacher]);

  // Invigilation duties assigned to this specific teacher
  const teacherInvigilationDuties = useMemo(() => {
    if (!teacher || !sessions || sessions.length === 0 || !invigilationAssignments) return [];
    const duties: Array<{
      id: string;
      session: InvigilationSession;
      roomNumber: number;
      roomIndex: number;
      supervisorName?: string;
    }> = [];

    sessions.forEach(sess => {
      const roomCount = sess.rooms || 1;
      for (let r = 0; r < roomCount; r++) {
        const key = `${sess.id}_room${r}`;
        if (Number(invigilationAssignments[key]) === Number(teacher.id)) {
          // Look up designated center supervisor
          const sup = (supervisors || []).find(sp => sp.teacherId !== teacher.id) || (supervisors || [])[0];

          duties.push({
            id: key,
            session: sess,
            roomIndex: r,
            roomNumber: r + 1,
            supervisorName: sup?.name
          });
        }
      }
    });

    // Sort chronologically by date and session
    return duties.sort((a, b) => {
      const dateA = a.session.date || '';
      const dateB = b.session.date || '';
      const dComp = dateA.localeCompare(dateB);
      if (dComp !== 0) return dComp;
      return (a.session.session || '').localeCompare(b.session.session || '');
    });
  }, [teacher, sessions, invigilationAssignments, supervisors]);

  // Check if teacher is appointed as a Supervisor / Msimamizi Mkuu
  const isSupervisor = useMemo(() => {
    if (!teacher || !supervisors || supervisors.length === 0) return false;
    return supervisors.some(s => 
      Number(s.teacherId) === Number(teacher.id) ||
      (s.name && teacher.name && s.name.toLowerCase().includes(teacher.name.toLowerCase())) ||
      (teacher.name && s.name && teacher.name.toLowerCase().includes(s.name.toLowerCase()))
    );
  }, [teacher, supervisors]);

  // Invigilation metrics
  const invigMetrics = useMemo(() => {
    const total = teacherInvigilationDuties.length;
    const session1 = teacherInvigilationDuties.filter(d => d.session.session === 'SESSION I').length;
    const session2 = teacherInvigilationDuties.filter(d => d.session.session === 'SESSION II').length;
    const session3 = teacherInvigilationDuties.filter(d => d.session.session === 'SESSION III').length;
    const uniqueDates = new Set(teacherInvigilationDuties.map(d => d.session.date || d.session.day)).size;
    return { total, session1, session2, session3, uniqueDates };
  }, [teacherInvigilationDuties]);

  // Filtered invigilation duties
  const filteredInvigDuties = useMemo(() => {
    if (invigSessionFilter === 'ALL') return teacherInvigilationDuties;
    return teacherInvigilationDuties.filter(d => d.session.session === invigSessionFilter);
  }, [teacherInvigilationDuties, invigSessionFilter]);

  // Default fallback periods if no periodSettings set in General Timetable
  const DEFAULT_PERIODS: PeriodSetting[] = useMemo(() => [
    { id: 1, day: 'All', name: 'Period 1', start: '08:00', end: '08:40' },
    { id: 2, day: 'All', name: 'Period 2', start: '08:40', end: '09:20' },
    { id: 3, day: 'All', name: 'Morning Break', start: '09:20', end: '09:40' },
    { id: 4, day: 'All', name: 'Period 3', start: '09:40', end: '10:20' },
    { id: 5, day: 'All', name: 'Period 4', start: '10:20', end: '11:00' },
    { id: 6, day: 'All', name: 'Mid Break', start: '11:00', end: '11:20' },
    { id: 7, day: 'All', name: 'Period 5', start: '11:20', end: '12:00' },
    { id: 8, day: 'All', name: 'Period 6', start: '12:00', end: '12:40' },
    { id: 9, day: 'All', name: 'Lunch Break', start: '12:40', end: '13:40' },
    { id: 10, day: 'All', name: 'Period 7', start: '13:40', end: '14:20' },
    { id: 11, day: 'All', name: 'Period 8', start: '14:20', end: '15:00' }
  ], []);

  const configuredDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

  // Workload count per day
  const dailyWorkload = useMemo(() => {
    const summary: Record<string, number> = {};
    configuredDays.forEach(day => {
      const normDay = day.toLowerCase();
      summary[day] = teacherAssignments.filter(a => a && (a.day || '').trim().toLowerCase() === normDay).length;
    });
    return summary;
  }, [teacherAssignments, configuredDays]);

  if (!teacher) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
        <User className="w-10 h-10 mx-auto text-slate-400 mb-2" />
        <p className="font-bold text-sm">Tafadhali chagua mwalimu kutazama ratiba yake.</p>
        <p className="text-xs text-slate-400 mt-1">Please select a teacher to view their individual timetable.</p>
      </div>
    );
  }

  // Retrieve exact periods for a given day from General Timetable
  const getPeriodsForDay = (day: string): PeriodSetting[] => {
    const list = getPeriodsForDayFromSettings(day, periodSettings);
    if (list.length > 0) {
      return list;
    }
    if (!periodSettings || periodSettings.length === 0) {
      return day.toLowerCase() === 'saturday' ? [] : DEFAULT_PERIODS;
    }
    return [];
  };

  const isSpecialPeriod = (period: PeriodSetting): boolean => {
    const name = (period.name || '').toLowerCase();
    const isBreak = Boolean(period.isBreak) || name.includes('break') || name.includes('lunch') || name.includes('mapumziko') || name.includes('chakula') || name.includes('tea');
    const isLockedActivity = (period.isLocked || period.locked) && (
      name.includes('test') || name.includes('environmental') || name.includes('debate') || name.includes('michezo') || name.includes('baraza') || name.includes('assembly') || name.includes('religion') || name.includes('praising')
    );
    return isBreak || isLockedActivity;
  };

  const findAssignmentForSlot = (day: string, period: PeriodSetting): TimetableAssignment | undefined => {
    const normDay = (day || '').trim().toLowerCase();
    return teacherAssignments.find(a => {
      if (!a || (a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, period.name);
    });
  };

  const totalTeachingLessons = teacherAssignments.filter(a =>
    configuredDays.some(d => d.toLowerCase() === (a.day || '').trim().toLowerCase())
  ).length;

  const displayDays = (selectedDayTab === 'All'
    ? configuredDays
    : configuredDays.filter(d => d === selectedDayTab)
  ).filter(day => getPeriodsForDay(day).length > 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTeachingPdf = () => {
    exportTimetablePDF({
      viewMode: 'teacher',
      assignments,
      teachers: [teacher],
      periodSettings,
      streamSettings: [],
      selectedTeacherId: teacher.id,
      orientation: 'landscape'
    });
  };

  const handleDownloadTeachingExcel = () => {
    exportTeacherTimetableExcel({
      schoolName: schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY',
      teacher,
      assignments,
      periodSettings
    });
  };

  const handleDownloadInvigilationPdf = () => {
    exportTeacherInvigilationPDF({
      schoolName: schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY',
      teacher,
      sessions,
      invigilationAssignments,
      schoolInfo
    });
  };

  const handleDownloadInvigilationExcel = () => {
    exportTeacherInvigilationExcel({
      schoolName: schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY',
      teacher,
      sessions,
      invigilationAssignments,
      schoolInfo
    });
  };

  const handleShareInvigilationWhatsApp = () => {
    if (!teacher || teacherInvigilationDuties.length === 0) return;
    const school = schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY';
    let msg = `*${school.toUpperCase()}*\n`;
    msg += `*RATIBA YA USIMAMIZI WA MITIHANI (INVIGILATION TIMETABLE)*\n`;
    msg += `*Mwalimu:* ${teacher.name} (${teacher.initial || '--'})\n`;
    msg += `*Jumla ya Vikao vya Usimamizi:* ${teacherInvigilationDuties.length}\n`;
    msg += `------------------------------------\n`;
    teacherInvigilationDuties.forEach((d, idx) => {
      msg += `*${idx + 1}. ${d.session.day} (${d.session.date})*\n`;
      msg += `• Kipindi: ${d.session.session} (${d.session.time || `${d.session.start} - ${d.session.end}`})\n`;
      msg += `• Somo: ${d.session.subject}\n`;
      msg += `• Darasa & Mkondo: ${d.session.className} ${d.session.stream || ''}\n`;
      msg += `• Chumba: Room ${d.roomNumber}\n`;
      if (d.supervisorName) {
        msg += `• Msimamizi Mkuu: ${d.supervisorName}\n`;
      }
      msg += `\n`;
    });
    msg += `Tafadhali fika chumba cha mtihani dakika 15 kabla ya muda wa mtihani kuanza. Kazi njema!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="teacher-timetable-container" className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 master-timetable-container">
      {/* Header with teacher profile & load badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 font-black text-lg flex items-center justify-center border border-blue-200 shadow-2xs">
            {teacher.initial || teacher.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                {teacher.name}
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {teacher.schoolRole || 'Teacher'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
              <span>Masomo: <strong className="text-slate-700">{teacher.subjects?.join(', ') || 'N/A'}</strong></span>
              <span>•</span>
              <span>Madarasa: <strong className="text-slate-700">{teacher.teachingStreams?.join(', ') || 'Zote'}</strong></span>
            </p>
          </div>
        </div>

        {/* Workload badges, Download & Print buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {scheduleType === 'teaching' ? (
            <>
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vipindi Wiki</span>
                <span className="text-sm font-black text-slate-900">{totalTeachingLessons}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Kiwango</span>
                <span className="text-sm font-black text-emerald-800">
                  {teacher.maxPeriodsPerWeek ? `${totalTeachingLessons}/${teacher.maxPeriodsPerWeek}` : `${totalTeachingLessons} Ls`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTeachingPdf}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
                title="Download Teacher Timetable as A4 Landscape PDF using jsPDF"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTeachingExcel}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
                title="Pakua Ratiba ya Mwalimu kwenye Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Pakua Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer"
                title="Chapa Ratiba ya Mwalimu"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chapa Ratiba</span>
              </button>
            </>
          ) : (
            <>
              <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-indigo-500 block">Vikao vya Mitihani</span>
                <span className="text-sm font-black text-indigo-900">{teacherInvigilationDuties.length}</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadInvigilationPdf}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
                title="Pakua Ratiba ya Usimamizi ya Mwalimu kama PDF ya A4"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadInvigilationExcel}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
                title="Pakua Ratiba ya Usimamizi kwenye Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={handleShareInvigilationWhatsApp}
                className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
                title="Tuma Ratiba ya Usimamizi kwenye WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer"
                title="Chapa Ratiba ya Usimamizi"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chapa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* SCHEDULE TYPE SWITCHER: Teaching Timetable vs Exam Invigilation Schedule */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 text-xs print:hidden">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setScheduleType('teaching')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              scheduleType === 'teaching'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Ratiba ya Masomo (Teaching Timetable)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              scheduleType === 'teaching' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {totalTeachingLessons} Ls
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScheduleType('invigilation')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              scheduleType === 'invigilation'
                ? 'bg-[#1f4d8b] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Ratiba ya Usimamizi wa Mitihani (Invigilation)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              scheduleType === 'invigilation'
                ? 'bg-amber-400 text-slate-950'
                : teacherInvigilationDuties.length > 0
                ? 'bg-amber-100 text-amber-900 font-black'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {teacherInvigilationDuties.length} Vikao
            </span>
          </button>
        </div>

        {scheduleType === 'teaching' && teacherInvigilationDuties.length > 0 && (
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Ana vikao <strong>{teacherInvigilationDuties.length}</strong> vya usimamizi wa mitihani!</span>
            </span>
            <button
              type="button"
              onClick={() => setScheduleType('invigilation')}
              className="text-blue-700 hover:text-blue-900 underline font-black cursor-pointer text-[11px]"
            >
              Tazama &rarr;
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW A: TEACHING TIMETABLE VIEW                          */}
      {/* ======================================================== */}
      {scheduleType === 'teaching' && (
        <div className="space-y-6">
          {/* Day Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" /> Siku:
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayTab('All')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  selectedDayTab === 'All'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Siku Zote ({configuredDays.length})
              </button>
              {configuredDays.map(d => {
                const isSelected = selectedDayTab === d;
                const count = dailyWorkload[d] || 0;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDayTab(d)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {d} ({count})
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-medium text-slate-500 hidden md:block">
              Vipindi halisi kwa kila siku kutoka kwenye Ratiba Kuu
            </div>
          </div>

          {/* Days Grid */}
          <div className="space-y-4">
            {displayDays.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm">Hakuna vipindi vilivyowekwa kwa siku hii.</p>
              </div>
            ) : displayDays.map(day => {
              const periodsForDay = getPeriodsForDay(day);
              const dayTotalLessons = dailyWorkload[day] || 0;

              return (
                <div key={day} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  {/* Day header banner */}
                  <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs uppercase tracking-wider text-slate-800">
                        {day}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        ({periodsForDay.length} Periods Sanifu)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Vipindi vya Kufundisha:</span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {dayTotalLessons}
                      </span>
                    </div>
                  </div>

                  {/* Period cells */}
                  <div className="p-3 bg-white overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                      {periodsForDay.map(period => {
                        const isSpecial = isSpecialPeriod(period);
                        const assignment = findAssignmentForSlot(day, period);
                        const subColor = assignment ? getSubjectColor(assignment.subject) : null;

                        return (
                          <div
                            key={`${day}-${period.id || period.name}`}
                            className={`w-32 rounded-xl p-2.5 flex flex-col justify-between border transition text-center shrink-0 ${
                              isSpecial
                                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                : assignment
                                ? 'bg-white border-blue-200 shadow-2xs hover:border-blue-400'
                                : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400'
                            }`}
                          >
                            {/* Period name and time */}
                            <div className="pb-1 mb-1 border-b border-slate-100 text-center">
                              <span className="text-[10px] font-bold block text-slate-600 truncate uppercase">
                                {period.name}
                              </span>
                              <span className="text-[9px] font-mono font-medium text-slate-400 block">
                                {period.start && period.end ? `${period.start} - ${period.end}` : '--:--'}
                              </span>
                            </div>

                            {/* Content */}
                            <div className="min-h-[56px] flex flex-col justify-center items-center">
                              {isSpecial ? (
                                <div className="py-2 flex flex-col items-center justify-center">
                                  {period.isLocked || period.locked ? (
                                    <Lock className="w-4 h-4 mb-1 text-blue-600" />
                                  ) : (
                                    <Coffee className="w-4 h-4 mb-1 text-amber-600" />
                                  )}
                                  <span className="text-[10px] font-black leading-tight uppercase tracking-wide">
                                    {period.name}
                                  </span>
                                  {!(period.name.toLowerCase().includes('break') || period.name.toLowerCase().includes('lunch') || period.name.toLowerCase().includes('mapumziko') || period.name.toLowerCase().includes('chakula')) && (
                                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">LOCKED ACTIVITY</span>
                                  )}
                                </div>
                              ) : assignment ? (
                                <div className="space-y-1 w-full">
                                  <div
                                    className="px-2 py-1 rounded-md text-[11px] font-black tracking-tight truncate shadow-2xs"
                                    style={{
                                      backgroundColor: subColor?.bg || '#dbeafe',
                                      color: subColor?.text || '#1e40af',
                                      border: `1px solid ${subColor?.border || '#93c5fd'}`
                                    }}
                                    title={assignment.subject}
                                  >
                                    {getSubjectShortName(assignment.subject)}
                                  </div>
                                  <div className="text-[11px] font-black text-slate-800 truncate">
                                    {(() => {
                                      const numMatch = (assignment.className || '').replace(/[^0-9]/g, '');
                                      const romanPart = numMatch ? romanize(parseInt(numMatch, 10)) : (assignment.className || '').replace(/Form\s*/i, '').trim();
                                      const streamPart = normalizeStreamName(assignment.stream).toUpperCase();
                                      return `${romanPart}${streamPart && streamPart !== 'ALL' ? streamPart : ''}`;
                                    })()}
                                  </div>
                                  {assignment.room && (
                                    <div className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-1 rounded">
                                      Rm: {assignment.room}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-3 flex flex-col items-center justify-center text-slate-300 select-none">
                                  <span className="text-[10px] font-bold text-slate-400">Huru</span>
                                  <span className="text-[9px] text-slate-300">Free Period</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Footer */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Ratiba ya vipindi na nyakati imeunganishwa moja kwa moja kutoka kwenye Ratiba Kuu (General Timetable).
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
              <span>Jumla ya Vipindi vya Kufundisha: <strong className="text-slate-900">{totalTeachingLessons}</strong></span>
              <span>•</span>
              <span>Mwalimu: <strong className="text-slate-900">{teacher.name}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW B: INVIGILATION TIMETABLE VIEW (RATIBA YA USIMAMIZI) */}
      {/* ======================================================== */}
      {scheduleType === 'invigilation' && (
        <div id="personal-invig-print" className="space-y-6">
          {/* Supervisor Status Banner */}
          {isSupervisor && (
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-amber-400/50 shadow-md space-y-2 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl font-black shrink-0 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-amber-300 uppercase tracking-tight">
                        🛡️ WEWE NI MSIMAMIZI MKUU (CENTER EXAM SUPERVISOR)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                        OFFICIAL SUPERVISOR
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium mt-0.5">
                      Mwalimu <strong className="text-white">{teacher.name}</strong>, umesajiliwa na kupangiwa kama Msimamizi Mkuu wa Mitihani katika kituo hiki cha mtihani. Unawajibika kusimamia uendeshaji mzima wa mitihani, ufunguzi wa bahasha, na kuongoza wasimamizi wote wa vyumba.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invigilation Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{invigMetrics.total}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jumla ya Vikao</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{invigMetrics.session1}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asubuhi (Sess I)</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-800 rounded-xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{invigMetrics.session2 + invigMetrics.session3}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mchana / Jioni</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{invigMetrics.uniqueDates}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Siku za Usimamizi</div>
              </div>
            </div>
          </div>

          {/* Session Filter & View Mode Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" /> Kikao:
              </span>
              <button
                type="button"
                onClick={() => setInvigSessionFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  invigSessionFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Vikao Vyote ({teacherInvigilationDuties.length})
              </button>
              <button
                type="button"
                onClick={() => setInvigSessionFilter('SESSION I')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  invigSessionFilter === 'SESSION I'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Session I - Asubuhi ({invigMetrics.session1})
              </button>
              <button
                type="button"
                onClick={() => setInvigSessionFilter('SESSION II')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  invigSessionFilter === 'SESSION II'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Session II - Mchana ({invigMetrics.session2})
              </button>
              {invigMetrics.session3 > 0 && (
                <button
                  type="button"
                  onClick={() => setInvigSessionFilter('SESSION III')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                    invigSessionFilter === 'SESSION III'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Session III - Jioni ({invigMetrics.session3})
                </button>
              )}
            </div>

            {/* View Mode Switcher: Examination Hall Matrix, Matrix Master Table, Card View */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">View:</span>
              <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 text-xs font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setInvigViewMode('matrix')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    invigViewMode === 'matrix' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Examination Hall Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvigViewMode('master')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    invigViewMode === 'master' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Matrix Master Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvigViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    invigViewMode === 'cards' ? 'bg-[#0f2948] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Card View</span>
                </button>
              </div>
            </div>
          </div>

          {/* Invigilation Schedule Views: Examination Hall Matrix / Matrix Master Table / Card View */}
          {filteredInvigDuties.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-700 font-bold text-sm">
                  Hakuna vipindi vya usimamizi wa mitihani vilivyopangwa kwa mwalimu huyu.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {teacher.name} hajapangiwa chumba cha mtihani kwa kipindi hiki. Ratiba ikipangwa katika Moduli ya Usimamizi (Invigilation), itaonekana hapa kiotomatiki.
                </p>
              </div>
              {onNavigateToInvigilation && (
                <button
                  type="button"
                  onClick={onNavigateToInvigilation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Fungua Moduli ya Usimamizi (Invigilation Module)
                </button>
              )}
            </div>
          ) : invigViewMode === 'master' ? (
            /* ================================================================== */
            /* VIEW 1: MATRIX MASTER TABLE                                        */
            /* ================================================================== */
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-[#0f2948] p-4 text-white flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Matrix Master Table — {teacher.name} ({teacher.initial || '--'})
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Jedwali kuu la usimamizi wa mitihani likionyesha chumba chako pamoja na Matrix ya Vyumba vyote (Room 1 – Room 7)
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-white/15 text-amber-300 text-xs font-black">
                  {filteredInvigDuties.length} Vikao vya Usimamizi
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] text-slate-700 font-black uppercase tracking-wider">
                      <th className="p-3 border-r border-slate-200 text-center w-10">#</th>
                      <th className="p-3 border-r border-slate-200 min-w-[125px]">Tarehe & Siku</th>
                      <th className="p-3 border-r border-slate-200 min-w-[115px]">Kipindi & Muda</th>
                      <th className="p-3 border-r border-slate-200 min-w-[155px]">Somo & Darasa</th>
                      <th className="p-3 border-r border-slate-200 text-center min-w-[110px] bg-amber-50 text-amber-950">Chumba Chako</th>
                      {[1, 2, 3, 4, 5, 6, 7].map(r => (
                        <th key={r} className="p-3 border-r border-slate-200 text-center min-w-[90px]">
                          Room {r}
                        </th>
                      ))}
                      <th className="p-3 text-center min-w-[115px]">Msimamizi Mkuu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvigDuties.map((duty, idx) => {
                      const sess = duty.session;
                      const subCol = getSubjectColor(sess.subject);
                      return (
                        <tr
                          key={duty.id}
                          className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors"
                        >
                          <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                            <div className="text-xs text-slate-900 uppercase">{sess.day}</div>
                            <div className="text-[10px] font-mono text-slate-500">{sess.date}</div>
                          </td>
                          <td className="p-3 border-r border-slate-200">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              sess.session === 'SESSION I'
                                ? 'bg-sky-100 text-sky-900 border border-sky-200'
                                : sess.session === 'SESSION II'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}>
                              {sess.session}
                            </span>
                            <div className="text-[10px] font-mono font-bold text-slate-600 mt-1">
                              {sess.time || `${sess.start || ''} - ${sess.end || ''}`}
                            </div>
                          </td>
                          <td className="p-3 border-r border-slate-200">
                            <span
                              style={{
                                backgroundColor: subCol.bg,
                                color: subCol.text,
                                borderColor: subCol.border
                              }}
                              className="px-2 py-0.5 rounded-md border text-[11px] font-black inline-block mb-1"
                            >
                              {sess.subject}
                            </span>
                            <div className="text-[10px] font-bold text-slate-700">
                              {sess.className} {sess.stream && sess.stream !== 'ALL' ? `• ${sess.stream}` : ''}
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center bg-amber-50/40">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[11px] shadow-2xs inline-block">
                              ROOM {duty.roomNumber}
                            </span>
                          </td>
                          {[0, 1, 2, 3, 4, 5, 6].map(rIdx => {
                            const isRequired = rIdx < (sess.rooms || 1);
                            const isMyRoom = rIdx === duty.roomIndex;
                            const assignedTid = invigilationAssignments[`${sess.id}_room${rIdx}`];
                            return (
                              <td key={rIdx} className="p-1.5 border-r border-slate-200 text-center">
                                {isRequired ? (
                                  <div
                                    className={`p-1.5 rounded-lg border text-[10px] min-h-[42px] flex flex-col justify-center items-center ${
                                      isMyRoom
                                        ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-amber-400 font-black shadow-2xs'
                                        : assignedTid
                                        ? 'bg-slate-100 border-slate-200 text-slate-600 font-bold'
                                        : 'bg-amber-50/50 border-dashed border-amber-200 text-amber-700'
                                    }`}
                                  >
                                    {isMyRoom ? (
                                      <>
                                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                                          {teacher.initial || 'YOU'}
                                        </span>
                                        <span className="text-[10px] font-black mt-0.5">Room {rIdx + 1}</span>
                                      </>
                                    ) : assignedTid ? (
                                      <span>Occupied</span>
                                    ) : (
                                      <span>Open</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center text-slate-700 font-bold text-[11px]">
                            {duty.supervisorName || 'Msimamizi wa Kituo'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : invigViewMode === 'matrix' ? (
            /* ================================================================== */
            /* VIEW 2: EXAMINATION HALL MATRIX (GROUPED BY DAY WITH HALL MATRIX)  */
            /* ================================================================== */
            <div className="space-y-5">
              {(() => {
                const groupedByDay: Record<string, typeof filteredInvigDuties> = {};
                filteredInvigDuties.forEach(d => {
                  const key = `${d.session.rawDate || d.session.date}__${d.session.day}__${d.session.date}`;
                  if (!groupedByDay[key]) groupedByDay[key] = [];
                  groupedByDay[key].push(d);
                });

                return Object.entries(groupedByDay).map(([dateKey, dayDuties]) => {
                  const [_raw, dayName, formattedDate] = dateKey.split('__');
                  const supName = dayDuties[0]?.supervisorName || 'Msimamizi Mkuu';

                  return (
                    <div key={dateKey} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                      <div className="bg-gradient-to-r from-[#0f2948] to-[#1f4d8b] px-5 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="p-1.5 rounded-lg bg-white/15 text-amber-300">
                            <Calendar className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
                              <span>{dayName}</span>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-bold">
                                {formattedDate}
                              </span>
                            </div>
                            <span className="text-[11px] text-blue-200 font-medium">
                              Examination Hall Matrix • {dayDuties.length} Kikao cha Usimamizi
                            </span>
                          </div>
                        </div>

                        <div className="text-xs font-semibold bg-white/15 px-3 py-1 rounded-xl flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                          <span>SUPERVISOR:</span>
                          <strong className="text-white">{supName}</strong>
                        </div>
                      </div>

                      <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse text-xs bg-white rounded-xl overflow-hidden border border-slate-200">
                          <thead>
                            <tr className="bg-[#0f2948] text-white font-bold uppercase text-[11px] tracking-wider">
                              <th className="p-2.5 border-r border-slate-700 w-32">Session Slot</th>
                              <th className="p-2.5 border-r border-slate-700 w-28">Time</th>
                              <th className="p-2.5 border-r border-slate-700">Exam Subject</th>
                              <th className="p-2.5 border-r border-slate-700 w-36">Class & Stream</th>
                              {[1, 2, 3, 4, 5, 6, 7].map(r => (
                                <th key={r} className="p-2.5 border-r border-slate-700 text-center min-w-[92px]">
                                  Room {r}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dayDuties.map(duty => {
                              const session = duty.session;
                              const subCol = getSubjectColor(session.subject);
                              return (
                                <tr key={duty.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                  <td className="p-2.5 border-r border-slate-200 font-bold">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      session.session === 'SESSION I'
                                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                        : session.session === 'SESSION II'
                                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                        : 'bg-purple-100 text-purple-900 border border-purple-200'
                                    }`}>
                                      {session.session}
                                    </span>
                                  </td>
                                  <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                                    {session.time || `${session.start} - ${session.end}`}
                                  </td>
                                  <td className="p-2.5 border-r border-slate-200">
                                    <span
                                      style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                                      className="px-2 py-0.5 rounded-md border font-bold text-[11px] inline-block"
                                    >
                                      {session.subject}
                                    </span>
                                  </td>
                                  <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">
                                    <div>{session.className}</div>
                                    <span className="text-[10px] font-semibold text-blue-700">
                                      {session.stream}
                                    </span>
                                  </td>
                                  {[0, 1, 2, 3, 4, 5, 6].map(rIdx => {
                                    const isRequired = rIdx < (session.rooms || 1);
                                    const isMyRoom = rIdx === duty.roomIndex;
                                    const assignedTid = invigilationAssignments[`${session.id}_room${rIdx}`];
                                    return (
                                      <td key={rIdx} className="p-2 border-r border-slate-200 text-center align-middle">
                                        {isRequired ? (
                                          <div
                                            className={`p-1.5 rounded-lg border text-xs transition-all ${
                                              isMyRoom
                                                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-amber-400 shadow-sm font-black'
                                                : assignedTid
                                                ? 'bg-slate-100 border-slate-200 text-slate-600'
                                                : 'bg-amber-50/70 border-dashed border-amber-300 text-amber-800'
                                            }`}
                                          >
                                            {isMyRoom ? (
                                              <div className="flex items-center justify-center gap-1.5">
                                                <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 inline-flex items-center justify-center font-black text-[10px] shadow-2xs">
                                                  {teacher.initial || 'ME'}
                                                </span>
                                                <span className="font-black text-white text-[10px] truncate max-w-[65px]">
                                                  {teacher.name.split(' ')[0]}
                                                </span>
                                              </div>
                                            ) : assignedTid ? (
                                              <span className="text-[10px] font-semibold text-slate-500">Assigned</span>
                                            ) : (
                                              <span className="text-[10px] font-bold text-amber-700">Open</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 font-light">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            /* ================================================================== */
            /* VIEW 3: CARD VIEW                                                  */
            /* ================================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvigDuties.map(duty => {
                const s = duty.session;
                const subCol = getSubjectColor(s.subject);
                return (
                  <div
                    key={duty.id}
                    className="bg-white border border-emerald-300 ring-1 ring-emerald-100 rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                        s.session === 'SESSION I' ? 'bg-blue-100 text-blue-900' :
                        s.session === 'SESSION II' ? 'bg-indigo-100 text-indigo-900' :
                        'bg-purple-100 text-purple-900'
                      }`}>
                        {s.session}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {s.time || `${s.start} - ${s.end}`}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.day} • {s.date}</div>
                        <h4 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                          <span
                            style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                            className="px-2.5 py-1 rounded-lg border text-xs font-bold"
                          >
                            {s.subject}
                          </span>
                        </h4>
                      </div>

                      <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs shrink-0">
                        ROOM {duty.roomNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                      <span>Class/Stream: <strong className="text-blue-700">{s.className} ({s.stream})</strong></span>
                      <span>Total Halls: <strong className="text-indigo-700">{s.rooms || 1} Rooms</strong></span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">
                        Supervisor: <strong className="text-slate-800">{duty.supervisorName || 'Center Supervisor'}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Assigned
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Invigilation Instruction & Ethics Card */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-xs text-amber-950 space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wide flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Maagizo Muhimu kwa Msimamizi wa Mtihani (Invigilation Guidelines)</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-amber-900 text-[11px] font-medium">
              <li>Msimamizi anatakiwa kuripoti chumba cha mtihani angalau <strong>dakika 20 kabla</strong> ya muda wa kuanza mtihani.</li>
              <li>Hakikisha wanafunzi wote wana namba zao za mtihani (Registration / Desk Numbers) na hawana vifaa visivyoruhusiwa.</li>
              <li>Kagua bahasha ya mitihani na uithibitishe mbele ya wanafunzi kabla ya kuifungua.</li>
              <li>Saini orodha ya mahudhurio ya wasimamizi (Invigilation Attendance Sheet) baada ya kila kikao.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
