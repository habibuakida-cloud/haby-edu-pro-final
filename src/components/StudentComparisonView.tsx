import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Award, 
  ArrowLeft, 
  Printer, 
  Search, 
  Check, 
  Plus, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Crown, 
  Sparkles, 
  BarChart2, 
  BookOpen, 
  FileText, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Student, SchoolInfo } from '../types';
import { LedgerSubjectItem, ALL_AVAILABLE_SUBJECTS } from './ResultsView';
import { calculateOLevelDivision, isPrimaryOrNursery, getPrimarySubjectGradeInfo } from '../utils/reportCardUtils';

interface StudentComparisonViewProps {
  students: Student[];
  classCandidates: Student[];
  selectedCandidateIds: number[];
  onToggleSelectCandidate: (id: number) => void;
  onClearSelectedCandidates: () => void;
  onSelectCandidates: (ids: number[]) => void;
  activeLedgerSubjects: LedgerSubjectItem[];
  selectedClass: string;
  selectedStream: string;
  selectedExam: string;
  schoolInfo?: SchoolInfo;
  onBackToLedger: () => void;
}

export const StudentComparisonView: React.FC<StudentComparisonViewProps> = ({
  students,
  classCandidates,
  selectedCandidateIds,
  onToggleSelectCandidate,
  onClearSelectedCandidates,
  onSelectCandidates,
  activeLedgerSubjects,
  selectedClass,
  selectedStream,
  selectedExam,
  schoolInfo,
  onBackToLedger
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'bars' | 'insights'>('matrix');

  // If no candidates are selected initially, auto-select top 2 from current class candidates
  const effectiveSelectedIds = useMemo(() => {
    if (selectedCandidateIds.length > 0) return selectedCandidateIds;
    // Default to top 2 if available
    const sorted = [...classCandidates].sort((a, b) => (b.total || 0) - (a.total || 0));
    return sorted.slice(0, 2).map(s => s.id);
  }, [selectedCandidateIds, classCandidates]);

  // The actual student objects being compared
  const comparedStudents = useMemo(() => {
    return effectiveSelectedIds
      .map(id => students.find(s => s.id === id))
      .filter((s): s is Student => s !== undefined);
  }, [effectiveSelectedIds, students]);

  // Helper to get numeric mark for a student in a subject
  const getScore = (student: Student, subjectFullName: string, subjectKey: string): number | null => {
    let val: unknown = student.marks?.[subjectFullName] ?? student.marks?.[subjectKey];
    if (val === undefined && subjectKey === 'B.MATH') {
      val = student.marks?.['Basic Mathematics'] ?? student.marks?.['Mathematics'];
    }
    if (val === undefined && subjectKey === 'ENG') {
      val = student.marks?.['English Language'] ?? student.marks?.['English'];
    }
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  const isClassPrimary = isPrimaryOrNursery(undefined, selectedClass);

  // Grade helper based on standard NECTA O-Level boundary or Primary boundary
  const getGrade = (score: number | null): { grade: string; color: string; bg: string } => {
    if (score === null) return { grade: '-', color: 'text-slate-400', bg: 'bg-slate-100' };
    if (isClassPrimary) {
      const p = getPrimarySubjectGradeInfo(score);
      if (p.grade === 'A') return { grade: 'A', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };
      if (p.grade === 'B') return { grade: 'B', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' };
      if (p.grade === 'C') return { grade: 'C', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' };
      if (p.grade === 'D') return { grade: 'D', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300' };
      return { grade: 'E', color: 'text-rose-700', bg: 'bg-rose-100 border-rose-300' };
    }
    if (score >= 75) return { grade: 'A', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' };
    if (score >= 65) return { grade: 'B', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' };
    if (score >= 45) return { grade: 'C', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' };
    if (score >= 30) return { grade: 'D', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300' };
    return { grade: 'F', color: 'text-rose-700', bg: 'bg-rose-100 border-rose-300' };
  };

  // Class averages per subject for context
  const subjectAverages = useMemo(() => {
    const result: Record<string, number> = {};
    activeLedgerSubjects.forEach(sub => {
      let sum = 0;
      let count = 0;
      classCandidates.forEach(s => {
        const sc = getScore(s, sub.fullName, sub.key);
        if (sc !== null) {
          sum += sc;
          count++;
        }
      });
      result[sub.key] = count > 0 ? Number((sum / count).toFixed(1)) : 0;
    });
    return result;
  }, [activeLedgerSubjects, classCandidates]);

  // Highest score per subject among compared students
  const highestSubjectScores = useMemo(() => {
    const result: Record<string, number> = {};
    activeLedgerSubjects.forEach(sub => {
      let max = -1;
      comparedStudents.forEach(s => {
        const sc = getScore(s, sub.fullName, sub.key);
        if (sc !== null && sc > max) max = sc;
      });
      if (max >= 0) result[sub.key] = max;
    });
    return result;
  }, [activeLedgerSubjects, comparedStudents]);

  // Quick preset selections
  const handleSelectTop3 = () => {
    const sorted = [...classCandidates].sort((a, b) => (b.total || 0) - (a.total || 0));
    onSelectCandidates(sorted.slice(0, 3).map(s => s.id));
  };

  const handleSelectTop5 = () => {
    const sorted = [...classCandidates].sort((a, b) => (b.total || 0) - (a.total || 0));
    onSelectCandidates(sorted.slice(0, 5).map(s => s.id));
  };

  // Filter for adding students from candidate pool
  const candidatePool = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    return classCandidates.filter(s => {
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q);
    });
  }, [classCandidates, studentSearch]);

  const handlePrint = () => {
    window.print();
  };

  // Modern distinct student color themes for comparison columns
  const STUDENT_PALETTES = [
    { border: 'border-blue-500', headerBg: 'bg-blue-50 text-blue-900', badge: 'bg-blue-600 text-white', bar: 'bg-blue-600' },
    { border: 'border-emerald-500', headerBg: 'bg-emerald-50 text-emerald-900', badge: 'bg-emerald-600 text-white', bar: 'bg-emerald-600' },
    { border: 'border-purple-500', headerBg: 'bg-purple-50 text-purple-900', badge: 'bg-purple-600 text-white', bar: 'bg-purple-600' },
    { border: 'border-amber-500', headerBg: 'bg-amber-50 text-amber-900', badge: 'bg-amber-600 text-white', bar: 'bg-amber-600' },
    { border: 'border-rose-500', headerBg: 'bg-rose-50 text-rose-900', badge: 'bg-rose-600 text-white', bar: 'bg-rose-600' },
    { border: 'border-cyan-500', headerBg: 'bg-cyan-50 text-cyan-900', badge: 'bg-cyan-600 text-white', bar: 'bg-cyan-600' },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToLedger}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Return to marks ledger"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base sm:text-lg font-black text-[#1f4d8b] flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Multi-Student Side-by-Side Performance Comparison</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-9">
            Comparing <strong>{comparedStudents.length} candidates</strong> in{' '}
            <span className="font-semibold text-slate-800">{selectedClass} {selectedStream !== 'All' ? `Stream ${selectedStream}` : ''}</span> &bull; {selectedExam}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Subject Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bars')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'bars' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Visual Bars</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('insights')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'insights' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Key Insights</span>
            </button>
          </div>

          {/* Student Picker Button */}
          <button
            type="button"
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Select Students ({comparedStudents.length})</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Print comparative report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* QUICK PRESETS & STUDENT SELECTION PANEL (if open or empty) */}
      {isPickerOpen && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Select Candidates to Compare</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Check 2 to 6 students to compare their academic performance metrics side-by-side.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Presets:</span>
              <button
                type="button"
                onClick={handleSelectTop3}
                className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md hover:bg-amber-100 cursor-pointer"
              >
                Top 3 Candidates
              </button>
              <button
                type="button"
                onClick={handleSelectTop5}
                className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 rounded-md hover:bg-purple-100 cursor-pointer"
              >
                Top 5 Candidates
              </button>
              <button
                type="button"
                onClick={onClearSelectedCandidates}
                className="px-2.5 py-1 text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search candidates in class */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate by name or token/reg no..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Candidate Checkbox Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
            {candidatePool.map(cand => {
              const isSelected = effectiveSelectedIds.includes(cand.id);
              return (
                <label
                  key={cand.id}
                  onClick={() => onToggleSelectCandidate(cand.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-blue-600 text-white font-black' : 'border border-slate-400'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <div className="truncate">
                      <div className="truncate font-semibold">{cand.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{cand.regNo}</div>
                    </div>
                  </div>
                  <div className="text-right pl-2 whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-700">{cand.total ?? '-'} pts</span>
                    {cand.division && (
                      <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-bold">
                        Div {cand.division}
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Done Selecting ({effectiveSelectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: SIDE-BY-SIDE SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {comparedStudents.map((st, idx) => {
          const palette = STUDENT_PALETTES[idx % STUDENT_PALETTES.length];
          const bestScore = activeLedgerSubjects.reduce((max, sub) => {
            const sc = getScore(st, sub.fullName, sub.key);
            if (sc !== null && sc > max.score) {
              return { subject: sub.key, score: sc };
            }
            return max;
          }, { subject: '-', score: -1 });

          const scores = activeLedgerSubjects
            .map(sub => getScore(st, sub.fullName, sub.key))
            .filter((v): v is number => v !== null);

          const olevel = calculateOLevelDivision(st.marks || {});

          return (
            <div
              key={st.id}
              className={`bg-white border-2 ${palette.border} rounded-2xl p-4 shadow-xs relative flex flex-col justify-between`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${palette.badge} flex items-center justify-center font-black text-xs shadow-2xs`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 leading-snug line-clamp-1">
                        {st.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 font-medium">
                        {st.regNo}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleSelectCandidate(st.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove candidate from comparison"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Badges / Division */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">
                    {st.className} {st.stream || ''}
                  </span>
                  {st.gender && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                      {st.gender}
                    </span>
                  )}
                  {isClassPrimary ? (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      st.primaryGrade === 'A' || st.division === 'A' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      st.primaryGrade === 'B' || st.division === 'B' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      st.primaryGrade === 'C' || st.division === 'C' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      st.primaryGrade === 'D' || st.division === 'D' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                      'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      Grade {st.primaryGrade || st.division || 'A'} • {st.passStatus || (['A','B','C'].includes(st.primaryGrade || st.division || '') ? 'AMEFAULU' : 'HAJAFAULU')}
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      st.division === 'I' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      st.division === 'II' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      st.division === 'III' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      'bg-slate-100 text-slate-800 border-slate-300'
                    }`}>
                      DIV {st.division || olevel.division || 'N/A'} ({olevel.points} pts)
                    </span>
                  )}
                </div>
              </div>

              {/* Performance Metrics Grid */}
              <div className="my-4 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Total</span>
                  <span className="text-base font-black text-slate-800 font-mono">
                    {st.total ?? scores.reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Average</span>
                  <span className="text-base font-black text-indigo-700 font-mono">
                    {st.average ? `${st.average}%` : (scores.length > 0 ? `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}%` : '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Best Subject</span>
                  <span className="text-xs font-black text-emerald-700">
                    {bestScore.score >= 0 ? `${bestScore.subject} (${bestScore.score})` : '-'}
                  </span>
                </div>
              </div>

              {/* Subject mini-grade counts */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>Graded: <strong>{scores.length}</strong> / {activeLedgerSubjects.length} subjects</span>
                <span className="text-[10px] font-bold text-slate-400">Best 7 NECTA</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW MODE 1: SIDE-BY-SIDE SUBJECT MATRIX */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden" id="comparison-print-table">
          {/* Printable Letterhead */}
          <div className="hidden print:block p-6 border-b border-slate-300 text-center">
            <h1 className="text-xl font-black uppercase text-slate-900 tracking-wider">
              {schoolInfo?.name || 'SECONDARY SCHOOL'}
            </h1>
            <h2 className="text-sm font-bold text-slate-700 mt-1 uppercase">
              STUDENT SIDE-BY-SIDE ACADEMIC PERFORMANCE COMPARISON REPORT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Class: {selectedClass} &bull; Stream: {selectedStream} &bull; Examination: {selectedExam} &bull; Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 border-r border-slate-300 w-44">Subject Name</th>
                  <th className="p-3 border-r border-slate-300 text-center w-24">Class Avg</th>
                  {comparedStudents.map((st, idx) => {
                    const palette = STUDENT_PALETTES[idx % STUDENT_PALETTES.length];
                    return (
                      <th
                        key={st.id}
                        className={`p-3 border-r border-slate-300 text-center ${palette.headerBg}`}
                      >
                        <div className="font-black text-xs">{st.name}</div>
                        <div className="text-[10px] font-mono font-medium opacity-80">{st.regNo}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeLedgerSubjects.map(sub => {
                  const classAvg = subjectAverages[sub.key] || 0;
                  const highest = highestSubjectScores[sub.key] ?? -1;

                  return (
                    <tr key={sub.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{sub.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{sub.key} &bull; {sub.category}</div>
                      </td>

                      {/* Class Average */}
                      <td className="p-3 border-r border-slate-200 text-center font-mono font-semibold text-slate-600 bg-slate-50/50">
                        {classAvg > 0 ? `${classAvg}%` : '-'}
                      </td>

                      {/* Score per student */}
                      {comparedStudents.map(st => {
                        const sc = getScore(st, sub.fullName, sub.key);
                        const isHighest = sc !== null && sc === highest && comparedStudents.length > 1;
                        const gradeInfo = getGrade(sc);
                        const diffFromAvg = sc !== null && classAvg > 0 ? Number((sc - classAvg).toFixed(1)) : null;

                        return (
                          <td
                            key={st.id}
                            className={`p-3 border-r border-slate-200 text-center font-mono ${
                              isHighest ? 'bg-amber-50/60 font-bold' : ''
                            }`}
                          >
                            {sc !== null ? (
                              <div className="flex flex-col items-center justify-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-black text-slate-900">{sc}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${gradeInfo.bg} ${gradeInfo.color}`}>
                                    {gradeInfo.grade}
                                  </span>
                                  {isHighest && (
                                    <span title="Highest in comparison group">
                                      <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    </span>
                                  )}
                                </div>

                                {diffFromAvg !== null && (
                                  <div className={`text-[10px] flex items-center gap-0.5 mt-0.5 font-sans font-bold ${
                                    diffFromAvg >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {diffFromAvg >= 0 ? (
                                      <>
                                        <TrendingUp className="w-2.5 h-2.5" />
                                        <span>+{diffFromAvg}</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingDown className="w-2.5 h-2.5" />
                                        <span>{diffFromAvg}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-sans italic">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Summary Rows */}
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                  <td className="p-3 border-r border-slate-300 uppercase text-slate-800">
                    Total Marks Sum
                  </td>
                  <td className="p-3 border-r border-slate-300 text-center font-mono text-slate-500">
                    --
                  </td>
                  {comparedStudents.map(st => {
                    const scList = activeLedgerSubjects
                      .map(s => getScore(st, s.fullName, s.key))
                      .filter((v): v is number => v !== null);
                    const total = scList.reduce((a, b) => a + b, 0);

                    return (
                      <td key={st.id} className="p-3 border-r border-slate-300 text-center font-mono text-sm text-blue-900">
                        {total}
                      </td>
                    );
                  })}
                </tr>

                <tr className="bg-slate-50 font-black">
                  <td className="p-3 border-r border-slate-300 uppercase text-slate-800">
                    Overall Average %
                  </td>
                  <td className="p-3 border-r border-slate-300 text-center font-mono text-slate-500">
                    --
                  </td>
                  {comparedStudents.map(st => {
                    const scList = activeLedgerSubjects
                      .map(s => getScore(st, s.fullName, s.key))
                      .filter((v): v is number => v !== null);
                    const avg = scList.length > 0 ? (scList.reduce((a, b) => a + b, 0) / scList.length).toFixed(1) : '-';

                    return (
                      <td key={st.id} className="p-3 border-r border-slate-300 text-center font-mono text-sm text-indigo-700">
                        {avg}%
                      </td>
                    );
                  })}
                </tr>

                <tr className="bg-blue-50/50 font-black">
                  <td className="p-3 border-r border-slate-300 uppercase text-slate-800">
                    NECTA Division & Points
                  </td>
                  <td className="p-3 border-r border-slate-300 text-center font-mono text-slate-500">
                    --
                  </td>
                  {comparedStudents.map(st => {
                    const olevel = calculateOLevelDivision(st.marks || {});
                    return (
                      <td key={st.id} className="p-3 border-r border-slate-300 text-center font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white">
                          DIV {st.division || olevel.division} ({olevel.points} pts)
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: VISUAL BAR COMPARISON */}
      {viewMode === 'bars' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Visual Subject Marks Comparison (0 - 100)</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct graphical comparison of candidate scores for each curriculum subject.
            </p>
          </div>

          <div className="space-y-5">
            {activeLedgerSubjects.map(sub => {
              const highest = highestSubjectScores[sub.key] ?? -1;

              return (
                <div key={sub.key} className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>{sub.fullName} ({sub.key})</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Class Avg: <strong>{subjectAverages[sub.key] || 0}%</strong>
                    </span>
                  </div>

                  {/* Horizontal Bars */}
                  <div className="space-y-2 pt-1">
                    {comparedStudents.map((st, idx) => {
                      const palette = STUDENT_PALETTES[idx % STUDENT_PALETTES.length];
                      const sc = getScore(st, sub.fullName, sub.key);
                      const isHigh = sc !== null && sc === highest && comparedStudents.length > 1;

                      return (
                        <div key={st.id} className="flex items-center gap-3 text-xs">
                          <div className="w-32 truncate font-semibold text-slate-700 text-[11px]">
                            {st.name.split(' ')[0]} {st.name.split(' ')[1]?.charAt(0) || ''}.
                          </div>

                          <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden relative">
                            {sc !== null ? (
                              <div
                                style={{ width: `${Math.min(100, Math.max(5, sc))}%` }}
                                className={`h-full ${palette.bar} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                              >
                                <span className="text-[10px] font-black text-white">{sc}%</span>
                              </div>
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400 italic">
                                Not recorded
                              </div>
                            )}
                          </div>

                          <div className="w-10 text-right font-mono font-bold text-slate-800 flex items-center justify-end gap-1">
                            <span>{sc ?? '-'}</span>
                            {isHigh && <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: KEY INSIGHTS & COMPETITIVE STANDINGS */}
      {viewMode === 'insights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Subject Leaders & Category Honors</span>
            </h4>
            <p className="text-xs text-slate-500">
              Students who scored highest in each subject across the compared group.
            </p>

            <div className="space-y-2 divide-y divide-slate-100">
              {activeLedgerSubjects.map(sub => {
                const high = highestSubjectScores[sub.key] ?? -1;
                const topStudents = comparedStudents.filter(s => getScore(s, sub.fullName, sub.key) === high && high > 0);

                return (
                  <div key={sub.key} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{sub.fullName}</span>
                      <span className="text-slate-400 text-[10px] ml-1 font-mono">({sub.key})</span>
                    </div>

                    <div className="text-right">
                      {topStudents.length > 0 ? (
                        <div className="flex items-center gap-1 font-semibold text-emerald-700">
                          <span>{topStudents.map(t => t.name.split(' ')[0]).join(', ')}</span>
                          <span className="font-mono font-black bg-emerald-100 px-1.5 py-0.2 rounded text-[10px]">
                            {high}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">No score</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Comparative Diagnostic Assessment</span>
            </h4>
            <p className="text-xs text-slate-500">
              Actionable recommendations based on NECTA standards and subject strengths.
            </p>

            <div className="space-y-3">
              {comparedStudents.map(st => {
                const olevel = calculateOLevelDivision(st.marks || {});
                return (
                  <div key={st.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="font-black text-slate-900 flex items-center justify-between">
                      <span>{st.name}</span>
                      <span className="text-indigo-700 font-mono">DIV {st.division || olevel.division} ({olevel.points} pts)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Eligible for NECTA ranking based on best 7 subjects. Recommended for focused remedial practice in core sciences and mathematics to maximize point efficiency.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
