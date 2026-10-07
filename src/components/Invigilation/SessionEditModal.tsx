import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  BookOpen, 
  Layers, 
  Building, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { InvigilationSession, EducationLevel } from '../../types';
import { SUBJECT_LIST, DEFAULT_CLASSES } from '../../constants/defaults';

export const INVIGILATION_ALLOWED_SESSIONS = ['SESSION I', 'SESSION II', 'SESSION III'] as const;
export type InvigilationSessionType = typeof INVIGILATION_ALLOWED_SESSIONS[number];

interface SessionEditModalProps {
  initialSession?: InvigilationSession | null;
  onSave: (sessionData: Omit<InvigilationSession, 'id'> & { id?: number }) => void;
  onClose: () => void;
}

// Bulletproof date to day calculator (avoids timezone off-by-one errors)
export function getDayAndFormattedDate(rawDateStr: string): { day: string; formattedDate: string } {
  if (!rawDateStr) return { day: '', formattedDate: '' };
  const parts = rawDateStr.split('-');
  if (parts.length !== 3) return { day: '', formattedDate: rawDateStr };
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, month, day);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  return { day: dayName, formattedDate };
}

export const SessionEditModal: React.FC<SessionEditModalProps> = ({
  initialSession,
  onSave,
  onClose
}) => {
  const [rawDate, setRawDate] = useState(initialSession?.rawDate || '2026-10-15');
  // Strictly SESSION I or SESSION II only
  const [sessionName, setSessionName] = useState<InvigilationSessionType>(
    initialSession?.session === 'SESSION III'
      ? 'SESSION III'
      : initialSession?.session === 'SESSION II'
      ? 'SESSION II'
      : 'SESSION I'
  );
  const [start, setStart] = useState(initialSession?.start || '08:00');
  const [end, setEnd] = useState(initialSession?.end || '10:30');
  const [subject, setSubject] = useState(initialSession?.subject || SUBJECT_LIST[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [level, setLevel] = useState<'CSEE' | 'ACSEE'>(initialSession?.level === 'ACSEE' ? 'ACSEE' : 'CSEE');
  const [className, setClassName] = useState(initialSession?.className || 'Form 1');
  const [stream, setStream] = useState(initialSession?.stream || 'STREAM A');
  const [rooms, setRooms] = useState(initialSession?.rooms || 3);

  // Dynamic Day calculation based on selected Date
  const { day: computedDay, formattedDate: computedFormattedDate } = getDayAndFormattedDate(rawDate);

  // When session changes, offer convenient default times if user hasn't edited them manually
  const handleSessionChange = (newSession: InvigilationSessionType) => {
    setSessionName(newSession);
    if (newSession === 'SESSION I') {
      if (start === '13:00' || start === '14:00' || start === '16:00') {
        setStart('08:00');
        setEnd('10:30');
      }
    } else if (newSession === 'SESSION II') {
      if (start === '08:00' || start === '09:00' || start === '16:00') {
        setStart('13:00');
        setEnd('15:30');
      }
    } else if (newSession === 'SESSION III') {
      if (start === '08:00' || start === '13:00') {
        setStart('16:00');
        setEnd('18:00');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawDate) {
      alert('Please select an examination date.');
      return;
    }

    const effectiveSubject = isCustomSubject && customSubject.trim() ? customSubject.trim() : subject;

    onSave({
      ...(initialSession ? { id: initialSession.id } : {}),
      rawDate,
      date: computedFormattedDate,
      day: computedDay,
      session: sessionName, // Guaranteed to be SESSION I or SESSION II
      start,
      end,
      time: `${start}-${end}`,
      subject: effectiveSubject,
      level,
      className,
      stream,
      rooms: Math.max(1, Math.min(10, Number(rooms) || 1))
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f4d8b] to-[#153460] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/10 text-white">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialSession ? 'Edit Examination Session' : 'Add Examination Session'}
              </h3>
              <p className="text-xs text-blue-200">
                Configure exam date, day, session slot (Session I or Session II), and room capacity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. DATE & DYNAMIC DAY DISPLAY */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Examination Date & Day
              </label>
              <span className="text-[11px] text-blue-700 font-medium">
                Day is automatically detected from selected date
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Date *</label>
                <input
                  type="date"
                  value={rawDate}
                  onChange={e => setRawDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg bg-white shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Day Display Badge */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Detected Day of Week</label>
                <div className="px-4 py-2 bg-white border border-blue-300 rounded-lg shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-black text-blue-950 uppercase tracking-wide">
                      {computedDay || 'Select a date'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {computedFormattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SESSION SELECTION (SESSION I, SESSION II, OR SESSION III) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Examination Session Slot *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSessionChange('SESSION I')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionName === 'SESSION I'
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-400 text-blue-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black tracking-wide">SESSION I</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    Morning
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Morning Slot (08:00 – 10:30)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSessionChange('SESSION II')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionName === 'SESSION II'
                    ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-400 text-indigo-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black tracking-wide">SESSION II</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Afternoon
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Afternoon Slot (13:00 – 15:30)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSessionChange('SESSION III')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionName === 'SESSION III'
                    ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-400 text-purple-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black tracking-wide">SESSION III</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                    Late / Pract.
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Evening / Practical Slot (16:00 – 18:00)
                </div>
              </button>
            </div>
          </div>

          {/* 3. TIME RANGE & PRESETS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Examination Time Range *
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {sessionName === 'SESSION I' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStart('08:00'); setEnd('10:30'); }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      08:00-10:30
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStart('08:00'); setEnd('11:00'); }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      08:00-11:00
                    </button>
                  </>
                ) : sessionName === 'SESSION II' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStart('13:00'); setEnd('15:30'); }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      13:00-15:30
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStart('14:00'); setEnd('16:30'); }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      14:00-16:30
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStart('15:30'); setEnd('17:30'); }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      15:30-17:30
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStart('16:00'); setEnd('18:00'); }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      16:00-18:00
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">End Time</label>
                <input
                  type="time"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. SUBJECT & LEVEL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Examination Subject *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSubject(!isCustomSubject)}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  {isCustomSubject ? 'Select Standard Subject' : 'Type Custom Subject'}
                </button>
              </div>

              {isCustomSubject ? (
                <input
                  type="text"
                  placeholder="Enter custom examination title..."
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  required={isCustomSubject}
                />
              ) : (
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  {SUBJECT_LIST.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Curriculum Level *
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value as 'CSEE' | 'ACSEE')}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                <option value="CSEE">CSEE (Ordinary Level - Form 1 to 4)</option>
                <option value="ACSEE">ACSEE (Advanced Level - Form 5 to 6)</option>
              </select>
            </div>
          </div>

          {/* 5. CLASS, STREAM & ROOMS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Class / Form *
              </label>
              <select
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                {DEFAULT_CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Stream / Combo *
              </label>
              <input
                type="text"
                value={stream}
                onChange={e => setStream(e.target.value)}
                placeholder="e.g. STREAM A, ALL STREAMS, PCM"
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Rooms Required (1 - 10) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rooms}
                  onChange={e => setRooms(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-center"
                  required
                />
                <span className="text-xs text-slate-500 font-semibold shrink-0">Room(s)</span>
              </div>
            </div>
          </div>

          {/* Preview summary box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Will create <strong>{rooms}</strong> invigilation room slots for <strong>{sessionName}</strong> on <strong>{computedDay || 'selected day'}</strong>.
              </span>
            </div>
            <span className="font-mono text-slate-600 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
              {start} - {end}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{initialSession ? 'Update Session' : 'Register Session'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
