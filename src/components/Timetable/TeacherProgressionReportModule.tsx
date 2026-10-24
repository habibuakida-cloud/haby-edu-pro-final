import React, { useState, useMemo } from 'react';
import {
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Printer,
  Download,
  Search,
  Filter,
  Clock,
  Briefcase,
  TrendingUp,
  Edit3
} from 'lucide-react';
import {
  Teacher,
  TimetableAssignment,
  SubjectPeriodAllocation,
  PeriodSetting,
  TeacherAssignment,
  SchoolInfo
} from '../../types';
import {
  computeAllTeachersProgressionReports,
  TeacherProgressionReport,
  TeacherClassProgressionItem
} from '../../lib/timetableService';
import { exportTeacherProgressionReportPDF } from '../../utils/timetablePdfExport';

interface TeacherProgressionReportModuleProps {
  teachers: Teacher[];
  assignments: TimetableAssignment[];
  allocations: SubjectPeriodAllocation[];
  periodSettings: PeriodSetting[];
  teacherAssignments: TeacherAssignment[];
  schoolName?: string;
  schoolInfo?: SchoolInfo;
  onNavigateToTeacherEntry?: (teacherId: number) => void;
  onNavigateToGeneralTimetable?: (className: string, stream: string, subject?: string) => void;
}

export const TeacherProgressionReportModule: React.FC<TeacherProgressionReportModuleProps> = ({
  teachers = [],
  assignments = [],
  allocations = [],
  periodSettings = [],
  teacherAssignments = [],
  schoolName = 'HABY EDUPRO',
  schoolInfo,
  onNavigateToTeacherEntry,
  onNavigateToGeneralTimetable
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INCOMPLETE' | 'MISSING' | 'COMPLETE' | 'OVERLOAD' | 'UNDERLOAD'>('ALL');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(teachers[0]?.id || null);

  // Compute reports for all teachers
  const allReports = useMemo(() => {
    return computeAllTeachersProgressionReports(
      teachers,
      assignments,
      allocations,
      periodSettings,
      teacherAssignments
    );
  }, [teachers, assignments, allocations, periodSettings, teacherAssignments]);

  // All distinct subjects taught by teachers
  const allDistinctSubjects = useMemo(() => {
    const set = new Set<string>();
    allReports.forEach(r => {
      r.subjects.forEach(s => set.add(s));
      r.classProgressionItems.forEach(i => set.add(i.subject));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allReports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return allReports.filter(rep => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rep.teacherName.toLowerCase().includes(q);
        const matchInit = rep.teacherInitial.toLowerCase().includes(q);
        const matchSub = rep.subjects.some(s => s.toLowerCase().includes(q));
        const matchClass = rep.assignedClasses.some(c => `${c.className} ${c.stream}`.toLowerCase().includes(q));
        if (!matchName && !matchInit && !matchSub && !matchClass) return false;
      }

      // Subject Filter
      if (selectedSubjectFilter !== 'All') {
        const teachesSub =
          rep.subjects.some(s => s.toLowerCase() === selectedSubjectFilter.toLowerCase()) ||
          rep.classProgressionItems.some(i => i.subject.toLowerCase() === selectedSubjectFilter.toLowerCase());
        if (!teachesSub) return false;
      }

      // Status Filter
      if (statusFilter === 'COMPLETE') {
        return rep.isFullyComplete;
      }
      if (statusFilter === 'INCOMPLETE') {
        return !rep.isFullyComplete && rep.totalEnteredPeriods > 0;
      }
      if (statusFilter === 'MISSING') {
        return rep.totalEnteredPeriods === 0;
      }
      if (statusFilter === 'OVERLOAD') {
        return rep.workloadStatus === 'OVERLOAD';
      }
      if (statusFilter === 'UNDERLOAD') {
        return rep.workloadStatus === 'UNDERLOAD';
      }

      return true;
    });
  }, [allReports, searchQuery, selectedSubjectFilter, statusFilter]);

  // Aggregate metrics
  const totalTeachersCount = allReports.length;
  const totalRequiredPeriods = allReports.reduce((s, r) => s + r.totalRequiredPeriods, 0);
  const totalEnteredPeriods = allReports.reduce((s, r) => s + r.totalEnteredPeriods, 0);
  const totalRemainingPeriods = allReports.reduce((s, r) => s + r.totalRemainingPeriods, 0);
  const fullyScheduledCount = allReports.filter(r => r.isFullyComplete).length;
  const incompleteCount = allReports.filter(r => !r.isFullyComplete && r.totalEnteredPeriods > 0).length;
  const missingCount = allReports.filter(r => r.totalEnteredPeriods === 0).length;
  const overallAveragePct = totalRequiredPeriods > 0
    ? Math.round((totalEnteredPeriods / totalRequiredPeriods) * 100)
    : 0;

  // Selected teacher report for detailed mode
  const activeTeacherReport = useMemo(() => {
    if (!selectedTeacherId) return filteredReports[0] || allReports[0] || null;
    return allReports.find(r => r.teacherId === selectedTeacherId) || allReports[0] || null;
  }, [selectedTeacherId, allReports, filteredReports]);

  // PDF Export Handlers
  const handleExportPDF = () => {
    const reportsToExport = viewMode === 'detailed' && activeTeacherReport
      ? [activeTeacherReport]
      : filteredReports;

    exportTeacherProgressionReportPDF({
      reports: reportsToExport,
      schoolName,
      schoolInfo,
      statusFilter,
      subjectFilter: selectedSubjectFilter,
      mode: 'download'
    });
  };

  const handlePrint = () => {
    const reportsToExport = viewMode === 'detailed' && activeTeacherReport
      ? [activeTeacherReport]
      : filteredReports;

    exportTeacherProgressionReportPDF({
      reports: reportsToExport,
      schoolName,
      schoolInfo,
      statusFilter,
      subjectFilter: selectedSubjectFilter,
      mode: 'print'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Meta */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Progression ya Upangaji wa Vipindi vya Waalimu
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {totalTeachersCount} Walimu
                  <span aria-hidden="true" className="mx-1">·</span>
                  {totalEnteredPeriods}/{totalRequiredPeriods} Vipindi
                  <span aria-hidden="true" className="mx-1">·</span>
                  {overallAveragePct}% Ukamilifu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kagua maendeleo ya uingizaji wa vipindi vya kila mwalimu, madarasa aliyopangiwa, idadi ya vipindi vinavyotakiwa, na mizigo ya kazi (Workload Audit).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Chapisha ripoti ya walimu"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Chapisha</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
              title="Pakua ripoti kamili ya walimu katika PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pakua PDF</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Jumla ya Walimu
            </span>
            <div className="text-2xl font-black text-blue-950 tabular-nums">
              {totalTeachersCount}
            </div>
            <div className="text-[11px] text-blue-700 font-medium">
              Waliosajiliwa shuleni
            </div>
          </div>

          <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
              Vipindi Vinavyotakiwa
            </span>
            <div className="text-2xl font-black text-indigo-950 tabular-nums">
              {totalRequiredPeriods}
              <span className="text-xs font-normal text-indigo-600 ml-1">/ wiki</span>
            </div>
            <div className="text-[11px] text-indigo-700 font-medium">
              Kulingana na mtaala
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Vilivyopangwa Ratibani
            </span>
            <div className="text-2xl font-black text-emerald-950 tabular-nums">
              {totalEnteredPeriods}
              <span className="text-xs font-normal text-emerald-600 ml-1">p</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              {fullyScheduledCount} wamekamilika (100%)
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Vipindi Vilivyobaki
            </span>
            <div className="text-2xl font-black text-amber-950 tabular-nums">
              {totalRemainingPeriods}
              <span className="text-xs font-normal text-amber-600 ml-1">p</span>
            </div>
            <div className="text-[11px] text-amber-700 font-medium">
              {incompleteCount} pungufu · {missingCount} 0%
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 col-span-2 sm:col-span-4 lg:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Wastani wa Ukamilifu
            </span>
            <div className="text-2xl font-black text-slate-900 tabular-nums flex items-center justify-between">
              <span>{overallAveragePct}%</span>
              {overallAveragePct >= 100 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              )}
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, overallAveragePct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Controls & View Mode Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tafuta mwalimu au somo..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60 font-medium"
              />
            </div>

            {/* Subject Filter */}
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 cursor-pointer focus:bg-white focus:outline-none"
            >
              <option value="All">Masomo Yote ({allDistinctSubjects.length})</option>
              {allDistinctSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 cursor-pointer focus:bg-white focus:outline-none"
            >
              <option value="ALL">Hali Zote za Walimu</option>
              <option value="INCOMPLETE">Pungufu (Incomplete)</option>
              <option value="MISSING">Hawajapangiwa Kabisa (0%)</option>
              <option value="COMPLETE">Wamekamilika (100%)</option>
              <option value="OVERLOAD">Mzigo Mkubwa (&gt;26 Vipindi)</option>
              <option value="UNDERLOAD">Mzigo Mdogo (&lt;14 Vipindi)</option>
            </select>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Orodha ya Walimu Wote</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'detailed'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Mwalimu Mmoja Mmoja</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: OVERVIEW TABLE */}
      {viewMode === 'overview' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-10">#</th>
                  <th className="p-3">Jina la Mwalimu</th>
                  <th className="p-3">Masomo</th>
                  <th className="p-3">Madarasa &amp; Mikondo</th>
                  <th className="p-3 text-center w-28">Vinavyotakiwa</th>
                  <th className="p-3 text-center w-28">Vilivyopangwa</th>
                  <th className="p-3 text-center w-24">Baki</th>
                  <th className="p-3 w-36">Maendeleo (%)</th>
                  <th className="p-3 text-center w-32">Hali</th>
                  <th className="p-3 text-center w-28">Mzigo</th>
                  <th className="p-3 text-center w-24">Kitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      Hakuna mwalimu aliyepatikana kulingana na vigezo vya utafutaji.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r, idx) => (
                    <tr
                      key={r.teacherId}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTeacherId(r.teacherId);
                        setViewMode('detailed');
                      }}
                    >
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Teacher Name & Initial Avatar */}
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-black text-xs inline-flex items-center justify-center shrink-0">
                            {r.teacherInitial}
                          </span>
                          <div>
                            <span className="text-slate-900 font-bold block">{r.teacherName}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Siku {r.activeDaysCount} darasani
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subjects */}
                      <td className="p-3 text-slate-700">
                        <div className="max-w-[160px] truncate" title={r.subjects.join(', ')}>
                          {r.subjects.length > 0 ? r.subjects.join(', ') : <span className="text-slate-400 italic">Bila somo</span>}
                        </div>
                      </td>

                      {/* Assigned Classes */}
                      <td className="p-3 text-slate-700">
                        <div className="max-w-[180px] truncate" title={r.assignedClasses.map(c => `${c.className} (${c.stream})`).join(', ')}>
                          {r.assignedClasses.length > 0 ? (
                            r.assignedClasses.map(c => `${c.className} ${c.stream}`).join(', ')
                          ) : (
                            <span className="text-slate-400 italic">Hajapangiwa darasa</span>
                          )}
                        </div>
                      </td>

                      {/* Required Periods */}
                      <td className="p-3 text-center font-bold text-slate-700 tabular-nums">
                        {r.totalRequiredPeriods}
                        <span className="text-slate-400 font-normal ml-0.5">/wk</span>
                      </td>

                      {/* Entered Periods */}
                      <td className="p-3 text-center font-black text-slate-900 tabular-nums">
                        {r.totalEnteredPeriods}
                      </td>

                      {/* Remaining Periods */}
                      <td className="p-3 text-center">
                        {r.isFullyComplete ? (
                          <span className="text-[11px] font-black text-emerald-700">0 Kamili ✓</span>
                        ) : r.totalRemainingPeriods > 0 ? (
                          <span className="text-[11px] font-black text-amber-700">
                            -{r.totalRemainingPeriods} Baki
                          </span>
                        ) : (
                          <span className="text-[11px] font-black text-purple-700">
                            +{r.totalExcessPeriods} Ziada
                          </span>
                        )}
                      </td>

                      {/* Progress Bar & % */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                r.isFullyComplete
                                  ? 'bg-emerald-500'
                                  : r.totalEnteredPeriods === 0
                                  ? 'bg-rose-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(100, r.overallPercentage)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-black text-slate-700 w-9 text-right tabular-nums">
                            {r.overallPercentage}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {r.isFullyComplete ? (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Kamili</span>
                          </span>
                        ) : r.totalEnteredPeriods === 0 ? (
                          <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>0% Haijapangwa</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Pungufu</span>
                          </span>
                        )}
                      </td>

                      {/* Workload Status */}
                      <td className="p-3 text-center">
                        {r.workloadStatus === 'OVERLOAD' ? (
                          <span className="text-[10px] font-black text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            Overload ({r.totalEnteredPeriods}p)
                          </span>
                        ) : r.workloadStatus === 'UNDERLOAD' ? (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Underload ({r.totalEnteredPeriods}p)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-600">
                            Sawa ({r.totalEnteredPeriods}p)
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {onNavigateToTeacherEntry && (
                            <button
                              type="button"
                              onClick={() => onNavigateToTeacherEntry(r.teacherId)}
                              className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                              title={`Panga vipindi vya ${r.teacherName}`}
                            >
                              Panga
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacherId(r.teacherId);
                              setViewMode('detailed');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Tazama maelezo ya kina"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SINGLE TEACHER DEEP DIVE DOSSIER */}
      {viewMode === 'detailed' && activeTeacherReport && (
        <div className="space-y-4">
          {/* Teacher Selector Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-slate-500">Chagua Mwalimu:</span>
              <select
                value={activeTeacherReport.teacherId}
                onChange={e => setSelectedTeacherId(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl text-slate-900 cursor-pointer"
              >
                {allReports.map(r => (
                  <option key={r.teacherId} value={r.teacherId}>
                    {r.teacherName} ({r.teacherInitial}) — {r.overallPercentage}% Ukamilifu
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                ← Rudi kwenye Orodha ya Walimu Wote
              </button>

              {onNavigateToTeacherEntry && (
                <button
                  type="button"
                  onClick={() => onNavigateToTeacherEntry(activeTeacherReport.teacherId)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Panga Vipindi vya Mwalimu Huyu</span>
                </button>
              )}
            </div>
          </div>

          {/* Teacher Profile Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-lg text-amber-300">
                  {activeTeacherReport.teacherInitial}
                </div>
                <div>
                  <h4 className="text-lg font-black tracking-tight">{activeTeacherReport.teacherName}</h4>
                  <div className="text-xs text-blue-200 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>Masomo: {activeTeacherReport.subjects.join(', ') || 'Hajasajiliwa somo'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Madarasa {activeTeacherReport.assignedClasses.length}</span>
                    <span aria-hidden="true">·</span>
                    <span>Siku {activeTeacherReport.activeDaysCount} za Kufundisha</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-amber-300 tabular-nums">
                  {activeTeacherReport.overallPercentage}%
                </div>
                <div className="text-xs text-blue-200 font-semibold">
                  {activeTeacherReport.totalEnteredPeriods} kati ya {activeTeacherReport.totalRequiredPeriods} Vipindi
                </div>
              </div>
            </div>

            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  activeTeacherReport.isFullyComplete
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, activeTeacherReport.overallPercentage)}%` }}
              />
            </div>
          </div>

          {/* Class-by-Class Breakdown Table for This Teacher */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                Mchanganuo wa Madarasa na Vipindi vya {activeTeacherReport.teacherName}:
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {activeTeacherReport.classProgressionItems.length} Madarasa / Masomo
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Darasa &amp; Mkondo</th>
                    <th className="p-3">Somo (Subject)</th>
                    <th className="p-3 text-center w-32">Vinavyotakiwa</th>
                    <th className="p-3 text-center w-32">Vilivyopangwa</th>
                    <th className="p-3 text-center w-28">Baki</th>
                    <th className="p-3 w-40">Maendeleo (%)</th>
                    <th className="p-3 text-center w-32">Hali</th>
                    <th className="p-3 text-center w-28">Kitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTeacherReport.classProgressionItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Mwalimu huyu hajapangiwa darasa lolote wala somo kwenye ratiba.
                      </td>
                    </tr>
                  ) : (
                    activeTeacherReport.classProgressionItems.map((item, i) => (
                      <tr key={`${item.className}_${item.stream}_${item.subject}`} className="hover:bg-slate-50/80">
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                          {i + 1}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {item.className} — {item.stream}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {item.subject}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700 tabular-nums">
                          {item.requiredPeriods} /wk
                        </td>
                        <td className="p-3 text-center font-black text-slate-900 tabular-nums">
                          {item.enteredPeriods}
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'COMPLETE' ? (
                            <span className="text-[11px] font-black text-emerald-700">0 Kamili ✓</span>
                          ) : item.remainingPeriods > 0 ? (
                            <span className="text-[11px] font-black text-amber-700">
                              -{item.remainingPeriods} Baki
                            </span>
                          ) : (
                            <span className="text-[11px] font-black text-purple-700">
                              +{item.excessPeriods} Ziada
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.status === 'COMPLETE'
                                    ? 'bg-emerald-500'
                                    : item.enteredPeriods === 0
                                    ? 'bg-rose-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-slate-700 w-9 text-right tabular-nums">
                              {item.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {item.status === 'COMPLETE' ? (
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Kamili</span>
                            </span>
                          ) : item.enteredPeriods === 0 ? (
                            <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Haijapangwa</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Pungufu</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {onNavigateToGeneralTimetable && item.remainingPeriods > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateToGeneralTimetable(item.className, item.stream, item.subject)
                              }
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            >
                              Ingiza Ratiba
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
