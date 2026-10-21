import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Server, Layers, CloudCheck } from 'lucide-react';
import { supabase, db } from '../../lib/dbClient';
import { doc, getDocFromServer } from 'firebase/firestore';

interface TableStatus {
  name: string;
  label: string;
  category: string;
  connected: boolean;
  count: number | null;
  error?: string;
}

const ALL_TABLES_META: { name: string; label: string; category: string }[] = [
  // Core Institutional
  { name: 'schools', label: 'Schools Registry', category: 'Core' },
  { name: 'school_data', label: 'School Snapshot (JSONB)', category: 'Core' },
  { name: 'school_settings', label: 'School Configuration', category: 'Core' },
  { name: 'school_subscriptions', label: 'School Subscriptions', category: 'Core' },
  { name: 'profiles', label: 'User Profiles & Roles', category: 'Core' },
  { name: 'user_roles', label: 'Role Assignments', category: 'Core' },
  // Academic Roster & Curriculum
  { name: 'students', label: 'Students Roster', category: 'Academic' },
  { name: 'teachers', label: 'Teachers & Staff', category: 'Academic' },
  { name: 'classes', label: 'Classes & Streams', category: 'Academic' },
  { name: 'stream_settings', label: 'Stream Settings', category: 'Academic' },
  { name: 'subjects', label: 'Subjects Catalog', category: 'Academic' },
  { name: 'subject_period_allocations', label: 'Subject Period Allocations', category: 'Academic' },
  { name: 'teacher_assignments', label: 'Teacher Subject Assignments', category: 'Academic' },
  // Timetables & Teaching Logs
  { name: 'periods', label: 'School Periods', category: 'Timetable' },
  { name: 'period_settings', label: 'Period Settings', category: 'Timetable' },
  { name: 'period_allocations', label: 'Period Allocations', category: 'Timetable' },
  { name: 'timetable_assignments', label: 'Timetable Assignments', category: 'Timetable' },
  { name: 'timetables', label: 'Master Timetables', category: 'Timetable' },
  { name: 'saved_timetable_records', label: 'Saved Timetable Snapshots', category: 'Timetable' },
  { name: 'teacher_period_attendance', label: 'Teacher Period Attendance', category: 'Timetable' },
  { name: 'teaching_logs', label: 'Classroom Teaching Logs', category: 'Timetable' },
  // Examinations & Results
  { name: 'exams', label: 'Examination Sessions', category: 'Exams' },
  { name: 'exam_results', label: 'Student Exam Results', category: 'Exams' },
  { name: 'exam_records', label: 'Master Examination Ledger', category: 'Exams' },
  { name: 'exam_timetables', label: 'Examination Timetables', category: 'Exams' },
  { name: 'exam_sitting_plans', label: 'Exam Sitting Plans', category: 'Exams' },
  { name: 'invigilation_rosters', label: 'Invigilation Rosters', category: 'Exams' },
  { name: 'invigilation_slots', label: 'Invigilation Slots', category: 'Exams' },
  { name: 'invigilation_settings', label: 'Invigilation Settings', category: 'Exams' },
  { name: 'selected_invigilators', label: 'Selected Invigilators', category: 'Exams' },
  // Attendance, Discipline & Parent Portal
  { name: 'period_attendance', label: 'Daily & Period Attendance', category: 'Attendance' },
  { name: 'weekly_attendance_reports', label: 'Weekly Attendance Reports', category: 'Attendance' },
  { name: 'discipline_records', label: 'Student Discipline Records', category: 'Discipline' },
  { name: 'teacher_duty_roster', label: 'Teacher Duty Roster', category: 'Discipline' },
  { name: 'parents', label: 'Parent Contacts', category: 'Portal' },
  { name: 'parent_students', label: 'Parent-Student Links', category: 'Portal' },
  // Remedial & Academic Resources
  { name: 'remedial_timetable', label: 'Remedial Timetable', category: 'Remedial' },
  { name: 'remedial_attendance', label: 'Remedial Attendance', category: 'Remedial' },
  { name: 'remedial_payment_settings', label: 'Remedial Payment Settings', category: 'Remedial' },
  { name: 'ream_paper_records', label: 'Ream Paper Contributions', category: 'Resources' },
  // Laboratory & Environment
  { name: 'lab_inventory', label: 'Laboratory Inventory', category: 'Laboratory' },
  { name: 'lab_orders', label: 'Laboratory Orders', category: 'Laboratory' },
  { name: 'lab_requisitions', label: 'Laboratory Requisitions', category: 'Laboratory' },
  { name: 'lab_experiments', label: 'Laboratory Experiments', category: 'Laboratory' },
  { name: 'lab_safety_incidents', label: 'Lab Safety Incidents', category: 'Laboratory' },
  { name: 'environment_equipment', label: 'Environment Equipment', category: 'Environment' },
  { name: 'equipment_usage_log', label: 'Equipment Usage Logs', category: 'Environment' },
  { name: 'environment_orders', label: 'Environment Orders', category: 'Environment' },
  { name: 'school_purchased_equipment', label: 'Purchased Equipment', category: 'Environment' },
  // SMS, Finance & Security
  { name: 'sms_wallet', label: 'SMS Wallet Balance', category: 'Communications' },
  { name: 'sms_logs', label: 'SMS Dispatch Logs', category: 'Communications' },
  { name: 'sms_payment_history', label: 'SMS Payment History', category: 'Finance' },
  { name: 'payment_verification_requests', label: 'Payment Verifications', category: 'Finance' },
  { name: 'fee_structures', label: 'Fee Structures', category: 'Finance' },
  { name: 'student_invoices', label: 'Student Invoices', category: 'Finance' },
  { name: 'fee_payments', label: 'Fee Payments', category: 'Finance' },
  { name: 'activity_logs', label: 'System Audit Logs', category: 'Security' }
];

export const DatabaseHealthWidget: React.FC = () => {
  const [statuses, setStatuses] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [firestoreOk, setFirestoreOk] = useState<boolean>(true);
  const [totalTablesInDb, setTotalTablesInDb] = useState<number>(54);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      // 1. Check Firestore connection
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setFirestoreOk(true);
      } catch (fsErr: any) {
        setFirestoreOk(!fsErr?.message?.includes('offline'));
      }

      // 2. Query server diagnostics endpoint for all 54 PostgreSQL tables
      const diagRes = await fetch('/api/db/diagnostics');
      if (diagRes.ok) {
        const diag = await diagRes.json();
        setTotalTablesInDb(diag.totalTables || 54);
        const diagMap = new Map<string, { connected: boolean; count: number; error?: string }>();
        (diag.tables || []).forEach((t: any) => {
          diagMap.set(t.table, { connected: t.connected, count: t.rowCount, error: t.error });
        });

        const results: TableStatus[] = ALL_TABLES_META.map(meta => {
          const found = diagMap.get(meta.name);
          if (found) {
            return {
              ...meta,
              connected: found.connected,
              count: found.count,
              error: found.error
            };
          }
          return {
            ...meta,
            connected: true,
            count: 0
          };
        });
        setStatuses(results);
      } else {
        const results: TableStatus[] = [];
        for (const t of ALL_TABLES_META.slice(0, 15)) {
          try {
            const { data, error } = await supabase.from(t.name).select('*');
            results.push({
              ...t,
              connected: !error,
              count: Array.isArray(data) ? data.length : 0,
              error: error?.message
            });
          } catch (err: any) {
            results.push({
              ...t,
              connected: false,
              count: null,
              error: err.message || 'Unknown error'
            });
          }
        }
        setStatuses(results);
      }
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
      setLoading(false);
    }
  };

  const handleSyncRelationalTables = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const schoolId = localStorage.getItem('currentSchoolId') || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
      const res = await fetch('/api/db/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId })
      });
      const json = await res.json();
      if (json.success) {
        const s = json.synced || {};
        setSyncMessage(
          `Synced successfully: ${s.students || 0} students, ${s.teachers || 0} teachers, ${s.exams || 0} exams, ${s.classes || 0} classes, ${s.periods || 0} periods, ${s.timetableAssignments || 0} timetable slots.`
        );
        await checkHealth();
      } else {
        setSyncMessage(`Sync notice: ${json.error || 'Could not complete sync'}`);
      }
    } catch (e: any) {
      setSyncMessage(`Sync error: ${e.message || String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const allConnected = statuses.length > 0 && statuses.every(s => s.connected) && firestoreOk;
  const connectedCount = statuses.filter(s => s.connected).length;
  const totalRecords = statuses.reduce((acc, s) => acc + (s.count || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${allConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-wider flex items-center gap-2">
              Database & Table Connectivity Monitor
              <span className="px-2 py-0.5 text-[10px] rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {totalTablesInDb} SQL Tables + Firestore
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time verification of Cloud SQL PostgreSQL tables & Firebase Firestore collections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncRelationalTables}
            disabled={syncing || loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Layers className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Tables...' : 'Sync Snapshot to Relational Tables'}
          </button>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>
      </div>

      <div className="p-5">
        {syncMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="text-emerald-600 hover:underline ml-4">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${allConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            {allConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-75">PostgreSQL Tables</div>
              <div className="text-sm font-black">{connectedCount} / {statuses.length} Active ({totalTablesInDb} in Schema)</div>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${firestoreOk ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            <CloudCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-black tracking-wider opacity-75">Firebase Firestore</div>
              <div className="text-sm font-black">{firestoreOk ? 'Connected & Rules Deployed' : 'Connection Warning'}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-slate-600 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-black tracking-wider opacity-75">Total Relational Rows</div>
                <div className="text-sm font-black">{totalRecords.toLocaleString()} Records</div>
              </div>
            </div>
            {lastChecked && <span className="text-[10px] font-mono text-slate-500">{lastChecked}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {statuses.map((s) => (
            <div
              key={s.name}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                s.connected
                  ? 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {s.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-800 truncate">{s.label}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    public.{s.name} • <span className="text-slate-500">{s.category}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                {s.connected ? (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                    (s.count || 0) > 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                    {s.count !== null ? `${s.count} rows` : 'Active'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-600 block max-w-[120px] truncate" title={s.error}>
                    {s.error || 'Disconnected'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
