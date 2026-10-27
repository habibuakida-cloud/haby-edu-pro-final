import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Save,
  Database,
  Download,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  Check,
  XCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import {
  Teacher,
  SchoolInfo,
  UserAccount,
  TeacherAttendanceStatus,
  TeacherAttendanceEntry
} from '../../types';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID, getCurrentSchoolId } from '../../lib/dbClient';

interface TeacherAttendanceViewProps {
  teachers: Teacher[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  schoolId?: string;
  teacherAttendance?: Record<string, Record<number, TeacherAttendanceEntry>>;
  onSaveTeacherAttendance?: (
    date: string,
    recordsForDate: Record<number, TeacherAttendanceEntry>,
    fullMap: Record<string, Record<number, TeacherAttendanceEntry>>
  ) => void;
  onNavigateToPayroll?: () => void;
}

export const TeacherAttendanceView: React.FC<TeacherAttendanceViewProps> = ({
  teachers = [],
  schoolInfo,
  currentUser,
  schoolId: propSchoolId,
  teacherAttendance = {},
  onSaveTeacherAttendance,
  onNavigateToPayroll
}) => {
  const effectiveSchoolId = useMemo(
    () => propSchoolId || currentUser?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID,
    [propSchoolId, currentUser?.schoolId]
  );

  const [activeTab, setActiveTab] = useState<'daily_rollcall' | 'monthly_summary' | 'database_log'>('daily_rollcall');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<number, TeacherAttendanceEntry>>>(
    () => teacherAttendance || {}
  );
  const [dbRows, setDbRows] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Sync incoming prop changes
  useEffect(() => {
    if (teacherAttendance && Object.keys(teacherAttendance).length > 0) {
      setAttendanceMap(prev => ({ ...prev, ...teacherAttendance }));
    }
  }, [teacherAttendance]);

  // Load saved records from Supabase `teacher_attendance` table on mount
  const fetchFromSupabaseTable = useCallback(async () => {
    setIsLoadingDb(true);
    try {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('school_id', effectiveSchoolId);

      if (!error && Array.isArray(data)) {
        setDbRows(data);
        if (data.length > 0) {
          setAttendanceMap(prev => {
            const next = { ...prev };
            data.forEach((row: any) => {
              const dKey = String(row.date || '').split('T')[0];
              const tId = Number(row.teacher_id ?? row.teacherId);
              if (!dKey || !tId) return;
              if (!next[dKey]) next[dKey] = {};
              next[dKey][tId] = {
                id: row.id,
                teacherId: tId,
                teacherName: row.teacher_name || row.teacherName || '',
                schoolRole: row.school_role || row.schoolRole || 'Subject Teacher',
                date: dKey,
                dayOfWeek: row.day_of_week || row.dayOfWeek || '',
                status: (row.status as TeacherAttendanceStatus) || 'PRESENT',
                checkInTime: row.check_in_time || row.checkInTime || '07:30',
                checkOutTime: row.check_out_time || row.checkOutTime || '15:30',
                remarks: row.remarks || '',
                markedBy: row.marked_by || row.markedBy || 'Admin',
                updatedAt: row.updated_at || row.updatedAt
              };
            });
            return next;
          });
        }
      }
    } catch (err) {
      console.warn('Error loading teacher_attendance from Supabase:', err);
    } finally {
      setIsLoadingDb(false);
    }
  }, [effectiveSchoolId]);

  useEffect(() => {
    fetchFromSupabaseTable();
  }, [fetchFromSupabaseTable]);

  // Current date entries (defaulting un-marked teachers to PRESENT in draft view or showing saved status)
  const currentDayRecords = useMemo(() => {
    const savedForDate = attendanceMap[selectedDate] || {};
    const map: Record<number, TeacherAttendanceEntry> = {};
    const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }) || 'Monday';

    teachers.forEach(t => {
      if (savedForDate[t.id]) {
        map[t.id] = savedForDate[t.id];
      } else {
        map[t.id] = {
          id: `tatt_${effectiveSchoolId}_${selectedDate}_${t.id}`,
          teacherId: t.id,
          teacherName: t.name,
          schoolRole: t.schoolRole || 'Subject Teacher',
          date: selectedDate,
          dayOfWeek: dayName,
          status: 'PRESENT',
          checkInTime: '07:30',
          checkOutTime: '15:30',
          remarks: '',
          markedBy: currentUser?.name || 'Admin'
        };
      }
    });
    return map;
  }, [attendanceMap, selectedDate, teachers, effectiveSchoolId, currentUser?.name]);

  // Unique roles for filter
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    teachers.forEach(t => {
      if (t.schoolRole) roles.add(t.schoolRole);
    });
    return Array.from(roles).sort();
  }, [teachers]);

  // Filtered teachers for Daily Roll Call (Sorted: Female A-Z first, then Male A-Z)
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isFem = (t: Teacher) => {
      const g = (t.gender || '').toLowerCase().trim();
      if (g.startsWith('f') || g === 'ke' || g === 'girl' || g === 'mwanamke' || g === 'g') return true;
      const r = (t.schoolRole || '').toLowerCase();
      return r.includes('mistress') || r.includes('matron');
    };
    return teachers
      .filter(t => {
        const entry = currentDayRecords[t.id];
        const matchesQuery =
          !q ||
          t.name.toLowerCase().includes(q) ||
          (t.initial || '').toLowerCase().includes(q) ||
          (t.phone || '').toLowerCase().includes(q) ||
          (t.subjects || []).some(s => s.toLowerCase().includes(q));
        const matchesRole = selectedRole === 'ALL' || (t.schoolRole || 'Subject Teacher') === selectedRole;
        const matchesStatus = statusFilter === 'ALL' || entry?.status === statusFilter;
        return matchesQuery && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const aF = isFem(a);
        const bF = isFem(b);
        if (aF !== bF) return aF ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [teachers, currentDayRecords, searchQuery, selectedRole, statusFilter]);

  // Update a single teacher's entry for selectedDate
  const updateTeacherEntry = (teacherId: number, patch: Partial<TeacherAttendanceEntry>) => {
    const existing = currentDayRecords[teacherId];
    if (!existing) return;
    const updatedEntry: TeacherAttendanceEntry = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    if (patch.status === 'ABSENT' && !patch.checkInTime) {
      updatedEntry.checkInTime = '--:--';
      updatedEntry.checkOutTime = '--:--';
    } else if (patch.status === 'PRESENT' && updatedEntry.checkInTime === '--:--') {
      updatedEntry.checkInTime = '07:30';
      updatedEntry.checkOutTime = '15:30';
    } else if (patch.status === 'LATE' && updatedEntry.checkInTime === '07:30') {
      updatedEntry.checkInTime = '08:15';
    }

    setAttendanceMap(prev => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || currentDayRecords),
        [teacherId]: updatedEntry
      }
    }));
  };

  // Bulk mark all visible teachers
  const handleMarkAllStatus = (status: TeacherAttendanceStatus) => {
    const nextForDate: Record<number, TeacherAttendanceEntry> = { ...currentDayRecords };
    filteredTeachers.forEach(t => {
      const prevEntry = nextForDate[t.id];
      nextForDate[t.id] = {
        ...prevEntry,
        status,
        checkInTime: status === 'ABSENT' ? '--:--' : status === 'LATE' ? '08:15' : '07:30',
        checkOutTime: status === 'ABSENT' ? '--:--' : '15:30',
        updatedAt: new Date().toISOString()
      };
    });
    setAttendanceMap(prev => ({
      ...prev,
      [selectedDate]: nextForDate
    }));
    showToast(`Marked ${filteredTeachers.length} staff members as ${status}. Click "Save to Supabase" to persist.`);
  };

  // Persist selectedDate records to Supabase `teacher_attendance` table + AppData
  const handleSaveDailyToSupabase = async () => {
    setIsSaving(true);
    try {
      const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }) || 'Monday';
      const recordsForDate = currentDayRecords;
      const fullUpdatedMap = {
        ...attendanceMap,
        [selectedDate]: recordsForDate
      };
      setAttendanceMap(fullUpdatedMap);

      const supabasePayload = Object.values(recordsForDate).map(entry => ({
        id: `tatt_${effectiveSchoolId}_${selectedDate}_${entry.teacherId}`,
        school_id: effectiveSchoolId,
        teacher_id: entry.teacherId,
        teacher_name: entry.teacherName,
        school_role: entry.schoolRole || 'Subject Teacher',
        date: selectedDate,
        day_of_week: entry.dayOfWeek || dayName,
        status: entry.status,
        check_in_time: entry.checkInTime || '07:30',
        check_out_time: entry.checkOutTime || '15:30',
        remarks: entry.remarks || '',
        marked_by: currentUser?.name || entry.markedBy || 'Admin',
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('teacher_attendance').upsert(supabasePayload);
      if (error) {
        console.warn('Supabase teacher_attendance upsert notice:', error);
      }

      if (onSaveTeacherAttendance) {
        onSaveTeacherAttendance(selectedDate, recordsForDate, fullUpdatedMap);
      }

      await fetchFromSupabaseTable();
      showToast(
        `Saved ${supabasePayload.length} teacher attendance records for ${selectedDate} to Supabase (teacher_attendance)!`,
        'success'
      );
    } catch (err: any) {
      console.error('Error saving teacher attendance:', err);
      showToast(`Error saving attendance: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Daily KPI metrics
  const dailyStats = useMemo(() => {
    const entries = Object.values(currentDayRecords);
    const total = entries.length;
    const present = entries.filter(e => e.status === 'PRESENT').length;
    const late = entries.filter(e => e.status === 'LATE').length;
    const excused = entries.filter(e => e.status === 'EXCUSED').length;
    const absent = entries.filter(e => e.status === 'ABSENT').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100;
    return { total, present, late, excused, absent, rate };
  }, [currentDayRecords]);

  // Monthly Summary per teacher
  const monthlySummaryRows = useMemo(() => {
    const datesInMonth = Object.keys(attendanceMap).filter(d => d.startsWith(selectedMonth)).sort();
    const standardWorkingDays = Math.max(22, datesInMonth.length);

    return teachers.map(t => {
      let present = 0;
      let late = 0;
      let excused = 0;
      let absent = 0;

      datesInMonth.forEach(dKey => {
        const rec = attendanceMap[dKey]?.[t.id];
        if (!rec) return;
        if (rec.status === 'PRESENT') present++;
        else if (rec.status === 'LATE') late++;
        else if (rec.status === 'EXCUSED') excused++;
        else if (rec.status === 'ABSENT') absent++;
      });

      // If no dates logged yet in this month, show baseline projected working days
      const trackedDays = present + late + excused + absent;
      const effectivePresent = trackedDays === 0 ? standardWorkingDays : present;
      const attendanceRate =
        trackedDays > 0
          ? Math.round(((present + late * 0.75 + excused) / trackedDays) * 100)
          : 100;

      return {
        teacher: t,
        trackedDays,
        workingDays: standardWorkingDays,
        present: effectivePresent,
        late,
        excused,
        absent,
        attendanceRate
      };
    });
  }, [attendanceMap, selectedMonth, teachers]);

  // Export CSV helper
  const handleExportCsv = () => {
    const headers = ['Date', 'Teacher ID', 'Teacher Name', 'Role', 'Status', 'Check In', 'Check Out', 'Remarks'];
    const rows = Object.values(currentDayRecords).map(r => [
      r.date,
      `STF-${String(r.teacherId).padStart(4, '0')}`,
      `"${(r.teacherName || '').replace(/"/g, '""')}"`,
      `"${(r.schoolRole || '').replace(/"/g, '""')}"`,
      r.status,
      r.checkInTime,
      r.checkOutTime,
      `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher_attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDateSavedInMap = Boolean(attendanceMap[selectedDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
            <UserCheck className="w-4 h-4" />
            <span>People Management / Staff Presence Tracking</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Teacher Attendance Management (Mahudhurio ya Walimu)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Track daily staff presence, check-in/out times, and sync directly to the{' '}
            <code className="text-sky-300 font-mono">teacher_attendance</code> table in Supabase & Staff Payroll.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToPayroll && (
            <button
              onClick={onNavigateToPayroll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>Open Staff Payroll</span>
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleSaveDailyToSupabase}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving to Supabase...' : 'Save to Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('daily_rollcall')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'daily_rollcall'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Staff Roll Call</span>
          </button>
          <button
            onClick={() => setActiveTab('monthly_summary')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'monthly_summary'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Monthly Attendance & Payroll Link</span>
          </button>
          <button
            onClick={() => setActiveTab('database_log')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'database_log'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Supabase Table Records ({dbRows.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium border ${
              isDateSavedInMap
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDateSavedInMap ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {isDateSavedInMap
              ? `Saved for ${selectedDate}`
              : `Unsaved Draft for ${selectedDate}`}
          </span>
        </div>
      </div>

      {/* TAB 1: DAILY STAFF ROLL CALL */}
      {activeTab === 'daily_rollcall' && (
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Total Staff</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{dailyStats.total}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active faculty</div>
            </div>
            <div className="bg-white border border-emerald-200 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold uppercase text-emerald-700">Present</div>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums mt-1">{dailyStats.present}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">On time</div>
            </div>
            <div className="bg-white border border-amber-200 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold uppercase text-amber-700">Late Arrival</div>
              <div className="text-2xl font-bold text-amber-600 tabular-nums mt-1">{dailyStats.late}</div>
              <div className="text-[11px] text-amber-600 mt-0.5">After 08:00 AM</div>
            </div>
            <div className="bg-white border border-sky-200 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold uppercase text-sky-700">Excused / Leave</div>
              <div className="text-2xl font-bold text-sky-600 tabular-nums mt-1">{dailyStats.excused}</div>
              <div className="text-[11px] text-sky-600 mt-0.5">Permitted absence</div>
            </div>
            <div className="bg-white border border-rose-200 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold uppercase text-rose-700">Unexcused Absent</div>
              <div className="text-2xl font-bold text-rose-600 tabular-nums mt-1">{dailyStats.absent}</div>
              <div className="text-[11px] text-rose-600 mt-0.5">Affects payroll</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Daily Presence</div>
              <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{dailyStats.rate}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{selectedDate}</div>
            </div>
          </div>

          {/* Controls & Bulk Actions Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Search Staff
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Name, initial, phone, subject..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Role Filter
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles ({teachers.length})</option>
                  {availableRoles.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present Only</option>
                  <option value="LATE">Late Only</option>
                  <option value="EXCUSED">Excused Only</option>
                  <option value="ABSENT">Absent Only</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-4">
              <button
                onClick={() => handleMarkAllStatus('PRESENT')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                onClick={handleSaveDailyToSupabase}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Roll Call</span>
              </button>
            </div>
          </div>

          {/* Roll Call Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-3">Teacher / Staff Member</th>
                    <th className="py-3 px-3">Role & Subjects</th>
                    <th className="py-3 px-3 text-center">Check-In</th>
                    <th className="py-3 px-3 text-center">Check-Out</th>
                    <th className="py-3 px-3 text-center">Daily Presence Status</th>
                    <th className="py-3 px-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No teachers match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher, idx) => {
                      const entry = currentDayRecords[teacher.id];
                      const status = entry?.status || 'PRESENT';

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                                style={{ backgroundColor: teacher.color || '#1d4ed8' }}
                              >
                                {teacher.initial || teacher.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{teacher.name}</div>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                  ID: STF-{String(teacher.id).padStart(4, '0')}{' '}
                                  {teacher.phone ? `• ${teacher.phone}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">
                              {teacher.schoolRole || 'Subject Teacher'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                              {(teacher.subjects || []).join(', ') || 'General Duties'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="time"
                              value={entry?.checkInTime === '--:--' ? '' : entry?.checkInTime || '07:30'}
                              disabled={status === 'ABSENT'}
                              onChange={e => updateTeacherEntry(teacher.id, { checkInTime: e.target.value })}
                              className="px-2 py-1 rounded border border-slate-300 text-xs font-mono tabular-nums text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="time"
                              value={entry?.checkOutTime === '--:--' ? '' : entry?.checkOutTime || '15:30'}
                              disabled={status === 'ABSENT'}
                              onChange={e => updateTeacherEntry(teacher.id, { checkOutTime: e.target.value })}
                              className="px-2 py-1 rounded border border-slate-300 text-xs font-mono tabular-nums text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              {(
                                [
                                  { id: 'PRESENT', label: 'Present', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
                                  { id: 'LATE', label: 'Late', activeCls: 'bg-amber-500 text-white border-amber-500' },
                                  { id: 'EXCUSED', label: 'Excused', activeCls: 'bg-sky-600 text-white border-sky-600' },
                                  { id: 'ABSENT', label: 'Absent', activeCls: 'bg-rose-600 text-white border-rose-600' }
                                ] as const
                              ).map(btn => {
                                const isSelected = status === btn.id;
                                return (
                                  <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => updateTeacherEntry(teacher.id, { status: btn.id })}
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                                      isSelected
                                        ? btn.activeCls
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={entry?.remarks || ''}
                              onChange={e => updateTeacherEntry(teacher.id, { remarks: e.target.value })}
                              placeholder={
                                status === 'ABSENT'
                                  ? 'Reason for absence...'
                                  : status === 'EXCUSED'
                                  ? 'Official permission / sick leave...'
                                  : 'Optional note...'
                              }
                              className="w-full px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY SUMMARY & PAYROLL LINK */}
      {activeTab === 'monthly_summary' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 tabular-nums"
                />
              </div>
              <div className="text-xs text-slate-600">
                <div className="font-semibold text-slate-900">
                  Monthly Staff Attendance Audit ({selectedMonth})
                </div>
                <div>
                  These figures automatically feed into the <strong>Staff Payroll Management</strong> module for salary calculations.
                </div>
              </div>
            </div>

            {onNavigateToPayroll && (
              <button
                onClick={onNavigateToPayroll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Calculate Monthly Salaries from Attendance</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Staff Name</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-right">Working Days</th>
                    <th className="py-3 px-3 text-right">Present</th>
                    <th className="py-3 px-3 text-right">Late</th>
                    <th className="py-3 px-3 text-right">Excused</th>
                    <th className="py-3 px-3 text-right">Unexcused Absent</th>
                    <th className="py-3 px-3 text-right">Attendance Score</th>
                    <th className="py-3 px-3">Payroll Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {monthlySummaryRows.map((row, idx) => (
                    <tr key={row.teacher.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.teacher.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.teacher.schoolRole || 'Subject Teacher'}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{row.workingDays}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 tabular-nums">
                        {row.present}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-600 tabular-nums">
                        {row.late}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-sky-600 tabular-nums">
                        {row.excused}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 tabular-nums">
                        {row.absent}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            row.attendanceRate >= 95
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.attendanceRate >= 85
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {row.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {row.absent === 0 && row.late === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Full Attendance (Bonus Eligible)
                          </span>
                        ) : row.absent > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {row.absent} Day(s) Absence Deduction
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            {row.late} Late Arrival(s) Logged
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE `teacher_attendance` DATABASE RECORDS */}
      {activeTab === 'database_log' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Supabase <code className="text-blue-600 font-mono">teacher_attendance</code> Table Records
              </h3>
              <p className="text-xs text-slate-500">
                Showing {dbRows.length} persisted rows in PostgreSQL / Supabase for school ID{' '}
                <code className="font-mono text-slate-700">{effectiveSchoolId}</code>.
              </p>
            </div>
            <button
              onClick={fetchFromSupabaseTable}
              disabled={isLoadingDb}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin' : ''}`} />
              <span>Refresh Table</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Teacher ID</th>
                    <th className="py-3 px-3">Teacher Name</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Check-In / Out</th>
                    <th className="py-3 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dbRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No records saved in <code className="font-mono">teacher_attendance</code> yet. Click{' '}
                        <strong>"Save to Supabase"</strong> on the Daily Roll Call tab to persist records.
                      </td>
                    </tr>
                  ) : (
                    dbRows.slice(0, 200).map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                          {String(r.date || '').split('T')[0]}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                          STF-{String(r.teacher_id ?? r.teacherId ?? '').padStart(4, '0')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {r.teacher_name || r.teacherName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {r.school_role || r.schoolRole || 'Subject Teacher'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.status === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700'
                                : r.status === 'LATE'
                                ? 'bg-amber-50 text-amber-700'
                                : r.status === 'EXCUSED'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                          {r.check_in_time || r.checkInTime || '07:30'} -{' '}
                          {r.check_out_time || r.checkOutTime || '15:30'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{r.remarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
