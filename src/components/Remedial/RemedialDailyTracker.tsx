import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle2, XCircle, Clock, Filter, User, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { getRemedialTimetable, markRemedialAttendance, getRemedialAttendance } from '../../lib/remedialService';
import { RemedialDashboardSummary } from './RemedialDashboardSummary';

interface RemedialDailyTrackerProps {
  schoolId: string;
  currentUser: any;
}

export const RemedialDailyTracker: React.FC<RemedialDailyTrackerProps> = ({ schoolId, currentUser }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timetable, setTimetable] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = days[new Date(selectedDate).getDay()];

  useEffect(() => {
    loadData();
  }, [selectedDate, schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all remedial periods for this day of week
      const { data: tt } = await getRemedialTimetable(schoolId);
      const todayTt = (tt || []).filter(item => item.day_of_week === currentDayName);
      setTimetable(todayTt);

      // 2. Fetch existing attendance for this specific date
      const { data: att } = await getRemedialAttendance(schoolId, selectedDate);
      const attMap: Record<string, any> = {};
      (att || []).forEach(record => {
        const key = `${record.period_time}_${record.class_name}`;
        attMap[key] = record;
      });
      setAttendance(attMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (period: any, status: 'taught' | 'not_taught') => {
    const key = `${period.period_time}_${period.class_name}`;
    setMarkingId(key);
    
    const record = {
      date: selectedDate,
      day_of_week: currentDayName,
      period_time: period.period_time,
      class_name: period.class_name,
      subject: period.subject,
      teacher_name: period.teacher_name,
      stream: period.stream || 'A',
      status,
      marked_by: currentUser?.fullName || 'Academic',
      rate_per_period: 5000 // Default, can be dynamic
    };

    try {
      await markRemedialAttendance(schoolId, record);
      setAttendance(prev => ({
        ...prev,
        [key]: record
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-r from-rose-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-300 text-[10px] font-black uppercase tracking-widest mb-1">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            Daily Ticking / Mahudhurio ya Remedial
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Kutiki Masomo ya Ziada</h2>
          <p className="text-rose-100 text-xs font-medium">Leo ni {currentDayName}, {format(new Date(selectedDate), 'dd-MM-yyyy')}. Weka alama ya vipindi vilivyofundishwa.</p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm">
          <Calendar className="w-5 h-5 text-rose-300" />
          <div>
            <label className="block text-[8px] font-black uppercase text-rose-200">Badili Tarehe</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm font-black focus:ring-0 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Remedial Key Executive Dashboard Summary */}
      <RemedialDashboardSummary
        schoolId={schoolId}
      />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Vipindi vilivyopangwa kwa {currentDayName}
          </h3>
          <button 
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={async () => {
              if (confirm('Weka vipindi vyote vya remedial vya leo kuwa VILIFUNDISHWA?')) {
                for (const period of timetable) {
                  await handleMark(period, 'taught');
                }
              }
            }}
            disabled={loading || timetable.length === 0}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg shadow-sm transition flex items-center gap-1.5 uppercase disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Fill All
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 font-bold text-sm">Inapakia ratiba na mahudhurio...</p>
            </div>
          ) : timetable.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
              <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-black text-sm uppercase">Hakuna vipindi vilivyopangwa kwa siku ya {currentDayName}</p>
              <p className="text-slate-300 text-[10px] mt-1 italic">Nenda kwenye 'Remedial Table' kuweka ratiba ya masomo ya ziada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timetable.map((period) => {
                const key = `${period.period_time}_${period.class_name}`;
                const record = attendance[key];
                const isMarking = markingId === key;
                const isTaught = record?.status === 'taught';
                const isNotTaught = record?.status === 'not_taught';

                return (
                  <div key={key} className={`group relative border rounded-2xl p-5 transition-all duration-300 ${
                    isTaught ? 'bg-emerald-50/50 border-emerald-200 shadow-sm' : 
                    isNotTaught ? 'bg-rose-50/50 border-rose-200' : 
                    'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-xs ${
                          isTaught ? 'bg-emerald-600 text-white' : 
                          isNotTaught ? 'bg-rose-600 text-white' : 
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {period.period_time.split('-')[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{period.subject}</h4>
                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md uppercase">{period.class_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                            <Clock className="w-3 h-3" /> {period.period_time}
                            <span>•</span>
                            <User className="w-3 h-3" /> {period.teacher_name}
                          </div>
                        </div>
                      </div>

                      {record && (
                        <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          isTaught ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isTaught ? 'Kilifundishwa' : 'Hakikufundishwa'}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleMark(period, 'taught')}
                        disabled={isMarking}
                        className={`py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          isTaught ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                        }`}
                      >
                        {isMarking && markingId === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Taught
                      </button>
                      <button
                        onClick={() => handleMark(period, 'not_taught')}
                        disabled={isMarking}
                        className={`py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          isNotTaught ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200'
                        }`}
                      >
                        {isMarking && markingId === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Not Taught
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
