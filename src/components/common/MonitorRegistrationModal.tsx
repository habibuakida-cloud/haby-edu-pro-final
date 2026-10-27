import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, X, Search, Loader2, Save, UserPlus, GraduationCap, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAccount, Student } from '../../types';
import { normalizeStreamName } from '../../utils/classStreamUtils';

interface MonitorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  stream: string;
  schoolId: string;
  users: UserAccount[];
  students?: Student[];
  initialMonitorId?: string | null;
  initialMonitressId?: string | null;
  initialMonitorName?: string | null;
  initialMonitressName?: string | null;
  onSave: (
    monitorId: string | null,
    monitressId: string | null,
    monitorName?: string | null,
    monitressName?: string | null
  ) => void;
}

export const MonitorRegistrationModal: React.FC<MonitorRegistrationModalProps> = ({
  isOpen,
  onClose,
  className,
  stream,
  schoolId,
  users = [],
  students = [],
  initialMonitorId,
  initialMonitressId,
  initialMonitorName,
  initialMonitressName,
  onSave
}) => {
  const [monitorId, setMonitorId] = useState<string | null>(initialMonitorId || null);
  const [monitressId, setMonitressId] = useState<string | null>(initialMonitressId || null);
  const [monitorName, setMonitorName] = useState<string>(initialMonitorName || '');
  const [monitressName, setMonitressName] = useState<string>(initialMonitressName || '');
  const [customMonitorInput, setCustomMonitorInput] = useState('');
  const [customMonitressInput, setCustomMonitressInput] = useState('');
  const [sourceTab, setSourceTab] = useState<'students' | 'users'>('students');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMonitorId(initialMonitorId || null);
    setMonitressId(initialMonitressId || null);
    setMonitorName(initialMonitorName || '');
    setMonitressName(initialMonitressName || '');
  }, [initialMonitorId, initialMonitressId, initialMonitorName, initialMonitressName, isOpen]);

  // Combine students from this class/stream (or all students in class if stream has none)
  const classStudents = useMemo(() => {
    const normTargetStream = normalizeStreamName(stream || 'A');
    let list = students.filter(s => {
      if (s.className !== className) return false;
      const sStream = normalizeStreamName(s.stream || s.combination || 'A');
      return sStream === normTargetStream || sStream.includes(normTargetStream) || normTargetStream.includes(sStream);
    });
    if (list.length === 0) {
      list = students.filter(s => s.className === className);
    }
    const isFemale = (s: Student) => {
      const g = (s.gender || s.sex || '').toLowerCase().trim();
      return g.startsWith('f') || g === 'ke' || g === 'girl' || g === 'g';
    };
    return [...list].sort((a, b) => {
      const aF = isFemale(a);
      const bF = isFemale(b);
      if (aF !== bF) return aF ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [students, className, stream]);

  // Resolve display names if monitorId / monitressId is set
  const resolvedMonitorDisplay = useMemo(() => {
    if (monitorName) return monitorName;
    if (!monitorId) return '';
    const u = users.find(x => String(x.id) === String(monitorId));
    if (u) return u.fullName;
    const s = students.find(x => String(x.id) === String(monitorId) || `stud_${x.id}` === String(monitorId));
    if (s) return s.name;
    return `Monitor (${monitorId.slice(0, 8)})`;
  }, [monitorId, monitorName, users, students]);

  const resolvedMonitressDisplay = useMemo(() => {
    if (monitressName) return monitressName;
    if (!monitressId) return '';
    const u = users.find(x => String(x.id) === String(monitressId));
    if (u) return u.fullName;
    const s = students.find(x => String(x.id) === String(monitressId) || `stud_${x.id}` === String(monitressId));
    if (s) return s.name;
    return `Monitress (${monitressId.slice(0, 8)})`;
  }, [monitressId, monitressName, users, students]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(
      u =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    return classStudents.filter(
      s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.regNo || '').toLowerCase().includes(q)
    );
  }, [classStudents, search]);

  const handleApplyQuickMonitor = () => {
    const clean = customMonitorInput.trim();
    if (!clean) return;
    setMonitorId(`mon_${schoolId}_${className}_${stream}_${Date.now()}`);
    setMonitorName(clean);
    setCustomMonitorInput('');
  };

  const handleApplyQuickMonitress = () => {
    const clean = customMonitressInput.trim();
    if (!clean) return;
    setMonitressId(`mont_${schoolId}_${className}_${stream}_${Date.now()}`);
    setMonitressName(clean);
    setCustomMonitressInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        monitorId,
        monitressId,
        resolvedMonitorDisplay || null,
        resolvedMonitressDisplay || null
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden relative flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-[#1f4d8b] to-indigo-900 text-white">
            <div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                Usajili wa Monitor &amp; Monitress wa Darasa
              </h3>
              <p className="text-xs text-blue-200 font-bold uppercase tracking-widest mt-0.5">
                Darasa: {className} — {stream}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/15 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Selection Grid: Monitor (Boy) & Monitress (Girl) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monitor (Boy) */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-black text-blue-700 uppercase tracking-wide">
                  <UserCheck className="w-4 h-4" /> Monitor (Mvulana - Boy)
                </label>
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2.5">
                  {monitorId ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          {(resolvedMonitorDisplay || 'M')[0]}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {resolvedMonitorDisplay}
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 uppercase">Monitor Mkuu</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMonitorId(null);
                          setMonitorName('');
                        }}
                        className="text-[10px] font-black text-rose-600 uppercase hover:underline cursor-pointer shrink-0"
                      >
                        Ondoa
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-700/70 font-bold italic text-center py-1">
                      Hakuna Monitor aliyechaguliwa bado
                    </p>
                  )}

                  {/* Quick type Monitor name directly */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-blue-200/60">
                    <input
                      type="text"
                      value={customMonitorInput}
                      onChange={e => setCustomMonitorInput(e.target.value)}
                      placeholder="Au andika jina la Monitor hapa..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-white border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyQuickMonitor}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-xl uppercase cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" /> Weka
                    </button>
                  </div>
                </div>
              </div>

              {/* Monitress (Girl) */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-black text-rose-700 uppercase tracking-wide">
                  <UserCheck className="w-4 h-4" /> Monitress (Msichana - Girl)
                </label>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                  {monitressId ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          {(resolvedMonitressDisplay || 'M')[0]}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {resolvedMonitressDisplay}
                          </span>
                          <span className="text-[10px] font-bold text-rose-700 uppercase">Monitress Mkuu</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMonitressId(null);
                          setMonitressName('');
                        }}
                        className="text-[10px] font-black text-rose-600 uppercase hover:underline cursor-pointer shrink-0"
                      >
                        Ondoa
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-700/70 font-bold italic text-center py-1">
                      Hakuna Monitress aliyechaguliwa bado
                    </p>
                  )}

                  {/* Quick type Monitress name directly */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-rose-200/60">
                    <input
                      type="text"
                      value={customMonitressInput}
                      onChange={e => setCustomMonitressInput(e.target.value)}
                      placeholder="Au andika jina la Monitress hapa..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-white border border-rose-200 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyQuickMonitress}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-xl uppercase cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" /> Weka
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Selector & Search */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSourceTab('students')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      sourceTab === 'students'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Wanafunzi wa {className} ({classStudents.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceTab('users')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      sourceTab === 'users'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Akaunti za Mfumo ({users.length})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tafuta jina la mwanafunzi..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {sourceTab === 'students' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredStudents.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-slate-400 text-xs font-bold">
                      Hakuna mwanafunzi aliyepatikana kwenye {className}. Unaweza kuandika jina moja kwa moja kwenye kisanduku cha Monitor/Monitress hapo juu.
                    </div>
                  ) : (
                    filteredStudents.map(s => {
                      const g = (s.gender || s.sex || '').toLowerCase();
                      const isGirl = g.startsWith('f') || g === 'ke' || g === 'girl' || g === 'g';
                      const sKey = `stud_${s.id}`;
                      return (
                        <div
                          key={s.id}
                          className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 hover:border-blue-300 hover:bg-white transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              isGirl ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {(s.name || 'S')[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{s.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                {isGirl ? 'Msichana (Girl)' : 'Mvulana (Boy)'} • {s.stream || stream}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setMonitorId(sKey);
                                setMonitorName(s.name);
                              }}
                              disabled={monitorId === sKey}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg uppercase cursor-pointer disabled:opacity-40"
                            >
                              Monitor
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMonitressId(sKey);
                                setMonitressName(s.name);
                              }}
                              disabled={monitressId === sKey}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black rounded-lg uppercase cursor-pointer disabled:opacity-40"
                            >
                              Monitress
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredUsers.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-slate-400 text-xs font-bold">
                      Hakuna mtumiaji aliyepatikana kwa jina hilo.
                    </div>
                  ) : (
                    filteredUsers.map(u => (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 hover:border-blue-300 hover:bg-white transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600 text-xs shrink-0">
                            {(u.fullName || 'U')[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{u.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{u.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setMonitorId(u.id);
                              setMonitorName(u.fullName);
                            }}
                            disabled={monitorId === u.id}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg uppercase cursor-pointer disabled:opacity-40"
                          >
                            Monitor
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMonitressId(u.id);
                              setMonitressName(u.fullName);
                            }}
                            disabled={monitressId === u.id}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black rounded-lg uppercase cursor-pointer disabled:opacity-40"
                          >
                            Monitress
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-800 cursor-pointer"
            >
              Ghairi
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer ${
                saving
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02] active:scale-95'
              }`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Hifadhi Monitor &amp; Monitress
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
