import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Printer,
  Users,
  CheckSquare,
  Square,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  Building2,
  Calendar,
  UserCheck,
  Scissors,
  Copy,
  Check,
  Filter,
  Layers,
  Eye,
  Edit3
} from 'lucide-react';
import { Student, SchoolInfo, Teacher, StreamSetting, CommunicationTemplate } from '../types';

interface OfficialLettersViewProps {
  students: Student[];
  teachers: Teacher[];
  schoolInfo: SchoolInfo;
  streamSettings?: StreamSetting[];
  communicationTemplates?: CommunicationTemplate[];
  onUpdateCommunicationTemplates?: (templates: CommunicationTemplate[]) => void;
}

interface LetterPreset {
  id: string;
  title: string;
  category: string;
  refPrefix: string;
  subject: string;
  body: string;
  signatoryRole: string;
  includeReturnSlip: boolean;
}

const DEFAULT_LETTER_PRESETS: LetterPreset[] = [
  {
    id: 'wito_mzazi',
    title: 'Barua ya Wito wa Mzazi / Mlezi',
    category: 'Nidhamu & Maendeleo',
    refPrefix: 'SHULE/WITO',
    subject: 'WITO WA KUFIKA SHULENI KWA AJILI YA MWANAFUNZI {JINA_MWANAFUNZI} ({DARASA})',
    body: `Uongozi wa {JINA_SHULE} unakuomba kufika shuleni bila kukosa siku ya ___________________ tarehe ___________________ saa 03:00 Asubuhi kwa ajili ya mazungumzo muhimu yanayohusu maendeleo ya kitaaluma na nidhamu ya mwanao {JINA_MWANAFUNZI} anayesoma {DARASA} ({MKONDO}) mwenye namba ya usajili {NAMBA_USAJILI}.

Uwepo wako ni wa lazima sana ili tuweze kushirikiana katika kumjenga na kumساidia mwanafunzi huyu kufikia malengo yake ya kielimu. Tafadhali fika ofisi ya Mkuu wa Shule / Mwalimu wa Nidhamu unapowasili.

Tunatanguliza shukrani kwa ushirikiano wako mzuri katika malezi ya mwanao.`,
    signatoryRole: 'Mkuu wa Shule',
    includeReturnSlip: true
  },
  {
    id: 'kikao_darasa',
    title: 'Barua ya Kikao cha Wazazi wa Darasa',
    category: 'Kikao cha Wazazi',
    refPrefix: 'SHULE/KIKAO',
    subject: 'MWALIKO WA KIKAO CHA WAZAZI WA WANAFUNZI WA {DARASA}',
    body: `Uongozi wa {JINA_SHULE} unayo furaha kukualika wewe Mzazi / Mlezi wa mwanafunzi {JINA_MWANAFUNZI} ({DARASA} - {MKONDO}) kwenye kikao maalum cha wazazi wa darasa hili kitakachofanyika hapa shuleni siku ya ___________________ tarehe ___________________ kuanzia saa 03:00 Asubuhi.

Ajenda kuu za kikao hiki ni:
1. Kujadili maendeleo ya taaluma na matokeo ya mitihani ya mwanao {JINA_MWANAFUNZI}.
2. Mikakati ya kuongeza ufaulu na ufuatiliaji wa mahudhurio na nidhamu.
3. Ushirikiano kati ya walimu na wazazi wa {DARASA}.

Tafadhali zingatia muda. Kufika kwako ndiko mafanikio ya mwanao.`,
    signatoryRole: 'Mkuu wa Shule',
    includeReturnSlip: true
  },
  {
    id: 'kumbusho_ada',
    title: 'Barua ya Kumbusho la Ada na Michango',
    category: 'Fedha & Michango',
    refPrefix: 'SHULE/FEDHA',
    subject: 'KUMBUSHO LA KUKAMILISHA MICHANGO YA SHULE KWA MWANAFUNZI {JINA_MWANAFUNZI}',
    body: `Ofisi ya Uhasibu na Uongozi wa {JINA_SHULE} inapenda kukukumbusha Mzazi / Mlezi wa mwanafunzi {JINA_MWANAFUNZI} anayesoma {DARASA} ({MKONDO}) kukamilisha malipo ya ada na michango ya shule kwa muhula huu kabla ya tarehe ___________________.

Utekelezaji wa malipo haya kwa wakati unaiwezesha shule kumpatia mwanao {JINA_MWANAFUNZI} huduma zote muhimu za kitaaluma na mitihani bila vikwazo vyovyote.

Iwapo tayari umeshakamilisha malipo haya hivi karibuni, tafadhali wasilisha stakabadhi (risiti) ya malipo ofisi ya Mhasibu wa Shule.`,
    signatoryRole: 'Mkuu wa Shule',
    includeReturnSlip: false
  },
  {
    id: 'kufunga_shule',
    title: 'Barua ya Likizo na Maelekezo ya Kufunga Shule',
    category: 'Taaluma & Likizo',
    refPrefix: 'SHULE/LIKIZO',
    subject: 'TAARIFA YA KUFUNGA SHULE NA MAELEKEZO YA LIKIZO KWA {JINA_MWANAFUNZI}',
    body: `Uongozi wa {JINA_SHULE} unakutaarifu Mzazi / Mlezi wa {JINA_MWANAFUNZI} ({DARASA} - {MKONDO}) kuwa shule imefungwa rasmi kwa ajili ya mapumziko ya muhula kuanzia tarehe ___________________ na itafunguliwa tena tarehe ___________________ saa 01:30 Asubuhi.

Wakati wote wa likizo, tunakuomba kuhakikisha mwanafunzi {JINA_MWANAFUNZI} anafanya kazi zote za likizo (Holiday Package) alizopewa na walimu wake na kuzingatia maadili mema. Mwanafunzi arudi shuleni akiwa na vifaa kamili vya darasani na sare safi.`,
    signatoryRole: 'Mkuu wa Shule',
    includeReturnSlip: false
  },
  {
    id: 'nidhamu_onyo',
    title: 'Barua ya Taarifa ya Nidhamu / Mahudhurio',
    category: 'Nidhamu & Mahudhurio',
    refPrefix: 'SHULE/NIDHAMU',
    subject: 'TAARIFA YA MWENENDO NA MAHUDHURIO YA MWANAFUNZI {JINA_MWANAFUNZI}',
    body: `Kamati ya Nidhamu na Malezi ya {JINA_SHULE} inapenda kukufahamisha Mzazi / Mlezi kuhusu mwenendo wa mwanao {JINA_MWANAFUNZI} wa {DARASA} ({MKONDO}) mwenye namba ya usajili {NAMBA_USAJILI}.

Katika ufuatiliaji wetu wa karibu, imebainika kuwa mwanafunzi anahitaji usimamizi wa ziada katika suala la: _________________________________________________________________________.

Tunaomba ushirikiane na Ofisi ya Nidhamu na Mwalimu wa Darasa la {DARASA} kuhakikisha mwanafunzi {JINA_MWANAFUNZI} anazingatia sheria na taratibu zote za shule.`,
    signatoryRole: 'Mwalimu wa Nidhamu',
    includeReturnSlip: true
  },
  {
    id: 'barua_maalum',
    title: 'Barua Maalum (Andika Mwenyewe)',
    category: 'Maalum',
    refPrefix: 'SHULE/BARUA',
    subject: 'TAARIFA MUHIMU KUHUSU MWANAFUNZI {JINA_MWANAFUNZI} ({DARASA})',
    body: `Ndugu Mzazi / Mlezi wa mwanafunzi {JINA_MWANAFUNZI} wa {DARASA} ({MKONDO}),

Uongozi wa {JINA_SHULE} unapenda kukufahamisha kuwa:

[Andika ujumbe wako hapa... Jina la kila mwanafunzi ({JINA_MWANAFUNZI}) litaingia moja kwa moja kwenye barua yake.]

Tunashukuru kwa ushirikiano wako.`,
    signatoryRole: 'Mkuu wa Shule',
    includeReturnSlip: false
  }
];

const PLACEHOLDER_TOKENS = [
  { token: '{JINA_MWANAFUNZI}', label: 'Jina la Mwanafunzi', desc: 'Jina kamili la kila mwanafunzi' },
  { token: '{DARASA}', label: 'Darasa', desc: 'Darasa analosoma (mf. Form 2)' },
  { token: '{MKONDO}', label: 'Mkondo', desc: 'Mkondo wake (mf. STREAM A)' },
  { token: '{NAMBA_USAJILI}', label: 'Namba ya Usajili', desc: 'Reg. No ya mwanafunzi' },
  { token: '{JINA_MZAZI}', label: 'Jina la Mzazi', desc: 'Jina la mzazi au mlezi' },
  { token: '{SIMU_MZAZI}', label: 'Simu ya Mzazi', desc: 'Namba ya simu ya mzazi' },
  { token: '{JINA_SHULE}', label: 'Jina la Shule', desc: 'Jina rasmi la shule' },
  { token: '{MKUU_WA_SHULE}', label: 'Mkuu wa Shule', desc: 'Jina la Mkuu wa Shule' },
  { token: '{TAREHE}', label: 'Tarehe ya Barua', desc: 'Tarehe iliyochaguliwa kwenye barua' }
];

export const OfficialLettersView: React.FC<OfficialLettersViewProps> = ({
  students,
  teachers,
  schoolInfo,
  streamSettings = [],
  communicationTemplates = [],
  onUpdateCommunicationTemplates
}) => {
  const todayIso = new Date().toISOString().split('T')[0];

  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [excludedStudentIds, setExcludedStudentIds] = useState<Set<number>>(new Set());

  // Letter content states
  const [activePresetId, setActivePresetId] = useState<string>('wito_mzazi');
  const [refPrefix, setRefPrefix] = useState<string>('SHULE/WITO');
  const [letterDate, setLetterDate] = useState<string>(todayIso);
  const [salutationPrefix, setSalutationPrefix] = useState<string>('KWA MZAZI / MLEZI WA MWANAFUNZI:');
  const [letterSubject, setLetterSubject] = useState<string>(DEFAULT_LETTER_PRESETS[0].subject);
  const [letterBody, setLetterBody] = useState<string>(DEFAULT_LETTER_PRESETS[0].body);
  const [closingText, setClosingText] = useState<string>('Wako katika ujenzi wa taifa na malezi ya wanafunzi,');
  const [signatoryRole, setSignatoryRole] = useState<string>('Mkuu wa Shule');
  const [signatoryName, setSignatoryName] = useState<string>(schoolInfo?.principal || '');
  const [includeReturnSlip, setIncludeReturnSlip] = useState<boolean>(true);
  const [lettersPerPage, setLettersPerPage] = useState<1 | 2>(1);

  // Preview navigation
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [showSaveFeedback, setShowSaveFeedback] = useState<boolean>(false);

  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Available classes from students & streamSettings
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    streamSettings.forEach(s => {
      if (s.className) classSet.add(s.className);
    });
    students.forEach(s => {
      if (s.className) classSet.add(s.className);
    });
    return Array.from(classSet);
  }, [students, streamSettings]);

  // Available streams for selected class
  const availableStreams = useMemo(() => {
    const streamSet = new Set<string>();
    students.forEach(s => {
      if (selectedClass === 'ALL' || s.className === selectedClass) {
        if (s.stream) streamSet.add(s.stream);
      }
    });
    streamSettings.forEach(st => {
      if (selectedClass === 'ALL' || st.className === selectedClass) {
        (st.streams || []).forEach(str => streamSet.add(str));
      }
    });
    return Array.from(streamSet);
  }, [students, streamSettings, selectedClass]);

  // Filtered students in the selected class/stream
  const classStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClass !== 'ALL' && s.className !== selectedClass) return false;
      if (selectedStream !== 'ALL' && (s.stream || 'STREAM A') !== selectedStream) return false;
      if (selectedGender !== 'ALL' && (s.gender || '').toLowerCase() !== selectedGender.toLowerCase()) return false;
      if (studentSearch.trim()) {
        const q = studentSearch.trim().toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchReg = (s.regNo || '').toLowerCase().includes(q);
        if (!matchName && !matchReg) return false;
      }
      return true;
    });
  }, [students, selectedClass, selectedStream, selectedGender, studentSearch]);

  // Final selected students for letter generation
  const targetStudents = useMemo(() => {
    return classStudents.filter(s => !excludedStudentIds.has(s.id));
  }, [classStudents, excludedStudentIds]);

  const currentPreviewStudent = targetStudents[previewIndex] || targetStudents[0] || null;

  const formatSwahiliDate = (isoDate: string) => {
    if (!isoDate) return new Date().toLocaleDateString('sw-TZ');
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Replace placeholders for a specific student
  const renderMergedText = (templateText: string, student: Student, index: number) => {
    if (!templateText) return '';
    const studentName = (student.name || student.fullName || 'MWANAFUNZI').toUpperCase();
    const className = student.className || 'Form 1';
    const stream = student.stream || 'STREAM A';
    const regNo = student.regNo || `S.${String(index + 1).padStart(4, '0')}`;
    const parentName = student.parentName || `Mzazi / Mlezi wa ${studentName}`;
    const parentPhone = student.parentPhone || student.phone || '________________';
    const schoolName = schoolInfo?.name || 'SHULE';
    const headName = signatoryName || schoolInfo?.principal || 'MKUU WA SHULE';
    const formattedDate = formatSwahiliDate(letterDate);

    return templateText
      .replace(/\{JINA_MWANAFUNZI\}/gi, studentName)
      .replace(/\{JINA\}/gi, studentName)
      .replace(/\{STUDENT_NAME\}/gi, studentName)
      .replace(/\{DARASA\}/gi, className)
      .replace(/\{CLASS\}/gi, className)
      .replace(/\{MKONDO\}/gi, stream)
      .replace(/\{STREAM\}/gi, stream)
      .replace(/\{NAMBA_USAJILI\}/gi, regNo)
      .replace(/\{REG_NO\}/gi, regNo)
      .replace(/\{JINA_MZAZI\}/gi, parentName)
      .replace(/\{SIMU_MZAZI\}/gi, parentPhone)
      .replace(/\{JINA_SHULE\}/gi, schoolName)
      .replace(/\{MKUU_WA_SHULE\}/gi, headName)
      .replace(/\{TAREHE\}/gi, formattedDate);
  };

  const handleSelectPreset = (preset: LetterPreset) => {
    setActivePresetId(preset.id);
    setRefPrefix(preset.refPrefix);
    setLetterSubject(preset.subject);
    setLetterBody(preset.body);
    setSignatoryRole(preset.signatoryRole);
    setIncludeReturnSlip(preset.includeReturnSlip);
  };

  const insertTokenIntoBody = (token: string) => {
    const el = bodyTextareaRef.current;
    if (!el) {
      setLetterBody(prev => `${prev} ${token}`);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const nextText = letterBody.substring(0, start) + token + letterBody.substring(end);
    setLetterBody(nextText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  const toggleStudentSelection = (id: number) => {
    setExcludedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllInClass = () => {
    setExcludedStudentIds(new Set());
  };

  const deselectAllInClass = () => {
    setExcludedStudentIds(new Set(classStudents.map(s => s.id)));
  };

  // Saved custom letter templates inside communicationTemplates
  const savedCustomLetters = useMemo(() => {
    return (communicationTemplates || []).filter(t => t.id.startsWith('official_letter_'));
  }, [communicationTemplates]);

  const handleSaveCurrentLetterTemplate = () => {
    if (!onUpdateCommunicationTemplates) return;
    const titleToUse = saveTitle.trim() || letterSubject.slice(0, 45) || 'Barua ya Shule';
    const newTemplate: CommunicationTemplate = {
      id: `official_letter_${Date.now()}`,
      name: titleToUse,
      type: 'SMS',
      category: 'Announcement',
      content: JSON.stringify({
        refPrefix,
        salutationPrefix,
        letterSubject,
        letterBody,
        closingText,
        signatoryRole,
        signatoryName,
        includeReturnSlip
      })
    };
    onUpdateCommunicationTemplates([newTemplate, ...(communicationTemplates || [])]);
    setSaveTitle('');
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 3000);
  };

  const handleLoadSavedTemplate = (tpl: CommunicationTemplate) => {
    try {
      const parsed = JSON.parse(tpl.content);
      if (parsed.refPrefix) setRefPrefix(parsed.refPrefix);
      if (parsed.salutationPrefix) setSalutationPrefix(parsed.salutationPrefix);
      if (parsed.letterSubject) setLetterSubject(parsed.letterSubject);
      if (parsed.letterBody) setLetterBody(parsed.letterBody);
      if (parsed.closingText) setClosingText(parsed.closingText);
      if (parsed.signatoryRole) setSignatoryRole(parsed.signatoryRole);
      if (parsed.signatoryName !== undefined) setSignatoryName(parsed.signatoryName);
      if (typeof parsed.includeReturnSlip === 'boolean') setIncludeReturnSlip(parsed.includeReturnSlip);
    } catch (e) {
      setLetterBody(tpl.content);
    }
  };

  const handleDeleteSavedTemplate = (id: string) => {
    if (!onUpdateCommunicationTemplates) return;
    onUpdateCommunicationTemplates((communicationTemplates || []).filter(t => t.id !== id));
  };

  // Print all generated letters cleanly via a hidden iframe (safe in AI Studio iframe environment)
  const handlePrintAllLetters = () => {
    if (targetStudents.length === 0) return;

    const yearStr = letterDate.split('-')[0] || new Date().getFullYear();
    const formattedDate = formatSwahiliDate(letterDate);
    const schoolName = (schoolInfo?.name || 'SHULE YA SEKONDARI').toUpperCase();
    const schoolAddress = schoolInfo?.address || 'S.L.P ______, TANZANIA';
    const schoolPhone = schoolInfo?.phone || '';
    const schoolEmail = schoolInfo?.email || '';
    const schoolMotto = schoolInfo?.motto || '';
    const schoolLogo = schoolInfo?.logo || '';

    const buildSingleLetterHtml = (student: Student, idx: number) => {
      const refNumber = `${refPrefix}/${yearStr}/${String(idx + 1).padStart(3, '0')}`;
      const studentName = (student.name || student.fullName || '').toUpperCase();
      const studentClass = student.className || '';
      const studentStream = student.stream || '';
      const studentReg = student.regNo || `S.${String(idx + 1).padStart(4, '0')}`;
      const mergedSubject = renderMergedText(letterSubject, student, idx);
      const mergedBody = renderMergedText(letterBody, student, idx)
        .split('\n')
        .map(line => line.trim() ? `<p style="margin: 0 0 10px 0; line-height: 1.65; text-align: justify;">${line}</p>` : '<div style="height: 8px;"></div>')
        .join('');

      const returnSlipHtml = includeReturnSlip
        ? `
          <div style="margin-top: 18px; padding-top: 12px; border-top: 1.5px dashed #334155; font-size: 11px;">
            <div style="font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.03em;">
              SEHEMU YA KURUDISHA SHULENI (UTHIBITISHO WA MZAZI / MLEZI)
            </div>
            <p style="margin: 0 0 8px 0; line-height: 1.5;">
              Mimi ________________________________________ Mzazi / Mlezi wa mwanafunzi <strong>${studentName}</strong> (${studentClass} - ${studentStream}, Reg: ${studentReg}), ninathibitisha kupokea barua yenye Kumb. Na. <strong>${refNumber}</strong> ya tarehe <strong>${formattedDate}</strong>.
            </p>
            <div style="display: flex; justify-content: space-between; margin-top: 10px;">
              <span>Simu ya Mzazi: ________________________</span>
              <span>Sahihi ya Mzazi: ________________________</span>
              <span>Tarehe: ____/____/${yearStr}</span>
            </div>
          </div>
        `
        : '';

      return `
        <div class="letter-card ${lettersPerPage === 2 ? 'half-page' : 'full-page'}">
          <!-- Official Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px double #0f172a; padding-bottom: 10px; margin-bottom: 14px;">
            <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;">
              ${
                schoolLogo
                  ? `<img src="${schoolLogo}" style="max-width: 68px; max-height: 68px; object-fit: contain;" />`
                  : `<div style="width: 60px; height: 60px; border: 2px solid #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; text-align: center;">LOGO</div>`
              }
            </div>
            <div style="flex: 1; text-align: center; padding: 0 12px;">
              <div style="font-size: 17px; font-weight: 900; letter-spacing: 0.04em; color: #0f172a;">${schoolName}</div>
              <div style="font-size: 12px; font-weight: 600; color: #334155; margin-top: 2px;">${schoolAddress}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                ${schoolPhone ? `Simu: ${schoolPhone}` : ''} ${schoolEmail ? ` | Barua Pepe: ${schoolEmail}` : ''}
              </div>
              ${schoolMotto ? `<div style="font-size: 11px; font-style: italic; color: #1e293b; margin-top: 2px;">"${schoolMotto}"</div>` : ''}
            </div>
            <div style="width: 72px; text-align: right; font-size: 10px; color: #475569;">
              <div style="border: 1px solid #cbd5e1; padding: 4px 6px; border-radius: 4px; text-align: center; font-weight: 700;">
                ${studentClass}<br/>${studentStream}
              </div>
            </div>
          </div>

          <!-- Ref & Date Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; font-size: 12.5px;">
            <div>
              <div><strong>Kumb. Na:</strong> ${refNumber}</div>
              <div style="margin-top: 2px;"><strong>Namba ya Usajili:</strong> ${studentReg}</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Tarehe:</strong> ${formattedDate}</div>
            </div>
          </div>

          <!-- Recipient Box (Auto-populated with Student Name) -->
          <div style="background: #f8fafc; border-left: 4px solid #0f172a; padding: 8px 12px; margin-bottom: 14px; font-size: 12.5px;">
            <div style="font-weight: 700; color: #334155;">${salutationPrefix}</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">
              ${studentName}
            </div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">
              Darasa: <strong>${studentClass}</strong> &nbsp;|&nbsp; Mkondo: <strong>${studentStream}</strong> &nbsp;|&nbsp; Reg No: <strong>${studentReg}</strong>
              ${student.parentPhone ? ` &nbsp;|&nbsp; Simu ya Mzazi: <strong>${student.parentPhone}</strong>` : ''}
            </div>
          </div>

          <!-- Salutation -->
          <div style="font-size: 13px; margin-bottom: 10px;">
            Ndugu Mzazi / Mlezi wa <strong>${studentName}</strong>,
          </div>

          <!-- Subject Line -->
          <div style="font-size: 13px; font-weight: 800; text-decoration: underline; margin-bottom: 12px; text-transform: uppercase; line-height: 1.4;">
            YAH: ${mergedSubject}
          </div>

          <!-- Body Paragraphs -->
          <div style="font-size: 13px; color: #0f172a;">
            ${mergedBody}
          </div>

          <!-- Sign-off & Stamp -->
          <div style="margin-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12.5px;">
            <div>
              <div style="margin-bottom: 24px;">${closingText}</div>
              <div>____________________________________</div>
              <div style="font-weight: 800; margin-top: 4px; text-transform: uppercase;">
                ${signatoryName || schoolInfo?.principal || '________________________'}
              </div>
              <div style="font-weight: 700; color: #334155; text-transform: uppercase; font-size: 11.5px;">
                ${signatoryRole}
              </div>
            </div>
            <div style="text-align: center;">
              <div style="width: 120px; height: 65px; border: 1.5px dashed #64748b; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #64748b; font-weight: 700;">
                MHURI WA SHULE<br/>(OFFICIAL STAMP)
              </div>
            </div>
          </div>

          ${returnSlipHtml}
        </div>
      `;
    };

    let pagesHtml = '';
    if (lettersPerPage === 1) {
      pagesHtml = targetStudents
        .map((st, idx) => `<div class="page-sheet">${buildSingleLetterHtml(st, idx)}</div>`)
        .join('');
    } else {
      for (let i = 0; i < targetStudents.length; i += 2) {
        const first = buildSingleLetterHtml(targetStudents[i], i);
        const second = targetStudents[i + 1]
          ? `<div style="border-top: 1.5px dashed #94a3b8; margin: 14px 0;"></div>${buildSingleLetterHtml(targetStudents[i + 1], i + 1)}`
          : '';
        pagesHtml += `<div class="page-sheet">${first}${second}</div>`;
      }
    }

    const htmlDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Barua za Wanafunzi - ${schoolName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm;
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .page-sheet {
              page-break-after: always;
              box-sizing: border-box;
            }
            .page-sheet:last-child {
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
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
    if (doc) {
      doc.open();
      doc.write(htmlDocument);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      }, 350);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
              <FileText className="w-4 h-4" />
              <span>Mfumo wa Barua za Wazazi & Wito (Auto Mail-Merge)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Andika Barua Moja — Mfumo Uzae Barua yenye Jina la Kila Mwanafunzi
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Andika barua moja tu (kama Barua ya Wito, Kikao cha Wazazi, Likizo au Ada), chagua darasa, na mfumo utaingiza moja kwa moja jina kamili, darasa, mkondo na namba ya usajili ya kila mwanafunzi kwenye barua yake binafsi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-4 py-2.5 text-right">
              <div className="text-xs text-slate-400">Barua Zilizotayari Kuchapishwa</div>
              <div className="text-xl font-bold text-amber-400">
                Wanafunzi {targetStudents.length}
              </div>
            </div>
            <button
              onClick={handlePrintAllLetters}
              disabled={targetStudents.length === 0}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-3 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              <span>Chapisha Barua Zote ({targetStudents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Quick Letter Type Presets */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>1. Chagua Aina ya Barua (Au Andika Barua Yoyote Mpya)</span>
          </h2>
          <span className="text-xs text-slate-500">
            Bonyeza kiolezo kujaza mfano wa barua kisha uhariri utakavyo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEFAULT_LETTER_PRESETS.map(preset => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="text-xs font-medium opacity-75 mb-0.5">{preset.category}</div>
                <div className="font-bold text-sm">{preset.title}</div>
              </button>
            );
          })}
        </div>

        {savedCustomLetters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Barua Ulizohifadhi Shuleni ({savedCustomLetters.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {savedCustomLetters.map(tpl => (
                <div
                  key={tpl.id}
                  className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800"
                >
                  <button
                    onClick={() => handleLoadSavedTemplate(tpl)}
                    className="hover:underline font-semibold cursor-pointer"
                  >
                    {tpl.name}
                  </button>
                  <button
                    onClick={() => handleDeleteSavedTemplate(tpl.id)}
                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                    title="Futa barua hii"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Grid: Left = Class & Letter Editor, Right = Live Personalized Student Letters */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Target Class Selection + Single Letter Editor */}
        <div className="xl:col-span-5 space-y-6">
          {/* Target Class & Students Filter Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>2. Chagua Darasa & Wanafunzi</span>
              </h3>
              <span className="text-xs font-semibold text-blue-700">
                Wamechaguliwa: {targetStudents.length} / {classStudents.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Darasa</label>
                <select
                  value={selectedClass}
                  onChange={e => {
                    setSelectedClass(e.target.value);
                    setSelectedStream('ALL');
                    setExcludedStudentIds(new Set());
                    setPreviewIndex(0);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">Madarasa Yote ({students.length})</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      {cls} ({students.filter(s => s.className === cls).length})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mkondo (Stream)</label>
                <select
                  value={selectedStream}
                  onChange={e => {
                    setSelectedStream(e.target.value);
                    setPreviewIndex(0);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">Mikondo Yote</option>
                  {availableStreams.map(str => (
                    <option key={str} value={str}>
                      {str}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jinsia</label>
                <select
                  value={selectedGender}
                  onChange={e => {
                    setSelectedGender(e.target.value);
                    setPreviewIndex(0);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">Wote (KE & ME)</option>
                  <option value="Male">Wavulana Pekee</option>
                  <option value="Female">Wasichana Pekee</option>
                </select>
              </div>
            </div>

            {/* Student search & checklist */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Tafuta jina la mwanafunzi au namba..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <button
                  onClick={selectAllInClass}
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                >
                  Chagua Wote
                </button>
                <button
                  onClick={deselectAllInClass}
                  className="px-2.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                >
                  Ondoa Wote
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                {classStudents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Hakuna wanafunzi waliopatikana kwenye chujio hili.
                  </div>
                ) : (
                  classStudents.map((st, idx) => {
                    const isChecked = !excludedStudentIds.has(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleStudentSelection(st.id)}
                        className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-slate-400 font-mono">{idx + 1}.</span>
                          <span className={`font-semibold truncate ${isChecked ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                            {st.name}
                          </span>
                        </div>
                        <span className="text-slate-500 shrink-0 ml-2">
                          {st.className} · {st.stream || 'A'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Letter Content Editor Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>3. Hariri Barua Yako Moja Hapa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kumbukumbu Na. (Ref Prefix)
                </label>
                <input
                  type="text"
                  value={refPrefix}
                  onChange={e => setRefPrefix(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="SHULE/WITO"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tarehe ya Barua
                </label>
                <input
                  type="date"
                  value={letterDate}
                  onChange={e => setLetterDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kichwa cha Habari cha Barua (YAH:)
              </label>
              <input
                type="text"
                value={letterSubject}
                onChange={e => setLetterSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                placeholder="WITO WA MZAZI KWA MWANAFUNZI {JINA_MWANAFUNZI}"
              />
            </div>

            {/* Auto-Insert Variable Buttons */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3">
              <div className="text-xs font-bold text-amber-900 mb-2">
                Bonyeza kuingiza jina la mwanafunzi au taarifa kiotomatiki kwenye sentensi:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDER_TOKENS.map(item => (
                  <button
                    key={item.token}
                    type="button"
                    onClick={() => insertTokenIntoBody(item.token)}
                    title={item.desc}
                    className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-amber-100 text-slate-900 border border-amber-300 rounded-md transition-colors cursor-pointer"
                  >
                    + {item.label} ({item.token})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mwili wa Barua (Ujumbe Mkuu)
              </label>
              <textarea
                ref={bodyTextareaRef}
                rows={8}
                value={letterBody}
                onChange={e => setLetterBody(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Andika barua yako hapa..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Kidokezo: Kila mahali ulipoandika <strong>{'{JINA_MWANAFUNZI}'}</strong> au hata usipoandika, jina la kila mwanafunzi wa darasa ulilochagua litawekwa juu ya barua yake moja kwa moja.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Cheo cha Mtia Sahihi
                </label>
                <select
                  value={signatoryRole}
                  onChange={e => setSignatoryRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="Mkuu wa Shule">Mkuu wa Shule (Headmaster)</option>
                  <option value="Makamu Mkuu wa Shule">Makamu Mkuu wa Shule (Second Master)</option>
                  <option value="Mwalimu wa Nidhamu">Mwalimu wa Nidhamu (Discipline Master)</option>
                  <option value="Mwalimu wa Taaluma">Mwalimu wa Taaluma (Academic Master)</option>
                  <option value="Mwalimu wa Darasa">Mwalimu wa Darasa (Class Teacher)</option>
                  <option value="Mhasibu wa Shule">Mhasibu wa Shule (School Bursar)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jina la Mtia Sahihi
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={e => setSignatoryName(e.target.value)}
                  placeholder={schoolInfo?.principal || 'Jina la Mkuu wa Shule / Mwalimu'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReturnSlip}
                  onChange={e => setIncludeReturnSlip(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Weka Kipande cha Mzazi Kurudisha Shuleni Chini ya Barua</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Mpangilio wa Ukurasa:</span>
                <button
                  type="button"
                  onClick={() => setLettersPerPage(1)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    lettersPerPage === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Barua 1 kwa Ukurasa
                </button>
                <button
                  type="button"
                  onClick={() => setLettersPerPage(2)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    lettersPerPage === 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Barua 2 kwa Ukurasa
                </button>
              </div>
            </div>

            {/* Save Template Row */}
            {onUpdateCommunicationTemplates && (
              <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  placeholder="Jina la kuhifadhi barua hii (mf. Barua ya Wito Form 2)..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentLetterTemplate}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Hifadhi Kiolezo</span>
                </button>
                {showSaveFeedback && (
                  <span className="text-xs font-semibold text-emerald-600">Imehifadhiwa!</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Live Preview of Individual Student Letters */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800">
                Hakiki ya Barua za Wanafunzi ({targetStudents.length})
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    viewMode === 'single' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Barua Moja-Moja
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Onyesha Zote ({targetStudents.length})
                </button>
              </div>
            </div>

            {viewMode === 'single' && targetStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                  disabled={previewIndex <= 0}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={previewIndex}
                  onChange={e => setPreviewIndex(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                >
                  {targetStudents.map((st, idx) => (
                    <option key={st.id} value={idx}>
                      {idx + 1}. {st.name} ({st.className})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setPreviewIndex(prev => Math.min(targetStudents.length - 1, prev + 1))}
                  disabled={previewIndex >= targetStudents.length - 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {targetStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-base font-bold text-slate-800">
                Hakuna Mwanafunzi Aliyechaguliwa
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tafadhali chagua darasa au bonyeza "Chagua Wote" upande wa kushoto ili mfumo uzae barua yenye jina la kila mwanafunzi.
              </p>
            </div>
          ) : viewMode === 'single' && currentPreviewStudent ? (
            /* Single Student A4 Official Letter Preview */
            <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-8 sm:p-10 font-serif text-slate-900">
              {/* Official School Letterhead */}
              <div className="flex items-center justify-between border-b-4 border-double border-slate-900 pb-4 mb-5">
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  {schoolInfo?.logo ? (
                    <img
                      src={schoolInfo.logo}
                      alt="School Logo"
                      className="max-w-16 max-h-16 object-contain"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-center">
                      NEMBO YA SHULE
                    </div>
                  )}
                </div>

                <div className="text-center px-3 flex-1">
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
                    {schoolInfo?.name || 'SHULE YA SEKONDARI'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    {schoolInfo?.address || 'S.L.P ______, TANZANIA'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {schoolInfo?.phone ? `Simu: ${schoolInfo.phone}` : ''}
                    {schoolInfo?.email ? ` | Barua Pepe: ${schoolInfo.email}` : ''}
                  </p>
                  {schoolInfo?.motto && (
                    <p className="text-xs italic text-slate-800 mt-0.5">"{schoolInfo.motto}"</p>
                  )}
                </div>

                <div className="w-20 text-right shrink-0">
                  <div className="border border-slate-300 rounded px-2 py-1 text-center text-[11px] font-sans font-bold text-slate-700">
                    Barua #{previewIndex + 1}
                    <div className="text-[10px] font-normal text-slate-500">
                      kati ya {targetStudents.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ref & Date */}
              <div className="flex justify-between items-start text-xs sm:text-sm mb-5">
                <div>
                  <div>
                    <strong>Kumb. Na:</strong> {refPrefix}/{letterDate.split('-')[0] || '2026'}/
                    {String(previewIndex + 1).padStart(3, '0')}
                  </div>
                  <div className="mt-0.5">
                    <strong>Namba ya Usajili:</strong>{' '}
                    {currentPreviewStudent.regNo || `S.${String(previewIndex + 1).padStart(4, '0')}`}
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <strong>Tarehe:</strong> {formatSwahiliDate(letterDate)}
                  </div>
                </div>
              </div>

              {/* Highlighted Student Recipient Block */}
              <div className="bg-slate-50 border-l-4 border-slate-900 p-3.5 mb-5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {salutationPrefix}
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {(currentPreviewStudent.name || currentPreviewStudent.fullName || '').toUpperCase()}
                </div>
                <div className="text-xs text-slate-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Darasa: <strong>{currentPreviewStudent.className}</strong>
                  </span>
                  <span>
                    Mkondo: <strong>{currentPreviewStudent.stream || 'STREAM A'}</strong>
                  </span>
                  <span>
                    Reg No: <strong>{currentPreviewStudent.regNo || '—'}</strong>
                  </span>
                  {currentPreviewStudent.parentPhone && (
                    <span>
                      Simu ya Mzazi: <strong>{currentPreviewStudent.parentPhone}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Salutation */}
              <div className="text-sm mb-3">
                Ndugu Mzazi / Mlezi wa{' '}
                <strong>{(currentPreviewStudent.name || '').toUpperCase()}</strong>,
              </div>

              {/* Subject */}
              <div className="text-sm font-black underline uppercase mb-4 leading-snug">
                YAH: {renderMergedText(letterSubject, currentPreviewStudent, previewIndex)}
              </div>

              {/* Body Paragraphs */}
              <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-900">
                {renderMergedText(letterBody, currentPreviewStudent, previewIndex)
                  .split('\n')
                  .map((line, i) =>
                    line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-2" />
                  )}
              </div>

              {/* Sign-off & Official Stamp */}
              <div className="mt-8 flex items-end justify-between gap-4 text-sm">
                <div>
                  <p className="mb-6">{closingText}</p>
                  <div className="text-slate-400">____________________________________</div>
                  <div className="font-bold uppercase mt-1">
                    {signatoryName || schoolInfo?.principal || '________________________'}
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-600">{signatoryRole}</div>
                </div>

                <div className="w-32 h-20 border-2 border-dashed border-slate-400 rounded-lg flex items-center justify-center text-center text-[10px] font-sans font-bold text-slate-500 p-2">
                  MHURI WA SHULE
                  <br />
                  (OFFICIAL STAMP)
                </div>
              </div>

              {/* Tear-off Parent Return Slip */}
              {includeReturnSlip && (
                <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-400 text-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-slate-800 mb-2">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Sehemu ya Kurudisha Shuleni (Uthibitisho wa Mzazi / Mlezi)</span>
                  </div>
                  <p className="leading-relaxed">
                    Mimi ________________________________________ Mzazi / Mlezi wa mwanafunzi{' '}
                    <strong>{(currentPreviewStudent.name || '').toUpperCase()}</strong> (
                    {currentPreviewStudent.className} - {currentPreviewStudent.stream || 'STREAM A'}),
                    ninathibitisha kupokea barua yenye Kumb. Na.{' '}
                    <strong>
                      {refPrefix}/{letterDate.split('-')[0] || '2026'}/
                      {String(previewIndex + 1).padStart(3, '0')}
                    </strong>{' '}
                    ya tarehe <strong>{formatSwahiliDate(letterDate)}</strong>.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                    <div>Simu: ___________________</div>
                    <div>Sahihi: ___________________</div>
                    <div>Tarehe: ____/____/2026</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* All Generated Student Letters Summary List / Multi-Preview */
            <div className="space-y-4 max-h-[820px] overflow-y-auto pr-1">
              {targetStudents.map((st, idx) => (
                <div
                  key={st.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-xs font-bold text-amber-700 mr-2">
                        Barua #{idx + 1}
                      </span>
                      <span className="text-sm font-black text-slate-900 uppercase">
                        {st.name}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        ({st.className} · {st.stream || 'STREAM A'} · {st.regNo})
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setPreviewIndex(idx);
                        setViewMode('single');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      Fungua Barua Kamili
                    </button>
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-800">
                    YAH: {renderMergedText(letterSubject, st, idx)}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {renderMergedText(letterBody, st, idx)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
