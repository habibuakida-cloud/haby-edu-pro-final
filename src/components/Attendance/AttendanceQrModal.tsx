import React, { useState, useMemo } from 'react';
import { Student, SchoolInfo, ExaminationRecord } from '../../types';
import {
  X,
  QrCode,
  CalendarCheck,
  Award,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  ExternalLink,
  User,
  Sparkles,
  Smartphone,
  Globe
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  buildStudentRichQrText,
  buildStudentScanPortalUrl,
  getStudentAttendanceSummary,
  getStudentMultiExamRecords,
  getPublicAppBaseUrl
} from '../../utils/studentQrUtils';

interface AttendanceQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student | null;
  selectedDate?: string;
  selectedClass?: string;
  schoolInfo?: SchoolInfo;
  dailyAttendance?: Record<string, Record<number, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>;
  examinationRecords?: ExaminationRecord[];
  onMarkStudentAttendance?: (studentId: number, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => void;
  onOpenScanView?: (student?: Student) => void;
}

export const AttendanceQrModal: React.FC<AttendanceQrModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent = null,
  selectedDate = new Date().toISOString().split('T')[0],
  selectedClass = 'Form 1',
  schoolInfo,
  dailyAttendance = {},
  examinationRecords = [],
  onMarkStudentAttendance,
  onOpenScanView
}) => {
  const [mode, setMode] = useState<'student' | 'class'>(initialStudent ? 'student' : 'student');
  const [qrPayloadFormat, setQrPayloadFormat] = useState<'rich_text' | 'web_url'>('rich_text');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(() => {
    return initialStudent?.id || students[0]?.id || 1;
  });
  const [copied, setCopied] = useState(false);
  const [justMarked, setJustMarked] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialStudent) {
      setSelectedStudentId(initialStudent.id);
      setMode('student');
    }
  }, [initialStudent]);

  const activeStudent = useMemo(() => {
    return (
      students.find(s => s.id === selectedStudentId) ||
      initialStudent ||
      students[0] ||
      null
    );
  }, [students, selectedStudentId, initialStudent]);

  const attendanceSummary = useMemo(() => {
    if (!activeStudent) return null;
    return getStudentAttendanceSummary(activeStudent, dailyAttendance, selectedDate);
  }, [activeStudent, dailyAttendance, selectedDate]);

  const multiExamRecords = useMemo(() => {
    if (!activeStudent) return [];
    return getStudentMultiExamRecords(activeStudent, examinationRecords);
  }, [activeStudent, examinationRecords]);

  if (!isOpen) return null;

  const studentRichTextPayload = activeStudent
    ? buildStudentRichQrText(activeStudent, schoolInfo, dailyAttendance, examinationRecords)
    : '';

  const studentWebUrlPayload = activeStudent
    ? `${buildStudentScanPortalUrl(activeStudent, selectedDate)}&autoMark=1`
    : '';

  const classRollCallPayload = `${getPublicAppBaseUrl()}?view=attendance-scan&date=${encodeURIComponent(
    selectedDate
  )}&class=${encodeURIComponent(selectedClass)}`;

  const currentQrValue =
    mode === 'class'
      ? classRollCallPayload
      : qrPayloadFormat === 'rich_text'
      ? studentRichTextPayload
      : studentWebUrlPayload;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentQrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleQuickMark = (status: 'PRESENT' | 'LATE' | 'EXCUSED') => {
    if (!activeStudent) return;
    if (onMarkStudentAttendance) {
      onMarkStudentAttendance(activeStudent.id, status);
    }
    setJustMarked(status);
    setTimeout(() => setJustMarked(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Smart Student QR Code &amp; Real-Time Attendance
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Scan to mark real-time attendance &amp; view student attendance + multi-examination results.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Bar */}
        <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('student')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                mode === 'student'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Student QR (Attendance + Exam Results)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('class')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                mode === 'class'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Class Roll-Call QR ({selectedClass})</span>
            </button>
          </div>

          {mode === 'student' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Student:</span>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 max-w-[230px]"
              >
                {students.slice(0, 150).map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.regNo})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 bg-slate-50">
          {mode === 'student' && activeStudent && attendanceSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Left Column: Scannable QR Code Card */}
              <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col items-center text-center space-y-3">
                <div className="w-full flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setQrPayloadFormat('rich_text')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                      qrPayloadFormat === 'rich_text'
                        ? 'bg-white text-purple-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Works offline on any phone camera - displays full attendance & exam report directly"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                    <span>Direct Phone Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrPayloadFormat('web_url')}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                      qrPayloadFormat === 'web_url'
                        ? 'bg-white text-blue-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Encodes the interactive web portal check-in URL"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Web Portal Link</span>
                  </button>
                </div>

                <div className="p-3 bg-white border-2 border-purple-200 rounded-2xl shadow-sm">
                  <QRCodeSVG value={currentQrValue} size={200} level="M" includeMargin />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900">{activeStudent.name}</h3>
                  <p className="text-xs font-mono font-bold text-purple-700">
                    {activeStudent.regNo} • {activeStudent.className} {activeStudent.stream}
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {qrPayloadFormat === 'rich_text'
                    ? 'When scanned with any phone camera, immediately shows student details, attendance rate, and results of different examinations.'
                    : 'Scan or open link to launch interactive real-time attendance check-in and academic results portal.'}
                </p>

                {/* Quick Real-Time Attendance Mark Buttons */}
                <div className="w-full pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Instant Real-Time Attendance ({selectedDate})
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickMark('PRESENT')}
                      className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition"
                    >
                      ✓ Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMark('LATE')}
                      className="py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer transition"
                    >
                      🕒 Late
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMark('EXCUSED')}
                      className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer transition"
                    >
                      Excused
                    </button>
                  </div>
                  {justMarked && (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-2">
                      ✓ Marked as {justMarked} in real-time!
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Encoded Student Info, Attendance & Multi-Exam Results Preview */}
              <div className="md:col-span-7 space-y-4">
                {/* Attendance Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <CalendarCheck className="w-4 h-4 text-emerald-600" />
                      <span>Attendance Record Included in QR</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                      {attendanceSummary.attendanceRate}% Attendance
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Today</span>
                      <span className="font-black text-emerald-700">{attendanceSummary.todayStatus}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold block">Present</span>
                      <span className="font-black text-emerald-900 font-mono">{attendanceSummary.daysPresent}d</span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] text-rose-700 font-bold block">Absent</span>
                      <span className="font-black text-rose-900 font-mono">{attendanceSummary.daysAbsent}d</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 font-bold block">Late</span>
                      <span className="font-black text-amber-900 font-mono">{attendanceSummary.daysLate}d</span>
                    </div>
                  </div>
                </div>

                {/* Examination Results Across Different Examinations */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-blue-600" />
                      <span>Results of Different Examinations Included in QR</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {multiExamRecords.length} Exams Verified
                    </span>
                  </div>

                  <div className="space-y-2">
                    {multiExamRecords.map(ex => (
                      <div
                        key={ex.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-black text-slate-900">{ex.examName}</span>
                            <span className="block text-[10px] text-slate-500 font-medium">
                              {ex.term} • Academic Year {ex.academicYear} • Position #{ex.positionInClass}/{ex.totalCandidates}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-black text-xs">
                              Avg: {ex.averageMarks}% (Grade {ex.overallGrade})
                            </span>
                            <span className="block text-[10px] font-black text-emerald-700 mt-0.5">
                              {ex.division} ({ex.points} Pts)
                            </span>
                          </div>
                        </div>

                        {/* Top Subject Badges */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {ex.subjects.slice(0, 6).map(sub => (
                            <span
                              key={sub.subjectName}
                              className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700"
                            >
                              {sub.subjectName.substring(0, 4)}: <strong>{sub.marks}% ({sub.grade})</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Class Roll Call QR Mode */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4">
              <div className="inline-block p-4 bg-white border-2 border-blue-200 rounded-3xl shadow-md">
                <QRCodeSVG value={classRollCallPayload} size={220} level="M" includeMargin />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Class Real-Time Attendance QR • {selectedClass}
                </h3>
                <p className="text-xs text-slate-500">
                  Date: <strong className="font-mono text-slate-800">{selectedDate}</strong> • Students can scan this code or open the check-in portal to mark attendance in real-time and inspect their examination results.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied QR Data!' : 'Copy QR Data / Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print QR Sheet</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenScanView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScanView(mode === 'student' ? activeStudent || undefined : undefined);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Full Scanned Student Page</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
