import React, { useState, useMemo } from 'react';
import { Teacher, TimetableAssignment, PeriodSetting, StreamSetting } from '../../types';
import { ArrowLeftRight, Check, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { DAYS_OF_WEEK } from '../../constants/defaults';
import { getSubjectColor } from '../../utils/colors';

interface GeneralTimetableManualEntryProps {
  teachers?: Teacher[];
  assignments?: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  streamSettings?: StreamSetting[];
  onUpdateAssignments: (assignments: TimetableAssignment[]) => void;
  classes?: string[];
}

export const GeneralTimetableManualEntry: React.FC<GeneralTimetableManualEntryProps> = ({
  teachers = [],
  assignments = [],
  periodSettings = [],
  streamSettings = [],
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

  const dayPeriods = useMemo(() => {
    const list = Array.isArray(periodSettings) ? periodSettings : [];
    const forDay = list.filter(p => p && p.day === selectedDay);
    if (forDay.length > 0) {
      return [...forDay].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    }
    // Fallback: unique periods across all days or default 8 periods
    const map = new Map<string, PeriodSetting>();
    list.forEach(p => {
      if (p && p.name && !map.has(p.name)) map.set(p.name, p);
    });
    if (map.size > 0) {
      return Array.from(map.values()).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    }
    return Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      day: selectedDay,
      name: `Period ${i + 1}`,
      start: `${8 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '40'}`,
      end: `${8 + Math.floor((i + 1) / 2)}:${(i + 1) % 2 === 0 ? '00' : '40'}`
    }));
  }, [periodSettings, selectedDay]);

  const teacherMap = useMemo(() => {
    const map = new Map<number, Teacher>();
    (teachers || []).forEach(t => {
      if (t && t.id !== undefined) map.set(t.id, t);
    });
    return map;
  }, [teachers]);

  // Handle cell click for Quick Swap or assignment
  const handleCellClick = (day: string, periodName: string, teacherId: number) => {
    const existingAsg = (assignments || []).find(a => {
      if (!a) return false;
      const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
      return a.day === day && pNorm === periodName && a.teacherId === teacherId;
    });

    if (!quickSwapActive && !swapSource) {
      // If user clicks a slot while quick swap is not started, we can still initiate swap or view
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
      if (swapSource.teacherId === teacherId && swapSource.period === periodName && swapSource.day === day) {
        // Clicked the same cell, cancel
        setSwapSource(null);
        setMessage({ text: 'Ubadilishanaji umeghairiwa.', type: 'info' });
        return;
      }

      const tSource = teacherMap.get(swapSource.teacherId);
      const tTarget = teacherMap.get(teacherId);

      const asgSource = (assignments || []).find(a => {
        if (!a) return false;
        const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
        return a.day === swapSource.day && pNorm === swapSource.period && a.teacherId === swapSource.teacherId;
      });

      const asgTarget = existingAsg;

      if (!asgSource && !asgTarget) {
        setMessage({ text: 'Seli zote mbili hazina vipindi vilivyopangwa.', type: 'error' });
        setSwapSource(null);
        return;
      }

      // Check conflict before swap:
      // Does tTarget already have a lesson at swapSource.period?
      // Does tSource already have a lesson at periodName?
      let updatedAssignments = [...assignments];

      if (asgSource && asgTarget) {
        // Swap teachers between the two assignments
        updatedAssignments = updatedAssignments.map(a => {
          if (a.id === asgSource.id) {
            return { ...a, teacherId: teacherId };
          }
          if (a.id === asgTarget.id) {
            return { ...a, teacherId: swapSource.teacherId };
          }
          return a;
        });
        setMessage({
          text: `Mafanikio! Vipindi vya ${tSource?.name} na ${tTarget?.name} vimebadilishwa kikamilifu (Quick Swap).`,
          type: 'success'
        });
      } else if (asgSource && !asgTarget) {
        // Move asgSource to target teacher
        updatedAssignments = updatedAssignments.map(a => {
          if (a.id === asgSource.id) {
            return { ...a, teacherId: teacherId };
          }
          return a;
        });
        setMessage({
          text: `Kipindi kimehamishiwa kwa ${tTarget?.name}.`,
          type: 'success'
        });
      } else if (!asgSource && asgTarget) {
        // Move asgTarget to source teacher
        updatedAssignments = updatedAssignments.map(a => {
          if (a.id === asgTarget.id) {
            return { ...a, teacherId: swapSource.teacherId };
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
    className: string,
    stream: string = 'STREAM A'
  ) => {
    const rawPeriod = period;
    const norm = period.split(' (')[0];

    if (!className) {
      // Remove assignment for this teacher at this slot
      const filtered = (assignments || []).filter(a => {
        if (!a) return true;
        const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
        return !(a.day === day && pNorm === norm && a.teacherId === teacherId);
      });
      onUpdateAssignments(filtered);
      return;
    }

    const t = teacherMap.get(teacherId);
    const defaultSubject = t?.subjects?.[0] || 'Subject';

    const existingIndex = (assignments || []).findIndex(a => {
      if (!a) return false;
      const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
      return a.day === day && pNorm === norm && a.teacherId === teacherId;
    });

    let updated = [...assignments];
    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        className,
        stream,
        subject: defaultSubject
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
        subject: defaultSubject,
        activityType: 'academic'
      });
    }

    onUpdateAssignments(updated);
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
            {DAYS_OF_WEEK.map(d => (
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
              return (
                <tr key={`${selectedDay}-${period.id || period.name}`} className="hover:bg-slate-50/60 transition-colors">
                  {/* Period Column */}
                  <td className="p-3 border-r border-slate-200 font-bold text-slate-900 bg-slate-100/90 sticky left-0 z-10">
                    <div className="flex flex-col">
                      <span className="font-black text-xs">{period.name}</span>
                      {period.start && period.end && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {period.start} - {period.end}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Teachers Columns */}
                  {(teachers || []).map(t => {
                    const assignment = (assignments || []).find(a => {
                      if (!a || a.day !== selectedDay || a.teacherId !== t.id) return false;
                      const aNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
                      return aNorm.toLowerCase() === pNorm.toLowerCase();
                    });

                    const isSelectedForSwap =
                      swapSource?.day === selectedDay &&
                      swapSource?.period.toLowerCase() === pNorm.toLowerCase() &&
                      swapSource?.teacherId === t.id;

                    const subColor = assignment ? getSubjectColor(assignment.subject) : null;

                    return (
                      <td
                        key={`${selectedDay}-${period.name}-${t.id}`}
                        onClick={() => {
                          if (quickSwapActive) {
                            handleCellClick(selectedDay, pNorm, t.id);
                          }
                        }}
                        className={`p-1.5 border-r border-slate-200 transition-all ${
                          isSelectedForSwap
                            ? 'bg-amber-200 ring-2 ring-amber-500 ring-inset'
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
                                : assignment
                                ? 'bg-slate-50 border-slate-300 hover:border-amber-400'
                                : 'bg-white border-dashed border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            {assignment ? (
                              <>
                                <div className="font-black text-xs text-slate-900 truncate">
                                  {assignment.subject}
                                </div>
                                <div className="text-[10px] font-bold text-blue-700 truncate">
                                  {assignment.className} ({assignment.stream})
                                </div>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold">— Bure (Swap)</span>
                            )}
                          </div>
                        ) : (
                          // In Normal mode, allow editing or selecting class
                          <div className="space-y-1">
                            {assignment && (
                              <div
                                className="px-2 py-1 rounded text-[10px] font-black text-center truncate border"
                                style={{
                                  backgroundColor: subColor?.bg || '#f1f5f9',
                                  borderColor: subColor?.border || '#cbd5e1'
                                }}
                                title={`${assignment.subject} (${assignment.className} ${assignment.stream})`}
                              >
                                {assignment.subject}
                              </div>
                            )}

                            <select
                              value={assignment?.className || ''}
                              onChange={e => handleClassAssignmentChange(selectedDay, pNorm, t.id, e.target.value)}
                              className="w-full px-1.5 py-1 text-[11px] font-bold border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              title="Panga darasa kwa mwalimu huyu"
                            >
                              <option value="">-- Hakuna --</option>
                              {(classes && classes.length > 0 ? classes : ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6']).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
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
