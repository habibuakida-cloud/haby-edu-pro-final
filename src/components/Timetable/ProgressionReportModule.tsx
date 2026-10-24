import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Layers,
  Plus,
  User,
  Calendar,
  Edit3,
  ArrowRight,
  Printer,
  Download
} from 'lucide-react';
import { StreamProgressionReport, SubjectProgressionItem } from '../../lib/timetableService';
import { getSubjectColor } from '../../utils/colors';
import { SchoolInfo } from '../../types';
import { exportProgressionReportPDF } from '../../utils/timetablePdfExport';

interface ProgressionReportModuleProps {
  reports: StreamProgressionReport[];
  schoolName?: string;
  schoolInfo?: SchoolInfo;
  levelFilter?: string;
  classFilter?: string;
  streamFilter?: string;
  statusFilter?: string;
  onConfigureStreamSubjects: (className: string, stream: string) => void;
  onQuickRegisterUnregistered: (className: string, stream: string, subject: string, periods: number) => void;
  onNavigateToGeneralTimetable?: (className: string, stream: string) => void;
}

export const ProgressionReportModule: React.FC<ProgressionReportModuleProps> = ({
  reports = [],
  schoolName = 'HABY EDUPRO',
  schoolInfo,
  levelFilter = 'ALL',
  classFilter = 'All',
  streamFilter = 'All',
  statusFilter = 'ALL',
  onConfigureStreamSubjects,
  onQuickRegisterUnregistered,
  onNavigateToGeneralTimetable
}) => {
  const [selectedVisualReportIndex, setSelectedVisualReportIndex] = useState<number>(0);

  // Aggregated subject-level completion across all currently filtered reports for the Visual Summary
  const aggregatedSubjectVisualSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        subject: string;
        totalRequired: number;
        totalEntered: number;
        totalRemaining: number;
        totalExcess: number;
        streamsCount: number;
        missingStreamsCount: number;
        incompleteStreamsCount: number;
        completeStreamsCount: number;
      }
    >();

    reports.forEach(rep => {
      rep.subjects.forEach(sub => {
        const key = sub.subject.trim().toLowerCase();
        const existing = map.get(key) || {
          subject: sub.subject,
          totalRequired: 0,
          totalEntered: 0,
          totalRemaining: 0,
          totalExcess: 0,
          streamsCount: 0,
          missingStreamsCount: 0,
          incompleteStreamsCount: 0,
          completeStreamsCount: 0
        };

        existing.totalRequired += sub.requiredPeriods;
        existing.totalEntered += Math.min(sub.enteredPeriods, sub.requiredPeriods);
        existing.totalRemaining += sub.remainingPeriods;
        existing.totalExcess += sub.excessPeriods;
        existing.streamsCount += 1;
        if (sub.status === 'MISSING') existing.missingStreamsCount += 1;
        else if (sub.status === 'INCOMPLETE') existing.incompleteStreamsCount += 1;
        else existing.completeStreamsCount += 1;

        map.set(key, existing);
      });
    });

    return Array.from(map.values())
      .map(item => {
        const pct =
          item.totalRequired > 0
            ? Math.min(100, Math.round((item.totalEntered / item.totalRequired) * 100))
            : 0;
        return {
          ...item,
          percentage: pct
        };
      })
      .sort((a, b) => a.percentage - b.percentage || a.subject.localeCompare(b.subject));
  }, [reports]);

  const safeSelectedIndex =
    selectedVisualReportIndex < reports.length ? selectedVisualReportIndex : 0;
  const activeVisualStreamReport = reports[safeSelectedIndex] || null;

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. VISUAL SUMMARY: SUBJECT PERCENTAGE COMPLETION VS GENERAL TIMETABLE */}
      {/* ===================================================================== */}
      {aggregatedSubjectVisualSummary.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5 print-avoid-break">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Visual Summary — Subject Percentage Completion vs. General Timetable
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                  {aggregatedSubjectVisualSummary.length} Required Subjects Analyzed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compares required subjects and expected weekly periods against actual entries in the General Timetable to highlight curriculum gaps.
              </p>
            </div>

            {/* Stream selector & Print / PDF Export Actions */}
            <div className="flex flex-wrap items-center gap-2 no-print">
              {reports.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Focus Stream:</span>
                  <select
                    value={safeSelectedIndex}
                    onChange={e => setSelectedVisualReportIndex(Number(e.target.value))}
                    className="font-black text-slate-900 bg-transparent outline-none cursor-pointer"
                  >
                    {reports.map((r, i) => (
                      <option key={`${r.className}_${r.stream}`} value={i}>
                        {r.className} — {r.stream} ({r.overallPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  exportProgressionReportPDF({
                    reports,
                    schoolName,
                    schoolInfo,
                    levelFilter,
                    classFilter,
                    streamFilter,
                    statusFilter,
                    mode: 'print'
                  })
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Chapisha (Print) Ripoti ya Progression ya Upangaji wa Vipindi"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Print Ripoti</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportProgressionReportPDF({
                    reports,
                    schoolName,
                    schoolInfo,
                    levelFilter,
                    classFilter,
                    streamFilter,
                    statusFilter,
                    mode: 'download'
                  })
                }
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Pakua Ripoti ya Progression ya Upangaji wa Vipindi kwenye PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Visual Completion Bar Chart Grid per Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {aggregatedSubjectVisualSummary.map(sub => {
              const subColor = getSubjectColor(sub.subject);
              const isComplete = sub.percentage === 100 && sub.totalRemaining === 0;
              const isZero = sub.percentage === 0;

              return (
                <div
                  key={sub.subject}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isComplete
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : isZero
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-amber-50/30 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            backgroundColor: subColor.bg,
                            color: subColor.text,
                            borderColor: subColor.border
                          }}
                          className="px-2 py-0.5 rounded-md border text-xs font-black truncate"
                        >
                          {sub.subject}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-semibold mt-1">
                        General Timetable: <strong className="text-slate-900">{sub.totalEntered}</strong> /{' '}
                        <strong>{sub.totalRequired}</strong> expected periods
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                        isComplete
                          ? 'bg-emerald-600 text-white'
                          : isZero
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {sub.percentage}%
                    </span>
                  </div>

                  {/* Visual Completion Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200/80">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isComplete
                            ? 'bg-emerald-500'
                            : isZero
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(isZero ? 4 : 0, Math.min(100, sub.percentage))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold">
                      {isComplete ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 100% Curriculum Load Met
                        </span>
                      ) : isZero ? (
                        <span className="text-rose-700 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Gap: {sub.totalRemaining} Periods Missing (0%)
                        </span>
                      ) : (
                        <span className="text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Gap: {sub.totalRemaining} Period(s) Deficit
                        </span>
                      )}
                      <span className="text-slate-500">
                        {sub.completeStreamsCount}/{sub.streamsCount} Streams OK
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. STREAM-BY-STREAM DETAILED PROGRESSION & GAP ANALYSIS CARDS         */}
      {/* ===================================================================== */}
      <div className="space-y-6">
        {reports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-black text-slate-800">
              No Class Streams Match Current Filter Criteria
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select another Class/Stream filter or configure Required Subjects and Expected Period Count for your classes.
            </p>
          </div>
        ) : (
          reports.map(report => {
            const streamKey = `${report.className}_${report.stream}`;
            const totalRemaining = report.subjects.reduce((s, item) => s + item.remainingPeriods, 0);

            return (
              <div
                key={streamKey}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden print-avoid-break ${
                  report.isFullyComplete
                    ? 'border-emerald-300'
                    : report.missingSubjects.length > 0
                    ? 'border-rose-300'
                    : 'border-slate-200'
                }`}
              >
                {/* Stream Card Header */}
                <div
                  className={`p-4 sm:p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    report.isFullyComplete
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : report.missingSubjects.length > 0
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black uppercase tracking-wide">
                        {report.className} — {report.stream}
                      </span>

                      {report.totalRequiredSubjects === 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Required Subjects Not Configured Yet</span>
                        </span>
                      ) : report.isFullyComplete ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✅ 100% Curriculum Load Matched in General Timetable</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>
                            🚩 Flagged Gap: {totalRemaining} Period(s) Missing ({report.overallPercentage}% Complete)
                          </span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium">
                      Required Subjects: <strong className="text-slate-900">{report.totalRequiredSubjects}</strong> •
                      Matched 100%: <strong className="text-emerald-700">{report.exactMatchSubjectsCount}/{report.totalRequiredSubjects}</strong> •
                      Missing (0 Periods): <strong className="text-rose-600">{report.missingSubjects.length}</strong> •
                      Under-Allocated: <strong className="text-amber-700">{report.incompleteSubjects.length}</strong> •
                      General Timetable Entries: <strong className="text-blue-700">{report.totalEnteredRegisteredPeriods} / {report.totalRequiredPeriods} Expected Periods</strong>
                    </p>
                  </div>

                  {/* Stream Overall Completion Gauge & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {report.totalRequiredSubjects > 0 && (
                      <div className="w-44 bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between text-[11px] font-black mb-1">
                          <span className="text-slate-600">Stream Completion</span>
                          <span className={report.isFullyComplete ? 'text-emerald-700' : 'text-blue-700'}>
                            {report.overallPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              report.isFullyComplete
                                ? 'bg-emerald-500'
                                : report.overallPercentage >= 70
                                ? 'bg-blue-600'
                                : report.overallPercentage >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, report.overallPercentage)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {onNavigateToGeneralTimetable && (
                      <button
                        type="button"
                        onClick={() => onNavigateToGeneralTimetable(report.className, report.stream)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                        title="Open this class stream in General Timetable to fill missing periods"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-300" />
                        <span>Open in General Timetable</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        exportProgressionReportPDF({
                          reports: [report],
                          schoolName,
                          schoolInfo,
                          levelFilter,
                          classFilter: report.className,
                          streamFilter: report.stream,
                          statusFilter,
                          mode: 'print'
                        })
                      }
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                      title={`Chapisha Ripoti ya ${report.className} (${report.stream})`}
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-700" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportProgressionReportPDF({
                          reports: [report],
                          schoolName,
                          schoolInfo,
                          levelFilter,
                          classFilter: report.className,
                          streamFilter: report.stream,
                          statusFilter,
                          mode: 'download'
                        })
                      }
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                      title={`Pakua PDF ya Ripoti ya ${report.className} (${report.stream})`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onConfigureStreamSubjects(report.className, report.stream)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs no-print"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Configure Required Subjects</span>
                    </button>
                  </div>
                </div>

                {/* Highlighted Curriculum Gaps Banner */}
                {(report.missingSubjects.length > 0 ||
                  report.incompleteSubjects.length > 0 ||
                  report.excessSubjects.length > 0) && (
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.missingSubjects.length > 0 && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-rose-900 font-black text-xs">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Missing Subjects — 0 Periods in General Timetable ({report.missingSubjects.length}):
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {report.missingSubjects.map(ms => (
                            <span
                              key={ms.allocationId}
                              className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-[11px] font-bold shadow-2xs"
                            >
                              {ms.subject} <strong className="text-rose-600">(0 / {ms.requiredPeriods} periods — 0%)</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.incompleteSubjects.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Under-Allocated Subjects — Deficit vs Expected Load ({report.incompleteSubjects.length}):
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {report.incompleteSubjects.map(inc => (
                            <span
                              key={inc.allocationId}
                              className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs"
                            >
                              {inc.subject}: <strong>{inc.enteredPeriods}/{inc.requiredPeriods}</strong> ({inc.percentage}%){' '}
                              <span className="text-rose-600 font-black">• Gap: -{inc.remainingPeriods}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Subject-by-Subject Comparison Table */}
                {report.totalRequiredSubjects === 0 ? (
                  <div className="p-6 text-center space-y-3">
                    <p className="text-xs text-slate-600">
                      <strong>{report.className} — {report.stream}</strong> has no Required Subjects or Expected Period Counts configured yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => onConfigureStreamSubjects(report.className, report.stream)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Define Required Subjects for {report.className} ({report.stream})</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Required Subject</th>
                          <th className="p-3">Assigned Teacher(s) in General Timetable</th>
                          <th className="p-3 text-center">Expected Periods / Wk</th>
                          <th className="p-3 text-center">Actual in General Timetable</th>
                          <th className="p-3 text-center">Gap / Variance</th>
                          <th className="p-3 w-48">Visual Completion (%)</th>
                          <th className="p-3 text-center">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {report.subjects.map((sub: SubjectProgressionItem, idx: number) => (
                          <tr
                            key={sub.allocationId}
                            className={`hover:bg-slate-50/80 transition ${
                              sub.status === 'MISSING'
                                ? 'bg-rose-50/30'
                                : sub.status === 'INCOMPLETE'
                                ? 'bg-amber-50/20'
                                : ''
                            }`}
                          >
                            <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-black text-slate-900">{sub.subject}</div>
                              <span className="text-[10px] text-slate-400">
                                {sub.isStreamSpecific
                                  ? `Stream-specific (${report.stream})`
                                  : `All streams of ${report.className}`}
                              </span>
                            </td>
                            <td className="p-3">
                              {sub.assignedTeachers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {sub.assignedTeachers.map(tName => (
                                    <span
                                      key={tName}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold"
                                    >
                                      <User className="w-2.5 h-2.5" />
                                      {tName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-rose-500 font-semibold italic">
                                  Not scheduled in General Timetable
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-black text-slate-900">
                              {sub.requiredPeriods}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                  sub.enteredPeriods === 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : sub.enteredPeriods < sub.requiredPeriods
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {sub.enteredPeriods}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {sub.status === 'COMPLETE' ? (
                                <span className="text-emerald-600 font-black">0 (Exact Match)</span>
                              ) : sub.status === 'EXCESS' ? (
                                <span className="text-indigo-600 font-black">
                                  +{sub.excessPeriods} Extra
                                </span>
                              ) : (
                                <span className="text-rose-600 font-black">
                                  -{sub.remainingPeriods} Missing
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      sub.status === 'COMPLETE'
                                        ? 'bg-emerald-500'
                                        : sub.status === 'EXCESS'
                                        ? 'bg-indigo-500'
                                        : sub.status === 'INCOMPLETE'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, sub.percentage)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-black text-slate-700 w-9 text-right">
                                  {sub.percentage}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {sub.status === 'COMPLETE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  <CheckCircle2 className="w-3 h-3" /> Complete (100%)
                                </span>
                              )}
                              {sub.status === 'MISSING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                  <XCircle className="w-3 h-3" /> Gap: Not Entered (0%)
                                </span>
                              )}
                              {sub.status === 'INCOMPLETE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                                  <AlertTriangle className="w-3 h-3" /> Gap: Deficit ({sub.enteredPeriods}/{sub.requiredPeriods})
                                </span>
                              )}
                              {sub.status === 'EXCESS' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                                  <AlertTriangle className="w-3 h-3" /> Excess (+{sub.excessPeriods})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Unregistered Subjects Found in General Timetable */}
                {report.unregisteredSubjects.length > 0 && (
                  <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-indigo-950">
                      <strong className="font-black">
                        Unregistered Subjects Scheduled in General Timetable ({report.unregisteredSubjects.length}):
                      </strong>{' '}
                      <span className="text-indigo-800">
                        These subjects appear in the General Timetable for {report.className} ({report.stream}) but are not listed in Required Subjects:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {report.unregisteredSubjects.map(u => (
                        <div
                          key={u.subject}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-indigo-950 shadow-2xs"
                        >
                          <span>
                            {u.subject} ({u.enteredPeriods} periods)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickRegisterUnregistered(
                                report.className,
                                report.stream,
                                u.subject,
                                u.enteredPeriods
                              )
                            }
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black cursor-pointer no-print"
                            title="Add this subject to Required Subjects for this stream"
                          >
                            + Add to Required
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
