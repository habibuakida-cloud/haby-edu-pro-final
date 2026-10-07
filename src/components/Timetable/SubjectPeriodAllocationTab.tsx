import React, { useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Filter,
  GraduationCap
} from 'lucide-react';
import { SubjectPeriodAllocation, StreamSetting } from '../../types';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../../constants/defaults';

interface SubjectPeriodAllocationTabProps {
  allocations: SubjectPeriodAllocation[];
  streamSettings?: StreamSetting[];
  onUpdateAllocations: (allocations: SubjectPeriodAllocation[]) => void;
}

export const SubjectPeriodAllocationTab: React.FC<SubjectPeriodAllocationTabProps> = ({
  allocations,
  streamSettings,
  onUpdateAllocations
}) => {
  const [localAllocations, setLocalAllocations] = useState<SubjectPeriodAllocation[]>(allocations);
  const [activeLevel, setActiveLevel] = useState<'NURSERY' | 'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [savedToast, setSavedToast] = useState(false);

  // New allocation input states
  const [newClass, setNewClass] = useState<string>('Form 1');
  const [newStream, setNewStream] = useState<string>('ALL_STREAMS');
  const [newSubject, setNewSubject] = useState<string>('Mathematics');
  const [newPeriods, setNewPeriods] = useState<number>(5);

  const levelClasses = 
    activeLevel === 'NURSERY' ? NURSERY_CLASSES :
    activeLevel === 'PRIMARY' ? PRIMARY_CLASSES : SECONDARY_CLASSES;

  const filteredAllocations = localAllocations.filter(a => {
    if (a.level !== activeLevel) return false;
    if (selectedClassFilter !== 'All' && a.className !== selectedClassFilter) return false;
    return true;
  });

  const handleAddAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const newAlloc: SubjectPeriodAllocation = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      level: activeLevel,
      className: newClass,
      stream: newStream,
      subject: newSubject.trim(),
      subjectName: newSubject.trim(),
      periodsPerWeek: Number(newPeriods)
    };

    const next = [...localAllocations, newAlloc];
    setLocalAllocations(next);
    setNewSubject('');
  };

  const handleDeleteAllocation = (id: string) => {
    const next = localAllocations.filter(a => a.id !== id);
    setLocalAllocations(next);
  };

  const handlePeriodChange = (id: string, val: number) => {
    const next = localAllocations.map(a => a.id === id ? { ...a, periodsPerWeek: val } : a);
    setLocalAllocations(next);
  };

  const handleSaveAll = () => {
    onUpdateAllocations(localAllocations);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1f4d8b] to-blue-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">Subject Period Allocations</h2>
            <p className="text-xs text-blue-200">
              Configure weekly periods per subject across Nursery, Primary, and Secondary academic levels
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] w-fit"
        >
          <Save className="w-4 h-4" />
          <span>Save Allocations</span>
        </button>
      </div>

      {savedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">Subject period allocations successfully saved to database!</span>
        </div>
      )}

      {/* Level Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
          {(
            [
              { id: 'NURSERY', label: 'NURSERY LEVEL', desc: 'Pre-Primary' },
              { id: 'PRIMARY', label: 'PRIMARY LEVEL', desc: 'Standard 1 - 7' },
              { id: 'SECONDARY', label: 'SECONDARY LEVEL', desc: 'Form 1 - 6' }
            ] as const
          ).map(lvl => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => {
                setActiveLevel(lvl.id);
                setSelectedClassFilter('All');
                if (lvl.id === 'NURSERY') {
                  setNewClass('Baby Class');
                  setNewSubject('Numeracy');
                } else if (lvl.id === 'PRIMARY') {
                  setNewClass('Standard 1');
                  setNewSubject('Mathematics');
                } else {
                  setNewClass('Form 1');
                  setNewSubject('Mathematics');
                }
              }}
              className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                activeLevel === lvl.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div>{lvl.label}</div>
            </button>
          ))}
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-600">Class Filter:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="All">All {activeLevel} Classes</option>
            {levelClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add New Allocation Bar */}
      <form onSubmit={handleAddAllocation} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
            Class
          </label>
          <select
            value={newClass}
            onChange={(e) => setNewClass(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            {levelClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
            Stream
          </label>
          <select
            value={newStream}
            onChange={(e) => setNewStream(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL_STREAMS">All Streams for this Class</option>
            <option value="STREAM A">STREAM A</option>
            <option value="STREAM B">STREAM B</option>
            <option value="STREAM C">STREAM C</option>
          </select>
        </div>

        <div className="flex-2 min-w-[180px]">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
            Subject
          </label>
          <input
            type="text"
            required
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
            placeholder="Subject title..."
          />
        </div>

        <div className="w-28">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
            Periods/Week
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={newPeriods}
            onChange={(e) => setNewPeriods(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none text-center"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Allocation</span>
        </button>
      </form>

      {/* Allocation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-black text-slate-900 text-xs uppercase tracking-wider">
            Subjects & Weekly Periods for {activeLevel} ({filteredAllocations.length} records)
          </span>
          <span className="text-xs text-slate-500 font-medium">Standard 40 minutes per period</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Level</th>
                <th className="p-3">Class</th>
                <th className="p-3">Stream</th>
                <th className="p-3">Subject</th>
                <th className="p-3 text-center w-36">Periods / Week</th>
                <th className="p-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No subject period allocations defined for this level. Use the form above to add allocations.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        item.level === 'NURSERY' 
                          ? 'bg-amber-100 text-amber-800' 
                          : item.level === 'PRIMARY' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.level}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{item.className}</td>
                    <td className="p-3 text-slate-600">{item.stream}</td>
                    <td className="p-3 font-bold text-slate-900">{item.subjectName}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={item.periodsPerWeek}
                        onChange={(e) => handlePeriodChange(item.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteAllocation(item.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Allocation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
