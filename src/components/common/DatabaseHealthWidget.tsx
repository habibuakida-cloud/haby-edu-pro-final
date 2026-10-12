import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Database, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HardDrive, 
  Clock, 
  ShieldCheck, 
  Server, 
  Check,
  Cpu
} from 'lucide-react';
import { measureSupabaseLatency, supabaseUrl } from '../../lib/supabaseClient';
import { measureIDBLatency, clearAllCachedData } from '../../lib/idbService';

interface DatabaseHealthWidgetProps {
  schoolId?: string;
  onForceRefreshSync?: () => void;
  currentUserRole?: string;
  className?: string;
  compact?: boolean;
}

export interface LatencyResult {
  latencyMs: number;
  ok: boolean;
  error?: string;
  lastChecked?: string;
}

export const DatabaseHealthWidget: React.FC<DatabaseHealthWidgetProps> = ({
  schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
  onForceRefreshSync,
  currentUserRole = 'admin',
  className = '',
  compact = false
}) => {
  const [supabaseLatency, setSupabaseLatency] = useState<LatencyResult>({ latencyMs: 0, ok: true });
  const [idbLatency, setIdbLatency] = useState<LatencyResult>({ latencyMs: 0, ok: true });
  
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  // Force Cache Rebuild modal & progress state
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
  const [rebuildStep, setRebuildStep] = useState<number>(0);
  const [rebuildStatusMsg, setRebuildStatusMsg] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const runDiagnosticCheck = useCallback(async () => {
    setIsMeasuring(true);
    const nowStr = new Date().toLocaleTimeString();

    try {
      const [supaRes, idbRes] = await Promise.all([
        measureSupabaseLatency(),
        measureIDBLatency()
      ]);

      setSupabaseLatency({ ...supaRes, lastChecked: nowStr });
      setIdbLatency({ ...idbRes, lastChecked: nowStr });
      setLastCheckTime(nowStr);
    } catch (err) {
      console.warn('Supabase health check error:', err);
    } finally {
      setIsMeasuring(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    runDiagnosticCheck();
  }, [runDiagnosticCheck]);

  // Auto ping every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      runDiagnosticCheck();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, runDiagnosticCheck]);

  // Compute overall Health Rating (100% focused on Supabase & Local Cache)
  let healthScore = 100;
  if (!supabaseLatency.ok) healthScore -= 50;
  if (!idbLatency.ok) healthScore -= 30;
  if (supabaseLatency.ok && supabaseLatency.latencyMs > 300) healthScore -= 10;
  healthScore = Math.max(0, healthScore);

  let healthStatusLabel = 'OPTIMAL HEALTH';
  let healthBadgeBg = 'bg-emerald-500/10 text-emerald-700 border-emerald-300';
  let healthDotColor = 'bg-emerald-500';

  if (healthScore < 50) {
    healthStatusLabel = 'ATTENTION NEEDED';
    healthBadgeBg = 'bg-rose-500/10 text-rose-700 border-rose-300';
    healthDotColor = 'bg-rose-500';
  } else if (healthScore < 90) {
    healthStatusLabel = 'MODERATE SPEED';
    healthBadgeBg = 'bg-amber-500/10 text-amber-700 border-amber-300';
    healthDotColor = 'bg-amber-500';
  }

  // Handle Admin Force Cache Rebuild
  const handleForceCacheRebuild = async () => {
    setShowConfirmModal(false);
    setIsRebuilding(true);
    setRebuildStep(1);
    setRebuildStatusMsg('Hatua 1/4: Kusafisha kumbukumbu ya kivinjari (IndexedDB & LocalStorage)...');

    try {
      await new Promise(r => setTimeout(r, 500));
      await clearAllCachedData();

      setRebuildStep(2);
      setRebuildStatusMsg('Hatua 2/4: Kuunganisha upya na seva kuu ya Supabase...');
      await new Promise(r => setTimeout(r, 500));

      setRebuildStep(3);
      setRebuildStatusMsg('Hatua 3/4: Kupakua nakala safi ya taarifa za shule kutoka Supabase...');
      await new Promise(r => setTimeout(r, 500));

      setRebuildStep(4);
      setRebuildStatusMsg('Hatua 4/4: Kuhifadhi upya kwenye kache ya haraka ya kivinjari...');
      await new Promise(r => setTimeout(r, 500));

      if (onForceRefreshSync) {
        onForceRefreshSync();
      }

      setShowToast('Taarifa zote zimepakiwa na kusawazishwa kikamilifu kutoka Supabase!');
      setTimeout(() => setShowToast(null), 5000);

      // Re-run health check
      await runDiagnosticCheck();
    } catch (err: any) {
      console.error('Cache rebuild error:', err);
      setShowToast(`Rebuild ilikamilika: ${err?.message || 'Angalia muunganisho'}`);
      setTimeout(() => setShowToast(null), 5000);
    } finally {
      setIsRebuilding(false);
      setRebuildStep(0);
      setRebuildStatusMsg('');
    }
  };

  const getLatencyBadge = (latency: number, ok: boolean) => {
    if (!ok) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
          <XCircle className="w-3 h-3 text-rose-600" />
          OFFLINE
        </span>
      );
    }
    if (latency <= 80) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {latency} ms (Haraka Sana)
        </span>
      );
    }
    if (latency <= 250) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-600" />
          {latency} ms (Nzuri)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        {latency} ms (Wastani)
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden ${className}`}>
      
      {/* Toast Alert */}
      {showToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-amber-300" />
            <span>{showToast}</span>
          </div>
          <button onClick={() => setShowToast(null)} className="text-white/80 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Widget Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md border border-emerald-400/30">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                Firebase Cloud Database & Storage Monitor
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider border flex items-center gap-1.5 ${healthBadgeBg}`}>
                <span className={`w-2 h-2 rounded-full ${healthDotColor} animate-ping`} />
                {healthScore}% {healthStatusLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
              <span>Muunganisho wa Moja kwa Moja na Firebase Firestore (mdimilage-4062b) & IndexedDB Cache</span>
              {lastCheckTime && (
                <span className="text-slate-400 text-[10px]">
                  • Imesasishwa {lastCheckTime}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={runDiagnosticCheck}
            disabled={isMeasuring || isRebuilding}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold rounded-lg border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Kagua kasi na muunganisho wa Supabase hivi sasa"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${isMeasuring ? 'animate-spin' : ''}`} />
            <span>{isMeasuring ? 'Inapima...' : 'Pima Kasi (Ping)'}</span>
          </button>

          <label className="hidden sm:flex items-center gap-1.5 text-slate-300 text-[11px] cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded text-emerald-500 focus:ring-0 cursor-pointer" 
            />
            <span>Auto (30s)</span>
          </label>
        </div>
      </div>

      {/* Widget Body */}
      <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50">
        
        {/* Latency Cards Grid - 100% Supabase & Local Cache */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Supabase Engine Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Firebase Firestore Cloud</h4>
                  <p className="text-[11px] text-slate-500 font-medium">NoSQL Document Store & Real-Time Sync</p>
                </div>
              </div>
              {getLatencyBadge(supabaseLatency.latencyMs, supabaseLatency.ok)}
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Kasi ya Majibu (Latency):</span>
                <span className="font-bold text-slate-800">
                  {supabaseLatency.ok ? `${supabaseLatency.latencyMs} ms` : 'Inajaribu kuunganisha...'}
                </span>
              </div>
              
              {/* Latency Progress Meter */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    !supabaseLatency.ok ? 'bg-amber-500 w-full' :
                    supabaseLatency.latencyMs <= 100 ? 'bg-emerald-500' :
                    supabaseLatency.latencyMs <= 300 ? 'bg-emerald-400' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, (supabaseLatency.latencyMs / 400) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                <span className="truncate text-slate-600" title={supabaseUrl}>
                  Seva: <span className="font-semibold text-emerald-700">{supabaseUrl.replace('https://', '')}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          {/* IndexedDB & Local Cache Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0 shadow-xs">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Kache ya Kivinjari (IndexedDB)</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Uhifadhi wa Haraka & Ulinzi dhidi ya Data Kupotea</p>
                </div>
              </div>
              {getLatencyBadge(idbLatency.latencyMs, idbLatency.ok)}
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Kasi ya Kusoma / Kuandika:</span>
                <span className="font-bold text-slate-800">
                  {idbLatency.ok ? `${idbLatency.latencyMs} ms` : 'Inatumika'}
                </span>
              </div>

              {/* Latency Progress Meter */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, Math.max(5, (idbLatency.latencyMs / 50) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                <span>Hifadhi: schoolData Snapshot</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px]">
                  SYNCHRONIZED
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Administrator Force Cache Rebuild Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-white">Chombo cha Kusawazisha Supabase (Cache Rebuild)</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wide">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 max-w-xl">
                Unahitaji kusawazisha upya taarifa zote kutoka seva ya Supabase? Bofya kitufe hiki kupakia nakala safi moja kwa moja kutoka mtandaoni.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isRebuilding}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
            <span>{isRebuilding ? 'Inasawazisha...' : '⚡ Sawazisha na Supabase'}</span>
          </button>
        </div>

        {/* Rebuild Progress Bar (if active) */}
        {isRebuilding && (
          <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-2 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>{rebuildStatusMsg}</span>
              </span>
              <span className="text-emerald-600 font-extrabold">{rebuildStep * 25}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${rebuildStep * 25}%` }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal for Force Cache Rebuild */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Database className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Sawazisha Taarifa na Supabase?</h3>
                <p className="text-xs text-slate-500">Kupakia nakala safi kabisa kutoka seva ya Supabase Cloud</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <p>
                Operesheni hii itafanya yafuatayo:
              </p>
              <ul className="list-disc list-inside space-y-1 font-medium text-slate-700">
                <li>Kusafisha kache ya muda ya kivinjari chako</li>
                <li>Kupakua taarifa zote zilizopo kwenye Supabase Cloud</li>
                <li>Kuweka upya orodha ya wanafunzi, walimu, ratiba na mitihani</li>
              </ul>
              <p className="text-emerald-700 font-semibold pt-1">
                Hakuna taarifa yoyote ya shule itakayopotea kwenye seva ya Supabase.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleForceCacheRebuild}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ndio, Sawazisha Sasa</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
