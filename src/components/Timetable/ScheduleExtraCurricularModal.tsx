import React, { useState } from 'react';
import {
  X,
  Clock,
  Sparkles,
  Calendar,
  Building,
  User,
  Check,
  AlertCircle,
  Coffee,
  Utensils,
  BookMarked,
  Trees,
  Trophy,
  MessageSquare,
  BookOpen,
  Users,
  Library,
  FileCheck
} from 'lucide-react';
import { PeriodSetting, Teacher, TimetableAssignment, ActivityType } from '../../types';
import { DAYS_OF_WEEK, DEFAULT_CLASSES, EXTRA_CURRICULAR_ACTIVITIES } from '../../constants/defaults';

const getStreamsForClass = (_className: string): string[] => {
  return ['STREAM A', 'STREAM B'];
};

interface ScheduleExtraCurricularModalProps {
  initialActivity?: typeof EXTRA_CURRICULAR_ACTIVITIES[0] | null;
  periodSettings: PeriodSetting[];
  teachers: Teacher[];
  assignments: TimetableAssignment[];
  onSaveSchedule: (data: {
    activity: typeof EXTRA_CURRICULAR_ACTIVITIES[0];
    day: string;
    periodName: string;
    startTime: string;
    endTime: string;
    isSchoolWide: boolean;
    targetClass?: string;
    targetStream?: string;
    teacherId?: number;
    room: string;
    customNote?: string;
    syncToPeriodSettings: boolean;
  }) => void;
  onClose: () => void;
}

export const renderExtraActivityIcon = (iconName: string, className = "w-4 h-4") => {
  switch (iconName) {
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'BookMarked':
      return <BookMarked className={className} />;
    case 'Trees':
      return <Trees className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'MessageSquare':
      return <MessageSquare className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Library':
      return <Library className={className} />;
    case 'FileCheck':
      return <FileCheck className={className} />;
    case 'Sparkles':
    default:
      return <Sparkles className={className} />;
  }
};

function calculateMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Invalid time range';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours} hr ${mins} min (${minutes} mins)`;
  if (hours > 0) return `${hours} hr (${minutes} mins)`;
  return `${mins} minutes`;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  if (!time) return '09:00';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutesToAdd;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export const ScheduleExtraCurricularModal: React.FC<ScheduleExtraCurricularModalProps> = ({
  initialActivity,
  periodSettings,
  teachers,
  assignments,
  onSaveSchedule,
  onClose
}) => {
  const defaultAct = initialActivity || EXTRA_CURRICULAR_ACTIVITIES[0];
  const [selectedActivity, setSelectedActivity] = useState<typeof EXTRA_CURRICULAR_ACTIVITIES[0]>(defaultAct);
  const [day, setDay] = useState<string>('Friday');

  // Time & Period state - FULLY EDITABLE
  const getDefaultTimesForActivity = (actId: string) => {
    switch (actId) {
      case 'breakfast':
        return { start: '09:20', end: '09:40', periodName: 'Breakfast Break', room: 'Dining Hall / Cafeteria' };
      case 'lunch':
        return { start: '12:40', end: '14:00', periodName: 'Lunch Break', room: 'Dining Hall' };
      case 'religion':
        return { start: '11:20', end: '12:00', periodName: 'Religion Period', room: 'Chapel / Mosque / Hall' };
      case 'praying':
        return { start: '12:40', end: '13:20', periodName: 'Praying / Devotion', room: 'Mosque / Chapel / Multi-purpose Hall' };
      case 'sports':
        return { start: '14:00', end: '15:30', periodName: 'Period 7 (Sports)', room: 'School Sports Grounds' };
      case 'environmental':
        return { start: '14:00', end: '15:00', periodName: 'Period 7 (Environment)', room: 'School Compound' };
      case 'debates':
        return { start: '14:00', end: '15:00', periodName: 'Debates & Speech', room: 'Main School Hall' };
      case 'assembly':
        return { start: '07:30', end: '08:00', periodName: 'General Assembly', room: 'Assembly Grounds' };
      case 'clubs':
        return { start: '14:00', end: '15:30', periodName: 'Clubs & Societies', room: 'School Hall & Clubs' };
      case 'library':
        return { start: '14:00', end: '15:00', periodName: 'Library & Private Study', room: 'School Library' };
      case 'weekly_test':
        return { start: '07:30', end: '09:00', periodName: 'Weekly Test', room: 'Classrooms / Exam Hall' };
      default:
        return { start: '14:00', end: '15:30', periodName: `${selectedActivity.name} Period`, room: 'School Compound' };
    }
  };

  const initialDefaults = getDefaultTimesForActivity(defaultAct.id);

  const [periodName, setPeriodName] = useState<string>(initialDefaults.periodName);
  const [startTime, setStartTime] = useState<string>(initialDefaults.start);
  const [endTime, setEndTime] = useState<string>(initialDefaults.end);
  const [room, setRoom] = useState<string>(initialDefaults.room);
  const [customNote, setCustomNote] = useState<string>('');
  const [isSchoolWide, setIsSchoolWide] = useState<boolean>(true);
  const [targetClass, setTargetClass] = useState<string>(DEFAULT_CLASSES[0]);
  const [targetStream, setTargetStream] = useState<string>('STREAM A');
  const [teacherId, setTeacherId] = useState<number | undefined>(undefined);
  const [syncToPeriodSettings, setSyncToPeriodSettings] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When activity changes, update recommended defaults while keeping time editable
  const handleSelectActivity = (act: typeof EXTRA_CURRICULAR_ACTIVITIES[0]) => {
    setSelectedActivity(act);
    const def = getDefaultTimesForActivity(act.id);
    setPeriodName(def.periodName);
    setStartTime(def.start);
    setEndTime(def.end);
    setRoom(def.room);
    setErrorMsg(null);
  };

  // Quick duration adjusters
  const handleSetDuration = (durationMinutes: number) => {
    if (!startTime) return;
    setEndTime(addMinutesToTime(startTime, durationMinutes));
  };

  // Pick from existing periods for this day
  const existingPeriodsForDay = periodSettings.filter(p => p.day === day);

  const handleSelectExistingPeriod = (pName: string) => {
    const found = existingPeriodsForDay.find(p => p.name === pName);
    if (found) {
      setPeriodName(found.name);
      setStartTime(found.start);
      setEndTime(found.end);
    }
  };

  const durationMins = calculateMinutes(startTime, endTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName.trim()) {
      setErrorMsg('Please specify a period name or label.');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMsg('Please enter both start time and end time.');
      return;
    }
    if (endTime <= startTime) {
      setErrorMsg('End time must be later than start time.');
      return;
    }

    onSaveSchedule({
      activity: selectedActivity,
      day,
      periodName: periodName.trim(),
      startTime,
      endTime,
      isSchoolWide,
      targetClass: isSchoolWide ? undefined : targetClass,
      targetStream: isSchoolWide ? undefined : targetStream,
      teacherId,
      room: room.trim() || 'School Grounds',
      customNote: customNote.trim() || undefined,
      syncToPeriodSettings
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Schedule Extra-Curricular Period</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Select any activity and configure fully editable start and end times, days, and stream scopes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: ACTIVITY SELECTION */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span>1. Choose Extra-Curricular Activity</span>
              <span className="text-[11px] font-normal text-slate-400">1-click select</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {EXTRA_CURRICULAR_ACTIVITIES.map(act => {
                const isSelected = selectedActivity.id === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleSelectActivity(act)}
                    style={{
                      borderColor: isSelected ? act.color : '#e2e8f0',
                      backgroundColor: isSelected ? act.bg : '#ffffff',
                      color: isSelected ? act.text : '#475569'
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer hover:shadow-xs ${
                      isSelected ? 'ring-2 ring-offset-1 font-bold shadow-xs' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        style={{ backgroundColor: act.color, color: '#ffffff' }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                      >
                        {renderExtraActivityIcon(act.icon, "w-4 h-4")}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: act.color }} />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold leading-tight line-clamp-2">
                      {act.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: DAY SELECTION */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>2. Select Day of the Week</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {DAYS_OF_WEEK.map(d => {
                const isSelected = day === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: EDITABLE TIME & PERIOD NAME */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>3. Period Time (Editable - Not Fixed)</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Duration: {formatDuration(durationMins)}
              </span>
            </div>

            {/* Existing periods quick dropdown */}
            {existingPeriodsForDay.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-amber-200/80">
                <span className="text-[11px] font-semibold text-slate-600">
                  Or pick existing {day} slot:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {existingPeriodsForDay.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectExistingPeriod(p.name)}
                      className="px-2 py-0.5 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {p.name} ({p.start}-{p.end})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Period Name / Label *
                </label>
                <input
                  type="text"
                  value={periodName}
                  onChange={e => setPeriodName(e.target.value)}
                  placeholder="e.g. Period 7 (Sports)"
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Start Time (Editable) *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  End Time (Editable) *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Quick Duration Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                Quick Duration Adjusters (Auto-sets End Time from Start Time):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '20 min (Short Break)', min: 20 },
                  { label: '30 min', min: 30 },
                  { label: '40 min (Standard Period)', min: 40 },
                  { label: '60 min (1 hr)', min: 60 },
                  { label: '80 min (Double Period)', min: 80 },
                  { label: '90 min (1.5 hr)', min: 90 },
                  { label: '120 min (2 hr)', min: 120 }
                ].map(item => (
                  <button
                    key={item.min}
                    type="button"
                    onClick={() => handleSetDuration(item.min)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sync to Period Settings Checkbox */}
            <label className="flex items-center gap-2 pt-1 text-xs text-amber-950 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={syncToPeriodSettings}
                onChange={e => setSyncToPeriodSettings(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>
                <strong>Add or update this time slot in Period Settings</strong> (ensures period column displays with this exact time on {day})
              </span>
            </label>
          </div>

          {/* STEP 4: SCOPE (SCHOOL-WIDE VS SINGLE STREAM) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              4. Target Class & Stream Scope
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                isSchoolWide ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="scope"
                  checked={isSchoolWide}
                  onChange={() => setIsSchoolWide(true)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Apply School-Wide (All Classes & Streams)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Recommended for Sports & Games, Environmental Day, Religion, Assemblies, and Lunch Breaks.
                  </p>
                </div>
              </label>

              <label className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                !isSchoolWide ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="scope"
                  checked={!isSchoolWide}
                  onChange={() => setIsSchoolWide(false)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Single Class & Stream Only</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Schedule for one specific form stream (e.g. Form 1 STREAM A Sports or Debates).
                  </p>
                </div>
              </label>
            </div>

            {!isSchoolWide && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Select Class</label>
                  <select
                    value={targetClass}
                    onChange={e => {
                      setTargetClass(e.target.value);
                      const streams = getStreamsForClass(e.target.value);
                      setTargetStream(streams[0] || 'STREAM A');
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {DEFAULT_CLASSES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Select Stream</label>
                  <select
                    value={targetStream}
                    onChange={e => setTargetStream(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {getStreamsForClass(targetClass).map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* STEP 5: VENUE & COORDINATOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Venue / Room (Editable)</span>
              </label>
              <input
                type="text"
                value={room}
                onChange={e => setRoom(e.target.value)}
                placeholder="e.g. School Sports Grounds, Hall"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Assigned Coordinator / Teacher (Optional)</span>
              </label>
              <select
                value={teacherId || ''}
                onChange={e => setTeacherId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Specific Teacher / Auto-Supervised --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.initial})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Custom Topic / Special Note (Optional)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="e.g. Inter-House Football Championship, Tree Planting, Form 1–4 joint debate"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{ backgroundColor: selectedActivity.color }}
              className="px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-95 flex items-center gap-2 transition-all cursor-pointer"
            >
              {renderExtraActivityIcon(selectedActivity.icon, "w-4 h-4")}
              <span>Save & Schedule {selectedActivity.name}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
