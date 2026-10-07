import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save, GraduationCap, BookOpen, User } from 'lucide-react';
import { saveRemedialTimetable, getRemedialTimetable } from '../../lib/remedialService';
import { DEFAULT_CLASSES, SUBJECT_LIST } from '../../constants/defaults';
import { Teacher } from '../../types';

interface RemedialTimetableSetupProps {
  schoolId: string;
  teachers: Teacher[];
}

export const RemedialTimetableSetup: React.FC<RemedialTimetableSetupProps> = ({ schoolId, teachers }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newEntry, setNewEntry] = useState({
    day_of_week: 'Monday',
    period_time: '16:00-17:00',
    class_name: 'Form One',
    subject: 'Basic Mathematics',
    teacher_name: '',
    stream: 'A',
    term: 'Term 1'
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const times = ['06:00-07:00', '15:30-16:30', '16:00-17:00', '16:30-17:30', '17:00-18:00'];

  useEffect(() => {
    loadTimetable();
  }, [schoolId]);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const { data } = await getRemedialTimetable(schoolId);
      if (data) setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.teacher_name) {
      alert('Tafadhali chagua mwalimu');
      return;
    }
    setSaving(true);
    try {
      await saveRemedialTimetable(schoolId, newEntry);
      loadTimetable();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta ratiba hii?')) return;
    try {
      const { supabase } = await import('../../lib/supabaseClient');
      await supabase.from('remedial_timetable').delete().eq('id', id);
      loadTimetable();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl border border-white/20">
            <Calendar className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Remedial Timetable Setup</h2>
            <p className="text-indigo-200 text-xs font-medium mt-0.5">Sanidi ratiba ya masomo ya ziada asubuhi na jioni kwa ajili ya malipo ya walimu.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to Add */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-4 h-4 text-indigo-600" /> Ongeza Kipindi Kipya
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Siku ya Wiki</label>
                <select 
                  value={newEntry.day_of_week}
                  onChange={e => setNewEntry({...newEntry, day_of_week: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Muda wa Kipindi</label>
                <select 
                  value={newEntry.period_time}
                  onChange={e => setNewEntry({...newEntry, period_time: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {times.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Kidato (Class)</label>
                <select 
                  value={newEntry.class_name}
                  onChange={e => setNewEntry({...newEntry, class_name: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Somo (Subject)</label>
                <select 
                  value={newEntry.subject}
                  onChange={e => setNewEntry({...newEntry, subject: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  {SUBJECT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1">Mwalimu</label>
                <select 
                  value={newEntry.teacher_name}
                  onChange={e => setNewEntry({...newEntry, teacher_name: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">-- Chagua Mwalimu --</option>
                  {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <button
                onClick={handleAddEntry}
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2 uppercase tracking-widest"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Plus className="w-4 h-4" />}
                Hifadhi Kwenye Ratiba
              </button>
            </div>
          </div>
        </div>

        {/* Display List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Ratiba ya Remedial Iliyopo
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold uppercase">{entries.length} Vipindi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-4">Day</th>
                    <th className="px-5 py-4">Time</th>
                    <th className="px-5 py-4">Class</th>
                    <th className="px-5 py-4">Subject</th>
                    <th className="px-5 py-4">Teacher</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-bold">Inapakia ratiba...</td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-bold italic text-sm">Hakuna vipindi vilivyopangwa bado.</td>
                    </tr>
                  ) : entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4 font-black text-indigo-700 uppercase tracking-tighter">{entry.day_of_week}</td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-600 tracking-tighter">{entry.period_time}</td>
                      <td className="px-5 py-4 font-bold text-slate-700">{entry.class_name}</td>
                      <td className="px-5 py-4 font-bold text-slate-900 uppercase tracking-tighter">{entry.subject}</td>
                      <td className="px-5 py-4 font-medium text-slate-600">{entry.teacher_name}</td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
