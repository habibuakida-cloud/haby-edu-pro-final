import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Award, Wallet, Printer, Download, Filter, CheckCircle2, ChevronRight, FileSpreadsheet, Send, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { getRemedialAnalysis, getRemedialTimetable, getRemedialPaymentSettings } from '../../lib/remedialService';
import { DEFAULT_CLASSES } from '../../constants/defaults';
import { printFormattedSection, downloadFile, escapeCSV } from '../../utils/export';

interface RemedialPaymentAnalyzerProps {
  schoolId: string;
  schoolInfo: any;
}

export const RemedialPaymentAnalyzer: React.FC<RemedialPaymentAnalyzerProps> = ({ schoolId, schoolInfo }) => {
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customRange, setCustomRange] = useState({ 
    from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  });
  const [selectedClass, setSelectedClass] = useState('All');

  const [reportData, setReportData] = useState<any[]>([]);
  const [expectedCounts, setExpectedCounts] = useState<Record<string, number>>({});
  const [paymentSettings, setPaymentSettings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [schoolId]);

  const fetchInitialData = async () => {
    try {
      const { data: settings } = await getRemedialPaymentSettings(schoolId);
      const sMap: Record<string, number> = {};
      (settings || []).forEach(s => {
        sMap[s.class_name || 'Default'] = s.rate_per_period || 5000;
      });
      setPaymentSettings(sMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      let startDate = customRange.from;
      let endDate = customRange.to;

      if (reportType === 'weekly') {
        const d = new Date(selectedWeek);
        startDate = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else if (reportType === 'monthly') {
        const d = new Date(selectedMonth + '-01');
        startDate = format(startOfMonth(d), 'yyyy-MM-dd');
        endDate = format(endOfMonth(d), 'yyyy-MM-dd');
      }

      // 1. Calculate expected periods from timetable for each day in interval
      const { data: timetable } = await getRemedialTimetable(schoolId);
      const daysInInterval = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const expMap: Record<string, number> = {};
      daysInInterval.forEach(date => {
        const dayName = dayNames[date.getDay()];
        (timetable || []).forEach(item => {
          if (item.day_of_week === dayName) {
            if (selectedClass === 'All' || item.class_name === selectedClass) {
              const key = `${item.teacher_name}_${item.subject}_${item.class_name}`;
              expMap[key] = (expMap[key] || 0) + 1;
            }
          }
        });
      });
      setExpectedCounts(expMap);

      // 2. Fetch actual attendance
      const { data: attendance } = await getRemedialAnalysis(schoolId, startDate, endDate, selectedClass);
      
      const teacherMap = new Map<string, any>();
      (attendance || []).forEach(record => {
        const key = `${record.teacher_name}_${record.subject}_${record.class_name}`;
        if (!teacherMap.has(key)) {
          teacherMap.set(key, {
            teacherName: record.teacher_name,
            subject: record.subject,
            className: record.class_name,
            stream: record.stream || 'A',
            taughtCount: 0,
            rate: paymentSettings[record.class_name] || paymentSettings['Default'] || 5000,
            remarks: 'Good Coverage'
          });
        }
        teacherMap.get(key).taughtCount += 1;
      });

      // Ensure all expected also show up even if 0 taught
      Object.keys(expMap).forEach(key => {
        if (!teacherMap.has(key)) {
          const [teacher, subject, className] = key.split('_');
          teacherMap.set(key, {
            teacherName: teacher,
            subject: subject,
            className: className,
            stream: 'A',
            taughtCount: 0,
            rate: paymentSettings[className] || paymentSettings['Default'] || 5000,
            remarks: 'No attendance marked'
          });
        }
      });

      const rows = Array.from(teacherMap.values()).map((row, idx) => {
        const key = `${row.teacherName}_${row.subject}_${row.className}`;
        return {
          sno: idx + 1,
          ...row,
          expected: expMap[key] || 0,
          totalAmount: row.taughtCount * row.rate
        };
      });

      setReportData(rows);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert('Tafadhali bonyeza "Generate Report" kwanza ili kupata data.');
      return;
    }
    const headers = ['S/N', 'Teacher Name', 'Subject', 'Class', 'Expected periods', 'Taught periods', 'Rate (TZS)', 'Total Amount (TZS)', 'Remarks'];
    const rows = reportData.map(r => [
      escapeCSV(r.sno),
      escapeCSV(r.teacherName),
      escapeCSV(r.subject),
      escapeCSV(`${r.className} ${r.stream}`),
      escapeCSV(r.expected),
      escapeCSV(r.taughtCount),
      escapeCSV(r.rate),
      escapeCSV(r.totalAmount),
      escapeCSV(r.remarks)
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(`Remedial_Payment_Report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`, csvContent);
  };

  const totalPeriods = reportData.reduce((sum, r) => sum + r.taughtCount, 0);
  const totalAmount = reportData.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalTeachers = new Set(reportData.map(r => r.teacherName)).size;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1e293b] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-emerald-500/30 w-fit mb-3">
              REMEDIAL PAYMENT ANALYZER • V2.0
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Remedial Payment Analysis</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">Uchambuzi wa malipo ya vipindi vya ziada kwa walimu wa {schoolInfo?.name || 'HABY EDU PRO'}.</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (reportData.length === 0) {
                  alert('Tafadhali bonyeza "Generate Report" kwanza kabla ya kuchapa au kutoa PDF.');
                  return;
                }
                printFormattedSection('remedial-printable-area', 'Remedial Payment Analysis Report', schoolInfo?.name || 'HabyEduPro3A');
              }} 
              className="px-5 py-3 bg-white text-slate-900 font-black rounded-2xl shadow-lg hover:bg-slate-50 transition flex items-center gap-2 text-xs uppercase cursor-pointer"
            >
              <Printer size={16} /> Chapisha / PDF
            </button>
            <button 
              onClick={handleExportCSV} 
              className="px-5 py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-500 transition flex items-center gap-2 text-xs uppercase cursor-pointer"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" /> Ripoti Filter (Vichujio)
          </h3>
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['weekly', 'monthly', 'custom'] as const).map(type => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition ${reportType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {reportType === 'weekly' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Chagua Wiki</label>
              <input type="date" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
            </div>
          )}
          {reportType === 'monthly' && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Chagua Mwezi</label>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
            </div>
          )}
          {reportType === 'custom' && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Kuanzia (From)</label>
                <input type="date" value={customRange.from} onChange={e => setCustomRange({...customRange, from: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Mpaka (To)</label>
                <input type="date" value={customRange.to} onChange={e => setCustomRange({...customRange, to: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Kidato (Class)</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs">
              <option value="All">Madarasa Yote</option>
              {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 uppercase"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Walimu Kulipwa</p>
            <p className="text-2xl font-black text-slate-900">{totalTeachers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Vipindi Vilivyofundishwa</p>
            <p className="text-2xl font-black text-slate-900">{totalPeriods}</p>
          </div>
        </div>
        <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-200 flex items-center gap-4 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-100 uppercase">Jumla ya Malipo</p>
            <p className="text-2xl font-black">{totalAmount.toLocaleString()} TZS</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" id="remedial-printable-area">
        <div className="p-8 border-b border-slate-100 text-center print:block hidden">
           <h1 className="text-2xl font-black uppercase text-slate-900">{schoolInfo?.name || 'HabyEduPro3A'}</h1>
           <p className="text-sm font-bold text-slate-600 mt-1 uppercase">REMEDIAL TEACHING PAYMENT ANALYSIS REPORT</p>
           <p className="text-xs text-slate-500 font-mono mt-2 italic">Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700 w-12 text-center">S/N</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700">Teacher Name</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700">Subject</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700 text-center">Class</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700 text-center">Expected</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700 text-center">Taught</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider border-r border-slate-700 text-right">Rate</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-right">Total (TZS)</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-center print:table-cell hidden">Signature</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center text-slate-400 font-bold italic">Bofya kitufe cha 'Generate Report' kupata uchambuzi wa malipo.</td>
                </tr>
              ) : reportData.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-6 py-4 text-center font-bold text-slate-500">{row.sno}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{row.teacherName}</td>
                  <td className="px-6 py-4 font-bold text-indigo-700 uppercase tracking-tighter">{row.subject}</td>
                  <td className="px-6 py-4 text-center"><span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black text-[10px] uppercase">{row.className}</span></td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-slate-400">{row.expected}</td>
                  <td className="px-6 py-4 text-center font-mono font-black text-emerald-600 bg-emerald-50/30">{row.taughtCount}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">{row.rate.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono font-black text-slate-900 bg-slate-100/50">{row.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center border-l border-slate-100 print:table-cell hidden">_________________</td>
                  <td className="px-6 py-4 text-center no-print">
                     <button className="text-[10px] font-black uppercase bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all">Mark Paid</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {reportData.length > 0 && (
              <tfoot className="bg-emerald-600 text-white font-black">
                <tr>
                  <td colSpan={5} className="px-6 py-5 text-right uppercase tracking-widest">Grand Total (Jumla Kuu):</td>
                  <td className="px-6 py-5 text-center font-mono text-lg border-x border-white/20">{totalPeriods}</td>
                  <td className="px-6 py-5 text-right">---</td>
                  <td className="px-6 py-5 text-right font-mono text-lg bg-emerald-700">{totalAmount.toLocaleString()} TZS</td>
                  <td className="px-6 py-5 no-print" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer print only */}
        <div className="p-12 grid grid-cols-2 gap-12 print:grid hidden mt-8">
           <div className="text-center space-y-16">
              <p className="font-black text-xs uppercase">Bursar / Accountant</p>
              <div className="border-t-2 border-slate-900 pt-2 mx-auto w-48">
                 <p className="text-[10px] font-bold">Signature & Date</p>
              </div>
           </div>
           <div className="text-center space-y-16">
              <p className="font-black text-xs uppercase">Headmaster / Principal</p>
              <div className="border-t-2 border-slate-900 pt-2 mx-auto w-48 relative">
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-10">
                    {/* Placeholder for stamp */}
                    <div className="w-20 h-20 border-4 border-slate-900 rounded-full flex items-center justify-center font-black text-[8px]">OFFICIAL STAMP</div>
                 </div>
                 <p className="text-[10px] font-bold">Official Stamp & Signature</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
