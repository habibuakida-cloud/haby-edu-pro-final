import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  FileText,
  RotateCcw,
  Layers,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Building2,
  Calendar,
  Clock,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Copy,
  Sparkles,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { InvigilationSession, Teacher, Supervisor, SchoolInfo } from '../../types';
import { SUBJECT_LIST, DEFAULT_CLASSES } from '../../constants/defaults';
import { captureDomToPdf } from '../../utils/timetablePdfExport';
import { jsPDF } from 'jspdf';

// Standard NECTA Subject Codes for automatic lookup when a subject is selected
const NECTA_SUBJECT_CODE_MAP: Record<string, { code: string; paper: string }> = {
  'civics': { code: '011', paper: '1' },
  'history': { code: '012', paper: '1' },
  'geography': { code: '013', paper: '1' },
  'kiswahili': { code: '021', paper: '1' },
  'english': { code: '022', paper: '1' },
  'english language': { code: '022', paper: '1' },
  'literature in english': { code: '024', paper: '1' },
  'arabic': { code: '025', paper: '1' },
  'french': { code: '023', paper: '1' },
  'physics': { code: '031', paper: '1' },
  'chemistry': { code: '032', paper: '1' },
  'biology': { code: '033', paper: '1' },
  'basic mathematics': { code: '041', paper: '1' },
  'mathematics': { code: '041', paper: '1' },
  'additional mathematics': { code: '042', paper: '1' },
  'commerce': { code: '061', paper: '1' },
  'book-keeping': { code: '062', paper: '1' },
  'book keeping': { code: '062', paper: '1' },
  'computer studies': { code: '036', paper: '1' },
  'information and computer studies': { code: '036', paper: '1' },
  'agriculture': { code: '034', paper: '1' },
  'bible knowledge': { code: '014', paper: '1' },
  'elimu ya dini ya kiislamu': { code: '015', paper: '1' },
  'islamic knowledge': { code: '015', paper: '1' },
  'hisabati': { code: '01', paper: '1' },
  'sayansi na teknolojia': { code: '05', paper: '1' },
  'maarifa ya jamii na stadi za kazi': { code: '03', paper: '1' },
  'uraia na maadili': { code: '06', paper: '1' }
};

export interface EnvelopeFormState {
  authorityHeader: string;
  subAuthorityHeader: string;
  examTitle: string;
  centreName: string;
  centrePrefix: 'S' | 'P' | 'PS' | 'EQ';
  centreDigits: [string, string, string, string];
  subjectName: string;
  subjectCodeDigits: [string, string, string];
  subjectPaperDigit: string;
  className: string;
  examDate: string;
  sessionPeriod: 'MORNING' | 'AFTERNOON' | 'NONE';
  timeRange: string;
  envelopeNo: string;
  totalEnvelopes: string;
  totalRegistered: string;
  totalPresent: string;
  totalAbsent: string;
  scriptsEnclosed: string;
  absenteeNumbers: string[];
  fromCentreNo: string;
  fromCandNo: string;
  toCentreNo: string;
  toCandNo: string;
  supervisorName: string;
  supervisorDate: string;
  assistantInvigilatorName: string;
  assistantDate: string;
  candidateWitnessName: string;
  candidateWitnessCandNo: string;
  candidateWitnessSignature: string;
  candidateWitnessDate: string;
  roomVenue: string;
}

interface ScriptReturnEnvelopeViewProps {
  schoolInfo: SchoolInfo;
  sessions?: InvigilationSession[];
  teachers?: Teacher[];
  supervisors?: Supervisor[];
  invigilationAssignments?: Record<string, number>;
  activeExamTitle?: string;
  onBack?: () => void;
}

export const ScriptReturnEnvelopeView: React.FC<ScriptReturnEnvelopeViewProps> = ({
  schoolInfo,
  sessions: rawSessions = [],
  teachers: rawTeachers = [],
  supervisors: rawSupervisors = [],
  invigilationAssignments: rawAssignments = {},
  activeExamTitle = 'REGIONAL / JOINT MOCK / PRE-NATIONAL EXAMINATION',
  onBack
}) => {
  const sessions = useMemo(() => (Array.isArray(rawSessions) ? rawSessions.filter(Boolean) : []), [rawSessions]);
  const teachers = useMemo(() => (Array.isArray(rawTeachers) ? rawTeachers.filter(Boolean) : []), [rawTeachers]);
  const supervisors = useMemo(() => (Array.isArray(rawSupervisors) ? rawSupervisors.filter(Boolean) : []), [rawSupervisors]);
  const invigilationAssignments = useMemo(() => (rawAssignments && typeof rawAssignments === 'object' ? rawAssignments : {}), [rawAssignments]);

  // Parse school center number if present (e.g. S.0101 or S0101)
  const parsedCentre = useMemo(() => {
    const raw = (schoolInfo?.centerNumber || schoolInfo?.regNumber || '').toUpperCase().trim();
    const match = raw.match(/^([A-Z]{1,2})\.?(\d{4})$/);
    if (match) {
      const prefix = (['S', 'P', 'PS', 'EQ'].includes(match[1]) ? match[1] : 'S') as 'S' | 'P' | 'PS' | 'EQ';
      const digits = match[2].split('') as [string, string, string, string];
      return { prefix, digits, full: `${prefix}.${match[2]}` };
    }
    return {
      prefix: 'S' as const,
      digits: ['', '', '', ''] as [string, string, string, string],
      full: ''
    };
  }, [schoolInfo]);

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [fillMode, setFillMode] = useState<'prefilled' | 'blank'>('prefilled');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [absenteeSlotsCount, setAbsenteeSlotsCount] = useState<number>(15);
  const [batchPrintMode, setBatchPrintMode] = useState<'single' | 'multi_envelopes' | 'all_sessions'>('single');
  const [multiEnvelopeCount, setMultiEnvelopeCount] = useState<number>(2);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const printContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<EnvelopeFormState>(() => ({
    authorityHeader: "PRESIDENT'S OFFICE – REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT (PO-RALG)",
    subAuthorityHeader: schoolInfo?.district
      ? `${schoolInfo.district.toUpperCase()} DISTRICT / MUNICIPAL COUNCIL EXAMINATION SYNDICATE`
      : 'REGIONAL / DISTRICT ACADEMIC EXAMINATION COMMITTEE',
    examTitle: (activeExamTitle || 'REGIONAL / JOINT MOCK / PRE-NATIONAL EXAMINATION').toUpperCase(),
    centreName: (schoolInfo?.name || '').toUpperCase(),
    centrePrefix: parsedCentre.prefix,
    centreDigits: parsedCentre.digits,
    subjectName: '',
    subjectCodeDigits: ['', '', ''],
    subjectPaperDigit: '',
    className: '',
    examDate: '',
    sessionPeriod: 'NONE',
    timeRange: '',
    envelopeNo: '',
    totalEnvelopes: '',
    totalRegistered: '',
    totalPresent: '',
    totalAbsent: '',
    scriptsEnclosed: '',
    absenteeNumbers: Array(15).fill(''),
    fromCentreNo: parsedCentre.full,
    fromCandNo: '',
    toCentreNo: parsedCentre.full,
    toCandNo: '',
    supervisorName: supervisors[0]?.name || '',
    supervisorDate: '',
    assistantInvigilatorName: '',
    assistantDate: '',
    candidateWitnessName: '',
    candidateWitnessCandNo: '',
    candidateWitnessSignature: '',
    candidateWitnessDate: '',
    roomVenue: ''
  }));

  // Apply a scheduled invigilation session to auto-fill the envelope cover form
  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (!sessionId) return;

    const found = sessions.find((s) => String(s.id) === String(sessionId));
    if (!found) return;

    const subjLower = (found.subject || '').toLowerCase().trim();
    const mappedCode = NECTA_SUBJECT_CODE_MAP[subjLower] || { code: '', paper: '1' };
    const codeChars: [string, string, string] = mappedCode.code
      ? [mappedCode.code[0] || '', mappedCode.code[1] || '', mappedCode.code[2] || '']
      : ['', '', ''];

    // Find assigned invigilators for Room 0 & Room 1
    const room0TeacherId = invigilationAssignments[`${found.id}_room0`];
    const room1TeacherId = invigilationAssignments[`${found.id}_room1`];
    const room0Teacher = teachers.find((t) => Number(t.id) === Number(room0TeacherId));
    const room1Teacher = teachers.find((t) => Number(t.id) === Number(room1TeacherId));

    const isAfternoon =
      (found.session && (found.session.includes('II') || found.session.includes('III'))) ||
      (found.time && (found.time.toLowerCase().includes('pm') || found.time.includes('14:') || found.time.includes('02:')));

    // Automatic Msimamizi Mkuu (Supervisor) vs Msimamizi wa Chumba (Room Invigilator)
    const activeSupervisorName = supervisors[0]?.name || '';
    const roomInvigilator = room0Teacher?.name || room1Teacher?.name;

    setFillMode('prefilled');
    setForm((prev) => ({
      ...prev,
      examTitle: (found.examTitle || activeExamTitle || prev.examTitle).toUpperCase(),
      subjectName: (found.subject || '').toUpperCase(),
      subjectCodeDigits: codeChars,
      subjectPaperDigit: mappedCode.paper || '1',
      className: found.className || prev.className,
      examDate: found.rawDate || found.date || prev.examDate,
      sessionPeriod: isAfternoon ? 'AFTERNOON' : 'MORNING',
      timeRange: found.time || (isAfternoon ? '02:00 PM - 05:00 PM' : '08:00 AM - 11:00 AM'),
      envelopeNo: '1',
      totalEnvelopes: String(Math.max(1, found.rooms || 1)),
      supervisorName: supervisors[0]?.name || prev.supervisorName,
      assistantInvigilatorName: roomInvigilator || prev.assistantInvigilatorName,
      supervisorDate: found.rawDate || found.date || prev.supervisorDate,
      assistantDate: found.rawDate || found.date || prev.assistantDate,
      candidateWitnessDate: found.rawDate || found.date || prev.examDate
    }));
  };

  // Handle Subject selection and automatic NECTA subject code lookup
  const handleSubjectChange = (subjectVal: string) => {
    const subjLower = subjectVal.toLowerCase().trim();
    const mapped = NECTA_SUBJECT_CODE_MAP[subjLower];
    setForm((prev) => ({
      ...prev,
      subjectName: subjectVal.toUpperCase(),
      subjectCodeDigits: mapped
        ? [mapped.code[0] || '', mapped.code[1] || '', mapped.code[2] || '']
        : prev.subjectCodeDigits,
      subjectPaperDigit: mapped ? mapped.paper : prev.subjectPaperDigit
    }));
  };

  // Reset to clean blank template for handwriting with a pen
  const handleResetBlankForm = () => {
    setSelectedSessionId('');
    setFillMode('blank');
    setForm((prev) => ({
      ...prev,
      subjectName: '',
      subjectCodeDigits: ['', '', ''],
      subjectPaperDigit: '',
      className: '',
      examDate: '',
      sessionPeriod: 'NONE',
      timeRange: '',
      envelopeNo: '',
      totalEnvelopes: '',
      totalRegistered: '',
      totalPresent: '',
      totalAbsent: '',
      scriptsEnclosed: '',
      absenteeNumbers: Array(absenteeSlotsCount).fill(''),
      fromCandNo: '',
      toCandNo: '',
      supervisorName: '',
      supervisorDate: '',
      assistantInvigilatorName: '',
      assistantDate: '',
      roomVenue: ''
    }));
  };

  // Build list of envelopes to render (Single, Multi-Envelope 1..N, or All Timetable Sessions)
  const envelopesToRender = useMemo<EnvelopeFormState[]>(() => {
    const baseState: EnvelopeFormState =
      fillMode === 'blank'
        ? {
            ...form,
            subjectName: '',
            subjectCodeDigits: ['', '', ''],
            subjectPaperDigit: '',
            examDate: '',
            sessionPeriod: 'NONE',
            timeRange: '',
            envelopeNo: '',
            totalEnvelopes: '',
            totalRegistered: '',
            totalPresent: '',
            totalAbsent: '',
            scriptsEnclosed: '',
            absenteeNumbers: Array(absenteeSlotsCount).fill(''),
            fromCandNo: '',
            toCandNo: '',
            supervisorName: '',
            supervisorDate: '',
            assistantInvigilatorName: '',
            assistantDate: ''
          }
        : form;

    if (batchPrintMode === 'multi_envelopes') {
      const count = Math.max(1, Math.min(20, multiEnvelopeCount));
      return Array.from({ length: count }, (_, idx) => ({
        ...baseState,
        envelopeNo: String(idx + 1),
        totalEnvelopes: String(count)
      }));
    }

    if (batchPrintMode === 'all_sessions' && sessions.length > 0) {
      return sessions.map((s) => {
        const subjLower = (s.subject || '').toLowerCase().trim();
        const mapped = NECTA_SUBJECT_CODE_MAP[subjLower] || { code: '', paper: '1' };
        const isAfternoon =
          (s.session && (s.session.includes('II') || s.session.includes('III'))) ||
          (s.time && (s.time.toLowerCase().includes('pm') || s.time.includes('14:')));
        const r0Tid = invigilationAssignments[`${s.id}_room0`];
        const r1Tid = invigilationAssignments[`${s.id}_room1`];
        const r0T = teachers.find((t) => Number(t.id) === Number(r0Tid));
        const r1T = teachers.find((t) => Number(t.id) === Number(r1Tid));

        return {
          ...baseState,
          examTitle: (s.examTitle || activeExamTitle || baseState.examTitle).toUpperCase(),
          subjectName: (s.subject || '').toUpperCase(),
          subjectCodeDigits: mapped.code
            ? [mapped.code[0] || '', mapped.code[1] || '', mapped.code[2] || '']
            : ['', '', ''],
          subjectPaperDigit: mapped.paper || '1',
          className: s.className || baseState.className,
          examDate: s.rawDate || s.date || '',
          sessionPeriod: isAfternoon ? 'AFTERNOON' : 'MORNING',
          timeRange: s.time || '',
          envelopeNo: '1',
          totalEnvelopes: String(Math.max(1, s.rooms || 1)),
          supervisorName: r0T?.name || baseState.supervisorName,
          assistantInvigilatorName: r1T?.name || baseState.assistantInvigilatorName,
          supervisorDate: s.rawDate || s.date || '',
          assistantDate: s.rawDate || s.date || ''
        };
      });
    }

    return [baseState];
  }, [
    form,
    fillMode,
    batchPrintMode,
    multiEnvelopeCount,
    sessions,
    teachers,
    invigilationAssignments,
    activeExamTitle,
    absenteeSlotsCount
  ]);

  // Direct Print Handler using cloned local stylesheets + self-contained rules (no external CDN dependency)
  const handlePrintForm = () => {
    if (!printContainerRef.current) {
      window.print();
      return;
    }

    const printHtml = printContainerRef.current.innerHTML;
    // Clone existing <style> and <link rel="stylesheet"> tags from current document so Tailwind classes render immediately offline
    const inheritedStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const printStyles = `
      @page {
        size: A4 ${orientation};
        margin: 8mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: ${fontFamily === 'serif' ? "'Times New Roman', Times, serif" : "Arial, Helvetica, sans-serif"};
      }
      .envelope-sheet {
        width: 100%;
        page-break-after: always;
        break-after: page;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .envelope-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Script Return Envelope Cover Form - ${form.centreName || 'NECTA Format'}</title>
          ${inheritedStyles}
          <style>${printStyles}</style>
        </head>
        <body>
          ${printHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 350);
  };

  // Direct Native Vector A4 PDF Generator using jsPDF (instant & crisp on every device)
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const innerW = pageW - margin * 2;
      const fontName = fontFamily === 'serif' ? 'times' : 'helvetica';

      envelopesToRender.forEach((env, idx) => {
        if (idx > 0) doc.addPage();

        // Outer Double Border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.9);
        doc.rect(margin, margin, innerW, pageH - margin * 2);
        doc.setLineWidth(0.3);
        doc.rect(margin + 1.5, margin + 1.5, innerW - 3, pageH - margin * 2 - 3);

        let y = margin + 8;

        // 1. HEADER SECTION
        doc.setFont(fontName, 'bold');
        doc.setFontSize(9.5);
        doc.text(
          (env.authorityHeader || "PRESIDENT'S OFFICE - REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT").toUpperCase(),
          pageW / 2,
          y,
          { align: 'center' }
        );
        y += 4.5;
        doc.setFontSize(8.5);
        doc.text(
          (env.subAuthorityHeader || 'REGIONAL / DISTRICT ACADEMIC EXAMINATION COMMITTEE').toUpperCase(),
          pageW / 2,
          y,
          { align: 'center' }
        );
        y += 5.5;
        doc.setFontSize(11);
        doc.text(
          (env.examTitle || 'REGIONAL / JOINT MOCK / PRE-NATIONAL EXAMINATION').toUpperCase(),
          pageW / 2,
          y,
          { align: 'center' }
        );

        y += 4;
        doc.setFillColor(15, 23, 42);
        doc.rect(margin + 4, y, innerW - 8, 8.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10.5);
        doc.text(
          "CANDIDATES' SCRIPTS RETURN ENVELOPE / BAHASHA YA MAJIBU YA WANAFUNZI",
          pageW / 2,
          y + 5.7,
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
        y += 12.5;

        // 2. EXAMINATION PARTICULARS BOX
        doc.setFillColor(241, 245, 249);
        doc.rect(margin + 4, y, innerW - 8, 6.5, 'FD');
        doc.setFontSize(8.5);
        doc.text('1. TAARIFA ZA AWALI ZA MTIHANI (EXAMINATION PARTICULARS)', margin + 6, y + 4.5);
        y += 6.5;

        const partH = 38;
        doc.rect(margin + 4, y, innerW - 8, partH);

        const centreCodeStr = `${env.centrePrefix}.${env.centreDigits.map((d) => d || '_').join('')}`;
        const subjCodeStr = `${env.subjectCodeDigits.map((d) => d || '_').join('')} / ${env.subjectPaperDigit || '_'}`;

        doc.setFontSize(9);
        doc.setFont(fontName, 'bold');
        doc.text(`Centre Name (Jina la Kituo/Shule):`, margin + 7, y + 7);
        doc.setFont(fontName, 'normal');
        doc.text(env.centreName || '___________________________________________', margin + 62, y + 7);

        doc.setFont(fontName, 'bold');
        doc.text(`Centre No: [ ${centreCodeStr} ]`, pageW - margin - 52, y + 7);

        doc.line(margin + 4, y + 10, pageW - margin - 4, y + 10);

        doc.text(`Subject Name (Jina la Somo):`, margin + 7, y + 16.5);
        doc.setFont(fontName, 'normal');
        doc.text(env.subjectName || '____________________________________', margin + 56, y + 16.5);

        doc.setFont(fontName, 'bold');
        doc.text(`Subject Code: [ ${subjCodeStr} ]`, pageW - margin - 58, y + 16.5);

        doc.line(margin + 4, y + 19.5, pageW - margin - 4, y + 19.5);

        doc.text(`Date of Exam (Tarehe):`, margin + 7, y + 26);
        doc.setFont(fontName, 'normal');
        doc.text(env.examDate || '____________________', margin + 45, y + 26);

        const mornMark = env.sessionPeriod === 'MORNING' ? '[ X ]' : '[   ]';
        const aftMark = env.sessionPeriod === 'AFTERNOON' ? '[ X ]' : '[   ]';
        doc.setFont(fontName, 'bold');
        doc.text(`Session: Morning ${mornMark}  Afternoon ${aftMark}`, margin + 92, y + 26);

        doc.line(margin + 4, y + 29, pageW - margin - 4, y + 29);

        doc.text(
          `Class/Form: ${env.className || '__________'}    |    Room/Hall: ${env.roomVenue || '__________'}    |    Envelope No: [ ${env.envelopeNo || '__'} ] of [ ${env.totalEnvelopes || '__'} ]`,
          margin + 7,
          y + 35
        );

        y += partH + 4;

        // 3. SCRIPTS ACCOUNTABILITY TABLE
        doc.setFillColor(241, 245, 249);
        doc.rect(margin + 4, y, innerW - 8, 6.5, 'FD');
        doc.setFont(fontName, 'bold');
        doc.setFontSize(8.5);
        doc.text('2. TAKWIMU ZA WANAFUNZI NA MAJIBU (SCRIPTS ACCOUNTABILITY TABLE)', margin + 6, y + 4.5);
        y += 6.5;

        const colW = (innerW - 8) / 4;
        const statBoxH = 20;
        const statLabels = [
          { title: 'TOTAL REGISTERED', sw: 'Waliosajiliwa', val: env.totalRegistered },
          { title: 'CANDIDATES PRESENT', sw: 'Waliofanya Mtihani', val: env.totalPresent },
          { title: 'CANDIDATES ABSENT', sw: 'Waliokosekana/Watoro', val: env.totalAbsent },
          { title: 'SCRIPTS ENCLOSED', sw: 'Script Ndani ya Bahasha', val: env.scriptsEnclosed }
        ];

        statLabels.forEach((st, i) => {
          const bx = margin + 4 + i * colW;
          doc.rect(bx, y, colW, statBoxH);
          doc.setFontSize(7.2);
          doc.setFont(fontName, 'bold');
          doc.text(st.title, bx + colW / 2, y + 4.5, { align: 'center' });
          doc.setFont(fontName, 'normal');
          doc.text(`(${st.sw})`, bx + colW / 2, y + 8.2, { align: 'center' });
          doc.setFont(fontName, 'bold');
          doc.setFontSize(13);
          doc.text(st.val || '______', bx + colW / 2, y + 16.5, { align: 'center' });
        });

        y += statBoxH;

        // Absentee Candidate Numbers Box
        const absBoxH = orientation === 'portrait' ? 28 : 18;
        doc.rect(margin + 4, y, innerW - 8, absBoxH);
        doc.setFontSize(8);
        doc.setFont(fontName, 'bold');
        doc.text(
          'Namba za Watahiniwa Waliokosekana (Absentee Candidate Numbers — Write NONE if all present):',
          margin + 6,
          y + 5
        );
        const nonEmptyAbs = (env.absenteeNumbers || []).filter((n) => n && n.trim());
        doc.setFont(fontName, 'normal');
        if (nonEmptyAbs.length > 0) {
          doc.text(nonEmptyAbs.join('   ,   '), margin + 6, y + 12);
        } else {
          doc.text(
            '1. ____________   2. ____________   3. ____________   4. ____________   5. ____________',
            margin + 6,
            y + 12
          );
          if (orientation === 'portrait') {
            doc.text(
              '6. ____________   7. ____________   8. ____________   9. ____________   10. ____________',
              margin + 6,
              y + 20
            );
          }
        }
        y += absBoxH + 4;

        // 4. CANDIDATE RANGE
        doc.setFillColor(241, 245, 249);
        doc.rect(margin + 4, y, innerW - 8, 6.5, 'FD');
        doc.setFont(fontName, 'bold');
        doc.setFontSize(8.5);
        doc.text('3. MFULULIZO WA NAMBA ZA WATAHINIWA (CANDIDATE NUMBER RANGE IN THIS ENVELOPE)', margin + 6, y + 4.5);
        y += 6.5;

        doc.rect(margin + 4, y, innerW - 8, 12);
        doc.setFontSize(9.5);
        doc.text(
          `From Candidate No (Kuanzia Namba):  ${env.fromCentreNo || centreCodeStr} / ${env.fromCandNo || '______'}`,
          margin + 8,
          y + 7.5
        );
        doc.text(
          `To Candidate No (Hadi Namba):  ${env.toCentreNo || centreCodeStr} / ${env.toCandNo || '______'}`,
          pageW / 2 + 6,
          y + 7.5
        );
        y += 16;

        // 5. INVIGILATOR'S DECLARATION & OFFICIAL STAMP
        doc.setFillColor(241, 245, 249);
        doc.rect(margin + 4, y, innerW - 8, 6.5, 'FD');
        doc.setFont(fontName, 'bold');
        doc.setFontSize(8.5);
        doc.text(
          "4. TAMKO LA MSIMAMIZI MKUU NA WASIMAMIZI (INVIGILATOR'S DECLARATION & CERTIFICATION)",
          margin + 6,
          y + 4.5
        );
        y += 6.5;

        const declH = Math.max(52, pageH - margin - y - 4);
        doc.rect(margin + 4, y, innerW - 8, declH);

        doc.setFont(fontName, 'italic');
        doc.setFontSize(7.5);
        doc.text(
          'Ninathibitisha kuwa script za majibu zote zilizoandikwa hapo juu zimehesabiwa kwa usahihi na kufungwa ndani ya bahasha hii mbele ya wasimamizi na shuhuda wa wanafunzi.',
          margin + 6,
          y + 4.5
        );
        doc.text(
          '(I certify that the answer scripts stated above have been verified, counted accurately, and sealed in this envelope in the presence of invigilators and candidate witness.)',
          margin + 6,
          y + 8.5
        );

        const stampW = 58;
        const sigAreaW = innerW - 8 - stampW - 8;

        doc.setFont(fontName, 'bold');
        doc.setFontSize(8);
        doc.text(
          `1. Supervisor / Invigilator-in-Charge: ${env.supervisorName || '______________________________'}`,
          margin + 6,
          y + 15.5
        );
        doc.text(
          `    Signature (Sahihi): ______________________   Date (Tarehe): ${env.supervisorDate || '______________'}`,
          margin + 6,
          y + 21
        );

        doc.text(
          `2. Assistant Invigilator (Msimamizi Msaidizi): ${env.assistantInvigilatorName || '________________________'}`,
          margin + 6,
          y + 28
        );
        doc.text(
          `    Signature (Sahihi): ______________________   Date (Tarehe): ${env.assistantDate || '______________'}`,
          margin + 6,
          y + 33.5
        );

        doc.text(
          `3. Candidate Witness (Shuhuda wa Mtahiniwa): ${env.candidateWitnessName || '____________________'} (${env.candidateWitnessCandNo || 'No. ____'})`,
          margin + 6,
          y + 40.5
        );
        doc.text(
          `    Signature (Sahihi): ______________________   Date (Tarehe): ${env.candidateWitnessDate || env.supervisorDate || '______________'}`,
          margin + 6,
          y + 46
        );

        // Official Centre Stamp Box
        const stampX = margin + 4 + sigAreaW + 4;
        const stampY = y + 11;
        const stampH = declH - 14;
        doc.setLineWidth(0.4);
        doc.rect(stampX, stampY, stampW, stampH);
        doc.setFontSize(7.5);
        doc.text('OFFICIAL CENTRE STAMP', stampX + stampW / 2, stampY + 5, { align: 'center' });
        doc.setFont(fontName, 'normal');
        doc.text('(Muhuri Rasmi wa Kituo/Shule)', stampX + stampW / 2, stampY + 9, { align: 'center' });
      });

      const safeSubj = (form.subjectName || 'NECTA_Template').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Script_Return_Envelope_${safeSubj}.pdf`);
    } catch (err) {
      console.error('PDF export error, falling back to DOM capture:', err);
      const safeSubj = (form.subjectName || 'Blank_Template').replace(/[^a-zA-Z0-9_-]/g, '_');
      const el = document.getElementById('necta-script-envelope-print-area') || printContainerRef.current;
      if (el) {
        await captureDomToPdf(
          el,
          `Script_Return_Envelope_${safeSubj}.pdf`
        );
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. CONTROL & CUSTOMIZATION PANEL (HIDDEN ON PRINT)
         ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mr-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                  title="Rudi kwenye Ratiba ya Usimamizi au Mtazamo Uliopita"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                  <span>← Rudi Nyuma</span>
                </button>
              )}
              <FileText className="w-4 h-4" />
              <span>NECTA Standard Examination Packaging &amp; Invigilation Form</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Script Return Envelope Cover Form (Fomu ya Juu ya Bahasha ya Scripts za Majibu)
            </h2>
            <p className="text-xs text-slate-600">
              Fomu rasmi ya kubandika juu ya bahasha za kaki (A4 / A3) za kukusanyia na kufungia scripts za majibu ya watahiniwa kwa mitihani ya Mock, Pre-National, Mid-Term, na Terminal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetBlankForm}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
              title="Safisha sehemu zote ili ku-print fomu tupu ya kujaza kwa mkono (kalamu)"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>Fomu Tupu (Kujaza kwa Mkono)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Inatengeneza PDF...' : 'Pakua PDF (A4)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintForm}
              className="px-5 py-2.5 rounded-xl bg-[#1f4d8b] hover:bg-[#163a6b] text-white text-xs font-black flex items-center gap-2 shadow-sm cursor-pointer transition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Chapa Fomu Sasa (Print A4)</span>
            </button>
          </div>
        </div>

        {/* QUICK AUTO-FILL FROM INVIGILATION TIMETABLE & PRINT OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              1. Jaza Kiatomatiki Kutoka Ratiba ya Usimamizi:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => handleSelectSession(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900"
            >
              <option value="">-- Chagua Kipindi cha Mtihani au Acha Wazi --</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject} ({s.className || 'Form 4'}) • {s.date} ({s.session})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              2. Mpangilio wa Karatasi ya A4 (Orientation):
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-black transition cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Portrait (Wima)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-black transition cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Landscape (Mlalo)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              3. Mtindo wa Fonti Rasmi (Typography):
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFontFamily('serif')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-black transition cursor-pointer ${
                  fontFamily === 'serif'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Times New Roman
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('sans')}
                className={`py-1.5 px-2.5 rounded-md text-xs font-black transition cursor-pointer ${
                  fontFamily === 'sans'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Arial / Sans-Serif
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              4. Aina ya Uchapishaji (Print Mode):
            </label>
            <select
              value={batchPrintMode}
              onChange={(e) => setBatchPrintMode(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900"
            >
              <option value="single">Bahasha Moja (Single Envelope Form)</option>
              <option value="multi_envelopes">Bahasha Nyingi za Somo Moja (Envelope 1 of N)</option>
              {sessions.length > 0 && (
                <option value="all_sessions">
                  Masomo Yote ya Ratiba ({sessions.length} Envelopes)
                </option>
              )}
            </select>
          </div>
        </div>

        {/* OPTIONAL FORM PRE-FILL INPUTS (FOR DIGITAL OR SEMI-FILLED PRINTING) */}
        <details className="group border border-slate-200 rounded-xl bg-white overflow-hidden" open>
          <summary className="px-4 py-3 bg-slate-100/80 hover:bg-slate-100 cursor-pointer flex items-center justify-between text-xs font-black text-slate-800 select-none">
            <span>
              ✏️ Hariri Taarifa za Kichwa cha Habari, Kituo, Somo au Acha Wazi Kujaza kwa Kalamu (Optional Pre-fill Fields)
            </span>
            <span className="text-[11px] font-bold text-blue-700 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <div className="p-4 space-y-4">
            {/* Row 1: Authority, Sub-Authority, Exam Title */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jina la Mamlaka / Wizara (Top Header):
                </label>
                <input
                  type="text"
                  value={form.authorityHeader}
                  onChange={(e) => setForm((p) => ({ ...p, authorityHeader: e.target.value }))}
                  placeholder="e.g. PRESIDENT'S OFFICE - PO-RALG"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Halmashauri / Wilaya / Mkoa / Shule:
                </label>
                <input
                  type="text"
                  value={form.subAuthorityHeader}
                  onChange={(e) => setForm((p) => ({ ...p, subAuthorityHeader: e.target.value }))}
                  placeholder="e.g. KINONDONI MUNICIPAL COUNCIL"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jina la Mtihani (Examination Name):
                </label>
                <input
                  type="text"
                  value={form.examTitle}
                  onChange={(e) => setForm((p) => ({ ...p, examTitle: e.target.value }))}
                  placeholder="e.g. FORM FOUR PRE-NATIONAL EXAMINATION 2026"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            {/* Row 2: Centre Name, Centre Number [S._ _ _ _], Subject Name, Subject Code [_ _ _ / _] */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jina la Kituo / Shule (Centre Name):
                </label>
                <input
                  type="text"
                  value={form.centreName}
                  onChange={(e) => {
                    setFillMode('prefilled');
                    setForm((p) => ({ ...p, centreName: e.target.value.toUpperCase() }));
                  }}
                  placeholder="Acha wazi kujaza kwa mkono..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Namba ya Kituo (Centre No. [ S . _ _ _ _ ]):
                </label>
                <div className="flex items-center gap-1">
                  <select
                    value={form.centrePrefix}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, centrePrefix: e.target.value as any }))
                    }
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-black bg-slate-50"
                  >
                    <option value="S">S.</option>
                    <option value="P">P.</option>
                    <option value="PS">PS.</option>
                    <option value="EQ">EQ.</option>
                  </select>
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={form.centreDigits[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setForm((p) => {
                          const next = [...p.centreDigits] as [string, string, string, string];
                          next[idx] = val;
                          const joined = next.every(Boolean) ? `${p.centrePrefix}.${next.join('')}` : '';
                          return {
                            ...p,
                            centreDigits: next,
                            fromCentreNo: joined || p.fromCentreNo,
                            toCentreNo: joined || p.toCentreNo
                          };
                        });
                      }}
                      placeholder="_"
                      className="w-9 text-center py-1.5 rounded-lg border border-slate-300 text-xs font-black"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jina la Somo (Subject Name):
                </label>
                <input
                  type="text"
                  list="envelope-subject-list"
                  value={form.subjectName}
                  onChange={(e) => {
                    setFillMode('prefilled');
                    handleSubjectChange(e.target.value);
                  }}
                  placeholder="Chagua au acha wazi..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold uppercase"
                />
                <datalist id="envelope-subject-list">
                  {SUBJECT_LIST.map((subj: any) => {
                    const name = typeof subj === 'string' ? subj : subj?.name || '';
                    return <option key={name} value={name.toUpperCase()} />;
                  })}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Namba ya Somo (Subject Code [ _ _ _ / _ ]):
                </label>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={form.subjectCodeDigits[idx]}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9A-Za-z]/g, '');
                        setForm((p) => {
                          const next = [...p.subjectCodeDigits] as [string, string, string];
                          next[idx] = val;
                          return { ...p, subjectCodeDigits: next };
                        });
                      }}
                      placeholder="_"
                      className="w-9 text-center py-1.5 rounded-lg border border-slate-300 text-xs font-black"
                    />
                  ))}
                  <span className="font-black text-slate-700 px-0.5">/</span>
                  <input
                    type="text"
                    maxLength={1}
                    value={form.subjectPaperDigit}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subjectPaperDigit: e.target.value }))
                    }
                    placeholder="1"
                    className="w-9 text-center py-1.5 rounded-lg border border-slate-300 text-xs font-black"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Date, Session (Morning/Afternoon), Envelope No, Candidate Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tarehe ya Mtihani (Date):
                </label>
                <input
                  type="text"
                  value={form.examDate}
                  onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
                  placeholder="DD / MM / YYYY (au acha wazi)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Muda (Time / Session):
                </label>
                <select
                  value={form.sessionPeriod}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sessionPeriod: e.target.value as any }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                >
                  <option value="NONE">Acha Wazi (Tick kwa Mkono)</option>
                  <option value="MORNING">Morning (Asubuhi) [✓]</option>
                  <option value="AFTERNOON">Afternoon (Mchana) [✓]</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Namba ya Bahasha (Envelope __ of __):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={form.envelopeNo}
                    onChange={(e) => setForm((p) => ({ ...p, envelopeNo: e.target.value }))}
                    placeholder="__"
                    className="w-full text-center px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-black"
                  />
                  <span className="text-xs font-bold text-slate-600">of</span>
                  <input
                    type="text"
                    value={form.totalEnvelopes}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, totalEnvelopes: e.target.value }))
                    }
                    placeholder="__"
                    className="w-full text-center px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kuanzia Namba (From Cand. No):
                </label>
                <input
                  type="text"
                  value={form.fromCandNo}
                  onChange={(e) => setForm((p) => ({ ...p, fromCandNo: e.target.value }))}
                  placeholder="mf. 0001 (au acha wazi)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Hadi Namba (To Cand. No):
                </label>
                <input
                  type="text"
                  value={form.toCandNo}
                  onChange={(e) => setForm((p) => ({ ...p, toCandNo: e.target.value }))}
                  placeholder="mf. 0045 (au acha wazi)"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            {/* Row 4: Statistics & Invigilator Names (Optional Pre-fill) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Waliosajiliwa (Registered):
                </label>
                <input
                  type="text"
                  value={form.totalRegistered}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, totalRegistered: e.target.value }))
                  }
                  placeholder="Acha wazi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Waliofanya (Present):
                </label>
                <input
                  type="text"
                  value={form.totalPresent}
                  onChange={(e) => setForm((p) => ({ ...p, totalPresent: e.target.value }))}
                  placeholder="Acha wazi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Watoro (Absent):
                </label>
                <input
                  type="text"
                  value={form.totalAbsent}
                  onChange={(e) => setForm((p) => ({ ...p, totalAbsent: e.target.value }))}
                  placeholder="Acha wazi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Idadi ya Scripts Ndani:
                </label>
                <input
                  type="text"
                  value={form.scriptsEnclosed}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, scriptsEnclosed: e.target.value }))
                  }
                  placeholder="Acha wazi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Msimamizi Mkuu (Supervisor):
                </label>
                <input
                  type="text"
                  value={form.supervisorName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, supervisorName: e.target.value }))
                  }
                  placeholder="Acha wazi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Msimamizi Msaidizi:
                </label>
                <input
                  type="text"
                  value={form.assistantInvigilatorName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, assistantInvigilatorName: e.target.value }))
                  }
                  placeholder="Acha wazi..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>

            {batchPrintMode === 'multi_envelopes' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-800">
                  Idadi ya Bahasha za Kuchapisha (Envelope 1 of N):
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={multiEnvelopeCount}
                  onChange={(e) => setMultiEnvelopeCount(Number(e.target.value) || 1)}
                  className="w-20 px-3 py-1 rounded-lg border border-slate-300 text-xs font-black text-center"
                />
                <span className="text-xs text-slate-500">
                  (Itachapisha fomu {multiEnvelopeCount} zenye Envelope 1 of {multiEnvelopeCount}, 2 of {multiEnvelopeCount}, n.k.)
                </span>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* =====================================================================
          2. OFFICIAL NECTA-STYLE PRINT-READY ENVELOPE COVER FORM (A4 PREVIEW)
         ===================================================================== */}
      <div className="bg-slate-200/70 p-3 sm:p-6 rounded-2xl border border-slate-300 overflow-x-auto print:p-0 print:bg-white print:border-0">
        <div
          id="necta-script-envelope-print-area"
          ref={printContainerRef}
          className="space-y-8 print:space-y-0"
          style={{
            fontFamily:
              fontFamily === 'serif'
                ? "'Times New Roman', Times, Georgia, serif"
                : 'Arial, Helvetica, sans-serif'
          }}
        >
          {envelopesToRender.map((env, envIdx) => (
            <div
              key={envIdx}
              className={`envelope-sheet mx-auto bg-white text-black shadow-xl print:shadow-none ${
                orientation === 'landscape'
                  ? 'max-w-[285mm] min-h-[192mm] p-5 sm:p-6'
                  : 'max-w-[202mm] min-h-[278mm] p-5 sm:p-7'
              }`}
              style={{
                border: '3px solid #000000',
                outline: '1px solid #000000',
                outlineOffset: '-6px'
              }}
            >
              {/* ===============================================================
                  SECTION 1: KICHWA CHA HABARI (HEADER)
                 =============================================================== */}
              <div className="border-b-2 border-black pb-3 mb-3">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Logo / Coat of Arms Box */}
                  {showLogo && (
                    <div className="w-20 h-20 border-2 border-black flex flex-col items-center justify-center shrink-0 p-1 text-center">
                      {schoolInfo?.logo ? (
                        <img
                          src={schoolInfo.logo}
                          alt="Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <>
                          <span className="text-[9px] font-bold uppercase leading-tight">
                            OFFICIAL
                          </span>
                          <span className="text-[10px] font-black uppercase leading-tight my-0.5">
                            LOGO
                          </span>
                          <span className="text-[8px] uppercase leading-tight">
                            NEMBO YA KITUO
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Center: Authority, Examination Title & Main Heading */}
                  <div className="flex-1 text-center space-y-1">
                    <div className="text-xs sm:text-sm font-black uppercase tracking-wide leading-tight">
                      {env.authorityHeader ||
                        "PRESIDENT'S OFFICE – REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT"}
                    </div>
                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide leading-tight">
                      {env.subAuthorityHeader ||
                        'REGIONAL / DISTRICT MOCK & TERMINAL EXAMINATIONS SYNDICATE'}
                    </div>

                    {/* Exam Title Box */}
                    <div className="inline-block border-2 border-black px-4 py-1 mt-1 bg-neutral-100">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                        {env.examTitle ||
                          'REGIONAL / JOINT MOCK / PRE-NATIONAL EXAMINATION'}
                      </span>
                    </div>

                    {/* Main Heading */}
                    <div className="pt-1">
                      <h1 className="text-sm sm:text-base font-black uppercase tracking-wider underline decoration-2 underline-offset-4">
                        CANDIDATES&apos; SCRIPTS RETURN ENVELOPE
                      </h1>
                      <p className="text-[11px] sm:text-xs font-black uppercase tracking-wide mt-0.5">
                        (FOMU YA BAHASHA YA KURUDISHIA SCRIPTS ZA MAJIBU YA WANAFUNZI)
                      </p>
                    </div>
                  </div>

                  {/* Right: Envelope Serial Box */}
                  <div className="w-32 border-2 border-black p-1.5 text-center shrink-0 bg-neutral-50">
                    <div className="text-[9px] font-black uppercase border-b border-black pb-0.5">
                      ENVELOPE NO. / NAMBA YA BAHASHA
                    </div>
                    <div className="py-1.5 flex items-center justify-center gap-1 text-xs font-black">
                      <span>Envelope</span>
                      <span className="inline-block min-w-[26px] h-7 border-2 border-black bg-white text-sm font-black leading-6 text-center">
                        {env.envelopeNo || '\u00A0'}
                      </span>
                      <span>of</span>
                      <span className="inline-block min-w-[26px] h-7 border-2 border-black bg-white text-sm font-black leading-6 text-center">
                        {env.totalEnvelopes || '\u00A0'}
                      </span>
                    </div>
                    <div className="text-[8px] font-bold uppercase leading-tight">
                      (Bahasha Na. ___ kati ya ___)
                    </div>
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  SECTION 2: TAARIFA ZA AWALI ZA MTIHANI (EXAMINATION PARTICULARS)
                 =============================================================== */}
              <div className="mb-3">
                <div className="bg-black text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                  <span>
                    SECTION A: EXAMINATION PARTICULARS (TAARIFA ZA AWALI ZA MTIHANI)
                  </span>
                  <span>TO BE COMPLETED BY SUPERVISOR / INVIGILATOR</span>
                </div>

                <table className="w-full border-collapse border-2 border-black text-xs">
                  <tbody>
                    {/* Row 1: Centre Name & Centre Number */}
                    <tr>
                      <td className="border-2 border-black p-2 w-[62%] align-middle">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                          <span className="font-black uppercase shrink-0">
                            1. Centre / School Name
                            <span className="block text-[10px] font-bold normal-case">
                              (Jina la Kituo / Shule):
                            </span>
                          </span>
                          <div className="flex-1 border-b-2 border-dotted border-black min-h-[24px] px-2 font-black text-sm uppercase tracking-wide flex items-end">
                            {env.centreName || '\u00A0'}
                          </div>
                        </div>
                      </td>

                      <td className="border-2 border-black p-2 w-[38%] align-middle">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-black uppercase block">
                              2. Centre Number:
                            </span>
                            <span className="text-[10px] font-bold block">
                              (Namba ya Kituo):
                            </span>
                          </div>
                          {/* Boxed [ S . _ _ _ _ ] */}
                          <div className="flex items-center gap-1 font-black text-sm">
                            <span className="w-7 h-8 border-2 border-black flex items-center justify-center bg-neutral-100">
                              {env.centrePrefix || 'S'}
                            </span>
                            <span className="font-black text-base px-0.5">.</span>
                            {[0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className="w-7 h-8 border-2 border-black flex items-center justify-center bg-white text-sm font-black"
                              >
                                {env.centreDigits[i] || '\u00A0'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Row 2: Subject Name & Subject Code */}
                    <tr>
                      <td className="border-2 border-black p-2 align-middle">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                          <span className="font-black uppercase shrink-0">
                            3. Subject Name
                            <span className="block text-[10px] font-bold normal-case">
                              (Jina la Somo):
                            </span>
                          </span>
                          <div className="flex-1 border-b-2 border-dotted border-black min-h-[24px] px-2 font-black text-sm uppercase tracking-wide flex items-end">
                            {env.subjectName || '\u00A0'}
                          </div>
                        </div>
                      </td>

                      <td className="border-2 border-black p-2 align-middle">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-black uppercase block">
                              4. Subject Code:
                            </span>
                            <span className="text-[10px] font-bold block">
                              (Namba ya Somo):
                            </span>
                          </div>
                          {/* Boxed [ _ _ _ / _ ] */}
                          <div className="flex items-center gap-1 font-black text-sm">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="w-7 h-8 border-2 border-black flex items-center justify-center bg-white"
                              >
                                {env.subjectCodeDigits[i] || '\u00A0'}
                              </span>
                            ))}
                            <span className="font-black text-base px-0.5">/</span>
                            <span className="w-7 h-8 border-2 border-black flex items-center justify-center bg-white">
                              {env.subjectPaperDigit || '\u00A0'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Row 3: Date of Exam, Time/Session & Envelope Number */}
                    <tr>
                      <td className="border-2 border-black p-2 align-middle" colSpan={2}>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Date of Exam */}
                          <div className="sm:col-span-4 flex items-baseline gap-1.5 border-b sm:border-b-0 sm:border-r-2 border-black pb-1.5 sm:pb-0 sm:pr-2">
                            <div className="shrink-0">
                              <span className="font-black uppercase block">
                                5. Date of Exam:
                              </span>
                              <span className="text-[10px] font-bold block">
                                (Tarehe ya Mtihani):
                              </span>
                            </div>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[22px] px-1 font-black text-center text-xs">
                              {env.examDate || '____ / ____ / 20___'}
                            </div>
                          </div>

                          {/* Time / Session Checkboxes */}
                          <div className="sm:col-span-5 flex items-center justify-between gap-2 border-b sm:border-b-0 sm:border-r-2 border-black pb-1.5 sm:pb-0 sm:pr-2">
                            <div>
                              <span className="font-black uppercase block">
                                6. Time / Session:
                              </span>
                              <span className="text-[10px] font-bold block">
                                (Muda wa Mtihani):
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-[11px] uppercase">
                                  Morning
                                </span>
                                <span className="w-6 h-6 border-2 border-black inline-flex items-center justify-center text-sm font-black">
                                  {env.sessionPeriod === 'MORNING' ? '✓' : '\u00A0'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-[11px] uppercase">
                                  Afternoon
                                </span>
                                <span className="w-6 h-6 border-2 border-black inline-flex items-center justify-center text-sm font-black">
                                  {env.sessionPeriod === 'AFTERNOON' ? '✓' : '\u00A0'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Envelope Number */}
                          <div className="sm:col-span-3 flex items-center justify-between gap-1">
                            <div>
                              <span className="font-black uppercase block text-[11px]">
                                7. Envelope No:
                              </span>
                              <span className="text-[9px] font-bold block">
                                (Namba ya Bahasha):
                              </span>
                            </div>
                            <div className="font-black text-xs flex items-center gap-1">
                              <span className="border-b-2 border-black min-w-[24px] text-center inline-block">
                                {env.envelopeNo || '___'}
                              </span>
                              <span>of</span>
                              <span className="border-b-2 border-black min-w-[24px] text-center inline-block">
                                {env.totalEnvelopes || '___'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ===============================================================
                  SECTION 3: UTARATIBU WA MFULULIZO WA NAMBA ZA WATAHINIWA (CANDIDATE RANGE)
                 =============================================================== */}
              <div className="mb-3">
                <div className="bg-neutral-200 border-2 border-b-0 border-black px-2.5 py-1 text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                  <span>
                    SECTION B: CANDIDATE SERIAL NUMBER RANGE IN THIS ENVELOPE (MFULULIZO WA NAMBA ZA WATAHINIWA)
                  </span>
                  <span>CLASS / FORM: {env.className || '__________'}</span>
                </div>
                <div className="border-2 border-black p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                  <div className="flex items-center justify-between gap-2 border-b sm:border-b-0 sm:border-r-2 border-black pb-2 sm:pb-0 sm:pr-4">
                    <div>
                      <span className="text-xs font-black uppercase block">
                        Kuanzia Namba (From Cand. No.):
                      </span>
                      <span className="text-[10px] font-semibold">
                        First Candidate Number in this Envelope
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-black">
                      <span className="px-1.5 py-1 border-2 border-black bg-neutral-100">
                        {env.centrePrefix || 'S'}.
                      </span>
                      <span className="w-16 h-8 border-2 border-black inline-flex items-center justify-center">
                        {env.centreDigits.some(Boolean)
                          ? env.centreDigits.join('')
                          : '\u00A0'}
                      </span>
                      <span className="text-base font-black">/</span>
                      <span className="w-20 h-8 border-2 border-black inline-flex items-center justify-center">
                        {env.fromCandNo || '\u00A0'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black uppercase block">
                        Hadi Namba (To Cand. No.):
                      </span>
                      <span className="text-[10px] font-semibold">
                        Last Candidate Number in this Envelope
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-black">
                      <span className="px-1.5 py-1 border-2 border-black bg-neutral-100">
                        {env.centrePrefix || 'S'}.
                      </span>
                      <span className="w-16 h-8 border-2 border-black inline-flex items-center justify-center">
                        {env.centreDigits.some(Boolean)
                          ? env.centreDigits.join('')
                          : '\u00A0'}
                      </span>
                      <span className="text-base font-black">/</span>
                      <span className="w-20 h-8 border-2 border-black inline-flex items-center justify-center">
                        {env.toCandNo || '\u00A0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  SECTION 4: TAKWIMU ZA WANAFUNZI NA MAJIBU (SCRIPTS ACCOUNTABILITY TABLE)
                 =============================================================== */}
              <div className="mb-3">
                <div className="bg-black text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider">
                  SECTION C: SCRIPTS ACCOUNTABILITY &amp; CANDIDATES SUMMARY (TAKWIMU ZA WATAHINIWA NA SCRIPTS ZA MAJIBU)
                </div>

                <table className="w-full border-collapse border-2 border-black text-center">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] sm:text-[11px] font-black uppercase">
                      <th className="border-2 border-black p-2 w-1/4">
                        Jumla ya Watahiniwa Waliosajiliwa
                        <span className="block text-[9px] font-bold mt-0.5">
                          (Total Registered Candidates)
                        </span>
                      </th>
                      <th className="border-2 border-black p-2 w-1/4">
                        Watahiniwa Waliofanya Mtihani
                        <span className="block text-[9px] font-bold mt-0.5">
                          (Candidates Present / Sat)
                        </span>
                      </th>
                      <th className="border-2 border-black p-2 w-1/4">
                        Watahiniwa Waliokosekana / Watoro
                        <span className="block text-[9px] font-bold mt-0.5">
                          (Candidates Absent)
                        </span>
                      </th>
                      <th className="border-2 border-black p-2 w-1/4 bg-neutral-200">
                        Idadi Kamili ya Script Zilizopo Ndani ya Bahasha Hii
                        <span className="block text-[9px] font-bold mt-0.5">
                          (Number of Scripts Enclosed)
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-2 border-black h-12 text-base font-black">
                        {env.totalRegistered || '\u00A0'}
                      </td>
                      <td className="border-2 border-black h-12 text-base font-black">
                        {env.totalPresent || '\u00A0'}
                      </td>
                      <td className="border-2 border-black h-12 text-base font-black">
                        {env.totalAbsent || '\u00A0'}
                      </td>
                      <td className="border-2 border-black h-12 text-base font-black bg-neutral-50">
                        {env.scriptsEnclosed || '\u00A0'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ABSENTEE CANDIDATE NUMBERS BOX */}
                <div className="border-2 border-t-0 border-black p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase">
                      ORODHA YA NAMBA ZA WATAHINIWA WALIOKOSEKANA / WATORO (ABSENTEE CANDIDATE NUMBERS):
                    </span>
                    <span className="text-[10px] font-bold italic">
                      (Kama hakuna mtoro andika &ldquo;NIL / HAKUNA&rdquo;)
                    </span>
                  </div>

                  {/* Grid of numbered slots for writing absentee numbers clearly */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {Array.from({ length: absenteeSlotsCount }).map((_, idx) => (
                      <div
                        key={idx}
                        className="border border-black h-7 px-1.5 flex items-center gap-1 text-[10px]"
                      >
                        <span className="font-bold text-neutral-600 shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="font-black flex-1 truncate">
                          {env.absenteeNumbers[idx] || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  SECTION 5: TAMKO LA MSIMAMIZI MKUU / WASIMAMIZI (DECLARATION & STAMP)
                 =============================================================== */}
              <div>
                <div className="bg-black text-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wider">
                  SECTION D: INVIGILATOR&apos;S DECLARATION &amp; CERTIFICATION (TAMKO LA WASIMAMIZI NA UTHIBITISHO)
                </div>

                <div className="border-2 border-black p-3 space-y-3">
                  {/* Declaration Statement */}
                  <div className="text-[11px] leading-snug space-y-1 border-b border-black pb-2">
                    <p className="font-bold">
                      <strong>DECLARATION:</strong> I/We hereby certify that the candidate answer scripts enclosed in this envelope have been accurately counted, checked against the attendance sheet, arranged in consecutive examination number order, and sealed in the examination room in the presence of the invigilators.
                    </p>
                    <p className="italic font-semibold">
                      <strong>TAMKO RASMI:</strong> Ninathibitisha / Tunathibitisha kuwa scripts za majibu ya watahiniwa zilizofungwa ndani ya bahasha hii zimehesabiwa kwa usahihi, zimehakikiwa na kupangwa kwa mfuatano wa namba za watahiniwa, na kufungwa kwa uaminifu mbele ya wasimamizi wa chumba cha mtihani.
                    </p>
                  </div>

                  {/* Signatures (Left 65%) + Official Centre Stamp Box (Right 35%) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch pt-1">
                    {/* Left: Supervisor & Assistant Invigilator Details */}
                    <div className="sm:col-span-8 flex flex-col justify-between space-y-3">
                      {/* 1. Supervisor / Invigilator-in-Charge */}
                      <div className="border border-black p-2.5 space-y-2.5">
                        <div className="text-[10px] font-black uppercase bg-neutral-100 px-2 py-0.5 border-b border-black -mx-2.5 -mt-2.5 mb-2">
                          1. MSIMAMIZI MKUU (SUPERVISOR / INVIGILATOR-IN-CHARGE)
                        </div>
                        <div className="flex items-baseline gap-2 text-xs">
                          <span className="font-black uppercase shrink-0">
                            Jina Kamili (Full Name):
                          </span>
                          <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] px-1 font-black uppercase">
                            {env.supervisorName || '\u00A0'}
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-baseline text-xs pt-1">
                          <div className="col-span-7 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Sahihi (Signature):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px]" />
                          </div>
                          <div className="col-span-5 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Tarehe (Date):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] text-center font-bold text-[11px]">
                              {env.supervisorDate || '___/___/20__'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Assistant Invigilator */}
                      <div className="border border-black p-2 space-y-2">
                        <div className="text-[10px] font-black uppercase bg-neutral-100 px-2 py-0.5 border-b border-black -mx-2 -mt-2 mb-1.5">
                          2. MSIMAMIZI MSAIDIZI (ASSISTANT INVIGILATOR)
                        </div>
                        <div className="flex items-baseline gap-2 text-xs">
                          <span className="font-black uppercase shrink-0">
                            Jina Kamili (Full Name):
                          </span>
                          <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] px-1 font-black uppercase">
                            {env.assistantInvigilatorName || '\u00A0'}
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-baseline text-xs pt-0.5">
                          <div className="col-span-7 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Sahihi (Signature):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px]" />
                          </div>
                          <div className="col-span-5 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Tarehe (Date):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] text-center font-bold text-[11px]">
                              {env.assistantDate || '___/___/20__'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Candidate Representative Witness */}
                      <div className="border border-black p-2 space-y-2">
                        <div className="text-[10px] font-black uppercase bg-neutral-100 px-2 py-0.5 border-b border-black -mx-2 -mt-2 mb-1.5">
                          3. SHUHUDA WA MWANAFUNZI / MTANIWA (CANDIDATE WITNESS)
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-baseline text-xs">
                          <div className="col-span-7 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Jina Kamili (Full Name):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] px-1 font-black uppercase">
                              {env.candidateWitnessName || '\u00A0'}
                            </div>
                          </div>
                          <div className="col-span-5 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Namba (Cand. No):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] px-1 font-black text-center">
                              {env.candidateWitnessCandNo || '\u00A0'}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-baseline text-xs pt-0.5">
                          <div className="col-span-7 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Sahihi (Signature):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px]">
                              {env.candidateWitnessSignature || '\u00A0'}
                            </div>
                          </div>
                          <div className="col-span-5 flex items-baseline gap-1.5">
                            <span className="font-black uppercase shrink-0">
                              Tarehe (Date):
                            </span>
                            <div className="flex-1 border-b-2 border-dotted border-black min-h-[20px] text-center font-bold text-[11px]">
                              {env.candidateWitnessDate || env.supervisorDate || '___/___/20__'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Large Rectangular Box for Official Centre Stamp */}
                    <div className="sm:col-span-4 border-2 border-black flex flex-col justify-between p-2.5 min-h-[155px] text-center bg-white">
                      <div className="text-[10px] font-black uppercase border-b border-black pb-1">
                        MUHURI RASMI WA KITUO
                        <span className="block text-[9px] font-bold">
                          (OFFICIAL CENTRE / SCHOOL STAMP)
                        </span>
                      </div>

                      <div className="my-auto py-6 text-[10px] text-neutral-400 font-bold uppercase tracking-widest select-none">
                        [ GONGA MUHURI HAPA ]
                      </div>

                      <div className="text-[9px] font-bold border-t border-dotted border-black pt-1">
                        Academic Office / Examination Centre Verification
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
