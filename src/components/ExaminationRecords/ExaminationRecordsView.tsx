import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  ArrowUpDown, 
  GraduationCap, 
  TrendingUp, 
  Award, 
  Calendar, 
  Share2, 
  ArrowRightLeft, 
  Play, 
  History, 
  CheckCircle2, 
  Eye, 
  Layers, 
  Download, 
  Printer, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  Users,
  ChevronDown,
  X,
  MessageSquare,
  Smartphone,
  Send,
  Trash2
} from 'lucide-react';
import { 
  ExaminationRecord, 
  Student, 
  SchoolInfo, 
  PromotionHistory, 
  TransferHistory, 
  ExamTerm, 
  RecordExamType 
} from '../../types';
import { 
  ALL_SCHOOL_CLASSES, 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../../constants/defaults';
import { getGradeColor, getGradeRemark, detectCalendarType } from '../../utils/examinationRecordsUtils';
import { StudentYearlyProfileModal } from './StudentYearlyProfileModal';
import { StudentTransferModal } from './StudentTransferModal';
import { AutoPromotionModal } from './AutoPromotionModal';
import { HistoryAuditModal } from './HistoryAuditModal';
import { BulkWhatsAppModal } from './BulkWhatsAppModal';
import { GenderSummary, formatGenderSummaryText } from '../common/GenderSummary';
import { HabyEduProLogo } from '../common/HabyEduProLogo';

interface ExaminationRecordsViewProps {
  students: Student[];
  examinationRecords: ExaminationRecord[];
  promotionHistory: PromotionHistory[];
  transferHistory: TransferHistory[];
  schoolInfo: SchoolInfo;
  onUpdateStudents: (students: Student[]) => void;
  onUpdateExaminationRecords: (records: ExaminationRecord[]) => void;
  onUpdatePromotionHistory: (history: PromotionHistory[]) => void;
  onUpdateTransferHistory: (history: TransferHistory[]) => void;
  currentUserName?: string;
  onNavigateToSms?: (examType?: string, year?: string) => void;
  onNavigateToNectaAnalyzer?: () => void;
}

export type ViewToggleMode = 'marks' | 'grade' | 'both';
export type SortOption = 
  | 'name_asc' 
  | 'name_desc' 
  | 'rank_asc' 
  | 'rank_desc' 
  | 'avg_desc' 
  | 'avg_asc' 
  | 'total_desc' 
  | 'total_asc';

export type QuickGradeFilter = 'ALL' | 'A' | 'B' | 'C' | 'D' | 'F' | 'TOP_10' | 'BOTTOM_10' | 'FAILED';

export const ExaminationRecordsView: React.FC<ExaminationRecordsViewProps> = ({
  students,
  examinationRecords,
  promotionHistory,
  transferHistory,
  schoolInfo,
  onUpdateStudents,
  onUpdateExaminationRecords,
  onUpdatePromotionHistory,
  onUpdateTransferHistory,
  currentUserName = 'Academic Master',
  onNavigateToSms,
  onNavigateToNectaAnalyzer
}) => {
  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  const [selectedExamType, setSelectedExamType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3 Instant View Toggles: Marks (78), Grade (B), Both (78 B)
  const [viewToggle, setViewToggle] = useState<ViewToggleMode>('both');

  // Grid and Printable Controls (Requirements: Show All Subjects toggle, 45deg rotation, compact printable)
  const [showAllSubjects, setShowAllSubjects] = useState<boolean>(false);
  const [rotateHeaders, setRotateHeaders] = useState<boolean>(false);
  const [useSubjectAbbr, setUseSubjectAbbr] = useState<boolean>(true);
  const [printFontSize, setPrintFontSize] = useState<'7px' | '8px' | '9px'>('8px');

  // NECTA Subject Code Helper (e.g. Kiomoni Secondary School with 12+ subjects)
  const getSubjectAbbr = (fullName: string): string => {
    const lower = fullName.toLowerCase().trim();
    if (lower.includes('kiswahili')) return 'KISW';
    if (lower.includes('english')) return 'ENG';
    if (lower.includes('basic math') || lower.includes('mathematics') || lower === 'math') return 'MATH';
    if (lower.includes('biology')) return 'BIO';
    if (lower.includes('chemistry')) return 'CHEM';
    if (lower.includes('physics')) return 'PHY';
    if (lower.includes('geography')) return 'GEO';
    if (lower.includes('history')) return 'HIST';
    if (lower.includes('civics')) return 'CIV';
    if (lower.includes('bookkeeping') || lower.includes('book keeping') || lower.includes('book-keeping')) return 'BKP';
    if (lower.includes('commerce')) return 'COMM';
    if (lower.includes('applied math') || lower.includes('bam')) return 'BAM';
    if (lower.includes('bible') || lower.includes('christian')) return 'BK';
    if (lower.includes('dini') || lower.includes('islamic') || lower.includes('edk')) return 'EDK';
    if (lower.includes('agriculture') || lower.includes('kilimo')) return 'AGR';
    if (lower.includes('computer') || lower.includes('ict')) return 'ICT';
    if (lower.includes('french')) return 'FREN';
    if (lower.includes('arabic')) return 'ARAB';
    if (lower.includes('general studies') || lower === 'gs') return 'G.ST';
    return fullName.length > 5 ? fullName.substring(0, 4).toUpperCase() : fullName.toUpperCase();
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Instant Sorting
  const [sortBy, setSortBy] = useState<SortOption>('rank_asc');

  // Quick Grade & Ranking Filters
  const [gradeFilter, setGradeFilter] = useState<QuickGradeFilter>('ALL');

  // Modals state
  const [profileModalStudent, setProfileModalStudent] = useState<Student | null>(null);
  const [transferModalStudent, setTransferModalStudent] = useState<Student | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState<boolean>(false);
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState<boolean>(false);

  // Available Academic Years from records
  const availableYears = useMemo(() => {
    const set = new Set<string>(['2026', '2025', '2024']);
    examinationRecords.forEach(r => {
      if (r.academicYear) set.add(r.academicYear);
    });
    return Array.from(set).sort().reverse();
  }, [examinationRecords]);

  // Available Streams for selected class
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

  // Handle inline remarks updates
  const handleUpdateRemarks = (recordId: string, remarks: string) => {
    const updated = examinationRecords.map(r => r.id === recordId ? { ...r, teacherRemarks: remarks } : r);
    onUpdateExaminationRecords(updated);
  };

  // Filtered examination records
  const filteredRecords = useMemo(() => {
    let list = examinationRecords.filter(r => {
      const matchYear = selectedYear === 'All' || r.academicYear === selectedYear;
      const matchClass = selectedClass === 'All' || r.className === selectedClass;
      const matchStream = selectedStream === 'All' || r.stream === selectedStream || (!r.stream && selectedStream === 'All');
      const matchTerm = selectedTerm === 'All' || r.term === selectedTerm;
      const matchExam = selectedExamType === 'All' || r.examType === selectedExamType;
      const matchSearch = !searchQuery.trim() || 
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r.studentId).includes(searchQuery);

      return matchYear && matchClass && matchStream && matchTerm && matchExam && matchSearch;
    });

    // Apply Grade & Ranking Quick Filters
    if (gradeFilter === 'A') {
      list = list.filter(r => r.overallGrade === 'A');
    } else if (gradeFilter === 'B') {
      list = list.filter(r => r.overallGrade === 'B');
    } else if (gradeFilter === 'C') {
      list = list.filter(r => r.overallGrade === 'C');
    } else if (gradeFilter === 'D') {
      list = list.filter(r => r.overallGrade === 'D');
    } else if (gradeFilter === 'F' || gradeFilter === 'FAILED') {
      list = list.filter(r => r.overallGrade === 'F');
    }

    // Apply Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.studentName.localeCompare(b.studentName);
        case 'name_desc':
          return b.studentName.localeCompare(a.studentName);
        case 'rank_asc':
          return (a.positionInClass || 999) - (b.positionInClass || 999);
        case 'rank_desc':
          return (b.positionInClass || 0) - (a.positionInClass || 0);
        case 'avg_desc':
          return b.averageMarks - a.averageMarks;
        case 'avg_asc':
          return a.averageMarks - b.averageMarks;
        case 'total_desc':
          return b.totalMarks - a.totalMarks;
        case 'total_asc':
          return a.totalMarks - b.totalMarks;
        default:
          return 0;
      }
    });

    // Top 10 & Bottom 10
    if (gradeFilter === 'TOP_10') {
      return list.slice(0, 10);
    } else if (gradeFilter === 'BOTTOM_10') {
      return list.slice(-10);
    }

    return list;
  }, [examinationRecords, selectedYear, selectedClass, selectedTerm, selectedExamType, searchQuery, gradeFilter, sortBy]);

  // Gender-wise summary for Division (Form 1 - 4) and Grades (A, B, C, D, F)
  const genderSummary = useMemo(() => {
    const divBreakdown: Record<string, { B: number; G: number; T: number }> = {
      'I': { B: 0, G: 0, T: 0 },
      'II': { B: 0, G: 0, T: 0 },
      'III': { B: 0, G: 0, T: 0 },
      'IV': { B: 0, G: 0, T: 0 },
      '0': { B: 0, G: 0, T: 0 }
    };

    const gradeBreakdown: Record<string, { B: number; G: number; T: number }> = {
      'A': { B: 0, G: 0, T: 0 },
      'B': { B: 0, G: 0, T: 0 },
      'C': { B: 0, G: 0, T: 0 },
      'D': { B: 0, G: 0, T: 0 },
      'F': { B: 0, G: 0, T: 0 }
    };

    let totalBoys = 0;
    let totalGirls = 0;

    filteredRecords.forEach(rec => {
      const matchSt = students.find(s => s.id === rec.studentId);
      const gender = (rec.gender || matchSt?.gender || '').toLowerCase();
      const isGirl = gender.startsWith('f') || gender.includes('female');
      const isBoy = !isGirl;

      if (isGirl) totalGirls++;
      else totalBoys++;

      // Division breakdown
      const divRaw = (rec.division || '').replace(/^DIV\s*/i, '').trim();
      if (divBreakdown[divRaw]) {
        if (isGirl) divBreakdown[divRaw].G++;
        else divBreakdown[divRaw].B++;
        divBreakdown[divRaw].T++;
      } else if (rec.overallGrade === 'F') {
        if (isGirl) divBreakdown['0'].G++;
        else divBreakdown['0'].B++;
        divBreakdown['0'].T++;
      }

      // Grade breakdown
      const g = rec.overallGrade || 'F';
      if (gradeBreakdown[g]) {
        if (isGirl) gradeBreakdown[g].G++;
        else gradeBreakdown[g].B++;
        gradeBreakdown[g].T++;
      }
    });

    return {
      divBreakdown,
      gradeBreakdown,
      totalBoys,
      totalGirls,
      total: filteredRecords.length
    };
  }, [filteredRecords, students]);

  // Aggregate subjects in current records for dynamic table headers with strict deduplication
  const activeSubjectKeys = useMemo(() => {
    const map = new Map<string, string>(); // lowerCase -> original
    filteredRecords.forEach(r => {
      if (r.subjects) {
        Object.keys(r.subjects).forEach(raw => {
          const clean = raw.trim();
          if (!clean) return;
          const lower = clean.toLowerCase();
          if (!map.has(lower)) {
            map.set(lower, clean);
          }
        });
      }
    });
    return Array.from(map.values()).sort();
  }, [filteredRecords]);

  // Dynamic ranking based on Average (and Total) marks descending
  const rankedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const avgA = typeof a.averageMarks === 'number' ? a.averageMarks : parseFloat(String(a.averageMarks)) || 0;
      const avgB = typeof b.averageMarks === 'number' ? b.averageMarks : parseFloat(String(b.averageMarks)) || 0;
      if (avgB !== avgA) return avgB - avgA;
      return (b.totalMarks || 0) - (a.totalMarks || 0);
    });

    let currentRank = 1;
    return list.map((item, idx) => {
      if (idx > 0) {
        const prev = list[idx - 1];
        const prevAvg = typeof prev.averageMarks === 'number' ? prev.averageMarks : parseFloat(String(prev.averageMarks)) || 0;
        const curAvg = typeof item.averageMarks === 'number' ? item.averageMarks : parseFloat(String(item.averageMarks)) || 0;
        if (curAvg < prevAvg) {
          currentRank = idx + 1;
        }
      }
      return {
        ...item,
        computedRank: currentRank
      };
    });
  }, [filteredRecords]);

  // Robust case-insensitive subject mark lookup
  const getSubjectMarkInfo = (rec: ExaminationRecord, subName: string) => {
    if (!rec.subjects) return null;
    if (rec.subjects[subName]) return rec.subjects[subName];
    const lower = subName.toLowerCase();
    for (const [k, v] of Object.entries(rec.subjects)) {
      if (k.toLowerCase() === lower) return v;
    }
    return null;
  };

  // Counts for Promotion readiness
  const janDecStudentsCount = students.filter(s => detectCalendarType(s.className) === 'JAN-DEC' && !s.className.includes('Graduated')).length;
  const julyJuneStudentsCount = students.filter(s => detectCalendarType(s.className) === 'JULY-JUNE' && !s.className.includes('Graduated')).length;

  // Handle Transfer execution
  const handleConfirmTransfer = (transferEntry: TransferHistory) => {
    const updatedTransferHistory = [transferEntry, ...transferHistory];
    onUpdateTransferHistory(updatedTransferHistory);

    // Update student's class
    const cleanClassName = transferEntry.toClass.split(' - ')[0] || transferEntry.toClass;
    const cleanStream = transferEntry.toClass.split(' - ')[1] || 'STREAM A';

    const updatedStudents = students.map(s => {
      if (s.id === transferEntry.studentId) {
        return {
          ...s,
          className: cleanClassName,
          stream: cleanStream
        };
      }
      return s;
    });

    onUpdateStudents(updatedStudents);
  };

  // Handle Promotion execution
  const handleExecutePromotion = (promotedStudents: Student[], historyLogs: PromotionHistory[]) => {
    onUpdateStudents(promotedStudents);
    onUpdatePromotionHistory([...historyLogs, ...promotionHistory]);
  };

  // WhatsApp individual student results
  const handleWhatsAppStudent = (rec: ExaminationRecord) => {
    const pointsStr = rec.points !== undefined && rec.points !== null ? String(rec.points) : '-';
    const divStr = rec.division || rec.overallGrade || '-';
    const remarks = getGradeRemark(rec.overallGrade);

    const subjectStrings: string[] = [];
    if (rec.subjects) {
      Object.entries(rec.subjects).forEach(([subName, info]) => {
        subjectStrings.push(`${subName}: ${info.marks}/100 (${info.grade})`);
      });
    }
    const subjectsText = subjectStrings.length > 0 ? subjectStrings.join(', ') : 'None';
    const streamText = rec.stream ? `Stream ${rec.stream}` : '';

    const text = `HABY EDUPRO - ${schoolInfo.name.toUpperCase()}
Name: ${rec.studentName} Class: ${rec.className} ${streamText} Year: ${rec.academicYear} Term: ${rec.term} Exam: ${rec.examType}
${subjectsText}
Total: ${rec.totalMarks} Avg: ${rec.averageMarks}% Points: ${pointsStr} Div: ${divStr} Pos: ${rec.positionInClass}/${rec.totalStudents} Remarks: ${remarks}`;

    const phoneDigits = (rec.parentPhone || '').replace(/[^0-9]/g, '');
    const url = phoneDigits
      ? `https://wa.me/${phoneDigits.startsWith('0') ? '255' + phoneDigits.slice(1) : phoneDigits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-[#1e3a8a] text-white rounded-2xl p-6 shadow-md border border-blue-900 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-400 text-slate-900 rounded-xl font-black shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Examination Records & Academic Ledger</h1>
                <p className="text-blue-200 text-xs mt-0.5">
                  Official examination records, grades (A/B/C/D/F), NECTA divisions & points, transfers and automatic promotion
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-4 flex items-center gap-4 flex-wrap text-xs">
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs">
                <span className="text-blue-200 block text-[10px]">Registered Records:</span>
                <strong className="text-white font-black text-sm">{examinationRecords.length}</strong>
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs">
                <span className="text-blue-200 block text-[10px]">JAN-DEC Calendar (Std 1-7, Form 1-4):</span>
                <strong className="text-emerald-300 font-bold">{janDecStudentsCount} Students</strong>
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-xs">
                <span className="text-blue-200 block text-[10px]">JULY-JUNE Calendar (Form 5-6):</span>
                <strong className="text-purple-300 font-bold">{julyJuneStudentsCount} Students</strong>
              </div>
            </div>
          </div>

          {/* Action Center Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onNavigateToSms && (
              <button
                type="button"
                onClick={() => onNavigateToSms(selectedExamType !== 'All' ? selectedExamType : undefined, selectedYear !== 'All' ? selectedYear : undefined)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] border border-emerald-400"
                title="Tuma matokeo haya kwa wazazi kupitia SMS (Beem Africa)"
              >
                <Smartphone className="w-4 h-4 text-emerald-200" />
                <span>Tuma kwa Wazazi via SMS</span>
              </button>
            )}

            {onNavigateToNectaAnalyzer && (
              <button
                type="button"
                onClick={onNavigateToNectaAnalyzer}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] border border-indigo-400"
                title="Chakata matokeo ya NECTA kwa jinsia na uhamishe kwenda Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
                <span>NECTA Analyzer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPdfExportModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] border border-blue-400"
              title="Export results ledger as clean, printable PDF with remarks and signatures"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span>Export Results PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkWhatsAppOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] border border-emerald-400"
              title="Send results to whole class parents via WhatsApp automatically"
            >
              <Share2 className="w-4 h-4 text-emerald-200" />
              <span>Send Bulk Results to WhatsApp (Whole Class)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs"
            >
              <History className="w-4 h-4 text-amber-300" />
              <span>History Logs ({promotionHistory.length + transferHistory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPromotionModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Run Promotion Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel: Filters, Search, View Toggles & Sorting */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Primary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Year selector */}
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

          {/* Class selector */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Class Level (Nursery - Form 6)
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStream('All');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="All">All Classes</option>
              <optgroup label="NURSERY LEVEL">
                {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="PRIMARY LEVEL (Std 1 - 7)">
                {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="SECONDARY LEVEL (Form 1 - 6)">
                {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>

          {/* Stream selector */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Stream
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

          {/* Term selector */}
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

          {/* Exam Type selector */}
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

          {/* Search Input */}
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
                placeholder="Name or ID..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* View Toggle (Marks / Grade / Both) & Sorting Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* 3 Instant View Toggles */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">View Mode:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewToggle('marks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewToggle === 'marks'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Marks (78)
              </button>
              <button
                type="button"
                onClick={() => setViewToggle('grade')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewToggle === 'grade'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grade (B)
              </button>
              <button
                type="button"
                onClick={() => setViewToggle('both')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewToggle === 'both'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both (78 B)
              </button>
            </div>
          </div>

          {/* Instant Sorting Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="rank_asc">Rank (1 → Last)</option>
              <option value="rank_desc">Rank (Last → 1)</option>
              <option value="name_asc">Candidate Name (A - Z)</option>
              <option value="name_desc">Candidate Name (Z - A)</option>
              <option value="avg_desc">Average (High - Low)</option>
              <option value="avg_asc">Average (Low - High)</option>
              <option value="total_desc">Total Marks (High - Low)</option>
              <option value="total_asc">Total Marks (Low - High)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips: Grade A, B, C, D, F, Top10, Bottom10, Failed */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Filters:</span>
          {(
            [
              { id: 'ALL', label: 'All Candidates' },
              { id: 'A', label: 'Grade A (80-100)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { id: 'B', label: 'Grade B (60-79)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { id: 'C', label: 'Grade C (45-59)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { id: 'D', label: 'Grade D (30-44)', color: 'text-orange-700 bg-orange-50 border-orange-200' },
              { id: 'F', label: 'Grade F (0-29)', color: 'text-rose-700 bg-rose-50 border-rose-200' },
              { id: 'TOP_10', label: 'Top 10 Ranked', color: 'text-purple-700 bg-purple-50 border-purple-200' },
              { id: 'BOTTOM_10', label: 'Bottom 10 Ranked', color: 'text-slate-700 bg-slate-100 border-slate-300' },
              { id: 'FAILED', label: 'Failed (Grade F)', color: 'text-rose-800 bg-rose-100 border-rose-300' }
            ] as const
          ).map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setGradeFilter(chip.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                gradeFilter === chip.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gender-wise Summary Breakdown Card (Item 6) */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Gender-Wise Performance Summary ({selectedClass !== 'All' ? selectedClass : 'All Levels'})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown filled gender-wise per level and stream for NECTA divisions and grade scale
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-slate-700">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Boys: <strong className="text-blue-700">{genderSummary.totalBoys}</strong></span>
            <span>•</span>
            <span>Girls: <strong className="text-rose-700">{genderSummary.totalGirls}</strong></span>
            <span>•</span>
            <span>Total: <strong className="text-slate-900">{genderSummary.total}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* NECTA Division Gender Breakdown */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#1f4d8b] uppercase tracking-wider">
                NECTA Division by Gender (Secondary)
              </h4>
              <span className="text-[10px] text-blue-600 font-normal">Div I (7-17) → Div 0 (34-35)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {(['I', 'II', 'III', 'IV', '0'] as const).map(div => {
                const item = genderSummary.divBreakdown[div] || { B: 0, G: 0, T: 0 };
                return (
                  <div key={div} className="bg-white p-2.5 rounded-xl border border-blue-100 flex flex-col justify-between gap-1 shadow-2xs">
                    <span className="font-medium text-xs text-slate-800">DIV {div}</span>
                    <GenderSummary B={item.B} G={item.G} T={item.T} total={genderSummary.total} size="xs" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grade Scale Gender Breakdown */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                Grade Distribution by Gender (All Levels)
              </h4>
              <span className="text-[10px] text-emerald-700 font-normal">A (80-100) → F (0-29)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {(['A', 'B', 'C', 'D', 'F'] as const).map(gr => {
                const item = genderSummary.gradeBreakdown[gr] || { B: 0, G: 0, T: 0 };
                return (
                  <div key={gr} className="bg-white p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-between gap-1 shadow-2xs">
                    <span className="font-medium text-xs text-slate-800">GRADE {gr}</span>
                    <GenderSummary B={item.B} G={item.G} T={item.T} total={genderSummary.total} size="xs" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Official A4 Landscape Print Styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-area, .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          table.printable-records-table {
            font-size: ${printFontSize} !important;
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          table.printable-records-table th,
          table.printable-records-table td {
            border: 1px solid #000000 !important;
            padding: 2px 2.5px !important;
            line-height: 1.15 !important;
            font-size: ${printFontSize} !important;
            color: #000000 !important;
          }
          table.printable-records-table thead {
            display: table-header-group !important;
            background-color: #f1f5f9 !important;
            color: #000000 !important;
          }
          table.printable-records-table tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .th-rotated {
            height: 52px !important;
            vertical-align: bottom !important;
            padding-bottom: 3px !important;
            white-space: nowrap !important;
          }
          .th-rotated > div {
            transform: rotate(-45deg) !important;
            transform-origin: bottom left !important;
            width: 26px !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm 6mm;
          }
        }
      `}</style>

      {/* Main Examination Records Section with Print Area */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Top Control Bar with the 2 New Buttons & Grid Toggles (no-print) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-sm">
              Examination Records ({filteredRecords.length})
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-[#1f4d8b] rounded-lg text-xs font-bold">
              {selectedClass !== 'All' ? selectedClass : 'All Classes'} {selectedStream !== 'All' ? `(${selectedStream})` : ''}
            </span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
              {selectedTerm !== 'All' ? selectedTerm : 'All Terms'} • {selectedYear}
            </span>
            {selectedExamType !== 'All' && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-semibold">
                {selectedExamType}
              </span>
            )}
          </div>

          {/* Action Buttons & View Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* BUTTON 1: Print Report (A4 Landscape) */}
            <button
              type="button"
              onClick={handlePrintReport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
              title="Print examination broadsheet on A4 Landscape (fits on 1-2 pages per class)"
            >
              <Printer className="w-4 h-4 text-emerald-100" />
              <span>Print Report (A4 Landscape)</span>
            </button>

            {/* BUTTON 2: Export PDF */}
            <button
              type="button"
              onClick={() => setIsPdfExportModalOpen(true)}
              className="px-4 py-2 bg-[#1f4d8b] hover:bg-blue-800 text-white font-black rounded-xl text-xs shadow-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
              title="Export official results ledger as customizable PDF"
            >
              <Download className="w-4 h-4 text-blue-200" />
              <span>Export PDF</span>
            </button>

            {/* TOGGLE: Show All Subjects / Essential Columns Only */}
            <button
              type="button"
              onClick={() => setShowAllSubjects(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                showAllSubjects
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title={showAllSubjects ? 'Currently showing all subject columns. Click to switch to Essential Columns.' : 'Click to show all subjects columns.'}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showAllSubjects ? `Hide Subjects (${activeSubjectKeys.length})` : `Show All Subjects (${activeSubjectKeys.length})`}</span>
            </button>

            {/* Subject Extra Controls when Show All Subjects is ON */}
            {showAllSubjects && (
              <>
                <button
                  type="button"
                  onClick={() => setRotateHeaders(prev => !prev)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                    rotateHeaders
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Rotate subject headers by 45 degrees (perfect for 10-14 subjects on A4)"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${rotateHeaders ? 'rotate-45' : ''}`} />
                  <span>{rotateHeaders ? 'Headers: 45° Rotated' : 'Rotate Headers 45°'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUseSubjectAbbr(prev => !prev)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    useSubjectAbbr ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  title="Toggle subject codes abbreviation (e.g. KISW, ENG, MATH)"
                >
                  <span>{useSubjectAbbr ? 'Code (KISW)' : 'Full Name'}</span>
                </button>
              </>
            )}

            {/* Print Font Size Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Print Font:</span>
              {(['7px', '8px', '9px'] as const).map(fs => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => setPrintFontSize(fs)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    printFontSize === fs ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Print font size ${fs}`}
                >
                  {fs}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Printable Area - Isolates Table, Letterhead & Signatures during window.print() */}
        <div className="print-area p-0 sm:p-2">
          {/* Official Letterhead Header (Visible ONLY during print: hidden print:block) */}
          <div className="hidden print:block mb-3 border-b-2 border-slate-900 pb-2">
            <div className="flex items-center justify-between gap-4">
              {schoolInfo.logo ? (
                <img src={schoolInfo.logo} alt="Logo" className="w-12 h-12 object-contain shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6 text-blue-800" />
                </div>
              )}
              <div className="text-center flex-1">
                <h4 className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
                  THE UNITED REPUBLIC OF TANZANIA
                </h4>
                <h4 className="text-[9px] font-bold uppercase text-slate-600">
                  PRESIDENT'S OFFICE - REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT
                </h4>
                <h1 className="text-base font-black uppercase tracking-wide text-slate-950 mt-0.5">
                  {schoolInfo.name || 'HABY EDU PRO SECONDARY SCHOOL'}
                </h1>
                <p className="text-[9px] font-bold text-slate-700 uppercase">
                  OFFICIAL EXAMINATION LEDGER & CANDIDATE RESULTS BROADSHEET (NECTA FORMAT)
                </p>
              </div>
              <div className="text-right text-[8px] text-slate-700 shrink-0 font-medium">
                <div><strong>CTR No:</strong> {schoolInfo.schoolNumber || 'S.0123'}</div>
                <div><strong>Print Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
                <div><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            {/* Official Exam Metadata Bar */}
            <div className="mt-2 pt-1.5 border-t border-slate-400 grid grid-cols-6 gap-2 text-[9px] font-bold text-slate-900">
              <div><span className="text-slate-600 font-normal">Class: </span>{selectedClass !== 'All' ? selectedClass : 'All Classes'} {selectedStream !== 'All' ? `(${selectedStream})` : ''}</div>
              <div><span className="text-slate-600 font-normal">Academic Year: </span>{selectedYear}</div>
              <div><span className="text-slate-600 font-normal">Term: </span>{selectedTerm}</div>
              <div><span className="text-slate-600 font-normal">Exam Type: </span>{selectedExamType}</div>
              <div><span className="text-slate-600 font-normal">Total Candidates: </span>{rankedRecords.length} Students</div>
              <div><span className="text-slate-600 font-normal">Gender: </span>B: {genderSummary.totalBoys} | G: {genderSummary.totalGirls}</div>
            </div>

            {/* Division Breakdown for Secondary */}
            <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[8px] font-semibold text-slate-800">
              <span><strong>NECTA Division Summary:</strong> Div I: {genderSummary.divBreakdown['I'].T} • Div II: {genderSummary.divBreakdown['II'].T} • Div III: {genderSummary.divBreakdown['III'].T} • Div IV: {genderSummary.divBreakdown['IV'].T} • Div 0: {genderSummary.divBreakdown['0'].T}</span>
              <span><strong>Grade Summary:</strong> A: {genderSummary.gradeBreakdown['A'].T} | B: {genderSummary.gradeBreakdown['B'].T} | C: {genderSummary.gradeBreakdown['C'].T} | D: {genderSummary.gradeBreakdown['D'].T} | F: {genderSummary.gradeBreakdown['F'].T}</span>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">No examination records found matching current filters.</p>
              <p className="text-xs text-slate-400 mt-1">
                Records are added automatically when academic staff calculate and click 'Release Results to Examination Records'.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full max-h-[70vh] print:max-h-none print:overflow-visible">
              <table className="printable-records-table w-full text-left text-xs border-collapse">
                <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider sticky top-0 z-20 font-bold print:bg-slate-100 print:text-black">
                  <tr>
                    <th className="p-2 w-10 text-center font-bold border border-slate-300 print:border-black">Pos</th>
                    <th className="p-2 font-bold min-w-[140px] border border-slate-300 print:border-black">Candidate Name</th>
                    <th className="p-2 text-center w-8 font-bold border border-slate-300 print:border-black">Sex</th>
                    <th className="p-2 text-center w-16 font-bold border border-slate-300 print:border-black">Class</th>
                    
                    {/* Dynamic Subjects - only shown if showAllSubjects is enabled */}
                    {showAllSubjects && activeSubjectKeys.map(sub => {
                      const displayTitle = useSubjectAbbr ? getSubjectAbbr(sub) : sub;
                      return (
                        <th
                          key={sub}
                          className={`p-1.5 text-center font-bold border border-slate-300 print:border-black ${
                            rotateHeaders
                              ? 'th-rotated align-bottom min-w-[28px] max-w-[36px] overflow-visible'
                              : 'truncate max-w-[85px]'
                          }`}
                          title={sub}
                        >
                          {rotateHeaders ? (
                            <div className="transform -rotate-45 origin-bottom-left whitespace-nowrap text-[8px] font-black tracking-tight pl-1">
                              {displayTitle}
                            </div>
                          ) : (
                            <span>{displayTitle}</span>
                          )}
                        </th>
                      );
                    })}

                    <th className="p-2 text-center w-12 font-bold border border-slate-300 print:border-black">Total</th>
                    <th className="p-2 text-center w-12 font-bold border border-slate-300 print:border-black">Avg%</th>
                    <th className="p-2 text-center w-12 font-bold border border-slate-300 print:border-black">Grade</th>
                    <th className="p-2 text-center w-14 font-bold border border-slate-300 print:border-black">Div</th>
                    <th className="p-2 text-center w-10 font-bold border border-slate-300 print:border-black">Rank</th>
                    <th className="p-2 text-left min-w-[140px] font-bold border border-slate-300 print:border-black">Remarks</th>
                    <th className="p-2 text-center w-28 font-bold border border-slate-300 print:border-black no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {rankedRecords.map((rec) => {
                    const matchingStudent: Student = students.find(s => s.id === rec.studentId) || {
                      id: rec.studentId,
                      name: rec.studentName,
                      gender: (rec.gender as any) || 'Male',
                      regNo: `REG${rec.studentId}`,
                      className: rec.className,
                      stream: rec.stream,
                      level: 'PRIMARY' as any,
                      dob: '2015-01-01',
                      subjects: Object.keys(rec.subjects || {})
                    };

                    const gradeStyle = getGradeColor(rec.overallGrade);

                    return (
                      <tr key={rec.id} className="hover:bg-blue-50/30 transition-colors font-normal">
                        {/* Position */}
                        <td className="p-1.5 text-center font-bold border border-slate-200 print:border-black">
                          <span className="print:font-bold text-slate-900 font-bold text-xs print:text-[8px]">
                            {rec.computedRank || rec.positionInClass}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td className="p-1.5 font-bold border border-slate-200 print:border-black">
                          <div className="font-bold text-slate-950 text-xs print:text-[8px]">{rec.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono no-print">ID: {rec.studentId}</div>
                        </td>

                        {/* Sex */}
                        <td className="p-1.5 text-center font-bold border border-slate-200 print:border-black">
                          <span className={`text-xs print:text-[8px] ${rec.gender?.toLowerCase().startsWith('f') ? 'text-rose-700 font-bold' : 'text-blue-700 font-bold'}`}>
                            {rec.gender?.toLowerCase().startsWith('f') ? 'F' : 'M'}
                          </span>
                        </td>

                        {/* Class */}
                        <td className="p-1.5 text-center font-medium border border-slate-200 print:border-black">
                          <span className="font-medium text-slate-800 text-xs print:text-[8px] whitespace-nowrap">
                            {rec.className} {rec.stream ? `(${rec.stream})` : ''}
                          </span>
                        </td>

                        {/* Dynamic Subjects */}
                        {showAllSubjects && activeSubjectKeys.map(sub => {
                          const info = getSubjectMarkInfo(rec, sub);
                          if (!info) {
                            return <td key={sub} className="p-1 text-center text-slate-300 border border-slate-200 print:border-black font-normal">-</td>;
                          }
                          const subGradeStyle = getGradeColor(info.grade);
                          return (
                            <td key={sub} className="p-1 text-center border border-slate-200 print:border-black font-medium">
                              {viewToggle === 'marks' && (
                                <span className="font-bold text-slate-900 text-xs print:text-[8px]">{info.marks}</span>
                              )}
                              {viewToggle === 'grade' && (
                                <span className={`px-1 py-0.5 rounded text-[11px] print:text-[8px] font-bold ${subGradeStyle.bg} print:bg-transparent`}>
                                  {info.grade}
                                </span>
                              )}
                              {viewToggle === 'both' && (
                                <div className="inline-flex items-center justify-center gap-0.5 text-xs print:text-[8px]">
                                  <span className="font-bold text-slate-900">{info.marks}</span>
                                  <span className="text-[9px] print:text-[7.5px] text-slate-500 font-bold">({info.grade})</span>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Marks */}
                        <td className="p-1.5 text-center font-black text-slate-950 border border-slate-200 print:border-black text-xs print:text-[8px]">
                          {rec.totalMarks}
                        </td>

                        {/* Average Marks */}
                        <td className="p-1.5 text-center font-black text-emerald-800 print:text-black border border-slate-200 print:border-black text-xs print:text-[8px]">
                          {rec.averageMarks}%
                        </td>

                        {/* Overall Grade */}
                        <td className="p-1.5 text-center font-black border border-slate-200 print:border-black text-xs print:text-[8px]">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs print:text-[8px] font-black ${gradeStyle.bg} print:bg-transparent print:p-0`}>
                            {rec.overallGrade}
                          </span>
                        </td>

                        {/* Division */}
                        <td className="p-1.5 text-center font-bold border border-slate-200 print:border-black text-blue-900 print:text-black text-xs print:text-[8px] whitespace-nowrap">
                          {rec.division ? `Div ${rec.division}` : '-'}
                          {rec.points !== undefined && rec.points !== null && (
                            <span className="text-[9px] print:text-[7px] text-slate-500 block">({rec.points}pts)</span>
                          )}
                        </td>

                        {/* Position in Class */}
                        <td className="p-1.5 text-center font-bold text-slate-800 border border-slate-200 print:border-black text-xs print:text-[8px]">
                          {rec.computedRank || rec.positionInClass}
                        </td>

                        {/* Teacher Remarks */}
                        <td className="p-1.5 text-left border border-slate-200 print:border-black">
                          {/* Screen Editable Form */}
                          <div className="no-print space-y-1">
                            <input
                              type="text"
                              placeholder="Add remark..."
                              value={rec.teacherRemarks || ''}
                              onChange={(e) => handleUpdateRemarks(rec.id, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:bg-amber-50 focus:border-amber-400 outline-none font-normal transition"
                              title="Click to edit remark inline"
                            />
                            <div className="flex items-center gap-1 flex-wrap">
                              {['Excellent', 'Very Good', 'Good Effort', 'Needs Improvement', 'Amefaulu'].map(badge => (
                                <button
                                  key={badge}
                                  type="button"
                                  onClick={() => handleUpdateRemarks(rec.id, badge)}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 cursor-pointer font-normal transition"
                                >
                                  {badge}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Print Static Text */}
                          <div className="hidden print:block text-[8px] leading-tight text-slate-900 max-w-[130px] truncate">
                            {rec.teacherRemarks || 'Good progress.'}
                          </div>
                        </td>

                        {/* Action buttons (Screen Only - no-print) */}
                        <td className="p-2 text-center no-print border border-slate-200">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="View Yearly Student Profile & Report"
                              onClick={() => setProfileModalStudent(matchingStudent)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Report</span>
                            </button>

                            <button
                              type="button"
                              title="Transfer Student to Another Class or Stream"
                              onClick={() => setTransferModalStudent(matchingStudent)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Transfer</span>
                            </button>

                            <button
                              type="button"
                              title="Send Results to Parent via WhatsApp"
                              onClick={() => handleWhatsAppStudent(rec)}
                              className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              title="Delete Examination Record"
                              onClick={() => {
                                if (window.confirm(`Delete examination record for ${rec.studentName} (${rec.className} ${rec.examType})?`)) {
                                  const updated = examinationRecords.filter(r => r.id !== rec.id);
                                  onUpdateExaminationRecords(updated);
                                }
                              }}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Official Signatures Block (Visible ONLY during print: hidden print:block) */}
          <div className="hidden print:block mt-5 pt-4 border-t-2 border-slate-900 text-[8px] leading-normal">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <span className="block font-bold text-slate-800 uppercase">Mwalimu wa Darasa (Class Teacher):</span>
                <div className="mt-7 border-b border-slate-500"></div>
                <div className="flex justify-between text-slate-700 mt-1">
                  <span>Jina: ___________________________</span>
                  <span>Saini & Tarehe</span>
                </div>
              </div>

              <div>
                <span className="block font-bold text-slate-800 uppercase">Mwalimu wa Taaluma (Academic Master):</span>
                <div className="mt-7 border-b border-slate-500"></div>
                <div className="flex justify-between text-slate-700 mt-1">
                  <span>Jina: {currentUserName}</span>
                  <span>Saini & Tarehe</span>
                </div>
              </div>

              <div>
                <span className="block font-bold text-slate-800 uppercase">Mkuu wa Shule (Head of School):</span>
                <div className="mt-7 border-b border-slate-500"></div>
                <div className="flex justify-between text-slate-700 mt-1">
                  <span>Muhuri Rasmi na Saini</span>
                  <span>Tarehe: {new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk WhatsApp Modal */}
      {isBulkWhatsAppOpen && (
        <BulkWhatsAppModal
          isOpen={isBulkWhatsAppOpen}
          onClose={() => setIsBulkWhatsAppOpen(false)}
          records={filteredRecords}
          students={students}
          schoolInfo={schoolInfo}
        />
      )}

      {/* Modals */}
      {profileModalStudent && (
        <StudentYearlyProfileModal
          isOpen={true}
          onClose={() => setProfileModalStudent(null)}
          student={profileModalStudent}
          records={filteredRecords}
          allRecords={examinationRecords}
          schoolInfo={schoolInfo}
          selectedYear={selectedYear}
        />
      )}

      {transferModalStudent && (
        <StudentTransferModal
          isOpen={true}
          onClose={() => setTransferModalStudent(null)}
          student={transferModalStudent}
          onConfirmTransfer={handleConfirmTransfer}
          currentUserName={currentUserName}
        />
      )}

      {isPromotionModalOpen && (
        <AutoPromotionModal
          isOpen={true}
          onClose={() => setIsPromotionModalOpen(false)}
          students={students}
          onExecutePromotion={handleExecutePromotion}
          currentUserName={currentUserName}
          academicYear={selectedYear}
        />
      )}

      {isHistoryModalOpen && (
        <HistoryAuditModal
          isOpen={true}
          onClose={() => setIsHistoryModalOpen(false)}
          promotionHistory={promotionHistory}
          transferHistory={transferHistory}
        />
      )}

      {/* PDF Export & Clean Printable Modal */}
      {isPdfExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="no-print bg-[#0f2948] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-300">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Official Examination Results Ledger (PDF / Print)</h3>
                  <p className="text-xs text-blue-200">
                    Filtered by: {selectedClass !== 'All' ? selectedClass : 'All Classes'} • {selectedStream !== 'All' ? selectedStream : 'All Streams'} • {selectedTerm} • Year {selectedYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfExportModalOpen(false)}
                  className="p-2 text-white/70 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-5 flex-1 text-slate-900 bg-white" id="results-pdf-print-area">
              {/* Letterhead */}
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-4">
                  {schoolInfo.logo ? (
                    <img src={schoolInfo.logo} alt="School Logo" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="p-1 rounded-lg bg-blue-50 border border-blue-200">
                      <HabyEduProLogo theme="light" size="sm" variant="icon" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-slate-900">
                      {schoolInfo.name || 'HABY EDU PRO SCHOOL'}
                    </h2>
                    <p className="text-xs font-medium text-slate-600 uppercase">
                      OFFICIAL EXAMINATION LEDGER & STUDENT REPORT RECORD (NECTA FORMAT)
                    </p>
                    <p className="text-[11px] text-slate-500 font-normal">
                      CTR: {schoolInfo.schoolNumber || 'S.0123'} • {schoolInfo.address || 'Tanzania'} • Tel: {schoolInfo.phone || '+255...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Class Level:</span>
                  <span className="text-slate-900 font-medium">{selectedClass}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Stream:</span>
                  <span className="text-slate-900 font-medium">{selectedStream}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Academic Year:</span>
                  <span className="text-slate-900 font-medium">{selectedYear}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Term & Exam:</span>
                  <span className="text-slate-900 font-medium">{selectedTerm} ({selectedExamType})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Total Candidates:</span>
                  <span className="text-blue-900 font-medium">{rankedRecords.length} Students</span>
                </div>
              </div>

              {/* Division / Grade Summary with Gender Breakdown (Requirement 1) */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2 text-xs font-normal">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-medium text-slate-700">Exam Cohort Gender Distribution:</span>
                  <GenderSummary
                    label="Cohort Total"
                    B={genderSummary.totalBoys}
                    G={genderSummary.totalGirls}
                    T={genderSummary.total}
                    total={genderSummary.total}
                    size="xs"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-0.5">
                  {(['I', 'II', 'III', 'IV', '0'] as const).map(div => {
                    const item = genderSummary.divBreakdown[div] || { B: 0, G: 0, T: 0 };
                    return (
                      <div key={div} className="bg-white px-2 py-1 rounded-md border border-slate-200">
                        <GenderSummary
                          label={`Div ${div}`}
                          B={item.B}
                          G={item.G}
                          T={item.T}
                          total={genderSummary.total}
                          size="xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Results Table - 100% width, compact 8px font, border-collapse, visible overflow */}
              <div className="w-full overflow-x-visible border border-slate-300 rounded-xl">
                <table className="printable-records-table w-full text-left border-collapse overflow-visible font-normal text-[8px]">
                  <thead className="bg-[#1f4d8b] text-white uppercase tracking-wider font-bold text-[8px]">
                    <tr>
                      <th className="p-1.5 text-center w-8 border border-blue-900 font-bold">Pos</th>
                      <th className="p-1.5 border border-blue-900 min-w-[120px] font-bold">Student Name</th>
                      <th className="p-1.5 text-center w-8 border border-blue-900 font-bold">Sex</th>
                      <th className="p-1.5 text-center border border-blue-900 font-bold">Class</th>
                      {activeSubjectKeys.map(sub => (
                        <th key={sub} className="p-1 text-center border border-blue-900 font-bold text-[8px] max-w-[42px] truncate" title={sub}>
                          {useSubjectAbbr ? getSubjectAbbr(sub) : sub}
                        </th>
                      ))}
                      <th className="p-1.5 text-center border border-blue-900 w-10 font-bold">Total</th>
                      <th className="p-1.5 text-center border border-blue-900 w-10 font-bold">Avg%</th>
                      <th className="p-1.5 text-center border border-blue-900 w-12 font-bold">Grade</th>
                      <th className="p-1.5 text-center border border-blue-900 w-12 font-bold">Div</th>
                      <th className="p-1.5 min-w-[110px] font-bold border border-blue-900">Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-normal text-slate-800 text-[8px]">
                    {rankedRecords.map((rec, i) => (
                      <tr key={rec.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                        <td className="p-1 text-center font-bold border border-slate-300">
                          {rec.computedRank || rec.positionInClass}
                        </td>
                        <td className="p-1 font-bold text-slate-900 border border-slate-300">
                          {rec.studentName}
                        </td>
                        <td className="p-1 text-center border border-slate-300 font-bold">
                          {rec.gender?.toLowerCase().startsWith('f') ? 'F' : 'M'}
                        </td>
                        <td className="p-1 text-center border border-slate-300 text-slate-700 font-medium">
                          {rec.className} {rec.stream ? `(${rec.stream})` : ''}
                        </td>
                        {activeSubjectKeys.map(sub => {
                          const subInfo = getSubjectMarkInfo(rec, sub);
                          return (
                            <td key={sub} className="p-1 text-center border border-slate-300 font-medium">
                              {subInfo ? (
                                <span>
                                  {subInfo.marks} <span className="text-slate-500 font-bold">({subInfo.grade})</span>
                                </span>
                              ) : '-'}
                            </td>
                          );
                        })}
                        <td className="p-1 text-center font-black text-slate-900 border border-slate-300">
                          {rec.totalMarks}
                        </td>
                        <td className="p-1 text-center font-black text-blue-900 border border-slate-300">
                          {rec.averageMarks}%
                        </td>
                        <td className="p-1 text-center border border-slate-300 font-black">
                          {rec.overallGrade}
                        </td>
                        <td className="p-1 text-center border border-slate-300 font-bold text-blue-800">
                          {rec.division ? `Div ${rec.division}` : '-'}
                        </td>
                        <td className="p-1 text-slate-700 border border-slate-300 truncate max-w-[120px]">
                          {rec.teacherRemarks || 'Good progress.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Official Signatures Block */}
              <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mwalimu wa Darasa (Class Teacher):</span>
                  <div className="mt-8 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">Saini na Tarehe</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mwalimu wa Taaluma (Academic Master):</span>
                  <div className="mt-8 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">Saini na Tarehe</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mkuu wa Shule (Head of School):</span>
                  <div className="mt-8 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">Muhuri Rasmi na Saini</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
