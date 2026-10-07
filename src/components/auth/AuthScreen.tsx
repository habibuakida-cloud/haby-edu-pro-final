import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { LogIn, School as SchoolIcon, Loader2, User, KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff, Shield, Phone, Lock, Award } from 'lucide-react';
import { HabyEduProLogo } from '../common/HabyEduProLogo';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, loginAsDemo } = useAuth();
  const [loginTab, setLoginTab] = useState<'staff' | 'parent'>('staff');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states - staff
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form states - parent
  const [parentPhone, setParentPhone] = useState('0710000000');
  const [parentPassword, setParentPassword] = useState('123456');
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentLoading(true);
    setParentError(null);
    try {
      const cleanPhone = parentPhone.trim();
      const cleanPassword = parentPassword.trim();
      
      if (cleanPhone === '0710000000' && cleanPassword === '123456') {
        const testParentId = '99999999-9999-9999-9999-999999999999';
        await supabase.from('parents').upsert({
          id: testParentId,
          phone: '0710000000',
          password_hash: '123456',
          full_name: 'Bw. Juma Akida (Mzazi Mfano)'
        }, { onConflict: 'id' });
      }

      const { data: parentRows, error } = await supabase
        .from('parents')
        .select('*')
        .eq('phone', cleanPhone);

      if (error || !parentRows || parentRows.length === 0) {
        throw new Error('Namba ya simu au nenosiri si sahihi.');
      }

      const pData = parentRows[0];
      if (pData.password_hash !== cleanPassword && pData.password !== cleanPassword) {
        throw new Error('Nenosiri si sahihi. Jaribu 123456.');
      }

      const parentSession = {
        id: pData.id,
        phone: pData.phone,
        full_name: pData.full_name || 'Mzazi'
      };
      sessionStorage.setItem('haby_parent_session', JSON.stringify(parentSession));
      window.location.href = '/parent';
    } catch (err: any) {
      setParentError(err.message || 'Hitilafu imetokea.');
    } finally {
      setParentLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || 'Google Sign-in failed. Please try again or use email sign-in.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: any) {
      console.error("Auth error:", err);
      const norm = email.trim().toLowerCase();
      if (norm === 'habibuakida@gmail.com' || norm === 'admin@haby.com') {
        setError(err.message || 'Invalid credentials for Super Admin account. Access denied.');
        return;
      }
      // Fallback demo login if network/auth fails for demo roles
      if (norm.includes('admin') || norm.includes('head')) {
        loginAsDemo('HEADMASTER');
      } else if (norm.includes('academic')) {
        loginAsDemo('ACADEMIC');
      } else if (norm.includes('teacher')) {
        loginAsDemo('TEACHER');
      } else {
        setError(err.message || 'Invalid login credentials. Please verify your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f2948] to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Official Logo */}
        <div className="bg-[#0f2948] p-8 text-white text-center relative overflow-hidden flex flex-col items-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="mb-2">
            <HabyEduProLogo theme="dark" size="lg" variant="full" />
          </div>

          <p className="text-blue-200 text-xs mt-2 font-medium max-w-xs">
            Comprehensive School Management, Timetable & Examination Ledger
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-[11px] text-emerald-300 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Authorized Portal
          </div>
        </div>

        <div className="p-7 space-y-5">
          {/* Top Login Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setLoginTab('staff')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginTab === 'staff' ? 'bg-[#1f4d8b] text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Walimu & Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginTab('parent')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginTab === 'parent' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> Portal ya Wazazi
            </button>
          </div>

          {loginTab === 'staff' ? (
            <>
              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading || googleLoading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-semibold text-sm shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] uppercase font-bold tracking-wider">Or Sign In with Email</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-900">Sign-In Notice</p>
                    <p className="mt-0.5 text-rose-700 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-medium text-slate-800"
                      placeholder="e.g. teacher@school.ac.tz"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-medium text-slate-800"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3 bg-[#1f4d8b] hover:bg-[#163765] text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to System</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleParentSubmit} className="space-y-4 pt-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
                <p className="font-black">Portal ya Wazazi (Parent Portal)</p>
                <p className="text-[11px] text-emerald-700">Ingia kuona maendeleo ya mwanao. Neno la siri la awali ni <span className="font-bold text-emerald-900">123456</span>.</p>
              </div>

              {parentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                  {parentError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Namba ya Simu ya Mzazi
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0710000000"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Nenosiri (Password)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-800">Jaribu Mfano:</p>
                <p>Simu: <code className="font-mono text-emerald-800 font-bold">0710000000</code></p>
                <p>Nenosiri: <code className="font-mono text-emerald-800 font-bold">123456</code></p>
              </div>

              <button
                type="submit"
                disabled={parentLoading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {parentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <LogIn className="w-4 h-4" /> <span>Ingia kwenye Portal ya Wazazi</span> </>}
              </button>
            </form>
          )}

          {/* Demo Access Section */}
          <div className="pt-5 border-t border-slate-100">
            <div className="flex flex-col items-center mb-4">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded mb-1.5 border border-amber-200">
                Quick Access
              </span>
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                Jaribu Mfano (Explore Demo Experience)
              </h4>
              <p className="text-[10px] text-slate-500 text-center mt-0.5 px-4 leading-tight">
                Explore the dashboard, results management, and academic tools without needing an account.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => loginAsDemo('HEADMASTER')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group bg-white shadow-xs hover:shadow-md active:scale-95"
              >
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">Headmaster</span>
              </button>
              
              <button
                type="button"
                onClick={() => loginAsDemo('ACADEMIC')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all cursor-pointer group bg-white shadow-xs hover:shadow-md active:scale-95"
              >
                <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">Academic</span>
              </button>
              
              <button
                type="button"
                onClick={() => loginAsDemo('TEACHER')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer group bg-white shadow-xs hover:shadow-md active:scale-95"
              >
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">Teacher</span>
              </button>
            </div>
            
            <p className="text-[9px] text-center text-slate-400 mt-3 italic font-medium">
              * Mfano huu hauhitaji barua pepe wala nenosiri.
            </p>
          </div>

          {/* Security & Access Info */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-slate-600 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-950">Security & Access:</span>
              <p className="mt-0.5 leading-relaxed text-slate-600">
                Staff accounts and access permissions are managed by the school administration via the administration dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


