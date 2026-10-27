import React, { useState } from 'react';
import { 
  X, 
  Vote, 
  CheckCircle2, 
  Award, 
  User, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  School,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { 
  ElectionEvent, 
  ElectionPosition, 
  ElectionCandidate 
} from '../../../types/election';
import { SchoolInfo } from '../../../types';

interface BallotPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  election: ElectionEvent;
  positions: ElectionPosition[];
  candidates: ElectionCandidate[];
  schoolInfo?: SchoolInfo;
}

export const BallotPreviewModal: React.FC<BallotPreviewModalProps> = ({
  isOpen,
  onClose,
  election,
  positions,
  candidates,
  schoolInfo
}) => {
  const [activePositionIndex, setActivePositionIndex] = useState(0);
  const [previewSelections, setPreviewSelections] = useState<Record<string, string>>({}); // positionId -> candidateId
  const [showManifestoModal, setShowManifestoModal] = useState<ElectionCandidate | null>(null);

  if (!isOpen) return null;

  // Filter only approved candidates for student ballot preview
  const approvedCandidates = candidates.filter(c => c.status === 'APPROVED' || c.status === 'approved');
  
  // Sorted positions
  const sortedPositions = [...positions].sort((a, b) => a.orderNumber - b.orderNumber);
  const currentPosition = sortedPositions[activePositionIndex];

  const currentPositionCandidates = currentPosition 
    ? approvedCandidates.filter(c => c.positionId === currentPosition.id)
    : [];

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setPreviewSelections(prev => ({
      ...prev,
      [positionId]: candidateId
    }));
  };

  const selectedCount = Object.keys(previewSelections).length;
  const totalPositions = sortedPositions.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative flex items-center justify-between">
          <div className="absolute top-0 right-0 w-64 h-full bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg font-black text-xl">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Hakiki ya Karatasi ya Kura (Ballot Preview)
                </span>
                <span className="text-slate-400 text-xs">• Mfumo Rasmi</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                {election.title}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <School className="w-3.5 h-3.5 text-emerald-400" />
                <span>{schoolInfo?.name || 'Shule ya Sekondari HabyEdu Pro'} • Mwaka wa Masomo {election.academicYear}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner for Admin */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Hii ni hakiki ya kielektroniki jinsi kura itakavyoonekana kwa wanafunzi. Wagombea waliothibitishwa (Approved) pekee ndio wanaoonekana.</span>
          </div>
          <span className="font-black bg-amber-200/60 px-2 py-0.5 rounded-md">
            Viti vilivyochaguliwa: {selectedCount} / {totalPositions}
          </span>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {sortedPositions.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Hakuna vyeo vilivyowekwa kwenye uchaguzi huu bado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Position Stepper / Navigation */}
              <div className="lg:col-span-1 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Vyeo Kwenye Karatasi ({sortedPositions.length})
                </h3>
                <div className="space-y-1.5">
                  {sortedPositions.map((pos, idx) => {
                    const hasSelected = !!previewSelections[pos.id];
                    const isActive = idx === activePositionIndex;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setActivePositionIndex(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="opacity-75 mr-1.5">{idx + 1}.</span>
                          <span>{pos.title}</span>
                        </div>
                        {hasSelected ? (
                          <Check className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-slate-300'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Candidates for Active Position */}
              <div className="lg:col-span-3 space-y-5">
                {currentPosition ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    
                    {/* Position Header */}
                    <div className="border-b border-slate-100 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
                          Nafasi ya {activePositionIndex + 1} kati ya {sortedPositions.length}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span>Ukomo: {currentPosition.genderRule === 'ALL' ? 'Wote' : currentPosition.genderRule}</span>
                          <span>•</span>
                          <span>{currentPosition.classRule}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-2">
                        {currentPosition.title}
                      </h3>
                      {currentPosition.description && (
                        <p className="text-xs text-slate-600 mt-1">
                          {currentPosition.description}
                        </p>
                      )}
                    </div>

                    {/* Candidates Grid */}
                    <div>
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                        Wagombea Waliothibitishwa ({currentPositionCandidates.length})
                      </h4>

                      {currentPositionCandidates.length === 0 ? (
                        <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
                          <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600">Hakuna wagombea waliothibitishwa kwa cheo hiki bado.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentPositionCandidates.map(cand => {
                            const isSelected = previewSelections[currentPosition.id] === cand.id;
                            return (
                              <div
                                key={cand.id}
                                onClick={() => handleSelectCandidate(currentPosition.id, cand.id)}
                                className={`rounded-2xl p-4 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                )}

                                <div className="flex items-start gap-3.5">
                                  {/* Candidate Photo */}
                                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                    {cand.photoUrl ? (
                                      <img src={cand.photoUrl} alt={cand.studentName} className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-8 h-8 text-slate-400" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0 pr-6">
                                    <h5 className="text-sm font-black text-slate-900 truncate">
                                      {cand.studentName}
                                    </h5>
                                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                                      {cand.studentClass || cand.className} • {cand.studentGender}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                        Namba: {cand.studentId}
                                      </span>
                                      {(() => {
                                        const nowTime = Date.now();
                                        const nEnd = new Date(election.nominationEnd).getTime();
                                        const vStart = new Date(election.votingStart).getTime();
                                        if (nowTime >= nEnd && nowTime < vStart) {
                                          return (
                                            <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                                              <span>📢 Kwenye Kampeni</span>
                                            </span>
                                          );
                                        }
                                        return (
                                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                            <span>✅ Ameidhinishwa</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                {/* Manifesto Summary Preview */}
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                  <div className="text-xs text-slate-600 line-clamp-2 pr-2 font-normal">
                                    {cand.manifestoText ? `"${cand.manifestoText}"` : 'Hakuna manifesto iliyowekwa.'}
                                  </div>
                                  {cand.manifestoText && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowManifestoModal(cand);
                                      }}
                                      className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0"
                                    >
                                      Soma Zaidi
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Nav Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={activePositionIndex === 0}
                        onClick={() => setActivePositionIndex(prev => Math.max(0, prev - 1))}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          activePositionIndex === 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Cheo Kilichotangulia</span>
                      </button>

                      <button
                        type="button"
                        disabled={activePositionIndex === sortedPositions.length - 1}
                        onClick={() => setActivePositionIndex(prev => Math.min(sortedPositions.length - 1, prev + 1))}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          activePositionIndex === sortedPositions.length - 1
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        }`}
                      >
                        <span>Cheo Kinachofuata</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ) : null}
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-600 font-medium">
            Karatasi ya kura iko tayari kuchapishwa na kutumiwa na wanafunzi kwenye mfumo wa kidijitali.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-md"
          >
            Funga Hakiki (Close Preview)
          </button>
        </div>

      </div>

      {/* Manifesto Reading Sub-Modal */}
      {showManifestoModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Manifesto ya {showManifestoModal.studentName}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowManifestoModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-60 overflow-y-auto text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {showManifestoModal.manifestoText || 'Hakuna maelezo ya manifesto yaliyowekwa.'}
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowManifestoModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
