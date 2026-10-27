import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Check, 
  Settings,
  GraduationCap
} from 'lucide-react';
import { RemedialTimetableEntry, saveRemedialTimetable, getRemedialTimetable, checkRemedialConflict, getRemedialTimeSlots, RemedialTimeSlot } from '../../lib/remedialService';
import { Teacher, UserAccount, Student } from '../../types';
import { isSameClass } from '../../utils/reportCardUtils';

interface RemedialTeacherManualEntryProps {
  schoolId: string;
  teachers: Teacher[];
  currentUser?: UserAccount | null;
  students?: Student[];
  teacherAssignments?: any[];
  timetableAssignments?: any[];
  activeSessionTypeSetting?: string;
  onChangeSessionTypeSetting?: (type: string) => void;
  onRefresh?: () => void;
}

const DEFAULT_REMEDIAL_SLOTS = [
  { id: 'slot_1', name: 'Morning Pre-Prep (Asubuhi)', startTime: '06:30', endTime: '07:30', type: 'Morning' },
  { id: 'slot_2', name: 'Evening Session 1 (Jioni Kipindi cha 1)', startTime: '15:40', endTime: '16:50', type: 'Evening' },
  { id: 'slot_3', name: 'Evening Session 2 (Jioni Kipindi cha 2)', startTime: '16:55', endTime: '18:05', type: 'Evening' },
  { id: 'slot_4', name: 'Saturday Morning (Weekend Asubuhi)', startTime: '08:30', endTime: '10:30', type: 'Weekend' },
  { id: 'slot_5', name: 'Saturday Afternoon (Weekend Mchana)', startTime: '10:45', endTime: '12:45', type: 'Weekend' }
];

// Helper to parse a teachingStream entry like "Form 1 A", "Form 2 - Stream B", or "Form 3"
function parseClassAndStream(raw: string): { className: string; stream?: string } | null {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(Form\s*\d+|Class\s*\d+|Standard\s*\d+|Std\s*\d+|Darasa\s*la\s*\d+)\s*(?:-\s*)?(?:Stream\s*)?([A-Z])?$/i);
  if (match) {
    return {
      className: match[1].replace(/\s+/g, ' ').trim(),
      stream: match[2] ? match[2].toUpperCase() : undefined
    };
  }
  return { className: cleaned };
}

export const RemedialTeacherManualEntry: React.FC<RemedialTeacherManualEntryProps> = ({
  schoolId,
  teachers = [],
  currentUser,
  students = [],
  teacherAssignments = [],
  timetableAssignments = [],
  activeSessionTypeSetting,
  onChangeSessionTypeSetting,
  onRefresh
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(
    currentUser?.fullName || teachers[0]?.name || ''
  );

  // Remedial Session Type Setting (Default to 'Evening' / Jioni as requested)
  const [remedialSessionSetting, setRemedialSessionSetting] = useState<'Evening' | 'Morning' | 'Weekend' | 'ALL'>(() => {
    if (activeSessionTypeSetting && ['Evening', 'Morning', 'Weekend', 'ALL'].includes(activeSessionTypeSetting)) {
      return activeSessionTypeSetting as any;
    }
    return 'Evening';
  });

  useEffect(() => {
    if (activeSessionTypeSetting && ['Evening', 'Morning', 'Weekend', 'ALL'].includes(activeSessionTypeSetting)) {
      setRemedialSessionSetting(activeSessionTypeSetting as any);
    }
  }, [activeSessionTypeSetting]);

  const handleSelectSessionSetting = (val: 'Evening' | 'Morning' | 'Weekend' | 'ALL') => {
    setRemedialSessionSetting(val);
    if (onChangeSessionTypeSetting) {
      onChangeSessionTypeSetting(val);
    }
  };

  const [existingEntries, setExistingEntries] = useState<RemedialTimetableEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbTimeSlots, setDbTimeSlots] = useState<RemedialTimeSlot[]>([]);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data } = await getRemedialTimeSlots(schoolId);
        if (data) setDbTimeSlots(data);
      } catch (e) {}
    };
    fetchSlots();
  }, [schoolId]);

  // Determine the selected Teacher object
  const selectedTeacherObj = useMemo(() => {
    return teachers.find(
      t => t.name.trim().toLowerCase() === selectedTeacherName.trim().toLowerCase()
    );
  }, [teachers, selectedTeacherName]);

  // Generate dynamic slots based on template or defaults
  const activeSlots = useMemo(() => {
    // Filter templates by current day and session setting
    const templates = dbTimeSlots.filter(s => 
      s.days.includes(selectedDay) && 
      (remedialSessionSetting === 'ALL' || s.session_type === remedialSessionSetting)
    );

    if (templates.length > 0) {
      return templates.map(t => ({
        id: t.id,
        name: `${t.class_name} Session (${t.session_type})`,
        startTime: t.start_time,
        endTime: t.end_time,
        type: t.session_type,
        class_name: t.class_name
      }));
    }

    // Fallback to defaults if no templates match
    return DEFAULT_REMEDIAL_SLOTS.filter(s => 
      remedialSessionSetting === 'ALL' || s.type === remedialSessionSetting
    );
  }, [dbTimeSlots, selectedDay, remedialSessionSetting]);

  // 1. ONLY Subjects taught/registered by this specific teacher
  const teacherRegisteredSubjects = useMemo(() => {
    const subSet = new Set<string>();

    if (selectedTeacherObj) {
      (selectedTeacherObj.subjects || []).forEach(s => {
        const clean = String(s || '').replace(/\s*\([^)]*\)\s*$/g, '').trim();
        if (clean) subSet.add(clean);
      });
    }

    // Also inspect teacherAssignments
    teacherAssignments.forEach(ta => {
      const matchId = selectedTeacherObj && String(ta.teacherId) === String(selectedTeacherObj.id);
      const matchName = ta.teacherName && ta.teacherName.trim().toLowerCase() === selectedTeacherName.trim().toLowerCase();
      if ((matchId || matchName) && ta.subject) {
        subSet.add(String(ta.subject).trim());
      }
    });

    // Also inspect timetableAssignments
    timetableAssignments.forEach(a => {
      const matchId = selectedTeacherObj && String(a.teacherId) === String(selectedTeacherObj.id);
      const matchName = a.teacherName && a.teacherName.trim().toLowerCase() === selectedTeacherName.trim().toLowerCase();
      if ((matchId || matchName) && a.subject) {
        subSet.add(String(a.subject).trim());
      }
    });

    return Array.from(subSet);
  }, [selectedTeacherObj, selectedTeacherName, teacherAssignments, timetableAssignments]);

  // 2. ONLY Classes and Streams registered/assigned to this specific teacher
  const teacherClassStreamMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    const addClassStream = (cls: string, strm?: string) => {
      if (!cls) return;
      const existingKey = Array.from(map.keys()).find(k => isSameClass(k, cls)) || cls;
      if (!map.has(existingKey)) {
        map.set(existingKey, new Set<string>());
      }
      if (strm) {
        map.get(existingKey)!.add(strm.toUpperCase());
      }
    };

    if (selectedTeacherObj) {
      (selectedTeacherObj.teachingStreams || []).forEach(ts => {
        const parsed = parseClassAndStream(ts);
        if (parsed) addClassStream(parsed.className, parsed.stream);
      });
    }

    teacherAssignments.forEach(ta => {
      const matchId = selectedTeacherObj && String(ta.teacherId) === String(selectedTeacherObj.id);
      const matchName = ta.teacherName && ta.teacherName.trim().toLowerCase() === selectedTeacherName.trim().toLowerCase();
      if (matchId || matchName) {
        if (ta.level) {
          if (Array.isArray(ta.streams) && ta.streams.length > 0) {
            ta.streams.forEach((s: string) => addClassStream(ta.level, s));
          } else {
            addClassStream(ta.level, 'A');
          }
        }
      }
    });

    timetableAssignments.forEach(a => {
      const matchId = selectedTeacherObj && String(a.teacherId) === String(selectedTeacherObj.id);
      const matchName = a.teacherName && a.teacherName.trim().toLowerCase() === selectedTeacherName.trim().toLowerCase();
      if (matchId || matchName) {
        if (a.className) addClassStream(a.className, a.stream || 'A');
      }
    });

    // If a teacher has no explicit stream tags yet, provide registered school classes from their level
    if (map.size === 0) {
      ['Form 1', 'Form 2', 'Form 3', 'Form 4'].forEach(c => {
        map.set(c, new Set(['A', 'B']));
      });
    } else {
      // Ensure every mapped class has at least 'A'
      map.forEach(streams => {
        if (streams.size === 0) {
          streams.add('A');
        }
      });
    }

    return map;
  }, [selectedTeacherObj, selectedTeacherName, teacherAssignments, timetableAssignments]);

  const teacherRegisteredClasses = useMemo(() => {
    return Array.from(teacherClassStreamMap.keys());
  }, [teacherClassStreamMap]);

  const getStreamsForTeacherClass = (clsName: string): string[] => {
    const key = Array.from(teacherClassStreamMap.keys()).find(k => isSameClass(k, clsName));
    if (key && teacherClassStreamMap.get(key)) {
      const arr = Array.from(teacherClassStreamMap.get(key)!).sort();
      return arr.length > 0 ? arr : ['A'];
    }
    return ['A'];
  };

  // Filtered slots based on remedialSessionSetting (e.g., if 'Evening' / Jioni is chosen, only Evening slots appear)
  const visibleSlots = activeSlots;

  // Form row state for each remedial slot
  const [slotRows, setSlotRows] = useState<Record<string, {
    className: string;
    stream: string;
    subject: string;
    room: string;
    isSaved: boolean;
  }>>({});

  // Sync slot row defaults whenever selectedTeacherName or activeSlots changes
  useEffect(() => {
    const defaultSubject = teacherRegisteredSubjects[0] || '';
    const defaultClasses = teacherRegisteredClasses.length > 0 ? teacherRegisteredClasses : ['Form 1'];

    setSlotRows(prev => {
      const updated = { ...prev };
      activeSlots.forEach((slot, idx) => {
        // If template has a class_name, use it. Otherwise use teacher's classes.
        const cls = (slot as any).class_name || defaultClasses[idx % defaultClasses.length] || defaultClasses[0];
        const streams = getStreamsForTeacherClass(cls);
        const strm = streams[0] || 'A';
        const sub = teacherRegisteredSubjects[0] || defaultSubject;
        
        // Only reset if not already set or if slots changed significantly
        if (!updated[slot.id]) {
          updated[slot.id] = {
            className: cls,
            stream: strm,
            subject: sub,
            room: `${cls} ${strm} Room`,
            isSaved: false
          };
        }
      });
      return updated;
    });
  }, [selectedTeacherName, teacherRegisteredSubjects, teacherRegisteredClasses, activeSlots]);

  // Auto calculate day of week from date
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setSelectedDay(days[d.getDay()] || 'Monday');
    }
  }, [selectedDate]);

  // Load existing entries
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getRemedialTimetable(schoolId);
        if (data) setExistingEntries(data);
      } catch (err) {
        console.error('Failed to load remedial entries:', err);
      }
    };
    load();
  }, [schoolId]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle saving a single slot row
  const handleSaveSlot = async (slot: any) => {
    const row = slotRows[slot.id];
    if (!row.className || !row.subject) {
      showToast('error', 'Tafadhali chagua darasa na somo analofundisha mwalimu kabla ya kuhifadhi.');
      return;
    }

    const payload: RemedialTimetableEntry = {
      class_name: row.className,
      stream: row.stream || 'A',
      subject: row.subject,
      teacher_name: selectedTeacherName,
      date: selectedDate,
      day_of_week: selectedDay,
      start_time: slot.startTime,
      end_time: slot.endTime,
      period_time: `${slot.startTime}-${slot.endTime}`,
      room: row.room || `${row.className} ${row.stream} Room`,
      session_type: slot.type as any,
      academic_year: new Date().getFullYear().toString(),
      notify_students: true
    };

    // Conflict Check
    const conflict = checkRemedialConflict(existingEntries, payload);
    if (conflict.hasConflict) {
      showToast('error', conflict.message || 'Kuna mgongano wa ratiba kwa mwalimu huyu kwa muda huu.');
      return;
    }

    try {
      await saveRemedialTimetable(schoolId, payload);
      setExistingEntries(prev => [...prev, payload]);
      setSlotRows(prev => ({
        ...prev,
        [slot.id]: { ...prev[slot.id], isSaved: true }
      }));
      showToast('success', `Kipindi cha ${row.subject} (${row.className} ${row.stream} • ${slot.name}) kimehifadhiwa kikamilifu kwa tarehe ${selectedDate}!`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast('error', 'Hitilafu wakati wa kuhifadhi: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                Teacher Filtered Remedial Entry
              </span>
              <span className="text-slate-400 text-xs">• Masomo na Mikondo ya Mwalimu Husika Pekee</span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Upangaji wa Vipindi vya Remedial kwa Mwalimu (Manual Form Entry)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Chagua aina ya Remedial inayopangwa (mf. Jioni) na Mwalimu — mfumo utaleta masomo na mikondo aliyosajiliwa mwalimu huyo pekee.
            </p>
          </div>
        </div>

        {/* REMEDIAL SESSION TYPE SETTING (JIONI / ASUBUHI / WEEKEND) */}
        <div className="bg-white/10 p-3 rounded-2xl border border-white/15 space-y-1.5">
          <div className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>Setting: Chagua Remedial Inayopangwa</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'Evening', label: '🌙 Jioni Tu (Evening)' },
              { id: 'Morning', label: '🌅 Asubuhi Tu (Morning)' },
              { id: 'Weekend', label: '📅 Weekend Tu' },
              { id: 'ALL', label: '📋 Vipindi Vyote' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectSessionSetting(opt.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  remedialSessionSetting === opt.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date & Teacher Configuration Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teacher Selector */}
          <div>
            <label className="block text-xs font-black text-blue-950 uppercase mb-1.5">
              1. Chagua Mwalimu (Teacher):
            </label>
            <select
              value={selectedTeacherName}
              onChange={e => setSelectedTeacherName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-blue-50 border-2 border-blue-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name} ({(t.subjects || []).join(', ') || 'Masomo'})
                </option>
              ))}
              {!teachers.some(t => t.name === selectedTeacherName) && selectedTeacherName && (
                <option value={selectedTeacherName}>{selectedTeacherName}</option>
              )}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              2. Tarehe ya Kipindi (Date):
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Day of Week Display */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Siku ya Juma (Day):
            </label>
            <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-blue-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{selectedDay} ({selectedDate})</span>
            </div>
          </div>
        </div>

        {/* Summary of Selected Teacher's Registered Subjects & Classes/Streams */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-black text-slate-700 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-700" />
              <span>Masomo ya Mwl. {selectedTeacherName}:</span>
            </span>
            {teacherRegisteredSubjects.length > 0 ? (
              teacherRegisteredSubjects.map(sub => (
                <span key={sub} className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-black text-[11px]">
                  {sub}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px]">
                Hajasajiliwa somo bado (Msajilie kwenye moduli ya Walimu / Timetable)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-black text-slate-700 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              <span>Madarasa &amp; Mikondo Yake:</span>
            </span>
            {teacherRegisteredClasses.map(cls => (
              <span key={cls} className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 font-black text-[11px]">
                {cls} (Stream {getStreamsForTeacherClass(cls).join(', ')})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form Slots Table for Manual Entry (Filtered by remedialSessionSetting) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-900 text-white p-4 font-black text-xs uppercase tracking-wider flex flex-wrap items-center justify-between gap-2">
          <span>
            Vipindi vya Remedial ({remedialSessionSetting === 'Evening' ? 'JIONI TU' : remedialSessionSetting === 'Morning' ? 'ASUBUHI TU' : remedialSessionSetting === 'Weekend' ? 'WEEKEND TU' : 'VYOTE'}) — {selectedDay} ({selectedDate})
          </span>
          <span className="text-amber-400 font-mono text-[11px]">Mwalimu: {selectedTeacherName}</span>
        </div>

        <div className="p-5 space-y-4">
          {visibleSlots.map((slot, index) => {
            const row = slotRows[slot.id] || {
              className: teacherRegisteredClasses[0] || 'Form 1',
              stream: 'A',
              subject: teacherRegisteredSubjects[0] || '',
              room: 'Classroom',
              isSaved: false
            };
            const streamsForRowClass = getStreamsForTeacherClass(row.className);

            return (
              <div 
                key={slot.id}
                className={`p-4 rounded-2xl border transition-all grid grid-cols-1 lg:grid-cols-12 gap-4 items-center ${
                  row.isSaved ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Time & Slot Name */}
                <div className="lg:col-span-3">
                  <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    Kipindi {index + 1} • {slot.type === 'Evening' ? 'Jioni (Evening)' : slot.type === 'Morning' ? 'Asubuhi (Morning)' : 'Weekend'}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{slot.name}</h4>
                  <p className="text-xs font-mono text-slate-600 font-bold">{slot.startTime} - {slot.endTime}</p>
                </div>

                {/* Class & Stream Form Dropdowns (ONLY Teacher's Registered Classes & Streams) */}
                <div className="lg:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Darasa &amp; Mkondo wa Mwalimu
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={row.className}
                      onChange={e => {
                        const newCls = e.target.value;
                        const availStreams = getStreamsForTeacherClass(newCls);
                        const newStream = availStreams[0] || 'A';
                        setSlotRows(prev => ({
                          ...prev,
                          [slot.id]: {
                            ...prev[slot.id],
                            className: newCls,
                            stream: newStream,
                            room: `${newCls} ${newStream} Room`
                          }
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {teacherRegisteredClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    <select
                      value={row.stream}
                      onChange={e => {
                        const newStrm = e.target.value;
                        setSlotRows(prev => ({
                          ...prev,
                          [slot.id]: {
                            ...prev[slot.id],
                            stream: newStrm,
                            room: `${prev[slot.id].className} ${newStrm} Room`
                          }
                        }));
                      }}
                      className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {streamsForRowClass.map(s => (
                        <option key={s} value={s}>Stream {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Dropdown (ONLY Teacher's Registered Subjects) */}
                <div className="lg:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Somo Analofundisha Mwalimu
                  </label>
                  <select
                    value={row.subject}
                    onChange={e => setSlotRows(prev => ({
                      ...prev,
                      [slot.id]: { ...prev[slot.id], subject: e.target.value }
                    }))}
                    disabled={teacherRegisteredSubjects.length === 0}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    {teacherRegisteredSubjects.length === 0 ? (
                      <option value="">-- Mwalimu hajasajiliwa somo --</option>
                    ) : (
                      teacherRegisteredSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Room / Venue & Action */}
                <div className="lg:col-span-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ukumbi (Room)</label>
                    <input
                      type="text"
                      value={row.room}
                      onChange={e => setSlotRows(prev => ({
                        ...prev,
                        [slot.id]: { ...prev[slot.id], room: e.target.value }
                      }))}
                      placeholder="Mf. Form 2A Room"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSlot(slot)}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition ${
                      row.isSaved
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {row.isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{row.isSaved ? 'Imetunzwa' : 'Hifadhi'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
