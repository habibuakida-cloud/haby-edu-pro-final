import React, { useState, useMemo } from 'react';
import { TimetableAssignment, Teacher, PeriodSetting, StreamSetting } from '../../types';
import { DAYS_OF_WEEK } from '../../constants/defaults';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';

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
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => 
      a.className === selectedClass && 
      a.stream === selectedStream
    );
  }, [assignments, selectedClass, selectedStream]);

  const sortedPeriods = useMemo(() => {
    return (periodSettings || [])
      .filter(p => !p.className || p.className === selectedClass || p.className === 'All Classes')
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  }, [periodSettings, selectedClass]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">
        Ratiba ya {selectedClass} - {selectedStream}
      </h2>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 min-w-[800px]">
          {/* Header */}
          <div className="font-bold text-slate-400 text-xs p-2">Siku / Muda</div>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="font-black text-slate-900 text-xs text-center p-2 bg-slate-50 rounded-lg uppercase tracking-wider">
              {day.substring(0, 3)}
            </div>
          ))}

          {/* Body */}
          {sortedPeriods.map(period => (
            <React.Fragment key={period.id}>
              <div className="text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-lg flex flex-col justify-center">
                <span>{period.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{period.start || ''}-{period.end || ''}</span>
              </div>
              
              {DAYS_OF_WEEK.map(day => {
                const assignment = filteredAssignments.find(
                  a => a.day === day && a.period === period.name
                );
                const teacher = assignment?.teacherId ? teachers.find(t => t.id === assignment.teacherId) : null;
                const subColor = assignment ? getSubjectColor(assignment.subject) : { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' };

                return (
                  <div 
                    key={`${day}-${period.id}`}
                    style={{ backgroundColor: subColor.bg, borderColor: subColor.border }}
                    className="border p-2 rounded-xl h-24 flex flex-col justify-between transition-all hover:scale-105"
                  >
                    {assignment ? (
                      <>
                        <span style={{ color: subColor.text }} className="font-black text-xs truncate leading-tight">
                          {assignment.subject}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-white/70 px-1.5 py-0.5 rounded font-bold">{teacher?.initial || '?'}</span>
                          <span className="text-[10px] font-mono text-slate-500">{assignment.room}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-300 text-[10px] italic flex items-center justify-center h-full">-</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
