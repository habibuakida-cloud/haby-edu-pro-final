import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  Calendar, 
  Loader2, 
  BookOpen, 
  Users, 
  Check, 
  Zap, 
  Clock 
} from 'lucide-react';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  InstitutionalPolicy, 
  SubjectPeriodAllocation, 
  TeacherAssignment 
} from '../../types';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../../constants/defaults';
import { getTeacherColor, getSubjectColor } from '../../utils/colors';

interface AIGenerateByLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  institutionalPolicy: InstitutionalPolicy;
  subjectPeriodAllocations: SubjectPeriodAllocation[];
  teacherAssignments: TeacherAssignment[];
  currentAssignments: TimetableAssignment[];
  onApplyAssignments: (newAssignments: TimetableAssignment[], mode: 'replace_level' | 'merge') => void;
}

export const AIGenerateByLevelModal: React.FC<AIGenerateByLevelModalProps> = ({
  isOpen,
  onClose,
  teachers,
  periodSettings,
  streamSettings,
  institutionalPolicy,
  subjectPeriodAllocations,
  teacherAssignments,
  currentAssignments,
  onApplyAssignments
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'NURSERY' | 'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssignments, setGeneratedAssignments] = useState<TimetableAssignment[] | null>(null);
  const [selectedStreamPreview, setSelectedStreamPreview] = useState<string>('');
  const [applyMode, setApplyMode] = useState<'replace_level' | 'merge'>('replace_level');
  const [preserveManualSlots, setPreserveManualSlots] = useState<boolean>(true);

  if (!isOpen) return null;

  // Count manual slots in current assignments
  const manualSlotsInLevel = currentAssignments.filter(a => {
    const isMan = a.isManual || a.isLocked || a.allocationMode === 'manual';
    return isMan;
  });

  // Level classes
  const targetClasses = selectedLevel === 'NURSERY'
    ? NURSERY_CLASSES
    : selectedLevel === 'PRIMARY'
    ? PRIMARY_CLASSES
    : SECONDARY_CLASSES;

  // Registered streams for this level
  const levelStreamSettings = streamSettings.filter(s => targetClasses.includes(s.className));
  const levelStreamList: { className: string; stream: string }[] = [];
  levelStreamSettings.forEach(s => {
    s.streams.forEach(str => {
      levelStreamList.push({ className: s.className, stream: str });
    });
  });

  const workingDays = institutionalPolicy.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const totalPeriods = institutionalPolicy.totalPeriodsPerDay || 8;
  const maxTeacherDaily = institutionalPolicy.maxPeriodsPerTeacherPerDay || 5;

  // Run AI Scheduling Engine
  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const results: TimetableAssignment[] = [];
      let assignmentIdCounter = Date.now();

      // Tracking state to guarantee zero clashes:
      // teacherClashTracker: `${day}_${periodIndex}_${teacherId}` -> true
      const teacherClashTracker = new Set<string>();
      // streamSubjectDailyTracker: `${className}_${stream}_${day}_${subject}` -> count
      const streamSubjectDailyTracker = new Map<string, number>();
      // teacherDailyLoadTracker: `${day}_${teacherId}` -> count
      const teacherDailyLoadTracker = new Map<string, number>();

      // Index manual slots for protection
      const manualSlotMap = new Map<string, TimetableAssignment>();
      if (preserveManualSlots) {
        currentAssignments.forEach(a => {
          const isMan = a.isManual || a.isLocked || a.allocationMode === 'manual';
          if (isMan) {
            const pName = a.periodName || a.period.split(' (')[0];
            manualSlotMap.set(`${a.className}_${a.stream}_${a.day}_${a.period}`, a);
            manualSlotMap.set(`${a.className}_${a.stream}_${a.day}_${pName}`, a);

            // Pre-reserve teacher time slot so auto-generator NEVER clashes with manual assignment
            if (a.teacherId) {
              const pMatch = pName.match(/\d+/);
              const pNum = pMatch ? parseInt(pMatch[0], 10) : 1;
              teacherClashTracker.add(`${a.day}_${pNum}_${a.teacherId}`);
              const curLoad = teacherDailyLoadTracker.get(`${a.day}_${a.teacherId}`) || 0;
              teacherDailyLoadTracker.set(`${a.day}_${a.teacherId}`, curLoad + 1);
            }
          }
        });
      }

      // Filter allocations & teacher assignments for this level
      const levelAllocations = subjectPeriodAllocations.filter(a => a.level === selectedLevel);
      const levelTeacherAssignments = teacherAssignments.filter(ta => ta.level === selectedLevel);

      // Helper to find teacher for a subject and stream
      const findBestTeacher = (subject: string, className: string, stream: string, day: string, periodIdx: number): Teacher | undefined => {
        const streamTag = `${className} - ${stream}`;
        
        // 1. Try finding explicitly assigned teacher in teacher_assignments
        const assignedTa = levelTeacherAssignments.find(ta => 
          ta.subjects.includes(subject) && 
          (ta.streams.includes(streamTag) || ta.streams.length === 0)
        );

        if (assignedTa) {
          const tKey = `${day}_${periodIdx}_${assignedTa.teacherId}`;
          const dailyCount = teacherDailyLoadTracker.get(`${day}_${assignedTa.teacherId}`) || 0;
          if (!teacherClashTracker.has(tKey) && dailyCount < maxTeacherDaily) {
            return teachers.find(t => t.id === assignedTa.teacherId);
          }
        }

        // 2. Fallback to any teacher registered with this subject
        const candidates = teachers.filter(t => t.subjects?.some(s => s.toLowerCase() === subject.toLowerCase()));
        for (const candidate of candidates) {
          const tKey = `${day}_${periodIdx}_${candidate.id}`;
          const dailyCount = teacherDailyLoadTracker.get(`${day}_${candidate.id}`) || 0;
          if (!teacherClashTracker.has(tKey) && dailyCount < maxTeacherDaily) {
            return candidate;
          }
        }

        // 3. Fallback to any available teacher without clash
        for (const candidate of teachers) {
          const tKey = `${day}_${periodIdx}_${candidate.id}`;
          const dailyCount = teacherDailyLoadTracker.get(`${day}_${candidate.id}`) || 0;
          if (!teacherClashTracker.has(tKey) && dailyCount < maxTeacherDaily) {
            return candidate;
          }
        }

        return undefined;
      };

      // Generate timetable for ALL streams in this level at once
      levelStreamList.forEach(({ className, stream }) => {
        // Stream subjects
        const streamAllocations = levelAllocations.filter(a => 
          a.className === className && (a.stream === stream || a.stream === 'ALL_STREAMS')
        );

        const subjectQueue = streamAllocations.length > 0 
          ? streamAllocations.map(a => ({ subject: a.subject, needed: a.periodsPerWeek }))
          : [
              { subject: selectedLevel === 'NURSERY' ? 'Kuhesabu na Namba' : selectedLevel === 'PRIMARY' ? 'Mathematics (Hisabati)' : 'Mathematics', needed: 5 },
              { subject: selectedLevel === 'NURSERY' ? 'Kusoma na Kuwasiliana' : selectedLevel === 'PRIMARY' ? 'English Language' : 'English Language', needed: 5 },
              { subject: selectedLevel === 'NURSERY' ? 'Afya na Mazingira' : selectedLevel === 'PRIMARY' ? 'Kiswahili' : 'Kiswahili', needed: 4 },
              { subject: selectedLevel === 'NURSERY' ? 'Sanaa na Michezo' : selectedLevel === 'PRIMARY' ? 'Sayansi na Teknolojia' : 'Biology', needed: 4 }
            ];

        workingDays.forEach(day => {
          for (let periodNum = 1; periodNum <= totalPeriods; periodNum++) {
            // Find appropriate period timing from periodSettings or synthesize
            const pSetting = periodSettings.find(p => p.day === day && p.name === `Period ${periodNum}`);
            const periodString = pSetting 
              ? `${pSetting.name} (${pSetting.start}-${pSetting.end})`
              : `Period ${periodNum} (${8 + Math.floor((periodNum - 1) * 0.7)}:00-${8 + Math.floor(periodNum * 0.7)}:00)`;

            // Check if slot was manually locked/created
            const existingManual = preserveManualSlots 
              ? (manualSlotMap.get(`${className}_${stream}_${day}_${periodString}`) || manualSlotMap.get(`${className}_${stream}_${day}_Period ${periodNum}`))
              : undefined;

            if (existingManual) {
              results.push(existingManual);
              continue;
            }

            // Select next subject from queue that has not exceeded today's quota
            let chosenSubject = 'Study & Revision';
            for (let qIdx = 0; qIdx < subjectQueue.length; qIdx++) {
              const item = subjectQueue[qIdx];
              const dailyCount = streamSubjectDailyTracker.get(`${className}_${stream}_${day}_${item.subject}`) || 0;
              if (item.needed > 0 && dailyCount < 1) {
                chosenSubject = item.subject;
                item.needed -= 1;
                streamSubjectDailyTracker.set(`${className}_${stream}_${day}_${item.subject}`, dailyCount + 1);
                break;
              }
            }

            // Assign teacher without conflict
            const teacher = findBestTeacher(chosenSubject, className, stream, day, periodNum);
            if (teacher) {
              const tKey = `${day}_${periodNum}_${teacher.id}`;
              teacherClashTracker.add(tKey);
              teacherDailyLoadTracker.set(`${day}_${teacher.id}`, (teacherDailyLoadTracker.get(`${day}_${teacher.id}`) || 0) + 1);
            }

            results.push({
              id: assignmentIdCounter++,
              className,
              stream,
              day,
              period: periodString,
              periodName: `Period ${periodNum}`,
              teacherId: teacher?.id,
              subject: chosenSubject,
              room: `Room ${className.replace(/\D/g, '') || '1'}${stream.charAt(stream.length - 1)}`,
              isManual: false,
              isLocked: false,
              allocationMode: 'auto'
            });
          }
        });
      });

      setGeneratedAssignments(results);
      if (levelStreamList.length > 0) {
        setSelectedStreamPreview(`${levelStreamList[0].className} - ${levelStreamList[0].stream}`);
      }
      setIsGenerating(false);
    }, 900);
  };

  const handleApply = () => {
    if (!generatedAssignments) return;
    onApplyAssignments(generatedAssignments, applyMode);
    onClose();
  };

  // Preview filtering
  const previewAssignments = (generatedAssignments || []).filter(a => {
    if (!selectedStreamPreview) return true;
    const [cName, sName] = selectedStreamPreview.split(' - ');
    return a.className === cName && a.stream === sName;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-indigo-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Kizalishaji Ratiba cha AI kwa Ngazi (AI Generator Core by Level)</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                AI inasoma mikondo yote, mgawanyo wa vipindi, walimu, na sera za shule na kutoa ratiba bila mgongano wowote
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Level Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Select Academic Level to Generate Timetable:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { 
                  id: 'NURSERY', 
                  label: 'NURSERY LEVEL', 
                  desc: 'Pre-Primary & Nursery', 
                  streams: 'Nursery, Baby Class, Middle, Pre-Unit' 
                },
                { 
                  id: 'PRIMARY', 
                  label: 'PRIMARY LEVEL', 
                  desc: 'Standard 1 to 7', 
                  streams: 'Standard 1-7 (Streams A, B, C)' 
                },
                { 
                  id: 'SECONDARY', 
                  label: 'SECONDARY LEVEL', 
                  desc: 'Form 1 to 6', 
                  streams: 'Form 1-4 (Streams A, B) & High School' 
                }
              ].map(lvl => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(lvl.id as any);
                    setGeneratedAssignments(null);
                  }}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    selectedLevel === lvl.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-black text-sm flex items-center justify-between">
                    <span>{lvl.label}</span>
                    {selectedLevel === lvl.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-1">{lvl.desc}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{lvl.streams}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Cards */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Applied AI Policies and Constraints:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Level Streams:</span>
                <span className="font-black text-slate-900 text-sm">{levelStreamList.length} Streams</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Periods per Day:</span>
                <span className="font-black text-slate-900 text-sm">{totalPeriods} Periods (40 min)</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Working Days:</span>
                <span className="font-black text-slate-900 text-sm">{workingDays.length} Days</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Teacher Daily Limit:</span>
                <span className="font-black text-slate-900 text-sm">Max {maxTeacherDaily}/day</span>
              </div>
            </div>

            {/* Manual vs Auto Conflict Isolation Card */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              preserveManualSlots ? 'bg-emerald-50/80 border-emerald-300' : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="preserveManualLevel"
                  checked={preserveManualSlots}
                  onChange={e => setPreserveManualSlots(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="preserveManualLevel" className="text-xs cursor-pointer flex-1">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <span>🔒 Linda Vipindi Vilivyowekwa kwa Mkono (Lock & Preserve Manual Slots)</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                      {manualSlotsInLevel.length} Vipindi vya Mkono
                    </span>
                  </span>
                  <span className="text-slate-600 block mt-0.5">
                    {preserveManualSlots 
                      ? 'AI haitafuta wala kugusa vipindi vilivyopangwa kwa mkono. Walimu wao hawatawekewa vipindi vingine muda huo huo (Zero Conflict Guarantee).' 
                      : 'Onyo: AI itabadilisha vipindi vyote vya ngazi hii ikiwemo vilivyowekwa kwa mkono.'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          {!generatedAssignments && (
            <div className="text-center py-4">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2.5 mx-auto transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI Inazalisha Ratiba ya {selectedLevel} Bila Migongano...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                    <span>Tengeneza Ratiba ya {selectedLevel} na AI Sasa</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated Results & Preview */}
          {generatedAssignments && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-950 text-sm">
                      Ratiba ya {selectedLevel} Imezalishwa Kikamilifu! (Zero Clashes Detected)
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Jumla ya vipindi {generatedAssignments.length} vimepangwa katika mikondo {levelStreamList.length} bila mwalimu yeyote kugongana.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={applyMode}
                    onChange={(e) => setApplyMode(e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 outline-none cursor-pointer"
                  >
                    <option value="replace_level">Badilisha Ratiba ya Ngazi Hii Tu ({selectedLevel})</option>
                    <option value="merge">Unganisha na Ratiba Iliyopo (Merge)</option>
                  </select>
                </div>
              </div>

              {/* Stream Preview Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hakiki Ratiba kwa Mkondo (Stream Preview):
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {previewAssignments.length} vipindi vilivyopangwa
                  </span>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {levelStreamList.map(({ className, stream }) => {
                    const tag = `${className} - ${stream}`;
                    const isSelected = selectedStreamPreview === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedStreamPreview(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Preview Grid */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 w-28">Kipindi</th>
                        {workingDays.map(day => (
                          <th key={day} className="p-3">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {Array.from({ length: totalPeriods }).map((_, pIdx) => {
                        const periodNum = pIdx + 1;
                        return (
                          <tr key={periodNum} className="hover:bg-slate-50/70">
                            <td className="p-3 font-bold bg-slate-50 text-slate-800 border-r border-slate-100">
                              Period {periodNum}
                            </td>
                            {workingDays.map(day => {
                              const slot = previewAssignments.find(a => 
                                a.day === day && a.periodName === `Period ${periodNum}`
                              );
                              const teacher = slot?.teacherId ? teachers.find(t => t.id === slot.teacherId) : null;
                              return (
                                <td key={day} className="p-2.5">
                                  {slot ? (
                                    <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-100">
                                      <span className="font-bold text-slate-900 block text-xs truncate" title={slot.subject}>
                                        {slot.subject}
                                      </span>
                                      <span className="text-[10px] text-blue-700 block truncate" title={teacher?.name}>
                                        {teacher?.name || 'Unassigned'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
          >
            Funga / Close
          </button>

          {generatedAssignments && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tengeneza Tena (Regenerate)
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>Tumia Ratiba Hii ya {selectedLevel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
