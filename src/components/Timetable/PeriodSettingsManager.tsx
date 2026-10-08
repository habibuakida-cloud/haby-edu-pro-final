import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check, 
  AlertCircle, 
  Copy, 
  Search, 
  Coffee, 
  Utensils, 
  BookMarked, 
  BookOpen, 
  Trophy,
  Filter,
  Trees,
  MessageSquare,
  Users,
  Sparkles,
  Library,
  FileCheck
} from 'lucide-react';
import { PeriodSetting, TimetableAssignment } from '../../types';
import { DAYS_OF_WEEK, EXTRA_CURRICULAR_ACTIVITIES, TANZANIAN_TEMPLATE_PERIOD_SETTINGS } from '../../constants/defaults';
import { getDayTheme } from '../../utils/colors';

interface PeriodSettingsManagerProps {
  periodSettings: PeriodSetting[];
  onUpdatePeriodSettings: (settings: PeriodSetting[]) => void;
  assignments?: TimetableAssignment[];
  onUpdateAssignments?: (assignments: TimetableAssignment[]) => void;
  dayThemes?: Record<string, string>;
}

function calculateDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 0;
  return (eH * 60 + eM) - (sH * 60 + sM);
}

function getPeriodIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('tea')) {
    return <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
  }
  if (lower.includes('lunch') || lower.includes('meal')) {
    return <Utensils className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
  }
  if (lower.includes('religion') || lower.includes('dini') || lower.includes('bible') || lower.includes('quran')) {
    return <BookMarked className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  }
  if (lower.includes('sport') || lower.includes('game') || lower.includes('michezo')) {
    return <Trophy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
  }
  if (lower.includes('environ') || lower.includes('compound') || lower.includes('tree')) {
    return <Trees className="w-3.5 h-3.5 text-emerald-700 shrink-0" />;
  }
  if (lower.includes('debate') || lower.includes('speech') || lower.includes('dialogue')) {
    return <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
  }
  if (lower.includes('assembly') || lower.includes('baraza')) {
    return <Users className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
  }
  if (lower.includes('club') || lower.includes('society')) {
    return <Sparkles className="w-3.5 h-3.5 text-pink-600 shrink-0" />;
  }
  if (lower.includes('library') || lower.includes('study') || lower.includes('reading')) {
    return <Library className="w-3.5 h-3.5 text-teal-600 shrink-0" />;
  }
  if (lower.includes('weekly test') || lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) {
    return <FileCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
  }
  return <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
}

export const PeriodSettingsManager: React.FC<PeriodSettingsManagerProps> = ({
  periodSettings,
  onUpdatePeriodSettings,
  assignments = [],
  onUpdateAssignments,
  dayThemes
}) => {
  // Day filter
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Main Form State (Used for adding OR top-editing)
  const [formDay, setFormDay] = useState<string>('Monday');
  const [formName, setFormName] = useState<string>('Period 1');
  const [formStart, setFormStart] = useState<string>('08:00');
  const [formEnd, setFormEnd] = useState<string>('08:40');
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);

  // Inline Table Edit State (Allows editing directly inside the row)
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineDay, setInlineDay] = useState<string>('');
  const [inlineName, setInlineName] = useState<string>('');
  const [inlineStart, setInlineStart] = useState<string>('');
  const [inlineEnd, setInlineEnd] = useState<string>('');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Delete Confirmation Modal / Prompt State
  const [periodToDelete, setPeriodToDelete] = useState<PeriodSetting | null>(null);

  // Feedback Notification
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Duration of current form
  const formDuration = calculateDuration(formStart, formEnd);

  // Quick preset loader
  const applyPreset = (name: string, start: string, end: string) => {
    setFormName(name);
    setFormStart(start);
    setFormEnd(end);
  };

  const [presetCategory, setPresetCategory] = useState<'all' | 'extracurricular' | 'academic'>('all');

  // Quick extra-curricular preset loader with editable start/end times
  const applyExtraCurricularPreset = (act: typeof EXTRA_CURRICULAR_ACTIVITIES[0]) => {
    setFormName(act.name);
    let start = '14:00';
    let end = '15:30';
    if (act.id === 'breakfast') {
      start = '09:20';
      end = '09:40';
    } else if (act.id === 'lunch') {
      start = '12:40';
      end = '14:00';
    } else if (act.id === 'religion') {
      start = '11:20';
      end = '12:00';
    } else if (act.id === 'sports') {
      start = '14:00';
      end = '15:30';
    } else if (act.id === 'environmental') {
      start = '14:00';
      end = '15:00';
    } else if (act.id === 'debates') {
      start = '14:00';
      end = '15:00';
    } else if (act.id === 'assembly') {
      start = '07:30';
      end = '08:00';
    } else if (act.id === 'clubs') {
      start = '14:00';
      end = '15:30';
    } else if (act.id === 'library') {
      start = '14:00';
      end = '15:00';
    } else if (act.id === 'weekly_test') {
      start = '07:30';
      end = '09:00';
    }
    setFormStart(start);
    setFormEnd(end);
    showFeedback(`Selected "${act.name}". Period start & end times are editable below.`, 'info');
  };

  // Adjust duration by minutes from current formStart
  const setQuickDuration = (minutes: number) => {
    if (!formStart) return;
    const [h, m] = formStart.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    setFormEnd(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  // Stepper for adjusting time by +/- minutes
  const stepTime = (type: 'start' | 'end', deltaMinutes: number) => {
    const val = type === 'start' ? formStart : formEnd;
    if (!val) return;
    const [h, m] = val.split(':').map(Number);
    let total = h * 60 + m + deltaMinutes;
    if (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    const res = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    if (type === 'start') setFormStart(res);
    else setFormEnd(res);
  };

  // Start editing a period (loads into top form and scrolls to it)
  const handleStartEdit = (p: PeriodSetting) => {
    setEditingPeriodId(p.id);
    setFormDay(p.day);
    setFormName(p.name);
    setFormStart(p.start);
    setFormEnd(p.end);
    setInlineEditingId(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingPeriodId(null);
    setFormName('Period 1');
    setFormStart('08:00');
    setFormEnd('08:40');
  };

  // Start inline table editing
  const handleStartInlineEdit = (p: PeriodSetting) => {
    setInlineEditingId(p.id);
    setInlineDay(p.day);
    setInlineName(p.name);
    setInlineStart(p.start);
    setInlineEnd(p.end);
    // If top form was in edit mode for this, clear top edit
    if (editingPeriodId === p.id) {
      handleCancelEdit();
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  // Save changes from inline edit
  const handleSaveInlineEdit = () => {
    if (!inlineEditingId) return;
    const trimmedName = inlineName.trim();
    if (!trimmedName || !inlineStart || !inlineEnd) {
      showFeedback('Please fill in all period fields.', 'error');
      return;
    }
    if (inlineEnd <= inlineStart) {
      showFeedback('End time must be after start time.', 'error');
      return;
    }

    const existing = periodSettings.find(p => String(p.id) === String(inlineEditingId));
    if (!existing) return;

    // Check if name, time, or day changed, and update assignments automatically
    const nameChanged = existing.name !== trimmedName;
    const timeChanged = existing.start !== inlineStart || existing.end !== inlineEnd;
    const dayChanged = existing.day !== inlineDay;

    if ((nameChanged || timeChanged || dayChanged) && onUpdateAssignments && assignments.length > 0) {
      const oldKey = `${existing.name} (${existing.start}-${existing.end})`;
      const newKey = `${trimmedName} (${inlineStart}-${inlineEnd})`;
      const affectedAssignments = assignments.filter(
        a => a.day === existing.day && (a.period === existing.name || a.period === oldKey || a.periodName === existing.name)
      );
      if (affectedAssignments.length > 0) {
        const updatedAssignments = assignments.map(a => {
          if (a.day === existing.day && (a.period === existing.name || a.period === oldKey || a.periodName === existing.name)) {
            return { 
              ...a, 
              day: inlineDay, 
              period: a.period.includes('(') ? newKey : trimmedName,
              periodName: trimmedName 
            };
          }
          return a;
        });
        onUpdateAssignments(updatedAssignments);
      }
    }

    const updated = periodSettings.map(p => {
      if (String(p.id) === String(inlineEditingId)) {
        return {
          ...p,
          day: inlineDay,
          name: trimmedName,
          start: inlineStart,
          end: inlineEnd
        };
      }
      return p;
    });

    onUpdatePeriodSettings(updated);
    setInlineEditingId(null);
    showFeedback(`Period "${trimmedName}" updated and saved successfully!`);
  };

  // Save form (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName || !formStart || !formEnd) {
      showFeedback('Please enter period name, start time, and end time.', 'error');
      return;
    }
    if (formEnd <= formStart) {
      showFeedback('End time must be after start time.', 'error');
      return;
    }

    if (editingPeriodId !== null) {
      // EDIT MODE
      const existing = periodSettings.find(p => String(p.id) === String(editingPeriodId));
      if (!existing) return;

      const nameChanged = existing.name !== trimmedName;
      const timeChanged = existing.start !== formStart || existing.end !== formEnd;
      const dayChanged = existing.day !== formDay;

      if ((nameChanged || timeChanged || dayChanged) && onUpdateAssignments && assignments.length > 0) {
        const oldKey = `${existing.name} (${existing.start}-${existing.end})`;
        const newKey = `${trimmedName} (${formStart}-${formEnd})`;
        const affected = assignments.filter(
          a => a.day === existing.day && (a.period === existing.name || a.period === oldKey || a.periodName === existing.name)
        );
        if (affected.length > 0) {
          const updatedAssignments = assignments.map(a => {
            if (a.day === existing.day && (a.period === existing.name || a.period === oldKey || a.periodName === existing.name)) {
              return { 
                ...a, 
                day: formDay, 
                period: a.period.includes('(') ? newKey : trimmedName,
                periodName: trimmedName 
              };
            }
            return a;
          });
          onUpdateAssignments(updatedAssignments);
        }
      }

      const updated = periodSettings.map(p => {
        if (String(p.id) === String(editingPeriodId)) {
          return {
            ...p,
            day: formDay,
            name: trimmedName,
            start: formStart,
            end: formEnd
          };
        }
        return p;
      });

      onUpdatePeriodSettings(updated);
      showFeedback(`Saved changes to "${trimmedName}" (${formDay})!`);
      handleCancelEdit();
    } else {
      // ADD MODE
      // Check for duplicate period name on same day
      const duplicateIndex = periodSettings.findIndex(
        p => p.day === formDay && p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicateIndex > -1) {
        // If already exists on that day, update the time slot without blocking window.confirm
        const updated = [...periodSettings];
        updated[duplicateIndex] = {
          ...updated[duplicateIndex],
          start: formStart,
          end: formEnd
        };
        onUpdatePeriodSettings(updated);
        showFeedback(`Kipindi "${trimmedName}" (${formDay}) kimesasishwa: ${formStart} - ${formEnd}!`);
      } else {
        const newPeriod: PeriodSetting = {
          id: Date.now(),
          day: formDay,
          name: trimmedName,
          start: formStart,
          end: formEnd
        };

        onUpdatePeriodSettings([...periodSettings, newPeriod]);
        showFeedback(`Kipindi kipya "${trimmedName}" (${formDay}) kimeongezwa!`);
      }

      // Increment period name for next addition if standard period
      const match = trimmedName.match(/^Period\s*(\d+)$/i);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        setFormName(`Period ${nextNum}`);
      }
    }
  };

  // Immediate deletion without blocking modal or alert
  const promptDeletePeriod = (p: PeriodSetting) => {
    const targetId = p.id;

    // Check affected assignments
    if (assignments.length > 0 && onUpdateAssignments) {
      const updatedAssignments = assignments.filter(
        a => !(a.day === p.day && (a.period === p.name || a.periodName === p.name))
      );
      onUpdateAssignments(updatedAssignments);
    }

    const updatedPeriods = periodSettings.filter(item => String(item.id) !== String(targetId));
    onUpdatePeriodSettings(updatedPeriods);

    if (String(editingPeriodId) === String(targetId)) {
      handleCancelEdit();
    }
    if (String(inlineEditingId) === String(targetId)) {
      setInlineEditingId(null);
    }
    setSelectedIds(prev => prev.filter(id => String(id) !== String(targetId)));
    showFeedback(`Kipindi "${p.name}" (${p.day}) kimefutwa.`);
  };

  // Confirm delete (if modal is opened)
  const confirmDeletePeriod = () => {
    if (!periodToDelete) return;
    promptDeletePeriod(periodToDelete);
    setPeriodToDelete(null);
  };

  // Delete all selected directly without iframe blocking confirm
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const selectedStr = selectedIds.map(String);
    const updated = periodSettings.filter(p => !selectedStr.includes(String(p.id)));
    onUpdatePeriodSettings(updated);
    if (updated.length === 0 && onUpdateAssignments) {
      onUpdateAssignments([]);
    }
    setSelectedIds([]);
    showFeedback(`Vipindi vyote ${count} vilivyochaguliwa vimefutwa kikamilifu.`);
  };

  // Clear all periods for the currently filtered day or completely
  const handleClearDayPeriods = () => {
    if (selectedDayFilter === 'All') {
      onUpdatePeriodSettings([]);
      if (onUpdateAssignments) onUpdateAssignments([]);
      setSelectedIds([]);
      showFeedback('Vipindi vyote katika siku zote vimefutwa!', 'info');
      return;
    }

    const updated = periodSettings.filter(p => p.day !== selectedDayFilter);
    onUpdatePeriodSettings(updated);
    setSelectedIds(prev => prev.filter(id => {
      const p = periodSettings.find(x => x.id === id);
      return p && p.day !== selectedDayFilter;
    }));
    showFeedback(`Vipindi vyote vya siku ya ${selectedDayFilter} vimefutwa.`);
  };

  // Clear ALL periods across the entire school
  const handleClearAllPeriods = () => {
    onUpdatePeriodSettings([]);
    if (onUpdateAssignments) onUpdateAssignments([]);
    setSelectedIds([]);
    showFeedback('Vipindi vyote vimefutwa kikamilifu! Sasa unaweza kuanza upya kuweka muda wako.', 'info');
  };

  // Load standard Tanzanian timetable period template
  const handleLoadTanzanianTemplatePeriods = () => {
    onUpdatePeriodSettings(TANZANIAN_TEMPLATE_PERIOD_SETTINGS);
    showFeedback('Sampuli ya kawaida ya vipindi vya Tanzania imepakiwa.', 'success');
  };

  // Replicate Monday periods to all weekdays
  const handleReplicateMondayToWeekdays = () => {
    const mondayPeriods = periodSettings.filter(p => p.day === 'Monday');
    if (mondayPeriods.length === 0) {
      showFeedback('Hakuna vipindi vilivyowekwa kwa siku ya Jumatatu vya kunakili.', 'error');
      return;
    }

    const weekdays = ['Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const count = mondayPeriods.length;

    const newEntries: PeriodSetting[] = [];
    let idCounter = Date.now();

    weekdays.forEach(day => {
      mondayPeriods.forEach(mp => {
        // Only add if not already existing by name on that day
        const exists = periodSettings.some(p => p.day === day && p.name === mp.name);
        if (!exists) {
          newEntries.push({
            id: idCounter++,
            day,
            name: mp.name,
            start: mp.start,
            end: mp.end
          });
        }
      });
    });

    if (newEntries.length === 0) {
      showFeedback('All weekdays already have matching periods from Monday.', 'info');
      return;
    }

    onUpdatePeriodSettings([...periodSettings, ...newEntries]);
    showFeedback(`Successfully added ${newEntries.length} periods across Tuesday-Friday!`);
  };

  // Filtered periods
  const filteredPeriods = periodSettings
    .filter(p => {
      if (selectedDayFilter !== 'All' && p.day !== selectedDayFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.day.toLowerCase().includes(q) ||
          p.start.includes(q) ||
          p.end.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by day order then chronological start time
      const dayOrder = (d: string) => DAYS_OF_WEEK.indexOf(d);
      if (dayOrder(a.day) !== dayOrder(b.day)) {
        return dayOrder(a.day) - dayOrder(b.day);
      }
      
      const timeToMinutes = (timeStr: string) => {
        const [hrs, mins] = timeStr.split(':').map(Number);
        return hrs * 60 + mins;
      };
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });

  // Count assignments for a period
  const getAssignmentCount = (day: string, periodName: string) => {
    return assignments.filter(a => a.day === day && a.period === periodName).length;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div 
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : feedbackMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <Clock className="w-4 h-4 text-blue-600" />
            )}
            {feedbackMessage.text}
          </span>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Period Settings (Configure Daily Time Slots)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add new time slots, edit start/end times, and delete or replicate periods across days.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periodSettings.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllPeriods}
              className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Futa vipindi vyote ili kuanza upya kuweka muda wako mwenyewe"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Futa Vipindi Vyote (Anza Upya)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLoadTanzanianTemplatePeriods}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Pakia mfano wa kawaida wa vipindi vya Tanzania"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Pakia Sampuli ya Tanzania</span>
          </button>

          <button
            type="button"
            onClick={handleReplicateMondayToWeekdays}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Duplicate Monday schedule to Tuesday through Friday"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Replicate Mon to Weekdays</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Period Form */}
      <form 
        onSubmit={handleSaveForm}
        className={`p-4 rounded-xl border transition-colors ${
          editingPeriodId !== null 
            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300' 
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
            {editingPeriodId !== null ? (
              <>
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-900 font-bold">Edit Period Setting (ID: #{editingPeriodId})</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add New Teaching / Break Period</span>
              </>
            )}
          </span>

          {editingPeriodId !== null && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        {/* Presets Categories & Selector */}
        <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Period Templates & Extra-Curricular Activities</span>
            </span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPresetCategory('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                  presetCategory === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPresetCategory('extracurricular')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 ${
                  presetCategory === 'extracurricular' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-3 h-3" />
                Extra-Curricular (Editable Times)
              </button>
              <button
                type="button"
                onClick={() => setPresetCategory('academic')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 ${
                  presetCategory === 'academic' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Academic
              </button>
            </div>
          </div>

          {/* Extra-Curricular Activities (Placed for easy 1-click selection) */}
          {(presetCategory === 'all' || presetCategory === 'extracurricular') && (
            <div className="mb-2.5">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1.5">
                Extra-Curricular & Special Periods (Click to select — time is fully editable below):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {EXTRA_CURRICULAR_ACTIVITIES.map(act => {
                  const isCurrent = formName.toLowerCase().includes(act.name.toLowerCase()) || formName.toLowerCase().includes(act.id);
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => applyExtraCurricularPreset(act)}
                      style={{
                        backgroundColor: isCurrent ? act.bg : '#ffffff',
                        borderColor: isCurrent ? act.color : '#e2e8f0',
                        color: isCurrent ? act.text : '#334155'
                      }}
                      className={`p-1.5 rounded-lg border text-left text-xs font-semibold flex items-center gap-1.5 transition-all hover:shadow-xs cursor-pointer ${
                        isCurrent ? 'ring-2 ring-offset-0 font-bold shadow-2xs' : 'hover:border-slate-300'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: act.color, color: '#ffffff' }}
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-white"
                      >
                        {getPeriodIcon(act.name)}
                      </span>
                      <span className="truncate text-[11px]">{act.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Academic Teaching Periods */}
          {(presetCategory === 'all' || presetCategory === 'academic') && (
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Standard Academic Periods:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('Period 1', '08:00', '08:40')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P1 (08:00-08:40)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Period 2', '08:40', '09:20')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P2 (08:40-09:20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Period 3', '09:40', '10:20')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P3 (09:40-10:20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Period 4', '10:20', '11:00')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P4 (10:20-11:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Period 5', '11:20', '12:00')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P5 (11:20-12:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Period 6', '12:00', '12:40')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P6 (12:00-12:40)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Period 7', '14:00', '14:40')}
                  className="px-2 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  P7 (14:00-14:40)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Double Period', '08:00', '09:20')}
                  className="px-2 py-1 text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                >
                  Double Period (80 mins)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Day of Week *
            </label>
            <select
              value={formDay}
              onChange={e => setFormDay(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              {DAYS_OF_WEEK.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
              Period Name / Label *
            </label>
            <input
              type="text"
              placeholder="e.g. Period 1, Sports, or Lunch"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 uppercase block">
                Start Time (Editable) *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepTime('start', -15)}
                  title="Subtract 15 mins"
                  className="px-1 py-0.2 text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                >
                  -15m
                </button>
                <button
                  type="button"
                  onClick={() => stepTime('start', 15)}
                  title="Add 15 mins"
                  className="px-1 py-0.2 text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                >
                  +15m
                </button>
              </div>
            </div>
            <input
              type="time"
              value={formStart}
              onChange={e => setFormStart(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 uppercase block">
                End Time (Editable) *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => stepTime('end', -15)}
                  title="Subtract 15 mins"
                  className="px-1 py-0.2 text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                >
                  -15m
                </button>
                <button
                  type="button"
                  onClick={() => stepTime('end', 15)}
                  title="Add 15 mins"
                  className="px-1 py-0.2 text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                >
                  +15m
                </button>
              </div>
            </div>
            <input
              type="time"
              value={formEnd}
              onChange={e => setFormEnd(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              required
            />
          </div>
        </div>

        {/* Quick Duration Setters */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Quick Duration Adjusters:
          </span>
          {[
            { label: '20m', min: 20 },
            { label: '30m', min: 30 },
            { label: '40m (Std)', min: 40 },
            { label: '60m (1 hr)', min: 60 },
            { label: '80m (2 Period)', min: 80 },
            { label: '90m (1.5 hr)', min: 90 },
            { label: '120m (2 hr)', min: 120 }
          ].map(d => (
            <button
              key={d.min}
              type="button"
              onClick={() => setQuickDuration(d.min)}
              className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded transition-colors"
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Duration & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">Calculated Duration:</span>
            {formDuration > 0 ? (
              <span className="font-bold font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {formDuration} minutes {formDuration >= 60 ? `(${Math.floor(formDuration/60)}h ${formDuration%60}m)` : ''}
              </span>
            ) : (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> End time must be after start time
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editingPeriodId !== null ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formDuration <= 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Period Changes
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={formDuration <= 0}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Save & Add Period
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filter and Action Bar */}
      <div className="space-y-3">
        {/* Day Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter Day:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayFilter('All')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                selectedDayFilter === 'All'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Days ({periodSettings.length})
            </button>
            {DAYS_OF_WEEK.map(day => {
              const count = periodSettings.filter(p => p.day === day).length;
              const isSelected = selectedDayFilter === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {day} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search period..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-periods"
              checked={filteredPeriods.length > 0 && selectedIds.length === filteredPeriods.length}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedIds(filteredPeriods.map(p => p.id));
                } else {
                  setSelectedIds([]);
                }
              }}
              className="rounded border-slate-300 text-blue-600 cursor-pointer"
            />
            <label htmlFor="select-all-periods" className="font-semibold text-slate-600 cursor-pointer">
              Select All Shown ({filteredPeriods.length})
            </label>

            {selectedIds.length > 0 && (
              <span className="text-blue-700 font-bold ml-2">
                ({selectedIds.length} selected)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete Selected ({selectedIds.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleClearDayPeriods}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors"
            >
              Clear All {selectedDayFilter === 'All' ? 'Periods' : `for ${selectedDayFilter}`}
            </button>
          </div>
        </div>
      </div>

      {/* Table of Configured Periods */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] text-slate-700 font-bold uppercase tracking-wider">
              <th className="p-3 w-8 text-center border-r border-slate-200">#</th>
              <th className="p-3 border-r border-slate-200">Day</th>
              <th className="p-3 border-r border-slate-200">Period Name</th>
              <th className="p-3 border-r border-slate-200">Start Time</th>
              <th className="p-3 border-r border-slate-200">End Time</th>
              <th className="p-3 border-r border-slate-200 text-center">Duration</th>
              <th className="p-3 border-r border-slate-200 text-center">Lessons</th>
              <th className="p-3 text-center w-36">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPeriods.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                    <Clock className="w-8 h-8 text-blue-500/50" />
                    <p className="font-bold text-slate-700 text-sm">Hakuna vipindi vilivyowekwa kwa sasa.</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Uko tayari kuweka vipindi na muda wako mwenyewe! Tumia fomu ya juu kuongeza kipindi cha kwanza (k.m. Period 1, 08:00 - 08:40), au bofya kitufe cha chini kupakia sampuli ya kawaida ya Tanzania.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadTanzanianTemplatePeriods}
                      className="mt-2 px-3.5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pakia Sampuli ya Tanzania (Vipindi 7 / Siku)</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPeriods.map((p, idx) => {
                const isSelected = selectedIds.includes(p.id);
                const isInline = inlineEditingId === p.id;
                const isTopEditing = editingPeriodId === p.id;
                const duration = calculateDuration(isInline ? inlineStart : p.start, isInline ? inlineEnd : p.end);
                const lessonCount = getAssignmentCount(p.day, p.name);
                const dayTheme = getDayTheme(p.day, dayThemes);

                if (isInline) {
                  // INLINE EDITING ROW
                  return (
                    <tr key={p.id} className="bg-amber-50/80 border-b border-amber-200 ring-1 ring-amber-300">
                      <td className="p-2 text-center border-r border-amber-200">
                        <span className="font-mono text-[10px] text-amber-800 font-bold">EDIT</span>
                      </td>
                      <td className="p-2 border-r border-amber-200">
                        <select
                          value={inlineDay}
                          onChange={e => setInlineDay(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white font-semibold"
                        >
                          {DAYS_OF_WEEK.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 border-r border-amber-200">
                        <input
                          type="text"
                          value={inlineName}
                          onChange={e => setInlineName(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white font-bold text-slate-800"
                        />
                      </td>
                      <td className="p-2 border-r border-amber-200">
                        <input
                          type="time"
                          value={inlineStart}
                          onChange={e => setInlineStart(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white font-mono"
                        />
                      </td>
                      <td className="p-2 border-r border-amber-200">
                        <input
                          type="time"
                          value={inlineEnd}
                          onChange={e => setInlineEnd(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white font-mono"
                        />
                      </td>
                      <td className="p-2 border-r border-amber-200 text-center font-mono text-[11px] font-bold text-amber-900">
                        {duration > 0 ? `${duration}m` : 'Invalid'}
                      </td>
                      <td className="p-2 border-r border-amber-200 text-center text-slate-500 text-[11px]">
                        {lessonCount}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Save period changes"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelInlineEdit}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title="Cancel editing"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr 
                    key={p.id} 
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                      isTopEditing ? 'bg-amber-50/50' : isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="p-2.5 text-center border-r border-slate-100">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-2.5 border-r border-slate-100">
                      <span 
                        className="px-2 py-0.5 rounded text-[11px] font-bold inline-block"
                        style={{
                          backgroundColor: dayTheme?.bg || '#f1f5f9',
                          color: dayTheme?.text || '#334155',
                          border: `1px solid ${dayTheme?.border || '#cbd5e1'}`
                        }}
                      >
                        {p.day}
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        {getPeriodIcon(p.name)}
                        <span className="font-bold text-slate-800">{p.name}</span>
                        {isTopEditing && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-200 text-amber-900 rounded">
                            Active in Form
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono font-medium text-slate-700">
                      {p.start}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono font-medium text-slate-700">
                      {p.end}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-center font-mono text-[11px] text-slate-600 font-semibold">
                      {duration}m
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-center">
                      {lessonCount > 0 ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full">
                          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Button (Loads into top form OR inline) */}
                        <button
                          type="button"
                          onClick={() => handleStartInlineEdit(p)}
                          className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit period inline"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>

                        {/* Top Form Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                          title="Load into top period editor"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => promptDeletePeriod(p)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {periodToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">Confirm Period Deletion</h4>
                <p className="text-xs text-slate-500">This action will remove the period slot.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Period Name:</span>
                <span className="font-bold text-slate-800">{periodToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Day:</span>
                <span className="font-bold text-slate-800">{periodToDelete.day}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Time:</span>
                <span className="font-mono font-bold text-slate-800">{periodToDelete.start} - {periodToDelete.end}</span>
              </div>

              {getAssignmentCount(periodToDelete.day, periodToDelete.name) > 0 && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] font-medium flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warning:</strong> {getAssignmentCount(periodToDelete.day, periodToDelete.name)} timetable lesson(s) are currently scheduled during this period. Deleting will unassign these lessons from the timetable.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPeriodToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePeriod}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
