import React, { useState, useEffect, useMemo } from 'react';
import { 
  Vote, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Fingerprint, 
  KeyRound, 
  Clock, 
  AlertCircle, 
  User, 
  Award, 
  ChevronRight, 
  Sparkles,
  Info,
  Check,
  Video,
  X
} from 'lucide-react';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate 
} from '../../../types/election';
import { ElectionService } from '../../../services/electionService';
import { Student, UserAccount } from '../../../types';

interface VotingModuleProps {
  election: ElectionEvent;
  students: Student[];
  currentUser?: UserAccount | null;
  onVoteCast?: () => void;
}

export const VotingModule: React.FC<VotingModuleProps> = ({
  election,
  students,
  currentUser,
  onVoteCast
}) => {
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [voterStudentId, setVoterStudentId] = useState<string>(
    students[0]?.regNo || ''
  );
  const [votedPositionIds, setVotedPositionIds] = useState<string[]>([]);
  const [activePositionIndex, setActivePositionIndex] = useState<number>(0);
  const [isVerifyingVote, setIsVerifyingVote] = useState<boolean>(false);
  const [pendingVote, setPendingVote] = useState<{
    position: ElectionPosition;
    candidate: ElectionCandidate;
  } | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'PIN' | 'FINGERPRINT'>('PIN');
  const [voterPin, setVoterPin] = useState<string>('');
  const [fingerprintScanning, setFingerprintScanning] = useState<boolean>(false);
  const [manifestoModalCandidate, setManifestoModalCandidate] = useState<ElectionCandidate | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [posList, candList] = await Promise.all([
        ElectionService.getPositions(election.id),
        ElectionService.getCandidates(election.id)
      ]);
      setPositions(posList);
      // Only approved candidates appear on the ballot!
      setCandidates(candList.filter(c => c.status === 'APPROVED'));

      if (voterStudentId) {
        const voted = await ElectionService.getVotedPositionIds(election.id, voterStudentId);
        setVotedPositionIds(voted);
      }
    } catch (err) {
      console.error('Error loading voting booth:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [election.id, voterStudentId]);

  const currentVoter = useMemo(() => {
    return students.find(s => s.regNo === voterStudentId) || students[0];
  }, [students, voterStudentId]);

  // Total voting progress
  const totalPositionsCount = positions.length;
  const completedVotesCount = votedPositionIds.length;
  const progressPercent = totalPositionsCount > 0 
    ? Math.round((completedVotesCount / totalPositionsCount) * 100) 
    : 0;

  // Selected position
  const currentPosition = positions[activePositionIndex] || positions[0];
  const candidatesForCurrentPosition = useMemo(() => {
    if (!currentPosition) return [];
    return candidates.filter(c => c.positionId === currentPosition.id);
  }, [candidates, currentPosition]);

  const isCurrentPositionVoted = useMemo(() => {
    if (!currentPosition) return false;
    return votedPositionIds.includes(currentPosition.id);
  }, [votedPositionIds, currentPosition]);

  // Initiate vote click
  const handleInitiateVote = (candidate: ElectionCandidate) => {
    if (election.status !== 'VOTING_OPEN') {
      showToast('error', 'Kipindi cha upigaji kura hakijafunguliwa au kimefungwa.');
      return;
    }
    if (isCurrentPositionVoted) {
      showToast('error', 'Tayari umeshapiga kura kwenye nafasi hii.');
      return;
    }

    setPendingVote({
      position: currentPosition,
      candidate
    });
    setVoterPin('');
    setIsVerifyingVote(true);
  };

  // Confirm and submit vote
  const handleConfirmVote = async () => {
    if (!pendingVote) return;
    if (verificationMethod === 'PIN' && voterPin.length < 4) {
      showToast('error', 'Tafadhali ingiza PIN ya tarakimu 4 ili kuthibitisha.');
      return;
    }

    if (verificationMethod === 'FINGERPRINT') {
      setFingerprintScanning(true);
      await new Promise(r => setTimeout(r, 900)); // Biometric scanner simulation
      setFingerprintScanning(false);
    }

    try {
      const res = await ElectionService.castVote({
        electionId: election.id,
        voterStudentId,
        positionId: pendingVote.position.id,
        candidateId: pendingVote.candidate.id,
        verificationMethod: verificationMethod
      });

      if (!res.success) {
        showToast('error', res.message);
        setIsVerifyingVote(false);
        return;
      }

      setVotedPositionIds(prev => [...prev, pendingVote.position.id]);
      showToast('success', `Kura yako kwa ${pendingVote.candidate.studentName} imerekodiwa kwa siri!`);
      setIsVerifyingVote(false);
      setPendingVote(null);

      // Auto advance to next unvoted position
      const nextUnvotedIdx = positions.findIndex(
        (p, idx) => idx > activePositionIndex && !votedPositionIds.includes(p.id) && p.id !== pendingVote.position.id
      );
      if (nextUnvotedIdx >= 0) {
        setActivePositionIndex(nextUnvotedIdx);
      }

      if (onVoteCast) onVoteCast();
    } catch (err: any) {
      showToast('error', 'Hitilafu wakati wa kupiga kura: ' + err.message);
      setIsVerifyingVote(false);
    }
  };

  const isVotingOpen = election.status === 'VOTING_OPEN';

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voting Station Banner (IEBC / Tume ya Uchaguzi Style) */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-emerald-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-black tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Chumba cha Kupiga Kura za Siri • Secret Ballot Booth</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Kura Yangu: {election.title}
            </h2>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
              Haki yako, sauti yako. Kila mwanafunzi anapiga kura moja kwa kila nafasi ya uongozi. Kura ni ya siri na inathibitishwa kwa PIN au alama ya kidole.
            </p>
          </div>

          {/* Voter Profile Selector */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 w-full md:w-auto shrink-0 space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-300 uppercase block">Mpigakura (Voter Authentication):</span>
            <select
              value={voterStudentId}
              onChange={e => setVoterStudentId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {students.map(s => (
                <option key={s.id || s.regNo} value={s.regNo}>
                  {s.name} ({s.className}) - {s.regNo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Voting Status Alert if not open */}
        {!isVotingOpen && (
          <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-xs text-amber-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>Kumbuka:</strong> Sanduku la kura halijafunguliwa rasmi (Hali: {election.status}). Upigaji kura utaruhusiwa mara Mkuu wa Nidhamu atakapofungua hali ya <em>VOTING_OPEN</em>.
            </span>
          </div>
        )}

        {/* Dynamic Progress Bar */}
        <div className="pt-3 border-t border-emerald-800/60 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-white">
              Maendeleo ya Kura Zako: Umekamilisha kura {completedVotesCount} kati ya {totalPositionsCount}
            </span>
            <span className="font-black text-amber-300 font-mono text-sm">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-950/60 rounded-full h-3 p-0.5 overflow-hidden border border-emerald-700/50">
            <div 
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Position Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2 px-1">
          Chagua Nafasi ya Kupigia Kura (Select Leadership Post):
        </span>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {positions.map((pos, idx) => {
            const isVoted = votedPositionIds.includes(pos.id);
            const isActive = idx === activePositionIndex;

            return (
              <button
                key={pos.id}
                onClick={() => setActivePositionIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
                  isActive 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                    : isVoted 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isVoted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {isVoted ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                </span>
                <span className="truncate max-w-[150px]">{pos.title.split('(')[0]}</span>
                {isVoted && (
                  <span className="text-[9px] font-extrabold bg-emerald-200 text-emerald-950 px-1 rounded">
                    Umeshapiga
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Position Ballot Card */}
      {currentPosition && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Position Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  #{currentPosition.orderNumber}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {currentPosition.title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                {currentPosition.description || 'Chagua kiongozi bora atakayeongoza nafasi hii kwa uadilifu.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCurrentPositionVoted ? (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Umesha Piga Kura Kwenye Nafasi Hii</span>
                </span>
              ) : (
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  Wagombea Waliopo: {candidatesForCurrentPosition.length}
                </span>
              )}
            </div>
          </div>

          {/* Candidates Grid */}
          {candidatesForCurrentPosition.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {candidatesForCurrentPosition.map((candidate) => (
                <div 
                  key={candidate.id}
                  className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                    isCurrentPositionVoted
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Candidate Photo & Basic Info */}
                    <div className="flex items-center gap-4">
                      {candidate.photoUrl ? (
                        <img 
                          src={candidate.photoUrl} 
                          alt={candidate.studentName}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shrink-0 shadow-xs"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                          {candidate.studentName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          {candidate.studentName}
                        </h4>
                        <div className="text-xs font-semibold text-slate-600">
                          {candidate.studentClass}
                        </div>
                        <span className={`text-[10px] font-bold inline-block px-1.5 py-0.2 rounded ${
                          candidate.studentGender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {candidate.studentGender === 'Female' ? 'Wasichana' : 'Wavulana'}
                        </span>
                      </div>
                    </div>

                    {/* Manifesto Snippet */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Ilani ya Mgombea (Manifesto)
                      </span>
                      <p className="text-xs text-slate-700 line-clamp-2 italic leading-relaxed">
                        "{candidate.manifestoText || 'Kujituma kwa nidhamu, kuwawakilisha wanafunzi na kuinua taaluma ya shule.'}"
                      </p>
                      <button
                        type="button"
                        onClick={() => setManifestoModalCandidate(candidate)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <span>Soma Ilani Kamili</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {candidate.manifestoVideoUrl && (
                      <a
                        href={candidate.manifestoVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Tazama Video ya Kampeni</span>
                      </a>
                    )}
                  </div>

                  {/* Vote Button */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isCurrentPositionVoted || !isVotingOpen}
                      onClick={() => handleInitiateVote(candidate)}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                        isCurrentPositionVoted
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : !isVotingOpen
                          ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200'
                      }`}
                    >
                      <Vote className="w-4 h-4" />
                      <span>{isCurrentPositionVoted ? 'Umesha Piga Kura' : `Mpigie Kura ${candidate.studentName.split(' ')[0]}`}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <Award className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Hakuna Mgombea Aliyepitishwa Bado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hakuna mgombea aliyepitishwa na Idara ya Nidhamu kwa nafasi hii ya <strong>{currentPosition.title}</strong>.
              </p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={activePositionIndex === 0}
              onClick={() => setActivePositionIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Nafasi Iliyopita
            </button>

            <span className="text-xs font-bold text-slate-400">
              Nafasi {activePositionIndex + 1} kati ya {positions.length}
            </span>

            <button
              type="button"
              disabled={activePositionIndex === positions.length - 1}
              onClick={() => setActivePositionIndex(prev => Math.min(positions.length - 1, prev + 1))}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Nafasi Inayofuata
            </button>
          </div>
        </div>
      )}

      {/* VOTE CONFIRMATION & SECURITY VERIFICATION MODAL */}
      {isVerifyingVote && pendingVote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Uthibitisho wa Kura ya Siri (Security Verification)
                </h3>
              </div>
              <button onClick={() => setIsVerifyingVote(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Unampigia Kura:</span>
              <div className="flex items-center gap-3">
                {pendingVote.candidate.photoUrl ? (
                  <img 
                    src={pendingVote.candidate.photoUrl} 
                    alt={pendingVote.candidate.studentName} 
                    className="w-12 h-12 rounded-full object-cover border border-emerald-300"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center">
                    {pendingVote.candidate.studentName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-black text-sm text-emerald-950">{pendingVote.candidate.studentName}</h4>
                  <p className="text-emerald-800 font-bold">{pendingVote.position.title}</p>
                  <span className="text-[11px] text-emerald-700">{pendingVote.candidate.studentClass}</span>
                </div>
              </div>
            </div>

            {/* Verification Method Switcher */}
            <div className="space-y-3 text-xs">
              <label className="font-bold text-slate-700 block">Njia ya Uhakiki wa Usalama (Verification Method):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVerificationMethod('PIN')}
                  className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer ${
                    verificationMethod === 'PIN'
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>PIN ya Mwanafunzi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationMethod('FINGERPRINT')}
                  className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer ${
                    verificationMethod === 'FINGERPRINT'
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  <span>Alama ya Kidole</span>
                </button>
              </div>

              {verificationMethod === 'PIN' ? (
                <div className="space-y-1.5 pt-2">
                  <label className="font-bold text-slate-700 block">Ingiza PIN Yako (Security PIN):</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={voterPin}
                    onChange={e => setVoterPin(e.target.value)}
                    placeholder="Tarakimu 4 (e.g. 1234)"
                    className="w-full text-center tracking-widest text-lg font-mono font-black border border-slate-300 rounded-xl py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">
                    PIN inazuia mwanafunzi mwingine kukupigia kura bila idhini yako.
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
                    fingerprintScanning ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Fingerprint className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 block">
                    {fingerprintScanning ? 'Inathibitisha alama ya kidole...' : 'Weka kidole chako kwenye scanner ya biometric kuthibitisha kura.'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setIsVerifyingVote(false)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Thibitisha na Tuma Kura</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE MANIFESTO MODAL */}
      {manifestoModalCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Ilani Rasmi ya Mgombea</span>
              </h3>
              <button onClick={() => setManifestoModalCandidate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                {manifestoModalCandidate.photoUrl ? (
                  <img 
                    src={manifestoModalCandidate.photoUrl} 
                    alt={manifestoModalCandidate.studentName} 
                    className="w-12 h-12 rounded-xl object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center">
                    {manifestoModalCandidate.studentName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-black text-sm text-slate-900">{manifestoModalCandidate.studentName}</h4>
                  <span className="text-slate-500 font-semibold">{manifestoModalCandidate.studentClass}</span>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-blue-900 block">Maelezo ya Ilani:</span>
                <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-line">
                  {manifestoModalCandidate.manifestoText || 'Mgombea huyu hajaweka ilani ndefu zaidi.'}
                </p>
              </div>

              {manifestoModalCandidate.manifestoVideoUrl && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-900 font-bold">
                    <Video className="w-4 h-4 text-red-600" />
                    <span>Video ya Maelezo ya Kampeni Inapatikana</span>
                  </div>
                  <a
                    href={manifestoModalCandidate.manifestoVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px]"
                  >
                    Tazama Video
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManifestoModalCandidate(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer"
                >
                  Funga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
