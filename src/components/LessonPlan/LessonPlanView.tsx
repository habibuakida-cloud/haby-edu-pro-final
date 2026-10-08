import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Printer, 
  Save, 
  Download, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Calendar, 
  FileText, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronRight, 
  RotateCcw,
  GraduationCap,
  Award,
  Search,
  Check,
  Loader2
} from 'lucide-react';
import { LessonPlan, CurriculumType, LessonPlanStep } from '../../types/lessonPlan';
import { generateAutoLessonPlan, SYLLABUS_KNOWLEDGE_BASE } from '../../utils/lessonPlanGenerator';
import { 
  ALL_SCHOOL_CLASSES, 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES,
  SUBJECT_LIST,
  PRIMARY_SUBJECTS,
  NURSERY_SUBJECTS,
  SECONDARY_SUBJECTS
} from '../../constants/defaults';
import { SchoolInfo, UserAccount, Teacher } from '../../types';

interface LessonPlanViewProps {
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  teachers?: Teacher[];
  savedPlans?: LessonPlan[];
  onSaveLessonPlan?: (plan: LessonPlan) => void;
  onDeleteLessonPlan?: (planId: string) => void;
}

export const LessonPlanView: React.FC<LessonPlanViewProps> = ({
  schoolInfo,
  currentUser,
  teachers = [],
  savedPlans = [],
  onSaveLessonPlan,
  onDeleteLessonPlan
}) => {
  // Form generator states
  const [selectedClass, setSelectedClass] = useState<string>('Form 3');
  const [selectedStream, setSelectedStream] = useState<string>('STREAM A');
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumType>('NEW_CBC_2023');
  const [selectedSubject, setSelectedSubject] = useState<string>('Physics');
  const [topicInput, setTopicInput] = useState<string>('Force and Motion');
  const [subtopicInput, setSubtopicInput] = useState<string>('Newton\'s Second Law & Momentum');
  const [durationMinutes, setDurationMinutes] = useState<number>(40);
  const [periodNumber, setPeriodNumber] = useState<string>('Period 2');
  const [lessonDate, setLessonDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [registeredStudents, setRegisteredStudents] = useState<number>(45);
  const [presentStudents, setPresentStudents] = useState<number>(43);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // Active generated or loaded plan
  const [currentPlan, setCurrentPlan] = useState<LessonPlan>(() => {
    return generateAutoLessonPlan({
      schoolId: currentUser?.schoolId || 'DEMO_SCHOOL',
      schoolName: schoolInfo.name || 'HABY EDU PRO',
      teacherName: currentUser?.fullName || 'Subject Teacher',
      teacherId: currentUser?.id,
      className: 'Form 3',
      stream: 'STREAM A',
      subject: 'Physics',
      curriculumType: 'NEW_CBC_2023',
      topic: 'Force and Motion',
      subtopic: 'Newton\'s Second Law & Momentum',
      durationMinutes: 40,
      date: new Date().toISOString().split('T')[0],
      periodNumber: 'Period 2',
      registeredStudentsCount: 45,
      presentStudentsCount: 43
    });
  });

  // Local saved plans cache
  const [localSavedPlans, setLocalSavedPlans] = useState<LessonPlan[]>(savedPlans);
  const [activeTab, setActiveTab] = useState<'generator' | 'saved'>('generator');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Available subjects based on class level
  const availableSubjectsForClass = useMemo(() => {
    if (NURSERY_CLASSES.includes(selectedClass)) {
      return NURSERY_SUBJECTS;
    }
    if (PRIMARY_CLASSES.includes(selectedClass)) {
      return PRIMARY_SUBJECTS;
    }
    return SECONDARY_SUBJECTS;
  }, [selectedClass]);

  // Suggested syllabus topics based on selected subject
  const suggestedTopics = useMemo(() => {
    const found = SYLLABUS_KNOWLEDGE_BASE[selectedSubject] || 
      Object.values(SYLLABUS_KNOWLEDGE_BASE).find(s => s.subject.toLowerCase() === selectedSubject.toLowerCase());
    if (found && found.topics.length > 0) {
      return found.topics;
    }
    return [
      {
        mainTopic: `${selectedSubject} Fundamentals`,
        subtopics: ['Key Principles & Terminology', 'Practical Investigation', 'Problem Solving in Daily Life']
      }
    ];
  }, [selectedSubject]);

  // Auto-sync topic inputs when subject changes
  useEffect(() => {
    if (suggestedTopics && suggestedTopics.length > 0) {
      setTopicInput(suggestedTopics[0].mainTopic);
      setSubtopicInput(suggestedTopics[0].subtopics[0] || `Introduction to ${suggestedTopics[0].mainTopic}`);
    } else {
      setTopicInput(`${selectedSubject} Core Topic`);
      setSubtopicInput(`Introduction to ${selectedSubject}`);
    }
  }, [selectedSubject, suggestedTopics]);

  // Handle Generate
  const handleGenerate = () => {
    const newPlan = generateAutoLessonPlan({
      schoolId: currentUser?.schoolId || 'DEMO_SCHOOL',
      schoolName: schoolInfo.name || 'HABY EDU PRO',
      teacherName: currentUser?.fullName || 'Subject Teacher',
      teacherId: currentUser?.id,
      className: selectedClass,
      stream: selectedStream,
      subject: selectedSubject,
      curriculumType: selectedCurriculum,
      topic: topicInput.trim() || 'Core Topic',
      subtopic: subtopicInput.trim() || undefined,
      durationMinutes,
      date: lessonDate,
      periodNumber,
      registeredStudentsCount: registeredStudents,
      presentStudentsCount: presentStudents
    });

    setCurrentPlan(newPlan);
    setActiveTab('generator');
    setSaveToast(`Generated new lesson plan for ${newPlan.subject} (${newPlan.className})!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // AI-Powered Lesson Plan Generation
  const handleAIGenerate = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          className: selectedClass,
          stream: selectedStream,
          topic: topicInput.trim() || 'Core Topic',
          subtopic: subtopicInput.trim() || undefined,
          curriculumType: selectedCurriculum,
          durationMinutes,
          teacherName: currentUser?.fullName || 'Subject Teacher',
          schoolName: schoolInfo.name || 'HABY EDU PRO',
          registeredStudentsCount: registeredStudents,
          presentStudentsCount: presentStudents
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const aiData = json.data;
        const steps: LessonPlanStep[] = (aiData.steps || []).map((step: any) => ({
          stage: step.stage || 'Stage',
          timeMinutes: step.timeMinutes || 10,
          teacherActivities: step.teacherActivities || 'Teacher activity',
          learnerActivities: step.learnerActivities || 'Learner activity',
          assessmentCriteria: step.assessmentCriteria || 'Assessment criteria',
          teachingMedia: step.teachingMedia || 'Teaching media'
        }));

        const newPlan: LessonPlan = {
          id: `plan_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          schoolId: currentUser?.schoolId || 'DEMO_SCHOOL',
          teacherId: currentUser?.id,
          teacherName: currentUser?.fullName || 'Subject Teacher',
          className: selectedClass,
          stream: selectedStream,
          subject: selectedSubject,
          curriculumType: selectedCurriculum,
          date: lessonDate,
          timeSlot: '08:00 - 08:40',
          periodNumber,
          durationMinutes,
          registeredStudentsCount: registeredStudents,
          presentStudentsCount: presentStudents,
          mainTopic: topicInput.trim() || 'Core Topic',
          subTopic: subtopicInput.trim() || 'Key Concepts',
          mainCompetence: aiData.mainCompetence,
          specificCompetence: aiData.specificCompetence,
          generalObjective: aiData.generalObjective,
          specificObjectives: aiData.specificObjectives || [`Understand ${topicInput}`],
          teachingMaterials: aiData.teachingMaterials || [`TIE ${selectedSubject} textbook`],
          references: aiData.references || [`TIE ${selectedSubject} for ${selectedClass}`],
          steps,
          evaluationStrategy: aiData.evaluationStrategy || 'Formative assessment',
          teacherRemarks: aiData.teacherRemarks || `Kipindi kilikwenda vizuri. Wanafunzi ${presentStudents} kati ya ${registeredStudents} walishiriki.`,
          isSaved: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setCurrentPlan(newPlan);
        setActiveTab('generator');
        setSaveToast(`✨ Gemini AI generated Lesson Plan for ${newPlan.subject} (${topicInput})!`);
        setTimeout(() => setSaveToast(null), 3500);
      } else {
        handleGenerate();
      }
    } catch (err) {
      console.warn('AI Lesson plan generation offline, using smart local fallback:', err);
      handleGenerate();
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Handle Save
  const handleSave = () => {
    const updatedPlan = { ...currentPlan, isSaved: true, updatedAt: new Date().toISOString() };
    setCurrentPlan(updatedPlan);

    // Save to local list
    const exists = localSavedPlans.some(p => p.id === updatedPlan.id);
    const updatedList = exists 
      ? localSavedPlans.map(p => p.id === updatedPlan.id ? updatedPlan : p)
      : [updatedPlan, ...localSavedPlans];

    setLocalSavedPlans(updatedList);

    if (onSaveLessonPlan) {
      onSaveLessonPlan(updatedPlan);
    }

    setSaveToast(`Lesson Plan saved successfully!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Handle Print / PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable CSS style targeting official printable layout */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-lesson-plan-print-area, #official-lesson-plan-print-area * {
            visibility: visible;
          }
          #official-lesson-plan-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
            color: black !important;
            font-size: 11pt;
          }
          .no-print {
            display: none !important;
          }
          .page-break-after {
            page-break-after: always;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div className="no-print bg-gradient-to-r from-[#1f4d8b] via-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Auto Lesson Plan Generator (Andaa Somo)
              </h1>
              <p className="text-xs text-blue-200 mt-0.5 font-medium">
                Autonomous generation of official lesson plans complying with Tanzania Institute of Education (TIE) standards
              </p>
            </div>
          </div>

          {/* Tab Selector & Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-white text-blue-900 shadow-md font-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Lesson Generator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-white text-blue-900 shadow-md font-black'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5 text-emerald-300" />
              <span>Saved Plans ({localSavedPlans.length})</span>
            </button>
          </div>
        </div>

        {/* Quick toast */}
        {saveToast && (
          <div className="mt-4 p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* VIEW: GENERATOR FORM & ACTIVE LESSON PLAN */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Generator Controls (4 cols) */}
          <div className="no-print lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Lesson Plan Parameters
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Auto-Gen
                </span>
              </div>

              {/* 1. Class Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  1. Class Level (Nursery to Form 6) *
                </label>
                <select
                  value={selectedClass}
                  onChange={e => {
                    const newClass = e.target.value;
                    setSelectedClass(newClass);
                    // auto pick appropriate subject for that level
                    if (NURSERY_CLASSES.includes(newClass)) {
                      setSelectedSubject(NURSERY_SUBJECTS[0] || 'Kuhesabu na Namba');
                    } else if (PRIMARY_CLASSES.includes(newClass)) {
                      setSelectedSubject(PRIMARY_SUBJECTS[0] || 'Kiswahili');
                    } else {
                      setSelectedSubject('Physics');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <optgroup label="NURSERY & PRE-PRIMARY">
                    {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="PRIMARY (Std 1 - 7)">
                    {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="SECONDARY (Form 1 - 6)">
                    {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Stream & Period Row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Stream</label>
                  <input
                    type="text"
                    value={selectedStream}
                    onChange={e => setSelectedStream(e.target.value)}
                    placeholder="e.g. STREAM A"
                    className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Duration</label>
                  <select
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value={40}>Single (40 mins)</option>
                    <option value={80}>Double (80 mins)</option>
                    <option value={30}>Nursery (30 mins)</option>
                  </select>
                </div>
              </div>

              {/* 2. Subject Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  2. Teaching Subject *
                </label>
                <select
                  value={selectedSubject}
                  onChange={e => {
                    const newSub = e.target.value;
                    setSelectedSubject(newSub);
                    const found = SYLLABUS_KNOWLEDGE_BASE[newSub];
                    if (found && found.topics[0]) {
                      setTopicInput(found.topics[0].mainTopic);
                      setSubtopicInput(found.topics[0].subtopics[0]);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {availableSubjectsForClass.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* 3. Curriculum Type Selection (NEW 2023 vs OLD) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase block">
                  3. Curriculum Type (Framework) *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCurriculum('NEW_CBC_2023')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedCurriculum === 'NEW_CBC_2023'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900">
                        a) New Curriculum (CBC - 2023)
                      </span>
                      {selectedCurriculum === 'NEW_CBC_2023' && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                      Competence-Based Curriculum (Mtaala wa Umahiri). Focus on learner-centered inquiry, real-world application, and performance criteria.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCurriculum('OLD_CONTENT_BASED')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      selectedCurriculum === 'OLD_CONTENT_BASED'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900">
                        b) Old Curriculum (Content Based)
                      </span>
                      {selectedCurriculum === 'OLD_CONTENT_BASED' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                      Content-Based Curriculum (Mtaala wa Maudhui). Step-by-step teacher exposition, chalkboard notes, guided practice, and textbook homework.
                    </p>
                  </button>
                </div>
              </div>

              {/* 4. Topic Input & Suggestions */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  4. Topic / Mada Kuu *
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  placeholder="e.g. Force and Motion"
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                />

                {/* Suggested Topics Chips */}
                {suggestedTopics.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase w-full">Syllabus suggestions:</span>
                    {suggestedTopics.map(t => (
                      <button
                        key={t.mainTopic}
                        type="button"
                        onClick={() => {
                          setTopicInput(t.mainTopic);
                          if (t.subtopics && t.subtopics[0]) {
                            setSubtopicInput(t.subtopics[0]);
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded-md font-medium cursor-pointer"
                      >
                        + {t.mainTopic}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtopic Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Sub-Topic / Mada Ndogo
                </label>
                <input
                  type="text"
                  value={subtopicInput}
                  onChange={e => setSubtopicInput(e.target.value)}
                  placeholder="e.g. Newton's Laws of Motion"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                />
              </div>

              {/* Date & Attendance stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Date</label>
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={e => setLessonDate(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Period</label>
                  <input
                    type="text"
                    value={periodNumber}
                    onChange={e => setPeriodNumber(e.target.value)}
                    placeholder="Period 2"
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Generate Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={handleAIGenerate}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-[0.98]"
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 fill-amber-300 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAI ? 'AI Generating Lesson Plan...' : '✨ AI Smart Generate Lesson Plan'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <span>Instant Auto-Generate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Full Official Lesson Plan Editor & Preview (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Action Bar */}
            <div className="no-print bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                  currentPlan.curriculumType === 'NEW_CBC_2023'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {currentPlan.curriculumType === 'NEW_CBC_2023' 
                    ? 'TIE New Curriculum (CBC 2023)' 
                    : 'TIE Old Curriculum (Content Based)'}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {currentPlan.subject} • {currentPlan.className}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Plan</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  title="Print or Export as Clean PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export PDF / Print</span>
                </button>
              </div>
            </div>

            {/* Official Document Layout (Printable) */}
            <div 
              id="official-lesson-plan-print-area" 
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-slate-900"
            >
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-3">
                  {schoolInfo.logo && (
                    <img src={schoolInfo.logo} alt="Logo" className="w-14 h-14 object-contain" />
                  )}
                  <div>
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide">
                      {schoolInfo.name || 'HABY EDU PRO SCHOOL'}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-600 uppercase">
                      MINISTRY OF EDUCATION, SCIENCE AND TECHNOLOGY • TANZANIA
                    </p>
                    <div className="inline-block px-3 py-0.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded mt-1">
                      ANDAA SOMO / LESSON PLAN
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-300 p-3 rounded-xl bg-slate-50/60 font-medium">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Subject:</span>
                  <span className="font-bold text-slate-900">{currentPlan.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Class & Stream:</span>
                  <span className="font-bold text-slate-900">{currentPlan.className} {currentPlan.stream ? `(${currentPlan.stream})` : ''}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Date & Period:</span>
                  <span className="font-bold text-slate-900">{currentPlan.date} • {currentPlan.periodNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Duration:</span>
                  <span className="font-bold text-slate-900">{currentPlan.durationMinutes} Minutes</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Teacher Name:</span>
                  <span className="font-bold text-slate-900">{currentPlan.teacherName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Curriculum Framework:</span>
                  <span className="font-bold text-blue-900">
                    {currentPlan.curriculumType === 'NEW_CBC_2023' ? 'CBC 2023 (Umahiri)' : 'Content-Based (Maudhui)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Registered Students:</span>
                  <span className="font-bold text-slate-900">{currentPlan.registeredStudentsCount || 45}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Present / Absent:</span>
                  <span className="font-bold text-emerald-800">
                    {currentPlan.presentStudentsCount || 43} Present ({(currentPlan.registeredStudentsCount || 45) - (currentPlan.presentStudentsCount || 43)} Absent)
                  </span>
                </div>
              </div>

              {/* Topic & Subtopic */}
              <div className="space-y-1.5 p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-black text-blue-900 uppercase">MADA KUU / MAIN TOPIC:</span>
                    <span className="ml-2 font-black text-sm text-slate-950">{currentPlan.mainTopic}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-900 uppercase">MADA NDOGO / SUB-TOPIC:</span>
                    <span className="ml-1.5 font-bold text-slate-800">{currentPlan.subTopic}</span>
                  </div>
                </div>
              </div>

              {/* Competencies (New CBC) OR General Objective (Old) */}
              {currentPlan.curriculumType === 'NEW_CBC_2023' ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-black text-blue-900 uppercase block tracking-wider">
                      Umahiri Mkuu / Main Competence:
                    </span>
                    <p className="text-slate-800 font-semibold leading-relaxed">
                      {currentPlan.mainCompetence}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-black text-blue-900 uppercase block tracking-wider">
                      Umahiri Mahususi / Specific Competence:
                    </span>
                    <p className="text-slate-800 font-semibold leading-relaxed">
                      {currentPlan.specificCompetence}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] font-black text-amber-900 uppercase block tracking-wider">
                    Lengo Kuu / General Objective:
                  </span>
                  <p className="text-slate-800 font-semibold leading-relaxed">
                    {currentPlan.generalObjective}
                  </p>
                </div>
              )}

              {/* Specific Objectives / Performance Criteria */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">
                  {currentPlan.curriculumType === 'NEW_CBC_2023' 
                    ? 'Vigezo vya Utendaji / Performance Criteria (Specific Objectives):' 
                    : 'Malengo Mahususi / Specific Objectives (By end of lesson):'}
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium pl-1">
                  {currentPlan.specificObjectives.map((obj, i) => (
                    <li key={i} className="leading-snug">{obj}</li>
                  ))}
                </ul>
              </div>

              {/* Teaching Materials & References */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-[10px] font-black text-slate-700 uppercase block">
                    Zana za Kufundishia na Kujifunzia (Teaching/Learning Materials):
                  </span>
                  <p className="text-slate-800 font-medium">
                    {currentPlan.teachingMaterials.join('; ')}
                  </p>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-[10px] font-black text-slate-700 uppercase block">
                    Marejeleo ya Kiada (Curriculum References):
                  </span>
                  <p className="text-slate-800 font-medium">
                    {currentPlan.references.join('; ')}
                  </p>
                </div>
              </div>

              {/* Lesson Development Table (Hatua za Ufundishaji) */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">
                  Hatua za Ufundishaji na Ujifunzaji / Lesson Development Table:
                </span>
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5 w-32 border-r border-blue-900">Hatua / Stage</th>
                        <th className="p-2.5 w-16 text-center border-r border-blue-900">Muda</th>
                        <th className="p-2.5 border-r border-blue-900">Shughuli za Mwalimu (Teacher)</th>
                        <th className="p-2.5 border-r border-blue-900">Shughuli za Mwanafunzi (Learner)</th>
                        <th className="p-2.5 w-36">Tathmini / Zana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {currentPlan.steps.map((st, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200 align-top">
                            {st.stage}
                          </td>
                          <td className="p-2.5 font-bold text-center border-r border-slate-200 align-top">
                            {st.timeMinutes} min
                          </td>
                          <td className="p-2.5 border-r border-slate-200 align-top leading-relaxed">
                            {st.teacherActivities}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 align-top leading-relaxed">
                            {st.learnerActivities}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-600 align-top leading-tight">
                            {st.assessmentCriteria || st.teachingMedia || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Evaluation & Teacher Reflections */}
              <div className="space-y-3 pt-2">
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs space-y-1">
                  <span className="text-[10px] font-black text-slate-700 uppercase block">
                    Mkakati wa Tathmini / Assessment Strategy:
                  </span>
                  <p className="text-slate-800 font-medium">{currentPlan.evaluationStrategy}</p>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs space-y-1">
                  <span className="text-[10px] font-black text-slate-700 uppercase block">
                    Tathmini ya Mwalimu & Maoni (Teacher's Evaluation & Self-Reflection):
                  </span>
                  <p className="text-slate-800 font-medium italic">{currentPlan.teacherRemarks}</p>
                </div>
              </div>

              {/* Official Signatures Block */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mwalimu wa Somo / Subject Teacher:</span>
                  <div className="mt-6 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">
                    {currentPlan.teacherName} • Saini & Tarehe
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mwalimu wa Taaluma / Academic Master:</span>
                  <div className="mt-6 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">
                    Saini & Tarehe
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Mkuu wa Shule / Head of School:</span>
                  <div className="mt-6 border-b border-slate-400"></div>
                  <span className="block text-[10px] font-semibold text-slate-700 mt-1">
                    Muhuri Rasmi & Saini
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SAVED LESSON PLANS ARCHIVE */}
      {activeTab === 'saved' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Saved School Lesson Plans Archive</h2>
              <p className="text-xs text-slate-500">Access, edit, and re-export previously generated lesson plans for your classes</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('generator')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>

          {localSavedPlans.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto stroke-1 mb-2 text-slate-300" />
              <p className="font-bold text-sm">No saved lesson plans yet.</p>
              <p className="text-xs mt-1">Generate a lesson plan in the generator and click "Save Plan" to archive it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localSavedPlans.map((plan) => (
                <div key={plan.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition bg-white shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        plan.curriculumType === 'NEW_CBC_2023' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {plan.curriculumType === 'NEW_CBC_2023' ? 'CBC 2023' : 'Old Content'}
                      </span>
                      <h4 className="font-black text-sm text-slate-900 mt-1">{plan.subject}</h4>
                      <span className="text-xs font-bold text-slate-600">{plan.className} • {plan.stream || 'STREAM A'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{plan.date}</span>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                    <span className="font-bold block text-[10px] text-slate-400 uppercase">Topic:</span>
                    <span className="font-semibold text-slate-900">{plan.mainTopic}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{plan.subTopic}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPlan(plan);
                        setActiveTab('generator');
                      }}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>View & Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = localSavedPlans.filter(p => p.id !== plan.id);
                        setLocalSavedPlans(updated);
                        if (onDeleteLessonPlan) onDeleteLessonPlan(plan.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                      title="Delete saved plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
