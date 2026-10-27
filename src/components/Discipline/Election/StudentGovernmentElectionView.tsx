import React, { useState, useEffect, useCallback } from 'react';
import { 
  Vote, 
  Settings, 
  Users, 
  Trophy, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  Calendar,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate, 
  StudentVoterSession 
} from '../../../types/election';
import { Student, SchoolInfo, DisciplineRecord, UserAccount } from '../../../types';
import { ElectionService } from '../../../services/electionService';
import { ElectionEventSetup } from './ElectionEventSetup';
import { NominationModule } from './NominationModule';
import { VotingModule } from './VotingModule';
import { ResultsDashboard } from './ResultsDashboard';
import { ElectionNotificationModal } from './ElectionNotificationModal';

interface StudentGovernmentElectionViewProps {
  students: Student[];
  disciplineRecords?: DisciplineRecord[];
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
}

export const StudentGovernmentElectionView: React.FC<StudentGovernmentElectionViewProps> = ({
  students,
  disciplineRecords = [],
  schoolInfo,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'SETUP' | 'NOMINATIONS' | 'VOTING' | 'RESULTS'>('VOTING');
  const [activeEvent, setActiveEvent] = useState<ElectionEvent | null>(null);
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Active student voter session for voting booth
  const [currentVoter, setCurrentVoter] = useState<StudentVoterSession>({
    studentId: students[0]?.id ? String(students[0].id) : 'std_demo_1',
    studentReg: students[0]?.regNo || 'HABY/2026/001',
    studentName: students[0]?.name || 'Juma Kassim Ally',
    className: students[0]?.className || 'Form 3',
    gender: (students[0]?.gender as 'Male' | 'Female') || 'Male'
  });

  // Role toggle (Head of Discipline Admin vs Student Voter)
  const [viewMode, setViewMode] = useState<'HEAD_OF_DISCIPLINE' | 'STUDENT'>('HEAD_OF_DISCIPLINE');

  // Load all election data
  const loadElectionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const event = await ElectionService.getActiveOrLatestEvent();
      setActiveEvent(event);

      if (event) {
        const [loadedPositions, loadedCandidates] = await Promise.all([
          ElectionService.getPositions(event.id),
          ElectionService.getCandidates(event.id)
        ]);
        setPositions(loadedPositions);
        setCandidates(loadedCandidates);

        // Show notification modal automatically when a new/active event is loaded
        setShowNotificationModal(true);

        if (viewMode === 'STUDENT') {
          if (event.status === 'NOMINATION_OPEN' || event.status === 'Nomination Open') {
            setActiveTab('NOMINATIONS');
          } else if (event.status === 'VOTING_OPEN' || event.status === 'Voting Open') {
            setActiveTab('VOTING');
          } else if (event.status === 'RESULTS_PUBLISHED' || event.status === 'Results Published' || event.status === 'CLOSED' || event.status === 'Closed') {
            setActiveTab('RESULTS');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load election data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    loadElectionData();
  }, [loadElectionData]);

  // When students prop changes, keep current voter valid
  useEffect(() => {
    if (students.length > 0 && (!currentVoter.studentId || !students.some(s => String(s.id) === currentVoter.studentId))) {
      const first = students[0];
      setCurrentVoter({
        studentId: String(first.id),
        studentReg: first.regNo,
        studentName: first.name,
        className: first.className,
        gender: (first.gender as 'Male' | 'Female') || 'Male'
      });
    }
  }, [students, currentVoter.studentId]);

  const handleSelectVoter = (studentId: string) => {
    const st = students.find(s => String(s.id) === String(studentId));
    if (st) {
      setCurrentVoter({
        studentId: String(st.id),
        studentReg: st.regNo,
        studentName: st.name,
        className: st.className,
        gender: (st.gender as 'Male' | 'Female') || 'Male'
      });
    }
  };

  // Vote Cast Handler with Confetti Positive Reinforcement
  const handleVoteCast = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
    loadElectionData();
  };

  const isVotingOpen = activeEvent?.status === 'VOTING_OPEN' || activeEvent?.status === 'Voting Open';
  const isNominationOpen = activeEvent?.status === 'NOMINATION_OPEN' || activeEvent?.status === 'Nomination Open';
  const isResultsPublished = activeEvent?.status === 'RESULTS_PUBLISHED' || activeEvent?.status === 'Results Published';

  return (
    <div className="space-y-6">
      {/* Top Bar with Title, Status & Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Vote className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">
                Uchaguzi wa Serikali ya Wanafunzi
              </h2>
              {activeEvent && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isVotingOpen 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                    : isResultsPublished
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : isNominationOpen
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {isVotingOpen ? 'KURA ZIPO WAZI' : isResultsPublished ? 'MATOKEO YAMETANGAZWA' : activeEvent.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Idara ya Nidhamu na Maadili • Mfumo wa Kidijitali wa Kupiga Kura za Siri (Student Government Election)
            </p>
          </div>
        </div>

        {/* View Mode & Student Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('HEAD_OF_DISCIPLINE')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'HEAD_OF_DISCIPLINE'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Mkuu wa Nidhamu (Admin)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('STUDENT');
                if (isVotingOpen) {
                  setActiveTab('VOTING');
                } else if (isNominationOpen) {
                  setActiveTab('NOMINATIONS');
                } else if (isResultsPublished) {
                  setActiveTab('RESULTS');
                }
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'STUDENT'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mwanafunzi (Mpigakura)</span>
            </button>
          </div>

          {/* Student Voter picker when in student mode */}
          {viewMode === 'STUDENT' && students.length > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-900">Mwanafunzi:</span>
              <select
                value={currentVoter.studentId}
                onChange={e => handleSelectVoter(e.target.value)}
                className="text-xs font-semibold bg-white border border-emerald-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                {students.slice(0, 30).map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} ({s.className})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {/* Tab 1: Setup - Available for Head of Discipline */}
        {viewMode === 'HEAD_OF_DISCIPLINE' && (
          <button
            type="button"
            onClick={() => setActiveTab('SETUP')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'SETUP'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>1. Usimamizi wa Uchaguzi (Admin Setup)</span>
          </button>
        )}

        {/* Tab 2: Nominations */}
        <button
          type="button"
          onClick={() => setActiveTab('NOMINATIONS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'NOMINATIONS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>2. Uteuzi wa Wagombea (Nominations)</span>
          <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {candidates.length}
          </span>
        </button>

        {/* Tab 3: Voting Module */}
        <button
          type="button"
          onClick={() => setActiveTab('VOTING')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'VOTING'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Vote className="w-4 h-4 text-emerald-300" />
          <span>3. Chumba cha Kura (Kura Yangu)</span>
          {isVotingOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* Tab 4: Results Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('RESULTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'RESULTS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>4. Matokeo &amp; Washindi (Live Results)</span>
          {isResultsPublished && (
            <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              YAMETANGAZWA
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Inapakia taarifa za uchaguzi...</p>
        </div>
      ) : (
        <div>
          {/* TAB 1: ELECTION SETUP */}
          {activeTab === 'SETUP' && (
            <ElectionEventSetup
              schoolId={currentUser?.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06'}
              schoolInfo={schoolInfo}
              currentUser={currentUser}
              onSelectElection={event => {
                setActiveEvent(event);
                loadElectionData();
              }}
            />
          )}

          {/* TAB 2: NOMINATIONS */}
          {activeTab === 'NOMINATIONS' && (
            activeEvent ? (
              <NominationModule
                election={activeEvent}
                students={students}
                disciplineRecords={disciplineRecords}
                currentUser={currentUser}
                onCandidateUpdated={loadElectionData}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Vote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Hakuna Tukio la Uchaguzi Lililofunguliwa</h3>
                <p className="text-xs text-slate-500 mt-1">Fungua ukurasa wa Usimamizi ili kuanzisha uchaguzi mpya.</p>
              </div>
            )
          )}

          {/* TAB 3: VOTING BOOTH */}
          {activeTab === 'VOTING' && (
            activeEvent ? (
              <VotingModule
                election={activeEvent}
                students={students}
                currentUser={currentUser}
                onVoteCast={handleVoteCast}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Vote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Hakuna Uchaguzi Unaendelea</h3>
                <p className="text-xs text-slate-500 mt-1">Mkuu wa Nidhamu anapaswa kufungua kura kwanza.</p>
              </div>
            )
          )}

          {/* TAB 4: RESULTS DASHBOARD */}
          {activeTab === 'RESULTS' && (
            <ResultsDashboard
              activeEvent={activeEvent}
              positions={positions}
              candidates={candidates}
              students={students}
              schoolInfo={schoolInfo}
              isDisciplineHead={viewMode === 'HEAD_OF_DISCIPLINE'}
              onRefreshData={loadElectionData}
              onEventUpdated={event => setActiveEvent(event)}
            />
          )}
        </div>
      )}

      {/* AUTOMATIC ELECTION NOTIFICATION MODAL */}
      {showNotificationModal && activeEvent && (
        <ElectionNotificationModal
          election={activeEvent}
          onClose={() => setShowNotificationModal(false)}
          onGoToVoting={() => {
            setShowNotificationModal(false);
            setActiveTab('VOTING');
          }}
        />
      )}
    </div>
  );
};
