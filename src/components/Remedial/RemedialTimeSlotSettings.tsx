import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  Settings2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  X,
  PlusCircle,
  Check
} from 'lucide-react';
import { 
  RemedialTimeSlot, 
  getRemedialTimeSlots, 
  saveRemedialTimeSlot, 
  deleteRemedialTimeSlot,
  getRemedialGlobalSettings,
  saveRemedialGlobalSettings,
  saveRemedialTimeSlotBatch,
  RemedialGlobalSettings
} from '../../lib/remedialService';
import { ALL_SCHOOL_CLASSES } from '../../constants/defaults';

interface RemedialTimeSlotSettingsProps {
  schoolId: string;
  registeredClasses?: string[];
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const RemedialTimeSlotSettings: React.FC<RemedialTimeSlotSettingsProps> = ({ 
  schoolId,
  registeredClasses = []
}) => {
  const [slots, setSlots] = useState<RemedialTimeSlot[]>([]);
  const [globalSettings, setGlobalSettings] = useState<RemedialGlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<RemedialTimeSlot>>({
    class_name: registeredClasses[0] || 'Form 4',
    start_time: '16:00',
    end_time: '17:30',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    session_type: 'Evening'
  });
  const [applyToAllClasses, setApplyToAllClasses] = useState(false);

  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [generateMorning, setGenerateMorning] = useState(false);
  const [generateEvening, setGenerateEvening] = useState(true);
  const [globalFormData, setGlobalFormData] = useState<Partial<RemedialGlobalSettings>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    defaultStartTime: '16:00',
    defaultEndTime: '17:30',
    morningStartTime: '06:30',
    morningEndTime: '07:30',
    eveningPeriodCount: 1,
    eveningPeriods: [
      { periodNumber: 1, startTime: '16:00', endTime: '17:30' }
    ],
    activeDaysPreset: 'MON_FRI',
    customDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slotsRes, globalRes] = await Promise.all([
        getRemedialTimeSlots(schoolId),
        getRemedialGlobalSettings(schoolId)
      ]);
      setSlots(slotsRes.data || []);
      if (globalRes) {
        setGlobalSettings(globalRes);
        setGlobalFormData({
          ...globalRes,
          eveningPeriodCount: globalRes.eveningPeriodCount || 1,
          eveningPeriods: globalRes.eveningPeriods?.length ? globalRes.eveningPeriods : [
            { periodNumber: 1, startTime: globalRes.defaultStartTime || '16:00', endTime: globalRes.defaultEndTime || '17:30' }
          ],
          activeDaysPreset: globalRes.activeDaysPreset || 'MON_FRI',
          customDays: globalRes.customDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class_name && !applyToAllClasses) return;
    setSaving(true);
    try {
      if (applyToAllClasses) {
        const targetClasses = registeredClasses.length > 0 ? registeredClasses : ALL_SCHOOL_CLASSES;
        const batch = targetClasses.map(className => ({
          ...formData,
          class_name: className
        }));
        await saveRemedialTimeSlotBatch(schoolId, batch);
        setSuccess(`Templates kwa madarasa yote (${targetClasses.length}) zimehifadhiwa!`);
      } else {
        await saveRemedialTimeSlot(schoolId, formData);
        setSuccess('Muda wa Remedial umehifadhiwa!');
      }
      setIsAdding(false);
      setApplyToAllClasses(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const activeDaysList = useMemo(() => {
    const preset = globalFormData.activeDaysPreset || 'MON_FRI';
    if (preset === 'MON_FRI') return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (preset === 'MON_THU') return ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    if (preset === 'MON_SAT') return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return globalFormData.customDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [globalFormData.activeDaysPreset, globalFormData.customDays]);

  const pulledDatesCount = useMemo(() => {
    if (!globalFormData.startDate || !globalFormData.endDate) return 0;
    const start = new Date(globalFormData.startDate);
    const end = new Date(globalFormData.endDate);
    if (end < start) return 0;
    let count = 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const cur = new Date(start);
    while (cur <= end) {
      const name = dayNames[cur.getDay()];
      if (activeDaysList.includes(name)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [globalFormData.startDate, globalFormData.endDate, activeDaysList]);

  const handleEveningCountChange = (count: number) => {
    const existing = globalFormData.eveningPeriods || [];
    const updated = [];
    for (let i = 1; i <= count; i++) {
      if (existing[i - 1]) {
        updated.push(existing[i - 1]);
      } else if (i === 1) {
        updated.push({ periodNumber: 1, startTime: '16:00', endTime: '17:00' });
      } else if (i === 2) {
        updated.push({ periodNumber: 2, startTime: '17:05', endTime: '18:05' });
      } else {
        updated.push({ periodNumber: i, startTime: '18:10', endTime: '19:10' });
      }
    }
    setGlobalFormData(prev => ({
      ...prev,
      eveningPeriodCount: count,
      eveningPeriods: updated,
      defaultStartTime: updated[0]?.startTime || '16:00',
      defaultEndTime: updated[updated.length - 1]?.endTime || '17:30'
    }));
  };

  const handlePeriodTimeChange = (index: number, field: 'startTime' | 'endTime', val: string) => {
    const list = [...(globalFormData.eveningPeriods || [])];
    if (list[index]) {
      list[index] = { ...list[index], [field]: val };
      setGlobalFormData(prev => ({
        ...prev,
        eveningPeriods: list,
        defaultStartTime: list[0]?.startTime || prev.defaultStartTime,
        defaultEndTime: list[list.length - 1]?.endTime || prev.defaultEndTime
      }));
    }
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...globalFormData,
        customDays: activeDaysList
      };
      await saveRemedialGlobalSettings(schoolId, payload);
      
      if (generateMorning || generateEvening) {
        const newSlots: Partial<RemedialTimeSlot>[] = [];
        const targetClasses = registeredClasses.length > 0 ? registeredClasses : ALL_SCHOOL_CLASSES;
        
        for (const className of targetClasses) {
          if (generateMorning) {
            newSlots.push({
              class_name: className,
              start_time: globalFormData.morningStartTime || '06:30',
              end_time: globalFormData.morningEndTime || '07:30',
              days: activeDaysList,
              session_type: 'Morning'
            });
          }
          
          if (generateEvening) {
            const periods = globalFormData.eveningPeriods && globalFormData.eveningPeriods.length > 0
              ? globalFormData.eveningPeriods
              : [{ periodNumber: 1, startTime: globalFormData.defaultStartTime || '16:00', endTime: globalFormData.defaultEndTime || '17:30' }];

            periods.forEach(p => {
              newSlots.push({
                class_name: className,
                start_time: p.startTime,
                end_time: p.endTime,
                days: activeDaysList,
                session_type: 'Evening'
              });
            });
          }
        }
        
        if (newSlots.length > 0) {
          await saveRemedialTimeSlotBatch(schoolId, newSlots);
        }
      }

      setSuccess(`Mipangilio na Templates kwa siku ${pulledDatesCount} zimehifadhiwa kwa madarasa ${registeredClasses.length}!`);
      setIsEditingGlobal(false);
      loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Una uhakika unataka kufuta muda huu?')) return;
    try {
      await deleteRemedialTimeSlot(schoolId, id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDay = (day: string) => {
    const current = formData.days || [];
    if (current.includes(day)) {
      setFormData({ ...formData, days: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, days: [...current, day] });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Global Program Settings */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Mpango wa Remedial (Global Program)
            </h3>
            <p className="text-xs text-slate-500 font-bold">
              Weka tarehe za kuanza na kuisha kwa program nzima na muda wa kawaida.
            </p>
          </div>
          <button
            onClick={() => setIsEditingGlobal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition shadow-lg shadow-blue-100"
          >
            <Settings2 className="w-4 h-4" />
            HARIRI MPANGO
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tarehe ya Kuanza</p>
            <p className="text-sm font-black text-slate-900">{globalSettings?.startDate || 'Huijapangwa'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tarehe ya Kuisha</p>
            <p className="text-sm font-black text-slate-900">{globalSettings?.endDate || 'Huijapangwa'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Muda wa Kuanza</p>
            <p className="text-sm font-black text-slate-900">{globalSettings?.defaultStartTime || '16:00'}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Muda wa Kuisha</p>
            <p className="text-sm font-black text-slate-900">{globalSettings?.defaultEndTime || '17:30'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-600" />
              Mipangilio ya Muda kwa Madarasa (Templates)
            </h3>
            <p className="text-xs text-slate-500 font-bold">
              Weka muda maalum kwa kila darasa ikiwa ni tofauti na mpango mkuu.
            </p>
          </div>
          <button
            onClick={() => {
              setFormData({
                class_name: 'Form 4',
                start_time: globalSettings?.defaultStartTime || '16:00',
                end_time: globalSettings?.defaultEndTime || '17:30',
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                session_type: 'Evening'
              });
              setIsAdding(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition shadow-lg shadow-indigo-100"
          >
            <PlusCircle className="w-4 h-4" />
            WEKA TEMPLATE MPYA
          </button>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <Clock className="w-10 h-10 text-slate-200 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Inapakia mipangilio...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <Settings2 className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Bado hujaweka muda wowote</p>
              <p className="text-xs text-slate-500 mt-1">Bonyeza kitufe cha juu kuanza.</p>
            </div>
          ) : (
            slots.map(slot => (
              <div key={slot.id} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition group">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    {slot.class_name}
                  </span>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Muda wa Remedial</p>
                      <p className="text-sm font-black text-slate-900">{slot.start_time} — {slot.end_time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Siku za Wiki</p>
                      <p className="text-[11px] font-bold text-slate-700 line-clamp-1">
                        {slot.days.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Aina: {slot.session_type}</span>
                    <button
                      onClick={() => {
                        setFormData(slot);
                        setIsAdding(true);
                      }}
                      className="text-[10px] font-black text-indigo-600 hover:underline uppercase"
                    >
                      Hariri
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Global Settings Modal */}
      {isEditingGlobal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-white" />
                <h3 className="font-black text-lg uppercase tracking-tight">Mpango wa Remedial</h3>
              </div>
              <button onClick={() => setIsEditingGlobal(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGlobal} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
              {/* 1. Tarehe za Kuanza na Kuisha */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1">
                  1. Mfumo wa Tarehe (Date Range)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tarehe ya Kuanza:</label>
                    <input
                      type="date"
                      value={globalFormData.startDate}
                      onChange={e => setGlobalFormData({ ...globalFormData, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tarehe ya Kuisha:</label>
                    <input
                      type="date"
                      value={globalFormData.endDate}
                      onChange={e => setGlobalFormData({ ...globalFormData, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Siku za Remedial (Days Option) */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1">
                  2. Siku za Remedial (Active Days)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'MON_FRI', label: 'Jumatatu - Ijumaa (Mon - Fri)', desc: 'Siku za kazi pekee (Haina Jumamosi)' },
                    { id: 'MON_THU', label: 'Jumatatu - Alhamisi (Mon - Thu)', desc: 'Siku 4 za mwanzo wa wiki' },
                    { id: 'MON_SAT', label: 'Jumatatu - Jumamosi (Mon - Sat)', desc: 'Inajumuisha na Jumamosi' },
                    { id: 'CUSTOM', label: 'Siku Maalum (Custom)', desc: 'Chagua siku kwa tiki' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGlobalFormData({ ...globalFormData, activeDaysPreset: opt.id as any })}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition ${
                        globalFormData.activeDaysPreset === opt.id
                          ? 'bg-blue-50 border-blue-600 text-blue-950 font-black ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {globalFormData.activeDaysPreset === 'CUSTOM' && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {DAYS_OF_WEEK.map(day => {
                      const isSel = globalFormData.customDays?.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const cur = globalFormData.customDays || [];
                            const next = isSel ? cur.filter(d => d !== day) : [...cur, day];
                            setGlobalFormData({ ...globalFormData, customDays: next });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition ${
                            isSel ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Date pulls badge */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>📅 Siku zilizovutwa kati ya tarehe hizi:</span>
                  <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black rounded-xl">
                    {pulledDatesCount} Siku za Remedial
                  </span>
                </div>
              </div>

              {/* 3. Idadi ya Vipindi vya Jioni (Evening Periods Setup) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    3. Idadi ya Vipindi vya Jioni (Evening Periods)
                  </h4>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    Sio lazima viwe viwili tu!
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Chagua Vipindi vingapi jioni:</span>
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleEveningCountChange(num)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition ${
                        (globalFormData.eveningPeriodCount || 1) === num
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Kipindi {num} {num === 1 ? '(Kimoja)' : num === 2 ? '(Viwili)' : `(${num})`}
                    </button>
                  ))}
                </div>

                {/* Per-period time inputs */}
                <div className="space-y-2 pt-2">
                  {(globalFormData.eveningPeriods || []).map((p, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Kipindi cha {p.periodNumber || idx + 1} Cha Jioni</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">Kuanza:</span>
                          <input
                            type="time"
                            value={p.startTime}
                            onChange={e => handlePeriodTimeChange(idx, 'startTime', e.target.value)}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono"
                          />
                        </div>
                        <span className="text-slate-400 font-bold">—</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500">Kuisha:</span>
                          <input
                            type="time"
                            value={p.endTime}
                            onChange={e => handlePeriodTimeChange(idx, 'endTime', e.target.value)}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Auto-Generate templates toggle */}
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Auto-Generate Timetable Templates</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${generateEvening ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={generateEvening} 
                        onChange={() => setGenerateEvening(!generateEvening)} 
                      />
                      {generateEvening && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Tengeneza templates za Remedial ya Jioni kwa madarasa na mikondo yote</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${generateMorning ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={generateMorning} 
                        onChange={() => setGenerateMorning(!generateMorning)} 
                      />
                      {generateMorning && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-700">Pia tengeneza templates za Remedial ya Asubuhi (Morning Pre-prep)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-xl shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>HIFADHI NA TIBU TEMPLATE YA REMEDIAL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-indigo-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-300" />
                <h3 className="font-black text-lg uppercase tracking-tight">Weka Muda wa Remedial</h3>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Darasa:</label>
                  <select
                    value={formData.class_name}
                    onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    {ALL_SCHOOL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Session:</label>
                  <select
                    value={formData.session_type}
                    onChange={e => {
                      const type = e.target.value as 'Morning' | 'Evening' | 'Weekend';
                      let start = formData.start_time;
                      let end = formData.end_time;
                      
                      if (type === 'Morning') {
                        start = globalSettings?.morningStartTime || '06:30';
                        end = globalSettings?.morningEndTime || '07:30';
                      } else if (type === 'Evening') {
                        start = globalSettings?.defaultStartTime || '16:00';
                        end = globalSettings?.defaultEndTime || '17:30';
                      }
                      
                      setFormData({ ...formData, session_type: type, start_time: start, end_time: end });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    <option value="Morning">Asubuhi (Morning)</option>
                    <option value="Evening">Jioni (Evening)</option>
                    <option value="Weekend">Wikiendi (Weekend)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Muda wa Kuanza:</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Muda wa Kuisha:</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Siku zinazohusika:</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const isSelected = formData.days?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${applyToAllClasses ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={applyToAllClasses} 
                      onChange={() => setApplyToAllClasses(!applyToAllClasses)} 
                    />
                    {applyToAllClasses && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-700">Tumia muda huu kwa madarasa YOTE ya shule</span>
                </label>
                <p className="text-[10px] text-indigo-600 font-bold italic">
                  * Hii itatengeneza templates kwa kila darasa liliopo kwenye mfumo.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving || !formData.days?.length}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {saving ? <Plus className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  HIFADHI TEMPLATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
