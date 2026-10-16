import React, { useState } from 'react';
import { UserPlus, X, CheckCircle2, Shield, Phone, GraduationCap, DollarSign, Loader2 } from 'lucide-react';
import { saveStudentToFirestore } from '../../lib/firestoreService';

interface QuickAddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess?: () => void;
}

export const QuickAddStudentModal: React.FC<QuickAddStudentModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('Form 1');
  const [gender, setGender] = useState('Male');
  const [parentPhone, setParentPhone] = useState('');
  const [feeStatus, setFeeStatus] = useState<'PAID' | 'UNPAID'>('UNPAID');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setSuccessMsg(null);

    const studentId = `std_${Date.now()}`;
    const payload = {
      id: studentId,
      name: name.trim(),
      className: className.trim(),
      gender,
      parentPhone: parentPhone.trim() || '0710000000',
      feeStatus,
      schoolId: schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
      createdAt: new Date().toISOString()
    };

    try {
      await saveStudentToFirestore(payload);
      setSuccessMsg(`Mwanafunzi ${payload.name} amehifadhiwa moja kwa moja kwenye Firestore!`);
      setTimeout(() => {
        setSaving(false);
        setName('');
        setParentPhone('');
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Save student error:", err);
      alert("Hitilafu wakati wa kuhifadhi Firestore: " + (err.message || err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2948] via-[#1a3d6b] to-[#0f2948] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Ongeza Mwanafunzi wa Kwanza</h3>
              <p className="text-xs text-blue-200 font-medium">Hifadhi moja kwa moja kwenye Firestore Database</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Student Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Jina Kamili la Mwanafunzi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="mfano: Juma Ramadhani Akida"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* Class & Gender Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Darasa (Class Level)
              </label>
              <select
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <optgroup label="Sekondari (Secondary)">
                  <option value="Form 1">Form 1</option>
                  <option value="Form 2">Form 2</option>
                  <option value="Form 3">Form 3</option>
                  <option value="Form 4">Form 4</option>
                  <option value="Form 5">Form 5</option>
                  <option value="Form 6">Form 6</option>
                </optgroup>
                <optgroup label="Msingi (Primary)">
                  <option value="Darasa la 1">Darasa la 1</option>
                  <option value="Darasa la 2">Darasa la 2</option>
                  <option value="Darasa la 3">Darasa la 3</option>
                  <option value="Darasa la 4">Darasa la 4</option>
                  <option value="Darasa la 5">Darasa la 5</option>
                  <option value="Darasa la 6">Darasa la 6</option>
                  <option value="Darasa la 7">Darasa la 7</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Jinsia (Gender)
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="Male">Mvulana (Male)</option>
                <option value="Female">Msichana (Female)</option>
              </select>
            </div>
          </div>

          {/* Parent Phone */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              Namba ya Simu ya Mzazi
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={e => setParentPhone(e.target.value)}
              placeholder="0712 345 678"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* Fee Status (Ameshalipa / Hajalipa) */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Hali ya Ada (Fee Status)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFeeStatus('PAID')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  feeStatus === 'PAID'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ameshalipa (PAID)</span>
              </button>
              <button
                type="button"
                onClick={() => setFeeStatus('UNPAID')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  feeStatus === 'UNPAID'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Hajalipa (UNPAID)</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Ghairi
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-[#1f4d8b] hover:from-blue-700 hover:to-[#163765] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inahifadhi Firestore...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Hifadhi Kwenye Firestore</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
