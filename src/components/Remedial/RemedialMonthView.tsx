import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  BookOpen, 
  Users, 
  MapPin, 
  Sparkles,
  Info
} from 'lucide-react';
import { RemedialTimetableEntry } from '../../lib/remedialService';

interface RemedialMonthViewProps {
  entries: RemedialTimetableEntry[];
  classFilter: string;
  streamFilter: string;
  onSelectEntry: (entry: RemedialTimetableEntry) => void;
  onAddOnDate: (dateStr: string, dayOfWeek: string) => void;
}

const MONTH_NAMES_SW = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'
];

const WEEKDAY_NAMES_SW = [
  { short: 'Jpi', full: 'Jumapili', dayOfWeek: 'Sunday' },
  { short: 'Jtt', full: 'Jumatatu', dayOfWeek: 'Monday' },
  { short: 'Jnn', full: 'Jumanne', dayOfWeek: 'Tuesday' },
  { short: 'Jtn', full: 'Jumatano', dayOfWeek: 'Wednesday' },
  { short: 'Alh', full: 'Alhamisi', dayOfWeek: 'Thursday' },
  { short: 'Ijm', full: 'Ijumaa', dayOfWeek: 'Friday' },
  { short: 'Jms', full: 'Jumamosi', dayOfWeek: 'Saturday' }
];

export const RemedialMonthView: React.FC<RemedialMonthViewProps> = ({
  entries,
  classFilter,
  streamFilter,
  onSelectEntry,
  onAddOnDate
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterMode, setFilterMode] = useState<'CURRENT_CLASS' | 'ALL_CLASSES'>('CURRENT_CLASS');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter entries based on mode
  const relevantEntries = useMemo(() => {
    if (filterMode === 'ALL_CLASSES') return entries;
    return entries.filter(e => {
      const matchClass = classFilter === 'ALL' || e.class_name?.toLowerCase() === classFilter.toLowerCase();
      const matchStream = streamFilter === 'ALL' || e.stream === 'All Streams' || e.stream?.toUpperCase() === streamFilter.toUpperCase();
      return matchClass && matchStream;
    });
  }, [entries, filterMode, classFilter, streamFilter]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevDays = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      prevDays.push({
        dateNumber: d,
        dateObj: prevDate,
        dateStr: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false,
        dayOfWeek: WEEKDAY_NAMES_SW[prevDate.getDay()].dayOfWeek
      });
    }

    // Days in current month
    const currentDays = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      currentDays.push({
        dateNumber: d,
        dateObj: thisDate,
        dateStr: thisDate.toISOString().split('T')[0],
        isCurrentMonth: true,
        dayOfWeek: WEEKDAY_NAMES_SW[thisDate.getDay()].dayOfWeek
      });
    }

    // Days from next month to complete the 35 or 42 grid
    const totalCells = Math.ceil((prevDays.length + currentDays.length) / 7) * 7;
    const nextDaysNeeded = totalCells - (prevDays.length + currentDays.length);
    const nextDays = [];
    for (let d = 1; d <= nextDaysNeeded; d++) {
      const nextDate = new Date(year, month + 1, d);
      nextDays.push({
        dateNumber: d,
        dateObj: nextDate,
        dateStr: nextDate.toISOString().split('T')[0],
        isCurrentMonth: false,
        dayOfWeek: WEEKDAY_NAMES_SW[nextDate.getDay()].dayOfWeek
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [year, month]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Map entries to days (matching either exact date OR day of week for recurring)
  const getDayEntries = (dateStr: string, dayOfWeek: string) => {
    return relevantEntries.filter(e => {
      if (e.date && e.date.trim() !== '') {
        return e.date === dateStr;
      }
      return e.day_of_week && e.day_of_week.toLowerCase() === dayOfWeek.toLowerCase();
    }).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black">
            <CalendarIcon className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {MONTH_NAMES_SW[month]} {year}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                Mwonekano wa Mwezi (Monthly View)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Tazama vipindi vyote vya remedial vilivyopangwa kwa kila siku ya mwezi.
            </p>
          </div>
        </div>

        {/* View and Navigation Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class filter toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterMode('CURRENT_CLASS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'CURRENT_CLASS'
                  ? 'bg-white text-blue-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {classFilter} ({streamFilter})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ALL_CLASSES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'ALL_CLASSES'
                  ? 'bg-white text-blue-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Madarasa Yote
            </button>
          </div>

          {/* Month buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Mwezi Uliopita"
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer transition shadow-none hover:shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg cursor-pointer transition"
            >
              Leo
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Mwezi Ujao"
              className="p-1.5 hover:bg-white rounded-lg text-slate-700 cursor-pointer transition shadow-none hover:shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-black uppercase tracking-wider text-slate-600">
        {WEEKDAY_NAMES_SW.map(w => (
          <div 
            key={w.dayOfWeek} 
            className={`py-2 rounded-xl border ${
              w.dayOfWeek === 'Saturday' || w.dayOfWeek === 'Sunday'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span className="hidden sm:inline">{w.full}</span>
            <span className="sm:hidden">{w.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
        {calendarDays.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;
          const daySessions = getDayEntries(cell.dateStr, cell.dayOfWeek);

          return (
            <div
              key={`${cell.dateStr}-${idx}`}
              className={`min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between group ${
                cell.isCurrentMonth
                  ? isToday
                    ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                  : 'bg-slate-50/50 border-slate-100 opacity-60'
              }`}
            >
              {/* Day Number & Add Button */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : cell.isCurrentMonth 
                    ? 'text-slate-800' 
                    : 'text-slate-400'
                }`}>
                  {cell.dateNumber}
                </span>

                <div className="flex items-center gap-1">
                  {daySessions.length > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 hidden sm:inline">
                      {daySessions.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onAddOnDate(cell.dateStr, cell.dayOfWeek)}
                    title={`Panga kipindi cha tarehe ${cell.dateStr}`}
                    className="w-5 h-5 rounded-md bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-500 flex items-center justify-center transition cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Sessions List in Day Cell */}
              <div className="space-y-1 my-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                {daySessions.slice(0, 3).map((session, sIdx) => {
                  const isTargeted = session.target_type === 'TARGETED_STUDENTS';
                  return (
                    <div
                      key={session.id || sIdx}
                      onClick={() => onSelectEntry(session)}
                      title={`${session.subject} (${session.class_name} ${session.stream}) - Mwl. ${session.teacher_name} [${session.start_time}-${session.end_time}]`}
                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition truncate flex items-center justify-between gap-1 shadow-2xs ${
                        isTargeted
                          ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                          : 'bg-blue-50/90 border-blue-200 text-blue-950 hover:bg-blue-100'
                      }`}
                    >
                      <div className="truncate flex items-center gap-1">
                        <span className="font-mono text-[9px] text-slate-500">{session.start_time}</span>
                        <span className="truncate font-black">{session.subject}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0 font-normal">
                        {session.class_name?.replace('Class ', 'C').replace('Form ', 'F')}{session.stream}
                      </span>
                    </div>
                  );
                })}

                {daySessions.length > 3 && (
                  <div className="text-[9px] font-bold text-center text-blue-600 hover:underline cursor-pointer">
                    + {daySessions.length - 3} zaidi
                  </div>
                )}
              </div>

              {/* Bottom Room or Teacher indicator */}
              <div className="text-[9px] text-slate-400 font-medium truncate pt-1 border-t border-slate-100">
                {daySessions.length > 0 ? (
                  <span>
                    {daySessions[0].room ? `📍 ${daySessions[0].room}` : `👨‍🏫 ${daySessions[0].teacher_name}`}
                  </span>
                ) : (
                  <span className="text-slate-300 text-[9px]">Hakuna kipindi</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
