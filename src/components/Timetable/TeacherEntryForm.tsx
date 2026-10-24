import React, { useState, useMemo } from 'react';
import { Teacher, TimetableAssignment, StreamSetting, PeriodSetting, TeacherAssignment } from '../../types';
import { Save, Clock, BookOpen, AlertTriangle, Check, Search, User, Calendar, ShieldCheck, Lock } from 'lucide-react';
import { DAYS_OF_WEEK } from '../../constants/defaults';
import { isSameClass } from '../../utils/reportCardUtils';
import {
  isSameStream,
  isSamePeriod,
  isSameSubjectName,
  parseClassAndStream,
  getConfiguredDays,
  getPeriodsForDayFromSettings,
  isPeriodLocked,
  isAcademicReligiousSubject,
  getRegisteredSubjectsForTeacher
} from '../../lib/timetableService';

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
    return teachers.find(t => Number(t.id) === Number(selectedTeacherId)) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Get ALL assignment records for this teacher during setup
  const teacherAssignmentRecords = useMemo(() => {
    return (teacherAssignments || []).filter(ta => ta && Number(ta.teacherId) === Number(selectedTeacher?.id ?? selectedTeacherId));
  }, [teacherAssignments, selectedTeacher, selectedTeacherId]);

  // STRICT RULE: Only subjects officially registered for the selected teacher are allowed
  const allowedSubjects = useMemo(() => {
    return getRegisteredSubjectsForTeacher(selectedTeacher, teacherAssignments);
  }, [selectedTeacher, teacherAssignments]);

  const allowedStreams = useMemo(() => {
    const streamsSet = new Set<string>();
    if (selectedTeacher?.teachingStreams && selectedTeacher.teachingStreams.length > 0) {
      selectedTeacher.teachingStreams.forEach(st => {
        if (st && st.trim()) streamsSet.add(st.trim());
      });
    }
    teacherAssignmentRecords.forEach(rec => {
      // Only include streams from teacherAssignmentRecords whose subject is registered for this teacher
      const hasValidSubject = (rec.subjects || []).some(sub =>
        allowedSubjects.some(regSub => isSameSubjectName(regSub, sub))
      );
      if (hasValidSubject || !selectedTeacher?.teachingStreams?.length) {
        (rec.streams || []).forEach(st => {
          if (st && st.trim()) streamsSet.add(st.trim());
        });
      }
    });
    if (streamsSet.size === 0 && streamSettings.length > 0) {
      streamSettings.forEach(ss => {
        (ss.streams || []).forEach(st => {
          streamsSet.add(`${ss.className} - ${st}`);
        });
      });
    }
    return Array.from(streamsSet);
  }, [teacherAssignmentRecords, selectedTeacher, streamSettings, allowedSubjects]);

  // Days list (only days configured with periods in General Timetable)
  const activeDays = useMemo(() => getConfiguredDays(periodSettings), [periodSettings]);

  // Periods per day from periodSettings
  const getPeriodsForDay = (day: string): PeriodSetting[] => {
    const list = getPeriodsForDayFromSettings(day, periodSettings).filter(p => !p.isBreak);
    if (list.length > 0) {
      return list;
    }
    if (!periodSettings || periodSettings.length === 0) {
      return [
        { id: 1, day, name: 'Period 1', start: '08:00', end: '08:40' },
        { id: 2, day, name: 'Period 2', start: '08:40', end: '09:20' },
        { id: 3, day, name: 'Period 3', start: '09:40', end: '10:20' },
        { id: 4, day, name: 'Period 4', start: '10:20', end: '11:00' },
        { id: 5, day, name: 'Period 5', start: '11:20', end: '12:00' },
        { id: 6, day, name: 'Period 6', start: '12:00', end: '12:40' },
        { id: 7, day, name: 'Period 7', start: '14:00', end: '14:40' },
        { id: 8, day, name: 'Period 8', start: '14:40', end: '15:20' },
      ];
    }
    return [];
  };

  const handleAssignmentChange = (
    day: string,
    periodName: string,
    periodFull: string,
    field: 'subject' | 'streamString',
    value: string
  ) => {
    const activeTeacherId = selectedTeacher?.id ?? selectedTeacherId;
    const normDay = day.trim().toLowerCase();

    if (allowedSubjects.length === 0) {
      setMessage({
        text: `Mwalimu ${selectedTeacher?.name || ''} hajasajiliwa na somo lolote! Tafadhali msajilie somo kwanza kwenye ukurasa wa Walimu.`,
        type: 'error'
      });
      return;
    }

    // Find existing assignment for this teacher, day, and periodName using exact period match
    const existingIndex = (assignments || []).findIndex(a => {
      if (!a || Number(a.teacherId) !== Number(activeTeacherId)) return false;
      if ((a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, periodName);
    });

    // Check comprehensive lock state (PeriodSettings lock, non-academic activity, or teacher/stream lock)
    const slotLock = isPeriodLocked(day, periodName, periodSettings, assignments, {
      teacherId: activeTeacherId,
      allowedStreams
    });

    if (slotLock.isLocked) {
      setMessage({
        text: `Kipindi hiki (${periodName}) kimefungwa (Locked: ${slotLock.reason}). Huwezi kumpangia mwalimu kipindi cha masomo hapa.`,
        type: 'error'
      });
      return;
    }

    // Check for individual assignment lock (ignoring academic religious subjects)
    if (existingIndex >= 0 && assignments[existingIndex].isLocked && !isAcademicReligiousSubject(assignments[existingIndex].subject)) {
      setMessage({ text: 'Kipindi hiki kimefungwa (Locked) na hakiwezi kubadilishwa hapa.', type: 'error' });
      return;
    }

    // If user selected a stream, verify that specific class+stream is not locked on this day+period
    if (field === 'streamString' && value.trim()) {
      const parsedTarget = parseClassAndStream(value);
      const targetStreamLock = isPeriodLocked(day, periodName, periodSettings, assignments, {
        className: parsedTarget.className,
        stream: parsedTarget.stream
      });
      if (targetStreamLock.isLocked) {
        setMessage({
          text: `Darasa la ${parsedTarget.className} (${parsedTarget.stream}) limefungwa kwenye ${periodName} (${targetStreamLock.reason}). Huwezi kupanga kipindi cha kawaida hapa.`,
          type: 'error'
        });
        return;
      }
    }

    // Validate subject belongs to this teacher's registered subjects
    if (field === 'subject' && value.trim()) {
      const matchedRegistered = allowedSubjects.find(s => isSameSubjectName(s, value));
      if (!matchedRegistered) {
        setMessage({
          text: `Huwezi kuweka somo la "${value}" kwa ${selectedTeacher?.name} kwa sababu hajasajiliwa kufundisha somo hilo!`,
          type: 'error'
        });
        return;
      }
    }

    // If user cleared the stream dropdown to empty ("")
    if (field === 'streamString' && !value.trim()) {
      const withoutSlot = (assignments || []).filter((a, idx) => idx !== existingIndex);
      onUpdateAssignments(withoutSlot);
      setMessage({ text: 'Kipindi kimeondolewa.', type: 'info' });
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    // If user cleared the subject dropdown to empty ("") when teacher has multiple subjects
    if (field === 'subject' && !value.trim() && allowedSubjects.length > 1) {
      if (existingIndex >= 0) {
        const updatedList = [...assignments];
        updatedList[existingIndex] = { ...updatedList[existingIndex], subject: '' };
        onUpdateAssignments(updatedList);
      }
      return;
    }

    // Ensure existing subject is valid for this teacher
    const existingValidSub =
      existingIndex >= 0 &&
      assignments[existingIndex].subject &&
      allowedSubjects.find(s => isSameSubjectName(s, assignments[existingIndex].subject));

    let currentAssignment: TimetableAssignment = existingIndex >= 0 ? {
      ...assignments[existingIndex],
      subject: existingValidSub || (allowedSubjects.length === 1 ? allowedSubjects[0] : ''),
      period: periodFull,
      periodName
    } : {
      id: Date.now() + Math.floor(Math.random() * 10000),
      day,
      period: periodFull,
      periodName,
      teacherId: activeTeacherId,
      className: '',
      stream: '',
      subject: allowedSubjects.length === 1 ? allowedSubjects[0] : '',
      activityType: 'academic' as const
    };

    if (field === 'subject') {
      const canonicalSub = allowedSubjects.find(s => isSameSubjectName(s, value)) || value;
      currentAssignment.subject = canonicalSub;
    } else if (field === 'streamString') {
      const parsed = parseClassAndStream(value);
      currentAssignment.className = parsed.className;
      currentAssignment.stream = parsed.stream;

      // CORE RULE: If teacher has only 1 registered subject, auto-fill it immediately!
      if (allowedSubjects.length === 1) {
        currentAssignment.subject = allowedSubjects[0];
      } else if (!currentAssignment.subject && allowedSubjects.length > 1) {
        // Check if this specific stream is uniquely linked to 1 registered subject in teacherAssignmentRecords
        const matchingRecords = teacherAssignmentRecords.filter(rec =>
          (rec.streams || []).some(st => {
            const pSt = parseClassAndStream(st);
            return isSameClass(pSt.className, parsed.className) && isSameStream(pSt.stream, parsed.stream);
          })
        );
        const streamSubjects = Array.from(
          new Set(
            matchingRecords
              .flatMap(r => r.subjects || [])
              .map(sub => allowedSubjects.find(reg => isSameSubjectName(reg, sub)) || '')
              .filter(Boolean)
          )
        );
        if (streamSubjects.length === 1) {
          currentAssignment.subject = streamSubjects[0];
        }
      }
    }

    // Remove any duplicate entries for the same teacher + day + periodName before inserting/updating
    const cleaned = (assignments || []).filter((a, idx) => {
      if (!a) return false;
      if (idx === existingIndex) return true;
      if (
        Number(a.teacherId) === Number(activeTeacherId) &&
        (a.day || '').trim().toLowerCase() === normDay &&
        isSamePeriod(a.period, a.periodName, periodName)
      ) {
        return false;
      }
      return true;
    });

    const targetIdx = cleaned.findIndex(a =>
      a &&
      Number(a.teacherId) === Number(activeTeacherId) &&
      (a.day || '').trim().toLowerCase() === normDay &&
      isSamePeriod(a.period, a.periodName, periodName)
    );

    if (targetIdx >= 0) {
      cleaned[targetIdx] = currentAssignment;
    } else if (currentAssignment.subject || currentAssignment.className) {
      cleaned.push(currentAssignment);
    }

    onUpdateAssignments(cleaned);
    setMessage({ text: `Imerejeshwa na kuhifadhiwa kwenye Ratiba Kuu!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemoveAssignment = (day: string, periodName: string) => {
    const activeTeacherId = selectedTeacher?.id ?? selectedTeacherId;
    const normDay = day.trim().toLowerCase();

    const slotLock = isPeriodLocked(day, periodName, periodSettings, assignments, {
      teacherId: activeTeacherId,
      allowedStreams
    });

    if (slotLock.isLocked) {
      setMessage({ text: `Kipindi hiki kimefungwa (${slotLock.reason}) na hakiwezi kufutwa hapa.`, type: 'error' });
      return;
    }

    const existing = (assignments || []).find(a => {
      if (!a || Number(a.teacherId) !== Number(activeTeacherId)) return false;
      if ((a.day || '').trim().toLowerCase() !== normDay) return false;
      return isSamePeriod(a.period, a.periodName, periodName);
    });

    if (existing?.isLocked && !isAcademicReligiousSubject(existing?.subject)) {
      setMessage({ text: 'Kipindi hiki kimefungwa (Locked) na hakiwezi kufutwa.', type: 'error' });
      return;
    }

    const filtered = (assignments || []).filter(a => {
      if (!a || Number(a.teacherId) !== Number(activeTeacherId)) return true;
      if ((a.day || '').trim().toLowerCase() !== normDay) return true;
      const match = isSamePeriod(a.period, a.periodName, periodName);
      if (match && a.isLocked && !isAcademicReligiousSubject(a.subject)) return true;
      return !match;
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
          Siku Zote ({activeDays.length})
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

      {/* Color Legend for Period Status */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">Alama za Rangi (Status Colors):</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-400 font-black shadow-2xs">
          <Check className="w-3.5 h-3.5 text-emerald-700" />
          <span>Kijani (Green): Kipindi Kimeingizwa &amp; Hakina Shida</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 text-rose-950 border border-rose-400 font-black shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
          <span>Nyekundu (Red): Kipindi Kina Mgongano / Shida</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-400 font-black shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-amber-700" />
          <span>Dhahabu (Gold): Kipindi Kimefungwa (Locked 🔒)</span>
        </span>
      </div>

      {/* Timetable Grid Form for Selected Teacher */}
      {selectedTeacher && (
        <div className="space-y-6">
          {(selectedDay === 'All' ? activeDays : activeDays.filter(d => d === selectedDay)).map(day => {
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
                        <th className="p-3 border-b border-slate-200">Darasa &amp; Mkondo (Stream)</th>
                        <th className="p-3 border-b border-slate-200">Somo (Subject)</th>
                        <th className="p-3 border-b border-slate-200 text-center">Hali / Mgongano</th>
                        <th className="p-3 border-b border-slate-200 text-center">Vitendo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayPeriods.map((per, index) => {
                        const periodName = per.name;
                        const periodFull = `${per.name} (${per.start}-${per.end})`;
                        const activeTeacherId = selectedTeacher?.id ?? selectedTeacherId;
                        const normDay = day.trim().toLowerCase();

                        // Find existing assignment for this teacher at this day & period
                        const existing = (assignments || []).find(a => {
                          if (!a || Number(a.teacherId) !== Number(activeTeacherId)) return false;
                          if ((a.day || '').trim().toLowerCase() !== normDay) return false;
                          return isSamePeriod(a.period, a.periodName, periodName);
                        });

                        // Comprehensive Lock Check for this period row
                        const slotLock = isPeriodLocked(day, periodName, periodSettings, assignments, {
                          teacherId: activeTeacherId,
                          allowedStreams
                        });
                        const isRowLocked = Boolean(
                          slotLock.isLocked ||
                          per.isBreak ||
                          (!isAcademicReligiousSubject(existing?.subject) && (
                            existing?.isLocked ||
                            (existing?.activityType && existing.activityType !== 'academic' && existing.activityType !== 'religion')
                          ))
                        );
                        const isGlobalOrSpecialLocked = Boolean(
                          slotLock.isGlobalLock ||
                          per.isBreak
                        );

                        const currentSubject = existing?.subject || (!isRowLocked && existing?.className && allowedSubjects.length === 1 ? allowedSubjects[0] : '');

                        // Match currentStreamStr to the exact option string in allowedStreams if possible
                        const matchedAllowedStream = existing && existing.className
                          ? allowedStreams.find(st => {
                              const parsed = parseClassAndStream(st);
                              return isSameClass(parsed.className, existing.className) && isSameStream(parsed.stream, existing.stream);
                            })
                          : '';
                        const currentStreamStr = matchedAllowedStream || (existing && existing.className ? `${existing.className} - ${existing.stream}` : '');

                        // Conflict check: is another teacher teaching this class+stream at this day+period?
                        const conflict = existing && existing.className && (assignments || []).find(a => {
                          if (!a || Number(a.teacherId) === Number(activeTeacherId)) return false;
                          if ((a.day || '').trim().toLowerCase() !== normDay) return false;
                          if (!isSamePeriod(a.period, a.periodName, periodName)) return false;
                          if (a.isParallelElective && existing.isParallelElective) return false;
                          return isSameClass(a.className, existing.className) && isSameStream(a.stream, existing.stream);
                        });

                        const conflictTeacherName = conflict ? teachers.find(t => Number(t.id) === Number(conflict.teacherId))?.name || 'Mwalimu Mwingine' : null;

                        // Check if this entry has a conflict or is incomplete (e.g., stream chosen without subject)
                        const hasEntry = Boolean(existing && (existing.className || existing.subject));
                        const isIncompleteEntry = !isRowLocked && hasEntry && (!currentStreamStr || !currentSubject);
                        const hasConflictOrIssue = !isRowLocked && (Boolean(conflict) || isIncompleteEntry);
                        const isValidEntry = !isRowLocked && !hasConflictOrIssue && Boolean(currentStreamStr && currentSubject);

                        return (
                          <tr
                            key={index}
                            className={`transition ${
                              isRowLocked
                                ? 'bg-amber-100/75 hover:bg-amber-100/95 border-l-4 border-l-amber-500'
                                : hasConflictOrIssue
                                ? 'bg-rose-100/80 hover:bg-rose-100 border-l-4 border-l-rose-600'
                                : isValidEntry
                                ? 'bg-emerald-100/75 hover:bg-emerald-100/95 border-l-4 border-l-emerald-600'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className={`p-3 border-r font-bold whitespace-nowrap ${
                              isRowLocked
                                ? 'border-amber-200 text-amber-950'
                                : hasConflictOrIssue
                                ? 'border-rose-200 text-rose-950'
                                : isValidEntry
                                ? 'border-emerald-200 text-emerald-950'
                                : 'border-slate-100 text-slate-800'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                {isRowLocked ? (
                                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                ) : hasConflictOrIssue ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                ) : isValidEntry ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                )}
                                <span>{per.name}</span>
                                {isRowLocked && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200/90 text-amber-950 border border-amber-400 font-black uppercase">
                                    Locked 🔒
                                  </span>
                                )}
                                {hasConflictOrIssue && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-200/90 text-rose-950 border border-rose-400 font-black uppercase">
                                    {conflictTeacherName ? 'Mgongano ⚠️' : 'Chagua Somo ⚠️'}
                                  </span>
                                )}
                                {isValidEntry && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200/90 text-emerald-950 border border-emerald-400 font-black uppercase">
                                    Sahihi ✓
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-semibold ${
                                isRowLocked
                                  ? 'text-amber-800'
                                  : hasConflictOrIssue
                                  ? 'text-rose-800'
                                  : isValidEntry
                                  ? 'text-emerald-800'
                                  : 'text-slate-500 font-normal'
                              }`}>{per.start} - {per.end}</span>
                            </td>

                            <td className={`p-3 border-r relative ${
                              isRowLocked
                                ? 'border-amber-200'
                                : hasConflictOrIssue
                                ? 'border-rose-200'
                                : isValidEntry
                                ? 'border-emerald-200'
                                : 'border-slate-100'
                            }`}>
                              {isGlobalOrSpecialLocked && !currentStreamStr ? (
                                <div
                                  className="w-full px-3 py-2 border border-amber-300 bg-amber-100/90 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-between cursor-not-allowed shadow-2xs"
                                  title="Kipindi hiki kimefungwa (Locked); huwezi kumpangia mwalimu kipindi cha masomo hapa"
                                >
                                  <span className="truncate flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                    <span>Kipindi Kimefungwa ({slotLock.reason || per.name})</span>
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400 font-black uppercase">
                                    Locked
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={currentStreamStr}
                                    disabled={isRowLocked}
                                    onChange={(e) => handleAssignmentChange(day, periodName, periodFull, 'streamString', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 transition shadow-2xs ${
                                      isRowLocked
                                        ? 'bg-amber-100/90 text-amber-950 border-amber-300 cursor-not-allowed focus:ring-amber-500'
                                        : hasConflictOrIssue
                                        ? 'bg-rose-50/95 text-rose-950 border-rose-400 cursor-pointer focus:ring-rose-500'
                                        : isValidEntry
                                        ? 'bg-emerald-50/95 text-emerald-950 border-emerald-400 cursor-pointer focus:ring-emerald-500'
                                        : 'bg-slate-50 text-slate-900 border-slate-300 cursor-pointer focus:ring-blue-500'
                                    }`}
                                  >
                                    <option value="">
                                      {isRowLocked ? '🔒 Kipindi Kimefungwa (Locked)' : '-- Chagua Darasa & Mkondo --'}
                                    </option>
                                    {allowedStreams.length > 0 ? (
                                      allowedStreams.map((st, stIdx) => {
                                        const parsedSt = parseClassAndStream(st);
                                        const stLock = isPeriodLocked(day, periodName, periodSettings, assignments, {
                                          className: parsedSt.className,
                                          stream: parsedSt.stream
                                        });
                                        const isOtherLocked = stLock.isLocked && st !== currentStreamStr;
                                        return (
                                          <option key={stIdx} value={st} disabled={isOtherLocked}>
                                            {st}{isOtherLocked ? ' — [LOCKED 🔒]' : ''}
                                          </option>
                                        );
                                      })
                                    ) : (
                                      <option disabled>Panga madarasa kwanza</option>
                                    )}
                                    {currentStreamStr && !allowedStreams.includes(currentStreamStr) && (
                                      <option value={currentStreamStr}>{currentStreamStr}</option>
                                    )}
                                  </select>
                                  {isRowLocked && (
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                                    </div>
                                  )}
                                </>
                              )}
                            </td>

                            <td className={`p-3 border-r relative ${
                              isRowLocked
                                ? 'border-amber-200'
                                : hasConflictOrIssue
                                ? 'border-rose-200'
                                : isValidEntry
                                ? 'border-emerald-200'
                                : 'border-slate-100'
                            }`}>
                              {isRowLocked ? (
                                <div
                                  className="w-full px-3 py-2 border border-amber-300 bg-amber-100/90 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-between cursor-not-allowed shadow-2xs"
                                  title="Kipindi hiki kimefungwa (Locked); huwezi kumpangia mwalimu somo la kawaida"
                                >
                                  <span className="truncate flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                    <span>{existing?.subject || slotLock.reason || 'Kipindi Kimefungwa (Locked)'}</span>
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 border border-amber-400 font-black uppercase">
                                    Locked 🔒
                                  </span>
                                </div>
                              ) : allowedSubjects.length === 1 ? (
                                <div
                                  className={`w-full px-3 py-2 border rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs ${
                                    hasConflictOrIssue
                                      ? 'bg-rose-50/95 border-rose-400 text-rose-950'
                                      : isValidEntry
                                      ? 'bg-emerald-50/95 border-emerald-400 text-emerald-950'
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}
                                  title="Mwalimu ana somo moja; linajazwa otomatiki ukichagua mkondo"
                                >
                                  <span className="truncate flex items-center gap-1.5">
                                    {hasConflictOrIssue ? (
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    ) : isValidEntry ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    ) : null}
                                    <span>{currentSubject || allowedSubjects[0]}</span>
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${
                                    hasConflictOrIssue
                                      ? 'bg-rose-200 text-rose-950 border-rose-400'
                                      : isValidEntry
                                      ? 'bg-emerald-200 text-emerald-950 border-emerald-400'
                                      : 'bg-blue-100 text-blue-700 border-blue-200'
                                  }`}>
                                    {hasConflictOrIssue ? 'Mgongano ⚠️' : isValidEntry ? 'Imeingizwa ✓' : 'Somo 1 (Auto)'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={currentSubject}
                                    disabled={isRowLocked}
                                    onChange={(e) => handleAssignmentChange(day, periodName, periodFull, 'subject', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 cursor-pointer transition shadow-2xs ${
                                      hasConflictOrIssue
                                        ? 'bg-rose-50/95 text-rose-950 border-rose-400 focus:ring-rose-500'
                                        : isValidEntry
                                        ? 'bg-emerald-50/95 text-emerald-950 border-emerald-400 focus:ring-emerald-500'
                                        : 'bg-slate-50 text-slate-900 border-slate-300 focus:ring-blue-500'
                                    }`}
                                  >
                                    <option value="">-- Chagua Somo --</option>
                                    {allowedSubjects.length > 0 ? (
                                      allowedSubjects.map((sub, sIdx) => (
                                        <option key={sIdx} value={sub}>{sub}</option>
                                      ))
                                    ) : (
                                      <option disabled>Sajili masomo kwanza</option>
                                    )}
                                  </select>
                                </>
                              )}
                            </td>

                            <td className={`p-3 border-r text-center ${
                              isRowLocked
                                ? 'border-amber-200'
                                : hasConflictOrIssue
                                ? 'border-rose-200'
                                : isValidEntry
                                ? 'border-emerald-200'
                                : 'border-slate-100'
                            }`}>
                              {isRowLocked ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] bg-amber-200/90 text-amber-950 border border-amber-400 px-2.5 py-1 rounded-lg font-black shadow-2xs"
                                  title={`Kipindi kimefungwa: ${slotLock.reason || per.name}`}
                                >
                                  <Lock className="w-3 h-3 text-amber-800" />
                                  <span>Kimefungwa (Locked)</span>
                                </span>
                              ) : conflictTeacherName ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] bg-rose-200/95 text-rose-950 border border-rose-400 px-2.5 py-1 rounded-lg font-black shadow-2xs animate-pulse"
                                  title={`Darasa hili limechukuliwa na ${conflictTeacherName} kwa kipindi hiki`}
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-700" />
                                  <span>Mgongano: {conflictTeacherName}</span>
                                </span>
                              ) : isIncompleteEntry ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] bg-rose-200/95 text-rose-950 border border-rose-400 px-2.5 py-1 rounded-lg font-black shadow-2xs"
                                  title="Tafadhali chagua somo na darasa kukamilisha kipindi hiki"
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-700" />
                                  <span>Chagua Somo!</span>
                                </span>
                              ) : isValidEntry ? (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-200/90 text-emerald-950 border border-emerald-400 px-2.5 py-1 rounded-lg font-black shadow-2xs">
                                  <Check className="w-3 h-3 text-emerald-800" />
                                  <span>Sahihi (Imeingizwa)</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Wazi</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {isRowLocked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-black">
                                  <Lock className="w-3 h-3" />
                                  <span>Locked</span>
                                </span>
                              ) : existing ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignment(day, periodName)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer border shadow-2xs ${
                                    hasConflictOrIssue
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                                      : 'bg-white hover:bg-rose-600 text-rose-700 hover:text-white border-rose-300'
                                  }`}
                                  title="Futa kipindi hiki"
                                >
                                  Futa
                                </button>
                              ) : null}
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
