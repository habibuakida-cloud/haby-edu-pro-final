import React, { useState, useMemo } from 'react';
import { TimetableAssignment, PeriodSetting, Teacher, SubjectPeriodAllocation } from '../../types';
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
  FileSpreadsheet,
  Share2,
  Lock,
  BarChart3,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { exportTimetablePDF } from '../../utils/timetablePdfExport';
import { exportClassTimetableExcel } from '../../utils/timetableExcelExport';
import { WhatsAppShareModal } from '../common/WhatsAppShareModal';
import { isSameClass } from '../../utils/reportCardUtils';
import {
  isSameStream,
  isSamePeriod,
  getConfiguredDays,
  getPeriodsForDayFromSettings,
  computeStreamSubjectProgression
} from '../../lib/timetableService';

interface ClassTimetableProps {
  className: string;
  stream: string;
  assignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  teachers?: Teacher[];
  subjectPeriodAllocations?: SubjectPeriodAllocation[];
  onManageStreamSubjects?: (className: string, stream: string, mode?: 'progression' | 'register') => void;
}

export const ClassTimetable: React.FC<ClassTimetableProps> = ({
  className,
  stream,
  assignments = [],
  periodSettings = [],
  teachers = [],
  subjectPeriodAllocations = [],
  onManageStreamSubjects
}) => {
  const [selectedDayTab, setSelectedDayTab] = useState<string>('All');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showProgressionDetails, setShowProgressionDetails] = useState(false);

  const streamProgression = useMemo(() => {
    return computeStreamSubjectProgression(
      className,
      stream,
      subjectPeriodAllocations,
      assignments,
      periodSettings,
      teachers
    );
  }, [className, stream, subjectPeriodAllocations, assignments, periodSettings, teachers]);

  const classAssignments = useMemo(() => {
    return (assignments || []).filter(a => {
      if (!a || !a.subject || !a.className) return false;
      return isSameClass(a.className, className) && isSameStream(a.stream, stream);
    });
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

  const configuredDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

  // Retrieve exact periods for a given day from General Timetable (never copy another day's periods if unconfigured)
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

  // Find matching assignments for class on this day and slot (supports parallel elective subjects)
  const findClassAssignmentsForSlot = (day: string, period: PeriodSetting): TimetableAssignment[] => {
    const normDay = (day || '').trim().toLowerCase();
    return classAssignments.filter(a => {
      if (!a || (a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, period.name);
    });
  };

  // Daily lessons count
  const dailyWorkload = useMemo(() => {
    const summary: Record<string, number> = {};
    configuredDays.forEach(day => {
      const normDay = day.toLowerCase();
      summary[day] = classAssignments.filter(a => a && (a.day || '').trim().toLowerCase() === normDay).length;
    });
    return summary;
  }, [classAssignments, configuredDays]);

  const totalClassLessons = classAssignments.filter(a =>
    configuredDays.some(d => d.toLowerCase() === (a.day || '').trim().toLowerCase())
  ).length;

  const displayDays = (selectedDayTab === 'All'
    ? configuredDays
    : configuredDays.filter(d => d === selectedDayTab)
  ).filter(day => getPeriodsForDay(day).length > 0);

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
            onClick={() => {
              handleDownloadPdf();
              setShowWhatsAppModal(true);
            }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition print:hidden cursor-pointer shadow-xs active:scale-95"
            title="Download Timetable PDF and send via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Send via WhatsApp</span>
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

      {/* Live Stream Subject & Period Progression Banner */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-900 uppercase">
                  Kipimo cha Vipindi vya {className} ({stream})
                </span>
                {streamProgression.totalRequiredSubjects === 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                    Masomo ya Mkondo Hayajasajiliwa Bado
                  </span>
                ) : streamProgression.isFullyComplete ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>100% Vipindi Vimeingizwa Sawa</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>
                      {streamProgression.overallPercentage}% Imekamilika ({streamProgression.totalEnteredRegisteredPeriods}/{streamProgression.totalRequiredPeriods} Vipindi)
                    </span>
                  </span>
                )}
              </div>
              {streamProgression.totalRequiredSubjects > 0 ? (
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Masomo Yaliyosajiliwa: <strong>{streamProgression.totalRequiredSubjects}</strong> •
                  Sawa: <strong className="text-emerald-700">{streamProgression.exactMatchSubjectsCount}</strong> •
                  Hayajaingizwa: <strong className="text-rose-600">{streamProgression.missingSubjects.length}</strong> •
                  Vipindi Pungufu: <strong className="text-amber-700">{streamProgression.incompleteSubjects.length}</strong>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sajili masomo na idadi ya vipindi vinavyotakiwa kusomwa na {className} ({stream}) ili mfumo utambue masomo ambayo hayajaingizwa na kutoa Progression Report.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {streamProgression.totalRequiredSubjects > 0 && (
              <button
                type="button"
                onClick={() => setShowProgressionDetails(prev => !prev)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {showProgressionDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showProgressionDetails ? 'Ficha Progression Report' : 'Onyesha Progression Report'}</span>
              </button>
            )}
            {onManageStreamSubjects && (
              <button
                type="button"
                onClick={() => onManageStreamSubjects(className, stream, 'register')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Sajili Masomo &amp; Vipindi vya {stream}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Pills for Missing or Incomplete Subjects */}
        {(streamProgression.missingSubjects.length > 0 || streamProgression.incompleteSubjects.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/80">
            {streamProgression.missingSubjects.map(m => (
              <span
                key={m.allocationId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold"
              >
                <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                <span>{m.subject}: <strong>Haijaingizwa (0/{m.requiredPeriods})</strong></span>
              </span>
            ))}
            {streamProgression.incompleteSubjects.map(inc => (
              <span
                key={inc.allocationId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{inc.subject}: <strong>{inc.enteredPeriods}/{inc.requiredPeriods} (Bado {inc.remainingPeriods})</strong></span>
              </span>
            ))}
          </div>
        )}

        {/* Expandable Inline Progression Report Table */}
        {showProgressionDetails && streamProgression.totalRequiredSubjects > 0 && (
          <div className="pt-2 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black">
                <tr>
                  <th className="p-2.5">Somo</th>
                  <th className="p-2.5">Mwalimu</th>
                  <th className="p-2.5 text-center">Vinavyotakiwa</th>
                  <th className="p-2.5 text-center">Vilivyoingizwa</th>
                  <th className="p-2.5 text-center">Upungufu / Baki</th>
                  <th className="p-2.5 text-center">Maendeleo</th>
                  <th className="p-2.5 text-center">Hali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {streamProgression.subjects.map(sub => (
                  <tr key={sub.allocationId} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{sub.subject}</td>
                    <td className="p-2.5 text-slate-600">{sub.assignedTeachers.join(', ') || '—'}</td>
                    <td className="p-2.5 text-center font-black text-slate-800">{sub.requiredPeriods}</td>
                    <td className="p-2.5 text-center font-black text-blue-700">{sub.enteredPeriods}</td>
                    <td className="p-2.5 text-center font-bold">
                      {sub.status === 'COMPLETE' ? (
                        <span className="text-emerald-600">0 (Sawa)</span>
                      ) : sub.status === 'MISSING' || sub.status === 'INCOMPLETE' ? (
                        <span className="text-rose-600">Bado {sub.remainingPeriods}</span>
                      ) : (
                        <span className="text-blue-600">Ziada +{sub.excessPeriods}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-black">{sub.percentage}%</td>
                    <td className="p-2.5 text-center">
                      {sub.status === 'COMPLETE' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">SAWA</span>
                      )}
                      {sub.status === 'MISSING' && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[10px]">HAIJAINGIZWA</span>
                      )}
                      {sub.status === 'INCOMPLETE' && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black text-[10px]">PUNGUFU</span>
                      )}
                      {sub.status === 'EXCESS' && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[10px]">ZIADA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                    const isSpecial = isSpecialPeriod(period);
                    const slotAssignments = findClassAssignmentsForSlot(day, period);
                    const isMultiParallel = slotAssignments.length > 1;
                    const assignment = slotAssignments[0];
                    const subColor = assignment ? getSubjectColor(assignment.subject) : null;
                    const teacherObj = assignment && assignment.teacherId !== undefined ? teacherMap.get(assignment.teacherId) : null;
                    const teacherDisplayName = (assignment as any)?.teacherName || teacherObj?.name || (teacherObj ? `Tr. ${teacherObj.initial}` : '');

                    return (
                      <div
                        key={`${day}-${period.name}-${pIdx}`}
                        className={`rounded-xl border flex flex-col transition-all overflow-hidden print:rounded-lg print:border-slate-800 ${
                          isSpecial
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900 print:bg-amber-50/40'
                            : isMultiParallel
                            ? 'bg-gradient-to-b from-emerald-50/40 to-teal-50/20 border-emerald-300 shadow-2xs'
                            : assignment
                            ? 'bg-white border-emerald-200 shadow-2xs print:shadow-none'
                            : 'bg-white/80 border-slate-200 border-dashed print:border-slate-400'
                        }`}
                      >
                        {/* 1. TOP HEADER: MUDA NA JINA LA KIPINDI JUU KWA KILA SIKU */}
                        <div 
                          className={`p-2 text-center border-b ${
                            isSpecial
                              ? 'bg-amber-100/70 border-amber-200 text-amber-900'
                              : isMultiParallel
                              ? 'bg-emerald-100/80 border-emerald-200 text-emerald-950'
                              : 'bg-slate-100/80 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="text-[11px] font-black uppercase tracking-tight truncate flex items-center justify-center gap-1">
                            {isMultiParallel && <span className="text-[9px] text-emerald-700 font-extrabold">🔀</span>}
                            <span>{period.name}</span>
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
                        <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-center text-center">
                          {isSpecial ? (
                            <div className="py-2 text-amber-700 flex flex-col items-center justify-center">
                              {period.name.toLowerCase().includes('lunch') || period.name.toLowerCase().includes('chakula') ? (
                                <Utensils className="w-4 h-4 mb-1 text-orange-600" />
                              ) : period.name.toLowerCase().includes('test') || period.name.toLowerCase().includes('exam') ? (
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
                          ) : isMultiParallel ? (
                            /* MULTIPLE PARALLEL ELECTIVE SUBJECTS (e.g. Science vs Business) */
                            <div className="space-y-1.5">
                              <div className="text-[8px] font-black uppercase text-emerald-800 bg-emerald-100 py-0.5 px-1 rounded border border-emerald-200">
                                Michepuo Sambamba
                              </div>
                              {slotAssignments.map((asg, asgIdx) => {
                                const asgColor = getSubjectColor(asg.subject);
                                const asgTeacher = asg.teacherId !== undefined ? teacherMap.get(asg.teacherId) : null;
                                const asgTeacherName = (asg as any)?.teacherName || asgTeacher?.name || (asgTeacher ? `Tr. ${asgTeacher.initial}` : 'Mwalimu');
                                return (
                                  <div 
                                    key={asg.id || asgIdx}
                                    className="p-1 rounded-md border text-center space-y-0.5 shadow-2xs"
                                    style={{
                                      backgroundColor: asgColor?.bg || '#ffffff',
                                      borderColor: asgColor?.border || '#cbd5e1'
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className="font-black text-[10px] truncate"
                                        style={{ color: asgColor?.text || '#0f172a' }}
                                        title={asg.subject}
                                      >
                                        {getSubjectShortName(asg.subject)}
                                      </span>
                                      {asg.parallelElectiveTrack && (
                                        <span className="text-[7px] px-1 py-0.2 bg-emerald-700 text-white rounded font-bold uppercase shrink-0">
                                          {asg.parallelElectiveTrack}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9px] font-bold text-slate-700 truncate">
                                      {asgTeacherName}
                                    </div>
                                    {asg.room && (
                                      <div className="text-[8px] font-mono text-slate-500 truncate">
                                        Rm: {asg.room}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                              {assignment.isParallelElective && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase">
                                  {assignment.parallelElectiveTrack || 'Mchepuo'}
                                </span>
                              )}
                              <div className="text-[11px] font-bold text-slate-800 truncate flex items-center justify-center gap-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{teacherDisplayName || 'Mwalimu'}</span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-700 truncate">
                                {className.replace('Form ', '').replace('Standard ', '')}
                                {stream.replace('STREAM ', '')}
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
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        documentTitle={`Class Timetable (${className} - ${stream})`}
      />
    </div>
  );
};
