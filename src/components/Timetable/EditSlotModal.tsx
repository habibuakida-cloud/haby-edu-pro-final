import React, { useState, useMemo } from 'react';
import { X, Save, Trash2, Sparkles, AlertTriangle, Layers, Plus, CheckCircle2 } from 'lucide-react';
import { TimetableAssignment, Teacher, ActivityType, PeriodSetting, InstitutionalPolicy } from '../../types';
import { SUBJECT_LIST, EXTRA_CURRICULAR_ACTIVITIES } from '../../constants/defaults';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';
import { renderExtraActivityIcon } from './ScheduleExtraCurricularModal';
import { getRegisteredSubjectsForTeacher, isSameSubjectName, isAcademicReligiousSubject, isSameStream } from '../../lib/timetableService';
import { isSameClass } from '../../utils/reportCardUtils';
import { checkSlotConflict } from '../../utils/conflicts';

interface EditSlotModalProps {
  slot: {
    className: string;
    stream: string;
    day: string;
    period: string;
    assignment?: TimetableAssignment;
    slotAssignments?: TimetableAssignment[];
  };
  teachers: Teacher[];
  periodSettings?: PeriodSetting[];
  institutionalPolicy?: InstitutionalPolicy;
  assignments?: TimetableAssignment[];
  onSave: (data: {
    assignmentId?: number | string;
    className: string;
    stream: string;
    day: string;
    period: string;
    subject: string;
    teacherId?: number;
    room?: string;
    activityType: ActivityType;
    customNote?: string;
    applySchoolWide?: boolean;
    isManual?: boolean;
    isLocked?: boolean;
    allocationMode?: 'manual' | 'auto';
    isParallelElective?: boolean;
    parallelElectiveTrack?: string;
    isNewParallel?: boolean;
  }) => void;
  onDelete?: (id: number | string) => void;
  onClose: () => void;
}

export const EditSlotModal: React.FC<EditSlotModalProps> = ({
  slot,
  teachers,
  periodSettings = [],
  institutionalPolicy,
  assignments = [],
  onSave,
  onDelete,
  onClose
}) => {
  // All existing assignments in this slot (can be 0, 1, or multiple parallel electives)
  const existingList = useMemo(() => {
    if (slot.slotAssignments && slot.slotAssignments.length > 0) {
      return slot.slotAssignments;
    }
    return slot.assignment ? [slot.assignment] : [];
  }, [slot.slotAssignments, slot.assignment]);

  // Which assignment is active in the modal:
  // could be an existing assignment ID, or 'NEW_PARALLEL', or 'NEW_SLOT'
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | string | 'NEW_PARALLEL' | 'NEW_SLOT'>(() => {
    return existingList[0]?.id || 'NEW_SLOT';
  });

  const activeExisting = useMemo(() => {
    if (activeAssignmentId === 'NEW_PARALLEL' || activeAssignmentId === 'NEW_SLOT') return undefined;
    return existingList.find(a => a.id === activeAssignmentId) || existingList[0];
  }, [existingList, activeAssignmentId]);

  // Global Lock Detection: Check if this period/day combination is locked in PeriodSettings for this class/stream
  const globalPeriodLock = useMemo(() => {
    const slotNorm = slot.period ? slot.period.split(' (')[0].trim() : '';
    return periodSettings.some(p => {
      if (p.day !== slot.day) return false;
      if (p.name !== slotNorm && p.name !== slot.period) return false;
      if (isAcademicReligiousSubject(p.name)) return false;
      const pClass = (p.className || '').trim();
      if (pClass && pClass.toLowerCase() !== 'all classes' && pClass.toLowerCase() !== 'all') {
        if (!isSameClass(pClass, slot.className)) return false;
      }
      const pStream = (p.streamName || '').trim();
      if (pStream && pStream.toLowerCase() !== 'all streams' && pStream.toLowerCase() !== 'all') {
        if (!isSameStream(pStream, slot.stream)) return false;
      }
      return Boolean(p.isLocked || p.locked || p.isBreak);
    });
  }, [periodSettings, slot]);

  // Initial teacher / subject calculation
  const initialTeacherId = activeExisting?.teacherId !== undefined ? activeExisting.teacherId : teachers[0]?.id;
  const initialTeacher = teachers.find(t => Number(t.id) === Number(initialTeacherId));
  const initialTeacherSubs = getRegisteredSubjectsForTeacher(initialTeacher);

  const [teacherId, setTeacherId] = useState<number | undefined>(initialTeacherId);
  const [activityType, setActivityType] = useState<ActivityType>(activeExisting?.activityType || 'academic');
  const [subject, setSubject] = useState(() => {
    if (activeExisting?.subject) {
      const isExtra = EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === activeExisting.subject);
      if (isExtra || !initialTeacherId) return activeExisting.subject;
      const matched = initialTeacherSubs.find(s => isSameSubjectName(s, activeExisting.subject));
      if (matched) return matched;
    }
    return initialTeacherSubs[0] || '';
  });
  const [room, setRoom] = useState(activeExisting?.room || '');
  const [customNote, setCustomNote] = useState(activeExisting?.customNote || '');
  const [applySchoolWide, setApplySchoolWide] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(
    Boolean(activeExisting?.isLocked && !isAcademicReligiousSubject(activeExisting?.subject))
  );

  // Parallel Elective State
  const [isParallelElective, setIsParallelElective] = useState<boolean>(
    Boolean(activeExisting?.isParallelElective || existingList.length > 1)
  );
  const [parallelElectiveTrack, setParallelElectiveTrack] = useState<string>(
    activeExisting?.parallelElectiveTrack || ''
  );

  const selectedTeacher = useMemo(
    () => teachers.find(t => Number(t.id) === Number(teacherId)),
    [teachers, teacherId]
  );
  const teacherRegisteredSubjects = useMemo(
    () => getRegisteredSubjectsForTeacher(selectedTeacher),
    [selectedTeacher]
  );

  // Real-time conflict detector: flags if this teacher or class has a collision at this slot
  const liveConflict = useMemo(() => {
    if (globalPeriodLock) return null;
    const currentId = (activeAssignmentId === 'NEW_PARALLEL' || activeAssignmentId === 'NEW_SLOT') ? undefined : activeAssignmentId;
    return checkSlotConflict({
      assignmentId: currentId,
      className: slot.className,
      stream: slot.stream,
      day: slot.day,
      period: slot.period,
      teacherId,
      subject,
      room,
      isParallelElective: isParallelElective || activeAssignmentId === 'NEW_PARALLEL' || existingList.length > 1
    }, assignments, teachers, institutionalPolicy?.rules?.allowParallelElectiveSubjects ?? true);
  }, [slot, teacherId, subject, room, isParallelElective, activeAssignmentId, existingList.length, assignments, teachers, institutionalPolicy, globalPeriodLock]);

  // Function to switch to editing an existing assignment or starting a new parallel assignment
  const handleSelectAssignmentToEdit = (asg: TimetableAssignment) => {
    setActiveAssignmentId(asg.id);
    const tObj = teachers.find(t => Number(t.id) === Number(asg.teacherId));
    const tSubs = getRegisteredSubjectsForTeacher(tObj);
    setTeacherId(asg.teacherId);
    setActivityType(asg.activityType || 'academic');
    setSubject(asg.subject);
    setRoom(asg.room || '');
    setCustomNote(asg.customNote || '');
    setIsLocked(Boolean(asg.isLocked && !isAcademicReligiousSubject(asg.subject)));
    setIsParallelElective(Boolean(asg.isParallelElective || existingList.length > 1));
    setParallelElectiveTrack(asg.parallelElectiveTrack || '');
  };

  const handleStartNewParallel = () => {
    setActiveAssignmentId('NEW_PARALLEL');
    // Pick next available teacher not already in this slot
    const assignedTeacherIds = new Set(existingList.map(e => Number(e.teacherId)).filter(Boolean));
    const availableTeachers = teachers.filter(t => !assignedTeacherIds.has(Number(t.id)));
    const nextTeacher = availableTeachers[0] || teachers[0];
    const nextSubs = getRegisteredSubjectsForTeacher(nextTeacher);
    setTeacherId(nextTeacher?.id);
    setActivityType('academic');
    setSubject(nextSubs[0] || '');
    setRoom('');
    setCustomNote('');
    setIsLocked(false);
    setIsParallelElective(true);
    setParallelElectiveTrack('');
  };

  // Only block form controls when globally locked in PeriodSettings
  const isEffectivelyLocked = globalPeriodLock;

  const handleActivitySelect = (act: typeof EXTRA_CURRICULAR_ACTIVITIES[0]) => {
    setSubject(act.name);
    setActivityType(act.id as ActivityType);
    if (act.id === 'sports') {
      setRoom('School Sports Grounds');
    } else if (act.id === 'environmental') {
      setRoom('School Compound / Environment');
    } else if (act.id === 'debates') {
      setRoom('Main School Hall');
    } else if (act.id === 'religion') {
      setRoom('Chapel / Mosque / Hall');
    } else if (act.id === 'breakfast') {
      setRoom('Dining Hall / Cafeteria');
    } else if (act.id === 'lunch') {
      setRoom('Dining Hall');
    } else if (act.id === 'assembly') {
      setRoom('Assembly Grounds');
    } else if (act.id === 'library') {
      setRoom('School Library');
    } else if (act.id === 'weekly_test') {
      setRoom('Classrooms / Exam Hall');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Tafadhali chagua somo lililosajiliwa kwa mwalimu huyu (Please select a registered subject/activity).');
      return;
    }
    const isReligiousSub = isAcademicReligiousSubject(subject);
    const isExtra = !isReligiousSub && (EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === subject) || activityType !== 'academic');
    if (!isExtra && teacherId) {
      if (teacherRegisteredSubjects.length === 0) {
        alert('Mwalimu huyu hajasajiliwa kufundisha somo lolote. Tafadhali msajilie masomo kwanza.');
        return;
      }
      if (!teacherRegisteredSubjects.some(s => isSameSubjectName(s, subject))) {
        alert(`Mwalimu ${selectedTeacher?.name || ''} hajasajiliwa kufundisha somo la "${subject}". Chagua somo alilosajiliwa tu.`);
        return;
      }
    }

    if (liveConflict) {
      const confirmSave = window.confirm(
        `⚠️ TAHADHARI YA MGONGANO (TIMETABLE CLASH DETECTED):\n\n${liveConflict.message}\n\nUshauri: ${liveConflict.recommendation}\n\n• Bonyeza "Cancel" ili uweze kurekebisha mwalimu au darasa sasa.\n• Bonyeza "OK" ikiwa una uhakika na unataka kuhifadhi hata hivyo.`
      );
      if (!confirmSave) {
        return;
      }
    }

    const isNewParallelMode = activeAssignmentId === 'NEW_PARALLEL';
    const isParallel = isParallelElective || isNewParallelMode || existingList.length > 1;

    onSave({
      assignmentId: (isNewParallelMode || activeAssignmentId === 'NEW_SLOT') ? undefined : activeAssignmentId,
      className: slot.className,
      stream: slot.stream,
      day: slot.day,
      period: slot.period,
      subject,
      teacherId: ['breakfast', 'lunch', 'environmental', 'sports', 'assembly', 'clubs', 'religion', 'library', 'weekly_test'].includes(activityType) ? (teacherId || undefined) : teacherId,
      room,
      activityType: isReligiousSub ? 'academic' : activityType,
      customNote,
      applySchoolWide: isReligiousSub ? false : applySchoolWide,
      isManual: true,
      isLocked: isReligiousSub ? false : isLocked,
      allocationMode: 'manual',
      isParallelElective: isParallel,
      parallelElectiveTrack: parallelElectiveTrack.trim() || undefined,
      isNewParallel: isNewParallelMode
    });
    onClose();
  };

  const subCol = getSubjectColor(subject);
  const teacherCol = getTeacherColor(teacherId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                {activeAssignmentId === 'NEW_PARALLEL' ? 'Ongeza Somo Sambamba la Mchepuo' : 'Hariri Kipindi cha Darasani'}
              </h3>
              {existingList.length > 1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  🔀 Masomo Sambamba ({existingList.length})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {slot.className} • {slot.stream} • {slot.day} • {slot.period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Global Lock Warning */}
          {globalPeriodLock && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-rose-800 uppercase tracking-wide">Kipindi Kimefungwa (Globally Locked)</p>
                <p className="text-[10px] text-rose-600 font-bold leading-relaxed">
                  Huwezi kupanga au kubadilisha kipindi hiki kwa sababu kimefungwa kwenye "Mipangilio ya Vipindi & Saa". 
                  Tafadhali nenda kwenye Mipangilio kukifungua (Unlock) kwanza.
                </p>
              </div>
            </div>
          )}

          {/* REAL-TIME CONFLICT ALERT BANNER */}
          {liveConflict && (
            <div className="p-4 bg-gradient-to-r from-rose-50 to-red-50/80 border-2 border-rose-400 rounded-xl space-y-2.5 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                      <span>🚨 TAHADHARI YA MGONGANO (CONFLICT ALERT)</span>
                    </span>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 text-[10px] font-black rounded-full uppercase">
                      Inahitaji Kurekebishwa
                    </span>
                  </div>
                  <p className="text-xs text-rose-900 font-bold leading-relaxed">
                    {liveConflict.message}
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-white/95 rounded-lg border border-rose-200 text-[11px] space-y-1">
                <span className="font-black text-rose-950 block">💡 Ushauri wa Kurekebisha:</span>
                <p className="text-slate-700 leading-relaxed">
                  {liveConflict.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* PARALLEL / ELECTIVE SUBJECTS CONTROLLER (Masomo Sambamba ya Michepuo) */}
          {existingList.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Masomo Kwenye Kipindi Hiki ({existingList.length}):
                </span>
                {activeAssignmentId !== 'NEW_PARALLEL' && (
                  <button
                    type="button"
                    disabled={isEffectivelyLocked}
                    onClick={handleStartNewParallel}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    title="Panga somo la pili kwa wanafunzi wa mchepuo tofauti (k.m. Sayansi na Biashara)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Somo Sambamba (Mchepuo)</span>
                  </button>
                )}
              </div>

              {/* List of existing subjects in this slot */}
              <div className="flex flex-wrap gap-2 pt-1">
                {existingList.map((asg) => {
                  const isSelected = activeAssignmentId === asg.id;
                  const subC = getSubjectColor(asg.subject);
                  const tObj = teachers.find(t => Number(t.id) === Number(asg.teacherId));
                  return (
                    <button
                      key={asg.id}
                      type="button"
                      onClick={() => handleSelectAssignmentToEdit(asg)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-white shadow-xs border-blue-400'
                          : 'bg-white/80 hover:bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: subC.bg, color: subC.text, borderColor: subC.border }}
                        className="px-1.5 py-0.2 rounded border text-[10px]"
                      >
                        {asg.subject}
                      </span>
                      <span className="text-slate-600 text-[11px] font-medium">
                        {tObj ? tObj.name : 'Hakuna Mwalimu'}
                      </span>
                      {(asg.isParallelElective || existingList.length > 1) && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                          {asg.parallelElectiveTrack || 'Mchepuo'}
                        </span>
                      )}
                    </button>
                  );
                })}

                {activeAssignmentId === 'NEW_PARALLEL' && (
                  <span className="px-3 py-1.5 rounded-lg border-2 border-dashed border-emerald-500 bg-emerald-50 text-emerald-900 text-xs font-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>Inaongeza Somo Sambamba Jipya (Mchepuo)...</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Extra-Curricular Templates */}
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider block mb-2 flex items-center justify-between ${isEffectivelyLocked ? 'text-slate-400' : 'text-slate-600'}`}>
              <span className="flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${isEffectivelyLocked ? 'text-slate-300' : 'text-amber-500'}`} />
                Quick Extra-Curricular Activities (1-Click Select)
              </span>
              <span className="text-[11px] font-normal text-slate-400">Click to assign instantly</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {EXTRA_CURRICULAR_ACTIVITIES.map(act => {
                const isSelected = subject === act.name;
                return (
                  <button
                    key={act.id}
                    type="button"
                    disabled={isEffectivelyLocked}
                    onClick={() => handleActivitySelect(act)}
                    style={{
                      backgroundColor: isSelected ? act.bg : '#ffffff',
                      borderColor: isSelected ? act.color : '#e2e8f0',
                      color: isSelected ? act.text : '#334155',
                      opacity: isEffectivelyLocked ? 0.6 : 1
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 ${
                      isEffectivelyLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-xs'
                    } ${
                      isSelected ? 'ring-2 ring-offset-0 font-bold shadow-2xs' : 'hover:border-slate-300'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: act.color, color: '#ffffff' }}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0 shadow-2xs"
                    >
                      {renderExtraActivityIcon(act.icon, "w-3 h-3 text-white")}
                    </span>
                    <span className="truncate text-[11px] font-semibold">{act.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher Selection */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Assigned Teacher / Coordinator
            </label>
            <select
              value={teacherId || ''}
              disabled={isEffectivelyLocked}
              onChange={e => {
                const nextId = e.target.value ? Number(e.target.value) : undefined;
                setTeacherId(nextId);
                if (nextId) {
                  const nextTeacher = teachers.find(t => Number(t.id) === Number(nextId));
                  const nextSubs = getRegisteredSubjectsForTeacher(nextTeacher);
                  const isCurrentExtra = EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === subject);
                  if (!isCurrentExtra) {
                    setActivityType('academic');
                    if (nextSubs.length === 1) {
                      setSubject(nextSubs[0]);
                    } else if (!nextSubs.some(s => isSameSubjectName(s, subject))) {
                      setSubject(nextSubs[0] || '');
                    }
                  }
                }
              }}
              className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEffectivelyLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
            >
              <option value="">-- No Specific Teacher / Auto Supervised --</option>
              {teachers.map(t => {
                const tSubs = getRegisteredSubjectsForTeacher(t);
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.initial}) - {tSubs.length > 0 ? tSubs.join(', ') : 'Hana Somo Lililosajiliwa'}
                  </option>
                );
              })}
            </select>
            {teacherId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Teacher Initial Badge:</span>
                <span
                  style={{ backgroundColor: teacherCol.hex, color: '#ffffff' }}
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold shadow-xs"
                >
                  {selectedTeacher?.initial || '--'}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {selectedTeacher?.name}
                </span>
              </div>
            )}
          </div>

          {/* Subject Selection / Input */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Subject / Period Activity * {selectedTeacher ? `(Masomo aliyosajiliwa ${selectedTeacher.name})` : ''}
            </label>
            <div className="flex gap-2">
              <select
                value={subject}
                disabled={isEffectivelyLocked}
                onChange={e => {
                  setSubject(e.target.value);
                  const isAct = EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === e.target.value);
                  if (isAct) {
                    const match = EXTRA_CURRICULAR_ACTIVITIES.find(a => a.name === e.target.value);
                    setActivityType((match?.id || 'academic') as ActivityType);
                  } else {
                    setActivityType('academic');
                  }
                }}
                className={`flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEffectivelyLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
              >
                {teacherId ? (
                  <optgroup label={`Registered Subjects (${selectedTeacher?.name || 'Teacher'})`}>
                    {teacherRegisteredSubjects.length > 0 ? (
                      teacherRegisteredSubjects.map(subName => (
                        <option key={subName} value={subName}>{subName}</option>
                      ))
                    ) : (
                      <option value="" disabled>-- Mwalimu huyu hajasajiliwa somo lolote --</option>
                    )}
                  </optgroup>
                ) : (
                  <optgroup label="Academic Subjects">
                    {SUBJECT_LIST.filter(s => !EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === s.name)).map(s => (
                      <option key={s.code} value={s.name}>{s.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Extra-Curricular / Special Periods">
                  {EXTRA_CURRICULAR_ACTIVITIES.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {/* Color Preview Badge */}
            {subject && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Color Preview:</span>
                <span
                  style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                >
                  {subject}
                </span>
              </div>
            )}
          </div>

          {/* PARALLEL / ELECTIVE CONFIGURATION TOGGLE */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl space-y-2.5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isParallelElectiveSlot"
                checked={isParallelElective || activeAssignmentId === 'NEW_PARALLEL' || existingList.length > 1}
                onChange={e => setIsParallelElective(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-600 accent-emerald-600 rounded cursor-pointer"
              />
              <label htmlFor="isParallelElectiveSlot" className="text-xs text-emerald-950 cursor-pointer flex-1">
                <span className="font-black block flex items-center gap-1.5">
                  <span>🔀 Somo la Mchepuo Sambamba (Parallel / Elective Subject)</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                    Sayansi / Biashara
                  </span>
                </span>
                <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                  Ruhusu somo hili kupangwa kwa wakati mmoja na somo lingine kwenye darasa hili (k.m. wanafunzi wa Sayansi kusoma <em>Physics</em> wakati wa Biashara wanasoma <em>Commerce</em>).
                </span>
              </label>
            </div>

            {(isParallelElective || activeAssignmentId === 'NEW_PARALLEL' || existingList.length > 1) && (
              <div className="pt-2 border-t border-emerald-200/70 space-y-1.5">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <label className="text-[11px] font-bold text-emerald-900 shrink-0">
                    Jina la Mchepuo (Track):
                  </label>
                  <input
                    type="text"
                    placeholder="k.m. Sayansi, Biashara, Sanaa, Dini"
                    value={parallelElectiveTrack}
                    onChange={e => setParallelElectiveTrack(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                  <div className="flex gap-1 shrink-0">
                    {['Sayansi', 'Biashara', 'Sanaa', 'Dini'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setParallelElectiveTrack(tag)}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-[10px] font-bold text-emerald-800 rounded border border-emerald-200 cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Room / Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Room / Venue (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Science Lab, Room 3, Hall"
                value={room}
                disabled={isEffectivelyLocked}
                onChange={e => setRoom(e.target.value)}
                className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEffectivelyLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Note / Theme (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Mchepuo wa Sayansi, Biashara"
                value={customNote}
                disabled={isEffectivelyLocked}
                onChange={e => setCustomNote(e.target.value)}
                className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEffectivelyLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
              />
            </div>
          </div>

          {/* Lock / Manual Protection Checkbox */}
          <div className={`p-3 border rounded-lg flex items-start gap-3 ${isEffectivelyLocked && !isLocked ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <input
              type="checkbox"
              id="isLockedPeriod"
              checked={isEffectivelyLocked || isLocked}
              onChange={e => setIsLocked(e.target.checked)}
              disabled={globalPeriodLock}
              className={`mt-1 w-4 h-4 rounded focus:ring-emerald-500 ${globalPeriodLock ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-600'}`}
            />
            <label htmlFor="isLockedPeriod" className={`text-xs cursor-pointer ${globalPeriodLock ? 'text-rose-900' : 'text-emerald-950'}`}>
              <span className="font-bold block flex items-center gap-1.5">
                <span>🔒 Linda Kipindi hiki (Lock Lesson Slot)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${globalPeriodLock ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'}`}>
                  {globalPeriodLock ? 'Global Lock Active' : 'Manual Protection'}
                </span>
              </span>
              {globalPeriodLock 
                ? 'Kipindi hiki kimefungwa kimfumo (School-wide Period Lock). Huwezi kufungua hapa.'
                : 'Kipindi hiki kitalindwa na hakitafutwa wala kubadilishwa kimakosa wakati wa kupanga ratiba.'}
            </label>
          </div>

          {/* Apply School Wide Checkbox */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <input
              type="checkbox"
              id="applySchoolWide"
              checked={applySchoolWide}
              disabled={isEffectivelyLocked}
              onChange={e => setApplySchoolWide(e.target.checked)}
              className={`mt-1 w-4 h-4 rounded focus:ring-blue-500 ${isEffectivelyLocked ? 'text-slate-300 cursor-not-allowed' : 'text-blue-600 cursor-pointer'}`}
            />
            <label htmlFor="applySchoolWide" className="text-xs text-amber-900 cursor-pointer">
              <span className="font-bold block">Apply to ALL streams & classes across the school</span>
              Convenient for school-wide events (e.g. Environmental Day on Friday Period 7, Sports & Games on Wednesday).
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {activeAssignmentId !== 'NEW_PARALLEL' && activeAssignmentId !== 'NEW_SLOT' && onDelete ? (
              <button
                type="button"
                disabled={isEffectivelyLocked}
                onClick={() => {
                  if (confirm(`Futa somo la "${subject}" kutoka kwenye kipindi hiki?`)) {
                    onDelete(activeAssignmentId);
                    onClose();
                  }
                }}
                className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${
                  isEffectivelyLocked 
                    ? 'text-slate-300 border-slate-200 cursor-not-allowed' 
                    : 'text-red-600 hover:bg-red-50 border-red-200 cursor-pointer'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{existingList.length > 1 ? `Futa Somo Hili (${subject})` : 'Futa Kipindi'}</span>
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEffectivelyLocked}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${
                  isEffectivelyLocked 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : activeAssignmentId === 'NEW_PARALLEL'
                    ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{activeAssignmentId === 'NEW_PARALLEL' ? 'Hifadhi Somo Sambamba' : 'Save Assignment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
