import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  X, 
  CheckCircle2, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Layers,
  LayoutGrid,
  List,
  Filter,
  Eye,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { useConfirmDelete } from '../context/ConfirmDeleteContext';
import { Exam, InvigilationSession, EducationLevel, Student, SchoolInfo } from '../types';
import { ALL_SCHOOL_CLASSES, NURSERY_CLASSES, PRIMARY_CLASSES, SECONDARY_CLASSES } from '../constants/defaults';
import { ExamDocumentsModal } from './Exams/ExamDocumentsModal';
import { SubjectPaperConfigModal } from './Exams/SubjectPaperConfigModal';

interface ExamsViewProps {
  exams: Exam[];
  onAddExam: (exam: Exam, session: InvigilationSession) => void;
  onUpdateExam?: (exam: Exam) => void;
  onDeleteExam: (id: number) => void;
  students?: Student[];
  schoolInfo?: SchoolInfo;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  students = [],
  schoolInfo
}) => {
  const { openConfirmDelete } = useConfirmDelete();
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [calendarScope, setCalendarScope] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Filtering
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamDetails, setSelectedExamDetails] = useState<Exam | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalExamId, setDocModalExamId] = useState<number | string | undefined>(undefined);
  const [isPaperConfigModalOpen, setIsPaperConfigModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Midterm I');
  const [level, setLevel] = useState<EducationLevel>('PRIMARY');
  const [className, setClassName] = useState('Standard 7');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Filtered exams according to level & class
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchLevel = levelFilter === 'ALL' || e.level === levelFilter;
      const matchClass = classFilter === 'ALL' || e.className === classFilter || e.className === 'All';
      return matchLevel && matchClass;
    });
  }, [exams, levelFilter, classFilter]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Generate Month Days (Monday - Sunday aligned)
  const monthDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday is 0, Sunday is 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    // Previous month padding
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLastDay - i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        isCurrentMonth: false,
        dayNumber: prevLastDay - i
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        isCurrentMonth: true,
        dayNumber: i
      });
    }

    // Next month padding to fill complete weeks (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        isCurrentMonth: false,
        dayNumber: i
      });
    }

    return days;
  }, [year, month]);

  // Generate Week Days (Monday to Sunday for selected week)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);

    const days: Array<{
      date: Date;
      dateString: string;
      dayName: string;
      dayNumber: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        dateString: d.toISOString().slice(0, 10),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate()
      });
    }
    return days;
  }, [currentDate]);

  // Check schedule overlaps (same day, same class or same level)
  const scheduleConflicts = useMemo(() => {
    const conflicts: Record<string, Exam[]> = {};
    const dateMap: Record<string, Exam[]> = {};

    exams.forEach(e => {
      const d = e.date ? e.date.slice(0, 10) : '';
      if (!d) return;
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(e);
    });

    Object.entries(dateMap).forEach(([d, examList]) => {
      if (examList.length > 1) {
        // Group by class or check if 2 exams share class/all
        const classSeen: Record<string, boolean> = {};
        let hasCollision = false;

        examList.forEach(e => {
          const c = e.className || 'All';
          if (c === 'All' || classSeen[c] || classSeen['All']) {
            hasCollision = true;
          }
          classSeen[c] = true;
        });

        if (hasCollision || examList.length >= 2) {
          conflicts[d] = examList;
        }
      }
    });

    return conflicts;
  }, [exams]);

  // Navigate calendar
  const handlePrev = () => {
    if (calendarScope === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (calendarScope === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenAddOnDate = (targetDateString: string) => {
    setDate(targetDateString);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Enter examination title.');
      return;
    }

    const examId = Date.now();
    const newExam: Exam = {
      id: examId,
      name: name.trim(),
      type: type || name.trim(),
      level,
      className,
      date,
      status
    };

    // Auto-create matching invigilation session
    const parsedDate = new Date(`${date}T00:00:00`);
    const dayName = isNaN(parsedDate.getTime()) ? 'Monday' : parsedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = isNaN(parsedDate.getTime()) ? date : parsedDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const newSession: InvigilationSession = {
      id: examId + 1,
      rawDate: date,
      date: formattedDate,
      day: dayName,
      session: 'SESSION I',
      start: '08:00',
      end: '10:30',
      time: '08:00-10:30',
      subject: name.trim(),
      level,
      className: className.toUpperCase(),
      stream: level === 'ACSEE' ? 'PCM' : 'STREAM A',
      rooms: 2
    };

    onAddExam(newExam, newSession);
    setIsModalOpen(false);
    setName('');
  };

  const handleToggleStatus = (exam: Exam) => {
    const updatedStatus: 'Active' | 'Inactive' = (exam.status || 'Active') === 'Active' ? 'Inactive' : 'Active';
    if (onUpdateExam) {
      onUpdateExam({
        ...exam,
        status: updatedStatus
      });
    }
    if (selectedExamDetails && selectedExamDetails.id === exam.id) {
      setSelectedExamDetails({
        ...selectedExamDetails,
        status: updatedStatus
      });
    }
  };

  const getLevelBadgeClass = (lvl?: string) => {
    switch (lvl) {
      case 'PRE_PRIMARY':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'PRIMARY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ACSEE':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CSEE':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const totalConflictDays = Object.keys(scheduleConflicts).length;

  return (
    <div className="space-y-6">
      {/* Examination Management Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span>Examination Scheduling & Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Plan, visualize, and schedule examinations across Nursery, Primary, O-Level, and A-Level to avoid overlapping conflicts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List ({exams.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPaperConfigModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Configure Paper 1, Paper 2, and Paper 3 formats for O-Level and Advance Level subjects"
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>Subject Papers Matrix (Paper 1, 2, 3)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDocModalExamId(undefined);
              setIsDocModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            title="Generate Photo Entry Form, ISAL, and CAL documents for each class and stream"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            <span>Exam Documents (Photo Entry, ISAL, CAL)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </button>
        </div>
      </div>

      {/* OVERLAP CONFLICT BANNER IF DETECTED */}
      {totalConflictDays > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold">Schedule Overlap Alert: </span>
            <span>
              {totalConflictDays} date(s) have multiple examinations scheduled concurrently. Please review the highlighted calendar dates below to adjust schedules and prevent student test collisions.
            </span>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Calendar Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Prev / Next / Today */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-bold hover:bg-slate-100 rounded-md text-slate-700 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-base font-black text-[#1f4d8b]">
                {calendarScope === 'month' 
                  ? monthName 
                  : `Week of ${weekDays[0].dayNumber} - ${weekDays[6].dayNumber} ${monthName}`}
              </h3>
            </div>

            {/* Scope & Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {/* Month / Week switch */}
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCalendarScope('month')}
                  className={`px-3 py-1 rounded-md text-xs cursor-pointer ${
                    calendarScope === 'month' ? 'bg-[#1f4d8b] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarScope('week')}
                  className={`px-3 py-1 rounded-md text-xs cursor-pointer ${
                    calendarScope === 'week' ? 'bg-[#1f4d8b] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Week
                </button>
              </div>

              {/* Level Filter */}
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Levels</option>
                <option value="PRE_PRIMARY">Pre-Primary (Nursery)</option>
                <option value="PRIMARY">Primary (Std 1-7)</option>
                <option value="CSEE">O-Level (Form 1-4)</option>
                <option value="ACSEE">A-Level (Form 5-6)</option>
              </select>

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Classes</option>
                <optgroup label="Pre-Primary / Nursery">
                  {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Primary School">
                  {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Secondary School">
                  {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>
          </div>

          {/* MONTHLY CALENDAR GRID */}
          {calendarScope === 'month' && (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-600 text-center uppercase tracking-wider py-2">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-amber-700">Sat</div>
                <div className="text-rose-700">Sun</div>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                {monthDays.map((cell, idx) => {
                  const dayExams = filteredExams.filter(e => e.date && e.date.slice(0, 10) === cell.dateString);
                  const isConflictDay = scheduleConflicts[cell.dateString] && scheduleConflicts[cell.dateString].length > 1;
                  const isToday = cell.dateString === todayIso;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] p-2 transition-colors relative flex flex-col justify-between group ${
                        !cell.isCurrentMonth 
                          ? 'bg-slate-50/50 text-slate-400' 
                          : isConflictDay 
                            ? 'bg-amber-50/60' 
                            : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div>
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                              isToday
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : cell.isCurrentMonth
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          <div className="flex items-center gap-1">
                            {isConflictDay && (
                              <span 
                                title="Overlap detected: multiple exams on this day"
                                className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-0.5"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                <span>Overlap</span>
                              </span>
                            )}

                            {/* Quick Add Button on Hover */}
                            <button
                              type="button"
                              onClick={() => handleOpenAddOnDate(cell.dateString)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-blue-100 rounded text-blue-600 transition-opacity cursor-pointer"
                              title={`Schedule exam on ${cell.dateString}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Exam Pills */}
                        <div className="mt-1.5 space-y-1">
                          {dayExams.slice(0, 3).map(ex => {
                            const isActive = (ex.status || 'Active') === 'Active';
                            return (
                              <div
                                key={ex.id}
                                onClick={() => setSelectedExamDetails(ex)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer shadow-2xs hover:scale-101 ${
                                  isActive
                                    ? getLevelBadgeClass(ex.level)
                                    : 'bg-slate-100 text-slate-500 border-slate-300 opacity-60'
                                }`}
                              >
                                <div className="truncate flex items-center justify-between gap-1">
                                  <span className="truncate">{ex.name}</span>
                                  <span className="text-[9px] uppercase px-1 bg-white/60 rounded">
                                    {ex.className || 'All'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {dayExams.length > 3 && (
                            <div 
                              onClick={() => setSelectedExamDetails(dayExams[3])}
                              className="text-[9px] font-bold text-slate-500 hover:text-blue-600 cursor-pointer pl-1"
                            >
                              +{dayExams.length - 3} more...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conflict count hint */}
                      {isConflictDay && (
                        <div className="text-[9px] font-bold text-amber-700 mt-1 truncate">
                          ⚠️ {dayExams.length} concurrent exams
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEKLY CALENDAR GRID */}
          {calendarScope === 'week' && (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 py-3">
                {weekDays.map((wd, wIdx) => {
                  const isToday = wd.dateString === todayIso;
                  return (
                    <div key={wIdx} className="text-center">
                      <div className="text-[11px] uppercase text-slate-500">{wd.dayName}</div>
                      <div className={`mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-blue-600 text-white font-black' : 'text-slate-800'
                      }`}>
                        {wd.dayNumber} {wd.date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[350px]">
                {weekDays.map((wd, wIdx) => {
                  const dayExams = filteredExams.filter(e => e.date && e.date.slice(0, 10) === wd.dateString);
                  const isConflict = dayExams.length > 1;

                  return (
                    <div 
                      key={wIdx} 
                      className={`p-3 space-y-2 flex flex-col justify-between ${
                        isConflict ? 'bg-amber-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-2">
                        {isConflict && (
                          <div className="bg-amber-100 border border-amber-300 rounded-lg p-1.5 text-[10px] text-amber-900 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Overlap: {dayExams.length} exams</span>
                          </div>
                        )}

                        {dayExams.length === 0 ? (
                          <div className="text-center py-8 text-[11px] text-slate-300 font-medium">
                            No exams
                          </div>
                        ) : (
                          dayExams.map(ex => (
                            <div
                              key={ex.id}
                              onClick={() => setSelectedExamDetails(ex)}
                              className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-2xs hover:shadow-xs transition-all ${
                                getLevelBadgeClass(ex.level)
                              }`}
                            >
                              <div className="font-bold text-slate-900 leading-snug">{ex.name}</div>
                              <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1.5">
                                <span>{ex.className || 'All Classes'}</span>
                                <span className="font-mono bg-white/80 px-1.5 py-0.2 rounded font-bold">
                                  {ex.type}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAddOnDate(wd.dateString)}
                        className="w-full py-1.5 mt-2 bg-slate-50 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-400 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Exam</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW (matching original table layout) */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                  <th className="p-3 border-r border-slate-200">Exam Title</th>
                  <th className="p-3 border-r border-slate-200">Level</th>
                  <th className="p-3 border-r border-slate-200">Class</th>
                  <th className="p-3 border-r border-slate-200">Scheduled Date</th>
                  <th className="p-3 border-r border-slate-200">Type</th>
                  <th className="p-3 border-r border-slate-200">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No examinations found matching your filter criteria. Click "+ Create Exam" to register an assessment.
                    </td>
                  </tr>
                ) : (
                  filteredExams.map(e => {
                    const isActive = (e.status || 'Active') === 'Active';
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-900 text-sm">
                          {e.name}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getLevelBadgeClass(e.level)}`}>
                            {e.level || 'PRIMARY'}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-700">
                          {e.className || 'All'}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-mono font-semibold text-slate-600">
                          {e.date || '-'}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-medium text-slate-700">
                          {e.type || e.name}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isActive 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2.5 font-bold text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setDocModalExamId(e.id);
                                setIsDocModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Generate Photo Entry, ISAL, and CAL forms for this exam"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Forms</span>
                            </button>
                            <button
                              onClick={() => setSelectedExamDetails(e)}
                              className="text-slate-600 hover:text-slate-900 cursor-pointer p-1"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(e)}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              Toggle
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete exam "${e.name}"?`)) {
                                  onDeleteExam(Number(e.id));
                                }
                              }}
                              className="text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                            >
                              Del
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
      )}

      {/* CREATE EXAM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-lg text-[#1f4d8b] flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Create New Examination</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Exam Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Standard 7 National Mock or Midterm I"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Exam Type *</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Midterm I">Midterm I</option>
                    <option value="Terminal">Terminal</option>
                    <option value="Annual">Annual</option>
                    <option value="Midterm II">Midterm II</option>
                    <option value="Pre-Mock">Pre-Mock</option>
                    <option value="Mock">Mock Exam</option>
                    <option value="PSLE Final">PSLE Final (Primary)</option>
                    <option value="NECTA Final">NECTA Final (CSEE)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Level *</label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value as EducationLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="PRE_PRIMARY">Pre-Primary (Nursery / Awali)</option>
                    <option value="PRIMARY">Primary School (Std 1 - 7)</option>
                    <option value="CSEE">CSEE (O-Level Form 1 - 4)</option>
                    <option value="ACSEE">ACSEE (A-Level Form 5 - 6)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Target Class *</label>
                  <select
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="All">All Classes</option>
                    <optgroup label="Pre-Primary / Nursery">
                      {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Primary School">
                      {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Secondary School">
                      {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Exam Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Active">Active (Live in Results & Invigilation)</option>
                  <option value="Inactive">Inactive (Draft / Archived)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM INSPECTOR MODAL */}
      {selectedExamDetails && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getLevelBadgeClass(selectedExamDetails.level)}`}>
                  {selectedExamDetails.level || 'PRIMARY'}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">
                  {selectedExamDetails.name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedExamDetails(null)}
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Type:</span>
                <span className="font-bold text-slate-800">{selectedExamDetails.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Target Class:</span>
                <span className="font-bold text-slate-800">{selectedExamDetails.className || 'All'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Scheduled Date:</span>
                <span className="font-bold font-mono text-slate-800">{selectedExamDetails.date || 'Unscheduled'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className={`font-bold ${
                  (selectedExamDetails.status || 'Active') === 'Active' ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                  {selectedExamDetails.status || 'Active'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDocModalExamId(selectedExamDetails.id);
                setIsDocModalOpen(true);
                setSelectedExamDetails(null);
              }}
              className="w-full py-2 bg-[#1f4d8b] hover:bg-blue-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>Generate Exam Forms (Photo Entry, ISAL, CAL)</span>
            </button>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  openConfirmDelete(
                    "Thibitisha Ufutaji",
                    `Je, una uhakika unataka kufuta mtihani "${selectedExamDetails.name}"? Hatua hii haiwezi kutenduliwa.`,
                    () => {
                      onDeleteExam(Number(selectedExamDetails.id));
                      setSelectedExamDetails(null);
                    }
                  );
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleStatus(selectedExamDetails)}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
              >
                Toggle {(selectedExamDetails.status || 'Active') === 'Active' ? 'Inactive' : 'Active'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Exam Documents Modal (Photo Entry, ISAL, CAL) */}
      <ExamDocumentsModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        exams={exams}
        students={students}
        schoolInfo={schoolInfo || {
          name: 'HabyEduPro3A',
          schoolNumber: 'S.0123',
          address: 'P.O. Box 1234, Tanga, Tanzania',
          phone: '0717616343',
          email: 'info@habyedupro3a.ac.tz',
          motto: 'Education for Development & Integrity',
          principal: 'Mwl. H. Akida'
        }}
        initialExamId={docModalExamId}
      />

      {/* Subject Papers Configuration Matrix Modal */}
      <SubjectPaperConfigModal
        isOpen={isPaperConfigModalOpen}
        onClose={() => setIsPaperConfigModalOpen(false)}
        onSelectPaperForDoc={(subjectName, paper, level) => {
          setIsDocModalOpen(true);
        }}
      />
    </div>
  );
};
