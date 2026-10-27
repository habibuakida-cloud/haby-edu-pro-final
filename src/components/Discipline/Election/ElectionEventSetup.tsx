import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Plus, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Edit3, 
  Trash2, 
  Users, 
  FileText, 
  ShieldCheck, 
  Save, 
  X,
  ChevronRight,
  Sparkles,
  Eye
} from 'lucide-react';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate,
  GenderRule, 
  ClassRule, 
  ElectionStatus 
} from '../../../types/election';
import { ElectionService } from '../../../services/electionService';
import { SchoolInfo, UserAccount } from '../../../types';
import { ElectionRoadmap } from './ElectionRoadmap';
import { BallotPreviewModal } from './BallotPreviewModal';
import { ElectionCountdown } from './ElectionCountdown';

interface ElectionEventSetupProps {
  schoolId: string;
  schoolInfo?: SchoolInfo;
  currentUser?: UserAccount | null;
  onSelectElection?: (election: ElectionEvent) => void;
}

export const ElectionEventSetup: React.FC<ElectionEventSetupProps> = ({
  schoolId,
  schoolInfo,
  currentUser,
  onSelectElection
}) => {
  const [elections, setElections] = useState<ElectionEvent[]>([]);
  const [selectedElection, setSelectedElection] = useState<ElectionEvent | null>(null);
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [isBallotPreviewOpen, setIsBallotPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createdEventModal, setCreatedEventModal] = useState<ElectionEvent | null>(null);

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: 'Uchaguzi Mkuu wa Serikali ya Wanafunzi 2026',
    academicYear: '2026',
    nominationStart: new Date().toISOString().slice(0, 16),
    nominationEnd: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
    votingStart: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    votingEnd: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16),
    status: 'DRAFT' as ElectionStatus,
    createdByDisciplineHead: currentUser?.fullName || 'Mkuu wa Nidhamu'
  });

  // Custom Position modal state
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<ElectionPosition | null>(null);
  const [positionForm, setPositionForm] = useState({
    title: '',
    description: '',
    genderRule: 'ALL' as GenderRule,
    classRule: 'ALL' as ClassRule,
    orderNumber: 1,
    photoRequired: true,
    manifestoRequired: true
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await ElectionService.getElectionEvents(schoolId);
      setElections(list);

      let current = selectedElection ? list.find(e => e.id === selectedElection.id) : null;
      if (!current && list.length > 0) {
        current = list[0];
      }
      setSelectedElection(current || null);

      if (current) {
        const [pos, cands] = await Promise.all([
          ElectionService.getPositions(current.id),
          ElectionService.getCandidates(current.id)
        ]);
        setPositions(pos);
        setCandidates(cands);
        if (onSelectElection) onSelectElection(current);
      } else {
        setPositions([]);
        setCandidates([]);
      }
    } catch (err) {
      console.error('Error loading elections:', err);
      showToast('error', 'Imeshindwa kupakia taarifa za uchaguzi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleSelectElection = async (ev: ElectionEvent) => {
    setSelectedElection(ev);
    const [pos, cands] = await Promise.all([
      ElectionService.getPositions(ev.id),
      ElectionService.getCandidates(ev.id)
    ]);
    setPositions(pos);
    setCandidates(cands);
    if (onSelectElection) onSelectElection(ev);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await ElectionService.saveElectionEvent({
        ...eventForm,
        schoolId,
        createdByDisciplineHead: currentUser?.fullName || 'Mkuu wa Nidhamu'
      }, schoolId);

      setIsEventModalOpen(false);
      showToast('success', `Tukio la uchaguzi "${saved.title}" limehifadhiwa kwa ufanisi!`);
      await loadData();
      handleSelectElection(saved);
      setCreatedEventModal(saved);
    } catch (err: any) {
      showToast('error', 'Hitilafu wakati wa kuhifadhi uchaguzi: ' + (err?.message || err));
    }
  };

  const handleUpdateStatus = async (status: ElectionStatus) => {
    if (!selectedElection) return;
    try {
      const updated = await ElectionService.saveElectionEvent({
        ...selectedElection,
        status
      }, schoolId);
      setSelectedElection(updated);
      setElections(prev => prev.map(e => e.id === updated.id ? updated : e));
      showToast('success', `Hali ya uchaguzi imebadilishwa kuwa: ${status}`);
      if (onSelectElection) onSelectElection(updated);
    } catch (err) {
      showToast('error', 'Hitilafu wakati wa kubadilisha hali ya uchaguzi');
    }
  };

  const handleOpenAddPosition = () => {
    setEditingPosition(null);
    setPositionForm({
      title: '',
      description: '',
      genderRule: 'ALL',
      classRule: 'ALL',
      orderNumber: positions.length + 1,
      photoRequired: true,
      manifestoRequired: true
    });
    setIsPositionModalOpen(true);
  };

  const handleOpenEditPosition = (pos: ElectionPosition) => {
    setEditingPosition(pos);
    setPositionForm({
      title: pos.title,
      description: pos.description || '',
      genderRule: pos.genderRule,
      classRule: pos.classRule,
      orderNumber: pos.orderNumber,
      photoRequired: pos.photoRequired,
      manifestoRequired: pos.manifestoRequired
    });
    setIsPositionModalOpen(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElection) return;
    if (!positionForm.title.trim()) {
      showToast('error', 'Tafadhali ingiza jina la cheo/nafasi');
      return;
    }

    try {
      await ElectionService.savePosition({
        id: editingPosition?.id,
        electionId: selectedElection.id,
        ...positionForm,
        isCustom: editingPosition ? editingPosition.isCustom : true
      });

      setIsPositionModalOpen(false);
      showToast('success', `Cheo "${positionForm.title}" kimehifadhiwa!`);
      const updatedPositions = await ElectionService.getPositions(selectedElection.id);
      setPositions(updatedPositions);
    } catch (err: any) {
      showToast('error', 'Hitilafu wakati wa kuhifadhi cheo: ' + err.message);
    }
  };

  const handleDeletePosition = async (posId: string) => {
    if (!selectedElection) return;
    if (!confirm('Je, una uhakika unataka kufuta cheo hiki kutoka kwenye uchaguzi?')) return;
    try {
      await ElectionService.deletePosition(selectedElection.id, posId);
      setPositions(prev => prev.filter(p => p.id !== posId));
      showToast('success', 'Cheo kimefutwa kikamilifu');
    } catch (err) {
      showToast('error', 'Imeshindwa kufuta cheo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Visual Election Roadmap Progress Bar */}
      <ElectionRoadmap election={selectedElection} />

      {/* Live Election Countdown Widget */}
      <ElectionCountdown election={selectedElection} />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Idara ya Nidhamu na Maadili • Discipline Department</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Usimamizi wa Uchaguzi Mkuu wa Serikali ya Wanafunzi
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
            Weka tarehe za uteuzi na upigaji kura, dhibiti nafasi 15 za uongozi wa kitaifa au ongeza vyeo maalum, na simamia mchakato wa kidemokrasia shuleni.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEventForm({
              title: `Uchaguzi Mkuu wa Serikali ya Wanafunzi ${new Date().getFullYear()}`,
              academicYear: String(new Date().getFullYear()),
              nominationStart: new Date().toISOString().slice(0, 16),
              nominationEnd: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16),
              votingStart: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
              votingEnd: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16),
              status: 'DRAFT',
              createdByDisciplineHead: currentUser?.fullName || 'Mkuu wa Nidhamu'
            });
            setIsEventModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Unda Uchaguzi Mpya</span>
        </button>
      </div>

      {/* Active Elections Selector Bar */}
      {elections.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Tukio Lililochaguliwa:</span>
              <div className="flex flex-wrap gap-2">
                {elections.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => handleSelectElection(ev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedElection?.id === ev.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{ev.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      ev.status === 'VOTING_OPEN' ? 'bg-emerald-500 text-white' :
                      ev.status === 'NOMINATION_OPEN' ? 'bg-amber-400 text-slate-900' :
                      ev.status === 'RESULTS_PUBLISHED' ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-800'
                    }`}>
                      {ev.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedElection && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Badili Hali (Status):</span>
                <select
                  value={selectedElection.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as ElectionStatus)}
                  className="bg-slate-900 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">1. Rasimu (Draft)</option>
                  <option value="NOMINATION_OPEN">2. Uteuzi Umefunguliwa (Nomination Open)</option>
                  <option value="VOTING_OPEN">3. Upigaji Kura Upo Wazi (Voting Open)</option>
                  <option value="CLOSED">4. Kura Zimefungwa (Voting Closed)</option>
                  <option value="RESULTS_PUBLISHED">5. Matokeo Yametangazwa (Results Published)</option>
                </select>
              </div>
            )}
          </div>

          {/* Current Event Details Banner */}
          {selectedElection && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Mwaka wa Masomo</span>
                <span className="font-extrabold text-slate-900">{selectedElection.academicYear}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Kipindi cha Uteuzi</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedElection.nominationStart).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' })} - {new Date(selectedElection.nominationEnd).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Siku ya Upigaji Kura</span>
                <span className="font-bold text-blue-700">
                  {new Date(selectedElection.votingStart).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Msimamizi Mkuu</span>
                <span className="font-extrabold text-slate-900 truncate block">{selectedElection.createdByDisciplineHead || 'Head of Discipline'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Positions Management Section */}
      {selectedElection ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Vyeo na Nafasi za Uongozi (Election Positions - {positions.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nafasi 15 za kawaida za shule za sekondari Tanzania na nafasi maalum (custom positions) zilizoongezwa.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBallotPreviewOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Hakiki Karatasi ya Kura</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddPosition}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeza Cheo Kipya (Custom Position)</span>
              </button>
            </div>
          </div>

          {/* Positions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {positions.map((pos) => (
              <div 
                key={pos.id} 
                className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                  pos.isCustom 
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {pos.orderNumber}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {pos.title}
                    </h4>
                  </div>
                  {pos.isCustom && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded shrink-0">
                      Custom
                    </span>
                  )}
                </div>

                {pos.description && (
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {pos.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold pt-2 border-t border-slate-100">
                  <span className={`px-2 py-0.5 rounded-md ${
                    pos.genderRule === 'BOYS_ONLY' ? 'bg-blue-100 text-blue-800' :
                    pos.genderRule === 'GIRLS_ONLY' ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {pos.genderRule === 'BOYS_ONLY' ? 'Wavulana Tu' : pos.genderRule === 'GIRLS_ONLY' ? 'Wasichana Tu' : 'Wote (M & F)'}
                  </span>

                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                    Darasa: {pos.classRule === 'FORM_3_4' ? 'Kidato cha 3 & 4' : pos.classRule === 'FORM_1_2' ? 'Kidato cha 1 & 2' : 'Madarasa Yote'}
                  </span>

                  {pos.photoRequired && (
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                      Picha Lazima
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPosition(pos)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
                    title="Hariri Cheo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {pos.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeletePosition(pos.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                      title="Futa Cheo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Vote className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-800">Hakuna Tukio la Uchaguzi Lililoundwa</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bofya kitufe cha <strong>"Unda Uchaguzi Mpya"</strong> hapo juu kuanzisha uchaguzi wa mwaka huu na kuweka nafasi zote 15 za viongozi wa serikali ya wanafunzi moja kwa moja.
          </p>
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Vote className="w-4 h-4 text-blue-600" />
                <span>Unda Tukio la Uchaguzi Mkuu wa Wanafunzi</span>
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kichwa cha Uchaguzi (Election Title)</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Uchaguzi Mkuu wa Serikali ya Wanafunzi 2026"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mwaka wa Masomo (Academic Year)</label>
                  <input
                    type="text"
                    required
                    value={eventForm.academicYear}
                    onChange={e => setEventForm({ ...eventForm, academicYear: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hali ya Awali (Initial Status)</label>
                  <select
                    value={eventForm.status}
                    onChange={e => setEventForm({ ...eventForm, status: e.target.value as ElectionStatus })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="DRAFT">Draft (Rasimu)</option>
                    <option value="NOMINATION_OPEN">Nomination Open (Uteuzi Umefunguliwa)</option>
                    <option value="VOTING_OPEN">Voting Open (Kura Zipigwe)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mwanzo wa Uteuzi (Nomination Start)</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.nominationStart}
                    onChange={e => setEventForm({ ...eventForm, nominationStart: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mwisho wa Uteuzi (Nomination Deadline)</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.nominationEnd}
                    onChange={e => setEventForm({ ...eventForm, nominationEnd: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mwanzo wa Kura (Voting Start)</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.votingStart}
                    onChange={e => setEventForm({ ...eventForm, votingStart: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mwisho wa Kura (Voting End)</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.votingEnd}
                    onChange={e => setEventForm({ ...eventForm, votingEnd: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 leading-relaxed">
                ✨ Mfumo utaweka kiotomatiki nafasi 15 za viongozi wa shule za sekondari Tanzania (Rais, Makamu wa Rais, Waziri Mkuu, Spika, Mawaziri 7, Makatibu na Viranja wa Bweni).
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Hifadhi Uchaguzi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CUSTOM POSITION MODAL */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>{editingPosition ? 'Hariri Nafasi / Cheo' : 'Ongeza Cheo Kipya cha Uongozi'}</span>
              </h3>
              <button onClick={() => setIsPositionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jina la Cheo / Nafasi (Position Title)</label>
                <input
                  type="text"
                  required
                  value={positionForm.title}
                  onChange={e => setPositionForm({ ...positionForm, title: e.target.value })}
                  placeholder="e.g. Waziri wa Ulinzi au Mkuu wa Maktaba"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Maelezo na Majukumu ya Cheo (Description)</label>
                <textarea
                  rows={2}
                  value={positionForm.description}
                  onChange={e => setPositionForm({ ...positionForm, description: e.target.value })}
                  placeholder="Majukumu makuu ya kiongozi wa nafasi hii..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kigezo cha Jinsia (Gender Rule)</label>
                  <select
                    value={positionForm.genderRule}
                    onChange={e => setPositionForm({ ...positionForm, genderRule: e.target.value as GenderRule })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">Wote (Wavulana na Wasichana)</option>
                    <option value="BOYS_ONLY">Wavulana Tu (Boys Only)</option>
                    <option value="GIRLS_ONLY">Wasichana Tu (Girls Only)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kigezo cha Darasa (Class Rule)</label>
                  <select
                    value={positionForm.classRule}
                    onChange={e => setPositionForm({ ...positionForm, classRule: e.target.value as ClassRule })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">Madarasa Yote (All Classes)</option>
                    <option value="FORM_3_4">Kidato cha 3 & 4 Tu</option>
                    <option value="FORM_1_2">Kidato cha 1 & 2 Tu</option>
                    <option value="FORM_5_6">Kidato cha 5 & 6 Tu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="posPhoto"
                    checked={positionForm.photoRequired}
                    onChange={e => setPositionForm({ ...positionForm, photoRequired: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="posPhoto" className="text-slate-800 font-bold text-[11px] cursor-pointer">
                    Picha ni Lazima
                  </label>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="posManifesto"
                    checked={positionForm.manifestoRequired}
                    onChange={e => setPositionForm({ ...positionForm, manifestoRequired: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="posManifesto" className="text-slate-800 font-bold text-[11px] cursor-pointer">
                    Ilani ni Lazima
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPositionModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Hifadhi Cheo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS CREATED ELECTION POPUP MODAL */}
      {createdEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Uchaguzi Umeundwa Kikamilifu!</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tukio la <strong className="text-slate-900">"{createdEventModal.title}"</strong> limerekodiwa. Mfumo umeiwekea nafasi 15 za uongozi moja kwa moja.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-700 space-y-1 text-left font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-500">Mwaka wa Masomo:</span>
                <span>{createdEventModal.academicYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uteuzi:</span>
                <span>{new Date(createdEventModal.nominationStart).toLocaleDateString()} - {new Date(createdEventModal.nominationEnd).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Upigaji Kura:</span>
                <span className="text-blue-700 font-black">{new Date(createdEventModal.votingStart).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await handleUpdateStatus('NOMINATION_OPEN');
                  setCreatedEventModal(null);
                  showToast('success', 'Mchakato wa Uteuzi umefunguliwa rasmi!');
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Fungua Uteuzi Sasa (Open Nominations)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedEventModal(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
              >
                Endelea Kusimamia Vyeo &amp; Ratiba
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ballot Preview Modal */}
      {selectedElection && (
        <BallotPreviewModal
          isOpen={isBallotPreviewOpen}
          onClose={() => setIsBallotPreviewOpen(false)}
          election={selectedElection}
          positions={positions}
          candidates={candidates}
          schoolInfo={schoolInfo}
        />
      )}
    </div>
  );
};
