import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  Check, 
  Calendar, 
  Clock, 
  UserCheck, 
  Shield, 
  GraduationCap, 
  Sparkles, 
  Search, 
  Filter, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Users,
  Grid,
  List,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { Exam, Student, SchoolInfo, ExamDocumentType } from '../../types';
import { ALL_SCHOOL_CLASSES } from '../../constants/defaults';
import { SubjectPaperConfigModal } from './SubjectPaperConfigModal';
import { ALL_SUBJECT_PAPER_DEFINITIONS, getPapersForSubject } from '../../utils/subjectPapers';

interface ExamDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  students: Student[];
  schoolInfo: SchoolInfo;
  initialExamId?: number | string;
  initialClass?: string;
  initialStream?: string;
}

export const ExamDocumentsModal: React.FC<ExamDocumentsModalProps> = ({
  isOpen,
  onClose,
  exams,
  students,
  schoolInfo,
  initialExamId,
  initialClass,
  initialStream
}) => {
  if (!isOpen) return null;

  // Selected Examination
  const [selectedExamId, setSelectedExamId] = useState<number | string>(() => {
    if (initialExamId && exams.some(e => e.id === initialExamId)) return initialExamId;
    return exams[0]?.id || 1;
  });

  const selectedExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || exams[0] || {
      id: 1,
      name: 'Midterm Examination',
      level: 'CSEE' as const,
      className: 'Form 1',
      date: new Date().toISOString().slice(0, 10),
      status: 'Active' as const
    };
  }, [exams, selectedExamId]);

  // Selected Class & Stream
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (initialClass) return initialClass;
    if (selectedExam && selectedExam.className && selectedExam.className !== 'All') return selectedExam.className;
    return 'Form 1';
  });

  const [selectedStream, setSelectedStream] = useState<string>(() => initialStream || 'All');
  const [documentType, setDocumentType] = useState<ExamDocumentType>('PHOTO_ENTRY');
  const [photoLayoutMode, setPhotoLayoutMode] = useState<'grid' | 'table'>('grid');
  const [subjectPaper, setSubjectPaper] = useState<string>('Physics Paper 1 (131/1)');
  const [roomNumber, setRoomNumber] = useState<string>('Room 1 / Hall A');
  const [examSessionTime, setExamSessionTime] = useState<string>('SESSION I (08:00 - 11:00)');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isPaperModalOpen, setIsPaperModalOpen] = useState<boolean>(false);

  // Collect available streams from registered students
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    ['A', 'B', 'C', 'D'].forEach(st => set.add(st));
    return Array.from(set).sort();
  }, [students]);

  // Filter candidates matching class, stream and search query
  const candidates = useMemo(() => {
    return students.filter(s => {
      const matchClass = !selectedClass || selectedClass === 'All' || s.className.toLowerCase() === selectedClass.toLowerCase();
      const matchStream = !selectedStream || selectedStream === 'All' || 
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStream.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStream.toUpperCase())
        ) : true);
      const matchSearch = !searchFilter.trim() || 
        s.name.toLowerCase().includes(searchFilter.trim().toLowerCase()) || 
        s.regNo.toLowerCase().includes(searchFilter.trim().toLowerCase());
      return matchClass && matchStream && matchSearch;
    }).sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
  }, [students, selectedClass, selectedStream, searchFilter]);

  // Statistics for candidates
  const totalCandidates = candidates.length;
  const maleCandidates = candidates.filter(c => c.gender === 'Male').length;
  const femaleCandidates = candidates.filter(c => c.gender === 'Female').length;

  // Candidates who didn't do any subject / absent
  const absentCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (!c.marks || Object.keys(c.marks).length === 0) return true;
      const valid = Object.values(c.marks).filter(v => typeof v === 'number' && !isNaN(v));
      return valid.length === 0;
    });
  }, [candidates]);

  const presentCount = totalCandidates - absentCandidates.length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filenamePrefix = `${schoolInfo.name.replace(/\s+/g, '_')}_${selectedExam.name.replace(/\s+/g, '_')}_${selectedClass}_${selectedStream}`;

    if (documentType === 'PHOTO_ENTRY') {
      headers = ['SEAT NO', 'REG NO', 'FULL NAME', 'SEX', 'CLASS', 'STREAM', 'VERIFICATION STATUS'];
      rows = candidates.map((c, i) => [
        `Desk #${i + 1}`,
        c.regNo,
        c.name,
        c.gender ? (c.gender === 'Female' ? 'F' : 'M') : '-',
        c.className,
        c.stream || 'A',
        'Verified'
      ]);
    } else if (documentType === 'ISAL') {
      headers = ['SEAT NO', 'REG NO', 'FULL NAME', 'SEX', 'BOOKLET SERIAL NO', 'SIGNATURE', 'STATUS', 'REMARKS'];
      rows = candidates.map((c, i) => [
        i + 1,
        c.regNo,
        c.name,
        c.gender ? (c.gender === 'Female' ? 'F' : 'M') : '-',
        '', // Booklet no
        '', // Signature
        absentCandidates.some(a => a.id === c.id) ? 'ABSENT' : 'PRESENT',
        ''
      ]);
    } else {
      // CAL
      headers = ['SUMMARY METRIC', 'COUNT', 'BOYS', 'GIRLS'];
      rows = [
        ['TOTAL REGISTERED', totalCandidates, maleCandidates, femaleCandidates],
        ['TOTAL PRESENT (SAT)', presentCount, maleCandidates - absentCandidates.filter(a => a.gender === 'Male').length, femaleCandidates - absentCandidates.filter(a => a.gender === 'Female').length],
        ['TOTAL ABSENT (NO SUBJECT)', absentCandidates.length, absentCandidates.filter(a => a.gender === 'Male').length, absentCandidates.filter(a => a.gender === 'Female').length]
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filenamePrefix}_${documentType}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #exam-document-printable-container, #exam-document-printable-container * {
            visibility: visible;
          }
          #exam-document-printable-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-amber-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide">
                  Official Examination Documents Generator
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded uppercase">
                  NECTA Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate and print Photo Entry Forms, ISAL, and CAL for each class and stream.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Document</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Download CSV register"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Selection & Filter Bar (Hidden in Print) */}
        <div className="no-print bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0 text-xs">
          {/* Top Document Types Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDocumentType('PHOTO_ENTRY')}
                className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  documentType === 'PHOTO_ENTRY'
                    ? 'bg-[#1f4d8b] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4 text-amber-300" />
                <span>1. PHOTO ENTRY FORM</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentType('ISAL')}
                className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  documentType === 'ISAL'
                    ? 'bg-[#1f4d8b] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>2. ISAL (Attendance List)</span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentType('CAL')}
                className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  documentType === 'CAL'
                    ? 'bg-[#1f4d8b] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Award className="w-4 h-4 text-purple-300" />
                <span>3. CAL (Absentee Ledger)</span>
              </button>
            </div>

            {documentType === 'PHOTO_ENTRY' && (
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPhotoLayoutMode('grid')}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    photoLayoutMode === 'grid' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Passport cards grid layout"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Card Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoLayoutMode('table')}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    photoLayoutMode === 'table' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tabular photo register layout"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table Register</span>
                </button>
              </div>
            )}
          </div>

          {/* Filters Row: Examination, Class, Stream, Subject Paper, Room */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Target Examination:
              </label>
              <select
                value={selectedExamId}
                onChange={e => {
                  const id = Number(e.target.value);
                  setSelectedExamId(id);
                  const exam = exams.find(x => x.id === id);
                  if (exam && exam.className && exam.className !== 'All') {
                    setSelectedClass(exam.className);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.className})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Class / Form:
              </label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Classes</option>
                {ALL_SCHOOL_CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Class Stream:
              </label>
              <select
                value={selectedStream}
                onChange={e => setSelectedStream(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Streams</option>
                {availableStreams.map(s => (
                  <option key={s} value={s}>Stream {s}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Subject Paper / Code:
                </label>
                <button
                  type="button"
                  onClick={() => setIsPaperModalOpen(true)}
                  className="text-[10px] font-extrabold text-blue-700 hover:text-blue-900 cursor-pointer underline flex items-center gap-0.5"
                >
                  <Layers className="w-3 h-3 text-amber-500" />
                  Papers Matrix
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="preset-subject-papers-list"
                  value={subjectPaper}
                  onChange={e => setSubjectPaper(e.target.value)}
                  placeholder="e.g. Physics Paper 1 (131/1)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <datalist id="preset-subject-papers-list">
                  {ALL_SUBJECT_PAPER_DEFINITIONS.flatMap(sub => 
                    sub.papers.map(p => (
                      <option 
                        key={`${sub.level}_${sub.code}_${p.paperNumber}`} 
                        value={`${sub.name} ${p.paperName} (${p.codeSuffix})`} 
                      />
                    ))
                  )}
                </datalist>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Room / Hall:
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                placeholder="e.g. Hall A / Room 2"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          <div 
            id="exam-document-printable-container"
            className="bg-white border-2 border-slate-900 rounded-lg p-6 sm:p-8 max-w-[950px] mx-auto shadow-lg text-slate-900 print:shadow-none print:border-none print:p-0 print:max-w-none text-xs"
          >
            {/* ============================================================== */}
            {/* OFFICIAL SCHOOL HEADER WITH BRANDING & CREST                   */}
            {/* ============================================================== */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                {/* School Logo */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-full border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {schoolInfo.logo ? (
                    <img src={schoolInfo.logo} alt={schoolInfo.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-[#1f4d8b] text-amber-400 rounded-full flex items-center justify-center font-black text-xl">
                      <GraduationCap className="w-9 h-9" />
                    </div>
                  )}
                </div>

                {/* School Information */}
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-wide leading-tight">
                      {schoolInfo.name || 'HabyEduPro3A'}
                    </h1>
                    {schoolInfo.schoolNumber && (
                      <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded uppercase font-mono">
                        CTR NO: {schoolInfo.schoolNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                    {schoolInfo.address || 'P.O. BOX 145, TANGA, TANZANIA'} • TEL: {schoolInfo.phone || '0717616343'} • EMAIL: {schoolInfo.email || 'info@school.ac.tz'}
                  </p>
                  <p className="text-[10px] italic text-slate-600 font-medium">
                    &ldquo;{schoolInfo.motto || 'Education for Self-Reliance & Academic Excellence'}&rdquo;
                  </p>
                </div>

                {/* National Coat of Arms / Official Stamp Placeholder */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 p-1 rounded-xl border border-slate-400 flex flex-col items-center justify-center text-center shrink-0">
                  <span className="text-lg">🇹🇿</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 leading-none">
                    Accredited Examination
                  </span>
                </div>
              </div>

              {/* Document Banner */}
              <div className="mt-3 text-center">
                <div className="inline-block bg-[#1f4d8b] text-white px-5 py-1 rounded text-xs font-black uppercase tracking-wider">
                  {documentType === 'PHOTO_ENTRY' && 'OFFICIAL CANDIDATE EXAMINATION PHOTO ENTRY FORM'}
                  {documentType === 'ISAL' && 'INVIGILATION STUDENT ATTENDANCE LIST (ISAL / FOMU YA MAHUDHURIO)'}
                  {documentType === 'CAL' && 'CANDIDATE ATTENDANCE & ABSENTEE LEDGER (CAL / ORODHA YA WATORO)'}
                </div>
                <div className="text-[11px] font-bold text-slate-700 mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <span><strong>EXAM:</strong> {selectedExam.name} ({selectedExam.date})</span>
                  <span><strong>CLASS:</strong> {selectedClass}</span>
                  <span><strong>STREAM:</strong> {selectedStream !== 'All' ? `STREAM ${selectedStream}` : 'ALL STREAMS'}</span>
                  <span><strong>SUBJECT:</strong> {subjectPaper}</span>
                  <span><strong>ROOM:</strong> {roomNumber}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar on Sheet */}
            <div className="bg-slate-50 border border-slate-300 rounded p-2.5 mb-4 grid grid-cols-4 gap-2 text-[11px] text-center font-bold">
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="text-slate-500 text-[9px] uppercase">Registered Candidates</div>
                <div className="text-sm font-black text-slate-900">{totalCandidates}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="text-slate-500 text-[9px] uppercase">Boys / Girls</div>
                <div className="text-sm font-black text-blue-700">M: {maleCandidates} • F: {femaleCandidates}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="text-slate-500 text-[9px] uppercase">Present / Sat</div>
                <div className="text-sm font-black text-emerald-700">{presentCount}</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-slate-200">
                <div className="text-slate-500 text-[9px] uppercase">Absent (0 Subjects)</div>
                <div className="text-sm font-black text-rose-700">{absentCandidates.length}</div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* DOCUMENT 1: PHOTO ENTRY FORM                                   */}
            {/* ============================================================== */}
            {documentType === 'PHOTO_ENTRY' && (
              <div>
                {photoLayoutMode === 'grid' ? (
                  /* Cards Grid: 3 or 4 cards per row */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {candidates.map((c, idx) => (
                      <div 
                        key={c.id} 
                        className="bg-white border-2 border-slate-800 rounded-lg p-2.5 flex flex-col items-center justify-between text-center shadow-xs page-break-inside-avoid relative"
                      >
                        {/* Seat Badge */}
                        <div className="absolute top-1 left-1 bg-slate-900 text-white font-mono text-[9px] font-black px-1.5 py-0.2 rounded">
                          #{idx + 1}
                        </div>

                        {/* Candidate Passport Photo */}
                        <div className="w-20 h-24 bg-slate-50 border-2 border-slate-900 rounded overflow-hidden flex flex-col items-center justify-center my-1 relative shadow-inner">
                          {c.passportPhoto ? (
                            <img src={c.passportPhoto} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                              <UserCheck className="w-8 h-8 text-slate-300 mb-0.5" />
                              <span className="text-[7px] font-black uppercase text-slate-400 leading-tight">
                                AFFIX PASSPORT PHOTO
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Candidate Particulars */}
                        <div className="w-full text-center space-y-0.5">
                          <div className="font-mono font-black text-blue-900 text-[11px] leading-tight truncate">
                            {c.regNo}
                          </div>
                          <div className="font-extrabold text-slate-900 text-[10px] uppercase leading-tight line-clamp-2 min-h-[22px]">
                            {c.name}
                          </div>
                          <div className="text-[9px] text-slate-600 font-bold">
                            {c.className} • {c.stream || 'STREAM A'} • {c.gender === 'Female' ? 'F' : 'M'}
                          </div>
                        </div>

                        {/* Signature & Verification Box */}
                        <div className="w-full mt-2 pt-1 border-t border-slate-300 text-[8px] text-slate-500 font-semibold space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Candidate Sign:</span>
                            <span className="border-b border-slate-800 w-16 h-3 inline-block"></span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-800 font-bold">
                            <span>Admitted: [ ]</span>
                            <span>Date: ___/___</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Table Register Layout */
                  <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[10px]">
                        <th className="p-2 border border-slate-900 text-center w-10">Desk</th>
                        <th className="p-2 border border-slate-900 text-center w-14">Photo</th>
                        <th className="p-2 border border-slate-900 w-28">Reg No</th>
                        <th className="p-2 border border-slate-900">Candidate Full Name</th>
                        <th className="p-2 border border-slate-900 text-center w-10">Sex</th>
                        <th className="p-2 border border-slate-900 text-center w-20">Class/Str</th>
                        <th className="p-2 border border-slate-900 text-center w-28">Candidate Signature</th>
                        <th className="p-2 border border-slate-900 text-center w-20">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {candidates.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="p-1 border border-slate-300 text-center">
                            <div className="w-10 h-12 bg-white border border-slate-800 rounded mx-auto overflow-hidden flex items-center justify-center">
                              {c.passportPhoto ? (
                                <img src={c.passportPhoto} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <UserCheck className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-bold text-blue-900">
                            {c.regNo}
                          </td>
                          <td className="p-2 border border-slate-300 font-extrabold text-slate-900 uppercase">
                            {c.name}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-bold">
                            {c.gender === 'Female' ? 'F' : 'M'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">
                            {c.className} {c.stream || 'A'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center">
                            <span className="border-b border-slate-800 w-24 h-4 inline-block"></span>
                          </td>
                          <td className="p-2 border border-slate-300 text-center text-[10px] font-bold text-emerald-800">
                            [ ] VERIFIED
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* DOCUMENT 2: ISAL (INVIGILATION ATTENDANCE LIST)                */}
            {/* ============================================================== */}
            {documentType === 'ISAL' && (
              <div>
                <p className="text-[10px] text-slate-600 mb-2 italic">
                  <strong>Instructions to Invigilators:</strong> Check candidate identity against their Photo Entry Form, verify registration number, record the exact Answer Booklet serial number handed to the candidate, and ensure the candidate signs in ink before receiving the exam question paper.
                </p>

                <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[10px]">
                      <th className="p-2 border border-slate-900 text-center w-10">Seat #</th>
                      <th className="p-2 border border-slate-900 w-28">Index / Reg No</th>
                      <th className="p-2 border border-slate-900">Candidate Full Name</th>
                      <th className="p-2 border border-slate-900 text-center w-10">Sex</th>
                      <th className="p-2 border border-slate-900 text-center w-36">Answer Booklet Serial No</th>
                      <th className="p-2 border border-slate-900 text-center w-32">Candidate Signature</th>
                      <th className="p-2 border border-slate-900 text-center w-24">Sitting Status</th>
                      <th className="p-2 border border-slate-900 text-center w-20">Invigilator Initial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {candidates.map((c, idx) => {
                      const isAbsent = absentCandidates.some(a => a.id === c.id);
                      return (
                        <tr key={c.id} className={isAbsent ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                          <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 border border-slate-300 font-mono font-extrabold text-blue-900">
                            {c.regNo}
                          </td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-900 uppercase">
                            {c.name}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-bold">
                            {c.gender === 'Female' ? 'F' : 'M'}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-semibold">
                            <span className="border-b border-dotted border-slate-700 w-28 inline-block h-4"></span>
                          </td>
                          <td className="p-2 border border-slate-300 text-center">
                            <span className="border-b border-slate-800 w-24 inline-block h-4"></span>
                          </td>
                          <td className="p-2 border border-slate-300 text-center">
                            {isAbsent ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[9px] border border-rose-300">
                                ABSENT (0 SUB)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                                PRESENT [✓]
                              </span>
                            )}
                          </td>
                          <td className="p-2 border border-slate-300 text-center">
                            <span className="border-b border-dotted border-slate-700 w-12 inline-block h-4"></span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ============================================================== */}
            {/* DOCUMENT 3: CAL (CANDIDATE ATTENDANCE & ABSENTEE LEDGER)       */}
            {/* ============================================================== */}
            {documentType === 'CAL' && (
              <div className="space-y-4">
                {/* Section A: Statistical Summary */}
                <div className="border border-slate-300 rounded p-3 bg-slate-50">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Section A: Executive Sittings & Attendance Summary
                  </h4>
                  <table className="w-full border-collapse border border-slate-400 text-center text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                        <th className="p-2 border border-slate-400">Category</th>
                        <th className="p-2 border border-slate-400">Male (Wavulana)</th>
                        <th className="p-2 border border-slate-400">Female (Wasichana)</th>
                        <th className="p-2 border border-slate-400">Total (Jumla)</th>
                        <th className="p-2 border border-slate-400">Percentage %</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border border-slate-300 font-bold text-left">Total Candidates Registered</td>
                        <td className="p-2 border border-slate-300 font-bold">{maleCandidates}</td>
                        <td className="p-2 border border-slate-300 font-bold">{femaleCandidates}</td>
                        <td className="p-2 border border-slate-300 font-black text-blue-900">{totalCandidates}</td>
                        <td className="p-2 border border-slate-300 font-bold">100.0%</td>
                      </tr>
                      <tr className="bg-emerald-50/60 font-semibold text-emerald-950">
                        <td className="p-2 border border-slate-300 font-bold text-left">Total Candidates Present (Sat Exam)</td>
                        <td className="p-2 border border-slate-300 font-bold">{maleCandidates - absentCandidates.filter(a => a.gender === 'Male').length}</td>
                        <td className="p-2 border border-slate-300 font-bold">{femaleCandidates - absentCandidates.filter(a => a.gender === 'Female').length}</td>
                        <td className="p-2 border border-slate-300 font-black text-emerald-800">{presentCount}</td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {totalCandidates > 0 ? ((presentCount / totalCandidates) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr className="bg-rose-50/60 font-semibold text-rose-950">
                        <td className="p-2 border border-slate-300 font-bold text-left">Total Absent / Didn&apos;t Do Any Subject (Watoro)</td>
                        <td className="p-2 border border-slate-300 font-bold">{absentCandidates.filter(a => a.gender === 'Male').length}</td>
                        <td className="p-2 border border-slate-300 font-bold">{absentCandidates.filter(a => a.gender === 'Female').length}</td>
                        <td className="p-2 border border-slate-300 font-black text-rose-800">{absentCandidates.length}</td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {totalCandidates > 0 ? ((absentCandidates.length / totalCandidates) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section B: Answer Booklets Reconciliation */}
                <div className="border border-slate-300 rounded p-3 bg-white">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-2">
                    Section B: Answer Booklets / Scripts Reconciliation
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 border border-slate-200 rounded bg-slate-50">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Booklets Received:</span>
                      <span className="font-black text-slate-800 text-sm">{totalCandidates + 5}</span>
                    </div>
                    <div className="p-2 border border-slate-200 rounded bg-slate-50">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Used by Candidates:</span>
                      <span className="font-black text-emerald-700 text-sm">{presentCount}</span>
                    </div>
                    <div className="p-2 border border-slate-200 rounded bg-slate-50">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Spoiled / Cancelled:</span>
                      <span className="font-black text-amber-700 text-sm">0</span>
                    </div>
                    <div className="p-2 border border-slate-200 rounded bg-slate-50">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">Blank Returned to Safe:</span>
                      <span className="font-black text-blue-700 text-sm">{(totalCandidates + 5) - presentCount}</span>
                    </div>
                  </div>
                </div>

                {/* Section C: Detailed Register of Absent Candidates */}
                <div className="border border-slate-300 rounded p-3 bg-white">
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-2 flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Section C: List of Candidates Who Didn&apos;t Do Any Subject (Watoro wa Mtihani)
                  </h4>
                  {absentCandidates.length === 0 ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold text-center text-xs">
                      100% Attendance: Zero candidates absent. All {totalCandidates} registered candidates sat for the examination!
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                          <th className="p-1.5 border border-slate-300 text-center w-10">#</th>
                          <th className="p-1.5 border border-slate-300 w-32">Reg / Index No</th>
                          <th className="p-1.5 border border-slate-300">Candidate Full Name</th>
                          <th className="p-1.5 border border-slate-300 text-center w-14">Sex</th>
                          <th className="p-1.5 border border-slate-300">Class & Stream</th>
                          <th className="p-1.5 border border-slate-300">Reason / Remarks Recorded by Supervisor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {absentCandidates.map((c, i) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-1.5 border border-slate-300 text-center font-bold">{i + 1}</td>
                            <td className="p-1.5 border border-slate-300 font-mono font-bold text-rose-800">{c.regNo}</td>
                            <td className="p-1.5 border border-slate-300 font-bold text-slate-900">{c.name}</td>
                            <td className="p-1.5 border border-slate-300 text-center">{c.gender === 'Female' ? 'F' : 'M'}</td>
                            <td className="p-1.5 border border-slate-300">{c.className} - {c.stream || 'A'}</td>
                            <td className="p-1.5 border border-slate-300 italic text-slate-500">
                              Did not sit any subject / Absent without notice
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* OFFICIAL CERTIFICATION & SIGNATURES FOOTER                     */}
            {/* ============================================================== */}
            <div className="mt-6 pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-[10px]">
              <div>
                <span className="font-bold text-slate-700 block uppercase mb-1">Chief Room Invigilator:</span>
                <div className="border-b border-slate-800 pb-1 mb-1">
                  Name: <span className="font-bold">___________________________</span>
                </div>
                <div className="flex justify-between">
                  <span>Sign: _________________</span>
                  <span>Date: ____/____/2026</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block uppercase mb-1">School Examination Officer:</span>
                <div className="border-b border-slate-800 pb-1 mb-1">
                  Name: <span className="font-bold">___________________________</span>
                </div>
                <div className="flex justify-between">
                  <span>Sign: _________________</span>
                  <span>Date: ____/____/2026</span>
                </div>
              </div>

              <div className="border border-dashed border-slate-400 p-2 rounded text-center flex flex-col items-center justify-center">
                <span className="font-bold uppercase text-[9px] text-slate-400">
                  OFFICIAL SCHOOL RUBBER STAMP
                </span>
                <span className="text-[8px] text-slate-400 mt-2">
                  (Mhuri Rasmi wa Shule)
                </span>
              </div>
            </div>

            {/* Document Verification Code */}
            <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500 font-mono">
              <span>DOC REF: {schoolInfo.schoolNumber || 'S.0123'}-{documentType}-{selectedExam.name.replace(/\s+/g, '')}-{selectedClass.replace(/\s+/g, '')}</span>
              <span>GENERATED BY HABY EDU PRO ACADEMIC SUITE • VERIFIED SYSTEM RECORD</span>
              <span>DATE ISSUED: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>
      </div>

      <SubjectPaperConfigModal
        isOpen={isPaperModalOpen}
        onClose={() => setIsPaperModalOpen(false)}
        onSelectPaperForDoc={(subjectName, paper, level) => {
          setSubjectPaper(`${subjectName} ${paper.paperName} (${paper.codeSuffix})`);
        }}
      />
    </div>
  );
};
