import React, { useState, useMemo } from 'react';
import { 
  Award, 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  BookOpen, 
  Clock, 
  GraduationCap, 
  X,
  ChevronDown,
  Filter,
  Eye
} from 'lucide-react';
import { Teacher, TeacherEvaluation, SchoolInfo, UserAccount, StreamSetting } from '../types';
import { DEFAULT_CLASSES, SUBJECT_LIST } from '../constants/defaults';
import { TeachingPeriodTrackingView } from './TeachingPeriodTrackingView';

interface TeacherEvaluationViewProps {
  teachers: Teacher[];
  evaluations: TeacherEvaluation[];
  onSaveEvaluation: (evaluation: TeacherEvaluation) => void;
  onDeleteEvaluation: (id: string) => void;
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  streamSettings?: StreamSetting[];
}

const EVALUATION_RUBRIC_CRITERIA = [
  {
    key: 'lessonPlanningScore',
    label: 'Lesson Planning & Schemes of Work',
    swahili: 'Andaa Somo, Azimio la Kazi & Malengo',
    description: 'Clear SMART learning objectives, alignment with NECTA curriculum, and well-structured lesson plan.'
  },
  {
    key: 'subjectMasteryScore',
    label: 'Subject Matter Mastery & Content Depth',
    swahili: 'Umahiri wa Somo, Usahihi & Ufafanuzi',
    description: 'Accurate explanations, conceptual depth, confidence, and answering student questions effectively.'
  },
  {
    key: 'teachingMethodologyScore',
    label: 'Learner-Centered Teaching Methodology',
    swahili: 'Mbinu Shirikishi za Ufundishaji',
    description: 'Use of interactive techniques, group work, problem-solving, and avoiding passive lecturing.'
  },
  {
    key: 'timeManagementScore',
    label: '40-Minute Period Time Management',
    swahili: 'Usimamizi wa Muda (Dakika 40 za Kipindi)',
    description: 'Punctual start, structured introduction (5m), main body (25m), summary & evaluation (10m).'
  },
  {
    key: 'teachingAidsScore',
    label: 'Teaching Aids & Apparatus Usage',
    swahili: 'Vifaa vya Kufundishia & Michoro Ubaoni',
    description: 'Effective use of models, charts, blackboard neatness, laboratory apparatus, or digital tools.'
  },
  {
    key: 'studentAssessmentScore',
    label: 'Formative Assessment & Feedback',
    swahili: 'Tathmini ya Mwanafunzi & Mazoezi',
    description: 'Checks for understanding, oral questions to diverse students, instant feedback, and written tasks.'
  },
  {
    key: 'classroomManagementScore',
    label: 'Classroom Discipline & Participation',
    swahili: 'Nidhamu Darasani & Ushiriki wa Wote',
    description: 'Attentive atmosphere, positive reinforcement, gender inclusivity, and respectful learning environment.'
  }
];

export const TeacherEvaluationView: React.FC<TeacherEvaluationViewProps> = ({
  teachers,
  evaluations,
  onSaveEvaluation,
  onDeleteEvaluation,
  schoolInfo,
  currentUser,
  streamSettings = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'periodtracking' | 'inspections'>('periodtracking');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [printingEvaluation, setPrintingEvaluation] = useState<TeacherEvaluation | null>(null);

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(teachers[0]?.id || 0);
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedStream, setSelectedStream] = useState<string>('STREAM A');
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_LIST[0]);
  const [topicTaught, setTopicTaught] = useState<string>('');
  const [periodName, setPeriodName] = useState<string>('Period 1 (08:00 - 08:40)');
  const [evalDate, setEvalDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [scores, setScores] = useState<Record<string, number>>({
    lessonPlanningScore: 4,
    subjectMasteryScore: 4,
    teachingMethodologyScore: 4,
    timeManagementScore: 4,
    teachingAidsScore: 4,
    studentAssessmentScore: 4,
    classroomManagementScore: 4
  });

  const [strengths, setStrengths] = useState<string>('');
  const [areasForImprovement, setAreasForImprovement] = useState<string>('');
  const [academicMasterRemarks, setAcademicMasterRemarks] = useState<string>('');

  // Selected teacher object
  const activeTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];

  // Available streams for selected class
  const classStreams = useMemo(() => {
    const found = streamSettings.find(s => s.className === selectedClass);
    return found?.streams && found.streams.length > 0 ? found.streams : ['STREAM A', 'STREAM B', 'STREAM C'];
  }, [streamSettings, selectedClass]);

  // Real-time score computation
  const totalScore = useMemo(() => {
    return Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [scores]);

  const percentage = useMemo(() => {
    return Number(((totalScore / 35) * 100).toFixed(1));
  }, [totalScore]);

  const overallGrade = useMemo((): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (percentage >= 80) return 'A';
    if (percentage >= 65) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  }, [percentage]);

  const getGradeBadge = (grade: 'A' | 'B' | 'C' | 'D' | 'F') => {
    switch (grade) {
      case 'A': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'F': return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  const handleScoreChange = (key: string, val: number) => {
    setScores(prev => ({ ...prev, [key]: val }));
  };

  const handleOpenNewEvaluation = (teacherId?: number) => {
    if (teacherId) {
      setSelectedTeacherId(teacherId);
      const t = teachers.find(x => x.id === teacherId);
      if (t && t.subjects.length > 0) {
        setSelectedSubject(t.subjects[0]);
      }
    } else if (teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
      if (teachers[0].subjects.length > 0) {
        setSelectedSubject(teachers[0].subjects[0]);
      }
    }
    setScores({
      lessonPlanningScore: 4,
      subjectMasteryScore: 4,
      teachingMethodologyScore: 4,
      timeManagementScore: 4,
      teachingAidsScore: 4,
      studentAssessmentScore: 4,
      classroomManagementScore: 4
    });
    setTopicTaught('');
    setStrengths('');
    setAreasForImprovement('');
    setAcademicMasterRemarks('');
    setIsFormOpen(true);
  };

  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) {
      alert('Please select a teacher to evaluate.');
      return;
    }
    if (!topicTaught.trim()) {
      alert('Please enter the lesson topic taught.');
      return;
    }

    const newEval: TeacherEvaluation = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teacherId: activeTeacher.id,
      teacherName: activeTeacher.name,
      evaluatorId: currentUser?.id || 'evaluator',
      evaluatorName: currentUser?.fullName || 'Academic Master',
      evaluatorRole: currentUser?.role === 'HEADMASTER' ? 'Headmaster' : 'Academic Master',
      date: evalDate,
      className: selectedClass,
      stream: selectedStream,
      subject: selectedSubject,
      topicTaught: topicTaught.trim(),
      periodName,
      lessonPlanningScore: scores.lessonPlanningScore,
      subjectMasteryScore: scores.subjectMasteryScore,
      teachingMethodologyScore: scores.teachingMethodologyScore,
      timeManagementScore: scores.timeManagementScore,
      teachingAidsScore: scores.teachingAidsScore,
      studentAssessmentScore: scores.studentAssessmentScore,
      classroomManagementScore: scores.classroomManagementScore,
      totalScore,
      percentage,
      overallGrade,
      strengths: strengths.trim() || 'Demonstrated good subject knowledge and classroom control.',
      areasForImprovement: areasForImprovement.trim() || 'Continue enhancing active student participation and questioning.',
      academicMasterRemarks: academicMasterRemarks.trim() || 'Satisfactory lesson execution. Recommended for continuous professional development.'
    };

    onSaveEvaluation(newEval);
    setIsFormOpen(false);
  };

  // Filtered evaluations list
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const matchSearch = !searchQuery || 
        ev.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.topicTaught.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.evaluatorName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchGrade = gradeFilter === 'ALL' || ev.overallGrade === gradeFilter;
      const matchClass = classFilter === 'ALL' || ev.className === classFilter;

      return matchSearch && matchGrade && matchClass;
    });
  }, [evaluations, searchQuery, gradeFilter, classFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = evaluations.length;
    if (total === 0) return { total: 0, avgPercentage: 0, gradeACount: 0, lowCount: 0 };
    const avg = Number((evaluations.reduce((sum, e) => sum + e.percentage, 0) / total).toFixed(1));
    const gradeACount = evaluations.filter(e => e.overallGrade === 'A').length;
    const lowCount = evaluations.filter(e => e.overallGrade === 'D' || e.overallGrade === 'F').length;
    return { total, avgPercentage: avg, gradeACount, lowCount };
  }, [evaluations]);

  return (
    <div className="space-y-6">
      {/* Sub Tab Switcher */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <button
          onClick={() => setActiveSubTab('periodtracking')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
            activeSubTab === 'periodtracking' ? 'bg-blue-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> Ufuatiliaji wa Vipindi & Fomu ya Karatasi (Period Tracking & Weekly Form)
        </button>
        <button
          onClick={() => setActiveSubTab('inspections')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
            activeSubTab === 'inspections' ? 'bg-blue-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Award className="w-4 h-4" /> Ukaguzi Rasmi wa Masomo & Rubric (Formal Lesson Inspections)
        </button>
      </div>

      {activeSubTab === 'periodtracking' ? (
        <TeachingPeriodTrackingView teachers={teachers} schoolInfo={schoolInfo} currentUser={currentUser} streamSettings={streamSettings} />
      ) : (
        <div className="space-y-6">
          {/* Header and KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Evaluations</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lesson inspections recorded</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Teaching Score</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{metrics.avgPercentage}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all departments</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grade A Lessons</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{metrics.gradeACount}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Distinction quality teaching</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mentoring Needed</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{metrics.lowCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">Grade D/F requiring support</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span>Academic Teaching Evaluations & Inspection Reports</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Conduct formal classroom observations, score pedagogical standards, and issue official evaluation reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenNewEvaluation()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Lesson Evaluation</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search teacher, subject, topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-56 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Grade filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500 text-[11px] uppercase">Grade:</span>
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Grades</option>
              <option value="A">Grade A (80-100%)</option>
              <option value="B">Grade B (65-79%)</option>
              <option value="C">Grade C (50-64%)</option>
              <option value="D">Grade D (40-49%)</option>
              <option value="F">Grade F (&lt; 40%)</option>
            </select>
          </div>

          {/* Class filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500 text-[11px] uppercase">Class:</span>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Classes</option>
              {DEFAULT_CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredEvaluations.length}</strong> of {evaluations.length} recorded inspections
        </span>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3 border-r border-slate-200">Date</th>
                <th className="p-3 border-r border-slate-200">Teacher Observed</th>
                <th className="p-3 border-r border-slate-200">Class & Stream</th>
                <th className="p-3 border-r border-slate-200">Subject & Topic</th>
                <th className="p-3 border-r border-slate-200 text-center">Score (/35)</th>
                <th className="p-3 border-r border-slate-200 text-center">Percentage</th>
                <th className="p-3 border-r border-slate-200 text-center">Grade</th>
                <th className="p-3 border-r border-slate-200">Evaluator</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    No academic evaluations recorded matching the criteria. Click "New Lesson Evaluation" to conduct an inspection.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                      {ev.date}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                      {ev.teacherName}
                    </td>
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap text-slate-700">
                      <span className="font-semibold">{ev.className}</span> {ev.stream}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-800">
                      <div className="font-semibold text-blue-900">{ev.subject}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{ev.topicTaught}</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                      {ev.totalScore} / 35
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center font-mono font-bold text-indigo-700">
                      {ev.percentage}%
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${getGradeBadge(ev.overallGrade)}`}>
                        Grade {ev.overallGrade}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-700 text-[11px] whitespace-nowrap">
                      <span className="font-semibold">{ev.evaluatorName}</span>
                      <span className="text-slate-400 block">{ev.evaluatorRole}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrintingEvaluation(ev)}
                          className="px-2.5 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Print official academic evaluation report"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete evaluation for ${ev.teacherName} on ${ev.date}?`)) {
                              onDeleteEvaluation(ev.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete evaluation record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NEW LESSON EVALUATION FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Academic Lesson Evaluation & Inspection</h3>
                  <p className="text-xs text-slate-500">
                    Official pedagogical observation and scoring (NECTA standard criteria)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvaluation} className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Section 1: Lesson Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teacher Under Observation *</label>
                  <select
                    value={selectedTeacherId}
                    onChange={e => {
                      const tId = Number(e.target.value);
                      setSelectedTeacherId(tId);
                      const t = teachers.find(x => x.id === tId);
                      if (t && t.subjects.length > 0) setSelectedSubject(t.subjects[0]);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.initial}) - {t.schoolRole || 'Teacher'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {SUBJECT_LIST.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Observation *</label>
                  <input
                    type="date"
                    value={evalDate}
                    onChange={e => setEvalDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Level *</label>
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {DEFAULT_CLASSES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Stream *</label>
                  <select
                    value={selectedStream}
                    onChange={e => setSelectedStream(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {classStreams.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Period Time (40 Mins) *</label>
                  <input
                    type="text"
                    value={periodName}
                    onChange={e => setPeriodName(e.target.value)}
                    placeholder="e.g. Period 2 (08:40 - 09:20)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lesson Topic & Sub-Topic *</label>
                  <input
                    type="text"
                    required
                    value={topicTaught}
                    onChange={e => setTopicTaught(e.target.value)}
                    placeholder="e.g. Photosynthesis: Light-dependent reactions and chlorophyll absorption"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Section 2: Rubric Criteria Scoring */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rubric Criteria Evaluation (Score 1 to 5)
                  </h4>
                  <div className="text-xs font-bold">
                    <span className="text-slate-500 mr-2">Calculated Total:</span>
                    <span className="text-blue-700 font-mono text-sm">{totalScore}/35</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span className="text-indigo-700 font-mono text-sm">{percentage}%</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${getGradeBadge(overallGrade)}`}>
                      Grade {overallGrade}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {EVALUATION_RUBRIC_CRITERIA.map((criterion, idx) => {
                    const currentVal = scores[criterion.key] || 3;
                    return (
                      <div
                        key={criterion.key}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{criterion.label}</span>
                            <span className="text-[10px] text-slate-500 font-medium italic">({criterion.swahili})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 pl-7">
                            {criterion.description}
                          </p>
                        </div>

                        {/* 1 to 5 Score Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {[1, 2, 3, 4, 5].map(starVal => (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => handleScoreChange(criterion.key, starVal)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                currentVal === starVal
                                  ? 'bg-blue-600 text-white shadow-xs scale-105'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {starVal}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Qualitative Feedback & Remarks */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Academic Evaluator Feedback & Growth Action Plan
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Key Strengths Observed (Sifa & Ufanisi):
                  </label>
                  <textarea
                    rows={2}
                    value={strengths}
                    onChange={e => setStrengths(e.target.value)}
                    placeholder="e.g. Excellent classroom command, interactive questioning, well-drawn diagrams on the board..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Areas for Pedagogical Growth & Improvement (Mambo ya Kuboresha):
                  </label>
                  <textarea
                    rows={2}
                    value={areasForImprovement}
                    onChange={e => setAreasForImprovement(e.target.value)}
                    placeholder="e.g. Improve formative checks at the end of the 40-min lesson, provide written task feedback..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Master's Recommendations & Sign-off:
                  </label>
                  <textarea
                    rows={2}
                    value={academicMasterRemarks}
                    onChange={e => setAcademicMasterRemarks(e.target.value)}
                    placeholder="e.g. Lesson successfully achieved curriculum goals. Recommend peer observation for practical session..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-white -mx-5 -mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Evaluation Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE OFFICIAL TEACHING EVALUATION REPORT */}
      {printingEvaluation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <span className="text-xs font-bold text-slate-700">Official Teaching Evaluation Report Preview</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingEvaluation(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto font-sans bg-white" id="eval-printable-doc">
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-800 pb-4 text-center">
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  {schoolInfo?.name || 'SECONDARY SCHOOL'}
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  ACADEMIC OFFICE &bull; TEACHING QUALITY ASSURANCE & INSPECTION
                </p>
                {schoolInfo?.address && (
                  <p className="text-[11px] text-slate-500">{schoolInfo.address}</p>
                )}
                <div className="mt-3 inline-block px-4 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded">
                  OFFICIAL TEACHER LESSON EVALUATION REPORT
                </div>
              </div>

              {/* Teacher & Lesson Details Table */}
              <div className="my-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Teacher Observed:</span>
                  <span className="font-bold text-slate-900 text-sm">{printingEvaluation.teacherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Subject:</span>
                  <span className="font-bold text-slate-900 text-sm">{printingEvaluation.subject}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Class & Stream:</span>
                  <span className="font-bold text-slate-900 text-sm">{printingEvaluation.className} {printingEvaluation.stream}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Inspection Date:</span>
                  <span className="font-bold text-slate-900 text-sm">{printingEvaluation.date}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-medium block">Period Schedule:</span>
                  <span className="font-bold text-slate-800">{printingEvaluation.periodName}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-medium block">Topic Taught:</span>
                  <span className="font-bold text-slate-800">{printingEvaluation.topicTaught}</span>
                </div>
              </div>

              {/* Itemized Scores Rubric */}
              <div className="my-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Pedagogical Standards & Rubric Scores (1 to 5)
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="border border-slate-300 p-2 text-left w-10">No.</th>
                      <th className="border border-slate-300 p-2 text-left">Evaluation Criterion</th>
                      <th className="border border-slate-300 p-2 text-center w-24">Max Score</th>
                      <th className="border border-slate-300 p-2 text-center w-24">Awarded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVALUATION_RUBRIC_CRITERIA.map((c, i) => (
                      <tr key={c.key}>
                        <td className="border border-slate-300 p-2 text-center font-bold">{i + 1}</td>
                        <td className="border border-slate-300 p-2">
                          <div className="font-bold text-slate-800">{c.label}</div>
                          <div className="text-[10px] text-slate-500">{c.swahili}</div>
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">5</td>
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-blue-900">
                          {(printingEvaluation as any)[c.key] || 4}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-black text-xs">
                      <td colSpan={2} className="border border-slate-300 p-2 text-right uppercase">
                        Total Composite Evaluation Score:
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-mono">35</td>
                      <td className="border border-slate-300 p-2 text-center font-mono text-sm text-blue-800">
                        {printingEvaluation.totalScore} / 35 ({printingEvaluation.percentage}%)
                      </td>
                    </tr>
                    <tr className="bg-blue-50/50 font-black text-xs">
                      <td colSpan={3} className="border border-slate-300 p-2 text-right uppercase">
                        Overall Performance Standing:
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-mono text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-black border ${getGradeBadge(printingEvaluation.overallGrade)}`}>
                          GRADE {printingEvaluation.overallGrade}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Qualitative Remarks */}
              <div className="my-5 space-y-3 text-xs">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <span className="font-bold text-slate-800 block mb-1">Observed Strengths & Commendations:</span>
                  <p className="text-slate-700 leading-relaxed">{printingEvaluation.strengths}</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <span className="font-bold text-slate-800 block mb-1">Constructive Areas for Pedagogical Growth:</span>
                  <p className="text-slate-700 leading-relaxed">{printingEvaluation.areasForImprovement}</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <span className="font-bold text-slate-800 block mb-1">Academic Master's Action Plan & Mentoring Directives:</span>
                  <p className="text-slate-700 leading-relaxed">{printingEvaluation.academicMasterRemarks}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Evaluated By (Academic Office):</p>
                  <p className="font-bold text-slate-900 mt-1">{printingEvaluation.evaluatorName}</p>
                  <p className="text-slate-600 text-[11px]">{printingEvaluation.evaluatorRole}</p>
                  <div className="mt-6 border-b border-slate-400 w-48"></div>
                  <p className="text-[10px] text-slate-400 mt-1">Signature & Official Stamp</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-medium">Teacher Acknowledgment:</p>
                  <p className="font-bold text-slate-900 mt-1">{printingEvaluation.teacherName}</p>
                  <p className="text-slate-600 text-[11px]">Subject Teacher</p>
                  <div className="mt-6 border-b border-slate-400 w-48 ml-auto"></div>
                  <p className="text-[10px] text-slate-400 mt-1">Teacher Signature & Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
