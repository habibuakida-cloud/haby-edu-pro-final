import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  X, 
  Printer, 
  Download, 
  RefreshCw, 
  Sliders, 
  Search, 
  Filter, 
  User, 
  BookOpen, 
  Layers, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Sparkles, 
  Trash2, 
  Edit3, 
  FileSpreadsheet,
  Check,
  Building,
  Calendar,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting 
} from '../../types';
import { 
  generateTimetableIntegrityReport, 
  autoResolveTimetableClashes,
  IntegrityPolicySettings, 
  DEFAULT_INTEGRITY_POLICIES, 
  TimetableConflictItem,
  ConflictSeverity,
  ConflictCategory
} from '../../utils/timetableIntegrity';
import { getSubjectColor, getTeacherColor, getFormStreamTheme } from '../../utils/colors';

interface TimetableIntegrityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  schoolName: string;
  onUpdateAssignments: (assignments: TimetableAssignment[]) => void;
  onEditSlot?: (slot: { className: string; stream: string; day: string; period: string; assignment?: TimetableAssignment }) => void;
  inlineMode?: boolean;
}

export const TimetableIntegrityReportModal: React.FC<TimetableIntegrityReportModalProps> = ({
  isOpen,
  onClose,
  assignments,
  teachers,
  periodSettings,
  streamSettings,
  schoolName,
  onUpdateAssignments,
  onEditSlot,
  inlineMode = false
}) => {
  // Modal active view tab
  const [activeTab, setActiveTab] = useState<'conflicts' | 'teachers' | 'classes' | 'policies'>('conflicts');

  // Policy Settings state
  const [policies, setPolicies] = useState<IntegrityPolicySettings>(DEFAULT_INTEGRITY_POLICIES);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ConflictSeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // State for auto-resolve confirmation or success alert
  const [autoResolveSuccess, setAutoResolveSuccess] = useState<string | null>(null);

  // Generate Report
  const report = useMemo(() => {
    return generateTimetableIntegrityReport(
      assignments,
      teachers,
      periodSettings,
      streamSettings,
      policies
    );
  }, [assignments, teachers, periodSettings, streamSettings, policies]);

  // Filtered conflicts
  const filteredConflicts = useMemo(() => {
    return report.conflicts.filter(c => {
      if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (dayFilter !== 'ALL' && c.day !== dayFilter) return false;
      if (classFilter !== 'ALL' && !c.involvedSlots.some(s => s.className === classFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);
        const matchesTeacher = c.involvedTeachers.some(t => t.teacherName.toLowerCase().includes(q));
        const matchesClass = c.involvedSlots.some(s => `${s.className} ${s.stream}`.toLowerCase().includes(q));
        const matchesSubject = c.involvedSlots.some(s => s.subject.toLowerCase().includes(q));
        const matchesRoom = c.involvedRooms.some(r => r.toLowerCase().includes(q));
        return matchesTitle || matchesDesc || matchesTeacher || matchesClass || matchesSubject || matchesRoom;
      }

      return true;
    });
  }, [report.conflicts, severityFilter, categoryFilter, dayFilter, classFilter, searchQuery]);

  if (!isOpen && !inlineMode) return null;

  // Single Conflict Fix: Unassign teacher from specific assignment
  const handleUnassignTeacher = (assignmentId: number) => {
    const updated = assignments.map(a => {
      if (a.id === assignmentId) {
        return { ...a, teacherId: undefined };
      }
      return a;
    });
    onUpdateAssignments(updated);
    setAutoResolveSuccess(`Successfully unassigned teacher from slot #${assignmentId}.`);
    setTimeout(() => setAutoResolveSuccess(null), 4000);
  };

  // Single Conflict Fix: Remove duplicate assignment
  const handleDeleteAssignment = (assignmentId: number) => {
    if (window.confirm('Are you sure you want to remove this redundant lesson slot?')) {
      const updated = assignments.filter(a => a.id !== assignmentId);
      onUpdateAssignments(updated);
      setAutoResolveSuccess(`Removed duplicate lesson slot #${assignmentId}.`);
      setTimeout(() => setAutoResolveSuccess(null), 4000);
    }
  };

  // Auto-resolve all critical clashes
  const handleAutoResolveAll = () => {
    if (report.criticalCount === 0) {
      alert('No critical teacher clashes detected! Your schedule has zero double-bookings.');
      return;
    }

    if (window.confirm(`Auto-Resolve Schedule Clashes?\n\nThis will automatically resolve ${report.criticalCount} double-booking conflicts by finding available qualified faculty or unassigning redundant slots, while preserving all class subjects and rooms.\n\nProceed?`)) {
      const { updatedAssignments, resolvedCount, changesLog } = autoResolveTimetableClashes(assignments, teachers);
      onUpdateAssignments(updatedAssignments);
      setAutoResolveSuccess(`Resolved ${resolvedCount} double-booking clash(es) successfully! All parallel stream schedules are now conflict-free.`);
      setTimeout(() => setAutoResolveSuccess(null), 6000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Conflict ID', 'Severity', 'Category', 'Title', 'Day', 'Period', 'Involved Classes', 'Involved Teachers', 'Involved Rooms', 'Policy Rule', 'Recommendation'];
    const rows = report.conflicts.map(c => [
      `"${c.id}"`,
      `"${c.severity}"`,
      `"${c.category}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.day}"`,
      `"${c.period}"`,
      `"${c.involvedSlots.map(s => `${s.className} ${s.stream} (${s.subject})`).join('; ')}"`,
      `"${c.involvedTeachers.map(t => t.teacherName).join('; ')}"`,
      `"${c.involvedRooms.join('; ')}"`,
      `"${c.policyRule.replace(/"/g, '""')}"`,
      `"${c.recommendation.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${schoolName.replace(/\s+/g, '_')}_Timetable_Integrity_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Official Report
  const handlePrint = () => {
    window.print();
  };

  // Unique classes for filter
  const uniqueClasses = Array.from(new Set(streamSettings.map(s => s.className)));

  return (
    <div className={inlineMode ? "w-full space-y-4" : "fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"}>
      <div className={`bg-white rounded-2xl border border-slate-200 w-full overflow-hidden flex flex-col ${
        inlineMode ? 'shadow-sm' : 'max-w-6xl max-h-[92vh] shadow-2xl animate-in fade-in zoom-in-95 duration-150'
      }`}>
        
        {/* =========================================================================
            HEADER & EXECUTIVE AUDIT BADGES
           ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <ShieldAlert className="w-64 h-64 text-blue-200" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shadow-lg border shrink-0 ${
                report.status === 'OPTIMAL' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400' :
                report.status === 'GOOD' ? 'bg-blue-500/20 border-blue-400/40 text-blue-400' :
                report.status === 'NEEDS_ATTENTION' ? 'bg-amber-500/20 border-amber-400/40 text-amber-400' :
                'bg-rose-500/20 border-rose-400/40 text-rose-400'
              }`}>
                {report.status === 'OPTIMAL' ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                    Institutional Schedule Auditor
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Timetable Integrity & Policy Report
                </h2>
                <p className="text-xs text-blue-200/80 mt-0.5 max-w-xl">
                  {schoolName} • Automated schedule cross-referencing against teacher availability, workload ceilings, room allocations, and pedagogical policies.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
                title="Print Official Audit Report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Report</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
                title="Download CSV Conflict Ledger"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              {inlineMode ? (
                <button
                  onClick={onClose}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  title="Return to general timetable grid"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exit to Grid</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* KPI Mini-Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 mt-5 relative z-10">
            {/* Scorecard */}
            <div className="col-span-2 sm:col-span-1 p-3 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      report.score >= 90 ? 'text-emerald-400' :
                      report.score >= 70 ? 'text-blue-400' :
                      report.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }
                    strokeDasharray={`${report.score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-black text-white">{report.score}%</span>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-300">Integrity Score</div>
                <div className="text-xs font-extrabold text-white">
                  {report.status === 'OPTIMAL' ? 'Perfect (100%)' :
                   report.status === 'GOOD' ? 'Good Schedule' :
                   report.status === 'NEEDS_ATTENTION' ? 'Needs Attention' : 'Critical Clashes'}
                </div>
              </div>
            </div>

            {/* Critical Clashes */}
            <div className="p-3 bg-rose-500/15 border border-rose-400/30 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 font-black text-sm">
                {report.criticalCount}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-rose-300 truncate">Critical Clashes</div>
                <div className="text-[11px] text-white font-medium truncate">Double-Bookings</div>
              </div>
            </div>

            {/* Policy Warnings */}
            <div className="p-3 bg-amber-500/15 border border-amber-400/30 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-black text-sm">
                {report.warningCount}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-amber-300 truncate">Policy Warnings</div>
                <div className="text-[11px] text-white font-medium truncate">Rooms / Overload</div>
              </div>
            </div>

            {/* Advisories */}
            <div className="p-3 bg-blue-500/15 border border-blue-400/30 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 font-black text-sm">
                {report.advisoryCount}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-blue-300 truncate">Advisories</div>
                <div className="text-[11px] text-white font-medium truncate">Unassigned / Breaks</div>
              </div>
            </div>

            {/* Compliant Slots */}
            <div className="p-3 bg-emerald-500/15 border border-emerald-400/30 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 font-black text-sm">
                {report.compliantSlotsCount}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-emerald-300 truncate">Compliant Slots</div>
                <div className="text-[11px] text-white font-medium truncate">of {report.totalSlotsAnalyzed} total</div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            AUTO-RESOLVE NOTIFICATION BANNER
           ========================================================================= */}
        {autoResolveSuccess && (
          <div className="p-3 px-6 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{autoResolveSuccess}</span>
            </div>
            <button onClick={() => setAutoResolveSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            NAVIGATION TABS
           ========================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 pt-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'conflicts'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Conflict Ledger</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                report.totalConflicts > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {report.totalConflicts}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'teachers'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>Faculty Workload & Specialization</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {teachers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'classes'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Class Stream Coverage</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {report.classCoverages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'policies'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Institutional Policies</span>
            </button>
          </div>

          {/* Quick Auto-Resolve Button */}
          {report.criticalCount > 0 && (
            <button
              onClick={handleAutoResolveAll}
              className="mb-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Auto-Resolve {report.criticalCount} Clashes</span>
            </button>
          )}
        </div>

        {/* =========================================================================
            TAB CONTENT AREA
           ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-100/60">

          {/* ---------------------------------------------------------------------
              TAB 1: CONFLICT LEDGER & DIAGNOSTICS
             --------------------------------------------------------------------- */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              
              {/* Filter & Search Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search teacher, subject, class, room..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Severity Filter */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setSeverityFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md font-bold transition ${
                        severityFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({report.totalConflicts})
                    </button>
                    <button
                      onClick={() => setSeverityFilter('CRITICAL')}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                        severityFilter === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <span>Critical</span>
                      <span className="text-[10px] bg-white/20 px-1 rounded-full">{report.criticalCount}</span>
                    </button>
                    <button
                      onClick={() => setSeverityFilter('WARNING')}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                        severityFilter === 'WARNING' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      <span>Warnings</span>
                      <span className="text-[10px] bg-white/20 px-1 rounded-full">{report.warningCount}</span>
                    </button>
                    <button
                      onClick={() => setSeverityFilter('ADVISORY')}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                        severityFilter === 'ADVISORY' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <span>Advisories</span>
                      <span className="text-[10px] bg-white/20 px-1 rounded-full">{report.advisoryCount}</span>
                    </button>
                  </div>
                </div>

                {/* Dropdowns */}
                <div className="flex items-center gap-2">
                  <select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">All Days</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>

                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conflict Listing */}
              {filteredConflicts.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">
                    {report.totalConflicts === 0 
                      ? 'Zero Timetable Conflicts Detected!' 
                      : 'No Conflicts Match Active Filter Criteria'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    {report.totalConflicts === 0
                      ? 'Your timetable schedule conforms to all institutional policy rules: zero double-booked teachers, no rooming clashes, balanced workloads, and specialized subject assignments.'
                      : 'Try resetting the severity or day filters to inspect other schedule items.'}
                  </p>
                  {report.totalConflicts > 0 && (
                    <button
                      onClick={() => {
                        setSeverityFilter('ALL');
                        setCategoryFilter('ALL');
                        setDayFilter('ALL');
                        setClassFilter('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConflicts.map((conflict, idx) => {
                    const isCritical = conflict.severity === 'CRITICAL';
                    const isWarning = conflict.severity === 'WARNING';
                    
                    return (
                      <div
                        key={conflict.id}
                        className={`bg-white rounded-xl border p-4 sm:p-5 shadow-xs transition-all hover:shadow-md ${
                          isCritical ? 'border-rose-300 bg-rose-50/20' :
                          isWarning ? 'border-amber-300 bg-amber-50/20' :
                          'border-blue-200 bg-blue-50/20'
                        }`}
                      >
                        {/* Top row: Badges, Day, Period */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isCritical ? 'bg-rose-600 text-white' :
                              isWarning ? 'bg-amber-500 text-white' :
                              'bg-blue-600 text-white'
                            }`}>
                              {isCritical && <AlertTriangle className="w-3 h-3" />}
                              {isWarning && <AlertCircle className="w-3 h-3" />}
                              {!isCritical && !isWarning && <Info className="w-3 h-3" />}
                              <span>{conflict.severity}</span>
                            </span>

                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {conflict.category.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-bold text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              {conflict.day}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              {conflict.period}
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mt-3">
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            {conflict.title}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {conflict.description}
                          </p>
                        </div>

                        {/* Involved Slots Comparison Matrix */}
                        {conflict.involvedSlots.length > 0 && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-slate-400" />
                              <span>Involved Schedule Allocations ({conflict.involvedSlots.length})</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {conflict.involvedSlots.map((slot, sIdx) => {
                                const subTheme = getSubjectColor(slot.subject);
                                const formTheme = getFormStreamTheme(slot.className);

                                return (
                                  <div
                                    key={slot.assignmentId}
                                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-start justify-between gap-2"
                                  >
                                    <div className="space-y-1.5 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span 
                                          className="text-[10px] font-black px-2 py-0.5 rounded-md text-white"
                                          style={{ backgroundColor: formTheme.accent || '#2563eb' }}
                                        >
                                          {slot.className} - {slot.stream}
                                        </span>
                                        <span 
                                          className="text-[11px] font-bold px-2 py-0.5 rounded-md border"
                                          style={{ 
                                            backgroundColor: subTheme.bg, 
                                            color: subTheme.text,
                                            borderColor: subTheme.border
                                          }}
                                        >
                                          {slot.subject}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                                        {slot.teacherName && (
                                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                                            <User className="w-3 h-3 text-blue-600" />
                                            {slot.teacherName}
                                          </span>
                                        )}
                                        {slot.room && (
                                          <span className="flex items-center gap-1 text-slate-500">
                                            <MapPin className="w-3 h-3 text-emerald-600" />
                                            {slot.room}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action on this specific slot */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      {onEditSlot && (
                                        <button
                                          onClick={() => onEditSlot({
                                            className: slot.className,
                                            stream: slot.stream,
                                            day: conflict.day,
                                            period: conflict.period,
                                            assignment: assignments.find(a => a.id === slot.assignmentId)
                                          })}
                                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-transparent hover:border-blue-200 cursor-pointer"
                                          title="Edit this slot"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {slot.teacherId && (
                                        <button
                                          onClick={() => handleUnassignTeacher(slot.assignmentId)}
                                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold transition cursor-pointer"
                                          title="Free teacher from this slot while preserving subject"
                                        >
                                          Free Teacher
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Policy Violated & Actionable Recommendation */}
                        <div className="mt-3 flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
                          <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-600">
                            <span className="font-bold text-slate-800 block mb-0.5">Policy Benchmark:</span>
                            <span>{conflict.policyRule}</span>
                          </div>
                          <div className="flex-1 bg-blue-50/70 p-2 rounded-lg border border-blue-200 text-blue-900">
                            <span className="font-bold text-blue-950 block mb-0.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              Actionable Recommendation:
                            </span>
                            <span>{conflict.recommendation}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------------
              TAB 2: FACULTY WORKLOAD & SPECIALIZATION AUDIT
             --------------------------------------------------------------------- */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Teaching Staff Allocation & Capacity Matrix</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluates weekly workload against school ceiling ({policies.maxPeriodsPerTeacherPerWeek} periods/week) and verified subject accreditations.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                  {teachers.length} Faculty Members
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                        <th className="p-3">Faculty Member</th>
                        <th className="p-3">Accredited Subjects</th>
                        <th className="p-3 text-center">Weekly Load</th>
                        <th className="p-3">Daily Distribution (Mon-Fri)</th>
                        <th className="p-3 text-center">Specialization Match</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.teacherWorkloads.map(tw => {
                        const percentLoad = Math.min(100, Math.round((tw.totalPeriods / tw.maxWeeklyPeriods) * 100));

                        return (
                          <tr key={tw.teacherId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-medium">
                              <div className="font-bold text-slate-900">{tw.teacherName}</div>
                              <div className="text-[10px] text-slate-500">{tw.schoolRole}</div>
                            </td>

                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {tw.subjects.map(s => (
                                  <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <div className="font-black text-slate-800 text-xs">
                                {tw.totalPeriods} <span className="text-slate-400 font-normal">/ {tw.maxWeeklyPeriods}</span>
                              </div>
                              <div className="w-20 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    tw.isOverloaded ? 'bg-rose-600' :
                                    percentLoad > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${percentLoad}%` }}
                                />
                              </div>
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => {
                                  const count = tw.dailyDistribution[d] || 0;
                                  const isHigh = count > policies.maxPeriodsPerTeacherPerDay;
                                  return (
                                    <div 
                                      key={d}
                                      className={`px-1.5 py-1 rounded text-center min-w-[32px] border ${
                                        isHigh ? 'bg-rose-50 border-rose-300 text-rose-700 font-black' :
                                        count > 0 ? 'bg-slate-50 border-slate-200 text-slate-800 font-bold' :
                                        'bg-slate-100/50 border-transparent text-slate-400 font-normal'
                                      }`}
                                      title={`${d}: ${count} periods`}
                                    >
                                      <div className="text-[8px] uppercase tracking-tighter text-slate-400">{d.slice(0, 2)}</div>
                                      <div className="text-[11px]">{count}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              {tw.hasSpecializationBreach ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200" title={`Breached subjects: ${tw.breachedSubjects.join(', ')}`}>
                                  Mismatch ({tw.breachedSubjects.length})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                  100% Accredited
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {tw.isOverloaded ? (
                                <span className="px-2 py-1 rounded-md bg-rose-600 text-white text-[10px] font-black">
                                  Overloaded
                                </span>
                              ) : tw.exceedsDailyLimit ? (
                                <span className="px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-black">
                                  Daily Peak
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-black">
                                  Balanced
                                </span>
                              )}
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

          {/* ---------------------------------------------------------------------
              TAB 3: CLASS STREAM COVERAGE AUDIT
             --------------------------------------------------------------------- */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Class Stream Curriculum Audit</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verifies instructional period totals, subject diversity, and flags unassigned teacher periods across all parallel classes.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">
                  {report.classCoverages.length} Class Streams
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.classCoverages.map(cc => {
                  const formTheme = getFormStreamTheme(cc.className);

                  return (
                    <div 
                      key={`${cc.className}-${cc.stream}`}
                      className={`bg-white rounded-xl border p-4 shadow-xs transition hover:shadow-sm ${
                        cc.hasClash ? 'border-rose-300 bg-rose-50/15' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span 
                            className="px-2.5 py-0.5 rounded-md text-white font-extrabold text-xs"
                            style={{ backgroundColor: formTheme.accent || '#2563eb' }}
                          >
                            {cc.className}
                          </span>
                          <span className="font-bold text-xs text-slate-700">{cc.stream}</span>
                        </div>

                        {cc.hasClash ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200">
                            {cc.clashCount} Clash(es)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200">
                            Clean
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 my-3 text-center">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Periods</div>
                          <div className="text-base font-black text-slate-800">{cc.totalLessons}</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Subjects</div>
                          <div className="text-base font-black text-blue-700">{cc.subjectsTaught.length}</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Unassigned</div>
                          <div className={`text-base font-black ${cc.unassignedLessons > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                            {cc.unassignedLessons}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Curriculum Subjects ({cc.subjectsTaught.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cc.subjectsTaught.slice(0, 6).map(sub => (
                            <span key={sub} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold">
                              {sub}
                            </span>
                          ))}
                          {cc.subjectsTaught.length > 6 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">
                              +{cc.subjectsTaught.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------------
              TAB 4: INSTITUTIONAL POLICY CONFIGURATION
             --------------------------------------------------------------------- */}
          {activeTab === 'policies' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Institutional Scheduling Policies & Thresholds</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust the analytical parameters applied by the Timetable Integrity Engine to reflect your school's official operational guidelines.
                    </p>
                  </div>
                  <button
                    onClick={() => setPolicies(DEFAULT_INTEGRITY_POLICIES)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  {/* Slider: Max Periods per Day */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-slate-800">
                        Max Periods per Teacher / Day
                      </label>
                      <span className="text-xs font-black px-2 py-0.5 bg-blue-600 text-white rounded-md">
                        {policies.maxPeriodsPerTeacherPerDay} periods
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="7"
                      value={policies.maxPeriodsPerTeacherPerDay}
                      onChange={(e) => setPolicies({ ...policies, maxPeriodsPerTeacherPerDay: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">
                      Flags a daily workload peak warning if any teacher is scheduled for more than this threshold in a single day.
                    </p>
                  </div>

                  {/* Slider: Max Periods per Week */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-slate-800">
                        Max Weekly Load / Teacher
                      </label>
                      <span className="text-xs font-black px-2 py-0.5 bg-blue-600 text-white rounded-md">
                        {policies.maxPeriodsPerTeacherPerWeek} periods
                      </span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="32"
                      value={policies.maxPeriodsPerTeacherPerWeek}
                      onChange={(e) => setPolicies({ ...policies, maxPeriodsPerTeacherPerWeek: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">
                      Standard statutory teaching ceiling per week (default 24 periods = 16 hours of classroom instruction).
                    </p>
                  </div>

                  {/* Slider: Max Consecutive Periods */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-slate-800">
                        Max Consecutive Periods without Break
                      </label>
                      <span className="text-xs font-black px-2 py-0.5 bg-blue-600 text-white rounded-md">
                        {policies.maxConsecutivePeriods} periods
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="5"
                      value={policies.maxConsecutivePeriods}
                      onChange={(e) => setPolicies({ ...policies, maxConsecutivePeriods: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">
                      Advisory limit to prevent back-to-back teacher fatigue without pedagogical rest intervals.
                    </p>
                  </div>

                  {/* Slider: Max Same Subject per Day */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-slate-800">
                        Max Same Subject in 1 Day / Class
                      </label>
                      <span className="text-xs font-black px-2 py-0.5 bg-blue-600 text-white rounded-md">
                        {policies.maxSameSubjectPerDay} periods
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      value={policies.maxSameSubjectPerDay}
                      onChange={(e) => setPolicies({ ...policies, maxSameSubjectPerDay: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">
                      Prevents cognitive overload by limiting how many periods of the same academic subject are scheduled in one day.
                    </p>
                  </div>
                </div>

                {/* Audit Rule Toggles */}
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                    Active Audit Rules & Verification Checks
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'checkTeacherDoubleBooking', label: 'Strict Teacher Double-Booking Check', desc: 'Identifies same teacher booked into two classes at once' },
                      { key: 'checkClassDoubleBooking', label: 'Strict Class Double-Booking Check', desc: 'Identifies single class stream assigned two lessons at once' },
                      { key: 'checkRoomDoubleBooking', label: 'Room & Laboratory Collision Check', desc: 'Identifies two classes booked into the exact same laboratory or room' },
                      { key: 'checkSpecialization', label: 'Teacher Subject Specialization Audit', desc: 'Flags teachers scheduled for subjects outside their declared credentials' },
                      { key: 'checkTeachingStreams', label: 'Designated Stream Authorization Check', desc: 'Flags teachers assigned to streams outside their designated roster' },
                      { key: 'checkBreakEncroachment', label: 'Meal & Break Protection Audit', desc: 'Flags academic lessons scheduled into official break or lunch slots' },
                      { key: 'checkUnassignedLessons', label: 'Unassigned Lesson Detection', desc: 'Flags academic lessons that lack a designated instructor of record' },
                      { key: 'checkSameSubjectOverload', label: 'Curriculum Clustering Detection', desc: 'Flags classes with excessive periods of the same subject on one day' }
                    ].map(item => (
                      <label key={item.key} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                        <input
                          type="checkbox"
                          checked={policies[item.key as keyof IntegrityPolicySettings] as boolean}
                          onChange={(e) => setPolicies({ ...policies, [item.key]: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.label}</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* =========================================================================
            FOOTER ACTIONS
           ========================================================================= */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Current Schedule Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
              report.criticalCount === 0 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
            }`}>
              {report.criticalCount === 0 ? '✓ Zero Double-Bookings' : `⚠ ${report.criticalCount} Critical Clashes Detected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {report.criticalCount > 0 && (
              <button
                onClick={handleAutoResolveAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Auto-Resolve All Clashes</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {inlineMode ? 'Back to Timetable Grid' : 'Close Auditor'}
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          PRINT-ONLY OFFICIAL AUDIT REPORT (HIDDEN ON SCREEN, SHOWN ON PRINT)
         ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 text-black z-[9999] overflow-visible">
        {/* Ministry Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <div className="text-[12px] font-black uppercase tracking-wider">THE UNITED REPUBLIC OF TANZANIA</div>
          <div className="text-[11px] font-bold uppercase">MINISTRY OF EDUCATION, SCIENCE AND TECHNOLOGY</div>
          <div className="text-[16px] font-black uppercase mt-1 tracking-tight">{schoolName}</div>
          <div className="text-[13px] font-black uppercase mt-1 text-slate-800 tracking-wide border-t border-b border-black py-1 my-2">
            OFFICIAL ACADEMIC TIMETABLE INTEGRITY & POLICY AUDIT REPORT
          </div>
          <div className="text-[10px] text-slate-600 flex justify-between px-4 mt-2">
            <span>Date Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}</span>
            <span>Overall Integrity Score: <strong>{report.score}% ({report.status})</strong></span>
            <span>Analyzed Slots: <strong>{report.totalSlotsAnalyzed}</strong></span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-4 text-xs">
          <div className="font-bold uppercase text-[11px] border-b border-slate-300 pb-1 mb-2">1. Executive Summary & Diagnostics</div>
          <div className="grid grid-cols-4 gap-2 border border-black p-2 text-center text-[10px]">
            <div><strong>Critical Clashes:</strong> {report.criticalCount}</div>
            <div><strong>Policy Warnings:</strong> {report.warningCount}</div>
            <div><strong>Advisories:</strong> {report.advisoryCount}</div>
            <div><strong>Compliant Slots:</strong> {report.compliantSlotsCount} / {report.totalSlotsAnalyzed}</div>
          </div>
        </div>

        {/* Conflict Ledger Table */}
        <div className="mb-6">
          <div className="font-bold uppercase text-[11px] border-b border-slate-300 pb-1 mb-2">
            2. Detailed Schedule Conflict & Violation Ledger ({report.totalConflicts})
          </div>
          {report.conflicts.length === 0 ? (
            <div className="text-[11px] p-3 text-center border border-dashed border-slate-400">
              ✓ No schedule conflicts detected. Timetable is 100% compliant with institutional policies.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[10px] border border-black">
              <thead>
                <tr className="bg-slate-100 border-b border-black font-bold">
                  <th className="p-1 border-r border-black w-8">#</th>
                  <th className="p-1 border-r border-black">Severity</th>
                  <th className="p-1 border-r border-black">Day / Period</th>
                  <th className="p-1 border-r border-black">Conflict Description</th>
                  <th className="p-1 border-r border-black">Involved Allocations</th>
                  <th className="p-1">Policy Action / Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {report.conflicts.map((c, i) => (
                  <tr key={c.id}>
                    <td className="p-1 border-r border-black text-center">{i + 1}</td>
                    <td className="p-1 border-r border-black font-bold">{c.severity}</td>
                    <td className="p-1 border-r border-black">{c.day}, {c.period}</td>
                    <td className="p-1 border-r border-black font-medium">{c.title}</td>
                    <td className="p-1 border-r border-black">
                      {c.involvedSlots.map(s => `${s.className} ${s.stream} - ${s.subject} (${s.teacherName || 'No Teacher'})`).join(' | ')}
                    </td>
                    <td className="p-1">{c.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 mt-12 pt-4 border-t border-black text-[11px] text-center">
          <div>
            <div className="h-8"></div>
            <div className="border-t border-black pt-1 font-bold">Academic Master / Dean</div>
            <div className="text-[9px] text-slate-500">Signature & Date</div>
          </div>
          <div>
            <div className="h-8"></div>
            <div className="border-t border-black pt-1 font-bold">Timetable Committee Coordinator</div>
            <div className="text-[9px] text-slate-500">Signature & Date</div>
          </div>
          <div>
            <div className="h-8"></div>
            <div className="border-t border-black pt-1 font-bold">Headmaster / Principal</div>
            <div className="text-[9px] text-slate-500">Official Stamp & Date</div>
          </div>
        </div>
      </div>

    </div>
  );
};
