import React, { useState } from 'react';
import { Student, CharacterTrait, ReportCardPeriodSetting, StudentReportCardData } from '../../types';
import { 
  calculatePerformanceSummary, 
  generateCharacterFromPerformance, 
  getDefaultPeriodSetting,
  getSubjectGradeInfo 
} from '../../utils/reportCardUtils';
import { 
  X, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Clock, 
  BookOpen, 
  MessageSquare,
  Plus,
  Trash2,
  RotateCcw,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface EditReportCardModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: Student) => void;
}

export const EditReportCardModal: React.FC<EditReportCardModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'marks' | 'periods' | 'character' | 'remarks' | 'photo'>('marks');
  const [passportPhoto, setPassportPhoto] = useState<string>(student.passportPhoto || '');

  // Marks state
  const [marks, setMarks] = useState<Record<string, number>>(() => ({
    ...(student.marks && Object.keys(student.marks).length > 0
      ? student.marks
      : {
          'English Language': 75,
          'Kiswahili': 80,
          'Mathematics': 70,
          'Physics': 68,
          'Chemistry': 72,
          'Biology': 75,
          'Geography': 70,
          'Civics': 74
        })
  }));

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectScore, setNewSubjectScore] = useState<number>(70);

  // Period settings state
  const [periodSetting, setPeriodSetting] = useState<ReportCardPeriodSetting>(() => ({
    ...(student.reportCardData?.periodSetting || getDefaultPeriodSetting())
  }));

  // Character Assessment state
  const initialPerf = calculatePerformanceSummary(marks);
  const initialAttendance = periodSetting.totalPeriods > 0 
    ? Math.round((periodSetting.attendedPeriods / periodSetting.totalPeriods) * 100) 
    : 96;

  const [characterAssessment, setCharacterAssessment] = useState<{
    overallConductGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    overallConductRemark: string;
    traits: CharacterTrait[];
  }>(() => {
    if (student.reportCardData?.characterAssessment) {
      return student.reportCardData.characterAssessment;
    }
    return generateCharacterFromPerformance(initialPerf.average, initialPerf.division, initialAttendance);
  });

  // Remarks state
  const [classTeacherRemarks, setClassTeacherRemarks] = useState<string>(
    student.reportCardData?.classTeacherRemarks || 
    'A very disciplined and hardworking student. Shows strong commitment to all study periods.'
  );

  const [headTeacherRemarks, setHeadTeacherRemarks] = useState<string>(
    student.reportCardData?.headTeacherRemarks || 
    'Excellent academic results and exemplary conduct. Approved for continuation in senior stream.'
  );

  const [dateIssued, setDateIssued] = useState<string>(
    student.reportCardData?.dateIssued || new Date().toISOString().split('T')[0]
  );

  // Live performance calculation
  const livePerf = calculatePerformanceSummary(marks);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setMarks(prev => ({
      ...prev,
      [newSubjectName.trim()]: Math.min(100, Math.max(0, Number(newSubjectScore) || 0))
    }));
    setNewSubjectName('');
    setNewSubjectScore(70);
  };

  const handleRemoveSubject = (subName: string) => {
    setMarks(prev => {
      const next = { ...prev };
      delete next[subName];
      return next;
    });
  };

  const handleAutoAssessCharacter = () => {
    const attRate = periodSetting.totalPeriods > 0 
      ? Math.round((periodSetting.attendedPeriods / periodSetting.totalPeriods) * 100)
      : 96;
    const generated = generateCharacterFromPerformance(livePerf.average, livePerf.division, attRate);
    setCharacterAssessment(generated);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPassportPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAll = () => {
    const total = livePerf.total;
    const average = String(livePerf.average);
    const division = livePerf.division;

    const reportCardData: StudentReportCardData = {
      periodSetting,
      characterAssessment,
      classTeacherRemarks,
      headTeacherRemarks,
      dateIssued: new Date(dateIssued).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    };

    const updatedStudent: Student = {
      ...student,
      marks,
      total,
      average,
      division,
      passportPhoto: passportPhoto || undefined,
      reportCardData
    };

    onSave(updatedStudent);
    onClose();
  };

  // Quick remarks templates
  const classTeacherTemplates = [
    'An exceptionally bright and diligent student who shows outstanding potential. Keep up the high standard!',
    'A hardworking and disciplined student with consistent effort in all subjects. Well done!',
    'A disciplined student with steady performance. Recommended to put more effort in mathematics revision.',
    'Has potential to improve. Requires strict follow-up in remedial periods and daily assignments.'
  ];

  const headTeacherTemplates = [
    'Outstanding academic excellence and exemplary character. Highly recommended for academic honours!',
    'Very good progress demonstrated throughout the term. Approved for advanced stream progress.',
    'Satisfactory results. Encouraged to participate actively in evening study clinics.',
    'Needs serious dedication and parent-teacher counseling to strengthen core competencies.'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#1f4d8b] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-200" />
              <span>Edit Report Card: {student.name}</span>
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Reg No: <span className="font-mono font-bold text-amber-300">{student.regNo}</span> • Class: {student.className} • Stream: {student.stream || 'STREAM A'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Performance Strip */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Total Marks</span>
              <span className="font-black text-slate-900 text-sm">{livePerf.total}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Average</span>
              <span className="font-black text-blue-700 text-sm">{livePerf.average}%</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Division</span>
              <span className="font-black text-emerald-700 text-sm">Div {livePerf.division}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">GPA</span>
              <span className="font-black text-slate-800 text-sm">{livePerf.gpa}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600">Conduct:</span>
            <span className="bg-blue-800 text-white font-extrabold px-2 py-0.5 rounded text-[11px]">
              Grade {characterAssessment.overallConductGrade}
            </span>
            <button
              type="button"
              onClick={handleAutoAssessCharacter}
              className="ml-2 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-colors"
              title="Automatically derive conduct and character traits from the current performance"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Assess from Performance</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('marks')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'marks'
                ? 'border-[#1f4d8b] text-[#1f4d8b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Subject Marks ({Object.keys(marks).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('periods')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'periods'
                ? 'border-[#1f4d8b] text-[#1f4d8b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Periods & Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('character')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'character'
                ? 'border-[#1f4d8b] text-[#1f4d8b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>3. Character & Conduct</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remarks')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'remarks'
                ? 'border-[#1f4d8b] text-[#1f4d8b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>4. Official Remarks & Dates</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'photo'
                ? 'border-[#1f4d8b] text-[#1f4d8b]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>5. Passport Photo</span>
            {passportPhoto && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: MARKS */}
          {activeTab === 'marks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Academic Subject Marks (Out of 100)</h3>
                  <p className="text-xs text-slate-500">Edit scores directly. Grades, points, and division update automatically.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(marks).map(([sub, score]) => {
                  const info = getSubjectGradeInfo(score);
                  return (
                    <div key={sub} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative group">
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <label className="text-xs font-bold text-slate-800 block truncate pr-5 mb-1" title={sub}>
                        {sub}
                      </label>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score}
                          onChange={e => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            setMarks(prev => ({ ...prev, [sub]: val }));
                          }}
                          className="w-20 px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-center"
                        />

                        <div className="flex-1 flex items-center justify-between text-xs">
                          <span 
                            style={{ backgroundColor: info.bg, color: info.color, borderColor: info.border }}
                            className="px-2 py-0.5 rounded font-black border text-[11px]"
                          >
                            Grade {info.grade}
                          </span>
                          <span className="text-slate-500 font-semibold text-[11px]">
                            {info.points} pt
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Subject form */}
              <form onSubmit={handleAddSubject} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Subject:
                </span>
                <input
                  type="text"
                  placeholder="e.g. History, Commerce, Computer Studies"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-blue-300 rounded-lg bg-white min-w-[220px]"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Score"
                  value={newSubjectScore}
                  onChange={e => setNewSubjectScore(Number(e.target.value) || 0)}
                  className="w-16 px-2 py-1.5 text-xs font-bold border border-blue-300 rounded-lg bg-white text-center"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-[#1f4d8b] text-white rounded-lg hover:bg-blue-800"
                >
                  Add Subject
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: PERIODS & ATTENDANCE */}
          {activeTab === 'periods' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Academic Evaluation Period & Lesson Attendance</h3>
                <p className="text-xs text-slate-500">Configure the term/examination cycle, teaching period totals, and student attendance.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Evaluation Term Name</label>
                  <input
                    type="text"
                    value={periodSetting.termName}
                    onChange={e => setPeriodSetting({ ...periodSetting, termName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['Term I - Mid-Term', 'Term I - Terminal Exam', 'Term II - Mid-Term', 'Term II - Annual Exam'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPeriodSetting({ ...periodSetting, termName: preset })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={periodSetting.academicYear}
                    onChange={e => setPeriodSetting({ ...periodSetting, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Total Scheduled Teaching Periods</label>
                  <input
                    type="number"
                    min="1"
                    value={periodSetting.totalPeriods}
                    onChange={e => setPeriodSetting({ ...periodSetting, totalPeriods: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Total timetable lesson periods scheduled in this term</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Lesson Periods Attended by Student</label>
                  <input
                    type="number"
                    min="0"
                    max={periodSetting.totalPeriods}
                    value={periodSetting.attendedPeriods}
                    onChange={e => setPeriodSetting({ ...periodSetting, attendedPeriods: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Attendance Rate: {periodSetting.totalPeriods > 0 
                      ? Math.round((periodSetting.attendedPeriods / periodSetting.totalPeriods) * 100) 
                      : 0}%
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Evaluation Period Window</label>
                  <input
                    type="text"
                    value={periodSetting.evaluationPeriod}
                    onChange={e => setPeriodSetting({ ...periodSetting, evaluationPeriod: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="e.g. July - November 2026"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Next Term Commences Date</label>
                  <input
                    type="text"
                    value={periodSetting.nextTermBegins || ''}
                    onChange={e => setPeriodSetting({ ...periodSetting, nextTermBegins: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    placeholder="e.g. 12 January 2027"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHARACTER ASSESSMENT */}
          {activeTab === 'character' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Character, Conduct & Behavioral Assessment</h3>
                  <p className="text-xs text-slate-500">Evaluates discipline, attendance, diligence, and leadership.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoAssessCharacter}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Evaluate from Marks</span>
                </button>
              </div>

              {/* Overall Conduct */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-900 uppercase">Overall Conduct Grade</label>
                  <select
                    value={characterAssessment.overallConductGrade}
                    onChange={e => setCharacterAssessment({
                      ...characterAssessment,
                      overallConductGrade: e.target.value as 'A' | 'B' | 'C' | 'D' | 'F'
                    })}
                    className="px-3 py-1 text-xs font-bold border border-blue-300 rounded-lg bg-white"
                  >
                    <option value="A">Grade A (Exemplary / Mfano Bora)</option>
                    <option value="B">Grade B (Very Good / Nzuri Sana)</option>
                    <option value="C">Grade C (Satisfactory / Inaridhisha)</option>
                    <option value="D">Grade D (Needs Improvement / Inahitaji Marekebisho)</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={characterAssessment.overallConductRemark}
                  onChange={e => setCharacterAssessment({
                    ...characterAssessment,
                    overallConductRemark: e.target.value
                  })}
                  className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg bg-white"
                  placeholder="Summary remark on student's overall conduct and behavior..."
                />
              </div>

              {/* Trait breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Individual Behavioral Traits & Evaluation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {characterAssessment.traits.map((trait, idx) => (
                    <div key={trait.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-800">{trait.name}</div>
                        <select
                          value={trait.grade}
                          onChange={e => {
                            const newTraits = [...characterAssessment.traits];
                            newTraits[idx] = { ...trait, grade: e.target.value as any };
                            setCharacterAssessment({ ...characterAssessment, traits: newTraits });
                          }}
                          className="px-2 py-0.5 text-xs font-bold border border-slate-300 rounded bg-white"
                        >
                          <option value="A">A - Excellent</option>
                          <option value="B">B - Very Good</option>
                          <option value="C">C - Satisfactory</option>
                          <option value="D">D - Needs Improvement</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={trait.remark}
                        onChange={e => {
                          const newTraits = [...characterAssessment.traits];
                          newTraits[idx] = { ...trait, remark: e.target.value };
                          setCharacterAssessment({ ...characterAssessment, traits: newTraits });
                        }}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REMARKS & DATES */}
          {activeTab === 'remarks' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Official Teacher & Headmaster Remarks</h3>
                <p className="text-xs text-slate-500">Provide official comments that appear above official stamps and signatures.</p>
              </div>

              {/* Class Teacher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Class Teacher&apos;s Remarks (Maoni ya Mwalimu wa Darasa)
                </label>
                <textarea
                  rows={3}
                  value={classTeacherRemarks}
                  onChange={e => setClassTeacherRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <div className="flex flex-wrap gap-1">
                  {classTeacherTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setClassTeacherRemarks(tpl)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[300px]"
                      title={tpl}
                    >
                      &ldquo;{tpl.slice(0, 45)}...&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Head Teacher */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Head of School&apos;s Decision & Remarks (Maoni ya Mkuu wa Shule)
                </label>
                <textarea
                  rows={3}
                  value={headTeacherRemarks}
                  onChange={e => setHeadTeacherRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
                <div className="flex flex-wrap gap-1">
                  {headTeacherTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setHeadTeacherRemarks(tpl)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[300px]"
                      title={tpl}
                    >
                      &ldquo;{tpl.slice(0, 45)}...&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="pt-2 max-w-xs">
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Date Issued</label>
                <input
                  type="date"
                  value={dateIssued}
                  onChange={e => setDateIssued(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 5: STUDENT PASSPORT PHOTO */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Student Passport Photo</h3>
                <p className="text-xs text-slate-500">
                  This official passport photograph is printed on both Portrait and Landscape formats of the student&apos;s report card as well as the Photo Entry Form.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-32 rounded-xl border-2 border-dashed border-blue-400 bg-white flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                  {passportPhoto ? (
                    <>
                      <img 
                        src={passportPhoto} 
                        alt={student.name} 
                        className="w-full h-full object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => setPassportPhoto('')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <Camera className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span className="text-[10px] font-bold block">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Upload or Replace Photograph
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Recommended: Clear portrait on plain background (JPG, PNG or WebP). Maximum file size: 2MB.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="px-4 py-2 bg-[#1f4d8b] hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>{passportPhoto ? 'Change Photo' : 'Upload Passport Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {passportPhoto && (
                      <button
                        type="button"
                        onClick={() => setPassportPhoto('')}
                        className="px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-1.5 transition-all transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Report Card Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
