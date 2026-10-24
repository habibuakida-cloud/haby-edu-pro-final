import React, { useState, useMemo } from 'react';
import { TimetableAssignment, Teacher, PeriodSetting, StreamSetting } from '../../types';
import { DAYS_OF_WEEK, DEFAULT_CLASSES } from '../../constants/defaults';
import { getSubjectColor, getSubjectShortName } from '../../utils/colors';
import { Calendar, Clock, Layers, User, MapPin, Lock } from 'lucide-react';
import { isSameClass } from '../../utils/reportCardUtils';
import { isSameStream, isSamePeriod, getConfiguredDays } from '../../lib/timetableService';

interface GraphicalTimetableGridProps {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  selectedClass?: string;
  selectedStream?: string;
}

export const GraphicalTimetableGrid: React.FC<GraphicalTimetableGridProps> = ({
  assignments,
  teachers,
  periodSettings,
  streamSettings,
  selectedClass = 'Form 1',
  selectedStream = 'STREAM A',
}) => {
  const [activeClass, setActiveClass] = useState<string>(selectedClass);
  const [activeStream, setActiveStream] = useState<string>(selectedStream);

  const availableStreams = useMemo(() => {
    const fromSettings = (streamSettings || [])
      .filter(s => s && isSameClass(s.className, activeClass))
      .flatMap(s => s.streams || []);
    if (fromSettings.length > 0) return fromSettings;

    const fromAssignments = Array.from(
      new Set(
        (assignments || [])
          .filter(a => a && isSameClass(a.className, activeClass) && a.stream)
          .map(a => a.stream)
      )
    );
    if (fromAssignments.length > 0) return fromAssignments;

    return ['STREAM A', 'STREAM B'];
  }, [streamSettings, assignments, activeClass]);

  // Ensure activeStream is valid
  React.useEffect(() => {
    if (availableStreams.length > 0 && !availableStreams.includes(activeStream)) {
      setActiveStream(availableStreams[0]);
    }
  }, [availableStreams, activeStream]);

  const configuredDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter(
      a => a && a.subject && isSameClass(a.className, activeClass) && isSameStream(a.stream, activeStream)
    );
  }, [assignments, activeClass, activeStream]);

  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    const hrs = isNaN(parts[0]) ? 0 : parts[0];
    const mins = isNaN(parts[1]) ? 0 : parts[1];
    return hrs * 60 + mins;
  };

  const sortedPeriods = useMemo(() => {
    const list = (periodSettings || []).filter(
      p => !p.className || isSameClass(p.className, activeClass) || p.className === 'All Classes'
    );
    // Unique by name
    const uniqueMap = new Map<string, PeriodSetting>();
    list.forEach(p => {
      const trimmed = (p.name || '').trim();
      if (trimmed && !uniqueMap.has(trimmed)) {
        uniqueMap.set(trimmed, p);
      }
    });

    return Array.from(uniqueMap.values()).sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );
  }, [periodSettings, activeClass]);

  const teacherMap = useMemo(() => {
    const map = new Map<number | string, Teacher>();
    (teachers || []).forEach(t => {
      if (t && t.id !== undefined) map.set(t.id, t);
    });
    return map;
  }, [teachers]);

  const findAssignment = (day: string, period: PeriodSetting) => {
    const normDay = (day || '').trim().toLowerCase();
    return filteredAssignments.find(a => {
      if (!a || (a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, period.name);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6">
      {/* Top Controls & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Mwonekano wa Grafu (Visual Timetable Matrix)
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Jedwali la picha la vipindi vya wiki nzima kulingana na darasa na mkondo uliochaguliwa.
          </p>
        </div>

        {/* Class and Stream Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-600 uppercase text-[11px]">Darasa:</span>
            <select
              value={activeClass}
              onChange={e => setActiveClass(e.target.value)}
              className="font-bold bg-transparent text-slate-900 focus:outline-hidden cursor-pointer"
            >
              {DEFAULT_CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-bold text-slate-600 uppercase text-[11px]">Mkondo:</span>
            <select
              value={activeStream}
              onChange={e => setActiveStream(e.target.value)}
              className="font-bold bg-transparent text-slate-900 focus:outline-hidden cursor-pointer"
            >
              {availableStreams.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div
          style={{
            gridTemplateColumns: `130px repeat(${configuredDays.length}, minmax(130px, 1fr))`
          }}
          className="grid gap-2 min-w-[760px]"
        >
          {/* Header row: Corner cell + Days */}
          <div className="font-black text-slate-700 text-xs p-3 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
            Kipindi / Saa
          </div>
          {configuredDays.map(day => (
            <div
              key={day}
              className="font-black text-slate-900 text-xs text-center p-3 bg-slate-50 rounded-xl uppercase tracking-wider border border-slate-200"
            >
              {day}
            </div>
          ))}

          {/* Body Rows: One row per period */}
          {sortedPeriods.length === 0 ? (
            <div className="col-span-6 p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Hakuna vipindi vilivyosanidiwa kwa sasa. Tafadhali weka vipindi kwenye Mipangilio ya Vipindi &amp; Saa.
            </div>
          ) : (
            sortedPeriods.map(period => (
              <React.Fragment key={period.id}>
                {/* Period Time Card */}
                <div className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl flex flex-col justify-center border border-slate-200 text-center">
                  <span className="truncate">{period.name}</span>
                  {period.start && period.end && (
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-flex items-center justify-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      {period.start} - {period.end}
                    </span>
                  )}
                </div>

                {/* Day Slot Cells */}
                {configuredDays.map(day => {
                  const assignment = findAssignment(day, period);
                  const teacher = assignment?.teacherId ? teacherMap.get(assignment.teacherId) : null;
                  const isBreak =
                    period.name.toLowerCase().includes('break') ||
                    period.name.toLowerCase().includes('lunch') ||
                    period.name.toLowerCase().includes('chakula') ||
                    period.name.toLowerCase().includes('mapumziko') ||
                    period.name.toLowerCase().includes('tea');

                  const isSpecialActivity = (period.isLocked || period.locked) && (
                    period.name.toLowerCase().includes('test') ||
                    period.name.toLowerCase().includes('environmental') ||
                    period.name.toLowerCase().includes('debate') ||
                    period.name.toLowerCase().includes('michezo') ||
                    period.name.toLowerCase().includes('baraza') ||
                    period.name.toLowerCase().includes('assembly') ||
                    period.name.toLowerCase().includes('religion') ||
                    period.name.toLowerCase().includes('praising')
                  );

                  if (isBreak || isSpecialActivity) {
                    return (
                      <div
                        key={`${day}-${period.id}`}
                        className={`${
                          isBreak ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                        } border rounded-xl p-2 min-h-[80px] flex flex-col items-center justify-center text-center`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider leading-tight">
                          {period.name}
                        </span>
                        {isSpecialActivity && (
                          <div className="mt-1 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-indigo-400" />
                            <span className="text-[8px] font-bold uppercase text-indigo-400">Locked Activity</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const subColor = assignment
                    ? getSubjectColor(assignment.subject)
                    : { bg: '#ffffff', border: '#e2e8f0', text: '#64748b' };

                  return (
                    <div
                      key={`${day}-${period.id}`}
                      style={{
                        backgroundColor: assignment ? subColor.bg : '#fafafa',
                        borderColor: assignment ? subColor.border : '#e2e8f0'
                      }}
                      className="border rounded-xl p-2.5 min-h-[80px] flex flex-col justify-between transition hover:shadow-xs"
                    >
                      {assignment ? (
                        <>
                          <div className="space-y-0.5">
                            <span
                              style={{ color: subColor.text }}
                              className="font-black text-xs block leading-tight truncate flex items-center gap-1"
                              title={assignment.subject}
                            >
                              {getSubjectShortName(assignment.subject)}
                              {assignment.isLocked && <Lock className="w-2.5 h-2.5 shrink-0" />}
                            </span>
                            <div className="text-[10px] font-bold text-slate-800 truncate">
                              {assignment.className.replace('Form ', '').replace('Standard ', '')}
                              {assignment.stream ? assignment.stream.replace('STREAM ', '') : ''}
                            </div>
                            {assignment.room && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 font-mono">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {assignment.room}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-black/5 mt-1">
                            <span className="text-[10px] font-bold text-slate-700 truncate flex items-center gap-1">
                              <User className="w-2.5 h-2.5 text-slate-400" />
                              {teacher?.name ? teacher.name.split(' ')[0] : teacher?.initial || 'Tr.'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-300 text-[10px] select-none font-medium">
                          —
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
