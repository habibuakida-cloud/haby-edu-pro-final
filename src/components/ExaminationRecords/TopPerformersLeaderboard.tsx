import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Award,
  Medal,
  Crown,
  Star,
  Sparkles,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  Search,
  Filter,
  Users,
  GraduationCap,
  TrendingUp,
  FileSpreadsheet,
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  CheckCircle2,
  Layers,
  Flame,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import {
  ExaminationRecord,
  Student,
  SchoolInfo
} from '../../types';
import {
  ALL_SCHOOL_CLASSES,
  NURSERY_CLASSES,
  PRIMARY_CLASSES,
  SECONDARY_CLASSES
} from '../../constants/defaults';
import { getGradeColor, getGradeRemark } from '../../utils/examinationRecordsUtils';

interface TopPerformersLeaderboardProps {
  examinationRecords: ExaminationRecord[];
  students: Student[];
  schoolInfo: SchoolInfo;
  defaultYear?: string;
  defaultClass?: string;
  onBackToLedger?: () => void;
}

export type RankingMetricMode = 'overall_average' | 'specific_subject';
export type GenderFilterOption = 'ALL' | 'MALE' | 'FEMALE';
export type LeaderboardLimitOption = 3 | 5 | 10 | 20 | 50 | 'ALL';

export interface LeaderboardEntry {
  rank: number;
  originalPosition: number;
  recordId: string;
  studentId: number;
  studentName: string;
  regNo: string;
  gender: string;
  className: string;
  stream: string;
  subjectAverage: number;
  totalMarks: number;
  subjectsCount: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  division: string;
  points: number | null;
  bestSubject: string;
  bestSubjectScore: number;
  bestSubjectGrade: string;
  selectedSubjectScore?: number;
  selectedSubjectGrade?: string;
  parentPhone?: string;
  teacherRemarks?: string;
  academicStanding: string;
}

export interface SubjectChampionInfo {
  subjectName: string;
  studentName: string;
  studentId: number;
  score: number;
  grade: string;
  className: string;
  gender: string;
}

export const TopPerformersLeaderboard: React.FC<TopPerformersLeaderboardProps> = ({
  examinationRecords,
  students,
  schoolInfo,
  defaultYear = '2026',
  defaultClass = 'All',
  onBackToLedger
}) => {
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedExamType, setSelectedExamType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Ranking Metric
  const [rankingMode, setRankingMode] = useState<RankingMetricMode>('overall_average');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // Gender & Limit
  const [genderFilter, setGenderFilter] = useState<GenderFilterOption>('ALL');
  const [leaderboardLimit, setLeaderboardLimit] = useState<LeaderboardLimitOption>(10);

  // Sorting order within leaderboard
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Copy status
  const [copiedAnnouncement, setCopiedAnnouncement] = useState<boolean>(false);

  // Available academic years
  const availableYears = useMemo(() => {
    const set = new Set<string>(['2026', '2025', '2024']);
    examinationRecords.forEach(r => {
      if (r.academicYear) set.add(r.academicYear);
    });
    return Array.from(set).sort().reverse();
  }, [examinationRecords]);

  // Available streams for selected class
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    examinationRecords.forEach(r => {
      if ((selectedClass === 'All' || r.className === selectedClass) && r.stream) {
        set.add(r.stream);
      }
    });
    students.forEach(s => {
      if ((selectedClass === 'All' || s.className === selectedClass) && s.stream) {
        set.add(s.stream);
      }
    });
    return Array.from(set).sort();
  }, [examinationRecords, students, selectedClass]);

  // All distinct subjects available in current cohort
  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>(); // lowercase -> display
    examinationRecords.forEach(r => {
      if (
        (selectedYear === 'All' || r.academicYear === selectedYear) &&
        (selectedClass === 'All' || r.className === selectedClass) &&
        r.subjects
      ) {
        Object.keys(r.subjects).forEach(rawSub => {
          const clean = rawSub.trim();
          if (clean && !map.has(clean.toLowerCase())) {
            map.set(clean.toLowerCase(), clean);
          }
        });
      }
    });
    return Array.from(map.values()).sort();
  }, [examinationRecords, selectedYear, selectedClass]);

  // Helper to get academic standing label
  const getAcademicStanding = (avg: number, grade: string, div: string) => {
    if (avg >= 80 || div === 'I' || grade === 'A') {
      return { label: 'Summa Cum Laude (Distinction)', swahili: 'Ufaulu wa Juu Zaidi (Daraja la Kwanza)', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (avg >= 65 || div === 'II' || grade === 'B') {
      return { label: 'Magna Cum Laude (High Credit)', swahili: 'Ufaulu wa Juu (Daraja la Pili)', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (avg >= 50 || div === 'III' || grade === 'C') {
      return { label: 'Cum Laude (Credit)', swahili: 'Ufaulu wa Wastani (Daraja la Tatu)', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (avg >= 30 || div === 'IV' || grade === 'D') {
      return { label: 'Pass (Kiwango cha Kufaulu)', swahili: 'Ufaulu wa Kawaida (Daraja la Nne)', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' };
    }
    return { label: 'Developing / Remedial Needed', swahili: 'Anahitaji Masomo ya Ziada', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  // Filter and compute ranking leaderboard
  const { leaderboard, totalCandidatesInCohort, cohortAverage, highestScore, subjectChampions } = useMemo(() => {
    // 1. Initial filter of records by metadata
    const baseRecords = examinationRecords.filter(r => {
      const matchYear = selectedYear === 'All' || r.academicYear === selectedYear;
      const matchClass = selectedClass === 'All' || r.className === selectedClass;
      const matchStream = selectedStream === 'All' || r.stream === selectedStream || (!r.stream && selectedStream === 'All');
      const matchTerm = selectedTerm === 'All' || r.term === selectedTerm;
      const matchExam = selectedExamType === 'All' || r.examType === selectedExamType;
      const matchSearch = !searchQuery.trim() ||
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r.studentId).includes(searchQuery) ||
        (r.regNo && r.regNo.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchYear && matchClass && matchStream && matchTerm && matchExam && matchSearch;
    });

    const totalInCohort = baseRecords.length;

    // 2. Compute Subject Champions (highest scorer per subject across this cohort)
    const championsMap = new Map<string, SubjectChampionInfo>();
    baseRecords.forEach(rec => {
      if (rec.subjects) {
        Object.entries(rec.subjects).forEach(([subName, info]) => {
          const existing = championsMap.get(subName);
          const score = typeof info.marks === 'number' ? info.marks : parseFloat(String(info.marks)) || 0;
          if (!existing || score > existing.score) {
            championsMap.set(subName, {
              subjectName: subName,
              studentName: rec.studentName,
              studentId: rec.studentId,
              score,
              grade: info.grade || 'A',
              className: rec.className + (rec.stream ? ` (${rec.stream})` : ''),
              gender: (rec.gender || '').toLowerCase().startsWith('f') ? 'Female' : 'Male'
            });
          }
        });
      }
    });

    const championsList = Array.from(championsMap.values()).sort((a, b) => b.score - a.score);

    // 3. Process candidate records into Leaderboard entries
    const entries: LeaderboardEntry[] = baseRecords.map(rec => {
      const matchSt = students.find(s => s.id === rec.studentId);
      const gender = (rec.gender || matchSt?.gender || 'Male');
      const subjectsObj = rec.subjects || {};
      const subjectKeys = Object.keys(subjectsObj);

      // Best subject calculation
      let bestSub = '-';
      let bestScore = 0;
      let bestGrade = 'F';

      subjectKeys.forEach(k => {
        const item = subjectsObj[k];
        const score = typeof item?.marks === 'number' ? item.marks : parseFloat(String(item?.marks)) || 0;
        if (score >= bestScore) {
          bestScore = score;
          bestSub = k;
          bestGrade = item?.grade || 'A';
        }
      });

      // Selected subject score if in specific_subject mode
      let selectedSubScore: number | undefined;
      let selectedSubGrade: string | undefined;

      if (rankingMode === 'specific_subject' && selectedSubject !== 'ALL') {
        const targetSubInfo = subjectsObj[selectedSubject] ||
          Object.entries(subjectsObj).find(([k]) => k.toLowerCase() === selectedSubject.toLowerCase())?.[1];
        if (targetSubInfo) {
          selectedSubScore = typeof targetSubInfo.marks === 'number' ? targetSubInfo.marks : parseFloat(String(targetSubInfo.marks)) || 0;
          selectedSubGrade = targetSubInfo.grade || 'F';
        } else {
          selectedSubScore = 0;
          selectedSubGrade = 'F';
        }
      }

      const avg = typeof rec.averageMarks === 'number' ? rec.averageMarks : parseFloat(String(rec.averageMarks)) || 0;
      const standing = getAcademicStanding(avg, rec.overallGrade, rec.division || '');

      return {
        rank: 0,
        originalPosition: rec.positionInClass || 1,
        recordId: rec.id,
        studentId: rec.studentId,
        studentName: rec.studentName,
        regNo: rec.regNo || matchSt?.regNo || `REG-${rec.studentId}`,
        gender: gender,
        className: rec.className,
        stream: rec.stream || matchSt?.stream || '',
        subjectAverage: avg,
        totalMarks: rec.totalMarks || 0,
        subjectsCount: subjectKeys.length,
        overallGrade: rec.overallGrade || 'C',
        division: rec.division ? (rec.division.startsWith('DIV') ? rec.division : `DIV ${rec.division}`) : '-',
        points: rec.points !== undefined ? rec.points : null,
        bestSubject: bestSub,
        bestSubjectScore: bestScore,
        bestSubjectGrade: bestGrade,
        selectedSubjectScore: selectedSubScore,
        selectedSubjectGrade: selectedSubGrade,
        parentPhone: rec.parentPhone || matchSt?.parentPhone,
        teacherRemarks: rec.teacherRemarks,
        academicStanding: standing.label
      };
    });

    // 4. Apply Gender Filter
    let filteredEntries = entries;
    if (genderFilter === 'MALE') {
      filteredEntries = filteredEntries.filter(e => {
        const g = e.gender.toLowerCase();
        return !g.startsWith('f') && !g.includes('female');
      });
    } else if (genderFilter === 'FEMALE') {
      filteredEntries = filteredEntries.filter(e => {
        const g = e.gender.toLowerCase();
        return g.startsWith('f') || g.includes('female');
      });
    }

    // 5. Sort entries based on ranking metric
    filteredEntries.sort((a, b) => {
      if (rankingMode === 'specific_subject' && selectedSubject !== 'ALL') {
        const scoreA = a.selectedSubjectScore ?? 0;
        const scoreB = b.selectedSubjectScore ?? 0;
        if (scoreB !== scoreA) {
          return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        }
      }

      // Default: sort by subject average descending
      if (b.subjectAverage !== a.subjectAverage) {
        return sortOrder === 'desc' ? b.subjectAverage - a.subjectAverage : a.subjectAverage - b.subjectAverage;
      }
      return sortOrder === 'desc' ? b.totalMarks - a.totalMarks : a.totalMarks - b.totalMarks;
    });

    // 6. Assign proper sequential / tied ranks
    let currentRank = 1;
    const rankedList = filteredEntries.map((entry, idx) => {
      if (idx > 0) {
        const prev = filteredEntries[idx - 1];
        const valPrev = rankingMode === 'specific_subject' && selectedSubject !== 'ALL'
          ? (prev.selectedSubjectScore ?? 0)
          : prev.subjectAverage;
        const valCurr = rankingMode === 'specific_subject' && selectedSubject !== 'ALL'
          ? (entry.selectedSubjectScore ?? 0)
          : entry.subjectAverage;

        if (valCurr < valPrev) {
          currentRank = idx + 1;
        }
      }
      return {
        ...entry,
        rank: currentRank
      };
    });

    // 7. Apply limit (Top 3, 5, 10, 20, 50, ALL)
    const limitedList = leaderboardLimit === 'ALL'
      ? rankedList
      : rankedList.slice(0, leaderboardLimit);

    // 8. Cohort stats
    const totalAvgSum = baseRecords.reduce((acc, r) => acc + (typeof r.averageMarks === 'number' ? r.averageMarks : parseFloat(String(r.averageMarks)) || 0), 0);
    const cAverage = totalInCohort > 0 ? (totalAvgSum / totalInCohort).toFixed(1) : '0.0';
    const hScore = limitedList.length > 0 ? limitedList[0].subjectAverage : 0;

    return {
      leaderboard: limitedList,
      totalCandidatesInCohort: totalInCohort,
      cohortAverage: parseFloat(cAverage),
      highestScore: hScore,
      subjectChampions: championsList
    };
  }, [
    examinationRecords,
    students,
    selectedYear,
    selectedClass,
    selectedStream,
    selectedTerm,
    selectedExamType,
    searchQuery,
    rankingMode,
    selectedSubject,
    genderFilter,
    sortOrder,
    leaderboardLimit
  ]);

  // Top 3 Podium
  const podiumTop3 = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  // Boys vs Girls in current leaderboard
  const genderBreakdown = useMemo(() => {
    let boys = 0;
    let girls = 0;
    leaderboard.forEach(item => {
      const g = item.gender.toLowerCase();
      if (g.startsWith('f') || g.includes('female')) girls++;
      else boys++;
    });
    return { boys, girls, total: leaderboard.length };
  }, [leaderboard]);

  // Print function
  const handlePrintLeaderboard = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (leaderboard.length === 0) return;

    const headers = [
      'Rank',
      'Candidate Name',
      'Registration Number',
      'Sex',
      'Class Level',
      'Stream',
      'Subject Average (%)',
      'Total Marks',
      'Subjects Count',
      'Overall Grade',
      'NECTA Division',
      'Points',
      'Best Subject',
      'Best Subject Score',
      'Best Subject Grade',
      'Academic Standing',
      'Academic Year',
      'Term',
      'Exam Type'
    ];

    const rows = leaderboard.map(item => [
      item.rank,
      `"${item.studentName.replace(/"/g, '""')}"`,
      `"${item.regNo}"`,
      item.gender.toLowerCase().startsWith('f') ? 'F' : 'M',
      `"${item.className}"`,
      `"${item.stream}"`,
      item.subjectAverage.toFixed(1),
      item.totalMarks,
      item.subjectsCount,
      item.overallGrade,
      item.division,
      item.points ?? '',
      `"${item.bestSubject}"`,
      item.bestSubjectScore,
      item.bestSubjectGrade,
      `"${item.academicStanding}"`,
      selectedYear,
      selectedTerm,
      selectedExamType
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanClass = selectedClass === 'All' ? 'All_Classes' : selectedClass.replace(/\s+/g, '_');
    const cleanSubject = rankingMode === 'specific_subject' && selectedSubject !== 'ALL'
      ? `_${selectedSubject.replace(/\s+/g, '_')}`
      : '';
    link.download = `Top_Performers_Leaderboard_${cleanClass}${cleanSubject}_${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate WhatsApp / School Announcement text
  const generateAnnouncementText = () => {
    const schoolTitle = (schoolInfo.name || 'HABY EDU PRO').toUpperCase();
    const classTitle = selectedClass !== 'All' ? selectedClass : 'ALL CLASSES';
    const streamTitle = selectedStream !== 'All' ? ` (${selectedStream})` : '';
    const examTitle = selectedExamType !== 'All' ? selectedExamType : 'EXAMINATION';
    const metricTitle = rankingMode === 'specific_subject' && selectedSubject !== 'ALL'
      ? `SOMO: ${selectedSubject.toUpperCase()}`
      : 'WASTANI WA JUMLA WA MASOMO (SUBJECT AVERAGE)';

    let text = `🏆 *${schoolTitle}* 🏆\n`;
    text += `🌟 *ORODHA RASMI YA VINARA WA MITIHANI (TOP PERFORMERS)* 🌟\n`;
    text += `📅 *Mwaka:* ${selectedYear} | *Muhula:* ${selectedTerm} | *Mtihani:* ${examTitle}\n`;
    text += `🎓 *Darasa:* ${classTitle}${streamTitle}\n`;
    text += `📊 *Kipimo:* ${metricTitle}\n`;
    text += `👥 *Idadi ya Walioratibiwa:* ${leaderboard.length} Candidates\n`;
    text += `-------------------------------------------\n\n`;

    leaderboard.forEach(item => {
      const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `🔹 #${item.rank}`;
      const sexTag = item.gender.toLowerCase().startsWith('f') ? '👧' : '👦';
      const scoreStr = rankingMode === 'specific_subject' && selectedSubject !== 'ALL'
        ? `${item.selectedSubjectScore}% (Grade ${item.selectedSubjectGrade})`
        : `${item.subjectAverage.toFixed(1)}% (Grade ${item.overallGrade}) [${item.division}]`;

      text += `${medal} *${item.studentName}* ${sexTag}\n`;
      text += `   Wastani: *${scoreStr}* | Darasa: ${item.className} ${item.stream ? `(${item.stream})` : ''}\n`;
      if (item.bestSubject && item.bestSubject !== '-') {
        text += `   Somo Bora: ${item.bestSubject} (${item.bestSubjectScore}%)\n`;
      }
      text += `\n`;
    });

    text += `-------------------------------------------\n`;
    text += `👏 *Hongera sana kwa vinara wote kwa juhudi kubwa na ufaulu mzuri!* 🌟\n`;
    text += `Mkuu wa Shule: ${schoolInfo.principal || 'Mwl. Habibu Akida'} | Haby Edu Pro ERP`;
    return text;
  };

  const handleCopyAnnouncement = () => {
    const text = generateAnnouncementText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAnnouncement(true);
      setTimeout(() => setCopiedAnnouncement(false), 3000);
    });
  };

  const handleShareWhatsApp = () => {
    const text = generateAnnouncementText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Print Specific CSS Styles (Isolates print area and renders official letterhead) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .leaderboard-print-area, .leaderboard-print-area * {
            visibility: visible !important;
          }
          .leaderboard-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          table.leaderboard-printable-table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 9.5pt !important;
          }
          table.leaderboard-printable-table th,
          table.leaderboard-printable-table td {
            border: 1px solid #1e293b !important;
            padding: 5px 7px !important;
            color: #000000 !important;
          }
          table.leaderboard-printable-table thead {
            display: table-header-group !important;
            background-color: #f1f5f9 !important;
          }
          table.leaderboard-printable-table tr {
            page-break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* TOP HERO BANNER: Top Performers & Champions Leaderboard */}
      <div className="bg-gradient-to-r from-[#0d1e38] via-[#1a3869] to-[#0f2948] text-white rounded-2xl p-6 shadow-lg border border-blue-800/60 relative overflow-hidden">
        {/* Subtle decorative glow elements */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-12 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 rounded-2xl font-black shadow-md shadow-amber-500/20 flex items-center justify-center">
                <Trophy className="w-7 h-7" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Top Performers Leaderboard
                  </h1>
                  <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Vinara wa Masomo
                  </span>
                </div>
                <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl">
                  Automated academic ranking based on subject average, cohort percentiles, and subject-wise mastery with instant printable rosters and leaderboard exports.
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-5 flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
              <div className="px-3.5 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <span className="text-blue-200 block text-[10px]">Leaderboard Size:</span>
                  <strong className="text-white font-black text-sm">{leaderboard.length} Candidates</strong>
                </div>
              </div>

              <div className="px-3.5 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-blue-200 block text-[10px]">Top Performer Average:</span>
                  <strong className="text-amber-300 font-bold text-sm">
                    {highestScore > 0 ? `${highestScore.toFixed(1)}%` : '-'}
                  </strong>
                </div>
              </div>

              <div className="px-3.5 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-300 shrink-0" />
                <div>
                  <span className="text-blue-200 block text-[10px]">Cohort Average:</span>
                  <strong className="text-emerald-300 font-bold text-sm">{cohortAverage}%</strong>
                </div>
              </div>

              <div className="px-3.5 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-300 shrink-0" />
                <div>
                  <span className="text-blue-200 block text-[10px]">Gender Distribution:</span>
                  <strong className="text-white font-medium text-xs">
                    <span className="text-blue-300 font-bold">{genderBreakdown.boys} Boys</span> • <span className="text-rose-300 font-bold">{genderBreakdown.girls} Girls</span>
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Center Buttons (Print, Export, WhatsApp, Back to Ledger) */}
          <div className="no-print flex items-center gap-2.5 flex-wrap self-stretch lg:self-center">
            {onBackToLedger && (
              <button
                type="button"
                onClick={onBackToLedger}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20 transition cursor-pointer backdrop-blur-xs flex items-center gap-1.5 active:scale-95"
              >
                <Layers className="w-4 h-4 text-blue-200" />
                <span>Broadsheet Ledger</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintLeaderboard}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer active:scale-95 border border-emerald-400/40"
              title="Chapisha Orodha ya Vinara kwenye karatasi ya A4 yenye Nembo na Barua Rasmi"
            >
              <Printer className="w-4 h-4 text-emerald-100" />
              <span>Print Leaderboard (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black rounded-xl text-xs shadow-md shadow-blue-900/30 flex items-center gap-2 transition cursor-pointer active:scale-95 border border-blue-400/40"
              title="Pakua faili la Excel/CSV lenye orodha nzima ya nafasi na wastani"
            >
              <Download className="w-4 h-4 text-blue-100" />
              <span>Export CSV / Excel</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAnnouncement}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Nakili ujumbe wa tangazo la vinara kwa ajili ya mkutano au WhatsApp"
            >
              {copiedAnnouncement ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Imenakiliwa!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Copy Announcement</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95 border border-green-500/40"
              title="Tuma orodha ya vinara moja kwa moja kwa WhatsApp"
            >
              <Share2 className="w-4 h-4 text-green-200" />
              <span>WhatsApp Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & CONFIGURATION CONTROL PANEL (no-print) */}
      <div className="no-print bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Row 1: Academic Scope Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Academic Year */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Year {yr}</option>
              ))}
            </select>
          </div>

          {/* Class Level */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Class Level
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStream('All');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Classes (School-Wide)</option>
              <optgroup label="PRIMARY LEVEL (Std 1 - 7)">
                {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="SECONDARY LEVEL (Form 1 - 6)">
                {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="NURSERY LEVEL">
                {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>

          {/* Stream */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Stream / Section
            </label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Streams</option>
              {availableStreams.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          {/* Exam Type */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Exam Type
            </label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Exam Types</option>
              <option value="Monthly">Monthly Test</option>
              <option value="Midterm">Midterm Examination</option>
              <option value="Terminal">Terminal Examination</option>
              <option value="Annual">Annual Examination</option>
            </select>
          </div>

          {/* Search Candidate */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Search Candidate
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or Reg No..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Ranking Mode, Subject Filter, Gender & Leaderboard Limit */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 flex-wrap">
          {/* Ranking Mode Toggle: Overall Subject Average vs Specific Subject */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600">Ranking Basis:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRankingMode('overall_average')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  rankingMode === 'overall_average'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Overall Subject Average</span>
              </button>
              <button
                type="button"
                onClick={() => setRankingMode('specific_subject')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  rankingMode === 'specific_subject'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Per Specific Subject</span>
              </button>
            </div>

            {/* Subject Dropdown when Specific Subject mode is selected */}
            {rankingMode === 'specific_subject' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Somo:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                >
                  <option value="ALL">-- Chagua Somo --</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Gender Filter Buttons & Limit Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Gender Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'ALL', label: 'All (Wote)' },
                  { id: 'MALE', label: 'Boys (Wavulana)' },
                  { id: 'FEMALE', label: 'Girls (Wasichana)' }
                ] as const
              ).map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGenderFilter(g.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    genderFilter === g.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Leaderboard Limit Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Show:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {([3, 5, 10, 20, 'ALL'] as const).map(lim => (
                  <button
                    key={String(lim)}
                    type="button"
                    onClick={() => setLeaderboardLimit(lim as LeaderboardLimitOption)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                      leaderboardLimit === lim
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lim === 'ALL' ? 'All' : `Top ${lim}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY (Golden Podium: 2nd, 1st, 3rd) (no-print) */}
      {podiumTop3.length > 0 && (
        <div className="no-print bg-gradient-to-b from-slate-900 via-[#0f1f38] to-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-blue-900 shadow-md relative overflow-hidden">
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-black uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" /> Podium Champions • Vinara Watatu Bora
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
              Academic Excellence Showcase
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">
              Top 3 highest subject performers in {selectedClass !== 'All' ? selectedClass : 'all cohorts'} for {selectedYear}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end max-w-4xl mx-auto pt-4">
            {/* 2nd Place: Silver (Left) */}
            {podiumTop3[1] && (
              <div className="order-2 md:order-1 bg-gradient-to-b from-slate-800 to-slate-800/60 border border-slate-600/60 rounded-2xl p-5 text-center flex flex-col items-center relative shadow-lg transform md:-translate-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-900 font-black text-lg flex items-center justify-center border-4 border-slate-400 shadow-md mb-2">
                  🥈
                </div>
                <span className="px-2.5 py-0.5 bg-slate-300/20 text-slate-200 border border-slate-400/40 rounded-full text-[10px] font-black uppercase">
                  2nd Position • Mshindi wa 2
                </span>
                <h3 className="font-black text-sm text-white mt-2 truncate w-full" title={podiumTop3[1].studentName}>
                  {podiumTop3[1].studentName}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {podiumTop3[1].className} {podiumTop3[1].stream ? `(${podiumTop3[1].stream})` : ''}
                </p>

                <div className="mt-3 py-2 px-4 bg-slate-900/80 rounded-xl border border-slate-700 w-full">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Subject Average</div>
                  <div className="text-xl font-black text-white">
                    {podiumTop3[1].subjectAverage.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-blue-300 font-medium">
                    Grade {podiumTop3[1].overallGrade} • {podiumTop3[1].division}
                  </div>
                </div>

                {podiumTop3[1].bestSubject && podiumTop3[1].bestSubject !== '-' && (
                  <div className="mt-2 text-[10px] text-slate-300 truncate w-full">
                    Best: <strong className="text-white">{podiumTop3[1].bestSubject}</strong> ({podiumTop3[1].bestSubjectScore}%)
                  </div>
                )}
              </div>
            )}

            {/* 1st Place: Gold (Center - Elevated) */}
            {podiumTop3[0] && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-950/60 via-[#1e2a4a] to-slate-900 border-2 border-amber-400 rounded-2xl p-6 text-center flex flex-col items-center relative shadow-2xl transform md:-translate-y-6">
                <div className="absolute -top-3.5 px-3 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-slate-950" />
                  <span>Grand Champion • Bingwa</span>
                </div>

                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center border-4 border-amber-200 shadow-xl mb-2 mt-1">
                  🥇
                </div>
                <span className="px-3 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[11px] font-black uppercase">
                  1st Position • Mshindi wa 1
                </span>
                <h3 className="font-black text-base text-white mt-2 truncate w-full" title={podiumTop3[0].studentName}>
                  {podiumTop3[0].studentName}
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5 font-medium">
                  {podiumTop3[0].className} {podiumTop3[0].stream ? `(${podiumTop3[0].stream})` : ''}
                </p>

                <div className="mt-4 py-2.5 px-4 bg-slate-950/90 rounded-xl border border-amber-400/40 w-full shadow-inner">
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Subject Average</div>
                  <div className="text-2xl font-black text-amber-400">
                    {podiumTop3[0].subjectAverage.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-emerald-300 font-bold">
                    Grade {podiumTop3[0].overallGrade} • {podiumTop3[0].division} ({podiumTop3[0].totalMarks} Marks)
                  </div>
                </div>

                {podiumTop3[0].bestSubject && podiumTop3[0].bestSubject !== '-' && (
                  <div className="mt-2 text-xs text-amber-100 truncate w-full">
                    Best: <strong className="text-amber-300">{podiumTop3[0].bestSubject}</strong> ({podiumTop3[0].bestSubjectScore}%)
                  </div>
                )}
              </div>
            )}

            {/* 3rd Place: Bronze (Right) */}
            {podiumTop3[2] && (
              <div className="order-3 bg-gradient-to-b from-amber-950/30 to-slate-800/60 border border-amber-700/60 rounded-2xl p-5 text-center flex flex-col items-center relative shadow-lg transform md:-translate-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-700 text-amber-100 font-black text-lg flex items-center justify-center border-4 border-amber-600 shadow-md mb-2">
                  🥉
                </div>
                <span className="px-2.5 py-0.5 bg-amber-700/20 text-amber-300 border border-amber-600/40 rounded-full text-[10px] font-black uppercase">
                  3rd Position • Mshindi wa 3
                </span>
                <h3 className="font-black text-sm text-white mt-2 truncate w-full" title={podiumTop3[2].studentName}>
                  {podiumTop3[2].studentName}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {podiumTop3[2].className} {podiumTop3[2].stream ? `(${podiumTop3[2].stream})` : ''}
                </p>

                <div className="mt-3 py-2 px-4 bg-slate-900/80 rounded-xl border border-slate-700 w-full">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Subject Average</div>
                  <div className="text-xl font-black text-white">
                    {podiumTop3[2].subjectAverage.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-amber-300 font-medium">
                    Grade {podiumTop3[2].overallGrade} • {podiumTop3[2].division}
                  </div>
                </div>

                {podiumTop3[2].bestSubject && podiumTop3[2].bestSubject !== '-' && (
                  <div className="mt-2 text-[10px] text-slate-300 truncate w-full">
                    Best: <strong className="text-white">{podiumTop3[2].bestSubject}</strong> ({podiumTop3[2].bestSubjectScore}%)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBJECT CHAMPIONS QUICK TILES (no-print) */}
      {subjectChampions.length > 0 && rankingMode === 'overall_average' && (
        <div className="no-print bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Subject Champions • Vinara kwa Kila Somo</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Students who achieved the highest mark in each registered subject across this cohort
              </p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
              {subjectChampions.length} Subjects Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
            {subjectChampions.map(champ => (
              <div
                key={champ.subjectName}
                onClick={() => {
                  setRankingMode('specific_subject');
                  setSelectedSubject(champ.subjectName);
                }}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-amber-50/50 hover:border-amber-300 transition-all cursor-pointer group shadow-2xs"
                title={`Bonyeza kuona orodha nzima ya wanafunzi kwenye somo la ${champ.subjectName}`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-black text-slate-800 group-hover:text-amber-900 truncate max-w-[130px]">
                    {champ.subjectName}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black">
                    {champ.score}% ({champ.grade})
                  </span>
                </div>
                <div className="text-xs font-bold text-blue-700 truncate">
                  🥇 {champ.studentName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>{champ.className}</span>
                  <span className="text-slate-400 font-medium">{champ.gender}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN LEADERBOARD TABLE & PRINTABLE SECTION */}
      <div className="leaderboard-print-area bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Printable Official School Letterhead (Visible ONLY during print: hidden print:block) */}
        <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
          <div className="flex items-center justify-between gap-4">
            {schoolInfo.logo ? (
              <img src={schoolInfo.logo} alt="School Logo" className="w-14 h-14 object-contain shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-300 flex items-center justify-center shrink-0">
                <GraduationCap className="w-7 h-7 text-blue-800" />
              </div>
            )}
            <div className="text-center flex-1">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
                THE UNITED REPUBLIC OF TANZANIA
              </h4>
              <h4 className="text-[9px] font-bold uppercase text-slate-600">
                PRESIDENT'S OFFICE - REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT
              </h4>
              <h1 className="text-lg font-black uppercase tracking-wide text-slate-950 mt-0.5">
                {schoolInfo.name || 'HABY EDU PRO SECONDARY SCHOOL'}
              </h1>
              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">
                OFFICIAL TOP PERFORMERS LEADERBOARD & ACADEMIC RANKING REGISTER
              </p>
              {schoolInfo.motto && (
                <p className="text-[9px] text-slate-500 italic mt-0.5 font-medium">"{schoolInfo.motto}"</p>
              )}
            </div>
            <div className="text-right text-[8px] text-slate-700 shrink-0 font-medium">
              <div><strong>Registration No:</strong> {schoolInfo.schoolNumber || 'S.0123'}</div>
              <div><strong>Printed Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
              <div><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Official Report Metadata Table */}
          <div className="mt-3 pt-2 border-t border-slate-400 grid grid-cols-4 gap-2 text-[9px] font-bold text-slate-900">
            <div><span className="text-slate-600 font-normal">Class Level: </span>{selectedClass !== 'All' ? selectedClass : 'All Cohorts'} {selectedStream !== 'All' ? `(${selectedStream})` : ''}</div>
            <div><span className="text-slate-600 font-normal">Academic Year: </span>{selectedYear}</div>
            <div><span className="text-slate-600 font-normal">Term & Exam: </span>{selectedTerm} • {selectedExamType}</div>
            <div><span className="text-slate-600 font-normal">Ranking Metric: </span>{rankingMode === 'specific_subject' ? `Subject: ${selectedSubject}` : 'Subject Average (%)'}</div>
          </div>

          <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[8px] text-slate-700">
            <span><strong>Total Ranked Candidates:</strong> {leaderboard.length}</span>
            <span><strong>Cohort Mean Average:</strong> {cohortAverage}%</span>
            <span><strong>Highest Achieved Score:</strong> {highestScore > 0 ? `${highestScore.toFixed(1)}%` : '-'}</span>
            <span><strong>Gender Breakdown:</strong> Boys: {genderBreakdown.boys} | Girls: {genderBreakdown.girls}</span>
          </div>
        </div>

        {/* Desktop Screen Table Header (no-print) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Ranking Leaderboard</span>
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded-lg text-xs font-bold">
              {leaderboard.length} Candidates
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Ranked by {rankingMode === 'specific_subject' && selectedSubject !== 'ALL' ? `Subject: ${selectedSubject}` : 'Subject Average (%)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
              title="Geuza mpangilio (Kutoka Juu kwenda Chini au Chini kwenda Juu)"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'Highest → Lowest' : 'Lowest → Highest'}</span>
            </button>
          </div>
        </div>

        {/* LEADERBOARD TABLE */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No candidates found for the current leaderboard filters.</p>
            <p className="text-xs text-slate-400 mt-1">
              Try switching academic year, clearing search query, or selecting 'All Classes'.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="leaderboard-printable-table w-full text-left text-xs border-collapse">
              <thead className="bg-[#193557] text-white uppercase text-[10px] tracking-wider sticky top-0 z-20 font-bold print:bg-slate-100 print:text-black">
                <tr>
                  <th className="p-3 w-14 text-center font-black border-b border-blue-900 print:border-black">
                    Rank
                  </th>
                  <th className="p-3 font-black min-w-[170px] border-b border-blue-900 print:border-black">
                    Candidate Name
                  </th>
                  <th className="p-3 text-center w-12 font-black border-b border-blue-900 print:border-black">
                    Sex
                  </th>
                  <th className="p-3 text-center w-28 font-black border-b border-blue-900 print:border-black">
                    Class & Stream
                  </th>
                  {rankingMode === 'specific_subject' && selectedSubject !== 'ALL' ? (
                    <th className="p-3 text-center w-28 font-black border-b border-blue-900 print:border-black bg-amber-500/20 text-amber-200">
                      {selectedSubject} Marks
                    </th>
                  ) : null}
                  <th className="p-3 text-center w-28 font-black border-b border-blue-900 print:border-black">
                    Subject Average
                  </th>
                  <th className="p-3 text-center w-20 font-black border-b border-blue-900 print:border-black">
                    Total
                  </th>
                  <th className="p-3 text-center w-16 font-black border-b border-blue-900 print:border-black">
                    Grade
                  </th>
                  <th className="p-3 text-center w-20 font-black border-b border-blue-900 print:border-black">
                    Division
                  </th>
                  <th className="p-3 font-black min-w-[140px] border-b border-blue-900 print:border-black">
                    Best Subject
                  </th>
                  <th className="p-3 font-black min-w-[150px] border-b border-blue-900 print:border-black">
                    Academic Standing
                  </th>
                  <th className="p-3 text-center w-24 font-black border-b border-blue-900 print:border-black no-print">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {leaderboard.map((item) => {
                  const isTop3 = item.rank <= 3;
                  const rankIcon = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : null;
                  const gradeStyle = getGradeColor(item.overallGrade);

                  return (
                    <tr
                      key={item.recordId}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        item.rank === 1
                          ? 'bg-amber-50/30'
                          : item.rank === 2
                          ? 'bg-slate-50/40'
                          : item.rank === 3
                          ? 'bg-amber-950/5'
                          : ''
                      }`}
                    >
                      {/* Rank Position */}
                      <td className="p-3 text-center font-black">
                        {rankIcon ? (
                          <div className="inline-flex items-center justify-center gap-1">
                            <span className="text-base">{rankIcon}</span>
                            <span className="text-xs font-black text-slate-900">#{item.rank}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black border border-slate-200">
                            {item.rank}
                          </span>
                        )}
                      </td>

                      {/* Candidate Name & Reg No */}
                      <td className="p-3">
                        <div className="font-bold text-slate-950 text-xs sm:text-sm">
                          {item.studentName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.regNo}
                        </div>
                      </td>

                      {/* Sex */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                            item.gender.toLowerCase().startsWith('f')
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.gender.toLowerCase().startsWith('f') ? 'F' : 'M'}
                        </span>
                      </td>

                      {/* Class Level & Stream */}
                      <td className="p-3 text-center text-xs font-semibold text-slate-700">
                        <div>{item.className}</div>
                        {item.stream && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            {item.stream}
                          </div>
                        )}
                      </td>

                      {/* Selected Subject Score if in specific_subject mode */}
                      {rankingMode === 'specific_subject' && selectedSubject !== 'ALL' && (
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-lg text-xs font-black text-amber-950">
                            {item.selectedSubjectScore !== undefined ? `${item.selectedSubjectScore}% (${item.selectedSubjectGrade})` : '-'}
                          </span>
                        </td>
                      )}

                      {/* Subject Average (Prominent Metric) */}
                      <td className="p-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black text-blue-900">
                            {item.subjectAverage.toFixed(1)}%
                          </span>
                          {/* Mini Progress Bar */}
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.subjectAverage >= 80
                                  ? 'bg-emerald-500'
                                  : item.subjectAverage >= 60
                                  ? 'bg-blue-500'
                                  : item.subjectAverage >= 45
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, item.subjectAverage))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total Marks */}
                      <td className="p-3 text-center font-bold text-slate-800 text-xs">
                        <div>{item.totalMarks}</div>
                        <div className="text-[9px] text-slate-400 font-normal">
                          {item.subjectsCount} subs
                        </div>
                      </td>

                      {/* Overall Grade */}
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-black border ${gradeStyle.bg} ${gradeStyle.border}`}>
                          {item.overallGrade}
                        </span>
                      </td>

                      {/* NECTA Division & Points */}
                      <td className="p-3 text-center">
                        <div className="text-xs font-bold text-slate-900">
                          {item.division}
                        </div>
                        {item.points !== null && (
                          <div className="text-[10px] text-slate-500">
                            {item.points} pts
                          </div>
                        )}
                      </td>

                      {/* Best Subject */}
                      <td className="p-3">
                        {item.bestSubject && item.bestSubject !== '-' ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-900">{item.bestSubject}</span>
                            <span className="text-[10px] text-emerald-700 font-bold ml-1">
                              ({item.bestSubjectScore}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Academic Standing */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            item.subjectAverage >= 80
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : item.subjectAverage >= 65
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : item.subjectAverage >= 50
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.academicStanding}
                        </span>
                      </td>

                      {/* Actions (WhatsApp to Parent) */}
                      <td className="p-3 text-center no-print">
                        {item.parentPhone ? (
                          <button
                            type="button"
                            onClick={() => {
                              const phoneDigits = item.parentPhone!.replace(/[^0-9]/g, '');
                              const msg = `HABY EDU PRO - ${schoolInfo.name || 'School'}\nMtoto wako *${item.studentName}* ameshika *Nafasi ya #${item.rank}* kwenye Vinara wa Mitihani kwa Wastani wa *${item.subjectAverage.toFixed(1)}%* (Grade ${item.overallGrade}) [${item.division}]. Hongera sana!`;
                              const url = `https://wa.me/${phoneDigits.startsWith('0') ? '255' + phoneDigits.slice(1) : phoneDigits}?text=${encodeURIComponent(msg)}`;
                              window.open(url, '_blank');
                            }}
                            className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            title="Tuma taarifa ya ushindi kwa mzazi kupitia WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Tuma</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PRINT SIGNATURE BLOCK (Official Endorsement: Class Teacher, Academic Master, Head of School) */}
        <div className="hidden print:block pt-8 mt-6 border-t-2 border-slate-900">
          <div className="grid grid-cols-3 gap-6 text-[9.5pt]">
            <div>
              <span className="block font-bold uppercase text-slate-800">
                1. Mwalimu wa Darasa (Class Teacher):
              </span>
              <div className="mt-9 border-b border-slate-700"></div>
              <div className="flex justify-between text-[8pt] text-slate-600 mt-1">
                <span>Jina & Saini</span>
                <span>Tarehe</span>
              </div>
            </div>

            <div>
              <span className="block font-bold uppercase text-slate-800">
                2. Mwalimu wa Taaluma (Academic Master):
              </span>
              <div className="mt-9 border-b border-slate-700"></div>
              <div className="flex justify-between text-[8pt] text-slate-600 mt-1">
                <span>Jina & Saini</span>
                <span>Tarehe</span>
              </div>
            </div>

            <div>
              <span className="block font-bold uppercase text-slate-800">
                3. Mkuu wa Shule (Head of School):
              </span>
              <div className="mt-9 border-b border-slate-700"></div>
              <div className="flex justify-between text-[8pt] text-slate-600 mt-1">
                <span>Muhuri Rasmi & Saini</span>
                <span>Tarehe</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-2 border-t border-dashed border-slate-400 text-center text-[7.5pt] text-slate-500">
            Haby Edu Pro Enterprise Management System • Printed from Official Examination Records Ledger
          </div>
        </div>
      </div>
    </div>
  );
};
