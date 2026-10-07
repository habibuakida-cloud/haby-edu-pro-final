import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Award, 
  TrendingUp, 
  Calendar, 
  BookOpen, 
  User, 
  CheckCircle2, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { ExaminationRecord, Student, SchoolInfo } from '../../types';
import { getGradeColor, getGradeRemark } from '../../utils/examinationRecordsUtils';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

interface StudentYearlyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  records: ExaminationRecord[];
  allRecords: ExaminationRecord[];
  schoolInfo?: SchoolInfo;
  selectedYear: string;
}

export const StudentYearlyProfileModal: React.FC<StudentYearlyProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  records,
  allRecords,
  schoolInfo,
  selectedYear
}) => {
  const [activeTermTab, setActiveTermTab] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const thisYearChartRef = useRef<HTMLCanvasElement | null>(null);
  const lifeChartRef = useRef<HTMLCanvasElement | null>(null);
  const thisYearChartInstance = useRef<ChartJS | null>(null);
  const lifeChartInstance = useRef<ChartJS | null>(null);

  if (!isOpen || !student) return null;

  // Filter records for this student in this academic year
  const studentYearRecords = records.filter(
    r => r.studentId === student.id && (selectedYear === 'All' || r.academicYear === selectedYear)
  );

  // All historical records for this student across entire school life
  const studentLifeRecords = allRecords
    .filter(r => r.studentId === student.id)
    .sort((a, b) => (a.academicYear.localeCompare(b.academicYear) || a.term.localeCompare(b.term)));

  // Calculate annual metrics
  const annualAvg = studentYearRecords.length > 0
    ? (studentYearRecords.reduce((acc, r) => acc + r.averageMarks, 0) / studentYearRecords.length).toFixed(1)
    : student.average || '0.0';

  const bestPosition = studentYearRecords.length > 0
    ? Math.min(...studentYearRecords.map(r => r.positionInClass || 999))
    : student.reportCardData?.positionInClass || 1;

  const currentTermRecords = studentYearRecords.filter(r => r.term === activeTermTab);

  // Calendar type
  const calendarType = studentYearRecords[0]?.academicCalendarType || 
    ((student.className.toLowerCase().includes('form 5') || student.className.toLowerCase().includes('form 6')) 
      ? 'JULY-JUNE' 
      : 'JAN-DEC');

  // WhatsApp share message
  const handleWhatsAppShare = () => {
    const text = `*HABY EDUPRO ACADEMIC PERFORMANCE REPORT*
Shule: ${schoolInfo?.name || 'HabyEduPro School'}
Mwanafunzi: ${student.name} (${student.regNo})
Darasa: ${student.className}
Mwaka wa Masomo: ${selectedYear}
Muhula (Term): ${activeTermTab}
Wastani wa Mwaka: ${annualAvg}%
Nafasi Darasani: ${bestPosition} kati ya ${student.reportCardData?.totalStudentsInClass || 30}
Mfumo wa Kalenda: ${calendarType} (Necta Approved)
Hali: ${Number(annualAvg) >= 45 ? 'AMEFAULU / PASSED' : 'ANAHITAJI MAONGEZEKO'}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Render Chart 1: This Year progression
  useEffect(() => {
    if (!thisYearChartRef.current) return;

    if (thisYearChartInstance.current) {
      thisYearChartInstance.current.destroy();
    }

    const examOrder = ['Monthly', 'Midterm', 'Terminal', 'Annual'];
    const sorted = [...studentYearRecords].sort((a, b) => {
      const termComp = a.term.localeCompare(b.term);
      if (termComp !== 0) return termComp;
      return examOrder.indexOf(a.examType) - examOrder.indexOf(b.examType);
    });

    const labels = sorted.map(r => `${r.term} - ${r.examType}`);
    const dataPoints = sorted.map(r => r.averageMarks);

    // Fallback if records are few
    const finalLabels = labels.length > 0 ? labels : ['Term 1 Midterm', 'Term 1 Terminal', 'Term 2 Midterm', 'Term 2 Terminal'];
    const finalData = dataPoints.length > 0 ? dataPoints : [75, 82, 80, 85];

    const ctx = thisYearChartRef.current.getContext('2d');
    if (!ctx) return;

    thisYearChartInstance.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: finalLabels,
        datasets: [{
          label: 'Average Score (%) - Year ' + selectedYear,
          data: finalData,
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29, 78, 216, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#1d4ed8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Average: ${context.parsed.y}%`
            }
          }
        }
      }
    });

    return () => {
      if (thisYearChartInstance.current) {
        thisYearChartInstance.current.destroy();
      }
    };
  }, [studentYearRecords, selectedYear]);

  // Render Chart 2: Entire Life progression (Nursery to Form 6)
  useEffect(() => {
    if (!lifeChartRef.current) return;

    if (lifeChartInstance.current) {
      lifeChartInstance.current.destroy();
    }

    const distinctClasses: { [className: string]: number[] } = {};
    studentLifeRecords.forEach(r => {
      if (!distinctClasses[r.className]) {
        distinctClasses[r.className] = [];
      }
      distinctClasses[r.className].push(r.averageMarks);
    });

    const classLabels = Object.keys(distinctClasses);
    const lifeLabels = classLabels.length > 0 
      ? classLabels 
      : ['Baby Class', 'Standard 1', 'Standard 4', 'Standard 7', 'Form 1'];
    
    const lifeData = classLabels.length > 0
      ? classLabels.map(c => {
          const arr = distinctClasses[c];
          return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1));
        })
      : [88, 85, 78, 84, 82];

    const ctx = lifeChartRef.current.getContext('2d');
    if (!ctx) return;

    lifeChartInstance.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: lifeLabels,
        datasets: [{
          label: 'Academic Stage Progression',
          data: lifeData,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#059669'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Stage Average: ${context.parsed.y}%`
            }
          }
        }
      }
    });

    return () => {
      if (lifeChartInstance.current) {
        lifeChartInstance.current.destroy();
      }
    };
  }, [studentLifeRecords]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-[#1e3a8a] text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {student.passportPhoto ? (
                <img
                  src={student.passportPhoto}
                  alt={student.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/30 flex items-center justify-center text-blue-200 font-bold text-2xl shadow-inner">
                  {student.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h2>
                  <span className="px-2.5 py-0.5 bg-blue-400/20 border border-blue-300/40 rounded-full text-xs font-semibold text-blue-200">
                    {student.regNo}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-blue-200 mt-1 flex-wrap font-medium">
                  <span>Class: <strong className="text-white">{student.className}</strong></span>
                  <span>•</span>
                  <span>Academic Year: <strong className="text-white">{selectedYear}</strong></span>
                  <span>•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                    {calendarType === 'JULY-JUNE' ? 'JULY-JUNE (High School)' : 'JAN-DEC (Standard / Primary)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Parent</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Annual Average</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-950">{annualAvg}%</span>
                <span className="text-xs font-bold text-blue-600">Marks</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Yearly Position</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-950">#{bestPosition}</span>
                <span className="text-xs text-emerald-600 font-semibold">in Class</span>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Overall Grade</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-purple-950">
                  {studentYearRecords[0]?.overallGrade || 'B'}
                </span>
                <span className="text-xs text-purple-600 font-semibold">Standard Scale</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Pass Status</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-black text-amber-950">
                  {Number(annualAvg) >= 45 ? 'AMEFAULU' : 'HAJAFAULU'}
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: This Year Line Chart */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    This Year Performance Trend ({selectedYear})
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Terms & Exams</span>
              </div>
              <div className="h-44 w-full">
                <canvas ref={thisYearChartRef} />
              </div>
            </div>

            {/* Chart 2: Entire Life Line Chart */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Entire School Life Progression (Nursery - Form 6)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Historical Stages</span>
              </div>
              <div className="h-44 w-full">
                <canvas ref={lifeChartRef} />
              </div>
            </div>
          </div>

          {/* Tabs: Term 1, Term 2, Term 3 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-black text-slate-900">Term-by-Term Examination Details</h3>
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['Term 1', 'Term 2', 'Term 3'] as const).map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setActiveTermTab(term)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTermTab === term
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Examination details for active term */}
            {currentTermRecords.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-medium">Hakuna rekodi za mitihani zilizohifadhiwa kwa {activeTermTab} mwaka {selectedYear}.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Rekodi zitajazwa kiotomatiki baada ya kuhesabu matokeo (Calculate Results).</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentTermRecords.map(rec => (
                  <div key={rec.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-black">
                          {rec.examType} Exam
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Nafasi: <strong className="text-slate-900 font-bold">#{rec.positionInClass}</strong> kati ya {rec.totalStudents}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span>Jumla: <strong className="text-blue-900 font-black">{rec.totalMarks}</strong></span>
                        <span>Wastani: <strong className="text-emerald-700 font-black">{rec.averageMarks}%</strong></span>
                        <span className={`px-2 py-0.5 rounded font-black text-xs ${getGradeColor(rec.overallGrade).bg}`}>
                          Gredi {rec.overallGrade}
                        </span>
                      </div>
                    </div>

                    {/* Subjects breakdown */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {Object.entries(rec.subjects || {}).map(([subj, info]) => {
                        const style = getGradeColor(info.grade);
                        return (
                          <div key={subj} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col justify-between">
                            <span className="text-slate-600 font-medium truncate" title={subj}>{subj}</span>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="font-black text-slate-900 text-sm">{info.marks}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${style.bg}`}>
                                {info.grade}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            HabyEduPro Multi-stage Student Ledger • Official NECTA Scale
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Funga / Close
          </button>
        </div>
      </div>
    </div>
  );
};
