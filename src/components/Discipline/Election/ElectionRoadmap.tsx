import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  Megaphone, 
  Vote, 
  Award, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';
import { ElectionEvent } from '../../../types/election';

interface ElectionRoadmapProps {
  election: ElectionEvent | null;
}

export const ElectionRoadmap: React.FC<ElectionRoadmapProps> = ({ election }) => {
  if (!election) {
    return (
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Ramani ya Uchaguzi • Election Roadmap</span>
          </div>
          <h3 className="text-lg font-black">Hakuna Tukio Linaloendelea</h3>
          <p className="text-xs text-slate-300">Unda tukio la uchaguzi hapa chini ili kuona hatua na ratiba rasmi (Nomination, Campaign Period, Voting, Results).</p>
        </div>
      </div>
    );
  }

  const now = new Date().getTime();
  const nomStart = new Date(election.nominationStart).getTime();
  const nomEnd = new Date(election.nominationEnd).getTime();
  const voteStart = new Date(election.votingStart).getTime();
  const voteEnd = new Date(election.votingEnd).getTime();

  const campStart = nomEnd;
  const campEnd = voteStart;

  const milestones = [
    {
      id: 'NOMINATION',
      title: 'Uteuzi wa Wagombea',
      sub: 'Nomination Phase',
      icon: <UserPlus className="w-4 h-4" />,
      start: election.nominationStart,
      end: election.nominationEnd,
      status: now > nomEnd ? 'COMPLETED' : now >= nomStart ? 'ACTIVE' : 'UPCOMING'
    },
    {
      id: 'CAMPAIGNING',
      title: 'Kipindi cha Kampeni',
      sub: 'Campaign Period (Manifestos)',
      icon: <Megaphone className="w-4 h-4" />,
      start: new Date(campStart).toISOString(),
      end: new Date(campEnd).toISOString(),
      status: now > campEnd ? 'COMPLETED' : now >= campStart ? 'ACTIVE' : 'UPCOMING'
    },
    {
      id: 'VOTING',
      title: 'Upigaji Kura za Siri',
      sub: 'Voting Booth',
      icon: <Vote className="w-4 h-4" />,
      start: election.votingStart,
      end: election.votingEnd,
      status: now > voteEnd ? 'COMPLETED' : now >= voteStart ? 'ACTIVE' : 'UPCOMING'
    },
    {
      id: 'RESULTS',
      title: 'Matokeo & Ushindi',
      sub: 'Results Published',
      icon: <Award className="w-4 h-4" />,
      start: election.votingEnd,
      end: new Date(voteEnd + 7 * 86400000).toISOString(),
      status: (election.status === 'RESULTS_PUBLISHED' || election.status === 'Results Published' || now > voteEnd) ? 'ACTIVE' : 'UPCOMING'
    }
  ];

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('sw-TZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Ramani Rasmi ya Mchakato • Election Roadmap &amp; Campaign Period</span>
          </div>
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <span>{election.title}</span>
            <span className="text-xs font-mono bg-blue-600/40 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
              {election.academicYear}
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Hali ya Sasa: <strong className="text-white uppercase">{election.status}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {milestones.map((m, idx) => {
          const isActive = m.status === 'ACTIVE';
          const isCompleted = m.status === 'COMPLETED';

          return (
            <div 
              key={m.id}
              className={`relative rounded-2xl p-4 transition-all border flex flex-col justify-between gap-3 ${
                isActive 
                  ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/40' 
                  : isCompleted 
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-100' 
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md animate-pulse' 
                    : isCompleted 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : m.icon}
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-blue-500 text-white' 
                    : isCompleted 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {isActive ? 'Inaendelea Sasa' : isCompleted ? 'Imekamilika' : `Hatua ya ${idx + 1}`}
                </span>
              </div>

              <div>
                <h4 className={`text-sm font-black ${isActive ? 'text-white' : isCompleted ? 'text-emerald-200' : 'text-slate-300'}`}>
                  {m.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{m.sub}</p>
              </div>

              <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-1 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Kuanzia: {formatDate(m.start)}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                  <span className="text-slate-400 truncate">Hadi: {formatDate(m.end)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
