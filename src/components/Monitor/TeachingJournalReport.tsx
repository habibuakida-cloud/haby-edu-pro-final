import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, Download, Plus, Clock, BookOpen, User, Calendar, Trash2, Edit, CheckCircle2, AlertCircle, X, ChevronRight, ChevronLeft, Filter, MoreHorizontal, Printer } from 'lucide-react';
import { Teacher, UserAccount, TimetableAssignment, PeriodSetting } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, addDays, format, parseISO, isSameDay } from 'date-fns';

interface TeachingJournalReportProps {
  schoolId: string;
  teachers: Teacher[];
  currentUser: UserAccount | null;
  timetableAssignments: TimetableAssignment[];
  periodSettings: PeriodSetting[];
}

const DAY_NAMES_SW = {
  'Monday': 'Jumatatu',
  'Tuesday': 'Jumanne',
  'Wednesday': 'Jumatano',
  'Thursday': 'Alhamisi',
  'Friday': 'Ijumaa',
  'Saturday': 'Jumamosi',
  'Sunday': 'Jumapili'
};

export const TeachingJournalReport: React.FC<TeachingJournalReportProps> = ({
  schoolId,
  teachers,
  currentUser,
  timetableAssignments = [],
  periodSettings = []
}) => {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Manual Entry Form State
  const [formData, setManualFormData] = useState({
    teacherId: '',
    className: '',
    stream: 'A',
    subject: '',
    mainTopic: '',
    subTopic: '',
    timeIn: '',
    timeOut: '',
    presentCount: 0,
    absentCount: 0,
    sickCount: 0,
    permittedCount: 0,
    periodName: ''
  });

  useEffect(() => {
    fetchJournals();
  }, [filterDate, schoolId]);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      // Fetch all journals and filter locally for the selected date
      const res = await fetch(`/api/db/query?table=class_journals&schoolId=${schoolId}`);
      const data = await res.json();
      const allJournals = Array.isArray(data) ? data : [];
      
      // Filter strictly for the selected date
      const filtered = allJournals.filter(j => {
        const jDate = format(new Date(j.time_in), 'yyyy-MM-dd');
        return jDate === filterDate;
      });
      
      setJournals(filtered);
    } catch (err) {
      console.error('Error fetching journals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => String(t.id) === formData.teacherId);
    
    const payload = {
      ...formData,
      teacher_name: teacher?.name || 'Manual Entry',
      timeIn: `${filterDate}T${formData.timeIn}:00`,
      timeOut: formData.timeOut ? `${filterDate}T${formData.timeOut}:00` : null,
      method: 'manual_entry',
      schoolId,
      monitorId: currentUser?.id || 'Admin',
      date: filterDate
    };

    try {
      const res = await fetch('/api/db/insert?table=class_journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, payload })
      });
      
      if (res.ok) {
        setShowManualEntry(false);
        setManualFormData({ 
          teacherId: '', 
          className: '', 
          stream: 'A',
          subject: '', 
          mainTopic: '', 
          subTopic: '',
          timeIn: '', 
          timeOut: '',
          presentCount: 0,
          absentCount: 0,
          sickCount: 0,
          permittedCount: 0,
          periodName: ''
        });
      }
    } catch (err) {
      console.error('Error adding manual entry:', err);
    }
  };

  const selectedDateObj = parseISO(filterDate);
  const dayNameEn = format(selectedDateObj, 'EEEE');
  const dayNameSw = DAY_NAMES_SW[dayNameEn as keyof typeof DAY_NAMES_SW] || dayNameEn;

  const mergedJournalData = useMemo(() => {
    // 1. Get all scheduled assignments for this day
    const dayAssignments = timetableAssignments.filter(a => a.day === dayNameEn);
    
    // 2. Prepare result list
    const result: any[] = [];
    const usedJournalIds = new Set<string>();

    // 3. Match assignments to signed journals
    dayAssignments.forEach(assignment => {
      const matchedJournal = journals.find(j => 
        j.className === assignment.className &&
        j.stream === assignment.stream &&
        j.subject === assignment.subject &&
        (j.periodName === assignment.periodName || j.periodName === assignment.period || assignment.period?.includes(j.periodName))
      );

      if (matchedJournal) {
        usedJournalIds.add(matchedJournal.id);
        result.push({
          ...matchedJournal,
          status: 'TAUGHT',
          scheduledTeacherName: assignment.teacherName,
          type: 'SCHEDULED'
        });
      } else {
        result.push({
          className: assignment.className,
          stream: assignment.stream,
          subject: assignment.subject,
          teacher_name: assignment.teacherName,
          periodName: assignment.periodName || assignment.period,
          status: 'NOT_TAUGHT',
          type: 'SCHEDULED'
        });
      }
    });

    // 4. Add any journals that were NOT in the timetable (extra periods/manual entries)
    journals.forEach(j => {
      if (!usedJournalIds.has(j.id)) {
        result.push({
          ...j,
          status: 'TAUGHT',
          type: 'UNSCHEDULED'
        });
      }
    });

    // 5. Sort by period name if possible
    return result.sort((a, b) => {
      const getNum = (s: string) => {
        const match = s?.match(/(\d+)/);
        return match ? parseInt(match[1]) : 999;
      };
      const pA = getNum(a.periodName || '');
      const pB = getNum(b.periodName || '');
      if (pA !== pB) return pA - pB;
      return (a.className || '').localeCompare(b.className || '');
    });
  }, [journals, timetableAssignments, dayNameEn]);

  const filteredJournals = useMemo(() => {
    return mergedJournalData.filter(j => 
      j.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mergedJournalData, searchTerm]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = addDays(parseISO(filterDate), direction === 'next' ? 1 : -1);
    setFilterDate(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Ripoti ya Siku</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Teaching Journal</h2>
            <p className="text-sm text-slate-500 font-bold mt-1 max-w-lg">
              Muhtasari wa ufundishaji wa tarehe: <span className="text-blue-600">{format(selectedDateObj, 'dd/MM/yyyy')}</span> ({dayNameSw})
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowManualEntry(true)}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" /> WEKA MWALIMU
            </button>
            <button 
              onClick={() => window.print()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Printer className="w-4 h-4" /> CHAPISHA
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">Ratiba</span>
          </div>
          <h4 className="text-2xl font-black text-slate-900">{mergedJournalData.filter(j => j.type === 'SCHEDULED').length}</h4>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Vipindi Vilivyopangwa</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Imesainiwa</span>
          </div>
          <h4 className="text-2xl font-black text-slate-900">{mergedJournalData.filter(j => j.status === 'TAUGHT').length}</h4>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Vipindi Vilivyofundishwa</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">Mapengo</span>
          </div>
          <h4 className="text-2xl font-black text-slate-900">{mergedJournalData.filter(j => j.status === 'NOT_TAUGHT').length}</h4>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bado Hazijasainiwa</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <User className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Walimu</span>
          </div>
          <h4 className="text-2xl font-black text-slate-900">{new Set(journals.map(j => j.teacherId)).size}</h4>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Waliofundisha</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input 
            type="text"
            placeholder="Tafuta darasa, somo au mwalimu..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => navigateDate('prev')}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all active:scale-95 text-xs font-black"
          >
            <ChevronLeft className="w-4 h-4" /> SIKU ILIYOPITA
          </button>
          
          <div className="relative flex-1 md:w-48">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input 
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer"
            />
          </div>

          <button 
            onClick={() => navigateDate('next')}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-all active:scale-95 text-xs font-black"
          >
            SIKU IFUATAYO <ChevronRight className="w-4 h-4" />
          </button>

          <button onClick={() => fetchJournals()} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all active:scale-95 ml-2">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${journals.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {selectedDateObj.getDate()}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{dayNameSw}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(selectedDateObj, 'dd MMMM yyyy')}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-4 py-1.5 rounded-xl text-xs font-black ${journals.length > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
              {journals.length} Vipindi Leo
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Darasa</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Somo & Topic</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Mahudhurio</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Mwalimu</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Muda</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Njia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Inapakia Data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                      <FileText className="w-12 h-12 text-slate-300" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hakuna rekodi kwa siku hii</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJournals.map((j, i) => {
                  const isTaught = j.status === 'TAUGHT';
                  const timeIn = j.time_in ? new Date(j.time_in) : null;
                  const timeOut = j.time_out ? new Date(j.time_out) : null;
                  const duration = (timeIn && timeOut) ? Math.round((timeOut.getTime() - timeIn.getTime()) / 60000) : null;
                  
                  return (
                    <tr key={j.id || i} className={`transition-all group ${!isTaught ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs font-black border ${
                            isTaught ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-rose-100 text-rose-700 border-rose-200'
                          }`}>
                            {j.className} {j.stream}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                              {j.periodName}
                            </span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                              j.type === 'SCHEDULED' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {j.type}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <p className={`font-black text-sm ${isTaught ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                          {j.subject}
                          {!isTaught && <span className="ml-2 text-[10px] text-rose-500 uppercase">(Bado haijasainiwa)</span>}
                        </p>
                        {isTaught && (
                          <div className="mt-1 space-y-0.5">
                            {j.mainTopic && (
                              <p className="text-[11px] text-blue-600 font-bold italic line-clamp-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3 shrink-0" /> {j.mainTopic}
                              </p>
                            )}
                            {j.subTopic && (
                              <p className="text-[10px] text-slate-500 font-medium italic line-clamp-1 pl-4">
                                — {j.subTopic}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-6">
                        {isTaught ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-100">P: {j.presentCount || 0}</span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-black border border-rose-100">A: {j.absentCount || 0}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-black border border-amber-100">S: {j.sickCount || 0}</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-black border border-blue-100">R: {j.permittedCount || 0}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black uppercase border ${
                            isTaught ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-rose-50 text-rose-300 border-rose-100 opacity-50'
                          }`}>
                            {j.teacher_name?.[0]}
                          </div>
                          <div>
                            <p className={`font-black text-sm ${isTaught ? 'text-slate-800' : 'text-slate-400'}`}>
                              {j.teacher_name}
                            </p>
                            {isTaught && (
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                {j.method === 'manual_entry' ? 'Manual' : `Monitor: ${j.monitorId || 'Unknown'}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        {isTaught && timeIn ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px] font-black text-slate-600">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                              {timeIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {timeOut ? (
                              <div className="flex items-center gap-2 text-[11px] font-black text-slate-400">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                {timeOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 animate-pulse">
                                Inaendelea...
                              </span>
                            )}
                            {duration !== null && (
                              <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                {duration} Min
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-bold uppercase">Hazijasainiwa</span>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${
                          !isTaught
                            ? 'bg-rose-50 text-rose-400 border-rose-100'
                            : j.method === 'usb_scanner' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : j.method === 'manual_entry'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {!isTaught ? 'MISSING' : j.method === 'usb_scanner' ? 'Scanner' : j.method === 'manual_entry' ? 'Manual' : 'Phone/PIN'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {showManualEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Weka Kumbukumbu (Manual)</h3>
                  <p className="text-xs text-slate-500 font-bold">Tumia hii ikiwa mwalimu alisahau kugonga kidole</p>
                </div>
                <button onClick={() => setShowManualEntry(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mwalimu:</label>
                    <select 
                      required
                      value={formData.teacherId}
                      onChange={e => setManualFormData({...formData, teacherId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Chagua Mwalimu</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Darasa & Stream:</label>
                    <div className="flex gap-2">
                      <input 
                        required
                        placeholder="Form 1"
                        value={formData.className}
                        onChange={e => setManualFormData({...formData, className: e.target.value})}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input 
                        required
                        placeholder="A"
                        value={formData.stream}
                        onChange={e => setManualFormData({...formData, stream: e.target.value})}
                        className="w-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Somo:</label>
                    <input 
                      required
                      placeholder="Mathematics"
                      value={formData.subject}
                      onChange={e => setManualFormData({...formData, subject: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kipindi (Period):</label>
                    <input 
                      placeholder="Period 1"
                      value={formData.periodName}
                      onChange={e => setManualFormData({...formData, periodName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mada Kuu (Main Topic):</label>
                    <input 
                      placeholder="Main Topic..."
                      value={formData.mainTopic}
                      onChange={e => setManualFormData({...formData, mainTopic: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mada Ndogo (Sub Topic):</label>
                    <input 
                      placeholder="Sub Topic..."
                      value={formData.subTopic}
                      onChange={e => setManualFormData({...formData, subTopic: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">Present</label>
                    <input type="number" value={formData.presentCount} onChange={e => setManualFormData({...formData, presentCount: parseInt(e.target.value) || 0})} className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">Absent</label>
                    <input type="number" value={formData.absentCount} onChange={e => setManualFormData({...formData, absentCount: parseInt(e.target.value) || 0})} className="w-full p-2 bg-rose-50 border border-rose-100 rounded-xl text-center text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">Sick</label>
                    <input type="number" value={formData.sickCount} onChange={e => setManualFormData({...formData, sickCount: parseInt(e.target.value) || 0})} className="w-full p-2 bg-amber-50 border border-amber-100 rounded-xl text-center text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">Permitted</label>
                    <input type="number" value={formData.permittedCount} onChange={e => setManualFormData({...formData, permittedCount: parseInt(e.target.value) || 0})} className="w-full p-2 bg-blue-50 border border-blue-100 rounded-xl text-center text-xs font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Saa ya Kuanza:</label>
                    <input 
                      type="time" 
                      required
                      value={formData.timeIn}
                      onChange={e => setManualFormData({...formData, timeIn: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Saa ya Kumaliza:</label>
                    <input 
                      type="time"
                      value={formData.timeOut}
                      onChange={e => setManualFormData({...formData, timeOut: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                  >
                    HIFADHI REKODI
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
