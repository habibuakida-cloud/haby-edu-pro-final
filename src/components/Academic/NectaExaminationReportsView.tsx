import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Users,
  Package,
  AlertTriangle,
  HeartPulse,
  PenTool,
  ChevronRight,
  ChevronLeft,
  Save,
  RotateCcw,
  Eye,
  Edit3,
  UserPlus,
  Calculator
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolInfo, Student, Teacher, UserAccount } from '../../types';

export type NectaExamType = 'SFNA' | 'PSLE' | 'FTNA' | 'CSEE' | 'ACSEE';

export interface NectaInvigilatorRow {
  id: string;
  fullName: string;
  role: 'Msimamizi Mkuu' | 'Mkuu wa Shule' | 'Msimamizi';
  workstation: string;
  roomAssigned: string;
  phone: string;
}

export interface NectaLabSpecialistRow {
  id: string;
  fullName: string;
  workstation: string;
  subjectPrepared: string;
  phone: string;
}

export interface NectaSubjectAttendanceRow {
  id: string;
  subjectName: string;
  regMale: number;
  regFemale: number;
  regTotal: number;
  satMale: number;
  satFemale: number;
  satTotal: number;
  absMale: number;
  absFemale: number;
  absTotal: number;
  absentCandidateNumbers: string;
  envelopesCount: number;
}

export interface NectaStationeryRow {
  id: string;
  itemName: string;
  received: number;
  used: number;
  remaining: number;
  shortage: number;
  remarks: string;
}

export interface NectaRegistrationDefectRow {
  id: string;
  candidateNumber: string;
  candidateName: string;
  defectType: string;
  resolutionAndRecommendation: string;
}

export interface NectaNonCalCandidateRow {
  id: string;
  candidateName: string;
  qualification: string;
  gender: 'Me' | 'Ke';
  examNumberUsed: string;
  subjectsTaken: string;
}

export interface NectaWrongNumberCandidateRow {
  id: string;
  candidateName: string;
  correctCalNumber: string;
  wrongNumberUsed: string;
  subjectsAffected: string;
}

export interface NectaMalpracticeRow {
  id: string;
  incidentDate: string;
  candidateNumberAndName: string;
  subjectName: string;
  allegationDetails: string;
  actionsTaken: string;
  attachedEvidenceList: string;
}

export interface NectaSickCandidateRow {
  id: string;
  candidateNumber: string;
  candidateName: string;
  gender: 'Me' | 'Ke';
  subjectsMissed: string;
  illnessDetails: string;
  supervisorRemarks: string;
}

export interface NectaEmergencySickDuringExamRow {
  id: string;
  candidateNumberAndName: string;
  subjectAndDate: string;
  timeFellIll: string;
  timeResumedOrTreated: string;
  extraMinutesGranted: string;
  supervisorAdvice: string;
}

export interface NectaSpecialNeedsCandidateRow {
  id: string;
  candidateNumberAndName: string;
  gender: 'Me' | 'Ke';
  disabilityType: string;
  examFormatTaken: string;
  subjectsTaken: string;
}

export interface NectaAllSubjectsAbsenteeRow {
  id: string;
  candidateNumber: string;
  candidateName: string;
  gender: 'Me' | 'Ke';
  reasonForAbsence: string;
  headmasterRemarks: string;
}

export interface NectaSupervisionReportData {
  id: string;
  title: string;
  updatedAt: string;
  // 1. Kituo & Wasimamizi
  centerNumber: string;
  centerName: string;
  examType: NectaExamType;
  examYear: string;
  startDate: string;
  endDate: string;
  roomsCount: number;
  council: string;
  region: string;
  invigilators: NectaInvigilatorRow[];
  labSpecialists: NectaLabSpecialistRow[];
  // 2. Mahudhurio ya Watahiniwa
  attendanceRows: NectaSubjectAttendanceRow[];
  // 3. Vifaa vya Mtihani
  stationeryRows: NectaStationeryRow[];
  // 4. Dosari za Usajili na Tuhuma za Udanganyifu
  registrationDefects: NectaRegistrationDefectRow[];
  nonCalCandidates: NectaNonCalCandidateRow[];
  wrongNumberCandidates: NectaWrongNumberCandidateRow[];
  malpracticeCases: NectaMalpracticeRow[];
  // 5. Ripoti Maalum za Watahiniwa
  sickCandidatesAll: NectaSickCandidateRow[];
  emergencySickDuringExam: NectaEmergencySickDuringExamRow[];
  specialNeedsCandidates: NectaSpecialNeedsCandidateRow[];
  allSubjectsAbsentees: NectaAllSubjectsAbsenteeRow[];
  // 6. Matukio Yasiyo ya Kawaida na Saini
  unusualEventsNotes: string;
  chiefSupervisorRecommendations: string;
  chiefSupervisorName: string;
  chiefSupervisorPhone: string;
  chiefSupervisorWorkstation: string;
  chiefSupervisorSignature: string;
  signDate: string;
  headmasterName: string;
  headmasterPhone: string;
  headmasterSignDate: string;
}

interface NectaExaminationReportsViewProps {
  schoolInfo: SchoolInfo;
  students?: Student[];
  teachers?: Teacher[];
  currentUser?: UserAccount | null;
}

const EXAM_TYPE_LABELS: Record<NectaExamType, { short: string; fullSw: string; levelHint: string }> = {
  SFNA: {
    short: 'SFNA',
    fullSw: 'Upimaji wa Kitaifa wa Darasa la Nne (SFNA)',
    levelHint: 'Darasa la IV'
  },
  PSLE: {
    short: 'PSLE',
    fullSw: 'Mtihani wa Kumaliza Elimu ya Msingi (PSLE)',
    levelHint: 'Darasa la VII'
  },
  FTNA: {
    short: 'FTNA',
    fullSw: 'Upimaji wa Kitaifa wa Kidato cha Pili (FTNA)',
    levelHint: 'Kidato cha II (Form 2)'
  },
  CSEE: {
    short: 'CSEE',
    fullSw: 'Mtihani wa Kuhitimu Elimu ya Sekondari (CSEE)',
    levelHint: 'Kidato cha IV (Form 4)'
  },
  ACSEE: {
    short: 'ACSEE',
    fullSw: 'Mtihani wa Kuhitimu Elimu ya Juu ya Sekondari (ACSEE)',
    levelHint: 'Kidato cha VI (Form 6)'
  }
};

const DEFAULT_SUBJECTS_BY_EXAM: Record<NectaExamType, string[]> = {
  CSEE: [
    '011 Civics',
    '012 History',
    '013 Geography',
    '021 Kiswahili',
    '022 English Language',
    '031 Physics',
    '032 Chemistry',
    '033 Biology',
    '041 Basic Mathematics'
  ],
  FTNA: [
    '011 Civics',
    '012 History',
    '013 Geography',
    '021 Kiswahili',
    '022 English Language',
    '031 Physics',
    '032 Chemistry',
    '033 Biology',
    '041 Basic Mathematics'
  ],
  ACSEE: [
    '111 General Studies',
    '112 History',
    '113 Geography',
    '121 Kiswahili',
    '131 Physics',
    '132 Chemistry',
    '133 Biology',
    '141 Advanced Mathematics',
    '151 Economics'
  ],
  PSLE: [
    '01 Kiswahili',
    '02 English Language',
    '03 Maarifa ya Jamii na Stadi za Kazi',
    '04 Hisabati',
    '05 Sayansi na Teknolojia',
    '06 Uraia na Maadili'
  ],
  SFNA: [
    '01 Kiswahili',
    '02 English Language',
    '03 Maarifa ya Jamii',
    '04 Hisabati',
    '05 Sayansi na Teknolojia',
    '06 Uraia na Maadili'
  ]
};

const createDefaultStationeryRows = (): NectaStationeryRow[] => [
  { id: 'st-1', itemName: 'Booklet Normal', received: 600, used: 540, remaining: 60, shortage: 0, remarks: 'Zimetosha na ziko salama' },
  { id: 'st-2', itemName: 'Booklet Graph', received: 150, used: 135, remaining: 15, shortage: 0, remarks: 'Zimetumika kwenye Basic Mathematics & Geography' },
  { id: 'st-3', itemName: 'Loose Sheet Normal', received: 200, used: 45, remaining: 155, shortage: 0, remarks: 'Zilizobaki zimefungwa kwenye bahasha rasmi' },
  { id: 'st-4', itemName: 'Loose Sheet Graph', received: 100, used: 12, remaining: 88, shortage: 0, remarks: 'Hakuna upungufu' },
  { id: 'st-5', itemName: 'BKM (Bahasha za Kurudishia Mitihani)', received: 40, used: 36, remaining: 4, shortage: 0, remarks: 'Bahasha zote zimefungwa kwa lakiri (sealed)' }
];

const createInitialReport = (schoolInfo: SchoolInfo, students: Student[] = [], teachers: Teacher[] = []): NectaSupervisionReportData => {
  const infoAny = schoolInfo as any;
  const centerNo = infoAny?.nectaCenterNo || infoAny?.centerNumber || infoAny?.registrationNumber || 'S4040';
  const centerName = (schoolInfo?.name || 'SHULE YA SEKONDARI HABY EDUPRO').toUpperCase();
  const currentYear = String(new Date().getFullYear());

  // Calculate default Form 4 / candidate gender counts from students if available
  const form4Students = students.filter(s => {
    const sAny = s as any;
    const clsStr = String(sAny.class || sAny.classLevel || s.stream || '').toLowerCase();
    return clsStr.includes('4') || clsStr.includes('iv');
  });
  const pool = form4Students.length > 0 ? form4Students : students;
  const defaultRegMale = pool.length > 0
    ? pool.filter(s => String(s.gender || '').toUpperCase().startsWith('M')).length || 45
    : 45;
  const defaultRegFemale = pool.length > 0
    ? pool.filter(s => String(s.gender || '').toUpperCase().startsWith('F') || String(s.gender || '').toUpperCase().startsWith('K')).length || 50
    : 50;

  const initialAttendance: NectaSubjectAttendanceRow[] = DEFAULT_SUBJECTS_BY_EXAM.CSEE.map((subj, idx) => {
    const absM = idx === 7 ? 1 : 0;
    const absF = idx === 8 ? 1 : 0;
    const satM = Math.max(0, defaultRegMale - absM);
    const satF = Math.max(0, defaultRegFemale - absF);
    return {
      id: `att-${idx + 1}`,
      subjectName: subj,
      regMale: defaultRegMale,
      regFemale: defaultRegFemale,
      regTotal: defaultRegMale + defaultRegFemale,
      satMale: satM,
      satFemale: satF,
      satTotal: satM + satF,
      absMale: absM,
      absFemale: absF,
      absTotal: absM + absF,
      absentCandidateNumbers: (absM + absF) > 0 ? `${centerNo}/0008` : 'HAKUNA',
      envelopesCount: 1
    };
  });

  const initialInvigilators: NectaInvigilatorRow[] = [
    {
      id: 'inv-1',
      fullName: teachers[0]?.name || 'Mwl. Juma H. Kilaza',
      role: 'Msimamizi Mkuu',
      workstation: 'Shule ya Sekondari Jirani',
      roomAssigned: 'Kituo Chote (Ofisi Kuu)',
      phone: teachers[0]?.phone || '0754 112 233'
    },
    {
      id: 'inv-2',
      fullName: infoAny?.headmasterName || teachers[1]?.name || 'Mwl. Neema M. Kileo',
      role: 'Mkuu wa Shule',
      workstation: centerName,
      roomAssigned: 'Uratibu wa Kituo',
      phone: schoolInfo?.phone || teachers[1]?.phone || '0713 445 566'
    },
    {
      id: 'inv-3',
      fullName: teachers[2]?.name || 'Mwl. Emanuel S. Mushi',
      role: 'Msimamizi',
      workstation: 'Shule ya Sekondari Mlimani',
      roomAssigned: 'Chumba Na. 01',
      phone: teachers[2]?.phone || '0784 998 877'
    },
    {
      id: 'inv-4',
      fullName: teachers[3]?.name || 'Mwl. Asha R. Abdallah',
      role: 'Msimamizi',
      workstation: 'Shule ya Sekondari Bonde',
      roomAssigned: 'Chumba Na. 02',
      phone: teachers[3]?.phone || '0767 334 455'
    }
  ];

  return {
    id: `necta-rep-${Date.now()}`,
    title: `Taarifa ya Usimamizi CSEE ${currentYear} — ${centerNo}`,
    updatedAt: new Date().toISOString(),
    centerNumber: centerNo,
    centerName,
    examType: 'CSEE',
    examYear: currentYear,
    startDate: `${currentYear}-11-02`,
    endDate: `${currentYear}-11-19`,
    roomsCount: Math.max(2, Math.ceil((defaultRegMale + defaultRegFemale) / 25)),
    council: infoAny?.district || 'Halmashauri ya Manispaa ya Kinondoni',
    region: infoAny?.region || 'Dar es Salaam',
    invigilators: initialInvigilators,
    labSpecialists: [
      {
        id: 'lab-1',
        fullName: 'Bw. Kelvin P. Massawe',
        workstation: centerName,
        subjectPrepared: '031/2A Physics Practical & 032/2A Chemistry Practical',
        phone: '0755 889 900'
      },
      {
        id: 'lab-2',
        fullName: 'Bi. Salma K. Bakari',
        workstation: centerName,
        subjectPrepared: '033/2A Biology Practical',
        phone: '0718 223 344'
      }
    ],
    attendanceRows: initialAttendance,
    stationeryRows: createDefaultStationeryRows(),
    registrationDefects: [
      {
        id: 'def-1',
        candidateNumber: `${centerNo}/0014`,
        candidateName: 'BARAKA JOHN MWAKASEGE',
        defectType: 'Makosa ya Tahajia ya Jina kwenye CAL',
        resolutionAndRecommendation: 'Jina sahihi limehakikiwa kwenye TSM9 na fomu ya marekebisho imeambatanishwa.'
      }
    ],
    nonCalCandidates: [],
    wrongNumberCandidates: [],
    malpracticeCases: [],
    sickCandidatesAll: [],
    emergencySickDuringExam: [],
    specialNeedsCandidates: [],
    allSubjectsAbsentees: [
      {
        id: 'abs-1',
        candidateNumber: `${centerNo}/0008`,
        candidateName: 'HALIMA SAIDI MFAUME',
        gender: 'Ke',
        reasonForAbsence: 'Ugonjwa (Amelazwa Hospitali ya Wilaya)',
        headmasterRemarks: 'Vyeti vya daktari vimewasilishwa na kuambatanishwa kwenye bahasha ya ripoti.'
      }
    ],
    unusualEventsNotes: 'Mtihani ulifanyika kwa amani na utulivu katika siku zote za mtihani. Ulinzi ulikuwepo muda wote na bahasha za maswali zilifunguliwa kwa wakati mbele ya mashahidi.',
    chiefSupervisorRecommendations: 'Tunashauri NECTA kuendelea kutuma vifaa vya maabara mapema zaidi pamoja na kuongeza nakala za akiba za Loose Sheet Graph kwa vituo vyenye watahiniwa wengi.',
    chiefSupervisorName: initialInvigilators[0]?.fullName || 'Mwl. Juma H. Kilaza',
    chiefSupervisorPhone: initialInvigilators[0]?.phone || '0754 112 233',
    chiefSupervisorWorkstation: initialInvigilators[0]?.workstation || 'Shule ya Sekondari Jirani',
    chiefSupervisorSignature: 'J.H.Kilaza',
    signDate: new Date().toISOString().split('T')[0],
    headmasterName: infoAny?.headmasterName || 'Mwl. Neema M. Kileo',
    headmasterPhone: schoolInfo?.phone || '0713 445 566',
    headmasterSignDate: new Date().toISOString().split('T')[0]
  };
};

const STORAGE_KEY = 'haby_necta_examination_supervision_reports_v1';

export const NectaExaminationReportsView: React.FC<NectaExaminationReportsViewProps> = ({
  schoolInfo,
  students = [],
  teachers = [],
}) => {
  const [reports, setReports] = useState<NectaSupervisionReportData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading NECTA supervision reports:', e);
    }
    return [createInitialReport(schoolInfo, students, teachers)];
  });

  const [activeReportId, setActiveReportId] = useState<string>(() => reports[0]?.id || '');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'wizard' | 'a4_preview'>('wizard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentReport = useMemo(() => {
    return reports.find(r => r.id === activeReportId) || reports[0];
  }, [reports, activeReportId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
      console.error('Failed to persist NECTA reports:', e);
    }
  }, [reports]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const updateCurrentReport = (updater: (prev: NectaSupervisionReportData) => NectaSupervisionReportData) => {
    setReports(prev =>
      prev.map(rep => {
        if (rep.id !== currentReport.id) return rep;
        const updated = updater(rep);
        return { ...updated, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Auto-calculation handler for Subject Attendance Row
  // Formula:
  // Jml = Me + Ke (kwa kila kipengele cha waliosajiliwa, waliofanya, na wasiofanya)
  // Waliofanya = Waliosajiliwa - Wasiofanya (kwa Me na Ke husika)
  const handleUpdateAttendanceRow = (
    rowId: string,
    field: 'subjectName' | 'regMale' | 'regFemale' | 'satMale' | 'satFemale' | 'absMale' | 'absFemale' | 'absentCandidateNumbers' | 'envelopesCount',
    rawValue: string | number
  ) => {
    updateCurrentReport(prev => ({
      ...prev,
      attendanceRows: prev.attendanceRows.map(row => {
        if (row.id !== rowId) return row;

        if (field === 'subjectName' || field === 'absentCandidateNumbers') {
          return { ...row, [field]: String(rawValue) };
        }
        if (field === 'envelopesCount') {
          return { ...row, envelopesCount: Math.max(0, parseInt(String(rawValue), 10) || 0) };
        }

        const numVal = Math.max(0, parseInt(String(rawValue), 10) || 0);
        let regMale = row.regMale;
        let regFemale = row.regFemale;
        let absMale = row.absMale;
        let absFemale = row.absFemale;
        let satMale = row.satMale;
        let satFemale = row.satFemale;

        if (field === 'regMale') {
          regMale = numVal;
          if (absMale > regMale) absMale = regMale;
          satMale = Math.max(0, regMale - absMale);
        } else if (field === 'regFemale') {
          regFemale = numVal;
          if (absFemale > regFemale) absFemale = regFemale;
          satFemale = Math.max(0, regFemale - absFemale);
        } else if (field === 'absMale') {
          absMale = Math.min(regMale, numVal);
          satMale = Math.max(0, regMale - absMale);
        } else if (field === 'absFemale') {
          absFemale = Math.min(regFemale, numVal);
          satFemale = Math.max(0, regFemale - absFemale);
        } else if (field === 'satMale') {
          satMale = Math.min(regMale, numVal);
          absMale = Math.max(0, regMale - satMale);
        } else if (field === 'satFemale') {
          satFemale = Math.min(regFemale, numVal);
          absFemale = Math.max(0, regFemale - satFemale);
        }

        const regTotal = regMale + regFemale;
        const satTotal = satMale + satFemale;
        const absTotal = absMale + absFemale;

        return {
          ...row,
          regMale,
          regFemale,
          regTotal,
          satMale,
          satFemale,
          satTotal,
          absMale,
          absFemale,
          absTotal
        };
      })
    }));
  };

  // Totals for Attendance Table
  const attendanceTotals = useMemo(() => {
    return currentReport.attendanceRows.reduce(
      (acc, r) => ({
        regMale: acc.regMale + (Number(r.regMale) || 0),
        regFemale: acc.regFemale + (Number(r.regFemale) || 0),
        regTotal: acc.regTotal + (Number(r.regTotal) || 0),
        satMale: acc.satMale + (Number(r.satMale) || 0),
        satFemale: acc.satFemale + (Number(r.satFemale) || 0),
        satTotal: acc.satTotal + (Number(r.satTotal) || 0),
        absMale: acc.absMale + (Number(r.absMale) || 0),
        absFemale: acc.absFemale + (Number(r.absFemale) || 0),
        absTotal: acc.absTotal + (Number(r.absTotal) || 0),
        envelopesCount: acc.envelopesCount + (Number(r.envelopesCount) || 0)
      }),
      { regMale: 0, regFemale: 0, regTotal: 0, satMale: 0, satFemale: 0, satTotal: 0, absMale: 0, absFemale: 0, absTotal: 0, envelopesCount: 0 }
    );
  }, [currentReport.attendanceRows]);

  // Stationery update with auto-calculation for Zilizobaki = Zilizokabidhiwa - Zilizotumika - Mapungufu
  const handleUpdateStationeryRow = (
    rowId: string,
    field: keyof NectaStationeryRow,
    rawValue: string | number
  ) => {
    updateCurrentReport(prev => ({
      ...prev,
      stationeryRows: prev.stationeryRows.map(row => {
        if (row.id !== rowId) return row;
        if (field === 'itemName' || field === 'remarks') {
          return { ...row, [field]: String(rawValue) };
        }
        const numVal = Math.max(0, parseInt(String(rawValue), 10) || 0);
        let received = row.received;
        let used = row.used;
        let remaining = row.remaining;
        let shortage = row.shortage;

        if (field === 'received') {
          received = numVal;
          remaining = Math.max(0, received - used - shortage);
        } else if (field === 'used') {
          used = numVal;
          remaining = Math.max(0, received - used - shortage);
        } else if (field === 'shortage') {
          shortage = numVal;
          remaining = Math.max(0, received - used - shortage);
        } else if (field === 'remaining') {
          remaining = numVal;
        }

        return {
          ...row,
          received,
          used,
          remaining,
          shortage
        };
      })
    }));
  };

  // Totals for Stationery Table
  const stationeryTotals = useMemo(() => {
    return currentReport.stationeryRows.reduce(
      (acc, r) => ({
        received: acc.received + (Number(r.received) || 0),
        used: acc.used + (Number(r.used) || 0),
        remaining: acc.remaining + (Number(r.remaining) || 0),
        shortage: acc.shortage + (Number(r.shortage) || 0)
      }),
      { received: 0, used: 0, remaining: 0, shortage: 0 }
    );
  }, [currentReport.stationeryRows]);

  // Load default subjects for selected exam type
  const handleLoadStandardSubjectsForExam = (examType: NectaExamType) => {
    const subjects = DEFAULT_SUBJECTS_BY_EXAM[examType] || DEFAULT_SUBJECTS_BY_EXAM.CSEE;
    const baseMale = currentReport.attendanceRows[0]?.regMale || 45;
    const baseFemale = currentReport.attendanceRows[0]?.regFemale || 50;
    const newRows: NectaSubjectAttendanceRow[] = subjects.map((subj, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      subjectName: subj,
      regMale: baseMale,
      regFemale: baseFemale,
      regTotal: baseMale + baseFemale,
      satMale: baseMale,
      satFemale: baseFemale,
      satTotal: baseMale + baseFemale,
      absMale: 0,
      absFemale: 0,
      absTotal: 0,
      absentCandidateNumbers: 'HAKUNA',
      envelopesCount: 1
    }));
    updateCurrentReport(prev => ({
      ...prev,
      examType,
      title: `Taarifa ya Usimamizi ${examType} ${prev.examYear} — ${prev.centerNumber}`,
      attendanceRows: newRows
    }));
    showToast(`Masomo ya ${examType} yamewekwa kwenye jedwali la mahudhurio.`);
  };

  const handleCreateNewReport = () => {
    const fresh = createInitialReport(schoolInfo, students, teachers);
    fresh.id = `necta-rep-${Date.now()}`;
    fresh.title = `Taarifa Mpya ya NECTA (${fresh.examType} ${fresh.examYear})`;
    setReports(prev => [fresh, ...prev]);
    setActiveReportId(fresh.id);
    setActiveStep(1);
    showToast('Fomu mpya ya Taarifa ya Usimamizi wa Mitihani ya NECTA imeundwa.');
  };

  const handlePrintA4 = () => {
    setViewMode('a4_preview');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Vector PDF Generator (Fomu Rasmi ya NECTA na Nembo za Jamhuri na Baraza)
  const handleExportOfficialNectaPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const totalPages = 6;

    const drawOfficialHeader = (pageIndex: number, sectionSubtitle: string) => {
      // Left: Tanzania Coat of Arms Emblem box
      doc.setLineWidth(0.3);
      doc.setDrawColor(34, 139, 34);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, 8, 14, 14, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(34, 139, 34);
      doc.text('TANZANIA', margin + 7, 13, { align: 'center' });
      doc.setFontSize(5);
      doc.text('COAT OF ARMS', margin + 7, 17, { align: 'center' });

      // Right: NECTA Council Logo Emblem box
      doc.setDrawColor(29, 78, 216);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(pageWidth - margin - 14, 8, 14, 14, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(29, 78, 216);
      doc.text('NECTA', pageWidth - margin - 7, 13, { align: 'center' });
      doc.setFontSize(5);
      doc.text('COUNCIL', pageWidth - margin - 7, 17, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text('JAMHURI YA MUUNGANO WA TANZANIA', pageWidth / 2, 11, { align: 'center' });
      doc.setFontSize(10.5);
      doc.text('BARAZA LA MITIHANI LA TANZANIA (NECTA)', pageWidth / 2, 16, { align: 'center' });
      doc.setFontSize(9);
      doc.text(
        `TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA (${currentReport.examType} - ${currentReport.examYear})`,
        pageWidth / 2,
        21,
        { align: 'center' }
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        `Kituo: ${currentReport.centerNumber} - ${currentReport.centerName}  |  Halmashauri: ${currentReport.council}  |  Mkoa: ${currentReport.region}`,
        pageWidth / 2,
        25.5,
        { align: 'center' }
      );
      doc.setLineWidth(0.4);
      doc.line(margin, 27.5, pageWidth - margin, 27.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(sectionSubtitle, margin, 32);
      doc.setFontSize(7.5);
      doc.text(`Ukurasa wa ${pageIndex} ya ${totalPages}`, pageWidth - margin, 32, { align: 'right' });
      return 35;
    };

    const drawPageFooter = (pageIndex: number) => {
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text(
        `Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — ${currentReport.centerNumber} ${currentReport.centerName}`,
        margin,
        pageHeight - 6
      );
      doc.setFont('helvetica', 'bold');
      doc.text(`Ukurasa wa ${pageIndex} ya ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    };

    // ==================== UKURASA 1: TAARIFA YA KITUO & WASIMAMIZI ====================
    let y = drawOfficialHeader(1, 'SEHEMU A: TAARIFA YA KITUO, WASIMAMIZI NA WATAALAM WA MAABARA');

    autoTable(doc, {
      startY: y,
      head: [['Namba ya Kituo', 'Jina la Kituo', 'Aina ya Mtihani', 'Idadi ya Vyumba', 'Halmashauri', 'Mkoa']],
      body: [[
        currentReport.centerNumber,
        currentReport.centerName,
        `${currentReport.examType} (${currentReport.examYear})`,
        String(currentReport.roomsCount),
        currentReport.council,
        currentReport.region
      ]],
      theme: 'grid',
      headStyles: { fillColor: [224, 242, 254], textColor: [30, 58, 138], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5, halign: 'center' },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('1.2 JEDWALI LA WASIMAMIZI WA MTIHANI (MSIMAMIZI MKUU, MKUU WA SHULE NA WASIMAMIZI)', margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Jina Kamili la Msimamizi', 'Cheo', 'Kituo cha Kazi (Alikotoka)', 'Chumba Alichosimamia', 'Namba ya Simu']],
      body: currentReport.invigilators.length === 0
        ? [['—', 'Hakuna wasimamizi waliosajiliwa', '—', '—', '—', '—']]
        : currentReport.invigilators.map((inv, idx) => [
            String(idx + 1),
            inv.fullName,
            inv.role,
            inv.workstation,
            inv.roomAssigned,
            inv.phone
          ]),
      theme: 'grid',
      headStyles: { fillColor: [224, 242, 254], textColor: [30, 58, 138], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('1.3 JEDWALI LA WATAALAM WA MAABARA WALIOANDAA MTIHANI WA VITENDO (PRACTICALS)', margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Jina la Mtaalam wa Maabara', 'Kituo cha Kazi', 'Somo Aliloandaa', 'Namba ya Simu']],
      body: currentReport.labSpecialists.length === 0
        ? [['—', 'Hakuna wataalam wa maabara walioorodheshwa', '—', '—', '—']]
        : currentReport.labSpecialists.map((lab, idx) => [
            String(idx + 1),
            lab.fullName,
            lab.workstation,
            lab.subjectPrepared,
            lab.phone
          ]),
      theme: 'grid',
      headStyles: { fillColor: [224, 242, 254], textColor: [30, 58, 138], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5 },
      margin: { left: margin, right: margin }
    });
    drawPageFooter(1);

    // ==================== UKURASA 2: MAHUDHURIO YA WATAHINIWA ====================
    doc.addPage();
    y = drawOfficialHeader(2, 'SEHEMU B: MAHUDHURIO YA WATAHINIWA KWA KILA SOMO KIJINSIA (ME, KE, JML)');

    autoTable(doc, {
      startY: y,
      head: [
        [
          { content: 'Na.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Somo (Jina la Somo)', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
          { content: 'Idadi ya Waliosajiliwa', colSpan: 3, styles: { halign: 'center' } },
          { content: 'Idadi ya Waliofanya Mtihani', colSpan: 3, styles: { halign: 'center' } },
          { content: 'Idadi ya Wasiofanya Mtihani', colSpan: 3, styles: { halign: 'center' } },
          { content: 'Bahasha Zilizopelekwa Halm.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Orodha ya Namba za Watahiniwa Wasiofanya\n(Mfano: S4040/0001, 0008...)', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } }
        ],
        [
          { content: 'Me', styles: { halign: 'center' } },
          { content: 'Ke', styles: { halign: 'center' } },
          { content: 'Jml', styles: { halign: 'center' } },
          { content: 'Me', styles: { halign: 'center' } },
          { content: 'Ke', styles: { halign: 'center' } },
          { content: 'Jml', styles: { halign: 'center' } },
          { content: 'Me', styles: { halign: 'center' } },
          { content: 'Ke', styles: { halign: 'center' } },
          { content: 'Jml', styles: { halign: 'center' } }
        ]
      ],
      body: [
        ...currentReport.attendanceRows.map((row, idx) => [
          String(idx + 1),
          row.subjectName,
          String(row.regMale),
          String(row.regFemale),
          String(row.regTotal),
          String(row.satMale),
          String(row.satFemale),
          String(row.satTotal),
          String(row.absMale),
          String(row.absFemale),
          String(row.absTotal),
          String(row.envelopesCount),
          row.absentCandidateNumbers || 'HAKUNA'
        ]),
        [
          '—',
          'JUMLA KUU YA MAHUDHURIO',
          String(attendanceTotals.regMale),
          String(attendanceTotals.regFemale),
          String(attendanceTotals.regTotal),
          String(attendanceTotals.satMale),
          String(attendanceTotals.satFemale),
          String(attendanceTotals.satTotal),
          String(attendanceTotals.absMale),
          String(attendanceTotals.absFemale),
          String(attendanceTotals.absTotal),
          String(attendanceTotals.envelopesCount),
          'Jumla ya Takwimu Zote'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 252, 231], textColor: [6, 95, 70], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 38 },
        2: { halign: 'center', cellWidth: 9 },
        3: { halign: 'center', cellWidth: 9 },
        4: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 9 },
        6: { halign: 'center', cellWidth: 9 },
        7: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 9 },
        9: { halign: 'center', cellWidth: 9 },
        10: { halign: 'center', cellWidth: 10, fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });
    drawPageFooter(2);

    // ==================== UKURASA 3: VIFAA VYA MTIHANI ====================
    doc.addPage();
    y = drawOfficialHeader(3, 'SEHEMU C: TAARIFA YA MATUMIZI YA VIFAA VYA MTIHANI (BOOKLETS, LOOSE SHEETS & BKM)');

    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Aina ya Kifaa cha Mtihani', 'Zilizokabidhiwa', 'Zilizotumika', 'Zilizobaki', 'Mapungufu', 'Maelezo / Kumbukumbu']],
      body: [
        ...currentReport.stationeryRows.map((st, idx) => [
          String(idx + 1),
          st.itemName,
          String(st.received),
          String(st.used),
          String(st.remaining),
          String(st.shortage),
          st.remarks || '—'
        ]),
        [
          '—',
          'JUMLA KUU',
          String(stationeryTotals.received),
          String(stationeryTotals.used),
          String(stationeryTotals.remaining),
          String(stationeryTotals.shortage),
          'Jumla ya Vifaa Vyote'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'center', cellWidth: 22 }
      },
      margin: { left: margin, right: margin }
    });
    drawPageFooter(3);

    // ==================== UKURASA 4: DOSARI ZA USAJILI & UDANGANYIFU ====================
    doc.addPage();
    y = drawOfficialHeader(4, 'SEHEMU D: DOSARI ZA USAJILI, WATAHINIWA WA CAL NA TUHUMA ZA UDANGANYIFU');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('4.1 DOSARI ZA KAWAIDA ZA USAJILI (KUTOSAJILIWA, MAKOSA YA JINSI/PICHA, KUFARIKI N.K.)', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Namba ya Mtahiniwa', 'Jina la Mtahiniwa', 'Aina ya Dosari', 'Utatuzi / Mapendekezo ya Msimamizi']],
      body: currentReport.registrationDefects.length === 0
        ? [['—', 'HAKUNA', 'Hakuna dosari za usajili zilizojitokeza', '—', '—']]
        : currentReport.registrationDefects.map((d, i) => [
            String(i + 1),
            d.candidateNumber,
            d.candidateName,
            d.defectType,
            d.resolutionAndRecommendation
          ]),
      theme: 'grid',
      headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('4.2 WATAHINIWA WASIOKUWEPO KWENYE CAL (WATAHINIWA WALIOONGEZWA)', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Jina la Mtahiniwa', 'Sifa za Kuongezwa', 'Jinsi', 'Namba Aliyofanyia', 'Masomo Aliyofanya']],
      body: currentReport.nonCalCandidates.length === 0
        ? [['—', 'HAKUNA', '—', '—', '—', '—']]
        : currentReport.nonCalCandidates.map((c, i) => [
            String(i + 1),
            c.candidateName,
            c.qualification,
            c.gender,
            c.examNumberUsed,
            c.subjectsTaken
          ]),
      theme: 'grid',
      headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('4.3 WATAHINIWA WALIOKOSEA NAMBA ZA MTIHANI', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Jina la Mtahiniwa', 'Namba Sahihi ya CAL', 'Namba Aliyotumia Kimakosa', 'Masomo Aliyokosea']],
      body: currentReport.wrongNumberCandidates.length === 0
        ? [['—', 'HAKUNA', '—', '—', '—']]
        : currentReport.wrongNumberCandidates.map((w, i) => [
            String(i + 1),
            w.candidateName,
            w.correctCalNumber,
            w.wrongNumberUsed,
            w.subjectsAffected
          ]),
      theme: 'grid',
      headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 7 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('4.4 TUHUMA ZA UDANGANYIFU KATIKA MTIHANI', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Tarehe ya Tukio', 'Namba & Jina la Mtahiniwa', 'Somo', 'Tuhuma', 'Hatua Zilizochukuliwa', 'Vielelezo Vilivyoambatanishwa']],
      body: currentReport.malpracticeCases.length === 0
        ? [['—', '—', 'HAKUNA TUHUMA ZA UDANGANYIFU ZILIZORIPOTIWA', '—', '—', '—', '—']]
        : currentReport.malpracticeCases.map((m, i) => [
            String(i + 1),
            m.incidentDate,
            m.candidateNumberAndName,
            m.subjectName,
            m.allegationDetails,
            m.actionsTaken,
            m.attachedEvidenceList
          ]),
      theme: 'grid',
      headStyles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8 },
      margin: { left: margin, right: margin }
    });
    drawPageFooter(4);

    // ==================== UKURASA 5: RIPOTI MAALUM ZA WATAHINIWA ====================
    doc.addPage();
    y = drawOfficialHeader(5, 'SEHEMU E: RIPOTI MAALUM ZA WATAHINIWA (WALIOUGUA, MAHITAJI MAALUM & WASIOFANYA YOTE)');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('5.1 WATAHINIWA WALIOUGUA NA KUSHINDWA KUFANYA MITIHANI YOTE / BAADHI', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Namba ya Mtahiniwa', 'Jina la Mtahiniwa', 'Jinsi', 'Masomo Aliyoshindwa', 'Maelezo ya Ugonjwa', 'Maoni ya Msimamizi']],
      body: currentReport.sickCandidatesAll.length === 0
        ? [['—', 'HAKUNA', '—', '—', '—', '—', '—']]
        : currentReport.sickCandidatesAll.map((s, i) => [
            String(i + 1),
            s.candidateNumber,
            s.candidateName,
            s.gender,
            s.subjectsMissed,
            s.illnessDetails,
            s.supervisorRemarks
          ]),
      theme: 'grid',
      headStyles: { fillColor: [224, 231, 255], textColor: [49, 46, 129], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('5.2 FOMU MAALUM YA DHARURA KWA MTAHINIWA ALIYEUGUA MTIHANI UKIENDELEA', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Namba & Jina la Mtahiniwa', 'Somo & Tarehe', 'Muda Aliougua', 'Muda wa Matibabu', 'Muda Alioongezewa', 'Ushauri wa Msimamizi']],
      body: currentReport.emergencySickDuringExam.length === 0
        ? [['—', 'HAKUNA', '—', '—', '—', '—', '—']]
        : currentReport.emergencySickDuringExam.map((e, i) => [
            String(i + 1),
            e.candidateNumberAndName,
            e.subjectAndDate,
            e.timeFellIll,
            e.timeResumedOrTreated,
            e.extraMinutesGranted,
            e.supervisorAdvice
          ]),
      theme: 'grid',
      headStyles: { fillColor: [224, 231, 255], textColor: [49, 46, 129], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('5.3 WATAHINIWA WENYE MAHITAJI MAALUM (SPECIAL NEEDS CANDIDATES)', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Namba & Jina la Mtahiniwa', 'Jinsi', 'Aina ya Ulemavu', 'Aina ya Mtihani Aliofanya', 'Masomo Aliyofanya']],
      body: currentReport.specialNeedsCandidates.length === 0
        ? [['—', 'HAKUNA', '—', '—', '—', '—']]
        : currentReport.specialNeedsCandidates.map((sp, i) => [
            String(i + 1),
            sp.candidateNumberAndName,
            sp.gender,
            sp.disabilityType,
            sp.examFormatTaken,
            sp.subjectsTaken
          ]),
      theme: 'grid',
      headStyles: { fillColor: [224, 231, 255], textColor: [49, 46, 129], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('5.4 WATAHINIWA AMBAO HAWAKUFANYA MITIHANI YOTE', margin, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Na.', 'Namba ya Mtahiniwa', 'Jina la Mtahiniwa', 'Jinsi', 'Sababu za Kutofanya Mitihani Yote', 'Maoni ya Mkuu wa Shule']],
      body: currentReport.allSubjectsAbsentees.length === 0
        ? [['—', 'HAKUNA', '—', '—', '—', '—']]
        : currentReport.allSubjectsAbsentees.map((ab, i) => [
            String(i + 1),
            ab.candidateNumber,
            ab.candidateName,
            ab.gender,
            ab.reasonForAbsence,
            ab.headmasterRemarks
          ]),
      theme: 'grid',
      headStyles: { fillColor: [224, 231, 255], textColor: [49, 46, 129], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 6.8 },
      margin: { left: margin, right: margin }
    });
    drawPageFooter(5);

    // ==================== UKURASA 6: MATUKIO YASIYO YA KAWAIDA & SAINI ====================
    doc.addPage();
    y = drawOfficialHeader(6, 'SEHEMU F: MATUKIO YASIYO YA KAWAIDA, MAONI NA SAINI ZA UTHIBITISHO');

    autoTable(doc, {
      startY: y,
      head: [['6.1 MAELEZO YA MATUKIO YASIYO YA KAWAIDA WAKATI WA MTIHANI']],
      body: [[currentReport.unusualEventsNotes || 'Hakuna tukio lisilo la kawaida lililojitokeza.']],
      theme: 'grid',
      headStyles: { fillColor: [204, 251, 241], textColor: [19, 78, 74], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 8, minCellHeight: 28 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    autoTable(doc, {
      startY: y,
      head: [['6.2 MAONI NA MAPENDEKEZO YA MSIMAMIZI MKUU']],
      body: [[currentReport.chiefSupervisorRecommendations || 'Hakuna maoni ya ziada.']],
      theme: 'grid',
      headStyles: { fillColor: [204, 251, 241], textColor: [19, 78, 74], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 8, minCellHeight: 28 },
      margin: { left: margin, right: margin }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: y,
      head: [['UTHIBITISHO WA MSIMAMIZI MKUU WA KITUO', 'UTHIBITISHO WA MKUU WA SHULE / KITUO']],
      body: [[
        `Jina Kamili: ${currentReport.chiefSupervisorName}\nKituo cha Kazi: ${currentReport.chiefSupervisorWorkstation}\nNamba ya Simu: ${currentReport.chiefSupervisorPhone}\nSaini: ${currentReport.chiefSupervisorSignature || '______________________'}\nTarehe: ${currentReport.signDate}`,
        `Jina Kamili: ${currentReport.headmasterName}\nCheo: Mkuu wa Shule (${currentReport.centerName})\nNamba ya Simu: ${currentReport.headmasterPhone}\nSaini na Muhuri: ______________________\nTarehe: ${currentReport.headmasterSignDate}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [204, 251, 241], textColor: [19, 78, 74], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0], lineColor: [148, 163, 184], lineWidth: 0.25, fontSize: 8, minCellHeight: 36 },
      margin: { left: margin, right: margin }
    });
    drawPageFooter(6);

    const safeFile = `Taarifa_Usimamizi_NECTA_${currentReport.examType}_${currentReport.centerNumber}_${currentReport.examYear}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    doc.save(safeFile);
    showToast('PDF Rasmi ya Taarifa ya Usimamizi wa Mitihani ya NECTA (Kurasa 16–22) imepakuliwa.');
  };

  const steps = [
    { id: 1, title: '1. Kituo & Wasimamizi', pageRef: 'Uk. 16', icon: Building2 },
    { id: 2, title: '2. Mahudhurio (Me/Ke/Jml)', pageRef: 'Uk. 17', icon: Users },
    { id: 3, title: '3. Vifaa vya Mtihani', pageRef: 'Uk. 18', icon: Package },
    { id: 4, title: '4. Dosari & Udanganyifu', pageRef: 'Uk. 19–20', icon: AlertTriangle },
    { id: 5, title: '5. Ripoti Maalum', pageRef: 'Uk. 21', icon: HeartPulse },
    { id: 6, title: '6. Matukio & Saini', pageRef: 'Uk. 22', icon: PenTool }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP CONTROL HEADER (HIDDEN ON PRINT) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span>BARAZA LA MITIHANI LA TANZANIA (NECTA)</span>
              <span aria-hidden="true">·</span>
              <span>Fomu Rasmi Kurasa za 16 hadi 22</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              NECTA Examination Supervision Reports (Taarifa ya Usimamizi wa Mitihani)
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Jaza kidijitali taarifa zote rasmi za usimamizi wa mitihani ya kitaifa (SFNA, PSLE, FTNA, CSEE, ACSEE) na kuzitoa kwenye karatasi halisi za A4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Saved Report Selector */}
            <select
              value={currentReport.id}
              onChange={e => setActiveReportId(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
              title="Chagua Ripoti Iliyohifadhiwa"
            >
              {reports.map(r => (
                <option key={r.id} value={r.id}>
                  {r.examType} {r.examYear} — {r.centerNumber} ({r.centerName})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCreateNewReport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Fomu Mpya</span>
            </button>

            {/* Mode Switcher: Wizard vs Official A4 Print Preview */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('wizard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'wizard'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Jaza Hatua kwa Hatua</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('a4_preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'a4_preview'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Mwonekano wa A4 (Uk. 16–22)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintA4}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Chapisha A4 (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleExportOfficialNectaPDF}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Pakua PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* STEPPER NAVIGATION TABS */}
        {viewMode === 'wizard' && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {steps.map(st => {
              const Icon = st.icon;
              const isActive = activeStep === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveStep(st.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-600 text-emerald-950 dark:text-emerald-200'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`} />
                      <span className="text-[11px] font-bold truncate">{st.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{st.pageRef}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          WIZARD INTERACTIVE EDITOR MODE
         ===================================================================== */}
      {viewMode === 'wizard' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs no-print">
          {/* STEP 1: TAARIFA YA KITUO & WASIMAMIZI */}
          {activeStep === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Hatua ya 1: Taarifa ya Kituo, Wasimamizi na Wataalam wa Maabara (Ukurasa wa 16)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jaza taarifa za utambulisho wa kituo cha mtihani, orodha ya wasimamizi waliosimamia na wataalam wa maabara.
                </p>
              </div>

              {/* 1.1 Sehemu ya Kituo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kichwa cha Ripoti (Form Title / Header - editable for NECTA, MOCK, PRE-NATIONAL, etc.)
                  </label>
                  <input
                    type="text"
                    value={currentReport.title}
                    onChange={e => updateCurrentReport(p => ({ ...p, title: e.target.value }))}
                    placeholder="Mfano: Taarifa ya Usimamizi wa Mtihani wa MOCK 2026 au CSEE..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Namba ya Kituo (Center No.)
                  </label>
                  <input
                    type="text"
                    value={currentReport.centerNumber}
                    onChange={e => updateCurrentReport(p => ({ ...p, centerNumber: e.target.value.toUpperCase() }))}
                    placeholder="Mfano: S4040 au P1204"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jina la Kituo cha Mtihani
                  </label>
                  <input
                    type="text"
                    value={currentReport.centerName}
                    onChange={e => updateCurrentReport(p => ({ ...p, centerName: e.target.value.toUpperCase() }))}
                    placeholder="Mfano: SHULE YA SEKONDARI ..."
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aina ya Mtihani wa NECTA
                  </label>
                  <select
                    value={currentReport.examType}
                    onChange={e => {
                      const nextType = e.target.value as NectaExamType;
                      updateCurrentReport(p => ({ ...p, examType: nextType }));
                    }}
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    {(['SFNA', 'PSLE', 'FTNA', 'CSEE', 'ACSEE'] as NectaExamType[]).map(t => (
                      <option key={t} value={t}>
                        {t} — {EXAM_TYPE_LABELS[t].fullSw}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mwaka wa Mtihani
                  </label>
                  <input
                    type="text"
                    value={currentReport.examYear}
                    onChange={e => updateCurrentReport(p => ({ ...p, examYear: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Idadi ya Vyumba vya Mtihani
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={currentReport.roomsCount}
                    onChange={e => updateCurrentReport(p => ({ ...p, roomsCount: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Halmashauri (Wilaya/Manispaa)
                  </label>
                  <input
                    type="text"
                    value={currentReport.council}
                    onChange={e => updateCurrentReport(p => ({ ...p, council: e.target.value }))}
                    placeholder="Mfano: Manispaa ya Kinondoni"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mkoa
                  </label>
                  <input
                    type="text"
                    value={currentReport.region}
                    onChange={e => updateCurrentReport(p => ({ ...p, region: e.target.value }))}
                    placeholder="Mfano: Dar es Salaam"
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* 1.2 Jedwali la Wasimamizi */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      1.2 Jedwali la Wasimamizi wa Mtihani
                    </h3>
                    <p className="text-xs text-slate-500">
                      Orodha ya Msimamizi Mkuu, Mkuu wa Shule na Wasimamizi wa Vyumba vya Mtihani.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        invigilators: [
                          ...p.invigilators,
                          {
                            id: `inv-${Date.now()}`,
                            fullName: '',
                            role: 'Msimamizi',
                            workstation: '',
                            roomAssigned: `Chumba Na. 0${p.invigilators.length}`,
                            phone: ''
                          }
                        ]
                      }))
                    }
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Msimamizi</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-12 text-center">Na.</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Jina la Msimamizi</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-44">Cheo</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Kituo cha Kazi</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-44">Chumba Alichosimamia</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-40">Namba ya Simu</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-16 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {currentReport.invigilators.map((inv, idx) => (
                        <tr key={inv.id}>
                          <td className="p-2 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={inv.fullName}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  invigilators: p.invigilators.map(r => (r.id === inv.id ? { ...r, fullName: e.target.value } : r))
                                }))
                              }
                              placeholder="Jina kamili la msimamizi"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={inv.role}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  invigilators: p.invigilators.map(r =>
                                    r.id === inv.id ? { ...r, role: e.target.value as NectaInvigilatorRow['role'] } : r
                                  )
                                }))
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-semibold"
                            >
                              <option value="Msimamizi Mkuu">Msimamizi Mkuu</option>
                              <option value="Mkuu wa Shule">Mkuu wa Shule</option>
                              <option value="Msimamizi">Msimamizi</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={inv.workstation}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  invigilators: p.invigilators.map(r => (r.id === inv.id ? { ...r, workstation: e.target.value } : r))
                                }))
                              }
                              placeholder="Shule / Kituo cha kazi"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={inv.roomAssigned}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  invigilators: p.invigilators.map(r => (r.id === inv.id ? { ...r, roomAssigned: e.target.value } : r))
                                }))
                              }
                              placeholder="Mfano: Chumba Na. 01"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={inv.phone}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  invigilators: p.invigilators.map(r => (r.id === inv.id ? { ...r, phone: e.target.value } : r))
                                }))
                              }
                              placeholder="07XX XXX XXX"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  invigilators: p.invigilators.filter(r => r.id !== inv.id)
                                }))
                              }
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              title="Futa Mstari"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 1.3 Jedwali la Wataalam wa Maabara */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      1.3 Jedwali la Wataalam wa Maabara
                    </h3>
                    <p className="text-xs text-slate-500">
                      Walioandaa na kusimamia vifaa vya mitihani ya vitendo (Physics, Chemistry, Biology n.k.).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        labSpecialists: [
                          ...p.labSpecialists,
                          {
                            id: `lab-${Date.now()}`,
                            fullName: '',
                            workstation: p.centerName,
                            subjectPrepared: '',
                            phone: ''
                          }
                        ]
                      }))
                    }
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Mtaalam wa Maabara</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold">
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-12 text-center">Na.</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Jina la Mtaalam wa Maabara</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Kituo cha Kazi</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700">Somo Aliloandaa</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-40">Namba ya Simu</th>
                        <th className="p-2.5 border-b border-slate-200 dark:border-slate-700 w-16 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {currentReport.labSpecialists.map((lab, idx) => (
                        <tr key={lab.id}>
                          <td className="p-2 text-center font-bold text-slate-600">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={lab.fullName}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  labSpecialists: p.labSpecialists.map(r => (r.id === lab.id ? { ...r, fullName: e.target.value } : r))
                                }))
                              }
                              placeholder="Jina la mtaalam"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={lab.workstation}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  labSpecialists: p.labSpecialists.map(r => (r.id === lab.id ? { ...r, workstation: e.target.value } : r))
                                }))
                              }
                              placeholder="Kituo cha kazi"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={lab.subjectPrepared}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  labSpecialists: p.labSpecialists.map(r => (r.id === lab.id ? { ...r, subjectPrepared: e.target.value } : r))
                                }))
                              }
                              placeholder="Mfano: 031/2A Physics & 032/2A Chemistry"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={lab.phone}
                              onChange={e =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  labSpecialists: p.labSpecialists.map(r => (r.id === lab.id ? { ...r, phone: e.target.value } : r))
                                }))
                              }
                              placeholder="07XX XXX XXX"
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                updateCurrentReport(p => ({
                                  ...p,
                                  labSpecialists: p.labSpecialists.filter(r => r.id !== lab.id)
                                }))
                              }
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MAHUDHURIO YA WATAHINIWA (GENDER-WISE BREAKDOWN) */}
          {activeStep === 2 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Hatua ya 2: Mahudhurio ya Watahiniwa Kijinsia kwa Kila Somo (Ukurasa wa 17)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Formula Kiotomatiki: <strong className="text-slate-700 dark:text-slate-300">Jml = Me + Ke</strong> na{' '}
                    <strong className="text-slate-700 dark:text-slate-300">Waliofanya = Waliosajiliwa - Wasiofanya</strong> kwa Me na Ke husika.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadStandardSubjectsForExam(currentReport.examType)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Jaza Masomo ya {currentReport.examType}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const baseM = currentReport.attendanceRows[0]?.regMale || 45;
                      const baseF = currentReport.attendanceRows[0]?.regFemale || 50;
                      updateCurrentReport(p => ({
                        ...p,
                        attendanceRows: [
                          ...p.attendanceRows,
                          {
                            id: `att-${Date.now()}`,
                            subjectName: '',
                            regMale: baseM,
                            regFemale: baseF,
                            regTotal: baseM + baseF,
                            satMale: baseM,
                            satFemale: baseF,
                            satTotal: baseM + baseF,
                            absMale: 0,
                            absFemale: 0,
                            absTotal: 0,
                            absentCandidateNumbers: 'HAKUNA',
                            envelopesCount: 1
                          }
                        ]
                      }));
                    }}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Somo</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[11px] font-black uppercase">
                      <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center w-10">
                        Na.
                      </th>
                      <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 min-w-[180px]">
                        Somo (Code &amp; Jina la Somo)
                      </th>
                      <th colSpan={3} className="p-2 border border-slate-300 dark:border-slate-700 text-center bg-blue-50/70 dark:bg-blue-950/30">
                        Idadi ya Waliosajiliwa
                      </th>
                      <th colSpan={3} className="p-2 border border-slate-300 dark:border-slate-700 text-center bg-emerald-50/70 dark:bg-emerald-950/30">
                        Idadi ya Waliofanya Mtihani
                      </th>
                      <th colSpan={3} className="p-2 border border-slate-300 dark:border-slate-700 text-center bg-amber-50/70 dark:bg-amber-950/30">
                        Idadi ya Wasiofanya Mtihani
                      </th>
                      <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center w-28 bg-emerald-50/70 dark:bg-emerald-950/30">
                        Idadi ya Bahasha za Majibu Zilizopelekwa Halmashauri
                      </th>
                      <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 min-w-[210px]">
                        Orodha ya Namba za Watahiniwa Wasiofanya
                        <span className="block text-[10px] font-normal text-slate-500 normal-case">
                          (Mfano: {currentReport.centerNumber}/0001, 0008, 0059...)
                        </span>
                      </th>
                      <th rowSpan={2} className="p-2 border border-slate-300 dark:border-slate-700 text-center w-12">
                        Futa
                      </th>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-[11px] font-black text-center">
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16">Me</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16">Ke</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16 bg-blue-100/60 dark:bg-blue-900/40">Jml</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16">Me</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16">Ke</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16 bg-emerald-100/60 dark:bg-emerald-900/40">Jml</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16">Me</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16">Ke</th>
                      <th className="p-1.5 border border-slate-300 dark:border-slate-700 w-16 bg-amber-100/60 dark:bg-amber-900/40">Jml</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {currentReport.attendanceRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700 text-center font-bold">{idx + 1}</td>
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={row.subjectName}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'subjectName', e.target.value)}
                            placeholder="Mfano: 041 Basic Mathematics"
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-semibold"
                          />
                        </td>
                        {/* Waliosajiliwa: Me, Ke, Jml */}
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={row.regMale}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'regMale', e.target.value)}
                            className="w-14 px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={row.regFemale}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'regFemale', e.target.value)}
                            className="w-14 px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200 dark:border-slate-700 text-center font-black font-mono bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200">
                          {row.regTotal}
                        </td>

                        {/* Waliofanya: Me, Ke, Jml */}
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            max={row.regMale}
                            value={row.satMale}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'satMale', e.target.value)}
                            className="w-14 px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            max={row.regFemale}
                            value={row.satFemale}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'satFemale', e.target.value)}
                            className="w-14 px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200 dark:border-slate-700 text-center font-black font-mono bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200">
                          {row.satTotal}
                        </td>

                        {/* Wasiofanya: Me, Ke, Jml */}
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            max={row.regMale}
                            value={row.absMale}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'absMale', e.target.value)}
                            className="w-14 px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            max={row.regFemale}
                            value={row.absFemale}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'absFemale', e.target.value)}
                            className="w-14 px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono"
                          />
                        </td>
                        <td className="p-1 border border-slate-200 dark:border-slate-700 text-center font-black font-mono bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200">
                          {row.absTotal}
                        </td>

                        {/* Idadi ya Bahasha za Majibu Zilizopelekwa Halmashauri */}
                        <td className="p-1 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={row.envelopesCount}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'envelopesCount', e.target.value)}
                            className="w-full px-1.5 py-1 text-center border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono font-bold text-emerald-700 dark:text-emerald-400"
                          />
                        </td>

                        {/* Orodha ya Namba za Watahiniwa Wasiofanya */}
                        <td className="p-1.5 border border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={row.absentCandidateNumbers}
                            onChange={e => handleUpdateAttendanceRow(row.id, 'absentCandidateNumbers', e.target.value)}
                            placeholder={`${currentReport.centerNumber}/0001, 0008...`}
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-mono text-[11px]"
                          />
                        </td>

                        <td className="p-1.5 border border-slate-200 dark:border-slate-700 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateCurrentReport(p => ({
                                ...p,
                                attendanceRows: p.attendanceRows.filter(r => r.id !== row.id)
                              }))
                            }
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-900 dark:text-white">
                      <td colSpan={2} className="p-2.5 border border-slate-300 dark:border-slate-700 text-right uppercase">
                        JUMLA KUU YA MAHUDHURIO:
                      </td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{attendanceTotals.regMale}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{attendanceTotals.regFemale}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-blue-800 dark:text-blue-300">{attendanceTotals.regTotal}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{attendanceTotals.satMale}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{attendanceTotals.satFemale}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-emerald-800 dark:text-emerald-300">{attendanceTotals.satTotal}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{attendanceTotals.absMale}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">{attendanceTotals.absFemale}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-amber-800 dark:text-amber-300">{attendanceTotals.absTotal}</td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">{attendanceTotals.envelopesCount}</td>
                      <td colSpan={2} className="p-2.5 border border-slate-300 dark:border-slate-700 text-slate-500 font-normal">
                        Jumla kuu ya watahiniwa na bahasha za mitihani zote
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: VIFAA VYA MTIHANI */}
          {activeStep === 3 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Hatua ya 3: Taarifa ya Vifaa vya Mtihani (Ukurasa wa 18)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Booklet Normal, Booklet Graph, Loose Sheet Normal, Loose Sheet Graph, na BKM pamoja na hesabu ya JUMLA chini.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateCurrentReport(p => ({
                      ...p,
                      stationeryRows: [
                        ...p.stationeryRows,
                        {
                          id: `st-${Date.now()}`,
                          itemName: '',
                          received: 0,
                          used: 0,
                          remaining: 0,
                          shortage: 0,
                          remarks: ''
                        }
                      ]
                    }))
                  }
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ongeza Kifaa</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold">
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700 w-12 text-center">Na.</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700">Aina ya Kifaa cha Mtihani</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700 w-36 text-center">Zilizokabidhiwa</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700 w-36 text-center">Zilizotumika</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700 w-36 text-center">Zilizobaki</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700 w-36 text-center">Mapungufu</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700">Maelezo</th>
                      <th className="p-2.5 border border-slate-300 dark:border-slate-700 w-14 text-center">Futa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {currentReport.stationeryRows.map((st, idx) => (
                      <tr key={st.id}>
                        <td className="p-2 border border-slate-200 dark:border-slate-700 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={st.itemName}
                            onChange={e => handleUpdateStationeryRow(st.id, 'itemName', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-bold"
                          />
                        </td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={st.received}
                            onChange={e => handleUpdateStationeryRow(st.id, 'received', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-center font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={st.used}
                            onChange={e => handleUpdateStationeryRow(st.id, 'used', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-center font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={st.remaining}
                            onChange={e => handleUpdateStationeryRow(st.id, 'remaining', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-center font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30"
                          />
                        </td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700">
                          <input
                            type="number"
                            min={0}
                            value={st.shortage}
                            onChange={e => handleUpdateStationeryRow(st.id, 'shortage', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-center font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={st.remarks}
                            onChange={e => handleUpdateStationeryRow(st.id, 'remarks', e.target.value)}
                            placeholder="Maelezo ya ziada..."
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="p-2 border border-slate-200 dark:border-slate-700 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateCurrentReport(p => ({
                                ...p,
                                stationeryRows: p.stationeryRows.filter(r => r.id !== st.id)
                              }))
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-900 dark:text-white">
                      <td colSpan={2} className="p-2.5 border border-slate-300 dark:border-slate-700 text-right uppercase">
                        JUMLA KUU YA VIFAA:
                      </td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">
                        {stationeryTotals.received}
                      </td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono">
                        {stationeryTotals.used}
                      </td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-emerald-700 dark:text-emerald-400">
                        {stationeryTotals.remaining}
                      </td>
                      <td className="p-2.5 border border-slate-300 dark:border-slate-700 text-center font-mono text-rose-700 dark:text-rose-400">
                        {stationeryTotals.shortage}
                      </td>
                      <td colSpan={2} className="p-2.5 border border-slate-300 dark:border-slate-700 text-slate-500">
                        Zilizobaki = Zilizokabidhiwa - Zilizotumika - Mapungufu
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: DOSARI ZA USAJILI NA TUHUMA ZA UDANGANYIFU */}
          {activeStep === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Hatua ya 4: Dosari za Usajili na Tuhuma za Udanganyifu (Ukurasa wa 19 &amp; 20)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dosari za kawaida za usajili, watahiniwa walioongezwa nje ya CAL, waliokosea namba na tuhuma za udanganyifu.
                </p>
              </div>

              {/* 4.1 Dosari za Kawaida */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    4.1 Dosari za Kawaida za Usajili (Kutosajiliwa, Makosa ya Jinsi/Picha, Kufariki n.k.)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        registrationDefects: [
                          ...p.registrationDefects,
                          {
                            id: `def-${Date.now()}`,
                            candidateNumber: `${p.centerNumber}/00`,
                            candidateName: '',
                            defectType: 'Makosa ya Jinsi / Picha',
                            resolutionAndRecommendation: ''
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Dosari</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b w-36">Namba ya Mtahiniwa</th>
                        <th className="p-2 border-b w-52">Jina la Mtahiniwa</th>
                        <th className="p-2 border-b w-52">Aina ya Dosari</th>
                        <th className="p-2 border-b">Utatuzi na Mapendekezo ya Msimamizi</th>
                        <th className="p-2 border-b w-14 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.registrationDefects.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            Hakuna dosari za usajili zilizoongezwa. Bonyeza &ldquo;Ongeza Dosari&rdquo; kama zipo.
                          </td>
                        </tr>
                      ) : (
                        currentReport.registrationDefects.map((d, idx) => (
                          <tr key={d.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={d.candidateNumber}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    registrationDefects: p.registrationDefects.map(r =>
                                      r.id === d.id ? { ...r, candidateNumber: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={d.candidateName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    registrationDefects: p.registrationDefects.map(r =>
                                      r.id === d.id ? { ...r, candidateName: e.target.value.toUpperCase() } : r
                                    )
                                  }))
                                }
                                placeholder="JINA LA MTAHINIWA"
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={d.defectType}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    registrationDefects: p.registrationDefects.map(r =>
                                      r.id === d.id ? { ...r, defectType: e.target.value } : r
                                    )
                                  }))
                                }
                                placeholder="Mfano: Kutosajiliwa / Makosa ya Jinsi / Kufariki"
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={d.resolutionAndRecommendation}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    registrationDefects: p.registrationDefects.map(r =>
                                      r.id === d.id ? { ...r, resolutionAndRecommendation: e.target.value } : r
                                    )
                                  }))
                                }
                                placeholder="Hatua iliyochukuliwa au mapendekezo..."
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    registrationDefects: p.registrationDefects.filter(r => r.id !== d.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4.2 Watahiniwa Wasiokuwepo kwenye CAL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    4.2 Watahiniwa Wasiokuwepo Kwenye CAL (Watahiniwa Walioongezwa)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        nonCalCandidates: [
                          ...p.nonCalCandidates,
                          {
                            id: `ncal-${Date.now()}`,
                            candidateName: '',
                            qualification: 'Uhamisho Rasmi / Kibali cha NECTA',
                            gender: 'Me',
                            examNumberUsed: `${p.centerNumber}/`,
                            subjectsTaken: 'Masomo Yote'
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Mtahiniwa wa CAL</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b">Jina la Mtahiniwa</th>
                        <th className="p-2 border-b">Sifa za Kuongezwa</th>
                        <th className="p-2 border-b w-24">Jinsi</th>
                        <th className="p-2 border-b w-40">Namba Aliyofanyia</th>
                        <th className="p-2 border-b">Masomo Aliyofanya</th>
                        <th className="p-2 border-b w-14 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.nonCalCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            Hakuna watahiniwa walioongezwa nje ya CAL.
                          </td>
                        </tr>
                      ) : (
                        currentReport.nonCalCandidates.map((c, idx) => (
                          <tr key={c.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={c.candidateName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    nonCalCandidates: p.nonCalCandidates.map(r =>
                                      r.id === c.id ? { ...r, candidateName: e.target.value.toUpperCase() } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={c.qualification}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    nonCalCandidates: p.nonCalCandidates.map(r =>
                                      r.id === c.id ? { ...r, qualification: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={c.gender}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    nonCalCandidates: p.nonCalCandidates.map(r =>
                                      r.id === c.id ? { ...r, gender: e.target.value as 'Me' | 'Ke' } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              >
                                <option value="Me">Me</option>
                                <option value="Ke">Ke</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={c.examNumberUsed}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    nonCalCandidates: p.nonCalCandidates.map(r =>
                                      r.id === c.id ? { ...r, examNumberUsed: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={c.subjectsTaken}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    nonCalCandidates: p.nonCalCandidates.map(r =>
                                      r.id === c.id ? { ...r, subjectsTaken: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    nonCalCandidates: p.nonCalCandidates.filter(r => r.id !== c.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4.3 Watahiniwa Waliokosea Namba */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    4.3 Watahiniwa Waliokosea Namba za Mtihani
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        wrongNumberCandidates: [
                          ...p.wrongNumberCandidates,
                          {
                            id: `wn-${Date.now()}`,
                            candidateName: '',
                            correctCalNumber: `${p.centerNumber}/00`,
                            wrongNumberUsed: `${p.centerNumber}/00`,
                            subjectsAffected: ''
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Aliyekosea Namba</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b">Jina la Mtahiniwa</th>
                        <th className="p-2 border-b w-44">Namba Sahihi ya CAL</th>
                        <th className="p-2 border-b w-44">Namba Aliyotumia Kimakosa</th>
                        <th className="p-2 border-b">Masomo Aliyokosea</th>
                        <th className="p-2 border-b w-14 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.wrongNumberCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            Hakuna watahiniwa waliokosea namba za mtihani.
                          </td>
                        </tr>
                      ) : (
                        currentReport.wrongNumberCandidates.map((w, idx) => (
                          <tr key={w.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.candidateName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    wrongNumberCandidates: p.wrongNumberCandidates.map(r =>
                                      r.id === w.id ? { ...r, candidateName: e.target.value.toUpperCase() } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.correctCalNumber}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    wrongNumberCandidates: p.wrongNumberCandidates.map(r =>
                                      r.id === w.id ? { ...r, correctCalNumber: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.wrongNumberUsed}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    wrongNumberCandidates: p.wrongNumberCandidates.map(r =>
                                      r.id === w.id ? { ...r, wrongNumberUsed: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={w.subjectsAffected}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    wrongNumberCandidates: p.wrongNumberCandidates.map(r =>
                                      r.id === w.id ? { ...r, subjectsAffected: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    wrongNumberCandidates: p.wrongNumberCandidates.filter(r => r.id !== w.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4.4 Tuhuma za Udanganyifu */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-rose-700 dark:text-rose-400">
                    4.4 Tuhuma za Udanganyifu (Tarehe, Mtahiniwa, Somo, Tuhuma, Hatua &amp; Vielelezo)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        malpracticeCases: [
                          ...p.malpracticeCases,
                          {
                            id: `mal-${Date.now()}`,
                            incidentDate: p.startDate,
                            candidateNumberAndName: `${p.centerNumber}/00 - `,
                            subjectName: '',
                            allegationDetails: '',
                            actionsTaken: 'Ameandikishwa maelezo na fomu rasmi imejazwa',
                            attachedEvidenceList: 'Karatasi za majibu, kikokotoo / notes zilizokamatwa'
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Tukio la Udanganyifu</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b w-32">Tarehe ya Tukio</th>
                        <th className="p-2 border-b w-48">Namba &amp; Jina la Mtahiniwa</th>
                        <th className="p-2 border-b w-36">Somo</th>
                        <th className="p-2 border-b">Tuhuma</th>
                        <th className="p-2 border-b">Hatua Zilizochukuliwa</th>
                        <th className="p-2 border-b">Orodha ya Vielelezo Vilivyoambatanishwa</th>
                        <th className="p-2 border-b w-12 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.malpracticeCases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-500">
                            Hakuna tuhuma za udanganyifu zilizoripotiwa kwenye kituo hiki.
                          </td>
                        </tr>
                      ) : (
                        currentReport.malpracticeCases.map((m, idx) => (
                          <tr key={m.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={m.incidentDate}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.map(r =>
                                      r.id === m.id ? { ...r, incidentDate: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={m.candidateNumberAndName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.map(r =>
                                      r.id === m.id ? { ...r, candidateNumberAndName: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={m.subjectName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.map(r =>
                                      r.id === m.id ? { ...r, subjectName: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={m.allegationDetails}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.map(r =>
                                      r.id === m.id ? { ...r, allegationDetails: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={m.actionsTaken}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.map(r =>
                                      r.id === m.id ? { ...r, actionsTaken: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={m.attachedEvidenceList}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.map(r =>
                                      r.id === m.id ? { ...r, attachedEvidenceList: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    malpracticeCases: p.malpracticeCases.filter(r => r.id !== m.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: RIPOTI MAALUM ZA WATAHINIWA */}
          {activeStep === 5 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Hatua ya 5: Ripoti Maalum za Watahiniwa (Ukurasa wa 21)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Watahiniwa waliougua, fomu ya dharura kwa aliyeugua mtihani ukiendelea, wenye mahitaji maalum na ambao hawakufanya mitihani yote.
                </p>
              </div>

              {/* 5.1 Watahiniwa Waliougua na Kushindwa Mitihani */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    5.1 Watahiniwa Waliougua na Kushindwa Kufanya Mitihani Yote / Baadhi
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        sickCandidatesAll: [
                          ...p.sickCandidatesAll,
                          {
                            id: `sick-${Date.now()}`,
                            candidateNumber: `${p.centerNumber}/00`,
                            candidateName: '',
                            gender: 'Ke',
                            subjectsMissed: 'Masomo Yote',
                            illnessDetails: '',
                            supervisorRemarks: ''
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Mtahiniwa Aliyeugua</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b w-36">Namba ya Mtahiniwa</th>
                        <th className="p-2 border-b w-48">Jina la Mtahiniwa</th>
                        <th className="p-2 border-b w-20">Jinsi</th>
                        <th className="p-2 border-b">Masomo Aliyoshindwa</th>
                        <th className="p-2 border-b">Hali ya Ugonjwa / Cheti cha Daktari</th>
                        <th className="p-2 border-b">Maoni ya Msimamizi</th>
                        <th className="p-2 border-b w-12 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.sickCandidatesAll.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-500">
                            Hakuna watahiniwa waliougua na kushindwa mitihani yote.
                          </td>
                        </tr>
                      ) : (
                        currentReport.sickCandidatesAll.map((s, idx) => (
                          <tr key={s.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.candidateNumber}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.map(r =>
                                      r.id === s.id ? { ...r, candidateNumber: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.candidateName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.map(r =>
                                      r.id === s.id ? { ...r, candidateName: e.target.value.toUpperCase() } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={s.gender}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.map(r =>
                                      r.id === s.id ? { ...r, gender: e.target.value as 'Me' | 'Ke' } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              >
                                <option value="Me">Me</option>
                                <option value="Ke">Ke</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.subjectsMissed}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.map(r =>
                                      r.id === s.id ? { ...r, subjectsMissed: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.illnessDetails}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.map(r =>
                                      r.id === s.id ? { ...r, illnessDetails: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={s.supervisorRemarks}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.map(r =>
                                      r.id === s.id ? { ...r, supervisorRemarks: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    sickCandidatesAll: p.sickCandidatesAll.filter(r => r.id !== s.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5.2 Fomu Maalum ya Dharura kwa Mtahiniwa Aliyeugua Mtihani Ukiendelea */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    5.2 Fomu Maalum ya Dharura kwa Mtahiniwa Aliyeugua Mtihani Ukiendelea
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        emergencySickDuringExam: [
                          ...p.emergencySickDuringExam,
                          {
                            id: `emg-${Date.now()}`,
                            candidateNumberAndName: `${p.centerNumber}/00 - `,
                            subjectAndDate: '',
                            timeFellIll: '09:15 Asubuhi',
                            timeResumedOrTreated: '09:45 Asubuhi',
                            extraMinutesGranted: 'Dakika 30',
                            supervisorAdvice: 'Alipata huduma ya kwanza na kuongezewa muda wa dakika 30 kukamilisha mtihani.'
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Fomu ya Dharura</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b">Namba &amp; Jina la Mtahiniwa</th>
                        <th className="p-2 border-b">Somo &amp; Tarehe</th>
                        <th className="p-2 border-b w-32">Muda Aliougua</th>
                        <th className="p-2 border-b w-32">Muda wa Matibabu</th>
                        <th className="p-2 border-b w-32">Muda Alioongezewa</th>
                        <th className="p-2 border-b">Ushauri wa Msimamizi</th>
                        <th className="p-2 border-b w-12 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.emergencySickDuringExam.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-slate-500">
                            Hakuna tukio la dharura la mtahiniwa kuugua mtihani ukiendelea.
                          </td>
                        </tr>
                      ) : (
                        currentReport.emergencySickDuringExam.map((em, idx) => (
                          <tr key={em.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={em.candidateNumberAndName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.map(r =>
                                      r.id === em.id ? { ...r, candidateNumberAndName: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={em.subjectAndDate}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.map(r =>
                                      r.id === em.id ? { ...r, subjectAndDate: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={em.timeFellIll}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.map(r =>
                                      r.id === em.id ? { ...r, timeFellIll: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={em.timeResumedOrTreated}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.map(r =>
                                      r.id === em.id ? { ...r, timeResumedOrTreated: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={em.extraMinutesGranted}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.map(r =>
                                      r.id === em.id ? { ...r, extraMinutesGranted: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={em.supervisorAdvice}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.map(r =>
                                      r.id === em.id ? { ...r, supervisorAdvice: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    emergencySickDuringExam: p.emergencySickDuringExam.filter(r => r.id !== em.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5.3 Watahiniwa Wenye Mahitaji Maalum */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    5.3 Watahiniwa Wenye Mahitaji Maalum (Ulemavu, Aina ya Mtihani &amp; Masomo)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        specialNeedsCandidates: [
                          ...p.specialNeedsCandidates,
                          {
                            id: `spn-${Date.now()}`,
                            candidateNumberAndName: `${p.centerNumber}/00 - `,
                            gender: 'Me',
                            disabilityType: 'Uoni Hafifu (Low Vision)',
                            examFormatTaken: 'Maandishi Makubwa (Large Print)',
                            subjectsTaken: 'Masomo Yote'
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Mwenye Mahitaji Maalum</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b">Namba &amp; Jina la Mtahiniwa</th>
                        <th className="p-2 border-b w-20">Jinsi</th>
                        <th className="p-2 border-b">Aina ya Ulemavu</th>
                        <th className="p-2 border-b">Aina ya Mtihani Aliofanya</th>
                        <th className="p-2 border-b">Masomo Aliyofanya</th>
                        <th className="p-2 border-b w-12 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.specialNeedsCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            Hakuna watahiniwa wenye mahitaji maalum walioorodheshwa.
                          </td>
                        </tr>
                      ) : (
                        currentReport.specialNeedsCandidates.map((sp, idx) => (
                          <tr key={sp.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={sp.candidateNumberAndName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    specialNeedsCandidates: p.specialNeedsCandidates.map(r =>
                                      r.id === sp.id ? { ...r, candidateNumberAndName: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={sp.gender}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    specialNeedsCandidates: p.specialNeedsCandidates.map(r =>
                                      r.id === sp.id ? { ...r, gender: e.target.value as 'Me' | 'Ke' } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              >
                                <option value="Me">Me</option>
                                <option value="Ke">Ke</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={sp.disabilityType}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    specialNeedsCandidates: p.specialNeedsCandidates.map(r =>
                                      r.id === sp.id ? { ...r, disabilityType: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={sp.examFormatTaken}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    specialNeedsCandidates: p.specialNeedsCandidates.map(r =>
                                      r.id === sp.id ? { ...r, examFormatTaken: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={sp.subjectsTaken}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    specialNeedsCandidates: p.specialNeedsCandidates.map(r =>
                                      r.id === sp.id ? { ...r, subjectsTaken: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    specialNeedsCandidates: p.specialNeedsCandidates.filter(r => r.id !== sp.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5.4 Watahiniwa Ambao Hawakufanya Mitihani Yote */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    5.4 Watahiniwa Ambao Hawakufanya Mitihani Yote (Sababu &amp; Maoni ya Mkuu wa Shule)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentReport(p => ({
                        ...p,
                        allSubjectsAbsentees: [
                          ...p.allSubjectsAbsentees,
                          {
                            id: `abs-${Date.now()}`,
                            candidateNumber: `${p.centerNumber}/00`,
                            candidateName: '',
                            gender: 'Me',
                            reasonForAbsence: 'Utoro / Ugonjwa',
                            headmasterRemarks: ''
                          }
                        ]
                      }))
                    }
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeza Asiyefanya Mitihani Yote</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                        <th className="p-2 border-b w-10 text-center">Na.</th>
                        <th className="p-2 border-b w-36">Namba ya Mtahiniwa</th>
                        <th className="p-2 border-b w-48">Jina la Mtahiniwa</th>
                        <th className="p-2 border-b w-20">Jinsi</th>
                        <th className="p-2 border-b">Sababu za Kutofanya Mitihani Yote</th>
                        <th className="p-2 border-b">Maoni ya Mkuu wa Shule</th>
                        <th className="p-2 border-b w-12 text-center">Futa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentReport.allSubjectsAbsentees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            Hakuna watahiniwa ambao hawakufanya mitihani yote.
                          </td>
                        </tr>
                      ) : (
                        currentReport.allSubjectsAbsentees.map((ab, idx) => (
                          <tr key={ab.id}>
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={ab.candidateNumber}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    allSubjectsAbsentees: p.allSubjectsAbsentees.map(r =>
                                      r.id === ab.id ? { ...r, candidateNumber: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={ab.candidateName}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    allSubjectsAbsentees: p.allSubjectsAbsentees.map(r =>
                                      r.id === ab.id ? { ...r, candidateName: e.target.value.toUpperCase() } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={ab.gender}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    allSubjectsAbsentees: p.allSubjectsAbsentees.map(r =>
                                      r.id === ab.id ? { ...r, gender: e.target.value as 'Me' | 'Ke' } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              >
                                <option value="Me">Me</option>
                                <option value="Ke">Ke</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={ab.reasonForAbsence}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    allSubjectsAbsentees: p.allSubjectsAbsentees.map(r =>
                                      r.id === ab.id ? { ...r, reasonForAbsence: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={ab.headmasterRemarks}
                                onChange={e =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    allSubjectsAbsentees: p.allSubjectsAbsentees.map(r =>
                                      r.id === ab.id ? { ...r, headmasterRemarks: e.target.value } : r
                                    )
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentReport(p => ({
                                    ...p,
                                    allSubjectsAbsentees: p.allSubjectsAbsentees.filter(r => r.id !== ab.id)
                                  }))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: MATUKIO YASIYO YA KAWAIDA NA SAINI */}
          {activeStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Hatua ya 6: Matukio Yasiyo ya Kawaida, Mapendekezo na Saini (Ukurasa wa 22)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jaza maelezo ya matukio yasiyo ya kawaida, maoni/mapendekezo ya msimamizi mkuu na sehemu ya saini/tarehe.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    6.1 Maelezo ya Matukio Yasiyo ya Kawaida Wakati wa Mtihani
                  </label>
                  <textarea
                    rows={5}
                    value={currentReport.unusualEventsNotes}
                    onChange={e => updateCurrentReport(p => ({ ...p, unusualEventsNotes: e.target.value }))}
                    placeholder="Eleza matukio yoyote yasiyo ya kawaida yaliyojitokeza..."
                    className="w-full p-3 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    6.2 Maoni na Mapendekezo ya Msimamizi Mkuu
                  </label>
                  <textarea
                    rows={5}
                    value={currentReport.chiefSupervisorRecommendations}
                    onChange={e => updateCurrentReport(p => ({ ...p, chiefSupervisorRecommendations: e.target.value }))}
                    placeholder="Andika maoni au mapendekezo ya kuboresha usimamizi wa mitihani..."
                    className="w-full p-3 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Uthibitisho wa Msimamizi Mkuu */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    Uthibitisho na Saini ya Msimamizi Mkuu
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Jina la Msimamizi Mkuu
                      </label>
                      <input
                        type="text"
                        value={currentReport.chiefSupervisorName}
                        onChange={e => updateCurrentReport(p => ({ ...p, chiefSupervisorName: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Namba ya Simu
                      </label>
                      <input
                        type="text"
                        value={currentReport.chiefSupervisorPhone}
                        onChange={e => updateCurrentReport(p => ({ ...p, chiefSupervisorPhone: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Kituo cha Kazi
                      </label>
                      <input
                        type="text"
                        value={currentReport.chiefSupervisorWorkstation}
                        onChange={e => updateCurrentReport(p => ({ ...p, chiefSupervisorWorkstation: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Saini (Maandishi / Herufi) &amp; Tarehe
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentReport.chiefSupervisorSignature}
                          onChange={e => updateCurrentReport(p => ({ ...p, chiefSupervisorSignature: e.target.value }))}
                          placeholder="Saini"
                          className="w-1/2 px-2.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 italic font-serif"
                        />
                        <input
                          type="date"
                          value={currentReport.signDate}
                          onChange={e => updateCurrentReport(p => ({ ...p, signDate: e.target.value }))}
                          className="w-1/2 px-2 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uthibitisho wa Mkuu wa Shule */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                    Uthibitisho wa Mkuu wa Shule / Kituo
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Jina la Mkuu wa Shule
                      </label>
                      <input
                        type="text"
                        value={currentReport.headmasterName}
                        onChange={e => updateCurrentReport(p => ({ ...p, headmasterName: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Namba ya Simu
                      </label>
                      <input
                        type="text"
                        value={currentReport.headmasterPhone}
                        onChange={e => updateCurrentReport(p => ({ ...p, headmasterPhone: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Tarehe
                      </label>
                      <input
                        type="date"
                        value={currentReport.headmasterSignDate}
                        onChange={e => updateCurrentReport(p => ({ ...p, headmasterSignDate: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM WIZARD STEP NAVIGATION */}
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => setActiveStep(s => Math.max(1, s - 1))}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Hatua Iliyopita</span>
            </button>

            <div className="text-xs font-bold text-slate-500">
              Hatua ya {activeStep} kati ya 6
            </div>

            {activeStep < 6 ? (
              <button
                type="button"
                onClick={() => setActiveStep(s => Math.min(6, s + 1))}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Hatua Inayofuata</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('a4_preview')}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Hakiki Karatasi za A4 (Uk. 16–22)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          OFFICIAL A4 PRINTABLE DOCUMENT VIEW (KURASA 1 HADI 6)
          Visible in 'a4_preview' mode AND always active during @media print
         ===================================================================== */}
      <div
        id="necta-official-a4-report-printable"
        className={`${viewMode === 'a4_preview' ? 'block' : 'hidden'} print:block print-portrait space-y-8 print:space-y-0`}
      >
        {/* UKURASA WA 1: TAARIFA YA KITUO & WASIMAMIZI (BLUE THEME) */}
        <section className="bg-white text-black p-8 print:p-0 border border-slate-300 print:border-0 rounded-xl shadow-sm max-w-[210mm] mx-auto print:max-w-none print:page-break-after print:break-inside-avoid">
          <div className="flex items-center justify-between border-b-2 border-blue-900 pb-3 mb-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-emerald-700 bg-emerald-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-emerald-800 leading-none">TANZANIA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COAT OF ARMS</span>
            </div>
            <div className="text-center flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">JAMHURI YA MUUNGANO WA TANZANIA</p>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">BARAZA LA MITIHANI LA TANZANIA (NECTA)</h2>
              <p className="text-[11px] font-bold uppercase text-slate-900 mt-0.5">
                {currentReport.title || `TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA (${currentReport.examType} — ${currentReport.examYear})`}
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                {EXAM_TYPE_LABELS[currentReport.examType]?.fullSw || currentReport.examType} — Kituo: {currentReport.centerNumber} {currentReport.centerName}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-blue-700 bg-blue-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-blue-800 leading-none">NECTA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COUNCIL</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-black uppercase mb-2 text-blue-900">
            <span>1. TAARIFA YA KITUO CHA MTIHANI NA WASIMAMIZI</span>
            <span>Ukurasa wa 1 ya 6</span>
          </div>

          <table className="w-full border-collapse border border-black text-xs mb-5 print:break-inside-avoid">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-blue-100 text-blue-900 w-36">Namba ya Kituo:</td>
                <td className="border border-black p-1.5 font-mono font-bold">{currentReport.centerNumber}</td>
                <td className="border border-black p-1.5 font-bold bg-blue-100 text-blue-900 w-36">Jina la Kituo:</td>
                <td className="border border-black p-1.5 font-bold" colSpan={3}>{currentReport.centerName}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-blue-100 text-blue-900">Aina ya Mtihani:</td>
                <td className="border border-black p-1.5 font-bold">{currentReport.examType} ({currentReport.examYear})</td>
                <td className="border border-black p-1.5 font-bold bg-blue-100 text-blue-900">Idadi ya Vyumba:</td>
                <td className="border border-black p-1.5 font-bold">{currentReport.roomsCount}</td>
                <td className="border border-black p-1.5 font-bold bg-blue-100 text-blue-900">Halmashauri / Mkoa:</td>
                <td className="border border-black p-1.5">{currentReport.council} — {currentReport.region}</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-xs font-black uppercase mb-1.5 text-blue-900">1.2 Jedwali la Wasimamizi wa Mtihani</h3>
          <table className="w-full border-collapse border border-black text-xs mb-5 print:break-inside-avoid">
            <thead>
              <tr className="bg-blue-100 text-blue-900 font-bold">
                <th className="border border-black p-1.5 w-10 text-center">Na.</th>
                <th className="border border-black p-1.5 text-left">Jina la Msimamizi</th>
                <th className="border border-black p-1.5 text-left">Cheo</th>
                <th className="border border-black p-1.5 text-left">Kituo cha Kazi</th>
                <th className="border border-black p-1.5 text-left">Chumba Alichosimamia</th>
                <th className="border border-black p-1.5 text-left">Namba ya Simu</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.invigilators.map((inv, idx) => (
                <tr key={inv.id}>
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-semibold">{inv.fullName}</td>
                  <td className="border border-black p-1.5">{inv.role}</td>
                  <td className="border border-black p-1.5">{inv.workstation}</td>
                  <td className="border border-black p-1.5">{inv.roomAssigned}</td>
                  <td className="border border-black p-1.5 font-mono">{inv.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-xs font-black uppercase mb-1.5 text-blue-900">1.3 Jedwali la Wataalam wa Maabara</h3>
          <table className="w-full border-collapse border border-black text-xs print:break-inside-avoid">
            <thead>
              <tr className="bg-blue-100 text-blue-900 font-bold">
                <th className="border border-black p-1.5 w-10 text-center">Na.</th>
                <th className="border border-black p-1.5 text-left">Jina la Mtaalam wa Maabara</th>
                <th className="border border-black p-1.5 text-left">Kituo cha Kazi</th>
                <th className="border border-black p-1.5 text-left">Somo Aliloandaa</th>
                <th className="border border-black p-1.5 text-left">Namba ya Simu</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.labSpecialists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-2 text-center">HAKUNA</td>
                </tr>
              ) : (
                currentReport.labSpecialists.map((lab, idx) => (
                  <tr key={lab.id}>
                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-semibold">{lab.fullName}</td>
                    <td className="border border-black p-1.5">{lab.workstation}</td>
                    <td className="border border-black p-1.5">{lab.subjectPrepared}</td>
                    <td className="border border-black p-1.5 font-mono">{lab.phone}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-6 pt-2 border-t border-black flex justify-between text-[10px] font-bold">
            <span>Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — {currentReport.centerNumber} {currentReport.centerName}</span>
            <span>Ukurasa wa 1 ya 6</span>
          </div>
        </section>

        {/* UKURASA WA 2: MAHUDHURIO YA WATAHINIWA KIJINSIA */}
        <section className="bg-white text-black p-8 print:p-0 border border-slate-300 print:border-0 rounded-xl shadow-sm max-w-[210mm] mx-auto print:max-w-none print:page-break-after">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-emerald-700 bg-emerald-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-emerald-800 leading-none">TANZANIA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COAT OF ARMS</span>
            </div>
            <div className="text-center flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">JAMHURI YA MUUNGANO WA TANZANIA</p>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">BARAZA LA MITIHANI LA TANZANIA (NECTA)</h2>
              <p className="text-[11px] font-bold uppercase text-slate-900 mt-0.5">
                {currentReport.title || `TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA (${currentReport.examType} — ${currentReport.examYear})`}
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                {EXAM_TYPE_LABELS[currentReport.examType]?.fullSw || currentReport.examType} — Kituo: {currentReport.centerNumber} {currentReport.centerName}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-blue-700 bg-blue-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-blue-800 leading-none">NECTA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COUNCIL</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black pb-2 mb-3 text-xs font-black uppercase">
            <span>2. MAHUDHURIO YA WATAHINIWA KWA KILA SOMO KIJINSIA NA BAHASHA</span>
            <span>Ukurasa wa 2 ya 6</span>
          </div>

          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th rowSpan={2} className="border border-black p-1 text-center w-8">Na.</th>
                <th rowSpan={2} className="border border-black p-1 text-left">Somo (Jina la Somo)</th>
                <th colSpan={3} className="border border-black p-1 text-center">Waliosajiliwa</th>
                <th colSpan={3} className="border border-black p-1 text-center">Waliofanya</th>
                <th colSpan={3} className="border border-black p-1 text-center">Wasiofanya</th>
                <th rowSpan={2} className="border border-black p-1 text-center w-16">Bahasha Zilizopelekwa</th>
                <th rowSpan={2} className="border border-black p-1 text-left">
                  Orodha ya Namba za Watahiniwa Wasiofanya
                </th>
              </tr>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-0.5 w-7">Me</th>
                <th className="border border-black p-0.5 w-7">Ke</th>
                <th className="border border-black p-0.5 w-8">Jml</th>
                <th className="border border-black p-0.5 w-7">Me</th>
                <th className="border border-black p-0.5 w-7">Ke</th>
                <th className="border border-black p-0.5 w-8">Jml</th>
                <th className="border border-black p-0.5 w-7">Me</th>
                <th className="border border-black p-0.5 w-7">Ke</th>
                <th className="border border-black p-0.5 w-8">Jml</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.attendanceRows.map((row, idx) => (
                <tr key={row.id}>
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 font-semibold">{row.subjectName}</td>
                  <td className="border border-black p-1 text-center font-mono">{row.regMale}</td>
                  <td className="border border-black p-1 text-center font-mono">{row.regFemale}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{row.regTotal}</td>
                  <td className="border border-black p-1 text-center font-mono">{row.satMale}</td>
                  <td className="border border-black p-1 text-center font-mono">{row.satFemale}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{row.satTotal}</td>
                  <td className="border border-black p-1 text-center font-mono">{row.absMale}</td>
                  <td className="border border-black p-1 text-center font-mono">{row.absFemale}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{row.absTotal}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{row.envelopesCount}</td>
                  <td className="border border-black p-1 font-mono text-[9px]">{row.absentCandidateNumbers || 'HAKUNA'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td colSpan={2} className="border border-black p-1 text-right uppercase">JUMLA KUU:</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.regMale}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.regFemale}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.regTotal}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.satMale}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.satFemale}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.satTotal}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.absMale}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.absFemale}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.absTotal}</td>
                <td className="border border-black p-1 text-center font-mono">{attendanceTotals.envelopesCount}</td>
                <td className="border border-black p-1">Jumla ya Takwimu Zote</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 pt-2 border-t border-black flex justify-between text-[10px] font-bold">
            <span>Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — {currentReport.centerNumber} {currentReport.centerName}</span>
            <span>Ukurasa wa 2 ya 6</span>
          </div>
        </section>

        {/* UKURASA WA 3: VIFAA VYA MTIHANI */}
        <section className="bg-white text-black p-8 print:p-0 border border-slate-300 print:border-0 rounded-xl shadow-sm max-w-[210mm] mx-auto print:max-w-none print:page-break-after">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-emerald-700 bg-emerald-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-emerald-800 leading-none">TANZANIA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COAT OF ARMS</span>
            </div>
            <div className="text-center flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">JAMHURI YA MUUNGANO WA TANZANIA</p>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">BARAZA LA MITIHANI LA TANZANIA (NECTA)</h2>
              <p className="text-[11px] font-bold uppercase text-slate-900 mt-0.5">
                TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA ({currentReport.examType} — {currentReport.examYear})
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                {EXAM_TYPE_LABELS[currentReport.examType].fullSw} — Kituo: {currentReport.centerNumber} {currentReport.centerName}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-blue-700 bg-blue-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-blue-800 leading-none">NECTA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COUNCIL</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black pb-2 mb-3 text-xs font-black uppercase">
            <span>3. TAARIFA YA VIFAA VYA MTIHANI (BOOKLETS & LOOSE SHEETS)</span>
            <span>Ukurasa wa 3 ya 6</span>
          </div>

          <table className="w-full border-collapse border border-black text-xs mb-6">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-10 text-center">Na.</th>
                <th className="border border-black p-1.5 text-left">Aina ya Kifaa cha Mtihani</th>
                <th className="border border-black p-1.5 text-center w-28">Zilizokabidhiwa</th>
                <th className="border border-black p-1.5 text-center w-28">Zilizotumika</th>
                <th className="border border-black p-1.5 text-center w-28">Zilizobaki</th>
                <th className="border border-black p-1.5 text-center w-24">Mapungufu</th>
                <th className="border border-black p-1.5 text-left">Maelezo</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.stationeryRows.map((st, idx) => (
                <tr key={st.id}>
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-semibold">{st.itemName}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{st.received}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{st.used}</td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">{st.remaining}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{st.shortage}</td>
                  <td className="border border-black p-1.5">{st.remarks}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-black">
                <td colSpan={2} className="border border-black p-1.5 text-right uppercase">JUMLA:</td>
                <td className="border border-black p-1.5 text-center font-mono">{stationeryTotals.received}</td>
                <td className="border border-black p-1.5 text-center font-mono">{stationeryTotals.used}</td>
                <td className="border border-black p-1.5 text-center font-mono">{stationeryTotals.remaining}</td>
                <td className="border border-black p-1.5 text-center font-mono">{stationeryTotals.shortage}</td>
                <td className="border border-black p-1.5">Jumla ya Vifaa Vyote</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 pt-2 border-t border-black flex justify-between text-[10px] font-bold">
            <span>Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — {currentReport.centerNumber} {currentReport.centerName}</span>
            <span>Ukurasa wa 3 ya 6</span>
          </div>
        </section>

        {/* UKURASA WA 4: DOSARI ZA USAJILI & UDANGANYIFU */}
        <section className="bg-white text-black p-8 print:p-0 border border-slate-300 print:border-0 rounded-xl shadow-sm max-w-[210mm] mx-auto print:max-w-none print:page-break-after">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-emerald-700 bg-emerald-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-emerald-800 leading-none">TANZANIA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COAT OF ARMS</span>
            </div>
            <div className="text-center flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">JAMHURI YA MUUNGANO WA TANZANIA</p>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">BARAZA LA MITIHANI LA TANZANIA (NECTA)</h2>
              <p className="text-[11px] font-bold uppercase text-slate-900 mt-0.5">
                TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA ({currentReport.examType} — {currentReport.examYear})
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                {EXAM_TYPE_LABELS[currentReport.examType].fullSw} — Kituo: {currentReport.centerNumber} {currentReport.centerName}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-blue-700 bg-blue-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-blue-800 leading-none">NECTA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COUNCIL</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black pb-2 mb-3 text-xs font-black uppercase">
            <span>4. DOSARI ZA USAJILI, WATAHINIWA WA CAL NA TUHUMA ZA UDANGANYIFU</span>
            <span>Ukurasa wa 4 ya 6</span>
          </div>

          <h3 className="text-xs font-black uppercase mb-1.5">4.1 Dosari za Kawaida za Usajili</h3>
          <table className="w-full border-collapse border border-black text-xs mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-10 text-center">Na.</th>
                <th className="border border-black p-1.5 w-32">Namba ya Mtahiniwa</th>
                <th className="border border-black p-1.5">Jina la Mtahiniwa</th>
                <th className="border border-black p-1.5">Aina ya Dosari</th>
                <th className="border border-black p-1.5">Utatuzi / Mapendekezo</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.registrationDefects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-2 text-center">HAKUNA DOSARI ZA USAJILI ZILIZOJITOKEZA</td>
                </tr>
              ) : (
                currentReport.registrationDefects.map((d, i) => (
                  <tr key={d.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5 font-mono">{d.candidateNumber}</td>
                    <td className="border border-black p-1.5 font-semibold">{d.candidateName}</td>
                    <td className="border border-black p-1.5">{d.defectType}</td>
                    <td className="border border-black p-1.5">{d.resolutionAndRecommendation}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-xs font-black uppercase mb-1.5">4.2 Watahiniwa Wasiokuwepo kwenye CAL</h3>
          <table className="w-full border-collapse border border-black text-xs mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-10 text-center">Na.</th>
                <th className="border border-black p-1.5">Jina la Mtahiniwa</th>
                <th className="border border-black p-1.5">Sifa za Kuongezwa</th>
                <th className="border border-black p-1.5 w-16 text-center">Jinsi</th>
                <th className="border border-black p-1.5 w-36">Namba Aliyofanyia</th>
                <th className="border border-black p-1.5">Masomo Aliyofanya</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.nonCalCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black p-2 text-center">HAKUNA</td>
                </tr>
              ) : (
                currentReport.nonCalCandidates.map((c, i) => (
                  <tr key={c.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5 font-semibold">{c.candidateName}</td>
                    <td className="border border-black p-1.5">{c.qualification}</td>
                    <td className="border border-black p-1.5 text-center">{c.gender}</td>
                    <td className="border border-black p-1.5 font-mono">{c.examNumberUsed}</td>
                    <td className="border border-black p-1.5">{c.subjectsTaken}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-xs font-black uppercase mb-1.5">4.3 Tuhuma za Udanganyifu katika Mtihani</h3>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-10 text-center">Na.</th>
                <th className="border border-black p-1.5 w-24">Tarehe</th>
                <th className="border border-black p-1.5">Namba &amp; Jina la Mtahiniwa</th>
                <th className="border border-black p-1.5">Somo</th>
                <th className="border border-black p-1.5">Tuhuma</th>
                <th className="border border-black p-1.5">Hatua Zilizochukuliwa</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.malpracticeCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black p-2 text-center">HAKUNA TUHUMA ZA UDANGANYIFU ZILIZORIPOTIWA</td>
                </tr>
              ) : (
                currentReport.malpracticeCases.map((m, i) => (
                  <tr key={m.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5">{m.incidentDate}</td>
                    <td className="border border-black p-1.5 font-semibold">{m.candidateNumberAndName}</td>
                    <td className="border border-black p-1.5">{m.subjectName}</td>
                    <td className="border border-black p-1.5">{m.allegationDetails}</td>
                    <td className="border border-black p-1.5">{m.actionsTaken}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-6 pt-2 border-t border-black flex justify-between text-[10px] font-bold">
            <span>Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — {currentReport.centerNumber} {currentReport.centerName}</span>
            <span>Ukurasa wa 4 ya 6</span>
          </div>
        </section>

        {/* UKURASA WA 5: RIPOTI MAALUM ZA WATAHINIWA */}
        <section className="bg-white text-black p-8 print:p-0 border border-slate-300 print:border-0 rounded-xl shadow-sm max-w-[210mm] mx-auto print:max-w-none print:page-break-after">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-emerald-700 bg-emerald-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-emerald-800 leading-none">TANZANIA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COAT OF ARMS</span>
            </div>
            <div className="text-center flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">JAMHURI YA MUUNGANO WA TANZANIA</p>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">BARAZA LA MITIHANI LA TANZANIA (NECTA)</h2>
              <p className="text-[11px] font-bold uppercase text-slate-900 mt-0.5">
                TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA ({currentReport.examType} — {currentReport.examYear})
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                {EXAM_TYPE_LABELS[currentReport.examType].fullSw} — Kituo: {currentReport.centerNumber} {currentReport.centerName}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-blue-700 bg-blue-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-blue-800 leading-none">NECTA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COUNCIL</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black pb-2 mb-3 text-xs font-black uppercase">
            <span>5. RIPOTI MAALUM ZA WATAHINIWA (WALIOUGUA &amp; MAHITAJI MAALUM)</span>
            <span>Ukurasa wa 5 ya 6</span>
          </div>

          <h3 className="text-xs font-black uppercase mb-1">5.1 Watahiniwa Waliougua na Kushindwa Mitihani</h3>
          <table className="w-full border-collapse border border-black text-xs mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-8 text-center">Na.</th>
                <th className="border border-black p-1.5 w-32">Namba</th>
                <th className="border border-black p-1.5">Jina la Mtahiniwa</th>
                <th className="border border-black p-1.5 w-12 text-center">Jinsi</th>
                <th className="border border-black p-1.5">Masomo Aliyoshindwa</th>
                <th className="border border-black p-1.5">Hali ya Ugonjwa</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.sickCandidatesAll.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black p-1.5 text-center">HAKUNA</td>
                </tr>
              ) : (
                currentReport.sickCandidatesAll.map((s, i) => (
                  <tr key={s.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5 font-mono">{s.candidateNumber}</td>
                    <td className="border border-black p-1.5 font-semibold">{s.candidateName}</td>
                    <td className="border border-black p-1.5 text-center">{s.gender}</td>
                    <td className="border border-black p-1.5">{s.subjectsMissed}</td>
                    <td className="border border-black p-1.5">{s.illnessDetails}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-xs font-black uppercase mb-1">5.2 Watahiniwa Wenye Mahitaji Maalum</h3>
          <table className="w-full border-collapse border border-black text-xs mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-8 text-center">Na.</th>
                <th className="border border-black p-1.5">Namba &amp; Jina la Mtahiniwa</th>
                <th className="border border-black p-1.5 w-12 text-center">Jinsi</th>
                <th className="border border-black p-1.5">Aina ya Ulemavu</th>
                <th className="border border-black p-1.5">Aina ya Mtihani Aliofanya</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.specialNeedsCandidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-1.5 text-center">HAKUNA</td>
                </tr>
              ) : (
                currentReport.specialNeedsCandidates.map((sp, i) => (
                  <tr key={sp.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5 font-semibold">{sp.candidateNumberAndName}</td>
                    <td className="border border-black p-1.5 text-center">{sp.gender}</td>
                    <td className="border border-black p-1.5">{sp.disabilityType}</td>
                    <td className="border border-black p-1.5">{sp.examFormatTaken}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 className="text-xs font-black uppercase mb-1">5.3 Watahiniwa Ambao Hawakufanya Mitihani Yote</h3>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-8 text-center">Na.</th>
                <th className="border border-black p-1.5 w-32">Namba</th>
                <th className="border border-black p-1.5">Jina la Mtahiniwa</th>
                <th className="border border-black p-1.5 w-12 text-center">Jinsi</th>
                <th className="border border-black p-1.5">Sababu za Kutofanya</th>
              </tr>
            </thead>
            <tbody>
              {currentReport.allSubjectsAbsentees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-1.5 text-center">HAKUNA</td>
                </tr>
              ) : (
                currentReport.allSubjectsAbsentees.map((ab, i) => (
                  <tr key={ab.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5 font-mono">{ab.candidateNumber}</td>
                    <td className="border border-black p-1.5 font-semibold">{ab.candidateName}</td>
                    <td className="border border-black p-1.5 text-center">{ab.gender}</td>
                    <td className="border border-black p-1.5">{ab.reasonForAbsence}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-6 pt-2 border-t border-black flex justify-between text-[10px] font-bold">
            <span>Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — {currentReport.centerNumber} {currentReport.centerName}</span>
            <span>Ukurasa wa 5 ya 6</span>
          </div>
        </section>

        {/* UKURASA WA 6: MATUKIO YASIYO YA KAWAIDA & SAINI */}
        <section className="bg-white text-black p-8 print:p-0 border border-slate-300 print:border-0 rounded-xl shadow-sm max-w-[210mm] mx-auto print:max-w-none">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-emerald-700 bg-emerald-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-emerald-800 leading-none">TANZANIA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COAT OF ARMS</span>
            </div>
            <div className="text-center flex-1 px-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">JAMHURI YA MUUNGANO WA TANZANIA</p>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 mt-0.5">BARAZA LA MITIHANI LA TANZANIA (NECTA)</h2>
              <p className="text-[11px] font-bold uppercase text-slate-900 mt-0.5">
                TAARIFA YA USIMAMIZI WA MTIHANI WA TAIFA ({currentReport.examType} — {currentReport.examYear})
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                {EXAM_TYPE_LABELS[currentReport.examType].fullSw} — Kituo: {currentReport.centerNumber} {currentReport.centerName}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center w-12 h-12 border-2 border-blue-700 bg-blue-50 rounded-lg p-0.5 text-center shrink-0">
              <span className="text-[7px] font-black text-blue-800 leading-none">NECTA</span>
              <span className="text-[5px] font-bold text-slate-700 leading-tight mt-0.5">COUNCIL</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black pb-2 mb-3 text-xs font-black uppercase">
            <span>6. MATUKIO YASIYO YA KAWAIDA, MAONI NA SAINI ZA UTHIBITISHO</span>
            <span>Ukurasa wa 6 ya 6</span>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4 text-xs">
            <div className="border border-black p-2.5">
              <p className="font-black uppercase mb-1">6.1 Matukio Yasiyo ya Kawaida:</p>
              <p>{currentReport.unusualEventsNotes || 'Hakuna tukio lisilo la kawaida lililojitokeza.'}</p>
            </div>
            <div className="border border-black p-2.5">
              <p className="font-black uppercase mb-1">6.2 Maoni na Mapendekezo ya Msimamizi Mkuu:</p>
              <p>{currentReport.chiefSupervisorRecommendations || 'Hakuna maoni ya ziada.'}</p>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-black p-1.5 w-1/2 text-left">UTHIBITISHO WA MSIMAMIZI MKUU</th>
                <th className="border border-black p-1.5 w-1/2 text-left">UTHIBITISHO WA MKUU WA SHULE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2.5 space-y-1">
                  <p><strong>Jina:</strong> {currentReport.chiefSupervisorName}</p>
                  <p><strong>Kituo cha Kazi:</strong> {currentReport.chiefSupervisorWorkstation}</p>
                  <p><strong>Simu:</strong> {currentReport.chiefSupervisorPhone}</p>
                  <p><strong>Saini:</strong> <span className="italic font-serif">{currentReport.chiefSupervisorSignature || '____________________'}</span></p>
                  <p><strong>Tarehe:</strong> {currentReport.signDate}</p>
                </td>
                <td className="border border-black p-2.5 space-y-1">
                  <p><strong>Jina la Mkuu wa Shule:</strong> {currentReport.headmasterName}</p>
                  <p><strong>Kituo:</strong> {currentReport.centerNumber} — {currentReport.centerName}</p>
                  <p><strong>Simu:</strong> {currentReport.headmasterPhone}</p>
                  <p><strong>Saini na Muhuri:</strong> ____________________</p>
                  <p><strong>Tarehe:</strong> {currentReport.headmasterSignDate}</p>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 pt-2 border-t border-black flex justify-between text-[10px] font-bold">
            <span>Fomu Rasmi ya Usimamizi wa Mitihani ya NECTA — {currentReport.centerNumber} {currentReport.centerName}</span>
            <span>Ukurasa wa 6 ya 6</span>
          </div>
        </section>
      </div>
    </div>
  );
};
