import React, { useState } from 'react';
import { Sparkles, Calendar, Users, FileText, CheckCircle2, ArrowRight, ArrowLeft, X, School } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Karibu kwenye HABY EDU PRO 🏫",
      subtitle: "Mfumo wa Kina wa Usimamizi wa Shule",
      desc: "Mwongozo huu utakusaidia kufahamu vipengele muhimu vya mfumo huu ikiwemo Utengenezaji wa Ratiba za Masomo (Timetable Generator), Usajili na Usimamizi wa Wanafunzi (Student Management), na Uchakataji wa Matokeo ya Mitihani (Results Processing).",
      icon: <School className="w-12 h-12 text-yellow-300" />,
      color: "from-blue-700 via-indigo-800 to-slate-900",
      view: "dashboard"
    },
    {
      title: "1. Utengenezaji wa Ratiba (Timetable Generator) 🗓️",
      subtitle: "Ratiba za Masomo Zinazokosa Migongano (Zero Clashes)",
      desc: "Tengeneza ratiba za darasa na za walimu kwa urahisi ukitumia AI au kwa kuweka manually (Drag-and-Drop). Mfumo unahakikisha hakuna mwalimu au darasa linaloingiliana kwa kipindi kimoja.",
      icon: <Calendar className="w-12 h-12 text-sky-300" />,
      color: "from-indigo-700 via-blue-800 to-slate-900",
      view: "timetable"
    },
    {
      title: "2. Usajili na Mikondo (Student Management) 👥",
      subtitle: "Dhibiti Wanafunzi, Madarasa, na Mikondo (Streams)",
      desc: "Sajili wanafunzi, panga madarasa na mikondo (Streams A, B, C, PCM, PCB n.k.), na fuatilia mahudhurio yao kwa urahisi wote sehemu moja.",
      icon: <Users className="w-12 h-12 text-emerald-300" />,
      color: "from-emerald-700 via-teal-800 to-slate-900",
      view: "students"
    },
    {
      title: "3. Uchakataji wa Matokeo (Results & NECTA) 📊",
      subtitle: "Weka Alama na Uchambue Matokeo Rasmi",
      desc: "Ingiza alama za mitihani, toa madaraja (A-F), hesabu division (Div I-IV, 0), na uchapishe ripoti za wanafunzi na NECTA Analyzer kwa viwango vya kitaifa.",
      icon: <FileText className="w-12 h-12 text-amber-300" />,
      color: "from-amber-700 via-orange-800 to-slate-900",
      view: "results"
    }
  ];

  const stepInfo = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      onNavigate(steps[currentStep + 1].view);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      onNavigate(steps[currentStep - 1].view);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-gradient-to-br ${stepInfo.color} rounded-3xl shadow-2xl max-w-xl w-full text-white overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-300`}>
        
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 text-blue-200 rounded-full text-xs font-black uppercase tracking-wider">
              Hatua ya {currentStep + 1} ya {steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
          <div className="p-5 bg-white/10 rounded-3xl border border-white/15 shrink-0 shadow-inner flex items-center justify-center">
            {stepInfo.icon}
          </div>

          <div className="space-y-2 flex-1">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {stepInfo.title}
            </h3>
            <h4 className="text-xs font-bold text-yellow-300 tracking-wide uppercase">
              {stepInfo.subtitle}
            </h4>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed pt-1">
              {stepInfo.desc}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-6 bg-yellow-400' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Rudi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? 'Maliza Mwongozo' : 'Endelea'}</span>
              {currentStep < steps.length - 1 ? <ArrowRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
