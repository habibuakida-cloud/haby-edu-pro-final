import React, { useState, useMemo } from 'react';
import { FileText, Search, Download, BookOpen, AlertCircle } from 'lucide-react';
import { PastPaper } from '../../types'; // Assuming PastPaper type is added here

interface PastPaperCenterProps {
  pastPapers: PastPaper[];
  schoolId?: string;
}

export const PastPaperCenter: React.FC<PastPaperCenterProps> = ({ pastPapers, schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  const filteredPapers = useMemo(() => {
    return pastPapers.filter(paper => {
      const matchesSearch = paper.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            paper.year.toString().includes(searchTerm);
      const matchesLevel = levelFilter === 'ALL' || paper.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [pastPapers, searchTerm, levelFilter]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
          <BookOpen className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Past Paper Center</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by subject or year..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="ALL">All Levels</option>
          <option value="PSLE">PSLE</option>
          <option value="CSEE">CSEE</option>
          <option value="ACSEE">ACSEE</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPapers.map(paper => (
          <div key={paper.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm">{paper.subjectName} - {paper.year}</h4>
              <p className="text-xs text-slate-500">{paper.level} | {paper.examType} | {paper.paperType}</p>
            </div>
            <div className="flex gap-2">
              <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
                <Download className="w-3 h-3" /> Paper
              </a>
              {paper.markingSchemeUrl && (
                <a href={paper.markingSchemeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold">
                  <Download className="w-3 h-3" /> Scheme
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
