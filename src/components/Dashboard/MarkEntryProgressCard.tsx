import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Search, 
  Filter, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  RefreshCw, 
  Copy, 
  Check, 
  Sparkles, 
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle
} from 'lucide-react';
import { Student, Teacher, Exam, TimetableAssignment, TeacherAssignment, ExaminationRecord } from '../../types';
import { isSameClass } from '../../utils/reportCardUtils';

interface MarkEntryProgressCardProps {
  students: Student[];
  teachers: Teacher[];
  exams: Exam[];
  timetableAssignments?: TimetableAssignment[];
  teacherAssignments?: TeacherAssignment[];
  examinationRecords?: ExaminationRecord[];
  onNavigate?: (view: string) => void;
  isLoading?: boolean;
}

export interface TeacherSubjectProgress {
  subject: string;
  className: string;
  stream: string;
  totalStudents: number;
  markedStudents: number;
  percentage: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

export interface TeacherMarkProgress {
  teacher: Teacher;
  subjectsProgress: TeacherSubjectProgress[];
  totalExpectedMarks: number;
  totalMarkedScores: number;
  overallPercentage: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'NOT_ASSIGNED';
  assignedSubjectsCount: number;
  assignedClassesCount: number;
}

export const MarkEntryProgressCard: React.FC<MarkEntryProgressCardProps> = ({
  students = [],
  teachers = [],
  exams = [],
  timetableAssignments = [],
  teacherAssignments = [],
  examinationRecords = [],
  onNavigate,
  isLoading = false
}) => {
  // Session Selectors State
  const [selectedExamId, setSelectedExamId] = useState<string | number>(() => {
    const active = exams.find(e => e.status === 'Active' || e.isActive !== false);
    return active ? active.id : (exams[0]?.id || 1);
  });
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Record<number, boolean>>({});
  const [copiedTeacherId, setCopiedTeacherId] = useState<number | null>(null);

  // Selected Exam Object
  const currentExam = useMemo(() => {
    return exams.find(e => String(e.id) === String(selectedExamId)) || exams[0];
  }, [exams, selectedExamId]);

  // Exam key matching MarkEntryView strict isolation
  const examKey = useMemo(() => {
    if (!currentExam) return '';
    return `${currentExam.id}_${selectedYear}_${selectedTerm}`.toLowerCase();
  }, [currentExam, selectedYear, selectedTerm]);

  // Fallback exam name key
  const fallbackExamNameKey = useMemo(() => {
    if (!currentExam) return '';
    return `${currentExam.name}_${selectedYear}_${selectedTerm}`.toLowerCase();
  }, [currentExam, selectedYear, selectedTerm]);

  // Unique list of classes present in student roster
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.className?.trim()) set.add(s.className.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // Helper function to check if a student has marks entered for a subject in this exam session
  const checkStudentHasMark = (student: Student, subject: string): boolean => {
    const sName = subject.trim().toLowerCase();

    // 1. Direct match on current strict examKey
    if (student.examMarks && examKey && student.examMarks[examKey]) {
      const examScores = student.examMarks[examKey];
      for (const [subKey, val] of Object.entries(examScores)) {
        if (subKey.trim().toLowerCase() === sName || 
           (sName.includes('math') && subKey.toLowerCase().includes('math'))) {
          if (val !== undefined && val !== null && !isNaN(Number(val)) && String(val).trim() !== '') return true;
        }
      }
    }

    // 2. Check fallback exam name key
    if (student.examMarks && fallbackExamNameKey && student.examMarks[fallbackExamNameKey]) {
      const examScores = student.examMarks[fallbackExamNameKey];
      for (const [subKey, val] of Object.entries(examScores)) {
        if (subKey.trim().toLowerCase() === sName || 
           (sName.includes('math') && subKey.toLowerCase().includes('math'))) {
          if (val !== undefined && val !== null && !isNaN(Number(val)) && String(val).trim() !== '') return true;
        }
      }
    }

    // 3. Check direct exam name or type keys in student.examMarks
    if (student.examMarks && currentExam) {
      const altKeys = [currentExam.name?.toLowerCase(), currentExam.type?.toLowerCase()].filter(Boolean) as string[];
      for (const altKey of altKeys) {
        if (student.examMarks[altKey]) {
          const scores = student.examMarks[altKey];
          for (const [subKey, val] of Object.entries(scores)) {
            if (subKey.trim().toLowerCase() === sName) {
              if (val !== undefined && val !== null && !isNaN(Number(val)) && String(val).trim() !== '') return true;
            }
          }
        }
      }
    }

    // 4. Check examinationRecords database records
    if (examinationRecords.length > 0 && currentExam) {
      const matchingRec = examinationRecords.find(rec => 
        rec.studentId === student.id &&
        rec.academicYear === selectedYear &&
        rec.term === selectedTerm &&
        (rec.examType?.toLowerCase() === currentExam.type?.toLowerCase() ||
         rec.examType?.toLowerCase() === currentExam.name?.toLowerCase() ||
         rec.examType?.toLowerCase().includes('midterm') && currentExam.name?.toLowerCase().includes('midterm') ||
         rec.examType?.toLowerCase().includes('terminal') && currentExam.name?.toLowerCase().includes('terminal') ||
         rec.examType?.toLowerCase().includes('annual') && currentExam.name?.toLowerCase().includes('annual'))
      );
      if (matchingRec && matchingRec.subjects) {
        for (const [subKey, info] of Object.entries(matchingRec.subjects)) {
          if (subKey.trim().toLowerCase() === sName && info && info.marks !== undefined && info.marks !== null) {
            return true;
          }
        }
      }
    }

    // 5. Fallback: check general student.marks if present
    if (student.marks) {
      for (const [subKey, val] of Object.entries(student.marks)) {
        if (subKey.trim().toLowerCase() === sName && val !== undefined && val !== null && !isNaN(Number(val)) && String(val).trim() !== '') {
          return true;
        }
      }
    }

    return false;
  };

  // Compute teacher mark entry progress
  const teachersProgressData = useMemo<TeacherMarkProgress[]>(() => {
    return teachers.map(teacher => {
      // Find teacher assignments
      const tAssignment = teacherAssignments.find(
        ta => ta.teacherId === teacher.id || ta.teacherName?.toLowerCase() === teacher.name?.toLowerCase()
      );

      // Find timetable assignments for this teacher
      const tTimetables = timetableAssignments.filter(ta => ta.teacherId === teacher.id);

      // Collect all subject + class + stream pairs
      const targetPairs: { subject: string; className: string; stream: string }[] = [];
      const pairSet = new Set<string>();

      // 1. From explicit teacherAssignments
      if (tAssignment && tAssignment.subjects && tAssignment.streams) {
        tAssignment.subjects.forEach(subject => {
          tAssignment.streams.forEach(str => {
            // parse string like "Form 1 - STREAM A" or "Standard 1 - STREAM B"
            const parts = str.split('-').map(p => p.trim());
            const className = parts[0] || 'Form 1';
            const stream = parts[1] || 'All';
            const key = `${subject}_${className}_${stream}`.toLowerCase();
            if (!pairSet.has(key)) {
              pairSet.add(key);
              targetPairs.push({ subject, className, stream });
            }
          });
        });
      }

      // 2. From timetableAssignments
      if (tTimetables.length > 0) {
        tTimetables.forEach(tt => {
          if (tt.subject && tt.className) {
            const key = `${tt.subject}_${tt.className}_${tt.stream || 'All'}`.toLowerCase();
            if (!pairSet.has(key)) {
              pairSet.add(key);
              targetPairs.push({ subject: tt.subject, className: tt.className, stream: tt.stream || 'All' });
            }
          }
        });
      }

      // 3. Fallback: from teacher.subjects and teacher.teachingStreams
      if (targetPairs.length === 0 && teacher.subjects && teacher.subjects.length > 0) {
        const teachingStreams = teacher.teachingStreams || [];
        if (teachingStreams.length > 0) {
          teacher.subjects.forEach(subject => {
            teachingStreams.forEach(str => {
              const parts = str.split('-').map(p => p.trim());
              const className = parts[0] || 'Form 1';
              const stream = parts[1] || 'All';
              const key = `${subject}_${className}_${stream}`.toLowerCase();
              if (!pairSet.has(key)) {
                pairSet.add(key);
                targetPairs.push({ subject, className, stream });
              }
            });
          });
        } else {
          // If no specific class is assigned, identify which classes have students enrolled in teacher's subjects
          teacher.subjects.forEach(subject => {
            const relevantClasses = new Set<string>();
            students.forEach(s => {
              const subMatch = (s.subjects || []).some(
                sub => sub.toLowerCase().trim() === subject.toLowerCase().trim()
              );
              if (subMatch && s.className) {
                relevantClasses.add(s.className);
              }
            });

            if (relevantClasses.size > 0) {
              relevantClasses.forEach(className => {
                const key = `${subject}_${className}_all`.toLowerCase();
                if (!pairSet.has(key)) {
                  pairSet.add(key);
                  targetPairs.push({ subject, className, stream: 'All' });
                }
              });
            } else {
              // Default to Form 1 or Standard 1
              const defaultClass = availableClasses[0] || 'Form 1';
              const key = `${subject}_${defaultClass}_all`.toLowerCase();
              if (!pairSet.has(key)) {
                pairSet.add(key);
                targetPairs.push({ subject, className: defaultClass, stream: 'All' });
              }
            }
          });
        }
      }

      // Now evaluate progress for each pair
      const subjectsProgress: TeacherSubjectProgress[] = [];
      let totalExpectedMarks = 0;
      let totalMarkedScores = 0;
      const uniqueClasses = new Set<string>();
      const uniqueSubjects = new Set<string>();

      targetPairs.forEach(pair => {
        uniqueClasses.add(pair.className);
        uniqueSubjects.add(pair.subject);

        // Find students in this class and stream taking this subject
        const targetStudents = students.filter(s => {
          const matchClass = isSameClass(s.className, pair.className);
          const matchStream = pair.stream === 'All' || !s.stream || 
            s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === pair.stream.toUpperCase().replace(/^STREAM\s+/i, '') ||
            s.stream.toUpperCase().includes(pair.stream.toUpperCase());
          const matchSubject = (s.subjects || []).some(
            sub => sub.toLowerCase().trim() === pair.subject.toLowerCase().trim()
          ) || (s.subjects && s.subjects.length === 0);

          return matchClass && matchStream && matchSubject;
        });

        const totalInPair = targetStudents.length;
        let markedInPair = 0;

        targetStudents.forEach(st => {
          if (checkStudentHasMark(st, pair.subject)) {
            markedInPair++;
          }
        });

        const pct = totalInPair > 0 ? Math.round((markedInPair / totalInPair) * 100) : 0;
        let status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = 'PENDING';
        if (totalInPair > 0 && markedInPair >= totalInPair) {
          status = 'COMPLETED';
        } else if (markedInPair > 0) {
          status = 'IN_PROGRESS';
        }

        totalExpectedMarks += totalInPair;
        totalMarkedScores += markedInPair;

        subjectsProgress.push({
          subject: pair.subject,
          className: pair.className,
          stream: pair.stream,
          totalStudents: totalInPair,
          markedStudents: markedInPair,
          percentage: pct,
          status
        });
      });

      const overallPercentage = totalExpectedMarks > 0 
        ? Math.round((totalMarkedScores / totalExpectedMarks) * 100) 
        : (subjectsProgress.length > 0 ? 0 : 100);

      let overallStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'NOT_ASSIGNED' = 'PENDING';
      if (subjectsProgress.length === 0) {
        overallStatus = 'NOT_ASSIGNED';
      } else if (totalExpectedMarks > 0 && totalMarkedScores >= totalExpectedMarks) {
        overallStatus = 'COMPLETED';
      } else if (totalMarkedScores > 0) {
        overallStatus = 'IN_PROGRESS';
      }

      return {
        teacher,
        subjectsProgress,
        totalExpectedMarks,
        totalMarkedScores,
        overallPercentage,
        status: overallStatus,
        assignedSubjectsCount: uniqueSubjects.size,
        assignedClassesCount: uniqueClasses.size
      };
    });
  }, [
    teachers,
    teacherAssignments,
    timetableAssignments,
    students,
    availableClasses,
    examKey,
    fallbackExamNameKey,
    currentExam,
    selectedYear,
    selectedTerm,
    examinationRecords
  ]);

  // Aggregate stats across all teachers
  const aggregateStats = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let totalExpected = 0;
    let totalMarked = 0;

    teachersProgressData.forEach(tp => {
      if (tp.status === 'COMPLETED') completedCount++;
      else if (tp.status === 'IN_PROGRESS') inProgressCount++;
      else if (tp.status === 'PENDING') pendingCount++;

      totalExpected += tp.totalExpectedMarks;
      totalMarked += tp.totalMarkedScores;
    });

    const overallCompletionRate = totalExpected > 0 ? Math.round((totalMarked / totalExpected) * 100) : 0;

    return {
      totalTeachers: teachers.length,
      completedCount,
      inProgressCount,
      pendingCount,
      totalExpected,
      totalMarked,
      overallCompletionRate
    };
  }, [teachersProgressData, teachers.length]);

  // Filtered list of teachers based on UI controls
  const filteredTeachers = useMemo(() => {
    return teachersProgressData.filter(tp => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && tp.status !== statusFilter) {
        return false;
      }

      // 2. Class Filter
      if (classFilter !== 'ALL') {
        const teachesClass = tp.subjectsProgress.some(sp => isSameClass(sp.className, classFilter));
        if (!teachesClass) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = tp.teacher.name.toLowerCase().includes(q);
        const matchRole = (tp.teacher.schoolRole || '').toLowerCase().includes(q);
        const matchSub = tp.subjectsProgress.some(sp => sp.subject.toLowerCase().includes(q));
        if (!matchName && !matchRole && !matchSub) return false;
      }

      return true;
    });
  }, [teachersProgressData, statusFilter, classFilter, searchQuery]);

  // Toggle accordion expand
  const toggleTeacherExpand = (id: number) => {
    setExpandedTeacherIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Copy Reminder Message for a Teacher
  const handleCopyReminder = (teacher: Teacher, tp: TeacherMarkProgress) => {
    const uncompleted = tp.subjectsProgress.filter(s => s.status !== 'COMPLETED');
    const subList = uncompleted.map(s => `${s.subject} (${s.className})`).join(', ');
    const text = `Habari Mwl. ${teacher.name}, Huu ni ukumbusho wa mfumo wa Haby Edu Pro: Mtihani wa ${currentExam?.name || 'Mtihani'} (${selectedYear} ${selectedTerm}) unaendelea. Tafadhali kamilisha kujaza alama za masomo yako: [${subList}]. Ahsante!`;

    navigator.clipboard.writeText(text);
    setCopiedTeacherId(teacher.id);
    setTimeout(() => {
      setCopiedTeacherId(null);
    }, 2500);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* CARD HEADER & SESSION CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 border border-emerald-300/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE MARK ENTRY TRACKER
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
              {aggregateStats.completedCount} / {teachers.length} Walimu Wamekamilisha
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Ufuatiliaji wa Uwekaji Alama (Mark Entry Sessions)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tazama kwa wakati halisi maendeleo ya uwekaji wa alama za mtihani kwa kila mwalimu na somo husika.
          </p>
        </div>

        {/* Action Controls & Session Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Exam Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-500 text-[11px] uppercase">Mtihani:</span>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="bg-transparent font-black text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} {ex.type ? `(${ex.type})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-500 text-[11px] uppercase">Mwaka:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-black text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              {['2026', '2025', '2024'].map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Term Selector */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-500 text-[11px] uppercase">Muhula:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="bg-transparent font-black text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
            </select>
          </div>

          {/* Go to Mark Entry Ledger Button */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('markentry')}
              className="px-3.5 py-2 bg-gradient-to-r from-[#1f4d8b] to-[#123158] hover:from-[#173b6b] hover:to-[#0f2948] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ml-auto sm:ml-0"
            >
              <span>+ Weka Alama</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Completion Rate */}
        <div className="bg-gradient-to-br from-blue-900 to-[#0f2948] text-white rounded-2xl p-4.5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-200 bg-white/10 px-2 py-0.5 rounded-md">
              Jumla ya Ujazaji
            </span>
            <div className="p-2 bg-white/15 rounded-xl">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{aggregateStats.overallCompletionRate}%</div>
            <div className="text-xs text-blue-200 font-medium mt-0.5">
              Alama {aggregateStats.totalMarked} kati ya {aggregateStats.totalExpected} zimewekwa
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${aggregateStats.overallCompletionRate}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700"
            />
          </div>
        </div>

        {/* Card 2: Walimu Waliomaliza (Completed) */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
              Waliomaliza
            </span>
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-950">
              {aggregateStats.completedCount}
              <span className="text-xs font-bold text-emerald-700 ml-1.5">/ {teachers.length}</span>
            </div>
            <div className="text-xs font-bold text-emerald-800 mt-0.5">
              Walimu wamekamilisha masomo yote (100%)
            </div>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700">
            {teachers.length > 0 ? Math.round((aggregateStats.completedCount / teachers.length) * 100) : 0}% ya wafanyakazi
          </div>
        </div>

        {/* Card 3: Walimu Wanaondelea (In Progress) */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
              Wanaondelea
            </span>
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-950">{aggregateStats.inProgressCount}</div>
            <div className="text-xs font-bold text-amber-800 mt-0.5">
              Walimu wameanza kuweka alama lakini bado hawajamaliza
            </div>
          </div>
          <div className="text-[11px] font-semibold text-amber-700">
            Wapo katikati ya ujazaji
          </div>
        </div>

        {/* Card 4: Walimu Hawajaanza (Pending / Not Started) */}
        <div className="bg-rose-50/60 border border-rose-200/90 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-md">
              Hawajaanza
            </span>
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-rose-950">{aggregateStats.pendingCount}</div>
            <div className="text-xs font-bold text-rose-800 mt-0.5">
              Walimu ambao hawajaingiza alama zozote bado
            </div>
          </div>
          <div className="text-[11px] font-semibold text-rose-700">
            Wanahitaji kikumbusho cha haraka
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#1f4d8b] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Walimu Wote ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Waliomaliza ({aggregateStats.completedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Wanaondelea ({aggregateStats.inProgressCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Hawajaanza ({aggregateStats.pendingCount})</span>
          </button>
        </div>

        {/* Right side controls: Class Filter & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-700 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">Madarasa Yote</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tafuta mwalimu au somo..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* TEACHERS PROGRESS LIST / CARDS */}
      <div className="space-y-3">
        {filteredTeachers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-xs">Hakuna walimu wanaolingana na vigezo vya utafutaji.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setClassFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              Ondoa vichujio vyote
            </button>
          </div>
        ) : (
          filteredTeachers.map(tp => {
            const isExpanded = !!expandedTeacherIds[tp.teacher.id];
            const isCompleted = tp.status === 'COMPLETED';
            const isInProgress = tp.status === 'IN_PROGRESS';
            const isPending = tp.status === 'PENDING';

            return (
              <div
                key={tp.teacher.id}
                className={`border rounded-2xl transition-all overflow-hidden ${
                  isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                    : isInProgress
                    ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Main Teacher Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Teacher Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                      style={{ backgroundColor: tp.teacher.color || '#1f4d8b' }}
                      className="w-11 h-11 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs"
                    >
                      {tp.teacher.initial || tp.teacher.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          Mwl. {tp.teacher.name}
                        </h4>
                        {tp.teacher.schoolRole && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                            {tp.teacher.schoolRole}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          {tp.assignedSubjectsCount} Masomo
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-slate-400" />
                          {tp.assignedClassesCount} Madarasa
                        </span>
                        {tp.teacher.phone && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            {tp.teacher.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress & Status Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 md:ml-auto">
                    {/* Progress Bar & Numerical Breakdown */}
                    <div className="space-y-1 min-w-[170px]">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">{tp.totalMarkedScores} / {tp.totalExpectedMarks} Wanafunzi</span>
                        <span className={
                          isCompleted ? 'text-emerald-700 font-black' :
                          isInProgress ? 'text-amber-700 font-black' : 'text-slate-500 font-black'
                        }>
                          {tp.overallPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${tp.overallPercentage}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-600' :
                            isInProgress ? 'bg-amber-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {isCompleted ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Amekamilisha 100%</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Anaendelea ({tp.overallPercentage}%)</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>Hajaanza (0%)</span>
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Copy Reminder Button for incomplete teachers */}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleCopyReminder(tp.teacher, tp)}
                          className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition cursor-pointer"
                          title="Nakili ujumbe wa kikumbusho (SMS/WhatsApp)"
                        >
                          {copiedTeacherId === tp.teacher.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Open in Mark Entry Button */}
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('markentry')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                          title="Fungua Mark Entry Ledger kwa mwalimu huyu"
                        >
                          <span>Ingiza</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() => toggleTeacherExpand(tp.teacher.id)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title={isExpanded ? 'Ficha masomo' : 'Tazama masomo na madarasa'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* EXPANDED SUBJECT-BY-SUBJECT BREAKDOWN ACCORDION */}
                {isExpanded && (
                  <div className="border-t border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Uchambuzi wa Masomo na Madarasa ya Mwalimu</span>
                      <span className="text-slate-400 text-[11px]">
                        Mtihani: {currentExam?.name || 'Mtihani'} • {selectedYear} {selectedTerm}
                      </span>
                    </div>

                    {tp.subjectsProgress.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        Hakuna masomo au madarasa yaliyopangwa kwa mwalimu huyu.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tp.subjectsProgress.map((sp, sIdx) => {
                          const isSubDone = sp.status === 'COMPLETED';
                          const isSubPartial = sp.status === 'IN_PROGRESS';

                          return (
                            <div
                              key={sIdx}
                              className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-blue-300 transition"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-slate-900 truncate">
                                  {sp.subject}
                                </span>
                                {isSubDone ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                    Tayari
                                  </span>
                                ) : isSubPartial ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                                    Inaendelea
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600">
                                    Haijazwa
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                  {sp.className} {sp.stream && sp.stream !== 'All' ? `• ${sp.stream}` : ''}
                                </span>
                                <span>{sp.markedStudents} / {sp.totalStudents} Wanafunzi</span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${sp.percentage}%` }}
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isSubDone ? 'bg-emerald-600' :
                                    isSubPartial ? 'bg-amber-500' : 'bg-slate-300'
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER NOTICE / SUMMARY */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Alama zikijazwa kwenye Mark Entry Ledger, takwimu hizi zinasasishwa mara moja (real-time).</span>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('results')}
            className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Tazama Matokeo Kamili na Ripoti</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
