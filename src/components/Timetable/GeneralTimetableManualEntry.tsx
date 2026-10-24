import React, { useState, useMemo } from 'react';
import { Teacher, TimetableAssignment, PeriodSetting, StreamSetting, TeacherAssignment, SubjectPeriodAllocation } from '../../types';
import { ArrowLeftRight, Check, AlertTriangle, X, RefreshCw, Lock, BarChart3, CheckCircle2 } from 'lucide-react';
import { DAYS_OF_WEEK } from '../../constants/defaults';
import { getSubjectColor } from '../../utils/colors';
import { isSameClass } from '../../utils/reportCardUtils';
import {
  isSameStream,
  isSamePeriod,
  parseClassAndStream,
  getConfiguredDays,
  getPeriodsForDayFromSettings,
  isPeriodLocked,
  isAcademicReligiousSubject,
  computeStreamSubjectProgression,
  getAllStreamsForClassHelper,
  getRegisteredSubjectsForTeacher,
  isSameSubjectName
} from '../../lib/timetableService';

interface GeneralTimetableManualEntryProps {
  teachers?: Teacher[];
  assignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  streamSettings?: StreamSetting[];
  teacherAssignments?: TeacherAssignment[];
  subjectPeriodAllocations?: SubjectPeriodAllocation[];
  onManageStreamSubjects?: (className: string, stream: string, mode?: 'progression' | 'register') => void;
  onUpdateAssignments: (assignments: TimetableAssignment[]) => void;
  classes?: string[];
}

export const GeneralTimetableManualEntry: React.FC<GeneralTimetableManualEntryProps> = ({
  teachers = [],
  assignments = [],
  periodSettings = [],
  streamSettings = [],
  teacherAssignments = [],
  subjectPeriodAllocations = [],
  onManageStreamSubjects,
  onUpdateAssignments,
  classes = []
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [quickSwapActive, setQuickSwapActive] = useState<boolean>(false);
  const [swapSource, setSwapSource] = useState<{
    day: string;
    period: string;
    teacherId: number;
    assignment?: TimetableAssignment;
  } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Extract clean periods from periodSettings
  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    const hrs = isNaN(parts[0]) ? 0 : parts[0];
    const mins = isNaN(parts[1]) ? 0 : parts[1];
    return hrs * 60 + mins;
  };

  const configuredDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

  const dayPeriods = useMemo<PeriodSetting[]>(() => {
    const forDay = getPeriodsForDayFromSettings(selectedDay, periodSettings).filter(p => !p.isBreak);
    if (forDay.length > 0) {
      return forDay;
    }
    if (!periodSettings || periodSettings.length === 0) {
      return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        day: selectedDay,
        name: `Period ${i + 1}`,
        start: `${8 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '40'}`,
        end: `${8 + Math.floor((i + 1) / 2)}:${(i + 1) % 2 === 0 ? '00' : '40'}`
      }));
    }
    return [];
  }, [periodSettings, selectedDay]);

  const teacherMap = useMemo(() => {
    const map = new Map<number, Teacher>();
    (teachers || []).forEach(t => {
      if (t && t.id !== undefined) map.set(t.id, t);
    });
    return map;
  }, [teachers]);

  const getTeacherSubjects = (teacherId: number): string[] => {
    const tObj = teacherMap.get(teacherId);
    return getRegisteredSubjectsForTeacher(tObj, teacherAssignments);
  };

  // Compute curriculum load mismatches across configured streams
  const curriculumLoadAudit = useMemo(() => {
    const classNames = Array.from(
      new Set([
        ...streamSettings.map(s => s.className),
        ...subjectPeriodAllocations.map(a => a.className)
      ].filter(Boolean))
    );
    const reports = classNames.flatMap(cName => {
      const streams = getAllStreamsForClassHelper(cName, streamSettings, assignments, subjectPeriodAllocations);
      return streams.map(st =>
        computeStreamSubjectProgression(cName, st, subjectPeriodAllocations, assignments, periodSettings, teachers)
      );
    }).filter(r => r.totalRequiredSubjects > 0);

    const flaggedStreams = reports.filter(r => !r.isFullyComplete);
    return {
      totalConfiguredStreams: reports.length,
      flaggedStreams
    };
  }, [streamSettings, subjectPeriodAllocations, assignments, periodSettings, teachers]);

  // Handle cell click for Quick Swap or assignment
  const handleCellClick = (day: string, periodName: string, teacherId: number) => {
    if (isPeriodLocked(day, periodName, periodSettings, assignments, { teacherId }).isLocked) {
      setMessage({ text: 'Kipindi hiki kimefungwa (Locked) na hakiwezi kubadilishwa.', type: 'error' });
      return;
    }

    const existingAsg = (assignments || []).find(a => {
      if (!a || Number(a.teacherId) !== Number(teacherId)) return false;
      if ((a.day || '').trim().toLowerCase() !== day.trim().toLowerCase()) return false;
      return isSamePeriod(a.period, a.periodName, periodName);
    });

    if (!quickSwapActive && !swapSource) {
      return;
    }

    if (!swapSource) {
      // Select source for Quick Swap
      setSwapSource({
        day,
        period: periodName,
        teacherId,
        assignment: existingAsg
      });
      const t = teacherMap.get(teacherId);
      setMessage({
        text: `Umechagua ${t?.name || 'Mwalimu'} (${periodName}). Sasa bonyeza mwalimu mwingine kubadilishana vipindi (Quick Swap)!`,
        type: 'info'
      });
    } else {
      // Execute Quick Swap between swapSource and this target cell
      if (swapSource.teacherId === teacherId && isSamePeriod(swapSource.period, swapSource.period, periodName) && swapSource.day === day) {
        setSwapSource(null);
        setMessage({ text: 'Ubadilishanaji umeghairiwa.', type: 'info' });
        return;
      }

      const tSource = teacherMap.get(swapSource.teacherId);
      const tTarget = teacherMap.get(teacherId);

      const asgSource = (assignments || []).find(a => {
        if (!a || Number(a.teacherId) !== Number(swapSource.teacherId)) return false;
        if ((a.day || '').trim().toLowerCase() !== swapSource.day.trim().toLowerCase()) return false;
        return isSamePeriod(a.period, a.periodName, swapSource.period);
      });

      const asgTarget = existingAsg;

      if (!asgSource && !asgTarget) {
        setMessage({ text: 'Seli zote mbili hazina vipindi vilivyopangwa.', type: 'error' });
        setSwapSource(null);
        return;
      }

      if (
        (asgSource?.isLocked && !isAcademicReligiousSubject(asgSource?.subject)) ||
        (asgTarget?.isLocked && !isAcademicReligiousSubject(asgTarget?.subject)) ||
        isPeriodLocked(swapSource.day, swapSource.period, periodSettings, assignments, { teacherId: swapSource.teacherId }).isLocked ||
        isPeriodLocked(day, periodName, periodSettings, assignments, { teacherId }).isLocked
      ) {
        setMessage({ text: 'Moja ya vipindi hivi vimefungwa (Locked) na haviwezi kubadilishwa.', type: 'error' });
        setSwapSource(null);
        return;
      }

      const sourceTeacherSubjects = getTeacherSubjects(swapSource.teacherId);
      const targetTeacherSubjects = getTeacherSubjects(teacherId);

      if (asgSource && targetTeacherSubjects.length === 0) {
        setMessage({ text: `${tTarget?.name || 'Mwalimu'} hajasajiliwa somo lolote. Huwezi kumhamishia kipindi.`, type: 'error' });
        setSwapSource(null);
        return;
      }
      if (asgTarget && sourceTeacherSubjects.length === 0) {
        setMessage({ text: `${tSource?.name || 'Mwalimu'} hajasajiliwa somo lolote. Huwezi kumhamishia kipindi.`, type: 'error' });
        setSwapSource(null);
        return;
      }

      const resolveTeacherSubject = (currentSubj: string | undefined, validSubjects: string[]) => {
        if (currentSubj && validSubjects.some(s => isSameSubjectName(s, currentSubj))) {
          return validSubjects.find(s => isSameSubjectName(s, currentSubj)) || currentSubj;
        }
        return validSubjects.length === 1 ? validSubjects[0] : '';
      };

      let updatedAssignments = [...assignments];

      if (asgSource && asgTarget) {
        updatedAssignments = updatedAssignments.map(a => {
          if (a.id === asgSource.id) {
            return {
              ...a,
              teacherId: teacherId,
              subject: resolveTeacherSubject(a.subject, targetTeacherSubjects)
            };
          }
          if (a.id === asgTarget.id) {
            return {
              ...a,
              teacherId: swapSource.teacherId,
              subject: resolveTeacherSubject(a.subject, sourceTeacherSubjects)
            };
          }
          return a;
        });
        setMessage({
          text: `Mafanikio! Vipindi vya ${tSource?.name} na ${tTarget?.name} vimebadilishwa kikamilifu (Quick Swap).`,
          type: 'success'
        });
      } else if (asgSource && !asgTarget) {
        updatedAssignments = updatedAssignments.map(a => {
          if (a.id === asgSource.id) {
            return {
              ...a,
              teacherId: teacherId,
              subject: resolveTeacherSubject(a.subject, targetTeacherSubjects)
            };
          }
          return a;
        });
        setMessage({
          text: `Kipindi kimehamishiwa kwa ${tTarget?.name}.`,
          type: 'success'
        });
      } else if (!asgSource && asgTarget) {
        updatedAssignments = updatedAssignments.map(a => {
          if (a.id === asgTarget.id) {
            return {
              ...a,
              teacherId: swapSource.teacherId,
              subject: resolveTeacherSubject(a.subject, sourceTeacherSubjects)
            };
          }
          return a;
        });
        setMessage({
          text: `Kipindi kimehamishiwa kwa ${tSource?.name}.`,
          type: 'success'
        });
      }

      onUpdateAssignments(updatedAssignments);
      setSwapSource(null);
    }
  };

  const handleClassAssignmentChange = (
    day: string,
    period: string,
    teacherId: number,
    classStreamValue: string
  ) => {
    const rawPeriod = period;
    const norm = period.split(' (')[0].trim();
    const normDay = day.trim().toLowerCase();

    if (isPeriodLocked(day, norm, periodSettings, assignments, { teacherId }).isLocked) {
      setMessage({ text: 'Kipindi hiki kimefungwa (Locked). Huwezi kumpangia mwalimu kipindi cha darasani hapa.', type: 'error' });
      return;
    }

    if (!classStreamValue.trim()) {
      // Remove assignment for this teacher at this slot
      const filtered = (assignments || []).filter(a => {
        if (!a) return false;
        return !(
          Number(a.teacherId) === Number(teacherId) &&
          (a.day || '').trim().toLowerCase() === normDay &&
          isSamePeriod(a.period, a.periodName, norm)
        );
      });
      onUpdateAssignments(filtered);
      return;
    }

    const teacherSubjects = getTeacherSubjects(teacherId);
    if (teacherSubjects.length === 0) {
      setMessage({ text: 'Mwalimu huyu hajasajiliwa somo lolote. Tafadhali msajilie masomo kwanza.', type: 'error' });
      return;
    }

    const parsed = parseClassAndStream(classStreamValue);
    const className = parsed.className;
    const stream = parsed.stream;

    if (isPeriodLocked(day, norm, periodSettings, assignments, { className, stream, teacherId }).isLocked) {
      setMessage({ text: `Kipindi cha ${norm} (${day}) kimefungwa kwa ${className} ${stream}. Huwezi kupanga kipindi cha darasani hapa.`, type: 'error' });
      return;
    }

    // Auto-fill subject ONLY when the teacher has 1 subject; if multiple subjects, let the user select from dropdown
    const autoSubject = teacherSubjects.length === 1 ? teacherSubjects[0] : '';

    const existingIndex = (assignments || []).findIndex(a => {
      if (!a || Number(a.teacherId) !== Number(teacherId)) return false;
      if ((a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, norm);
    });

    if (existingIndex >= 0 && assignments[existingIndex].isLocked && !isAcademicReligiousSubject(assignments[existingIndex].subject)) {
      setMessage({ text: 'Kipindi hiki kimefungwa (Locked) na hakiwezi kubadilishwa.', type: 'error' });
      return;
    }

    let updated = [...assignments];
    if (existingIndex >= 0) {
      const existingSubj = updated[existingIndex].subject || '';
      const validExistingSubj = teacherSubjects.find(s => isSameSubjectName(s, existingSubj));
      updated[existingIndex] = {
        ...updated[existingIndex],
        className,
        stream,
        subject: teacherSubjects.length === 1 ? teacherSubjects[0] : (validExistingSubj || '')
      };
    } else {
      updated.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        day,
        period: rawPeriod,
        periodName: norm,
        teacherId,
        className,
        stream,
        subject: autoSubject,
        activityType: 'academic'
      });
    }

    // Check if another teacher is already scheduled for this class at this time (Class Collision Alert)
    const clashingOtherTeacher = (assignments || []).find(a => {
      if (!a) return false;
      if (Number(a.teacherId) === Number(teacherId)) return false;
      if (!isSameClass(a.className, className) || !isSameStream(a.stream, stream)) return false;
      if ((a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, norm);
    });

    if (clashingOtherTeacher && !clashingOtherTeacher.isParallelElective) {
      const otherTObj = teacherMap.get(clashingOtherTeacher.teacherId);
      setMessage({
        text: `⚠️ Tahadhari ya Mgongano: Darasa la ${className} ${stream} tayari lina somo la "${clashingOtherTeacher.subject}" (${otherTObj?.name || 'Mwalimu'}) saa hii! Kama ni mchepuo sambamba, liweke kama mchepuo kwenye Ratiba Kuu.`,
        type: 'error'
      });
    }

    onUpdateAssignments(updated);
  };

  const handleSubjectChange = (
    day: string,
    period: string,
    teacherId: number,
    newSubject: string
  ) => {
    const norm = period.split(' (')[0].trim();
    const normDay = day.trim().toLowerCase();

    if (isPeriodLocked(day, norm, periodSettings, assignments, { teacherId }).isLocked) {
      setMessage({ text: 'Kipindi hiki kimefungwa (Locked).', type: 'error' });
      return;
    }

    const teacherSubjects = getTeacherSubjects(teacherId);
    if (newSubject && !teacherSubjects.some(s => isSameSubjectName(s, newSubject))) {
      setMessage({ text: `Mwalimu huyu hajasajiliwa kufundisha somo la "${newSubject}".`, type: 'error' });
      return;
    }

    const existingIndex = (assignments || []).findIndex(a => {
      if (!a || Number(a.teacherId) !== Number(teacherId)) return false;
      if ((a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, norm);
    });

    if (existingIndex >= 0 && newSubject) {
      if (assignments[existingIndex].isLocked && !isAcademicReligiousSubject(assignments[existingIndex].subject) && !isAcademicReligiousSubject(newSubject)) {
        setMessage({ text: 'Kipindi hiki kimefungwa (Locked).', type: 'error' });
        return;
      }
      const updated = [...assignments];
      updated[existingIndex] = {
        ...updated[existingIndex],
        subject: newSubject
      };
      onUpdateAssignments(updated);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      {/* Top Header & Quick Swap Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Kuingiza Ratiba ya Jumla kwa Mkono (Manual Entry Grid)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
              Urekebishaji wa Moja kwa Moja
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Panga au badilisha vipindi vya walimu kwa kila kipindi cha siku uliyochagua.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Day Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {configuredDays.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDay(d);
                  setSwapSource(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedDay === d
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {d.substring(0, 3)}
              </button>
            ))}
          </div>

          {/* Quick Swap Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setQuickSwapActive(!quickSwapActive);
              setSwapSource(null);
              setMessage(
                !quickSwapActive
                  ? { text: 'Hali ya Quick Swap imewashwa! Bonyeza seli ya kwanza kisha ya pili kubadilishana.', type: 'info' }
                  : null
              );
            }}
            className={`px-3.5 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border ${
              quickSwapActive
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 ring-2 ring-amber-400/40'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Washa Quick Swap ili kubadilishana vipindi vya walimu wawili papo hapo"
          >
            <ArrowLeftRight className={`w-3.5 h-3.5 ${quickSwapActive ? 'animate-spin' : ''}`} />
            <span>Quick Swap {quickSwapActive ? 'Wazi (Active)' : 'Washa'}</span>
          </button>
        </div>
      </div>

      {/* Alert / Notification banner */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : message.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : message.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automatic Curriculum Load Error Flagging Strip */}
      {curriculumLoadAudit.totalConfiguredStreams > 0 && (
        <div
          className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
            curriculumLoadAudit.flaggedStreams.length > 0
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {curriculumLoadAudit.flaggedStreams.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-black">
                {curriculumLoadAudit.flaggedStreams.length > 0
                  ? `🚩 Curriculum Load Mismatch Flagged in ${curriculumLoadAudit.flaggedStreams.length} Stream(s)`
                  : `✅ All ${curriculumLoadAudit.totalConfiguredStreams} Configured Streams Match Expected Weekly Curriculum Load`}
              </div>
              {curriculumLoadAudit.flaggedStreams.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {curriculumLoadAudit.flaggedStreams.slice(0, 6).map(fs => (
                    <button
                      key={`${fs.className}_${fs.stream}`}
                      type="button"
                      onClick={() =>
                        onManageStreamSubjects && onManageStreamSubjects(fs.className, fs.stream, 'progression')
                      }
                      className="px-2 py-0.5 rounded-md bg-white border border-rose-300 text-rose-900 text-[11px] font-bold hover:bg-rose-100 cursor-pointer transition"
                    >
                      {fs.className} ({fs.stream}): {fs.totalEnteredRegisteredPeriods}/{fs.totalRequiredPeriods}p ({fs.overallPercentage}%)
                      {fs.missingSubjects.length > 0 ? ` • ${fs.missingSubjects.length} Missing` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {onManageStreamSubjects && (
            <button
              type="button"
              onClick={() =>
                onManageStreamSubjects(
                  curriculumLoadAudit.flaggedStreams[0]?.className || 'Form 1',
                  curriculumLoadAudit.flaggedStreams[0]?.stream || 'All',
                  'progression'
                )
              }
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Open Progression Report</span>
            </button>
          )}
        </div>
      )}

      {/* Color Legend for Period Status */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">Alama za Rangi:</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-400 font-black">
          <Check className="w-3.5 h-3.5 text-emerald-700" />
          <span>Kijani (Green): Kipindi Kimeingizwa &amp; Hakina Shida</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-950 border border-rose-400 font-black">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
          <span>Nyekundu (Red): Kipindi Kina Mgongano / Shida</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-400 font-black">
          <Lock className="w-3.5 h-3.5 text-amber-700" />
          <span>Dhahabu (Gold): Kipindi Kimefungwa (Locked 🔒)</span>
        </span>
      </div>

      {/* Manual Entry Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs min-w-[800px]">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="p-3 border-r border-slate-800 font-black uppercase text-[11px] tracking-wider w-40 bg-slate-950 sticky left-0 z-10">
                Kipindi / Period
              </th>
              {(teachers || []).map(t => (
                <th
                  key={t.id}
                  className="p-2.5 border-r border-slate-800 text-center font-bold text-[11px] min-w-[120px]"
                >
                  <div className="truncate" title={t.name}>{t.name}</div>
                  <div className="text-[9px] font-normal text-slate-400 truncate">
                    {t.subjects?.join(', ') || 'Teacher'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {dayPeriods.map(period => {
              const pNorm = period.name.trim();
              const globalCheck = isPeriodLocked(selectedDay, pNorm, periodSettings, assignments);
              const isGlobalPeriodLocked = Boolean(
                period.isBreak ||
                (globalCheck.isLocked && globalCheck.isGlobalLock)
              );

              return (
                <tr key={`${selectedDay}-${period.id || period.name}`} className={`transition-colors ${isGlobalPeriodLocked ? 'bg-amber-100/60' : 'hover:bg-slate-50/60'}`}>
                  {/* Period Column */}
                  <td className={`p-3 border-r border-slate-200 font-bold text-slate-900 sticky left-0 z-10 ${
                    isGlobalPeriodLocked ? 'bg-amber-100 text-amber-950' : 'bg-slate-100/90'
                  }`}>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs">{period.name}</span>
                        {isGlobalPeriodLocked && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400 text-[9px] font-black uppercase">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      {period.start && period.end && (
                        <span className={`text-[10px] font-mono ${isGlobalPeriodLocked ? 'text-amber-800 font-bold' : 'text-slate-500'}`}>
                          {period.start} - {period.end}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Teachers Columns */}
                  {(teachers || []).map(t => {
                    const assignment = (assignments || []).find(a => {
                      if (!a || Number(a.teacherId) !== Number(t.id)) return false;
                      if ((a.day || '').trim().toLowerCase() !== selectedDay.trim().toLowerCase()) return false;
                      return isSamePeriod(a.period, a.periodName, pNorm);
                    });

                    const isSelectedForSwap =
                      swapSource?.day === selectedDay &&
                      isSamePeriod(swapSource?.period, swapSource?.period, pNorm) &&
                      swapSource?.teacherId === t.id;

                    const teacherSubjects = getTeacherSubjects(t.id);
                    const allStreamOptions = (t.teachingStreams && t.teachingStreams.length > 0)
                      ? t.teachingStreams
                      : streamSettings.flatMap(ss => ss.streams.map(st => `${ss.className} - ${st}`));

                    const matchedStreamOption = assignment && assignment.className
                      ? allStreamOptions.find(opt => {
                          const p = parseClassAndStream(opt);
                          return isSameClass(p.className, assignment.className) && isSameStream(p.stream, assignment.stream);
                        })
                      : '';
                    const currentStreamVal = matchedStreamOption || (assignment && assignment.className ? `${assignment.className} - ${assignment.stream}` : '');

                    const isCellLocked = Boolean(
                      isGlobalPeriodLocked ||
                      (!isAcademicReligiousSubject(assignment?.subject) && (
                        assignment?.isLocked ||
                        (assignment as any)?.locked ||
                        (assignment?.activityType && assignment.activityType !== 'academic' && assignment.activityType !== 'religion')
                      )) ||
                      isPeriodLocked(selectedDay, pNorm, periodSettings, assignments, {
                        teacherId: t.id,
                        className: assignment?.className,
                        stream: assignment?.stream
                      }).isLocked
                    );

                    const validAssignedSubject = assignment
                      ? (teacherSubjects.find(s => isSameSubjectName(s, assignment.subject || '')) || '')
                      : '';
                    const effectiveSubject = validAssignedSubject || (assignment?.className && teacherSubjects.length === 1 ? teacherSubjects[0] : '');

                    // Check if another teacher is teaching the same class+stream at this day+period
                    const clashingAssignment = !isCellLocked && assignment && assignment.className ? (assignments || []).find(a => {
                      if (!a || Number(a.teacherId) === Number(t.id)) return false;
                      if ((a.day || '').trim().toLowerCase() !== selectedDay.trim().toLowerCase()) return false;
                      if (!isSamePeriod(a.period, a.periodName, pNorm)) return false;
                      if (a.isParallelElective && assignment.isParallelElective) return false;
                      return isSameClass(a.className, assignment.className) && isSameStream(a.stream, assignment.stream);
                    }) : undefined;

                    const hasCellIssue = !isCellLocked && Boolean(
                      assignment && (
                        clashingAssignment ||
                        !assignment.className ||
                        !effectiveSubject
                      )
                    );
                    const isValidCellEntry = !isCellLocked && !hasCellIssue && Boolean(assignment && assignment.className && effectiveSubject);

                    return (
                      <td
                        key={`${selectedDay}-${period.name}-${t.id}`}
                        onClick={() => {
                          if (quickSwapActive && !isCellLocked) {
                            handleCellClick(selectedDay, pNorm, t.id);
                          }
                        }}
                        className={`p-1.5 border-r border-slate-200 transition-all ${
                          isSelectedForSwap
                            ? 'bg-amber-200 ring-2 ring-amber-500 ring-inset'
                            : isCellLocked
                            ? 'bg-amber-100/75'
                            : hasCellIssue
                            ? 'bg-rose-100/85'
                            : isValidCellEntry
                            ? 'bg-emerald-100/75'
                            : quickSwapActive
                            ? 'cursor-pointer hover:bg-amber-50/80'
                            : 'bg-white'
                        }`}
                      >
                        {quickSwapActive ? (
                          // In Quick Swap mode, render prominent swap card
                          <div
                            className={`p-2 rounded-lg text-center border transition-all ${
                              isSelectedForSwap
                                ? 'bg-amber-100 border-amber-500 shadow-sm'
                                : isCellLocked
                                ? 'bg-amber-100/90 border-amber-400 opacity-90 cursor-not-allowed'
                                : hasCellIssue
                                ? 'bg-rose-100 border-rose-400 hover:border-rose-500'
                                : isValidCellEntry
                                ? 'bg-emerald-100 border-emerald-400 hover:border-emerald-500'
                                : 'bg-white border-dashed border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            {isCellLocked ? (
                              <span className="text-[10px] text-amber-950 font-black flex items-center justify-center gap-1">
                                <Lock className="w-3 h-3 text-amber-700" /> Kimefungwa
                              </span>
                            ) : assignment ? (
                              <>
                                <div className={`font-black text-xs truncate ${hasCellIssue ? 'text-rose-950' : 'text-emerald-950'}`}>
                                  {assignment.subject || 'Chagua Somo'}
                                </div>
                                <div className={`text-[10px] font-bold truncate ${hasCellIssue ? 'text-rose-800' : 'text-emerald-800'}`}>
                                  {assignment.className} ({assignment.stream})
                                </div>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold">— Bure (Swap)</span>
                            )}
                          </div>
                        ) : (
                          // In Normal mode, allow editing or selecting class & subject
                          <div className="space-y-1">
                            <select
                              value={currentStreamVal}
                              disabled={isCellLocked || teacherSubjects.length === 0}
                              onChange={e => handleClassAssignmentChange(selectedDay, `${pNorm} (${period.start}-${period.end})`, t.id, e.target.value)}
                              className={`w-full px-1.5 py-1 text-[11px] font-bold border rounded focus:ring-1 transition ${
                                isCellLocked
                                  ? 'bg-amber-100/90 border-amber-400 text-amber-950 cursor-not-allowed'
                                  : teacherSubjects.length === 0
                                  ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                                  : hasCellIssue
                                  ? 'bg-rose-50 border-rose-400 text-rose-950 cursor-pointer focus:ring-rose-500'
                                  : isValidCellEntry
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 cursor-pointer focus:ring-emerald-500'
                                  : 'bg-white border-slate-300 text-slate-800 cursor-pointer focus:ring-blue-500'
                              }`}
                              title={
                                isCellLocked
                                  ? 'Kipindi hiki kimefungwa (Locked)'
                                  : teacherSubjects.length === 0
                                  ? 'Mwalimu huyu hajasajiliwa somo lolote'
                                  : hasCellIssue
                                  ? 'Kipindi hiki kina mgongano au hakijakamilika'
                                  : 'Panga darasa na mkondo kwa mwalimu huyu'
                              }
                            >
                              <option value="">
                                {isCellLocked
                                  ? '🔒 Kimefungwa (Locked)'
                                  : teacherSubjects.length === 0
                                  ? '⚠️ Hana Somo'
                                  : '-- Hakuna --'}
                              </option>
                              {allStreamOptions.map(option => {
                                const parsedOpt = parseClassAndStream(option);
                                const isOptLocked = isPeriodLocked(selectedDay, pNorm, periodSettings, assignments, {
                                  className: parsedOpt.className,
                                  stream: parsedOpt.stream
                                }).isLocked;
                                return (
                                  <option key={option} value={option} disabled={isOptLocked && currentStreamVal !== option}>
                                    {option}{isOptLocked ? ' — [LOCKED 🔒]' : ''}
                                  </option>
                                );
                              })}
                              {currentStreamVal && !allStreamOptions.includes(currentStreamVal) && (
                                <option value={currentStreamVal}>{currentStreamVal}</option>
                              )}
                            </select>

                            {assignment && (() => {
                              const displaySubject = isCellLocked
                                ? (assignment.subject || validAssignedSubject || teacherSubjects[0] || 'Locked')
                                : (validAssignedSubject || (teacherSubjects.length === 1 ? teacherSubjects[0] : ''));

                              return teacherSubjects.length > 1 && !isCellLocked ? (
                                <select
                                  value={validAssignedSubject}
                                  disabled={isCellLocked}
                                  onChange={e => handleSubjectChange(selectedDay, pNorm, t.id, e.target.value)}
                                  className={`w-full px-1.5 py-1 rounded text-[10px] font-black text-center truncate border cursor-pointer ${
                                    hasCellIssue
                                      ? 'bg-rose-200/90 text-rose-950 border-rose-400'
                                      : 'bg-emerald-200/90 text-emerald-950 border-emerald-400'
                                  }`}
                                  title="Chagua somo alilosajiliwa kufundisha"
                                >
                                  <option value="">-- Chagua Somo --</option>
                                  {teacherSubjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))}
                                </select>
                              ) : (
                                <div
                                  className={`px-2 py-1 rounded text-[10px] font-black text-center truncate border flex items-center justify-center gap-1 ${
                                    isCellLocked
                                      ? 'bg-amber-200/90 text-amber-950 border-amber-400'
                                      : hasCellIssue
                                      ? 'bg-rose-200/90 text-rose-950 border-rose-400'
                                      : 'bg-emerald-200/90 text-emerald-950 border-emerald-400'
                                  }`}
                                  title={
                                    isCellLocked
                                      ? `${displaySubject} (Locked)`
                                      : hasCellIssue
                                      ? `Mgongano kwenye kipindi hiki!`
                                      : `${displaySubject} (Sahihi)`
                                  }
                                >
                                  {isCellLocked ? (
                                    <Lock className="w-2.5 h-2.5 shrink-0 text-amber-800" />
                                  ) : hasCellIssue ? (
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-700" />
                                  ) : (
                                    <Check className="w-2.5 h-2.5 shrink-0 text-emerald-800" />
                                  )}
                                  <span className="truncate">{displaySubject || 'Somo'}</span>
                                </div>
                              );
                            })()}
                          </div>
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

      {/* Quick Swap helper notice */}
      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Jinsi ya kutumia Quick Swap:</strong> Washa kitufe cha "Quick Swap", bonyeza seli ya mwalimu wa kwanza, kisha bonyeza seli ya mwalimu wa pili. Mfumo utabadilishana vipindi vyao moja kwa moja bila kuharibu masomo.
          </span>
        </div>
      </div>
    </div>
  );
};
