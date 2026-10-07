import React, { useState, useMemo } from 'react';
import { 
  X, 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Filter, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Save, 
  ChevronRight, 
  RotateCcw,
  Check,
  TrendingUp,
  Award,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Student, SchoolInfo, PromotionHistory, EducationLevel } from '../../types';
import { 
  SECONDARY_CLASSES, 
  PRIMARY_CLASSES, 
  NURSERY_CLASSES 
} from '../../constants/defaults';
import { getNextLogicalClass, inferEducationLevel } from '../../utils/classStreamUtils';

export interface BulkPromotionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolInfo?: SchoolInfo;
  onExecutePromotion: (promotedStudents: Student[], historyLogs: PromotionHistory[]) => void;
}

export const BulkPromotionWizard: React.FC<BulkPromotionWizardProps> = ({
  isOpen,
  onClose,
  students,
  schoolInfo,
  onExecutePromotion
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Source & Criteria
  const [sourceClass, setSourceClass] = useState<string>('Form 1');
  const [sourceStream, setSourceStream] = useState<string>('ALL');
  const [promotionMode, setPromotionMode] = useState<'results' | 'manual'>('results');
  const [minPassAverage, setMinPassAverage] = useState<number>(45);
  const [minDivision, setMinDivision] = useState<string>('Division III');

  // Step 2: Target Class & Stream
  const [targetClass, setTargetClass] = useState<string>(() => {
    return getNextLogicalClass('Form 1');
  });
  const [targetStreamRule, setTargetStreamRule] = useState<'keep_same' | 'specific' | 'stream_a'>('keep_same');
  const [specificTargetStream, setSpecificTargetStream] = useState<string>('STREAM A');
  const [targetAcademicYear, setTargetAcademicYear] = useState<string>('2027');

  // Selected Student IDs for Promotion
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Filter students in the source class and stream
  const sourceClassStudents = useMemo(() => {
    return students.filter(s => {
      const classMatch = (s.className || '').toLowerCase().trim() === sourceClass.toLowerCase().trim();
      if (!classMatch) return false;
      if (sourceStream === 'ALL') return true;
      const sStream = (s.stream || s.combination || '').replace(/^STREAM\s+/i, '').toLowerCase().trim();
      const targetStr = sourceStream.replace(/^STREAM\s+/i, '').toLowerCase().trim();
      return sStream === targetStr;
    });
  }, [students, sourceClass, sourceStream]);

  // Determine auto-qualification by results
  const qualificationMap = useMemo(() => {
    const map = new Map<number, { qualified: boolean; reason: string }>();
    
    sourceClassStudents.forEach(st => {
      const avg = typeof st.average === 'number' ? st.average : parseFloat(String(st.average)) || 0;
      
      if (promotionMode === 'manual') {
        map.set(st.id, { qualified: true, reason: 'Manual Selection' });
      } else {
        // Results based
        if (avg >= minPassAverage) {
          map.set(st.id, { qualified: true, reason: `Average ${avg}% (>= ${minPassAverage}%)` });
        } else {
          map.set(st.id, { qualified: false, reason: `Average ${avg}% (< ${minPassAverage}% pass mark)` });
        }
      }
    });

    return map;
  }, [sourceClassStudents, promotionMode, minPassAverage]);

  // Sync selectedStudentIds on source change or mode change
  React.useEffect(() => {
    const qualifiedIds: number[] = [];
    sourceClassStudents.forEach(st => {
      const qual = qualificationMap.get(st.id);
      if (qual && qual.qualified) {
        qualifiedIds.push(st.id);
      }
    });
    setSelectedStudentIds(qualifiedIds);
  }, [sourceClassStudents, qualificationMap]);

  // Update targetClass suggestion when sourceClass changes
  const handleSourceClassChange = (newClass: string) => {
    setSourceClass(newClass);
    setTargetClass(getNextLogicalClass(newClass));
  };

  const handleToggleStudent = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === sourceClassStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceClassStudents.map(s => s.id));
    }
  };

  // Execute Bulk Promotion
  const handleExecute = () => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student to promote.');
      return;
    }

    const timestamp = new Date().toISOString();
    const historyLogs: PromotionHistory[] = [];

    const updatedStudents = students.map(st => {
      if (selectedStudentIds.includes(st.id)) {
        let newStream = st.stream || 'STREAM A';
        if (targetStreamRule === 'specific') {
          newStream = specificTargetStream;
        } else if (targetStreamRule === 'stream_a') {
          newStream = 'STREAM A';
        }

        const newLevel = inferEducationLevel(targetClass);

        historyLogs.push({
          id: `prom-${st.id}-${Date.now()}`,
          studentId: st.id,
          studentName: st.name,
          fromClass: st.className,
          toClass: targetClass,
          academicYear: targetAcademicYear,
          calendarType: 'JAN-DEC',
          promotedAt: timestamp,
          promotedBy: 'Academic Master (Bulk Promotion Wizard)',
          status: 'PROMOTED'
        });

        return {
          ...st,
          className: targetClass,
          stream: newStream,
          level: newLevel
        };
      }
      return st;
    });

    onExecutePromotion(updatedStudents, historyLogs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Wizard Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Bulk Student Academic Promotion Wizard</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-slate-950">
                  Step {currentStep} of 3
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Promote students to the next grade level based on academic exam results or manual cohort selection.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 text-xs font-black text-center">
          <div className={`p-3 border-r border-slate-200 flex items-center justify-center gap-2 ${
            currentStep === 1 ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Source &amp; Criteria</span>
          </div>
          <div className={`p-3 border-r border-slate-200 flex items-center justify-center gap-2 ${
            currentStep === 2 ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>Destination Class</span>
          </div>
          <div className={`p-3 flex items-center justify-center gap-2 ${
            currentStep === 3 ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>Review &amp; Execute</span>
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-slate-50">
          
          {/* STEP 1: SOURCE CLASS & PROMOTION CRITERIA */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span>1. Select Current Source Cohort</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Current Class (From)</label>
                    <select
                      value={sourceClass}
                      onChange={e => handleSourceClassChange(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="Secondary (O-Level & A-Level)">
                        {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Primary School">
                        {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Pre-Primary">
                        {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Current Stream</label>
                    <select
                      value={sourceStream}
                      onChange={e => setSourceStream(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Streams in {sourceClass}</option>
                      {['STREAM A', 'STREAM B', 'STREAM C', 'STREAM D', 'STREAM E'].map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 font-medium flex items-center justify-between">
                  <span>Total enrolled students in {sourceClass} ({sourceStream}):</span>
                  <span className="font-black text-sm text-blue-800">{sourceClassStudents.length} Students</span>
                </div>
              </div>

              {/* Promotion Rule Selection */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>2. Promotion Qualification Criteria</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPromotionMode('results')}
                    className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                      promotionMode === 'results'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-900">Exam Results Based</span>
                      {promotionMode === 'results' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Auto-promote students meeting minimum passing average and division thresholds.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromotionMode('manual')}
                    className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                      promotionMode === 'manual'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-slate-900">Manual / Cohort Selection</span>
                      {promotionMode === 'manual' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Promote whole cohort or manually tick/untick individual students.
                    </p>
                  </button>
                </div>

                {promotionMode === 'results' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-700 block">
                      Minimum Pass Mark Average Threshold: <span className="text-blue-700 font-black">{minPassAverage}%</span>
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="75"
                      step="5"
                      value={minPassAverage}
                      onChange={e => setMinPassAverage(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>30% (Liberal)</span>
                      <span>45% (Standard National)</span>
                      <span>75% (Honors)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: DESTINATION CLASS & STREAM ALLOCATION */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                  <span>Destination Grade &amp; Allocation</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Target Promoted Class (To)</label>
                    <select
                      value={targetClass}
                      onChange={e => setTargetClass(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="Secondary (O-Level & A-Level)">
                        {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Primary School">
                        {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Graduated / Alumni">
                        <option value="Graduated Alumni">Graduated Alumni</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">New Academic Session Year</label>
                    <input
                      type="text"
                      value={targetAcademicYear}
                      onChange={e => setTargetAcademicYear(e.target.value)}
                      placeholder="e.g. 2027"
                      className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Stream Allocation Rule</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTargetStreamRule('keep_same')}
                      className={`p-3 rounded-xl border text-left cursor-pointer font-bold ${
                        targetStreamRule === 'keep_same' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      Keep Same Stream
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetStreamRule('stream_a')}
                      className={`p-3 rounded-xl border text-left cursor-pointer font-bold ${
                        targetStreamRule === 'stream_a' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      Move to Stream A
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetStreamRule('specific')}
                      className={`p-3 rounded-xl border text-left cursor-pointer font-bold ${
                        targetStreamRule === 'specific' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      Custom Stream
                    </button>
                  </div>
                </div>

                {targetStreamRule === 'specific' && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Select Destination Stream</label>
                    <select
                      value={specificTargetStream}
                      onChange={e => setSpecificTargetStream(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                    >
                      {['STREAM A', 'STREAM B', 'STREAM C', 'STREAM D', 'STREAM E'].map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EXECUTE */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Review Students for Promotion</h4>
                  <p className="text-xs text-slate-500">
                    Moving from <strong>{sourceClass}</strong> to <strong>{targetClass}</strong> ({selectedStudentIds.length} of {sourceClassStudents.length} selected)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                >
                  {selectedStudentIds.length === sourceClassStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Students Review Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                      <tr>
                        <th className="p-2.5 w-10 text-center">✓</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Reg No</th>
                        <th className="p-2.5 text-center">Average</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5">Destination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sourceClassStudents.map(st => {
                        const isSelected = selectedStudentIds.includes(st.id);
                        const qual = qualificationMap.get(st.id);

                        return (
                          <tr key={st.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(st.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">{st.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{st.regNo || '-'}</td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{st.average || 0}%</td>
                            <td className="p-2.5 text-center">
                              {qual?.qualified ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  Qualified
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                                  Retained
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-bold text-blue-700">
                              {isSelected ? `${targetClass}` : 'Remains in current grade'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirmation Notice */}
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-2 font-black">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Promotion Confirmation:</span>
                </div>
                <p>
                  Executing this action will promote <strong>{selectedStudentIds.length} students</strong> to <strong>{targetClass}</strong> and record an immutable audit history entry in the Promotion Ledger.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Navigation Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as any)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              ← Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep + 1) as any)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExecute}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Confirm &amp; Execute Promotion Now ({selectedStudentIds.length})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
