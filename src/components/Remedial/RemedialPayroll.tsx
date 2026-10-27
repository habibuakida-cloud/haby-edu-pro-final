import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { 
  Wallet, 
  Printer, 
  FileSpreadsheet, 
  Users, 
  Clock, 
  DollarSign,
  CheckCircle2,
  History,
  ShieldCheck,
  Settings,
  Calendar,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  getRemedialAnalysis, 
  getRemedialPaymentSettings, 
  saveRemedialPaymentSetting,
  getRemedialPaymentHistory,
  saveRemedialPaymentHistoryBatch,
  getRemedialTimetable,
  markRemedialAttendance
} from '../../lib/remedialService';
import { Teacher, SchoolInfo } from '../../types';

interface RemedialPayrollProps {
  schoolId: string;
  teachers: Teacher[];
  schoolInfo?: SchoolInfo;
  currentUser?: any;
}

export const RemedialPayroll: React.FC<RemedialPayrollProps> = ({
  schoolId,
  teachers = [],
  schoolInfo,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'history' | 'settings'>('payroll');
  const [periodType, setPeriodType] = useState<'weekly' | 'biweekly' | 'monthly' | 'custom'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customRange, setCustomRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<Record<string, number>>({});
  const [defaultRate, setDefaultRate] = useState<number>(5000); // 5000 TZS per period default
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [batchMarking, setBatchMarking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');

  useEffect(() => {
    loadPayrollData();
  }, [schoolId, periodType, selectedDate, customRange]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      // 1. Load payment settings & history
      const [{ data: settings }, { data: history }] = await Promise.all([
        getRemedialPaymentSettings(schoolId),
        getRemedialPaymentHistory(schoolId)
      ]);

      const sMap: Record<string, number> = {};
      (settings || []).forEach((s: any) => {
        sMap[s.class_name || s.className || 'Default'] = s.rate_per_period || 5000;
        if (s.class_name === 'DEFAULT' || s.class_name === 'All' || s.class_name === 'default') {
          setDefaultRate(s.rate_per_period || 5000);
        }
      });
      setPaymentSettings(sMap);
      setPaymentHistory(history || []);

      // 2. Calculate date bounds
      let startStr = customRange.from;
      let endStr = customRange.to;

      const d = new Date(selectedDate);
      if (periodType === 'weekly') {
        startStr = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endStr = format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (periodType === 'biweekly') {
        startStr = format(subDays(d, 14), 'yyyy-MM-dd');
        endStr = format(d, 'yyyy-MM-dd');
      } else if (periodType === 'monthly') {
        startStr = format(startOfMonth(d), 'yyyy-MM-dd');
        endStr = format(endOfMonth(d), 'yyyy-MM-dd');
      }

      // 3. Fetch remedial attendance logs
      const { data: att } = await getRemedialAnalysis(schoolId, startStr, endStr, 'All');
      const filtered = (att || []).filter((r: any) => {
        if (!r.date) return true;
        return r.date >= startStr && r.date <= endStr;
      });
      setAttendanceRecords(filtered);
    } catch (err) {
      console.error('Error loading remedial payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate taught sessions per teacher
  const teacherPayrollRows = useMemo(() => {
    const teacherMap = new Map<string, {
      teacherId: string;
      teacherName: string;
      taughtSessionsCount: number;
      totalMinutes: number;
      classesSet: Set<string>;
      subjectsSet: Set<string>;
      sessionsList: any[];
      totalAmount: number;
    }>();

    attendanceRecords.forEach(record => {
      if (record.status !== 'taught') return;

      const teacherName = record.substitute_teacher || record.teacher_name || 'Mwalimu wa Ziada';
      const cleanName = teacherName.trim();
      
      const matchedTeacher = teachers.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
      const teacherId = matchedTeacher?.id ? String(matchedTeacher.id) : record.teacher_id || `TCH-${cleanName.substring(0, 3).toUpperCase()}`;

      const current = teacherMap.get(cleanName) || {
        teacherId: String(teacherId),
        teacherName: cleanName,
        taughtSessionsCount: 0,
        totalMinutes: 0,
        classesSet: new Set(),
        subjectsSet: new Set(),
        sessionsList: [],
        totalAmount: 0
      };

      current.taughtSessionsCount += 1;
      const dur = record.duration_minutes || 60;
      current.totalMinutes += dur;
      if (record.class_name) current.classesSet.add(`${record.class_name} ${record.stream || ''}`.trim());
      if (record.subject) current.subjectsSet.add(record.subject);
      current.sessionsList.push(record);

      const rate = paymentSettings[record.class_name] || defaultRate;
      current.totalAmount += rate;

      teacherMap.set(cleanName, current);
    });

    const rows = Array.from(teacherMap.values()).map(item => ({
      ...item,
      classes: Array.from(item.classesSet),
      subjects: Array.from(item.subjectsSet),
      hours: Number((item.totalMinutes / 60).toFixed(1))
    }));

    return rows.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [attendanceRecords, paymentSettings, defaultRate, teachers]);

  const filteredRows = useMemo(() => {
    if (selectedTeacherFilter === 'ALL') return teacherPayrollRows;
    return teacherPayrollRows.filter(r => r.teacherName.toLowerCase() === selectedTeacherFilter.toLowerCase());
  }, [teacherPayrollRows, selectedTeacherFilter]);

  const grandTotalAmount = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [filteredRows]);

  const grandTotalSessions = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + r.taughtSessionsCount, 0);
  }, [filteredRows]);

  // Handle saving rate change
  const handleSaveDefaultRate = async (newRate: number) => {
    setDefaultRate(newRate);
    setSavingSettings(true);
    try {
      await saveRemedialPaymentSetting(schoolId, {
        class_name: 'DEFAULT',
        rate_per_period: newRate
      });
      setSuccessMessage('Kiwango cha malipo kimehifadhiwa kikamilifu!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  // Batch Select & Auto-Mark Range as Taught
  const handleBatchMarkRangeAsTaught = async () => {
    if (!window.confirm('Una uhakika unataka kutiki na kuhifadhi vipindi vyote vilivyopangwa katika kipindi hiki chote kama "Vimefundishwa" (Batch Select & Taught)?')) {
      return;
    }
    setBatchMarking(true);
    try {
      const { data: tt } = await getRemedialTimetable(schoolId);
      
      let startStr = customRange.from;
      let endStr = customRange.to;
      const d = new Date(selectedDate);
      if (periodType === 'weekly') {
        startStr = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endStr = format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (periodType === 'biweekly') {
        startStr = format(subDays(d, 14), 'yyyy-MM-dd');
        endStr = format(d, 'yyyy-MM-dd');
      } else if (periodType === 'monthly') {
        startStr = format(startOfMonth(d), 'yyyy-MM-dd');
        endStr = format(endOfMonth(d), 'yyyy-MM-dd');
      }

      const startDateObj = new Date(startStr);
      const endDateObj = new Date(endStr);
      
      let count = 0;
      const curr = new Date(startDateObj);
      while (curr <= endDateObj) {
        const dateStr = format(curr, 'yyyy-MM-dd');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[curr.getDay()];

        const matchingTt = (tt || []).filter(t => t.day_of_week === dayName || (t.date && t.date === dateStr));
        for (const period of matchingTt) {
          const record = {
            date: dateStr,
            day_of_week: dayName,
            period_time: period.period_time || `${period.start_time}-${period.end_time}`,
            class_name: period.class_name,
            subject: period.subject,
            teacher_name: period.teacher_name,
            stream: period.stream || 'A',
            status: 'taught',
            marked_by: currentUser?.name || 'Administrator (Batch Select)',
            rate_per_period: defaultRate
          };
          await markRemedialAttendance(schoolId, record);
          count++;
        }
        curr.setDate(curr.getDate() + 1);
      }

      setSuccessMessage(`Imefanikiwa! Vipindi ${count} vimetikiwa na kuhifadhiwa kama "Vimefundishwa" kwa ajili ya Payroll.`);
      loadPayrollData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Batch mark error:', err);
    } finally {
      setBatchMarking(false);
    }
  };

  // Finalize and save payroll to history
  const handleFinalizePayroll = async () => {
    if (filteredRows.length === 0) return;
    setFinalizing(true);
    try {
      const paymentDate = format(new Date(), 'yyyy-MM-dd');
      const recordsToSave = filteredRows.map(r => ({
        id: `pay_${schoolId}_${r.teacherId}_${paymentDate}_${Math.random().toString(36).substring(2, 6)}`,
        teacher_id: r.teacherId,
        teacher_name: r.teacherName,
        period_type: periodType,
        payment_date: paymentDate,
        total_periods: r.taughtSessionsCount,
        total_hours: r.hours,
        classes: r.classes.join(', '),
        subjects: r.subjects.join(', '),
        total_amount: r.totalAmount,
        rate_applied: defaultRate,
        status: 'Finalized & Paid',
        approved_by: currentUser?.name || 'Administrator'
      }));

      await saveRemedialPaymentHistoryBatch(schoolId, recordsToSave);
      const { data: updatedHistory } = await getRemedialPaymentHistory(schoolId);
      setPaymentHistory(updatedHistory || []);
      setSuccessMessage(`Malipo ya walimu ${filteredRows.length} yamethibitishwa na kuhifadhiwa kwenye kumbukumbu za ukaguzi!`);
      setActiveTab('history');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error finalizing payroll:', err);
    } finally {
      setFinalizing(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const schoolName = schoolInfo?.name || 'HABY SECONDARY SCHOOL';
    const reportTitle = `MALIPO YA WALIMU WA MASOMO YA ZIADA (REMEDIAL TEACHER PAYROLL)`;
    const subtitle = `Kipindi: ${periodType.toUpperCase()} | Kiwango kwa Kipindi: TZS ${defaultRate.toLocaleString()} | Tarehe: ${new Date().toLocaleDateString('sw-TZ')}`;

    doc.setFillColor(31, 77, 139);
    doc.rect(10, 10, 277, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(reportTitle, 14, 25);

    doc.setFontSize(8);
    doc.text(subtitle, 14, 30);

    doc.setFillColor(245, 247, 250);
    doc.rect(10, 38, 277, 16, 'F');
    doc.setDrawColor(200, 210, 225);
    doc.rect(10, 38, 277, 16, 'S');

    doc.setTextColor(30, 40, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumla ya Walimu: ${filteredRows.length}`, 14, 47);
    doc.text(`Jumla ya Vipindi: ${grandTotalSessions}`, 90, 47);
    doc.text(`Jumla Kuu: TZS ${grandTotalAmount.toLocaleString()}`, 190, 47);

    const tableData = filteredRows.map((r, i) => [
      i + 1,
      r.teacherId,
      r.teacherName,
      r.classes.join(', '),
      r.subjects.join(', '),
      r.taughtSessionsCount,
      `${r.hours} hrs`,
      `TZS ${(r.totalAmount).toLocaleString()}`,
      'Imekamilika'
    ]);

    autoTable(doc, {
      startY: 58,
      head: [[
        '#',
        'ID ya Mwalimu',
        'Jina la Mwalimu',
        'Madarasa',
        'Masomo',
        'Vipindi',
        'Masaa',
        'Kiasi (TZS)',
        'Hali'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [31, 77, 139],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', fontStyle: 'bold' },
        2: { fontStyle: 'bold' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'center' }
      }
    });

    doc.save(`Remedial_Payroll_${periodType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID ya Mwalimu',
      'Jina la Mwalimu',
      'Madarasa',
      'Masomo',
      'Vipindi Vilivyofundishwa',
      'Jumla ya Masaa',
      'Kiasi Cha Malipo (TZS)'
    ];

    const rows = filteredRows.map(r => [
      `"${r.teacherId}"`,
      `"${r.teacherName}"`,
      `"${r.classes.join(' | ')}"`,
      `"${r.subjects.join(' | ')}"`,
      `"${r.taughtSessionsCount}"`,
      `"${r.hours}"`,
      `"${r.totalAmount}"`
    ]);

    const csvContent = [
      `"PAYROLL YA MASOMO YA ZIADA (REMEDIAL) - ${schoolInfo?.name || 'HABY SCHOOL'}"`,
      `"Aina ya Kipindi: ${periodType.toUpperCase()} | Kiwango/Kipindi: TZS ${defaultRate} | Tarehe: ${new Date().toLocaleDateString('sw-TZ')}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Remedial_Payroll_${periodType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#112a46] via-[#1b4372] to-[#0f243d] rounded-3xl p-6 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-black tracking-wider uppercase">
              <DollarSign className="w-3.5 h-3.5 text-emerald-300" />
              <span>Remedial Allowance &amp; Audit Trail</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Wallet className="w-6 h-6 text-amber-400" />
              <span>Payroll ya Masomo ya Ziada &amp; Malipo</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Hesabu posho za walimu kulingana na kiwango maalum kwa kipindi, tumia Batch Select kukamilisha vipindi, na weka kumbukumbu sahihi za kihistoria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleBatchMarkRangeAsTaught}
              disabled={batchMarking}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-white" />
              <span>{batchMarking ? 'Inachakata...' : '⚡ Batch Select: Tika Vipindi Vyote'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>🖨️ Chapisha Payroll (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Pakua Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleFinalizePayroll}
              disabled={finalizing || filteredRows.length === 0}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>{finalizing ? 'Inahifadhi...' : 'Thibitisha na Hifadhi Malipo'}</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase text-blue-300 tracking-wider block">Jumla ya Walimu Waliopo</span>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline gap-1.5">
              <span>{filteredRows.length}</span>
              <span className="text-[11px] font-bold text-slate-400">walimu</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">Jumla ya Vipindi Vilivyofundishwa</span>
            <div className="text-2xl font-black text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span>{grandTotalSessions}</span>
              <span className="text-[11px] font-bold text-slate-400">vipindi</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">Jumla Kuu ya Posho (TZS)</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
              <span>TZS {grandTotalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'payroll' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Hesabu za Payroll ya Sasa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'history' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historia ya Malipo &amp; Audit ({paymentHistory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'settings' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Mipangilio ya Viwango vya Malipo</span>
        </button>
      </div>

      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Control Bar: Period Type & Rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Period Type */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Mzunguko wa Malipo:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPeriodType('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
                      periodType === 'weekly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kila Wiki (Weekly)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('biweekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
                      periodType === 'biweekly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wiki Mbili (Bi-Weekly)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
                      periodType === 'monthly' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kwa Mwezi (Monthly)
                  </button>
                </div>
              </div>

              {/* Date Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Tarehe Rejea:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Rate Indicator & Settings shortcut */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                <span className="text-[11px] font-black text-blue-900 uppercase">Kiwango cha Sasa:</span>
                <span className="text-xs font-black text-emerald-700">TZS {defaultRate.toLocaleString()} / kipindi</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Badili Kiwango</span>
              </button>
            </div>
          </div>

          {/* Teacher Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                  Orodha ya Malipo ya Walimu ({filteredRows.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Hesabu imetolewa kutoka kwenye vipindi vilivyotikiwa "Vifundishwa" (Taught)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">ID ya Mwalimu</th>
                    <th className="py-3 px-4">Jina la Mwalimu</th>
                    <th className="py-3 px-4">Madarasa</th>
                    <th className="py-3 px-4">Masomo</th>
                    <th className="py-3 px-4 text-center">Vipindi Vilivyofundishwa</th>
                    <th className="py-3 px-4 text-center">Jumla ya Masaa</th>
                    <th className="py-3 px-4 text-right">Kiasi cha Posho (TZS)</th>
                    <th className="py-3 px-4 text-center">Hali</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                        Hakuna kumbukumbu za vipindi vilivyofundishwa kwa kipindi hiki ulichochagua. Tumia kitufe cha "Batch Select: Tika Vipindi Vyote" hapo juu kurahisisha.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={row.teacherName} className="hover:bg-blue-50/40 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-800 text-center">{row.teacherId}</td>
                        <td className="py-3.5 px-4 font-black text-slate-900">{row.teacherName}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{row.classes.join(', ')}</td>
                        <td className="py-3.5 px-4 font-bold text-blue-700">{row.subjects.join(', ')}</td>
                        <td className="py-3.5 px-4 text-center font-black text-slate-900">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg">
                            {row.taughtSessionsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">{row.hours} hrs</td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                          TZS {row.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                            Tayari Kulipwa
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
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                  Historia ya Malipo &amp; Kumbukumbu za Ukaguzi (Payment History Audit Trail)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Orodha ya malipo yote yaliyothibitishwa hapo awali kwa ajili ya uhasibu na saini za walimu.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-xl">
              Jumla ya Malipo Yaliyorekodiwa: {paymentHistory.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[11px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Tarehe ya Malipo</th>
                  <th className="py-3 px-4">ID ya Mwalimu</th>
                  <th className="py-3 px-4">Jina la Mwalimu</th>
                  <th className="py-3 px-4">Mzunguko</th>
                  <th className="py-3 px-4 text-center">Vipindi</th>
                  <th className="py-3 px-4 text-right">Kiasi (TZS)</th>
                  <th className="py-3 px-4 text-center">Hali / Idhini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                      Hakuna historia ya malipo iliyorekodiwa bado. Bofya kitufe cha "Thibitisha na Hifadhi Malipo" kwenye ukurasa wa Hesabu za Sasa kuhifadhi malipo haya.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {item.payment_date ? format(new Date(item.payment_date), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-800">{item.teacher_id}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{item.teacher_name}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600 capitalize">{item.period_type}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">{item.total_periods}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        TZS {Number(item.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                          {item.status || 'Imelipwa'} ({item.approved_by || 'Admin'})
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">Mipangilio ya Viwango vya Posho (Remedial Rate Policy)</h3>
              <p className="text-xs text-slate-500 font-medium">Weka kiwango cha malipo kwa kila kipindi kimoja cha masomo ya ziada kilichofundishwa.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide block">
                Kiwango cha Malipo kwa Kipindi Kimoja (TZS)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">TZS</span>
                  <input
                    type="number"
                    value={defaultRate}
                    onChange={e => setDefaultRate(Number(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-blue-900 font-mono focus:ring-2 focus:ring-blue-500"
                    step={500}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveDefaultRate(defaultRate)}
                  disabled={savingSettings}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition disabled:opacity-50"
                >
                  {savingSettings ? 'Inahifadhi...' : 'Hifadhi Kiwango'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-1">
                Kiwango hiki kitatumika moja kwa moja kukokotoa posho ya kila mwalimu kwenye payroll yote ya shule.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Sera ya Malipo ya Shule (Institutional Payroll Policy)</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Mabadiliko haya yanahifadhiwa kwenye sera za shule na yatatumika kiotomatiki wakati wa kutoa ripoti za PDF na CSV kwa ajili ya ofisi ya uhasibu na ukaguzi.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
