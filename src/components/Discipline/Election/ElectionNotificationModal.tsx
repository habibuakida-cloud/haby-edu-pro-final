import React, { useEffect } from 'react';
import { Trophy, Vote, Calendar, Sparkles, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ElectionEvent } from '../../../types/election';

interface ElectionNotificationModalProps {
  election: ElectionEvent;
  onClose: () => void;
  onGoToVoting?: () => void;
}

export const ElectionNotificationModal: React.FC<ElectionNotificationModalProps> = ({
  election,
  onClose,
  onGoToVoting
}) => {
  useEffect(() => {
    // Fire celebratory confetti on mount
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {}
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-blue-500/30 text-white text-center space-y-6 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20 text-slate-950">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tukio Jipya la Uchaguzi Limetangazwa!</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {election.title}
          </h3>
          <p className="text-xs text-blue-200 font-medium max-w-md mx-auto leading-relaxed">
            Mkuu wa Idara ya Nidhamu ametangaza rasmi tukio jipya la uchaguzi wa serikali ya wanafunzi kwa mwaka wa masomo <strong className="text-white">{election.academicYear}</strong>. Jitayarishe kushiriki na kupiga kura!
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Kipindi cha Uteuzi:</span>
            <span className="text-amber-300 font-bold">{new Date(election.nominationStart).toLocaleDateString()} - {new Date(election.nominationEnd).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Siku ya Upigaji Kura:</span>
            <span className="text-emerald-300 font-black">{new Date(election.votingStart).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold">Hali ya Sasa:</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 font-bold text-[10px] uppercase">{election.status}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
          {onGoToVoting && (
            <button
              type="button"
              onClick={onGoToVoting}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/30 cursor-pointer transition flex items-center justify-center gap-2"
            >
              <Vote className="w-4 h-4" />
              <span>Nenda Kwenye Chumba cha Kura</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs rounded-2xl border border-white/10 cursor-pointer transition"
          >
            Fahamu / Funga Tangazo
          </button>
        </div>
      </div>
    </div>
  );
};
