import React, { useState } from 'react';
import { 
  Sliders, 
  Clock, 
  Coffee, 
  Utensils, 
  Calendar, 
  CheckCircle2, 
  Save, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { InstitutionalPolicy } from '../../types';

interface InstitutionalPoliciesTabProps {
  policy?: InstitutionalPolicy;
  onUpdatePolicy: (policy: InstitutionalPolicy) => void;
}

const DEFAULT_POLICY: InstitutionalPolicy = {
  totalPeriodsPerDay: 8,
  periodDurationMinutes: 40,
  breakAfterPeriod: 3,
  lunchAfterPeriod: 6,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  maxPeriodsPerTeacherPerDay: 4,
  rules: {
    noTeacherTwoClassesSameTime: true,
    noClassTwoTeachersSameTime: true,
    noSameSubjectTwiceSameDay: true,
  }
};

export const InstitutionalPoliciesTab: React.FC<InstitutionalPoliciesTabProps> = ({
  policy,
  onUpdatePolicy
}) => {
  const [formData, setFormData] = useState<InstitutionalPolicy>(policy || DEFAULT_POLICY);
  const [savedToast, setSavedToast] = useState(false);

  const handleWorkingDaysToggle = (day: string) => {
    if (formData.workingDays.includes(day)) {
      if (formData.workingDays.length > 1) {
        setFormData({
          ...formData,
          workingDays: formData.workingDays.filter(d => d !== day)
        });
      }
    } else {
      setFormData({
        ...formData,
        workingDays: [...formData.workingDays, day]
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePolicy(formData);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#1f4d8b] to-blue-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">Institutional Timetable Policies</h2>
            <p className="text-xs text-blue-200">Configure daily periods, break durations, working days, and timetable integrity rules</p>
          </div>
        </div>

        <button
          type="submit"
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] w-fit"
        >
          <Save className="w-4 h-4" />
          <span>Save Policies</span>
        </button>
      </div>

      {savedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">Institutional policies successfully saved and applied to timetable engine!</span>
        </div>
      )}

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Bell Schedule & Period Configuration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Daily Period Configuration
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Total Periods per Day
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={formData.totalPeriodsPerDay}
                  onChange={(e) => setFormData({ ...formData, totalPeriodsPerDay: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-slate-500">Periods scheduled per working day (standard 8)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Single Period Duration (Minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={20}
                  max={90}
                  value={formData.periodDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, periodDurationMinutes: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-slate-500">Minutes per period (standard 40 min)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  <span>Morning Tea Break</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600">After Period:</span>
                  <input
                    type="number"
                    min={1}
                    max={formData.totalPeriodsPerDay - 2}
                    value={formData.breakAfterPeriod}
                    onChange={(e) => setFormData({ ...formData, breakAfterPeriod: Number(e.target.value) })}
                    className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-black text-amber-950 text-center"
                  />
                </div>
              </div>

              <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-900 mb-1">
                  <Utensils className="w-3.5 h-3.5 text-orange-600" />
                  <span>Lunch Break</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-600">After Period:</span>
                  <input
                    type="number"
                    min={formData.breakAfterPeriod + 1}
                    max={formData.totalPeriodsPerDay - 1}
                    value={formData.lunchAfterPeriod}
                    onChange={(e) => setFormData({ ...formData, lunchAfterPeriod: Number(e.target.value) })}
                    className="w-16 px-2 py-1 bg-white border border-orange-300 rounded-lg text-xs font-black text-orange-950 text-center"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Maximum Periods per Teacher per Day
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={formData.maxPeriodsPerTeacherPerDay}
                  onChange={(e) => setFormData({ ...formData, maxPeriodsPerTeacherPerDay: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-slate-500">Limits teacher daily load to prevent fatigue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Working Days & Conflict Rules */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Working Days & Conflict Rules
            </h3>
          </div>

          {/* Working Days */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Teaching Days per Week:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                const isSelected = formData.workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleWorkingDaysToggle(day)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-800 border-blue-300' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{day.slice(0, 3)}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Institutional Rules Toggles */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-700 block">
              Conflict Prevention Rules:
            </label>

            {/* Rule 1 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  1. Teacher Double-Booking Prevention
                </span>
                <span className="text-[11px] text-slate-500">
                  No teacher is scheduled to teach 2 classes during the same period.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.rules.noTeacherTwoClassesSameTime}
                onChange={(e) => setFormData({
                  ...formData,
                  rules: { ...formData.rules, noTeacherTwoClassesSameTime: e.target.checked }
                })}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-0.5 rounded"
              />
            </div>

            {/* Rule 2 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  2. Classroom Collision Prevention
                </span>
                <span className="text-[11px] text-slate-500">
                  No classroom stream has 2 teachers or subjects assigned at the same period.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.rules.noClassTwoTeachersSameTime}
                onChange={(e) => setFormData({
                  ...formData,
                  rules: { ...formData.rules, noClassTwoTeachersSameTime: e.target.checked }
                })}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-0.5 rounded"
              />
            </div>

            {/* Rule 3 */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  3. Subject Daily Spread Rule
                </span>
                <span className="text-[11px] text-slate-500">
                  The same subject is not scheduled twice on the same day unless booked as a double period.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.rules.noSameSubjectTwiceSameDay}
                onChange={(e) => setFormData({
                  ...formData,
                  rules: { ...formData.rules, noSameSubjectTwiceSameDay: e.target.checked }
                })}
                className="w-5 h-5 accent-blue-600 cursor-pointer mt-0.5 rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
