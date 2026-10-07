import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  X, 
  Check, 
  Layers, 
  GraduationCap, 
  Sparkles, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Clock, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  A_LEVEL_SUBJECT_PAPERS, 
  O_LEVEL_SUBJECT_PAPERS, 
  SubjectPaperDefinition, 
  PaperDetail 
} from '../../utils/subjectPapers';

interface SubjectPaperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPaperForDoc?: (subjectName: string, paper: PaperDetail, level: string) => void;
}

export const SubjectPaperConfigModal: React.FC<SubjectPaperConfigModalProps> = ({
  isOpen,
  onClose,
  onSelectPaperForDoc
}) => {
  if (!isOpen) return null;

  const [activeLevelTab, setActiveLevelTab] = useState<'A-Level' | 'O-Level'>('A-Level');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaperCount, setFilterPaperCount] = useState<'ALL' | '1' | '2' | '3'>('ALL');

  // Local state for custom edits
  const [subjectDefinitions, setSubjectDefinitions] = useState<SubjectPaperDefinition[]>(() => {
    return [...A_LEVEL_SUBJECT_PAPERS, ...O_LEVEL_SUBJECT_PAPERS];
  });

  const [editingSubjectCode, setEditingSubjectCode] = useState<string | null>(null);

  // Filtered definitions
  const displayedSubjects = useMemo(() => {
    return subjectDefinitions.filter(s => {
      const matchLevel = s.level === activeLevelTab;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const matchCount = filterPaperCount === 'ALL' || String(s.paperCount) === filterPaperCount;
      return matchLevel && matchSearch && matchCount;
    });
  }, [subjectDefinitions, activeLevelTab, searchQuery, filterPaperCount]);

  const stats = useMemo(() => {
    const list = subjectDefinitions.filter(s => s.level === activeLevelTab);
    return {
      total: list.length,
      threePapers: list.filter(s => s.paperCount === 3).length,
      twoPapers: list.filter(s => s.paperCount === 2).length,
      onePaper: list.filter(s => s.paperCount === 1).length
    };
  }, [subjectDefinitions, activeLevelTab]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 border-b border-blue-800/50 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                Examination Paper Manager
              </span>
              <span className="text-xs text-blue-200 font-semibold">
                NECTA National Format Standard
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-300" />
              <span>Subject Exam Papers Matrix (Paper 1, Paper 2 &amp; Paper 3)</span>
            </h2>
            <p className="text-xs text-blue-100/90">
              Configure 3-Paper Science subjects for A-Level, 2-Paper subjects for O-Level/A-Level, and single paper subsidiaries.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Tabs & Filter Strip */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Level Toggle Tabs */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveLevelTab('A-Level')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeLevelTab === 'A-Level'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                <span>Advance Level (A-Level / Form 5 &amp; 6)</span>
                <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px]">
                  {subjectDefinitions.filter(s => s.level === 'A-Level').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLevelTab('O-Level')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeLevelTab === 'O-Level'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                <span>O-Level / CSEE (Form 1 - Form 4)</span>
                <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px]">
                  {subjectDefinitions.filter(s => s.level === 'O-Level').length}
                </span>
              </button>
            </div>

            {/* Quick Stat Badges */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg border border-purple-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                3-Paper Subjects ({stats.threePapers})
              </span>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg border border-blue-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                2-Paper Subjects ({stats.twoPapers})
              </span>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                1-Paper ({stats.onePaper})
              </span>
            </div>
          </div>

          {/* Search & Paper Count Filter */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subject by name or NECTA code (e.g. Physics, 131, Chemistry)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500">Filter Papers:</span>
              <select
                value={filterPaperCount}
                onChange={e => setFilterPaperCount(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Paper Formats</option>
                <option value="3">3 Papers (Paper 1, Paper 2 &amp; Paper 3)</option>
                <option value="2">2 Papers (Paper 1 &amp; Paper 2)</option>
                <option value="1">1 Paper (Single Paper)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area - Subject Papers List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-100/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedSubjects.map(sub => (
              <div 
                key={`${sub.level}_${sub.code}_${sub.name}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
              >
                {/* Subject Name & Header Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-sm">{sub.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Code: {sub.code}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {sub.level} Curriculum Format
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    sub.paperCount === 3
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : sub.paperCount === 2
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {sub.paperCount} Exam {sub.paperCount === 1 ? 'Paper' : 'Papers'}
                  </span>
                </div>

                {/* Papers Detail List */}
                <div className="space-y-2">
                  {sub.papers.map(p => (
                    <div 
                      key={p.paperNumber}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 bg-blue-700 text-white rounded text-[10px] font-black">
                            P{p.paperNumber}
                          </span>
                          <span className="font-bold text-slate-900">{p.paperName}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            ({p.codeSuffix})
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-[10px] text-slate-500 font-medium leading-tight pl-6">
                            {p.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {p.durationMinutes / 60} hrs
                        </span>

                        {onSelectPaperForDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPaperForDoc(sub.name, p, sub.level);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Select this paper for Exam Documents (Photo Entry Form, Seating Plan)"
                          >
                            Use Paper
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {displayedSubjects.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-bold text-xs bg-white rounded-2xl border border-dashed border-slate-300">
              No subject paper definitions found matching "{searchQuery}".
            </div>
          )}
        </div>

        {/* Footer info & close */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Preset papers comply with NECTA National Examination Council guidelines.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer shadow-2xs"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
};
