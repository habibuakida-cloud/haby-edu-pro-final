import React, { useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Bell, 
  ChevronRight,
  Award,
  BookOpen
} from 'lucide-react';
import { Student, Teacher, Exam, DisciplineRecord } from '../types';

interface SmartDashboardWidgetProps {
  students: Student[];
  teachers: Teacher[];
  exams: Exam[];
  disciplineRecords?: DisciplineRecord[];
  onNavigate: (view: any) => void;
}

export const SmartDashboardWidget: React.FC<SmartDashboardWidgetProps> = ({
  students,
  teachers,
  exams,
  disciplineRecords = [],
  onNavigate
}) => {
  // 1. Total Active Students
  const totalStudents = students.length;

  // 2. Teacher-to-Student Ratio
  const teacherCount = teachers.length || 1;
  const ratio = (totalStudents / teacherCount).toFixed(1);
  const isOptimalRatio = Number(ratio) <= 30;

  // 3. Upcoming Exam Alerts
  const upcomingExams = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (exams || [])
      .filter(e => !e.date || e.date >= today)
      .slice(0, 3);
  }, [exams]);

  // 4. Summary of Recent Disciplinary Actions
  const recentDiscipline = useMemo(() => {
    return (disciplineRecords || [])
      .slice(-5)
      .reverse();
  }, [disciplineRecords]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-6">
      {/* Left: Smart Metrics & Ratio Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-900/50 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Smart Enrolment & Ratios</h3>
                <p className="text-[11px] text-blue-200/80">Real-time institutional capacity analytics</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Firestore
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Active Students</div>
              <div className="text-2xl font-black text-white mt-1">{totalStudents}</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Fully Synced
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-slate-400 text-[10px] uppercase font-black tracking-wider">Teacher : Student</div>
              <div className="text-2xl font-black text-white mt-1">1 : {ratio}</div>
              <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${isOptimalRatio ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOptimalRatio ? '✓ Optimal Ratio' : '⚠ High Student Load'}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Jumla ya Walimu: <strong className="text-white">{teachers.length}</strong></span>
          <button
            type="button"
            onClick={() => onNavigate('teachers')}
            className="text-blue-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition"
          >
            Tazama Walimu <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Upcoming Exams & Disciplinary Actions */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Exam Alerts & Discipline</h3>
                <p className="text-[11px] text-slate-500">Upcoming schedules & recent behavioral logs</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('results')}
              className="text-xs font-black text-blue-600 hover:underline cursor-pointer"
            >
              Yote ({exams.length})
            </button>
          </div>

          {/* Upcoming Exams */}
          <div className="mt-3 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mitihani Ijayo (Upcoming Exams)</div>
            {upcomingExams.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-center font-medium">
                Hakuna mitihani iliyopangwa kwa sasa.
              </div>
            ) : (
              upcomingExams.map((ex, idx) => (
                <div key={ex.id || idx} className="flex items-center justify-between p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{ex.name}</div>
                      <div className="text-[10px] text-slate-500">{ex.className} • {ex.level}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                    {ex.date || 'Hivi karibuni'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Recent Discipline Summary */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tukio la Hivi Punde (Disciplinary Summary)</span>
              <button 
                type="button"
                onClick={() => onNavigate('discipline')}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                Fungua Discipline
              </button>
            </div>

            {recentDiscipline.length === 0 ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl text-center">
                ✓ Hakuna kesi za nidhamu zilizoripotiwa hivi karibuni. Shule iko shwari!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {recentDiscipline.map((d: any, i: number) => (
                  <div key={d.id || i} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">{d.studentName || 'Mwanafunzi'}</span>
                        <span className="text-slate-500 text-[11px] ml-1">({d.category || 'Infraction'})</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      d.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {d.status || 'Open'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
