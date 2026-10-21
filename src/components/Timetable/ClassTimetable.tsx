import React, { useState, useMemo } from 'react';
import { TimetableAssignment, PeriodSetting, Teacher } from '../../types';
import { DAYS_OF_WEEK } from '../../constants/defaults';
import { getSubjectColor, getSubjectShortName } from '../../utils/colors';
import { 
  Clock, 
  BookOpen, 
  User, 
  CheckCircle2, 
  Coffee, 
  Printer, 
  Filter, 
  Utensils,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { exportTimetablePDF } from '../../utils/timetablePdfExport';
import { exportClassTimetableExcel } from '../../utils/timetableExcelExport';

interface ClassTimetableProps {
  className: string;
  stream: string;
  assignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  teachers?: Teacher[];
}

export const ClassTimetable: React.FC<ClassTimetableProps> = ({
  className,
  stream,
  assignments = [],
  periodSettings = [],
  teachers = []
}) => {
  const [selectedDayTab, setSelectedDayTab] = useState<string>('All');

  const classAssignments = useMemo(() => {
    return (assignments || []).filter(
      a => a && a.className === className && a.stream === stream
    );
  }, [assignments, className, stream]);

  // Build teacher lookup map
  const teacherMap = useMemo(() => {
    const map = new Map<number | string, Teacher>();
    (teachers || []).forEach(t => {
      if (t && t.id !== undefined) map.set(t.id, t);
    });
    return map;
  }, [teachers]);

  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    const hrs = isNaN(parts[0]) ? 0 : parts[0];
    const mins = isNaN(parts[1]) ? 0 : parts[1];
    return hrs * 60 + mins;
  };

  // Default fallback periods if no periodSettings set
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

  // Retrieve exact periods for a given day from General Timetable
  const getPeriodsForDay = (day: string): PeriodSetting[] => {
    const list = (periodSettings || []).filter(
      p => p && (p.day === day || p.day === 'All')
    );

    if (list.length > 0) {
      return [...list].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    }

    // Fallback to any configured periods
    const anyConfigured = (periodSettings || []).filter(p => p && p.name);
    if (anyConfigured.length > 0) {
      const dayMap = new Map<string, PeriodSetting>();
      anyConfigured.forEach(p => {
        const trimmed = (p.name || '').trim();
        if (trimmed && !dayMap.has(trimmed)) dayMap.set(trimmed, p);
      });
      return Array.from(dayMap.values()).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    }

    return DEFAULT_PERIODS;
  };

  // Helper to determine if a period is a break or activity
  const isBreakPeriod = (name: string): boolean => {
    const lower = (name || '').toLowerCase();
    return (
      lower.includes('break') ||
      lower.includes('lunch') ||
      lower.includes('mapumziko') ||
      lower.includes('chakula') ||
      lower.includes('tea') ||
      lower.includes('assembly') ||
      lower.includes('baraza')
    );
  };

  // Find matching assignment for class on this day and slot
  const findClassAssignmentForSlot = (day: string, period: PeriodSetting): TimetableAssignment | undefined => {
    const targetName = (period.name || '').toLowerCase().trim();
    const targetStart = (period.start || '').trim();

    return classAssignments.find(a => {
      if (!a || a.day !== day) return false;
      const aName = (a.periodName || '').toLowerCase().trim();
      const aRaw = (a.period || '').toLowerCase().trim();
      const aNorm = (a.period ? a.period.split(' (')[0] : '').toLowerCase().trim();

      if (aName && aName === targetName) return true;
      if (aNorm && aNorm === targetName) return true;
      if (aRaw === targetName) return true;
      if (aRaw.startsWith(targetName) || targetName.startsWith(aRaw)) return true;
      if (targetStart && aRaw.includes(targetStart)) return true;

      return false;
    });
  };

  // Daily lessons count
  const dailyWorkload = useMemo(() => {
    const summary: Record<string, number> = {};
    DAYS_OF_WEEK.forEach(day => {
      summary[day] = classAssignments.filter(a => a && a.day === day).length;
    });
    return summary;
  }, [classAssignments]);

  const totalClassLessons = classAssignments.length;

  const displayDays = selectedDayTab === 'All' 
    ? DAYS_OF_WEEK 
    : DAYS_OF_WEEK.filter(d => d === selectedDayTab);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    exportTimetablePDF({
      viewMode: 'class',
      assignments,
      teachers,
      periodSettings,
      streamSettings: [],
      selectedClass: className,
      selectedStream: stream,
      selectedDay: selectedDayTab,
      orientation: 'landscape'
    });
  };

  const handleDownloadExcel = () => {
    exportClassTimetableExcel({
      schoolName: 'HABY EDUPRO ACADEMY',
      className,
      stream,
      assignments,
      teachers,
      periodSettings
    });
  };

  return (
    <div id="class-timetable-container" className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 master-timetable-container">
      {/* Header with Class & Stream profile */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 font-black text-lg flex items-center justify-center border border-emerald-200 shadow-2xs">
            {className.replace(/[^0-9a-zA-Z]/g, '').substring(0, 3).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                {className} — {stream}
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Ratiba Rasmi ya Darasa
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Mkondo wa {stream} • Vipindi vilivyopangwa: <strong className="text-slate-800">{totalClassLessons}</strong>
            </p>
          </div>
        </div>

        {/* Workload badges, Download PDF & Print button */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Jumla ya Vipindi</span>
            <span className="text-sm font-black text-slate-900">{totalClassLessons}</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
            title="Download Class Timetable as A4 Landscape PDF using jsPDF"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
            title="Pakua Ratiba ya Darasa kwenye Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Pakua Excel</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer"
            title="Chapa Ratiba ya Darasa"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chapa Ratiba</span>
          </button>
        </div>
      </div>

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
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Siku Zote ({DAYS_OF_WEEK.length})
          </button>
          {DAYS_OF_WEEK.map(d => {
            const isSelected = selectedDayTab === d;
            const count = dailyWorkload[d] || 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDayTab(d)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {d} ({count})
              </button>
            );
          })}
        </div>
        <div className="text-[11px] font-bold text-emerald-900 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
          Muda umewekwa juu kwa kila kipindi kulingana na General Timetable
        </div>
      </div>

      {/* DAY-BY-DAY HORIZONTAL PERIODS TIMELINE:
          For EACH DAY, periods are arranged horizontally with their EXACT time on top! */}
      <div className="space-y-4">
        {displayDays.map(day => {
          const dayPeriods = getPeriodsForDay(day);
          const dayLessonCount = dailyWorkload[day] || 0;

          return (
            <div 
              key={day}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition print:border-slate-800 print:shadow-none"
            >
              {/* Day Header Strip */}
              <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                    {day}
                  </span>
                  <span className="text-[10px] font-bold bg-white/10 text-emerald-200 px-2 py-0.5 rounded-full border border-white/10">
                    {dayLessonCount} {dayLessonCount === 1 ? 'kipindi' : 'vipindi vya masomo'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <span>Jumla ya Vipindi: {dayPeriods.length}</span>
                </div>
              </div>

              {/* Horizontal Period Grid for THIS Day:
                  Each column has the Period Name and EXACT TIME (Muda) on top horizontally! */}
              <div className="overflow-x-auto p-2 sm:p-3 bg-slate-50/50 print:p-1 print:bg-white print:overflow-visible">
                <div 
                  className="grid gap-2 sm:gap-2.5 w-full print:w-full print:min-w-0 print:gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${dayPeriods.length}, minmax(115px, 1fr))`
                  }}
                >
                  {dayPeriods.map((period, pIdx) => {
                    const isBreak = isBreakPeriod(period.name);
                    const assignment = findClassAssignmentForSlot(day, period);
                    const subColor = assignment ? getSubjectColor(assignment.subject) : null;
                    const teacherObj = assignment && assignment.teacherId !== undefined ? teacherMap.get(assignment.teacherId) : null;
                    const teacherDisplayName = (assignment as any)?.teacherName || teacherObj?.name || (teacherObj ? `Tr. ${teacherObj.initial}` : '');

                    return (
                      <div
                        key={`${day}-${period.name}-${pIdx}`}
                        className={`rounded-xl border flex flex-col transition-all overflow-hidden print:rounded-lg print:border-slate-800 ${
                          isBreak
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900 print:bg-amber-50/40'
                            : assignment
                            ? 'bg-white border-emerald-200 shadow-2xs print:shadow-none'
                            : 'bg-white/80 border-slate-200 border-dashed print:border-slate-400'
                        }`}
                      >
                        {/* 1. TOP HEADER: MUDA NA JINA LA KIPINDI JUU KWA KILA SIKU */}
                        <div 
                          className={`p-2 text-center border-b ${
                            isBreak
                              ? 'bg-amber-100/70 border-amber-200 text-amber-900'
                              : 'bg-slate-100/80 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="text-[11px] font-black uppercase tracking-tight truncate">
                            {period.name}
                          </div>
                          {period.start && period.end ? (
                            <div className="text-[10px] font-mono font-bold text-emerald-800 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200/60 mt-1 inline-flex items-center gap-1 shadow-2xs">
                              <Clock className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{period.start} - {period.end}</span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-400 mt-1">—</div>
                          )}
                        </div>

                        {/* 2. BODY CONTENT: BREAK AU SOMO NA MWALIMU */}
                        <div className="p-2.5 flex-1 flex flex-col justify-center text-center">
                          {isBreak ? (
                            <div className="py-2 text-amber-700 flex flex-col items-center justify-center">
                              {period.name.toLowerCase().includes('lunch') || period.name.toLowerCase().includes('chakula') ? (
                                <Utensils className="w-4 h-4 mb-1 text-orange-600" />
                              ) : (
                                <Coffee className="w-4 h-4 mb-1 text-amber-600" />
                              )}
                              <span className="text-[10px] font-bold leading-tight">
                                Mapumziko
                              </span>
                            </div>
                          ) : assignment ? (
                            <div className="space-y-1">
                              <div
                                className="px-2 py-1 rounded-md text-[11px] font-black tracking-tight truncate shadow-2xs"
                                style={{
                                  backgroundColor: subColor?.bg || '#dcfce7',
                                  color: subColor?.text || '#166534',
                                  border: `1px solid ${subColor?.border || '#86efac'}`
                                }}
                                title={getSubjectShortName(assignment.subject)}
                              >
                                {getSubjectShortName(assignment.subject)}
                              </div>
                              <div className="text-[11px] font-bold text-slate-800 truncate flex items-center justify-center gap-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{teacherDisplayName || 'Mwalimu'}</span>
                              </div>
                              {assignment.room && (
                                <div className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-1 rounded">
                                  Rm: {assignment.room}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-3 flex flex-col items-center justify-center text-slate-300 select-none">
                              <span className="text-[10px] font-bold text-slate-400">Kipindi Huru</span>
                              <span className="text-[9px] text-slate-300">Hakuna Somo</span>
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
          <span>Darasa: <strong className="text-slate-900">{className} ({stream})</strong></span>
          <span>•</span>
          <span>Jumla ya Vipindi: <strong className="text-slate-900">{totalClassLessons}</strong></span>
        </div>
      </div>
    </div>
  );
};
