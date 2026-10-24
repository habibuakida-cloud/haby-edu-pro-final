import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Download,
  Upload,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  RotateCcw,
  Save,
  Calendar,
  ShieldCheck,
  HardDrive,
  FileJson,
  Sparkles,
  Play,
  Layers
} from 'lucide-react';
import {
  AutoBackupConfig,
  BackupMode,
  BackupSnapshotMeta,
  DEFAULT_AUTO_BACKUP_CONFIG,
  loadAutoBackupConfig,
  saveAutoBackupConfig,
  triggerJsonDownloadBackup,
  triggerSupabaseStorageSnapshot,
  fetchBackupSnapshots,
  downloadSnapshotFile,
  fetchSnapshotPayload,
  deleteBackupSnapshot,
  getLocalDateKey,
  getLocalTimeHHMM,
} from '../../utils/backupService';
import { DEFAULT_PRIMARY_SCHOOL_ID } from '../../lib/dbClient';

interface AutomatedBackupManagerProps {
  schoolId?: string;
  schoolData?: any;
  onRestoreData?: (restoredData: any, sourceLabel: string) => void;
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AutomatedBackupManager: React.FC<AutomatedBackupManagerProps> = ({
  schoolId = DEFAULT_PRIMARY_SCHOOL_ID,
  schoolData,
  onRestoreData,
  onImportJson,
}) => {
  const [config, setConfig] = useState<AutoBackupConfig>(DEFAULT_AUTO_BACKUP_CONFIG);
  const [snapshots, setSnapshots] = useState<BackupSnapshotMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [runningManualSnapshot, setRunningManualSnapshot] = useState<boolean>(false);
  const [runningManualJson, setRunningManualJson] = useState<boolean>(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => getLocalTimeHHMM());
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedCfg, loadedSnaps] = await Promise.all([
        loadAutoBackupConfig(schoolId),
        fetchBackupSnapshots(schoolId),
      ]);
      setConfig(loadedCfg);
      setSnapshots(loadedSnaps);
    } catch (err: any) {
      console.warn('Error loading backup manager data:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Update live clock display every 15s and refresh config/snapshots if an auto backup fired in background
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(getLocalTimeHHMM());
    }, 15000);

    const handleBackupCompleted = () => {
      loadAll();
    };
    window.addEventListener('haby-auto-backup-completed', handleBackupCompleted);
    return () => {
      clearInterval(timer);
      window.removeEventListener('haby-auto-backup-completed', handleBackupCompleted);
    };
  }, [loadAll]);

  const handleSaveSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    try {
      const saved = await saveAutoBackupConfig(schoolId, config);
      setConfig(saved);
      window.dispatchEvent(new CustomEvent('haby-auto-backup-config-updated', { detail: saved }));
      setFeedback({
        type: 'success',
        message: `Ratiba ya Hifadhi ya Kila Siku (Automated Daily Backup) imehifadhiwa kikamilifu kwa saa ${saved.scheduledTime}!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Imeshindwa kuhifadhi ratiba ya backup.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSetQuickTime = async (timeValue: string, resetTodayFlag = false) => {
    const nextCfg: Partial<AutoBackupConfig> = {
      ...config,
      enabled: true,
      scheduledTime: timeValue,
      ...(resetTodayFlag
        ? {
            lastBackupDate: null,
            lastJsonDownloadDate: null,
            lastSupabaseSnapshotDate: null,
          }
        : {}),
    };
    setConfig(prev => ({ ...prev, ...nextCfg }));
    const saved = await saveAutoBackupConfig(schoolId, nextCfg);
    setConfig(saved);
    window.dispatchEvent(new CustomEvent('haby-auto-backup-config-updated', { detail: saved }));
    setFeedback({
      type: 'info',
      message: resetTodayFlag
        ? `Muda wa majaribio umewekwa saa ${timeValue} (bendera ya leo imefutwa ili backup ijiendeshe saa ${timeValue}).`
        : `Muda wa backup umewekwa saa ${timeValue}.`,
    });
  };

  const handleTriggerJsonNow = async () => {
    setRunningManualJson(true);
    setFeedback(null);
    try {
      const todayKey = getLocalDateKey();
      const result = triggerJsonDownloadBackup(schoolId, schoolData || {}, 'manual');
      const updated = await saveAutoBackupConfig(schoolId, {
        lastBackupDate: todayKey,
        lastJsonDownloadDate: todayKey,
        lastBackupTimestamp: new Date().toISOString(),
        lastBackupStatus: 'success',
        lastBackupMessage: `Downloaded JSON backup (${result.filename})`,
      });
      setConfig(updated);
      setFeedback({
        type: 'success',
        message: `Faili la JSON (${result.filename}) limepakuliwa kikamilifu kwenye kifaa chako!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Hitilafu wakati wa kupakua JSON backup: ${err?.message || String(err)}`,
      });
    } finally {
      setRunningManualJson(false);
    }
  };

  const handleTriggerSupabaseSnapshotNow = async () => {
    setRunningManualSnapshot(true);
    setFeedback(null);
    try {
      const snap = await triggerSupabaseStorageSnapshot(schoolId, schoolData || {}, 'manual');
      const [freshCfg, freshSnaps] = await Promise.all([
        loadAutoBackupConfig(schoolId),
        fetchBackupSnapshots(schoolId),
      ]);
      setConfig(freshCfg);
      setSnapshots(freshSnaps);
      setFeedback({
        type: 'success',
        message: `Supabase Storage Snapshot (${snap.filename}) imehifadhiwa kikamilifu kwenye wingu!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Hitilafu wakati wa kuhifadhi Supabase Snapshot: ${err?.message || String(err)}`,
      });
    } finally {
      setRunningManualSnapshot(false);
    }
  };

  const handleRestoreFromSnapshot = async (snap: BackupSnapshotMeta) => {
    setRestoringId(snap.id);
    setFeedback(null);
    try {
      const payload = await fetchSnapshotPayload(schoolId, snap.id);
      const cleanData = { ...payload };
      delete cleanData._snapshotMeta;
      delete cleanData._backupMeta;

      if (onRestoreData) {
        onRestoreData(cleanData, `Supabase Snapshot (${snap.filename})`);
      }
      setConfirmRestoreId(null);
      setFeedback({
        type: 'success',
        message: `Data za shule zimerejeshwa kikamilifu kutoka kwenye snapshot "${snap.filename}"!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Imeshindwa kurejesha snapshot: ${err?.message || String(err)}`,
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteSnapshot = async (snap: BackupSnapshotMeta) => {
    setDeletingId(snap.id);
    try {
      const ok = await deleteBackupSnapshot(schoolId, snap.id);
      if (ok) {
        setSnapshots(prev => prev.filter(s => s.id !== snap.id));
        setFeedback({
          type: 'info',
          message: `Snapshot "${snap.filename}" imefutwa.`,
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const todayKey = getLocalDateKey();
  const isCompletedToday =
    config.backupMode === 'json_download'
      ? config.lastJsonDownloadDate === todayKey
      : config.backupMode === 'supabase_snapshot'
      ? config.lastSupabaseSnapshotDate === todayKey
      : config.lastJsonDownloadDate === todayKey && config.lastSupabaseSnapshotDate === todayKey;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getNextMinuteHHMM = () => {
    const d = new Date(Date.now() + 60 * 1000);
    return getLocalTimeHHMM(d);
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & LIVE DAILY SCHEDULE BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-[#102a4c] to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                  config.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {config.enabled ? `Auto Daily Backup: ACTIVE (${config.scheduledTime})` : 'Auto Daily Backup: PAUSED'}
              </span>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                Bucket: school-backups ({snapshots.length} Snapshots)
              </span>

              <span className="text-xs text-slate-300 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                Saa ya Mfumo: {currentTimeStr}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>Hifadhi ya Kila Siku Kiotomatiki (Automated Daily Backup &amp; Snapshots)</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Panga muda maalum kila siku ambapo mfumo utapakua kiotomatiki nakala ya <strong>JSON (.json)</strong> kwenye kompyuta yako
              au kuhifadhi <strong>Supabase Storage Snapshot</strong> ya data zote za shule (Wanafunzi, Walimu, Matokeo, Ratiba, na Mipangilio).
            </p>
          </div>

          {/* Quick Manual Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleTriggerJsonNow}
              disabled={runningManualJson}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {runningManualJson ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              <span>Pakua JSON Sasa</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerSupabaseSnapshotNow}
              disabled={runningManualSnapshot}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {runningManualSnapshot ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>Hifadhi Supabase Snapshot Sasa</span>
            </button>
          </div>
        </div>

        {/* Status Bar inside Header */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Hali ya Backup ya Leo ({todayKey}):</span>
            {isCompletedToday ? (
              <span className="text-emerald-400 font-black flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Imekamilika Leo
              </span>
            ) : (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Clock className="w-4 h-4" /> Inasubiri Saa {config.scheduledTime}
              </span>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Aina ya Hifadhi (Mode):</span>
            <span className="text-white font-black uppercase">
              {config.backupMode === 'both'
                ? 'JSON + Supabase Snapshot'
                : config.backupMode === 'json_download'
                ? 'JSON Auto-Download'
                : 'Supabase Storage Snapshot'}
            </span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Backup ya Mwisho:</span>
            <span className="text-blue-200 font-mono font-bold truncate max-w-[170px]">
              {config.lastBackupTimestamp
                ? new Date(config.lastBackupTimestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Bado haijarekodiwa'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-black underline ml-4 cursor-pointer"
          >
            Funga
          </button>
        </div>
      )}

      {/* 2. SCHEDULE CONFIGURATION & LOCAL IMPORT/EXPORT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Form (2 cols) */}
        <form
          onSubmit={handleSaveSchedule}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Mipangilio ya Muda wa Backup ya Kila Siku (Daily Schedule Configuration)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chagua saa na jinsi mfumo utakavyohifadhi data zako kila siku kiotomatiki.
              </p>
            </div>

            {/* Enable Toggle */}
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className={`text-xs font-black uppercase ${config.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                {config.enabled ? 'Imewashwa (Enabled)' : 'Imezimwa (Disabled)'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Set Time */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                1. Muda wa Kila Siku (Set Time) *
              </label>
              <input
                type="time"
                value={config.scheduledTime}
                onChange={e =>
                  setConfig(prev => ({
                    ...prev,
                    scheduledTime: e.target.value,
                    // If user changes the scheduled time, allow it to trigger today if the new time hasn't run yet
                    lastBackupDate: null,
                    lastJsonDownloadDate: null,
                    lastSupabaseSnapshotDate: null,
                  }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {['12:00', '16:00', '17:00', '20:00', '23:00'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSetQuickTime(preset, false)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                      config.scheduledTime === preset
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSetQuickTime(getNextMinuteHHMM(), true)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                  title="Weka dakika 1 ijayo ili kujaribu backup ya kiotomatiki sasa hivi"
                >
                  +1 Dakika (Test)
                </button>
              </div>
            </div>

            {/* Backup Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                2. Njia ya Hifadhi (Backup Mode) *
              </label>
              <select
                value={config.backupMode}
                onChange={e => setConfig(prev => ({ ...prev, backupMode: e.target.value as BackupMode }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="both">Zote Mbili: JSON Download + Supabase Snapshot</option>
                <option value="supabase_snapshot">Supabase Storage Snapshot Pekee (Cloud)</option>
                <option value="json_download">JSON File Download Pekee (Local Computer)</option>
              </select>
              <p className="text-[10px] text-slate-500 leading-tight">
                Chaguo la "Zote Mbili" linapakua JSON na pia kuhifadhi snapshot kwenye Supabase Storage.
              </p>
            </div>

            {/* Retention Policy */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                3. Idadi ya Snapshots (Retention)
              </label>
              <select
                value={config.retentionCount}
                onChange={e => setConfig(prev => ({ ...prev, retentionCount: Number(e.target.value) || 14 }))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value={7}>Tunza Snapshots 7 za Mwisho (Wiki 1)</option>
                <option value={14}>Tunza Snapshots 14 za Mwisho (Wiki 2)</option>
                <option value={30}>Tunza Snapshots 30 za Mwisho (Mwezi 1)</option>
                <option value={60}>Tunza Snapshots 60 za Mwisho (Miezi 2)</option>
              </select>
              <p className="text-[10px] text-slate-500 leading-tight">
                Snapshots za zamani zaidi ya idadi hii hufutwa kiotomatiki kuokoa nafasi.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Kipima muda (Scheduler) hukagua kila sekunde 20 na kuendesha backup mara tu saa{' '}
                <strong className="text-slate-800">{config.scheduledTime}</strong> inapofika.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Hifadhi Ratiba ya Backup</span>
            </button>
          </div>
        </form>

        {/* Manual JSON Export & Import Card (1 col) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Rejesha au Pakua JSON</h3>
                <p className="text-[11px] text-slate-500">Manual JSON Export &amp; Restore</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Unaweza kupakua faili kamili la JSON wakati wowote au kupakia (Import) faili la JSON lililohifadhiwa awali ili kurejesha data za shule.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleTriggerJsonNow}
              disabled={runningManualJson}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Pakua JSON Backup Kamili (.json)</span>
            </button>

            {onImportJson && (
              <label className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Pakia &amp; Rejesha Kutoka Faili la JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={onImportJson}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* 3. SUPABASE STORAGE SNAPSHOTS HISTORY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Orodha ya Supabase Storage Snapshots ({snapshots.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Snapshots zilizohifadhiwa kwenye <code>supabase.storage.from('school-backups')</code> na Cloud SQL. Unaweza kuzipakua au kuzirejesha wakati wowote.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Onyesha Upya</span>
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-bold">Inapakia snapshots kutoka Supabase Storage...</span>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-3">
            <Cloud className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Hakuna Snapshot Iliyohifadhiwa Bado</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bonyeza kitufe cha <b>"Hifadhi Supabase Snapshot Sasa"</b> hapo juu au subiri muda wa ratiba yako ya kila siku ufike.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Tarehe &amp; Muda</th>
                  <th className="py-3 px-4">Jina la Snapshot (Storage Path)</th>
                  <th className="py-3 px-3 text-center">Chanzo (Trigger)</th>
                  <th className="py-3 px-3 text-center">Muhtasari wa Rekodi</th>
                  <th className="py-3 px-3 text-center">Ukubwa (Size)</th>
                  <th className="py-3 px-4 text-right">Vitendo (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map(snap => {
                  const isConfirmingRestore = confirmRestoreId === snap.id;
                  const isRestoring = restoringId === snap.id;
                  const isDeleting = deletingId === snap.id;

                  return (
                    <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {new Date(snap.createdAt).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(snap.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">{snap.filename}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[260px]">
                          bucket: {snap.bucket || 'school-backups'}/{snap.storagePath}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                            snap.triggerType === 'scheduled'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {snap.triggerType === 'scheduled' ? (
                            <>
                              <Clock className="w-3 h-3" /> Auto Daily
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3" /> Manual
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-700">
                          <span>{snap.counts?.students ?? 0} Wanafunzi</span>
                          <span>•</span>
                          <span>{snap.counts?.teachers ?? 0} Walimu</span>
                          <span>•</span>
                          <span>{snap.counts?.exams ?? 0} Mitihani</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {formatBytes(snap.sizeBytes)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadSnapshotFile(schoolId, snap.id, snap.filename)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                            title="Pakua faili la JSON la snapshot hii"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>JSON</span>
                          </button>

                          {onRestoreData && (
                            <>
                              {isConfirmingRestore ? (
                                <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg">
                                  <span className="text-[10px] font-black text-amber-900">Una uhakika?</span>
                                  <button
                                    type="button"
                                    disabled={isRestoring}
                                    onClick={() => handleRestoreFromSnapshot(snap)}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black cursor-pointer"
                                  >
                                    {isRestoring ? '...' : 'Ndiyo, Rejesha'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRestoreId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Ghairi
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRestoreId(snap.id)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                  title="Rejesha data za shule kutoka kwenye snapshot hii"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Restore</span>
                                </button>
                              )}
                            </>
                          )}

                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteSnapshot(snap)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Futa snapshot hii"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
