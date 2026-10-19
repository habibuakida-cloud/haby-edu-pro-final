import React, { useState, useMemo } from 'react';
import { Teacher, TimetableAssignment, StreamSetting, PeriodSetting, TeacherAssignment } from '../../types';
import { Save, Clock, BookOpen, AlertTriangle, Check, Search, User, Calendar, ShieldCheck } from 'lucide-react';
import { DAYS_OF_WEEK } from '../../constants/defaults';

interface TeacherEntryFormProps {
  teachers: Teacher[];
  streamSettings: StreamSetting[];
  onUpdateAssignments: (assignments: TimetableAssignment[]) => void;
  assignments: TimetableAssignment[];
  periodSettings?: PeriodSetting[];
  teacherAssignments?: TeacherAssignment[];
}

export const TeacherEntryForm: React.FC<TeacherEntryFormProps> = ({ 
  teachers = [], 
  streamSettings = [], 
  onUpdateAssignments,
  assignments = [],
  periodSettings = [],
  teacherAssignments = []
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(teachers[0]?.id || 0);
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [searchTeacherQuery, setSearchTeacherQuery] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    const hrs = isNaN(parts[0]) ? 0 : parts[0];
    const mins = isNaN(parts[1]) ? 0 : parts[1];
    return hrs * 60 + mins;
  };

  const filteredTeachers = useMemo(() => {
    if (!searchTeacherQuery) return teachers;
    const q = searchTeacherQuery.toLowerCase();
    return teachers.filter(t => t.name.toLowerCase().includes(q) || (t.subjects && t.subjects.some(s => s.toLowerCase().includes(q))));
  }, [teachers, searchTeacherQuery]);

  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Get subjects and streams assigned to this teacher during setup
  const teacherAssignmentRecord = useMemo(() => {
    return teacherAssignments.find(ta => ta.teacherId === selectedTeacherId);
  }, [teacherAssignments, selectedTeacherId]);

  const allowedSubjects = useMemo(() => {
    if (teacherAssignmentRecord?.subjects && teacherAssignmentRecord.subjects.length > 0) {
      return teacherAssignmentRecord.subjects;
    }
    if (selectedTeacher?.subjects && selectedTeacher.subjects.length > 0) {
      return selectedTeacher.subjects;
    }
    // Fallback general subjects
    return ['Mathematics', 'English Language', 'Kiswahili', 'Biology', 'Chemistry', 'Geography', 'History', 'Physics', 'Civics', 'Computer Studies'];
  }, [teacherAssignmentRecord, selectedTeacher]);

  const allowedStreams = useMemo(() => {
    if (teacherAssignmentRecord?.streams && teacherAssignmentRecord.streams.length > 0) {
      return teacherAssignmentRecord.streams;
    }
    if (streamSettings.length > 0) {
      return streamSettings.flatMap(s => (s.streams || []).map(st => `${s.className} - ${st}`));
    }
    return ['Form 1 - STREAM A', 'Form 1 - STREAM B', 'Form 2 - STREAM A', 'Form 2 - STREAM B'];
  }, [teacherAssignmentRecord, streamSettings]);

  // Days list
  const activeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Periods per day from periodSettings or default
  const getPeriodsForDay = (day: string) => {
    const list = (periodSettings || []).filter(p => p && p.day === day && !p.isBreak);
    if (list.length > 0) {
      return [...list].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    }
    return [
      { name: 'Period 1', start: '08:00', end: '08:40' },
      { name: 'Period 2', start: '08:40', end: '09:20' },
      { name: 'Period 3', start: '09:40', end: '10:20' },
      { name: 'Period 4', start: '10:20', end: '11:00' },
      { name: 'Period 5', start: '11:20', end: '12:00' },
      { name: 'Period 6', start: '12:00', end: '12:40' },
      { name: 'Period 7', start: '14:00', end: '14:40' },
      { name: 'Period 8', start: '14:40', end: '15:20' },
    ];
  };

  const handleAssignmentChange = (
    day: string,
    periodName: string,
    periodFull: string,
    field: 'subject' | 'streamString',
    value: string
  ) => {
    // Find existing assignment for this teacher, day, and periodName
    const existingIndex = (assignments || []).findIndex(a => {
      if (!a || a.teacherId !== selectedTeacherId || a.day !== day) return false;
      const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
      return pNorm === periodName;
    });

    let currentAssignment = existingIndex >= 0 ? { ...assignments[existingIndex] } : {
      id: Date.now() + Math.floor(Math.random() * 10000),
      day,
      period: periodFull,
      periodName,
      teacherId: selectedTeacherId,
      className: allowedStreams[0]?.split(' - ')[0] || 'Form 1',
      stream: allowedStreams[0]?.split(' - ')[1] || 'STREAM A',
      subject: allowedSubjects[0] || 'Subject',
      activityType: 'academic' as const
    };

    if (field === 'subject') {
      currentAssignment.subject = value;
    } else if (field === 'streamString') {
      const parts = value.split(' - ');
      currentAssignment.className = parts[0] || 'Form 1';
      currentAssignment.stream = parts[1] || 'STREAM A';
    }

    // Validation: check if teacher is assigned to this subject/stream
    if (field === 'subject' && value && !allowedSubjects.includes(value)) {
      setMessage({ text: `Onyo: Mwalimu hakusajiliwa kufundisha somo la '${value}'.`, type: 'error' });
      return;
    }

    let updated = [...assignments];
    if (existingIndex >= 0) {
      updated[existingIndex] = currentAssignment;
    } else {
      updated.push(currentAssignment);
    }

    onUpdateAssignments(updated);
    setMessage({ text: `Imerejeshwa na kuhifadhiwa kwenye Ratiba Kuu!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemoveAssignment = (day: string, periodName: string) => {
    const filtered = (assignments || []).filter(a => {
      if (!a || a.teacherId !== selectedTeacherId || a.day !== day) return true;
      const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
      return pNorm !== periodName;
    });
    onUpdateAssignments(filtered);
    setMessage({ text: 'Kipindi kimefutwa kwa mafanikio.', type: 'info' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Manual Teacher Entry Form (Ingiza Ratiba kwa Kila Mwalimu)
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">
              Auto-Sync to General Timetable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chagua mwalimu, kisha jaza masomo na madarasa (yenye ruhusa ya usajili wake) kwa kila kipindi. Mabadiliko yanaenda moja kwa moja kwenye Ratiba Kuu.
          </p>
        </div>

        {message && (
          <div className={`text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-xs animate-fadeIn ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            message.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Teacher Selector & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Tafuta Mwalimu (Search Teacher)</span>
          </label>
          <input
            type="text"
            value={searchTeacherQuery}
            onChange={(e) => setSearchTeacherQuery(e.target.value)}
            placeholder="Andika jina la mwalimu au somo..."
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Chagua Mwalimu (Select Teacher)</span>
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {filteredTeachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.initial ? `(${t.initial})` : ''} — [{t.subjects?.join(', ') || 'No subject'}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teacher Profile & Registered Subjects/Streams summary */}
      {selectedTeacher && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
          <div>
            <span className="font-bold text-blue-900 block mb-1">Masomo Aliyosajiliwa Kufundisha (Registered Subjects):</span>
            <div className="flex flex-wrap gap-1.5">
              {allowedSubjects.length > 0 ? allowedSubjects.map((sub, idx) => (
                <span key={idx} className="bg-white text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 font-bold shadow-2xs">
                  {sub}
                </span>
              )) : <span className="text-slate-500 italic">Hakuna masomo yaliyosajiliwa.</span>}
            </div>
          </div>

          <div>
            <span className="font-bold text-blue-900 block mb-1">Madarasa / Stream Alizopangiwa (Assigned Streams):</span>
            <div className="flex flex-wrap gap-1.5">
              {allowedStreams.length > 0 ? allowedStreams.map((st, idx) => (
                <span key={idx} className="bg-white text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold shadow-2xs">
                  {st}
                </span>
              )) : <span className="text-slate-500 italic">Hakuna mikondo iliyosajiliwa.</span>}
            </div>
          </div>
        </div>
      )}

      {/* Day Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSelectedDay('All')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
            selectedDay === 'All' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Siku Zote (Monday - Friday)
        </button>
        {activeDays.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedDay === day 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable Grid Form for Selected Teacher */}
      {selectedTeacher && (
        <div className="space-y-6">
          {(selectedDay === 'All' ? activeDays : [selectedDay]).map(day => {
            const dayPeriods = getPeriodsForDay(day);
            return (
              <div key={day} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                  <h4 className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{day} — Ratiba ya Vipindi vya {selectedTeacher.name}</span>
                  </h4>
                  <span className="text-[10px] bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold">
                    {dayPeriods.length} Vipindi
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3 border-b border-slate-200">Kipindi / Muda</th>
                        <th className="p-3 border-b border-slate-200">Somo (Subject)</th>
                        <th className="p-3 border-b border-slate-200">Darasa &amp; Stream</th>
                        <th className="p-3 border-b border-slate-200 text-center">Hali / Mgongano</th>
                        <th className="p-3 border-b border-slate-200 text-center">Vitendo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayPeriods.map((per, index) => {
                        const periodName = per.name;
                        const periodFull = `${per.name} (${per.start}-${per.end})`;

                        // Find existing assignment for this teacher at this day & period
                        const existing = (assignments || []).find(a => {
                          if (!a || a.teacherId !== selectedTeacherId || a.day !== day) return false;
                          const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
                          return pNorm === periodName;
                        });

                        const currentSubject = existing?.subject || '';
                        const currentStreamStr = existing ? `${existing.className} - ${existing.stream}` : '';

                        // Conflict check: is another teacher teaching this class+stream at this day+period?
                        const conflict = existing && (assignments || []).find(a => {
                          if (!a || a.teacherId === selectedTeacherId || a.day !== day) return false;
                          const pNorm = a.periodName || (a.period ? a.period.split(' (')[0] : '');
                          const matchClass = a.className === existing.className && a.stream === existing.stream;
                          return pNorm === periodName && matchClass;
                        });

                        const conflictTeacherName = conflict ? teachers.find(t => t.id === conflict.teacherId)?.name : null;

                        return (
                          <tr key={index} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 border-r border-slate-100 font-bold text-slate-800 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>{per.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal">{per.start} - {per.end}</span>
                            </td>

                            <td className="p-3 border-r border-slate-100">
                              <select
                                value={currentSubject}
                                onChange={(e) => handleAssignmentChange(day, periodName, periodFull, 'subject', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="">-- Chagua Somo --</option>
                                {allowedSubjects.map((sub, sIdx) => (
                                  <option key={sIdx} value={sub}>{sub}</option>
                                ))}
                              </select>
                            </td>

                            <td className="p-3 border-r border-slate-100">
                              <select
                                value={currentStreamStr}
                                onChange={(e) => handleAssignmentChange(day, periodName, periodFull, 'streamString', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="">-- Chagua Darasa &amp; Stream --</option>
                                {allowedStreams.map((st, stIdx) => (
                                  <option key={stIdx} value={st}>{st}</option>
                                ))}
                              </select>
                            </td>

                            <td className="p-3 border-r border-slate-100 text-center">
                              {conflictTeacherName ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-lg font-black animate-pulse" title={`Darasa hili limechukuliwa na ${conflictTeacherName} kwa kipindi hiki`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Mgongano: {conflictTeacherName}</span>
                                </span>
                              ) : currentSubject && currentStreamStr ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg font-bold">
                                  <Check className="w-3 h-3" />
                                  <span>Sahihi</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Wazi</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {existing && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignment(day, periodName)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Futa kipindi hiki"
                                >
                                  Futa
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
