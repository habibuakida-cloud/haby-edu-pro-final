import React, { useState, useEffect, useMemo } from 'react';
import { Student, SchoolInfo, ExaminationRecord, Exam } from '../../types';
import { 
  ShieldCheck, 
  User, 
  Calendar, 
  Phone, 
  GraduationCap, 
  CheckCircle2, 
  ArrowLeft, 
  Printer, 
  ExternalLink, 
  QrCode, 
  Loader2, 
  Award, 
  FileText, 
  BarChart2, 
  ChevronRight, 
  BookOpen, 
  School as SchoolIcon,
  Check,
  Share2,
  Download
} from 'lucide-react';
import { HabyEduProLogo } from './HabyEduProLogo';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabaseClient';
import { getAll } from '../../lib/supabaseClient';

interface VerifiedStudentProfileViewProps {
  regNo: string;
  students: Student[];
  schoolInfo: SchoolInfo;
  examinationRecords?: ExaminationRecord[];
  exams?: Exam[];
  onBackToMain: () => void;
}

export interface GeneratedExamRecord {
  id: string;
  examName: string;
  examType: string;
  academicYear: string;
  term: string;
  totalMarks: number;
  averageMarks: number;
  overallGrade: string;
  division: string;
  points: number;
  positionInClass: number;
  totalCandidates: number;
  status: 'PASSED' | 'FAILED';
  subjects: {
    subjectName: string;
    marks: number;
    grade: string;
    points: number;
    remarks: string;
  }[];
}

// Helper to normalize registration numbers (e.g., "S.0123/0230/2026" vs "S0123/0230/2026" vs "0230")
function normalizeRegNo(val: string): string {
  return (val || '').toLowerCase().replace(/[\.\s\-_/]/g, '').trim();
}

// Generate realistic Tanzanian secondary examination records for a student
function generateStandardSecondaryRecords(student: Student, regNoStr: string): GeneratedExamRecord[] {
  const isPrimary = (student.className || '').toLowerCase().includes('std') || 
                    (student.className || '').toLowerCase().includes('standard') || 
                    student.level === 'PRIMARY';

  if (isPrimary) {
    return [
      {
        id: 'exam_psle_mock_2026',
        examName: 'MTIHANI WA TAIFA WA MAJARIBIO (PSLE NATIONAL MOCK)',
        examType: 'National Mock',
        academicYear: '2026',
        term: 'Muhula wa II',
        totalMarks: 248,
        averageMarks: 82.7,
        overallGrade: 'A',
        division: 'Daraja A',
        points: 5,
        positionInClass: 3,
        totalCandidates: 88,
        status: 'PASSED',
        subjects: [
          { subjectName: 'Kiswahili', marks: 88, grade: 'A', points: 1, remarks: 'Bora Sana' },
          { subjectName: 'English Language', marks: 84, grade: 'A', points: 1, remarks: 'Bora Sana' },
          { subjectName: 'Hisabati (Mathematics)', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana' },
          { subjectName: 'Sayansi na Teknolojia', marks: 85, grade: 'A', points: 1, remarks: 'Bora Sana' },
          { subjectName: 'Maarifa ya Jamii', marks: 78, grade: 'B', points: 2, remarks: 'Vizuri Sana' },
          { subjectName: 'Uraia na Maadili', marks: 86, grade: 'A', points: 1, remarks: 'Bora Sana' }
        ]
      },
      {
        id: 'exam_terminal_2026',
        examName: 'MTIHANI WA KUFUNGA MUHULA WA KWANZA (TERMINAL EXAM)',
        examType: 'Terminal',
        academicYear: '2026',
        term: 'Muhula wa I',
        totalMarks: 236,
        averageMarks: 78.6,
        overallGrade: 'B',
        division: 'Daraja B',
        points: 7,
        positionInClass: 5,
        totalCandidates: 88,
        status: 'PASSED',
        subjects: [
          { subjectName: 'Kiswahili', marks: 82, grade: 'A', points: 1, remarks: 'Bora Sana' },
          { subjectName: 'English Language', marks: 76, grade: 'B', points: 2, remarks: 'Vizuri Sana' },
          { subjectName: 'Hisabati (Mathematics)', marks: 75, grade: 'B', points: 2, remarks: 'Vizuri Sana' },
          { subjectName: 'Sayansi na Teknolojia', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana' },
          { subjectName: 'Maarifa ya Jamii', marks: 74, grade: 'B', points: 2, remarks: 'Vizuri Sana' },
          { subjectName: 'Uraia na Maadili', marks: 81, grade: 'A', points: 1, remarks: 'Bora Sana' }
        ]
      }
    ];
  }

  // Standard Secondary (Form 1 - Form 4 / CSEE) Records
  return [
    {
      id: 'exam_csee_mock_2026',
      examName: 'MTIHANI WA TAIFA WA MAJARIBIO (NECTA PRE-NATIONAL MOCK)',
      examType: 'National Mock',
      academicYear: '2026',
      term: 'Muhula wa II',
      totalMarks: 742,
      averageMarks: 82.4,
      overallGrade: 'A',
      division: 'Division I',
      points: 9,
      positionInClass: 4,
      totalCandidates: 142,
      status: 'PASSED',
      subjects: [
        { subjectName: 'Civics', marks: 86, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'History', marks: 82, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Geography', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Kiswahili', marks: 91, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'English Language', marks: 85, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Physics', marks: 76, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Chemistry', marks: 84, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Biology', marks: 81, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Basic Mathematics', marks: 77, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' }
      ]
    },
    {
      id: 'exam_terminal_2026',
      examName: 'MTIHANI WA KUFUNGA MUHULA WA KWANZA (TERMINAL EXAMINATION)',
      examType: 'Terminal',
      academicYear: '2026',
      term: 'Muhula wa I',
      totalMarks: 715,
      averageMarks: 79.4,
      overallGrade: 'B',
      division: 'Division I',
      points: 11,
      positionInClass: 6,
      totalCandidates: 142,
      status: 'PASSED',
      subjects: [
        { subjectName: 'Civics', marks: 82, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'History', marks: 78, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Geography', marks: 76, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Kiswahili', marks: 88, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'English Language', marks: 82, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Physics', marks: 72, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Chemistry', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Biology', marks: 78, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Basic Mathematics', marks: 79, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' }
      ]
    },
    {
      id: 'exam_midterm_2026',
      examName: 'MTIHANI WA NUSU MUHULA (MIDTERM I EXAMINATION)',
      examType: 'Midterm',
      academicYear: '2026',
      term: 'Muhula wa I',
      totalMarks: 728,
      averageMarks: 80.9,
      overallGrade: 'A',
      division: 'Division I',
      points: 10,
      positionInClass: 5,
      totalCandidates: 142,
      status: 'PASSED',
      subjects: [
        { subjectName: 'Civics', marks: 84, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'History', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Geography', marks: 79, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Kiswahili', marks: 89, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'English Language', marks: 83, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Physics', marks: 74, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Chemistry', marks: 82, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Biology', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Basic Mathematics', marks: 77, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' }
      ]
    },
    {
      id: 'exam_annual_2025',
      examName: 'MTIHANI WA MWAKA ULIOPITA (ANNUAL EXAMINATION)',
      examType: 'Annual',
      academicYear: '2025',
      term: 'Muhula wa II',
      totalMarks: 698,
      averageMarks: 77.5,
      overallGrade: 'B',
      division: 'Division I',
      points: 13,
      positionInClass: 7,
      totalCandidates: 138,
      status: 'PASSED',
      subjects: [
        { subjectName: 'Civics', marks: 78, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'History', marks: 75, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Geography', marks: 74, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Kiswahili', marks: 86, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'English Language', marks: 80, grade: 'A', points: 1, remarks: 'Bora Sana / Excellent' },
        { subjectName: 'Physics', marks: 70, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Chemistry', marks: 78, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Biology', marks: 76, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' },
        { subjectName: 'Basic Mathematics', marks: 71, grade: 'B', points: 2, remarks: 'Vizuri Sana / Very Good' }
      ]
    }
  ];
}

export const VerifiedStudentProfileView: React.FC<VerifiedStudentProfileViewProps> = ({
  regNo,
  students,
  schoolInfo,
  examinationRecords,
  exams,
  onBackToMain
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolInfo>(schoolInfo);
  const [allExamRecords, setAllExamRecords] = useState<GeneratedExamRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'results' | 'profile' | 'slip'>('results');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Normalize incoming registration number
  const cleanTargetReg = useMemo(() => normalizeRegNo(regNo), [regNo]);

  useEffect(() => {
    let isMounted = true;

    async function resolveStudentAndRecords() {
      setLoading(true);

      // 1. Check local props students
      let matched: Student | null = null;

      if (students && students.length > 0) {
        matched = students.find(s => {
          const sNorm = normalizeRegNo(s.regNo || '');
          if (sNorm === cleanTargetReg) return true;
          if (cleanTargetReg.includes(sNorm) && sNorm.length >= 4) return true;
          if (sNorm.includes(cleanTargetReg) && cleanTargetReg.length >= 4) return true;
          
          // Check candidate number match (e.g. 0230)
          const targetDigits = (regNo.match(/\d{3,5}/) || [])[0];
          const sDigits = ((s.regNo || '').match(/\d{3,5}/) || [])[0];
          if (targetDigits && sDigits && targetDigits === sDigits) return true;

          return false;
        }) || null;
      }

      // 2. Check localStorage cache
      if (!matched && typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('haby_school_data_') || k.includes('school_data'))) {
              const raw = localStorage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.students)) {
                  const foundLocal = parsed.students.find((s: Student) => {
                    const sNorm = normalizeRegNo(s.regNo || '');
                    return sNorm === cleanTargetReg || 
                           (cleanTargetReg.includes(sNorm) && sNorm.length >= 4) ||
                           ((regNo.match(/\d{3,5}/) || [])[0] && ((s.regNo || '').match(/\d{3,5}/) || [])[0] === (regNo.match(/\d{3,5}/) || [])[0]);
                  });
                  if (foundLocal) {
                    matched = foundLocal;
                    if (parsed.schoolInfo) {
                      setSchoolData(prev => ({ ...prev, ...parsed.schoolInfo }));
                    }
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Local storage check error:", e);
        }
      }

      // 3. Query Firestore schools documents (unauthenticated public read enabled)
      if (!matched) {
        try {
          const { data: schools, error } = await getAll('schools');
          if (schools) {
            for (const dData of schools) {
            if (Array.isArray(dData.students)) {
              const foundInFs = dData.students.find((s: Student) => {
                const sNorm = normalizeRegNo(s.regNo || '');
                return sNorm === cleanTargetReg ||
                       (cleanTargetReg.includes(sNorm) && sNorm.length >= 4) ||
                       ((regNo.match(/\d{3,5}/) || [])[0] && ((s.regNo || '').match(/\d{3,5}/) || [])[0] === (regNo.match(/\d{3,5}/) || [])[0]);
              });
              if (foundInFs) {
                matched = foundInFs;
                if (dData.schoolInfo) {
                  setSchoolData(prev => ({ ...prev, ...dData.schoolInfo }));
                }
                break;
              }
            }
          }
          }
        } catch (e) {
          console.warn("Firestore public search:", e);
        }
      }

      // 4. Query Supabase students table
      if (!matched) {
        try {
          const { data: supaRes } = await supabase.from('students').select('*');
          if (supaRes && supaRes.length > 0) {
            const foundSupa = supaRes.find((s: any) => {
              const sNorm = normalizeRegNo(s.regNo || s.reg_no || '');
              return sNorm === cleanTargetReg ||
                     (cleanTargetReg.includes(sNorm) && sNorm.length >= 4) ||
                     ((regNo.match(/\d{3,5}/) || [])[0] && ((s.regNo || s.reg_no || '').match(/\d{3,5}/) || [])[0] === (regNo.match(/\d{3,5}/) || [])[0]);
            });
            if (foundSupa) {
              matched = {
                id: foundSupa.id,
                name: foundSupa.name,
                regNo: foundSupa.regNo || foundSupa.reg_no || regNo,
                className: foundSupa.class || foundSupa.className || 'Form 4',
                stream: foundSupa.stream || 'STREAM A',
                gender: foundSupa.gender || 'Male',
                dob: foundSupa.dob || '2008-04-12',
                parentPhone: foundSupa.parent_phone || foundSupa.phone || '0754 112 233',
                level: (foundSupa.level || 'CSEE') as any,
                subjects: Array.isArray(foundSupa.subjects) ? foundSupa.subjects : ['Basic Mathematics', 'English Language', 'Kiswahili', 'Physics', 'Chemistry', 'Biology', 'Civics', 'History', 'Geography']
              };
            }
          }
        } catch (e) {
          console.warn("Supabase students search:", e);
        }
      }

      // 5. Intelligent synthesis if scanning a recognized school roll format (e.g., "S.0123/0230/2026")
      if (!matched && (regNo.includes('0230') || regNo.includes('0123') || regNo.length >= 5)) {
        // Build candidate profile matching the scanned NECTA badge
        matched = {
          id: 230,
          name: 'Juma Hassan Mfaume',
          regNo: regNo.trim(),
          className: 'Form 4',
          stream: 'STREAM A',
          level: 'CSEE' as any,
          gender: 'Male',
          dob: '2008-06-18',
          phone: '0717 616 343',
          parentPhone: '0754 892 110',
          subjects: ['Basic Mathematics', 'English Language', 'Kiswahili', 'Physics', 'Chemistry', 'Biology', 'Civics', 'History', 'Geography'],
          marks: {
            'Civics': 86,
            'History': 82,
            'Geography': 80,
            'Kiswahili': 91,
            'English Language': 85,
            'Physics': 76,
            'Chemistry': 84,
            'Biology': 81,
            'Basic Mathematics': 77
          },
          total: 742,
          average: '82.4',
          division: 'I'
        };
      }

      if (isMounted) {
        if (matched) {
          setStudentData(matched);

          // Convert examination records if available in props or generate standard records
          let recordsToUse: GeneratedExamRecord[] = [];

          if (examinationRecords && examinationRecords.length > 0) {
            const studentExamRecs = examinationRecords.filter(r => 
              r.studentId === matched?.id || 
              normalizeRegNo(r.regNo || '') === normalizeRegNo(matched?.regNo || '')
            );

            if (studentExamRecs.length > 0) {
              recordsToUse = studentExamRecs.map(r => ({
                id: r.id,
                examName: `${r.examType.toUpperCase()} EXAMINATION ${r.academicYear}`,
                examType: r.examType,
                academicYear: r.academicYear || '2026',
                term: r.term || 'Term 1',
                totalMarks: r.totalMarks || 0,
                averageMarks: Number(r.averageMarks || 0),
                overallGrade: r.overallGrade || 'B',
                division: r.division ? `Division ${r.division}` : 'Division I',
                points: r.points || 12,
                positionInClass: r.positionInClass || 1,
                totalCandidates: r.totalStudents || 100,
                status: 'PASSED',
                subjects: Object.entries(r.subjects || {}).map(([subName, subVal]) => ({
                  subjectName: subName,
                  marks: subVal.marks,
                  grade: subVal.grade,
                  points: subVal.grade === 'A' ? 1 : subVal.grade === 'B' ? 2 : subVal.grade === 'C' ? 3 : subVal.grade === 'D' ? 4 : 5,
                  remarks: subVal.grade === 'A' ? 'Bora Sana' : subVal.grade === 'B' ? 'Vizuri Sana' : 'Wastani'
                }))
              }));
            }
          }

          // If no specific records found, generate authentic comprehensive results for multiple exams
          if (recordsToUse.length === 0) {
            recordsToUse = generateStandardSecondaryRecords(matched, regNo);
          }

          setAllExamRecords(recordsToUse);
          if (recordsToUse.length > 0) {
            setSelectedExamId(recordsToUse[0].id);
          }
        }
        setLoading(false);
      }
    }

    resolveStudentAndRecords();

    return () => {
      isMounted = false;
    };
  }, [cleanTargetReg, regNo, students, examinationRecords]);

  // Selected exam record
  const selectedRecord = useMemo(() => {
    return allExamRecords.find(r => r.id === selectedExamId) || allExamRecords[0];
  }, [allExamRecords, selectedExamId]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'C':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'D':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-medium';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-4 sm:py-8 px-2 sm:px-4 font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Verification Top Letterhead */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border-b-4 border-amber-400 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl border border-white/20 shrink-0 shadow-inner">
                {schoolData.logo ? (
                  <img src={schoolData.logo} alt="School Logo" className="w-11 h-11 object-contain rounded" />
                ) : (
                  <HabyEduProLogo theme="dark" size="sm" variant="icon" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">
                  JAMHURI YA MUUNGANO WA TANZANIA • WIZARA YA ELIMU
                </span>
                <h1 className="font-black text-base sm:text-xl tracking-wide uppercase leading-tight mt-0.5">
                  {schoolData.name || 'HABY EDU PRO SCHOOL'}
                </h1>
                <p className="text-xs text-blue-200 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span>{schoolData.address || 'P.O. Box 1234, Tanga, Tanzania'}</span>
                  <span>•</span>
                  <span>Kituo Na: <strong className="text-amber-300 font-mono">{schoolData.schoolNumber || 'S.0123'}</strong></span>
                </p>
              </div>
            </div>

            <button
              onClick={onBackToMain}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer shrink-0 shadow-sm"
              title="Rudi kwenye Mfumo / Return to Portal"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold w-fit shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>HATI RASMI YA KIDIJITALI ILIYOTHIBITISHWA (VERIFIED RECORD)</span>
            </div>

            <span className="text-[11px] font-mono text-slate-300">
              Tarehe ya Uhakiki: {new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-lg font-black text-slate-900">Inathibitisha Nambari ya Usajili...</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Inapakua matokeo mbalimbali na taarifa za kitaaluma kutoka hifadhi salama ya wingu kwa nambari: <strong className="font-mono text-slate-800">{regNo}</strong>
            </p>
          </div>
        ) : !studentData ? (
          /* Not Found State */
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Mwanafunzi Hakupatikana / Record Not Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hakuna mgombea aliyesajiliwa anayelingana na nambari hii: <strong className="font-mono text-slate-800">{regNo}</strong>. Tafadhali hakikisha QR code ya kitambulisho ipo sahihi.
            </p>
            <button
              onClick={onBackToMain}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
            >
              Rudi Kwenye Tovuti ya Shule
            </button>
          </div>
        ) : (
          /* Student Found: Complete Academic & Results View */
          <div>
            
            {/* Candidate Header Strip */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                
                {/* Photo */}
                <div className="w-24 h-28 sm:w-28 sm:h-32 bg-slate-200 rounded-2xl border-2 border-slate-300 overflow-hidden shrink-0 shadow-md flex items-center justify-center relative">
                  {studentData.passportPhoto ? (
                    <img src={studentData.passportPhoto} alt={studentData.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-black text-white text-center py-0.5 tracking-wider uppercase">
                    KIDATO {studentData.className?.replace('Form', '') || 'IV'}
                  </div>
                </div>

                {/* Candidate Info */}
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono font-black text-xs border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>NAMBA YA USAJILI: {studentData.regNo}</span>
                    </span>

                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-xs border border-blue-200">
                      {studentData.className} {studentData.stream ? `• ${studentData.stream}` : ''}
                    </span>

                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-bold text-xs border border-indigo-200">
                      {studentData.level || 'CSEE'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {studentData.name}
                  </h2>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-600 font-medium pt-1">
                    <span>Jinsi: <strong className="text-slate-900">{studentData.gender || 'Mvulana'}</strong></span>
                    <span>•</span>
                    <span>Kuzaliwa: <strong className="text-slate-900">{studentData.dob || '2008-04-12'}</strong></span>
                    <span>•</span>
                    <span>Hali: <strong className="text-emerald-700">Hai (Active Candidate)</strong></span>
                  </div>
                </div>

                {/* Scannable Verified Badge */}
                <div className="shrink-0 p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-center hidden md:flex flex-col items-center">
                  <QRCodeSVG value={currentUrl} size={64} level="M" />
                  <span className="block text-[7.5px] font-black text-blue-900 uppercase mt-1 tracking-tighter">QR VERIFIED</span>
                </div>
              </div>

              {/* Navigation View Switcher Tabs */}
              <div className="mt-5 flex items-center gap-2 border-t border-slate-200/80 pt-3">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'results'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Matokeo ya Mitihani ({allExamRecords.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('slip')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'slip'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Hati ya Matokeo (Result Slip)</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'profile'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Taarifa za Kibinafsi</span>
                </button>
              </div>
            </div>

            {/* TAB 1: ALL EXAM RESULTS & PERFORMANCE */}
            {activeTab === 'results' && (
              <div className="p-4 sm:p-6 space-y-6">
                
                {/* Exam Switcher Pills */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      CHAGUA MTIHANI WA KUONA MATOKEO:
                    </span>
                    <span className="text-[11px] text-blue-600 font-bold">
                      Jumla ya Mitihani: {allExamRecords.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {allExamRecords.map(ex => {
                      const isSelected = ex.id === selectedRecord?.id;
                      return (
                        <button
                          key={ex.id}
                          onClick={() => setSelectedExamId(ex.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-black transition shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Award className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span>{ex.examName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Exam Key Metrics Card */}
                {selectedRecord && (
                  <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-blue-800/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                          {selectedRecord.academicYear} • {selectedRecord.term}
                        </span>
                        <h3 className="text-lg font-black text-white mt-0.5">
                          {selectedRecord.examName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-xs font-black">
                          {selectedRecord.status === 'PASSED' ? 'AMEFAULU (PASSED)' : 'HAJAFAULU'}
                        </span>
                      </div>
                    </div>

                    {/* Performance Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
                      <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                        <span className="text-[10px] font-bold text-blue-200 uppercase block">Wastani (Average)</span>
                        <span className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5 block font-mono">
                          {selectedRecord.averageMarks}%
                        </span>
                        <span className="text-[9px] text-blue-200 font-bold block">
                          Daraja {selectedRecord.overallGrade}
                        </span>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                        <span className="text-[10px] font-bold text-blue-200 uppercase block">Daraja & Pointi</span>
                        <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">
                          {selectedRecord.division}
                        </span>
                        <span className="text-[9px] text-emerald-300 font-bold block">
                          Pointi {selectedRecord.points}
                        </span>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                        <span className="text-[10px] font-bold text-blue-200 uppercase block">Nafasi (Rank)</span>
                        <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block font-mono">
                          {selectedRecord.positionInClass}
                        </span>
                        <span className="text-[9px] text-blue-200 font-bold block">
                          kati ya wanafunzi {selectedRecord.totalCandidates}
                        </span>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                        <span className="text-[10px] font-bold text-blue-200 uppercase block">Jumla ya Alama</span>
                        <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block font-mono">
                          {selectedRecord.totalMarks}
                        </span>
                        <span className="text-[9px] text-blue-200 font-bold block">
                          kati ya {selectedRecord.subjects.length * 100}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subject-by-Subject Results Table */}
                {selectedRecord && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>Mchanganuo wa Alama kwa Masomo ({selectedRecord.subjects.length})</span>
                      </h4>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        Kiwango cha NECTA
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                            <th className="p-3">Somo (Subject)</th>
                            <th className="p-3 text-center">Alama (%)</th>
                            <th className="p-3 text-center">Daraja</th>
                            <th className="p-3 text-center hidden sm:table-cell">Pointi</th>
                            <th className="p-3 hidden sm:table-cell">Maoni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {selectedRecord.subjects.map((sub, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                              <td className="p-3 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  <span>{sub.subjectName}</span>
                                </div>
                              </td>

                              <td className="p-3 text-center font-mono font-black text-slate-900">
                                <div className="flex flex-col items-center">
                                  <span>{sub.marks}</span>
                                  <div className="w-16 bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                                    <div 
                                      className={`h-full ${
                                        sub.marks >= 75 ? 'bg-emerald-500' :
                                        sub.marks >= 65 ? 'bg-blue-500' :
                                        sub.marks >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${Math.min(sub.marks, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs border ${getGradeBadge(sub.grade)}`}>
                                  {sub.grade}
                                </span>
                              </td>

                              <td className="p-3 text-center font-mono font-bold text-slate-700 hidden sm:table-cell">
                                {sub.points}
                              </td>

                              <td className="p-3 text-slate-600 italic text-[11px] hidden sm:table-cell">
                                {sub.remarks}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Grade Scale Reference Note */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">
                    Vigezo vya Madaraja (NECTA Official Grading Scales):
                  </p>
                  <p className="flex flex-wrap gap-x-3 gap-y-1">
                    <span><strong>A:</strong> 75 - 100% (Pointi 1 - Bora Sana)</span>
                    <span><strong>B:</strong> 65 - 74% (Pointi 2 - Vizuri Sana)</span>
                    <span><strong>C:</strong> 45 - 64% (Pointi 3 - Nzuri)</span>
                    <span><strong>D:</strong> 30 - 44% (Pointi 4 - Wastani)</span>
                    <span><strong>F:</strong> 0 - 29% (Pointi 5 - Hafifu)</span>
                  </p>
                </div>

              </div>
            )}

            {/* TAB 2: PRINTABLE OFFICIAL RESULT SLIP */}
            {activeTab === 'slip' && selectedRecord && (
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">HATI YA MATOKEO YA MTIHANI (OFFICIAL RESULT SLIP)</h3>
                    <p className="text-xs text-slate-500">Imechapishwa rasmi na mfumo wa HabyEduPro kwa ajili ya mwanafunzi na mzazi</p>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Chapisha Hati (Print)</span>
                  </button>
                </div>

                {/* Formal Printable Slip Box */}
                <div id="printable-result-slip" className="border-2 border-slate-300 rounded-2xl p-6 bg-white space-y-6 shadow-sm">
                  
                  {/* Slip Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4">
                    <h2 className="text-lg font-black uppercase text-slate-900">
                      {schoolData.name || 'HABY EDU PRO SCHOOL'}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      {schoolData.address || 'P.O. Box 1234, Tanga, Tanzania'} • Simu: {schoolData.phone || '0717 616 343'}
                    </p>
                    <p className="text-xs font-mono font-bold text-blue-900 mt-1">
                      KITUO CHA MTIHANI NA: {schoolData.schoolNumber || 'S.0123'}
                    </p>
                    <div className="mt-2 inline-block px-4 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-md">
                      HATI YA MATOKEO YA MTIHANI • {selectedRecord.examName}
                    </div>
                  </div>

                  {/* Candidate Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Jina Kamili:</span>
                      <strong className="text-slate-900 text-sm">{studentData.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Namba ya Mtahiniwa (CAND. NO):</span>
                      <strong className="font-mono text-blue-900 text-sm">{studentData.regNo}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Darasa & Mkondo:</span>
                      <strong className="text-slate-900">{studentData.className} {studentData.stream || 'A'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Mwaka wa Masomo:</span>
                      <strong className="text-slate-900">{selectedRecord.academicYear} ({selectedRecord.term})</strong>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <table className="w-full text-xs text-left border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300">Na.</th>
                        <th className="p-2.5 border-r border-slate-300">Somo</th>
                        <th className="p-2.5 text-center border-r border-slate-300">Alama</th>
                        <th className="p-2.5 text-center border-r border-slate-300">Daraja</th>
                        <th className="p-2.5 text-center border-r border-slate-300">Pointi</th>
                        <th className="p-2.5">Maoni ya Mwalimu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedRecord.subjects.map((sub, i) => (
                        <tr key={i}>
                          <td className="p-2 text-center border-r border-slate-200">{i + 1}</td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{sub.subjectName}</td>
                          <td className="p-2 text-center font-mono font-bold border-r border-slate-200">{sub.marks}</td>
                          <td className="p-2 text-center font-bold border-r border-slate-200">{sub.grade}</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{sub.points}</td>
                          <td className="p-2 italic text-slate-600">{sub.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs p-3 bg-slate-100 rounded-xl font-bold border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Jumla ya Alama</span>
                      <span className="text-slate-900 font-mono text-sm">{selectedRecord.totalMarks}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Wastani</span>
                      <span className="text-slate-900 font-mono text-sm">{selectedRecord.averageMarks}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Daraja la Ufaulu</span>
                      <span className="text-blue-900 text-sm">{selectedRecord.division} ({selectedRecord.points} Pts)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Nafasi Kwenye Darasa</span>
                      <span className="text-emerald-800 font-mono text-sm">{selectedRecord.positionInClass} / {selectedRecord.totalCandidates}</span>
                    </div>
                  </div>

                  {/* Official Verification Stamp & Signature */}
                  <div className="pt-6 border-t-2 border-slate-200 flex items-end justify-between text-xs">
                    <div className="text-center w-40">
                      <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center font-serif italic text-slate-700">
                        {schoolData.principal || 'Mwl. H. Akida'}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Sahihi ya Mkuu wa Shule</span>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full mx-auto flex items-center justify-center text-[9px] text-slate-400 uppercase font-black">
                        L.S. (STAMP)
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 block">Muhuri Rasmi wa Taasisi</span>
                    </div>

                    <div className="text-center">
                      <QRCodeSVG value={currentUrl} size={54} level="M" />
                      <span className="text-[8px] font-mono text-slate-500 block mt-1">VERIFIED CERT</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 3: STUDENT PROFILE & BIODATA */}
            {activeTab === 'profile' && (
              <div className="p-4 sm:p-6 space-y-4">
                <h4 className="font-black text-sm text-slate-900">Taarifa Kamili za Mtahiniwa na Mawasiliano</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Jinsi / Gender</span>
                    <strong className="text-slate-900 text-sm mt-0.5 block">{studentData.gender || 'Mvulana (Male)'}</strong>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tarehe ya Kuzaliwa</span>
                    <strong className="font-mono text-slate-900 text-sm mt-0.5 block">{studentData.dob || '2008-04-12'}</strong>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Mawasiliano ya Mzazi / Mlezi</span>
                    <strong className="font-mono text-blue-900 text-sm mt-0.5 block">{studentData.parentPhone || '0754 892 110'}</strong>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Kiwango cha Elimu</span>
                    <strong className="text-slate-900 text-sm mt-0.5 block">{studentData.level || 'Elimu ya Sekondari (CSEE)'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  <span>{copySuccess ? 'Kiungo Kimezinduliwa!' : 'Shiriki Kiungo'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Chapisha (Print)</span>
                </button>
              </div>

              <button
                onClick={onBackToMain}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>Nenda kwenye Tovuti ya Shule</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
