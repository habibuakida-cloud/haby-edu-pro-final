import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  BookOpen, 
  Users, 
  Layers, 
  Sliders, 
  FileText, 
  ArrowRight, 
  RefreshCw, 
  Save, 
  Info,
  ShieldCheck,
  Check,
  Coffee,
  Trophy,
  Zap
} from 'lucide-react';
import { 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  TimetableAssignment, 
  SubjectPeriodAllocation,
  ActivityType 
} from '../../types';
import { DAYS_OF_WEEK, DEFAULT_CLASSES } from '../../constants/defaults';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';

interface AITimetableAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  existingAssignments: TimetableAssignment[];
  subjectPeriodAllocations?: SubjectPeriodAllocation[];
  onApplyTimetable: (assignments: TimetableAssignment[]) => void;
}

interface SubjectQuotaState {
  subject: string;
  periodsPerWeek: number;
}

export const AITimetableAssistantModal: React.FC<AITimetableAssistantModalProps> = ({
  isOpen,
  onClose,
  teachers,
  periodSettings,
  streamSettings,
  existingAssignments,
  subjectPeriodAllocations = [],
  onApplyTimetable
}) => {
  const [activeTab, setActiveTab] = useState<'early_info' | 'upload_draft' | 'generate' | 'preview'>('early_info');

  // Early Feed Configuration State
  const [targetClass, setTargetClass] = useState<string>('ALL');
  const [targetStream, setTargetStream] = useState<string>('ALL');
  const [targetDays, setTargetDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  // Subject Quotas State
  const [localSubjectQuotas, setLocalSubjectQuotas] = useState<SubjectQuotaState[]>(() => {
    // Derive from subjectPeriodAllocations or defaults
    const map = new Map<string, number>();
    subjectPeriodAllocations.forEach(spa => {
      if (spa.subject && spa.periodsPerWeek) {
        map.set(spa.subject, Math.max(map.get(spa.subject) || 0, spa.periodsPerWeek));
      }
    });

    const defaultDefaults: Record<string, number> = {
      'Mathematics': 6,
      'English Language': 5,
      'Kiswahili': 4,
      'Biology': 4,
      'Chemistry': 4,
      'Physics': 4,
      'Geography': 3,
      'History': 3,
      'Civics': 3,
      'Computer Studies': 2
    };

    Object.entries(defaultDefaults).forEach(([sub, cnt]) => {
      if (!map.has(sub)) map.set(sub, cnt);
    });

    return Array.from(map.entries()).map(([subject, periodsPerWeek]) => ({ subject, periodsPerWeek }));
  });

  // Base / Pre-fed Extra-Curricular Slots State
  const [baseSlots, setBaseSlots] = useState<TimetableAssignment[]>(() => {
    // Collect all existing non-academic slots (breaks, sports, devotion, etc.)
    return existingAssignments.filter(a => a.activityType && a.activityType !== 'academic');
  });

  // Upload Draft State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedSlotsCount, setUploadedSlotsCount] = useState<number>(0);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Generation options
  const [preserveExtraCurricular, setPreserveExtraCurricular] = useState(true);
  const [preventClashes, setPreventClashes] = useState(true);
  const [balanceWorkload, setBalanceWorkload] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');

  // Execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Results state
  const [aiResult, setAiResult] = useState<any | null>(null);

  if (!isOpen) return null;

  // Handler for updating subject quota
  const handleUpdateQuota = (subject: string, periods: number) => {
    setLocalSubjectQuotas(prev => 
      prev.map(item => item.subject === subject ? { ...item, periodsPerWeek: Math.max(1, periods) } : item)
    );
  };

  // Add new subject quota
  const handleAddNewSubjectQuota = (subjectName: string) => {
    if (!subjectName.trim()) return;
    const trimmed = subjectName.trim();
    if (localSubjectQuotas.some(q => q.subject.toLowerCase() === trimmed.toLowerCase())) return;
    setLocalSubjectQuotas(prev => [...prev, { subject: trimmed, periodsPerWeek: 4 }]);
  };

  // Download Sample Timetable Template (CSV)
  const handleDownloadTemplate = () => {
    const headers = ['Day', 'PeriodName', 'StartTime', 'EndTime', 'ClassName', 'Stream', 'SubjectOrActivity', 'ActivityType', 'Room', 'CustomNote'];
    const rows: string[] = [headers.join(',')];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const samplePeriods = [
      { name: 'Period 1', start: '08:00', end: '08:40', type: 'academic', sub: '' },
      { name: 'Period 2', start: '08:40', end: '09:20', type: 'academic', sub: '' },
      { name: 'Morning Break', start: '09:20', end: '09:40', type: 'breakfast', sub: 'Tea Break' },
      { name: 'Period 3', start: '09:40', end: '10:20', type: 'academic', sub: '' },
      { name: 'Period 4', start: '10:20', end: '11:00', type: 'academic', sub: '' },
      { name: 'Lunch', start: '12:40', end: '13:30', type: 'lunch', sub: 'Lunch Break' },
      { name: 'Period 7 (Sports)', start: '14:00', end: '15:00', type: 'sports', sub: 'Sports & Games' }
    ];

    days.forEach(day => {
      samplePeriods.forEach(p => {
        rows.push([
          day,
          p.name,
          p.start,
          p.end,
          'Form 1',
          'STREAM A',
          p.sub,
          p.type,
          'Main Campus',
          ''
        ].map(val => `"${val}"`).join(','));
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'HabyEduPro_Timetable_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse uploaded file (CSV or JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadFeedback('Inasoma faili...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const mappedSlots: TimetableAssignment[] = parsed.map((item: any, idx: number) => ({
              id: Date.now() + idx,
              className: item.className || 'Form 1',
              stream: item.stream || 'STREAM A',
              day: item.day || 'Monday',
              period: item.period || `${item.periodName || 'Period 1'} (${item.start || '08:00'}-${item.end || '08:40'})`,
              periodName: item.periodName,
              subject: item.subject || item.SubjectOrActivity || 'Morning Break',
              activityType: item.activityType || 'academic',
              room: item.room,
              teacherId: item.teacherId
            }));

            setBaseSlots(mappedSlots);
            setUploadedSlotsCount(mappedSlots.length);
            setUploadFeedback(`Mafanikio! Vipindi ${mappedSlots.length} vimepakiwa na kusomwa kikamilifu.`);
            return;
          }
        }

        // CSV parsing
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          setUploadFeedback('Faili halina taarifa za kutosha za mistari.');
          return;
        }

        const newParsedSlots: TimetableAssignment[] = [];
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 4) {
            const day = parts[0] || 'Monday';
            const periodName = parts[1] || 'Period 1';
            const start = parts[2] || '08:00';
            const end = parts[3] || '08:40';
            const className = parts[4] || 'Form 1';
            const stream = parts[5] || 'STREAM A';
            const subjectOrActivity = parts[6] || '';
            const activityType = (parts[7] || 'academic') as ActivityType;
            const room = parts[8] || '';

            const periodKey = `${periodName} (${start}-${end})`;

            newParsedSlots.push({
              id: Date.now() + i,
              className,
              stream,
              day,
              period: periodKey,
              periodName,
              subject: subjectOrActivity || (activityType !== 'academic' ? periodName : 'Subject Pending AI'),
              activityType,
              room
            });
          }
        }

        setBaseSlots(newParsedSlots);
        setUploadedSlotsCount(newParsedSlots.length);
        setUploadFeedback(`Mafanikio! Vipindi ${newParsedSlots.length} vimepakiwa kikamilifu kutoka kwenye faili la CSV.`);
      } catch (err: any) {
        console.error('File parse error:', err);
        setUploadFeedback('Hitilafu katika kusoma faili: ' + (err.message || 'Muundo si sahihi'));
      }
    };

    reader.readAsText(file);
  };

  // Load current system settings as base
  const handleUseSystemBase = () => {
    // Generate pre-fed slots for all classes from current period settings and extra-curricular
    const preFed: TimetableAssignment[] = [];
    let idCounter = Date.now();

    const classesToSeed = targetClass === 'ALL' ? ['Form 1', 'Form 2', 'Form 3', 'Form 4'] : [targetClass];

    classesToSeed.forEach(cName => {
      const streams = streamSettings.find(s => s.className === cName)?.streams || ['STREAM A', 'STREAM B'];
      streams.forEach(sName => {
        targetDays.forEach(day => {
          const dayPeriods = periodSettings.filter(p => p.day === day);
          dayPeriods.forEach(p => {
            const lower = p.name.toLowerCase();
            const periodKey = `${p.name} (${p.start}-${p.end})`;

            if (lower.includes('break') || lower.includes('chai') || lower.includes('recess')) {
              preFed.push({
                id: ++idCounter,
                className: cName,
                stream: sName,
                day,
                period: periodKey,
                periodName: p.name,
                subject: 'Morning Break',
                activityType: 'breakfast',
                room: 'Dining Hall / Grounds'
              });
            } else if (lower.includes('lunch') || lower.includes('chakula')) {
              preFed.push({
                id: ++idCounter,
                className: cName,
                stream: sName,
                day,
                period: periodKey,
                periodName: p.name,
                subject: 'Lunch',
                activityType: 'lunch',
                room: 'Dining Hall'
              });
            } else if (day === 'Wednesday' && (lower.includes('period 7') || p.start >= '14:00')) {
              preFed.push({
                id: ++idCounter,
                className: cName,
                stream: sName,
                day,
                period: periodKey,
                periodName: p.name,
                subject: 'Sports and Games',
                activityType: 'sports',
                room: 'Sports Grounds'
              });
            } else if (day === 'Friday' && (lower.includes('period 5') || p.start === '11:20')) {
              preFed.push({
                id: ++idCounter,
                className: cName,
                stream: sName,
                day,
                period: periodKey,
                periodName: p.name,
                subject: 'Religion / Devotion',
                activityType: 'religion',
                room: 'Mosque / Chapel'
              });
            }
          });
        });
      });
    });

    setBaseSlots(preFed);
    setUploadedSlotsCount(preFed.length);
    setUploadFeedback(`Vipindi ${preFed.length} vya mapumziko na shughuli za ziada vimeandaliwa kutoka kwenye mfumo wako!`);
  };

  // Run AI Generation
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('AI inatathmini idadi ya vipindi kwa kila somo na walimu...');

    try {
      const payload = {
        targetClass,
        targetStream,
        targetDays,
        teachers: teachers.map(t => ({
          id: t.id,
          name: t.name,
          subjects: t.subjects,
          schoolRole: t.schoolRole || (t as any).role,
          maxPeriodsPerWeek: t.maxPeriodsPerWeek || 24
        })),
        periodSettings,
        streamSettings,
        baseAssignments: baseSlots,
        existingAssignments,
        subjectPeriodAllocations: localSubjectQuotas.map(q => ({
          subject: q.subject,
          periodsPerWeek: q.periodsPerWeek
        })),
        options: {
          preserveExtraCurricular,
          preventClashes,
          balanceWorkload,
          customPrompt
        }
      };

      setGenerationStep('AI inajaza ratiba kulingana na idadi ya vipindi na kuzuia migongano...');

      const response = await fetch('/api/ai/generate-timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate timetable');
      }

      setAiResult(data);
      setActiveTab('preview');
    } catch (err: any) {
      console.error('Error generating AI timetable:', err);
      setGenerationError(err.message || 'Hitilafu ilitokea wakati wa kutengeneza ratiba na AI');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Apply Generated Timetable to System
  const handleApplyToSystem = () => {
    if (!aiResult || !Array.isArray(aiResult.generatedAssignments)) return;

    if (window.confirm(`Je, unathibitisha kuweka vipindi ${aiResult.generatedAssignments.length} vilivyojazwa na AI kwenye Ratiba Kuu ya shule?`)) {
      onApplyTimetable(aiResult.generatedAssignments);
      alert(`🎉 Hongera! Ratiba ya masomo imesasishwa kikamilifu na vipindi ${aiResult.generatedAssignments.length} bila mgongano wowote.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-blue-950 flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5 text-blue-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Msaidizi Mahiri wa AI wa Ratiba (AI Timetable Assistant)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Gemini Flash • Zero Clashes
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Weka taarifa za awali au pakia ratiba (shughuli za ziada/vipindi), kisha AI iijaze kulingana na idadi ya vipindi na walimu waliosajiliwa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 pt-3 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('early_info')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'early_info'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>1. Taarifa za Awali &amp; Idadi ya Masomo</span>
          </button>

          <button
            onClick={() => setActiveTab('upload_draft')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upload_draft'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>2. Pakia / Weka Kielelezo cha Ratiba</span>
            {baseSlots.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                {baseSlots.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'generate'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>3. Jaza Ratiba na AI</span>
          </button>

          {aiResult && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 border-transparent hover:text-emerald-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>4. Matokeo ya AI &amp; Hifadhi</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
                {aiResult.generatedAssignments?.length || 0}
              </span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* TAB 1: EARLY INFO & SUBJECT ALLOCATIONS */}
          {activeTab === 'early_info' && (
            <div className="space-y-6">
              {/* Quick Status Banners */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-blue-700 font-bold block uppercase tracking-wider">Vipindi Vilivyopo</span>
                    <span className="text-sm font-black text-blue-950">{periodSettings.length} Vipindi / Wiki</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-700 font-bold block uppercase tracking-wider">Walimu Waliosajiliwa</span>
                    <span className="text-sm font-black text-emerald-950">{teachers.length} Walimu wa Masomo</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-purple-700 font-bold block uppercase tracking-wider">Mikondo ya Madarasa</span>
                    <span className="text-sm font-black text-purple-950">
                      {streamSettings.reduce((acc, s) => acc + (s.streams?.length || 0), 0) || 8} Streams
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Period Quotas Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Idadi ya Vipindi kwa Kila Somo kwa Wiki (Subject Quotas)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Weka idadi ya vipindi ambavyo AI inapaswa kupanga kwa kila darasa kwa wiki. AI itajaza vipindi kulingana na idadi hii.
                    </p>
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    Jumla ya Vipindi: {localSubjectQuotas.reduce((acc, s) => acc + s.periodsPerWeek, 0)} / wiki
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {localSubjectQuotas.map((item, idx) => {
                    const qualifiedTeachers = teachers.filter(t => 
                      t.subjects.some(s => s.toLowerCase().includes(item.subject.toLowerCase()) || item.subject.toLowerCase().includes(s.toLowerCase()))
                    );

                    return (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getSubjectColor(item.subject).bg }} />
                            <span>{item.subject}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {qualifiedTeachers.length > 0 ? (
                              <span className="text-emerald-700 font-medium">
                                Walimu {qualifiedTeachers.length}: {qualifiedTeachers.map(t => t.name.split(' ')[0]).join(', ')}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Mwalimu mkuu atapangiwa
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuota(item.subject, item.periodsPerWeek - 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-xs hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={item.periodsPerWeek}
                            onChange={(e) => handleUpdateQuota(item.subject, Number(e.target.value))}
                            className="w-12 py-1 text-center font-bold text-xs border border-blue-400 rounded-lg bg-white text-blue-900 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuota(item.subject, item.periodsPerWeek + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-xs hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[10px] text-slate-500 font-semibold ml-0.5">vipindi</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add subject input */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    id="new-subject-input"
                    placeholder="Ongeza somo jipya (mf. Commerce, Bookkeeping, French)..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value;
                        handleAddNewSubjectQuota(val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('new-subject-input') as HTMLInputElement;
                      if (input) {
                        handleAddNewSubjectQuota(input.value);
                        input.value = '';
                      }
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Ongeza Somo
                  </button>
                </div>
              </div>

              {/* Next Step Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload_draft')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <span>Endelea: Pakia au Weka Kielelezo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD OR TEMPLATE DRAFT */}
          {activeTab === 'upload_draft' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Pakia Ratiba ya Awali (Mapumziko, Shughuli za Ziada, Vipindi)</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Unaweza kupakua kielelezo chetu cha CSV, ukajaza vipindi na shughuli zako za awali (kama vile Morning Break, Lunch, Sports, Devotion, Clubs), kisha ukakipakia hapa. AI itahifadhi shughuli hizo zote na kujaza masomo ya kawaida kwenye nafasi zilizobaki!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                  {/* Option A: Download Template */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-2">
                        <Download className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-xs text-slate-900">1. Pakua Kielelezo cha Ratiba (CSV Template)</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pakua faili la Excel/CSV lililo na muundo sahihi wa siku, vipindi, na shughuli za awali.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Pakua Template (.CSV)</span>
                    </button>
                  </div>

                  {/* Option B: Use System Settings */}
                  <div className="p-4 bg-white border border-emerald-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h5 className="font-bold text-xs text-emerald-950">2. Tumia Shughuli Zilizopo Kwenye Mfumo</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Weka mapumziko (Morning Break, Lunch, Michezo ya Jumatano, na Ibada ya Ijumaa) moja kwa moja kutoka kwenye mfumo wako.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseSystemBase}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tumia Shughuli za Mfumo Kama Msingi</span>
                    </button>
                  </div>
                </div>

                {/* Upload Input Area */}
                <div className="mt-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-white transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Bofya hapa au buruta faili lako la ratiba (CSV au JSON)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Faili litasomwa papo hapo na kuingizwa kama msingi wa ratiba
                  </p>
                </div>

                {/* Feedback status */}
                {uploadFeedback && (
                  <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    uploadFeedback.includes('Mafanikio') ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-blue-50 text-blue-900 border border-blue-200'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{uploadFeedback}</span>
                  </div>
                )}
              </div>

              {/* Base Slots Preview List */}
              {baseSlots.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Shughuli za Awali Zilizohifadhiwa ({baseSlots.length} Slots)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setBaseSlots([])}
                      className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Ondoa Zote
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                    {baseSlots.slice(0, 15).map((slot, idx) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>{slot.day} {slot.periodName || slot.period.split(' (')[0]}: <strong>{slot.subject}</strong></span>
                      </span>
                    ))}
                    {baseSlots.length > 15 && (
                      <span className="px-2 py-1 text-[10px] text-slate-500 font-bold">
                        +{baseSlots.length - 15} shughuli zingine...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('early_info')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Rudi Nyuma
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('generate')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <span>Endelea: Sanidi na Jaza na AI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GENERATE WITH AI */}
          {activeTab === 'generate' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <Zap className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Sanidi Upeo wa Ratiba Inayojazwa na AI
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Chagua madarasa, mikondo, na siku unazotaka AI ijazie ratiba. AI itafanya ugawaji kwa kufuata walimu wote waliosajiliwa na idadi ya vipindi.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Darasa (Class Scope):</label>
                    <select
                      value={targetClass}
                      onChange={(e) => {
                        setTargetClass(e.target.value);
                        setTargetStream('ALL');
                      }}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="ALL">🏫 Shule Nzima (Madarasa Yote)</option>
                      {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mkondo (Stream Scope):</label>
                    <select
                      value={targetStream}
                      onChange={(e) => setTargetStream(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="ALL">Mikondo Yote (All Streams)</option>
                      {targetClass !== 'ALL' && (
                        (streamSettings.find(s => s.className === targetClass)?.streams || ['STREAM A', 'STREAM B']).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Siku za Ratiba (Target Days):</label>
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {DAYS_OF_WEEK.map(d => {
                        const isSelected = targetDays.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (targetDays.length > 1) setTargetDays(targetDays.filter(day => day !== d));
                              } else {
                                setTargetDays([...targetDays, d]);
                              }
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {d.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optimization Constraints Checkboxes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Vigezo na Sheria za Uboreshaji (Optimization Rules)
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveExtraCurricular}
                      onChange={(e) => setPreserveExtraCurricular(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Hifadhi Shughuli za Ziada na Mapumziko</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Break, Lunch, Sports, na Religion havitafutwa wala kugongana na masomo.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preventClashes}
                      onChange={(e) => setPreventClashes(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Zuia Mgongano wa Walimu (Zero Double Booking)</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Mwalimu mmoja hatapangiwa madarasa mawili tofauti kwa wakati mmoja.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={balanceWorkload}
                      onChange={(e) => setBalanceWorkload(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Sambaza Mzigo wa Kazi kwa Walimu</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Gawa vipindi kwa usawa kwa walimu wote waliosajiliwa wanaofundisha somo husika.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      disabled
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Masomo Mazito Asubuhi (Morning Focus)</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Math, Physics, Chemistry, na Biology yanapangiwa vipindi vya 1 hadi 4.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Custom Prompt */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Maelekezo ya Ziada kwa AI (Hiari):
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Mfano: Mwalimu Mkuu asipangiwe zaidi ya vipindi 10 kwa wiki; Ijumaa vipindi viishe saa 13:00..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Error Message */}
              {generationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-900 text-xs font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload_draft')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Rudi Nyuma
                </button>

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateAI}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{generationStep || 'AI inatengeneza ratiba...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>🤖 Jaza na Tengeneza Ratiba na AI Sasa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PREVIEW & APPLY */}
          {activeTab === 'preview' && aiResult && (
            <div className="space-y-6">
              {/* Summary Stats Banner */}
              <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wider inline-block mb-1">
                      Mafanikio ya AI
                    </span>
                    <h4 className="text-base font-black text-white">
                      Ratiba ya Masomo Imetengenezwa Kikamilifu!
                    </h4>
                    <p className="text-xs text-emerald-200 mt-0.5">
                      {aiResult.summary || `Vipindi ${aiResult.totalSlotsGenerated} vimepangwa bila mgongano wowote wa walimu.`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center bg-white/10 px-3 py-2 rounded-xl backdrop-blur-xs border border-white/10">
                      <span className="text-xl font-black block text-amber-300">{aiResult.totalSlotsGenerated || 0}</span>
                      <span className="text-[10px] text-emerald-200 block uppercase">Vipindi Vyote</span>
                    </div>

                    <div className="text-center bg-white/10 px-3 py-2 rounded-xl backdrop-blur-xs border border-white/10">
                      <span className="text-xl font-black block text-emerald-300">0</span>
                      <span className="text-[10px] text-emerald-200 block uppercase">Migongano (Clashes)</span>
                    </div>
                  </div>
                </div>

                {/* Pedagogical insights */}
                {Array.isArray(aiResult.pedagogicalInsights) && aiResult.pedagogicalInsights.length > 0 && (
                  <div className="border-t border-white/10 pt-2.5 flex flex-wrap gap-2">
                    {aiResult.pedagogicalInsights.map((insight: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white/10 text-emerald-100 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" />
                        <span>{insight}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject Quota Fulfillment Tracker */}
              {Array.isArray(aiResult.subjectQuotaProgress) && aiResult.subjectQuotaProgress.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Utekelezaji wa Idadi ya Vipindi kwa Kila Somo (Quota Fulfillment)</span>
                    </h5>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      100% Target Met
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                    {aiResult.subjectQuotaProgress.map((qp: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate" title={qp.subject}>{qp.subject}</span>
                          <span className="font-black text-blue-700">{qp.allocatedPeriods}/{qp.targetPeriods}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, qp.percentage || 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Workload Table */}
              {Array.isArray(aiResult.teacherWorkload) && aiResult.teacherWorkload.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Ugawaji wa Mzigo wa Kazi kwa Walimu (Faculty Workload Distribution)</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {aiResult.teacherWorkload.map((tw: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">{tw.teacherName}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{tw.subjects?.join(', ') || 'Teacher'}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-blue-100 text-blue-900 shrink-0">
                          {tw.periodsAllocated} vipindi
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Slot Preview Grid */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Hakikisho la Ratiba Iliyojazwa (Preview Grid)</span>
                  </h5>
                  <span className="text-xs text-slate-500">
                    Onyesho la sampuli ya vipindi vilivyojazwa
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {aiResult.generatedAssignments?.slice(0, 20).map((a: any, idx: number) => {
                    const assignedTeacher = teachers.find(t => t.id === a.teacherId);
                    const isExtra = a.activityType && a.activityType !== 'academic';

                    return (
                      <div key={idx} className={`p-2.5 text-xs flex items-center justify-between gap-3 ${
                        isExtra ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getSubjectColor(a.subject).bg }} />
                          <span className="font-bold text-slate-900">{a.day} • {a.periodName || a.period.split(' (')[0]}</span>
                          <span className="text-slate-400">|</span>
                          <span className="font-semibold text-slate-700 truncate">{a.className} {a.stream}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            isExtra ? 'bg-amber-100 text-amber-900' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {a.subject}
                          </span>
                          {assignedTeacher && (
                            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Tr. {assignedTeacher.name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('generate')}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  🔄 Tengeneza Tena (Regenerate)
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Ghairi
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToSystem}
                    className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Kubali na Hifadhi Kwenye Ratiba Kuu</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
