import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { UserAccount } from '../../types';

interface ChangePasswordModalProps {
  currentUser: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged?: (newPassword: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onPasswordChanged
}) => {
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateSecretPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentUser || !currentUser.email) {
      setErrorMsg('Tafadhali ingia (log in) kwanza ili kubadili nywila.');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg('Tafadhali weka nywila mpya yenye angalau herufi 4.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMsg('Nywila mpya na uthibitisho wa nywila havifanani. Tafadhali hakiki tena.');
      return;
    }

    setLoading(true);
    try {
      const activeSchoolId = currentUser.schoolId || sessionStorage.getItem('haby_school_id') || localStorage.getItem('currentSchoolId') || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
      const cleanPass = newPassword.trim();
      const normEmail = currentUser.email.toLowerCase().trim();

      // 1. Post to backend user accounts registry /api/db/users
      const res = await fetch('/api/db/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normEmail,
          password: cleanPass,
          fullName: currentUser.fullName,
          role: currentUser.role,
          schoolId: activeSchoolId,
          assignedSubjects: currentUser.assignedSubjects || []
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.details || 'Imeshindikana kuhifadhi nywila mpya kwenye mfumo.');
      }

      // 2. Update local storage session
      const updatedUser: UserAccount = {
        ...currentUser,
        password: cleanPass
      };
      localStorage.setItem('haby_auth_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('haby_demo_user', JSON.stringify(updatedUser));

      if (onPasswordChanged) {
        onPasswordChanged(cleanPass);
      }

      setSuccessMsg(`✓ Nywila yako imebadilishwa kikamilifu! Sasa unaweza kutumia nywila mpya "${cleanPass}" kuingia kwenye mfumo.`);
      setCurrentPasswordInput('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2200);
    } catch (err: any) {
      console.error('Password change error:', err);
      setErrorMsg(err.message || 'Hitilafu imetokea wakati wa kubadili nywila.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden space-y-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-2xl border border-blue-400/30">
              <KeyRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wide">
                Badili Nywila Ya Akaunti (Change Password)
              </h3>
              <p className="text-[11px] text-blue-200 font-medium">
                Siri yako binafsi: Badili nywila ya mfumo ili kuzuia kuingiliwa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Akaunti Inayobadilishwa: {currentUser?.fullName}</span>
            </div>
            <p className="text-[11px] text-blue-800 font-mono">
              Email: {currentUser?.email || 'N/A'}
            </p>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-start gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold flex items-start gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-700 block">
                Nywila Mpya (New Password) *
              </label>
              <button
                type="button"
                onClick={handleGenerateSecretPassword}
                className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
              >
                Tengeneza Kiotomatiki
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Andika nywila yako mpya (min 4 chars)..."
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-700 block">
              Thibitisha Nywila Mpya (Confirm New Password) *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Rudia kuandika nywila mpya..."
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition"
            >
              Ghairi (Cancel)
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-amber-300" />}
              <span>Hifadhi Nywila Mpya</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
