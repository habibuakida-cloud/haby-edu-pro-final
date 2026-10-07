import React, { useState } from 'react';
import { X, Check, Trash2, Zap, AlertTriangle, Building, Calendar } from 'lucide-react';
import { InvigilationSession, Teacher } from '../../types';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';

interface BulkEditInvigilationModalProps {
  sessions: InvigilationSession[];
  teachers: Teacher[];
  assignments: Record<string, number>;
  selectedInvigilators: number[];
  onSaveAssignments: (updatedAssignments: Record<string, number>) => void;
  onClose: () => void;
}

export const BulkEditInvigilationModal: React.FC<BulkEditInvigilationModalProps> = ({
  sessions,
  teachers,
  assignments,
  selectedInvigilators,
  onSaveAssignments,
  onClose
}) => {
  const [localAssignments, setLocalAssignments] = useState<Record<string, number>>({ ...assignments });
  const [filterSession, setFilterSession] = useState<string>('ALL');

  // Active pool of teachers
  const activeTeachers = teachers.filter(t => 
    !t.excludeInvigilation && (selectedInvigilators.length === 0 || selectedInvigilators.includes(t.id))
  );

  // Group sessions by Date and Session
  const filteredSessions = sessions.filter(s => {
    if (filterSession === 'ALL') return true;
    return s.session === filterSession;
  });

  // Calculate live conflicts inside localAssignments
  const getClashesForSlot = (date: string, sessionType: string, teacherId: number, currentKey: string) => {
    let count = 0;
    sessions.forEach(s => {
      if (s.rawDate === date && s.session === sessionType) {
        for (let r = 0; r < s.rooms; r++) {
          const key = `${s.id}_room${r}`;
          if (localAssignments[key] === teacherId) {
            count++;
          }
        }
      }
    });
    return count > 1;
  };

  const handleRoomChange = (key: string, teacherIdStr: string) => {
    const updated = { ...localAssignments };
    if (!teacherIdStr) {
      delete updated[key];
    } else {
      updated[key] = Number(teacherIdStr);
    }
    setLocalAssignments(updated);
  };

  const handleAutoAssign = () => {
    if (activeTeachers.length === 0) {
      alert('No active invigilators available. Please activate teachers in the Invigilators tab first.');
      return;
    }

    const newAssignments = { ...localAssignments };
    const dutyCount: Record<number, number> = {};
    activeTeachers.forEach(t => { dutyCount[t.id] = 0; });

    // Track slots occupied by date and session: key = `${rawDate}_${session}` -> Set<teacherId>
    const occupiedSlots: Record<string, Set<number>> = {};

    // Count already assigned teachers
    sessions.forEach(s => {
      const slotKey = `${s.rawDate}_${s.session}`;
      if (!occupiedSlots[slotKey]) occupiedSlots[slotKey] = new Set();

      for (let r = 0; r < s.rooms; r++) {
        const key = `${s.id}_room${r}`;
        const tid = newAssignments[key];
        if (tid) {
          occupiedSlots[slotKey].add(tid);
          dutyCount[tid] = (dutyCount[tid] || 0) + 1;
        }
      }
    });

    let assignedCount = 0;

    // Fill unassigned slots
    sessions.forEach(s => {
      const slotKey = `${s.rawDate}_${s.session}`;
      if (!occupiedSlots[slotKey]) occupiedSlots[slotKey] = new Set();

      for (let r = 0; r < s.rooms; r++) {
        const key = `${s.id}_room${r}`;
        if (!newAssignments[key]) {
          // Find candidates not occupied in this timeslot
          const available = activeTeachers.filter(t => !occupiedSlots[slotKey].has(t.id));

          if (available.length > 0) {
            // Sort by lowest duty count for fairness
            available.sort((a, b) => (dutyCount[a.id] || 0) - (dutyCount[b.id] || 0));
            const chosen = available[0];

            newAssignments[key] = chosen.id;
            occupiedSlots[slotKey].add(chosen.id);
            dutyCount[chosen.id] = (dutyCount[chosen.id] || 0) + 1;
            assignedCount++;
          }
        }
      }
    });

    setLocalAssignments(newAssignments);
    alert(`Auto-assigned ${assignedCount} examination room slot(s) with balanced distribution and zero conflicts!`);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all invigilation assignments? This cannot be undone.')) {
      setLocalAssignments({});
    }
  };

  const handleSave = () => {
    onSaveAssignments(localAssignments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1f4d8b] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-200" />
              Quick Bulk Edit Invigilation Timetable
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Review and reassign room invigilators across all examination sessions simultaneously.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filter:</span>
            <select
              value={filterSession}
              onChange={e => setFilterSession(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Session Slots</option>
              <option value="SESSION I">Session I (Morning)</option>
              <option value="SESSION II">Session II (Afternoon)</option>
              <option value="SESSION III">Session III (Evening)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoAssign}
              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Auto-Fill Unassigned
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        </div>

        {/* Sessions Body List */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No examination sessions match the selected filter.
            </div>
          ) : (
            filteredSessions.map(session => {
              const subColor = getSubjectColor(session.subject);
              return (
                <div
                  key={session.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
                >
                  {/* Session Heading */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">
                        {session.day}, {session.date}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          session.session === 'SESSION I'
                            ? 'bg-blue-100 text-blue-800'
                            : session.session === 'SESSION II'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {session.session} ({session.time})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: subColor.bg, color: subColor.text, borderColor: subColor.border }}
                        className="px-2 py-0.5 rounded border text-xs font-bold"
                      >
                        {session.subject}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {session.className} • <span className="text-blue-700 font-bold">{session.stream}</span>
                      </span>
                    </div>
                  </div>

                  {/* Room Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {Array.from({ length: session.rooms }).map((_, roomIdx) => {
                      const assignmentKey = `${session.id}_room${roomIdx}`;
                      const assignedTeacherId = localAssignments[assignmentKey];
                      const assignedTeacher = assignedTeacherId ? teachers.find(t => t.id === assignedTeacherId) : undefined;
                      const hasClash = assignedTeacherId 
                        ? getClashesForSlot(session.rawDate, session.session, assignedTeacherId, assignmentKey) 
                        : false;
                      const tColor = assignedTeacher ? getTeacherColor(assignedTeacher.id) : null;

                      return (
                        <div
                          key={roomIdx}
                          className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                            hasClash
                              ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400'
                              : assignedTeacher
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-amber-50/60 border-dashed border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-slate-700">
                              Room {roomIdx + 1}
                            </span>
                            {assignedTeacher && (
                              <span
                                style={{ backgroundColor: assignedTeacher.color || tColor?.hex, color: '#ffffff' }}
                                className="w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[9px]"
                              >
                                {assignedTeacher.initial}
                              </span>
                            )}
                          </div>

                          <select
                            value={assignedTeacherId || ''}
                            onChange={e => handleRoomChange(assignmentKey, e.target.value)}
                            className={`w-full px-2 py-1 text-xs rounded border bg-white font-medium ${
                              hasClash ? 'border-rose-400 text-rose-900 bg-rose-50/50' : 'border-slate-300 text-slate-800'
                            }`}
                          >
                            <option value="">-- Unassigned --</option>
                            {activeTeachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.initial})
                              </option>
                            ))}
                          </select>

                          {hasClash && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Clashing in another room!</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {Object.keys(localAssignments).length} room assignment(s) configured
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1f4d8b] hover:bg-blue-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
