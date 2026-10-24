import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Search, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck, 
  Users, 
  Filter
} from 'lucide-react';
import { Teacher, SchoolInfo, UserAccount } from '../../types';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID, getCurrentSchoolId } from '../../lib/dbClient';

interface BiometricReportViewProps {
  teachers: Teacher[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  schoolId?: string;
}

export const BiometricReportView: React.FC<BiometricReportViewProps> = ({
  teachers = [],
  schoolInfo,
  currentUser,
  schoolId: propSchoolId
}) => {
  const effectiveSchoolId = useMemo(
    () => propSchoolId || currentUser?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID,
    [propSchoolId, currentUser?.schoolId]
  );

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Standard benchmarks
  const STANDARD_ARRIVAL_TIME = '07:45';
  const STANDARD_DEPARTURE_TIME = '15:30';

  const fetchBiometricAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('school_id', effectiveSchoolId)
        .eq('date', selectedDate);

      if (!error && Array.isArray(data)) {
        setAttendanceRows(data);
      } else {
        setAttendanceRows([]);
      }
    } catch (err) {
      console.warn("Error fetching biometric attendance report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBiometricAttendance();
  }, [selectedDate, effectiveSchoolId]);

  // Aggregate teacher attendance with biometric data
  const aggregatedData = useMemo(() => {
    const map = new Map<number, any>();
    attendanceRows.forEach(r => {
      const tId = Number(r.teacher_id ?? r.teacherId);
      map.set(tId, r);
    });

    return teachers.map(t => {
      const att = map.get(t.id);
      const checkIn = att?.check_in_time || att?.checkInTime || '--:--';
      const checkOut = att?.check_out_time || att?.checkOutTime || '--:--';

      // Evaluate late arrival
      let isLate = false;
      if (checkIn && checkIn !== '--:--') {
        isLate = checkIn > STANDARD_ARRIVAL_TIME;
      }

      // Evaluate early departure
      let leftEarly = false;
      if (checkOut && checkOut !== '--:--') {
        leftEarly = checkOut < STANDARD_DEPARTURE_TIME;
      }

      return {
        id: t.id,
        name: t.name,
        role: t.schoolRole || 'Subject Teacher',
        initial: t.initial,
        phone: t.phone || '-',
        fingerprintEnrolled: t.fingerprintEnrolled || false,
        fingerprintId: t.fingerprintId || 'Not Enrolled',
        checkInTime: checkIn,
        checkOutTime: checkOut,
        isLate,
        leftEarly,
        status: att?.status || (checkIn !== '--:--' ? 'PRESENT' : 'ABSENT'),
        remarks: att?.remarks || (checkIn !== '--:--' ? 'Biometric Verified' : 'No Check-In Recorded')
      };
    });
  }, [teachers, attendanceRows]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return aggregatedData.filter(d => {
      const matchesQ = !q || d.name.toLowerCase().includes(q) || d.initial?.toLowerCase().includes(q) || d.role.toLowerCase().includes(q);
      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'LATE' && d.isLate) ||
        (statusFilter === 'EARLY_DEPARTURE' && d.leftEarly) ||
        (statusFilter === 'PRESENT' && d.checkInTime !== '--:--') ||
        (statusFilter === 'ABSENT' && d.checkInTime === '--:--');
      return matchesQ && matchesStatus;
    });
  }, [aggregatedData, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = aggregatedData.length;
    const present = aggregatedData.filter(d => d.checkInTime !== '--:--').length;
    const late = aggregatedData.filter(d => d.isLate).length;
    const earlyDeparture = aggregatedData.filter(d => d.leftEarly).length;
    return { total, present, late, earlyDeparture };
  }, [aggregatedData]);

  const handleExportCSV = () => {
    let csv = 'Teacher Name,Role,Fingerprint ID,Arrival (Check-In),Departure (Check-Out),Late Arrival,Early Departure,Status,Remarks\n';
    aggregatedData.forEach(d => {
      csv += `"${d.name}","${d.role}","${d.fingerprintId}","${d.checkInTime}","${d.checkOutTime}","${d.isLate ? 'YES' : 'NO'}","${d.leftEarly ? 'YES' : 'NO'}","${d.status}","${d.remarks}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Biometric_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Biometric Fingerprint Audit
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Biometric Arrival &amp; Departure Report
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Real-time aggregation of teacher fingerprint check-ins and check-outs, highlighting late arrivals (&gt;{STANDARD_ARRIVAL_TIME}) and early departures (&lt;{STANDARD_DEPARTURE_TIME}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20">
            <Calendar className="w-4 h-4 text-amber-300" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Total Faculty</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
            <span className="text-[10px] text-slate-400">Registered staff</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase">Verified Present</span>
            <h3 className="text-2xl font-black text-emerald-900 mt-1">{stats.present}</h3>
            <span className="text-[10px] text-emerald-600">Checked in via fingerprint</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase">Late Arrivals (&gt;{STANDARD_ARRIVAL_TIME})</span>
            <h3 className="text-2xl font-black text-amber-900 mt-1">{stats.late}</h3>
            <span className="text-[10px] text-amber-600">Arrived after threshold</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase">Early Departures (&lt;{STANDARD_DEPARTURE_TIME})</span>
            <h3 className="text-2xl font-black text-rose-900 mt-1">{stats.earlyDeparture}</h3>
            <span className="text-[10px] text-rose-600">Checked out before hours</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search teacher by name, role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-700"
          >
            <option value="ALL">All Attendance Status ({aggregatedData.length})</option>
            <option value="PRESENT">Present (Verified)</option>
            <option value="LATE">⚠️ Late Arrivals Only</option>
            <option value="EARLY_DEPARTURE">⚠️ Early Departures Only</option>
            <option value="ABSENT">Absent / No Scan</option>
          </select>
        </div>
      </div>

      {/* Biometric Aggregated Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">
              Daily Fingerprint Log &amp; Time Analysis - {selectedDate}
            </h3>
            <p className="text-[11px] text-slate-500">
              Showing {filteredData.length} of {aggregatedData.length} faculty members.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                <th className="p-3 border-r border-slate-200 w-12 text-center">#</th>
                <th className="p-3 border-r border-slate-200">Teacher Name</th>
                <th className="p-3 border-r border-slate-200">Staff Role</th>
                <th className="p-3 border-r border-slate-200 text-center">Biometric ID</th>
                <th className="p-3 border-r border-slate-200 text-center">Arrival (Check-In)</th>
                <th className="p-3 border-r border-slate-200 text-center">Departure (Check-Out)</th>
                <th className="p-3 border-r border-slate-200 text-center">Time Analysis / Highlights</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Inapakia taarifa za vidole kutoka kwenye hifadhidata...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Hakuna kumbukumbu za vidole zilizopatikana kwa tarehe hii ({selectedDate}).
                  </td>
                </tr>
              ) : (
                filteredData.map((d, idx) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                      {d.name} <span className="text-[10px] text-slate-400 font-mono font-normal">({d.initial})</span>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-700">{d.role}</td>
                    <td className="p-3 border-r border-slate-200 text-center font-mono text-indigo-700 font-bold">
                      {d.fingerprintEnrolled ? (d.fingerprintId || 'FP-Enrolled') : <span className="text-slate-400 italic font-normal">Not Enrolled</span>}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center">
                      <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                        d.checkInTime === '--:--' 
                          ? 'bg-slate-100 text-slate-400' 
                          : d.isLate 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {d.checkInTime}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center">
                      <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                        d.checkOutTime === '--:--' 
                          ? 'bg-slate-100 text-slate-400' 
                          : d.leftEarly 
                          ? 'bg-rose-100 text-rose-900 border border-rose-300' 
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      }`}>
                        {d.checkOutTime}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {d.checkInTime === '--:--' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                            No Scan
                          </span>
                        ) : (
                          <>
                            {d.isLate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Late Arrival
                              </span>
                            )}
                            {d.leftEarly && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-2xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Early Departure
                              </span>
                            )}
                            {!d.isLate && !d.leftEarly && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Time / Perfect
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        d.checkInTime !== '--:--' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {d.checkInTime !== '--:--' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
