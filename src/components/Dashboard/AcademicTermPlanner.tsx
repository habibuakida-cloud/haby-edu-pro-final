import React, { useMemo } from 'react';
import { AcademicTermDates } from '../../types';
import { differenceInDays, format, isBefore, isAfter, startOfDay } from 'date-fns';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface AcademicTermPlannerProps {
  termDates?: AcademicTermDates;
}

export const AcademicTermPlanner: React.FC<AcademicTermPlannerProps> = ({ termDates }) => {
  const today = startOfDay(new Date());

  const plannerData = useMemo(() => {
    if (!termDates) return null;

    // This is a simplified logic. In a real app, this would be more complex based on curriculum.
    const terms = [
      { name: 'Term 1', start: termDates.yearOpeningDate, end: termDates.terminalBreakStart },
      { name: 'Term 2', start: termDates.terminalBreakEnd, end: termDates.annualBreakStart },
    ].filter(t => t.start && t.end);

    return terms.map(term => {
      const startDate = new Date(term.start!);
      const endDate = new Date(term.end!);
      const totalDays = differenceInDays(endDate, startDate);
      const passedDays = differenceInDays(today, startDate);
      const progress = Math.min(Math.max((passedDays / totalDays) * 100, 0), 100);
      const remainingDays = Math.max(differenceInDays(endDate, today), 0);

      return {
        ...term,
        totalDays,
        passedDays: Math.min(Math.max(passedDays, 0), totalDays),
        remainingDays,
        progress,
        isActive: isBefore(today, endDate) && isAfter(today, startDate)
      };
    });
  }, [termDates, today]);

  if (!plannerData || plannerData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">No Term Data</h3>
        <p className="text-xs text-slate-500 mt-1">Academic term dates have not been configured.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Academic Term Planner</h3>
          <p className="text-xs text-slate-500">Visualization of current term progress.</p>
        </div>
      </div>

      <div className="space-y-4">
        {plannerData.map((term, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={term.isActive ? 'text-indigo-700' : 'text-slate-600'}>
                {term.name} {term.isActive && '(Active)'}
              </span>
              <span className="text-slate-500">{term.remainingDays} days remaining</span>
            </div>
            
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${term.isActive ? 'bg-indigo-600' : 'bg-slate-400'}`}
                style={{ width: `${term.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>{format(new Date(term.start!), 'MMM dd')}</span>
                <span>{format(new Date(term.end!), 'MMM dd')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
