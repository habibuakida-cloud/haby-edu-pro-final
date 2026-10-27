import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Building2,
  Award,
  Printer,
  Download,
  FileText,
  FileSpreadsheet,
  Layers,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { JointExam, JointResult, JointSchool } from './JointExamModuleView';
import {
  SchoolGpaRankingRow,
  computeSubjectGradeSummary,
  computeOverallDivisionSummary,
} from './jointExamGpaUtils';

interface JointResultsSummaryTablesProps {
  currentExam: JointExam;
  schools: JointSchool[];
  results: JointResult[];
  schoolStats: SchoolGpaRankingRow[];
  examSubjects: string[];
  isPrimary: boolean;
  isSevenOrMoreSubjects: boolean;
  onDownloadJointPdf: () => void;
  onExportFullCsv: () => void;
  onPrintJointReport: () => void;
  onSelectSchoolFilter?: (schoolId: string) => void;
}

export const JointResultsSummaryTables: React.FC<JointResultsSummaryTablesProps> = ({
  currentExam,
  schools,
  results,
  schoolStats,
  examSubjects,
  isPrimary,
  isSevenOrMoreSubjects,
  onDownloadJointPdf,
  onExportFullCsv,
  onPrintJointReport,
  onSelectSchoolFilter,
}) => {
  const [subjectSummarySchoolFilter, setSubjectSummarySchoolFilter] = useState<string>('ALL');
  const [showGenderInSubjectTable, setShowGenderInSubjectTable] = useState<boolean>(true);

  const overallDivSummary = useMemo(
    () => computeOverallDivisionSummary(results, examSubjects, isPrimary, isSevenOrMoreSubjects),
    [results, examSubjects, isPrimary, isSevenOrMoreSubjects]
  );

  const subjectGradeRows = useMemo(
    () => computeSubjectGradeSummary(results, examSubjects, isPrimary, subjectSummarySchoolFilter),
    [results, examSubjects, isPrimary, subjectSummarySchoolFilter]
  );

  const selectedSchoolForSubjects = useMemo(
    () => schools.find((s) => s.id === subjectSummarySchoolFilter) || null,
    [schools, subjectSummarySchoolFilter]
  );

  // Totals across all subjects for footer row
  const subjectTotals = useMemo(() => {
    const totals = {
      A: { M: 0, F: 0, T: 0 },
      B: { M: 0, F: 0, T: 0 },
      C: { M: 0, F: 0, T: 0 },
      D: { M: 0, F: 0, T: 0 },
      E: { M: 0, F: 0, T: 0 },
      F: { M: 0, F: 0, T: 0 },
      passCount: 0,
      failCount: 0,
      satTotal: 0,
    };
    subjectGradeRows.forEach((row) => {
      (['A', 'B', 'C', 'D', 'E', 'F'] as const).forEach((g) => {
        totals[g].M += row.grades[g].M;
        totals[g].F += row.grades[g].F;
        totals[g].T += row.grades[g].T;
      });
      totals.passCount += row.passCount;
      totals.failCount += row.failCount;
      totals.satTotal += row.satCount;
    });
    return totals;
  }, [subjectGradeRows]);

  const failGradeKey = isPrimary ? 'E' : 'F';

  return (
    <div className="space-y-6">
      {/* =====================================================================
          TOP PRINT & EXPORT TOOLBAR BANNER
         ===================================================================== */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              {isSevenOrMoreSubjects
                ? 'MUHTASARI WA MATOKEO, DIVISION (MASOMO ≥ 7) & MASOMO (PRINT & EXPORT READY)'
                : 'MUHTASARI WA MATOKEO & GRADE (CHINI YA MASOMO 7 — BILA DIVISION)'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase">
              Shule {schools.length} • Masomo {examSubjects.length} • Watahiniwa {results.length}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            {isSevenOrMoreSubjects
              ? `Muhtasari wa Division kwa Shule Zote, Division kwa Kila Shule & Idadi ya Grade (A, B, C, D, ${failGradeKey}) kwa Kila Somo`
              : `Muhtasari wa Ufaulu (Bila Division — Chini ya Masomo 7) & Idadi ya Grade (A, B, C, D, ${failGradeKey}) kwa Kila Somo`}
          </h2>
          <p className="text-xs text-slate-300">
            {isSevenOrMoreSubjects ? (
              <>
                Mtihani una masomo <strong>7 au zaidi ({examSubjects.length})</strong> hivyo mfumo umetoa matokeo kwa{' '}
                <strong className="text-amber-300">Division (I, II, III, IV, 0)</strong> na Pointi za Masomo 7 Bora.
              </>
            ) : (
              <>
                Mtihani una <strong>chini ya masomo 7 (Masomo {examSubjects.length})</strong> hivyo mfumo{' '}
                <strong className="text-amber-300">haujakokotoa Division</strong> (unatoa Total, Average, Grade A–{failGradeKey}, G.P.A na Rank pekee).
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onPrintJointReport}
            disabled={results.length === 0}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-900" />
            <span>Print Matokeo &amp; Summary (A4)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadJointPdf}
            disabled={results.length === 0}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Pakua PDF (Matokeo + Summary Zote)</span>
          </button>

          <button
            type="button"
            onClick={onExportFullCsv}
            disabled={results.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV / Excel (Matokeo + Summary)</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. OVERALL SUMMARY ACROSS ALL PARTICIPATING SCHOOLS
             (DIVISION SUMMARY WHEN >= 7 SUBJECTS; GRADE SUMMARY WHEN < 7 SUBJECTS)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:break-inside-avoid">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                {isSevenOrMoreSubjects
                  ? '1. MUHTASARI WA DIVISION KWA SHULE ZOTE PAMOJA (OVERALL JOINT DIVISION & GPA SUMMARY — MASOMO ≥ 7)'
                  : '1. MUHTASARI WA UFAULU & DARAJA (GRADE) KWA SHULE ZOTE PAMOJA (CHINI YA MASOMO 7 — BILA DIVISION)'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Mchanganuo wa Jumla ya Watahiniwa wa Shule Zote ({schools.length}) kwa Jinsia (Wavulana M, Wasichana F, Jumla T na Asilimia %)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-bold text-slate-200 tabular-nums">
              Wastani wa Pamoja: <strong className="text-emerald-300">{overallDivSummary.overallMean}%</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black tabular-nums">
              Joint G.P.A: {overallDivSummary.overallGpaFormatted} ({overallDivSummary.overallGpaGrade} - {overallDivSummary.overallGpaRemark.split(' ')[0]})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                <th className="py-2.5 px-3 border-r border-slate-200">Jinsia / Kundi</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-slate-50">Waliosajiliwa (Reg)</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-blue-50 text-blue-950">Waliofanya (Sat)</th>
                {isSevenOrMoreSubjects ? (
                  <>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950">DIV I</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-blue-50 text-blue-950">DIV II</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-950">DIV III</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-orange-50 text-orange-950">DIV IV</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-rose-50 text-rose-950">DIV 0 (Fail)</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950">GRADE A</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-blue-50 text-blue-950">GRADE B</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-950">GRADE C</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-orange-50 text-orange-950">GRADE D</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-rose-50 text-rose-950">
                      GRADE {failGradeKey} (Fail)
                    </th>
                  </>
                )}
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-100/70 text-emerald-950">
                  Waliofaulu (Passed)
                </th>
                <th className="py-2.5 px-3 text-center bg-indigo-50 text-indigo-950">Ufaulu (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* WAVULANA (BOYS - M) */}
              <tr className="hover:bg-slate-50">
                <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                  Wavulana (Boys - M)
                </td>
                <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                  {overallDivSummary.totalRegistered.M}
                </td>
                <td className="py-2 px-3 text-center font-black text-blue-950 bg-blue-50/30 border-r border-slate-200">
                  {overallDivSummary.totalSat.M}
                </td>
                {isSevenOrMoreSubjects ? (
                  <>
                    <td className="py-2 px-3 text-center font-bold text-emerald-800 border-r border-slate-200">{overallDivSummary.divisions.I.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">{overallDivSummary.divisions.II.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-900 border-r border-slate-200">{overallDivSummary.divisions.III.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-orange-800 border-r border-slate-200">{overallDivSummary.divisions.IV.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-rose-800 border-r border-slate-200">{overallDivSummary.divisions['0'].M}</td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 text-center font-bold text-emerald-800 border-r border-slate-200">{overallDivSummary.grades.A.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">{overallDivSummary.grades.B.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-900 border-r border-slate-200">{overallDivSummary.grades.C.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-orange-800 border-r border-slate-200">{overallDivSummary.grades.D.M}</td>
                    <td className="py-2 px-3 text-center font-bold text-rose-800 border-r border-slate-200">
                      {isPrimary ? overallDivSummary.grades.E.M : overallDivSummary.grades.F.M}
                    </td>
                  </>
                )}
                <td className="py-2 px-3 text-center font-black text-emerald-900 bg-emerald-50/40 border-r border-slate-200">
                  {overallDivSummary.totalPassed.M}
                </td>
                <td className="py-2 px-3 text-center font-bold text-indigo-950">
                  {overallDivSummary.totalSat.M > 0
                    ? `${((overallDivSummary.totalPassed.M / overallDivSummary.totalSat.M) * 100).toFixed(1)}%`
                    : '0.0%'}
                </td>
              </tr>

              {/* WASICHANA (GIRLS - F) */}
              <tr className="hover:bg-slate-50">
                <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                  Wasichana (Girls - F)
                </td>
                <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-200">
                  {overallDivSummary.totalRegistered.F}
                </td>
                <td className="py-2 px-3 text-center font-black text-blue-950 bg-blue-50/30 border-r border-slate-200">
                  {overallDivSummary.totalSat.F}
                </td>
                {isSevenOrMoreSubjects ? (
                  <>
                    <td className="py-2 px-3 text-center font-bold text-emerald-800 border-r border-slate-200">{overallDivSummary.divisions.I.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">{overallDivSummary.divisions.II.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-900 border-r border-slate-200">{overallDivSummary.divisions.III.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-orange-800 border-r border-slate-200">{overallDivSummary.divisions.IV.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-rose-800 border-r border-slate-200">{overallDivSummary.divisions['0'].F}</td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 text-center font-bold text-emerald-800 border-r border-slate-200">{overallDivSummary.grades.A.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-blue-800 border-r border-slate-200">{overallDivSummary.grades.B.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-amber-900 border-r border-slate-200">{overallDivSummary.grades.C.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-orange-800 border-r border-slate-200">{overallDivSummary.grades.D.F}</td>
                    <td className="py-2 px-3 text-center font-bold text-rose-800 border-r border-slate-200">
                      {isPrimary ? overallDivSummary.grades.E.F : overallDivSummary.grades.F.F}
                    </td>
                  </>
                )}
                <td className="py-2 px-3 text-center font-black text-emerald-900 bg-emerald-50/40 border-r border-slate-200">
                  {overallDivSummary.totalPassed.F}
                </td>
                <td className="py-2 px-3 text-center font-bold text-indigo-950">
                  {overallDivSummary.totalSat.F > 0
                    ? `${((overallDivSummary.totalPassed.F / overallDivSummary.totalSat.F) * 100).toFixed(1)}%`
                    : '0.0%'}
                </td>
              </tr>

              {/* JUMLA KUU (TOTAL CANDIDATES - T) */}
              <tr className="bg-slate-100 font-black text-slate-950 border-t-2 border-slate-300">
                <td className="py-2.5 px-3 border-r border-slate-200 uppercase">
                  JUMLA KUU (TOTAL ALL SCHOOLS)
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-200">
                  {overallDivSummary.totalRegistered.T}
                </td>
                <td className="py-2.5 px-3 text-center bg-blue-100/70 text-blue-950 border-r border-slate-200">
                  {overallDivSummary.totalSat.T}
                </td>
                {isSevenOrMoreSubjects ? (
                  <>
                    <td className="py-2.5 px-3 text-center bg-emerald-100/70 text-emerald-950 border-r border-slate-200">{overallDivSummary.divisions.I.T}</td>
                    <td className="py-2.5 px-3 text-center bg-blue-100/70 text-blue-950 border-r border-slate-200">{overallDivSummary.divisions.II.T}</td>
                    <td className="py-2.5 px-3 text-center bg-amber-100/70 text-amber-950 border-r border-slate-200">{overallDivSummary.divisions.III.T}</td>
                    <td className="py-2.5 px-3 text-center bg-orange-100/70 text-orange-950 border-r border-slate-200">{overallDivSummary.divisions.IV.T}</td>
                    <td className="py-2.5 px-3 text-center bg-rose-100/70 text-rose-950 border-r border-slate-200">{overallDivSummary.divisions['0'].T}</td>
                  </>
                ) : (
                  <>
                    <td className="py-2.5 px-3 text-center bg-emerald-100/70 text-emerald-950 border-r border-slate-200">{overallDivSummary.grades.A.T}</td>
                    <td className="py-2.5 px-3 text-center bg-blue-100/70 text-blue-950 border-r border-slate-200">{overallDivSummary.grades.B.T}</td>
                    <td className="py-2.5 px-3 text-center bg-amber-100/70 text-amber-950 border-r border-slate-200">{overallDivSummary.grades.C.T}</td>
                    <td className="py-2.5 px-3 text-center bg-orange-100/70 text-orange-950 border-r border-slate-200">{overallDivSummary.grades.D.T}</td>
                    <td className="py-2.5 px-3 text-center bg-rose-100/70 text-rose-950 border-r border-slate-200">
                      {isPrimary ? overallDivSummary.grades.E.T : overallDivSummary.grades.F.T}
                    </td>
                  </>
                )}
                <td className="py-2.5 px-3 text-center bg-emerald-200/70 text-emerald-950 border-r border-slate-200">
                  {overallDivSummary.totalPassed.T}
                </td>
                <td className="py-2.5 px-3 text-center bg-indigo-100 text-indigo-950">
                  {overallDivSummary.totalPassed.pct}%
                </td>
              </tr>

              {/* ASILIMIA (%) ROW */}
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-600">
                <td className="py-2 px-3 border-r border-slate-200 uppercase">
                  Asilimia ya Waliofanya (%)
                </td>
                <td className="py-2 px-3 text-center border-r border-slate-200">-</td>
                <td className="py-2 px-3 text-center border-r border-slate-200">100%</td>
                {isSevenOrMoreSubjects ? (
                  <>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.divisions.I.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.divisions.II.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.divisions.III.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.divisions.IV.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.divisions['0'].pct}%</td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.grades.A.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.grades.B.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.grades.C.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">{overallDivSummary.grades.D.pct}%</td>
                    <td className="py-2 px-3 text-center border-r border-slate-200">
                      {isPrimary ? overallDivSummary.grades.E.pct : overallDivSummary.grades.F.pct}%
                    </td>
                  </>
                )}
                <td className="py-2 px-3 text-center border-r border-slate-200 font-black text-emerald-800">
                  {overallDivSummary.totalPassed.pct}%
                </td>
                <td className="py-2 px-3 text-center font-black text-indigo-900">
                  GPA: {overallDivSummary.overallGpaFormatted}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          2. SUMMARY PER PARTICIPATING SCHOOL
             (DIVISION SUMMARY WHEN >= 7 SUBJECTS; GRADE SUMMARY WHEN < 7 SUBJECTS)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:break-inside-avoid">
        <div className="px-5 py-3.5 bg-indigo-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                {isSevenOrMoreSubjects
                  ? '2. MUHTASARI WA DIVISION & G.P.A KWA KILA SHULE (DIVISION SUMMARY PER SCHOOL — MASOMO ≥ 7)'
                  : '2. MUHTASARI WA UFAULU, GRADE & G.P.A KWA KILA SHULE (CHINI YA MASOMO 7 — BILA DIVISION)'}
              </h3>
              <p className="text-[11px] text-indigo-200">
                Shule zimepangwa kuanzia ya Kwanza (#1) hadi ya Mwisho (#{schoolStats.length}) kulingana na G.P.A ya wanafunzi wake na idadi ya {isSevenOrMoreSubjects ? 'Division' : 'Grade'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-900 border border-indigo-700 text-[11px] font-bold text-indigo-100">
            Bonyeza Jina la Shule kuchuja matokeo yake
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-950">Nafasi (Rank)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[200px]">Jina la Shule (School Color Badge)</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200">Reg</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-blue-50 text-blue-950">Sat</th>
                {isSevenOrMoreSubjects ? (
                  <>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950">DIV I</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-blue-50 text-blue-950">DIV II</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-amber-50 text-amber-950">DIV III</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-orange-50 text-orange-950">DIV IV</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-rose-50 text-rose-950">DIV 0</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950">GRD A</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-blue-50 text-blue-950">GRD B</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-amber-50 text-amber-950">GRD C</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-orange-50 text-orange-950">GRD D</th>
                    <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-rose-50 text-rose-950">GRD {failGradeKey}</th>
                  </>
                )}
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-emerald-100/60 text-emerald-950">Passed</th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200">Pass %</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-sky-50 text-sky-950">Wastani (%)</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-indigo-50 text-indigo-950">School G.P.A</th>
                <th className="py-2.5 px-3 text-center bg-indigo-50 text-indigo-950">Daraja (Grade)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schoolStats.map((st) => {
                const divTotalForSchool =
                  st.divCounts.I + st.divCounts.II + st.divCounts.III + st.divCounts.IV + st.divCounts['0'];
                const schoolPassed =
                  isSevenOrMoreSubjects && divTotalForSchool > 0
                    ? st.divCounts.I + st.divCounts.II + st.divCounts.III + st.divCounts.IV
                    : st.gradeCounts.A + st.gradeCounts.B + st.gradeCounts.C + st.gradeCounts.D;

                return (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-50 transition-colors"
                    style={{ borderLeft: `5px solid ${st.hexColor}` }}
                  >
                    <td className="py-2.5 px-3 text-center font-black border-r border-slate-200">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-black ${
                          st.schoolPosition === 1
                            ? 'bg-amber-400 text-slate-950'
                            : st.schoolPosition === 2
                            ? 'bg-slate-300 text-slate-900'
                            : st.schoolPosition === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {st.schoolPosition} / {st.totalSchools}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectSummarySchoolFilter(st.id);
                          if (onSelectSchoolFilter) onSelectSchoolFilter(st.id);
                        }}
                        className="flex items-center gap-2 text-left group cursor-pointer"
                      >
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black text-white shrink-0"
                          style={{ backgroundColor: st.hexColor }}
                        >
                          {st.schoolCode}
                        </span>
                        <span className="font-black text-slate-900 group-hover:text-blue-700 group-hover:underline">
                          {st.schoolName}
                        </span>
                      </button>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold text-slate-700 border-r border-slate-200">
                      {st.studentCount}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-black text-blue-950 bg-blue-50/30 border-r border-slate-200">
                      {st.satCount}
                    </td>
                    {isSevenOrMoreSubjects ? (
                      <>
                        <td className="py-2.5 px-2.5 text-center font-black text-emerald-800 bg-emerald-50/30 border-r border-slate-200">{st.divCounts.I}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-blue-800 bg-blue-50/30 border-r border-slate-200">{st.divCounts.II}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-amber-900 bg-amber-50/30 border-r border-slate-200">{st.divCounts.III}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-orange-800 bg-orange-50/30 border-r border-slate-200">{st.divCounts.IV}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-rose-800 bg-rose-50/30 border-r border-slate-200">{st.divCounts['0']}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 px-2.5 text-center font-black text-emerald-800 bg-emerald-50/30 border-r border-slate-200">{st.gradeCounts.A}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-blue-800 bg-blue-50/30 border-r border-slate-200">{st.gradeCounts.B}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-amber-900 bg-amber-50/30 border-r border-slate-200">{st.gradeCounts.C}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-orange-800 bg-orange-50/30 border-r border-slate-200">{st.gradeCounts.D}</td>
                        <td className="py-2.5 px-2.5 text-center font-black text-rose-800 bg-rose-50/30 border-r border-slate-200">
                          {isPrimary ? st.gradeCounts.E : st.gradeCounts.F}
                        </td>
                      </>
                    )}
                    <td className="py-2.5 px-2.5 text-center font-black text-emerald-950 bg-emerald-50/50 border-r border-slate-200">
                      {schoolPassed}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                      {st.passRate}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-sky-950 bg-sky-50/40 border-r border-slate-200">
                      {st.meanAvg}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-50/50 border-r border-slate-200">
                      {st.schoolGpaFormatted}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-indigo-50/30">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${st.schoolGpaColorClass}`}>
                        Grade {st.schoolGpaGrade} ({st.schoolGpaRemark.split(' ')[0]})
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* FOOTER ROW: JUMLA YA SHULE ZOTE */}
              <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-amber-400">
                  ALL ({schoolStats.length})
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 uppercase">
                  JUMLA KUU YA SHULE ZOTE (OVERALL JOINT TOTAL)
                </td>
                <td className="py-2.5 px-2.5 text-center border-r border-slate-700">
                  {overallDivSummary.totalRegistered.T}
                </td>
                <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-blue-300">
                  {overallDivSummary.totalSat.T}
                </td>
                {isSevenOrMoreSubjects ? (
                  <>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-emerald-300">{overallDivSummary.divisions.I.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-blue-300">{overallDivSummary.divisions.II.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-amber-300">{overallDivSummary.divisions.III.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-orange-300">{overallDivSummary.divisions.IV.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-rose-300">{overallDivSummary.divisions['0'].T}</td>
                  </>
                ) : (
                  <>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-emerald-300">{overallDivSummary.grades.A.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-blue-300">{overallDivSummary.grades.B.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-amber-300">{overallDivSummary.grades.C.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-orange-300">{overallDivSummary.grades.D.T}</td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-rose-300">
                      {isPrimary ? overallDivSummary.grades.E.T : overallDivSummary.grades.F.T}
                    </td>
                  </>
                )}
                <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-emerald-300">
                  {overallDivSummary.totalPassed.T}
                </td>
                <td className="py-2.5 px-2.5 text-center border-r border-slate-700">
                  {overallDivSummary.totalPassed.pct}%
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-sky-300">
                  {overallDivSummary.overallMean}%
                </td>
                <td className="py-2.5 px-3 text-center font-mono border-r border-slate-700 text-amber-300">
                  {overallDivSummary.overallGpaFormatted}
                </td>
                <td className="py-2.5 px-3 text-center text-amber-300">
                  Grade {overallDivSummary.overallGpaGrade} ({overallDivSummary.overallGpaRemark.split(' ')[0]})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          3. SUBJECT-BY-SUBJECT GRADE DISTRIBUTION SUMMARY
             (KILA SOMO KUNA A NGAPI, B NGAPI, C NGAPI, D NGAPI, E/F NGAPI)
         ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:break-inside-avoid">
        <div className="px-5 py-4 bg-emerald-950 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  3. MUHTASARI WA MATOKEO KWA KILA SOMO (SUBJECT GRADE DISTRIBUTION: A, B, C, D, {failGradeKey})
                </h3>
                {selectedSchoolForSubjects ? (
                  <span
                    className="px-2.5 py-0.5 rounded text-[10px] font-black text-white"
                    style={{ backgroundColor: selectedSchoolForSubjects.hexColor }}
                  >
                    SHULE: {selectedSchoolForSubjects.schoolCode} — {selectedSchoolForSubjects.schoolName}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase">
                    SHULE ZOTE PAMOJA ({schools.length} SCHOOLS COMBINED)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Inaonesha kila somo lina <strong>Grade A ngapi, B ngapi, C ngapi, D ngapi na {failGradeKey} ngapi</strong>, Waliofaulu, Wastani (%) na G.P.A ya Somo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Filter Subject Summary by All Schools or Specific School */}
            <div className="flex items-center gap-1.5 bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-700">
              <Filter className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[10px] font-black uppercase text-emerald-200">Chuja Shule:</span>
              <select
                value={subjectSummarySchoolFilter}
                onChange={(e) => setSubjectSummarySchoolFilter(e.target.value)}
                className="bg-transparent text-white text-xs font-black focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  Shule Zote Pamoja ({schools.length} Schools)
                </option>
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id} className="bg-slate-900 text-white">
                    {sch.schoolCode} — {sch.schoolName}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowGenderInSubjectTable((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-[11px] font-bold text-emerald-100 cursor-pointer"
            >
              {showGenderInSubjectTable ? 'Ficha Jinsia (M/F)' : 'Onyesha Jinsia (M/F)'}
            </button>
          </div>
        </div>

        {/* School quick filter pills */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1.5 print:hidden">
          <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Chagua Mtazamo wa Masomo:</span>
          <button
            type="button"
            onClick={() => setSubjectSummarySchoolFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer ${
              subjectSummarySchoolFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
            }`}
          >
            Shule Zote Pamoja
          </button>
          {schools.map((sch) => {
            const active = subjectSummarySchoolFilter === sch.id;
            return (
              <button
                key={sch.id}
                type="button"
                onClick={() => setSubjectSummarySchoolFilter(sch.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
                style={active ? { backgroundColor: sch.hexColor } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? '#ffffff' : sch.hexColor }}
                />
                <span>{sch.schoolCode}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-950">Rank</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[165px]">Somo (Subject Name)</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-200">Reg</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-200 bg-blue-50 text-blue-950">Sat</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-50 text-emerald-950">
                  GRADE A
                  {showGenderInSubjectTable && <span className="block text-[9px] font-bold text-emerald-700">(Jumla | M / F)</span>}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-blue-50 text-blue-950">
                  GRADE B
                  {showGenderInSubjectTable && <span className="block text-[9px] font-bold text-blue-700">(Jumla | M / F)</span>}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-950">
                  GRADE C
                  {showGenderInSubjectTable && <span className="block text-[9px] font-bold text-amber-800">(Jumla | M / F)</span>}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-orange-50 text-orange-950">
                  GRADE D
                  {showGenderInSubjectTable && <span className="block text-[9px] font-bold text-orange-800">(Jumla | M / F)</span>}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-rose-50 text-rose-950">
                  GRADE {failGradeKey}
                  {showGenderInSubjectTable && <span className="block text-[9px] font-bold text-rose-800">(Jumla | M / F)</span>}
                </th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200 bg-emerald-100/60 text-emerald-950">
                  Waliofaulu (A–D)
                </th>
                <th className="py-2.5 px-2.5 text-center border-r border-slate-200">Pass %</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-sky-50 text-sky-950">Wastani (%)</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 bg-indigo-50 text-indigo-950">Subject G.P.A</th>
                <th className="py-2.5 px-3 text-center bg-indigo-50 text-indigo-950">Daraja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subjectGradeRows.map((row) => {
                const failObj = isPrimary ? row.grades.E : row.grades.F;
                return (
                  <tr key={row.subject} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center font-black border-r border-slate-200">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-black ${
                          row.subjectPosition === 1
                            ? 'bg-amber-400 text-slate-950'
                            : row.subjectPosition === 2
                            ? 'bg-slate-300 text-slate-900'
                            : row.subjectPosition === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {row.subjectPosition} / {row.totalSubjects}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200">
                      {row.subject}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                      {row.registeredCount}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-blue-950 bg-blue-50/30 border-r border-slate-200">
                      {row.satCount}
                    </td>

                    {/* GRADE A */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-emerald-50/30">
                      <span className="text-sm font-black text-emerald-900">{row.grades.A.T}</span>
                      {showGenderInSubjectTable && (
                        <span className="block text-[10px] font-semibold text-slate-500">
                          M:{row.grades.A.M} • F:{row.grades.A.F}
                        </span>
                      )}
                    </td>

                    {/* GRADE B */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-blue-50/30">
                      <span className="text-sm font-black text-blue-900">{row.grades.B.T}</span>
                      {showGenderInSubjectTable && (
                        <span className="block text-[10px] font-semibold text-slate-500">
                          M:{row.grades.B.M} • F:{row.grades.B.F}
                        </span>
                      )}
                    </td>

                    {/* GRADE C */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-amber-50/30">
                      <span className="text-sm font-black text-amber-950">{row.grades.C.T}</span>
                      {showGenderInSubjectTable && (
                        <span className="block text-[10px] font-semibold text-slate-500">
                          M:{row.grades.C.M} • F:{row.grades.C.F}
                        </span>
                      )}
                    </td>

                    {/* GRADE D */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-orange-50/30">
                      <span className="text-sm font-black text-orange-900">{row.grades.D.T}</span>
                      {showGenderInSubjectTable && (
                        <span className="block text-[10px] font-semibold text-slate-500">
                          M:{row.grades.D.M} • F:{row.grades.D.F}
                        </span>
                      )}
                    </td>

                    {/* GRADE E or F */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 bg-rose-50/30">
                      <span className="text-sm font-black text-rose-900">{failObj.T}</span>
                      {showGenderInSubjectTable && (
                        <span className="block text-[10px] font-semibold text-slate-500">
                          M:{failObj.M} • F:{failObj.F}
                        </span>
                      )}
                    </td>

                    {/* PASSED (A-D) */}
                    <td className="py-2.5 px-2.5 text-center font-black text-emerald-950 bg-emerald-50/50 border-r border-slate-200">
                      {row.passCount}
                    </td>

                    {/* PASS RATE % */}
                    <td className="py-2.5 px-2.5 text-center font-bold text-slate-800 border-r border-slate-200">
                      {row.passRate}%
                    </td>

                    {/* MEAN SCORE % */}
                    <td className="py-2.5 px-3 text-center font-black text-sky-950 bg-sky-50/40 border-r border-slate-200">
                      {row.meanScore}%
                    </td>

                    {/* SUBJECT GPA */}
                    <td className="py-2.5 px-3 text-center font-mono font-black text-indigo-950 bg-indigo-50/50 border-r border-slate-200">
                      {row.subjectGpaFormatted}
                    </td>

                    {/* SUBJECT GRADE */}
                    <td className="py-2.5 px-3 text-center bg-indigo-50/30">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${row.subjectBadgeClass}`}>
                        {row.subjectGrade} ({row.subjectRemark.split(' ')[0]})
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* TOTAL SUBJECT ENTRIES FOOTER ROW */}
              <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-800">
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-amber-400">
                  SUM
                </td>
                <td className="py-2.5 px-3 border-r border-slate-700 uppercase">
                  JUMLA YA ALAMA ZA MASOMO YOTE ({examSubjects.length} SUBJECTS)
                </td>
                <td className="py-2.5 px-2 text-center border-r border-slate-700">-</td>
                <td className="py-2.5 px-2 text-center border-r border-slate-700 text-blue-300">
                  {subjectTotals.satTotal}
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-emerald-300">
                  {subjectTotals.A.T}
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-blue-300">
                  {subjectTotals.B.T}
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-amber-300">
                  {subjectTotals.C.T}
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-orange-300">
                  {subjectTotals.D.T}
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-rose-300">
                  {isPrimary ? subjectTotals.E.T : subjectTotals.F.T}
                </td>
                <td className="py-2.5 px-2.5 text-center border-r border-slate-700 text-emerald-300">
                  {subjectTotals.passCount}
                </td>
                <td className="py-2.5 px-2.5 text-center border-r border-slate-700">
                  {subjectTotals.satTotal > 0
                    ? `${((subjectTotals.passCount / subjectTotals.satTotal) * 100).toFixed(1)}%`
                    : '0.0%'}
                </td>
                <td className="py-2.5 px-3 text-center border-r border-slate-700 text-sky-300">
                  {overallDivSummary.overallMean}%
                </td>
                <td className="py-2.5 px-3 text-center font-mono border-r border-slate-700 text-amber-300">
                  {overallDivSummary.overallGpaFormatted}
                </td>
                <td className="py-2.5 px-3 text-center text-amber-300">
                  Grade {overallDivSummary.overallGpaGrade}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
