import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  Medal, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ArrowLeft, 
  GraduationCap, 
  Star, 
  TrendingUp, 
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ExaminationRecord, Student, SchoolInfo } from '../../types';

interface TopPerformersLeaderboardProps {
  examinationRecords: ExaminationRecord[];
  students: Student[];
  schoolInfo?: SchoolInfo;
  defaultYear?: string;
  defaultClass?: string;
  onBackToLedger?: () => void;
}

export const TopPerformersLeaderboard: React.FC<TopPerformersLeaderboardProps> = ({
  examinationRecords = [],
  students = [],
  schoolInfo,
  defaultYear = '2026',
  defaultClass = 'All',
  onBackToLedger
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract available years and classes
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    examinationRecords.forEach(r => {
      if (r && r.academicYear) years.add(r.academicYear);
    });
    if (years.size === 0) years.add('2026');
    return Array.from(years).sort().reverse();
  }, [examinationRecords]);

  const availableClasses = useMemo(() => {
    const classes = new Set<string>();
    students.forEach(s => {
      if (s && s.className) classes.add(s.className.trim());
    });
    examinationRecords.forEach(r => {
      if (r && r.className) classes.add(r.className.trim());
    });
    return Array.from(classes).sort();
  }, [students, examinationRecords]);

  // Compute student rankings based on examination records
  const rankedStudents = useMemo(() => {
    const studentStatsMap = new Map<string, {
      studentId: string | number;
      studentName: string;
      className: string;
      stream: string;
      totalMarks: number;
      averageMarks: number;
      examsAttended: number;
      division: string;
    }>();

    // Initialize map with all students
    students.forEach(s => {
      if (!s || s.id === undefined) return;
      const sId = String(s.id);
      const name = s.name || s.fullName || 'Unknown Student';
      studentStatsMap.set(sId, {
        studentId: s.id,
        studentName: name,
        className: s.className || 'General',
        stream: s.stream || 'A',
        totalMarks: 0,
        averageMarks: 0,
        examsAttended: 0,
        division: s.division || 'IV'
      });
    });

    // Aggregate marks from examination records
    examinationRecords.forEach(rec => {
      if (!rec || rec.studentId === undefined) return;
      if (selectedYear !== 'All' && rec.academicYear && rec.academicYear !== selectedYear) return;
      if (selectedTerm !== 'All' && rec.term && rec.term !== selectedTerm) return;
      if (selectedClass !== 'All' && rec.className && rec.className.trim() !== selectedClass.trim()) return;

      const sIdStr = String(rec.studentId);
      let stats = studentStatsMap.get(sIdStr);
      if (!stats) {
        stats = {
          studentId: rec.studentId,
          studentName: rec.studentName || 'Student',
          className: rec.className || selectedClass || 'General',
          stream: rec.stream || 'A',
          totalMarks: 0,
          averageMarks: 0,
          examsAttended: 0,
          division: rec.division || 'IV'
        };
        studentStatsMap.set(sIdStr, stats);
      }

      if (typeof rec.totalMarks === 'number' && !isNaN(rec.totalMarks)) {
        stats.totalMarks += rec.totalMarks;
        if (typeof rec.averageMarks === 'number' && !isNaN(rec.averageMarks)) {
          stats.averageMarks = ((stats.averageMarks * stats.examsAttended) + rec.averageMarks) / (stats.examsAttended + 1);
        }
        stats.examsAttended += 1;
        if (rec.division) stats.division = rec.division;
      }
    });

    // Compute final list & sort
    const list = Array.from(studentStatsMap.values()).map(st => {
      const avg = st.examsAttended > 0 ? (st.averageMarks > 0 ? st.averageMarks : st.totalMarks / st.examsAttended) : 0;
      
      let div = st.division || 'IV';
      if (!div || div === '0') {
        if (avg >= 75) div = 'I';
        else if (avg >= 60) div = 'II';
        else if (avg >= 45) div = 'III';
        else if (avg >= 30) div = 'IV';
        else div = '0';
      }

      return {
        ...st,
        gpaOrAverage: Math.round(avg * 10) / 10,
        division: div
      };
    });

    // Filter by search term & class
    const filtered = list.filter(item => {
      if (selectedClass !== 'All' && item.className.trim() !== selectedClass.trim()) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return item.studentName.toLowerCase().includes(q) || item.className.toLowerCase().includes(q);
      }
      return true;
    });

    // Sort by average / total marks descending
    filtered.sort((a, b) => b.gpaOrAverage - a.gpaOrAverage);

    return filtered;
  }, [examinationRecords, students, selectedYear, selectedClass, selectedTerm, searchTerm]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
            <Trophy className="w-8 h-8 text-amber-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest bg-amber-400/20 text-amber-200 px-2.5 py-1 rounded-full border border-amber-300/30">
                Ubao wa Vinara (Leaderboard)
              </span>
              <span className="text-xs text-amber-200/80">({schoolInfo?.name || 'HabyEdu Pro School'})</span>
            </div>
            <h2 className="text-2xl font-black mt-1">Wanafunzi Wafanya Vizuri Zaidi (Top Performers)</h2>
            <p className="text-sm text-amber-100/80">Orodha rasmi ya wanafunzi waliofanya vizuri zaidi kitaaluma kwa mwaka {selectedYear}.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBackToLedger && (
            <button
              onClick={onBackToLedger}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Rudi Kwenye Ledger
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            Chapisha Orodha
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tafuta mwanafunzi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Academic Year */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">Miaka Yote</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Mwaka {yr}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">Madarasa Yote</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Term Filter */}
          <div>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">Muhula Wote</option>
              <option value="Term 1">Muhula I</option>
              <option value="Term 2">Muhula II</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold">
          Jumla: <span className="text-amber-600 font-black">{rankedStudents.length}</span> Wanafunzi
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-4 px-6">Nafasi (Rank)</th>
                <th className="py-4 px-6">Mwanafunzi</th>
                <th className="py-4 px-6">Darasa</th>
                <th className="py-4 px-6">Mkondo</th>
                <th className="py-4 px-6 text-center">Wastani / Alama</th>
                <th className="py-4 px-6 text-center">Daraja (Division)</th>
                <th className="py-4 px-6 text-center">Hali</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {rankedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-slate-300 opacity-50" />
                    Hakuna kumbukumbu za matokeo zilizopatikana kwa vigezo hivi.
                  </td>
                </tr>
              ) : (
                rankedStudents.map((st, idx) => {
                  const rank = idx + 1;
                  let rankBadgeBg = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (rank === 1) rankBadgeBg = 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm';
                  else if (rank === 2) rankBadgeBg = 'bg-slate-200 text-slate-800 border-slate-300';
                  else if (rank === 3) rankBadgeBg = 'bg-amber-700/10 text-amber-900 border-amber-700/30';

                  return (
                    <tr key={st.studentId} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-4 px-6 font-bold">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-black text-xs ${rankBadgeBg}`}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {st.studentName}
                          {rank <= 3 && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400">ID: {st.studentId}</div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-600">{st.className}</td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold text-slate-600 text-[10px]">
                          {st.stream}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-black text-slate-900 text-sm">
                          {st.gpaOrAverage.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black text-xs border ${
                          st.division === 'I' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          st.division === 'II' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          st.division === 'III' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          Daraja {st.division}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Amefaulu
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
