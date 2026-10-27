import React, { useMemo } from 'react';
import { ShieldCheck, Calendar, Clock, MapPin, ChevronRight, ArrowRight, BookOpen, AlertCircle, CheckCircle2, Award } from 'lucide-react';
import { InvigilationSession, Teacher, Supervisor, UserAccount } from '../../types';
import { getSubjectColor } from '../../utils/colors';

interface UpcomingInvigilationWidgetProps {
  sessions: InvigilationSession[];
  invigilationAssignments: Record<string, number>;
  teachers: Teacher[];
  supervisors?: Supervisor[];
  currentUser?: UserAccount | null;
  onNavigateToCalendar?: () => void;
  onNavigateToInvigilation?: () => void;
}

export const UpcomingInvigilationWidget: React.FC<UpcomingInvigilationWidgetProps> = ({
  sessions = [],
  invigilationAssignments = {},
  teachers = [],
  supervisors = [],
  currentUser,
  onNavigateToCalendar,
  onNavigateToInvigilation
}) => {
  // 1. Identify current teacher
  const currentTeacher = useMemo(() => {
    if (currentUser?.fullName) {
      const match = teachers.find(t => 
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        t.name.toLowerCase().includes(currentUser.fullName.toLowerCase()) || 
        currentUser.fullName.toLowerCase().includes(t.name.toLowerCase())
      );
      if (match) return match;
    }
    // Fallback to first teacher in staff directory if no auth match
    return teachers[0] || null;
  }, [currentUser, teachers]);

  // Check if current teacher is an assigned Supervisor
  const isSupervisor = useMemo(() => {
    if (!currentTeacher || !supervisors || supervisors.length === 0) return false;
    return supervisors.some(s => 
      Number(s.teacherId) === Number(currentTeacher.id) ||
      (s.name && currentTeacher.name && s.name.toLowerCase().includes(currentTeacher.name.toLowerCase())) ||
      (currentTeacher.name && s.name && currentTeacher.name.toLowerCase().includes(s.name.toLowerCase()))
    );
  }, [currentTeacher, supervisors]);

  // 2. Extract and sort all invigilation duties for this teacher
  const allDuties = useMemo(() => {
    if (!currentTeacher || !sessions || sessions.length === 0) return [];
    
    const list: Array<{
      id: string;
      session: InvigilationSession;
      roomNumber: number;
      roomIndex: number;
      dateObj: Date;
      isUpcoming: boolean;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sessions.forEach(sess => {
      const roomCount = sess.rooms || 1;
      for (let r = 0; r < roomCount; r++) {
        const key = `${sess.id}_room${r}`;
        if (Number(invigilationAssignments[key]) === Number(currentTeacher.id)) {
          // Parse date
          const dateStr = sess.rawDate || sess.date;
          let parsedDate = new Date(dateStr);
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date();
          }

          const isUpcoming = parsedDate.getTime() >= today.getTime();

          list.push({
            id: key,
            session: sess,
            roomNumber: r + 1,
            roomIndex: r,
            dateObj: parsedDate,
            isUpcoming
          });
        }
      }
    });

    // Sort chronologically by date then session
    return list.sort((a, b) => {
      const diff = a.dateObj.getTime() - b.dateObj.getTime();
      if (diff !== 0) return diff;
      return (a.session.session || '').localeCompare(b.session.session || '');
    });
  }, [currentTeacher, sessions, invigilationAssignments]);

  // 3. Filter next 3 scheduled sessions: prefer upcoming, fallback to next in order
  const nextThreeSessions = useMemo(() => {
    const upcoming = allDuties.filter(d => d.isUpcoming);
    if (upcoming.length > 0) {
      return upcoming.slice(0, 3);
    }
    return allDuties.slice(0, 3);
  }, [allDuties]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 hover:border-indigo-300 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 to-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Upcoming Invigilation
              </h3>
              {isSupervisor && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-2xs flex items-center gap-1 border border-amber-300">
                  <ShieldCheck className="w-3 h-3 text-slate-950" />
                  <span>MSIMAMIZI MKUU (SUPERVISOR)</span>
                </span>
              )}
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {allDuties.length} {allDuties.length === 1 ? 'Duty' : 'Duties'} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Vipindi 3 vinavyofuata vya usimamizi wa mitihani kwa mwalimu: <strong className="text-slate-800">{currentTeacher?.name || 'Mwalimu'}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onNavigateToCalendar && (
            <button
              type="button"
              onClick={onNavigateToCalendar}
              className="px-3.5 py-1.5 bg-[#1f4d8b] hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Fungua Kalenda ya Mwezi ya Usimamizi"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Kalenda ya Mwezi</span>
            </button>
          )}

          {onNavigateToInvigilation && (
            <button
              type="button"
              onClick={onNavigateToInvigilation}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              title="Tazama Moduli ya Usimamizi"
            >
              <span>Ratiba Kamili</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* Supervisor Status Callout Banner */}
      {isSupervisor && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 rounded-2xl border border-amber-400/40 shadow-sm space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                🛡️ WEWE NI MSIMAMIZI MKUU (SUPERVISOR WA MITIHANI)
              </h4>
            </div>
            <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full shadow-2xs">
              EXAM SUPERVISOR
            </span>
          </div>
          <p className="text-xs text-blue-100 font-medium">
            Mwalimu <strong className="text-white">{currentTeacher?.name}</strong>, umepangiwa kama Msimamizi Mkuu wa kituo hiki cha mtihani. Unasimamia uendeshaji mzima wa mitihani, ufunguzi wa bahasha na wasimamizi wote wa vyumba.
          </p>
        </div>
      )}

      {/* Content: Next 3 Sessions or Empty State */}
      {nextThreeSessions.length === 0 ? (
        <div className="py-8 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Hakuna usimamizi wa mitihani uliopangwa kwa sasa kwa mwalimu huyu.
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Vipindi vipya vya mitihani vikipangwa katika Moduli ya Usimamizi (Invigilation), vitaonekana hapa moja kwa moja.
          </p>
          {onNavigateToCalendar && (
            <button
              type="button"
              onClick={onNavigateToCalendar}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
            >
              <span>Fungua Kalenda ya Usimamizi ya Shule</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {nextThreeSessions.map((duty, idx) => {
            const sess = duty.session;
            const subCol = getSubjectColor(sess.subject);
            const isToday = duty.dateObj.toDateString() === new Date().toDateString();

            return (
              <div
                key={duty.id || idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                  isToday
                    ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-blue-50/40 border-slate-200 hover:border-blue-300 shadow-2xs'
                }`}
              >
                {/* Top Badge: Date, Day & Session */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-black uppercase text-slate-800">
                      {sess.day}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-200 text-amber-900 uppercase animate-pulse">
                        LEO
                      </span>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    sess.session === 'SESSION I'
                      ? 'bg-sky-100 text-sky-900'
                      : sess.session === 'SESSION II'
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-purple-100 text-purple-900'
                  }`}>
                    {sess.session}
                  </span>
                </div>

                {/* Date & Time */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sess.date || sess.rawDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono font-bold">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sess.time || `${sess.start || ''} - ${sess.end || ''}`}</span>
                  </div>
                </div>

                {/* Subject & Class */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        backgroundColor: subCol.bg,
                        color: subCol.text,
                        borderColor: subCol.border
                      }}
                      className="px-2.5 py-1 rounded-lg border text-xs font-black truncate max-w-full"
                      title={sess.subject}
                    >
                      {sess.subject}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    {sess.className} {sess.stream && sess.stream !== 'ALL' ? `• ${sess.stream}` : ''}
                  </div>
                </div>

                {/* Room Info */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-indigo-900 bg-indigo-100/70 px-2.5 py-1 rounded-lg text-[11px]">
                    <MapPin className="w-3 h-3 text-indigo-700" />
                    <span>Room {duty.roomNumber}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Assigned
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
