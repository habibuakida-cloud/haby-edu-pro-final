import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  BarChart3, 
  CheckCircle2, 
  Printer, 
  RefreshCw, 
  Megaphone, 
  Users, 
  Vote, 
  Calendar, 
  Award, 
  TrendingUp, 
  FileText, 
  Lock,
  Sparkles,
  AlertCircle,
  Eye,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate, 
  ElectionPositionResult, 
  ElectionSummary 
} from '../../../types/election';
import { Student, SchoolInfo } from '../../../types';
import { ElectionService } from '../../../services/electionService';

interface ResultsDashboardProps {
  activeEvent: ElectionEvent | null;
  positions: ElectionPosition[];
  candidates: ElectionCandidate[];
  students: Student[];
  schoolInfo?: SchoolInfo;
  isDisciplineHead?: boolean;
  onRefreshData?: () => Promise<void>;
  onEventUpdated?: (event: ElectionEvent) => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  activeEvent,
  positions,
  candidates,
  students,
  schoolInfo,
  isDisciplineHead = true,
  onRefreshData,
  onEventUpdated
}) => {
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showGazetteModal, setShowGazetteModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    } catch {
      // safe fallback
    }
  };

  // If results are already published, launch confetti on mount
  useEffect(() => {
    if (activeEvent?.status === 'RESULTS_PUBLISHED' || activeEvent?.status === 'Results Published') {
      const timer = setTimeout(() => {
        triggerConfetti();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeEvent?.status]);

  // Calculate detailed results per position
  const positionResults: ElectionPositionResult[] = useMemo(() => {
    return positions.map(pos => {
      const posCandidates = candidates.filter(c => c.positionId === pos.id && (c.status === 'APPROVED' || c.status === 'approved'));
      const totalVotes = posCandidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);
      
      const sortedCandidates = [...posCandidates].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
      const winner = sortedCandidates.length > 0 && (sortedCandidates[0].votesCount || 0) > 0 
        ? sortedCandidates[0] 
        : null;

      // Check if there is a tie for 1st place
      const isTie = sortedCandidates.length > 1 && 
        winner && 
        sortedCandidates[0].votesCount === sortedCandidates[1].votesCount && 
        (sortedCandidates[0].votesCount || 0) > 0;

      return {
        position: pos,
        candidates: sortedCandidates,
        totalVotes,
        winner: isTie ? null : winner,
        isTie: Boolean(isTie)
      };
    });
  }, [positions, candidates]);

  // Overall election summary
  const summary: ElectionSummary = useMemo(() => {
    const totalVoters = students.length || 0;
    const totalVotesCast = candidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);
    // Estimated participating voters
    const participatingVoters = Math.min(totalVoters, Math.max(...positionResults.map(p => p.totalVotes), 0));
    const turnoutPercentage = totalVoters > 0 
      ? Number(((participatingVoters / totalVoters) * 100).toFixed(1)) 
      : 0;

    return {
      totalVoters,
      totalVotesCast,
      turnoutPercentage,
      positionsCount: positions.length,
      candidatesCount: candidates.filter(c => c.status === 'APPROVED' || c.status === 'approved').length,
      status: activeEvent?.status || 'DRAFT'
    };
  }, [students.length, candidates, positions.length, positionResults, activeEvent?.status]);

  // Filter positions for display
  const displayedResults = useMemo(() => {
    if (selectedPositionId === 'all') return positionResults;
    return positionResults.filter(r => r.position.id === selectedPositionId);
  }, [positionResults, selectedPositionId]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefreshData) {
      await onRefreshData();
    }
    setIsRefreshing(false);
  };

  // Handle publishing results
  const handlePublishResults = async () => {
    if (!activeEvent) return;
    setIsPublishing(true);
    try {
      const updated = await ElectionService.publishResults(activeEvent.id);
      if (updated && onEventUpdated) {
        onEventUpdated(updated);
      }
      setShowPublishModal(false);
      setNotification({
        type: 'success',
        message: 'Hongera! Matokeo ya Uchaguzi wa Serikali ya Wanafunzi Yametangazwa Rasmi na Sasa Yanaonekana kwa Wote!'
      });
      triggerConfetti();
    } catch {
      setNotification({
        type: 'error',
        message: 'Hitilafu imetokea wakati wa kutangaza matokeo. Tafadhali jaribu tena.'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Print gazette
  const handlePrintGazette = () => {
    window.print();
  };

  if (!activeEvent) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <Vote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-black text-slate-800">Hakuna Tukio la Uchaguzi Lililopo</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
          Mkuu wa Nidhamu anapaswa kuanzisha tukio la uchaguzi kwanza kwenye ukurasa wa Usimamizi.
        </p>
      </div>
    );
  }

  const isPublished = activeEvent.status === 'RESULTS_PUBLISHED' || activeEvent.status === 'Results Published';

  return (
    <div className="space-y-6">
      {/* Notification banner */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm font-semibold shadow-xs ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs px-2 py-1 rounded bg-white/70 hover:bg-white text-slate-700 cursor-pointer"
          >
            Funga
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden ${
        isPublished
          ? 'bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-black backdrop-blur-md mb-3 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeEvent.title} — {activeEvent.academicYear}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black ${
                isPublished ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-400 text-amber-950'
              }`}>
                {isPublished ? 'MATOKEO RASMI YAMETANGAZWA' : activeEvent.status.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Kituo cha Matokeo ya Uchaguzi wa Serikali ya Wanafunzi
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
              Tume ya Uchaguzi ya Shule (Idara ya Nidhamu). Majumuisho ya kura zote zilizopigwa kidijitali kwa siri na uhuru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-white/20 transition-all cursor-pointer"
              title="Pakia kura mpya"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Onyesha Upya</span>
            </button>

            <button
              onClick={() => setShowGazetteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>Gazeti la Uchaguzi (Print)</span>
            </button>

            {isDisciplineHead && !isPublished && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-102 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <span>Tangaza Matokeo Rasmi</span>
              </button>
            )}

            {isPublished && (
              <button
                onClick={triggerConfetti}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Pongezi (Confetti)</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative corner background shapes */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">Wapiga Kura Waliojiandikisha</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalVoters.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Wanafunzi wote wenye sifa za kupiga kura</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">Jumla ya Kura Zilizopigwa</span>
            <Vote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.totalVotesCast.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Katika nafasi zote {summary.positionsCount}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">Ushiriki wa Wapiga Kura</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{summary.turnoutPercentage}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-700" 
              style={{ width: `${Math.min(100, summary.turnoutPercentage)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">Nafasi za Uongozi</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{summary.positionsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.candidatesCount} Wagombea walioteuliwa</div>
        </div>
      </div>

      {/* Published Announcement Spotlight Banner */}
      {isPublished && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-emerald-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-md">
                  Tamko Rasmi la Mkuu wa Nidhamu
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {new Date().toLocaleDateString('sw-TZ', { dateStyle: 'long' })}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Washindi wa Serikali ya Wanafunzi Wametangazwa Rasmi!
              </h3>
              <p className="text-sm text-slate-700 mt-1">
                Uchaguzi umekamilika kwa njia ya amani, uadilifu, na kura za siri za kidijitali. Tume ya Uchaguzi chini ya Idara ya Nidhamu inawapongeza viongozi wote waliochaguliwa na inawatakia uongozi mwema wa shule kwa mwaka wa masomo {activeEvent.academicYear}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter by Position & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Chuja Nafasi ya Uongozi:</span>
          <select
            value={selectedPositionId}
            onChange={e => setSelectedPositionId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-xs"
          >
            <option value="all">Nafasi Zote za Uongozi ({positions.length})</option>
            {positions.map(p => (
              <option key={p.id} value={p.id}>{p.orderNumber}. {p.title}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
          Inaonyesha nafasi <span className="font-bold text-slate-800">{displayedResults.length}</span> kati ya <span className="font-bold text-slate-800">{positions.length}</span>
        </div>
      </div>

      {/* Position Results Grid */}
      <div className="space-y-6">
        {displayedResults.map(result => {
          const { position, candidates: posCandidates, totalVotes, winner, isTie } = result;

          return (
            <div 
              key={position.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Card Header */}
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                    {position.orderNumber}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{position.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{position.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">Jumla ya Kura</span>
                    <span className="text-sm font-black text-slate-800">{totalVotes.toLocaleString()} kura</span>
                  </div>

                  {winner && (
                    <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5 text-xs font-black">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mshindi: {winner.studentName}</span>
                    </div>
                  )}

                  {isTie && (
                    <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black">
                      Sare ya Kura (Tie)
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: Candidates & Votes distribution */}
              <div className="p-6">
                {posCandidates.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    Hakuna wagombea walioteuliwa kwa nafasi hii.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posCandidates.map((c, index) => {
                      const voteCount = c.votesCount || 0;
                      const percentage = totalVotes > 0 ? Number(((voteCount / totalVotes) * 100).toFixed(1)) : 0;
                      const isWinnerCandidate = winner && winner.id === c.id;

                      return (
                        <div 
                          key={c.id} 
                          className={`p-4 rounded-xl border transition-all ${
                            isWinnerCandidate 
                              ? 'bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white border-emerald-300 ring-2 ring-emerald-500/20' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-2.5">
                            <div className="flex items-center gap-3">
                              {/* Position Rank Badge */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                isWinnerCandidate 
                                  ? 'bg-amber-400 text-slate-950 shadow-sm' 
                                  : index === 1 
                                  ? 'bg-slate-200 text-slate-700' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {index + 1}
                              </div>

                              {/* Candidate Avatar */}
                              <div className="relative">
                                {c.photoUrl ? (
                                  <img 
                                    src={c.photoUrl} 
                                    alt={c.studentName} 
                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs" 
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs">
                                    {c.studentName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}

                                {isWinnerCandidate && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow-xs" title="Mshindi">
                                    <Trophy className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>

                              {/* Candidate details */}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-slate-900">{c.studentName}</span>
                                  {isWinnerCandidate && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                                      Mshindi
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {c.className} • Reg: {c.studentReg}
                                </div>
                              </div>
                            </div>

                            {/* Votes count and percentage */}
                            <div className="text-right">
                              <div className="text-base font-black text-slate-900">
                                {voteCount.toLocaleString()} <span className="text-xs font-semibold text-slate-500">kura</span>
                              </div>
                              <div className={`text-xs font-black ${
                                isWinnerCandidate ? 'text-emerald-700' : 'text-slate-500'
                              }`}>
                                {percentage}%
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar of Votes */}
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full transition-all duration-700 ${
                                isWinnerCandidate 
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600' 
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>

                          {/* Candidate manifesto snippet */}
                          {c.manifestoText && (
                            <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-1 border-t border-slate-100 pt-1.5">
                              &ldquo;{c.manifestoText}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Publish Results Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-4 mx-auto shadow-inner">
              <Megaphone className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-900 text-center">
              Tangaza Matokeo Rasmi ya Uchaguzi?
            </h3>

            <p className="text-xs text-slate-600 text-center mt-2 leading-relaxed">
              Kitendo hiki kitafunga upigaji kura, kitachapisha majina ya washindi wote wa Serikali ya Wanafunzi, na kitafanya matokeo yawe wazi kwa wanafunzi na walimu wote wa shule.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 my-4 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Tukio:</span>
                <span className="font-black">{activeEvent.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Nafasi za Uongozi:</span>
                <span className="font-black">{positions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Kura Zilizopigwa:</span>
                <span className="font-black text-emerald-600">{summary.totalVotesCast.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={isPublishing}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handlePublishResults}
                disabled={isPublishing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inatangaza...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    <span>Ndiyo, Tangaza Matokeo Sasa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Gazette Printable Modal */}
      {showGazetteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl my-8 relative max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:m-0 print:p-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span className="font-black text-sm">Mwonekano wa Gazeti Rasmi la Uchaguzi (Official Election Gazette)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintGazette}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Chapisha (Print Gazette)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGazetteModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Funga
                </button>
              </div>
            </div>

            {/* Gazette Paper Content */}
            <div className="p-4 sm:p-8 border-4 border-double border-slate-900 bg-white text-slate-900">
              {/* Official School Header */}
              <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
                <div className="text-xs font-black uppercase tracking-widest text-slate-600">
                  JAMHURI YA MUUNGANO WA TANZANIA • WIZARA YA ELIMU, SAYANSI NA TEKNOLOJIA
                </div>
                <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 mt-1">
                  {schoolInfo?.name || 'SHULE YA SEKONDARI HABY'}
                </h1>
                <div className="text-xs font-semibold text-slate-600 mt-0.5">
                  IDARA YA NIDHAMU NA USIMAMIZI WA MAADILI YA WANAFUNZI
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {schoolInfo?.address || 'S.L.P 1234, Dodoma, Tanzania'} • Simu: {schoolInfo?.phone || '+255 700 000 000'}
                </div>

                <div className="inline-block mt-4 px-6 py-1.5 bg-slate-900 text-white font-black text-sm tracking-wider uppercase rounded-sm">
                  GAZETI RASMI LA MATOKEO YA UCHAGUZI WA SERIKALI YA WANAFUNZI (BARAZA LA VIONGOZI)
                </div>
                <div className="text-xs font-bold text-slate-700 mt-2">
                  MWAKA WA MASOMO: {activeEvent.academicYear} • TAREHE: {new Date().toLocaleDateString('sw-TZ', { dateStyle: 'full' })}
                </div>
              </div>

              {/* Preamble */}
              <p className="text-xs text-slate-700 text-justify mb-6 leading-relaxed">
                Kwa mujibu wa taratibu na kanuni za Serikali ya Wanafunzi za Shule ya Sekondari {schoolInfo?.name || 'Haby'}, Mkuu wa Idara ya Nidhamu anawatangazia wanafunzi wote, walimu, na uongozi wa shule orodha rasmi ya washindi wa nafasi za uongozi kufuatia kura zilizopigwa kidijitali kwa siri na haki mnamo tarehe {new Date(activeEvent.votingStart).toLocaleDateString('sw-TZ')}.
              </p>

              {/* Table of Winners */}
              <table className="w-full text-left text-xs border border-slate-900 mb-6">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[11px]">
                    <th className="p-2 border border-slate-900 text-center w-12">Na.</th>
                    <th className="p-2 border border-slate-900">Cheo / Nafasi ya Uongozi</th>
                    <th className="p-2 border border-slate-900">Jina la Kiongozi Mteule</th>
                    <th className="p-2 border border-slate-900">Kidato / Darasa</th>
                    <th className="p-2 border border-slate-900 text-center">Kura Alizopata</th>
                    <th className="p-2 border border-slate-900 text-center">Hali</th>
                  </tr>
                </thead>
                <tbody>
                  {positionResults.map((pr, idx) => (
                    <tr key={pr.position.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border border-slate-900 text-center font-bold">{pr.position.orderNumber}</td>
                      <td className="p-2 border border-slate-900 font-bold">{pr.position.title}</td>
                      <td className="p-2 border border-slate-900 font-black text-slate-900">
                        {pr.winner ? pr.winner.studentName : (pr.isTie ? 'SARE YA KURA' : 'HAKUNA MGOMBEA')}
                      </td>
                      <td className="p-2 border border-slate-900 font-semibold">
                        {pr.winner ? pr.winner.className : '-'}
                      </td>
                      <td className="p-2 border border-slate-900 text-center font-black">
                        {pr.winner ? `${pr.winner.votesCount} (${pr.totalVotes > 0 ? ((pr.winner.votesCount / pr.totalVotes) * 100).toFixed(0) : 0}%)` : '-'}
                      </td>
                      <td className="p-2 border border-slate-900 text-center font-black text-[10px]">
                        {pr.winner ? 'AMECHAGULIWA RASMI' : (pr.isTie ? 'MARUDIO YA KURA' : 'WAZI')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures & Seal */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t-2 border-slate-900 text-xs">
                <div className="space-y-12">
                  <div className="font-bold text-slate-800">
                    <div>.......................................................................</div>
                    <div className="font-black mt-1">MKUU WA IDARA YA NIDHAMU</div>
                    <div className="text-slate-500 text-[11px]">Sahihi & Tarehe</div>
                  </div>
                </div>

                <div className="space-y-12 text-right">
                  <div className="font-bold text-slate-800">
                    <div>.......................................................................</div>
                    <div className="font-black mt-1">MKUU WA SHULE (HEADMASTER / MISTRESS)</div>
                    <div className="text-slate-500 text-[11px]">Sahihi, Muhuri Rasmi wa Shule & Tarehe</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
