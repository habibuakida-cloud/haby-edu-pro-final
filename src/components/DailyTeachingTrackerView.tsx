import React, { useState, useEffect } from 'react';
import { DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/supabaseClient';
import { markPeriodAttendance, getPeriodAttendance } from '../lib/supabaseService';
import { Calendar, CheckCircle, AlertTriangle, Clock, BookOpen, User, Check, X, Shield, RefreshCw } from 'lucide-react';
import { DEFAULT_CLASSES } from '../constants/defaults';

interface DailyTeachingTrackerViewProps {
  currentUser?: any;
  schoolInfo?: any;
  timetableAssignments: any[];
  periodSettings: any[];
}

export const DailyTeachingTrackerView: React.FC<DailyTeachingTrackerViewProps> = ({ 
  currentUser, 
  schoolInfo,
  timetableAssignments = [],
  periodSettings = []
}) => {
  const [selectedClass, setSelectedClass] = useState('Form Two');
  const [selectedStream, setSelectedStream] = useState('A');
  const [todayDate, setTodayDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayName, setDayName] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  });

  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: 'taught' | 'not_taught'; reason?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const schoolId = currentUser?.schoolId || DEFAULT_PRIMARY_SCHOOL_ID;

  useEffect(() => {
    fetchTodayTimetableAndAttendance();
  }, [selectedClass, selectedStream, todayDate, timetableAssignments]);

  const fetchTodayTimetableAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Fetch timetable slots from passed timetableAssignments
      const filteredSlots = timetableAssignments
        .filter(a => a.day === dayName && a.className === selectedClass && (a.stream === selectedStream || !a.stream))
        .map(a => {
          const period = periodSettings.find(p => p.id === a.periodId);
          return {
            id: a.id,
            period_number: period?.number || 1,
            start_time: period?.startTime || '00:00',
            end_time: period?.endTime || '00:00',
            class_name: a.className,
            subject: a.subject,
            teacher_name: a.teacherName || 'Staff',
            stream: a.stream || 'A'
          };
        })
        .sort((a, b) => a.period_number - b.period_number);
      
      setTimetableSlots(filteredSlots);

      // 2. Fetch existing attendance records from Firestore for today, this class and stream
      const aData = await getPeriodAttendance(schoolId, todayDate, selectedClass);
      // Filter by stream locally if the service doesn't support it yet or to be safe
      const streamData = (aData || []).filter(a => a.stream === selectedStream);

      const attMap: Record<string, any> = {};
      streamData.forEach(a => {
        attMap[a.period_number] = { status: a.status, reason: a.reason || '' };
      });
      setAttendanceRecords(attMap);

    } catch (e) {
      console.warn("Error fetching daily tracker data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (slot: any, status: 'taught' | 'not_taught', reason = '') => {
    setSavingId(slot.id);
    const payload = {
      date: todayDate,
      day_of_week: dayName,
      period_number: slot.period_number,
      class_name: selectedClass,
      stream: slot.stream || 'A',
      subject: slot.subject,
      teacher_name: slot.teacher_name,
      status,
      reason: status === 'not_taught' ? reason : '',
      marked_at: new Date().toISOString()
    };

    try {
      await markPeriodAttendance(schoolId, payload);
      setAttendanceRecords(prev => ({
        ...prev,
        [slot.period_number]: { status, reason: payload.reason }
      }));
    } catch (err) {
      console.warn("Error saving attendance:", err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-white/15 text-blue-200 text-xs font-black uppercase px-3 py-1 rounded-full border border-white/20">
            Daily Teacher Attendance & Period Ticker
          </span>
          <h2 className="text-2xl font-black mt-2">Ufuatiliaji wa Vipindi vya Kila Siku</h2>
          <p className="text-xs text-blue-200 mt-0.5">Weka tiki ya kama kipindi kilifundishwa leo kwa darasa ulilochagua.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20">
          <Calendar className="w-5 h-5 text-blue-300" />
          <div>
            <div className="text-xs text-blue-200 font-bold">Tarehe ya Leo:</div>
            <div className="text-sm font-mono font-black">{todayDate} ({dayName})</div>
          </div>
        </div>
      </div>

      {/* Class & Date Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase whitespace-nowrap">Class:</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none w-32"
            >
              {DEFAULT_CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase whitespace-nowrap">Stream:</label>
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none w-24"
            >
              {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={async () => {
              if (confirm('Weka vipindi vyote vya leo kuwa VILIFUNDISHWA?')) {
                for (const slot of timetableSlots) {
                  await handleMarkAttendance(slot, 'taught');
                }
              }
            }}
            disabled={loading || timetableSlots.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition flex items-center gap-2 uppercase disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Auto-Fill (Taught All)
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-700 uppercase whitespace-nowrap">Tarehe:</label>
          <input
            type="date"
            value={todayDate}
            onChange={e => {
              setTodayDate(e.target.value);
              const d = new Date(e.target.value);
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              setDayName(days[d.getDay()]);
            }}
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-slate-800 outline-none"
          />
        </div>
      </div>

      {/* Period Cards List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" /> Vipindi vya {selectedClass} — {dayName} ({todayDate})
          </h3>
          <span className="text-xs text-slate-500 font-medium">{timetableSlots.length} vipindi vimepatikana</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-bold">Inapakia ratiba ya leo...</div>
        ) : timetableSlots.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bold">Hakuna vipindi vilivyopangwa kwa siku hii kwenye ratiba.</div>
        ) : (
          <div className="space-y-3">
            {timetableSlots.map((slot) => {
              const currentAtt = attendanceRecords[slot.period_number] || { status: 'taught', reason: '' };
              const isTaught = currentAtt.status === 'taught';

              return (
                <div key={slot.id || slot.period_number} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0">
                      P{slot.period_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{slot.subject}</span>
                        <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          {slot.class_name} {slot.stream || 'A'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-3 mt-1 font-medium">
                        <span className="flex items-center gap-1 font-mono text-blue-700"><Clock className="w-3.5 h-3.5" /> {slot.start_time} - {slot.end_time}</span>
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {slot.teacher_name || 'Mwalimu wa Somo'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                    {/* Taught / Not Taught Toggle Buttons */}
                    <div className="flex rounded-xl overflow-hidden border border-slate-300 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(slot, 'taught')}
                        className={`px-4 py-2 text-xs font-black transition flex items-center gap-1.5 ${
                          isTaught ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Kilifundishwa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(slot, 'not_taught', currentAtt.reason || 'Teacher Absent')}
                        className={`px-4 py-2 text-xs font-black transition flex items-center gap-1.5 ${
                          !isTaught ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Hakikufundishwa
                      </button>
                    </div>

                    {!isTaught && (
                      <select
                        value={currentAtt.reason || 'Teacher Absent'}
                        onChange={e => handleMarkAttendance(slot, 'not_taught', e.target.value)}
                        className="p-2 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 outline-none"
                      >
                        <option value="Teacher Absent">Teacher Absent (Mwalimu hayupo)</option>
                        <option value="Sick">Sick (Anaumwa)</option>
                        <option value="Meeting">Meeting (Kikao)</option>
                        <option value="Holiday">Holiday (Siku kuu)</option>
                        <option value="Rain">Rain (Mvua)</option>
                        <option value="No Students">No Students (Wanafunzi hawapo)</option>
                        <option value="Other">Other (Sababu nyingine)</option>
                      </select>
                    )}

                    {savingId === slot.id && <span className="text-xs text-blue-600 font-bold animate-pulse">Inahifadhi...</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
