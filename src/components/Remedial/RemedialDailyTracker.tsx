import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  User, 
  BookOpen, 
  AlertCircle, 
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Sparkles,
  X,
  CheckCircle,
  Save
} from 'lucide-react';
import { getRemedialTimetable, markRemedialAttendance, getRemedialAttendance } from '../../lib/remedialService';
import { RemedialDashboardSummary } from './RemedialDashboardSummary';
import { Student } from '../../types';
import { isSameClass } from '../../utils/reportCardUtils';

interface RemedialDailyTrackerProps {
  schoolId: string;
  currentUser: any;
  students?: Student[];
}

export const RemedialDailyTracker: React.FC<RemedialDailyTrackerProps> = ({ schoolId, currentUser, students = [] }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timetable, setTimetable] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Student Attendance Recording Modal State
  const [selectedSessionForStudentAtt, setSelectedSessionForStudentAtt] = useState<any | null>(null);
  const [studentAttMap, setStudentAttMap] = useState<Record<string, 'present' | 'absent' | 'excused'>>({});
  const [savingStudentAtt, setSavingStudentAtt] = useState<boolean>(false);

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
    
    const existing = attendance[key] || {};
    const record = {
      ...existing,
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

  // Get enrolled students for a specific session's class & stream
  const getSessionStudents = (period: any) => {
    if (!students || students.length === 0) {
      // Fallback sample roster if student list is empty
      return [
        { id: '1', name: 'Amina Baraka', className: period.class_name, stream: period.stream || 'A' },
        { id: '2', name: 'Bakari Juma', className: period.class_name, stream: period.stream || 'A' },
        { id: '3', name: 'Christina Paul', className: period.class_name, stream: period.stream || 'A' },
        { id: '4', name: 'David Frank', className: period.class_name, stream: period.stream || 'A' },
        { id: '5', name: 'Emmanuel Peter', className: period.class_name, stream: period.stream || 'A' },
        { id: '6', name: 'Faraja Joseph', className: period.class_name, stream: period.stream || 'A' },
        { id: '7', name: 'Grace John', className: period.class_name, stream: period.stream || 'A' },
        { id: '8', name: 'Hassan Ali', className: period.class_name, stream: period.stream || 'A' },
        { id: '9', name: 'Ibrahim Kassim', className: period.class_name, stream: period.stream || 'A' },
        { id: '10', name: 'Joyce Mwangi', className: period.class_name, stream: period.stream || 'A' }
      ];
    }

    const matched = students.filter(s => {
      const matchClass = isSameClass(s.className, period.class_name);
      const targetStream = period.stream || 'A';
      const matchStream = targetStream === 'All Streams' || 
        !s.stream || 
        s.stream.toUpperCase().includes(targetStream.toUpperCase()) ||
        targetStream.toUpperCase().includes(s.stream.toUpperCase());

      return matchClass && matchStream;
    });

    return matched.length > 0 ? matched : students.filter(s => isSameClass(s.className, period.class_name));
  };

  const handleOpenStudentAttendanceModal = (period: any) => {
    setSelectedSessionForStudentAtt(period);
    const key = `${period.period_time}_${period.class_name}`;
    const record = attendance[key];

    const currentStudents = getSessionStudents(period);
    const map: Record<string, 'present' | 'absent' | 'excused'> = {};

    if (record && record.student_attendance && Array.isArray(record.student_attendance)) {
      record.student_attendance.forEach((st: any) => {
        map[st.student_id] = st.status || 'present';
      });
    } else {
      // Default all enrolled students to 'present'
      currentStudents.forEach(st => {
        map[st.id] = 'present';
      });
    }

    setStudentAttMap(map);
  };

  const handleSaveStudentAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForStudentAtt) return;

    setSavingStudentAtt(true);
    const period = selectedSessionForStudentAtt;
    const key = `${period.period_time}_${period.class_name}`;
    const sessionStudents = getSessionStudents(period);

    let presentCount = 0;
    let absentCount = 0;

    const studentAttendanceList = sessionStudents.map(st => {
      const status = studentAttMap[st.id] || 'present';
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      return {
        student_id: st.id,
        name: st.name,
        admission_number: (st as any).admissionNumber || st.id,
        status
      };
    });

    const totalStudents = sessionStudents.length;
    const studentAttendancePct = totalStudents > 0 
      ? Math.round((presentCount / totalStudents) * 100) 
      : 100;

    const existingRecord = attendance[key] || {};
    const updatedRecord = {
      ...existingRecord,
      date: selectedDate,
      day_of_week: currentDayName,
      period_time: period.period_time,
      class_name: period.class_name,
      subject: period.subject,
      teacher_name: period.teacher_name,
      stream: period.stream || 'A',
      status: 'taught', // Recording student attendance confirms session was taught
      marked_by: currentUser?.fullName || 'Teacher',
      student_attendance: studentAttendanceList,
      present_count: presentCount,
      absent_count: absentCount,
      total_students: totalStudents,
      student_attendance_pct: studentAttendancePct
    };

    try {
      await markRemedialAttendance(schoolId, updatedRecord);
      setAttendance(prev => ({
        ...prev,
        [key]: updatedRecord
      }));
      setSelectedSessionForStudentAtt(null);
    } catch (err) {
      console.error("Save student attendance error:", err);
    } finally {
      setSavingStudentAtt(false);
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

                    {/* Student Attendance Summary Pill if recorded */}
                    {record && record.student_attendance_pct !== undefined && (
                      <div className="mb-3 p-2 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Mahudhurio ya Wanafunzi:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black font-mono text-slate-700">
                            {record.present_count || 0}/{record.total_students || 0}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            record.student_attendance_pct >= 85 ? 'bg-emerald-100 text-emerald-800' :
                            record.student_attendance_pct >= 70 ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {record.student_attendance_pct}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-2.5">
                      <button
                        onClick={() => handleMark(period, 'taught')}
                        disabled={isMarking}
                        className={`py-2 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isTaught ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                        }`}
                      >
                        {isMarking && markingId === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Taught
                      </button>
                      <button
                        onClick={() => handleMark(period, 'not_taught')}
                        disabled={isMarking}
                        className={`py-2 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isNotTaught ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200'
                        }`}
                      >
                        {isMarking && markingId === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Not Taught
                      </button>
                    </div>

                    {/* Dedicated Student Attendance Action Button */}
                    <button
                      onClick={() => handleOpenStudentAttendanceModal(period)}
                      className="w-full py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-[11px] rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-300" />
                      <span>👥 Mahudhurio ya Wanafunzi (Record Student Attendance)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* STUDENT ATTENDANCE RECORDING MODAL */}
      {selectedSessionForStudentAtt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Mahudhurio ya Wanafunzi - {selectedSessionForStudentAtt.subject}
                  </h3>
                  <p className="text-[11px] text-blue-200 font-medium">
                    {selectedSessionForStudentAtt.class_name} ({selectedSessionForStudentAtt.stream || 'A'}) • Mwl. {selectedSessionForStudentAtt.teacher_name} • {selectedSessionForStudentAtt.period_time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSessionForStudentAtt(null)}
                className="text-white/70 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentAttendance} className="p-5 space-y-4">
              {/* Live Attendance Percentage Bar */}
              {(() => {
                const sessionStudents = getSessionStudents(selectedSessionForStudentAtt);
                const total = sessionStudents.length;
                let present = 0;
                sessionStudents.forEach(st => {
                  if ((studentAttMap[st.id] || 'present') === 'present') present++;
                });
                const pct = total > 0 ? Math.round((present / total) * 100) : 100;

                return (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider block mb-0.5">
                        Kiwango cha Mahudhurio (Session Attendance Percentage)
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 font-mono">{pct}%</span>
                        <span className="text-xs font-bold text-slate-600">
                          ({present} / {total} Waliohudhuria)
                        </span>
                      </div>
                    </div>

                    {/* Quick Mark Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newMap: Record<string, 'present' | 'absent' | 'excused'> = {};
                          sessionStudents.forEach(st => { newMap[st.id] = 'present'; });
                          setStudentAttMap(newMap);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Wote Wapo (All Present)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newMap: Record<string, 'present' | 'absent' | 'excused'> = {};
                          sessionStudents.forEach(st => { newMap[st.id] = 'absent'; });
                          setStudentAttMap(newMap);
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Wote Hawapo</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Student Roster List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  <span>Jina la Mwanafunzi</span>
                  <span>Hali ya Mahudhurio</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {getSessionStudents(selectedSessionForStudentAtt).map((st, idx) => {
                    const status = studentAttMap[st.id] || 'present';
                    const isPresent = status === 'present';

                    return (
                      <div key={st.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-slate-400 w-6">#{idx + 1}</span>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">{st.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {(st as any).admissionNumber ? `ID: ${(st as any).admissionNumber} • ` : ''}{st.className} {st.stream ? `(Stream ${st.stream})` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStudentAttMap(prev => ({ ...prev, [st.id]: 'present' as const }))}
                            className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Yupo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentAttMap(prev => ({ ...prev, [st.id]: 'absent' as const }))}
                            className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                              !isPresent
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Hayupo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForStudentAtt(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingStudentAtt}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  {savingStudentAtt ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Hifadhi Mahudhurio ya Wanafunzi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
