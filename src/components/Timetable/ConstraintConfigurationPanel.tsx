import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  BookOpen, 
  Calendar, 
  Save, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Info, 
  Zap, 
  Check, 
  X, 
  Coffee, 
  ChevronRight, 
  Award,
  Layers,
  Flame,
  ArrowRight
} from 'lucide-react';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting 
} from '../../types';
import { 
  TimetableConstraintsConfig, 
  DEFAULT_CONSTRAINTS_CONFIG, 
  validateTimetableAgainstConstraints,
  ConstraintValidationReport,
  TeacherAvailabilityWindow
} from '../../utils/timetableConstraintValidator';

interface ConstraintConfigurationPanelProps {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  savedConfig?: TimetableConstraintsConfig;
  onSaveConfig?: (config: TimetableConstraintsConfig) => void;
  onNavigateToEditSlot?: (className: string, stream: string, day: string, period: string) => void;
}

export const ConstraintConfigurationPanel: React.FC<ConstraintConfigurationPanelProps> = ({
  assignments,
  teachers,
  periodSettings,
  streamSettings,
  savedConfig,
  onSaveConfig,
  onNavigateToEditSlot
}) => {
  const [config, setConfig] = useState<TimetableConstraintsConfig>(savedConfig || DEFAULT_CONSTRAINTS_CONFIG);
  
  // Sync internal state if savedConfig changes from parent
  React.useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, [savedConfig]);

  const [selectedTeacherForWindow, setSelectedTeacherForWindow] = useState<number>(teachers[0]?.id || 1);
  const [newDoubleSubject, setNewDoubleSubject] = useState<string>('');
  const [savedSuccessToast, setSavedSuccessToast] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'rules_config' | 'validation_report'>('rules_config');

  // Run the Heuristic Validation Algorithm on the current timetable
  const validationReport: ConstraintValidationReport = useMemo(() => {
    return validateTimetableAgainstConstraints(
      assignments,
      teachers,
      periodSettings,
      streamSettings,
      config
    );
  }, [assignments, teachers, periodSettings, streamSettings, config]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const standardPeriods = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Period 8'];

  // Handle saving the configuration
  const handleSavePolicies = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSaveConfig) {
      onSaveConfig(config);
    }
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 4000);
  };

  // Toggle day for teacher availability
  const handleToggleTeacherDay = (tId: number, day: string) => {
    const teacher = teachers.find(t => t.id === tId);
    if (!teacher) return;

    const currentWindow: TeacherAvailabilityWindow = config.teacherAvailabilityWindows.windows[tId] || {
      teacherId: tId,
      teacherName: teacher.name,
      unavailableDays: [],
      unavailablePeriods: []
    };

    const isAlreadyBlocked = currentWindow.unavailableDays.includes(day);
    const nextDays = isAlreadyBlocked
      ? currentWindow.unavailableDays.filter(d => d !== day)
      : [...currentWindow.unavailableDays, day];

    setConfig(prev => ({
      ...prev,
      teacherAvailabilityWindows: {
        ...prev.teacherAvailabilityWindows,
        windows: {
          ...prev.teacherAvailabilityWindows.windows,
          [tId]: {
            ...currentWindow,
            unavailableDays: nextDays
          }
        }
      }
    }));
  };

  // Toggle period for teacher availability
  const handleToggleTeacherPeriod = (tId: number, period: string) => {
    const teacher = teachers.find(t => t.id === tId);
    if (!teacher) return;

    const currentWindow: TeacherAvailabilityWindow = config.teacherAvailabilityWindows.windows[tId] || {
      teacherId: tId,
      teacherName: teacher.name,
      unavailableDays: [],
      unavailablePeriods: []
    };

    const isAlreadyBlocked = currentWindow.unavailablePeriods.includes(period);
    const nextPeriods = isAlreadyBlocked
      ? currentWindow.unavailablePeriods.filter(p => p !== period)
      : [...currentWindow.unavailablePeriods, period];

    setConfig(prev => ({
      ...prev,
      teacherAvailabilityWindows: {
        ...prev.teacherAvailabilityWindows,
        windows: {
          ...prev.teacherAvailabilityWindows.windows,
          [tId]: {
            ...currentWindow,
            unavailablePeriods: nextPeriods
          }
        }
      }
    }));
  };

  // Add double period subject
  const handleAddDoubleSubject = () => {
    if (!newDoubleSubject.trim()) return;
    if (!config.doublePeriodConstraints.requiredSubjects.includes(newDoubleSubject.trim())) {
      setConfig(prev => ({
        ...prev,
        doublePeriodConstraints: {
          ...prev.doublePeriodConstraints,
          requiredSubjects: [...prev.doublePeriodConstraints.requiredSubjects, newDoubleSubject.trim()]
        }
      }));
    }
    setNewDoubleSubject('');
  };

  // Remove double period subject
  const handleRemoveDoubleSubject = (sub: string) => {
    setConfig(prev => ({
      ...prev,
      doublePeriodConstraints: {
        ...prev.doublePeriodConstraints,
        requiredSubjects: prev.doublePeriodConstraints.requiredSubjects.filter(s => s !== sub)
      }
    }));
  };

  const activeTeacherWindow = config.teacherAvailabilityWindows.windows[selectedTeacherForWindow] || {
    teacherId: selectedTeacherForWindow,
    teacherName: teachers.find(t => t.id === selectedTeacherForWindow)?.name || '',
    unavailableDays: [],
    unavailablePeriods: []
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1f4d8b] via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              Constraint Configuration &amp; Rule Engine
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">
              Heuristic Validator Active
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Timetable Rules &amp; Punctuality Constraints
          </h2>
          <p className="text-xs text-blue-200 max-w-2xl">
            Configure institutional limits like teacher maximum daily lessons, double period requirements, and teacher off-duty windows, with live heuristic conflict auditing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSubTab(activeSubTab === 'rules_config' ? 'validation_report' : 'rules_config')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer ${
              activeSubTab === 'validation_report'
                ? 'bg-blue-600 text-white shadow-blue-600/30'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit Report ({validationReport.overallComplianceScore}%)</span>
          </button>

          <button
            type="button"
            onClick={handleSavePolicies}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>Save Rules</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Constraint rules successfully saved and applied to the timetable heuristic validator!
          </span>
          <button
            type="button"
            onClick={() => setSavedSuccessToast(false)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Compliance Overview KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Compliance Score</span>
            <div className={`p-1.5 rounded-xl ${validationReport.overallComplianceScore >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black ${validationReport.overallComplianceScore >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {validationReport.overallComplianceScore}%
            </span>
            <span className="text-xs font-bold text-slate-400">Quality Score</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {validationReport.overallComplianceScore >= 90 ? 'Excellent institutional compliance' : 'Review suggested optimizations'}
          </p>
        </div>

        {/* Critical Issues */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase">Critical Conflicts</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-rose-600">{validationReport.criticalIssuesCount}</span>
            <span className="text-xs font-bold text-rose-700">Hard Breaches</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Teacher overloads or unavailable window assignments
          </p>
        </div>

        {/* Warnings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase">Pedagogical Warnings</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-600">{validationReport.warningIssuesCount}</span>
            <span className="text-xs font-bold text-amber-700">Warnings</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Single practical lessons or consecutive sessions
          </p>
        </div>

        {/* Total Assignments Checked */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase">Timetable Slots</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{assignments.length}</span>
            <span className="text-xs font-bold text-blue-600">Assigned Lessons</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Across {teachers.length} teachers &amp; {streamSettings.length} classes
          </p>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('rules_config')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'rules_config'
              ? 'bg-blue-600 text-white shadow-xs font-black'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>1. Rule Configuration &amp; Policies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('validation_report')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'validation_report'
              ? 'bg-blue-600 text-white shadow-xs font-black'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>2. Live Heuristic Validation Report ({validationReport.issues.length} Items)</span>
        </button>
      </div>

      {activeSubTab === 'rules_config' ? (
        /* RULE CONFIGURATION PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RULE 1: Max Lessons per Day per Teacher */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Rule 1: Max Lessons per Day per Teacher
                  </h3>
                  <p className="text-xs text-slate-500">
                    Caps the daily workload of faculty to avoid burnout and balance teaching hours.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.maxLessonsPerDayPerTeacher.enabled}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  maxLessonsPerDayPerTeacher: { ...prev.maxLessonsPerDayPerTeacher, enabled: e.target.checked }
                }))}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-1 rounded"
              />
            </div>

            {config.maxLessonsPerDayPerTeacher.enabled && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Daily Maximum Teaching Cap:
                  </label>
                  <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    {config.maxLessonsPerDayPerTeacher.limit} Lessons / Day
                  </span>
                </div>

                <input
                  type="range"
                  min={2}
                  max={8}
                  value={config.maxLessonsPerDayPerTeacher.limit}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    maxLessonsPerDayPerTeacher: { ...prev.maxLessonsPerDayPerTeacher, limit: Number(e.target.value) }
                  }))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                  <span>2 Lessons (Light)</span>
                  <span>4 Lessons (Standard)</span>
                  <span>8 Lessons (Heavy)</span>
                </div>
              </div>
            )}
          </div>

          {/* RULE 2: Double Period Constraints */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-2xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Rule 2: Double Period Constraints
                  </h3>
                  <p className="text-xs text-slate-500">
                    Requires practical STEM and laboratory subjects to be scheduled as continuous double periods.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.doublePeriodConstraints.enabled}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  doublePeriodConstraints: { ...prev.doublePeriodConstraints, enabled: e.target.checked }
                }))}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-1 rounded"
              />
            </div>

            {config.doublePeriodConstraints.enabled && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Subjects Requiring Double Periods:
                </label>

                {/* Subject Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {config.doublePeriodConstraints.requiredSubjects.map(sub => (
                    <span
                      key={sub}
                      className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoubleSubject(sub)}
                        className="text-purple-600 hover:text-rose-600 font-black cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add new subject input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add subject (e.g. Basic Applied Mathematics)..."
                    value={newDoubleSubject}
                    onChange={e => setNewDoubleSubject(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDoubleSubject(); } }}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddDoubleSubject}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Add Subject
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RULE 3: Teacher Availability Windows (Off-Duty Matrix) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Rule 3: Teacher Availability Windows &amp; Off-Duty Windows
                  </h3>
                  <p className="text-xs text-slate-500">
                    Block specific days or periods when teachers are on academic leave, administrative duties, or commuting.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.teacherAvailabilityWindows.enabled}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  teacherAvailabilityWindows: { ...prev.teacherAvailabilityWindows, enabled: e.target.checked }
                }))}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-1 rounded"
              />
            </div>

            {config.teacherAvailabilityWindows.enabled && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-800">
                    Select Teacher to Configure Window:
                  </label>
                  <select
                    value={selectedTeacherForWindow}
                    onChange={e => setSelectedTeacherForWindow(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 max-w-xs"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subjects.slice(0, 2).join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unavailable Days Toggles */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-2">
                    Blocked / Off-Duty Days for <span className="text-blue-700 font-extrabold">{activeTeacherWindow.teacherName}</span>:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {daysOfWeek.map(day => {
                      const isBlocked = activeTeacherWindow.unavailableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleTeacherDay(selectedTeacherForWindow, day)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            isBlocked
                              ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{day.slice(0, 3)}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${isBlocked ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>
                            {isBlocked ? 'Unavailable' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unavailable Periods Toggles */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-2">
                    Blocked Periods (Off-Duty Slots):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {standardPeriods.map(p => {
                      const isBlocked = activeTeacherWindow.unavailablePeriods.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleToggleTeacherPeriod(selectedTeacherForWindow, p)}
                          className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                            isBlocked
                              ? 'bg-rose-50 border-rose-300 text-rose-900 font-black'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-[11px]">{p}</span>
                          <span className={`text-[9px] ${isBlocked ? 'text-rose-700 font-black' : 'text-slate-400'}`}>
                            {isBlocked ? 'Blocked' : 'Open'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RULE 4: Consecutive Lessons Limit */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Rule 4: Continuous Teaching Limit (Rest Gap)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ensures teachers do not exceed maximum back-to-back periods without a free period.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.consecutiveLessonsLimit.enabled}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  consecutiveLessonsLimit: { ...prev.consecutiveLessonsLimit, enabled: e.target.checked }
                }))}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-1 rounded"
              />
            </div>

            {config.consecutiveLessonsLimit.enabled && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Max Continuous Lessons:
                  </label>
                  <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    {config.consecutiveLessonsLimit.maxConsecutive} Periods
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={config.consecutiveLessonsLimit.maxConsecutive}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    consecutiveLessonsLimit: { ...prev.consecutiveLessonsLimit, maxConsecutive: Number(e.target.value) }
                  }))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* RULE 5: Morning Cognitive Priority */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-50 text-sky-700 rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Rule 5: Morning Cognitive Load Priority
                  </h3>
                  <p className="text-xs text-slate-500">
                    Prioritizes Mathematics and core Science subjects in early morning periods (Periods 1–4).
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.morningSciencePriority.enabled}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  morningSciencePriority: { ...prev.morningSciencePriority, enabled: e.target.checked }
                }))}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-1 rounded"
              />
            </div>

            {config.morningSciencePriority.enabled && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs text-slate-600">
                  Heavy subjects ({config.morningSciencePriority.scienceSubjects.join(', ')}) will be flagged if scheduled after Period {config.morningSciencePriority.cutoffPeriodIndex}.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VALIDATION AUDIT REPORT TAB */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Heuristic Timetable Constraint Audit
              </h3>
              <p className="text-xs text-slate-500">
                Detailed validation breakdown comparing all {assignments.length} timetable periods against active institutional rules
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              validationReport.overallComplianceScore >= 90
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {validationReport.overallComplianceScore}% Overall Score
            </span>
          </div>

          {/* Issues List */}
          <div className="space-y-3">
            {validationReport.issues.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-emerald-950">Zero Rule Violations Found!</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Your timetable schedule satisfies all user-defined constraints: no teacher daily overloads, valid double periods, compliant availability windows, and proper rest gaps.
                </p>
              </div>
            ) : (
              validationReport.issues.map((issue, idx) => (
                <div
                  key={issue.id || idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    issue.severity === 'CRITICAL'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : issue.severity === 'WARNING'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-sky-50/70 border-sky-200 text-sky-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {issue.severity === 'CRITICAL' && <XCircle className="w-5 h-5 text-rose-600" />}
                        {issue.severity === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                        {issue.severity === 'SUGGESTION' && <Sparkles className="w-5 h-5 text-sky-600" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-xs">{issue.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            issue.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : issue.severity === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          {issue.description}
                        </p>

                        {/* Suggested Auto Fix Box */}
                        {issue.suggestedFix && (
                          <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-slate-200/80 text-[11px] font-medium text-slate-800 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span><strong>Recommended Fix:</strong> {issue.suggestedFix}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
