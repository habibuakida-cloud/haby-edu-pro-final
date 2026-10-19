import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Edit3, 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  Layers, 
  Sliders, 
  RefreshCw,
  ArrowRight,
  Info
} from 'lucide-react';
import { Exam, EducationLevel, SchoolInfo, UserAccount } from '../../types';

export interface ExamSettingsViewProps {
  exams: Exam[];
  onUpdateExam?: (exam: Exam) => void;
  onUpdateExams?: (exams: Exam[]) => void;
  onNavigateToMarkEntry?: (examName?: string, className?: string) => void;
  onNavigateToExams?: () => void;
  currentUser?: UserAccount;
  schoolInfo?: SchoolInfo;
  isEmbedded?: boolean;
}

export const ExamSettingsView: React.FC<ExamSettingsViewProps> = ({
  exams = [],
  onUpdateExam,
  onUpdateExams,
  onNavigateToMarkEntry,
  onNavigateToExams,
  currentUser,
  schoolInfo,
  isEmbedded = false
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Helper to check if an exam is active
  const isExamActive = (exam: Exam) => {
    return exam.status !== 'Inactive' && exam.status !== 'Locked' && exam.isActive !== false;
  };

  // Toggle single exam status
  const handleToggleExam = (exam: Exam) => {
    const currentlyActive = isExamActive(exam);
    const nextActive = !currentlyActive;
    const nextStatus = nextActive ? 'Active' : 'Locked';

    const updatedExam: Exam = {
      ...exam,
      status: nextStatus as any,
      isActive: nextActive
    };

    if (onUpdateExam) {
      onUpdateExam(updatedExam);
    } else if (onUpdateExams) {
      onUpdateExams(exams.map(e => e.id === exam.id ? updatedExam : e));
    }

    showToast(
      nextActive
        ? `✅ Mtihani wa "${exam.name}" sasa ni WAZI (Active). Walimu wanaruhusiwa kuingiza alama.`
        : `🔒 Mtihani wa "${exam.name}" sasa UMEFUNGWA (Locked). Walimu wamezuiwa kuingiza wala kuhariri alama.`
    );
  };

  // Bulk toggle all exams
  const handleBulkToggleAll = (targetActive: boolean) => {
    const updated = exams.map(e => ({
      ...e,
      status: (targetActive ? 'Active' : 'Locked') as any,
      isActive: targetActive
    }));

    if (onUpdateExams) {
      onUpdateExams(updated);
    } else if (onUpdateExam) {
      updated.forEach(e => onUpdateExam(e));
    }

    showToast(
      targetActive
        ? '🟢 Mitihani yote imefunguliwa (Unlocked)! Walimu wanaweza kuingiza alama kwenye Mark Entry.'
        : '🔒 Mitihani yote imefungwa (Locked)! Uingizaji wa alama umezuiwa kiusalama.'
    );
  };

  // Bulk toggle by Exam Category / Type (Midterm, Terminal, Annual, Mock)
  const handleToggleType = (typeKeyword: string, targetActive: boolean) => {
    const targetTypeClean = typeKeyword.toLowerCase().trim();
    let affectedCount = 0;

    const updated = exams.map(e => {
      const match = (e.type && e.type.toLowerCase().includes(targetTypeClean)) ||
                    (e.name && e.name.toLowerCase().includes(targetTypeClean));
      if (match) {
        affectedCount++;
        return {
          ...e,
          status: (targetActive ? 'Active' : 'Locked') as any,
          isActive: targetActive
        };
      }
      return e;
    });

    if (affectedCount === 0) {
      showToast(`Hakuna mtihani unaolingana na "${typeKeyword}".`);
      return;
    }

    if (onUpdateExams) {
      onUpdateExams(updated);
    } else if (onUpdateExam) {
      updated.forEach(e => onUpdateExam(e));
    }

    showToast(
      targetActive
        ? `🟢 Mitihani ${affectedCount} ya aina ya "${typeKeyword.toUpperCase()}" imefunguliwa (Unlocked).`
        : `🔒 Mitihani ${affectedCount} ya aina ya "${typeKeyword.toUpperCase()}" imefungwa (Locked).`
    );
  };

  // Metrics
  const activeCount = useMemo(() => {
    return exams.filter(e => isExamActive(e)).length;
  }, [exams]);

  const lockedCount = useMemo(() => {
    return exams.filter(e => !isExamActive(e)).length;
  }, [exams]);

  // Status for broad types
  const typeStatus = useMemo(() => {
    const checkType = (kw: string) => {
      const match = exams.filter(e => 
        (e.type && e.type.toLowerCase().includes(kw)) ||
        (e.name && e.name.toLowerCase().includes(kw))
      );
      if (match.length === 0) return { total: 0, active: 0, allActive: false };
      const active = match.filter(e => isExamActive(e)).length;
      return { total: match.length, active, allActive: active === match.length };
    };

    return {
      midterm: checkType('midterm'),
      terminal: checkType('terminal'),
      annual: checkType('annual'),
      mock: checkType('mock')
    };
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        e.name?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        e.className?.toLowerCase().includes(q);

      // Level
      const matchLevel = levelFilter === 'ALL' || e.level === levelFilter;

      // Status
      const active = isExamActive(e);
      const matchStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && active) || 
        (statusFilter === 'LOCKED' && !active);

      return matchSearch && matchLevel && matchStatus;
    });
  }, [exams, searchQuery, levelFilter, statusFilter]);

  return (
    <div className={`space-y-6 animate-in fade-in duration-200 ${isEmbedded ? '' : 'p-4 sm:p-6 max-w-7xl mx-auto'}`}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center font-black shadow-inner shrink-0">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Exam Settings &amp; Lock Control
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-xs uppercase tracking-wider">
                Academic Master Control
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                Database Synced
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1.5 max-w-3xl leading-relaxed">
              Dhibiti ufunguaji (Active) na ufungwaji (Locked) wa mitihani yote shuleni. Mtihani unapowekwa <strong>LOCKED</strong>, walimu wanazuiliwa kuingiza au kubadilisha alama kwenye fomu ya Mark Entry. Mabadiliko haya yanahifadhiwa mara moja kwenye database.
            </p>
          </div>
        </div>

        {/* Global Bulk Action Buttons */}
        <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0 z-10">
          <button
            type="button"
            onClick={() => handleBulkToggleAll(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            title="Fungua mitihani yote ili walimu waingize alama"
          >
            <Unlock className="w-4 h-4" />
            <span>Fungua Yote (Unlock All)</span>
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggleAll(false)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            title="Funga mitihani yote kuzuia mabadiliko ya alama"
          >
            <Lock className="w-4 h-4" />
            <span>Funga Yote (Lock All)</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-slate-900 border-2 border-emerald-400 text-white px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Realtime Updated</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Exams */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jumla ya Mitihani (Total Exams)
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {exams.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Mitihani iliyosajiliwa kwenye kalenda</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        {/* Active Exams */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Mitihani Iliyowazi (Active)
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-1">
              {activeCount}
            </div>
            <div className="text-xs text-emerald-600/90 mt-0.5">Walimu wanaweza kuingiza alama sasa</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Unlock className="w-6 h-6" />
          </div>
        </div>

        {/* Locked Exams */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Mitihani Iliyofungwa (Locked)
            </div>
            <div className="text-3xl font-black text-rose-700 mt-1">
              {lockedCount}
            </div>
            <div className="text-xs text-rose-600/90 mt-0.5">Uingizaji wa alama umezuiwa (Secured)</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* QUICK MASTER TOGGLE BY EXAM TYPE (MIDTERM, TERMINAL, ANNUAL, MOCK) */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-blue-700" />
          <h3 className="font-black text-sm text-slate-900 tracking-tight">
            Swichi za Haraka kwa Aina za Mitihani (Exam Types Activation Switches)
          </h3>
          <span className="text-[10px] font-bold text-slate-500 ml-auto hidden sm:inline">
            Badilisha aina nzima ya mtihani kwa mbofyo mmoja
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* MIDTERM */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                MIDTERM EXAMS
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {typeStatus.midterm.total} exams ({typeStatus.midterm.active} active)
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleType('midterm', true)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                title="Fungua Midterm zote"
              >
                Fungua
              </button>
              <button
                type="button"
                onClick={() => handleToggleType('midterm', false)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                title="Funga Midterm zote"
              >
                Funga
              </button>
            </div>
          </div>

          {/* TERMINAL */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                TERMINAL EXAMS
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {typeStatus.terminal.total} exams ({typeStatus.terminal.active} active)
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleType('terminal', true)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                title="Fungua Terminal zote"
              >
                Fungua
              </button>
              <button
                type="button"
                onClick={() => handleToggleType('terminal', false)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                title="Funga Terminal zote"
              >
                Funga
              </button>
            </div>
          </div>

          {/* ANNUAL */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                ANNUAL EXAMS
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {typeStatus.annual.total} exams ({typeStatus.annual.active} active)
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleType('annual', true)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                title="Fungua Annual zote"
              >
                Fungua
              </button>
              <button
                type="button"
                onClick={() => handleToggleType('annual', false)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                title="Funga Annual zote"
              >
                Funga
              </button>
            </div>
          </div>

          {/* MOCK / ASSESSMENTS */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                MOCK &amp; ASSESSMENTS
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {typeStatus.mock.total} exams ({typeStatus.mock.active} active)
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggleType('mock', true)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                title="Fungua Mock zote"
              >
                Fungua
              </button>
              <button
                type="button"
                onClick={() => handleToggleType('mock', false)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                title="Funga Mock zote"
              >
                Funga
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tafuta jina la mtihani, darasa au aina..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-72 font-medium"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span className="text-slate-500 text-[11px]">Ngazi:</span>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Ngazi Zote (All Levels)</option>
              <option value="CSEE">Sekondari (Form 1 - 4 CSEE)</option>
              <option value="ACSEE">High School (Form 5 - 6 ACSEE)</option>
              <option value="PRIMARY">Msingi (Std 1 - 7 Primary)</option>
              <option value="PRE_PRIMARY">Awali (Nursery / Pre-Unit)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span className="text-slate-500 text-[11px]">Hali:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Hali Zote (All Status)</option>
              <option value="ACTIVE">Wazi Pekee (Active Only)</option>
              <option value="LOCKED">Zilizofungwa Pekee (Locked Only)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Inaonyesha mitihani <strong>{filteredExams.length}</strong> kati ya <strong>{exams.length}</strong>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Orodha Kamili ya Mitihani &amp; Swichi za Kufunga / Kufungua (Exam Lock Status List)
            </h3>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline font-medium">
            Swichi inabadilisha hadhi moja kwa moja kwenye database
          </span>
        </div>

        {filteredExams.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">Hakuna mtihani uliopatikana</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hakuna mtihani unaolingana na vigezo vya utafutaji. Jaribu kubadilisha vichujio au neno la utafutaji.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3.5 text-center w-12 border-r border-blue-900">#</th>
                  <th className="p-3.5 border-r border-blue-900">Jina la Mtihani (Exam Name)</th>
                  <th className="p-3.5 border-r border-blue-900">Aina (Type)</th>
                  <th className="p-3.5 border-r border-blue-900">Darasa &amp; Ngazi</th>
                  <th className="p-3.5 border-r border-blue-900 text-center">Tarehe</th>
                  <th className="p-3.5 border-r border-blue-900 text-center">Hali ya Sasa (Status)</th>
                  <th className="p-3.5 border-r border-blue-900 text-center min-w-[200px]">
                    Swichi ya Kufunga / Kufungua (Active / Locked)
                  </th>
                  <th className="p-3.5 text-center">Hatua za Haraka (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExams.map((ex, idx) => {
                  const active = isExamActive(ex);

                  return (
                    <tr 
                      key={ex.id || idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !active ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center font-bold text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 border-r border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {active ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-sm">{ex.name}</div>
                            <div className="text-[11px] font-semibold mt-0.5">
                              {active ? (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Walimu wanaruhusiwa kuingiza alama
                                </span>
                              ) : (
                                <span className="text-rose-700 flex items-center gap-1 font-bold">
                                  <Lock className="w-3 h-3 text-rose-600 inline" />
                                  Uingizaji umezuiwa (Locked)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 border-r border-slate-200">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-200 inline-block">
                          {ex.type || 'Standard Exam'}
                        </span>
                      </td>
                      <td className="p-3.5 border-r border-slate-200 font-medium text-slate-700">
                        <div className="font-bold text-slate-800">{ex.className || 'All Classes'}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{ex.level || 'CSEE'}</div>
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-600 border-r border-slate-200">
                        {ex.date || '-'}
                      </td>
                      <td className="p-3.5 text-center border-r border-slate-200">
                        {active ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            ACTIVE (WAZI)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            LOCKED (IMEFUNGWA)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center border-r border-slate-200">
                        {/* TOGGLE SWITCH */}
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleExam(ex)}
                            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden shadow-inner ${
                              active ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 hover:bg-slate-400'
                            }`}
                            role="switch"
                            aria-checked={active}
                            title={active ? `Bofya hapa kufunga "${ex.name}"` : `Bofya hapa kufungua "${ex.name}"`}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-flex items-center justify-center h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out text-xs ${
                                active ? 'translate-x-8 text-emerald-600 font-black' : 'translate-x-0 text-slate-500 font-bold'
                              }`}
                            >
                              {active ? '✓' : '🔒'}
                            </span>
                          </button>
                          <span className={`text-xs font-black min-w-[50px] text-left ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {active ? 'Wazi' : 'Fungwa'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {onNavigateToMarkEntry && (
                            <button
                              type="button"
                              onClick={() => onNavigateToMarkEntry(ex.name, ex.className)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                active
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                              }`}
                              title="Fungua Mark Entry kujaribu au kuingiza alama"
                            >
                              {active ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              <span>{active ? 'Mark Entry' : 'Locked'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Vidokezo vya Msimamizi wa Taaluma: Mtihani unapowekwa <strong>LOCKED</strong>, walimu wote wataona tahadhari ya rangi nyekundu na sehemu ya kuandika alama inafungwa mara moja.
          </div>
          {onNavigateToExams && (
            <button
              type="button"
              onClick={onNavigateToExams}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Kalenda ya Mitihani</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Helpful Guidance Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 text-blue-900 space-y-3">
        <div className="flex items-center gap-2 font-black text-sm">
          <Info className="w-5 h-5 text-blue-700 shrink-0" />
          <span>Jinsi Mfumo wa Exam Lock &amp; Activation Unavyofanya Kazi Kwenye Shule Yako:</span>
        </div>
        <ul className="text-xs text-blue-900/90 list-disc list-inside space-y-1.5 ml-1 leading-relaxed">
          <li>
            <strong>1. Kipindi cha Kuingiza Alama (Active Phase):</strong> Wakati mitihani imefanyika na walimu wanatakiwa kurekodi matokeo, mtihani unawekwa <strong>ACTIVE (Wazi)</strong> ili waweze kuingiza alama kwenye <em>Mark Entry View</em>.
          </li>
          <li>
            <strong>2. Kufunga Baada ya Ukaguzi wa Taaluma (Locking Phase):</strong> Baada ya walimu kumaliza kuingiza alama na kikao cha idara ya taaluma kuidhinisha matokeo, Msimamizi wa Taaluma (Academic Master) au Mkuu wa Shule anageuza swichi kuwa <strong>LOCKED (Imefungwa)</strong>.
          </li>
          <li>
            <strong>3. Ulinzi Imara Dhidi ya Ubadilishaji (Tamper-Proof Security):</strong> Hakuna mwalimu atakayeweza kubadilisha, kurekebisha au kuongeza alama mpya kimakosa mara baada ya mtihani kufungwa.
          </li>
          <li>
            <strong>4. Kufungua Wakati wa Rufaa (Re-activation):</strong> Iwapo itatokea mwanafunzi au mwalimu anahitaji masahihisho halali, Msimamizi wa Taaluma anaweza kufungua mtihani huo maalum kwa muda, na kisha kuufunga tena baada ya marekebisho.
          </li>
        </ul>
      </div>
    </div>
  );
};
