import React from 'react';
import { SchoolInfo, Student } from '../../types';
import { 
  calculatePerformanceSummary, 
  calculateStudentRank, 
  generateCharacterFromPerformance, 
  getDefaultPeriodSetting,
  getSubjectGradeInfo,
  isPrimaryOrNursery,
  getPrimarySubjectGradeInfo,
  cleanAndFilterMarksForClass
} from '../../utils/reportCardUtils';
import { 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface ReportCardDocumentProps {
  student: Student;
  schoolInfo: SchoolInfo;
  orientation: 'portrait' | 'landscape';
  allStudents?: Student[];
  containerId?: string;
}

export const ReportCardDocument: React.FC<ReportCardDocumentProps> = ({
  student,
  schoolInfo,
  orientation,
  allStudents = [],
  containerId = 'report-card-printable-area'
}) => {
  const rawMarks = student.marks || {};
  const marks = cleanAndFilterMarksForClass(rawMarks, student.className, student.level);
  const perf = calculatePerformanceSummary(marks, student.level, student.className);
  const rank = calculateStudentRank(student, allStudents);
  const isPrimary = isPrimaryOrNursery(student.level, student.className);
  const primaryOverallGrade = perf.average >= 81 ? 'A' : perf.average >= 61 ? 'B' : perf.average >= 41 ? 'C' : perf.average >= 21 ? 'D' : 'E';
  const primaryPassStatus = perf.average >= 41 ? 'Waliopasi (Pass)' : 'Hawajapasi (Fail)';

  const periodSetting = student.reportCardData?.periodSetting || getDefaultPeriodSetting();
  
  const attendanceRate = periodSetting.totalPeriods > 0 
    ? Math.min(100, Math.round((periodSetting.attendedPeriods / periodSetting.totalPeriods) * 100))
    : 96;

  const characterAssessment = student.reportCardData?.characterAssessment || 
    generateCharacterFromPerformance(perf.average, perf.division, attendanceRate);

  const classTeacherRemarks = student.reportCardData?.classTeacherRemarks || 
    (perf.average >= 75
      ? 'An exceptionally bright and diligent student who shows outstanding potential. Keep up the high standard!'
      : perf.average >= 60
      ? 'A hardworking and disciplined student with consistent effort in all subjects. Well done!'
      : perf.average >= 45
      ? 'A disciplined student with steady performance. Recommended to put more effort in science & math revision.'
      : 'Has potential to improve. Requires strict follow-up in remedial periods and daily assignments.');

  const headTeacherRemarks = student.reportCardData?.headTeacherRemarks || 
    (perf.division === 'I'
      ? 'Outstanding academic excellence and exemplary character. Highly recommended for academic honours!'
      : perf.division === 'II'
      ? 'Very good progress demonstrated throughout the term. Approved for advanced stream progress.'
      : perf.division === 'III'
      ? 'Satisfactory results. Encouraged to participate actively in evening study clinics.'
      : 'Needs serious dedication and parent-teacher counseling to strengthen core competencies.');

  const dateIssued = student.reportCardData?.dateIssued || new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const subjectEntries = Object.entries(marks);

  if (orientation === 'landscape') {
    // -------------------------------------------------------------
    // A4 LANDSCAPE LAYOUT (297mm x 210mm)
    // Clean, balanced 2-column layout to fit on single landscape sheet
    // -------------------------------------------------------------
    return (
      <div 
        id={containerId}
        className="bg-white text-slate-900 p-6 shadow-xl mx-auto text-xs"
        style={{
          width: '100%',
          maxWidth: '1080px',
          boxSizing: 'border-box',
          border: '8px solid',
          borderImage: 'linear-gradient(135deg, #1EB53A 0% 33%, #FCD116 33% 38%, #000000 38% 62%, #FCD116 62% 67%, #00A3E0 67% 100%) 1'
        }}
      >
        {/* Landscape Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {schoolInfo.logo ? (
              <div className="w-14 h-14 rounded-full bg-white p-1 shadow-xs border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={schoolInfo.logo} alt={schoolInfo.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#1f4d8b] text-white flex items-center justify-center font-black text-xl shadow-xs border-2 border-slate-900 shrink-0">
                <GraduationCap className="w-8 h-8" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black uppercase text-[#1f4d8b] tracking-wider leading-tight">
                  {schoolInfo.name || 'HabyEduPro3A'}
                </h1>
                {schoolInfo.schoolNumber && (
                  <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded uppercase">
                    CTR: {schoolInfo.schoolNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-700">
                {schoolInfo.address || 'P.O. BOX 145, TANGA, TANZANIA'} • TEL: {schoolInfo.phone || '0717616343'} • EMAIL: {schoolInfo.email || 'info@school.ac.tz'}
              </p>
              <p className="text-[10px] italic text-slate-500 font-medium">
                Motto: &ldquo;{schoolInfo.motto || 'Education for Self-Reliance & Academic Excellence'}&rdquo;
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-[#1f4d8b] text-white text-[11px] font-black px-3 py-1 rounded-sm uppercase tracking-wider mb-1">
              Official Academic Progress & Conduct Report
            </span>
            <div className="text-[11px] font-bold text-slate-800">
              Academic Year: <span className="text-blue-800 font-extrabold">{periodSetting.academicYear}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-600">
              Evaluation Term: <span className="text-slate-900 font-bold">{periodSetting.termName}</span>
            </div>
          </div>
        </div>

        {/* Student Particulars Bar with Passport Photo */}
        <div className="bg-slate-100 border border-slate-400 p-2.5 rounded mb-3 flex items-center gap-3 text-[11px]">
          {/* Candidate Passport Photo */}
          <div className="w-12 h-14 bg-white border-2 border-slate-900 rounded shrink-0 overflow-hidden flex flex-col items-center justify-center shadow-xs">
            {student.passportPhoto ? (
              <img src={student.passportPhoto} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-[8px] font-bold uppercase text-center leading-tight">
                <UserCheck className="w-5 h-5 text-slate-400" />
                <span>Photo</span>
              </div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-4 gap-2">
            <div>
              <span className="text-slate-500 font-medium block text-[9px] uppercase">Candidate Name:</span>
              <span className="font-extrabold text-slate-900 text-xs">{student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block text-[9px] uppercase">Registration No:</span>
              <span className="font-mono font-bold text-blue-800">{student.regNo}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block text-[9px] uppercase">Class & Stream:</span>
              <span className="font-bold text-slate-800">{student.className} - {student.stream || 'STREAM A'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block text-[9px] uppercase">Gender / Level:</span>
              <span className="font-bold text-slate-800">{student.gender || 'Student'} • {student.level}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Content Layout for Landscape */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column (5 Cols): Character, Periods, Attendance, Signatures */}
          <div className="col-span-5 space-y-3">
            {/* Setting of Periods & Attendance */}
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                <span className="font-bold text-[10px] text-[#1f4d8b] uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  Period Settings & Attendance
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  {attendanceRate}% Present
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center">
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400 text-[9px] font-bold uppercase">Total Periods</div>
                  <div className="font-extrabold text-slate-900">{periodSetting.totalPeriods}</div>
                </div>
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400 text-[9px] font-bold uppercase">Attended</div>
                  <div className="font-extrabold text-emerald-700">{periodSetting.attendedPeriods}</div>
                </div>
                <div className="bg-white p-1 rounded border border-slate-200">
                  <div className="text-slate-400 text-[9px] font-bold uppercase">Absent</div>
                  <div className="font-extrabold text-rose-700">
                    {Math.max(0, periodSetting.totalPeriods - periodSetting.attendedPeriods)}
                  </div>
                </div>
              </div>
            </div>

            {/* Character & Conduct Assessment */}
            <div className="border border-slate-300 rounded p-2.5 bg-white">
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                <span className="font-bold text-[10px] text-[#1f4d8b] uppercase flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-600" />
                  Character & Behavioral Assessment
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Overall:</span>
                  <span className="bg-blue-800 text-white font-black text-[10px] px-1.5 py-0.2 rounded">
                    Grade {characterAssessment.overallConductGrade}
                  </span>
                </div>
              </div>

              <div className="space-y-1 max-h-[190px] overflow-y-auto pr-1">
                {characterAssessment.traits.map(trait => (
                  <div key={trait.id} className="flex items-start justify-between gap-1 text-[10px] border-b border-slate-100 pb-1">
                    <div className="flex-1 pr-1">
                      <div className="font-bold text-slate-800 leading-tight">{trait.name}</div>
                      <div className="text-[9px] text-slate-500 leading-snug">{trait.remark}</div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded font-black text-[10px] shrink-0 ${
                      trait.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                      trait.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                      trait.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {trait.grade}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Remarks & Signatures */}
            <div className="border border-slate-300 rounded p-2 bg-slate-50 space-y-1.5">
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">Class Teacher&apos;s Remarks:</div>
                <div className="text-[10px] font-medium text-slate-800 italic bg-white p-1 rounded border border-slate-200">
                  &ldquo;{classTeacherRemarks}&rdquo;
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">Head of School&apos;s Decision & Remarks:</div>
                <div className="text-[10px] font-medium text-slate-800 italic bg-white p-1 rounded border border-slate-200">
                  &ldquo;{headTeacherRemarks}&rdquo;
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[9px] border-t border-slate-200">
                <div>
                  <span className="font-bold">Head of School:</span> {schoolInfo.principal || 'Headmaster'}
                </div>
                <div>
                  <span className="font-bold">Date:</span> {dateIssued}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): Academic Results, Performance Summary & Grading Legend */}
          <div className="col-span-7 space-y-3">
            {/* Academic Results Table */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] text-[#1f4d8b] uppercase flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Academic Performance by Subject
                </span>
                <span className="text-[10px] text-slate-500">
                  {subjectEntries.length} Subjects Evaluated
                </span>
              </div>

              <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                    <th className="p-1.5 border border-slate-900">Subject</th>
                    <th className="p-1.5 border border-slate-900 text-center w-16">Score %</th>
                    <th className="p-1.5 border border-slate-900 text-center w-14">Grade</th>
                    <th className="p-1.5 border border-slate-900 text-center w-14">Points</th>
                    <th className="p-1.5 border border-slate-900">Performance Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectEntries.map(([sub, score]) => {
                    const info = isPrimary ? getPrimarySubjectGradeInfo(score) : getSubjectGradeInfo(score);
                    return (
                      <tr key={sub} className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">{sub}</td>
                        <td className="p-1.5 border border-slate-300 text-center font-extrabold text-slate-900">{info.score}</td>
                        <td className="p-1.5 border border-slate-300 text-center">
                          <span 
                            style={{ backgroundColor: info.bg, color: info.color, borderColor: info.border }}
                            className="inline-block px-2 py-0.5 rounded font-black text-[10px] border shadow-2xs"
                          >
                            {info.grade}
                          </span>
                        </td>
                        <td className="p-1.5 border border-slate-300 text-center font-bold text-slate-700">{info.points}</td>
                        <td className="p-1.5 border border-slate-300 text-[10px]">
                          <span className="font-bold text-slate-800">{info.remark}</span>{' '}
                          <span className="text-slate-400 font-medium">({info.swahiliRemark})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Banner */}
            <div className="bg-[#1f4d8b] text-white p-3 rounded-lg grid grid-cols-4 gap-2 text-center shadow-xs border border-blue-900">
              <div className="border-r border-blue-800 pr-2">
                <div className="text-[9px] uppercase font-bold text-blue-200">Total Marks</div>
                <div className="text-lg font-black">{perf.total}</div>
                <div className="text-[8px] text-blue-200">Out of {perf.subjectCount * 100}</div>
              </div>
              <div className="border-r border-blue-800 pr-2">
                <div className="text-[9px] uppercase font-bold text-blue-200">Average %</div>
                <div className="text-lg font-black text-amber-300">{perf.average}%</div>
                <div className="text-[8px] text-blue-200">GPA: {perf.gpa}</div>
              </div>
              <div className="border-r border-blue-800 pr-2">
                <div className="text-[9px] uppercase font-bold text-blue-200">
                  {isPrimary ? 'Overall Grade' : 'Division Awarded'}
                </div>
                <div className="text-lg font-black text-emerald-300">
                  {isPrimary ? `Grade ${student.primaryGrade || primaryOverallGrade}` : `Div ${perf.division}`}
                </div>
                <div className="text-[8px] text-blue-200 truncate">
                  {isPrimary ? primaryPassStatus : perf.divisionDesc.split(' ')[0]}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-blue-200">Class Position</div>
                <div className="text-lg font-black text-white">
                  {rank.position}<span className="text-xs font-normal">/{rank.totalStudents}</span>
                </div>
                <div className="text-[8px] text-blue-200">Rank in Class</div>
              </div>
            </div>

            {/* Grading Scale Legend & Next Term Notice */}
            <div className="grid grid-cols-12 gap-2 text-[9px] border-t border-slate-300 pt-2">
              <div className="col-span-8">
                <div className="font-bold text-slate-700 uppercase mb-0.5">Official NECTA Grading Scale:</div>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">A: 75-100% (Distinction, 1 pt)</span>
                  <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">B: 65-74% (Very Good, 2 pts)</span>
                  <span className="bg-sky-100 text-sky-800 px-1 py-0.5 rounded font-bold">C: 50-64% (Good, 3 pts)</span>
                  <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">D: 35-49% (Satisfactory, 4 pts)</span>
                  <span className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-bold">F: 0-34% (Fail, 5 pts)</span>
                </div>
              </div>
              <div className="col-span-4 text-right bg-amber-50 p-1.5 rounded border border-amber-200">
                <div className="font-bold text-amber-900 uppercase">Next Term Resumes:</div>
                <div className="font-extrabold text-slate-900 text-[10px]">{periodSetting.nextTermBegins || '12 January 2027'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // A4 PORTRAIT LAYOUT (210mm x 297mm)
  // Standard vertical official report card document
  // -------------------------------------------------------------
  return (
    <div 
      id={containerId}
      className="bg-white text-slate-900 p-8 shadow-xl mx-auto space-y-4 text-xs"
      style={{
        width: '100%',
        maxWidth: '820px',
        boxSizing: 'border-box',
        border: '8px solid',
        borderImage: 'linear-gradient(135deg, #1EB53A 0% 33%, #FCD116 33% 38%, #000000 38% 62%, #FCD116 62% 67%, #00A3E0 67% 100%) 1'
      }}
    >
      {/* Official Header */}
      <div className="text-center border-b-2 border-slate-900 pb-3">
        <div className="flex items-center justify-center gap-3.5 mb-1.5">
          {schoolInfo.logo ? (
            <div className="w-14 h-14 rounded-full bg-white p-1 shadow-xs border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={schoolInfo.logo} alt={schoolInfo.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#1f4d8b] text-white flex items-center justify-center font-black text-xl shadow-xs border border-slate-900 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
          )}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-wide uppercase leading-tight">
                {schoolInfo.name || 'HabyEduPro3A'}
              </h1>
              {schoolInfo.schoolNumber && (
                <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded uppercase">
                  CTR: {schoolInfo.schoolNumber}
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-600">
              {schoolInfo.address || 'P.O. BOX 145, TANGA, TANZANIA'} • TEL: {schoolInfo.phone || '0717616343'} • EMAIL: {schoolInfo.email || 'info@school.ac.tz'}
            </p>
          </div>
        </div>

        <div className="inline-block bg-[#1f4d8b] text-white text-[11px] font-extrabold px-4 py-1 rounded uppercase tracking-wider mt-1">
          Official Student Academic Progress & Character Assessment Report
        </div>
        <p className="text-[10px] text-slate-500 italic mt-1 font-medium">
          &ldquo;{schoolInfo.motto || 'Education for Self-Reliance & Academic Excellence'}&rdquo;
        </p>
      </div>

      {/* Student Details & Period Settings Grid with Passport Photo */}
      <div className="grid grid-cols-12 gap-3 text-xs bg-slate-50 border border-slate-300 p-3 rounded-lg">
        {/* Candidate Information & Passport Photo (7 cols) */}
        <div className="col-span-7 flex gap-3 items-center">
          <div className="w-20 h-24 bg-white border-2 border-slate-900 rounded shrink-0 overflow-hidden flex flex-col items-center justify-center shadow-xs">
            {student.passportPhoto ? (
              <img src={student.passportPhoto} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 text-[8px] font-bold uppercase text-center p-1 leading-tight">
                <UserCheck className="w-6 h-6 mb-1 text-slate-400" />
                <span>Passport Photo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex justify-between border-b border-slate-200 pb-0.5">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Candidate:</span>
              <span className="font-extrabold text-slate-900 text-sm truncate pl-1">{student.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-0.5">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Reg No:</span>
              <span className="font-mono font-bold text-blue-700">{student.regNo}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-0.5">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Class & Stream:</span>
              <span className="font-bold text-slate-800">{student.className} - {student.stream || 'STREAM A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Level & Sex:</span>
              <span className="font-bold text-slate-800">{student.level} • {student.gender || 'Student'}</span>
            </div>
          </div>
        </div>

        {/* Period Settings & Attendance (5 cols) */}
        <div className="col-span-5 space-y-1.5 border-l border-slate-200 pl-3">
          <div className="flex justify-between border-b border-slate-200 pb-0.5">
            <span className="text-slate-500 font-semibold uppercase text-[10px]">Evaluation Term:</span>
            <span className="font-bold text-blue-800">{periodSetting.termName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-0.5">
            <span className="text-slate-500 font-semibold uppercase text-[10px]">Academic Year:</span>
            <span className="font-bold text-slate-800">{periodSetting.academicYear}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-0.5">
            <span className="text-slate-500 font-semibold uppercase text-[10px]">Period Attendance:</span>
            <span className="font-bold text-emerald-700">
              {periodSetting.attendedPeriods} / {periodSetting.totalPeriods} ({attendanceRate}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold uppercase text-[10px]">Date of Birth:</span>
            <span className="font-bold text-slate-800">{student.dob || '—'}</span>
          </div>
        </div>
      </div>

      {/* Academic Performance Table */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#1f4d8b] uppercase">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            Academic Subject Assessment Results
          </span>
          <span className="text-[10px] text-slate-500">Graded on 100% Scale</span>
        </div>

        <table className="w-full text-left border-collapse text-xs border-2 border-slate-900">
          <thead>
            <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
              <th className="p-2 border border-slate-900">Subject Name</th>
              <th className="p-2 border border-slate-900 text-center w-20">Score %</th>
              <th className="p-2 border border-slate-900 text-center w-16">Grade</th>
              <th className="p-2 border border-slate-900 text-center w-16">Points</th>
              <th className="p-2 border border-slate-900">Performance Remark & Criteria</th>
            </tr>
          </thead>
          <tbody>
            {subjectEntries.map(([sub, score]) => {
              const info = isPrimary ? getPrimarySubjectGradeInfo(score) : getSubjectGradeInfo(score);
              return (
                <tr key={sub} className="border-b border-slate-300 hover:bg-slate-50/70">
                  <td className="p-2 border border-slate-300 font-bold text-slate-900">{sub}</td>
                  <td className="p-2 border border-slate-300 text-center font-extrabold text-slate-900">{info.score}</td>
                  <td className="p-2 border border-slate-300 text-center">
                    <span 
                      style={{ backgroundColor: info.bg, color: info.color, borderColor: info.border }}
                      className="inline-block px-2.5 py-0.5 rounded font-black text-xs border shadow-2xs"
                    >
                      {info.grade}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">{info.points}</td>
                  <td className="p-2 border border-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{info.remark}</span>
                      <span className="text-[10px] text-slate-500 font-medium italic">({info.swahiliRemark})</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Performance Summary Statistics */}
      <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-[#1f4d8b] text-white border border-blue-900 rounded-lg text-center shadow-xs">
        <div className="border-r border-blue-800 pr-2">
          <div className="text-[10px] text-blue-200 font-bold uppercase">Total Marks</div>
          <div className="text-2xl font-black mt-0.5">{perf.total}</div>
          <div className="text-[9px] text-blue-200">Out of {perf.subjectCount * 100}</div>
        </div>
        <div className="border-r border-blue-800 pr-2">
          <div className="text-[10px] text-blue-200 font-bold uppercase">Average Score</div>
          <div className="text-2xl font-black mt-0.5 text-amber-300">{perf.average}%</div>
          <div className="text-[9px] text-blue-200">GPA: {perf.gpa} pts</div>
        </div>
        <div className="border-r border-blue-800 pr-2">
          <div className="text-[10px] text-blue-200 font-bold uppercase">
            {isPrimary ? 'Overall Grade' : 'Division Awarded'}
          </div>
          <div className="text-2xl font-black mt-0.5 text-emerald-300">
            {isPrimary ? `Grade ${student.primaryGrade || primaryOverallGrade}` : `Div ${perf.division}`}
          </div>
          <div className="text-[9px] text-blue-200 truncate">
            {isPrimary ? primaryPassStatus : perf.divisionDesc}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-blue-200 font-bold uppercase">Class Position</div>
          <div className="text-2xl font-black mt-0.5 text-white">
            {rank.position}<span className="text-sm font-normal"> / {rank.totalStudents}</span>
          </div>
          <div className="text-[9px] text-blue-200">Rank in Class</div>
        </div>
      </div>

      {/* Character & Behavioral Assessment Section */}
      <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-xs text-[#1f4d8b] uppercase">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Character & Behavioral Assessment (Tathmini ya Tabia na Mwenendo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Overall Conduct:</span>
            <span className="bg-blue-800 text-white font-extrabold text-xs px-2 py-0.5 rounded">
              Grade {characterAssessment.overallConductGrade}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 italic">
          &ldquo;{characterAssessment.overallConductRemark}&rdquo;
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          {characterAssessment.traits.map(trait => (
            <div key={trait.id} className="p-1.5 bg-slate-50 border border-slate-200 rounded flex items-start justify-between gap-1.5">
              <div className="flex-1">
                <div className="font-bold text-slate-800 leading-tight">{trait.name}</div>
                <div className="text-[9px] text-slate-500 leading-snug">{trait.remark}</div>
              </div>
              <span className={`px-2 py-0.5 rounded font-black text-xs shrink-0 ${
                trait.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                trait.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                trait.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                {trait.grade}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Remarks, Signatures & Next Term */}
      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-3 text-xs">
        <div>
          <div className="font-bold text-slate-700 text-[10px] uppercase mb-0.5">
            Class Teacher&apos;s Comprehensive Remarks (Maoni ya Mwalimu wa Darasa):
          </div>
          <div className="bg-white p-2 rounded border border-slate-200 italic text-slate-800 font-medium">
            &ldquo;{classTeacherRemarks}&rdquo;
          </div>
        </div>

        <div>
          <div className="font-bold text-slate-700 text-[10px] uppercase mb-0.5">
            Head of School&apos;s Recommendation & Official Decision (Maoni ya Mkuu wa Shule):
          </div>
          <div className="bg-white p-2 rounded border border-slate-200 italic text-slate-800 font-medium">
            &ldquo;{headTeacherRemarks}&rdquo;
          </div>
        </div>

        <div className="pt-2 border-t border-slate-300 grid grid-cols-3 gap-3 items-end">
          <div>
            <div className="text-[10px] font-bold text-slate-600">Class Teacher Signature:</div>
            <div className="h-8 border-b border-dashed border-slate-400 mt-1"></div>
            <div className="text-[9px] text-slate-400 mt-0.5">Signature / Tarehe</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-600">Official School Stamp:</div>
            <div className="h-10 border border-dashed border-slate-400 rounded mt-1 flex items-center justify-center text-[9px] text-slate-400 font-semibold uppercase">
              School Seal / Muhuri
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-600">Head of School:</div>
            <div className="font-bold text-slate-900 mt-1">{schoolInfo.principal || 'Headmaster'}</div>
            <div className="text-[10px] text-slate-500">Date Issued: {dateIssued}</div>
          </div>
        </div>
      </div>

      {/* Grading Legend Bar */}
      <div className="border-t border-slate-300 pt-2 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-600">
        <div>
          <strong className="text-slate-800 uppercase">{isPrimary ? 'Tanzanian Primary Grading Scale:' : 'National NECTA Grading Scale:'}</strong>{' '}
          {isPrimary ? (
            <>
              <span className="font-semibold">A (81-100% Bora Sana)</span> •{' '}
              <span className="font-semibold">B (61-80% Vizuri Sana)</span> •{' '}
              <span className="font-semibold">C (41-60% Wastani / Pass)</span> •{' '}
              <span className="font-semibold">D (21-40% Hafifu)</span> •{' '}
              <span className="font-semibold">E (0-20% Hafifu Sana)</span>
            </>
          ) : (
            <>
              <span className="font-semibold">A (75-100% Distinction)</span> •{' '}
              <span className="font-semibold">B (65-74% Very Good)</span> •{' '}
              <span className="font-semibold">C (45-64% Good)</span> •{' '}
              <span className="font-semibold">D (30-44% Satisfactory)</span> •{' '}
              <span className="font-semibold">F (0-29% Fail)</span>
            </>
          )}
        </div>
        <div className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
          Next Term Commences: {periodSetting.nextTermBegins || '12 January 2027'}
        </div>
      </div>
    </div>
  );
};
