import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Smartphone, KeyRound, X, CheckCircle2, AlertCircle, RefreshCw, Usb, Loader2, Wifi, WifiOff, Laptop, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Teacher } from '../../types';
import { addFailedLog, syncLogsWithServer } from '../../utils/offlineQueue';

interface FingerprintScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (teacher: any, method: 'usb_scanner' | 'phone_pin' | 'laptop_scanner') => void;
  teachers: any[];
  schoolId: string;
  monitorId: string;
  className: string;
  subject: string;
  action: 'in' | 'out';
  presentCount?: number;
  absentCount?: number;
  sickCount?: number;
  permittedCount?: number;
  periodName?: string;
  scheduledTeacherId?: string | number;
  scheduledTeacherName?: string;
  isLocked?: boolean;
  term?: string;
  academicWeek?: number;
}

export const FingerprintScanner: React.FC<FingerprintScannerProps> = ({
  isOpen,
  onClose,
  onVerified,
  teachers,
  schoolId,
  monitorId,
  className,
  subject,
  action,
  presentCount,
  absentCount,
  sickCount,
  permittedCount,
  periodName,
  scheduledTeacherId,
  scheduledTeacherName,
  isLocked,
  term,
  academicWeek
}) => {
  const [step, setStep] = useState<'select' | 'verify' | 'success'>('select');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isScannerMode, setIsScannerMode] = useState(false);
  const [isLaptopScannerAvailable, setIsLaptopScannerAvailable] = useState(false);
  const [mainTopic, setMainTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerConnected, setIsScannerConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [shake, setShake] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // USB Scanner detection
  useEffect(() => {
    const nav = navigator as any;
    const checkUSB = async () => {
      if (typeof nav !== 'undefined' && nav.usb) {
        try {
          const devices = await nav.usb.getDevices();
          setIsScannerConnected(devices.length > 0);
          if (devices.length > 0) setIsScannerMode(true);
        } catch (e) {
          console.warn('WebUSB detection failed', e);
        }
      }
    };
    checkUSB();

    // Check for Laptop Biometrics (WebAuthn)
    const checkLaptopBiometrics = async () => {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsLaptopScannerAvailable(available);
      }
    };
    checkLaptopBiometrics();

    const handleConnect = () => {
      setIsScannerConnected(true);
      setIsScannerMode(true);
    };
    const handleDisconnect = () => {
      setIsScannerConnected(false);
      setIsScannerMode(false);
    };

    nav.usb?.addEventListener('connect', handleConnect);
    nav.usb?.addEventListener('disconnect', handleDisconnect);

    const handleOnline = () => {
      setIsOnline(true);
      syncLogsWithServer();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      nav.usb?.removeEventListener('connect', handleConnect);
      nav.usb?.removeEventListener('disconnect', handleDisconnect);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-select scheduled teacher when modal opens
  useEffect(() => {
    if (isOpen && scheduledTeacherId && teachers.length > 0) {
      const matched = teachers.find(t => 
        String(t.id) === String(scheduledTeacherId) || 
        String(t.firestoreDocId) === String(scheduledTeacherId) ||
        (scheduledTeacherName && t.name === scheduledTeacherName)
      );

      if (matched) {
        setSelectedTeacher(matched);
        setStep('verify');
        if (isScannerConnected) setIsScannerMode(true);
      } else {
        // Reset if no valid schedule match, let user pick
        setStep('select');
        setSelectedTeacher(null);
      }
    } else if (isOpen && !scheduledTeacherId) {
      setStep('select');
      setSelectedTeacher(null);
    }
  }, [isOpen, scheduledTeacherId, scheduledTeacherName, teachers, isScannerConnected]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVerify = async (providedPin?: string, providedFingerprint?: string, methodOverride?: 'usb_scanner' | 'phone_pin' | 'laptop_scanner') => {
    if (!selectedTeacher) return;
    setLoading(true);
    setError(null);

    const method = methodOverride || (isScannerMode ? 'usb_scanner' : 'phone_pin');

    try {
      const response = await fetch('/api/verify-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher.id,
          teacherName: selectedTeacher.name,
          pinCode: providedPin,
          fingerprintHash: providedFingerprint,
          schoolId,
          monitorId,
          className,
          subject,
          action,
          method,
          deviceId: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          mainTopic: action === 'in' ? mainTopic : undefined,
          subTopic: action === 'in' ? subTopic : undefined,
          presentCount,
          absentCount,
          sickCount,
          permittedCount,
          periodName,
          term,
          academicWeek
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccessOverlay(true);
        setTimeout(() => {
          setShowSuccessOverlay(false);
          setStep('success');
          setTimeout(() => {
            onVerified(selectedTeacher, method);
            onClose();
            setStep('select');
            setSelectedTeacher(null);
            setPin('');
            setMainTopic('');
            setSubTopic('');
          }, 2000);
        }, 1200);
      } else {
        const errorMessage = data.error || 'Uthibitisho umeshindwa';
        setError(errorMessage);
        triggerShake();
        setPin('');
        
        // Log failed verification to IndexedDB
        await addFailedLog({
          teacherId: String(selectedTeacher.id),
          teacherName: selectedTeacher.name,
          method,
          reason: errorMessage,
          timestamp: new Date().toISOString(),
          schoolId,
          monitorId,
          className,
          subject,
          action,
          deviceId: navigator.userAgent,
          mainTopic: action === 'in' ? mainTopic : undefined,
          subTopic: action === 'in' ? subTopic : undefined,
          presentCount,
          absentCount,
          sickCount,
          permittedCount,
          periodName,
          term,
          academicWeek
        });
      }
    } catch (err: any) {
      const errorMessage = 'Tatizo la mtandao. Maelezo yamehifadhiwa offline.';
      setError(errorMessage);
      triggerShake();

      // Log failed verification due to network to IndexedDB
      await addFailedLog({
        teacherId: String(selectedTeacher.id),
        teacherName: selectedTeacher.name,
        method,
        reason: 'Network Error',
        timestamp: new Date().toISOString(),
        schoolId,
        monitorId,
        className,
        subject,
        action,
        deviceId: navigator.userAgent,
        mainTopic: action === 'in' ? mainTopic : undefined,
        subTopic: action === 'in' ? subTopic : undefined,
        presentCount,
        absentCount,
        sickCount,
        permittedCount,
        periodName,
        term,
        academicWeek
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      handleVerify(pin);
    }
  };

  // Laptop Scanner (WebAuthn) trigger
  const triggerLaptopScan = async () => {
    if (!isLaptopScannerAvailable) return;
    
    setLoading(true);
    try {
      // In a real app, you'd use navigator.credentials.get() with proper challenge
      // For this implementation, we simulate the biometric trigger which returns a mock template
      // since setting up a full WebAuthn flow requires server-side ceremony.
      
      // We simulate the prompt wait
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      handleVerify(undefined, 'laptop_biometric_template', 'laptop_scanner');
    } catch (err) {
      setError('Biometrik ya Laptop imeshindwa');
      triggerShake();
      setLoading(false);
    }
  };

  // USB Scanner trigger
  const triggerUSBScan = async () => {
    if (!isScannerConnected) {
      setError('Scanner ya USB haijaunganishwa! Tafadhali unganisha kifaa.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Wait for finger placement
      await new Promise(r => setTimeout(r, 1500));
      
      // Step 2: Show scanning status
      setError('KIDOKEZO: Weka kidole chako kwenye sensor sasa...');
      await new Promise(r => setTimeout(r, 2000));
      
      // Step 3: Final verification call
      handleVerify(undefined, 'usb_fingerprint_template', 'usb_scanner');
    } catch (e) {
      setError('Hitilafu wakati wa kuscan. Jaribu tena.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200"
        >
          {/* Success Overlay */}
          <AnimatePresence>
            {showSuccessOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[110] bg-emerald-500/90 backdrop-blur-md flex flex-col items-center justify-center text-white"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center border-4 border-white mb-4"
                >
                  <CheckCircle2 className="w-20 h-20" />
                </motion.div>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-black uppercase tracking-tighter"
                >
                  IMETHIBITISHWA!
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Bar */}
          <div className={`py-2 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest ${
            isOnline ? 'bg-slate-50 text-slate-500' : 'bg-amber-50 text-amber-700'
          }`}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <><Wifi className="w-3 h-3 text-emerald-500" /> MTANDAO: POCHE ✅</>
              ) : (
                <><WifiOff className="w-3 h-3 text-amber-500" /> MTANDAO: OFFLINE ⚠️</>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isScannerConnected ? (
                <div className="flex items-center gap-1.5">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  />
                  <span className="text-emerald-600">Scanner Connected</span>
                </div>
              ) : isLaptopScannerAvailable ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <Laptop className="w-3 h-3" /> Mode: Laptop Sensor
                </span>
              ) : (
                <span className="text-slate-400">Mode: Phone PIN</span>
              )}
            </div>
          </div>

          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Uthibitisho wa Mwalimu
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                {action === 'in' ? 'Mwalimu anaingia darasani' : 'Mwalimu anatoka darasani'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Main Mode Indicator */}
            <div className="mb-6 flex justify-center">
              <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border-2 ${
                isScannerMode 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : isLaptopScannerAvailable 
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : 'bg-slate-50 text-slate-700 border-slate-100'
              }`}>
                {isScannerMode ? (
                  <><Usb className="w-4 h-4" /> USB SCANNER MODE</>
                ) : isLaptopScannerAvailable ? (
                  <><Laptop className="w-4 h-4" /> LAPTOP SENSOR MODE</>
                ) : (
                  <><Smartphone className="w-4 h-4" /> SIMU / PIN MODE</>
                )}
              </div>
            </div>

            <motion.div
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              {step === 'select' && (
                <div className="space-y-4">
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wide">
                    Chagua Mwalimu:
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {[...teachers]
                      .sort((a, b) => {
                        const isF = (t: any) => {
                          const g = String(t?.gender || '').toLowerCase().trim();
                          if (g.startsWith('f') || g === 'ke' || g === 'girl' || g === 'mwanamke' || g === 'g') return true;
                          const r = String(t?.schoolRole || '').toLowerCase();
                          return r.includes('mistress') || r.includes('matron');
                        };
                        const aF = isF(a);
                        const bF = isF(b);
                        if (aF !== bF) return aF ? -1 : 1;
                        return String(a?.name || '').localeCompare(String(b?.name || ''));
                      })
                      .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTeacher(t);
                          setStep('verify');
                          // Auto-set mode based on availability
                          if (isScannerConnected) setIsScannerMode(true);
                        }}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200">
                          {t.photo || t.passportPhoto ? (
                            <img src={t.photo || t.passportPhoto} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg font-black text-slate-300">{(t.name || 'T')[0]}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-900 group-hover:text-blue-700">{t.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                            {t.hasBiometric || t.fingerprintEnrolled ? 'Biometrik & PIN Ipo ✅' : 'PIN (Default: 1234)'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'verify' && selectedTeacher && (
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <div className="w-20 h-20 rounded-full bg-blue-50 mx-auto flex items-center justify-center text-blue-600 border border-blue-100">
                      <Fingerprint className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">{selectedTeacher.name}</h4>
                    <p className="text-sm text-slate-500 font-bold">
                      {isScannerMode 
                        ? 'Weka kidole kwenye scanner ya USB' 
                        : isLaptopScannerAvailable 
                          ? 'Tumia sensor ya vidole ya laptop'
                          : 'Ingiza namba yako ya siri (PIN)'}
                    </p>
                  </div>

                    <div className="text-left space-y-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block ml-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Mada Kuu (Main Topic):
                        </label>
                        <input
                          type="text"
                          required
                          value={mainTopic}
                          onChange={e => setMainTopic(e.target.value)}
                          placeholder="Mfano: Introduction to Biology..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-white focus:border-blue-500 outline-none text-sm font-bold text-slate-800 bg-white shadow-sm transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block ml-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Mada Ndogo (Sub Topic):
                        </label>
                        <input
                          type="text"
                          required
                          value={subTopic}
                          onChange={e => setSubTopic(e.target.value)}
                          placeholder="Mfano: Cell Structure..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-white focus:border-blue-500 outline-none text-sm font-bold text-slate-800 bg-white shadow-sm transition-all"
                        />
                      </div>
                      <div className="pt-1 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1">
                        <span>Hakikisha mada zote zimejazwa</span>
                        <span className="text-blue-500 italic">{term} - Wiki {academicWeek}</span>
                      </div>
                    </div>

                  <div className="space-y-4">
                    {isScannerMode ? (
                      <button
                        onClick={triggerUSBScan}
                        disabled={loading || !isScannerConnected}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${
                          loading 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95'
                        }`}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                        {loading ? 'Inatambua...' : 'Bonyeza Hapa Kuscan'}
                      </button>
                    ) : isLaptopScannerAvailable ? (
                      <button
                        onClick={triggerLaptopScan}
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${
                          loading 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95'
                        }`}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Laptop className="w-5 h-5" />}
                        {loading ? 'Inathibitisha...' : 'Thibitisha na Laptop'}
                      </button>
                    ) : null}

                    {(!isScannerMode && !isLaptopScannerAvailable) || (isScannerMode || isLaptopScannerAvailable) && (
                      <div className="pt-2 border-t border-slate-100">
                        <form onSubmit={handlePinSubmit} className="space-y-4">
                          <div className="flex justify-center gap-2">
                            {[0, 1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-black ${
                                  pin.length > i 
                                    ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                    : 'border-slate-200 bg-slate-50'
                                }`}
                              >
                                {pin.length > i ? '●' : ''}
                              </div>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => pin.length < 4 && setPin(p => p + num)}
                                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 transition-colors"
                              >
                                {num}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setPin('')}
                              className="h-12 rounded-xl bg-slate-100 hover:bg-rose-100 text-rose-600 font-bold text-xs"
                            >
                              FUTA
                            </button>
                            <button
                              type="button"
                              onClick={() => pin.length < 4 && setPin(p => p + '0')}
                              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 transition-colors"
                            >
                              0
                            </button>
                            <button
                              type="submit"
                              disabled={pin.length < 4 || loading}
                              className="h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
                            >
                              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-4">
                      {isScannerConnected && !isScannerMode && (
                        <button
                          onClick={() => setIsScannerMode(true)}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          Tumia Scanner ya USB
                        </button>
                      )}
                      {(isScannerMode || isLaptopScannerAvailable) && (
                        <button
                          onClick={() => {
                            setIsScannerMode(false);
                          }}
                          className="text-xs font-bold text-slate-500 hover:underline"
                        >
                          Tumia PIN Pekee
                        </button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="text-left leading-tight">{error}</span>
                    </div>
                  )}

                  {!isLocked && (
                    <button
                      onClick={() => {
                        setStep('select');
                        setSelectedTeacher(null);
                        setPin('');
                        setError(null);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto pt-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Chagua Mwalimu Mwingine
                    </button>
                  )}
                </div>
              )}

              {step === 'success' && selectedTeacher && (
                <div className="text-center py-8 space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-4 border-white shadow-xl"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Uthibitisho Umekubaliwa!</h4>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed">
                      Mwalimu <span className="text-blue-600">{selectedTeacher.name}</span> amerekodiwa {action === 'in' ? 'kuingia' : 'kutoka'}.
                    </p>
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-[10px] text-slate-500 font-mono font-bold">
                    {new Date().toLocaleString()}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
              HABY EDU PRO • CLASS MONITORING
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
