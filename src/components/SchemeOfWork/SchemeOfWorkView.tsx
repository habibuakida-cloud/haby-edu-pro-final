import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Save, 
  BookOpen, 
  CheckCircle2, 
  Calendar, 
  Award, 
  Layers, 
  ArrowRight,
  ClipboardList,
  Edit3,
  X,
  Share2,
  FileText
} from 'lucide-react';
import { SchemeOfWork, SchemeOfWorkItem, TeachingLogBookEntry } from '../../types/schemeOfWork';
import { CurriculumType } from '../../types/lessonPlan';
import { SchoolInfo, UserAccount, Teacher } from '../../types';
import { generateAutoSchemeOfWork } from '../../utils/schemeOfWorkGenerator';
import { HabyEduProLogo } from '../common/HabyEduProLogo';
import { 
  ALL_SCHOOL_CLASSES, 
  POPULAR_SUBJECTS 
} from '../../constants/defaults';

interface SchemeOfWorkViewProps {
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  teachers?: Teacher[];
  schemesOfWork?: SchemeOfWork[];
  onSaveSchemeOfWork?: (scheme: SchemeOfWork) => void;
  onNavigateToLessonPlan?: (subject: string, className: string, topic: string) => void;
}

export const SchemeOfWorkView: React.FC<SchemeOfWorkViewProps> = ({
  schoolInfo,
  currentUser,
  teachers = [],
  schemesOfWork = [],
  onSaveSchemeOfWork,
  onNavigateToLessonPlan
}) => {
  // Generation & Selection State
  const [selectedSubject, setSelectedSubject] = useState<string>('Physics');
  const [selectedClass, setSelectedClass] = useState<string>('Form 3');
  const [selectedStream, setSelectedStream] = useState<string>('All Streams');
  const [curriculumType, setCurriculumType] = useState<CurriculumType>('NEW_CBC_2023');
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [academicYear, setAcademicYear] = useState<string>('2026');
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(4);

  // Active sub-tab: 'scheme' vs 'logbook'
  const [activeTab, setActiveTab] = useState<'scheme' | 'logbook'>('scheme');

  // Currently loaded / edited Scheme of Work
  const [currentScheme, setCurrentScheme] = useState<SchemeOfWork>(() => {
    return generateAutoSchemeOfWork(
      'Physics',
      'Form 3',
      'All Streams',
      'NEW_CBC_2023',
      '2026',
      'Term 1',
      currentUser?.fullName || 'Academic Master',
      schoolInfo.schoolNumber || 'DEMO_SCHOOL',
      4
    );
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate a brand new Scheme of Work based on form controls
  const handleGenerate = () => {
    const generated = generateAutoSchemeOfWork(
      selectedSubject,
      selectedClass,
      selectedStream,
      curriculumType,
      academicYear,
      selectedTerm,
      currentUser?.fullName || 'Teacher',
      schoolInfo.schoolNumber || 'DEMO_SCHOOL',
      periodsPerWeek
    );
    setCurrentScheme(generated);
    showToast(`Generated complete 12-week Scheme of Work & Log Book for ${selectedSubject} (${curriculumType === 'NEW_CBC_2023' ? 'New CBC 2023' : 'Old Curriculum'})!`);
  };

  // AI-Powered Smart Scheme Generation
  const handleAIGenerate = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/generate-scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          className: selectedClass,
          stream: selectedStream,
          curriculumType,
          academicYear,
          term: selectedTerm,
          teacherName: currentUser?.fullName || 'Teacher',
          schoolName: schoolInfo.name || 'HABY EDU PRO',
          periodsPerWeek
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const aiData = json.data;
        const items: SchemeOfWorkItem[] = (aiData.items || []).map((item: any, idx: number) => ({
          id: `scheme_item_ai_${idx}_${Date.now()}`,
          weekNumber: item.weekNumber || idx + 1,
          datesOrMonth: item.datesOrMonth || `Week ${idx + 1}`,
          mainTopicOrCompetence: item.mainTopicOrCompetence || 'Main Topic',
          subTopicOrSpecificCompetence: item.subTopicOrSpecificCompetence || 'Subtopic',
          learningActivitiesOrObjectives: item.learningActivitiesOrObjectives || 'Activities',
          teachingActivities: item.teachingActivities || 'Teaching activities',
          teachingMaterials: item.teachingMaterials || 'Materials',
          assessmentMethods: item.assessmentMethods || 'Assessment',
          references: item.references || `TIE ${selectedSubject} for ${selectedClass}`,
          periodsCount: periodsPerWeek,
          remarks: item.remarks || 'Covered as scheduled'
        }));

        const logBookEntries: TeachingLogBookEntry[] = (aiData.logBookEntries || []).map((log: any, idx: number) => ({
          id: `log_entry_ai_${idx}_${Date.now()}`,
          schemeItemId: items[idx]?.id || `scheme_item_ai_${idx}`,
          date: log.date || `2026-0${Math.min(1 + Math.floor(idx / 4), 4)}-${String(12 + (idx % 4) * 7).padStart(2, '0')}`,
          className: selectedClass,
          stream: selectedStream || 'Stream A',
          periodTime: log.periodTime || 'Period 2 & 3 (08:40 - 10:00)',
          subTopicTaught: log.subTopicTaught || items[idx]?.subTopicOrSpecificCompetence || 'Subtopic',
          workCoveredSummary: log.workCoveredSummary || `Delivered lesson on ${selectedSubject}.`,
          studentsPresent: log.studentsPresent || 43,
          studentsTotal: log.studentsTotal || 45,
          comprehensionEvaluation: log.comprehensionEvaluation || 'GOOD',
          teacherSignature: currentUser?.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('.') : 'TR.'
        }));

        setCurrentScheme({
          id: `scheme_ai_${Date.now()}`,
          schoolId: schoolInfo.schoolNumber || 'DEMO_SCHOOL',
          teacherName: currentUser?.fullName || 'Teacher',
          className: selectedClass,
          stream: selectedStream || 'All Streams',
          subject: selectedSubject,
          curriculumType,
          academicYear,
          term: selectedTerm,
          periodsPerWeek,
          totalWeeks: items.length,
          department: aiData.department || 'Science & Mathematics',
          competenceSummary: aiData.competenceSummary || `AI Generated 12-week Scheme of Work for ${selectedSubject}`,
          items,
          logBookEntries,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        showToast(`✨ Gemini AI generated complete Scheme of Work & Log Book for ${selectedSubject}!`);
      } else {
        // Fallback to local smart generator
        handleGenerate();
      }
    } catch (err) {
      console.warn('AI Generation offline or key missing, falling back to local generator:', err);
      handleGenerate();
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Cell editing helper
  const handleUpdateItemCell = (index: number, field: keyof SchemeOfWorkItem, value: any) => {
    setCurrentScheme(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      return {
        ...prev,
        items: newItems,
        updatedAt: new Date().toISOString()
      };
    });
  };

  // Add a new week row
  const handleAddWeek = () => {
    setCurrentScheme(prev => {
      const nextWeekNum = prev.items.length + 1;
      const newItem: SchemeOfWorkItem = {
        id: `scheme_item_${nextWeekNum}_${Date.now()}`,
        weekNumber: nextWeekNum,
        datesOrMonth: `Week ${nextWeekNum}`,
        mainTopicOrCompetence: 'General Topic / Competence',
        subTopicOrSpecificCompetence: 'Sub-topic details',
        learningActivitiesOrObjectives: 'Learner engages in interactive group work and practical demonstration',
        teachingActivities: 'Guide student discussion and oversee practical exercise',
        teachingMaterials: 'Textbook, charts, laboratory specimens',
        assessmentMethods: 'Oral questions, homework exercise, practical rubric',
        references: 'TIE Syllabus, Approved Ministry Textbooks',
        periodsCount: prev.periodsPerWeek || 4,
        remarks: 'Scheduled'
      };
      return {
        ...prev,
        items: [...prev.items, newItem],
        totalWeeks: nextWeekNum,
        updatedAt: new Date().toISOString()
      };
    });
    showToast('Added new week to Scheme of Work');
  };

  // Delete a week row
  const handleDeleteWeek = (index: number) => {
    if (currentScheme.items.length <= 1) {
      alert('Scheme of Work must have at least one week.');
      return;
    }
    setCurrentScheme(prev => {
      const newItems = prev.items.filter((_, i) => i !== index).map((item, idx) => ({
        ...item,
        weekNumber: idx + 1
      }));
      return {
        ...prev,
        items: newItems,
        totalWeeks: newItems.length,
        updatedAt: new Date().toISOString()
      };
    });
  };

  // Save scheme
  const handleSave = () => {
    if (onSaveSchemeOfWork) {
      onSaveSchemeOfWork(currentScheme);
    }
    showToast(`Scheme of Work & Log Book for ${currentScheme.subject} successfully saved!`);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const isCbc = currentScheme.curriculumType === 'NEW_CBC_2023';
    const headers = isCbc
      ? ['Week', 'Dates', 'Main Competence', 'Specific Competence', 'Learning Activities', 'Teaching Activities', 'Materials', 'Assessment', 'References', 'Periods', 'Remarks']
      : ['Week', 'Dates', 'Main Topic', 'Sub Topic', 'Specific Objectives', 'Teaching Activities', 'Materials', 'Assessment', 'References', 'Periods', 'Remarks'];

    const rows = currentScheme.items.map(item => [
      `Week ${item.weekNumber}`,
      `"${item.datesOrMonth.replace(/"/g, '""')}"`,
      `"${item.mainTopicOrCompetence.replace(/"/g, '""')}"`,
      `"${item.subTopicOrSpecificCompetence.replace(/"/g, '""')}"`,
      `"${item.learningActivitiesOrObjectives.replace(/"/g, '""')}"`,
      `"${item.teachingActivities.replace(/"/g, '""')}"`,
      `"${item.teachingMaterials.replace(/"/g, '""')}"`,
      `"${item.assessmentMethods.replace(/"/g, '""')}"`,
      `"${item.references.replace(/"/g, '""')}"`,
      item.periodsCount,
      `"${item.remarks.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Scheme_Of_Work_${currentScheme.subject}_${currentScheme.className}_${currentScheme.academicYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Scheme of Work CSV downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-emerald-700 text-white rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f2948] via-[#163765] to-[#1f4d8b] text-white p-6 rounded-2xl shadow-md border border-blue-900/60 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950">
                Official Tanzania Syllabus (NECTA / TIE)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Full Teacher Access • Zero Restriction
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-amber-300" />
              <span>Scheme of Work & Teaching Log Book Generator</span>
            </h2>
            <p className="text-xs text-blue-200 font-medium max-w-3xl">
              Generate standardized 12-week Azimio la Kazi and Kitabu cha Kumbukumbu za Kufundisha for both the 
              <strong> New Competence-Based Curriculum (CBC 2023)</strong> and <strong>Old Content-Based Curriculum</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition"
            >
              <Printer className="w-4 h-4 text-blue-700" />
              <span>Print / Export PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Scheme</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generator Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Automatic Scheme & Log Book Generator Parameters
            </h3>
          </div>

          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('scheme')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'scheme'
                  ? 'bg-white text-blue-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Scheme of Work (Azimio la Kazi)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logbook')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'logbook'
                  ? 'bg-white text-blue-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Teaching Log Book ({currentScheme.logBookEntries?.length || 0})</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
            >
              <optgroup label="Secondary Subjects">
                {['Physics', 'Chemistry', 'Biology', 'Basic Mathematics', 'English Language', 'Kiswahili', 'Geography', 'History', 'Civics', 'Commerce', 'Bookkeeping', 'Information and Computer Studies (ICS)', 'Agricultural Science', 'Food & Nutrition', 'Bible Knowledge', 'Elimu ya Dini ya Kiislamu (EDK)'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
              <optgroup label="Primary & Pre-Primary Subjects">
                {['Science & Technology', 'Social Studies', 'Hisabati', 'Kiswahili (Primary)', 'English (Primary)', 'Kutunza Afya na Mazingira', 'Sanaa na Michezo'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Class Level */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Class / Form</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
            >
              <optgroup label="Secondary (Form 1 - 6)">
                {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
              <optgroup label="Primary (Std 1 - 7)">
                {['Standard 1', 'Standard 2', 'Standard 3', 'Standard 4', 'Standard 5', 'Standard 6', 'Standard 7'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Stream */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Stream</label>
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
            >
              <option value="All Streams">All Streams</option>
              <option value="Stream A">Stream A</option>
              <option value="Stream B">Stream B</option>
              <option value="Stream C">Stream C</option>
              <option value="Stream D">Stream D</option>
            </select>
          </div>

          {/* Curriculum */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Curriculum Framework</label>
            <select
              value={curriculumType}
              onChange={e => setCurriculumType(e.target.value as CurriculumType)}
              className="w-full px-2.5 py-1.5 text-xs font-bold border border-blue-300 rounded-xl bg-blue-50/60 text-blue-950 focus:bg-white"
            >
              <option value="NEW_CBC_2023">New CBC 2023 (Competence Based)</option>
              <option value="OLD_CONTENT_BASED">Old Content-Based Curriculum</option>
            </select>
          </div>

          {/* Term */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Term</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-end gap-2">
            <button
              type="button"
              disabled={isGeneratingAI}
              onClick={handleAIGenerate}
              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isGeneratingAI ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAI ? 'AI Generating...' : '✨ AI Smart Generate'}</span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <span>Instant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {activeTab === 'scheme' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Document Header in Ledger style */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                  {currentScheme.subject} — {currentScheme.className} ({currentScheme.stream})
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {currentScheme.term} • Year {currentScheme.academicYear}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {currentScheme.curriculumType === 'NEW_CBC_2023' ? 'CBC 2023 Competence-Based' : 'Old Content-Based'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Teacher: <strong className="text-slate-800 font-semibold">{currentScheme.teacherName}</strong> • Periods per week: <strong className="text-slate-800">{currentScheme.periodsPerWeek}</strong> • Total Weeks: <strong className="text-slate-800">{currentScheme.items.length}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddWeek}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Week Row</span>
            </button>
          </div>

          {/* Scheme of Work Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-medium border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="p-2.5 border-r border-slate-200 w-24">Week & Dates</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[170px]">
                    {currentScheme.curriculumType === 'NEW_CBC_2023' ? 'Main Competence (Umahiri Mkuu)' : 'Main Topic (Mada Kuu)'}
                  </th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[170px]">
                    {currentScheme.curriculumType === 'NEW_CBC_2023' ? 'Specific Competence (Umahiri Mahususi)' : 'Sub-Topic (Mada Ndogo)'}
                  </th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[200px]">
                    {currentScheme.curriculumType === 'NEW_CBC_2023' ? 'Learning Activities' : 'Specific Objectives'}
                  </th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[160px]">Teaching / Learning Aids</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[150px]">Assessment Criteria</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[150px]">References</th>
                  <th className="p-2.5 border-r border-slate-200 w-14 text-center">Periods</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[140px]">Remarks / Evaluation</th>
                  <th className="p-2.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {currentScheme.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                    {/* Week / Dates */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <div className="font-semibold text-slate-800 text-[11px]">Week {item.weekNumber}</div>
                      <input
                        type="text"
                        value={item.datesOrMonth}
                        onChange={e => handleUpdateItemCell(idx, 'datesOrMonth', e.target.value)}
                        className="w-full mt-1 px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-200 rounded bg-white"
                        placeholder="Dates"
                      />
                    </td>

                    {/* Main Topic / Competence */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.mainTopicOrCompetence}
                        onChange={e => handleUpdateItemCell(idx, 'mainTopicOrCompetence', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* Sub Topic / Specific Competence */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.subTopicOrSpecificCompetence}
                        onChange={e => handleUpdateItemCell(idx, 'subTopicOrSpecificCompetence', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* Activities / Objectives */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.learningActivitiesOrObjectives}
                        onChange={e => handleUpdateItemCell(idx, 'learningActivitiesOrObjectives', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* Materials */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.teachingMaterials}
                        onChange={e => handleUpdateItemCell(idx, 'teachingMaterials', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* Assessment */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.assessmentMethods}
                        onChange={e => handleUpdateItemCell(idx, 'assessmentMethods', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* References */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.references}
                        onChange={e => handleUpdateItemCell(idx, 'references', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* Periods */}
                    <td className="p-2 border-r border-slate-200 align-top text-center">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={item.periodsCount}
                        onChange={e => handleUpdateItemCell(idx, 'periodsCount', Number(e.target.value) || 1)}
                        className="w-12 px-1 py-1 text-center font-bold text-xs border border-slate-300 rounded bg-white"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="p-2 border-r border-slate-200 align-top">
                      <textarea
                        rows={3}
                        value={item.remarks}
                        onChange={e => handleUpdateItemCell(idx, 'remarks', e.target.value)}
                        className="w-full p-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500 resize-none font-normal"
                      />
                    </td>

                    {/* Action buttons */}
                    <td className="p-2 align-top text-center space-y-1.5">
                      {onNavigateToLessonPlan && (
                        <button
                          type="button"
                          onClick={() => onNavigateToLessonPlan(currentScheme.subject, currentScheme.className, item.mainTopicOrCompetence)}
                          className="w-full px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                          title="Generate single Lesson Plan for this week's topic"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Lesson Plan</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteWeek(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition"
                        title="Delete week row"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Teaching Log Book Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Teaching Log Book (Kumbukumbu za Ufundishaji)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Continuous pedagogical record tracking taught periods, student comprehension, and remedial interventions.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {currentScheme.logBookEntries?.length || 0} Teaching Sessions Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-medium border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="p-2.5 border-r border-slate-200 w-28">Date</th>
                  <th className="p-2.5 border-r border-slate-200 w-32">Class & Period</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[200px]">Sub-Topic Taught</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[240px]">Work Covered / Student Activities</th>
                  <th className="p-2.5 border-r border-slate-200 w-28 text-center">Attendance</th>
                  <th className="p-2.5 border-r border-slate-200 w-32 text-center">Comprehension</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[180px]">Remedial / Remarks</th>
                  <th className="p-2.5 w-24 text-center">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {(currentScheme.logBookEntries || []).map((entry, eIdx) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 border-r border-slate-200 font-mono text-slate-800">
                      {entry.date}
                    </td>
                    <td className="p-2.5 border-r border-slate-200">
                      <div className="font-semibold text-slate-900">{entry.className} ({entry.stream})</div>
                      <div className="text-[10px] text-slate-500">{entry.periodTime}</div>
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-normal text-slate-800">
                      {entry.subTopicTaught}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-normal text-slate-700">
                      {entry.workCoveredSummary}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center font-mono">
                      <span className="text-emerald-700 font-bold">{entry.studentsPresent}</span>
                      <span className="text-slate-400"> / {entry.studentsTotal}</span>
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.comprehensionEvaluation === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800' :
                        entry.comprehensionEvaluation === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {entry.comprehensionEvaluation}
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-normal text-slate-600">
                      {entry.remedialOrUncoveredReason || 'All planned activities achieved.'}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                      {entry.teacherSignature}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Landscape PDF Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Controls */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">
                  Official Tanzanian Scheme of Work Document (A4 Landscape Print View)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Printable with Letterhead) */}
            <div className="p-8 overflow-y-auto space-y-6 printable-document">
              {/* Header Letterhead with HabyEduPro Official Logo */}
              <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between gap-4">
                <HabyEduProLogo size="lg" variant="full" />

                <div className="text-center flex-1">
                  <div className="text-xs uppercase tracking-widest text-slate-600 font-bold">
                    THE UNITED REPUBLIC OF TANZANIA • MINISTRY OF EDUCATION
                  </div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-0.5">
                    {schoolInfo.name || 'HABY EDU PRO ACADEMY'}
                  </h1>
                  <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mt-1">
                    SCHEME OF WORK (AZIMIO LA KAZI) • {currentScheme.academicYear}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Framework: {currentScheme.curriculumType === 'NEW_CBC_2023' ? 'Competence-Based Curriculum (CBC 2023)' : 'Traditional Content-Based Syllabus'}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                  <div><strong>Reg:</strong> {schoolInfo.schoolNumber || 'TZ-SCH-001'}</div>
                  <div><strong>Term:</strong> {currentScheme.term}</div>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
                </div>
              </div>

              {/* Administrative Details Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Subject</span>
                  <span className="font-bold text-slate-900">{currentScheme.subject}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Class & Stream</span>
                  <span className="font-bold text-slate-900">{currentScheme.className} ({currentScheme.stream})</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Subject Teacher</span>
                  <span className="font-bold text-slate-900">{currentScheme.teacherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Weekly Period Quota</span>
                  <span className="font-bold text-slate-900">{currentScheme.periodsPerWeek} Periods / Week</span>
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-left text-[10px] border-collapse border border-slate-800">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-800">
                    <th className="p-2 border border-slate-800 w-16">Week</th>
                    <th className="p-2 border border-slate-800">Main Topic / Competence</th>
                    <th className="p-2 border border-slate-800">Specific Competence / Subtopic</th>
                    <th className="p-2 border border-slate-800">Learning & Teaching Activities</th>
                    <th className="p-2 border border-slate-800">Teaching Aids</th>
                    <th className="p-2 border border-slate-800">Assessment</th>
                    <th className="p-2 border border-slate-800">References</th>
                    <th className="p-2 border border-slate-800 w-10 text-center">Pd</th>
                    <th className="p-2 border border-slate-800">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {currentScheme.items.map(item => (
                    <tr key={item.id} className="border-b border-slate-800">
                      <td className="p-2 border border-slate-800 align-top font-bold">
                        <div>Wk {item.weekNumber}</div>
                        <div className="text-[9px] text-slate-600 font-normal">{item.datesOrMonth}</div>
                      </td>
                      <td className="p-2 border border-slate-800 align-top font-semibold">{item.mainTopicOrCompetence}</td>
                      <td className="p-2 border border-slate-800 align-top">{item.subTopicOrSpecificCompetence}</td>
                      <td className="p-2 border border-slate-800 align-top">{item.learningActivitiesOrObjectives}</td>
                      <td className="p-2 border border-slate-800 align-top">{item.teachingMaterials}</td>
                      <td className="p-2 border border-slate-800 align-top">{item.assessmentMethods}</td>
                      <td className="p-2 border border-slate-800 align-top">{item.references}</td>
                      <td className="p-2 border border-slate-800 align-top text-center font-bold">{item.periodsCount}</td>
                      <td className="p-2 border border-slate-800 align-top">{item.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Official Signatures & Approval Blocks */}
              <div className="pt-6 grid grid-cols-3 gap-6 text-xs text-slate-800">
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">Subject Teacher</div>
                  <div className="text-[11px] text-slate-600 mt-1">Sign: ___________________</div>
                  <div className="text-[11px] text-slate-600">Date: ___________________</div>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">Academic Master / Mistress</div>
                  <div className="text-[11px] text-slate-600 mt-1">Sign: ___________________</div>
                  <div className="text-[11px] text-slate-600">Date: ___________________</div>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold">Headmaster / Headmistress (Official Stamp)</div>
                  <div className="text-[11px] text-slate-600 mt-1">Sign: ___________________</div>
                  <div className="text-[11px] text-slate-600">Official Stamp: [SEAL]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
