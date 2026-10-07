import React, { useState } from 'react';
import { X, Save, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { TimetableAssignment, Teacher, ActivityType } from '../../types';
import { SUBJECT_LIST, EXTRA_CURRICULAR_ACTIVITIES } from '../../constants/defaults';
import { getSubjectColor, getTeacherColor } from '../../utils/colors';
import { renderExtraActivityIcon } from './ScheduleExtraCurricularModal';

interface EditSlotModalProps {
  slot: {
    className: string;
    stream: string;
    day: string;
    period: string;
    assignment?: TimetableAssignment;
  };
  teachers: Teacher[];
  onSave: (data: {
    className: string;
    stream: string;
    day: string;
    period: string;
    subject: string;
    teacherId?: number;
    room?: string;
    activityType: ActivityType;
    customNote?: string;
    applySchoolWide?: boolean;
    isManual?: boolean;
    isLocked?: boolean;
    allocationMode?: 'manual' | 'auto';
  }) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}

export const EditSlotModal: React.FC<EditSlotModalProps> = ({
  slot,
  teachers,
  onSave,
  onDelete,
  onClose
}) => {
  const existing = slot.assignment;

  const [subject, setSubject] = useState(existing?.subject || 'Mathematics');
  const [teacherId, setTeacherId] = useState<number | undefined>(existing?.teacherId || (teachers[0]?.id));
  const [activityType, setActivityType] = useState<ActivityType>(existing?.activityType || 'academic');
  const [room, setRoom] = useState(existing?.room || '');
  const [customNote, setCustomNote] = useState(existing?.customNote || '');
  const [applySchoolWide, setApplySchoolWide] = useState(false);
  const [isLocked, setIsLocked] = useState(existing?.isLocked ?? true);

  const handleActivitySelect = (act: typeof EXTRA_CURRICULAR_ACTIVITIES[0]) => {
    setSubject(act.name);
    setActivityType(act.id as ActivityType);
    if (act.id === 'sports') {
      setRoom('School Sports Grounds');
    } else if (act.id === 'environmental') {
      setRoom('School Compound / Environment');
    } else if (act.id === 'debates') {
      setRoom('Main School Hall');
    } else if (act.id === 'religion') {
      setRoom('Chapel / Mosque / Hall');
    } else if (act.id === 'breakfast') {
      setRoom('Dining Hall / Cafeteria');
    } else if (act.id === 'lunch') {
      setRoom('Dining Hall');
    } else if (act.id === 'assembly') {
      setRoom('Assembly Grounds');
    } else if (act.id === 'library') {
      setRoom('School Library');
    } else if (act.id === 'weekly_test') {
      setRoom('Classrooms / Exam Hall');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Please enter or select a subject/activity name.');
      return;
    }
    onSave({
      className: slot.className,
      stream: slot.stream,
      day: slot.day,
      period: slot.period,
      subject,
      teacherId: ['breakfast', 'lunch', 'environmental', 'sports', 'assembly', 'clubs', 'religion', 'library', 'weekly_test'].includes(activityType) ? (teacherId || undefined) : teacherId,
      room,
      activityType,
      customNote,
      applySchoolWide,
      isManual: true,
      isLocked,
      allocationMode: 'manual'
    });
    onClose();
  };

  const subCol = getSubjectColor(subject);
  const teacherCol = getTeacherColor(teacherId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>Edit Period Assignment</span>
              {existing && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  Existing
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {slot.className} • {slot.stream} • {slot.day} • {slot.period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Quick Extra-Curricular Templates */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Extra-Curricular Activities (1-Click Select)
              </span>
              <span className="text-[11px] font-normal text-slate-400">Click to assign instantly</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {EXTRA_CURRICULAR_ACTIVITIES.map(act => {
                const isSelected = subject === act.name;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleActivitySelect(act)}
                    style={{
                      backgroundColor: isSelected ? act.bg : '#ffffff',
                      borderColor: isSelected ? act.color : '#e2e8f0',
                      color: isSelected ? act.text : '#334155'
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all hover:shadow-xs flex items-center gap-1.5 cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-0 font-bold shadow-2xs' : 'hover:border-slate-300'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: act.color, color: '#ffffff' }}
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0 shadow-2xs"
                    >
                      {renderExtraActivityIcon(act.icon, "w-3 h-3 text-white")}
                    </span>
                    <span className="truncate text-[11px] font-semibold">{act.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Selection / Input */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Subject / Period Activity *
            </label>
            <div className="flex gap-2">
              <select
                value={subject}
                onChange={e => {
                  setSubject(e.target.value);
                  const isAct = EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === e.target.value);
                  if (isAct) {
                    const match = EXTRA_CURRICULAR_ACTIVITIES.find(a => a.name === e.target.value);
                    setActivityType((match?.id || 'academic') as ActivityType);
                  } else {
                    setActivityType('academic');
                  }
                }}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Academic Subjects">
                  {SUBJECT_LIST.filter(s => !EXTRA_CURRICULAR_ACTIVITIES.some(a => a.name === s)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
                <optgroup label="Extra-Curricular / Special Periods">
                  {EXTRA_CURRICULAR_ACTIVITIES.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {/* Color Preview Badge */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Color Preview:</span>
              <span
                style={{ backgroundColor: subCol.bg, color: subCol.text, borderColor: subCol.border }}
                className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
              >
                {subject}
              </span>
            </div>
          </div>

          {/* Teacher Selection */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Assigned Teacher / Coordinator
            </label>
            <select
              value={teacherId || ''}
              onChange={e => setTeacherId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Specific Teacher / Auto Supervised --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.initial}) - {t.subjects.join(', ')}
                </option>
              ))}
            </select>
            {teacherId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Teacher Initial Badge:</span>
                <span
                  style={{ backgroundColor: teacherCol.hex, color: '#ffffff' }}
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold shadow-xs"
                >
                  {teachers.find(t => t.id === teacherId)?.initial || '--'}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {teachers.find(t => t.id === teacherId)?.name}
                </span>
              </div>
            )}
          </div>

          {/* Room / Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Room / Venue (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lab 2, Pitch A, Hall"
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Note / Theme (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Tree Planting, Topic 4"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lock / Manual Protection Checkbox */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <input
              type="checkbox"
              id="isLockedPeriod"
              checked={isLocked}
              onChange={e => setIsLocked(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isLockedPeriod" className="text-xs text-emerald-950 cursor-pointer">
              <span className="font-bold block flex items-center gap-1.5">
                <span>🔒 Linda Kipindi hiki dhidi ya Auto-Generator (Lock from Auto-Generate)</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">Manual Protection</span>
              </span>
              Kipindi hiki kitalindwa na hakitafutwa wala kuingiliwa unapofanya Auto-Generate au AI scheduling.
            </label>
          </div>

          {/* Apply School Wide Checkbox */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <input
              type="checkbox"
              id="applySchoolWide"
              checked={applySchoolWide}
              onChange={e => setApplySchoolWide(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="applySchoolWide" className="text-xs text-amber-900 cursor-pointer">
              <span className="font-bold block">Apply to ALL streams & classes across the school</span>
              Convenient for school-wide events (e.g. Environmental Day on Friday Period 7, Sports & Games on Wednesday).
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {existing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear this period assignment?')) {
                    onDelete(existing.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Period
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Assignment
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
