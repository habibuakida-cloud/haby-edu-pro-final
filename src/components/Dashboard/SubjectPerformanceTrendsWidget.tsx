import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ExaminationRecord } from '../../types';

interface SubjectPerformanceTrendsWidgetProps {
  examinationRecords: ExaminationRecord[];
}

export const SubjectPerformanceTrendsWidget: React.FC<SubjectPerformanceTrendsWidgetProps> = ({ examinationRecords }) => {
  const allSubjects = useMemo(() => {
    const subs = new Set<string>();
    examinationRecords.forEach(r => Object.keys(r.subjects).forEach(s => subs.add(s)));
    return Array.from(subs).sort();
  }, [examinationRecords]);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Initialize selected subjects when data changes
  React.useEffect(() => {
    if (selectedSubjects.length === 0 && allSubjects.length > 0) {
      setSelectedSubjects(allSubjects.slice(0, 5)); // Default to first 5
    }
  }, [allSubjects]);

  const chartData = useMemo(() => {
    const aggregation: Record<string, Record<string, { totalMarks: number; count: number }>> = {};

    examinationRecords.forEach(record => {
      const period = `${record.academicYear}-${record.term}`;
      if (!aggregation[period]) {
        aggregation[period] = {};
      }

      Object.entries(record.subjects).forEach(([subject, info]) => {
        if (!aggregation[period][subject]) {
          aggregation[period][subject] = { totalMarks: 0, count: 0 };
        }
        const numericMarks = typeof info.marks === 'number' ? info.marks : 0;
        aggregation[period][subject].totalMarks += numericMarks;
        aggregation[period][subject].count += 1;
      });
    });

    return Object.entries(aggregation).map(([period, subjects]) => {
      const dataPoint: Record<string, any> = { name: period };
      Object.entries(subjects).forEach(([subject, { totalMarks, count }]) => {
        dataPoint[subject] = parseFloat((totalMarks / count).toFixed(2));
      });
      return dataPoint;
    });
  }, [examinationRecords]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
        <h3 className="text-base font-black text-slate-900">Subject Performance Trends</h3>
        <p className="text-xs text-slate-500 mt-2">No examination data available for trend analysis.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-black text-slate-900">Subject Performance Trends</h3>
          <div className="flex flex-wrap gap-2">
            {allSubjects.map(sub => (
              <button
                key={sub}
                onClick={() => toggleSubject(sub)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedSubjects.includes(sub) 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {selectedSubjects.map((sub, index) => (
                        <Line key={sub} type="monotone" dataKey={sub} stroke={`hsl(${(index * 60) % 360}, 70%, 50%)`} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};
