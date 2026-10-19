import React, { useState, useMemo } from 'react';
import { ExaminationRecord, SchoolInfo } from '../../types';
import { Archive, Search, Calendar, Filter } from 'lucide-react';

interface ExamArchiveViewProps {
  examinationRecords: ExaminationRecord[];
  schoolInfo: SchoolInfo;
}

export const ExamArchiveView: React.FC<ExamArchiveViewProps> = ({ examinationRecords, schoolInfo }) => {
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [termFilter, setTermFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const years = useMemo(() => {
    const y = new Set(examinationRecords.map(r => r.academicYear || ''));
    return Array.from(y).sort().reverse();
  }, [examinationRecords]);

  const filteredRecords = useMemo(() => {
    return examinationRecords.filter(r => {
      const matchYear = yearFilter === 'All' || r.academicYear === yearFilter;
      const matchTerm = termFilter === 'All' || r.term === termFilter;
      const matchSearch = !searchQuery.trim() || 
        r.examType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.className.toLowerCase().includes(searchQuery.toLowerCase());
      return matchYear && matchTerm && matchSearch;
    });
  }, [examinationRecords, yearFilter, termFilter, searchQuery]);

  const groupedRecords = useMemo(() => {
    const groups: Record<string, {
      id: string;
      examType: string;
      academicYear: string;
      term: string;
      className: string;
      records: ExaminationRecord[];
    }> = {};

    filteredRecords.forEach(r => {
      const key = `${r.academicYear}-${r.term}-${r.examType}-${r.className}`;
      if (!groups[key]) {
        groups[key] = {
          id: r.id,
          examType: r.examType,
          academicYear: r.academicYear || '',
          term: r.term || '',
          className: r.className,
          records: []
        };
      }
      groups[key].records.push(r);
    });
    return Object.values(groups);
  }, [filteredRecords]);

  const calculateProgress = (records: ExaminationRecord[]) => {
    if (records.length === 0) return { percent: 0, subjects: {} };
    
    const subjectMap: Record<string, { total: number; marked: number }> = {};
    records.forEach(r => {
      Object.keys(r.subjects || {}).forEach(sub => {
        if (!subjectMap[sub]) subjectMap[sub] = { total: 0, marked: 0 };
        subjectMap[sub].total++;
        if (r.subjects[sub].marks !== undefined && r.subjects[sub].marks !== null) {
          subjectMap[sub].marked++;
        }
      });
    });

    const percent = Object.values(subjectMap).reduce((acc, s) => acc + (s.marked / s.total), 0) / (Object.keys(subjectMap).length || 1) * 100;
    return { percent, subjectMap };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
          <Archive className="w-5 h-5 text-indigo-600" />
          Exam Archive Browser
        </h2>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">Year</label>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
              <option value="All">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">Term</label>
            <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
              <option value="All">All Terms</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div className="flex-[2] min-w-[300px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search exam or class..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-bold text-slate-600">Exam Session</th>
              <th className="p-4 font-bold text-slate-600">Marking Progress</th>
              <th className="p-4 font-bold text-slate-600">Candidates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedRecords.map(g => {
              const { percent } = calculateProgress(g.records);
              return (
                <tr key={g.id}>
                  <td className="p-4">
                    <div className="font-black text-slate-900">{g.examType} ({g.academicYear} - {g.term})</div>
                    <div className="text-xs text-slate-500">{g.className}</div>
                  </td>
                  <td className="p-4 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{Math.round(percent)}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{g.records.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
