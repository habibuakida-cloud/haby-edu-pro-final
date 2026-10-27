import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  BookOpen, 
  Building2, 
  Calendar, 
  Clock, 
  Users, 
  Sparkles,
  Layers,
  Award,
  Download,
  Loader2,
  Grid,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SchoolInfo, Student } from '../../types';

export type BookletDocumentType = 'BOOKLET_NORMAL' | 'BOOKLET_GRAPH' | 'LOOSE_NORMAL' | 'LOOSE_GRAPH';

interface NectaAnswerSheetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolInfo: SchoolInfo;
  students?: Student[];
  selectedClass?: string;
}

// SVG Precision Cyan / Turquoise / Teal Blue Metric Millimeter Graph Paper Grid Component
const CyanGraphPaperSvg: React.FC = () => (
  <svg 
    className="w-full h-full absolute inset-0 pointer-events-none" 
    xmlns="http://www.w3.org/2000/svg" 
    width="100%" 
    height="100%"
  >
    <defs>
      {/* 1mm grid pattern */}
      <pattern id="grid-1mm" width="1mm" height="1mm" patternUnits="userSpaceOnUse">
        <path d="M 1mm 0 L 0 0 0 1mm" fill="none" stroke="rgba(0, 175, 190, 0.35)" strokeWidth="0.2" />
      </pattern>
      {/* 5mm grid pattern */}
      <pattern id="grid-5mm" width="5mm" height="5mm" patternUnits="userSpaceOnUse">
        <rect width="5mm" height="5mm" fill="url(#grid-1mm)" />
        <path d="M 5mm 0 L 0 0 0 5mm" fill="none" stroke="rgba(0, 150, 165, 0.65)" strokeWidth="0.4" />
      </pattern>
      {/* 10mm (1cm) grid pattern */}
      <pattern id="grid-10mm" width="10mm" height="10mm" patternUnits="userSpaceOnUse">
        <rect width="10mm" height="10mm" fill="url(#grid-5mm)" />
        <path d="M 10mm 0 L 0 0 0 10mm" fill="none" stroke="#007a87" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-10mm)" />
  </svg>
);

export const NectaAnswerSheetGeneratorModal: React.FC<NectaAnswerSheetGeneratorModalProps> = ({
  isOpen,
  onClose,
  schoolInfo,
  students = [],
  selectedClass = 'Form 4'
}) => {
  // Document Type State
  const [documentType, setDocumentType] = useState<BookletDocumentType>('BOOKLET_NORMAL');
  
  // Modal State Controls
  const [examLevel, setExamLevel] = useState<'CSEE' | 'ACSEE' | 'FTNA' | 'INTERNAL'>('CSEE');
  const [headerType, setHeaderType] = useState<'NECTA' | 'SCHOOL'>('NECTA');
  const [schoolNameOverride, setSchoolNameOverride] = useState<string>(
    schoolInfo?.name || 'KIOMONI SECONDARY SCHOOL'
  );
  const [centerCode, setCenterCode] = useState<string>(
    schoolInfo?.schoolNumber || 'S.0101'
  );
  const [examTitle, setExamTitle] = useState<string>(
    'FORM FOUR MOCK EXAMINATION 2026'
  );
  const [subjectCodeAndName, setSubjectCodeAndName] = useState<string>(
    '011 CIVICS'
  );
  const [examDate, setExamDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [examDuration, setExamDuration] = useState<string>('3:00 Hours');
  const [pageCount, setPageCount] = useState<number>(8); // 4, 8, 12, 16 pages
  const [graphPageCount, setGraphPageCount] = useState<number>(3); // Last N pages graph
  const [questionCount, setQuestionCount] = useState<number>(14); // Dynamic question count
  const [printMode, setPrintMode] = useState<'BLANK' | 'BULK_STUDENTS'>('BLANK');
  const [watermarkText, setWatermarkText] = useState<string>('OFFICIAL EXAMINATION BOOKLET');
  const [includeBarcode, setIncludeBarcode] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');

  if (!isOpen) return null;

  // Common NECTA Subjects quick selector options
  const nectaSubjects = [
    '011 CIVICS',
    '012 HISTORY',
    '013 GEOGRAPHY',
    '021 KISWAHILI',
    '022 ENGLISH LANGUAGE',
    '031 PHYSICS',
    '032 CHEMISTRY',
    '033 BIOLOGY',
    '041 BASIC MATHEMATICS',
    '042 ADDITIONAL MATHEMATICS',
    '061 COMMERCE',
    '062 BOOK-KEEPING',
    '014 BIBLE KNOWLEDGE',
    '015 ELIMU YA DINI YA ISLAM',
    '034 AGRICULTURAL SCIENCE',
    '036 COMPUTER STUDIES',
    '111 GENERAL STUDIES (ACSEE)',
    '112 BASIC APPLIED MATHEMATICS (ACSEE)'
  ];

  // Filter students by selected class if bulk print
  const targetStudents = students.filter(s => 
    !selectedClass || selectedClass === 'All' || s.className === selectedClass
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setPdfProgressText('Inaanza kuandaa kurasa...');
    try {
      const pageElements = document.querySelectorAll('.page-break');
      if (!pageElements || pageElements.length === 0) {
        window.print();
        setIsExportingPdf(false);
        setPdfProgressText('');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pageElements.length; i++) {
        setPdfProgressText(`Inatengeneza ukurasa ${i + 1} kati ya ${pageElements.length}...`);
        // Yield to the browser main thread to update UI state and render spinner
        await new Promise(r => setTimeout(r, 60));

        const pageEl = pageElements[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      setPdfProgressText('Inahifadhi faili...');
      await new Promise(r => setTimeout(r, 50));

      const safeSubject = subjectCodeAndName.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`NECTA_Answer_Sheet_${documentType}_${examLevel}_${safeSubject}_${centerCode}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      window.print();
    } finally {
      setIsExportingPdf(false);
      setPdfProgressText('');
    }
  };

  // Generate question rows array for Examiner Table
  const safeQuestionCount = Math.max(1, questionCount || 10);
  const questionNumbers = Array.from({ length: safeQuestionCount }, (_, i) => i + 1);

  // Helper to determine if a page is a Graph Page
  const isGraphPage = (pageNum: number, totalPages: number) => {
    if (documentType === 'LOOSE_GRAPH') return true;
    if (documentType === 'BOOKLET_GRAPH') {
      const graphStartIndex = totalPages - graphPageCount + 1;
      return pageNum >= graphStartIndex;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 no-print-bg">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-[#1e3a8a] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl font-black shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>NECTA Answer Sheet & Booklet Generator</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wide">
                  Official Standard
                </span>
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">
                Tengeneza vitabu vya kujibia mitihani, Loose Sheets, na Graph Papers za NECTA zenye mipaka mweusi na mistari 3 ya kugawa maeneo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-95 border border-emerald-500 disabled:opacity-50"
              title="Pakua Kama Faili la PDF (Download PDF Booklet)"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>{pdfProgressText || (isExportingPdf ? 'Inatengeneza PDF...' : 'Pakua PDF')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95 border border-amber-300"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Chapa (Print Booklet / Loose Sheet A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split into Settings Panel (Left) & A4 Live Preview (Right) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100">
          
          {/* Left Column: Form Controls & Customization */}
          <div className="lg:col-span-4 space-y-4 no-print">

            {/* Document Type Selector (Booklet Normal vs Booklet Graph vs Loose Sheet vs Loose Graph) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>1. Aina ya Karatasi (Document Type)</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentType('BOOKLET_NORMAL')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left transition cursor-pointer ${
                    documentType === 'BOOKLET_NORMAL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Booklet Normal</span>
                  </div>
                  <span className="text-[10px] font-normal block opacity-80">Kitabu cha Kawaida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocumentType('BOOKLET_GRAPH')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left transition cursor-pointer ${
                    documentType === 'BOOKLET_GRAPH'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Grid className="w-3.5 h-3.5" />
                    <span>Booklet Graph</span>
                  </div>
                  <span className="text-[10px] font-normal block opacity-80">Kitabu + Kurasa za Grafu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocumentType('LOOSE_NORMAL')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left transition cursor-pointer ${
                    documentType === 'LOOSE_NORMAL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Loose Sheet Normal</span>
                  </div>
                  <span className="text-[10px] font-normal block opacity-80">Karatasi ya Ziada (Foolscap)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocumentType('LOOSE_GRAPH')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-left transition cursor-pointer ${
                    documentType === 'LOOSE_GRAPH'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Grid className="w-3.5 h-3.5 text-amber-300" />
                    <span>Loose Sheet Graph</span>
                  </div>
                  <span className="text-[10px] font-normal block opacity-80">Karatasi Moja ya Grafu</span>
                </button>
              </div>
            </div>

            {/* School & Exam Details Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>2. Mipangilio ya Mtihani na Shule</span>
              </h3>

              {/* Format / Header Type */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Aina ya Kichwa cha Habari (Header Format):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHeaderType('NECTA')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      headerType === 'NECTA'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Rasmi cha NECTA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeaderType('SCHOOL')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      headerType === 'SCHOOL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Jina la Shule (Internal)</span>
                  </button>
                </div>
              </div>

              {/* Level Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Kiwango cha Mtihani (Exam Level):
                </label>
                <select
                  value={examLevel}
                  onChange={(e) => setExamLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="CSEE">CSEE - Kidato cha Nne (Form Four)</option>
                  <option value="ACSEE">ACSEE - Kidato cha Sitta (Form Six)</option>
                  <option value="FTNA">FTNA - Kidato cha Pili (Form Two)</option>
                  <option value="INTERNAL">Mtihani wa Shule (Form 1 - 6 Internal)</option>
                </select>
              </div>

              {/* School / Center Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Jina la Shule / Kituo (School/Center Name):
                </label>
                <input
                  type="text"
                  value={schoolNameOverride}
                  onChange={(e) => setSchoolNameOverride(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. KIOMONI SECONDARY SCHOOL"
                />
              </div>

              {/* Center Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Namba ya Kituo (Center Code Number):
                </label>
                <input
                  type="text"
                  value={centerCode}
                  onChange={(e) => setCenterCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. S.0101"
                />
              </div>

              {/* Exam Title */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Kichwa cha Mtihani (Exam Title):
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. FORM FOUR MOCK EXAMINATION 2026"
                />
              </div>

              {/* Subject Code & Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Somo na Namba ya Somo (Subject & Code):
                </label>
                <input
                  type="text"
                  value={subjectCodeAndName}
                  onChange={(e) => setSubjectCodeAndName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 mb-1.5"
                  placeholder="e.g. 011 CIVICS"
                />
                
                {/* Subject Quick Selector Pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400">Chagua Haraka:</span>
                  {nectaSubjects.slice(0, 6).map(sub => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubjectCodeAndName(sub)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-medium text-slate-700 transition cursor-pointer"
                    >
                      {sub.split(' ')[1] || sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Tarehe (Date):
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Muda (Duration):
                  </label>
                  <input
                    type="text"
                    value={examDuration}
                    onChange={(e) => setExamDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 3:00 Hours"
                  />
                </div>
              </div>
            </div>

            {/* Page Count, Dynamic Question Count & Booklet Configuration */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>3. Idadi ya Maswali & Kurasa</span>
              </h3>

              {/* Question Count Control (Fully Dynamic Input) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Idadi ya Maswali kwenye Mtihani (Total Questions):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 1)}
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-500">Maswali</span>
                </div>
                
                {/* Question Count Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                  {[5, 8, 10, 12, 14, 16, 20, 25].map(qNum => (
                    <button
                      key={qNum}
                      type="button"
                      onClick={() => setQuestionCount(qNum)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                        questionCount === qNum
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {qNum}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booklet Page Count (For Booklet Types) */}
              {(documentType === 'BOOKLET_NORMAL' || documentType === 'BOOKLET_GRAPH') && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Idadi ya Kurasa za Kitabu (Booklet Pages):
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[4, 8, 12, 16].map(pg => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setPageCount(pg)}
                        className={`py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                          pageCount === pg
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pg} Uk.
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Graph Page Count if Booklet Graph selected */}
              {documentType === 'BOOKLET_GRAPH' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Idadi ya Kurasa za Grafu Mwishoni:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(gpg => (
                      <button
                        key={gpg}
                        type="button"
                        onClick={() => setGraphPageCount(gpg)}
                        className={`py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                          graphPageCount === gpg
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {gpg} {gpg === 1 ? 'Ukurasa' : 'Kurasa'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loose Sheet Page Count */}
              {documentType === 'LOOSE_NORMAL' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Idadi ya Kurasa za Loose Sheet:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 4].map(pg => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setPageCount(pg)}
                        className={`py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                          pageCount === pg
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {pg} {pg === 1 ? 'Ukurasa' : 'Kurasa'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Print Mode: Blank vs Bulk Students */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Aina ya Kuchapa (Print Mode):
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="printMode"
                      checked={printMode === 'BLANK'}
                      onChange={() => setPrintMode('BLANK')}
                      className="accent-blue-600"
                    />
                    <span>Blank Sheet (Mwanafunzi ataandika namba yake)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="printMode"
                      checked={printMode === 'BULK_STUDENTS'}
                      onChange={() => setPrintMode('BULK_STUDENTS')}
                      className="accent-blue-600"
                    />
                    <span>Pre-printed Index Numbers ({targetStudents.length} wanafunzi wa {selectedClass})</span>
                  </label>
                </div>
              </div>

              {/* Extra Security Features */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
                  <span>Weka Barcode / QR Placeholder:</span>
                  <input
                    type="checkbox"
                    checked={includeBarcode}
                    onChange={(e) => setIncludeBarcode(e.target.checked)}
                    className="accent-blue-600"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Printable Booklet / Loose Sheet Preview */}
          <div className="lg:col-span-8 flex flex-col items-center justify-start">
            
            {/* Printable Area Wrapper */}
            <div className="w-full max-w-[210mm] bg-white shadow-2xl rounded-sm p-6 text-black border border-slate-300 print-area space-y-12">
              
              {/* IF BOOKLET: RENDER COVER PAGE (JALADA LA MBELE) */}
              {(documentType === 'BOOKLET_NORMAL' || documentType === 'BOOKLET_GRAPH') && (
                <div className="necta-cover-page min-h-[285mm] border-4 border-black p-6 flex flex-col justify-between relative bg-white page-break">
                  
                  {/* Watermark in background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none text-slate-900 font-black text-6xl tracking-widest -rotate-45 text-center">
                    {watermarkText}
                  </div>

                  {/* Top Emblem & Header Box */}
                  <div className="text-center space-y-2 relative z-10 border-b-2 border-black pb-3">
                    <div className="mx-auto w-14 h-14 border-2 border-black rounded-full flex items-center justify-center bg-slate-50 font-black text-[10px] text-center p-1 leading-tight">
                      NECTA EMBLEM
                    </div>

                    {headerType === 'NECTA' ? (
                      <>
                        <h1 className="text-lg font-black uppercase tracking-wider">
                          THE NATIONAL EXAMINATIONS COUNCIL OF TANZANIA
                        </h1>
                        <h2 className="text-sm font-bold uppercase tracking-wide">
                          BARAZA LA MITIHANI LA TANZANIA
                        </h2>
                      </>
                    ) : (
                      <>
                        <h1 className="text-lg font-black uppercase tracking-wider">
                          {schoolNameOverride}
                        </h1>
                        <h2 className="text-sm font-bold uppercase tracking-wide">
                          BARAZA LA MITIHANI LA SHULE
                        </h2>
                      </>
                    )}

                    <div className="py-1 px-3 bg-black text-white inline-block font-black text-xs tracking-widest uppercase my-0.5">
                      {examLevel === 'CSEE' && 'CERTIFICATE OF SECONDARY EDUCATION EXAMINATION (CSEE)'}
                      {examLevel === 'ACSEE' && 'ADVANCED CERTIFICATE OF SECONDARY EDUCATION EXAMINATION (ACSEE)'}
                      {examLevel === 'FTNA' && 'FORM TWO NATIONAL ASSESSMENT (FTNA)'}
                      {examLevel === 'INTERNAL' && 'INTERNAL EXAMINATION ANSWER BOOKLET'}
                    </div>

                    <h3 className="text-base font-black uppercase tracking-wide text-slate-900">
                      {examTitle}
                    </h3>

                    <div className="flex items-center justify-center gap-6 text-xs font-bold pt-1">
                      <span>CENTER NO: <strong className="underline">{centerCode}</strong></span>
                      <span>SUBJECT: <strong className="underline">{subjectCodeAndName}</strong></span>
                      <span>DATE: <strong className="underline">{examDate}</strong></span>
                      <span>DURATION: <strong className="underline">{examDuration}</strong></span>
                    </div>
                  </div>

                  {/* Candidate Examination Number Box Grid */}
                  <div className="my-2 border-2 border-black p-3 bg-slate-50/50 space-y-1.5 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs uppercase tracking-wide">
                        CANDIDATE'S EXAMINATION NUMBER / NAMBA YA MTAHINIWA:
                      </span>
                      {includeBarcode && (
                        <div className="font-mono text-[9px] border border-black px-2 py-0.5 bg-white">
                          ||| | |||| || | ||||| |||
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-700 italic">
                      Andika namba yako ya mtahiniwa katika visanduku vifuatavyo kulingana na kadi yako ya mtihani:
                    </p>

                    {/* Center Code & Candidate Number Boxes */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {/* Center Code Boxes */}
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs mr-1">S.</span>
                        {['0', '1', '0', '1'].map((char, idx) => (
                          <div key={idx} className="w-7 h-9 border-2 border-black flex items-center justify-center font-mono font-black text-base bg-white">
                            {printMode === 'BULK_STUDENTS' ? char : ''}
                          </div>
                        ))}
                      </div>

                      <span className="font-black text-lg px-1">/</span>

                      {/* Candidate Number Boxes */}
                      <div className="flex items-center gap-1">
                        {['0', '0', '1', '5'].map((char, idx) => (
                          <div key={idx} className="w-7 h-9 border-2 border-black flex items-center justify-center font-mono font-black text-base bg-white">
                            {printMode === 'BULK_STUDENTS' ? char : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* FOR EXAMINER'S USE ONLY (NO CHECKER INITIALS PER ROW; SINGLE CHECKER SIGNATURE AT BOTTOM) */}
                  <div className="my-2 space-y-1 relative z-10">
                    <div className="flex items-center justify-between border-b-2 border-black pb-1">
                      <span className="font-black text-xs uppercase tracking-wider">
                        FOR EXAMINER'S USE ONLY / KWA MATUMIZI YA MTAHINI TU
                      </span>
                      <span className="text-[10px] font-bold text-slate-700">
                        DO NOT WRITE IN MARGINS
                      </span>
                    </div>

                    <table className="w-full border-collapse border-2 border-black text-center text-xs">
                      <thead>
                        <tr className="bg-slate-200 border-b-2 border-black font-black text-[11px]">
                          <th className="border-r-2 border-black p-1.5 w-28">QUESTION NUMBER</th>
                          <th className="border-r-2 border-black p-1.5">MARKS OBTAINED</th>
                          <th className="p-1.5 w-36">EXAMINER'S INITIALS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questionNumbers.map(qNum => (
                          <tr key={qNum} className="border-b border-black">
                            <td className="border-r-2 border-black font-bold p-1 bg-slate-50">
                              Swali {qNum}
                            </td>
                            <td className="border-r-2 border-black p-1"></td>
                            <td className="p-1"></td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 font-black text-xs border-t-2 border-black">
                          <td className="border-r-2 border-black p-1.5 uppercase">TOTAL MARKS</td>
                          <td className="border-r-2 border-black p-1.5 font-mono text-sm">/ 100</td>
                          <td className="p-1.5 text-[10px]">SIGN: ..........</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Single Checker Verification Line */}
                    <div className="mt-1.5 border-2 border-black p-2 bg-slate-50 flex items-center justify-between text-xs font-bold">
                      <span>CHECKER'S NAME & INITIALS: ........................................................</span>
                      <span>SIGNATURE: ....................</span>
                      <span>DATE: ................</span>
                    </div>
                  </div>

                  {/* Candidate Instructions */}
                  <div className="mt-2 border-2 border-black p-2.5 text-[10px] leading-relaxed bg-slate-50/30 space-y-1 relative z-10">
                    <strong className="block font-black uppercase tracking-wider text-[11px] border-b border-black pb-0.5">
                      MAELEKEZO KWA MTAHINIWA (INSTRUCTIONS TO CANDIDATE):
                    </strong>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-900 font-medium">
                      <li>Andika Namba yako ya Mtahiniwa kwenye kila ukurasa juu kulia mahali palipotengwa.</li>
                      <li>Tumia kalamu ya wino mweusi au wa bluu tu. Usitumie penseli au wino mwekundu kujibia.</li>
                      <li>Andika namba ya swali vizuri kwenye safu wima ya kushoto (`QUESTION NO.`).</li>
                      <li>Nafasi ya kulia `EXAMINER ONLY` ni ya msahishaji tu; usiandike au kuweka alama yoyote hapo.</li>
                      <li>Epuka kuchana au kutoa kurasa zozote za kitabu hiki. Vitabu vyote lazima virudishwe.</li>
                    </ol>
                  </div>

                  {/* Bottom Barcode / Page 1 Footer */}
                  <div className="pt-2 flex items-center justify-between text-[10px] font-bold border-t border-black relative z-10">
                    <span>NECTA FORM CSEE/ACSEE BOOKLET - {pageCount} PAGES</span>
                    <span>UKURASA WA 1 WA {pageCount} (PAGE 1 OF {pageCount})</span>
                  </div>
                </div>
              )}

              {/* INNER PAGES (RULED 3-COLUMN OR GRAPH SHEET) */}
              {Array.from({ length: documentType.startsWith('LOOSE') ? pageCount : pageCount - 1 }, (_, i) => {
                const pageNum = documentType.startsWith('LOOSE') ? i + 1 : i + 2;
                const totalPages = pageCount;
                const isGraph = isGraphPage(pageNum, totalPages);

                return isGraph ? (
                  /* GRAPH PAPER PAGE (MILLIMETER GRID WITH BLACK BORDERS) */
                  <div 
                    key={pageNum}
                    className="necta-graph-page min-h-[285mm] border-2 border-black p-5 flex flex-col justify-between relative bg-white page-break space-y-3"
                  >
                    {/* Top Header Grid for Candidate Index Number & Subject */}
                    <div className="border-b-2 border-black pb-2 flex items-center justify-between gap-4 text-xs font-bold shrink-0">
                      <div className="flex items-center gap-2">
                        <span>EXAM NO:</span>
                        <div className="border-2 border-black px-3 py-1 font-mono font-black text-sm bg-slate-50 min-w-[120px]">
                          {printMode === 'BULK_STUDENTS' ? 'S.0101/0015' : 'S.____ / ____'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="bg-black text-white px-2 py-0.5 font-black uppercase text-[10px]">
                          GRAPH PAPER / KARATASI YA GRAFU
                        </span>
                        <span className="underline font-black">{subjectCodeAndName}</span>
                      </div>

                      <div className="text-right">
                        <span className="font-black border border-black px-2 py-0.5">
                          UK. {pageNum} / PAGE {pageNum}
                        </span>
                      </div>
                    </div>

                    {/* Precision Millimeter Graph Paper Grid Area */}
                    <div className="flex-1 border-2 border-black relative overflow-hidden bg-white min-h-[240mm]">
                      <CyanGraphPaperSvg />
                      <div className="absolute top-2 left-2 bg-white/90 border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider z-10">
                        FOR GRAPHICAL WORK / KWA KAZI YA CHATI NA GRAFU
                      </div>
                    </div>

                    {/* Footer Page Number */}
                    <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-black text-slate-800 shrink-0">
                      <span>NECTA OFFICIAL GRAPH SHEET</span>
                      <span>UKURASA WA {pageNum} / PAGE {pageNum} OF {totalPages}</span>
                    </div>
                  </div>
                ) : (
                  /* 3-COLUMN RULED ANSWER PAGE (BLACK BORDERS & BLACK LINES) */
                  <div 
                    key={pageNum}
                    className="necta-ruled-page min-h-[285mm] border-2 border-black p-5 flex flex-col justify-between relative bg-white page-break space-y-3"
                  >
                    {/* Top Header Grid for Candidate Index Number & Subject */}
                    <div className="border-b-2 border-black pb-2 flex items-center justify-between gap-4 text-xs font-bold shrink-0">
                      <div className="flex items-center gap-2">
                        <span>EXAM NO:</span>
                        <div className="border-2 border-black px-3 py-1 font-mono font-black text-sm bg-slate-50 min-w-[120px]">
                          {printMode === 'BULK_STUDENTS' ? 'S.0101/0015' : 'S.____ / ____'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span>SOMO / SUBJECT:</span>
                        <span className="underline font-black">{subjectCodeAndName}</span>
                      </div>

                      <div className="text-right">
                        <span className="font-black border border-black px-2 py-0.5">
                          UK. {pageNum} / PAGE {pageNum}
                        </span>
                      </div>
                    </div>

                    {/* 3-COLUMN RULED BODY WITH BLACK BORDERS & BLACK LINES */}
                    <div className="flex-1 relative border-2 border-black min-h-[240mm] overflow-hidden bg-white flex flex-col justify-between">
                      
                      {/* 3 Column Titles Header */}
                      <div className="flex items-center border-b-2 border-black bg-slate-100 text-[9px] font-black uppercase text-center shrink-0">
                        <div className="w-[60px] border-r-2 border-black py-1 px-0.5">
                          QUESTION NO.<br/>(SWALI)
                        </div>
                        <div className="flex-1 py-1 px-2">
                          SEHEMU YA KUJIBIA (ANSWERS)
                        </div>
                        <div className="w-[60px] border-l-2 border-black py-1 px-0.5">
                          EXAMINER ONLY<br/>(ALAMA)
                        </div>
                      </div>

                      {/* Lined Row Grid */}
                      <div className="flex-1 flex flex-col justify-between">
                        {Array.from({ length: 26 }).map((_, rIdx) => (
                          <div key={rIdx} className="w-full h-[28px] border-b border-black flex items-center">
                            {/* Left Column: Question Number Area */}
                            <div className="w-[60px] h-full border-r-2 border-black shrink-0"></div>

                            {/* Center Column: Main Answer Area */}
                            <div className="flex-1 h-full"></div>

                            {/* Right Column: Examiner Mark Area */}
                            <div className="w-[60px] h-full border-l-2 border-black shrink-0"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Page Number */}
                    <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-black text-slate-800 shrink-0">
                      <span>NECTA ANSWER SHEET</span>
                      <span>UKURASA WA {pageNum} / PAGE {pageNum} OF {totalPages}</span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Printing */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
          }
          /* Hide non-printable app UI elements */
          body * {
            visibility: hidden !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .no-print-bg {
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            position: static !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          
          /* Show print area cleanly */
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
            box-shadow: none !important;
            border: none !important;
          }

          /* Force exact page breaks for NECTA Booklet */
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
            break-inside: avoid !important;
            min-height: 98vh !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
};
