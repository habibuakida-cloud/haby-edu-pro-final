import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  AlertTriangle, 
  Search, 
  Check, 
  Calendar, 
  Clock, 
  BookOpen, 
  Building,
  UserX
} from 'lucide-react';
import { InvigilationSession, Teacher } from '../../types';
import { getTeacherColor, getSubjectColor } from '../../utils/colors';

interface AssignInvigilatorModalProps {
  session: InvigilationSession;
  roomIndex: number; // 0-based
  currentTeacherId?: number;
  teachers: Teacher[];
  selectedInvigilators: number[];
  allAssignments: Record<string, number>;
  allSessions: InvigilationSession[];
  onAssign: (teacherId: number) => void;
  onClear: () => void;
  onClose: () => void;
}

export const AssignInvigilatorModal: React.FC<AssignInvigilatorModalProps> = ({
  session,
  roomIndex,
  currentTeacherId,
  teachers,
  selectedInvigilators,
  allAssignments,
  allSessions,
  onAssign,
  onClear,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [filterRosterOnly, setFilterRosterOnly] = useState(true);

  const roomNumber = roomIndex + 1;
  const subCol = getSubjectColor(session.subject);

  // Check which teachers are busy in the same date & session
  const busyTeacherIds = new Set<number>();
  const busyInfo: Record<number, string> = {};

  allSessions.forEach(s => {
    if (s.rawDate === session.rawDate && s.session === session.session) {
      for (let r = 0; r < s.rooms; r++) {
        // Skip current slot
        if (s.id === session.id && r === roomIndex) continue;
        const key = `${s.id}_room${r}`;
        const tid = allAssignments[key];
        if (tid) {
          busyTeacherIds.add(tid);
          busyInfo[tid] = `Assigned to ${s.subject} (${s.className} ${s.stream}), Room ${r + 1}`;
        }
      }
    }
  });

  // Calculate duty counts per teacher across all sessions
  const dutyCounts: Record<number, number> = {};
  allSessions.forEach(s => {
    for (let r = 0; r < s.rooms; r++) {
      const key = `${s.id}_room${r}`;
      const tid = allAssignments[key];
      if (tid) {
        dutyCounts[tid] = (dutyCounts[tid] || 0) + 1;
      }
    }
  });

  // Filter teachers
  const filteredTeachers = teachers.filter(t => {
    if (t.excludeInvigilation) return false;
    if (filterRosterOnly && selectedInvigilators.length > 0 && !selectedInvigilators.includes(t.id)) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchInitial = t.initial.toLowerCase().includes(q);
      const matchSubject = t.subjects.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchInitial && !matchSubject) return false;
    }
    return true;
  });

  // Sort teachers: current teacher first, then non-busy teachers with lower duty count (fairness)
  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (a.id === currentTeacherId) return -1;
    if (b.id === currentTeacherId) return 1;
    const aBusy = busyTeacherIds.has(a.id);
    const bBusy = busyTeacherIds.has(b.id);
    if (aBusy && !bBusy) return 1;
    if (!aBusy && bBusy) return -1;
    return (dutyCounts[a.id] || 0) - (dutyCounts[b.id] || 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1f4d8b] to-[#153460] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
                Exam Invigilation Duty
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-900 text-xs font-black">
                ROOM {roomNumber}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Assign Invigilator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exam Session Context Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Date & Day</span>
              <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{session.day}, {session.date}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Session & Time</span>
              <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{session.session} ({session.time})</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Exam Subject</span>
              <div className="mt-0.5">
                <span
                  style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                  className="px-2 py-0.5 rounded font-bold text-[11px] border inline-block"
                >
                  {session.subject}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Class & Stream</span>
              <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{session.className} ({session.stream})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search teacher by name, initials, or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={filterRosterOnly}
                onChange={e => setFilterRosterOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-medium">Show Active Roster Invigilators only ({selectedInvigilators.length})</span>
            </label>

            {currentTeacherId && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  onClose();
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50"
              >
                <UserX className="w-3.5 h-3.5" />
                Clear Current Assignment
              </button>
            )}
          </div>
        </div>

        {/* Teachers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[380px]">
          {sortedTeachers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No teachers found matching your criteria. Try adjusting the search or unchecking the active roster filter.
            </div>
          ) : (
            sortedTeachers.map(t => {
              const isCurrent = t.id === currentTeacherId;
              const isBusy = busyTeacherIds.has(t.id);
              const busyDesc = busyInfo[t.id];
              const tCol = getTeacherColor(t.id);
              const totalDuties = dutyCounts[t.id] || 0;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (isBusy && !confirm(`⚠️ Warning: ${t.name} is already assigned at this time: ${busyDesc}.\n\nDo you want to reassign them to Room ${roomNumber} anyway?`)) {
                      return;
                    }
                    onAssign(t.id);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                      : isBusy
                      ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      style={{ backgroundColor: t.color || tCol.hex, color: '#ffffff' }}
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs shadow-xs"
                    >
                      {t.initial}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 truncate">{t.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                            Current
                          </span>
                        )}
                        {isBusy && (
                          <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Clash
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Subjects: <span className="font-medium text-slate-700">{t.subjects.join(', ')}</span>
                      </div>

                      {isBusy && (
                        <div className="text-[11px] text-amber-700 font-semibold mt-1">
                          ⚠️ {busyDesc}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned</span>
                      <span className="text-xs font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded-full">
                        {totalDuties} {totalDuties === 1 ? 'duty' : 'duties'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Assigned</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Select</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Click any teacher to assign them immediately to <strong>Room {roomNumber}</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
