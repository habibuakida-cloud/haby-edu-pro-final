import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileStack, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  GraduationCap, 
  Calendar, 
  FileSpreadsheet,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { ReamPaperRecord, Student, UserAccount, SchoolInfo, StreamSetting } from '../../types';
import { 
  fetchReamPaperRecords, 
  saveReamPaperRecord, 
  deleteReamPaperRecord 
} from '../../lib/reamPaperService';

interface ReamPaperModuleProps {
  currentUser?: UserAccount | null;
  schoolInfo?: SchoolInfo;
  students?: Student[];
  streamSettings?: StreamSetting[];
}

export const ReamPaperModule: React.FC<ReamPaperModuleProps> = ({
  currentUser,
  schoolInfo,
  students = [],
  streamSettings = []
}) => {
  const [records, setRecords] = useState<ReamPaperRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<string>('Muhula 1');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<ReamPaperRecord | null>(null);

  // Form states
  const [formStudentId, setFormStudentId] = useState<string>('');
  const [formStudentName, setFormStudentName] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('Darasa la 1');
  const [formStream, setFormStream] = useState<string>('Stream A');
  const [formReams, setFormReams] = useState<number>(1);
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTerm, setFormTerm] = useState<string>('Muhula 1');
  const [formYear, setFormYear] = useState<string>('2026');
  const [formNotes, setFormNotes] = useState<string>('A4, 500 sheets');

  // Bulk Entry Mode
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkClass, setBulkClass] = useState<string>('Darasa la 1');
  const [bulkStream, setBulkStream] = useState<string>('Stream A');
  const [bulkReamsMap, setBulkReamsMap] = useState<Record<string, number>>({});

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const schoolId = currentUser?.schoolId || (schoolInfo as any)?.id || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';

  const role = currentUser?.role?.toUpperCase() || 'TEACHER';
  const isSuperAdmin = currentUser?.isSuperAdmin || role === 'SUPER_ADMIN';
  const isHeadmaster = role === 'HEADMASTER' || role === 'ACADEMIC';
  const canManage = isSuperAdmin || isHeadmaster || role === 'TEACHER';

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const data = await fetchReamPaperRecords(schoolId);
      setRecords(data);
    } catch (e) {
      console.warn("Failed to load ream paper records:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  // Available classes & streams
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    streamSettings.forEach(s => { if (s.className) set.add(s.className); });
    students.forEach(s => { if (s.className) set.add(s.className); });
    if (set.size === 0) {
      ['Darasa la 1', 'Darasa la 2', 'Darasa la 3', 'Darasa la 4', 'Darasa la 5', 'Darasa la 6', 'Darasa la 7'].forEach(c => set.add(c));
    }
    return Array.from(set);
  }, [streamSettings, students]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    streamSettings.forEach(s => {
      if (s.className === (isBulkMode ? bulkClass : formClass) && s.streams) {
        s.streams.forEach(st => set.add(st));
      }
    });
    students.forEach(s => {
      if (s.className === (isBulkMode ? bulkClass : formClass) && s.stream) set.add(s.stream);
    });
    if (set.size === 0) {
      ['Stream A', 'Stream B'].forEach(st => set.add(st));
    }
    return Array.from(set);
  }, [streamSettings, students, bulkClass, formClass, isBulkMode]);

  // Students in bulk class & stream
  const studentsForBulk = useMemo(() => {
    return students.filter(s => {
      const matchesClass = s.className === bulkClass;
      const matchesStream = !s.stream || s.stream === bulkStream;
      return matchesClass && matchesStream;
    });
  }, [students, bulkClass, bulkStream]);

  // Map student_id -> reams brought for current term & year
  const studentReamsMap = useMemo(() => {
    const map = new Map<string, number>();
    records.filter(r => r.term === selectedTerm && r.academic_year === selectedYear).forEach(r => {
      if (r.student_id) {
        map.set(r.student_id, (map.get(r.student_id) || 0) + Number(r.reams_brought || 0));
      }
    });
    return map;
  }, [records, selectedTerm, selectedYear]);

  // Students who haven't brought reams
  const studentsWhoHaventBrought = useMemo(() => {
    return students.filter(s => {
      const brought = studentReamsMap.get(String(s.id)) || 0;
      return brought === 0;
    });
  }, [students, studentReamsMap]);

  // Stats calculations
  const stats = useMemo(() => {
    const filteredByTerm = records.filter(r => r.term === selectedTerm && r.academic_year === selectedYear);
    const totalReamsSchool = filteredByTerm.reduce((acc, curr) => acc + Number(curr.reams_brought || 0), 0);

    const perClass: Record<string, number> = {};
    const perStream: Record<string, number> = {};

    filteredByTerm.forEach(r => {
      const cls = r.class || 'Haijulikani';
      const stm = r.stream || 'A';
      perClass[cls] = (perClass[cls] || 0) + Number(r.reams_brought || 0);
      const key = `${cls} (${stm})`;
      perStream[key] = (perStream[key] || 0) + Number(r.reams_brought || 0);
    });

    return {
      totalReamsSchool,
      perClass,
      perStream,
      totalStudentsCount: students.length,
      studentsBroughtCount: studentReamsMap.size,
      studentsMissingCount: students.length - studentReamsMap.size
    };
  }, [records, selectedTerm, selectedYear, students, studentReamsMap]);

  // Filtered records table
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = !searchQuery || r.student_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'ALL' || r.class === selectedClass;
      const matchesStream = selectedStream === 'ALL' || r.stream === selectedStream;
      const matchesTerm = !selectedTerm || r.term === selectedTerm;
      const matchesYear = !selectedYear || r.academic_year === selectedYear;
      return matchesSearch && matchesClass && matchesStream && matchesTerm && matchesYear;
    });
  }, [records, searchQuery, selectedClass, selectedStream, selectedTerm, selectedYear]);

  const handleOpenModal = (record?: ReamPaperRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormStudentId(record.student_id || '');
      setFormStudentName(record.student_name);
      setFormClass(record.class);
      setFormStream(record.stream || 'Stream A');
      setFormReams(record.reams_brought);
      setFormDate(record.date_brought);
      setFormTerm(record.term);
      setFormYear(record.academic_year);
      setFormNotes(record.notes || '');
    } else {
      setEditingRecord(null);
      setFormStudentId('');
      setFormStudentName('');
      setFormClass(availableClasses[0] || 'Darasa la 1');
      setFormStream('Stream A');
      setFormReams(1);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormTerm(selectedTerm);
      setFormYear(selectedYear);
      setFormNotes('A4, 500 sheets');
    }
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentName.trim()) {
      showToast("Tafadhali ingiza jina la mwanafunzi", "error");
      return;
    }

    const payload: Partial<ReamPaperRecord> = {
      id: editingRecord ? editingRecord.id : undefined,
      student_id: formStudentId,
      student_name: formStudentName.trim(),
      class: formClass,
      stream: formStream,
      reams_brought: Number(formReams),
      date_brought: formDate,
      term: formTerm,
      academic_year: formYear,
      received_by: currentUser?.fullName || 'Mwalimu',
      school_id: schoolId
    };

    const { error } = await saveReamPaperRecord(schoolId, payload);
    if (error) {
      showToast("Imeshindikana kuhifadhi kumbukumbu", "error");
    } else {
      showToast("Ream paper imerekodiwa mafanikio!");
      setIsModalOpen(false);
      loadData(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("Futa kumbukumbu hii?")) return;
    await deleteReamPaperRecord(schoolId, id);
    showToast("Imefutwa", "success");
    loadData(false);
  };

  const handleSaveBulk = async () => {
    try {
      for (const student of studentsForBulk) {
        const reams = bulkReamsMap[student.id] !== undefined ? bulkReamsMap[student.id] : 0;
        if (reams > 0) {
          await saveReamPaperRecord(schoolId, {
            student_id: student.id,
            student_name: student.name || student.fullName || 'Mwanafunzi',
            class: bulkClass,
            stream: bulkStream || 'Stream A',
            reams_brought: reams,
            date_brought: new Date().toISOString().split('T')[0],
            term: selectedTerm,
            academic_year: selectedYear,
            received_by: currentUser?.fullName || 'Mwalimu',
            notes: 'Bulk class entry'
          });
        }
      }
      showToast("Orodha ya darasa imehifadhiwa kwa pamoja (Bulk Entry)!");
      setIsBulkMode(false);
      loadData(false);
    } catch (e) {
      showToast("Hitilafu kwenye bulk entry", "error");
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ripoti ya Ream Paper - ${selectedClass} (${selectedTerm})</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h2 { text-align: center; color: #1f4d8b; margin-bottom: 5px; }
          p.subtitle { text-align: center; font-size: 14px; color: #555; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
          th { background-color: #1f4d8b; color: white; }
          .total-box { margin-top: 20px; text-align: right; font-size: 15px; font-weight: bold; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
        </style>
      </head>
      <body>
        <h2>${schoolInfo?.name || 'HABY EDU PRO SCHOOL'}</h2>
        <p class="subtitle">RIPOTI YA REAM PAPERS - ${selectedTerm.toUpperCase()} (${selectedYear})</p>
        <p>Darasa: <b>${selectedClass}</b> | Mkondo: <b>${selectedStream}</b> | Tarehe: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Na.</th>
              <th>Jina la Mwanafunzi</th>
              <th>Darasa & Mkondo</th>
              <th>Idadi ya Reams</th>
              <th>Tarehe Iliyoletwa</th>
              <th>Muhula</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((r, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><b>${r.student_name}</b></td>
                <td>${r.class} - ${r.stream || 'A'}</td>
                <td><b>${r.reams_brought}</b></td>
                <td>${r.date_brought}</td>
                <td>${r.term}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          Jumla ya Reams: ${filteredRecords.reduce((acc, curr) => acc + Number(curr.reams_brought || 0), 0)} Reams
        </div>
        <div class="footer">
          <div>Mwalimu wa Taaluma: ${currentUser?.fullName || 'Mwalimu'}</div>
          <div>Sahihi: _______________________</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium animate-bounce ${
          toastMessage.type === 'error' ? 'bg-rose-600' : toastMessage.type === 'info' ? 'bg-sky-600' : 'bg-emerald-600'
        }`}>
          {toastMessage.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-sky-900 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2.5 bg-blue-950/55 px-3.5 py-1.5 rounded-full w-fit text-xs font-bold uppercase tracking-wider mb-3 border border-blue-400/30">
            <FileStack className="w-4 h-4 text-sky-300" />
            <span>Academic Ream Paper Records</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Kumbukumbu za Ream Papers za Shule</h1>
          <p className="text-blue-100 text-sm mt-1 max-w-2xl opacity-90">
            Simamia na rekodi ream papers zinazoletwa na wanafunzi kwa ajili ya mitihani na shughuli za kitaaluma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => loadData(true)} 
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold flex items-center gap-2 transition cursor-pointer border border-white/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sasisha</span>
          </button>
          <button 
            onClick={() => setIsBulkMode(!isBulkMode)}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isBulkMode ? 'Funga Bulk Entry' : 'Ingiza Darasa Zima (Bulk Sheet)'}</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Rekodi Moja kwa Moja</span>
          </button>
        </div>
      </div>

      {/* Term & Year Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-700" />
          <span className="font-bold text-sm text-slate-800">Chagua Muhula na Mwaka:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Muhula 1">Muhula 1</option>
            <option value="Muhula 2">Muhula 2</option>
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button
            onClick={handlePrintReport}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Chapisha Ripoti</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jumla ya Reams (Shule Nzima)</p>
            <h3 className="text-3xl font-black text-blue-900 mt-1">{stats.totalReamsSchool}</h3>
            <p className="text-xs text-blue-600 font-medium mt-1">Katika {selectedTerm} {selectedYear}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center font-bold">
            <FileStack className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Wanafunzi Walioleta</p>
            <h3 className="text-3xl font-black text-emerald-700 mt-1">{stats.studentsBroughtCount}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1"> Kati ya {stats.totalStudentsCount} wanafunzi</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Wanafunzi Hawajaleta</p>
            <h3 className="text-3xl font-black text-rose-600 mt-1">{stats.studentsMissingCount}</h3>
            <p className="text-xs text-rose-500 font-medium mt-1">Wanahitaji kukumbushwa</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Madarasa Yaliyoshiriki</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{Object.keys(stats.perClass).length}</h3>
            <p className="text-xs text-indigo-600 font-medium mt-1">Madarasa yote yaliyoandikishwa</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BULK ENTRY MODE (Excel-like sheet) */}
      {isBulkMode && (
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-6 mb-8 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-blue-900">Ingiza Ream Papers kwa Darasa Zima (Bulk Entry)</h3>
              <p className="text-xs text-slate-500">Chagua darasa na mkondo, kisha weka idadi ya reams kwa kila mwanafunzi.</p>
            </div>
            <button onClick={() => setIsBulkMode(false)} className="p-1 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Darasa</label>
              <select
                value={bulkClass}
                onChange={e => setBulkClass(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              >
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Mkondo</label>
              <select
                value={bulkStream}
                onChange={e => setBulkStream(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              >
                {availableStreams.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase sticky top-0">
                  <th className="p-3">Na.</th>
                  <th className="p-3">Jina la Mwanafunzi</th>
                  <th className="p-3">Darasa / Mkondo</th>
                  <th className="p-3 text-center">Reams Alizoleta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {studentsForBulk.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">Hakuna wanafunzi waliopatikana kwenye darasa hili.</td>
                  </tr>
                ) : (
                  studentsForBulk.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{s.name || s.fullName}</td>
                      <td className="p-3 text-slate-600">{s.className} - {s.stream || 'A'}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          value={bulkReamsMap[s.id] !== undefined ? bulkReamsMap[s.id] : (studentReamsMap.get(String(s.id)) || 0)}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setBulkReamsMap(prev => ({ ...prev, [s.id]: val }));
                          }}
                          className="w-24 text-center px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsBulkMode(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold"
            >
              Ghairi
            </button>
            <button
              onClick={handleSaveBulk}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-lg"
            >
              Hifadhi Orodha Hii Yote
            </button>
          </div>
        </div>
      )}

      {/* Main Records Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tafuta mwanafunzi kwa jina..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Madarasa Yote</option>
              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={selectedStream}
              onChange={e => setSelectedStream(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Mikondo Yote</option>
              <option value="Stream A">Stream A</option>
              <option value="Stream B">Stream B</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <th className="p-4">Mwanafunzi</th>
                <th className="p-4">Darasa / Mkondo</th>
                <th className="p-4 text-center">Reams Zilizolewa</th>
                <th className="p-4">Hali</th>
                <th className="p-4">Muhula & Mwaka</th>
                <th className="p-4">Tarehe</th>
                <th className="p-4">Maelezo</th>
                {canManage && <th className="p-4 text-right">Vitendo</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">Hakuna kumbukumbu za ream papers zilizopatikana.</td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <Users className="w-4 h-4" />
                      </div>
                      <span>{rec.student_name}</span>
                    </td>
                    <td className="p-4 text-slate-700">
                      <span className="font-semibold">{rec.class}</span> <span className="text-xs text-slate-500">({rec.stream || 'A'})</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-900 font-black rounded-full text-xs">
                        {rec.reams_brought} Reams
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        Number(rec.reams_brought) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {Number(rec.reams_brought) > 0 ? 'Imeleta' : 'Hajaleta'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{rec.term} ({rec.academic_year})</td>
                    <td className="p-4 text-slate-500">{rec.date_brought}</td>
                    <td className="p-4 text-slate-500 text-xs">{rec.notes || '-'}</td>
                    {canManage && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(rec)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Hariri"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Futa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD/EDIT SINGLE RECORD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-900 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingRecord ? 'Hariri Kumbukumbu ya Ream' : 'Rekodi Ream Paper Mpya'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-blue-800 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Darasa</label>
                  <select
                    value={formClass}
                    onChange={e => setFormClass(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Mkondo</label>
                  <select
                    value={formStream}
                    onChange={e => setFormStream(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableStreams.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Mwanafunzi</label>
                <select
                  value={formStudentId}
                  onChange={e => {
                    const sid = e.target.value;
                    setFormStudentId(sid);
                    const found = students.find(s => String(s.id) === String(sid));
                    if (found) setFormStudentName(found.name || found.fullName || '');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="">-- Chagua Mwanafunzi au Andika Chini --</option>
                  {students.filter(s => s.className === formClass).map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.fullName} ({s.className})</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Jina la Mwanafunzi..."
                  value={formStudentName}
                  onChange={e => setFormStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Idadi ya Reams</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={formReams}
                    onChange={e => setFormReams(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tarehe</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Muhula</label>
                  <select
                    value={formTerm}
                    onChange={e => setFormTerm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Muhula 1">Muhula 1</option>
                    <option value="Muhula 2">Muhula 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Mwaka wa Masomo</label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={e => setFormYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Maelezo (Notes)</label>
                <input
                  type="text"
                  placeholder="Mf: A4, 500 sheets"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-lg"
                >
                  Hifadhi Kumbukumbu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
