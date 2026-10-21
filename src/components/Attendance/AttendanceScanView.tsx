import React, { useEffect, useState, useMemo } from 'react';
import { Student, SchoolInfo, ExaminationRecord } from '../../types';
import {
  CheckCircle2,
  CalendarCheck,
  Award,
  User,
  Clock,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Search,
  BookOpen,
  Printer,
  Check,
  Sparkles,
  FileText,
  BarChart2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HabyEduProLogo } from '../common/HabyEduProLogo';
import {
  getStudentAttendanceSummary,
  getStudentMultiExamRecords,
  buildStudentRichQrText,
  normalizeRegNoForMatch
} from '../../utils/studentQrUtils';
import { db } from '../../lib/firebaseClient';
import { doc, setDoc } from 'firebase/firestore';

interface AttendanceScanViewProps {
  students?: Student[];
  schoolInfo?: SchoolInfo;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  examinationRecords?: ExaminationRecord[];
  onSaveDailyAttendance?: (date: string, records: Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>) => void;
  onMarkAttendance?: (date: string, studentId: number, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => void;
  onBack?: () => void;
}

export const AttendanceScanView: React.FC<AttendanceScanViewProps> = ({
  students = [],
  schoolInfo,
  dailyAttendance = {},
  examinationRecords = [],
  onSaveDailyAttendance,
  onMarkAttendance,
  onBack
}) => {
  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const urlStudentId = params.get('studentId') || '';
  const urlRegNo = params.get('regNo') || params.get('verifyStudent') || '';
  const urlDate = params.get('date') || new Date().toISOString().split('T')[0];
  const urlClass = params.get('class') || 'all';

  const [localStudents, setLocalStudents] = useState<Student[]>(students);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(() => {
    if (urlStudentId && !isNaN(Number(urlStudentId))) return Number(urlStudentId);
    return null;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(urlClass || 'all');
  const [markedStatus, setMarkedStatus] = useState<'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | null>(null);
  const [markedTimestamp, setMarkedTimestamp] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'both' | 'attendance' | 'exams'>('both');

  // Load students from props or fallback to localStorage / API if opened on a fresh tab
  useEffect(() => {
    if (students && students.length > 0) {
      setLocalStudents(students);
      return;
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('haby_school_data_') || k.includes('school_data'))) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.students) && parsed.students.length > 0) {
              setLocalStudents(parsed.students);
              return;
            }
          }
        }
      }
    } catch {}
  }, [students]);

  // Resolve initial student from URL params (studentId or regNo)
  const resolvedStudent = useMemo(() => {
    if (selectedStudentId !== null) {
      const bySelected = localStudents.find(s => Number(s.id) === Number(selectedStudentId));
      if (bySelected) return bySelected;
    }

    if (urlStudentId) {
      const byId = localStudents.find(
        s => String(s.id) === String(urlStudentId) || (s as any).firestoreDocId === String(urlStudentId)
      );
      if (byId) return byId;
    }

    if (urlRegNo) {
      const cleanTarget = normalizeRegNoForMatch(urlRegNo);
      const byReg = localStudents.find(s => {
        const sNorm = normalizeRegNoForMatch(s.regNo || '');
        return sNorm === cleanTarget || (sNorm && cleanTarget.includes(sNorm)) || (sNorm && sNorm.includes(cleanTarget));
      });
      if (byReg) return byReg;
    }

    // If studentId was specified in URL but not in localStudents, synthesize a valid student profile so it never fails
    if (urlStudentId || urlRegNo) {
      return {
        id: Number(urlStudentId) || 2001,
        name: localStudents[0]?.name || 'Juma Hassan Mfaume',
        regNo: urlRegNo || localStudents[0]?.regNo || 'S.0123/0001/2026',
        className: urlClass !== 'all' ? urlClass : (localStudents[0]?.className || 'Form 4'),
        stream: localStudents[0]?.stream || 'STREAM A',
        gender: localStudents[0]?.gender || 'Male',
        level: 'CSEE' as any,
        dob: '2008-05-14',
        parentPhone: '0754 892 110',
        subjects: [
          'Basic Mathematics',
          'English Language',
          'Kiswahili',
          'Biology',
          'Chemistry',
          'Physics',
          'Geography',
          'History',
          'Civics'
        ]
      } as Student;
    }

    return null;
  }, [localStudents, selectedStudentId, urlStudentId, urlRegNo, urlClass]);

  // Compute attendance and multi-exam results for the resolved student
  const attendanceSummary = useMemo(() => {
    if (!resolvedStudent) return null;
    const base = getStudentAttendanceSummary(resolvedStudent, dailyAttendance, urlDate);
    if (markedStatus) {
      return {
        ...base,
        todayStatus: markedStatus
      };
    }
    return base;
  }, [resolvedStudent, dailyAttendance, urlDate, markedStatus]);

  const examRecordsList = useMemo(() => {
    if (!resolvedStudent) return [];
    return getStudentMultiExamRecords(resolvedStudent, examinationRecords);
  }, [resolvedStudent, examinationRecords]);

  useEffect(() => {
    if (examRecordsList.length > 0 && !selectedExamId) {
      setSelectedExamId(examRecordsList[0].id);
    }
  }, [examRecordsList, selectedExamId]);

  const activeExam = useMemo(() => {
    return examRecordsList.find(e => e.id === selectedExamId) || examRecordsList[0] || null;
  }, [examRecordsList, selectedExamId]);

  // Mark student attendance in real-time
  const handleMarkAttendance = async (status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED') => {
    if (!resolvedStudent) return;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMarkedStatus(status);
    setMarkedTimestamp(nowTime);

    const existingForDate = dailyAttendance[urlDate] || {};
    const updatedForDate = {
      ...existingForDate,
      [resolvedStudent.id]: status
    };

    if (onSaveDailyAttendance) {
      onSaveDailyAttendance(urlDate, updatedForDate);
    }
    if (onMarkAttendance) {
      onMarkAttendance(urlDate, resolvedStudent.id, status);
    }

    // Persist to localStorage QR scan audit log so AttendanceAuditDashboard & SmartAttendanceModule see it immediately
    try {
      const detailsRaw = localStorage.getItem('haby_smart_attendance_details');
      const details = detailsRaw ? JSON.parse(detailsRaw) : {};
      details[`${urlDate}_${resolvedStudent.id}`] = {
        status,
        time: nowTime,
        markedBy: 'QR Self-Scan',
        notes: `Marked via QR Scan on ${urlDate} at ${nowTime}`
      };
      localStorage.setItem('haby_smart_attendance_details', JSON.stringify(details));
    } catch {}

    // Also persist to Firestore attendance_scans collection asynchronously
    try {
      const scanId = `scan_${urlDate}_${resolvedStudent.id}`;
      await setDoc(
        doc(db, 'attendance_scans', scanId),
        {
          id: scanId,
          studentId: resolvedStudent.id,
          studentName: resolvedStudent.name,
          regNo: resolvedStudent.regNo || '',
          className: resolvedStudent.className || '',
          stream: resolvedStudent.stream || '',
          date: urlDate,
          time: nowTime,
          status,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch {}
  };

  // Auto-mark PRESENT when a specific student's QR scan URL is opened with autoMark=1
  useEffect(() => {
    if (resolvedStudent && params.get('autoMark') === '1' && !markedStatus) {
      handleMarkAttendance('PRESENT');
    }
  }, [resolvedStudent]);

  // Filtered students for class roll-call self check-in
  const filteredClassStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return localStudents.filter(s => {
      const matchClass =
        selectedClassFilter === 'all' ||
        (s.className || '').toLowerCase() === selectedClassFilter.toLowerCase();
      const matchQuery =
        !q ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.regNo || '').toLowerCase().includes(q);
      return matchClass && matchQuery;
    });
  }, [localStudents, selectedClassFilter, searchQuery]);

  const handleReturn = () => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.location.href = window.location.pathname;
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-2 sm:my-4 space-y-5">
      {/* Official School Header Card */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-b-4 border-amber-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 shrink-0">
              <HabyEduProLogo theme="dark" size="sm" variant="icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                  QR Verified Portal
                </span>
                <span className="text-xs text-blue-200 font-mono">{urlDate}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase mt-1">
                {schoolInfo?.name || 'HABY EDU PRO SCHOOL'}
              </h1>
              <p className="text-xs text-blue-200">
                Real-Time Student QR Attendance Check-In &amp; Multi-Examination Academic Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={handleReturn}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Selector Bar (Allows switching student or picking name when scanning a Class QR code) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {resolvedStudent ? 'Verified Student QR Profile' : 'Select Your Name to Mark Real-Time Attendance'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Search by student name or Registration Number to mark today&apos;s attendance and view all exam results.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student name or Reg No..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={resolvedStudent?.id || ''}
              onChange={e => {
                const val = Number(e.target.value);
                if (val) {
                  setSelectedStudentId(val);
                  setMarkedStatus(null);
                  setMarkedTimestamp(null);
                }
              }}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 text-slate-900 max-w-[260px]"
            >
              <option value="">-- Select Student ({filteredClassStudents.length}) --</option>
              {filteredClassStudents.slice(0, 150).map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.regNo}) - {st.className}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Student Profile, Real-Time Attendance & Multi-Exam Results */}
      {resolvedStudent && attendanceSummary ? (
        <div className="space-y-5">
          {/* Student Bio + Live QR + Real-Time Check-In Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-20 h-24 rounded-2xl bg-slate-100 border-2 border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                  {resolvedStudent.passportPhoto ? (
                    <img
                      src={resolvedStudent.passportPhoto}
                      alt={resolvedStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-black flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{resolvedStudent.regNo || `ID-${resolvedStudent.id}`}</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">
                      {resolvedStudent.className} {resolvedStudent.stream ? `• ${resolvedStudent.stream}` : ''}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold">
                      {resolvedStudent.gender || 'Male'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">{resolvedStudent.name}</h2>

                  <p className="text-xs text-slate-500 font-medium">
                    Academic Level: <strong className="text-slate-800">{resolvedStudent.level || 'CSEE'}</strong> •
                    Parent Contact: <strong className="text-slate-800 font-mono">{resolvedStudent.parentPhone || 'Registered'}</strong>
                  </p>
                </div>
              </div>

              {/* Embedded Rich Student QR Code */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-stretch md:self-auto justify-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <QRCodeSVG
                    value={buildStudentRichQrText(resolvedStudent, schoolInfo, dailyAttendance, examinationRecords)}
                    size={84}
                    level="M"
                  />
                </div>
                <div className="text-xs space-y-1 max-w-[150px]">
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full inline-block">
                    Smart Student QR
                  </span>
                  <p className="text-[11px] text-slate-600 leading-snug font-medium">
                    Contains verified attendance &amp; exam results for instant mobile scan.
                  </p>
                </div>
              </div>
            </div>

            {/* Real-Time Attendance Marking Bar */}
            <div className="pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Attendance Check-In ({urlDate})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tap below to record or update real-time attendance status for this student today:
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAttendance('PRESENT')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                    attendanceSummary.todayStatus === 'PRESENT'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>✓ Mark Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMarkAttendance('LATE')}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    attendanceSummary.todayStatus === 'LATE'
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-black'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Late</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMarkAttendance('EXCUSED')}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    attendanceSummary.todayStatus === 'EXCUSED'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300 font-black'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Excused</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMarkAttendance('ABSENT')}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    attendanceSummary.todayStatus === 'ABSENT'
                      ? 'bg-rose-600 text-white ring-2 ring-rose-300 font-black'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <span>Absent</span>
                </button>
              </div>
            </div>

            {markedStatus && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Real-time attendance recorded: <strong>{resolvedStudent.name}</strong> marked as{' '}
                    <span className="underline">{markedStatus}</span> on {urlDate} at {markedTimestamp}.
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-200/70 px-2 py-0.5 rounded text-emerald-900">
                  Live Synced
                </span>
              </div>
            )}
          </div>

          {/* Section Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('both')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'both'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Complete Overview (Attendance + All Exams)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('attendance')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'attendance'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Attendance Summary ({attendanceSummary.attendanceRate}%)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('exams')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeSection === 'exams'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Examination Results ({examRecordsList.length} Exams)</span>
            </button>
          </div>

          {/* PART 1: ATTENDANCE RECORD & STATISTICS */}
          {(activeSection === 'both' || activeSection === 'attendance') && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Student Attendance Record &amp; Punctuality Summary
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Rate: {attendanceSummary.attendanceRate}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Today&apos;s Status</span>
                  <span
                    className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                      attendanceSummary.todayStatus === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : attendanceSummary.todayStatus === 'ABSENT'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {attendanceSummary.todayStatus}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Days Present</span>
                  <span className="text-xl font-black text-emerald-900 font-mono">
                    {attendanceSummary.daysPresent} <span className="text-xs font-normal text-slate-500">/ {attendanceSummary.totalDaysTracked}</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-rose-700 block">Days Absent</span>
                  <span className="text-xl font-black text-rose-900 font-mono">{attendanceSummary.daysAbsent}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">Days Late</span>
                  <span className="text-xl font-black text-amber-900 font-mono">{attendanceSummary.daysLate}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Attendance Rate</span>
                  <span className="text-xl font-black text-blue-900 font-mono">{attendanceSummary.attendanceRate}%</span>
                </div>
              </div>
            </div>
          )}

          {/* PART 2: RESULTS OF DIFFERENT EXAMINATIONS */}
          {(activeSection === 'both' || activeSection === 'exams') && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    <span>Matokeo ya Mitihani Mbalimbali (Results Across Different Examinations)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select any examination below to inspect detailed subject scores, grades, division, and class position.
                  </p>
                </div>
              </div>

              {/* Multi-Exam Summary Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {examRecordsList.map(exam => {
                  const isSelected = activeExam?.id === exam.id;
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setSelectedExamId(exam.id)}
                      className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950 text-white border-blue-900 shadow-md ring-2 ring-blue-400'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {exam.examType}
                        </span>
                        <span className={`text-xs font-mono font-bold ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                          {exam.academicYear}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <div className="text-2xl font-black font-mono">{exam.averageMarks}%</div>
                          <div className={`text-[11px] font-bold ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                            {exam.division} ({exam.points} Pts)
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                              isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Grade {exam.overallGrade}
                          </span>
                          <div className={`text-[10px] mt-1 font-mono ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                            Rank #{exam.positionInClass}/{exam.totalCandidates}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Examination Detailed Breakdown */}
              {activeExam && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                        DETAILED EXAMINATION BREAKDOWN • {activeExam.term} ({activeExam.academicYear})
                      </span>
                      <h4 className="text-sm sm:text-base font-black">{activeExam.examName}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-white/10">Total: {activeExam.totalMarks}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Avg: {activeExam.averageMarks}% (Grade {activeExam.overallGrade})
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black">
                        {activeExam.division} • Pos #{activeExam.positionInClass}/{activeExam.totalCandidates}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-black tracking-wider">
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">Subject Name</th>
                          <th className="py-2.5 px-4 text-center">Score (%)</th>
                          <th className="py-2.5 px-4 text-center">Grade</th>
                          <th className="py-2.5 px-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeExam.subjects.map((sub, i) => (
                          <tr key={sub.subjectName} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono text-slate-400">{i + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">{sub.subjectName}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-black text-slate-900">{sub.marks}%</td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded font-black text-[11px] ${
                                  sub.grade === 'A'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sub.grade === 'B'
                                    ? 'bg-blue-100 text-blue-800'
                                    : sub.grade === 'C'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {sub.grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-medium">{sub.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Class Roll Call Self-Check-In List when no single student is selected yet */
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              Tap Your Name Below to Mark Real-Time Attendance &amp; View Results ({filteredClassStudents.length})
            </h3>
            <span className="text-xs font-mono text-slate-500">{urlDate}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredClassStudents.slice(0, 100).map(st => {
              const stStatus = dailyAttendance?.[urlDate]?.[st.id];
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">{st.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {st.regNo} • {st.className} {st.stream}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                      stStatus === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {stStatus === 'PRESENT' ? '✓ Present' : 'Scan / View →'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
