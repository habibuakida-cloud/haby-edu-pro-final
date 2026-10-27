import React, { useState, useEffect } from 'react';
import { Clock, Flame, AlertCircle, Calendar, Timer, Zap } from 'lucide-react';
import { ElectionEvent } from '../../../types/election';

interface ElectionCountdownProps {
  election: ElectionEvent | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const ElectionCountdown: React.FC<ElectionCountdownProps> = ({ election }) => {
  const [nominationCountdown, setNominationCountdown] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });
  const [votingCountdown, setVotingCountdown] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (!election) return;

    const calculateTimeLeft = (targetDateStr: string): TimeRemaining => {
      const difference = +new Date(targetDateStr) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      };
    };

    const updateCountdowns = () => {
      setNominationCountdown(calculateTimeLeft(election.nominationEnd));
      setVotingCountdown(calculateTimeLeft(election.votingStart));
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [election]);

  if (!election) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      {/* Nomination Deadline Countdown */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-5 shadow-lg border border-amber-500/30 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-200">
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md text-amber-200">
                Ukomo wa Uteuzi (Nomination Deadline)
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">Wagombea Wanaoshiriki</h4>
            </div>
          </div>
          <span className="text-xs font-mono bg-white/20 px-2.5 py-1 rounded-lg">
            {new Date(election.nominationEnd).toLocaleDateString('sw-TZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {nominationCountdown.isExpired ? (
          <div className="bg-black/20 p-3 rounded-xl text-center text-xs font-bold text-amber-200">
            Kipindi cha Uteuzi kimefungwa rasmi!
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center mt-2">
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white">{nominationCountdown.days}</span>
              <span className="text-[10px] text-amber-200 uppercase font-bold">Siku</span>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white">{nominationCountdown.hours}</span>
              <span className="text-[10px] text-amber-200 uppercase font-bold">Saa</span>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white">{nominationCountdown.minutes}</span>
              <span className="text-[10px] text-amber-200 uppercase font-bold">Dakika</span>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white animate-pulse">{nominationCountdown.seconds}</span>
              <span className="text-[10px] text-amber-200 uppercase font-bold">Sekunde</span>
            </div>
          </div>
        )}
      </div>

      {/* Voting Start Countdown */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-2xl p-5 shadow-lg border border-emerald-500/30 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-emerald-200">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md text-emerald-200">
                Kuanza kwa Kura (Voting Day)
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">Siku ya Maamuzi Makuu</h4>
            </div>
          </div>
          <span className="text-xs font-mono bg-white/20 px-2.5 py-1 rounded-lg">
            {new Date(election.votingStart).toLocaleDateString('sw-TZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {votingCountdown.isExpired ? (
          <div className="bg-black/20 p-3 rounded-xl text-center text-xs font-bold text-emerald-200">
            Siku ya Upigaji Kura imewadia au imekwisha!
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center mt-2">
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white">{votingCountdown.days}</span>
              <span className="text-[10px] text-emerald-200 uppercase font-bold">Siku</span>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white">{votingCountdown.hours}</span>
              <span className="text-[10px] text-emerald-200 uppercase font-bold">Saa</span>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white">{votingCountdown.minutes}</span>
              <span className="text-[10px] text-emerald-200 uppercase font-bold">Dakika</span>
            </div>
            <div className="bg-black/30 backdrop-blur-xs rounded-xl p-2 border border-white/10">
              <span className="block text-xl md:text-2xl font-black font-mono text-white animate-pulse">{votingCountdown.seconds}</span>
              <span className="text-[10px] text-emerald-200 uppercase font-bold">Sekunde</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
