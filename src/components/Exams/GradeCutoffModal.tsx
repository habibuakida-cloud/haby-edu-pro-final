import React, { useState } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Award, 
  Sliders, 
  CheckCircle2, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { 
  NECTA_SFNA_POLICY, 
  NECTA_PSLE_POLICY, 
  NECTA_FTNA_POLICY, 
  NECTA_CSEE_POLICY, 
  NECTA_ACSEE_POLICY, 
  NectaLevelPolicy 
} from '../../utils/nectaRules';

interface GradeCutoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedExamName: string;
  selectedClassName: string;
  onSaveCutoffs: (policy: any) => void;
}

export const GradeCutoffModal: React.FC<GradeCutoffModalProps> = ({
  isOpen,
  onClose,
  selectedExamName,
  selectedClassName,
  onSaveCutoffs
}) => {
  const [selectedStandard, setSelectedStandard] = useState<'CSEE' | 'FTNA' | 'SFNA' | 'PSLE' | 'ACSEE'>(() => {
    const c = selectedClassName.toLowerCase();
    if (c.includes('standard 4') || c.includes('std 4')) return 'SFNA';
    if (c.includes('standard 7') || c.includes('std 7')) return 'PSLE';
    if (c.includes('form 2')) return 'FTNA';
    if (c.includes('form 5') || c.includes('form 6')) return 'ACSEE';
    return 'CSEE';
  });

  const getPolicyByStandard = (std: string): NectaLevelPolicy => {
    switch (std) {
      case 'SFNA': return NECTA_SFNA_POLICY;
      case 'PSLE': return NECTA_PSLE_POLICY;
      case 'FTNA': return NECTA_FTNA_POLICY;
      case 'ACSEE': return NECTA_ACSEE_POLICY;
      default: return NECTA_CSEE_POLICY;
    }
  };

  const [activePolicy, setActivePolicy] = useState<NectaLevelPolicy>(getPolicyByStandard(selectedStandard));
  const [toast, setToast] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (std: 'CSEE' | 'FTNA' | 'SFNA' | 'PSLE' | 'ACSEE') => {
    setSelectedStandard(std);
    setActivePolicy(getPolicyByStandard(std));
  };

  const handleThresholdChange = (index: number, field: 'min' | 'max' | 'remark', value: string | number) => {
    const nextGrades = [...activePolicy.grades];
    nextGrades[index] = {
      ...nextGrades[index],
      [field]: field === 'remark' ? value : Number(value) || 0
    };
    setActivePolicy({
      ...activePolicy,
      grades: nextGrades
    });
  };

  const handleSave = () => {
    onSaveCutoffs(activePolicy);
    setToast(true);
    setTimeout(() => {
      setToast(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f4d8b] to-blue-900 text-white p-5 flex items-center justify-between border-b border-blue-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Examination Cutoff & Grading Settings</h2>
              <p className="text-xs text-blue-200">
                Configure grade cutoffs, NECTA division points, and passing criteria for {selectedExamName} ({selectedClassName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700">Official NECTA Standards:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'SFNA', label: 'Std IV (SFNA)' },
              { id: 'PSLE', label: 'Std VII (PSLE)' },
              { id: 'FTNA', label: 'Form II (FTNA)' },
              { id: 'CSEE', label: 'Form IV (CSEE)' },
              { id: 'ACSEE', label: 'Form VI (ACSEE)' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  selectedStandard === p.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {toast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Grading cutoffs updated successfully!</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
            <strong>Active Standard:</strong> {activePolicy.title} &bull; {activePolicy.description}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Grade</th>
                  <th className="p-3 text-center w-28">Min Score (%)</th>
                  <th className="p-3 text-center w-28">Max Score (%)</th>
                  <th className="p-3 text-center w-20">Points</th>
                  <th className="p-3">NECTA Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {activePolicy.grades.map((g, idx) => (
                  <tr key={g.grade} className="hover:bg-slate-50">
                    <td className="p-3 font-black text-sm">
                      <span className="px-2 py-0.5 rounded font-black text-xs" style={{ backgroundColor: g.badgeBg, color: g.color }}>
                        {g.grade}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={g.min}
                        onChange={(e) => handleThresholdChange(idx, 'min', e.target.value)}
                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={g.max}
                        onChange={(e) => handleThresholdChange(idx, 'max', e.target.value)}
                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      {g.points} pt{g.points > 1 ? 's' : ''}
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={g.remark}
                        onChange={(e) => handleThresholdChange(idx, 'remark', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activePolicy.divisionCriteria && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-700">NECTA Division Criteria Points:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-emerald-700">DIV I</span>
                  <span className="text-[11px] text-slate-500">7 - 17 pts</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-blue-700">DIV II</span>
                  <span className="text-[11px] text-slate-500">18 - 21 pts</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-amber-700">DIV III</span>
                  <span className="text-[11px] text-slate-500">22 - 25 pts</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-orange-700">DIV IV</span>
                  <span className="text-[11px] text-slate-500">26 - 33 pts</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-rose-700">DIV 0</span>
                  <span className="text-[11px] text-slate-500">34 - 35 pts</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActivePolicy(getPolicyByStandard(selectedStandard))}
            className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Save Cutoffs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
