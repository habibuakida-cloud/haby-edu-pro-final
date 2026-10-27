import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  UserCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Save, 
  Clock, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  Info, 
  Users,
  Eye
} from 'lucide-react';
import { DutyRosterData, Teacher, Student, SchoolInfo, UserAccount, DutyWeeklyAssignment, DutyDailyReport } from '../../types';
import { DutyRosterSystem, getMondayAndSunday, getWeekDaysList } from '../Discipline/DutyRosterSystem';

interface TeacherDutyRosterTabProps {
  currentTeacher: Teacher;
  currentUser?: UserAccount | null;
  teachers: Teacher[];
  students?: Student[];
  schoolInfo: SchoolInfo;
  schoolId?: string;
  dutyRosterData?: DutyRosterData;
  onUpdateDutyRoster?: (data: DutyRosterData) => void;
}

export const TeacherDutyRosterTab: React.FC<TeacherDutyRosterTabProps> = ({
  currentTeacher,
  currentUser,
  teachers,
  students = [],
  schoolInfo,
  schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
  dutyRosterData,
  onUpdateDutyRoster
}) => {
  const isAdminOrDiscipline = 
    currentUser?.role === 'HEADMASTER' || 
    currentUser?.role === 'ACADEMIC' || 
    currentUser?.role === 'SUPER_ADMIN' || 
    currentUser?.role === 'ADMIN' || 
    (currentUser?.role === 'TEACHER' && currentUser?.isSuperAdmin);

  // Compute active week label
  const { monday, label: activeWeekLabel } = getMondayAndSunday(new Date().toISOString().slice(0, 10));

  // Find active weekly duty assignment
  const activeWeeklyAssignment = useMemo(() => {
    if (!dutyRosterData?.weeklyAssignments) return null;
    return dutyRosterData.weeklyAssignments.find(w => w.weekStart === monday) || dutyRosterData.weeklyAssignments[0] || null;
  }, [dutyRosterData, monday]);

  // Check if current teacher is listed on duty for the active week
  const isTeacherOnDutyThisWeek = useMemo(() => {
    if (isAdminOrDiscipline) return true; // Discipline Masters and Admins always have access
    if (!activeWeeklyAssignment || !currentTeacher) return false;

    const tId = String(currentTeacher.id);
    const tName = (currentTeacher.name || '').toLowerCase().trim();

    return activeWeeklyAssignment.teacherIds.some(id => String(id) === tId) ||
      activeWeeklyAssignment.teacherNames.some(n => n.toLowerCase().trim() === tName || n.toLowerCase().includes(tName) || tName.includes(n.toLowerCase()));
  }, [activeWeeklyAssignment, currentTeacher, isAdminOrDiscipline]);

  const [activeSubView, setActiveSubView] = useState<'roster_system' | 'lock_status_info'>('roster_system');

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Lock / Unlock Status Badge */}
      <div className={`p-6 rounded-2xl border text-white shadow-md relative overflow-hidden transition-all ${
        isTeacherOnDutyThisWeek
          ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 border-emerald-700/50'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 font-black text-[10px] uppercase rounded-full tracking-wider flex items-center gap-1.5 shadow-xs ${
                isTeacherOnDutyThisWeek
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-amber-400 text-slate-950'
              }`}>
                {isTeacherOnDutyThisWeek ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-slate-950" />
                    <span>ZAMU YAKO INATENDA KAZI • UNLOCKED</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-950" />
                    <span>KITABU CHA ZAMU KIMEIMPANGIA MWALIMU MWINGINE • LOCKED</span>
                  </>
                )}
              </span>

              <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-slate-200 border border-white/15 rounded-full text-[10px] font-bold">
                {activeWeekLabel}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Kitabu cha Zamu (Teacher Duty Roster & Log Book)
            </h2>
            <p className="text-xs text-slate-300 font-medium max-w-2xl">
              {isTeacherOnDutyThisWeek ? (
                <span>Umepangiwa kama Mwalimu wa Zamu kwa wiki hii ({activeWeekLabel}). Una idhini ya kujaza na kurekodi mahudhurio ya shule, nidhamu, usafi, na kengele.</span>
              ) : (
                <span>Hujapangiwa zamu wiki hii. Ufikiaji wa kujaza Kitabu cha Zamu unadhibitiwa na Mwalimu wa Nidhamu (Discipline Master). Unaweza kuona ratiba tu.</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdminOrDiscipline && (
              <span className="px-3 py-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Nidhamu Control Active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lock Notice Info Alert if locked */}
      {!isTeacherOnDutyThisWeek && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-950 font-medium">
            <h4 className="font-black uppercase tracking-wide text-amber-900">
              Idhini ya Kujaza Kitabu cha Zamu (Read-Only Access):
            </h4>
            <p>
              Kwa usalama na utaratibu wa shule, kurekodi ripoti za kila siku za zamu kunafanywa na Walimu wa Zamu walioteuliwa na Mwalimu wa Nidhamu (Discipline Master) kwa wiki inayohusika. Mwalimu wa Nidhamu akikuweka kwenye Roster ya Wiki, sehemu ya kujaza itafunguka moja kwa moja!
            </p>
          </div>
        </div>
      )}

      {/* Duty Roster Main System Component */}
      <DutyRosterSystem
        schoolId={schoolId}
        schoolInfo={schoolInfo}
        students={students}
        teachers={teachers}
        currentUser={currentUser}
        dutyRosterData={dutyRosterData}
        onUpdateDutyRoster={data => {
          if (onUpdateDutyRoster) onUpdateDutyRoster(data);
        }}
      />

    </div>
  );
};
