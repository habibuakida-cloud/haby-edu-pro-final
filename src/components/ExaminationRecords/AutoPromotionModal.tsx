import React, { useState, useMemo } from 'react';
import { 
  X, 
  GraduationCap, 
  Play, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles,
  Layers,
  History
} from 'lucide-react';
import { Student, PromotionHistory, AcademicCalendarType } from '../../types';
import { 
  detectCalendarType, 
  getNextProgressionClass, 
  JAN_DEC_PROGRESSION, 
  JULY_JUNE_PROGRESSION 
} from '../../utils/examinationRecordsUtils';

interface AutoPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onPromoteStudents?: (history: PromotionHistory[]) => void;
  onExecutePromotion?: (promotedStudents: Student[], historyLogs: PromotionHistory[]) => void;
  currentUserName?: string;
  academicYear?: string;
}

export const AutoPromotionModal: React.FC<AutoPromotionModalProps> = ({
  isOpen,
  onClose,
  students,
  onPromoteStudents,
  onExecutePromotion,
  currentUserName = 'Academic Master'
}) => {
  const [targetGroup, setTargetGroup] = useState<'ALL' | 'JAN-DEC' | 'JULY-JUNE'>('ALL');
  const [confirmStep, setConfirmStep] = useState(false);

  // Group counts
  const janDecCount = useMemo(() => 
    students.filter(s => detectCalendarType(s.className) === 'JAN-DEC').length,
    [students]
  );

  const julyJuneCount = useMemo(() => 
    students.filter(s => detectCalendarType(s.className) === 'JULY-JUNE').length,
    [students]
  );

  // Eligible students
  const eligibleStudents = useMemo(() => {
    return students.filter(s => {
      const cal = detectCalendarType(s.className);
      if (targetGroup === 'ALL') return true;
      return cal === targetGroup;
    });
  }, [students, targetGroup]);

  if (!isOpen) return null;

  const handleRunPromotion = () => {
    const nowIso = new Date().toISOString();
    const currentYear = new Date().getFullYear().toString();

    const createdHistory: PromotionHistory[] = eligibleStudents.map(st => {
      const { nextClass, isGraduated } = getNextProgressionClass(st.className);
      return {
        id: `promo_${st.id}_${Date.now()}`,
        studentId: st.id,
        studentName: st.name,
        fromClass: st.className,
        toClass: nextClass,
        academicYear: currentYear,
        calendarType: detectCalendarType(st.className),
        promotedAt: nowIso,
        promotedBy: currentUserName,
        status: isGraduated ? 'GRADUATED' : 'PROMOTED'
      };
    });

    const updatedStudents = students.map(st => {
      const match = eligibleStudents.find(e => e.id === st.id);
      if (match) {
        const { nextClass } = getNextProgressionClass(st.className);
        return {
          ...st,
          className: nextClass
        };
      }
      return st;
    });

    if (onExecutePromotion) {
      onExecutePromotion(updatedStudents, createdHistory);
    } else if (onPromoteStudents) {
      onPromoteStudents(createdHistory);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1f4d8b] to-blue-900 text-white p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Student Academic Promotion Engine</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Automatically advance student cohorts at academic year-end in compliance with NECTA calendar rules
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Policy Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  JAN - DEC Calendar
                </span>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black">
                  {janDecCount} Students
                </span>
              </div>
              <p className="text-xs text-blue-950 font-semibold">
                Nursery &bull; Primary (Std 1-7) &bull; Secondary (Form 1-4)
              </p>
              <div className="text-[11px] text-blue-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>Auto-Promotion: <strong>31 December, 23:59</strong></span>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-700" />
                  JULY - JUNE Calendar
                </span>
                <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-[10px] font-black">
                  {julyJuneCount} Students
                </span>
              </div>
              <p className="text-xs text-purple-950 font-semibold">
                High School (Form 5 & Form 6)
              </p>
              <div className="text-[11px] text-purple-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-600" />
                <span>Auto-Promotion: <strong>30 June, 23:59</strong></span>
              </div>
            </div>
          </div>

          {/* Group selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Target Promotion Scope:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ALL', label: 'All Students', desc: 'All School Cohorts' },
                { id: 'JAN-DEC', label: 'Nursery to Form 4', desc: 'JAN-DEC Calendar' },
                { id: 'JULY-JUNE', label: 'Form 5 & Form 6', desc: 'JULY-JUNE Calendar' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetGroup(opt.id as any)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    targetGroup === opt.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Progression Preview */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Progression Pipeline Preview
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {eligibleStudents.length} student(s) will advance
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Nursery</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  Nursery <ArrowRight className="w-3 h-3 text-blue-600" /> Baby
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Pre-Primary to Primary</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  Pre-Unit <ArrowRight className="w-3 h-3 text-blue-600" /> Std 1
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Primary to Secondary</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  Std 7 <ArrowRight className="w-3 h-3 text-blue-600" /> Form 1
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Graduation</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  Form 4 / 6 <ArrowRight className="w-3 h-3 text-emerald-600" /> Graduated
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation Notice */}
          {confirmStep ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Promotion Confirmation:</h4>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    Are you sure you want to execute academic promotion now for <strong>{eligibleStudents.length}</strong> eligible students? 
                    Their class levels will be promoted forward by one grade, and complete audit history will be archived in the Promotion Ledger.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunPromotion}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Confirm & Execute Promotion Now
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Each promotion event is permanently audited in the school promotion history with timestamps and authorizing officer credentials.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
          >
            Close
          </button>

          {!confirmStep && (
            <button
              type="button"
              disabled={eligibleStudents.length === 0}
              onClick={() => setConfirmStep(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Execute Promotion Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
